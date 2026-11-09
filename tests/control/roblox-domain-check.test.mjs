/** 在真实公共证据入口验证 Roblox 合成材料的分派；夹具不能证明 Studio 已运行。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeWork, loadWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { assertReadyToPass, validateEvidence } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { createRobloxFixture, writeRobloxFixture } from '../helpers/roblox-fixture.mjs';

/** 将领域夹具接到真实初始化的公共工作项、实施包及证据清单上。 */
async function controllerFixture(t, options = {}) {
  const fixture = createRobloxFixture(t, options);
  const { repo, work, pack, manifest } = fixture;
  const created = await initializeWork({ repo, args: {
    id: work.workItemId, stack: 'roblox', type: work.workItemType, objective: '验证 Roblox 公共门合成分派',
    'project-id': work.projectId, 'object-id': 'object-a',
    ...(work.workItemType === 'INTEGRATION' ? { 'integration-purpose': 'feature' } : {}),
  } });
  const initialized = loadWork(repo, created.metadata.workItemPath);
  Object.assign(work, { ...initialized, ...work, gateStatus: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, 'PASS'])) });
  if (work.workItemType === 'SCENE') {
    // 公共场景始终使用目标数组，V1 不需要提前创建视觉候选和人工确认。
    work.visual = { ...initialized.visual, stage: options.stage ?? 'V1' };
    pack.executionUnits[0].type = 'SCENE';
  }
  if (work.visual) pack.visualStage = work.visual.stage;
  writeRobloxFixture(repo, work.implementationPackageRef.path, pack);
  const manifestPath = `${work.evidenceRoot}/manifest.json`;
  work.evidenceRef = { path: manifestPath };
  writeRobloxFixture(repo, manifestPath, manifest);
  fixture.save();
  return { ...fixture, workPath: created.metadata.workItemPath };
}

for (const workItemType of ['FOUNDATION', 'MODULE', 'INTEGRATION']) {
  /** 非视觉工作项也必须通过原生工程门，不能只靠类别及文件存在通过。 */
  test(`${workItemType} 的公共证据入口核对 Roblox 原生材料`, async (t) => {
    const fixture = await controllerFixture(t, { workItemType });
    assert.equal(validateEvidence(fixture.repo, fixture.work).manifest.stack, 'roblox');
    fixture.doc.studio.studioId = 'unrelated-studio';
    fixture.save();
    assert.throws(() => validateEvidence(fixture.repo, fixture.work), /Roblox 工程领域校验未通过/);
  });
}

test('SCENE 的 V1 完成门拒绝只有源码、状态查询或自填 PASS 的材料', async (t) => {
  const fixture = await controllerFixture(t, { workItemType: 'SCENE', stage: 'V1' });
  assert.doesNotThrow(() => assertReadyToPass(fixture.repo, fixture.work));
  const statusOnly = fixture.capture({ context: 'Server', toolName: 'get_studio_state' });
  fixture.doc.checks[0].captureRef = statusOnly.ref;
  fixture.save();
  assert.throws(() => assertReadyToPass(fixture.repo, fixture.work), /Roblox 工程领域校验未通过/);
  fixture.doc.checks[0].captureRef = fixture.runtime.ref;
  fixture.doc.checks[0].expected = '未发生的规则结果';
  fixture.save();
  assert.throws(() => assertReadyToPass(fixture.repo, fixture.work), /Roblox 工程领域校验未通过/);
});

test('公共门拒绝将离线校验输出作为实际 Roblox 运行记录', async (t) => {
  const fixture = await controllerFixture(t);
  fixture.runtime.record.origin = 'offline-validator';
  fixture.runtime.ref = writeRobloxFixture(fixture.repo, fixture.runtime.ref.path, fixture.runtime.record);
  fixture.doc.checks[0].captureRef = fixture.runtime.ref;
  fixture.save();
  assert.throws(() => validateEvidence(fixture.repo, fixture.work), /离线|合成|真实 Studio/);
});

test('公共门拒绝工程来源脱离执行单元与正式 Place 文件变化', async (t) => {
  const fixture = await controllerFixture(t);
  fixture.pack.executionUnits[0].paths = ['src/**'];
  writeRobloxFixture(fixture.repo, fixture.work.implementationPackageRef.path, fixture.pack);
  assert.throws(() => validateEvidence(fixture.repo, fixture.work), /正式源不在实施单元/);
  fixture.pack.executionUnits[0].paths = ['places/**', 'src/**'];
  writeRobloxFixture(fixture.repo, fixture.work.implementationPackageRef.path, fixture.pack);
  writeRobloxFixture(fixture.repo, fixture.snapshotRef.path, '不同候选的 Place 合成内容');
  assert.throws(() => validateEvidence(fixture.repo, fixture.work), /SHA-256/);
});
