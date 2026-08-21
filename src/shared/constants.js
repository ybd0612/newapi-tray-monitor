// 共享常量：IPC 通道名、默认配置、字段标签、轮询/分页参数
// 该文件为纯 ESM，不依赖 Electron，可被主进程与渲染进程共同引用。

// ---- IPC 通道名（主进程 <-> 渲染进程）----
export const IPC_CHANNELS = {
  METRICS_UPDATE: 'metrics-update', // 主进程 -> dashboard：推送最新指标
  OPEN_SETTINGS: 'open-settings', // 渲染进程 -> 主进程：打开设置窗口
  SAVE_CONFIG: 'save-config', // 渲染进程 -> 主进程(invoke)：保存配置
  GET_CONFIG: 'get-config', // 渲染进程 -> 主进程(invoke)：读取配置
  CONFIG_SAVED: 'config-saved', // 主进程 -> settings：保存完成，可关闭
  TEST_CONNECTION: 'test-connection', // 渲染进程 -> 主进程(invoke)：测试连接（不保存，用于诊断）
  DASHBOARD_READY: 'dashboard-ready', // dashboard 渲染进程 -> 主进程：页面已准备接收指标
  DASHBOARD_WHEEL: 'dashboard-wheel', // dashboard 渲染进程 -> 主进程：滚轮调整透明度
  GET_AUTO_START: 'get-auto-start',
  SET_AUTO_START: 'set-auto-start',
};

// ---- 默认配置 ----
export const DEFAULT_CONFIG = {
  baseUrl: '', // 中转站地址，如 https://api.example.com
  token: '', // 访问令牌
  refreshInterval: 60, // 刷新间隔（秒）
  currencySymbol: '$', // 货币符号
  factor: 500000, // 换算因子：额度单位 / factor = 金额
  userId: '', // 数字用户 ID（New-Api-User 头）；factory.pub 等强制要求，留空兼容普通 NewAPI
  panelPosition: null, // 面板上次拖拽后的位置 { x, y }
  panelSize: null, // 面板上次调整后的大小 { width, height }
  panelOpacity: 1, // 面板透明度，范围 0.35 到 1
  autoStart: false, // 是否随 Windows 登录自动启动
};

// ---- 字段中文标签（用于面板展示）----
export const FIELD_LABELS = {
  balance: '当前余额',
  usedAmount: '总用量(金额)',
  requestCount: '总请求数',
  todayAmount: '今日用量(金额)',
  todayTokens: '今日总token',
};

// ---- 运行参数 ----
export const MIN_REFRESH_INTERVAL = 10; // 最小刷新间隔（秒）
export const REQUEST_TIMEOUT_MS = 10000; // 单次请求超时（毫秒）
export const MAX_TOKEN_PAGES = 50; // 今日 token 聚合最多翻页数（硬上限，防止失控）
export const TOKEN_PAGE_SIZE = 100; // 每页日志条数
export const STARTUP_TOKEN_PAGE_LIMIT = 1; // 首次启动只拉第一页，优先快速展示核心数据
