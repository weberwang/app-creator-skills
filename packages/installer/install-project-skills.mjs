#!/usr/bin/env node
/** 按技术栈安装公共技能和独立规范，并根据调用方选择是否保留更新备份。 */
import { accessSync, closeSync, constants, cpSync, existsSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../skills/app-skill-runtime/direct-entry.mjs';
import { stackPayloads } from './skill-catalog.mjs';
import { CORE_SKILLS } from './capability-map.mjs';
import { sameInstallationContents } from './installation-content.mjs';

/** 当前分发包根目录，安装不依赖源仓库所在磁盘。 */
export const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** 已支持的技术栈与公共技能是唯一安装清单。 */
export const STACKS = Object.freeze(['unity', 'cocos', 'phaser', 'threejs', 'flutter', 'esp32', 'nodejs', 'expo']);
/** 公共技能始终整体安装，避免断开跨技能相对引用。 */
export const COMMON_SKILLS = CORE_SKILLS;

/** 拒绝目录链上的符号链接，防止安装或替换越出用户指定项目。 */
function assertNoLinks(path) {
  let current = resolve(path);
  while (true) {
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`安装路径不能含符号链接：${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** 递归检查源技能，不分发指向包外或其他技能的软链接。 */
function assertSourceTree(path) {
  if (lstatSync(path).isSymbolicLink()) throw new Error(`源技能不能包含符号链接：${path}`);
  if (lstatSync(path).isDirectory()) for (const item of readdirSync(path)) assertSourceTree(join(path, item));
}

/** 检查项目根忽略文件及有效规则；保留原有字节和换行，预演不写入。 */
function inspectProjectIgnore(project) {
  const path = join(project, '.gitignore');
  let metadata;
  try { metadata = lstatSync(path); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (metadata && (metadata.isSymbolicLink() || !metadata.isFile() || metadata.nlink !== 1)) {
    throw new Error('项目 .gitignore 必须是无硬链接的普通文件');
  }
  const original = metadata ? readFileSync(path) : Buffer.alloc(0);
  if (metadata) {
    const after = lstatSync(path);
    if (after.isSymbolicLink() || after.dev !== metadata.dev || after.ino !== metadata.ino || after.nlink !== 1 || after.size !== metadata.size || after.mtimeMs !== metadata.mtimeMs) {
      throw new Error('读取项目 .gitignore 时文件发生变化');
    }
  }
  const content = original.toString('utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/);
  const position = lines.findLastIndex((line) => ['/.agents/', '.agents/'].includes(line.trimEnd()));
  // Git 可按大小写不敏感匹配；后续否定规则可能重新放行目录时，在末尾补一条。
  const laterNegation = position >= 0 && lines.slice(position + 1).some((line) => line.startsWith('!') && (line.toLowerCase().includes('.agents') || /[*?[\]\\]/.test(line)));
  const needed = position < 0 || laterNegation;
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const needsSeparator = original.length > 0 && !content.endsWith('\n');
  const suffix = needed ? Buffer.from(`${needsSeparator ? newline : ''}/.agents/${newline}`, 'utf8') : Buffer.alloc(0);
  if (needed) accessSync(metadata ? path : project, constants.W_OK);
  return { path, metadata, original, suffix };
}

/** 从已校验的文件描述符按位置读取完整内容，不依赖可变文件偏移量。 */
function readDescriptor(handle) {
  const size = fstatSync(handle).size;
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(handle, bytes, offset, size - offset, offset);
    if (!count) throw new Error('读取项目 .gitignore 时文件被截断');
    offset += count;
  }
  if (fstatSync(handle).size !== size) throw new Error('读取项目 .gitignore 时文件发生变化');
  return bytes;
}

/** 在技能切换成功后补充忽略规则，异常时保留忽略文件以免覆盖并发编辑。 */
function applyProjectIgnore(project) {
  const plan = inspectProjectIgnore(project);
  if (!plan.suffix.length) return false;
  let handle;
  let writing = false;
  try {
    handle = openSync(plan.path, plan.metadata ? 'a+' : 'ax+', 0o666);
    const actual = fstatSync(handle);
    const pathMetadata = lstatSync(plan.path);
    if (pathMetadata.isSymbolicLink() || !actual.isFile() || actual.nlink !== 1 || pathMetadata.dev !== actual.dev || pathMetadata.ino !== actual.ino || (plan.metadata && (plan.metadata.dev !== actual.dev || plan.metadata.ino !== actual.ino)) || !readDescriptor(handle).equals(plan.original)) {
      throw new Error('项目 .gitignore 在安装期间发生变化，未覆盖用户内容');
    }
    const written = Buffer.concat([plan.original, plan.suffix]);
    writing = true;
    writeFileSync(handle, plan.suffix);
    if (!readDescriptor(handle).equals(written)) throw new Error('项目 .gitignore 在写入时发生变化');
    return true;
  } catch (error) {
    if (handle !== undefined) { closeSync(handle); handle = undefined; }
    // 比较后再截断或删除仍有竞争窗口，失败时必须保留当前内容供人工核对。
    if (writing) throw new Error(`${error.message}；已保留项目 .gitignore 当前内容，请检查`);
    throw error;
  } finally { if (handle !== undefined) closeSync(handle); }
}

/** 构造完全只读的安装计划，任何冲突在写入前一次性报告。 */
export function planInstallation({ projectRoot, stacks, replace = false, sourceRoot = SOURCE_ROOT }) {
  if (!Array.isArray(stacks) || stacks.length === 0 || stacks.some((stack) => !STACKS.includes(stack))) throw new Error(`必须选择有效技术栈：${STACKS.join('/')}/all`);
  const project = resolve(projectRoot);
  assertNoLinks(project);
  if (!existsSync(project) || !lstatSync(project).isDirectory()) throw new Error('目标项目必须是已有目录');
  inspectProjectIgnore(project);
  const destination = join(project, '.agents', 'skills');
  assertNoLinks(destination);
  const selected = [
    ...COMMON_SKILLS.map((name) => ({ name, kind: 'skill', stack: 'shared' })),
    ...new Set(stacks.map((stack) => `app-stack-${stack}`)),
  ].map((entry) => typeof entry === 'string' ? { name: entry, kind: 'skill', stack: entry.slice('app-stack-'.length) } : entry);
  selected.push(...stackPayloads(sourceRoot, stacks));
  if (new Set(selected.map((entry) => entry.name)).size !== selected.length) throw new Error('安装清单重复声明安装目标，拒绝交错覆盖');
  const entries = selected.map(({ name, kind, stack }) => {
    const source = resolve(sourceRoot, 'skills', name);
    const target = join(destination, name);
    const rel = relative(project, target);
    if (isAbsolute(rel) || rel.startsWith('..')) throw new Error('安装目标越出项目');
    assertNoLinks(target);
    if (!existsSync(source) || !lstatSync(source).isDirectory()) throw new Error(`源目录不存在：${name}`);
    if (kind === 'skill' && !existsSync(join(source, 'SKILL.md'))) throw new Error(`源技能不存在：${name}`);
    if (kind === 'resource' && existsSync(join(source, 'SKILL.md'))) throw new Error(`资源目录不能隐含另一个技能入口：${name}`);
    assertSourceTree(source);
    if (realpathSync(source) === resolve(target)) throw new Error('不能将技能安装到自身目录');
    const existed = existsSync(target);
    const isRuntime = name === 'app-skill-runtime';
    const matches = existed && sameInstallationContents(source, target, { ignoreRuntimeDependencies: isRuntime });
    const action = matches ? 'skip' : existed ? (replace ? 'replace' : 'conflict') : 'install';
    if (action === 'conflict') throw new Error(`技能已存在：${name}；检查后使用 --replace 更新并保留备份`);
    return { name, kind, stack, source, target, existed, action };
  });
  return { project, destination, entries, replace };
}

/** 安装前完整暂存，替换失败时恢复旧目录；按调用方选择是否保留成功更新的旧目录。 */
export function installSkills(options) {
  const plan = planInstallation(options);
  if (options.dryRun) return { ...plan, changed: false, backup: null };
  const agentsRoot = join(plan.project, '.agents');
  assertNoLinks(agentsRoot);
  mkdirSync(agentsRoot, { recursive: true });
  const lock = join(agentsRoot, 'app-creator-install.lock');
  let handle;
  try { handle = openSync(lock, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`另一个安装事务持有锁：${lock}；确认相关进程已结束后才可人工清理遗留锁`);
    throw error;
  }
  try {
    writeFileSync(handle, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    // 获锁后重新预检，不能消费等待锁之前得到的过时 existed 快照。
    return applyInstallation(planInstallation(options), { retainBackup: options.retainBackup !== false });
  } finally {
    closeSync(handle);
    unlinkSync(lock);
  }
}

/** 仅清理本次在项目 .agents 下独占创建的临时事务，避免递归删除其他目录。 */
function removeTemporaryTransaction(transaction, agentsRoot) {
  const target = resolve(transaction);
  const root = resolve(agentsRoot);
  if (dirname(target) !== root || !basename(target).startsWith('skills-install-')) throw new Error(`临时事务路径越界：${target}`);
  assertNoLinks(target);
  if (!lstatSync(target).isDirectory()) throw new Error(`临时事务目录不是普通目录：${target}`);
  rmSync(target, { recursive: true });
}

/** 在独占锁内应用计划；仅需临时回滚时，成功后删除本次事务。 */
function applyInstallation(plan, { retainBackup }) {
  const changes = plan.entries.filter((entry) => entry.action !== 'skip');
  if (!changes.length) return { ...plan, changed: applyProjectIgnore(plan.project), backup: null };
  const agentsRoot = join(plan.project, '.agents');
  const transactionId = `${Date.now()}-${randomUUID()}`;
  const transaction = retainBackup
    ? join(agentsRoot, 'skills-backups', transactionId)
    : mkdtempSync(join(agentsRoot, 'skills-install-'));
  assertNoLinks(transaction);
  const staged = join(transaction, 'staged');
  const original = join(transaction, 'original');
  try {
    mkdirSync(staged, { recursive: true });
    // 先复制全部输入，避免复制中途失败后只安装半套技能。
    for (const entry of changes) {
      const stagedEntry = join(staged, entry.name);
      cpSync(entry.source, stagedEntry, { recursive: true, errorOnExist: true, force: false });
      const runtimeDependencies = join(entry.target, 'node_modules');
      let runtimeDependenciesMetadata;
      if (entry.name === 'app-skill-runtime' && entry.action === 'replace') {
        try { runtimeDependenciesMetadata = lstatSync(runtimeDependencies); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      if (runtimeDependenciesMetadata) {
        if (runtimeDependenciesMetadata.isSymbolicLink() || !runtimeDependenciesMetadata.isDirectory()) {
          throw new Error('已安装的运行时 node_modules 不是普通目录，拒绝替换以避免丢失依赖');
        }
        // node_modules 是已安装运行依赖，更新共享源码时需并入暂存目录并随同一事务切换。
        cpSync(runtimeDependencies, join(stagedEntry, 'node_modules'), { recursive: true, errorOnExist: true, force: false, dereference: false });
      }
    }
    mkdirSync(plan.destination, { recursive: true });
    mkdirSync(original, { recursive: true });
  } catch (error) {
    if (!retainBackup) {
      try { removeTemporaryTransaction(transaction, agentsRoot); }
      catch (cleanupError) { throw new Error(`安装暂存失败：${error.message}；临时事务未清理 ${transaction}：${cleanupError.message}`); }
    }
    throw error;
  }
  const applied = [];
  try {
    for (const entry of changes) {
      if (entry.action === 'replace') renameSync(entry.target, join(original, entry.name));
      applied.push(entry);
      renameSync(join(staged, entry.name), entry.target);
    }
    // 最后合并忽略规则，保证技能切换失败不会留下额外的项目文件改动。
    applyProjectIgnore(plan.project);
  } catch (error) {
    const failed = join(transaction, 'failed');
    try { mkdirSync(failed, { recursive: true }); }
    catch (rollbackError) { throw new Error(`安装失败，无法准备回滚；事务资料保留于 ${transaction}：${error.message}；恢复错误：${rollbackError.message}`); }
    const rollbackErrors = [];
    for (const entry of applied.reverse()) {
      try {
        if (existsSync(entry.target)) renameSync(entry.target, join(failed, entry.name));
        const previous = join(original, entry.name);
        if (existsSync(previous)) renameSync(previous, entry.target);
      } catch (rollbackError) {
        rollbackErrors.push(`${entry.name}: ${rollbackError.message}`);
      }
    }
    // 回滚未完成时保留事务，供用户恢复尚未返回目标位置的原目录。
    if (rollbackErrors.length) throw new Error(`安装失败，旧技能未能全部恢复；事务资料保留于 ${transaction}：${error.message}；恢复错误：${rollbackErrors.join('；')}`);
    if (!retainBackup) {
      try { removeTemporaryTransaction(transaction, agentsRoot); }
      catch (cleanupError) { throw new Error(`安装失败，已恢复旧技能：${error.message}；临时事务未清理 ${transaction}：${cleanupError.message}`); }
      throw new Error(`安装失败，已恢复旧技能：${error.message}`);
    }
    throw new Error(`安装失败，已恢复旧技能；事务资料保留于 ${transaction}：${error.message}`);
  }
  if (!retainBackup) {
    try { removeTemporaryTransaction(transaction, agentsRoot); }
    catch (error) { throw new Error(`安装已完成，但临时事务未清理 ${transaction}：${error.message}`); }
  }
  return { ...plan, changed: true, backup: retainBackup && changes.some((entry) => entry.action === 'replace') ? original : null };
}

/** 严格解析安装选项；没有技术选择时不擅自安装全部技术栈。 */
function parseArgs(argv) {
  const result = { projectRoot: process.cwd(), stacks: [], replace: false, dryRun: false };
  let positional = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') return { help: true };
    if (token === '--replace') result.replace = true;
    else if (token === '--dry-run') result.dryRun = true;
    else if (token === '--stack') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error('--stack 需要技术栈名称');
      const value = argv[++index];
      result.stacks.push(...(value === 'all' ? STACKS : value.split(',')));
    } else if (token.startsWith('--')) throw new Error(`未知选项：${token}`);
    else if (positional) throw new Error('只接受一个目标项目目录');
    else { result.projectRoot = resolve(token); positional = true; }
  }
  return result;
}

/** CLI 按显式远程选项切换来源，仍复用同一套项目安装事务。 */
export async function runInstaller(argv = process.argv.slice(2)) {
  if (argv.includes('--repo')) {
    const { runRemoteInstaller } = await import('./remote-install/install.mjs');
    return runRemoteInstaller(argv);
  }
  const options = parseArgs(argv);
  if (options.help) { console.log(`node packages/installer/install-project-skills.mjs <项目目录> --stack ${STACKS.join('|')}|all [--repo owner/repo] [--ref 分支或提交] [--dry-run] [--replace]\n仅安装所选栈及公共依赖；已有内容相同则跳过，内容不同需 --replace。`); return; }
  const result = installSkills(options);
  console.log(JSON.stringify({
    status: 'PASS', changed: result.changed,
    skills: result.entries.filter((entry) => entry.kind === 'skill').map((entry) => basename(entry.target)),
    resources: result.entries.filter((entry) => entry.kind === 'resource').map((entry) => basename(entry.target)),
    installed: result.entries.filter((entry) => entry.action === 'install').map((entry) => entry.name),
    updated: result.entries.filter((entry) => entry.action === 'replace').map((entry) => entry.name),
    skipped: result.entries.filter((entry) => entry.action === 'skip').map((entry) => entry.name),
    destination: result.destination, backup: result.backup,
    toolDependencies: { installed: false, command: `npm ci --prefix "${join(result.destination, 'app-skill-runtime')}"`, note: '仅当需要运行专业Node工具时安装一次；安装器不自动联网。' },
  }, null, 2));
}

if (isDirectEntry(import.meta.url)) {
  runInstaller().catch((error) => { console.error(JSON.stringify({ status: 'FAIL', error: error.message })); process.exitCode = 1; });
}
