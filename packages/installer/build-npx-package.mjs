#!/usr/bin/env node
/** 从唯一安装器真源生成轻量 npx 包，不复制技能载荷或安装第三方依赖。 */
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRepository } from '../../install.mjs';
import { isDirectEntry } from '../../skills/app-skill-runtime/direct-entry.mjs';

/** 默认源根与脚本绑定，避免从调用者当前项目复制错误的安装器。 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 构建输出逐级排除链接，发布准备不能覆盖仓库外的同名文件。 */
function assertOrdinaryPath(path) {
  let current = resolve(path);
  while (true) {
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`npx 构建路径不能含链接：${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** 配置可以稍后填写；正式发布前必须提供真实的仓库坐标。 */
export function validateNpxConfig(config, { required = false } = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)
    || typeof config.repository !== 'string' || typeof config.ref !== 'string') {
    throw new Error('npx 配置必须包含字符串 repository 和 ref');
  }
  const repository = config.repository.trim();
  if (required && !repository) throw new Error('远程地址待配置：请先填写 packages/cli/installer.config.json 的 repository，再发布 npx 包');
  if (repository) normalizeRepository(repository);
  if (config.ref && (config.ref.length > 255 || /[\u0000-\u0020\u007f]/.test(config.ref))) throw new Error('npx 默认 ref 无效');
  return { configured: Boolean(repository), repository, ref: config.ref };
}

/** 同一真源直接复制为包内模块；生成目录不作为第二份维护入口。 */
export function buildNpxPackage({ root = ROOT, checkConfig = false } = {}) {
  const packageRoot = join(root, 'packages', 'cli');
  const configuration = join(packageRoot, 'installer.config.json');
  const source = join(root, 'install.mjs');
  const output = join(packageRoot, 'generated', 'bootstrap.mjs');
  for (const path of [packageRoot, configuration, source, output]) assertOrdinaryPath(path);
  const config = validateNpxConfig(JSON.parse(readFileSync(configuration, 'utf8')), { required: checkConfig });
  const cli = join(packageRoot, 'cli.mjs');
  assertOrdinaryPath(cli);
  if (!existsSync(cli) || !lstatSync(cli).isFile()) throw new Error('npx 命令入口缺失：packages/cli/cli.mjs');
  if (!lstatSync(source).isFile()) throw new Error('远程安装器真源不是普通文件');
  const bytes = readFileSync(source);
  mkdirSync(dirname(output), { recursive: true });
  if (!existsSync(output) || !readFileSync(output).equals(bytes)) writeFileSync(output, bytes);
  // POSIX 用户可经 npm bin 直接执行入口；Windows 由 npm 生成命令 shim。
  if (process.platform !== 'win32') chmodSync(cli, 0o755);
  return { output, bytes: bytes.length, configured: config.configured, checkConfig };
}

if (isDirectEntry(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => !['--check-config', '--quiet'].includes(arg)) || new Set(args).size !== args.length) throw new Error('仅支持 --check-config 和 --quiet');
    const result = buildNpxPackage({ checkConfig: args.includes('--check-config') });
    // npm pack --json 需要纯 JSON，生命周期构建默认不应混入另一段输出。
    if (!args.includes('--quiet')) console.log(JSON.stringify({ status: 'PASS', ...result }));
  } catch (error) {
    console.error(JSON.stringify({ status: 'FAIL', error: error.message }));
    process.exitCode = 1;
  }
}
