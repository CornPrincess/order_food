// cloudfunctions/recipes — 菜谱库：列表 / 详情 / 新增 / 初始化种子数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { RECIPES, SEASONAL } = require('./seedData');

async function getFamilyId(openid) {
  const me = await db.collection('users').where({ openid }).get();
  return me.data.length ? me.data[0].familyId : '';
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;
  const recipes = db.collection('recipes');

  try {
    switch (action) {
      case 'list': {
        const familyId = await getFamilyId(OPENID);
        // 公共库（familyId 空）+ 本家庭自建
        const where = { familyId: _.in(['', familyId].filter((v) => v !== undefined)) };
        if (event.cuisine) where.cuisine = event.cuisine;
        if (event.seasonTag) where.seasonTags = _.in([event.seasonTag, '四季']);
        if (event.tasteTag) where.tasteTags = event.tasteTag;
        let query = recipes.where(where);
        const limit = event.limit || 50;
        const res = await query.limit(limit).get();
        let data = res.data;
        // 关键词在内存过滤（数据量小）
        if (event.keyword) {
          data = data.filter((r) => r.name.includes(event.keyword));
        }
        return { code: 0, data: { recipes: data } };
      }

      case 'detail': {
        const res = await recipes.doc(event.recipeId).get();
        return { code: 0, data: { recipe: res.data } };
      }

      case 'add': {
        const familyId = await getFamilyId(OPENID);
        const doc = {
          name: event.name,
          cuisine: event.cuisine || '家常',
          ingredients: event.ingredients || [],
          steps: event.steps || [],
          tasteTags: event.tasteTags || [],
          seasonTags: event.seasonTags || ['四季'],
          nutritionTags: event.nutritionTags || [],
          cookTime: event.cookTime || 0,
          difficulty: event.difficulty || '易',
          source: event.source || 'user',
          familyId: event.isPublic ? '' : familyId,
          createdBy: OPENID,
          createdAt: db.serverDate()
        };
        const res = await recipes.add({ data: doc });
        return { code: 0, data: { recipeId: res._id, ...doc } };
      }

      case 'initSeed': {
        // 幂等：已存在同名公共菜谱则跳过
        let inserted = 0;
        for (const r of RECIPES) {
          const exist = await recipes.where({ name: r.name, familyId: '' }).count();
          if (exist.total === 0) {
            await recipes.add({
              data: { ...r, source: 'seed', familyId: '', createdBy: 'system', createdAt: db.serverDate() }
            });
            inserted++;
          }
        }
        // 时令表
        const seasonal = db.collection('seasonalIngredients');
        let seasonalInserted = 0;
        for (const s of SEASONAL) {
          const exist = await seasonal.where({ month: s.month }).count();
          if (exist.total === 0) {
            await seasonal.add({ data: s });
            seasonalInserted++;
          }
        }
        return { code: 0, data: { recipesInserted: inserted, seasonalInserted } };
      }

      default:
        return { code: 400, message: '未知 action' };
    }
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
