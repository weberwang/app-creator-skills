/** 为独立 SDK 安装器复用 Unity Assets 中相同源码，防止重复定义同命名空间类型。 */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/** 仅检查普通资源树，不能越过链接搜索并修改其他工程。 */
function matches(directory, name) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Unity Assets 链接使共享源码位置无法安全核实');
    const file = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...matches(file, name));
    else if (entry.isFile() && entry.name === name) result.push(file);
  }
  return result;
}

/** 内部契约不能跨程序集使用；无法证明 asmref 等价时保守要求同一边界。 */
function assemblyScope(project, file) {
  let current = dirname(resolve(project, file));
  while (current !== project) {
    if (existsSync(current)) {
      const definitions = readdirSync(current).filter((name) => name.endsWith('.asmdef') || name.endsWith('.asmref')).sort();
      if (definitions.length) return definitions.map((name) => join(current, name)).join('|');
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return '';
}

/** 相同文件复用原位置，已有差异或多份定义必须先审查，不能再创建第三份。 */
export function unitySourceOutput({ projectRoot, source, name, output }) {
  const project = resolve(projectRoot);
  const assets = join(project, 'Assets');
  if (!existsSync(assets)) return output;
  if (lstatSync(assets).isSymbolicLink() || !lstatSync(assets).isDirectory()) throw new Error('Unity Assets 必须是普通目录');
  const files = matches(assets, name);
  if (files.length > 1) throw new Error(`Unity 源码已重复，先消除类型冲突：${name}`);
  if (!files.length) return output;
  if (!readFileSync(files[0]).equals(readFileSync(source))) throw new Error(`Unity 源码已存在且不同，先审查共享实现：${name}`);
  if (assemblyScope(project, files[0]) !== assemblyScope(project, output)) throw new Error(`Unity 共享源码与实现必须处于同一程序集，请调整输出目录：${name}`);
  return relative(project, files[0]);
}
