import React, { useEffect, useRef, useState } from 'react';
import StatCard from './StatCard.jsx';
import { createTauriApi, tauriApi } from '../shared/tauriApi.js';
import { DEFAULT_CONFIG } from '../shared/constants.js';
import { checkForAppUpdate, listenForUpdateInstall } from '../shared/updater.js';

// 数量格式化：保留千分位
function formatInt(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString('zh-CN');
}

// 金额格式化：保留 2 位小数
function formatMoney(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  return num.toFixed(2);
}

// 消费金额格式化：保留 2 位小数
function formatConsumption(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  return num.toFixed(2);
}

// 大数量使用中文单位，保留 2 位小数（4 位会使长数值溢出面板宽度）
function formatCompact(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '--';
  const abs = Math.abs(num);
  const units = [
    [100000000, '亿'],
    [10000, '万'],
  ];
  const unit = units.find(([threshold]) => abs >= threshold);
  return unit ? `${(num / unit[0]).toFixed(2)}${unit[1]}` : formatInt(num);
}

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [failureCount, setFailureCount] = useState(0);
  const [panelOpacity, setPanelOpacity] = useState(1);
  const [metricPeriod, setMetricPeriod] = useState('today');
  const [balanceAlertThreshold, setBalanceAlertThreshold] = useState(
    DEFAULT_CONFIG.balanceAlertThreshold,
  );
  const panelOpacityRef = useRef(1);
  const secondaryDragRef = useRef({ active: false, dragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    panelOpacityRef.current = panelOpacity;
  }, [panelOpacity]);

  useEffect(() => {
    const api = window.api || tauriApi;
    if (typeof api.getConfig !== 'function') return undefined;
    const loadThreshold = (payload) => {
      const eventThreshold = Number(payload?.balanceAlertThreshold);
      if (Number.isFinite(eventThreshold)) {
        setBalanceAlertThreshold(eventThreshold);
        return;
      }
      api.getConfig().then((config) => {
        const parsedThreshold = Number(config?.balanceAlertThreshold);
        if (Number.isFinite(parsedThreshold)) {
          setBalanceAlertThreshold(parsedThreshold);
        }
      }).catch(() => {
        setBalanceAlertThreshold(DEFAULT_CONFIG.balanceAlertThreshold);
      });
    };
    const onStorage = (event) => {
      if (event.key === 'newapi-tray-monitor-config') loadThreshold();
    };
    let unlistenConfig = null;
    loadThreshold();
    window.addEventListener('storage', onStorage);
    if (!window.api && typeof tauriApi.onConfigUpdated === 'function') {
      tauriApi.onConfigUpdated((payload) => loadThreshold(payload)).then((unlisten) => {
        unlistenConfig = unlisten;
      });
    }
    return () => {
      window.removeEventListener('storage', onStorage);
      unlistenConfig?.();
    };
  }, []);

  useEffect(() => {
    let dispose = null;
    let unlistenUpdateInstall = null;
    void listenForUpdateInstall().then((unlisten) => { unlistenUpdateInstall = unlisten; });
    // Download and signature verification stay silent; the tray receives the
    // explicit confirmation item only when an update is ready to install.
    void checkForAppUpdate();
    let unlistenMoved = null;
    const api = window.api;
    const onContextMenu = (event) => event.preventDefault();
    window.addEventListener('contextmenu', onContextMenu, { capture: true });
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
      // 先注册移动事件，再恢复状态，避免首次打开时错过位置变化。
      tauriApi.onMoved(() => { void tauriApi.saveWindowState(); }).then((unlisten) => { unlistenMoved = unlisten; });
      tauriApi.getPanelPosition().then((state) => {
        const opacity = Math.min(1, Math.max(0.35, Number(state?.opacity) || 1));
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
      window.removeEventListener('contextmenu', onContextMenu, { capture: true });
      unlistenMoved?.();
      tauriApi.saveWindowState();
      dispose?.();
      unlistenUpdateInstall?.();
    };
  }, []);

  const balance = metrics ? formatMoney(metrics.balance) : '--';
  const totalAmount = metrics ? formatConsumption(metrics.usedAmount) : '--';
  const monthAmount = metrics ? formatConsumption(metrics.monthAmount) : '--';
  const todayAmount = metrics ? formatConsumption(metrics.todayAmount) : '--';
  const requestCount = metrics ? formatInt(metrics.requestCount) : '--';
  const monthRequests = metrics ? formatInt(metrics.monthRequests) : '--';
  const todayRequests = metrics ? formatInt(metrics.todayRequests) : '--';
  const monthTokens = metrics ? formatCompact(metrics.monthTokens) : '--';
  const todayTokens = metrics ? formatCompact(metrics.todayTokens) : '--';
  const balanceValue = Number(metrics?.balance);
  const isBalanceAlert = Number.isFinite(balanceValue)
    && balanceValue < balanceAlertThreshold;

  const handleMouseDown = (event) => {
    if (event.button === 0) {
      event.preventDefault();
      void tauriApi.startDragging();
    }
  };

  const toggleMetricPeriod = () => {
    setMetricPeriod((period) => (period === 'today' ? 'month' : 'today'));
  };

  // 下方指标区：按下后移动超过阈值 -> 拖动窗口；原地点击 -> 切换今日/本月。
  // 不能直接用 startDragging + onClick：原生拖拽循环会吞掉后续事件，
  // 是否发生拖拽无法从 click 判断，因此自己记录位移再分支。
  const handleSecondaryMouseDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const state = secondaryDragRef.current;
    state.active = true;
    state.dragging = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    const onMove = (moveEvent) => {
      if (!state.active || state.dragging) return;
      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;
      if (Math.hypot(dx, dy) > 4) {
        state.dragging = true;
        void tauriApi.startDragging();
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      if (state.active && !state.dragging) toggleMetricPeriod();
      state.active = false;
      state.dragging = false;
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
  };

  const isMonth = metricPeriod === 'month';
  const secondaryMetrics = isMonth
    ? [
      { label: '本月消费', value: monthAmount },
      { label: '本月请求量', value: monthRequests },
      { label: '本月Token', value: monthTokens },
    ]
    : [
      { label: '今日消费', value: todayAmount },
      { label: '今日请求量', value: todayRequests },
      { label: '今日Token', value: todayTokens },
    ];

  return (
    <div className="dashboard-root" onMouseDown={handleMouseDown} style={{ '--panel-opacity': panelOpacity }}>
      <div className="panel">
        <div className="metric-row metric-row-primary">
          <StatCard
            label="余额"
            value={balance}
            className={`stat-card-primary ${isBalanceAlert ? 'stat-card-alert' : ''}`.trim()}
          />
          <StatCard label="总消费" value={totalAmount} className="stat-card-primary" />
          {error && <div className="error-bar">获取失败：{error}</div>}
        </div>
        <div
          className={`metric-row metric-row-secondary ${isMonth ? 'metric-row-secondary-month' : ''}`.trim()}
          role="button"
          tabIndex={0}
          aria-label={`切换至${isMonth ? '今日' : '本月'}统计`}
          onMouseDown={handleSecondaryMouseDown}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleMetricPeriod();
            }
          }}
        >
          {secondaryMetrics.map(({ label, value }) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </div>

        {metrics?.capped && <div className="cap-hint">今日 Token 已达分页上限</div>}
      </div>
    </div>
  );
}
