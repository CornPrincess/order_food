// cloudfunctions/aiAnalyze — 饮食分析
// 输入：最近 N 天 mealRecords 的营养/口味标签统计
// 输出：JSON（结构评价 + 缺口 + 下一步建议）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { callLLM } = require('./llm');

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const me = (await db.collection('users').where({ openid: OPENID }).get()).data[0];
    if (!me || !me.familyId) return { code: 400, message: '尚未加入家庭' };
    const familyId = me.familyId;
    const days = event.days || 7;

    // 取最近记录
    const records = await db.collection('mealRecords')
      .where({ familyId })
      .orderBy('createdAt', 'desc')
      .limit(days * 3)
      .get();

    if (records.data.length === 0) {
      return { code: 0, data: { empty: true, message: '最近还没有用餐记录，先去点几顿吧～' } };
    }

    // 统计营养标签频次 + 收集菜名
    const tagCount = {};
    const recipeIdSet = new Set();
    records.data.forEach((r) => {
      (r.nutritionTags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
      (r.recipeIds || []).forEach((id) => recipeIdSet.add(id));
    });
    let dishNames = [];
    if (recipeIdSet.size) {
      const rs = await db.collection('recipes').where({ _id: _.in([...recipeIdSet]) }).get();
      dishNames = rs.data.map((r) => r.name);
    }

    const sys = '你是一位中式家庭营养师。请基于最近的用餐记录分析饮食结构，给出客观、可执行的建议。严格输出 JSON。';
    const userMsg = `以下是某家庭最近 ${days} 天的用餐记录统计。
营养标签出现次数：${JSON.stringify(tagCount)}。
出现过的菜品：${dishNames.join('、') || '无'}。
共 ${records.data.length} 餐记录。
请分析饮食结构是否均衡，指出偏多/偏少之处与潜在缺口，并给出未来几天的具体改进建议。
输出 JSON：
{"summary":"整体评价","balanced":true或false,"highlights":["做得好的点"],"gaps":["缺口/偏多偏少"],"suggestions":["具体可执行建议"],"nextDishes":["建议下次尝试的菜名"]}`;

    const result = await callLLM([
      { role: 'system', content: sys },
      { role: 'user', content: userMsg }
    ]);

    return { code: 0, data: { analysis: result, stats: { tagCount, mealCount: records.data.length, days } } };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
