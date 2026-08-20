// 零依赖启动器：一条命令同时拉起 Vite 开发服务器与 Electron，
// 并自动注入 VITE_DEV_SERVER_URL，使 Electron 走热更新开发模式。
// 用法：npm run dev
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEV_URL = 'http://localhost:52317';

// 1) 启动 Vite 开发服务器（继承终端输出）
const vite = spawn('npx', ['vite'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

// 2) 轮询直到 Vite 在 52317 就绪，避免 Electron 抢先加载导致白屏
function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(DEV_URL, (res) => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('Vite 启动超时，请检查端口是否被占用'));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

// 3) Vite 就绪后启动 Electron（注入开发服务器地址）
waitForServer()
  .then(() => {
    const electron = spawn('npx', ['electron', '.'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, VITE_DEV_SERVER_URL: DEV_URL },
    });
    electron.on('exit', (code) => process.exit(code ?? 0));
  })
  .catch((err) => {
    console.error('[dev] ' + err.message);
    try { vite.kill(); } catch {}
    process.exit(1);
  });

// 退出时清理子进程
const cleanup = () => {
  try { vite.kill(); } catch {}
  process.exit();
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
