// 端到端冒烟测试：对「正在运行的后端」跑一遍核心闭环。
// 用法：
//   1. 启动后端，且设 ALLOW_MOCK_LOGIN=true（用假 openid 跳过微信换码）
//   2. node test/smoke.js              （默认 http://127.0.0.1:3000）
//   或 BASE_URL=https://your-domain.com node test/smoke.js
//
// 注：AI 接口需配置 DEEPSEEK_API_KEY 才会真正出结果，本脚本只验证可达性。

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function call(name, body, token) {
  const res = await fetch(`${BASE}/api/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

let pass = 0, fail = 0;
const check = (cond, msg) => { cond ? (pass++, console.log('  ✓', msg)) : (fail++, console.log('  ✗', msg)); };

(async () => {
  // 健康检查
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
  check(health && health.code === 0, '健康检查 /health');

  // 登录（需 ALLOW_MOCK_LOGIN=true）
  const a = await call('login', { mockOpenid: 'smokeA', nickname: '爸爸' });
  check(a.body.code === 0 && a.body.data.token, 'userA 登录拿到 token');
  if (a.body.code !== 0) { console.log('  ⚠ 需开启 ALLOW_MOCK_LOGIN=true 才能继续'); return finish(); }
  const b = await call('login', { mockOpenid: 'smokeB', nickname: '妈妈' });
  const tokenA = a.body.token || a.body.data.token;
  const tokenB = b.body.data.token;

  // 鉴权拦截
  const noauth = await call('family', { action: 'members' });
  check(noauth.status === 401, '无 token 被拦截(401)');

  // 建/加入家庭
  const fam = await call('family', { action: 'create', name: '冒烟之家', role: '爸爸' }, tokenA);
  check(fam.body.code === 0 && fam.body.data.inviteCode, '创建家庭');
  const join = await call('family', { action: 'join', inviteCode: fam.body.data.inviteCode, role: '妈妈' }, tokenB);
  check(join.body.code === 0, '邀请码加入');
  const members = await call('family', { action: 'members' }, tokenA);
  check(members.body.code === 0 && members.body.data.members.length === 2, '成员数=2');

  // 口味档案
  const prof = await call('family', { action: 'updateProfile', tastes: ['酸辣'], dislikes: ['香菜'] }, tokenA);
  check(prof.body.code === 0 && prof.body.data.user.dislikes.includes('香菜'), '保存口味档案');

  // 种子 + 菜谱
  const seed = await call('recipes', { action: 'initSeed' }, tokenA);
  check(seed.body.code === 0, `种子导入(菜谱+${seed.body.data.recipesInserted} 时令+${seed.body.data.seasonalInserted})`);
  const list = await call('recipes', { action: 'list' }, tokenA);
  check(list.body.code === 0 && list.body.data.recipes.length > 0, `菜谱列表(${list.body.data.recipes.length}条)`);

  // 时令
  const season = await call('seasonal', {}, tokenA);
  check(season.body.code === 0 && season.body.data.recipes.length > 0, `时令推荐(${season.body.data.season}季)`);

  // 点餐投票闭环
  const r0 = list.body.data.recipes[0], r1 = list.body.data.recipes[1];
  await call('vote', { action: 'addItem', meal: '晚', recipeId: r0._id, name: r0.name }, tokenA);
  const add2 = await call('vote', { action: 'addItem', meal: '晚', recipeId: r1._id, name: r1.name }, tokenB);
  check(add2.body.code === 0 && add2.body.data.menu.items.length === 2, '加入两道候选菜');
  const menuId = add2.body.data.menu._id;
  const vote = await call('vote', { action: 'toggleVote', menuId, recipeId: r0._id }, tokenB);
  const item0 = vote.body.data.menu.items.find((i) => i.recipeId === r0._id);
  check(item0.votedBy.length === 2, '第一道菜 2 票');
  const fin = await call('vote', { action: 'finalize', menuId }, tokenA);
  check(fin.body.code === 0, '确定菜单并记入饮食档案');

  // AI 可达性（无 key 时返回 500 提示，也算接口通）
  const ana = await call('aiAnalyze', { days: 7 }, tokenA);
  check(ana.status === 200, 'aiAnalyze 接口可达' + (ana.body.message ? `（${ana.body.message}）` : ''));

  finish();
})().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1); });

function finish() {
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
}
