import React from 'react';

/**
 * 单个指标卡片：label 在上，value 在下。
 * @param {string} label 指标名
 * @param {string|number} value 指标值
 * @param {string} [prefix] 货币符号等前缀
 * @param {string} [className] 额外样式类名
 */
export default function StatCard({ label, value, className = '' }) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
