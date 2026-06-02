# 自建后端（Express + MongoDB）

微信云函数的等价替代实现，部署在自己的服务器（如阿里云）上。接口、入参、返回信封与云函数完全一致，前端通过 `app.js` 的 `backend` 开关切换。

## 接口一览

所有接口为 `POST /api/<name>`，请求/响应体为 JSON，统一信封 `{ code, data, message }`（`code === 0` 表示成功）。

| 接口 | 说明 | 鉴权 |
| --- | --- | --- |
| `/api/login` | code2session 换 openid，签发 JWT | 否 |
| `/api/family` | 创建/加入/成员/资料（`action`） | 是 |
| `/api/recipes` | 列表/详情/新增/initSeed（`action`） | 是 |
| `/api/vote` | today/addItem/toggleVote/finalize（`action`） | 是 |
| `/api/seasonal` | 时令推荐 | 是 |
| `/api/aiRecommend` | AI 食谱推荐 | 是 |
| `/api/aiAnalyze` | AI 饮食分析 | 是 |
| `/health` | 健康检查 | 否 |

鉴权方式：登录后返回 `token`，后续请求带 `Authorization: Bearer <token>`。

## 与云函数的差异

- **登录**：云函数用 `getWXContext()` 自动取 openid；这里由小程序 `wx.login()` 拿 `code`，后端用 `WX_APPID + WX_SECRET` 调 `code2session` 换 openid，再签发 JWT。
- **数据库**：微信云数据库 → MongoDB（mongoose 模型见 `src/models.js`）。

## 本地开发

```bash
cd server
cp .env.example .env      # 填写 JWT_SECRET / WX_APPID / WX_SECRET / DEEPSEEK_API_KEY
# 本地需自备一个 MongoDB，并把 MONGODB_URI 改成 mongodb://localhost:27017/order_food
npm install
npm run seed              # 导入种子菜谱与时令表
npm run dev
```

无微信凭证联调时，可设 `ALLOW_MOCK_LOGIN=true`，登录时传 `{ "mockOpenid": "test-user-1" }` 即可跳过微信换码。

## 用 Docker 部署到阿里云（推荐）

前置：服务器已装 Docker 与 docker compose；有一个**已 ICP 备案**的域名。

```bash
# 1. 拉代码
git clone <repo> && cd order_food/server

# 2. 配置环境变量
cp .env.example .env && vim .env   # 填 JWT_SECRET / WX_APPID / WX_SECRET / DEEPSEEK_API_KEY

# 3. 起服务（app + mongo）
docker compose up -d --build

# 4. 导入种子数据
docker compose exec app npm run seed

# 5. 健康检查
curl http://127.0.0.1:3000/health
```

### 配置 HTTPS（小程序强制要求）

小程序只能请求 HTTPS 域名。用 Nginx 反向代理到 `127.0.0.1:3000`：

1. 申请该备案域名的 SSL 证书（阿里云免费证书或 certbot）。
2. 参考 `deploy/nginx.conf.example` 配置并 `nginx -s reload`。
3. 在微信公众平台「开发管理 → 开发设置 → 服务器域名」的 **request 合法域名** 中加入 `https://your-domain.com`。

### 切换小程序到自建后端

编辑 `miniprogram/app.js`：

```js
backend: 'server',
serverBaseUrl: 'https://your-domain.com'
```

重新编译即可。想切回云函数把 `backend` 改回 `'cloud'`。

## 安全提示

- `.env` 不要提交（已在 `.gitignore`）。
- `JWT_SECRET` 用足够长的随机串；`ALLOW_MOCK_LOGIN` 生产环境必须为 `false`。
- 生产环境建议给 MongoDB 配置账号密码，并不要对公网暴露 27017 端口（compose 默认不暴露）。
