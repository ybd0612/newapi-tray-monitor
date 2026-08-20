# NewAPI 托盘监控小工具

一个嵌入 Windows 任务栏区域的提示工具：系统托盘常驻图标，主面板显示当前余额、总用量、总请求数、今日用量、今日总 token。

## 技术栈
- Electron 28+ / Vite 5 / React 18
- MUI v5 + Tailwind CSS 3
- 配置使用 `fs` 读写 `userData/config.json`，不引入额外依赖

## 运行步骤
```bash
npm install
npm run build     # 生成 dist/
npm start         # 启动 Electron 主进程
```
> 说明：`start` 脚本为 `electron .`（加载生产构建），首次或改代码后需先 `npm run build`。
> **快速看应用**：直接 `npm start` 即可（dist/ 已构建），会弹出托盘图标 + 常驻面板。
> **开发热更新**：`npm run dev` 一条命令同时启动 Vite（固定端口 `52317`，被占用直接报错）与 Electron，并自动注入 `VITE_DEV_SERVER_URL`，改代码后窗口内即时刷新。

## 使用说明
- 托盘图标：右键菜单“设置 / 显示面板 / 隐藏面板 / 退出”；双击托盘图标打开设置。
- 首次启动若未配置中转站 URL，会自动弹出设置窗口。
- 设置项：中转站 URL、访问令牌、可选用户 ID（`New-Api-User`）、更新频率（秒，最小 10）；金额默认按额度单位 / 500000 换算。
- 今日统计按本地时区的自然日窗口查询：今天 00:00:00 至明天 00:00:00，不采用滚动 24 小时口径。
- 主面板每 `refreshInterval` 秒刷新一次；启动时立即发起首次查询，不等待定时器；今日/月度请求量与 Token 通过 `/api/data/self` 按时间范围一次汇总获取，不再读取日志分页；失败时连续超过 3 次才提示并保留上一次数据。
- 面板拖拽后会保存位置，下次启动恢复上次位置；如果没有保存位置，才使用默认位置。
- 鼠标停留在面板上滚动滚轮可调整透明度，范围 35%～100%，自动保存。
- 设置页支持“开机自动启动”；开机启动时默认驻留托盘，不主动弹出面板。

## Windows 发布与自动更新

项目使用 `electron-builder` 构建 Windows NSIS 安装包，使用 `electron-updater` 从 GitHub Releases 检查更新。

```bash
npm run dist       # 本地构建安装包，输出到 release/
npm run release    # 构建并发布到 GitHub Releases
```

发布前需要在 `package.json` 的 `build.publish` 中填写真实的 GitHub 用户名，并确保本地已登录 GitHub CLI 或设置 `GH_TOKEN`。项目当前目录尚未绑定 Git 远程仓库，需要先创建 GitHub 仓库并配置 `origin`。

## 依赖与镜像说明
- 项目已写入 `.npmrc`，默认走淘宝 npmmirror 镜像（`registry` + `electron_mirror`），国内安装快。
- `package.json` 的 `optionalDependencies` 显式固定了 Windows 平台原生二进制 `@rollup/rollup-win32-x64-msvc` 与 `@esbuild/win32-x64`，用于规避 npm 可选依赖 bug（#4828）导致构建报“Cannot find module … native”的问题；这两个包仅 Windows 需要，其它平台安装时会被安全跳过。

## 已知限制
- `/api/data/self` 返回按时间窗口、模型和时间片汇总的数据，应用会累加 `token_used` 与 `count` 得到 Token 和请求量。
- 透明窗口需 Windows 10+ 支持；个别 Windows 版本托盘对 SVG 图标支持有限，已内置位图兜底。
- 未做账号多用户/多令牌管理。
