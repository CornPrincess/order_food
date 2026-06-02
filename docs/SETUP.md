# 部署与配置指南

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
