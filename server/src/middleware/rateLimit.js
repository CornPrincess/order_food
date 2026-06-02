// 接口限流：基于 express-rate-limit，按「IP + openid」计数。
const rateLimit = require('express-rate-limit');
const { rateLimit: cfg } = require('../config');
const logger = require('../logger');

// 已登录请求按 openid 限流，未登录回退到 IP，避免同一家庭/同一出口 IP 互相挤占
function keyGenerator(req) {
  return req.openid ? `u:${req.openid}` : `ip:${req.ip}`;
}

function onLimit(name) {
  return (req, res /*, next, options */) => {
    logger.warn(`限流触发[${name}] key=${keyGenerator(req)} path=${req.originalUrl}`);
    res.status(429).json({ code: 429, message: '请求过于频繁，请稍后再试' });
  };
}

function make(name, max) {
  return rateLimit({
    windowMs: cfg.windowMs,
    max,
    keyGenerator,
    standardHeaders: true, // 返回 RateLimit-* 头
    legacyHeaders: false,
    handler: onLimit(name)
  });
}

module.exports = {
  apiLimiter: make('api', cfg.apiMax),
  loginLimiter: make('login', cfg.loginMax),
  aiLimiter: make('ai', cfg.aiMax)
};
