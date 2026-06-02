// utils/cloud.js — 调用统一封装，支持「云函数」与「自建后端」双模式
// 模式由 app.globalData.backend 决定：'cloud' | 'server'
// 两种模式都返回相同的数据结构（envelope: { code, data, message } 的 data 部分）

/** 取出后端返回的统一信封并校验 */
function unwrap(envelope) {
  if (!envelope || envelope.code !== 0) {
    const msg = (envelope && envelope.message) || '请求失败';
    throw new Error(msg);
  }
  return envelope.data;
}

/** 云函数模式 */
function viaCloud(name, data) {
  return wx.cloud.callFunction({ name, data }).then((res) => unwrap(res && res.result));
}

/** 自建后端模式（wx.request 调 REST API） */
function viaServer(name, data) {
  const app = getApp();
  const token = wx.getStorageSync('token') || '';
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.serverBaseUrl}/api/${name}`,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      data,
      success: (res) => {
        if (res.statusCode === 401) {
          // 登录态失效，清掉本地态
          wx.removeStorageSync('token');
          getApp().globalData.userInfo = null;
        }
        try {
          resolve(unwrap(res.data));
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络异常'))
    });
  });
}

/**
 * 统一调用入口（接口与原云函数版本完全一致）。
 * @param {string} name 后端能力名（login/family/recipes/vote/seasonal/aiRecommend/aiAnalyze）
 * @param {object} data 入参
 * @param {object} opts { loading, loadingText }
 */
function callFunction(name, data = {}, opts = {}) {
  const { loading = false, loadingText = '加载中' } = opts;
  if (loading) wx.showLoading({ title: loadingText, mask: true });

  const backend = (getApp().globalData && getApp().globalData.backend) || 'cloud';
  const p = backend === 'server' ? viaServer(name, data) : viaCloud(name, data);

  return p
    .catch((err) => {
      wx.showToast({ title: err.message || '网络异常', icon: 'none' });
      throw err;
    })
    .finally(() => {
      if (loading) wx.hideLoading();
    });
}

module.exports = { callFunction };
