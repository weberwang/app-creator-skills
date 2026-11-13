#!/usr/bin/env node
/** 把随工作流维护的渠道实现接入正式工程；只复制源码，不安装或调用厂商 SDK。 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../app-skill-runtime/direct-entry.mjs';

/** 相对于已安装技能定位源码，不依赖维护仓库或调用时的工作目录。 */
const ASSETS = fileURLToPath(new URL('../assets/channel-sdks/', import.meta.url));
/** 沿各引擎正式平台目录接入，既有工程可显式提供内部输出路径。 */
const OUTPUTS = {
  unity: 'Assets/Scripts/Platform/Channels',
  cocos: 'assets/scripts/platform/channels',
  phaser: 'src/platform/channels',
  threejs: 'src/platform/channels',
};

/** 检查所有已存在的路径段，拒绝通过链接把工程写入重定向到其他目录。 */
function assertNoLinks(path) {
  let current = resolve(path);
  while (true) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('渠道源码路径不能包含符号链接');
    // 断开的链接 existsSync 返回 false，仍需用 lstat 判断，不能当作可新建目录。
    try { if (lstatSync(current).isSymbolicLink()) throw new Error('渠道源码路径不能包含符号链接'); }
    catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** 收集当前引擎的真实源码，保留共享核心与引擎接口之间的相对引用。 */
function sourceFiles(root, engine, current = root) {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const path = join(current, entry.name);
    const name = relative(root, path).split(sep).join('/');
    if (entry.isSymbolicLink()) throw new Error('渠道资源不能包含符号链接');
    if (name.startsWith('engines/') && name.split('/').length >= 2 && name.split('/')[1] !== engine) return [];
    if (entry.isDirectory()) return sourceFiles(root, engine, path);
    if (!entry.isFile()) throw new Error('渠道资源只能包含普通文件');
    return [{ name, source: path }];
  });
}

/** 写入前一次性核对引擎、范围和全部冲突；相同源码可重复接入，已有修改不会被覆盖。 */
export function planChannelSdkInstallation({ projectRoot, engine, output }) {
  if (!Object.hasOwn(OUTPUTS, engine)) throw new Error('引擎必须为 unity/cocos/phaser/threejs');
  const project = resolve(projectRoot);
  assertNoLinks(project);
  if (!existsSync(project) || !lstatSync(project).isDirectory()) throw new Error('目标工程必须是已有普通目录');
  const destination = resolve(project, output ?? OUTPUTS[engine]);
  const local = relative(project, destination);
  if (!local || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) throw new Error('渠道源码必须位于工程内部的独立子目录');
  if (['.git', '.agents'].includes(local.split(sep)[0].toLowerCase())) throw new Error('渠道源码不能写入 Git 元数据或技能安装目录');
  assertNoLinks(destination);
  const sourceRoot = join(ASSETS, engine === 'unity' ? 'unity' : 'typescript');
  const files = sourceFiles(sourceRoot, engine).map(({ name, source }) => {
    const target = join(destination, name);
    assertNoLinks(target);
    const contents = readFileSync(source);
    if (existsSync(target)) {
      if (!lstatSync(target).isFile() || !readFileSync(target).equals(contents)) throw new Error(`渠道源码已存在且不同，先审查差异：${relative(project, target)}`);
      return { source, target, contents, action: 'skip' };
    }
    // 文件占用了父目录时，在任何写入开始之前报告冲突。
    let parent = dirname(target);
    while (parent !== dirname(project)) {
      if (existsSync(parent) && !lstatSync(parent).isDirectory()) throw new Error('渠道源码父路径已被普通文件占用');
      if (parent === project) break;
      parent = dirname(parent);
    }
    return { source, target, contents, action: 'install' };
  });
  if (!files.length) throw new Error('缺少已声明的渠道源码资源');
  return { project, engine, destination, files };
}

/** 只创建预检通过的新文件；失败时仅回收本次创建的文件，保留用户内容。 */
export function installChannelSdks(options) {
  const plan = planChannelSdkInstallation(options);
  if (options.dryRun) return { ...plan, changed: false };
  const created = [];
  try {
    for (const file of plan.files) {
      if (file.action === 'skip') continue;
      assertNoLinks(file.target);
      mkdirSync(dirname(file.target), { recursive: true });
      writeFileSync(file.target, file.contents, { flag: 'wx' });
      created.push(file.target);
    }
  } catch (error) {
    for (const path of created.reverse()) unlinkSync(path);
    throw error;
  }
  return { ...plan, changed: created.length > 0 };
}

/** 解析显式工程与引擎，不从当前目录或操作系统猜选渠道。 */
function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--dry-run') { options.dryRun = true; continue; }
    if (!['--project', '--engine', '--output'].includes(key) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('用法：--project <工程> --engine <unity|cocos|phaser|threejs> [--output <工程内目录>] [--dry-run]');
    const name = key === '--project' ? 'projectRoot' : key.slice(2);
    if (Object.hasOwn(options, name)) throw new Error(`参数重复：${key}`);
    options[name] = args[++index];
  }
  if (!options.projectRoot || !options.engine) throw new Error('必须明确 --project 和 --engine');
  return options;
}

if (isDirectEntry(import.meta.url)) {
  try {
    const plan = installChannelSdks(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify({ engine: plan.engine, destination: plan.destination, changed: plan.changed, installed: plan.files.filter((file) => file.action === 'install').length, skipped: plan.files.filter((file) => file.action === 'skip').length }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
