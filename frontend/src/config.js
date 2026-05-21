// WhatUEat Application Code-level Configurations
// 配置后端地址与 AI 密钥，不展示在前端网页中

export const APP_CONFIG = {
  // 数据存储模式: 
  // 'local' -> 纯本地 LocalStorage 存储模式
  // 'cloud' -> 阿里云服务器数据库存储模式 (需要启动 backend 服务)
  mode: 'cloud',

  // 阿里云后端服务器接口 Base URL (当 mode 为 'cloud' 时生效)
  // 例如部署后可以修改为: 'http://47.100.x.x:3000' 或 'https://api.yourdomain.com'
  serverUrl: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000'
    : (typeof window !== 'undefined' ? window.location.origin : ''),

  // 本地模式下的 AI 识图模型通道:
  // 'mock'   -> 模拟演示数据 (无需 API Key)
  // 'qwen'   -> 阿里云通义千问-VL (国内直连，需填入下方 apiKey)
  // 'openai' -> OpenAI 或其他第三方中转代理 (需填入下方 apiKey 和 proxyUrl)
  localAiProvider: 'mock',

  // 本地模式下的 AI 识图密钥 (当 localAiProvider 为 'qwen' 或 'openai' 时使用)
  localAiApiKey: '',

  // 本地模式下的中转 API Base URL (当 localAiProvider 为 'openai' 时使用)
  localAiProxyUrl: 'https://api.openai-hk.com/v1'
};
