// 把 Tauri 打包产物统一收集到 build/installer/（唯一构建目录下的安装包区）
// 源文件：src-tauri/target/release/bundle/nsis/*（.exe 安装包 + .sig 更新签名）
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const destDir = join(root, 'build', 'installer');

if (!existsSync(srcDir)) {
  console.warn(`[copy-installer] 未找到打包产物目录，跳过：${srcDir}`);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => /\.(exe|sig|msi|zip)$/i.test(f));
if (files.length === 0) {
  console.warn('[copy-installer] 打包目录中没有可收集的安装包');
  process.exit(0);
}

for (const f of files) {
  cpSync(join(srcDir, f), join(destDir, f), { force: true });
  console.log(`[copy-installer] ${f} -> build/installer/`);
}
