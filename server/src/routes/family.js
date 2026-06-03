// POST /api/family — 创建 / 加入 / 成员 / 更新资料（action 路由）
const { User, Family } = require('../models');
const { genInviteCode, ok, fail } = require('../utils');

// 生成不与现有冲突的邀请码（极小概率碰撞时重试）
async function uniqueInviteCode() {
  for (let i = 0; i < 5; i++) {
    const code = genInviteCode();
    if (!(await Family.exists({ inviteCode: code }))) return code;
  }
  // 兜底：附加随机后缀，几乎不可能再撞
  return genInviteCode() + Math.floor(Math.random() * 10);
}

// 切换家庭时，把自己从旧家庭的 memberOpenids 中移除，避免幽灵成员
async function leaveOldFamily(openid) {
  const me = await User.findOne({ openid });
  if (me && me.familyId) {
    await Family.updateOne({ _id: me.familyId }, { $pull: { memberOpenids: openid } }).catch(() => {});
  }
}

module.exports = async (req, res) => {
  const openid = req.openid;
  const { action } = req.body || {};

  try {
    switch (action) {
      case 'create': {
        await leaveOldFamily(openid);
        const inviteCode = await uniqueInviteCode();
        const fam = await Family.create({
          name: (req.body.name || '我的家').trim(),
          inviteCode,
          ownerOpenid: openid,
          memberOpenids: [openid]
        });
        await User.updateOne({ openid }, { familyId: fam._id.toString(), role: req.body.role || '家长' });
        return ok(res, { familyId: fam._id.toString(), ...fam.toObject() });
      }

      case 'join': {
        const code = (req.body.inviteCode || '').trim().toUpperCase();
        if (!code) return fail(res, 400, '请输入邀请码');
        const fam = await Family.findOne({ inviteCode: code });
        if (!fam) return fail(res, 404, '邀请码无效');
        await leaveOldFamily(openid);
        await Family.updateOne({ _id: fam._id }, { $addToSet: { memberOpenids: openid } });
        await User.updateOne({ openid }, { familyId: fam._id.toString(), role: req.body.role || '成员' });
        // 重新查询，返回包含自己在内的最新成员列表
        const fresh = await Family.findById(fam._id);
        return ok(res, { familyId: fam._id.toString(), ...fresh.toObject() });
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
