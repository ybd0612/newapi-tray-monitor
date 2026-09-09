# NewAPI Tray Monitor 项目记忆

- 项目：`C:\Users\ybd06\Documents\project\newapi-tray-monitor`，Tauri 2.x + React。
- 余额提示功能：设置页字段 `balanceAlertThreshold`，默认值 5；主界面余额严格低于阈值时显示红色，等于或高于阈值保持原样。
- 跨窗口刷新根因：设置页与 dashboard 属于独立 WebView，`localStorage` 不共享。保存后通过 `config-updated` 事件携带最新阈值，dashboard 直接使用事件数据，不能再次读取自身旧 localStorage。
- 设置窗口布局：动态创建窗口高度调整为 680，最小高度 560，解决保存按钮被遮挡。
- **构建产物统一在唯一目录 `build/`（2026-09-08 起）**：`build/frontend/` 为 Vite 输出（`vite.config.js` 的 `outDir`，对应 `tauri.conf.json` 的 `frontendDist: ../build/frontend`），`build/installer/` 为 NSIS 安装包与 `.sig`（由 `npm run collect` / `scripts/copy-installer.mjs` 从 `src-tauri/target/release/bundle/nsis` 收集）。**不再使用 `dist/` 或任何 `release*` 目录**，`build/` 已加入 `.gitignore`。
- 已验证：`npm run build`（输出到 `build/frontend`）与 `npm run collect` 通过。
- 历史遗留：9 个空壳 `release-*` 目录因 `app.asar` 被安全软件占用暂无法删除（内容已截断为 0 字节），重启后运行 `C:\Users\ybd06\temp\cleanup-newapi-builds.ps1` 清理。
- `src-tauri/target/` 约 11GB 为 Rust 增量编译缓存，不要随手 `cargo clean`。
- 最新提交：`60e468b 统一构建产物到单一 build 目录`（2026-09-08）。
- 开机自启窗口显示：主窗口 `visible: false`（托盘应用默认隐藏）；autostart 插件 Builder 配 `.args(["--autostart"])`，lib.rs setup 检测该参数则 `show_window(app.handle(), "main")`。**注意：升级后须在设置页关闭再开启一次"开机自动启动"，注册表命令才会带上 `--autostart`。**
- 已发布：最新版本 `v1.0.5`，代码已推送 `main`，标签已推送，GitHub Release：`https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.5`；Actions 任务 `34126360673` 已生成签名 exe 与 `.sig`。
- 安装包：现位于 `build/installer/`（原 `release/` 已废弃）；Windows x64 NSIS；发布后若继续开发，先退出旧程序再安装新版。
- 当前功能：托盘左键切换主窗口显隐；右键菜单为设置/更新/退出；设置页仓库链接使用 `tauri-plugin-opener` 打开系统浏览器。
- 最新相关提交：`763ac3f 同步最新功能文档`；会话收尾记录提交 `b9306b8`。
