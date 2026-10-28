#!/usr/bin/env node
/** 作为单文件远程安装启动器，固定到一个提交后仅按需载入安装器代码和技能文件。 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const API_ROOT = 'https://api.github.com';
const RAW_ROOT = 'https://raw.githubusercontent.com';
const API_VERSION = '2022-11-28';
const MAX_API_BYTES = 7 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_TREE_ENTRIES = 100_000;
const MAX_SELECTED_BYTES = 250 * 1024 * 1024;
const MAX_SELECTED_FILES = 20_000;
const REQUEST_TIMEOUT_MS = 30_000;
const BOOTSTRAP_FILES = Object.freeze([
  'install.mjs',
  'packages/installer/remote-install/install.mjs',
  'packages/installer/installation-content.mjs',
  'packages/installer/install-project-skills.mjs',
  'packages/installer/skill-catalog.mjs',
  'packages/installer/capability-map.mjs',
  'skills/app-skill-runtime/direct-entry.mjs',
  'skills/app-skill-runtime/native-contracts.mjs',
]);
const STACKS = Object.freeze(['unity', 'cocos', 'phaser', 'threejs', 'flutter']);

/** 规范并校验仓库坐标，只接受 GitHub 上的明确仓库地址。 */
export function normalizeRepository(value) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\u007f]/.test(value)) throw new Error('--repo 必须指定 GitHub owner/repo');
  const candidate = value.trim();
  let match = candidate.match(/^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i);
  if (!match) match = candidate.match(/^([^/]+)\/([^/]+)$/);
  if (!match || !/^[A-Za-z0-9_.-]+$/.test(match[1]) || !/^[A-Za-z0-9_.-]+$/.test(match[2]) || ['.', '..'].includes(match[1]) || ['.', '..'].includes(match[2])) {
    throw new Error('--repo 只接受 owner/repo 或 https://github.com/owner/repo');
  }
  return `${match[1]}/${match[2].replace(/\.git$/i, '')}`;
}

/** 计算 Git 对象的 SHA-1，校验服务端返回的文件确实属于固定树对象。 */
export function gitBlobSha(buffer) {
  const bytes = Buffer.from(buffer);
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
}

/** 从受限响应流读取数据，避免元数据接口或坏缓存占满内存。 */
async function readLimitedResponse(response, limit) {
  const declaredSize = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > limit) throw new Error(`远程响应超出大小上限：${limit} bytes`);
  const chunks = [];
  let total = 0;
  if (!response.body) return Buffer.alloc(0);
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > limit) {
      await response.body.cancel?.().catch?.(() => {});
      throw new Error(`远程响应超出大小上限：${limit} bytes`);
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, total);
}

/** 创建固定仓库/提交的 GitHub 内容读取器，网络异常不回显令牌或响应正文。 */
export async function createGitHubSource({ repo, ref, cacheRoot, fetchImpl = globalThis.fetch, env = process.env, signal }) {
  const repository = normalizeRepository(repo);
  if (typeof fetchImpl !== 'function') throw new TypeError('当前 Node.js 环境缺少 fetch');
  if (ref !== undefined && ref !== null && (typeof ref !== 'string' || !ref.trim() || ref.length > 255 || /[\u0000-\u0020\u007f]/.test(ref))) throw new Error('远程 ref 无效');
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || null;
  /** 每次请求独立计时，同时尊重上层取消，避免某个请求无限占用安装事务。 */
  const timeoutSignal = () => signal ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const apiHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'app-creator-skills-remote-installer',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  /** 认证只随 API 请求发送，网络异常不携带可能包含令牌的响应正文。 */
  const fetchBytes = async (url, { api, accept, limit }) => {
    let response;
    try {
      response = await fetchImpl(url, {
        headers: api ? { ...apiHeaders, ...(accept ? { Accept: accept } : {}) } : { 'User-Agent': 'app-creator-skills-remote-installer' },
        redirect: 'error', signal: timeoutSignal(),
      });
    } catch (error) {
      if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw new Error(`远程读取超时：${api ? 'GitHub API' : '仓库文件'}`);
      throw new Error(`远程读取失败：${api ? 'GitHub API' : '仓库文件'}；请检查网络、代理和仓库权限`);
    }
    if (!response.ok) {
      const status = response.status;
      if (status === 403 || status === 429) throw new Error('GitHub 请求达到限流或权限边界；请稍后重试或设置只读 GITHUB_TOKEN');
      if (status === 404) throw new Error('远程仓库、提交或文件不存在，或当前账号无权读取');
      throw new Error(`远程读取失败，HTTP ${status}`);
    }
    return readLimitedResponse(response, limit);
  };

  /** 元数据也经过字节预算，不能让错误页面或超大树绕过流式限制。 */
  const requestJson = async (url) => {
    const bytes = await fetchBytes(url, { api: true, limit: MAX_API_BYTES });
    try { return JSON.parse(bytes.toString('utf8')); }
    catch { throw new Error('GitHub 元数据不是有效 JSON'); }
  };

  const encodedRepo = repository.split('/').map(encodeURIComponent).join('/');
  const metadata = await requestJson(`${API_ROOT}/repos/${encodedRepo}`);
  const selectedRef = ref || metadata.default_branch;
  if (typeof selectedRef !== 'string' || !selectedRef.trim() || selectedRef.length > 255 || /[\u0000-\u0020\u007f]/.test(selectedRef)) throw new Error('远程 ref 无效');
  const encodedRef = encodeURIComponent(selectedRef);
  const commit = await requestJson(`${API_ROOT}/repos/${encodedRepo}/commits/${encodedRef}`);
  const revision = commit?.sha;
  const treeSha = commit?.commit?.tree?.sha;
  if (!/^[a-f0-9]{40}$/i.test(revision ?? '') || !/^[a-f0-9]{40}$/i.test(treeSha ?? '')) throw new Error('GitHub 未返回有效的固定提交和目录树 SHA');
  const tree = await requestJson(`${API_ROOT}/repos/${encodedRepo}/git/trees/${treeSha}?recursive=1`);
  if (tree?.sha?.toLowerCase() !== treeSha.toLowerCase()) throw new Error('GitHub 返回的目录树与固定提交不匹配');
  if (tree?.truncated) throw new Error('远程仓库目录树超过 GitHub 递归清单限制，拒绝使用不完整列表安装');
  if (!Array.isArray(tree?.tree) || tree.tree.length > MAX_TREE_ENTRIES) throw new Error('远程仓库目录树格式无效或超过清单上限');
  const entries = new Map();
  for (const entry of tree.tree) {
    if (typeof entry?.path !== 'string' || entries.has(entry.path)) throw new Error('远程目录树包含无效或重复路径');
    entries.set(entry.path, entry);
  }

  const cacheBase = resolve(cacheRoot || join(env.LOCALAPPDATA || join(homedir(), '.cache'), 'app-creator-skills', 'github-blobs'));
  const cacheMetrics = { downloaded: 0, cacheHits: 0, reusedLocal: 0, metadataDownloaded: 0 };
  const pendingBlobs = new Map();

  /** 在任何下载和大小汇总之前验证 Git 对象类型、摘要及声明大小。 */
  const findBlob = (path) => {
    const entry = entries.get(path);
    if (!entry) throw new Error(`远程提交缺少安装清单或必要文件：${path}`);
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode) || !/^[a-f0-9]{40}$/i.test(entry.sha ?? '')) throw new Error(`远程安装不接受链接、子模块或特殊对象：${path}`);
    if (!Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > MAX_FILE_BYTES) throw new Error(`远程文件大小无效或超过上限：${path}`);
    return entry;
  };

  /** 按内容摘要分桶，使不同栈中相同字节只保留一份缓存。 */
  const cachePath = (oid) => join(cacheBase, oid.slice(0, 2), oid);
  /** 读写都检查缓存的全部祖先，不能借外部 Junction 扩大缓存访问范围。 */
  const inspectCachePath = (path, { createDirectories = false } = {}) => {
    const cachePrefix = cacheBase.endsWith(sep) ? cacheBase : cacheBase + sep;
    const absolute = resolve(path);
    if (!absolute.startsWith(cachePrefix) || isAbsolute(relative(cacheBase, absolute))) throw new Error('缓存文件路径越界');
    let current = dirname(absolute);
    const missing = [];
    while (true) {
      try {
        const metadata = lstatSync(current);
        if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`缓存路径不能包含链接或非目录：${current}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        missing.push(current);
      }
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
    if (createDirectories) {
      // 递归创建时逐层复查，避免默认缓存目录不存在时跳过祖先，或跟随并发替换出的链接。
      for (const directory of missing.reverse()) {
        try { mkdirSync(directory); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
        const metadata = lstatSync(directory);
        if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`缓存路径创建后变得不安全：${directory}`);
      }
    }
  };

  /** 只将通过校验的内容原子接入缓存，并复核并行写入者的结果。 */
  const storeBlob = (entry, bytes) => {
    const path = cachePath(entry.sha);
    inspectCachePath(path, { createDirectories: true });
    let cachedMetadata;
    try { cachedMetadata = lstatSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (cachedMetadata) {
      if (cachedMetadata.isSymbolicLink() || !cachedMetadata.isFile() || cachedMetadata.size !== bytes.length) throw new Error('内容缓存目标不是普通文件或大小异常');
      if (gitBlobSha(readFileSync(path)) !== entry.sha) throw new Error('内容缓存校验失败，拒绝覆盖未知缓存文件');
      return;
    }
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
      renameSync(temporary, path);
    } catch (error) {
      if (!['EEXIST', 'EPERM', 'ENOTEMPTY'].includes(error.code)) throw error;
      let racedMetadata;
      try { racedMetadata = lstatSync(path); } catch { throw new Error('内容缓存并发写入校验失败'); }
      if (racedMetadata.isSymbolicLink() || !racedMetadata.isFile() || racedMetadata.size !== bytes.length || gitBlobSha(readFileSync(path)) !== entry.sha) throw new Error('内容缓存并发写入校验失败');
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  };

  /** 公开内容使用固定提交的原始文件，私库通过带认证的 API 读取二进制。 */
  const requestBlob = async (entry, { metadataFile = false, persistCache = true } = {}) => {
    const encodedPath = entry.path.split('/').map(encodeURIComponent).join('/');
    const oid = entry.sha;
    const uri = token
      ? `${API_ROOT}/repos/${encodedRepo}/git/blobs/${oid}`
      : `${RAW_ROOT}/${repository.split('/').map(encodeURIComponent).join('/')}/${revision}/${encodedPath}`;
    const bytes = await fetchBytes(uri, {
      api: Boolean(token),
      accept: token ? 'application/vnd.github.raw+json' : undefined,
      limit: Math.min(MAX_FILE_BYTES, entry.size),
    });
    if (bytes.length !== entry.size || gitBlobSha(bytes).toLowerCase() !== oid.toLowerCase()) throw new Error(`远程文件大小或 Git SHA 校验失败：${entry.path}`);
    if (metadataFile) cacheMetrics.metadataDownloaded += 1;
    else cacheMetrics.downloaded += 1;
    if (persistCache) storeBlob(entry, bytes);
    return bytes;
  };

  /** 依次尝试可信缓存、本地相同内容和网络；同一摘要的并发读取合并为一次。 */
  const getBlob = async (entry, { allowNetwork = true, localCandidate = null, metadataFile = false, persistMetadata = true } = {}) => {
    const key = entry.sha.toLowerCase();
    if (pendingBlobs.has(key)) return pendingBlobs.get(key);
    // 保留进行中的 Promise，避免不同文件路径引用相同 blob 时重复下载。
    const task = (async () => {
      const path = cachePath(entry.sha);
      inspectCachePath(path);
      let cachedMetadata;
      try { cachedMetadata = lstatSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (cachedMetadata) {
        if (cachedMetadata.isSymbolicLink() || !cachedMetadata.isFile() || cachedMetadata.size !== entry.size) throw new Error(`内容缓存不是普通文件或大小异常：${entry.sha}`);
        const bytes = readFileSync(path);
        if (bytes.length !== entry.size || gitBlobSha(bytes).toLowerCase() !== key) throw new Error(`内容缓存损坏，拒绝使用：${entry.sha}`);
        cacheMetrics.cacheHits += 1;
        return bytes;
      }
      if (localCandidate) {
        try {
          const metadata = lstatSync(localCandidate);
          if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error(`已安装文件不是普通文件：${localCandidate}`);
          if (metadata.size === entry.size) {
            const bytes = readFileSync(localCandidate);
            if (bytes.length === entry.size && gitBlobSha(bytes).toLowerCase() === key) {
              storeBlob(entry, bytes);
              cacheMetrics.reusedLocal += 1;
              return bytes;
            }
          }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      if (!allowNetwork) return null;
      return requestBlob(entry, { metadataFile, persistCache: metadataFile ? persistMetadata : true });
    })();
    pendingBlobs.set(key, task);
    try { return await task; }
    finally { pendingBlobs.delete(key); }
  };

  return {
    repo: repository, ref: selectedRef, revision, treeSha, entries, findBlob, cacheRoot: cacheBase,
    getBlob,
    metrics: cacheMetrics,
    maxSelectedBytes: MAX_SELECTED_BYTES,
    maxSelectedFiles: MAX_SELECTED_FILES,
  };
}

/** 校验用户选择并引导最小安装引擎，代码和技能始终来自同一个提交。 */
export async function runRemoteBootstrap(argv = process.argv.slice(2), runtime = {}) {
  if (argv.includes('--help')) {
    return { help: '用法：node install.mjs <已有项目目录> --repo owner/repo --stack unity|cocos|phaser|threejs|flutter[,...]|all [--ref ref] [--dry-run]\n默认覆盖所选安装目录中的不同内容，成功后不保留旧目录备份；相同内容跳过。' };
  }
  const options = parseBootstrapArgs(argv);
  const source = await createGitHubSource({ repo: options.repo, ref: options.ref, ...runtime });
  const temporaryRoot = await createBootstrapDirectory();
  const payloadFiles = [];
  try {
    for (const path of BOOTSTRAP_FILES) {
      const entry = source.findBlob(path);
      payloadFiles.push({ path, entry });
    }
    const total = payloadFiles.reduce((sum, item) => sum + item.entry.size, 0);
    if (total > 20 * 1024 * 1024) throw new Error('远程安装器引导文件超过安全大小上限');
    for (const file of payloadFiles) {
      const bytes = await source.getBlob(file.entry);
      const target = join(temporaryRoot, ...file.path.split('/'));
      safeWriteBootstrapFile(temporaryRoot, target, bytes);
    }
    const remoteEntry = join(temporaryRoot, 'packages', 'installer', 'remote-install', 'install.mjs');
    const remoteModule = await import(pathToFileURL(remoteEntry).href);
    return await remoteModule.installRemoteSkills({
      ...options, repo: source.repo, ref: source.ref, cacheRoot: source.cacheRoot,
      fetchImpl: runtime.fetchImpl ?? globalThis.fetch, env: runtime.env ?? process.env,
      sourceSnapshot: source, bootstrapFiles: BOOTSTRAP_FILES,
    });
  } finally {
    removePrivateBootstrapDirectory(temporaryRoot);
  }
}

/** 保持 CLI 参数边界清楚；技术栈、仓库和项目都必须由安装者明确提供。 */
function parseBootstrapArgs(argv) {
  const options = { projectRoot: null, repo: null, ref: null, stacks: [], replace: false, dryRun: false };
  const seenValues = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--repo' || argument === '--ref' || argument === '--stack') {
      if (seenValues.has(argument)) throw new Error(`${argument} 只能指定一次`);
      seenValues.add(argument);
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${argument} 需要一个值`);
      const value = argv[++index];
      if (argument === '--repo') options.repo = value;
      if (argument === '--ref') options.ref = value;
      if (argument === '--stack') options.stacks = value === 'all' ? [...STACKS] : value.split(',');
    } else if (argument === '--replace') options.replace = true;
    else if (argument === '--dry-run') options.dryRun = true;
    else if (argument.startsWith('--')) throw new Error(`未知安装选项：${argument}`);
    else if (options.projectRoot) throw new Error('只接受一个项目目录');
    else options.projectRoot = resolve(argument);
  }
  if (!options.repo) throw new Error('必须通过 --repo 指定远程仓库');
  options.repo = normalizeRepository(options.repo);
  if (options.ref !== null && (typeof options.ref !== 'string' || !options.ref.trim() || options.ref.length > 255 || /[\u0000-\u0020\u007f]/.test(options.ref))) throw new Error('--ref 无效');
  if (!options.stacks.length || options.stacks.some((stack) => !STACKS.includes(stack))) throw new Error('--stack 必须明确选择 unity/cocos/phaser/threejs/flutter/all');
  options.stacks = [...new Set(options.stacks)];
  options.projectRoot ??= process.cwd();
  if (!existsSync(options.projectRoot) || !lstatSync(options.projectRoot).isDirectory()) throw new Error('目标项目必须是已有目录');
  assertNoBootstrapLinks(options.projectRoot);
  return options;
}

/** 创建只由当前安装进程拥有的隔离目录。 */
async function createBootstrapDirectory() {
  return mkdtempSync(join(tmpdir(), 'app-creator-remote-bootstrap-'));
}

/** 临时写入路径逐级检查链接和根边界，避免远程文件布局逃逸。 */
function safeWriteBootstrapFile(root, target, content) {
  const prefix = root.endsWith(sep) ? root : root + sep;
  if (!resolve(target).startsWith(prefix)) throw new Error('远程安装器文件路径越界');
  let current = dirname(target);
  const missing = [];
  while (current.startsWith(root)) {
    if (existsSync(current)) {
      if (lstatSync(current).isSymbolicLink() || !lstatSync(current).isDirectory()) throw new Error('远程安装器目录不是安全的普通目录');
    } else missing.push(current);
    if (current === root) break;
    current = dirname(current);
  }
  for (const directory of missing.reverse()) mkdirSync(directory);
  writeFileSync(target, content, { flag: 'wx', mode: 0o600 });
}

/** 只清理上一步创建的隔离下载目录。 */
function removePrivateBootstrapDirectory(root) {
  if (dirname(resolve(root)) !== resolve(tmpdir()) || !resolve(root).startsWith(join(resolve(tmpdir()), 'app-creator-remote-bootstrap-'))) throw new Error('拒绝清理非安装器临时目录');
  const metadata = lstatSync(root);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error('安装器临时目录身份发生变化');
  for (const child of readdirSync(root, { withFileTypes: true })) removePrivateBootstrapDirectoryChild(join(root, child.name));
  rmdirSync(root);
}

/** 清理已核对的临时文件和目录，不接受链接或其他文件类型。 */
function removePrivateBootstrapDirectoryChild(path) {
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || metadata.isFile()) unlinkSync(path);
  else if (metadata.isDirectory()) {
    for (const child of readdirSync(path, { withFileTypes: true })) removePrivateBootstrapDirectoryChild(join(path, child.name));
    rmdirSync(path);
  }
  else throw new Error('安装器临时下载目录出现特殊文件');
}

/** 拒绝项目根路径链上的链接，远程安装器不能向项目外写入。 */
function assertNoBootstrapLinks(path) {
  let current = resolve(path);
  while (true) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`安装路径不能含符号链接：${current}`);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  runRemoteBootstrap().then((result) => {
    if (result?.help) console.log(result.help);
    else console.log(JSON.stringify({
      status: 'PASS', changed: result.changed, repository: result.remote.repository,
      revision: result.remote.revision, ref: result.remote.ref, stacks: result.remote.stacks,
      selectedFileCount: result.remote.selectedFileCount, selectedBytes: result.remote.selectedBytes,
      payloadDownloaded: result.remote.payloadDownloaded ?? 0,
      cacheHits: result.remote.metrics.cacheHits, reusedLocalFiles: result.remote.metrics.reusedLocal,
      metadataDownloaded: result.remote.metrics.metadataDownloaded,
      bootstrapFiles: result.remote.metrics.bootstrapFiles,
      skills: result.entries.filter((entry) => entry.kind === 'skill').map((entry) => entry.name),
      resources: result.entries.filter((entry) => entry.kind === 'resource').map((entry) => entry.name),
      destination: result.destination, backup: result.backup, dryRun: result.remote.dryRun,
    }, null, 2));
  }).catch((error) => {
    console.error(JSON.stringify({ status: 'FAIL', error: error.message }));
    process.exitCode = 1;
  });
}
