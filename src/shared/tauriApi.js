import { fetchUser, fetchTodayStat, fetchPeriodData, configureFetch } from '../main/api.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { parseUser, parseTodayStat } from '../main/metrics.js';

configureFetch(tauriFetch);
import { DEFAULT_CONFIG, MIN_REFRESH_INTERVAL } from './constants.js';
import { availableMonitors, getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { emit, listen } from '@tauri-apps/api/event';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

const CONFIG_KEY = 'newapi-tray-monitor-config';
const CURRENT_PANEL_SIZE = { width: 240, height: 112 };
const appWindow = getCurrentWindow();

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  const merged = { ...DEFAULT_CONFIG, ...(cfg || {}) };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
  return merged;
}

function getDayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(end.getTime() / 1000),
  };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(now.getTime() / 1000),
  };
}

async function restorePanelPosition(savedPosition) {
  const monitors = await availableMonitors();
  if (!monitors.length) return savedPosition || null;

  const candidate = savedPosition && {
    x: Number(savedPosition.x),
    y: Number(savedPosition.y),
  };
  const isFinitePosition = candidate
    && Number.isFinite(candidate.x)
    && Number.isFinite(candidate.y);
  const monitor = monitors.find(({ workArea }) => {
    const right = workArea.position.x + workArea.size.width;
    const bottom = workArea.position.y + workArea.size.height;
    return isFinitePosition
      && candidate.x >= workArea.position.x
      && candidate.x < right
      && candidate.y >= workArea.position.y
      && candidate.y < bottom;
  }) || monitors[0];
  const scaleFactor = monitor.scaleFactor;
  const windowWidth = CURRENT_PANEL_SIZE.width * scaleFactor;
  const windowHeight = CURRENT_PANEL_SIZE.height * scaleFactor;
  const { position, size } = monitor.workArea;
  const x = isFinitePosition
    ? Math.min(Math.max(candidate.x, position.x), position.x + size.width - windowWidth)
    : position.x;
  const y = isFinitePosition
    ? Math.min(Math.max(candidate.y, position.y), position.y + size.height - windowHeight)
    : position.y;
  const positionToRestore = { x: Math.round(x), y: Math.round(y) };
  await appWindow.setPosition(new PhysicalPosition(positionToRestore.x, positionToRestore.y));
  return positionToRestore;
}

async function collectMetrics(cfg) {
  const today = getDayRange();
  const month = getMonthRange();
  const [user, stat, todayData, monthData] = await Promise.all([
    fetchUser(cfg.baseUrl, cfg.token, cfg.userId),
    fetchTodayStat(cfg.baseUrl, cfg.token, today.startTimestamp, today.endTimestamp, cfg.userId),
    fetchPeriodData(cfg.baseUrl, cfg.token, today.startTimestamp, today.endTimestamp, cfg.userId, 'day'),
    fetchPeriodData(cfg.baseUrl, cfg.token, month.startTimestamp, month.endTimestamp, cfg.userId, 'month'),
  ]);
  const parsedUser = parseUser(user, cfg.factor);
  const parsedStat = parseTodayStat(stat, cfg.factor);
  return {
    ok: true,
    balance: parsedUser.balance,
    usedAmount: parsedUser.usedAmount,
    todayAmount: parsedStat.todayAmount,
    monthAmount: monthData.amount / (Number(cfg.factor) > 0 ? Number(cfg.factor) : DEFAULT_CONFIG.factor),
    requestCount: parsedUser.requestCount,
    monthRequests: monthData.requests,
    todayRequests: todayData.requests,
    monthTokens: monthData.tokens,
    todayTokens: todayData.tokens,
    updatedAt: new Date().toLocaleString('zh-CN'),
  };
}

export async function createTauriApi({ onMetrics } = {}) {
  let timer = null;
  let failures = 0;
  const emit = async () => {
    const cfg = loadConfig();
    if (!cfg.baseUrl || !cfg.token) {
      onMetrics?.({ ok: false, error: '未配置中转站或令牌' });
      return;
    }
    try {
      const payload = await collectMetrics(cfg);
      failures = 0;
      onMetrics?.(payload);
    } catch (error) {
      failures += 1;
      if (failures > 3) onMetrics?.({ ok: false, error: error?.message || '获取失败' });
    }
  };
  const startPolling = () => {
    if (timer) clearInterval(timer);
    const seconds = Math.max(MIN_REFRESH_INTERVAL, Number(loadConfig().refreshInterval) || 60);
    timer = setInterval(emit, seconds * 1000);
  };
  startPolling();
  void emit();
  return { refresh: emit, startPolling, dispose: () => timer && clearInterval(timer) };
}

export const tauriApi = {
  getConfig: async () => loadConfig(),
  saveConfig: async (cfg) => {
    const merged = saveConfig(cfg);
    await emit('config-updated', { balanceAlertThreshold: merged.balanceAlertThreshold });
    return merged;
  },
  onConfigUpdated: (handler) => listen('config-updated', ({ payload }) => handler?.(payload)),
  setPanelOpacity: async (value) => {
    const opacity = Math.min(1, Math.max(0.35, Number(value) || 1));
    saveConfig({ ...loadConfig(), panelOpacity: opacity });
    return opacity;
  },
  getPanelPosition: async () => {
    const config = loadConfig();
    const position = await restorePanelPosition(config.panelPosition);
    // The window is fixed-size. Keep the size in logical pixels so Windows/Tauri
    // recalculates its physical size when the window moves between DPI scales.
    const panelSize = { ...CURRENT_PANEL_SIZE };
    await appWindow.setSize(new LogicalSize(panelSize.width, panelSize.height));
    if (config.panelSize) {
      // Drop legacy physical/outer-size state; it is not safe to restore across monitors.
      saveConfig({ ...config, panelSize: null, panelPosition: position });
    }
    return { position, size: panelSize, opacity: config.panelOpacity };
  },
  startDragging: async () => {
    try {
      await appWindow.startDragging();
    } catch (error) {
      console.error('[dashboard] startDragging failed', error);
    }
  },
  onMoved: (handler) => appWindow.onMoved(async ({ payload }) => {
    const position = { x: payload.x, y: payload.y };
    saveConfig({ ...loadConfig(), panelPosition: position });
    handler?.(position);
  }),
  saveWindowState: async () => {
    const position = await appWindow.outerPosition();
    const state = {
      panelPosition: { x: position.x, y: position.y },
    };
    saveConfig({ ...loadConfig(), ...state, panelSize: null });
    return state;
  },
  testConnection: async ({ baseUrl, token, userId }) => {
    try {
      const data = await fetchUser(baseUrl, token, userId);
      return { ok: true, message: `连接成功，用户 ${data.username || '(未返回)'}` };
    } catch (error) {
      const message = error?.message || String(error) || '未知错误';
      return { ok: false, message: `测试失败：${message}` };
    }
  },
  getAutoStart: () => isEnabled(),
  setAutoStart: async (enabled) => {
    if (enabled) await enable(); else await disable();
    return Boolean(enabled);
  },
  close: () => appWindow.close(),
  hide: () => appWindow.hide(),
  show: () => appWindow.show(),
};
