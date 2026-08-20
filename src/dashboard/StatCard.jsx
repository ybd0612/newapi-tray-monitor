import React from 'react';

/**
 * 单个指标卡片：label 在上，value 在下。
 * @param {string} label 指标名
 * @param {string|number} value 指标值
 * @param {string} [prefix] 货币符号等前缀
 */
export default function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
