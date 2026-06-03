// POST /api/recipes — 列表 / 详情 / 新增 / 种子初始化
const { User, Recipe } = require('../models');
const { runSeed } = require('../seedRunner');
const { ok, fail } = require('../utils');

async function getFamilyId(openid) {
  const me = await User.findOne({ openid });
  return me ? me.familyId : '';
}

module.exports = async (req, res) => {
  const openid = req.openid;
  const { action } = req.body || {};

  try {
    switch (action) {
      case 'list': {
        const familyId = await getFamilyId(openid);
        const query = { familyId: { $in: ['', familyId].filter((v) => v !== undefined) } };
        if (req.body.cuisine) query.cuisine = req.body.cuisine;
        if (req.body.seasonTag) query.seasonTags = { $in: [req.body.seasonTag, '四季'] };
        if (req.body.tasteTag) query.tasteTags = req.body.tasteTag;
        let recipes = await Recipe.find(query).limit(req.body.limit || 50);
        if (req.body.keyword) {
          recipes = recipes.filter((r) => r.name.includes(req.body.keyword));
        }
        return ok(res, { recipes });
      }

      case 'detail': {
        const recipe = await Recipe.findById(req.body.recipeId);
        return ok(res, { recipe });
      }

      case 'add': {
        const familyId = await getFamilyId(openid);
        const recipe = await Recipe.create({
          name: req.body.name,
          cuisine: req.body.cuisine || '家常',
          ingredients: req.body.ingredients || [],
          steps: req.body.steps || [],
          tasteTags: req.body.tasteTags || [],
          seasonTags: req.body.seasonTags || ['四季'],
          nutritionTags: req.body.nutritionTags || [],
          cookTime: req.body.cookTime || 0,
          difficulty: req.body.difficulty || '易',
          source: req.body.source || 'user',
          familyId: req.body.isPublic ? '' : familyId,
          createdBy: openid
        });
        return ok(res, { recipeId: recipe._id.toString(), ...recipe.toObject() });
      }

      case 'initSeed': {
        const { recipesInserted, seasonalInserted } = await runSeed();
        return ok(res, { recipesInserted, seasonalInserted });
      }

      default:
        return fail(res, 400, '未知 action');
    }
  } catch (err) {
    fail(res, 500, err.message);
  }
};
