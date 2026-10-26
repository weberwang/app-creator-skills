import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 控制器协议错误，CLI 据此返回稳定失败信息。 */
export class WorkflowError extends Error {
  /** 构建可供调用方分类处理的错误实例。 */
  constructor(message, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
  }
}

/** 统一以 POSIX 表示项目相对路径，并拒绝绝对路径和路径逃逸。 */
export function repoPath(repo, value, label = '路径') {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) {
    throw new WorkflowError(`${label}必须为非空项目相对路径`);
  }
  if (value.includes('\\') || isAbsolute(value) || /^[a-zA-Z]:/.test(value)) {
    throw new WorkflowError(`${label}必须使用 POSIX 项目相对路径：${value}`);
  }
  const segments = value.split('/');
  if (segments.includes('..') || segments.includes('.')) {
    throw new WorkflowError(`${label}不能包含 . 或 ..：${value}`);
  }
  const absolute = resolve(repo, ...segments);
  const relativePath = relative(resolve(repo), absolute);
  if (!relativePath || relativePath === '..' || relativePath.startsWith('..\\') || relativePath.startsWith('../') || isAbsolute(relativePath)) {
    throw new WorkflowError(`${label}不能指向项目根或其外部：${value}`);
  }
  ensureNoSymlinkEscape(repo, absolute, label);
  return { absolute, relative: relativePath.replaceAll('\\', '/') };
}

/** 判定实际绝对路径仍位于指定仓库内。 */
function staysWithin(base, target) {
  const rel = relative(base, target);
  return rel === '' || (!rel.startsWith('..\\') && !rel.startsWith('../') && rel !== '..' && !isAbsolute(rel));
}

/** 检查已存在路径的所有父级，避免通过符号链接越过项目边界。 */
function ensureNoSymlinkEscape(repo, target, label) {
  const base = resolve(repo);
  let cursor = target;
  while (staysWithin(base, cursor)) {
    if (existsSync(cursor)) {
      const real = realpathSync(cursor);
      const rel = relative(realpathSync(base), real);
      if (rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel)) {
        throw new WorkflowError(`${label}经符号链接越出项目：${cursor}`);
      }
      if (cursor !== target && !lstatSync(cursor).isDirectory()) {
        throw new WorkflowError(`${label}父级不是目录：${cursor}`);
      }
    }
    if (cursor === base) break;
    cursor = dirname(cursor);
  }
}

/** 读取并解析 JSON 项目文件，拒绝非普通文件和符号链接文件。 */
export function readJson(repo, value, label = 'JSON 文件') {
  const target = repoPath(repo, value, label);
  if (!existsSync(target.absolute) || !lstatSync(target.absolute).isFile()) {
    throw new WorkflowError(`${label}不存在或不是普通文件：${value}`, 'NOT_FOUND');
  }
  try {
    return JSON.parse(readFileSync(target.absolute, 'utf8'));
  } catch (error) {
    throw new WorkflowError(`${label}不是有效 JSON：${error.message}`);
  }
}

/** 严格校验磁盘上的普通文件并返回项目相对路径。 */
export function requireFile(repo, value, label = '证据文件') {
  const target = repoPath(repo, value, label);
  if (!existsSync(target.absolute) || !lstatSync(target.absolute).isFile()) {
    throw new WorkflowError(`${label}不存在：${value}`, 'NOT_FOUND');
  }
  return target.relative;
}

/** 对输出路径执行同一边界检查，并在不存在时创建必要父目录。 */
export async function atomicWriteJson(repo, value, data) {
  const { mkdirSync, openSync, closeSync, writeFileSync, renameSync, unlinkSync } = await import('node:fs');
  const target = repoPath(repo, value, '写入路径');
  mkdirSync(dirname(target.absolute), { recursive: true });
  ensureNoSymlinkEscape(repo, target.absolute, '写入路径');
  const temporary = `${target.absolute}.${process.pid}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, 'wx', 0o600);
    writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, target.absolute);
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw new WorkflowError(`原子写入失败：${error.message}`, 'WRITE_FAILED');
  }
  return target.relative;
}

/** 从本地包或已安装项目技能解析技术栈 profile。 */
export function stackProfileLocation(repo, stack) {
  const packageSkillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const localCandidate = resolve(packageSkillRoot, `app-stack-${stack}`, 'profile.json');
  const installedCandidate = resolve(repo, '.agents', 'skills', `app-stack-${stack}`, 'profile.json');
  const candidate = existsSync(localCandidate) ? localCandidate : installedCandidate;
  const root = existsSync(localCandidate) ? packageSkillRoot : resolve(repo, '.agents', 'skills');
  const relativePath = relative(resolve(repo), candidate).replaceAll('\\', '/');
  return { absolute: candidate, root, relative: relativePath };
}

/** 解析重复选项并保留位置参数，供主入口检查未知输入。 */
export function parseArgs(tokens) {
  const args = { _: [] };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = String(tokens[index]);
    if (!token.startsWith('--')) { args._.push(token); continue; }
    const equals = token.indexOf('=');
    const name = token.slice(2, equals < 0 ? undefined : equals);
    const key = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    let value = equals < 0 ? undefined : token.slice(equals + 1);
    if (value === undefined && index + 1 < tokens.length && !String(tokens[index + 1]).startsWith('--')) value = String(tokens[++index]);
    if (value === undefined) value = true;
    args[key] = args[key] === undefined ? value : Array.isArray(args[key]) ? [...args[key], value] : [args[key], value];
  }
  return args;
}
