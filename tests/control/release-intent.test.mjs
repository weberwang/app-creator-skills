import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { assertFinalCompletion } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { assertReleaseTransition } from '../../skills/app-workflow-control/scripts/runtime/release-policy.mjs';
import { loadProfile } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';
import { initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';

/** 为 RELEASE 合同测试建立真实临时项目和必要的工程证据。 */
async function createReleaseFixture({ id, intent = 'prepare', includePreparation = true, resultOverrides = {}, materialOverrides = {} }) {
  const repo = await mkdtemp(resolve(tmpdir(), 'release-intent-'));
  const initialized = await initializeWork({ repo, args: {
    id, stack: 'flutter', type: 'RELEASE', 'release-intent': intent,
    objective: '验证发布准备与实际发布有独立证据边界',
  } });
  const workPath = initialized.metadata.workItemPath;
  const work = JSON.parse(await readFile(resolve(repo, ...workPath.split('/')), 'utf8'));
  const profile = loadProfile(repo, work.stack);
  work.globalState = intent === 'publish' ? 'RELEASING' : 'PASSED';
  for (const gate of ['F0', 'F1', 'F2', 'F3']) work.gateStatus[gate] = 'PASS';

  const packPath = `.workflow-control/implementation-packages/${id}.json`;
  const packageData = {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    workItemType: work.workItemType,
    executionUnits: [{
      unitId: 'release-preflight', sequence: 1, type: 'RELEASE', owner: 'release-owner',
      paths: ['lib/release.dart'], resultPath: `${work.evidenceRoot}/unit-result.json`,
      acceptanceCommands: ['node --version'],
    }],
  };
  await putJson(repo, packPath, packageData);
  work.implementationPackageRef = { path: packPath };

  const items = [];
  for (const category of profile.evidenceRequirements.engineering) {
    const path = `${work.evidenceRoot}/engineering-${category}.txt`;
    await put(repo, path, `已记录 ${category} 工程检查。\n`);
    items.push({ category, status: 'PASS', path });
  }
  const manifestPath = `.workflow-control/evidence/${id}/manifest.json`;
  work.evidenceRef = { path: manifestPath };

  if (includePreparation) {
    const resultPath = `${work.evidenceRoot}/release-preparation.json`;
    const deliverablePath = materialOverrides.deliverablePath ?? `${work.evidenceRoot}/release-readiness.md`;
    const evidencePath = materialOverrides.evidencePath ?? `${work.evidenceRoot}/release-checks.txt`;
    const result = {
      schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId,
      stack: work.stack, stageId: 'release', deliverablePath, evidencePath,
      ...resultOverrides,
    };
    await putJson(repo, resultPath, result);
    if (materialOverrides.writeDeliverable !== false && deliverablePath !== resultPath) {
      await put(repo, deliverablePath, materialOverrides.emptyDeliverable ? '' : '发布版本、目标平台和检查项已核对。\n');
    }
    if (materialOverrides.writeEvidence !== false) {
      await put(repo, evidencePath, materialOverrides.emptyEvidence ? '' : '配置校验：PASS\n');
    }
    items.push({ category: 'release-preparation', status: 'PASS', path: resultPath });
  }

  if (intent === 'publish') {
    work.action = {
      actionId: 'store-release', effects: ['publish'], target: 'production-store',
      approval: {
        workItemId: work.workItemId, stack: work.stack, stageId: work.stageId,
        actionId: 'store-release', effects: ['publish'], target: 'production-store',
        userMessageRef: 'chat://approved-release',
      },
    };
    work.gateStatus.F4 = 'PASS';
  }

  await putJson(repo, manifestPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: packPath, items,
  });
  await putJson(repo, workPath, work);
  return { repo, work, workPath, manifestPath };
}

/** 写入项目内普通文件并创建父目录。 */
async function put(repo, path, content) {
  const target = resolve(repo, ...path.split('/'));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  return path;
}

/** 写入格式化 JSON 夹具。 */
async function putJson(repo, path, value) {
  return put(repo, path, `${JSON.stringify(value, null, 2)}\n`);
}

test('prepare 无 publish 动作时可从 PASSED 完成', async (t) => {
  const fixture = await createReleaseFixture({ id: 'prepare-ready' });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  assert.equal(fixture.work.releaseIntent, 'prepare');
  assert.equal(assertReleaseTransition(fixture.work, { from: 'PASSED', to: 'COMPLETE' }), 'COMPLETE');
  const result = await transitionWork({ repo: fixture.repo, workItem: fixture.workPath, to: 'COMPLETE', args: {} });
  assert.equal(result.status, 'PASS');
  assert.equal(result.stage, 'release/COMPLETE');
  assert.equal(result.metadata.workflowView.completionKind, 'release-prepared');
});

test('prepare 拒绝 publish 动作以及批准等待和发布中状态', async () => {
  const work = { workItemType: 'RELEASE', releaseIntent: 'prepare', action: { effects: ['publish'] } };
  assert.throws(() => assertReleaseTransition(work, { from: 'PASSED', to: 'COMPLETE' }), /禁止包含 publish/);
  work.action = { effects: [] };
  assert.throws(() => assertReleaseTransition(work, { from: 'PASSED', to: 'RELEASE_APPROVAL_REQUIRED' }), /不允许进入/);
  assert.throws(() => assertReleaseTransition(work, { from: 'RELEASE_APPROVAL_REQUIRED', to: 'RELEASING' }), /不允许进入/);
  assert.throws(() => assertReleaseTransition(work, { from: 'RELEASING', to: 'BLOCKED' }), /不允许进入/);
});

test('prepare 缺少 PASS 的准备材料不能完成', async (t) => {
  const fixture = await createReleaseFixture({ id: 'prepare-no-material', includePreparation: false });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(fixture.repo, fixture.work), { code: 'RELEASE_PREPARATION_REQUIRED' });
});

test('prepare 结果跨工作项绑定时不能完成', async (t) => {
  const fixture = await createReleaseFixture({ id: 'prepare-cross-work', resultOverrides: { workItemId: 'another-work' } });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(fixture.repo, fixture.work), /未绑定当前准备工作项/);
});

test('prepare 空文件不能作为交付材料或检查证据', async (t) => {
  const fixture = await createReleaseFixture({ id: 'prepare-empty', materialOverrides: { emptyEvidence: true } });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(fixture.repo, fixture.work), { code: 'EMPTY_EVIDENCE' });
});

test('prepare 不能把 manifest 或结果 JSON 自身当作材料', async (t) => {
  const fixture = await createReleaseFixture({
    id: 'prepare-report-as-material',
    materialOverrides: { deliverablePath: '.workflow-control/evidence/prepare-report-as-material/release-preparation.json' },
  });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(fixture.repo, fixture.work), /控制记录/);

  const manifestFixture = await createReleaseFixture({
    id: 'prepare-manifest-as-material',
    materialOverrides: { evidencePath: '.workflow-control/evidence/prepare-manifest-as-material/manifest.json' },
  });
  t.after(() => rm(manifestFixture.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(manifestFixture.repo, manifestFixture.work), /控制记录/);
});

test('prepare 不能把 execution-state 或 execution-unit 结果作为材料', async (t) => {
  const fixture = await createReleaseFixture({
    id: 'prepare-machine-records',
    materialOverrides: {
      deliverablePath: '.workflow-control/evidence/prepare-machine-records/execution-state.json',
      evidencePath: '.workflow-control/evidence/prepare-machine-records/unit-result.json',
    },
  });
  t.after(() => rm(fixture.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(fixture.repo, fixture.work), /机器执行状态或单元结果文件/);
});

test('publish 缺少精确批准或真实结果时仍不能完成', async (t) => {
  const unapproved = await createReleaseFixture({ id: 'publish-unapproved', intent: 'publish' });
  t.after(() => rm(unapproved.repo, { recursive: true, force: true }));
  unapproved.work.action.approval = null;
  assert.throws(() => assertFinalCompletion(unapproved.repo, unapproved.work), { code: 'APPROVAL_REQUIRED' });

  const noResult = await createReleaseFixture({ id: 'publish-no-result', intent: 'publish', includePreparation: false });
  t.after(() => rm(noResult.repo, { recursive: true, force: true }));
  assert.throws(() => assertFinalCompletion(noResult.repo, noResult.work), { code: 'RELEASE_RESULT_REQUIRED' });
});
