// 可复用的种子导入逻辑（幂等）。被 scripts/seed.js、index.js 自动导入、recipes 接口共用。
const { Recipe, SeasonalIngredient } = require('./models');
const { RECIPES, SEASONAL } = require('./data/seedData');

async function runSeed() {
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
  return { recipesInserted, seasonalInserted };
}

module.exports = { runSeed };
