// POST /api/login — code2session 换 openid，建/取用户，签发 JWT
const { User, Family } = require('../models');
const { resolveOpenid } = require('../services/wechat');
const { signToken } = require('../middleware/auth');
const { ok, fail } = require('../utils');

module.exports = async (req, res) => {
  try {
    const { code, mockOpenid, nickname, avatarUrl } = req.body || {};
    const openid = await resolveOpenid(code, mockOpenid);

    let user = await User.findOne({ openid });
    if (!user) {
      user = await User.create({
        openid,
        nickname: nickname || '家庭成员',
        avatarUrl: avatarUrl || ''
      });
    } else {
      const patch = {};
      if (nickname) patch.nickname = nickname;
      if (avatarUrl) patch.avatarUrl = avatarUrl;
      if (Object.keys(patch).length) {
        Object.assign(user, patch);
        await user.save();
      }
    }

    let family = null;
    if (user.familyId) family = await Family.findById(user.familyId).catch(() => null);

    const token = signToken(openid);
    ok(res, { user, family, token, openid });
  } catch (err) {
    fail(res, 500, err.message);
  }
};
