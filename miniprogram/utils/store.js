// utils/store.js — 登录态与家庭态的获取/缓存
const { callFunction } = require('./cloud');

/** Promise 化的 wx.login，取临时登录 code */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => resolve(res.code),
      fail: (err) => reject(new Error(err.errMsg || '微信登录失败'))
    });
  });
}

/** 确保已登录，返回 user（含 familyId）。会缓存到 globalData。 */
async function ensureLogin(opts = {}) {
  const app = getApp();
  if (app.globalData.userInfo && !opts.force) return app.globalData.userInfo;

  const payload = { nickname: opts.nickname, avatarUrl: opts.avatarUrl };
  // 自建后端模式：拿 wx.login 的 code，由后端 code2session 换 openid
  if (app.globalData.backend === 'server') {
    payload.code = await wxLogin();
  }

  const data = await callFunction('login', payload, { loading: opts.loading });

  // 自建后端会下发 JWT，缓存供后续请求带上
  if (data.token) wx.setStorageSync('token', data.token);

  app.globalData.userInfo = data.user;
  app.globalData.family = data.family;
  return data.user;
}

/** 刷新当前用户与家庭信息 */
async function refresh() {
  return ensureLogin({ force: true });
}

function getUser() {
  return getApp().globalData.userInfo;
}
function getFamily() {
  return getApp().globalData.family;
}
function setUser(user) {
  getApp().globalData.userInfo = user;
}
function setFamily(family) {
  getApp().globalData.family = family;
}

module.exports = { ensureLogin, refresh, getUser, getFamily, setUser, setFamily };
