// 预加载脚本（CJS，兼容性最佳）。
// 注意：preload 运行在独立的渲染上下文，ESM 的 `import { ... } from 'electron'`
// 在该上下文解析不稳定（该 electron 版本下 named import 会失败），因此这里使用
// `require('electron')`——Electron 对 preload 里的 require('electron') 做了 special-case，
// 始终能拿到 contextBridge / ipcRenderer。
const { contextBridge, ipcRenderer } = require('electron');

// 与 src/shared/constants.js 的 IPC_CHANNELS 保持一致（此处内联，避免引入 ESM 依赖）
const CH = {
  METRICS_UPDATE: 'metrics-update', // 主进程 -> dashboard：推送最新指标
  OPEN_SETTINGS: 'open-settings', // 渲染进程 -> 主进程：打开设置窗口
  SAVE_CONFIG: 'save-config', // 渲染进程 -> 主进程(invoke)：保存配置
  GET_CONFIG: 'get-config', // 渲染进程 -> 主进程(invoke)：读取配置
  CONFIG_SAVED: 'config-saved', // 主进程 -> settings：保存完成，可关闭
  TEST_CONNECTION: 'test-connection', // 渲染进程 -> 主进程(invoke)：测试连接（不保存）
  DASHBOARD_READY: 'dashboard-ready', // dashboard 渲染进程 -> 主进程：页面已准备接收指标
  DASHBOARD_WHEEL: 'dashboard-wheel', // dashboard 渲染进程 -> 主进程：滚轮调整透明度
  GET_AUTO_START: 'get-auto-start',
  SET_AUTO_START: 'set-auto-start',
};

// 通过 contextBridge 暴露最小安全接口给渲染进程（渲染进程无法直接访问 Node / Electron 内部）
contextBridge.exposeInMainWorld('api', {
  // 监听主进程推送的指标更新
  onMetrics: (callback) =>
    ipcRenderer.on(CH.METRICS_UPDATE, (_event, payload) => {
      console.log('[dashboard] metrics received', payload);
      callback(payload);
    }),
  // 请求打开设置窗口
  openSettings: () => ipcRenderer.send(CH.OPEN_SETTINGS),
  // 保存配置（invoke 返回写入后的配置）
  saveConfig: (cfg) => ipcRenderer.invoke(CH.SAVE_CONFIG, cfg),
  // 读取当前配置
  getConfig: () => ipcRenderer.invoke(CH.GET_CONFIG),
  // 监听“配置已保存”事件（用于关闭设置窗口）
  onConfigSaved: (callback) => ipcRenderer.on(CH.CONFIG_SAVED, () => callback()),
  // 测试连接（不保存）：直接用当前表单的 URL/token 验证，结果返回 { ok, message }
  testConnection: (arg) => ipcRenderer.invoke(CH.TEST_CONNECTION, arg),
  dashboardReady: () => ipcRenderer.send(CH.DASHBOARD_READY),
  dashboardWheel: (deltaY) => ipcRenderer.send(CH.DASHBOARD_WHEEL, Number(deltaY) || 0),
  getAutoStart: () => ipcRenderer.invoke(CH.GET_AUTO_START),
  setAutoStart: (enabled) => ipcRenderer.invoke(CH.SET_AUTO_START, Boolean(enabled)),
});
