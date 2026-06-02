// 通用工具：东八区日期、节气/季节、邀请码、信封响应
function todayStr() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function nowParts() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const month = d.getUTCMonth() + 1;
  let season = '冬';
  if (month >= 3 && month <= 5) season = '春';
  else if (month >= 6 && month <= 8) season = '夏';
  else if (month >= 9 && month <= 11) season = '秋';
  return { month, season };
}

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// 统一信封：与小程序前端约定的 { code, data, message }
const ok = (res, data) => res.json({ code: 0, data });
const fail = (res, code, message) => res.json({ code, message });

module.exports = { todayStr, nowParts, genInviteCode, ok, fail };
