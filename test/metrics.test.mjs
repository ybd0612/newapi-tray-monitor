// 纯函数单元测试：src/main/metrics.js
// 运行：node test/metrics.test.mjs
import {
  toAmount,
  parseUser,
  parseTodayStat,
  aggregateTodayTokens,
  TOKEN_PAGE_CAP,
} from '../src/main/metrics.js';

// ---- 极简断言框架 ----
let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败');
}

// 每个 check 计为 1 个测试用例；单个 check 内可含多个 assert。
// 即使某 check 失败也不中断其余用例（便于一次性看到全部失败明细）。
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    failed++;
    failures.push(`${name} -> ${e.message}`);
    console.log(`  \u2717 ${name} -> ${e.message}`);
  }
}

console.log('==== metrics.js 单元测试 ====');

// ---------- toAmount ----------
check('toAmount(500000) 默认 factor=500000 -> 1', () => {
  assert(toAmount(500000) === 1, `期望 1，实际 ${toAmount(500000)}`);
});

check('toAmount(1234567, 500000) 四舍五入2位 -> 2.47', () => {
  const r = toAmount(1234567, 500000);
  assert(r === 2.47, `期望 2.47，实际 ${r}`);
});

check('toAmount factor=1 边界 -> 整除', () => {
  assert(toAmount(5, 1) === 5, `期望 5，实际 ${toAmount(5, 1)}`);
  assert(toAmount(100, 1) === 100, `期望 100，实际 ${toAmount(100, 1)}`);
});

check('toAmount factor 为 0/负数 -> 回退到默认因子而非除零', () => {
  assert(toAmount(500000, 0) === 1, `factor=0 应回退默认因子，实际 ${toAmount(500000, 0)}`);
  assert(toAmount(500000, -5) === 1, `factor<0 应回退默认因子，实际 ${toAmount(500000, -5)}`);
});

check('toAmount 负数兜底 -> 返回有限数且不为 NaN', () => {
  const r = toAmount(-100, 500000);
  assert(Number.isFinite(r), `负数应返回有限数，实际 ${r}`);
  assert(r <= 0, `负数应 <=0，实际 ${r}`);
});

check('toAmount NaN/非数字兜底 -> 0', () => {
  assert(toAmount('abc', 500000) === 0, `非数字应返回 0，实际 ${toAmount('abc', 500000)}`);
  assert(toAmount(NaN, 500000) === 0, `NaN 应返回 0，实际 ${toAmount(NaN, 500000)}`);
  assert(toAmount(undefined, 500000) === 0, `undefined 应返回 0，实际 ${toAmount(undefined, 500000)}`);
});

// ---------- parseUser ----------
// 说明：parseUser 的入参是接口返回的 data 对象（已由 api.js 完成 success 校验与 data 提取）。
check('parseUser 正常 data -> 正确取出 balance/usedAmount/requestCount', () => {
  const r = parseUser({ quota: 500000, used_quota: 1234567, request_count: 42 }, 500000);
  assert(r.balance === 1, `balance 期望 1，实际 ${r.balance}`);
  assert(r.usedAmount === 2.47, `usedAmount 期望 2.47，实际 ${r.usedAmount}`);
  assert(r.requestCount === 42, `requestCount 期望 42，实际 ${r.requestCount}`);
});

check('parseUser 缺 quota -> balance 兜底为 0，不抛异常', () => {
  const r = parseUser({ used_quota: 100, request_count: 5 }, 500000);
  assert(r.balance === 0, `缺 quota 时 balance 应为 0，实际 ${r.balance}`);
  assert(r.usedAmount === 0, `usedAmount 应为 0，实际 ${r.usedAmount}`);
  assert(r.requestCount === 5, `requestCount 应为 5，实际 ${r.requestCount}`);
});

check('parseUser 缺 data 字段(nu11/空对象) -> 返回全 0 兜底，不抛异常', () => {
  const cases = [null, undefined, {}, ''];
  for (const c of cases) {
    let r;
    assert.doesNotThrow = assert.doesNotThrow; // noop，仅说明意图
    try {
      r = parseUser(c, 500000);
    } catch (e) {
      throw new Error(`parseUser(${JSON.stringify(c)}) 抛异常: ${e.message}`);
    }
    assert(r && typeof r === 'object', '应返回对象');
    assert(r.balance === 0, `balance 应为 0，实际 ${r.balance}`);
    assert(r.usedAmount === 0, `usedAmount 应为 0，实际 ${r.usedAmount}`);
    assert(r.requestCount === 0, `requestCount 应为 0，实际 ${r.requestCount}`);
  }
});

check('parseUser 非 JSON 结构(字符串/数字) -> 不抛异常且合理兜底', () => {
  const bad = ['not-json', 123, true];
  for (const c of bad) {
    let r;
    try {
      r = parseUser(c, 500000);
    } catch (e) {
      throw new Error(`parseUser(${JSON.stringify(c)}) 抛异常: ${e.message}`);
    }
    assert(r && typeof r === 'object', '应返回对象');
    assert(Number.isFinite(r.balance) && Number.isFinite(r.usedAmount) && Number.isFinite(r.requestCount),
      `应全部为有限数: ${JSON.stringify(r)}`);
  }
});

// ---------- parseTodayStat ----------
check('parseTodayStat 正常 data.quota -> todayAmount 正确', () => {
  const r = parseTodayStat({ quota: 250000 }, 500000);
  assert(r.todayAmount === 0.5, `todayAmount 期望 0.5，实际 ${r.todayAmount}`);
});

check('parseTodayStat 缺字段/异常 -> todayAmount 兜底 0，不抛异常', () => {
  const cases = [null, undefined, {}, { other: 5 }, 'x'];
  for (const c of cases) {
    let r;
    try {
      r = parseTodayStat(c, 500000);
    } catch (e) {
      throw new Error(`parseTodayStat(${JSON.stringify(c)}) 抛异常: ${e.message}`);
    }
    assert(r && typeof r === 'object', '应返回对象');
    assert(r.todayAmount === 0, `todayAmount 应为 0，实际 ${r.todayAmount}`);
  }
});

// ---------- aggregateTodayTokens ----------
// 说明：aggregateTodayTokens 接收已合并的日志条目数组，做纯累加（分页/capped 在 api.js 层）。
check('aggregateTodayTokens 单页/多条累加', () => {
  const r = aggregateTodayTokens([
    { prompt_tokens: 10, completion_tokens: 20 },
    { prompt_tokens: 5, completion_tokens: 5 },
  ]);
  assert(r === 40, `期望 40，实际 ${r}`);
});

check('aggregateTodayTokens 多页(多条数组)累加', () => {
  const r = aggregateTodayTokens([
    { prompt_tokens: 1, completion_tokens: 2 },
    { prompt_tokens: 3, completion_tokens: 4 },
    { prompt_tokens: 10, completion_tokens: 10 },
  ]);
  assert(r === 30, `期望 30，实际 ${r}`);
});

check('aggregateTodayTokens 空数组 -> 0', () => {
  assert(aggregateTodayTokens([]) === 0, '空数组应返回 0');
});

check('aggregateTodayTokens 某条目缺 prompt/completion -> 当作 0', () => {
  const r = aggregateTodayTokens([
    { prompt_tokens: 10 }, // completion 缺失 -> 0
    { completion_tokens: 5 }, // prompt 缺失 -> 0
    {}, // 全缺 -> 0
  ]);
  assert(r === 15, `期望 15，实际 ${r}`);
});

check('aggregateTodayTokens 非数组入参 -> 兜底 0 不抛异常', () => {
  let r;
  try {
    r = aggregateTodayTokens(null);
  } catch (e) {
    throw new Error(`null 入参抛异常: ${e.message}`);
  }
  assert(r === 0, `非数组应返回 0，实际 ${r}`);
});

check('TOKEN_PAGE_CAP 导出值 = 50（与 constants.MAX_TOKEN_PAGES 一致）', () => {
  assert(TOKEN_PAGE_CAP === 50, `期望 50，实际 ${TOKEN_PAGE_CAP}`);
});

console.log(`\n==== metrics 结果: ${passed} 通过 / ${failed} 失败 / 共 ${passed + failed} ====`);
if (failed > 0) {
  console.log('失败明细:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
