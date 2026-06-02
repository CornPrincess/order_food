// utils/cloud.js — 云函数调用统一封装
/**
 * 调用云函数，统一处理 loading 与错误提示。
 * @param {string} name 云函数名
 * @param {object} data 入参
 * @param {object} opts { loading: boolean, loadingText: string }
 * @returns {Promise<any>} 云函数 result.data
 */
function callFunction(name, data = {}, opts = {}) {
  const { loading = false, loadingText = '加载中' } = opts;
  if (loading) {
    wx.showLoading({ title: loadingText, mask: true });
  }
  return wx.cloud
    .callFunction({ name, data })
    .then((res) => {
      const result = res && res.result;
      if (!result || result.code !== 0) {
        const msg = (result && result.message) || '请求失败';
        throw new Error(msg);
      }
      return result.data;
    })
    .catch((err) => {
      wx.showToast({ title: err.message || '网络异常', icon: 'none' });
      throw err;
    })
    .finally(() => {
      if (loading) wx.hideLoading();
    });
}

module.exports = { callFunction };
