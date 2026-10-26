#!/usr/bin/env node
/** npx 入口只收集技术栈与目标，实际下载和增量事务由共用引导器执行。 */
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const STACKS = Object.freeze(['unity', 'cocos', 'phaser', 'threejs', 'flutter']);
const STACK_LABELS = Object.freeze([...STACKS, 'all']);
const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const HELP_TEXT = [
  '用法：npx app-creator-skills <技术栈[,技术栈...]> [选项]',
  '技术栈：unity、cocos、phaser、threejs、flutter；all 表示全部（须单独指定）',
  '选项：--stack/-s <技术栈列表>、--dir/-d <项目目录>、--repo <owner/repo>、--ref <分支或提交>、--dry-run、--replace、--help/-h',
  '未指定项目目录时使用当前目录；远程仓库由安装包配置，也可通过 --repo 临时指定。',
].join('\n');

/** 读取包内的远程安装配置，配置由维护者补充，不在 CLI 中猜测仓库地址。 */
function readDefaultConfig() {
  const path = resolve(MODULE_DIRECTORY, 'installer.config.json');
  let config;
  try {
    config = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`无法读取安装配置 ${path}：${error.message}`);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)
    || typeof config.repository !== 'string' || typeof config.ref !== 'string') {
    throw new Error('安装配置必须包含字符串 repository 和 ref 字段');
  }
  return config;
}

/** 解析技术栈列表；all 只能独立选择，重复的具体栈会折叠。 */
function parseStacks(value, optionName) {
  const requested = value.split(',').map((stack) => stack.trim());
  if (!value.trim() || requested.some((stack) => !stack)) {
    throw new Error(`${optionName} 需要一个或多个有效技术栈`);
  }
  if (requested.includes('all')) {
    if (requested.length !== 1) throw new Error('all 必须单独指定，不能与其他技术栈组合');
    return [...STACKS];
  }
  const unknown = requested.find((stack) => !STACKS.includes(stack));
  if (unknown) throw new Error(`无法识别技术栈“${unknown}”；可选：${STACKS.join('、')}、all`);
  return [...new Set(requested)];
}

/** 解析 CLI 参数，位置参数只表示技术栈，项目路径只通过 --dir/-d 指定。 */
export function parseNpxArgs(argv = [], { cwd = process.cwd(), config, env = process.env } = {}) {
  if (!Array.isArray(argv) || argv.some((argument) => typeof argument !== 'string')) {
    throw new TypeError('安装参数必须是字符串数组');
  }
  const options = {
    help: false, stacks: [], projectRoot: resolve(cwd), repo: null, ref: null,
    dryRun: false, replace: false,
  };
  const seen = new Set();
  let positionalStacks = null;
  let explicitStacks = null;
  const valueOptions = new Map([
    ['--stack', 'stack'], ['-s', 'stack'], ['--dir', 'dir'], ['-d', 'dir'],
    ['--repo', 'repo'], ['--ref', 'ref'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const optionName = valueOptions.get(argument);
    if (optionName) {
      if (seen.has(optionName)) throw new Error(`${argument} 对应的选项只能指定一次`);
      seen.add(optionName);
      const value = argv[index + 1];
      if (value === undefined || value === '' || value.startsWith('-')) {
        throw new Error(`${argument} 需要一个值`);
      }
      index += 1;
      if (optionName === 'stack') explicitStacks = parseStacks(value, argument);
      else if (optionName === 'dir') options.projectRoot = resolve(cwd, value);
      else if (optionName === 'repo') options.repo = value;
      else if (optionName === 'ref') options.ref = value;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      if (seen.has('help')) throw new Error('帮助选项只能指定一次');
      seen.add('help');
      options.help = true;
      continue;
    }
    if (argument === '--dry-run' || argument === '--replace') {
      const key = argument.slice(2);
      if (seen.has(key)) throw new Error(`${argument} 只能指定一次`);
      seen.add(key);
      if (key === 'dry-run') options.dryRun = true;
      else options.replace = true;
      continue;
    }
    if (argument.startsWith('-')) throw new Error(`未知安装选项：${argument}`);
    if (positionalStacks !== null) throw new Error('只接受一个位置参数；多个技术栈请用逗号分隔');
    positionalStacks = parseStacks(argument, '位置参数');
  }

  if (positionalStacks && explicitStacks) throw new Error('位置参数技术栈与 --stack/-s 不能同时使用');
  options.stacks = positionalStacks ?? explicitStacks ?? [];
  if (options.help) return options;

  const installerConfig = config ?? readDefaultConfig();
  if (!installerConfig || typeof installerConfig !== 'object'
    || typeof installerConfig.repository !== 'string' || typeof installerConfig.ref !== 'string') {
    throw new Error('安装配置必须包含字符串 repository 和 ref 字段');
  }
  const configuredRepo = env.APP_CREATOR_SKILLS_REPO || installerConfig.repository;
  options.repo = options.repo ?? configuredRepo.trim();
  options.ref = options.ref ?? (installerConfig.ref.trim() || null);
  return options;
}

/** 将用户实际输入的名称或编号转换为技术栈，不替用户预选全部。 */
function parsePromptSelection(answer) {
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('没有选择技术栈，安装已取消');
  const tokens = answer.split(',').map((token) => token.trim());
  const requested = tokens.map((token) => {
    if (/^[1-6]$/.test(token)) return STACK_LABELS[Number(token) - 1];
    return token;
  });
  return parseStacks(requested.join(','), '技术栈选择');
}

/** 建立默认终端接口；readline 会在问答结束后关闭，避免阻止进程退出。 */
function createDefaultIO() {
  return {
    isTTY: Boolean(process.stdin.isTTY),
    write(message) { process.stdout.write(`${message}\n`); },
    error(message) { process.stderr.write(`${message}\n`); },
    async prompt(message) {
      const terminal = createInterface({ input: process.stdin, output: process.stdout });
      try { return await terminal.question(message); }
      finally { terminal.close(); }
    },
  };
}

/** 输出简短中文摘要，保留底层完整结果供调用方程序化处理。 */
function writeInstallSummary(io, result, selectedStacks) {
  const entries = Array.isArray(result?.entries) ? result.entries : [];
  const added = entries.filter((entry) => entry.action === 'install').length;
  const updated = entries.filter((entry) => entry.action === 'replace').length;
  const skipped = entries.filter((entry) => entry.action === 'skip').length;
  const destination = result?.destination ?? '目标项目';
  if (result?.remote?.dryRun) {
    io.write(`预览完成：${selectedStacks.join('、')}；目标 ${destination}；计划 ${entries.length} 项。`);
    return;
  }
  io.write(`安装完成：${selectedStacks.join('、')}；目标 ${destination}；新增 ${added} 项、更新 ${updated} 项、跳过 ${skipped} 项。`);
}

/** 选择技术栈并把规范化参数交给共享远程安装器。 */
export async function runNpxInstaller(argv = process.argv.slice(2), runtime = {}) {
  const io = runtime.io ?? createDefaultIO();
  const parsed = parseNpxArgs(argv, {
    cwd: runtime.cwd ?? process.cwd(),
    config: runtime.config,
    env: runtime.env ?? process.env,
  });
  if (parsed.help) {
    io.write(HELP_TEXT);
    return { help: true };
  }

  if (!parsed.stacks.length) {
    if (!io.isTTY) {
      io.write(HELP_TEXT);
      throw new Error('非交互终端必须在命令中指定技术栈');
    }
    io.write('请选择技术栈（输入名称或编号；多个选项用逗号分隔）：');
    io.write('1. unity  2. cocos  3. phaser  4. threejs  5. flutter  6. all');
    parsed.stacks = parsePromptSelection(await io.prompt('技术栈：'));
  }
  if (!parsed.repo.trim()) {
    throw new Error('远程地址待配置，可由维护者补充 installer.config.json，或使用 --repo owner/repo 临时指定。');
  }

  const bootstrapArgs = [parsed.projectRoot, '--repo', parsed.repo, '--stack', parsed.stacks.join(',')];
  if (parsed.ref) bootstrapArgs.push('--ref', parsed.ref);
  if (parsed.dryRun) bootstrapArgs.push('--dry-run');
  if (parsed.replace) bootstrapArgs.push('--replace');
  // 帮助和参数检查不依赖生成产物，干净源码检出也能运行测试及查看用法。
  const bootstrap = runtime.bootstrap ?? (await import('./generated/bootstrap.mjs')).runRemoteBootstrap;
  const result = await bootstrap(bootstrapArgs, { env: runtime.env ?? process.env });
  writeInstallSummary(io, result, parsed.stacks);
  return result;
}

/** 通过 realpath 比较识别 npm bin 符号链接调用的直接入口。 */
function isDirectEntry() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectEntry()) {
  runNpxInstaller().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
