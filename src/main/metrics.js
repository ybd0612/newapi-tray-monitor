// 纯函数指标计算模块（无 Electron / fetch 依赖，可被 node 直接 import 测试）
// 仅依赖 shared/constants.js 中的默认配置与分页常量。
import { DEFAULT_CONFIG, MAX_TOKEN_PAGES } from '../shared/constants.js';

/**
 * 将额度单位换算为金额。
 * @param {number} quotaUnits 原始额度单位（来自 NewAPI 的 quota / used_quota 等）
 * @param {number} [factor] 换算因子，默认取 DEFAULT_CONFIG.factor
 * @returns {number} 金额（quotaUnits / factor）
 */
export function toAmount(quotaUnits, factor = DEFAULT_CONFIG.factor) {
  const f = Number(factor) > 0 ? Number(factor) : DEFAULT_CONFIG.factor;
  const q = Number(quotaUnits);
  // 金额保留四位小数
  return Number.isFinite(q) ? Math.round((q / f) * 10000) / 10000 : 0;
}

/**
 * 解析 /api/user/self 返回的 data，提取余额/总用量/总请求数。
 * @param {object} data NewAPI 用户接口 data 字段
 * @param {number} [factor] 换算因子
 * @returns {{balance:number, usedAmount:number, requestCount:number}}
 */
export function parseUser(data, factor) {
  const d = data || {};
  const quota = Number(d.quota) || 0; // 当前余额（额度单位）
  const usedQuota = Number(d.used_quota) || 0; // 累计已用（额度单位）
  const requestCount = Number(d.request_count) || 0; // 总请求数
  return {
    balance: toAmount(quota, factor),
    usedAmount: toAmount(usedQuota, factor),
    requestCount,
  };
}

/**
 * 解析 /api/log/self/stat 返回的 data，提取今日消耗金额。
 * @param {object} data 统计接口 data 字段（含 quota）
 * @param {number} [factor] 换算因子
 * @returns {{todayAmount:number}}
 */
export function parseTodayStat(data, factor) {
  const d = data || {};
  const quota = Number(d.quota) || 0; // 该时间范围内消耗额度（单位）
  return { todayAmount: toAmount(quota, factor) };
}

/**
 * 聚合今日总 token：对每条日志累加 prompt_tokens + completion_tokens。
 * @param {Array<object>} entries 日志条目数组（已合并的所有分页结果）
 * @returns {number} 今日总 token
 */
export function aggregateTodayTokens(entries) {
  let total = 0;
  if (Array.isArray(entries)) {
    for (const item of entries) {
      const prompt = Number(item?.prompt_tokens) || 0;
      const completion = Number(item?.completion_tokens) || 0;
      total += prompt + completion;
    }
  }
  return total;
}

// 便于测试时引用分页硬上限
export const TOKEN_PAGE_CAP = MAX_TOKEN_PAGES;
