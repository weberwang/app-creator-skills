import { createHash } from 'node:crypto';
import { closeSync, fstatSync, lstatSync, openSync, readFileSync, readSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath, WorkflowError } from '../../../app-workflow-control/scripts/runtime/io.mjs';

/** 统一使用现有项目路径边界，并排除本地工具和 Git 元数据，不跟随路径中的链接。 */
export function checkedPath(repo, value, label = '检查路径') {
  const target = repoPath(repo, value, label);
  const first = target.relative.split('/')[0];
  const key = process.platform === 'win32' ? first.toLowerCase() : first;
  if (key === '.agents' || key === '.git') throw new WorkflowError(`${label}不能使用项目根工具目录或 Git 元数据`);
  let current = repo;
  for (const segment of target.relative.split('/')) {
    current = join(current, segment);
    let entry;
    try { entry = lstatSync(current); }
    catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
    if (entry.isSymbolicLink()) throw new WorkflowError(`${label}不能经过符号链接或 Junction：${target.relative}`);
  }
  return target;
}

/** 对比文件身份和修改事实，拒绝读取过程中可观察到的替换或改写。 */
function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

/** 分块读取普通文件，保留完整摘要，不把大资源一次性载入内存。 */
export function inspectFile(repo, value, label = '检查文件') {
  const target = checkedPath(repo, value, label);
  const before = lstatSync(target.absolute, { bigint: true });
  if (!before.isFile()) throw new WorkflowError(`${label}必须是普通文件：${target.relative}`);
  if (before.size > BigInt(Number.MAX_SAFE_INTEGER)) throw new WorkflowError(`${label}大小超出可准确记录范围`);
  const descriptor = openSync(target.absolute, 'r');
  const hash = createHash('sha256');
  let bytes = 0;
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!sameFile(before, opened)) throw new WorkflowError(`${label}在检查前发生变化`);
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (!count) break;
      bytes += count;
      hash.update(buffer.subarray(0, count));
    }
    const after = fstatSync(descriptor, { bigint: true });
    const current = lstatSync(target.absolute, { bigint: true });
    if (!current.isFile() || !sameFile(before, after) || !sameFile(before, current) || BigInt(bytes) !== before.size) {
      throw new WorkflowError(`${label}在读取期间发生变化：${target.relative}`);
    }
    checkedPath(repo, value, label);
  } finally { closeSync(descriptor); }
  return { path: target.relative, bytes, sha256: hash.digest('hex') };
}

/** 只遍历显式指定的树，记录确定顺序的文件集合；空目录不产生虚构文件。 */
export function inspectPath(repo, value, label = '检查目标') {
  const target = checkedPath(repo, value, label);
  const stat = lstatSync(target.absolute, { bigint: true });
  if (stat.isFile()) return { path: target.relative, kind: 'file', files: [inspectFile(repo, value, label)] };
  if (!stat.isDirectory()) throw new WorkflowError(`${label}必须是普通文件或目录：${target.relative}`);
  const files = [];
  /** 每个目录前后对照条目与身份，不能把检查期间变化的文件树标为稳定。 */
  function visit(relativePath) {
    const directory = checkedPath(repo, relativePath, label);
    const before = lstatSync(directory.absolute, { bigint: true });
    if (!before.isDirectory()) throw new WorkflowError(`${label}的目录已变化：${relativePath}`);
    const names = readdirSync(directory.absolute).sort();
    for (const name of names) {
      const child = `${relativePath}/${name}`;
      const entry = checkedPath(repo, child, label);
      const current = lstatSync(entry.absolute);
      if (current.isDirectory()) visit(child);
      else if (current.isFile()) files.push(inspectFile(repo, child, label));
      else throw new WorkflowError(`${label}包含不能检查的特殊文件：${child}`);
    }
    const after = lstatSync(directory.absolute, { bigint: true });
    if (!after.isDirectory() || !sameFile(before, after) || JSON.stringify(names) !== JSON.stringify(readdirSync(directory.absolute).sort())) {
      throw new WorkflowError(`${label}的目录在检查期间发生变化：${relativePath}`);
    }
  }
  visit(target.relative);
  return { path: target.relative, kind: 'directory', files };
}

/** 读取已经核对的项目内 JSON，不接受链接或非普通文件。 */
export function readCheckedJson(repo, value, label = 'JSON 文件') {
  const identity = inspectFile(repo, value, label);
  const target = checkedPath(repo, value, label);
  const text = readFileSync(target.absolute, 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== identity.sha256) throw new WorkflowError(`${label}在解析前发生变化`);
  try { return JSON.parse(text); }
  catch (error) { throw new WorkflowError(`${label}不是有效 JSON：${error.message}`); }
}

/** 解析显式值参数；只允许声明的重复项，不把缺少值的开关解释为成功配置。 */
export function parseFlags(tokens, { single = [], repeat = [] } = {}) {
  const result = Object.fromEntries(repeat.map((key) => [key, []]));
  const singles = new Set(single);
  const repeats = new Set(repeat);
  for (let index = 0; index < tokens.length; index += 2) {
    const token = tokens[index];
    if (typeof token !== 'string' || !token.startsWith('--')) throw new WorkflowError('参数必须使用 --名称 值');
    const key = token.slice(2);
    if (!singles.has(key) && !repeats.has(key)) throw new WorkflowError(`不支持参数：${token}`);
    const value = tokens[index + 1];
    if (typeof value !== 'string' || !value.trim() || value.startsWith('--')) throw new WorkflowError(`${token}缺少非空值`);
    if (repeats.has(key)) result[key].push(value);
    else {
      if (Object.hasOwn(result, key)) throw new WorkflowError(`${token}不能重复`);
      result[key] = value;
    }
  }
  return result;
}
