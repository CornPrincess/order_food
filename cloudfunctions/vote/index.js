// cloudfunctions/vote — 今日点餐与投票
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function todayStr() {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // 东八区
  return d.toISOString().slice(0, 10);
}

async function getUser(openid) {
  const me = await db.collection('users').where({ openid }).get();
  return me.data[0];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;
  const menus = db.collection('dailyMenus');

  try {
    const user = await getUser(OPENID);
    if (!user || !user.familyId) return { code: 400, message: '尚未加入家庭' };
    const familyId = user.familyId;
    const date = event.date || todayStr();
    const meal = event.meal || '晚';

    switch (action) {
      case 'today': {
        let res = await menus.where({ familyId, date, meal }).get();
        let menu;
        if (res.data.length === 0) {
          const doc = {
            familyId, date, meal,
            items: [], status: '投票中',
            createdBy: OPENID, createdAt: db.serverDate()
          };
          const add = await menus.add({ data: doc });
          menu = { _id: add._id, ...doc };
        } else {
          menu = res.data[0];
        }
        return { code: 0, data: { menu } };
      }

      case 'addItem': {
        const res = await menus.where({ familyId, date, meal }).get();
        let menuId;
        if (res.data.length === 0) {
          const add = await menus.add({
            data: { familyId, date, meal, items: [], status: '投票中', createdBy: OPENID, createdAt: db.serverDate() }
          });
          menuId = add._id;
        } else {
          menuId = res.data[0]._id;
          if (res.data[0].items.some((it) => it.recipeId === event.recipeId)) {
            return { code: 0, data: { menuId, duplicated: true } };
          }
        }
        await menus.doc(menuId).update({
          data: {
            items: _.push({
              recipeId: event.recipeId,
              name: event.name,
              addedBy: OPENID,
              votedBy: [OPENID]
            })
          }
        });
        const updated = await menus.doc(menuId).get();
        return { code: 0, data: { menu: updated.data } };
      }

      case 'toggleVote': {
        const doc = await menus.doc(event.menuId).get();
        const items = doc.data.items.map((it) => {
          if (it.recipeId === event.recipeId) {
            const voted = it.votedBy || [];
            it.votedBy = voted.includes(OPENID)
              ? voted.filter((o) => o !== OPENID)
              : [...voted, OPENID];
          }
          return it;
        });
        await menus.doc(event.menuId).update({ data: { items } });
        return { code: 0, data: { menu: { ...doc.data, items } } };
      }

      case 'finalize': {
        const doc = await menus.doc(event.menuId).get();
        const items = doc.data.items || [];
        // 选出至少 1 票的菜；若都没票则取全部
        const chosen = items.filter((it) => (it.votedBy || []).length > 0);
        const finalItems = chosen.length ? chosen : items;
        const recipeIds = finalItems.map((it) => it.recipeId);

        // 聚合营养标签写入饮食记录
        let nutritionTags = [];
        if (recipeIds.length) {
          const rs = await db.collection('recipes').where({ _id: _.in(recipeIds) }).get();
          rs.data.forEach((r) => { nutritionTags = nutritionTags.concat(r.nutritionTags || []); });
        }
        await menus.doc(event.menuId).update({ data: { status: '已定' } });
        await db.collection('mealRecords').add({
          data: { familyId, date, meal, recipeIds, nutritionTags, createdAt: db.serverDate() }
        });
        return { code: 0, data: { finalItems } };
      }

      default:
        return { code: 400, message: '未知 action' };
    }
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
