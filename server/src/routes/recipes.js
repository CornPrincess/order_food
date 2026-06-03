// POST /api/recipes — 列表 / 详情 / 新增 / 种子初始化
const { User, Recipe } = require('../models');
const { runSeed } = require('../seedRunner');
const { ok, fail } = require('../utils');

async function getFamilyId(openid) {
  const me = await User.findOne({ openid });
  return me ? me.familyId : '';
}

// 聚合全家忌口/过敏（须避开）与口味偏好（用于排序）
async function familyPrefs(familyId) {
  const out = { dislikes: new Set(), allergies: new Set(), tastes: new Set() };
  if (!familyId) return out;
  const members = await User.find({ familyId });
  members.forEach((m) => {
    (m.dislikes || []).forEach((d) => out.dislikes.add(d));
    (m.allergies || []).forEach((a) => out.allergies.add(a));
    (m.tastes || []).forEach((t) => out.tastes.add(t));
  });
  return out;
}

// 给单个菜谱打软提示标记：命中的忌口/过敏词 + 口味匹配数
function annotate(recipe, prefs) {
  const text = [
    recipe.name,
    ...(recipe.ingredients || []),
    ...(recipe.tasteTags || []),
    ...(recipe.nutritionTags || [])
  ].join(' ');
  const hit = (set) => [...set].filter((term) => term && text.includes(term));
  const dislikeHits = hit(prefs.dislikes);
  const allergyHits = hit(prefs.allergies);
  const tasteMatch = (recipe.tasteTags || []).filter((t) => prefs.tastes.has(t)).length;
  return {
    ...recipe,
    dislikeHits,
    allergyHits,
    conflicts: [...new Set([...dislikeHits, ...allergyHits])],
    hasAllergy: allergyHits.length > 0,
    tasteMatch
  };
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
        let docs = await Recipe.find(query).limit(req.body.limit || 50);
        if (req.body.keyword) {
          docs = docs.filter((r) => r.name.includes(req.body.keyword));
        }
        // 软提示：标注全家忌口/过敏命中，并把「无冲突 + 口味匹配高」的排前面
        const prefs = await familyPrefs(familyId);
        let recipes = docs.map((r) => annotate(r.toObject(), prefs));
        recipes.sort((a, b) => {
          if (a.conflicts.length !== b.conflicts.length) return a.conflicts.length - b.conflicts.length;
          return b.tasteMatch - a.tasteMatch;
        });
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
