// NewAPI 客户端：封装三个接口请求。使用 Node 22 / Electron 内置的全局 fetch。
// 所有请求带 10s 超时（AbortController）。任何失败都向上抛出，由主进程统一兜底。
import { REQUEST_TIMEOUT_MS } from '../shared/constants.js';

let fetchImpl = null;

export function configureFetch(client) {
  fetchImpl = client || null;
}

/** 获取指定时间范围内的汇总数据，避免读取日志分页。 */
export async function fetchPeriodData(baseUrl, token, startTimestamp, endTimestamp, userId, defaultTime) {
  const maxSpan = 27 * 24 * 60 * 60;
  const ranges = [];
  for (let start = startTimestamp; start < endTimestamp; start += maxSpan) {
    ranges.push([start, Math.min(start + maxSpan, endTimestamp)]);
  }
  const parts = await Promise.all(ranges.map(([start, end]) => fetchPeriodChunk(baseUrl, token, start, end, userId)));
  return parts.reduce((total, part) => ({
    tokens: total.tokens + part.tokens,
    requests: total.requests + part.requests,
  }), { tokens: 0, requests: 0 });
}

async function fetchPeriodChunk(baseUrl, token, startTimestamp, endTimestamp, userId) {
  const base = normalizeBase(baseUrl);
  const url = `${base}/api/data/self?start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}&default_time=day`;
  const res = await fetchWithTimeout(url, { headers: authHeaders(token, userId) });
  if (!res.ok) throw new Error(`数据接口错误 ${res.status}`);
  const json = await res.json();
  if (!json || json.success !== true) {
    throw new Error(`数据接口返回失败${json?.message ? `：${json.message}` : ''}`);
  }
  const rows = Array.isArray(json.data) ? json.data : Array.isArray(json.data?.items) ? json.data.items : [];
  return {
    tokens: rows.reduce((sum, row) => sum + (Number(row?.token_used) || 0), 0),
    requests: rows.reduce((sum, row) => sum + (Number(row?.count) || 0), 0),
  };
}

/**
 * 带超时的 fetch 封装。
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const client = fetchImpl || globalThis.fetch;
    return await client(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 构造鉴权头。
 *  规整令牌：去除首尾空白（复制时常带换行/空格），并去掉可能误填的前导 "Bearer " 前缀，
 *  避免拼成 "Bearer Bearer xxx" 触发 401。
 *  部分 NewAPI 部署（如 factory.pub）强制要求附带 New-Api-User 数字用户 ID 头，缺失/不匹配会 401，故可选带上。
 */
function authHeaders(token, userId) {
  const clean = String(token || '')
    .trim()
    .replace(/^Bearer\s+/i, '');
  const headers = { Authorization: `Bearer ${clean}` };
  const uid = userId !== undefined && userId !== null ? String(userId).trim() : '';
  if (uid !== '') headers['New-Api-User'] = uid;
  return headers;
}

/** 去除 baseUrl 结尾多余的斜杠。 */
function normalizeBase(baseUrl) {
  return (baseUrl || '').replace(/\/+$/, '');
}

/**
 * 1) 获取用户信息：GET {baseUrl}/api/user/self
 * @returns {Promise<object>} data 字段
 */
export async function fetchUser(baseUrl, token, userId) {
  const url = `${normalizeBase(baseUrl)}/api/user/self`;
  const res = await fetchWithTimeout(url, { headers: authHeaders(token, userId) });
  if (!res.ok) throw new Error(`用户接口错误 ${res.status}`);
  const json = await res.json();
  if (!json || json.success !== true) throw new Error('用户接口返回失败');
  return json.data || {};
}

/**
 * 2) 获取今日统计：GET {baseUrl}/api/log/self/stat?start_timestamp&end_timestamp
 * @returns {Promise<object>} data 字段
 */
export async function fetchTodayStat(baseUrl, token, startTimestamp, endTimestamp, userId) {
  const base = normalizeBase(baseUrl);
  const url = `${base}/api/log/self/stat?start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`;
  const res = await fetchWithTimeout(url, { headers: authHeaders(token, userId) });
  if (!res.ok) throw new Error(`统计接口错误 ${res.status}`);
  const json = await res.json();
  if (!json || json.success !== true) throw new Error('统计接口返回失败');
  return json.data || {};
}

