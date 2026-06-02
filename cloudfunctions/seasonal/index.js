// cloudfunctions/seasonal — 时令推荐：当月应季食材 + 匹配菜谱
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function nowParts() {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // 东八区
  const month = d.getUTCMonth() + 1;
  let season = '冬';
  if (month >= 3 && month <= 5) season = '春';
  else if (month >= 6 && month <= 8) season = '夏';
  else if (month >= 9 && month <= 11) season = '秋';
  return { month, season };
}

exports.main = async (event) => {
  try {
    const month = event.month || nowParts().month;
    const { season } = nowParts();

    const seasonal = await db.collection('seasonalIngredients').where({ month }).get();
    const info = seasonal.data[0] || { month, solarTerm: '', ingredients: [], note: '' };

    // 匹配当季菜谱（seasonTags 含当前季节或「四季」）
    const recipes = await db.collection('recipes')
      .where({ familyId: '', seasonTags: _.in([season, '四季']) })
      .limit(event.limit || 12)
      .get();

    return {
      code: 0,
      data: {
        month,
        season,
        solarTerm: info.solarTerm,
        ingredients: info.ingredients,
        note: info.note,
        recipes: recipes.data
      }
    };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
