// Electron 主进程：创建托盘、dashboard 窗口、settings 窗口；维护轮询定时器与 IPC。
import electronMain from 'electron/main';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const electronApi = electronMain.default || electronMain;
const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, protocol } = electronApi;
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater.default || electronUpdater;

import { loadConfig, saveConfig, getDefaultConfig } from './config.js';
import { fetchUser, fetchTodayStat, fetchPeriodData } from './api.js';
import { parseUser, parseTodayStat } from './metrics.js';
import { IPC_CHANNELS, MIN_REFRESH_INTERVAL } from '../shared/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- 全局状态 ----
let config = getDefaultConfig();
let dashboardWin = null;
let settingsWin = null;
let tray = null;
let pollTimer = null;
let lastPayload = null; // 保留上一次成功数据，失败时面板继续展示
let consecutiveFailures = 0;
let isRefreshing = false;
let isPositioningDashboard = false;
let positioningTimer = null;
const debugLogPath = path.join(__dirname, '..', '..', 'debug.log');
function debugLog(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')}\n`;
  try { fs.appendFileSync(debugLogPath, line, 'utf8'); } catch {}
}

// 内联 SVG 托盘图标（蓝色圆角方块 + 字母 N），无需外部图片文件。
const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' +
  '<rect x="20" y="20" width="216" height="216" rx="48" fill="#2196f3"/>' +
  '<text x="128" y="180" font-size="150" font-family="Arial, sans-serif" font-weight="bold" ' +
  'fill="#ffffff" text-anchor="middle">N</text></svg>';

/**
 * 生成托盘图标：优先用内联 SVG（data URL）；若平台不支持则回退到内存位图（青色圆盘）。
 * @returns {nativeImage}
 */
function createTrayIcon() {
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(ICON_SVG).toString('base64');
  let img = nativeImage.createFromDataURL(dataUrl);
  if (img.isEmpty()) img = createBitmapIcon();
  return img;
}

/** 回退位图：32x32 青色圆盘（带透明背景），保证 Windows 托盘一定可见。 */
function createBitmapIcon() {
  const size = 32;
  const buffer = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r = size / 2 - 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= r) {
        buffer[idx] = 33; // R
        buffer[idx + 1] = 150; // G
        buffer[idx + 2] = 243; // B
        buffer[idx + 3] = 255; // A
      } else {
        buffer[idx + 3] = 0; // 透明
      }
    }
  }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

// 注册私有协议 app://（需在 app ready 前调用）：以 http 风格加载本地 dist，规避 file:// 下 ES Module 被 CORS 拦截、渲染进程不执行的问题。
if (!protocol) throw new Error('Electron protocol API 未加载，请使用 Electron 可执行文件启动');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

// 用 app:// 协议提供 dist 目录静态文件（替代 file://，解决 Vite ESM 产物加载失败）
function registerAppProtocol() {
  const distDir = path.resolve(__dirname, '..', '..', 'dist');
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      const u = new URL(request.url);
      let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
      const resolved = path.resolve(distDir, rel);
      // 目录穿越防护：只允许访问 dist 目录内文件
      if (!resolved.startsWith(distDir)) {
        callback({ error: -6 }); // net::ERR_ACCESS_DENIED
        return;
      }
      callback({ path: resolved });
    } catch (e) {
      callback({ error: -6 });
    }
  });
}

// ---- 渲染进程加载（兼容 Vite 开发服务器与生产构建）----
function loadRenderer(win, file) {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl + file);
  } else {
    // 生产构建走私有协议 app://，避免 file:// 下 ES Module 被 CORS 拦截
    win.loadURL('app://local/' + file);
  }
}

// ---- dashboard 窗口（常驻任务栏上方）----
function createDashboardWindow() {
  if (dashboardWin) return;
  const width = 300;
  const height = 180; // 初值，加载完成后按内容自适应
  dashboardWin = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    roundedCorners: true,
    opacity: Number(config.panelOpacity) || 1,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRenderer(dashboardWin, 'index.html');

  dashboardWin.once('ready-to-show', () => {
    dashboardWin.show();
    autoSizeDashboard();
    if (lastPayload) sendMetrics(lastPayload);
  });
  dashboardWin.webContents.on('did-finish-load', () => {
    if (lastPayload) sendMetrics(lastPayload);
  });
  dashboardWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    debugLog(`[dashboard] 加载失败 ${errorCode}: ${errorDescription} (${validatedURL})`);
  });
  dashboardWin.on('move', persistDashboardPosition);
  dashboardWin.on('closed', () => {
    persistDashboardPosition();
    dashboardWin = null;
  });
}

/** 让面板高度自适应内容，并锚定到任务栏上方居中。 */
function autoSizeDashboard() {
  if (!dashboardWin || dashboardWin.isDestroyed()) return;
  const measure = `document.querySelector('.panel') ? Math.ceil(document.querySelector('.panel').getBoundingClientRect().height) : 0`;
  dashboardWin.webContents
    .executeJavaScript(measure)
    .then((h) => {
      const newH = Math.max(140, Math.round(h) + 16);
      layoutDashboard(Math.max(96, Math.min(220, Math.round(h) + 8)));
    })
    .catch(() => {});
}

/** 将 dashboard 定位到主屏底部居中、紧贴任务栏上方。 */
function layoutDashboard(height) {
  if (!dashboardWin || dashboardWin.isDestroyed()) return;
  const width = 300;
  const display = screen.getDisplayMatching(dashboardWin.getBounds());
  const { workArea } = display;
  const saved = config.panelPosition;
  const hasSaved = saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y));
  const savedX = hasSaved ? Number(saved.x) : Math.round(workArea.x + (workArea.width - width) / 2);
  const savedY = hasSaved ? Number(saved.y) : Math.round(workArea.y + workArea.height - height - 8);
  const x = Math.min(Math.max(savedX, workArea.x), workArea.x + workArea.width - width);
  const y = Math.min(Math.max(savedY, workArea.y), workArea.y + workArea.height - height);
  isPositioningDashboard = true;
  dashboardWin.setBounds({ x, y, width, height });
  if (positioningTimer) clearTimeout(positioningTimer);
  positioningTimer = setTimeout(() => {
    isPositioningDashboard = false;
    positioningTimer = null;
  }, 250);
}

function persistDashboardPosition() {
  if (isPositioningDashboard || !dashboardWin || dashboardWin.isDestroyed()) return;
  const { x, y } = dashboardWin.getBounds();
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  config = saveConfig({ ...config, panelPosition: { x, y } });
}

function showDashboard() {
  if (!dashboardWin) createDashboardWindow();
  else {
    dashboardWin.show();
    autoSizeDashboard();
  }
}

function hideDashboard() {
  if (dashboardWin && !dashboardWin.isDestroyed()) dashboardWin.hide();
}

// ---- settings 窗口 ----
function createSettingsWindow() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 480,
    height: 520,
    center: true,
    frame: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRenderer(settingsWin, 'settings.html');
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

// ---- 托盘 ----
function createTray() {
  tray = new Tray(createTrayIcon());
  const contextMenu = Menu.buildFromTemplate([
    { label: '设置', click: () => createSettingsWindow() },
    { label: '显示面板', click: () => showDashboard() },
    { label: '隐藏面板', click: () => hideDashboard() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setToolTip('NewAPI 监控');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createSettingsWindow());
}

// ---- 数据拉取与推送 ----
function sendMetrics(payload) {
  debugLog('[metrics] send', { ok: payload?.ok, hasDashboard: Boolean(dashboardWin), destroyed: dashboardWin?.isDestroyed?.() });
  if (dashboardWin && !dashboardWin.isDestroyed()) {
    dashboardWin.webContents.send(IPC_CHANNELS.METRICS_UPDATE, payload);
  }
}

/** 计算本地自然日的起止 Unix 秒。 */
function getDayRange(offsetDays = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays + 1, 0, 0, 0, 0);
  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(end.getTime() / 1000),
  };
}

/** 计算本地自然月的起止 Unix 秒。 */
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  // /api/data/self 限制时间跨度不能超过 1 个月，月度统计查询到当前时刻即可。
  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(now.getTime() / 1000),
  };
}

/** 执行一次完整刷新，并推送结果给 dashboard。 */
async function refreshOnce(isInitial = false) {
  if (isRefreshing) return;
  if (!config.baseUrl || !config.token) {
    sendMetrics({
      ok: false,
      error: '未配置中转站或令牌',
      lastUpdatedAt: lastPayload ? lastPayload.updatedAt : null,
    });
    return;
  }
  isRefreshing = true;
  try {
    const today = getDayRange();
    const month = getMonthRange();
    const [userData, todayStatData, todayData, monthData] = await Promise.all([
      fetchUser(config.baseUrl, config.token, config.userId),
      fetchTodayStat(config.baseUrl, config.token, today.startTimestamp, today.endTimestamp, config.userId),
      fetchPeriodData(config.baseUrl, config.token, today.startTimestamp, today.endTimestamp, config.userId, 'day'),
      fetchPeriodData(config.baseUrl, config.token, month.startTimestamp, month.endTimestamp, config.userId, 'month'),
    ]);

    const user = parseUser(userData, config.factor);
    const stat = parseTodayStat(todayStatData, config.factor);

    const payload = {
      ok: true,
      balance: user.balance,
      todayAmount: stat.todayAmount,
      requestCount: monthData.requests,
      todayRequests: todayData.requests,
      monthTokens: monthData.tokens,
      todayTokens: todayData.tokens,
      capped: false,
      currencySymbol: config.currencySymbol || '$',
      updatedAt: new Date().toLocaleString('zh-CN'),
    };
    lastPayload = payload;
    consecutiveFailures = 0;
    debugLog('[metrics] refresh success', payload);
    sendMetrics(payload);
  } catch (err) {
    debugLog('[metrics] refresh failed', err && err.stack ? err.stack : err);
    consecutiveFailures += 1;
    if (consecutiveFailures > 3) {
      sendMetrics({
        ok: false,
        error: err && err.message ? err.message : '未知错误',
        lastUpdatedAt: lastPayload ? lastPayload.updatedAt : null,
      });
    }
  } finally {
    isRefreshing = false;
  }
}

function startAutoUpdate() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdatesAndNotify().catch((err) => debugLog('[update] check failed', err?.message || err));
}

function startPolling() {
  stopPolling();
  const interval = Math.max(MIN_REFRESH_INTERVAL, Number(config.refreshInterval) || 60);
  pollTimer = setInterval(refreshOnce, interval * 1000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ---- IPC 处理 ----
function adjustDashboardOpacity(deltaY) {
  if (!dashboardWin || dashboardWin.isDestroyed()) return;
  const step = deltaY < 0 ? 0.05 : -0.05;
  const current = Number(config.panelOpacity) || 1;
  const opacity = Math.min(1, Math.max(0.35, Math.round((current + step) * 100) / 100));
  dashboardWin.setOpacity(opacity);
  config = saveConfig({ ...config, panelOpacity: opacity });
}

function registerIpc() {
  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => config);

  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, (_event, cfg) => {
    const merged = saveConfig(cfg); // 写入 userData/config.json
    config = merged; // 更新内存配置
    startPolling(); // 按新间隔重启定时器
    refreshOnce(); // 立即刷新一次
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.webContents.send(IPC_CHANNELS.CONFIG_SAVED); // 通知设置窗口关闭
    }
    return merged;
  });

  // 测试连接：不写入配置，直接用传入的 URL/token 打 /api/user/self 诊断（成功/401/网络错）
  ipcMain.handle(IPC_CHANNELS.GET_AUTO_START, () => Boolean(app.getLoginItemSettings().openAtLogin));

  ipcMain.handle(IPC_CHANNELS.SET_AUTO_START, (_event, enabled) => {
    const openAtLogin = Boolean(enabled);
    app.setLoginItemSettings({ openAtLogin, path: process.execPath, args: ['--hidden'] });
    config = saveConfig({ ...config, autoStart: openAtLogin });
    return Boolean(app.getLoginItemSettings().openAtLogin);
  });

  ipcMain.handle(IPC_CHANNELS.TEST_CONNECTION, async (_event, { baseUrl, token, userId }) => {
    if (!baseUrl || !token) {
      return { ok: false, message: '请先填写中转站URL和访问令牌' };
    }
    try {
      const data = await fetchUser(baseUrl, token, userId);
      const quota = typeof data.quota === 'number' ? data.quota : 'N/A';
      return {
        ok: true,
        message: `连接成功，用户 ${data.username || '(未返回)'}，额度单位 ${quota}`,
      };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : '未知错误' };
    }
  });

  ipcMain.on(IPC_CHANNELS.OPEN_SETTINGS, () => createSettingsWindow());
  ipcMain.on(IPC_CHANNELS.DASHBOARD_READY, () => {
    if (dashboardWin && !dashboardWin.isDestroyed()) {
      dashboardWin.setOpacity(Number(config.panelOpacity) || 1);
    }
    if (lastPayload) sendMetrics(lastPayload);
  });
  ipcMain.on(IPC_CHANNELS.DASHBOARD_WHEEL, (_event, deltaY) => adjustDashboardOpacity(deltaY));
}

// ---- 应用生命周期 ----
app.whenReady().then(() => {
  registerAppProtocol();
  Menu.setApplicationMenu(null);
  config = loadConfig();
  if (process.argv.includes('--hidden')) {
    config = { ...config, startHidden: true };
  }
  registerIpc();
  createTray();
  if (!config.startHidden) createDashboardWindow();

  // 首次若未配置中转站地址，自动打开设置窗口
  if (!config.baseUrl && !config.startHidden) {
    createSettingsWindow();
  }

  startPolling();
  // 首次启动立即发起一次请求，不等待定时器；不阻塞窗口创建。
  void refreshOnce(true);
  startAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboardWindow();
  });
});

// 托盘应用：关闭所有窗口时不退出，仅隐藏
app.on('window-all-closed', () => {
  /* 保持后台运行 */
});

app.on('before-quit', () => {
  stopPolling();
  if (tray) tray.destroy();
});
