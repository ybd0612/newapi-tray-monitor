// 预加载脚本：通过 contextBridge 暴露最小安全接口给渲染进程。
// 渲染进程只能通过这些方法与主进程通信，无法直接访问 Node / Electron 内部。
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants.js';

contextBridge.exposeInMainWorld('api', {
  // 监听主进程推送的指标更新
  onMetrics: (callback) =>
    ipcRenderer.on(IPC_CHANNELS.METRICS_UPDATE, (_event, payload) => callback(payload)),
  // 请求打开设置窗口
  openSettings: () => ipcRenderer.send(IPC_CHANNELS.OPEN_SETTINGS),
  // 保存配置（invoke 返回写入后的配置）
  saveConfig: (cfg) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, cfg),
  // 读取当前配置
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  // 监听“配置已保存”事件（用于关闭设置窗口）
  onConfigSaved: (callback) =>
    ipcRenderer.on(IPC_CHANNELS.CONFIG_SAVED, () => callback()),
});
