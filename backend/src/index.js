import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.js';
import mealRoutes from './routes/meals.js';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend cross-origin requests
app.use(cors());

// Configure JSON parser with a higher payload limit for base64 food images
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Routing Middlewares
app.use('/api/ai', aiRoutes);
app.use('/api/meals', mealRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    ai_qwen_configured: !!process.env.DASHSCOPE_API_KEY,
    ai_proxy_configured: !!process.env.AI_API_KEY
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        current_database() AS database,
        current_user AS user,
        to_regclass('public.users') AS users_table,
        to_regclass('public.meals') AS meals_table,
        (SELECT COUNT(*)::int FROM users) AS users_count,
        (SELECT COUNT(*)::int FROM meals) AS meals_count
    `);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: result.rows[0]
    });
  } catch (err) {
    console.error('数据库健康检查失败:', err);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: '数据库连接或查询失败',
      error: err.message
    });
  }
});

// 404 Error handler
app.use((req, res, next) => {
  res.status(404).json({ message: '未找到请求的端点。' });
});

// Global Error handler
app.use((err, req, res, next) => {
  console.error('⚠️ 全局未捕获异常:', err);
  res.status(500).json({ 
    message: '服务器内部错误，请稍后重试。',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 WhatUEat 后台服务已成功启动！`);
  console.log(`🌐 监听地址: http://0.0.0.0:${PORT}`);
  console.log(`⚙️ 运行模式: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
