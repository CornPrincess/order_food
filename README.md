# 家庭点餐小程序（order_food）

一个面向家庭的微信小程序：和家人一起决定「今天吃什么」。区分点餐者身份、按时令推荐应季菜、用大模型智能配菜，并分析最近的饮食结构。

## 功能

- 👨‍👩‍👧 **家庭与身份**：微信登录自动识别，创建/邀请码加入家庭，每位成员有独立口味、忌口、过敏档案。
- 🗳️ **点餐与投票**：早/中/晚餐分别从菜谱库加菜、全家投票、确定今日菜单。
- 🌱 **时令推荐**：按当前月份/节气推荐应季食材与当季家常菜（内置静态表，零成本）。
- 🤖 **智能食谱推荐**：结合全家口味/忌口/过敏 + 当季食材 + 最近已做菜，由大模型推荐一桌菜（接 DeepSeek）。
- 📊 **饮食分析**：统计最近 N 天营养结构，由大模型给出均衡评价与改进建议。

## 技术栈

- 微信原生小程序（WXML/WXSS/JS）
- **后端两套可切换**（前端 `app.js` 的 `backend` 开关）：
  - `cloud`：微信云开发 CloudBase（云数据库 + 7 个云函数）
  - `server`：自建后端 Express + MongoDB，Docker 部署到自己的服务器（如阿里云），见 [server/README.md](server/README.md)
- 国产大模型 DeepSeek（OpenAI 兼容接口，经后端调用，规避小程序合法域名限制）

> 两套后端的接口名、入参、返回信封完全一致，业务逻辑等价；切换只需改 `app.js` 的 `backend` 与对应地址。

## 目录结构

```
miniprogram/        小程序前端
  pages/            8 个页面（首页/点餐/推荐/分析/我的/菜谱/详情/onboarding）
  utils/            cloud 调用、登录态、节气工具
cloudfunctions/     7 个云函数
  login            登录建用户
  family           家庭创建/加入/成员/资料
  recipes          菜谱 CRUD + 种子初始化（含 seedData.js）
  vote             点餐/投票/确定菜单
  seasonal         时令推荐
  aiRecommend      AI 食谱推荐（含 llm.js）
  aiAnalyze        AI 饮食分析（含 llm.js）
scripts/seed/       种子数据导入说明
```

## 数据库集合

`users`、`families`、`recipes`、`dailyMenus`、`mealRecords`、`seasonalIngredients`
（字段说明见 `docs/SETUP.md`）

## 快速开始

详见 **[docs/SETUP.md](docs/SETUP.md)**。概要：

1. 用微信开发者工具导入本项目，填入自己的小程序 AppID。
2. 开通云开发，得到环境 ID，填入 `miniprogram/app.js` 的 `cloudEnv`。
3. 部署全部云函数；给 `aiRecommend`、`aiAnalyze` 配置环境变量 `DEEPSEEK_API_KEY`。
4. 调用 `recipes` 云函数的 `initSeed` 导入种子菜谱与时令表。
5. 编译预览，创建家庭即可开始点餐。
