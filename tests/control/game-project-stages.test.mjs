import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertGameArchitectureStructure, assertGameGrilling, assertGameMount, assertGameProjectReady, freezeGameGrilling, gameArchitectureTemplate } from '../../skills/app-workflow-control/scripts/runtime/game-project.mjs';
import { loadWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertGameIntegrationCoverage } from '../../skills/app-workflow-control/scripts/runtime/integration-system-sources.mjs';
import { fileIdentityKey } from '../../skills/app-workflow-control/scripts/runtime/io.mjs';
import { verifyFoundation } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { bindImplementation, submitPassingUnits } from './controller-fixture.mjs';

const cli = fileURLToPath(new URL('../../skills/app-workflow-control/scripts/workflow-control.mjs', import.meta.url));

/** 提供隔离项目及可核验的文件引用，避免触碰真实引擎。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'game-project-stages-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  return { repo, call: (command, ...args) => spawnSync(process.execPath, [cli, command, '--repo', repo, ...args], { encoding: 'utf8', windowsHide: true }) };
}

/** 写入夹具并计算和控制器一致的摘要。 */
function write(repo, path, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
  return { path, sha256: createHash('sha256').update(text).digest('hex') };
}

/** 提取成功命令的结构化结果，失败时保留实际诊断。 */
function passed(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('从零游戏按人工确认推进 1–3，阶段 4 结构必须通过并持续有效', async (t) => {
  const { repo, call } = fixture(t);
  const initial = ['--stack', 'phaser', '--type', 'PROJECT', '--id', 'game', '--objective', '玩法题材'];
  const standalone = passed(call('init', '--stack', 'phaser', '--type', 'MODULE', '--id', 'standalone', '--objective', '登记项目之前的独立任务'));
  assert.notEqual(call('init', ...initial, '--stage', 'requirements-scope').status, 0);
  const started = passed(call('init', ...initial));
  const projectPath = started.metadata.workItemPath;
  const shared = ['--work-item', projectPath];
  assert.match(started.metadata.progress, /^进度 1·/);
  assert.throws(() => assertGameProjectReady(repo, loadWork(repo, standalone.metadata.workItemPath)), /必须绑定游戏阶段基线/);
  assert.notEqual(call('init', '--stack', 'phaser', '--type', 'FOUNDATION', '--id', 'premature', '--objective', '过早生产').status, 0);
  const conceptRef = write(repo, 'docs/concept.md', '太空采矿与手动撤离');
  const approval = { decision: 'APPROVED', targetRef: conceptRef, userMessageRef: 'user:concept', userText: '确认太空采矿与撤离' };
  const grillingRef = write(repo, 'docs/grilling.json', {
    schemaVersion: '1.0', workItemId: 'game', status: 'CLOSED', userMessageRef: 'user:grilling',
    decisions: [{ question: '如何撤离？', answer: '返回飞船', userMessageRef: 'user:grilling' }],
  });
  const base = { schemaVersion: '1.0', workItemId: 'game', projectId: 'default-project', stack: 'phaser' };
  const submit = (name, spec) => call('game-stage', ...shared, '--spec', write(repo, `docs/${name}.json`, { ...base, ...spec }).path);
  const kickoff = { stage: 1, conceptRef, approval, grillingRef };
  assert.notEqual(submit('missing-order', kickoff).status, 0);
  assert.notEqual(submit('same-message', { ...kickoff, approval: { ...approval, userMessageRef: 'user:grilling' },
    grillingAfterUserMessageRef: 'user:grilling' }).status, 0);
  assert.match(passed(submit('kickoff', { ...kickoff, grillingAfterUserMessageRef: approval.userMessageRef })).metadata.progress, /^进度 2·/);

  const prototypeRef = write(repo, 'prototype.mjs', '游玩原型入口');
  const definition = {
    stage: 2, productRef: write(repo, 'docs/product.md', '采矿、判定、撤离'),
    prototypeRef, gameLoop: { start: '进场', action: '采矿', resolution: '容量判定', feedback: '背包计数', result: '返航', next: '再玩一次' },
  };
  const unapproved = submit('no-approval', definition);
  assert.notEqual(unapproved.status, 0);
  assert.equal(JSON.parse(unapproved.stderr).metadata.progress, '进度 2·进行中');
  passed(call('transition', ...shared, '--to', 'BLOCKED', '--reason', '等待人工试玩'));
  assert.match(passed(call('status', ...shared)).metadata.progress, /^进度 2·/);
  assert.match(passed(submit('product', {
    ...definition, approval: { ...approval, targetRef: prototypeRef, userMessageRef: 'user:loop', userText: '核心循环通过' },
  })).metadata.progress, /^进度 3·/);

  const { template, sha256 } = gameArchitectureTemplate(repo, 'phaser');
  const architecture = { stage: 3, architectureRef: write(repo, 'docs/architecture.md', '采矿模块、撤离接口及显示挂载'), templateVersion: template.templateVersion, templateSha256: sha256 };
  assert.notEqual(submit('wrong-template', { ...architecture, templateVersion: 'unity-game-1.0' }).status, 0);
  assert.equal(passed(submit('architecture', architecture)).metadata.progress, '进度 3·已完成');
  assert.equal(passed(call('check', ...shared)).metadata.progress, '进度 3·已完成');
  const compactProgress = call('status', ...shared, '--progress');
  assert.equal(compactProgress.status, 0);
  assert.equal(compactProgress.stdout.trim(), '进度 3·已完成');

  write(repo, '.workflow-control/work-items/unrelated-broken.json', '{');
  const created = passed(call('init', '--stack', 'phaser', '--type', 'FOUNDATION', '--id', 'foundation', '--objective', '架构回读'));
  const foundation = loadWork(repo, created.metadata.workItemPath);
  assert.equal(foundation.gameProjectRef.path, projectPath);
  assert.doesNotThrow(() => assertGameProjectReady(repo, foundation));
  const report = {
    schemaVersion: '1.0', workItemId: 'foundation', stack: 'phaser', templateVersion: template.templateVersion,
    entryPoints: template.project.entryPoints, nativeSourceRef: write(repo, 'src/game/ui.ts', '正式宿主'),
    layers: template.display.layers.filter(({ optional }) => !optional)
      .map(({ id, mount }) => ({ id, mount, nativePath: { content: 'Play/ContentRoot', popups: 'UI/PopupLayer', loading: 'UI/LoadingLayer' }[id],
        ...(id === 'popups' ? { childCount: 0 } : {}) })),
  };
  const path = `${foundation.evidenceRoot}/display.json`;
  const manifest = { items: [{ path, category: 'architecture-structure', status: 'PASS' }] };
  write(repo, path, { ...report, layers: report.layers.toReversed() });
  assert.throws(() => assertGameArchitectureStructure(repo, foundation, manifest), /缺少.*挂载点/);
  write(repo, path, report);
  assert.throws(() => assertGameArchitectureStructure(repo, foundation, manifest), /正式启动源码/);
  write(repo, report.entryPoints[0], '正式入口');
  assert.doesNotThrow(() => assertGameArchitectureStructure(repo, foundation, manifest));
  write(repo, path, { ...report, layers: report.layers.map((layer) => ({ ...layer, nativePath: layer.nativePath.replace('UI/', 'WrongHost/') })) });
  assert.throws(() => assertGameArchitectureStructure(repo, foundation, manifest), /缺少.*挂载点/);
  const module = passed(call('init', '--stack', 'phaser', '--type', 'SCENE', '--id', 'level', '--objective', '采矿场景',
    '--design-image-method', 'prompt-handoff')).metadata.workItemPath;
  const scene = loadWork(repo, module);
  assert.equal(scene.gameMount, 'content');
  assert.match(call('visual-stage', '--work-item', module, '--to', 'V2').stderr, /阶段 4 基础工程/);
  const foundationPath = created.metadata.workItemPath;
  const foundationArgs = ['--work-item', foundationPath];
  Object.assign(foundation.gateStatus, { F0: 'PASS', F1: 'PASS', F2: 'PASS' });
  write(repo, foundationPath, foundation);
  for (const state of ['BASELINE', 'PROPOSAL', 'REVIEW']) passed(call('transition', ...foundationArgs, '--to', state));
  const review = loadWork(repo, foundationPath);
  const { packPath, units } = await bindImplementation({ repo, work: review, workPath: foundationPath, stage: 'foundation',
    unitPaths: [report.entryPoints[0]] });
  passed(call('transition', ...foundationArgs, '--to', 'IMPLEMENTING'));
  await submitPassingUnits({ repo, work: loadWork(repo, foundationPath), workPath: foundationPath, packPath, units });
  passed(call('unit-check', ...foundationArgs, '--result', units[0].resultPath));
  const implementation = loadWork(repo, foundationPath);
  const manifestPath = `${foundation.evidenceRoot}/manifest.json`;
  write(repo, manifestPath, { ...manifest, schemaVersion: '1.0', workItemId: foundation.workItemId, stack: 'phaser', implementationPackageRef: packPath });
  write(repo, path, report);
  write(repo, foundationPath, { ...implementation, evidenceRef: { path: manifestPath }, gateStatus: { ...implementation.gateStatus, F3: 'PASS' } });
  for (const state of ['VALIDATING', 'PASSED', 'COMPLETE']) passed(call('transition', ...foundationArgs, '--to', state));
  assert.doesNotThrow(() => assertGameProjectReady(repo, scene, verifyFoundation));
  write(repo, report.nativeSourceRef.path, '已变化的正式宿主');
  assert.throws(() => assertGameProjectReady(repo, scene, verifyFoundation), /SHA-256/);
  write(repo, report.nativeSourceRef.path, '正式宿主');
  const rolledBack = passed(call('game-stage', ...shared, '--return-to', '2', '--reason', '核心循环变更'));
  assert.equal(rolledBack.metadata.progress, '进度 2·返工中');
  assert.deepEqual(Object.keys(loadWork(repo, projectPath).gameStageRefs), ['1']);
  assert.throws(() => assertGameProjectReady(repo, foundation), /阶段 3 方案尚未完成/);
  assert.match(call('visual-stage', '--work-item', module, '--to', 'V2').stderr, /技术方案|阶段 3/);
  assert.match(call('reuse-visual', '--work-item', module, '--source-work-item', standalone.metadata.workItemPath,
    '--impact', 'target', '--reason', '旧项目已回退').stderr, /阶段 3/);
  write(repo, module, { ...scene, globalState: 'IMPLEMENTING' });
  const resumed = call('run', '--work-item', module);
  assert.equal(resumed.status, 2);
  assert.match(JSON.parse(resumed.stdout).blocking[0], /阶段 3/);
  write(repo, module, { ...scene, globalState: 'IMPLEMENTING', action: { actionId: 'write', effects: ['external-write'], target: 'fixture' } });
  const blockedAction = call('check-action', '--work-item', module, '--action-id', 'write', '--effect', 'external-write', '--target', 'fixture');
  assert.match(blockedAction.stderr, /阶段 3/);
  const changedPrototype = write(repo, 'prototype-v2.mjs', '新的可玩候选');
  passed(submit('new-product', { ...definition, prototypeRef: changedPrototype,
    approval: { ...approval, targetRef: changedPrototype, userMessageRef: 'user:loop-v2' } }));
  passed(submit('architecture', architecture));
  assert.throws(() => assertGameProjectReady(repo, foundation), /阶段 1–3 基线已变更/);
});

test('V5 回读须匹配冻结挂载层和实际宿主', (t) => {
  const { repo } = fixture(t);
  const work = { workItemId: 'hud', stack: 'phaser', gameMount: 'hud', visual: { objectId: 'hud-display' } };
  const report = { schemaVersion: '1.0', workItemId: 'hud', stack: 'phaser', hostId: 'hud-display',
    layer: 'hud', nativeSourceRef: write(repo, 'ui.ts', '实际 UI'), nativePath: 'UI/PopupLayer/Hud' };
  const path = 'evidence/mount.json';
  write(repo, path, report);
  assert.throws(() => assertGameMount(repo, work, [{ path, category: 'architecture-mount' }]), /缺少.*挂载点/);
  write(repo, path, { ...report, nativePath: 'UI/HudLayer/Hud' });
  assert.doesNotThrow(() => assertGameMount(repo, work, [{ path, category: 'architecture-mount' }]));
  write(repo, path, { ...report, nativePath: 'UI/HudLayer' });
  assert.throws(() => assertGameMount(repo, work, [{ path, category: 'architecture-mount' }]), /缺少.*挂载点/);
  work.gameMount = 'content';
  write(repo, path, { ...report, layer: 'content', nativePath: 'Level/Unrelated' });
  assert.throws(() => assertGameMount(repo, work, [{ path, category: 'architecture-mount' }]), /缺少.*挂载点/);
  write(repo, path, { ...report, layer: 'content', nativePath: 'Level/ContentRoot/Object' });
  assert.doesNotThrow(() => assertGameMount(repo, work, [{ path, category: 'architecture-mount' }]));
});

test('游戏 V1 离开后冻结 Grilling，并约束变更后的复用', (t) => {
  const { repo } = fixture(t);
  const work = { stack: 'phaser', visual: { stage: 'V1' } };
  freezeGameGrilling(repo, work);
  work.visual.stage = 'V2';
  work.grillingRef = write(repo, 'grilling.json', '新的拷问');
  assert.throws(() => assertGameGrilling(repo, work), /仅在 V1/);
  delete work.gameGrillingRef;
  work.visual.stage = 'V1';
  const previous = work.grillingRef;
  freezeGameGrilling(repo, work);
  work.visual.stage = 'V3';
  assert.doesNotThrow(() => assertGameGrilling(repo, work));
  write(repo, previous.path, '替换旧答复');
  assert.throws(() => assertGameGrilling(repo, work), /SHA-256/);
});

test('阶段 7 只为真实跨模块用例要求对应的阶段 6 覆盖', (t) => {
  const { repo } = fixture(t);
  const work = { gameProjectRef: { path: 'project.json' } };
  const sourcePackageRef = write(repo, 'feature.json', '阶段 6 的已冻结包');
  const key = fileIdentityKey(repo, sourcePackageRef.path);
  const features = new Set([key]);
  const packages = new Map([[key, { packRef: sourcePackageRef, objectIds: ['level', 'results'] }]]);
  const cases = [{ caseId: 'cross', objectIds: ['level', 'results'] }, { caseId: 'single', objectIds: ['level'] }];
  assert.doesNotThrow(() => assertGameIntegrationCoverage(repo, work, { cases: [cases[1]] }, packages, new Set()));
  assert.throws(() => assertGameIntegrationCoverage(repo, work, { cases: [{ ...cases[1], crossModule: true }] }, packages, new Set()), /阶段 6 集成证据/);
  assert.throws(() => assertGameIntegrationCoverage(repo, work, { cases }, packages, features), /阶段 6 集成证据/);
  const scope = { cases, systemCoverageMappings: [{ sourcePackageRef, objectIds: ['level', 'results'], verifications: [{ caseId: 'cross' }] }] };
  assert.throws(() => assertGameIntegrationCoverage(repo, work, scope, packages, new Set()), /阶段 6 集成证据/);
  assert.doesNotThrow(() => assertGameIntegrationCoverage(repo, work, scope, packages, features));
});
