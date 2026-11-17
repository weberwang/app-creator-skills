/** 为 TapTap 源码安装与官方包下载共享工程路径检查，保护现有内容。 */
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/** 检查已有祖先，包括断开的链接，拒绝把写入重定向到其他工程。 */
export function assertOrdinaryPath(path) {
  let current = resolve(path);
  while (true) {
    try { if (lstatSync(current).isSymbolicLink()) throw new Error('TapTap 工程路径不能包含符号链接'); }
    catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

/** 所有产物必须落在已存在的真实工程内，不允许改写元数据或技能目录。 */
export function projectOutput(projectRoot, output) {
  const project = resolve(projectRoot);
  assertOrdinaryPath(project);
  if (!existsSync(project) || !lstatSync(project).isDirectory()) throw new Error('目标工程必须是已有普通目录');
  const target = resolve(project, output);
  const local = relative(project, target);
  if (!local || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) throw new Error('TapTap 产物必须位于工程内独立子目录');
  if (['.git', '.agents', 'node_modules', '.workflow-control'].includes(local.split(sep)[0].toLowerCase())) throw new Error('TapTap 产物不能写入元数据或依赖管理目录');
  assertOrdinaryPath(target);
  let parent = dirname(target);
  while (parent !== project) {
    if (existsSync(parent) && !lstatSync(parent).isDirectory()) throw new Error('TapTap 输出父目录被普通文件占用');
    parent = dirname(parent);
  }
  return target;
}

/** 一次性预检每个源文件与目标冲突，禁止覆盖项目已有改动。 */
export function planCopies(projectRoot, entries) {
  const seen = new Set();
  return entries.map(({ source, output }) => {
    const target = projectOutput(projectRoot, output);
    if (seen.has(target.toLowerCase())) throw new Error('TapTap 安装计划存在重复目标');
    seen.add(target.toLowerCase());
    assertOrdinaryPath(source);
    if (!lstatSync(source).isFile()) throw new Error('TapTap 源码必须是普通文件');
    const contents = readFileSync(source);
    if (existsSync(target)) {
      if (!lstatSync(target).isFile() || !readFileSync(target).equals(contents)) throw new Error(`TapTap 文件已存在且不同：${output}`);
      return { source, target, contents, action: 'skip' };
    }
    return { source, target, contents, action: 'install' };
  });
}

/** 仅复制预检通过的新文件；中途失败仅回收本次创建的文件。 */
export function applyCopies(files) {
  const created = [];
  try {
    for (const file of files) {
      if (file.action === 'skip') continue;
      assertOrdinaryPath(file.target);
      mkdirSync(dirname(file.target), { recursive: true });
      const descriptor = openSync(file.target, 'wx');
      // 打开成功就登记所有权，即使首次写入失败也必须回收当前半文件。
      created.push(file.target);
      try {
        let offset = 0;
        while (offset < file.contents.length) {
          const written = writeSync(descriptor, file.contents, offset, file.contents.length - offset);
          if (!written) throw new Error('TapTap 源码写入中断');
          offset += written;
        }
      } finally { closeSync(descriptor); }
    }
  } catch (error) {
    for (const path of created.reverse()) unlinkSync(path);
    throw error;
  }
  return created.length > 0;
}
