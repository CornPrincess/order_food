// POST /api/family — 创建 / 加入 / 成员 / 更新资料（action 路由）
const { User, Family } = require('../models');
const { genInviteCode, ok, fail } = require('../utils');

module.exports = async (req, res) => {
  const openid = req.openid;
  const { action } = req.body || {};

  try {
    switch (action) {
      case 'create': {
        const inviteCode = genInviteCode();
        const fam = await Family.create({
          name: req.body.name || '我的家',
          inviteCode,
          ownerOpenid: openid,
          memberOpenids: [openid]
        });
        await User.updateOne({ openid }, { familyId: fam._id.toString(), role: req.body.role || '家长' });
        return ok(res, { familyId: fam._id.toString(), ...fam.toObject() });
      }

      case 'join': {
        const fam = await Family.findOne({ inviteCode: req.body.inviteCode });
        if (!fam) return fail(res, 404, '邀请码无效');
        await Family.updateOne({ _id: fam._id }, { $addToSet: { memberOpenids: openid } });
        await User.updateOne({ openid }, { familyId: fam._id.toString(), role: req.body.role || '成员' });
        return ok(res, { familyId: fam._id.toString(), ...fam.toObject() });
      }

      case 'members': {
        const me = await User.findOne({ openid });
        if (!me || !me.familyId) return fail(res, 400, '尚未加入家庭');
        const members = await User.find({ familyId: me.familyId });
        return ok(res, { members });
      }

      case 'updateProfile': {
        const patch = {};
        ['nickname', 'role'].forEach((k) => {
          if (req.body[k] !== undefined) patch[k] = req.body[k];
        });
        ['tastes', 'dislikes', 'allergies'].forEach((k) => {
          if (Array.isArray(req.body[k])) patch[k] = req.body[k];
        });
        await User.updateOne({ openid }, patch);
        const user = await User.findOne({ openid });
        return ok(res, { user });
      }

      default:
        return fail(res, 400, '未知 action');
    }
  } catch (err) {
    fail(res, 500, err.message);
  }
};
