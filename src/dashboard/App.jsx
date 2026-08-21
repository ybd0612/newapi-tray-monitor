import React, { useEffect, useRef, useState } from 'react';
import StatCard from './StatCard.jsx';
import { createTauriApi, tauriApi } from '../shared/tauriApi.js';

// 数量格式化：保留千分位
function formatInt(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString('zh-CN');
}

// 金额格式化：保留 4 位小数
function formatMoney(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  return num.toFixed(4);
}

// 大数量使用中文单位，统一保留 4 位小数
function formatCompact(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  const abs = Math.abs(num);
  const units = [
    [100000000, '亿'],
    [10000, '万'],
  ];
  const unit = units.find(([threshold]) => abs >= threshold);
  return unit ? `${(num / unit[0]).toFixed(4)}${unit[1]}` : formatInt(num);
}

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [failureCount, setFailureCount] = useState(0);
  const [panelOpacity, setPanelOpacity] = useState(1);
  const panelOpacityRef = useRef(1);

  useEffect(() => {
    panelOpacityRef.current = panelOpacity;
  }, [panelOpacity]);

  useEffect(() => {
    let dispose = null;
    let unlistenMoved = null;
    let unlistenResized = null;
    const api = window.api;
    if (!api) {
      createTauriApi({
        onMetrics: (payload) => {
          if (payload?.ok) {
            setMetrics(payload);
            setFailureCount(0);
            setError(null);
          } else if (payload) {
            setFailureCount((count) => {
              const nextCount = count + 1;
              if (nextCount > 3) setError(payload.error || '获取失败');
              return nextCount;
            });
          }
        },
      }).then((controller) => { dispose = controller.dispose; });
    }
    const onWheel = (event) => {
      event.preventDefault();
      const next = Math.min(1, Math.max(0.35, panelOpacityRef.current + (event.deltaY < 0 ? 0.05 : -0.05)));
      panelOpacityRef.current = next;
      setPanelOpacity(next);
      tauriApi.setPanelOpacity(next);
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    if (!api) {
      // 先注册事件，再恢复状态，避免首次打开时错过移动/缩放事件。
      tauriApi.onMoved(() => {}).then((unlisten) => { unlistenMoved = unlisten; });
      tauriApi.onResized(() => {}).then((unlisten) => { unlistenResized = unlisten; });
      tauriApi.getPanelPosition().then((state) => {
        const opacity = Number(state?.opacity) || 1;
        panelOpacityRef.current = opacity;
        setPanelOpacity(opacity);
      });
    }
    console.log('[dashboard] api ready', Boolean(api), Object.keys(api || {}));
    const handler = (payload) => {
      if (payload && payload.ok) {
        setMetrics(payload);
        setFailureCount(0);
        setError(null);
      } else if (payload) {
        // 单次失败忽略，连续超过 3 次才提示
        setFailureCount((count) => {
          const nextCount = count + 1;
          if (nextCount > 3) setError(payload.error || '获取失败');
          return nextCount;
        });
      }
    };
    if (api && api.onMetrics) api.onMetrics(handler);
    if (api && api.dashboardReady) api.dashboardReady();
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      unlistenMoved?.();
      unlistenResized?.();
      dispose?.();
    };
  }, []);

  const balance = metrics ? formatMoney(metrics.balance) : '--';
  const todayAmount = metrics ? formatMoney(metrics.todayAmount) : '--';
  const requestCount = metrics ? formatInt(metrics.requestCount) : '--';
  const todayRequests = metrics ? formatInt(metrics.todayRequests) : '--';
  const monthTokens = metrics ? formatCompact(metrics.monthTokens) : '--';
  const todayTokens = metrics ? formatCompact(metrics.todayTokens) : '--';

  return (
    <div className="dashboard-root" data-tauri-drag-region style={{ '--panel-opacity': panelOpacity }}>
      <div className="panel">
        {error && <div className="error-bar">获取失败：{error}</div>}

        <div className="metric-row metric-row-balance">
          <StatCard label="余额" value={balance} />
          <StatCard label="今日消费" value={todayAmount} />
        </div>
        <div className="metric-row">
          <StatCard label="本月请求量" value={requestCount} />
          <StatCard label="今日请求量" value={todayRequests} />
        </div>
        <div className="metric-row">
          <StatCard label="本月Token" value={monthTokens} />
          <StatCard label="今日Token" value={todayTokens} />
        </div>

        {metrics?.capped && <div className="cap-hint">今日 Token 已达分页上限</div>}
      </div>
    </div>
  );
}
