import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Support database URL from env, default to local if not defined
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/whatueat';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const query = (text, params) => pool.query(text, params);

export const initDbTables = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      gender VARCHAR(10) DEFAULT 'male',
      age INTEGER DEFAULT 25,
      height INTEGER DEFAULT 175,
      weight NUMERIC(5, 2) DEFAULT 70.0,
      activity NUMERIC(4, 3) DEFAULT 1.375,
      tdee INTEGER DEFAULT 2000,
      deficit INTEGER DEFAULT 500,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createMealsTableQuery = `
    CREATE TABLE IF NOT EXISTS meals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      calories INTEGER NOT NULL,
      protein NUMERIC(5, 2) DEFAULT 0.0,
      carbs NUMERIC(5, 2) DEFAULT 0.0,
      fat NUMERIC(5, 2) DEFAULT 0.0,
      items JSONB DEFAULT '[]',
      image TEXT,
      type VARCHAR(20) DEFAULT 'Lunch',
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const migrateUsersTableQuery = `
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male',
      ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 25,
      ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 175,
      ADD COLUMN IF NOT EXISTS weight NUMERIC(5, 2) DEFAULT 70.0,
      ADD COLUMN IF NOT EXISTS activity NUMERIC(4, 3) DEFAULT 1.375,
      ADD COLUMN IF NOT EXISTS tdee INTEGER DEFAULT 2000,
      ADD COLUMN IF NOT EXISTS deficit INTEGER DEFAULT 500,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `;

  const migrateMealsTableQuery = `
    ALTER TABLE meals
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS calories INTEGER,
      ADD COLUMN IF NOT EXISTS protein NUMERIC(5, 2) DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS carbs NUMERIC(5, 2) DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS fat NUMERIC(5, 2) DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'Lunch',
      ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `;

  try {
    await query(createUsersTableQuery);
    console.log('✅ users表检测/创建成功。');

    await query(migrateUsersTableQuery);
    console.log('✅ users表字段检测/补齐成功。');
    
    await query(createMealsTableQuery);
    console.log('✅ meals表检测/创建成功。');

    await query(migrateMealsTableQuery);
    console.log('✅ meals表字段检测/补齐成功。');
  } catch (err) {
    console.error('❌ 初始化数据库表结构失败:', err);
    throw err;
  }
};
