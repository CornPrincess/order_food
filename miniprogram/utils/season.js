// utils/season.js — 节气 / 季节 工具（前端展示用，逻辑与云函数 seasonal 保持一致）

// 24 节气（按公历近似日期，使用「每月两个节气」的常见落点）
// 每项：[月, 日, 名称]。判断时取「不晚于当前日期的最近一个节气」。
const SOLAR_TERMS = [
  [1, 6, '小寒'], [1, 20, '大寒'],
  [2, 4, '立春'], [2, 19, '雨水'],
  [3, 6, '惊蛰'], [3, 21, '春分'],
  [4, 5, '清明'], [4, 20, '谷雨'],
  [5, 6, '立夏'], [5, 21, '小满'],
  [6, 6, '芒种'], [6, 21, '夏至'],
  [7, 7, '小暑'], [7, 23, '大暑'],
  [8, 8, '立秋'], [8, 23, '处暑'],
  [9, 8, '白露'], [9, 23, '秋分'],
  [10, 8, '寒露'], [10, 24, '霜降'],
  [11, 7, '立冬'], [11, 22, '小雪'],
  [12, 7, '大雪'], [12, 22, '冬至']
];

/** 返回给定日期所处的节气名称 */
function getSolarTerm(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let current = SOLAR_TERMS[SOLAR_TERMS.length - 1]; // 默认上一年最后一个（冬至）
  for (const term of SOLAR_TERMS) {
    if (m > term[0] || (m === term[0] && d >= term[1])) {
      current = term;
    } else {
      break;
    }
  }
  return current[2];
}

/** 返回季节：春/夏/秋/冬 */
function getSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return '春';
  if (m >= 6 && m <= 8) return '夏';
  if (m >= 9 && m <= 11) return '秋';
  return '冬';
}

/** 返回 YYYY-MM-DD */
function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { getSolarTerm, getSeason, formatDate, SOLAR_TERMS };
