// JWT 鉴权中间件：校验 Authorization: Bearer <token>，注入 req.openid
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function signToken(openid) {
  return jwt.sign({ openid }, jwtSecret, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ code: 401, message: '未登录' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.openid = payload.openid;
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: '登录态已失效' });
  }
}

module.exports = { auth, signToken };
