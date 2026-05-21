import { initDbTables } from './db.js';

console.log('开始初始化 WhatUEat 数据库表结构...');

initDbTables()
  .then(() => {
    console.log('🎉 数据库初始化成功！您现在可以启动后端服务。');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 初始化失败，请检查数据库服务是否开启及 URL 配置:', err);
    process.exit(1);
  });
