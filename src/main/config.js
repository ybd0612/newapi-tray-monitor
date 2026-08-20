// 配置读写模块：读写 userData/config.json
// 设计约束：
//  - 路径以“参数注入”方式支持，默认走 Electron app 的 userData 目录；
//  - 延迟加载 'electron'，避免在非 Electron 环境（如 node 测试）下触发 GUI 相关代码；
//  - 所有函数对文件缺失/JSON 损坏都做了兜底，返回默认配置。
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { DEFAULT_CONFIG } from '../shared/constants.js';

const requireElectron = createRequire(import.meta.url);

// 通过 configureConfigPath 注入路径（测试时使用）；未注入则回退 Electron userData。
let injectedConfigPath = null;

/**
 * 注入配置文件路径（主要用于单元测试）。
 * @param {string} p 绝对路径
 */
export function configureConfigPath(p) {
  injectedConfigPath = p;
}

/**
 * 解析配置文件实际路径。优先使用注入路径；否则尝试 Electron userData；
 * 若 Electron 不可用，则回退到当前工作目录下的 config.json（仅兜底，不应在生产触发）。
 * @returns {string}
 */
function resolveConfigPath() {
  if (injectedConfigPath) return injectedConfigPath;
  try {
    const electron = requireElectron('electron');
    const app = electron.app;
    return path.join(app.getPath('userData'), 'config.json');
  } catch {
    return path.join(process.cwd(), 'config.json');
  }
}

/** 返回默认配置副本。 */
export function getDefaultConfig() {
  return { ...DEFAULT_CONFIG };
}

/**
 * 读取配置；文件不存在或解析失败均返回默认配置。
 * @returns {object} 合并后的配置
 */
export function loadConfig() {
  try {
    const p = resolveConfigPath();
    if (!fs.existsSync(p)) return getDefaultConfig();
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return getDefaultConfig();
    return { ...getDefaultConfig(), ...parsed };
  } catch {
    return getDefaultConfig();
  }
}

/**
 * 保存配置到文件（与默认配置合并，保证字段齐全）。
 * @param {object} cfg 待保存配置
 * @returns {object} 实际写入的配置
 */
export function saveConfig(cfg) {
  const merged = { ...getDefaultConfig(), ...(cfg || {}) };
  const p = resolveConfigPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
