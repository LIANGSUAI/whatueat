# WhatUEat - 智能卡路里与 AI 饮食打卡记录仪 🥑

WhatUEat 是一款高颜值、响应式的卡路里追踪与饮食打卡网页小程序。它采用了时尚的**暗黑系毛玻璃风格 (Glassmorphism)** 视觉设计，具备完善的移动端自适应。

## ✨ 核心功能
1.  **AI 拍照识图记账**：上传每一餐的图片，大模型自动分析原料组成、估算重量、热量及碳水/蛋白质/脂肪数值。提供手动精修表单。
2.  **个人代谢计算 (TDEE)**：内置 Mifflin-St Jeor 基础代谢与活动水平公式，用户填写性别、身高、体重、年龄即自动计算每日消耗，并可通过滑动条设定卡路里缺口（如：每日 -500 kcal）。
3.  **仪表盘总览**：卡路里摄入与缺口进度盘、每日水杯打卡进度条、早餐/午餐/晚餐/加餐时间线。
4.  **趋势与数据分析**：使用原生 SVG 绘制高质感图表，追踪过去 7 天的卡路里对比、体重变化趋势以及营养素比例图。
5.  **双存储模式无缝切换**：
    *   **本地演示版 (local)**：使用浏览器 LocalStorage，开箱即用，无需登录，可通过配置文件填入通义千问 Key 运行真实识图。
    *   **云端服务器版 (cloud)**：启用 Auth Gate 统一注册与登录，实现多用户数据独立隔离与安全存储，数据保存在您部署的阿里云 PostgreSQL 数据库中。

---

## 📂 项目结构
```text
whatueat/
├── frontend/               # 前端项目 (React + Vite + Vanilla CSS)
│   ├── src/
│   │   ├── components/     # UI 组件 (Dashboard, MealScanner, Analytics, Settings)
│   │   ├── App.jsx         # 主控与数据流控制
│   │   ├── index.css       # 核心暗黑系毛玻璃设计系统样式
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── backend/                # 后端服务 (Node.js Express + pg)
│   ├── src/
│   │   ├── routes/         # 路由逻辑 (ai.js 接口, meals.js 数据接口)
│   │   ├── db.js           # 数据库配置与建表语句
│   │   ├── init_db.js      # 数据库表结构自动初始化脚本
│   │   └── index.js        # 后端入口
│   └── package.json
└── README.md               # 部署与配置说明文档
```

---

## 🚀 第一部分：本地开发与快速试用

### 1. 快速试用前端 (LocalStorage 模式)
为了让您最快体验，项目支持在没有任何服务器的情况下单机运行。
1.  确保前端配置 `frontend/src/config.js` 中的 `APP_CONFIG.mode` 为 `'local'`。
2.  进入前端目录：
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  在浏览器打开控制台输出的地址（通常是 `http://localhost:5173`）。
4.  免登录即可直接进入仪表盘进行本地 LocalStorage 存储。AI 通道默认配置为 `'mock'`（模拟演示数据，直接上传任何图即可获得随机或根据关键字生成的预设营养数据）。
5.  若要开启真实识图，您可在 `frontend/src/config.js` 中将 `localAiProvider` 设为 `'qwen'`，并在 `localAiApiKey` 填入您的阿里云百炼 API 密钥即可！

---

## ☁️ 第二部分：阿里云部署与云数据库搭建指南 (Ubuntu 22.04)

要真正实现多端同步和数据库持久化，我们需要将 `/backend` 和数据库部署在您的阿里云 ECS 云服务器上。

### 🛠️ 步骤 1: 阿里云安全组（防火墙）放行
购买服务器后，在阿里云控制台 -> 实例详情 -> 安全组规则中添加：
*   **手动添加** -> 目的端口 `3000` (Node.js API) -> 授权对象 `0.0.0.0/0` (若使用 Nginx 代理，建议仅放行 80/443 并关闭 3000 以提高安全性)。
*   放行 `80` (HTTP) 和 `443` (HTTPS) 端口。
*   放行 `22` (SSH 远程管理)。

---

### 📦 步骤 2: 安装 Node.js 与 Git
通过 SSH 工具连接到服务器后，执行：
```bash
# 更新源
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Git
sudo apt-get install git -y
```

---

### 💾 步骤 3: 安装与配置 PostgreSQL 数据库
1.  安装 PostgreSQL：
    ```bash
    sudo apt install postgresql postgresql-contrib -y
    ```
2.  登入 PostgreSQL 命令行：
    ```bash
    sudo -i -u postgres psql
    ```
3.  执行建库与授权指令（*请把密码修改为您自己的强密码*）：
    ```sql
    CREATE DATABASE whatueat;
    CREATE USER what_admin WITH PASSWORD 'YourStrongPassword123!';
    GRANT ALL PRIVILEGES ON DATABASE whatueat TO what_admin;
    \q
    ```
4.  此时您的数据库已在本地运行在 `5432` 端口，连接字符串为：
    `postgresql://what_admin:YourStrongPassword123!@localhost:5432/whatueat`。

---

### 🧠 步骤 4: 获取阿里云百炼 (Qwen-VL) API 密钥
1.  登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)。
2.  开通 **DashScope 灵积服务** 并实名认证（新用户会获赠大额度免费额度）。
3.  在控制台右上角头像下拉菜单中点击 **API-KEY** -> 创建 API-KEY。
4.  复制此 API Key 妥善保存。

---

### 🚀 步骤 5: 部署 Node.js 后端
1.  将项目 `/backend` 文件夹上传到服务器（例如 `/home/ubuntu/whatueat-backend`）。
2.  在 `/backend` 目录下创建环境变量文件 `.env`：
    ```env
    PORT=3000
    DATABASE_URL="postgresql://what_admin:YourStrongPassword123!@localhost:5432/whatueat"
    
    # 阿里云百炼 API 密钥 (用于 AI 图像识别)
    DASHSCOPE_API_KEY="您的阿里云百炼API密钥"
    
    # JWT 登录凭证加密密钥 (可随意填写一段长字符串)
    JWT_SECRET="whatueat_secure_session_key_987654321"
    ```
3.  安装依赖并初始化数据库：
    ```bash
    npm install
    # 初始化表结构 (自动运行 init_db.js 中的 SQL 命令)
    npm run init-db
    ```
4.  安装 `pm2` 进程管理，使得 API 服务在后台永不掉线：
    ```bash
    sudo npm install -g pm2
    
    # 启动应用
    pm2 start src/index.js --name "whatueat-api"
    
    # 保持开机自启动
    pm2 startup
    pm2 save
    ```
    您可输入 `pm2 logs` 查看后台启动日志。如果显示 `🚀 WhatUEat 后台服务已成功启动！` 即表示后端启动就绪。

---

### 🌐 步骤 6: 配置 Nginx 反向代理与 HTTPS 证书（推荐）
为了安全和美观，我们通常不会将 `3000` 端口直接暴露在公网，而是用域名或 80 端口代理，并通过 SSL 加密传输（因为部分浏览器拍照功能需要 HTTPS 权限才允许打开摄像头）。

1.  安装 Nginx:
    ```bash
    sudo apt install nginx -y
    ```
2.  编辑 Nginx 默认配置文件：
    ```bash
    sudo nano /etc/nginx/sites-available/default
    ```
3.  将 `server` 块修改为反向代理配置：
    ```nginx
    server {
        listen 80;
        server_name your_domain.com; # 改为您的域名或服务器公网 IP

        location / {
            # 代理到后端 Express 端口
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            
            # 支持 Base64 图片大体积上传限制
            client_max_body_size 15m;
        }
    }
    ```
4.  重启 Nginx 使配置生效：
    ```bash
    sudo systemctl restart nginx
    ```
5.  **可选 (配置免费 SSL 证书)**：
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d your_domain.com
    ```
    根据提示输入邮箱同意协议，Certbot 会自动帮您申请 Let's Encrypt 证书并修改 Nginx 为极安全的 443 HTTPS 访问！

---

## 🎨 第三部分：前端发布与部署 (Netlify / GitHub Pages)

1.  本地打开 `/frontend/src/config.js`，修改配置 `APP_CONFIG`：
    *   **如果您想以云数据库模式运行**：将 `mode` 设为 `'cloud'`，并将 `serverUrl` 替换为您的阿里云后端服务器 IP 或域名（在本地 localhost 运行时系统会自动向下兼容）。
    *   **如果您想以纯本地 LocalStorage 模式运行**：将 `mode` 设为 `'local'`。如果需要真实 AI 识图，可在此文件配置 `localAiApiKey` 密钥与 `localAiProvider`。
2.  在 `/frontend` 目录下运行编译打包命令：
    ```bash
    npm run build
    ```
3.  打包完成后会生成 `dist/` 文件夹。
4.  **托管发布**：
    *   **Netlify**: 注册 Netlify 账号，将 `dist` 文件夹直接拖拽到页面上传，即可秒级获得一个公网可访问的网页链接。
    *   **GitHub/Gitee Pages**: 可以将代码 Push 到仓库，开启 Pages 静态网页托管功能，指向 `dist` 目录。
5.  **开始使用**：
    *   如果是 **云端服务器模式**：一进入网页即会弹出高颜值毛玻璃的“登录/注册”界面。登录成功后，您的所有饮食打卡、水杯打卡和体重数据，都将实时同步并独立隔离保存在云端数据库中。
    *   如果是 **本地演示模式**：可以直接免登录浏览所有板块，右上角将不显示用户账号与退出按钮，数据完全保存在当前浏览器的 LocalStorage 中。
