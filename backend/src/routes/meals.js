import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'whatueat_jwt_secret_token_key_123';
const MAX_POSTGRES_INTEGER = 2147483647;

const readNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const readCalories = (value) => {
  const calories = Math.round(readNumber(value));
  if (!Number.isFinite(calories) || calories <= 0) return null;
  return clampNumber(calories, 1, MAX_POSTGRES_INTEGER);
};

const readMacro = (value) => {
  const macro = readNumber(value);
  if (!Number.isFinite(macro) || macro < 0) return 0;
  return clampNumber(macro, 0, 999.99);
};

const readMealId = (id) => {
  const mealId = Number(id);
  if (!Number.isInteger(mealId) || mealId <= 0 || mealId > MAX_POSTGRES_INTEGER) {
    return null;
  }
  return mealId;
};

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '授权失败：未提供 Token 凭证' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '授权失败：Token 无效或已过期' });
    }
    req.user = user;
    next();
  });
};

// ----------------------------------------------------
// User Auth Routes (Register & Login)
// ----------------------------------------------------

// POST /api/meals/register - Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '请输入用户名和密码。' });
  }

  try {
    // Check if user already exists
    const checkUser = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: '用户名已被注册。' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({ token, username: user.username, message: '注册成功' });
  } catch (err) {
    console.error('注册账户出错:', err);
    return res.status(500).json({ message: '数据库操作异常。', error: err.message });
  }
});

// POST /api/meals/login - Authenticate user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '请输入用户名和密码。' });
  }

  try {
    const checkUser = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length === 0) {
      return res.status(400).json({ message: '用户名不存在。' });
    }

    const user = checkUser.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: '密码错误，请重新输入。' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({ 
      token, 
      username: user.username,
      profile: {
        gender: user.gender,
        age: user.age,
        height: user.height,
        weight: user.weight,
        activity: user.activity,
        tdee: user.tdee,
        deficit: user.deficit
      },
      message: '登录成功' 
    });
  } catch (err) {
    console.error('登录账户出错:', err);
    return res.status(500).json({ message: '数据库操作异常。', error: err.message });
  }
});

// ----------------------------------------------------
// User Profile Routes
// ----------------------------------------------------

// PUT /api/meals/profile - Sync user metabolic profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { gender, age, height, weight, activity, tdee, deficit } = req.body;
  const userId = req.user.id;

  try {
    await query(
      `UPDATE users 
       SET gender = $1, age = $2, height = $3, weight = $4, activity = $5, tdee = $6, deficit = $7 
       WHERE id = $8`,
      [gender, Number(age), Number(height), Number(weight), Number(activity), Number(tdee), Number(deficit), userId]
    );
    return res.json({ message: '个人指标数据更新成功！' });
  } catch (err) {
    console.error('更新档案失败:', err);
    return res.status(500).json({ message: '数据库操作异常。', error: err.message });
  }
});

// ----------------------------------------------------
// Meals CRUD Routes
// ----------------------------------------------------

// GET /api/meals - Get meals logged by user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      'SELECT id, name, calories, protein, carbs, fat, items, image, type, timestamp FROM meals WHERE user_id = $1 ORDER BY timestamp DESC',
      [userId]
    );
    
    // Map serial id to string for React frontend compatibility
    const formattedMeals = result.rows.map(row => ({
      ...row,
      id: row.id.toString(),
      calories: Number(row.calories),
      protein: Number(row.protein),
      carbs: Number(row.carbs),
      fat: Number(row.fat)
    }));

    return res.json(formattedMeals);
  } catch (err) {
    console.error('获取饮食记录出错:', err);
    return res.status(500).json({ message: '查询数据库失败。', error: err.message });
  }
});

// POST /api/meals - Log a new meal
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, calories, protein, carbs, fat, items, image, type, timestamp } = req.body;
  const parsedCalories = readCalories(calories);

  if (!name || !parsedCalories) {
    return res.status(400).json({ message: '餐食名称及卡路里为必填项。' });
  }

  try {
    const mealTime = timestamp ? new Date(timestamp) : new Date();

    const result = await query(
      `INSERT INTO meals (user_id, name, calories, protein, carbs, fat, items, image, type, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        userId,
        name,
        parsedCalories,
        readMacro(protein),
        readMacro(carbs),
        readMacro(fat),
        JSON.stringify(items || []),
        image || null,
        type || 'Lunch',
        mealTime
      ]
    );

    return res.status(201).json({ id: result.rows[0].id.toString(), message: '记录成功保存！' });
  } catch (err) {
    console.error('保存饮食记录出错:', err);
    return res.status(500).json({ message: '写入数据库失败。', error: err.message });
  }
});

// DELETE /api/meals/:id - Delete a meal log
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const mealId = readMealId(req.params.id);

  if (!mealId) {
    return res.status(400).json({ message: '无效的 ID 参数。' });
  }

  try {
    // Verify ownership and delete
    const result = await query('DELETE FROM meals WHERE id = $1 AND user_id = $2 RETURNING id', [mealId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '记录不存在或无权操作。' });
    }
    return res.json({ message: '记录已成功删除。' });
  } catch (err) {
    console.error('删除饮食记录出错:', err);
    return res.status(500).json({ message: '删除失败。', error: err.message });
  }
});

// PUT /api/meals/:id - Update a meal log
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const mealId = readMealId(req.params.id);
  const { name, calories, protein, carbs, fat, items, type, timestamp } = req.body;
  const parsedCalories = readCalories(calories);

  if (!mealId) {
    return res.status(400).json({ message: '无效的 ID 参数。' });
  }

  if (!name || !parsedCalories) {
    return res.status(400).json({ message: '餐食名称及卡路里为必填项。' });
  }

  try {
    const mealTime = timestamp ? new Date(timestamp) : new Date();
    const result = await query(
      `UPDATE meals 
       SET name = $1, calories = $2, protein = $3, carbs = $4, fat = $5, items = $6, type = $7, timestamp = $8
       WHERE id = $9 AND user_id = $10
       RETURNING id`,
      [
        name,
        parsedCalories,
        readMacro(protein),
        readMacro(carbs),
        readMacro(fat),
        JSON.stringify(items || []),
        type || 'Lunch',
        mealTime,
        mealId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '记录不存在或无权操作。' });
    }

    return res.json({ message: '记录已成功更新！' });
  } catch (err) {
    console.error('更新饮食记录出错:', err);
    return res.status(500).json({ message: '更新失败。', error: err.message });
  }
});

export default router;
