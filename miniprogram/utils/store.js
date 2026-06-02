// utils/store.js — 登录态与家庭态的获取/缓存
const { callFunction } = require('./cloud');

/** 确保已登录，返回 user（含 familyId）。会缓存到 globalData。 */
async function ensureLogin(opts = {}) {
  const app = getApp();
  if (app.globalData.userInfo && !opts.force) return app.globalData.userInfo;
  const data = await callFunction('login', {
    nickname: opts.nickname,
    avatarUrl: opts.avatarUrl
  }, { loading: opts.loading });
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
