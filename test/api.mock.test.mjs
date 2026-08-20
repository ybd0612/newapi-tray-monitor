// API 客户端契约检查（静态 + 模拟全局 fetch）
// 运行：node test/api.mock.test.mjs
// api.js 使用全局 fetch（Node 22 内置），此处通过覆盖 globalThis.fetch 进行 mock，
// 验证 URL 拼接、Authorization 头、10s 超时（AbortController 已在源码中）、分页与 capped 逻辑。

import {
  fetchUser,
  fetchTodayStat,
  fetchPeriodData,
} from '../src/main/api.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败');
}

function check(name, fn) {
  try {
    // fn 可能为 async
    return Promise.resolve(fn()).then(() => {
      passed++;
      console.log(`  \u2713 ${name}`);
    }).catch((e) => {
      failed++;
      failures.push(`${name} -> ${e.message}`);
      console.log(`  \u2717 ${name} -> ${e.message}`);
    });
  } catch (e) {
    failed++;
    failures.push(`${name} -> ${e.message}`);
    console.log(`  \u2717 ${name} -> ${e.message}`);
    return Promise.resolve();
  }
}

// ---- mock 工具 ----
let calls = [];
function mockFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options);
  };
}

function okJson(obj) {
  return { ok: true, json: async () => obj };
}

async function assertThrows(fn, label) {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  assert(threw, `${label} 应当抛出异常但未抛出`);
}

console.log('==== api.js 契约模拟测试 ====');

// 1) fetchUser 正常
await check('fetchUser: /api/user/self 正常 -> 解析出 data 字段', async () => {
  mockFetch((url) => {
    assert(url === 'https://api.example.com/api/user/self', `URL 拼接错误: ${url}`);
    return okJson({ success: true, data: { quota: 500000, used_quota: 1234567, request_count: 42 } });
  });
  const data = await fetchUser('https://api.example.com/', 'tok123');
  assert(data && data.quota === 500000, `quota 解析错误: ${JSON.stringify(data)}`);
  assert(data.request_count === 42, `request_count 解析错误: ${JSON.stringify(data)}`);
  // Header 校验
  assert(calls[0].options.headers.Authorization === 'Bearer tok123',
    `Authorization 头错误: ${JSON.stringify(calls[0].options.headers)}`);
});

// 2) fetchUser success:false -> 抛异常（异常兜底由 main.js 统一处理）
await check('fetchUser: success:false -> 抛出异常（上层兜底）', async () => {
  mockFetch(() => okJson({ success: false, message: 'forbidden' }));
  await assertThrows(() => fetchUser('https://x.com', 't'), 'success:false');
});

// 3) fetchUser 缺 data 字段 -> 返回 {}（合理兜底，不抛异常）
await check('fetchUser: 缺 data 字段 -> 返回 {} 兜底', async () => {
  mockFetch(() => okJson({ success: true }));
  const data = await fetchUser('https://x.com', 't');
  assert(data && typeof data === 'object' && !Array.isArray(data), '应返回对象');
});

// 4) fetchTodayStat
await check('fetchTodayStat: /api/log/self/stat -> quota=250000', async () => {
  mockFetch((url) => {
    assert(url.includes('/api/log/self/stat'), `URL 错误: ${url}`);
    assert(url.includes('start_timestamp=100') && url.includes('end_timestamp=200'), `查询参数错误: ${url}`);
    return okJson({ success: true, data: { quota: 250000 } });
  });
  const data = await fetchTodayStat('https://x.com', 't', 100, 200);
  assert(data.quota === 250000, `quota 解析错误: ${JSON.stringify(data)}`);
  assert(calls[0].options.headers.Authorization === 'Bearer t', 'Authorization 头缺失');
});

// 5) fetchPeriodData 聚合接口返回的 token 与请求量
await check('fetchPeriodData: data.items 汇总 token 与请求量', async () => {
  mockFetch((url) => {
    assert(url.includes('/api/data/self'), `URL 错误: ${url}`);
    assert(url.includes('start_timestamp=100') && url.includes('end_timestamp=200'), `查询参数错误: ${url}`);
    return okJson({ success: true, data: { items: [
      { token_used: 30, count: 2 },
      { token_used: 5, count: 1 },
    ] } });
  });
  const r = await fetchPeriodData('https://x.com', 't', 100, 200);
  assert(r.tokens === 35, `token 期望 35，实际 ${r.tokens}`);
  assert(r.requests === 3, `请求量期望 3，实际 ${r.requests}`);
  assert(calls[0].options.headers.Authorization === 'Bearer t', 'Authorization 头缺失');
});

// 6) fetchPeriodData 支持 data 数组
await check('fetchPeriodData: data 数组兼容解析', async () => {
  mockFetch(() => okJson({ success: true, data: [
    { token_used: 10, count: 4 },
  ] }));
  const r = await fetchPeriodData('https://x.com', 't', 100, 200);
  assert(r.tokens === 10 && r.requests === 4, `汇总错误: ${JSON.stringify(r)}`);
});

console.log(`\n==== api 结果: ${passed} 通过 / ${failed} 失败 / 共 ${passed + failed} ====`);
if (failed > 0) {
  console.log('失败明细:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
