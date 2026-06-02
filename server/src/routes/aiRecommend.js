// POST /api/aiRecommend — 智能食谱推荐
const { User, Recipe, MealRecord, SeasonalIngredient } = require('../models');
const { callLLM } = require('../services/llm');
const { nowParts, ok, fail } = require('../utils');

module.exports = async (req, res) => {
  const openid = req.openid;
  try {
    const me = await User.findOne({ openid });
    if (!me || !me.familyId) return fail(res, 400, '尚未加入家庭');
    const familyId = me.familyId;

    // 1. 聚合家庭成员画像
    const members = await User.find({ familyId });
    const tastes = new Set();
    const dislikes = new Set();
    const allergies = new Set();
    members.forEach((m) => {
      (m.tastes || []).forEach((t) => tastes.add(t));
      (m.dislikes || []).forEach((d) => dislikes.add(d));
      (m.allergies || []).forEach((a) => allergies.add(a));
    });

    // 2. 时令信息
    const { month, season } = nowParts();
    const seasonal = await SeasonalIngredient.findOne({ month });
    const seasonalIngredients = seasonal ? seasonal.ingredients : [];

    // 3. 最近已做菜（去重）
    const records = await MealRecord.find({ familyId }).sort({ createdAt: -1 }).limit(20);
    const recentRecipeIds = [...new Set([].concat(...records.map((r) => r.recipeIds || [])))];
    let recentNames = [];
    if (recentRecipeIds.length) {
      const rs = await Recipe.find({ _id: { $in: recentRecipeIds } });
      recentNames = rs.map((r) => r.name);
    }

    // 4. prompt
    const count = req.body.count || 4;
    const sys = '你是一位贴心的中式家庭营养厨师。请根据家庭成员口味、忌口、过敏与当前时令，推荐家常菜谱。严格输出 JSON。';
    const userMsg = `请推荐 ${count} 道适合今天的家常菜。
当前季节：${season}（${month}月），应季食材：${seasonalIngredients.join('、') || '不限'}。
家庭喜好口味：${[...tastes].join('、') || '不限'}。
全家忌口（务必避开）：${[...dislikes].join('、') || '无'}。
过敏原（绝对禁止）：${[...allergies].join('、') || '无'}。
最近已做过、请尽量避免重复：${recentNames.join('、') || '无'}。
要求荤素搭配、营养均衡。
输出 JSON 格式：
{"recipes":[{"name":"","cuisine":"","cookTime":数字,"difficulty":"易/中/难","ingredients":["食材带份量"],"steps":["步骤"],"tasteTags":["口味标签"],"seasonTags":["${season}"],"nutritionTags":["营养标签如 蛋白质/蔬菜/主食类/低脂"],"reason":"推荐理由一句话"}]}`;

    const result = await callLLM([
      { role: 'system', content: sys },
      { role: 'user', content: userMsg }
    ]);
    const list = Array.isArray(result.recipes) ? result.recipes : [];

    // 5. 写入菜谱库（source=ai，公共库去重）
    const saved = [];
    for (const r of list) {
      if (!r.name) continue;
      let doc = await Recipe.findOne({ name: r.name, familyId: '' });
      if (!doc) {
        doc = await Recipe.create({
          name: r.name, cuisine: r.cuisine || '家常',
          ingredients: r.ingredients || [], steps: r.steps || [],
          tasteTags: r.tasteTags || [], seasonTags: r.seasonTags || [season],
          nutritionTags: r.nutritionTags || [], cookTime: r.cookTime || 0,
          difficulty: r.difficulty || '中', source: 'ai', familyId: '', createdBy: openid
        });
      }
      saved.push({ ...r, recipeId: doc._id.toString() });
    }

    ok(res, { recipes: saved, season, month });
  } catch (err) {
    fail(res, 500, err.message);
  }
};
