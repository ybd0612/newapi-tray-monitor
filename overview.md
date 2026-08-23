# 窗口交互修复概览

## 本轮修复
- 增加 Tauri 窗口移动、位置读取、尺寸读取、位置设置和尺寸设置权限。
- 使用 `PhysicalPosition` / `PhysicalSize` 恢复窗口位置和大小。
- 保留主面板左键拖拽、右键屏蔽和透明度记忆逻辑。

## 验证
- 前端独立构建成功。
- Tauri release 编译成功。
- NSIS 安装包生成成功，文件大小约 3.67 MB。
- `git diff --check` 通过。

## 最新安装包
- `C:\Users\ybd06\temp\newapi-tray-monitor-target-20260823\release\bundle\nsis\NewAPI监控_1.0.0_x64-setup.exe`
- 生成时间：2026-08-23 11:42:32

## 版本发布
- 版本：`1.0.0`
- Git 标签：`v1.0.0`
- Release 附件：`NewAPI监控_1.0.0_x64-setup.exe`

## 提交
- `4086494 修复窗口权限和状态恢复`

## 说明
请安装本轮最新安装包后，依次测试：移动窗口后托盘隐藏再显示、调整大小后隐藏再显示、完全退出后重新启动，以及主面板左键拖拽。