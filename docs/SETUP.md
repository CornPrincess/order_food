# 部署与配置指南

本项目有**两种可切换的后端**，由 `miniprogram/app.js` 的 `backend` 开关决定：

- **方案 A · 微信云开发**（`backend: 'cloud'`）：本文第 1–8 节。无需服务器，最省事。
- **方案 B · 自建后端**（`backend: 'server'`）：部署在自己的服务器（如阿里云），见 [第 9 节](#9-方案-b自建后端阿里云)，详细文档在 [`server/README.md`](../server/README.md)。

两套后端接口完全一致，小程序页面代码无需改动；按需选其一即可。

---

# 方案 A · 微信云开发

## 1. 准备工作

- 注册微信小程序账号，拿到 **AppID**（个人号即可，需能使用云开发）。
- 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
- 申请一个国产大模型 API Key，默认对接 **DeepSeek**（https://platform.deepseek.com ）。

## 2. 导入项目

1. 开发者工具 → 导入项目 → 选择本仓库根目录。
2. 填入你的 AppID（`project.config.json` 里默认是 `touristappid`，请替换）。

## 3. 开通云开发并配置环境

1. 工具顶部点击「云开发」，开通后会得到一个**环境 ID**。
2. 把环境 ID 填入 `miniprogram/app.js`：
   ```js
   cloudEnv: '你的环境ID'
   ```

## 4. 部署云函数

对 `cloudfunctions/` 下每个函数：右键 →「上传并部署：云端安装依赖」。

共 7 个：`login`、`family`、`recipes`、`vote`、`seasonal`、`aiRecommend`、`aiAnalyze`。

## 5. 配置大模型环境变量

在「云开发控制台 → 云函数」中，为 `aiRecommend` 和 `aiAnalyze` 两个函数分别添加环境变量：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 是 | 你的大模型 API Key |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com`，换厂商时改这里 |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |

> 换用其它 OpenAI 兼容的国产模型（通义/豆包等）只需改 BASE_URL、MODEL、KEY 即可，无需改代码。
>
> `DEEPSEEK_API_KEY` 的申请方式见 [server/README.md「环境变量：含义与获取方式」](../server/README.md#环境变量含义与获取方式)。

## 6. 导入种子数据

云开发控制台 → 云函数 → `recipes` → 云端测试，传入：

```json
{ "action": "initSeed" }
```

成功返回 `{ "recipesInserted": N, "seasonalInserted": 12 }`。

## 7. 创建数据库集合（如未自动创建）

云函数首次写入会自动建集合。若需手动建，请在云数据库创建：
`users`、`families`、`recipes`、`dailyMenus`、`mealRecords`、`seasonalIngredients`，
权限均设为「仅创建者可读写」（数据由云函数代为读写，按 `familyId` 隔离）。

## 8. 体验

编译预览 → 创建家庭 → 在「我的」里设置口味/忌口 → 把邀请码发给家人 →
「点餐」加菜投票 → 「推荐」生成 AI 配菜 → 确定菜单后到「分析」查看饮食结构。

---

# 方案 B · 自建后端（阿里云）

把云函数换成部署在自己服务器上的 Express + MongoDB 后端。完整文档（含环境变量获取、调试、排错）见 [`server/README.md`](../server/README.md)，这里给出主线步骤。

## 9. 方案 B：自建后端（阿里云）

### 9.1 前置条件

- 一台已装 **Docker / docker compose** 的服务器（阿里云 ECS 等）。
- 一个**已 ICP 备案**的域名（小程序只能请求 HTTPS 备案域名）。
- 安全组放行 80、443。
- 小程序的 **AppID + AppSecret**（公众平台「开发管理 → 开发设置 → 开发者ID」获取）与 **DeepSeek API Key**。
  各凭证获取方式详见 [server/README.md「环境变量：含义与获取方式」](../server/README.md#环境变量含义与获取方式)。

### 9.2 准备证书 + 一键起服务（Docker）

`docker compose` 已内置 **mongo + app + nginx** 三件套，nginx 自带 `food.bbmmcc.cn` 的反代配置并终止 HTTPS，一条命令即可全部拉起。

```bash
git clone <仓库地址> && cd order_food/server
cp .env.example .env && vim .env     # 填 JWT_SECRET / WX_APPID / WX_SECRET / DEEPSEEK_API_KEY，ALLOW_MOCK_LOGIN=false

# 放置证书（nginx 的 443 需要）：把证书命名为下面两个文件放进 deploy/nginx/ssl/
#   deploy/nginx/ssl/food.bbmmcc.cn.pem   (证书 fullchain)
#   deploy/nginx/ssl/food.bbmmcc.cn.key   (私钥)
# 阿里云免费 DV 证书下载 Nginx 格式重命名即可；或先自签让服务起来：
#   bash deploy/gen-selfsigned.sh food.bbmmcc.cn

docker compose up -d --build         # 启动 mongo + app + nginx，自动导入种子(AUTO_SEED=true)
docker compose ps                    # 三个容器均 running
curl http://127.0.0.1:3000/health        # 后端本机直连
curl -k https://food.bbmmcc.cn/health    # 经 nginx 的 HTTPS
```

> ⚠️ 不要在宿主机直接 `npm run seed/dev`——compose 内数据库主机名 `mongo` 仅容器网络可解析，宿主机直接跑会报 `ENOTFOUND mongo`。调试命令都用 `docker compose exec app ...`（详见 server/README「Docker 环境下调试」）。
>
> 用 Let's Encrypt 自动签发：`bash deploy/issue-cert.sh food.bbmmcc.cn 你的邮箱`（域名需已解析到本机、nginx 已起）。

### 9.3 配置微信合法域名

在 **公众平台 → 开发管理 → 开发设置 → 服务器域名** 的 **request 合法域名** 添加 `https://food.bbmmcc.cn`。

### 9.4 切换小程序到自建后端

编辑 `miniprogram/app.js`（`serverBaseUrl` 已预填为 `https://food.bbmmcc.cn`，只需把 `backend` 改成 `server`）：

```js
backend: 'server',
serverBaseUrl: 'https://food.bbmmcc.cn'
```

重新编译上传即可。想切回云开发把 `backend` 改回 `'cloud'`。

### 9.5 验证

开发者工具里关闭域名校验后，用模拟器走一遍：创建家庭 → 设口味 → 点餐投票 → 定菜单 → AI 推荐/分析。
或在服务器上临时设 `ALLOW_MOCK_LOGIN=true` 后跑 `docker compose exec app npm run smoke`（验证后改回 `false`）。

---

## 数据模型字段

| 集合 | 关键字段 |
| --- | --- |
| `users` | `openid, nickname, avatarUrl, familyId, role, tastes[], dislikes[], allergies[]` |
| `families` | `name, inviteCode, ownerOpenid, memberOpenids[]` |
| `recipes` | `name, cuisine, ingredients[], steps[], tasteTags[], seasonTags[], nutritionTags[], cookTime, difficulty, source(seed/ai/user), familyId(空=公共)` |
| `dailyMenus` | `familyId, date, meal, items[{recipeId,name,votedBy[]}], status(投票中/已定)` |
| `mealRecords` | `familyId, date, meal, recipeIds[], nutritionTags[]` |
| `seasonalIngredients` | `month, solarTerm, region, ingredients[], note` |

## 故障排查

- **调用云函数报 -501007 / 环境未找到**：检查 `app.js` 的 `cloudEnv` 是否正确。
- **AI 返回「未配置 DEEPSEEK_API_KEY」**：确认环境变量加在了对应函数上并重新部署。
- **AI 偶尔解析失败**：已内置 JSON 容错截取；如频繁失败可降低 temperature 或更换模型。
- **推荐总是重复**：先到「点餐」确定几次菜单，积累 `mealRecords` 后推荐会自动去重。
