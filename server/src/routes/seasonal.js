// POST /api/seasonal — 时令推荐：当月应季食材 + 匹配菜谱
const { Recipe, SeasonalIngredient } = require('../models');
const { nowParts, ok, fail } = require('../utils');

module.exports = async (req, res) => {
  try {
    const parts = nowParts();
    const month = req.body.month || parts.month;
    const season = parts.season;

    const info = (await SeasonalIngredient.findOne({ month })) || { month, solarTerm: '', ingredients: [], note: '' };

    const recipes = await Recipe.find({
      familyId: '',
      seasonTags: { $in: [season, '四季'] }
    }).limit(req.body.limit || 12);

    ok(res, {
      month,
      season,
      solarTerm: info.solarTerm,
      ingredients: info.ingredients,
      note: info.note,
      recipes
    });
  } catch (err) {
    fail(res, 500, err.message);
  }
};
