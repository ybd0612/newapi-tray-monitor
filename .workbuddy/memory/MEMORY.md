# NewAPI Tray Monitor 项目记忆

- 项目：`C:\Users\ybd06\Documents\project\newapi-tray-monitor`，Tauri 2.x + React。
- 余额提示功能：设置页字段 `balanceAlertThreshold`，默认值 5；主界面余额严格低于阈值时显示红色，等于或高于阈值保持原样。
- 跨窗口刷新根因：设置页与 dashboard 属于独立 WebView，`localStorage` 不共享。保存后通过 `config-updated` 事件携带最新阈值，dashboard 直接使用事件数据，不能再次读取自身旧 localStorage。
- 设置窗口布局：动态创建窗口高度调整为 680，最小高度 560，解决保存按钮被遮挡。
- 已验证：`npm run build:tauri:dev` 通过；普通 `npm run build` 曾因已有 `dist/assets` 安全清理失败退出，但非源码编译错误。
- 开机自启窗口显示：主窗口 `visible: false`（托盘应用默认隐藏）；autostart 插件 Builder 配 `.args(["--autostart"])`，lib.rs setup 检测该参数则 `show_window(app.handle(), "main")`。**注意：升级后须在设置页关闭再开启一次"开机自动启动"，注册表命令才会带上 `--autostart`。**
- 已发布：版本 `v1.0.2`，代码已推送 `main`，标签已推送，GitHub Release：`https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.2`。
- 安装包：`release/NewAPI-monitor-1.0.2-x64-setup.exe`，Windows x64 NSIS；发布后若继续开发，先退出旧程序再安装新版。
- 最新提交：`963c713 发布 v1.0.2`；会话结束时工作区干净。
