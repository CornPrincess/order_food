// 种子导入脚本：node src/scripts/seed.js（或 npm run seed）
// 与 recipes 接口的 initSeed 等价，幂等。
const mongoose = require('mongoose');
const { mongoUri } = require('../config');
const { Recipe, SeasonalIngredient } = require('../models');
const { RECIPES, SEASONAL } = require('../data/seedData');

async function run() {
  await mongoose.connect(mongoUri);
  let recipesInserted = 0;
  for (const r of RECIPES) {
    const exist = await Recipe.countDocuments({ name: r.name, familyId: '' });
    if (exist === 0) {
      await Recipe.create({ ...r, source: 'seed', familyId: '', createdBy: 'system' });
      recipesInserted++;
    }
  }
  let seasonalInserted = 0;
  for (const s of SEASONAL) {
    const exist = await SeasonalIngredient.countDocuments({ month: s.month });
    if (exist === 0) {
      await SeasonalIngredient.create(s);
      seasonalInserted++;
    }
  }
  console.log(`种子导入完成：菜谱 +${recipesInserted}，时令表 +${seasonalInserted}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
