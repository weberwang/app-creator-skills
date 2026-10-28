/** 按完整相对路径和文件字节比较技能树，避免把同名的手改目录误判为已安装。 */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** 生成目录树清单；只允许跳过共享 Node 运行时中的 npm 依赖目录。 */
function listContents(root, { ignoreRuntimeDependencies = false } = {}) {
  const rows = [];
  /** 逐项读取目录项元数据，不跟随链接读取包外内容。 */
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const name = relative(root, absolute).split(sep).join('/');
      const metadata = lstatSync(absolute);
      if (ignoreRuntimeDependencies && name === 'node_modules' && metadata.isDirectory() && !metadata.isSymbolicLink()) continue;
      if (metadata.isSymbolicLink()) {
        rows.push({ name, type: 'link' });
      } else if (metadata.isDirectory()) {
        rows.push({ name: `${name}/`, type: 'directory' });
        visit(absolute);
      } else if (metadata.isFile()) {
        const digest = createHash('sha256').update(readFileSync(absolute)).digest('hex');
        // POSIX 的 Git 文件模式只关心可执行与否；Windows 权限位不稳定，不将其用于判定。
        const executable = process.platform === 'win32' ? null : Boolean(metadata.mode & 0o100);
        rows.push({ name, type: 'file', digest, executable });
      } else {
        rows.push({ name, type: 'other' });
      }
    }
  };
  visit(root);
  return rows.sort((left, right) => left.name.localeCompare(right.name));
}

/** 完整比较技能内容；本地链接和其他特殊文件永远不会作为相同源内容跳过。 */
export function sameInstallationContents(source, target, options = {}) {
  const sourceRows = listContents(source, options);
  const targetRows = listContents(target, options);
  if (sourceRows.length !== targetRows.length) return false;
  return sourceRows.every((sourceRow, index) => {
    const targetRow = targetRows[index];
    if (sourceRow.name !== targetRow.name || sourceRow.type !== targetRow.type) return false;
    if (sourceRow.type === 'link' || sourceRow.type === 'other') return false;
    if (sourceRow.type === 'file') {
      return sourceRow.digest === targetRow.digest && sourceRow.executable === targetRow.executable;
    }
    return true;
  });
}
