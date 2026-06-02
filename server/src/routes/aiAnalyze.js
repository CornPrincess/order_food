// POST /api/aiAnalyze — 饮食分析
const { User, Recipe, MealRecord } = require('../models');
const { callLLM } = require('../services/llm');
const { ok, fail } = require('../utils');

module.exports = async (req, res) => {
  const openid = req.openid;
  try {
    const me = await User.findOne({ openid });
    if (!me || !me.familyId) return fail(res, 400, '尚未加入家庭');
    const familyId = me.familyId;
    const days = req.body.days || 7;

    const records = await MealRecord.find({ familyId }).sort({ createdAt: -1 }).limit(days * 3);
    if (records.length === 0) {
      return ok(res, { empty: true, message: '最近还没有用餐记录，先去点几顿吧～' });
    }

    const tagCount = {};
    const recipeIdSet = new Set();
    records.forEach((r) => {
      (r.nutritionTags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
      (r.recipeIds || []).forEach((id) => recipeIdSet.add(id));
    });
    let dishNames = [];
    if (recipeIdSet.size) {
      const rs = await Recipe.find({ _id: { $in: [...recipeIdSet] } });
      dishNames = rs.map((r) => r.name);
    }

    const sys = '你是一位中式家庭营养师。请基于最近的用餐记录分析饮食结构，给出客观、可执行的建议。严格输出 JSON。';
    const userMsg = `以下是某家庭最近 ${days} 天的用餐记录统计。
营养标签出现次数：${JSON.stringify(tagCount)}。
出现过的菜品：${dishNames.join('、') || '无'}。
共 ${records.length} 餐记录。
请分析饮食结构是否均衡，指出偏多/偏少之处与潜在缺口，并给出未来几天的具体改进建议。
输出 JSON：
{"summary":"整体评价","balanced":true或false,"highlights":["做得好的点"],"gaps":["缺口/偏多偏少"],"suggestions":["具体可执行建议"],"nextDishes":["建议下次尝试的菜名"]}`;

    const analysis = await callLLM(
      [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
      { temperature: 0.5 }
    );

    ok(res, { analysis, stats: { tagCount, mealCount: records.length, days } });
  } catch (err) {
    fail(res, 500, err.message);
  }
};
