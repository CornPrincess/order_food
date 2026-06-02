// cloudfunctions/login — 获取 openid，创建或返回用户
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const users = db.collection('users');

  try {
    const found = await users.where({ openid: OPENID }).get();
    let user;

    if (found.data.length === 0) {
      // 首次登录：创建用户（尚未加入家庭）
      const doc = {
        openid: OPENID,
        nickname: event.nickname || '家庭成员',
        avatarUrl: event.avatarUrl || '',
        familyId: '',
        role: '',
        tastes: [],
        dislikes: [],
        allergies: [],
        createdAt: db.serverDate()
      };
      const res = await users.add({ data: doc });
      user = { _id: res._id, ...doc };
    } else {
      user = found.data[0];
      // 允许在登录时刷新昵称/头像
      const patch = {};
      if (event.nickname) patch.nickname = event.nickname;
      if (event.avatarUrl) patch.avatarUrl = event.avatarUrl;
      if (Object.keys(patch).length) {
        await users.doc(user._id).update({ data: patch });
        Object.assign(user, patch);
      }
    }

    // 一并返回家庭信息（若已加入）
    let family = null;
    if (user.familyId) {
      const fam = await db.collection('families').doc(user.familyId).get().catch(() => null);
      family = fam ? fam.data : null;
    }

    return { code: 0, data: { user, family, openid: OPENID } };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
