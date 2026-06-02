# 种子数据

种子菜谱与时令食材表的**权威数据源**位于：

- `cloudfunctions/recipes/seedData.js`

之所以放在云函数内，是因为微信云函数部署时只能打包自身目录的文件。

## 如何导入

种子数据通过 `recipes` 云函数的 `initSeed` action 幂等导入（重复执行不会产生重复数据）。

在微信开发者工具中：

1. 上传并部署 `recipes` 云函数。
2. 打开「云开发控制台 → 云函数 → recipes → 云端测试」，传入：
   ```json
   { "action": "initSeed" }
   ```
3. 返回 `{ "recipesInserted": N, "seasonalInserted": 12 }` 即导入成功。

导入后会写入两个集合：

- `recipes`：公共家常菜（`familyId` 为空字符串）
- `seasonalIngredients`：12 个月的应季食材表

## 扩充种子

直接编辑 `cloudfunctions/recipes/seedData.js` 的 `RECIPES` / `SEASONAL` 数组，
重新部署 `recipes` 云函数并再次执行 `initSeed` 即可。
