#!/usr/bin/env node
/** 下载固定提交中的所选技术栈文件，再调用现有安装事务。 */
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_SKILLS } from '../capability-map.mjs';
import { installSkills, STACKS } from '../install-project-skills.mjs';
import { createGitHubSource, normalizeRepository } from '../../../install.mjs';

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const WINDOWS_DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const DOWNLOAD_CONCURRENCY = 8;

/** 解析选项，不允许远程仓库来自任意 URL、默认安装全部栈或参数注入。 */
function parseArgs(argv) {
  const options = { projectRoot: process.cwd(), repo: null, ref: null, stacks: [], replace: false, dryRun: false };
  const seenValues = new Set();
  let positional = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo' || arg === '--ref' || arg === '--stack') {
      if (seenValues.has(arg)) throw new Error(`${arg} 只能指定一次`);
      seenValues.add(arg);
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${arg} 需要指定值`);
      const value = argv[++index];
      if (arg === '--repo') options.repo = value;
      if (arg === '--ref') options.ref = value;
      if (arg === '--stack') options.stacks = value === 'all' ? [...STACKS] : value.split(',');
    } else if (arg === '--replace') options.replace = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--')) throw new Error(`未知安装选项：${arg}`);
    else if (positional) throw new Error('只接受一个项目目录');
    else { options.projectRoot = resolve(arg); positional = true; }
  }
  if (!options.repo) throw new Error('必须用 --repo 指定远程仓库');
  options.repo = normalizeRepository(options.repo);
  if (!options.stacks.length || options.stacks.some((stack) => !STACKS.includes(stack))) throw new Error('--stack 必须明确选择有效技术栈；只有显式 --stack all 才安装全部栈');
  options.stacks = [...new Set(options.stacks)];
  if (options.ref !== null && (typeof options.ref !== 'string' || !options.ref.trim() || options.ref.length > 255 || /[\u0000-\u0020\u007f]/.test(options.ref))) throw new Error('--ref 无效');
  if (!existsSync(options.projectRoot) || !lstatSync(options.projectRoot).isDirectory()) throw new Error('目标项目必须是已有目录');
  assertNoLinks(options.projectRoot);
  return options;
}

/** 只安装目录允许白名单里的完整栈闭包，路径目录名由清单和源映射双重约束。 */
function selectedRootsFor(catalog, stacks) {
  const roots = new Set(CORE_SKILLS);
  for (const stack of stacks) {
    const profile = catalog?.stacks?.[stack];
    if (!profile || !Array.isArray(profile.capabilitySkills) || !profile.capabilitySkills.length
      || !Array.isArray(profile.nativeAdapters) || !profile.nativeAdapters.length
      || !Array.isArray(profile.resourceDirectories)) throw new Error(`远程技能清单未完整登记 ${stack} 技术栈`);
    roots.add(`app-stack-${stack}`);
    for (const name of profile.capabilitySkills) if (!CORE_SKILLS.includes(name)) roots.add(validateSkillName(name));
    for (const name of profile.resourceDirectories) roots.add(validateSkillName(name));
  }
  roots.add('app-skill-runtime');
  return [...roots].sort();
}

/** 技术目录只接受安装器能够安全落入 .agents/skills 的单段名称。 */
function validateSkillName(value) {
  if (typeof value !== 'string' || !SKILL_NAME_PATTERN.test(value) || WINDOWS_DEVICE_NAME.test(value)) throw new Error(`远程技能目录名无效：${value}`);
  return value;
}

/** 检查 Git 路径各段，拒绝跨平台绝对路径、设备名及大小写碰撞。 */
function validateGitPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || /[\\:\u0000-\u001f\u007f<>?*|"]/u.test(path)) throw new Error(`远程文件路径无效：${path}`);
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part) || WINDOWS_DEVICE_NAME.test(part))) throw new Error(`远程文件路径无效：${path}`);
  return path;
}

/** 筛选栈和公共根目录内的普通文件，拒绝链接/子模块及目录冲突。 */
function selectFiles(snapshot, roots) {
  const selected = [];
  const folded = new Map();
  const selectedPaths = new Map();
  const selectedDirectories = new Set(['skills', 'packages', 'packages/installer']);
  const rootSet = new Set(roots);
  const selectedRoots = roots.map((root) => `skills/${root}`);
  for (const root of selectedRoots) selectedDirectories.add(root);

  // Git 树中目录项也要参与路径冲突检查，否则 Windows 上大小写不同的目录会落到同一目标。
  for (const root of ['packages', 'packages/installer', ...selectedRoots]) {
    const directory = snapshot.entries.get(root);
    if (!directory || directory.type !== 'tree' || directory.mode !== '040000') throw new Error(`远程安装目录缺失或不是普通目录：${root}`);
  }
  for (const entry of snapshot.entries.values()) {
    const parts = typeof entry.path === 'string' ? entry.path.split('/') : [];
    const include = (entry.path === 'packages' || entry.path === 'packages/installer')
      || entry.path === 'packages/installer/catalog.json'
      || (parts[0] === 'skills' && rootSet.has(parts[1]) && (parts.length === 2 || parts.length > 2));
    if (!include) continue;
    validateGitPath(entry.path);
    if (entry.type === 'tree') {
      if (entry.mode !== '040000') throw new Error(`远程目录模式无效：${entry.path}`);
      if (selectedPaths.get(entry.path) === 'file') throw new Error(`远程路径同时作为文件和目录：${entry.path}`);
      selectedPaths.set(entry.path, 'directory');
      continue;
    }
    const verified = snapshot.findBlob(entry.path);
    if (verified !== entry || !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > 100 * 1024 * 1024 || !/^[a-f0-9]{40}$/i.test(entry.sha ?? '')) throw new Error(`远程文件元数据无效：${entry.path}`);
    if (selectedPaths.get(entry.path) === 'directory') throw new Error(`远程路径同时作为文件和目录：${entry.path}`);
    selectedPaths.set(entry.path, 'file');
    if (entry.path === 'packages/installer/catalog.json') continue;
    selected.push(entry);
  }
  for (const root of selectedRoots) selectedDirectories.add(root);
  for (const [path, kind] of selectedPaths) if (kind === 'directory') selectedDirectories.add(path);
  for (const entry of selected) for (const parent of parentPaths(entry.path)) selectedDirectories.add(parent);
  for (const [path, kind] of selectedPaths) {
    const pathKey = path.toLowerCase();
    if (folded.has(pathKey) && folded.get(pathKey) !== path) throw new Error(`远程清单包含大小写冲突路径：${path}`);
    if (kind === 'file' && selectedDirectories.has(path)) throw new Error(`远程路径同时作为文件和目录：${path}`);
    folded.set(pathKey, path);
  }
  for (const path of selectedDirectories) {
    const pathKey = path.toLowerCase();
    if (folded.has(pathKey) && folded.get(pathKey) !== path) throw new Error(`远程清单包含大小写冲突路径：${path}`);
    folded.set(pathKey, path);
  }
  if (!selectedPaths.has('packages/installer/catalog.json') || selectedPaths.get('packages/installer/catalog.json') !== 'file') throw new Error('远程技能目录缺少 packages/installer/catalog.json');
  const totalBytes = selected.reduce((sum, entry) => sum + entry.size, snapshot.entries.get('packages/installer/catalog.json').size);
  if (!Number.isSafeInteger(totalBytes) || selected.length + 1 > snapshot.maxSelectedFiles || totalBytes > snapshot.maxSelectedBytes) {
    throw new Error('所选技术栈闭包超过远程文件数或总大小限制');
  }
  return selected.sort((left, right) => left.path.localeCompare(right.path));
}

/** 枚举相对路径父目录供文件/目录冲突检查。 */
function parentPaths(path) {
  const parts = path.split('/');
  const parents = [];
  for (let index = 1; index < parts.length; index += 1) parents.push(parts.slice(0, index).join('/'));
  return parents;
}

/** 并发受限地读取 blobs，发生错误时等并行项完成后再中止写项目事务。 */
async function mapLimited(items, limit, action) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await action(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/** 检查目标树缓存命中所需的每级目录，拒绝链接和越界路径。 */
function projectCandidate(projectRoot, entryPath) {
  const targetRoot = join(projectRoot, '.agents', 'skills');
  const target = resolve(targetRoot, ...entryPath.replace(/^skills\//, '').split('/'));
  const prefix = targetRoot.endsWith(sep) ? targetRoot : targetRoot + sep;
  if (!target.startsWith(prefix)) throw new Error(`本地重用路径越界：${entryPath}`);
  let current = target;
  while (current !== projectRoot && current !== dirname(current)) {
    try { if (lstatSync(current).isSymbolicLink()) throw new Error(`本地安装文件路径不能含链接：${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    current = dirname(current);
  }
  return target;
}

/** 把已校验的文件写进隔离源树，不沿用仓库中的任何链接。 */
function writeSourceFile(sourceRoot, entryPath, content, gitMode = '100644') {
  validateGitPath(entryPath);
  const target = resolve(sourceRoot, ...entryPath.split('/'));
  const prefix = sourceRoot.endsWith(sep) ? sourceRoot : sourceRoot + sep;
  if (!target.startsWith(prefix)) throw new Error(`临时源文件路径越界：${entryPath}`);
  const missing = [];
  let current = dirname(target);
  while (current.startsWith(sourceRoot)) {
    try {
      const metadata = lstatSync(current);
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`临时源路径不安全：${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      missing.push(current);
    }
    if (current === sourceRoot) break;
    current = dirname(current);
  }
  for (const directory of missing.reverse()) mkdirSync(directory);
  // 原生脚本依赖可执行位；固定临时源中的读写权限同时跟随 Git 树模式。
  writeFileSync(target, content, { flag: 'wx', mode: gitMode === '100755' ? 0o755 : 0o644 });
}

/** 临时树由唯一事务创建，清理时确认边界并拒绝重解析点。 */
function removeSourceTree(sourceRoot) {
  const prefix = join(tmpdir(), 'app-creator-remote-source-');
  if (!resolve(sourceRoot).startsWith(prefix) || dirname(resolve(sourceRoot)) !== tmpdir()) return;
  let metadata;
  try { metadata = lstatSync(sourceRoot); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error('远程临时源目录身份发生变化');
  for (const child of readdirSync(sourceRoot, { withFileTypes: true })) removeOwnedSourceItem(join(sourceRoot, child.name));
  rmdirSync(sourceRoot);
}

/** 仅删除当前隔离源目录内部的普通文件、链接本身和目录。 */
function removeOwnedSourceItem(path) {
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || metadata.isFile()) unlinkSync(path);
  else if (metadata.isDirectory()) {
    for (const child of readdirSync(path, { withFileTypes: true })) removeOwnedSourceItem(join(path, child.name));
    rmdirSync(path);
  } else throw new Error('远程临时源目录包含特殊文件');
}

/** 检查目标项目路径不存在符号链接或 Junction 段。 */
function assertNoLinks(path) {
  let current = resolve(path);
  while (true) {
    try { if (lstatSync(current).isSymbolicLink()) throw new Error(`安装路径不能含符号链接：${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** 构造只下载所选闭包的来源树，并将事务交给与本地安装共用的安装器。 */
export async function installRemoteSkills({ projectRoot = process.cwd(), stacks, repo, ref, dryRun = false, cacheRoot, fetchImpl = globalThis.fetch, env = process.env, sourceSnapshot = null, bootstrapFiles = [] }) {
  if (!Array.isArray(stacks) || !stacks.length || stacks.some((stack) => !STACKS.includes(stack))) throw new Error('必须明确选择有效技术栈；不会默认安装全部栈');
  const selectedStacks = [...new Set(stacks)];
  const repository = normalizeRepository(repo);
  const project = resolve(projectRoot);
  if (!existsSync(project) || !lstatSync(project).isDirectory()) throw new Error('目标项目必须是已有目录');
  assertNoLinks(project);
  const snapshot = sourceSnapshot ?? await createGitHubSource({ repo: repository, ref, cacheRoot, fetchImpl, env });
  if (snapshot.repo !== repository || (ref && snapshot.ref !== ref && snapshot.revision !== ref)) throw new Error('引导提交与远程安装目标不一致');
  assertNoLinks(join(project, '.agents'));
  assertNoLinks(join(project, '.agents', 'skills'));
  const catalogBlob = snapshot.findBlob('packages/installer/catalog.json');
  if (catalogBlob.size > 5 * 1024 * 1024) throw new Error('远程安装清单超过大小上限');
  const downloadsBeforePayload = snapshot.metrics.downloaded;
  const catalogBytes = await snapshot.getBlob(catalogBlob, { allowNetwork: true, metadataFile: true, persistMetadata: !dryRun });
  let catalog;
  try { catalog = JSON.parse(catalogBytes.toString('utf8')); }
  catch { throw new Error('远程 packages/installer/catalog.json 不是有效 JSON'); }
  if (catalog.schemaVersion !== '1.0' || !catalog.stacks || typeof catalog.stacks !== 'object' || Array.isArray(catalog.stacks)) throw new Error('远程安装清单格式无效');
  const roots = selectedRootsFor(catalog, selectedStacks);
  for (const name of roots) if (!SKILL_NAME_PATTERN.test(name)) throw new Error(`远程安装清单包含不安全目录：${name}`);
  const selectedFiles = selectFiles(snapshot, roots);
  const skillsBase = join(project, '.agents', 'skills');

  if (dryRun) {
    const entries = buildPlannedEntries(roots, catalog, selectedStacks, project);
    return {
      project, destination: skillsBase, entries, changed: false, backup: null,
      remote: {
        repository, revision: snapshot.revision, ref: snapshot.ref, stacks: selectedStacks,
        selectedDirectories: roots, selectedFileCount: selectedFiles.length + 1,
        selectedBytes: selectedFiles.reduce((sum, entry) => sum + entry.size, catalogBlob.size),
        dryRun: true, payloadDownloaded: 0, metrics: { ...snapshot.metrics, bootstrapFiles: bootstrapFiles.length },
      },
    };
  }

  const sourceRoot = mkdtempSync(join(tmpdir(), 'app-creator-remote-source-'));
  try {
    const payloadFiles = selectedFiles.filter((entry) => entry.path !== 'packages/installer/catalog.json');
    const contents = await mapLimited(payloadFiles, DOWNLOAD_CONCURRENCY, async (entry) => {
      const localCandidate = projectCandidate(project, entry.path);
      return { entry, content: await snapshot.getBlob(entry, { allowNetwork: true, localCandidate }) };
    });
    for (const { entry, content } of contents) writeSourceFile(sourceRoot, entry.path, content, entry.mode);
    writeSourceFile(sourceRoot, 'packages/installer/catalog.json', catalogBytes, catalogBlob.mode);
    const result = installSkills({ projectRoot: project, stacks: selectedStacks, replace: true, retainBackup: false, dryRun: false, sourceRoot });
    return {
      ...result,
      remote: {
        repository, revision: snapshot.revision, ref: snapshot.ref, stacks: selectedStacks,
        selectedDirectories: roots, selectedFileCount: selectedFiles.length + 1,
        selectedBytes: selectedFiles.reduce((sum, entry) => sum + entry.size, catalogBlob.size),
        dryRun: false, payloadDownloaded: snapshot.metrics.downloaded - downloadsBeforePayload,
        metrics: { ...snapshot.metrics, bootstrapFiles: bootstrapFiles.length },
      },
    };
  } finally {
    removeSourceTree(sourceRoot);
  }
}

/** 为 dry-run 返回安装对象名称，不读取或下载任何栈载荷。 */
function buildPlannedEntries(roots, catalog, stacks, project) {
  const entries = [];
  for (const stack of stacks) {
    const profile = catalog.stacks[stack];
    for (const name of profile.capabilitySkills.filter((entry) => !CORE_SKILLS.includes(entry))) entries.push({ name, kind: 'skill', stack });
    entries.push({ name: `app-stack-${stack}`, kind: 'skill', stack });
    for (const name of profile.resourceDirectories) entries.push({ name, kind: 'resource', stack });
  }
  for (const name of CORE_SKILLS) entries.push({ name, kind: 'skill', stack: 'shared' });
  entries.push({ name: 'app-skill-runtime', kind: 'resource', stack: 'shared' });
  const seen = new Set();
  return entries.filter((entry) => {
    if (seen.has(entry.name)) return false;
    seen.add(entry.name);
    return true;
  }).map((entry) => ({ ...entry, target: join(project, '.agents', 'skills', entry.name) }));
}

/** 解析本地 CLI，普通调用和单文件启动器使用同一远程事务入口。 */
export async function runRemoteInstaller(argv = process.argv.slice(2), bootstrapOptions = {}) {
  const options = parseArgs(argv);
  const result = await installRemoteSkills({ ...options, ...bootstrapOptions });
  console.log(JSON.stringify({
    status: 'PASS', changed: result.changed, repository: result.remote.repository,
    revision: result.remote.revision, ref: result.remote.ref, stacks: result.remote.stacks,
    selectedFileCount: result.remote.selectedFileCount, selectedBytes: result.remote.selectedBytes,
    payloadDownloaded: result.remote.payloadDownloaded ?? 0,
    cacheHits: result.remote.metrics.cacheHits, reusedLocalFiles: result.remote.metrics.reusedLocal,
    metadataDownloaded: result.remote.metrics.metadataDownloaded,
    bootstrapFiles: result.remote.metrics.bootstrapFiles,
    skills: result.entries.filter((entry) => entry.kind === 'skill').map((entry) => entry.name),
    resources: result.entries.filter((entry) => entry.kind === 'resource').map((entry) => entry.name),
    destination: result.destination, backup: result.backup,
    dryRun: result.remote.dryRun,
  }, null, 2));
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runRemoteInstaller().catch((error) => {
    console.error(JSON.stringify({ status: 'FAIL', error: error.message }));
    process.exitCode = 1;
  });
}
