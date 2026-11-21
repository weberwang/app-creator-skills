import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { collectIntegrationSystemSources, functionCoverageOrigins } from '../../skills/app-workflow-control/scripts/runtime/integration-system-sources.mjs';
import { validateIntegrationSystemMappings } from '../../skills/app-workflow-control/scripts/runtime/integration-system-coverage.mjs';
import { validateExecutionState } from '../../skills/app-workflow-control/scripts/runtime/execution-state.mjs';
import { validateIntegrationScope } from '../../skills/app-workflow-control/scripts/runtime/final-integration.mjs';
import { validateSystemCoverage } from '../../skills/app-workflow-control/scripts/runtime/system-coverage.mjs';
import { coverageIdentity, putCoveragePackage } from './integration-coverage-fixture.mjs';

/** 创建隔离的合同测试工程，所有完成标记均为测试替身，不表示运行验收。 */
function fixture(t, stack = 'flutter') {
  const root = resolve(tmpdir());
  const repo = mkdtempSync(join(root, 'integration-coverage-lifecycle-'));
  t.after(() => { assert.equal(dirname(repo), root); rmSync(repo, { recursive: true, force: true }); });
  /** 保存合成需求、工作项或冻结快照。 */
  const put = (path, value) => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), typeof value === 'string' ? value : JSON.stringify(value));
    return coverageIdentity(repo, path);
  };
  const project = { projectId: 'project', stack };
  const work = { ...project, workItemId: 'final', workItemType: 'INTEGRATION', integrationPurpose: 'final', evidenceRoot: 'final/evidence', implementationPackageRef: { path: 'final/pack.json' } };
  const { pack } = putCoveragePackage(repo, work, { path: work.implementationPackageRef.path, resultPath: 'final/evidence/result.json' });
  /** 为来源建立唯一工作项及可追溯的当前实施包。 */
  const source = (id, extra = {}) => {
    const value = { ...project, workItemId: id, workItemType: 'MODULE', globalState: 'COMPLETE', evidenceRoot: `evidence/${id}`, implementationPackageRef: { path: `records/${id}-pack.json` }, ...extra };
    const created = putCoveragePackage(repo, value, { path: value.implementationPackageRef.path, resultPath: `${value.evidenceRoot}/unit.json`, ownedPath: `src/${id}.mjs` });
    const ref = put(`records/${id}-work.json`, value);
    return { work: value, ref, pack: created.pack, packRef: created.ref };
  };
  const passed = () => ({ status: 'PASS', blocking: [] });
  return { repo, project, work, pack, source, put, passed };
}

test('游戏与 App 的最终来源同时保留当前包和原 V1 系统身份', (t) => {
  for (const stack of ['cocos', 'flutter']) {
    const f = fixture(t, stack);
    const page = f.source('page', { workItemType: stack === 'cocos' ? 'SCENE' : 'PAGE', visual: { objectId: 'page', stage: 'V5' } });
    const old = putCoveragePackage(f.repo, { ...page.work, visual: { ...page.work.visual, stage: 'V1' } }, { path: 'records/page-v1-pack.json', resultPath: 'evidence/page-v1/unit.json' });
    const baseline = { mode: 'local', work: { ...page.work, implementationPackageRef: { path: old.ref.path } }, files: [old.ref] };
    page.work.visual.functionBaselineRef = f.put('records/page-baseline.json', baseline);
    page.ref = f.put('records/page-work.json', page.work);
    const scope = { objects: [{ objectId: 'page', workItemRef: page.ref }], cases: [{ caseId: 'flow', objectIds: ['page'] }] };
    const sources = collectIntegrationSystemSources(f.repo, f.work, scope, f.passed);
    assert.equal(sources.length, 2);
    scope.systemCoverageMappings = sources.slice(0, 1).flatMap((source) => source.pack.systemCoverage.requirements.map((requirement) => ({
      sourcePackageRef: source.packRef, requirementId: requirement.requirementId, moduleIds: requirement.moduleIds, objectIds: ['page'],
      verifications: [{ caseId: 'flow', unitId: 'integration-unit', command: 'node --version' }],
    })));
    assert.throws(() => validateIntegrationSystemMappings(f.repo, f.work, scope, { sources, pack: f.pack }), /缺少来源需求/);
    const origins = functionCoverageOrigins(f.repo, baseline);
    assert.deepEqual(origins, [old.ref]);
    const refreshed = { mode: 'local-regression', systemCoverageOrigins: origins, work: page.work, files: [page.packRef] };
    assert.deepEqual(functionCoverageOrigins(f.repo, refreshed).map((ref) => ref.path).sort(), [old.ref.path, page.packRef.path].sort());
  }
});

test('替换共享功能来源时，原共享模块的需求身份继续保留', (t) => {
  const f = fixture(t);
  const previous = f.source('previous');
  const next = f.source('next');
  const old = { mode: 'dependencies', sources: [{ implementationPackageRef: { path: previous.packRef.path }, files: [previous.packRef] }] };
  const preserved = functionCoverageOrigins(f.repo, old);
  const page = f.source('page', { workItemType: 'PAGE', visual: { objectId: 'page', stage: 'V5', functionDependencies: [{ workItemRef: next.ref }] } });
  page.work.visual.functionBaselineRef = f.put('records/page-baseline.json', { mode: 'dependencies', systemCoverageOrigins: preserved, dependencies: [{ workItemRef: next.ref }], sources: [] });
  page.ref = f.put('records/page-work.json', page.work);
  const sources = collectIntegrationSystemSources(f.repo, f.work, { objects: [{ objectId: 'page', workItemRef: page.ref }] }, f.passed);
  assert.ok(sources.some((source) => source.packRef.path === previous.packRef.path));
  assert.ok(sources.some((source) => source.packRef.path === next.packRef.path));
});

test('历史来源通过后，显式当前来源仍须执行更严格的检查', (t) => {
  const f = fixture(t);
  const dependency = f.source('dependency');
  const page = f.source('page', { productionDependencies: [{ workItemRef: dependency.ref }] });
  const scope = { objects: [{ objectId: 'page', workItemRef: page.ref }], systemSources: [{ workItemRef: dependency.ref, objectIds: ['page'] }] };
  const modes = [];
  assert.throws(() => collectIntegrationSystemSources(f.repo, f.work, scope, (repo, source, options) => {
    if (source.workItemId === 'dependency') {
      modes.push(options.historical);
      if (!options.historical) return { status: 'BLOCKED', blocking: ['当前业务交付缺失'] };
    }
    return f.passed();
  }), /严格检查未通过/);
  assert.deepEqual(modes, [true, false]);
});

test('历史前批的共享功能依赖保持历史检查模式', (t) => {
  const f = fixture(t);
  const shared = f.source('shared');
  const batch = f.source('batch', { visual: { objectId: 'page', stage: 'V5', functionDependencies: [{ workItemRef: shared.ref }] } });
  const page = f.source('page', { productionDependencies: [{ workItemRef: batch.ref }] });
  const modes = [];
  collectIntegrationSystemSources(f.repo, f.work, { objects: [{ objectId: 'page', workItemRef: page.ref }] }, (repo, source, options) => {
    if (source.workItemId === 'shared') modes.push(options.historical);
    return f.passed();
  });
  assert.deepEqual(modes, [true]);
});

test('REVIEW 来源严格检查失败时不能只凭 COMPLETE 和 V5 开始集成', (t) => {
  const f = fixture(t);
  const page = f.source('page', { workItemType: 'PAGE', visual: { objectId: 'page', stage: 'V5', functionBaselineRef: f.put('records/baseline.json', { mode: 'local' }) } });
  const scope = { schemaVersion: '1.0', ...f.project, workItemId: f.work.workItemId, objects: [{ objectId: 'page', workItemRef: page.ref, functionBaselineRef: page.work.visual.functionBaselineRef }], cases: [{ caseId: 'flow', objectIds: ['page'] }] };
  f.work.integrationScopeRef = f.put('records/final-scope.json', scope);
  assert.throws(() => validateIntegrationScope(f.repo, f.work), /必须|无效|缺少|绑定/);
});

test('实施后 final 改标 feature 或移除身份时，冻结执行状态拒绝继续', (t) => {
  const f = fixture(t, 'nodejs');
  const state = { schemaVersion: '1.0', workItemId: f.work.workItemId, stack: f.work.stack, implementationPackageRef: f.work.implementationPackageRef.path, integrationScopeRef: { path: 'scope.json', sha256: 'a'.repeat(64) } };
  const downgraded = { ...f.work, integrationPurpose: 'feature', stageId: 'cross-module-integration' };
  assert.throws(() => validateExecutionState(f.repo, downgraded, f.pack, state), /最终集成用途.*冻结/);
  assert.throws(() => validateExecutionState(f.repo, { ...downgraded, workItemType: 'MODULE' }, f.pack, state), /最终集成用途.*冻结/);
});

test('需求和设计本身不能作为复用证据自证', (t) => {
  const f = fixture(t);
  const source = f.source('reused');
  const module = source.pack.systemCoverage.modules[0];
  module.status = 'reuse';
  module.implementationUnitIds = [];
  module.evidenceRefs = [source.pack.systemCoverage.requirementsRef];
  assert.throws(() => validateSystemCoverage(f.repo, source.work, source.pack), /复用证据不能使用需求或设计文件自证/);
});

test('最终实施任务不能覆盖其范围引用的来源包或设计依据', (t) => {
  const f = fixture(t);
  const baselineRef = f.put('records/page-baseline.json', { objectId: 'page' });
  const page = f.source('page', { workItemType: 'PAGE', visual: { objectId: 'page', stage: 'V5', functionBaselineRef: baselineRef } });
  const requirement = page.pack.systemCoverage.requirements[0];
  const scope = { schemaVersion: '1.0', ...f.project, workItemId: f.work.workItemId,
    objects: [{ objectId: 'page', workItemRef: page.ref, functionBaselineRef: baselineRef }],
    cases: [{ caseId: 'flow', objectIds: ['page'] }],
    systemCoverageMappings: [{ sourcePackageRef: page.packRef, requirementId: requirement.requirementId, moduleIds: requirement.moduleIds, objectIds: ['page'],
      verifications: [{ caseId: 'flow', unitId: 'integration-unit', command: 'node --version' }] }],
  };
  f.work.integrationScopeRef = f.put('records/final-scope.json', scope);
  f.pack.executionUnits[0].paths = [page.packRef.path];
  f.put(f.work.implementationPackageRef.path, f.pack);
  assert.throws(() => validateIntegrationScope(f.repo, f.work, { inspectSource: f.passed }), /不能修改冻结的系统需求/);
  f.pack.executionUnits[0].paths = [page.pack.systemCoverage.requirementsRef.path];
  f.put(f.work.implementationPackageRef.path, f.pack);
  assert.throws(() => validateIntegrationScope(f.repo, f.work, { inspectSource: f.passed }), /不能修改冻结的系统需求/);
});

test('带计划但只完成 V2 的设计提案不能冒充实际生产来源', (t) => {
  const f = fixture(t);
  const proposal = f.source('proposal', { workItemType: 'PAGE', visual: { objectId: 'page', stage: 'V2', designRoute: 'figma-app', designIntent: 'proposal' } });
  assert.throws(() => collectIntegrationSystemSources(f.repo, f.work, { objects: [{ objectId: 'page', workItemRef: proposal.ref }] }, f.passed), /不能采用仅设计提案/);
});
