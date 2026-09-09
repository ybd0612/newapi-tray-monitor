# NewAPI Tray Monitor 发布概览

## 当前状态（2026-09-09）
- 当前源码版本：`1.0.5`
- 当前 `main` 已推送至提交：`763ac3f`（文档同步提交）
- 最新正式 Release：`v1.0.5`
- Release 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.5
- GitHub Actions 发布任务：`34126360673`，已成功完成签名构建。
- 发布资产：`NewAPI._1.0.5_x64-setup.exe` 与 `NewAPI._1.0.5_x64-setup.exe.sig`

## 当前功能口径
- 托盘左键单击切换主窗口显示/隐藏；右键菜单提供设置、更新和退出。
- 无更新时更新菜单显示“暂无更新”并禁用；签名更新下载完成后显示“更新”并可点击安装。
- 设置页提供 GitHub 项目仓库链接，使用 `tauri-plugin-opener` 调用系统默认浏览器打开。
- 设置页支持中转站 URL、访问令牌、用户 ID、开机自启、刷新频率和余额提示阈值。
- 余额严格低于阈值时显示红色，等于或高于阈值保持原样。
- 主窗口固定尺寸，支持拖动和透明度调整。

## 本轮文档审查与同步
- `README.md` 已修正托盘交互、固定窗口尺寸、自动更新、opener 插件、仓库链接、v1.0.5 发布口径和使用步骤。
- `overview.md` 已收敛为当前状态与历史发布记录，避免把 v1.0.4 历史信息误当作当前版本。
- 项目当日日志：`.workbuddy/memory/2026-09-07.md`。

## 历史发布
- v1.0.4：已生成 Windows x64 NSIS 安装包与签名文件。
- v1.0.5：已生成 Windows x64 NSIS 安装包与签名文件，当前为最新正式版本。

## 项目信息
- SSH 仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- HTTPS 仓库：https://github.com/ybd0612/newapi-tray-monitor
- 本地构建产物：`src-tauri/target/release/bundle/nsis/`；统一收集目录为 `build/installer/`
- 发布前必须同步：`package.json`、`package-lock.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`、`README.md`。
