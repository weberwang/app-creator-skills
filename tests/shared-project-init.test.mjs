/** 验证项目文档初始化共享计划保留各栈身份、模板和公共授权边界。 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildSharedProjectInitCapability } from '../scripts/migration/shared-project-init.mjs';

/** 使用最小源输入保留真实适配器所依赖的导出、授权与入口结构。 */
function sourceFixture(stack, prefix) {
  return `#!/usr/bin/env node
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { CORE_TEMPLATES, OPTIONAL_TEMPLATES } from "./project_doc_templates.mjs";
/** 表示初始化输入或授权不满足约束。 */
class InitializationError extends Error {}
/** 读取需要生成的模板名称。 */
export function parseIncludeList(value) { return value.split(","); }
/** 测试夹具不从真实 CLI 读取参数。 */
function parseArgs() { return {}; }
/** 测试中由临时目录承担项目根。 */
export function validateProjectRoot(root) { return root; }
/** 只选择当前技术栈核心模板。 */
export function selectTemplates() { return { ...CORE_TEMPLATES }; }
/** 测试授权时不实际写入产品文件。 */
export function initializeDocuments() { return []; }
/** 调用唯一控制 CLI 验证 A1 Work Item 范围；Ledger 仅在调用方显式提供时传递。 */
export function runPreflight(projectRoot, workItem, ledger, approvalObject, templates) {
  const cli = "${prefix}-game-workflow-control"; const action = "${stack}-spec-candidate";
}
/** 测试入口不自动启动任何真实服务。 */
export function main() { return 0; }
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main();
`;
}

/** 构造每栈独立目录，验证生成计划不会硬编码原先的专业路径。 */
function makePlans() {
  return [['cocos', 'cocos'], ['phaser', 'phaser4'], ['threejs', 'threejs']].map(([stack, prefix]) => {
    const skill = `${prefix}-game-orchestrator`;
    const source = `skills/${skill}/scripts/initialize_project_docs.mjs`;
    const templates = `skills/${skill}/scripts/project_doc_templates.mjs`;
    return {
      stack,
      entries: new Map([[source, { destination: `skills/${stack}-domain-contracts/project/init.mjs` }], [templates, { destination: `skills/${stack}-domain-contracts/project/templates.mjs` }]]),
      sourceBuffers: new Map([[source, Buffer.from(sourceFixture(stack, prefix))]]),
    };
  });
}

/** 以独立临时项目承载生成代码和最小公共控制面替身，不触碰真实工程。 */
function writeModule(root, path, content) {
  const target = join(root, ...path.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

test('三栈从各自模板与身份进入同一工厂，并保留授权和所有权检查', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'shared-project-init-'));
  t.after(() => { delete globalThis.__projectInitTest; rmSync(root, { recursive: true, force: true }); });
  const capability = buildSharedProjectInitCapability(makePlans());
  writeModule(root, capability.implementation, capability.content);
  writeModule(root, 'skills/app-workflow-control/scripts/runtime/io.mjs', 'export const repoPath = (_, path) => ({ relative: path });');
  writeModule(root, 'skills/app-workflow-control/scripts/runtime/workflow.mjs', 'export const loadWork = () => globalThis.__projectInitTest.work;');
  writeModule(root, 'skills/app-workflow-control/scripts/runtime/validation.mjs', 'export const loadProfile = () => ({}); export const assertOwnedPath = (_, __, ___, path) => { if (globalThis.__projectInitTest.rejectPath) throw new Error("拒绝越界"); globalThis.__projectInitTest.paths.push(path); };');
  writeModule(root, 'skills/app-workflow-control/scripts/runtime/artifacts.mjs', 'export const assertNoOpenGrilling = () => { if (globalThis.__projectInitTest.grilling) throw new Error("存在未结束拷问"); };');
  for (const source of capability.sources) {
    writeModule(root, source.adapterDestination, source.adapterContent);
    writeModule(root, `skills/${source.stack}-domain-contracts/project/templates.mjs`, `export const CORE_TEMPLATES = {"${source.stack}.md":"content"}; export const OPTIONAL_TEMPLATES = {};`);
    const tools = await import(pathToFileURL(join(root, ...source.adapterDestination.split('/'))).href);
    const state = globalThis.__projectInitTest = { work: { stack: source.stack, globalState: 'REVIEW', gateStatus: { F0: 'PASS' }, action: { effects: ['local-write'] } }, paths: [] };
    assert.deepEqual(tools.selectTemplates(), { [`${source.stack}.md`]: 'content' });
    tools.runPreflight(root, 'work.json', null, '初始化项目', tools.selectTemplates());
    assert.deepEqual(state.paths, [`docs/${source.stack}.md`]);
    state.work.stack = 'other';
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '项目', tools.selectTemplates()), /技术栈必须为/);
    state.work.stack = source.stack;
    state.work.gateStatus.F0 = 'FAIL';
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '项目', tools.selectTemplates()), /F0=PASS/);
    state.work.gateStatus.F0 = 'PASS';
    state.work.globalState = 'RETURN';
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '项目', tools.selectTemplates()), /BLOCKED\/RETURN/);
    state.work.globalState = 'REVIEW';
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '', tools.selectTemplates()), /对象说明/);
    state.work.action.effects = ['publish'];
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '项目', tools.selectTemplates()), /风险动作/);
    state.work.action.effects = ['local-write'];
    state.grilling = true;
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '项目', tools.selectTemplates()), /拷问/);
    state.grilling = false;
    state.rejectPath = true;
    assert.throws(() => tools.runPreflight(root, 'work.json', null, '项目', tools.selectTemplates()), /越界/);
  }
});

test('缺失模板、源码漂移或错误授权锚点时拒绝共享', () => {
  const changed = makePlans();
  const [source, bytes] = [...changed[1].sourceBuffers][0];
  changed[1].sourceBuffers.set(source, Buffer.from(bytes.toString().replace('return root;', 'return String(root);')));
  assert.throws(() => buildSharedProjectInitCapability(changed), /源差异/);
  const missing = makePlans();
  missing[0].entries.delete('skills/cocos-game-orchestrator/scripts/project_doc_templates.mjs');
  assert.throws(() => buildSharedProjectInitCapability(missing), /模板来源缺失/);
  const unsafe = makePlans();
  unsafe[0].entries.get('skills/cocos-game-orchestrator/scripts/initialize_project_docs.mjs').destination = 'skills/../../outside.mjs';
  assert.throws(() => buildSharedProjectInitCapability(unsafe), /安全的技能模块目标/);
  const collisions = makePlans();
  collisions[1].entries.get('skills/phaser4-game-orchestrator/scripts/initialize_project_docs.mjs').destination = collisions[0].entries.get('skills/cocos-game-orchestrator/scripts/initialize_project_docs.mjs').destination;
  assert.throws(() => buildSharedProjectInitCapability(collisions), /目标.*冲突/);
  const malformed = makePlans();
  for (const plan of malformed) {
    const [path, content] = [...plan.sourceBuffers][0];
    plan.sourceBuffers.set(path, Buffer.from(content.toString().replace('调用唯一控制 CLI 验证 A1 Work Item 范围', '未知预检')));
  }
  assert.throws(() => buildSharedProjectInitCapability(malformed), /导出 API|授权/);
});

test('三栈同时新增导入或前缀声明时也不能静默丢弃', () => {
  const extraImport = makePlans();
  for (const plan of extraImport) {
    const [path, bytes] = [...plan.sourceBuffers][0];
    const source = bytes.toString()
      .replace('isAbsolute, parse, resolve } from "node:path"', 'isAbsolute, parse, resolve, sep } from "node:path"')
      .replace('return root;', 'return root + sep;');
    plan.sourceBuffers.set(path, Buffer.from(source));
  }
  assert.throws(() => buildSharedProjectInitCapability(extraImport), /导入声明/);
  const reusedOldImport = makePlans();
  for (const plan of reusedOldImport) {
    const [path, bytes] = [...plan.sourceBuffers][0];
    plan.sourceBuffers.set(path, Buffer.from(bytes.toString().replace('return root;', 'return spawnSync(root);')));
  }
  assert.throws(() => buildSharedProjectInitCapability(reusedOldImport), /已移除的旧控制子进程/);
  const extraDeclaration = makePlans();
  for (const plan of extraDeclaration) {
    const [path, bytes] = [...plan.sourceBuffers][0];
    plan.sourceBuffers.set(path, Buffer.from(bytes.toString().replace('import { pathToFileURL }', 'const extraSetting = true;\nimport { pathToFileURL }')));
  }
  assert.throws(() => buildSharedProjectInitCapability(extraDeclaration), /前缀含未知声明/);
});

test('本机源仓库存在时校验三栈真实文件，缺失时跳过该补充核对', (t) => {
  const plans = makePlans();
  try {
    for (const plan of plans) {
      const [source] = plan.sourceBuffers.keys();
      plan.sourceBuffers.set(source, readFileSync(join('..', `${plan.stack}-skills`, ...source.split('/'))));
    }
  } catch (error) {
    if (error.code === 'ENOENT') return t.skip('没有相邻源仓库');
    throw error;
  }
  const capability = buildSharedProjectInitCapability(plans);
  assert.equal(capability.sources.length, 3);
  assert.ok(capability.content.includes('assertNoOpenGrilling'));
});
