// 轻量日志：分级输出，带时间戳。HTTP 访问日志由 morgan 负责（见 app.js）。
const { logLevel } = require('./config');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[logLevel] || LEVELS.info;

function ts() {
  return new Date().toISOString();
}

function emit(level, args) {
  if (LEVELS[level] < threshold) return;
  const line = `[${ts()}] [${level.toUpperCase()}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(line, ...args);
}

module.exports = {
  debug: (...a) => emit('debug', a),
  info: (...a) => emit('info', a),
  warn: (...a) => emit('warn', a),
  error: (...a) => emit('error', a)
};
