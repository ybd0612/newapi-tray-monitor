# NewAPI Tray Monitor 发布概览

## 本轮变更
- 设置页新增“余额提示阈值”，默认值为 5，并持久化保存。
- 主界面余额严格低于阈值时显示红色字体，达到或高于阈值保持原样。
- `npm run build:tauri:dev` 构建验证通过；普通 `npm run build` 因现有 `dist/assets` 安全清理失败未完成。
- QA 子任务达到最大轮次，未返回正式 QA 报告；已完成代码静态检查与构建验证。

## 已完成
- 远程仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- 推送 `main` 分支。
- 创建并推送版本标签 `v1.0.0`。
- 创建 GitHub Release：`NewAPI监控 v1.0.0`。
- 上传 Windows NSIS 安装包，使用 ASCII 文件名避免中文文件名下载乱码。

## Release
- 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.0
- 安装包：`NewAPI-monitor-1.0.0-x64-setup.exe`
- 大小：3,665,101 bytes
- SHA-256：`1bac1e8d4d34bde75afe7dd4d20e1da4910365ae479d2bc9240a5ce1cc581c41`

## 版本提交
- `7ab7d08 发布 v1.0.0`
- `4086494 修复窗口权限和状态恢复`

## 说明
构建缓存和临时前端目录未提交到仓库。