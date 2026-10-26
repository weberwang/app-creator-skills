import { realpathSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 通过真实文件身份判断 ESM 文件是否经直接 CLI 入口执行。 */
export function isDirectEntry(importMetaUrl, entryPath = process.argv[1]) {
  if (typeof importMetaUrl !== 'string' || typeof entryPath !== 'string' || entryPath === '' || entryPath === '-') return false;
  try {
    // realpath 同时消除 npm bin 符号链接与 Windows 目录 Junction 的路径别名。
    const modulePath = realpathSync(fileURLToPath(importMetaUrl));
    const invokedPath = realpathSync(entryPath);
    return relative(modulePath, invokedPath) === '';
  } catch {
    // 导入阶段入口参数可能为空或已失效；这种情况应保持无副作用。
    return false;
  }
}
