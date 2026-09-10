# NewAPI Tray Monitor 发布概览

## 当前状态（2026-09-10）
- 当前源码版本：`1.0.7`
- 最新正式 Release：`v1.0.7`（tag 推送后由 GitHub Actions 自动构建发布）
- Release 地址：https://github.com/ybd0612/newapi-tray-monitor/releases/tag/v1.0.7
- GitHub Actions 发布任务：`34454602627`，签名构建成功
- 发布资产：`latest.json` + `NewAPI监控_1.0.7_x64-setup.exe`（4,040,032 字节）+ `.sig` 签名，更新端点已验证返回 1.0.7

## v1.0.7 变更内容
- 设置页：用户 ID 增加来源提示（可在中转站网页「个人资料」页查看）。
- 设置页：底部改为「项目地址」链接 + 右侧显示当前版本号（`getVersion` 自动读取）。
- 设置页：禁用右键菜单，与主面板一致。
- 设置页：测试连接/保存/错误提示统一改为底部 toast 弹出，不再挤占布局。
- 主面板：下方指标区支持拖拽移动窗口，原地点击才切换今日/本月（位移阈值 4px 区分）。
- 发布流程：新增构建后自动生成并上传 updater `latest.json` 的步骤（修复中文文件名导致签名匹配失败、旧客户端无法检查更新的问题）。

## v1.0.6 变更内容
- 修复主窗体多屏/显示器电源切换后异常变宽：固定尺寸恢复改用逻辑像素（`LogicalSize`），移除窗口尺寸持久化与 `onResized` 状态回写，恢复位置时校验显示器工作区、越界自动回退到可用显示器。
- 修复“今日/本月 Token”长数值溢出面板：万/亿单位数值从 4 位小数改为 2 位，面板左右内边距 10px → 12px，错误条与分页上限提示定位同步。

## 当前功能口径
- 托盘左键单击切换主窗口显示/隐藏；右键菜单提供设置、更新和退出。
- 无更新时更新菜单显示"暂无更新"并禁用；签名更新下载完成后显示"更新"并可点击安装。
- 设置页提供 GitHub 项目仓库链接，使用 `tauri-plugin-opener` 调用系统默认浏览器打开。
- 设置页支持中转站 URL、访问令牌、用户 ID、开机自启、刷新频率和余额提示阈值。
- 余额严格低于阈值时显示红色，等于或高于阈值保持原样。
- 主窗口固定尺寸，支持拖动和透明度调整；跨显示器切换保持一致大小。

## 文档同步记录（2026-09-10，v1.0.7 发布时）
- `README.md`：发布版本号同步为 v1.0.7。
- `overview.md`：新增 v1.0.7 变更记录与发布状态，v1.0.6 内容转入历史。

## 历史发布
- v1.0.6：修复多屏 DPI 变宽与 Token 数值溢出；Actions 任务 `34446676477`。
- v1.0.5：Windows x64 NSIS 安装包与签名文件（Actions 任务 `34126360673`）。
- v1.0.4：Windows x64 NSIS 安装包与签名文件。

## 项目信息
- SSH 仓库：`git@github.com:ybd0612/newapi-tray-monitor.git`
- HTTPS 仓库：https://github.com/ybd0612/newapi-tray-monitor
- 本地构建产物：`src-tauri/target/release/bundle/nsis/`；统一收集目录为 `build/installer/`
- 发布前必须同步：`package.json`、`package-lock.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`、`README.md`。
