# WhatUEat 微信小程序前端

这是原生微信小程序版本，复用现有 `backend` 接口，不影响当前 `frontend` 网页端。

## 本地打开

1. 打开微信开发者工具。
2. 导入项目目录：`/Users/flamingo/whatueat/miniprogram`。
3. 第一次可使用游客 AppID 预览；准备上线时，把 `project.config.json` 里的 `appid` 改成你自己的小程序 AppID。
4. 当前开发测试后端地址写在 `config.js`，不会展示给小程序用户。

## 上线前必须配置

1. 后端必须是 HTTPS，不能只用公网 IP 的 HTTP。
2. 微信小程序后台需要把后端 HTTPS 域名加入「开发管理 → 开发设置 → 服务器域名 → request 合法域名」。
3. 如果线上接口路径仍是当前项目结构，小程序会请求：
   - `POST /api/meals/register`
   - `POST /api/meals/login`
   - `GET /api/meals`
   - `POST /api/meals`
   - `DELETE /api/meals/:id`
   - `PUT /api/meals/profile`
   - `POST /api/ai/scan`
   - `POST /api/ai/estimate-text`

## 已包含页面

- 首页：日期切换、每日 TDEE 覆盖、热量进度、手动快速记录、AI 文本估算、常用食物填充、喝水、饮食列表。
- 拍照：选择图片、AI 识别、编辑识别结果、生成 320px 缩略图后保存。
- 统计：近 7 天摄入/TDEE/缺口、喝水、平均宏量营养素。
- 我的：登录/注册、退出登录、个人档案、TDEE 估算与同步。服务器地址只在配置文件里维护，不展示给普通用户。

## 图片存储说明

拍照页保存时会把图片裁成 320px 正方形 JPEG 缩略图，再以 Base64 data URL 存到现有 `meals.image` 字段。若缩略图生成失败，会只保存餐食数据，不保存图片。
