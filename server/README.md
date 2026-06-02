# 自建后端（Express + MongoDB）

微信云函数的等价替代实现，部署在自己的服务器（如阿里云）上。接口名、入参、返回信封与云函数完全一致，小程序前端通过 `miniprogram/app.js` 的 `backend` 开关在「云函数 / 自建后端」之间切换。

- 语言/框架：Node.js 18 + Express
- 数据库：MongoDB（mongoose）
- 鉴权：JWT
- 大模型：DeepSeek（OpenAI 兼容接口，可换其它国产模型）
- 部署：Docker Compose（app + mongo）+ Nginx 反代 HTTPS

---

## 目录

1. [接口一览](#接口一览)
2. [环境变量：含义与获取方式](#环境变量含义与获取方式)
3. [本地开发与调试](#本地开发与调试)
4. [Docker 部署到阿里云（生产）](#docker-部署到阿里云生产)
5. [配置 HTTPS](#配置-https)
6. [把小程序切到自建后端](#把小程序切到自建后端)
7. [日志与限流](#日志与限流)
8. [与云函数的差异](#与云函数的差异)
9. [常见问题排查](#常见问题排查)
10. [安全清单](#安全清单)

---

## 接口一览

所有业务接口为 `POST /api/<name>`，请求/响应体为 JSON，统一信封 `{ code, data, message }`（`code === 0` 成功）。

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

鉴权方式：登录返回 `token`，后续请求带请求头 `Authorization: Bearer <token>`。

---

## 环境变量：含义与获取方式

复制 `.env.example` 为 `.env` 后逐项填写。下面说明每个值的来源。

| 变量 | 必填 | 来源 |
| --- | --- | --- |
| `PORT` | 否 | 服务监听端口，默认 `3000` |
| `MONGODB_URI` | 是 | 数据库连接串。Docker 部署用默认 `mongodb://mongo:27017/order_food`；本地裸跑用 `mongodb://localhost:27017/order_food` |
| `JWT_SECRET` | 是 | **自己生成**，见下 |
| `WX_APPID` | 是* | 微信公众平台，见下 |
| `WX_SECRET` | 是* | 微信公众平台，见下 |
| `ALLOW_MOCK_LOGIN` | 否 | 本地联调用 `true` 可跳过微信登录；**生产必须 `false`** |
| `DEEPSEEK_API_KEY` | 是** | DeepSeek 开放平台，见下 |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com`，换厂商时改 |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `LOG_LEVEL` | 否 | `debug/info/warn/error`，默认 `info` |
| `RATE_WINDOW_MS` / `RATE_API_MAX` / `RATE_LOGIN_MAX` / `RATE_AI_MAX` | 否 | 限流窗口与各档上限 |

> \* 开启 `ALLOW_MOCK_LOGIN=true` 联调时，`WX_APPID/WX_SECRET` 可暂不填。
> \*\* 不填 `DEEPSEEK_API_KEY` 时，点餐/投票/时令等功能照常，仅「智能推荐」「饮食分析」会报错。

### JWT_SECRET —— 自己生成（不去任何平台）

后端给登录态签名用的密钥，任意足够长的随机串即可，关键是别人猜不到、别泄露。生成一个：

```bash
# 二选一
openssl rand -base64 48
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

把输出贴到 `.env` 的 `JWT_SECRET=`。更换它会使所有已登录用户需要重新登录。

### WX_APPID + WX_SECRET —— 微信公众平台

后端用这两个凭证调微信 `code2session`，把小程序登录 `code` 换成 `openid`。

1. 登录 **微信公众平台** https://mp.weixin.qq.com （注册小程序的账号）
2. 左侧 **「开发管理」→「开发设置」→「开发者ID」**
3. **AppID(小程序ID)** → 直接复制，填 `WX_APPID`
4. **AppSecret(小程序密钥)** → 点 **「重置/生成」**，管理员微信扫码后**只显示一次**，立刻复制填 `WX_SECRET`（忘了只能重置，重置后旧值立即失效）

> `WX_APPID` 必须与小程序前端 `project.config.json` 里的 AppID **完全一致**，否则换 openid 会失败。

### DEEPSEEK_API_KEY —— DeepSeek 开放平台

1. 登录 **DeepSeek 开放平台** https://platform.deepseek.com
2. 左侧 **「API Keys」→「创建 API Key」**，生成后**只显示一次**，复制填 `DEEPSEEK_API_KEY`
3. 在账户里充值（按 token 计费，家庭用量极小）
4. `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` 保持默认即可

> 想换其它 OpenAI 兼容的国产模型（通义千问 / 豆包 / Kimi 等）：只改 `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`、`DEEPSEEK_API_KEY` 三个变量，代码无需改动。

---

## 本地开发与调试

适合在自己电脑上先把后端跑通、调好接口，**无需微信凭证、无需 HTTPS**。

### 前置

- Node.js ≥ 18
- 一个本地 MongoDB（任选）：
  - Docker：`docker run -d --name mongo -p 27017:27017 mongo:7`
  - 或本机安装 MongoDB 社区版

### 步骤

```bash
cd server
cp .env.example .env
```

编辑 `.env`，本地最简配置：

```bash
MONGODB_URI=mongodb://localhost:27017/order_food
JWT_SECRET=<上面生成的随机串>
ALLOW_MOCK_LOGIN=true          # 关键：跳过微信登录，用假 openid 联调
# WX_APPID / WX_SECRET 可留空
# DEEPSEEK_API_KEY 想调 AI 才填
```

```bash
npm install
npm run seed        # 导入 20 道种子菜谱 + 12 月时令表（幂等）
npm run dev         # 启动，文件变更自动重启（node --watch）
```

### 验证

```bash
# 健康检查
curl http://127.0.0.1:3000/health

# 端到端冒烟（需 ALLOW_MOCK_LOGIN=true）：登录→建/入家庭→点餐投票→定菜单
npm run smoke
```

`npm run smoke` 会用假 openid 跑通核心闭环并逐项打勾。也可手动测：

```bash
# 1. 登录拿 token（mockOpenid 任意字符串）
curl -s -X POST http://127.0.0.1:3000/api/login \
  -H 'content-type: application/json' \
  -d '{"mockOpenid":"u1","nickname":"爸爸"}'

# 2. 用返回的 token 调业务接口
curl -s -X POST http://127.0.0.1:3000/api/recipes \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <上一步的 token>' \
  -d '{"action":"list"}'
```

### 配合小程序联调

小程序请求 HTTP `localhost` 需在微信开发者工具里关闭域名校验：**详情 → 本地设置 → 勾选「不校验合法域名…」**，并把 `miniprogram/app.js` 改成：

```js
backend: 'server',
serverBaseUrl: 'http://127.0.0.1:3000'
```

> 注意：用真机预览/体验版时无法关闭域名校验，必须是已备案的 HTTPS 域名（见下）。本地 HTTP 仅限开发者工具模拟器联调。

---

## Docker 部署到阿里云（生产）

前置：

- 一台阿里云 ECS（建议 2C2G 起），已安装 **Docker** 与 **docker compose**
- 一个**已完成 ICP 备案**的域名（阿里云国内服务器强制）
- 安全组放行 80、443 端口

### 1. 安装 Docker（若未装）

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version   # 确认自带 compose 插件
```

### 2. 拉取代码并配置

```bash
git clone <你的仓库地址> && cd order_food/server
cp .env.example .env
vim .env
```

生产 `.env` 关键项：

```bash
JWT_SECRET=<随机串>
WX_APPID=<你的小程序 AppID>
WX_SECRET=<你的小程序 AppSecret>
ALLOW_MOCK_LOGIN=false        # 生产务必 false
DEEPSEEK_API_KEY=<你的 Key>
# MONGODB_URI 不用改，compose 会覆盖为容器内 mongo 服务
```

### 3. 启动服务（app + mongo）

```bash
docker compose up -d --build
docker compose ps           # 两个容器都应为 running
```

### 4. 导入种子数据

```bash
docker compose exec app npm run seed
```

### 5. 健康检查与日志

```bash
curl http://127.0.0.1:3000/health        # {"code":0,...}
docker compose logs -f app                # 实时查看访问日志
```

### 常用运维命令

```bash
docker compose restart app                # 重启应用
docker compose down                       # 停止（数据保留在卷 mongo_data）
docker compose up -d --build              # 改代码/依赖后重新构建上线
docker compose exec mongo mongosh order_food   # 进数据库
```

---

## 配置 HTTPS

小程序只能请求 **HTTPS + 备案域名**。用 Nginx 反向代理到本机 `3000`。

1. 为域名申请 SSL 证书：阿里云控制台「数字证书管理服务」可领**免费 DV 证书**，或用 `certbot`。
2. 把证书放到服务器（如 `/etc/nginx/ssl/`），参考本仓库 `deploy/nginx.conf.example` 配置：
   ```bash
   cp deploy/nginx.conf.example /etc/nginx/conf.d/order_food.conf
   vim /etc/nginx/conf.d/order_food.conf   # 替换域名与证书路径
   nginx -t && nginx -s reload
   ```
3. 验证：浏览器访问 `https://你的域名/health` 返回 `{"code":0,...}`。
4. 在 **微信公众平台 → 开发管理 → 开发设置 → 服务器域名** 的 **request 合法域名** 添加 `https://你的域名`。

---

## 把小程序切到自建后端

编辑 `miniprogram/app.js`：

```js
backend: 'server',
serverBaseUrl: 'https://你的域名'
```

重新编译、上传体验版即可。想切回微信云开发，把 `backend` 改回 `'cloud'`。两套后端接口完全一致，页面代码无需改动。

---

## 日志与限流

- **访问日志**：`morgan` 输出每条请求 `IP openid 方法 路径 状态码 耗时`，经统一 `logger` 打到 stdout（`docker compose logs -f app` 查看）。级别由 `LOG_LEVEL` 控制。
- **限流**：`express-rate-limit`，按「IP + openid」计数，窗口内超限返回 `429`（含标准 `RateLimit-*` 响应头）：
  - 全局接口 `RATE_API_MAX`（默认 120/分钟）
  - 登录 `RATE_LOGIN_MAX`（默认 10/分钟，防爆破）
  - AI 接口 `RATE_AI_MAX`（默认 10/分钟，控大模型成本）
- 应用部署在 Nginx 之后，已 `trust proxy`，按真实客户端 IP 计数（Nginx 示例已透传 `X-Forwarded-For`）。

---

## 与云函数的差异

- **登录**：云函数用 `getWXContext()` 自动取 openid；这里由小程序 `wx.login()` 拿 `code`，后端用 `WX_APPID + WX_SECRET` 调 `code2session` 换 openid，再签发 JWT。
- **数据库**：微信云数据库 → MongoDB（mongoose 模型见 `src/models.js`）。
- 业务逻辑、集合字段、种子数据均与云函数版本对应一致。

---

## 常见问题排查

| 现象 | 排查方向 |
| --- | --- |
| 登录返回「服务端未配置 WX_APPID / WX_SECRET」 | `.env` 未填凭证；或本地联调应改用 `ALLOW_MOCK_LOGIN=true` + `mockOpenid` |
| 登录返回「微信登录失败: 40029/40163」 | `code` 失效或被复用（每次登录前重新 `wx.login()`）；检查 AppID/AppSecret 是否匹配 |
| 业务接口返回 401 | 没带 `Authorization: Bearer <token>`，或 token 过期（30 天）需重新登录 |
| 接口返回 429 | 触发限流，调大 `.env` 里对应 `RATE_*` 或稍后重试 |
| AI 接口报错「未配置 DEEPSEEK_API_KEY」/ 余额不足 | 填 Key 并在 DeepSeek 平台充值；非 AI 功能不受影响 |
| 连不上数据库 / mongoose 超时 | 检查 `MONGODB_URI`；Docker 下应为 `mongodb://mongo:27017/...`，本地为 `localhost` |
| 小程序请求被拦截「不在以下 request 合法域名列表中」 | 在公众平台配置 request 合法域名；开发者工具可临时关闭域名校验 |
| 真机打开报 SSL/证书错误 | 证书未正确安装或域名未备案；检查 `https://域名/health` 是否正常 |

---

## 安全清单

- `.env` 不提交仓库（已在 `.gitignore`）。
- `JWT_SECRET` 用足够长随机串；`ALLOW_MOCK_LOGIN` 生产必须 `false`。
- 给 MongoDB 配账号密码，不要对公网暴露 `27017`（compose 默认不暴露端口）。
- 定期轮换 `WX_SECRET` 与 `DEEPSEEK_API_KEY`；发现泄露立即在对应平台重置。
- 安全组仅放行必要端口（80/443）。
