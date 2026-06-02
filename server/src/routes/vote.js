// POST /api/vote — 今日点餐与投票
const { User, Recipe, DailyMenu, MealRecord } = require('../models');
const { todayStr, ok, fail } = require('../utils');

module.exports = async (req, res) => {
  const openid = req.openid;
  const { action } = req.body || {};

  try {
    const user = await User.findOne({ openid });
    if (!user || !user.familyId) return fail(res, 400, '尚未加入家庭');
    const familyId = user.familyId;
    const date = req.body.date || todayStr();
    const meal = req.body.meal || '晚';

    switch (action) {
      case 'today': {
        let menu = await DailyMenu.findOne({ familyId, date, meal });
        if (!menu) {
          menu = await DailyMenu.create({ familyId, date, meal, items: [], status: '投票中', createdBy: openid });
        }
        return ok(res, { menu });
      }

      case 'addItem': {
        let menu = await DailyMenu.findOne({ familyId, date, meal });
        if (!menu) {
          menu = await DailyMenu.create({ familyId, date, meal, items: [], status: '投票中', createdBy: openid });
        }
        if (menu.items.some((it) => it.recipeId === req.body.recipeId)) {
          return ok(res, { menu, duplicated: true });
        }
        menu.items.push({ recipeId: req.body.recipeId, name: req.body.name, addedBy: openid, votedBy: [openid] });
        await menu.save();
        return ok(res, { menu });
      }

      case 'toggleVote': {
        const menu = await DailyMenu.findById(req.body.menuId);
        if (!menu) return fail(res, 404, '菜单不存在');
        menu.items.forEach((it) => {
          if (it.recipeId === req.body.recipeId) {
            const voted = it.votedBy || [];
            it.votedBy = voted.includes(openid)
              ? voted.filter((o) => o !== openid)
              : [...voted, openid];
          }
        });
        await menu.save();
        return ok(res, { menu });
      }

      case 'finalize': {
        const menu = await DailyMenu.findById(req.body.menuId);
        if (!menu) return fail(res, 404, '菜单不存在');
        const chosen = menu.items.filter((it) => (it.votedBy || []).length > 0);
        const finalItems = chosen.length ? chosen : menu.items;
        const recipeIds = finalItems.map((it) => it.recipeId);

        let nutritionTags = [];
        if (recipeIds.length) {
          const rs = await Recipe.find({ _id: { $in: recipeIds } });
          rs.forEach((r) => { nutritionTags = nutritionTags.concat(r.nutritionTags || []); });
        }
        menu.status = '已定';
        await menu.save();
        await MealRecord.create({ familyId, date, meal, recipeIds, nutritionTags });
        return ok(res, { finalItems });
      }

      default:
        return fail(res, 400, '未知 action');
    }
  } catch (err) {
    fail(res, 500, err.message);
  }
};
