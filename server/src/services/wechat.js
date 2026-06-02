// 微信登录：用 wx.login 的 code 调 code2session 换取 openid
const axios = require('axios');
const { wxAppId, wxSecret, allowMockLogin } = require('../config');

/**
 * @param {string} code  小程序 wx.login 返回的 code
 * @param {string} mockOpenid 本地联调用的假 openid（仅 ALLOW_MOCK_LOGIN=true 生效）
 * @returns {Promise<string>} openid
 */
async function resolveOpenid(code, mockOpenid) {
  if (allowMockLogin && mockOpenid) return mockOpenid;
  if (!code) throw new Error('缺少登录 code');
  if (!wxAppId || !wxSecret) throw new Error('服务端未配置 WX_APPID / WX_SECRET');

  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const { data } = await axios.get(url, {
    params: {
      appid: wxAppId,
      secret: wxSecret,
      js_code: code,
      grant_type: 'authorization_code'
    },
    timeout: 10000
  });

  if (data.errcode) {
    throw new Error(`微信登录失败: ${data.errcode} ${data.errmsg}`);
  }
  return data.openid;
}

module.exports = { resolveOpenid };
