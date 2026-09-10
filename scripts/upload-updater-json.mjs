// 生成并上传 Tauri updater 的 latest.json 到指定 tag 的 Release。
// 背景：tauri-action 在 Windows runner 上按文件名匹配中文安装包（NewAPI监控_*.exe）的
// 签名文件时失败（"Signature not found for the updater JSON. Skipping upload..."），
// 导致 Release 一直缺 latest.json，旧版本客户端检查更新 404。
// 本脚本直接通过 API 找到 .sig 资产并生成 JSON，不依赖本地文件名编码。
//
// 环境变量：GITHUB_TOKEN、GITHUB_REPOSITORY（owner/repo）、GITHUB_REF_NAME（tag，如 v1.0.6）
// 用法（CI）：node scripts/upload-updater-json.mjs
import { readFileSync } from 'node:fs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const tag = process.env.GITHUB_REF_NAME;

if (!token || !repo || !tag) {
  console.error('[updater-json] 缺少 GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_REF_NAME');
  process.exit(1);
}

const api = `https://api.github.com/repos/${repo}`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'newapi-tray-monitor-release',
};

// 1. 定位 tag 对应的 Release
const releaseRes = await fetch(`${api}/releases/tags/${encodeURIComponent(tag)}`, { headers });
if (!releaseRes.ok) {
  console.error(`[updater-json] 获取 release 失败：${releaseRes.status} ${await releaseRes.text()}`);
  process.exit(1);
}
const release = await releaseRes.json();

// 2. 找 Windows x64 安装包及其签名（避免依赖中文名，用后缀匹配）
const exe = release.assets.find((asset) => /x64-setup\.exe$/i.test(asset.name));
const sig = release.assets.find((asset) => /x64-setup\.exe\.sig$/i.test(asset.name));
if (!exe || !sig) {
  console.error('[updater-json] Release 中未找到 x64-setup.exe / .sig 资产');
  process.exit(1);
}

// 3. 下载签名内容（octet-stream 跟随 302 到对象存储）
const sigRes = await fetch(sig.url, { headers: { ...headers, Accept: 'application/octet-stream' } });
if (!sigRes.ok) {
  console.error(`[updater-json] 下载签名失败：${sigRes.status}`);
  process.exit(1);
}
const signature = (await sigRes.text()).trim();

// 4. 版本号以 src-tauri/tauri.conf.json 为准
const config = JSON.parse(
  readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'),
);
const version = config.version;

const payload = {
  version,
  notes: `NewAPI 监控 ${tag}`,
  pub_date: release.published_at,
  platforms: {
    'windows-x86_64': {
      signature,
      url: exe.browser_download_url,
    },
  },
};

// 5. 幂等：已存在 latest.json 先删除
const existing = release.assets.find((asset) => asset.name === 'latest.json');
if (existing) {
  const del = await fetch(`${api}/releases/assets/${existing.id}`, { method: 'DELETE', headers });
  if (!del.ok) {
    console.error(`[updater-json] 删除旧 latest.json 失败：${del.status}`);
    process.exit(1);
  }
  console.log('[updater-json] 已删除旧 latest.json');
}

// 6. 上传新 latest.json
const uploadUrl = release.upload_url.replace(/\{\?name,label\}$/, '');
const uploadRes = await fetch(`${uploadUrl}?name=latest.json`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/octet-stream' },
  body: JSON.stringify(payload, null, 2),
});
if (!uploadRes.ok) {
  console.error(`[updater-json] 上传失败：${uploadRes.status} ${await uploadRes.text()}`);
  process.exit(1);
}
const uploaded = await uploadRes.json();
console.log(`[updater-json] 已上传 latest.json（${uploaded.size} 字节）：${uploaded.browser_download_url}`);
console.log(`[updater-json] version=${version} platform=windows-x86_64 url=${exe.browser_download_url}`);
