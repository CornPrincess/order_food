// cloudfunctions/aiRecommend — 智能食谱推荐
// 输入：家庭成员口味/忌口聚合 + 当前时令食材 + 最近已做菜（去重）
// 输出：JSON 菜谱列表，并写入 recipes（source=ai）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { callLLM } = require('./llm');

function nowParts() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const month = d.getUTCMonth() + 1;
  let season = '冬';
  if (month >= 3 && month <= 5) season = '春';
  else if (month >= 6 && month <= 8) season = '夏';
  else if (month >= 9 && month <= 11) season = '秋';
  return { month, season };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const me = (await db.collection('users').where({ openid: OPENID }).get()).data[0];
    if (!me || !me.familyId) return { code: 400, message: '尚未加入家庭' };
    const familyId = me.familyId;

    // 1. 聚合家庭成员画像
    const members = (await db.collection('users').where({ familyId }).get()).data;
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
    const seasonal = (await db.collection('seasonalIngredients').where({ month }).get()).data[0];
    const seasonalIngredients = seasonal ? seasonal.ingredients : [];

    // 3. 最近 7 天已做菜（去重避免重复推荐）
    const records = await db.collection('mealRecords')
      .where({ familyId })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    const recentRecipeIds = [...new Set([].concat(...records.data.map((r) => r.recipeIds || [])))];
    let recentNames = [];
    if (recentRecipeIds.length) {
      const rs = await db.collection('recipes').where({ _id: _.in(recentRecipeIds) }).get();
      recentNames = rs.data.map((r) => r.name);
    }

    // 4. 构造 prompt
    const count = event.count || 4;
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
    const recipesCol = db.collection('recipes');
    const saved = [];
    for (const r of list) {
      if (!r.name) continue;
      const exist = await recipesCol.where({ name: r.name, familyId: '' }).count();
      let recipeId;
      if (exist.total === 0) {
        const add = await recipesCol.add({
          data: {
            name: r.name, cuisine: r.cuisine || '家常',
            ingredients: r.ingredients || [], steps: r.steps || [],
            tasteTags: r.tasteTags || [], seasonTags: r.seasonTags || [season],
            nutritionTags: r.nutritionTags || [], cookTime: r.cookTime || 0,
            difficulty: r.difficulty || '中', source: 'ai', familyId: '',
            createdBy: OPENID, createdAt: db.serverDate()
          }
        });
        recipeId = add._id;
      } else {
        const exId = await recipesCol.where({ name: r.name, familyId: '' }).get();
        recipeId = exId.data[0]._id;
      }
      saved.push({ ...r, recipeId });
    }

    return { code: 0, data: { recipes: saved, season, month } };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
