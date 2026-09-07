# NewAPI Tray Monitor 发布概览

## v1.0.5 本轮变更
- 托盘左键单击改为显示/隐藏主窗口切换；右键菜单移除“显示面板”和“隐藏面板”。
- 更新菜单无更新时显示“暂无更新”，下载完成后显示“更新”。
- 设置页增加可点击的 GitHub 项目仓库链接。
- 通过 `tauri-plugin-opener` 调用系统默认浏览器打开仓库链接，修复 WebView 内普通链接不跳转的问题。

## v1.0.5 构建结果
- 版本：`1.0.5`
- 安装包：`src-tauri/target/release/bundle/nsis/NewAPI监控_1.0.5_x64-setup.exe`
- 目标：Windows x64 NSIS
- 本地构建：因本机未配置 `TAURI_SIGNING_PRIVATE_KEY`，只生成未签名 exe；GitHub Actions 已使用仓库 Secret 成功生成正式签名资产。
- 验证：metrics 18/18、API mock 6/6、Vite 构建、Rust/Tauri `cargo check` 均通过。

## v1.0.5 GitHub Release
- 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.5
- 安装包：`NewAPI._1.0.5_x64-setup.exe`
- 签名文件：`NewAPI._1.0.5_x64-setup.exe.sig`
- GitHub Actions 任务：`34126360673`，已成功完成。
- Release 状态：正式发布，非草稿、非预发布。

## v1.0.4 历史发布
- GitHub Release：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.4
- 安装包：`NewAPI._1.0.4_x64-setup.exe`
- 签名文件：`NewAPI._1.0.4_x64-setup.exe.sig`
- GitHub Actions 任务 `34101130988` 已成功完成。

## 项目信息
- 远程仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- HTTPS：https://github.com/ybd0612/newapi-tray-monitor
