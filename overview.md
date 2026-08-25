# NewAPI Tray Monitor 发布概览

## 本轮变更
- 设置页新增“余额提示阈值”，默认值为 5，并持久化保存。
- 设置窗口高度调整为 680、最小高度 560，保存按钮不再被遮挡。
- 主界面余额严格低于阈值时显示红色字体，达到或高于阈值保持原样。
- 修复跨窗口刷新：设置页与 dashboard 是独立 WebView，保存后通过 `config-updated` 事件直接传递最新阈值。
- `npm run build:tauri:dev` 构建验证通过；普通 `npm run build` 曾因已有 `dist/assets` 安全清理失败退出，但非源码编译错误。

## 已完成
- 远程仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- 已推送 `main` 分支。
- 已创建并推送版本标签 `v1.0.1`。
- 已创建 GitHub Release：`NewAPI监控 v1.0.1`。
- 已上传 Windows x64 NSIS 安装包。

## Release
- 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.1
- 安装包：`NewAPI-monitor-1.0.1-x64-setup.exe`
- 本地路径：`release/NewAPI-monitor-1.0.1-x64-setup.exe`

## 版本提交
- `1f7dcf8 记录 v1.0.1 发布`
- `ecae7d9 发布 v1.0.1`
- `bc30869 修复余额阈值实时刷新`

## 说明
当前会话结束时工作区干净；构建缓存和临时前端目录未提交到仓库。
