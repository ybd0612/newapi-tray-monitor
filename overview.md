# NewAPI Tray Monitor 发布概览

## 本轮变更
- 接入 Tauri updater/process 插件与 GitHub Actions 免费签名发布流程；检查/下载失败静默，下载完成后通过托盘菜单确认安装。
- 修复发布流水线：补齐 `yaml@2.9.0` 开发依赖，并增加兼容的 `tauri` npm 脚本，确保 CI 的 `npm ci` 与 `npm run tauri build` 均可执行。
- 托盘左键单击改为显示/隐藏主窗口切换；右键菜单移除“显示面板”和“隐藏面板”。
- 更新菜单无更新时显示“暂无更新”，下载完成后显示“更新”。
- 设置页增加可点击的 GitHub 项目仓库链接。
- 设置页新增“余额提示阈值”，默认值为 5，并持久化保存。
- 设置窗口高度调整为 680、最小高度 560，保存按钮不再被遮挡。
- 主界面余额严格低于阈值时显示红色字体，达到或高于阈值保持原样。
- 修复跨窗口刷新：设置页与 dashboard 是独立 WebView，保存后通过 `config-updated` 事件直接传递最新阈值。

## 已完成
- GitHub Actions 发布任务 `34101130988` 已成功完成（约 7 分 45 秒），`npm ci`、Tauri 签名构建均通过。
- GitHub Release：`NewAPI 监控 v1.0.4`，已生成 Windows x64 NSIS 安装包及签名文件。
- 远程仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- 已推送 `main` 分支。

## Release
- 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.4
- 安装包：`NewAPI._1.0.4_x64-setup.exe`
- 签名文件：`NewAPI._1.0.4_x64-setup.exe.sig`
- GitHub Release 已发布（非草稿、非预发布）。

## 版本提交
- `60885c6 记录1.0.4发布结果`
- `ec9507b 修复Tauri发布命令`
- `c08e4f5 修复自动更新发布依赖`

## 说明
- `v1.0.4` 标签已指向发布修复提交 `ec9507b` 并推送到远程。
- GitHub Actions 仅提示 actions/checkout@v4 与 actions/setup-node@v4 使用 Node.js 20 的弃用警告，不影响本次发布成功。
- 本地工作区包含 `.neuralmemory/` 运行时目录，未纳入源码提交。
