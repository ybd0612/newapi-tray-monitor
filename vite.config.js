import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 多页面配置：dashboard(index.html) + settings(settings.html)
// 生产构建输出到 dist/，Electron 主进程通过 loadFile('dist/index.html') 加载。
export default defineConfig({
  // 使用相对路径，保证打包后 file:// 协议下资源可被正确加载
  base: './',
  plugins: [react()],
  // 开发服务器固定使用非默认端口；strictPort 确保端口被占用时直接报错而非擅自换端口
  server: {
    port: 52317,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: fileURLToPath(new URL('./index.html', import.meta.url)),
        settings: fileURLToPath(new URL('./settings.html', import.meta.url)),
      },
    },
  },
});
