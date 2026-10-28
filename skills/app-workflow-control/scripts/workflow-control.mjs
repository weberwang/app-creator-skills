#!/usr/bin/env node
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { isDirectEntry } from '../../app-skill-runtime/direct-entry.mjs';
import { GATES, STACKS, TRANSITIONS, VISUAL_STAGES } from './runtime/constants.mjs';
import { repoPath, WorkflowError } from './runtime/io.mjs';
import { loadProfile, requireOneOf, requireText } from './runtime/validation.mjs';
import { advanceVisual, checkProtectedAction, completeUnit, initializeWork, inspect, loadWork, refreshFunctionBaseline, response, transitionWork } from './runtime/workflow.mjs';
import { prepareWorkRecords, recordWorkResult } from './runtime/records.mjs';
import { reuseVisualReviews } from './runtime/visual-reuse.mjs';
import { workflowMode } from './runtime/task-policy.mjs';

/** CLI 每个命令允许的参数，用于尽早拒绝拼错和越权操作。 */
const OPTIONS = Object.freeze({
  init: ['repo', 'work-item', 'stack', 'id', 'type', 'objective', 'project-id', 'object-id', 'host-id', 'layer-type', 'mode', 'release-intent', 'integration-purpose'],
  status: ['repo', 'work-item'], check: ['repo', 'work-item'], run: ['repo', 'work-item'],
  transition: ['repo', 'work-item', 'to', 'reason', 'affected-scope', 'return-resolution'],
  'visual-stage': ['repo', 'work-item', 'to'], 'unit-check': ['repo', 'work-item', 'result'],
  plan: ['repo', 'work-item', 'spec'], record: ['repo', 'work-item', 'unit', 'report'],
  'reuse-visual': ['repo', 'work-item', 'source-work-item', 'impact', 'reason'],
  'refresh-function-baseline': ['repo', 'work-item', 'spec'],
  'check-action': ['repo', 'work-item', 'action-id', 'effect', 'target'],
  lint: ['repo'],
});

/** 解析并执行唯一公共控制 CLI，未知参数永不静默丢弃。 */
export async function main(argv = process.argv.slice(2)) {
  const command = argv.shift();
  if (!OPTIONS[command]) throw new WorkflowError(`未知命令：${command ?? '(空)'}；支持 ${Object.keys(OPTIONS).join(', ')}`);
  const args = parseCommandArgs(argv);
  for (const name of Object.keys(args)) if (name !== '_' && !OPTIONS[command].includes(name)) throw new WorkflowError(`${command} 不接受 --${name}`);
  if (args._.length) throw new WorkflowError(`不接受位置参数：${args._.join(' ')}`);
  const repo = resolve(args.repo ?? process.cwd());
  if (!existsSync(repo)) throw new WorkflowError(`项目目录不存在：${repo}`, 'NOT_FOUND');
  if (command === 'init') return output(await initializeWork({ repo, args }));
  if (command === 'lint') return output(await lintPackage(repo));
  if (command === 'run') return output(await runSafe({ repo, workItem: args['work-item'] }), true);
  requireText(args['work-item'], '--work-item');
  repoPath(repo, args['work-item'], 'Work Item 路径');
  if (command === 'plan') {
    requireText(args.spec, '--spec');
    return output(await prepareWorkRecords({ repo, workItem: args['work-item'], planPath: args.spec }), true);
  }
  if (command === 'record') {
    requireText(args.unit, '--unit');
    requireText(args.report, '--report');
    return output(await recordWorkResult({ repo, workItem: args['work-item'], unitId: args.unit, reportPath: args.report }), true);
  }
  if (command === 'reuse-visual') {
    for (const name of ['source-work-item', 'impact', 'reason']) requireText(args[name], `--${name}`);
    return output(await reuseVisualReviews({ repo, workItem: args['work-item'], sourceWorkItem: args['source-work-item'], impact: args.impact, reason: args.reason }), true);
  }
  if (command === 'refresh-function-baseline') {
    requireText(args.spec, '--spec');
    return output(await refreshFunctionBaseline({ repo, workItem: args['work-item'], specPath: args.spec }), true);
  }
  if (command === 'check-action') {
    for (const name of ['action-id', 'effect', 'target']) requireText(args[name], `--${name}`);
    return output(checkProtectedAction({ repo, workItem: args['work-item'], actionId: args['action-id'], effect: args.effect, target: args.target }), true);
  }
  if (command === 'status' || command === 'check') return output(inspect({ repo, workItem: args['work-item'], check: command === 'check' }), command === 'check');
  if (command === 'transition') {
    requireText(args.to, '--to');
    return output(await transitionWork({ repo, workItem: args['work-item'], to: args.to, args }));
  }
  if (command === 'visual-stage') {
    requireText(args.to, '--to');
    requireOneOf(args.to, VISUAL_STAGES, '--to');
    return output(await advanceVisual({ repo, workItem: args['work-item'], to: args.to }));
  }
  if (command === 'unit-check') {
    requireText(args.result, '--result');
    return output(await completeUnit({ repo, workItem: args['work-item'], resultPath: args.result }));
  }
  throw new WorkflowError(`未实现的命令：${command}`);
}

/** 依次推进无需人工交接的早期安全状态，并在 REVIEW 停止。 */
async function runSafe({ repo, workItem }) {
  requireText(workItem, '--work-item');
  let work = loadWork(repo, workItem);
  if (['IMPLEMENTING', 'RELEASE_APPROVAL_REQUIRED', 'RELEASING'].includes(work.globalState)) {
    return response({ status: 'STOPPED', work, next: ['由已获授权的执行者完成当前单元；涉及发布时核对精确批准，控制器不执行实际动作'], metadata: { reason: 'AUTOMATIC_EXECUTION_DISABLED' } });
  }
  let changed = false;
  for (const [state, gate, target] of [['INTAKE', 'F0', 'BASELINE'], ['BASELINE', 'F1', 'PROPOSAL'], ['PROPOSAL', 'F2', 'REVIEW']]) {
    if (work.globalState !== state) continue;
    if (work.gateStatus[gate] !== 'PASS') {
      return response({ status: 'BLOCKED', work, changed, blocking: [`${gate} 尚未 PASS`], next: [`完成 ${gate} 后显式提交范围结论`] });
    }
    const result = await transitionWork({ repo, workItem, to: target, args: {} });
    changed ||= result.changed;
    work = loadWork(repo, workItem);
  }
  if (work.globalState === 'REVIEW') {
    if (workflowMode(work) === 'light') {
      const checked = inspect({ repo, workItem, check: true });
      if (checked.status === 'BLOCKED') return { ...checked, changed };
    }
    return response({ status: 'STOPPED', work, changed, next: ['冻结 Implementation Package，再显式 transition 到 IMPLEMENTING'], metadata: { reason: 'EXPLICIT_IMPLEMENTATION_REQUIRED' } });
  }
  const result = inspect({ repo, workItem, check: false });
  result.changed = changed;
  return result;
}

/** 校验公共控制器文件、JSON 模板和五种技术栈 profile。 */
async function lintPackage(repo) {
  const skillRoot = resolve(import.meta.dirname, '..');
  const schemaFiles = [
    'work-item.schema.json', 'implementation-package.schema.json', 'execution-result.schema.json',
    'evidence-manifest.schema.json', 'human-review.schema.json', 'grilling-record.schema.json',
    'asset-review.schema.json', 'global-visual-baseline.schema.json', 'release-result.schema.json',
    'release-preparation.schema.json', 'work-plan.schema.json', 'execution-report.schema.json',
  ];
  for (const file of schemaFiles) {
    const path = resolve(skillRoot, 'schemas', file);
    try { JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { throw new WorkflowError(`schema ${file} 无效或缺失：${error.message}`, 'PACKAGE_INVALID'); }
  }
  const templateFiles = ['work-item.json', 'implementation-package.json', 'evidence-manifest.json', 'grilling-record.json', 'asset-review.json', 'global-visual-baseline.json', 'human-review.json', 'execution-result.json', 'release-result.json', 'release-preparation.json', 'work-plan.json', 'execution-report.json'];
  for (const file of templateFiles) {
    const path = resolve(skillRoot, 'templates', file);
    try { JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { throw new WorkflowError(`template ${file} 无效或缺失：${error.message}`, 'PACKAGE_INVALID'); }
  }
  const availableStacks = STACKS.filter((stack) => {
    const localRoot = resolve(skillRoot, '..', `app-stack-${stack}`, 'profile.json');
    const installedRoot = resolve(repo, '.agents', 'skills', `app-stack-${stack}`, 'profile.json');
    return existsSync(localRoot) || existsSync(installedRoot);
  });
  if (!availableStacks.length) throw new WorkflowError('找不到与当前安装包对应的任何技术栈 profile', 'PACKAGE_INVALID');
  const profiles = availableStacks.map((stack) => loadProfile(repo, stack).id);
  return response({ status: 'PASS', changed: false, metadata: { schemas: schemaFiles.length, templates: templateFiles.length, stacks: profiles } });
}

/** 处理参数并输出稳定 JSON；check 与 run 的阻断以非零码返回。 */
function output(result, check = false) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (check && result.status === 'BLOCKED') process.exitCode = 2;
  return result;
}

/** 独立解析参数，布尔 flag 及命令位置由上游严格校验。 */
function parseCommandArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index]);
    if (!token.startsWith('--')) { args._.push(token); continue; }
    const equal = token.indexOf('=');
    const key = token.slice(2, equal < 0 ? undefined : equal).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    let value = equal < 0 ? undefined : token.slice(equal + 1);
    if (value === undefined && index + 1 < argv.length && !argv[index + 1].startsWith('--')) value = argv[++index];
    if (value === undefined) value = true;
    if (args[key] !== undefined) throw new WorkflowError(`参数不得重复：--${key}`);
    args[key] = value;
  }
  return args;
}

/** 区分直接调用和作为模块导入，便于单元测试独立验证路由。 */
if (isDirectEntry(import.meta.url)) {
  main().catch((error) => {
    const detail = { status: 'BLOCKED', stage: null, changed: false, blocking: [error.message], next: [], metadata: { code: error.code ?? 'UNEXPECTED_ERROR' } };
    process.stderr.write(`${JSON.stringify(detail, null, 2)}\n`);
    process.exitCode = error.code === 'NOT_FOUND' ? 3 : 2;
  });
}
