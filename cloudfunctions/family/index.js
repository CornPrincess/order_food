// cloudfunctions/family — 家庭管理：创建 / 加入 / 成员列表 / 更新成员资料
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function genInviteCode() {
  // 6 位易读邀请码（去掉易混字符）
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;
  const users = db.collection('users');
  const families = db.collection('families');

  try {
    switch (action) {
      case 'create': {
        const inviteCode = genInviteCode();
        const fam = {
          name: event.name || '我的家',
          inviteCode,
          ownerOpenid: OPENID,
          memberOpenids: [OPENID],
          createdAt: db.serverDate()
        };
        const res = await families.add({ data: fam });
        await users.where({ openid: OPENID }).update({
          data: { familyId: res._id, role: event.role || '家长' }
        });
        return { code: 0, data: { familyId: res._id, ...fam } };
      }

      case 'join': {
        const found = await families.where({ inviteCode: event.inviteCode }).get();
        if (found.data.length === 0) {
          return { code: 404, message: '邀请码无效' };
        }
        const fam = found.data[0];
        await families.doc(fam._id).update({
          data: { memberOpenids: _.addToSet(OPENID) }
        });
        await users.where({ openid: OPENID }).update({
          data: { familyId: fam._id, role: event.role || '成员' }
        });
        return { code: 0, data: { familyId: fam._id, ...fam } };
      }

      case 'members': {
        const me = await users.where({ openid: OPENID }).get();
        if (!me.data.length || !me.data[0].familyId) {
          return { code: 400, message: '尚未加入家庭' };
        }
        const familyId = me.data[0].familyId;
        const members = await users.where({ familyId }).get();
        return { code: 0, data: { members: members.data } };
      }

      case 'updateProfile': {
        const patch = {};
        ['nickname', 'role'].forEach((k) => {
          if (event[k] !== undefined) patch[k] = event[k];
        });
        ['tastes', 'dislikes', 'allergies'].forEach((k) => {
          if (Array.isArray(event[k])) patch[k] = event[k];
        });
        await users.where({ openid: OPENID }).update({ data: patch });
        const updated = await users.where({ openid: OPENID }).get();
        return { code: 0, data: { user: updated.data[0] } };
      }

      default:
        return { code: 400, message: '未知 action' };
    }
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
