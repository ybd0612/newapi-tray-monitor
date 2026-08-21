import { fetchUser, fetchTodayStat, fetchPeriodData, configureFetch } from '../main/api.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { parseUser, parseTodayStat } from '../main/metrics.js';

configureFetch(tauriFetch);
import { DEFAULT_CONFIG, MIN_REFRESH_INTERVAL } from './constants.js';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

const CONFIG_KEY = 'newapi-tray-monitor-config';
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
    todayAmount: parsedStat.todayAmount,
    requestCount: monthData.requests,
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
  saveConfig: async (cfg) => saveConfig(cfg),
  setPanelOpacity: async (value) => {
    const opacity = Math.min(1, Math.max(0.35, Number(value) || 1));
    saveConfig({ ...loadConfig(), panelOpacity: opacity });
    return opacity;
  },
  getPanelPosition: async () => {
    const config = loadConfig();
    if (config.panelPosition) {
      await appWindow.setPosition({ type: 'Physical', x: config.panelPosition.x, y: config.panelPosition.y });
    }
    if (config.panelSize) {
      await appWindow.setSize({ type: 'Physical', width: config.panelSize.width, height: config.panelSize.height });
    }
    return { position: config.panelPosition, size: config.panelSize, opacity: config.panelOpacity };
  },
  startDragging: () => appWindow.startDragging(),
  onMoved: (handler) => appWindow.onMoved(({ payload }) => {
    const position = { x: payload.x, y: payload.y };
    saveConfig({ ...loadConfig(), panelPosition: position });
    handler?.(position);
  }),
  onResized: (handler) => appWindow.onResized(({ payload }) => {
    const size = { width: payload.width, height: payload.height };
    saveConfig({ ...loadConfig(), panelSize: size });
    handler?.(size);
  }),
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
