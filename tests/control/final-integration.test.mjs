import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateFinalIntegration, validateIntegrationScope } from '../../skills/app-workflow-control/scripts/runtime/final-integration.mjs';

/** 创建与生产文件身份一致的隔离测试材料。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'final-integration-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const put = (path, value) => { mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), JSON.stringify(value)); };
  const identity = (path) => ({ path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') });
  const project = { projectId: 'project', stack: 'cocos' };
  const objects = ['lobby', 'battle'].map((objectId) => {
    const baselinePath = `${objectId}/baseline.json`;
    put(baselinePath, { schemaVersion: '1.0', objectId });
    const functionBaselineRef = identity(baselinePath);
    const path = `${objectId}/work.json`;
    put(path, { ...project, workItemId: objectId, workItemType: 'SCENE', globalState: 'COMPLETE', visual: { objectId, stage: 'V5', functionBaselineRef, functionDependencies: [{ caseId: 'start-battle' }] } });
    return { objectId, workItemRef: identity(path), functionBaselineRef };
  });
  const work = { ...project, workItemId: 'integration', workItemType: 'INTEGRATION', integrationPurpose: 'final', evidenceRef: { path: 'final/manifest.json' } };
  const scope = { schemaVersion: '1.0', ...project, workItemId: work.workItemId, objects: structuredClone(objects), cases: [{ caseId: 'start-battle', objectIds: ['lobby', 'battle'] }] };
  put('final/scope.json', scope); work.integrationScopeRef = identity('final/scope.json');
  const result = { schemaVersion: '1.0', ...project, workItemId: work.workItemId, status: 'PASS', objects, cases: [{ caseId: 'start-battle', objectIds: ['lobby', 'battle'] }] };
  /** 将实际行为结果与总记录分别写入，并同时登记到当前清单。 */
  const save = () => {
    for (const entry of result.cases) {
      put(`final/${entry.caseId}.json`, { schemaVersion: '1.0', ...project, workItemId: work.workItemId, caseId: entry.caseId, status: 'PASS', objectIds: entry.objectIds });
      entry.evidenceRef = identity(`final/${entry.caseId}.json`);
    }
    put('final/result.json', result); work.integrationEvidenceRef = identity('final/result.json');
    put('final/manifest.json', { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, items: [{ status: 'PASS', path: 'final/result.json' }, ...result.cases.map((entry) => ({ status: 'PASS', path: entry.evidenceRef.path }))] });
  };
  save();
  return { repo, put, identity, work, scope, result, save, inspect: () => ({ status: 'PASS', blocking: [] }) };
}

test('早期功能集成不依赖对象 V5，最终组合必须使用已覆盖的当前对象和基线', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => validateFinalIntegration(f.repo, { workItemType: 'INTEGRATION', integrationPurpose: 'feature' }));
  assert.doesNotThrow(() => validateFinalIntegration(f.repo, f.work, f.inspect));
  f.result.cases[0].objectIds = ['lobby']; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /覆盖与预先冻结的范围不一致/);
  f.result.cases[0].objectIds = ['lobby', 'battle']; f.result.cases[0].caseId = 'other'; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /结果行为与预先冻结的范围不一致/);
});

test('结果不能缩小预先冻结的对象和行为范围，范围文件变化也必须阻断', (t) => {
  const f = fixture(t);
  f.result.objects.pop(); f.result.cases[0].objectIds = ['lobby']; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /结果对象与预先冻结的范围不一致/);
  const f2 = fixture(t);
  f2.scope.cases.push({ caseId: 'return', objectIds: ['battle', 'lobby'] });
  f2.put('final/scope.json', f2.scope); f2.work.integrationScopeRef = f2.identity('final/scope.json'); f2.save();
  assert.throws(() => validateFinalIntegration(f2.repo, f2.work, f2.inspect), /结果行为与预先冻结的范围不一致/);
  const f3 = fixture(t);
  f3.scope.objects.pop(); f3.put('final/scope.json', f3.scope);
  assert.throws(() => validateIntegrationScope(f3.repo, f3.work), /最终集成范围内容已变化/);
  assert.equal(validateIntegrationScope(f3.repo, { workItemType: 'INTEGRATION', integrationPurpose: 'feature' }), null);
});

test('对象未完成、严格校验失败或任何冻结文件变化都阻断最终集成', (t) => {
  const f = fixture(t);
  assert.throws(() => validateFinalIntegration(f.repo, f.work, () => ({ status: 'BLOCKED' })), /严格检查未通过/);
  f.put('lobby/baseline.json', { schemaVersion: '1.0', objectId: 'changed' });
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /功能基线内容已变化/);
  const f2 = fixture(t);
  const lobby = JSON.parse(readFileSync(join(f2.repo, 'lobby/work.json'), 'utf8'));
  lobby.visual.stage = 'V4'; f2.put('lobby/work.json', lobby); f2.result.objects[0].workItemRef = f2.identity('lobby/work.json');
  f2.scope.objects[0].workItemRef = f2.identity('lobby/work.json'); f2.put('final/scope.json', f2.scope); f2.work.integrationScopeRef = f2.identity('final/scope.json'); f2.save();
  assert.throws(() => validateFinalIntegration(f2.repo, f2.work, f2.inspect), /已完成 V5/);
  const f3 = fixture(t);
  f3.put('battle/work.json', { changed: true });
  assert.throws(() => validateFinalIntegration(f3.repo, f3.work, f3.inspect), /范围对象 battle 工作项内容已变化/);
});

test('相同对象 ID 不允许在回归后换绑新的工作项或功能基线', (t) => {
  const f = fixture(t);
  const source = JSON.parse(readFileSync(join(f.repo, 'lobby/work.json'), 'utf8'));
  f.put('lobby/new-work.json', { ...source, workItemId: 'lobby-new' });
  f.result.objects[0].workItemRef = f.identity('lobby/new-work.json'); f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /工作项或功能基线与预先冻结的范围不一致/);
  const f2 = fixture(t);
  f2.put('lobby/new-baseline.json', { schemaVersion: '1.0', objectId: 'lobby', revision: 2 });
  f2.result.objects[0].functionBaselineRef = f2.identity('lobby/new-baseline.json'); f2.save();
  assert.throws(() => validateFinalIntegration(f2.repo, f2.work, f2.inspect), /工作项或功能基线与预先冻结的范围不一致/);
});

test('回归证据必须真实绑定工作项并出现在其 PASS 清单', (t) => {
  const f = fixture(t);
  f.result.status = 'FAIL'; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /状态不匹配/);
  f.result.status = 'PASS'; f.save(); f.put('final/manifest.json', { schemaVersion: '1.0', workItemId: f.work.workItemId, stack: f.work.stack, items: [] });
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /PASS 清单/);
});

test('最终行为必须有独立的实际验证记录且覆盖与总记录一致', (t) => {
  const f = fixture(t);
  f.put('final/start-battle.json', { schemaVersion: '1.0', projectId: 'project', stack: 'cocos', workItemId: 'integration', caseId: 'start-battle', status: 'PASS', objectIds: ['lobby'] });
  f.result.cases[0].evidenceRef = f.identity('final/start-battle.json');
  f.put('final/result.json', f.result); f.work.integrationEvidenceRef = f.identity('final/result.json');
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /实际验证记录身份、状态或覆盖不匹配/);
});
