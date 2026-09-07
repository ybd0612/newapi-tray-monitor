# NewAPI Tray Monitor 发布概览

## 本轮变更
- 接入 Tauri updater/process 插件与 GitHub Actions 免费签名发布流程；检查/下载失败静默，下载完成后通过托盘菜单确认安装。
- 修复发布流水线：补齐 `yaml@2.9.0` 开发依赖，并增加兼容的 `tauri` npm 脚本，确保 CI 的 `npm ci` 与 `npm run tauri build` 均可执行。
- 当前仍需生成 Tauri 签名密钥并配置公钥与 GitHub Secrets 后，才能进行正式签名发布。
- 设置页新增“余额提示阈值”，默认值为 5，并持久化保存。
- 设置窗口高度调整为 680、最小高度 560，保存按钮不再被遮挡。
- 主界面余额严格低于阈值时显示红色字体，达到或高于阈值保持原样。
- 修复跨窗口刷新：设置页与 dashboard 是独立 WebView，保存后通过 `config-updated` 事件直接传递最新阈值。
- `npm run build:tauri:dev` 构建验证通过；普通 `npm run build` 曾因已有 `dist/assets` 安全清理失败退出，但非源码编译错误。

## 已完成
- GitHub Actions 发布任务 `34101130988` 已成功完成（约 7 分 45 秒），`npm ci`、Tauri 签名构建均通过。
- GitHub Release：`NewAPI 监控 v1.0.4`，已生成 Windows x64 NSIS 安装包及签名文件。
- 远程仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- 已推送 `main` 分支。
- 已创建并推送版本标签 `v1.0.1`。
- 已创建 GitHub Release：`NewAPI监控 v1.0.1`。
- 已上传 Windows x64 NSIS 安装包。

## Release
- 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.4
- 安装包：`NewAPI._1.0.4_x64-setup.exe`
- 签名文件：`NewAPI._1.0.4_x64-setup.exe.sig`
- GitHub Release 已发布（非草稿、非预发布）。

## 版本提交
- `1f7dcf8 记录 v1.0.1 发布`
- `ecae7d9 发布 v1.0.1`
- `bc30869 修复余额阈值实时刷新`

## 说明
- 当前源码提交：`ec9507b 修复Tauri发布命令`；`v1.0.4` 标签已指向该提交并推送到远程。
- GitHub Actions 仅提示 actions/checkout@v4 与 actions/setup-node@v4 使用 Node.js 20 的弃用警告，不影响本次发布成功。
- 本地工作区包含 `.workbuddy/memory/` 与 `.neuralmemory/` 运行时目录，未纳入源码提交。
