#!/usr/bin/env node
/** 根据真实引擎获取固定的官方聚合包；下载不等于导入引擎或广告服务开通。 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, linkSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../app-skill-runtime/direct-entry.mjs';
import { assertOrdinaryPath, projectOutput } from './taptap-project-files.mjs';

/** 固定版本与摘要随源码分发，执行时不从网页猜选同名二进制。 */
const manifestPath = fileURLToPath(new URL('../../app-domain-toolkit/assets/mobile-sdks/dirichlet/source-manifest.json', import.meta.url));
/** 所支持的真实引擎，不根据操作系统猜选 Unity 或原生壳。 */
const ENGINES = new Set(['unity', 'cocos', 'phaser', 'threejs']);
/** 限制异常响应体，避免下载错误页面或无限响应占满磁盘。 */
const MAX_BYTES = 512 * 1024 * 1024;

/** 从维护清单选择引擎对应的官方原生聚合包，未实现平台直接报告。 */
export function planTapTapAdSdkDownload({ projectRoot, engine, platform = 'android', output }, { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } = {}) {
  if (!ENGINES.has(engine)) throw new Error('引擎必须为 unity/cocos/phaser/threejs');
  if (!['android', 'ios'].includes(platform) || (engine !== 'unity' && platform !== 'android')) throw new Error('该引擎未交付所选原生平台适配');
  const artifact = manifest.artifacts[engine === 'unity' ? platform === 'ios' ? 'unityIos' : 'unity' : 'android'];
  const version = artifact.version ?? manifest.version;
  const target = projectOutput(projectRoot, output ?? join('ThirdParty', 'TapTap', 'Dirichlet', version, artifact.file));
  const url = new URL(artifact.url);
  if (url.protocol !== 'https:' || url.hostname !== 'tapad-platform.tapimg.com' || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new Error('官方 SDK 来源清单无效');
  if (existsSync(target)) {
    const digest = createHash('sha256').update(readFileSync(target)).digest('hex');
    if (digest !== artifact.sha256) throw new Error('已有 SDK 包与固定官方摘要不同，拒绝覆盖');
    return { engine, platform, target, version, ...artifact, action: 'reuse' };
  }
  return { engine, platform, target, version, ...artifact, action: 'download' };
}

/** 真实流式下载并验证全部字节；失败时只移除本次独占临时文件。 */
export async function downloadTapTapAdSdk(options, { fetchImpl = globalThis.fetch, manifest } = {}) {
  const plan = planTapTapAdSdkDownload(options, manifest ? { manifest } : undefined);
  if (options.dryRun || plan.action === 'reuse') return { ...plan, downloaded: false, imported: false };
  const response = await fetchImpl(plan.url, { redirect: 'error', signal: AbortSignal.timeout(120000) });
  if (!response.ok || response.redirected || !response.body) throw new Error('官方 SDK 下载失败');
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) throw new Error('官方 SDK 响应超过下载限制');
  assertOrdinaryPath(plan.target);
  mkdirSync(dirname(plan.target), { recursive: true });
  const temporary = `${plan.target}.${randomUUID()}.part`;
  const handle = await open(temporary, 'wx');
  let size = 0;
  let closed = false;
  try {
    const digest = createHash('sha256');
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_BYTES) throw new Error('官方 SDK 响应超过下载限制');
      digest.update(bytes);
      // FileHandle.write 允许短写，必须循环保存全部字节后再校验最终文件。
      let offset = 0;
      while (offset < bytes.length) {
        const { bytesWritten } = await handle.write(bytes, offset, bytes.length - offset);
        if (!bytesWritten) throw new Error('官方 SDK 文件写入中断');
        offset += bytesWritten;
      }
    }
    if (!size || digest.digest('hex') !== plan.sha256) throw new Error('官方 SDK 摘要校验失败');
    await handle.close(); closed = true;
    assertOrdinaryPath(plan.target);
    // 独占硬链接发布完整文件；目标被并发创建时失败，不能覆盖用户内容。
    linkSync(temporary, plan.target);
    return { ...plan, downloaded: true, imported: false, bytes: size };
  } finally {
    if (!closed) await handle.close();
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

/** 解析明确的引擎和工程；不接受未校验的任意下载 URL。 */
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--dry-run') { options.dryRun = true; continue; }
    if (!['--project', '--engine', '--platform', '--output'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('用法：--project <工程> --engine <unity|cocos|phaser|threejs> [--platform android|ios] [--output <工程内包路径>] [--dry-run]');
    const name = key === '--project' ? 'projectRoot' : key.slice(2);
    if (Object.hasOwn(options, name)) throw new Error('下载参数重复');
    options[name] = args[++i];
  }
  if (!options.projectRoot || !options.engine) throw new Error('必须明确工程和引擎');
  return options;
}

if (isDirectEntry(import.meta.url)) {
  try { console.log(JSON.stringify(await downloadTapTapAdSdk(parseArgs(process.argv.slice(2))))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
