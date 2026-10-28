import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { validateFeatureDependencies } from '../../skills/app-workflow-control/scripts/runtime/feature-dependencies.mjs';

/** 构造独占目录与真实来源、清单及可供多个对象引用的行为证据。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'feature-dependencies-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 在测试项目内写入 JSON 并记录实际内容摘要。 */
  function put(path, value) {
    const full = join(repo, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `${JSON.stringify(value)}\n`);
    return { path, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') };
  }
  const source = { schemaVersion: '1.0', workItemId: 'feature', projectId: 'project', stack: 'cocos', workItemType: 'MODULE', globalState: 'PASSED', evidenceRef: { path: 'source/manifest.json' } };
  const evidence = { schemaVersion: '1.0', workItemId: 'feature', projectId: 'project', stack: 'cocos', caseId: 'start-battle', status: 'PASS', objectIds: ['lobby', 'battle'] };
  const evidenceRef = put('source/case.json', evidence);
  const manifest = { schemaVersion: '1.0', workItemId: 'feature', stack: 'cocos', items: [{ status: 'PASS', path: evidenceRef.path }] };
  put(source.evidenceRef.path, manifest);
  put('source/work.json', source);
  const dependency = { workItemRef: { path: 'source/work.json' }, caseId: evidence.caseId, evidenceRef };
  const work = { workItemId: 'lobby-work', projectId: 'project', stack: 'cocos', visual: { objectId: 'lobby', functionDependencies: [dependency] } };
  /** 模拟严格检查结果；生产调用应提供真正的控制器检查器。 */
  function inspect(_repo, _source, options) {
    assert.equal(options.strict, true);
    return { status: 'PASS', blocking: [] };
  }
  return { repo, source, evidence, evidenceRef, manifest, dependency, work, put, inspect };
}

test('同一行为证据可被两个对象复用且无需等待任一对象的视觉完成', (t) => {
  const f = fixture(t);
  assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].caseId, 'start-battle');
  f.work.workItemId = 'battle-work';
  f.work.visual.objectId = 'battle';
  assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].workItemId, 'feature');
});

test('功能依赖允许安全路径别名并拒绝越界', (t) => {
  const f = fixture(t);
  f.dependency.workItemRef.path = './source//unused/../work.json';
  f.dependency.evidenceRef.path = './source//case.json';
  assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].caseId, 'start-battle');
  if (process.platform === 'win32') {
    f.dependency.workItemRef.path = '.\\SOURCE\\WORK.JSON';
    f.dependency.evidenceRef.path = 'SOURCE\\CASE.JSON';
    assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].caseId, 'start-battle');
  }
  for (const value of ['../source/work.json', '/source/work.json', 'C:/source/work.json', '//server/share']) {
    f.dependency.workItemRef.path = value;
    assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect));
  }
});

test('功能依赖不能用链接与上级路径组合掩盖越界', (t) => {
  const f = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), 'feature-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  symlinkSync(outside, join(f.repo, 'source', 'outside'), 'junction');
  f.dependency.workItemRef.path = 'source/outside/../work.json';
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /符号链接越出项目/);
});

test('显示层共享功能证据必须匹配实际宿主与层类型', (t) => {
  const f = fixture(t);
  f.work.workItemType = 'DISPLAY_LAYER';
  Object.assign(f.work.visual, { hostId: 'home', layerType: 'modal' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /未绑定当前显示层宿主/);
  f.dependency.evidenceRef = f.put('source/case.json', { ...f.evidence, hostId: 'home', layerType: 'modal' });
  assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].caseId, 'start-battle');
  f.work.visual.hostId = 'settings';
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /未绑定当前显示层宿主/);
  f.dependency.evidenceRef = f.put('source/case.json', { ...f.evidence, hostId: 'settings', layerType: 'modal' });
  assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].caseId, 'start-battle');
});

test('无功能依赖时允许调用方自行验证当前工作项', (t) => {
  const f = fixture(t);
  delete f.work.visual.functionDependencies;
  assert.deepEqual(validateFeatureDependencies(f.repo, f.work), []);
  f.work.visual.functionDependencies = [];
  assert.deepEqual(validateFeatureDependencies(f.repo, f.work), []);
  f.work.visual.functionDependencies = 'bad';
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /必须为数组/);
});

test('只允许早期功能集合作为 V1 来源，避免与最终集成形成循环', (t) => {
  const f = fixture(t);
  f.put('source/work.json', { ...f.source, workItemType: 'INTEGRATION', integrationPurpose: 'feature' });
  assert.equal(validateFeatureDependencies(f.repo, f.work, f.inspect)[0].workItemId, 'feature');
  f.put('source/work.json', { ...f.source, workItemType: 'INTEGRATION', integrationPurpose: 'final' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /必须用于早期功能验证/);
});

test('拒绝项目、技术栈、工作项和显示对象错绑', (t) => {
  const f = fixture(t);
  f.put('source/work.json', { ...f.source, projectId: 'other' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /项目或技术栈/);
  f.put('source/work.json', { ...f.source, stack: 'unity' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /项目或技术栈/);
  f.put('source/work.json', { ...f.source, workItemId: f.work.workItemId });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /不能引用当前/);
  f.put('source/work.json', f.source);
  f.work.visual.objectId = 'missing';
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /未覆盖当前显示对象/);
});

test('不接受未通过、视觉来源、异步或伪造的来源检查', (t) => {
  const f = fixture(t);
  f.put('source/work.json', { ...f.source, globalState: 'IMPLEMENTING' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /尚未通过/);
  f.put('source/work.json', { ...f.source, workItemType: 'SCENE', visual: { stage: 'V5' } });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /无视觉阶段/);
  f.put('source/work.json', { ...f.source, visual: {} });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /无视觉阶段/);
  f.put('source/work.json', f.source);
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, () => ({ status: 'BLOCKED' })), /严格检查未通过/);
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, () => Promise.resolve({ status: 'PASS' })), /严格检查未通过/);
  assert.throws(() => validateFeatureDependencies(f.repo, f.work), /必须执行来源工作项严格检查/);
});

test('拒绝不存在、篡改或未计入来源清单的行为证据', (t) => {
  const f = fixture(t);
  f.work.visual.functionDependencies[0].evidenceRef = { path: 'missing.json', sha256: 'a'.repeat(64) };
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /不存在/);
  f.work.visual.functionDependencies[0].evidenceRef = f.evidenceRef;
  f.put('source/case.json', { ...f.evidence, status: 'FAIL' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /内容已变化/);
  f.put('source/case.json', f.evidence);
  f.put('source/manifest.json', { ...f.manifest, items: [] });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /未列入来源工作项/);
  f.put('source/manifest.json', { ...f.manifest, items: [{ path: f.evidenceRef.path, status: 'FAIL' }] });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /未列入来源工作项/);
});

test('证据行为范围、真实身份及通过状态必须一致', (t) => {
  const f = fixture(t);
  f.dependency.caseId = 'other';
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /行为范围或状态不匹配/);
  f.dependency.caseId = f.evidence.caseId;
  f.dependency.evidenceRef = f.put('source/case.json', { ...f.evidence, status: 'FAIL' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /行为范围或状态不匹配/);
  f.dependency.evidenceRef = f.put('source/case.json', { ...f.evidence, workItemId: 'other' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /来源、行为范围或状态不匹配/);
});

test('拒绝重复依赖、非法路径和不完整清单', (t) => {
  const f = fixture(t);
  f.work.visual.functionDependencies.push({ ...f.dependency });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /不得重复/);
  f.work.visual.functionDependencies.pop();
  f.dependency.workItemRef.path = '../outside.json';
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /不能越出项目/);
  f.dependency.workItemRef.path = 'source/work.json';
  f.put('source/manifest.json', { ...f.manifest, workItemId: 'other' });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /身份或内容不匹配/);
});

test('不同来源不得以相同行为标识覆盖同一对象的功能范围', (t) => {
  const f = fixture(t);
  const other = { ...f.source, workItemId: 'other-feature', evidenceRef: { path: 'other/manifest.json' } };
  const otherEvidence = f.put('other/case.json', { ...f.evidence, workItemId: other.workItemId });
  f.put('other/manifest.json', { ...f.manifest, workItemId: other.workItemId, items: [{ status: 'PASS', path: otherEvidence.path }] });
  f.put('other/work.json', other);
  f.work.visual.functionDependencies.push({ workItemRef: { path: 'other/work.json' }, caseId: f.dependency.caseId, evidenceRef: otherEvidence });
  assert.throws(() => validateFeatureDependencies(f.repo, f.work, f.inspect), /caseId 不得重复/);
});
