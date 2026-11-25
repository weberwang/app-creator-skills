import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { collectWorkReferencePaths, validateGlobalBaseline } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { assertFoundationVisual } from '../../skills/app-workflow-control/scripts/runtime/foundation-visual.mjs';
import { prepareWorkRecords } from '../../skills/app-workflow-control/scripts/runtime/records.mjs';
import { collectVisualResearchPaths, validateVisualResearch } from '../../skills/app-workflow-control/scripts/runtime/visual-research.mjs';
import { completeUnit, loadWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { createFixture, createQualityChecks, frozenReview, put, putJson, readWork, reviewRecord } from './controller-fixture.mjs';
import { createSystemCoverage } from './system-coverage-fixture.mjs';
import { visualResearchFixture } from './visual-research-fixture.mjs';

/** 创建原有全局图片方向证据，缺失项只来自被测调研合同。 */
async function prepareBaseline(repo, work) {
  const checks = await createQualityChecks(repo, 'research-test/quality');
  const candidates = await Promise.all(['a', 'b', 'c'].map(async (candidateId) => ({
    candidateId, path: await put(repo, `research-test/candidate-${candidateId}.png`, `合成候选 ${candidateId}`), qualityChecks: checks,
  })));
  const selected = await frozenReview(repo, candidates[0].path);
  const reviewPath = await putJson(repo, 'research-test/selection.json', {
    ...reviewRecord({ objectId: 'direction', stage: 'BASELINE', purpose: 'visual-baseline', userMessageRef: 'test://selected',
      targetRef: selected.path, candidateId: 'a', qualityChecks: checks }),
    targetSha256: selected.sha256,
  });
  return { schemaVersion: '1.0', baselineId: 'direction', projectId: work.projectId, stack: work.stack,
    candidates, selectedCandidateId: 'a', selectionReviewRef: await frozenReview(repo, reviewPath) };
}

/** 在正常控制器迁移入口绑定基础视觉清单，模拟选稿之后的冻结检查。 */
async function fixture(t) {
  const { repo, workPath } = await createFixture({ id: 'research-foundation', stack: 'cocos' });
  t.after(() => rm(repo, { recursive: true, force: true }));
  const work = await readWork(repo, workPath);
  work.globalState = 'BASELINE';
  work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
  const baseline = await prepareBaseline(repo, work);
  /** 每个负例只更换调研记录，其余基线保持可验。 */
  async function bind(document, path = 'research-test/baseline.json') {
    const baselinePath = await putJson(repo, path, document);
    const manifestPath = await putJson(repo, 'research-test/foundation.json', {
      schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, foundationWorkItemPath: workPath,
      baselines: [{ route: 'image', ref: await frozenReview(repo, baselinePath) }],
    });
    work.foundationVisualRef = await frozenReview(repo, manifestPath);
    await putJson(repo, workPath, work);
  }
  /** 验证拒绝门禁时不前进、不写工作项。 */
  async function reject(expected) {
    const before = await readFile(resolve(repo, workPath));
    await assert.rejects(transitionWork({ repo, workItem: workPath, to: 'PROPOSAL', args: {} }), expected);
    assert.deepEqual(await readFile(resolve(repo, workPath)), before);
  }
  return { repo, workPath, work, baseline, bind, reject };
}

test('全局视觉的公开推进门禁分别拒绝缺调研、缺参考和错项目', async (t) => {
  const f = await fixture(t);
  const { repo, work, baseline } = f;
  await f.bind(baseline);
  await f.reject(/全局视觉产品调研与美术参考.*路径/);
  const original = visualResearchFixture(repo, work.projectId, work.stack);
  const research = await readWork(repo, original.path);
  for (const [document, expected] of [
    [{ ...research, productResearch: { market: research.productResearch.market } }, /产品调研 competitor 结论/],
    [{ ...research, artReferences: [] }, /缺少美术设定参考/],
    [{ ...research, projectId: 'wrong-project' }, /项目、技术栈或版本/],
    [{ ...research, artReferences: [{ ...research.artReferences[0], applicability: ' ' }] }, /当前适用依据/],
    [{ ...research, artReferences: [{ ...research.artReferences[0], source: { url: 'file:///result.png' } }] }, /必须引用公开来源链接或冻结文件/],
  ]) {
    const path = await putJson(repo, 'research-test/incomplete.json', document);
    await f.bind({ ...baseline, visualResearchRef: await frozenReview(repo, path) });
    await f.reject(expected);
  }
  // 准备和执行入口先核对已绑定的调研，再读取或写入实施记录。
  await assert.rejects(prepareWorkRecords({ repo, workItem: f.workPath, planPath: 'missing-plan.json' }), /美术设定参考/);
  f.work.globalState = 'IMPLEMENTING';
  await putJson(repo, f.workPath, f.work);
  await assert.rejects(completeUnit({ repo, workItem: f.workPath, resultPath: 'missing-result.json' }), /美术设定参考/);
});

test('新全局方向可复用现有研究和美术参考，引用失效会重新阻断', async (t) => {
  const f = await fixture(t);
  const { repo, workPath, work, baseline } = f;
  const original = visualResearchFixture(repo, work.projectId, work.stack);
  const research = await readWork(repo, original.path);
  const referencePath = await put(repo, 'research-test/art-reference.md', '合成素材造型的观察记录');
  const fileRef = await frozenReview(repo, referencePath);
  research.artReferences[0].source = { fileRef };
  const researchPath = await putJson(repo, 'research-test/research.json', research);
  const researchRef = await frozenReview(repo, researchPath);
  const originalBaselinePath = await putJson(repo, 'research-test/earlier-baseline.json', { ...baseline, visualResearchRef: researchRef });
  const earlier = await readWork(repo, originalBaselinePath);
  // 新版本引用此前已经冻结的调研清单，当前仍按实际本地内容复核。
  await f.bind({ ...baseline, visualResearchRef: earlier.visualResearchRef }, 'research-test/current-baseline.json');
  assert(collectWorkReferencePaths(work, repo).includes(referencePath));
  await put(repo, referencePath, '修改后的来源');
  await f.reject(/美术设定参考第 1 项来源.*重新冻结/);
  await put(repo, referencePath, '合成素材造型的观察记录');
  await transitionWork({ repo, workItem: workPath, to: 'PROPOSAL', args: {} });
  assert.equal((await readWork(repo, workPath)).globalState, 'PROPOSAL');
});

test('冻结基线可读取调研补充，同时保护补充记录与真实来源', async (t) => {
  const f = await fixture(t);
  const { repo, workPath, work, baseline } = f;
  await f.bind(baseline);
  const baselineRef = await frozenReview(repo, 'research-test/baseline.json');
  const original = visualResearchFixture(repo, work.projectId, work.stack);
  const research = await readWork(repo, original.path);
  const artPath = await put(repo, 'research-test/frozen-art.md', '同一方向的美术参考');
  research.artReferences[0].source = { fileRef: await frozenReview(repo, artPath) };
  const researchPath = await putJson(repo, 'research-test/supplemented-research.json', { ...research, basisRef: baselineRef });
  const visualResearchRef = await frozenReview(repo, researchPath);
  const supplementPath = 'research-test/baseline.research-supplement.json';
  const supplement = { schemaVersion: '1.0', baselineRef, visualResearchRef };

  await putJson(repo, supplementPath, { ...supplement, baselineRef: { ...baselineRef, sha256: '0'.repeat(64) } });
  await f.reject(/调研补充.*baselineRef/);
  await putJson(repo, supplementPath, supplement);
  const protectedPaths = collectWorkReferencePaths(work, repo);
  for (const path of [supplementPath, researchPath, artPath]) assert(protectedPaths.includes(path));

  await putJson(repo, researchPath, { ...research, basisRef: { ...baselineRef, sha256: '0'.repeat(64) } });
  await f.reject(/调研清单内容已变化/);
  const wrongResearchRef = await frozenReview(repo, researchPath);
  await putJson(repo, supplementPath, { ...supplement, visualResearchRef: wrongResearchRef });
  await f.reject(/调研.*basisRef/);
  await putJson(repo, researchPath, { ...research, basisRef: baselineRef });
  await putJson(repo, supplementPath, supplement);
  await transitionWork({ repo, workItem: workPath, to: 'PROPOSAL', args: {} });
  assert.equal((await readWork(repo, workPath)).globalState, 'PROPOSAL');
  assert.deepEqual(await frozenReview(repo, baselineRef.path), baselineRef);
});

/** 创建已冻结基线及反向绑定的调研清单，全部引用均使用真实文件摘要。 */
async function supplementFixture(t, { nullRef = false } = {}) {
  const f = await fixture(t);
  const { repo, work, baseline } = f;
  await f.bind(nullRef ? { ...baseline, visualResearchRef: null } : baseline);
  const baselineRef = await frozenReview(repo, 'research-test/baseline.json');
  const original = visualResearchFixture(repo, work.projectId, work.stack);
  const research = await readWork(repo, original.path);
  const artPath = await put(repo, 'research-test/local-art.md', '冻结的本地美术来源');
  research.artReferences[0].source = { fileRef: await frozenReview(repo, artPath) };
  research.basisRef = baselineRef;
  const researchPath = await putJson(repo, 'research-test/research.json', research);
  const supplementPath = 'research-test/baseline.research-supplement.json';
  const supplement = { schemaVersion: '1.0', baselineRef, visualResearchRef: await frozenReview(repo, researchPath) };
  await putJson(repo, supplementPath, supplement);
  work.globalVisualBaselineRef = baselineRef;
  await putJson(repo, f.workPath, work);
  return { ...f, baselineRef, research, researchPath, artPath, supplementPath, supplement };
}

test('冻结基线补充通过直接校验、基础工程、控制器检查和返修恢复', async (t) => {
  for (const nullRef of [false, true]) {
    const f = await supplementFixture(t, { nullRef });
    const { repo, workPath, baselineRef, supplementPath } = f;
    const baselineBytes = await readFile(resolve(repo, baselineRef.path));
    const baselineWork = { projectId: f.work.projectId, stack: f.work.stack, workItemType: 'SCENE',
      visual: { stage: 'V1', designRoute: 'image' }, globalVisualBaselineRef: baselineRef };
    assert.doesNotThrow(() => validateGlobalBaseline(repo, baselineWork, { required: true }));
    const foundation = loadWork(repo, workPath);
    assert.doesNotThrow(() => assertFoundationVisual(repo, foundation, { loadWork, validateGlobalBaseline }));
    assert.deepEqual(collectVisualResearchPaths(repo, baselineRef), [supplementPath, f.researchPath, f.artPath]);

    const cli = resolve('skills/app-workflow-control/scripts/workflow-control.mjs');
    const check = spawnSync(process.execPath, [cli, 'check', '--repo', repo, '--work-item', workPath], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr || check.stdout);
    assert.equal(JSON.parse(check.stdout).status, 'PASS');
    await transitionWork({ repo, workItem: workPath, to: 'PROPOSAL', args: {} });
    const proposal = await readWork(repo, workPath);
    proposal.gateStatus.F2 = 'PASS';
    await putJson(repo, workPath, proposal);
    await transitionWork({ repo, workItem: workPath, to: 'REVIEW', args: {} });
    await transitionWork({ repo, workItem: workPath, to: 'RETURN', args: { reason: '修复实现问题', 'affected-scope': 'implementation' } });
    const resumed = spawnSync(process.execPath, [cli, 'transition', '--repo', repo, '--work-item', workPath,
      '--to', 'REVIEW', '--return-resolution', '已处理实现问题'], { encoding: 'utf8' });
    assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
    assert.equal(JSON.parse(resumed.stdout).status, 'PASS');
    assert.equal((await readWork(repo, workPath)).globalState, 'REVIEW');
    assert.deepEqual(await readFile(resolve(repo, baselineRef.path)), baselineBytes);
  }
});

test('基线自身调研优先，且声明的反向绑定须通过文件身份校验', async (t) => {
  const f = await fixture(t);
  const { repo, baseline, work } = f;
  const researchRef = visualResearchFixture(repo, work.projectId, work.stack);
  await f.bind({ ...baseline, visualResearchRef: researchRef });
  const baselineRef = await frozenReview(repo, 'research-test/baseline.json');
  await put(repo, 'research-test/baseline.research-supplement.json', '{ 损坏的补充记录');
  const document = await readWork(repo, baselineRef.path);
  assert.doesNotThrow(() => validateVisualResearch(repo, document, baselineRef));
  assert.deepEqual(collectVisualResearchPaths(repo, baselineRef), [researchRef.path]);

  const research = await readWork(repo, researchRef.path);
  research.basisRef = { ...baselineRef, path: 'research-test//baseline.json' };
  const path = await putJson(repo, 'research-test/direct-research.json', research);
  document.visualResearchRef = await frozenReview(repo, path);
  assert.doesNotThrow(() => validateVisualResearch(repo, document, baselineRef));
  assert.doesNotThrow(() => validateVisualResearch(repo, document));
  const other = await put(repo, 'research-test/other-baseline.json', await readFile(resolve(repo, baselineRef.path)));
  research.basisRef = await frozenReview(repo, other);
  await putJson(repo, path, research);
  document.visualResearchRef = await frozenReview(repo, path);
  assert.throws(() => validateVisualResearch(repo, document, baselineRef), { name: 'WorkflowError' });
  assert.doesNotThrow(() => validateVisualResearch(repo, document));
  research.basisRef.sha256 = '0'.repeat(64);
  await putJson(repo, path, research);
  document.visualResearchRef = await frozenReview(repo, path);
  assert.throws(() => validateVisualResearch(repo, document), { name: 'WorkflowError' });
});

test('补充记录、调研清单和本地来源分别受到实施计划写入保护', async (t) => {
  const f = await supplementFixture(t);
  const { repo, work, workPath, baselineRef, supplementPath, researchPath, artPath } = f;
  const paths = collectVisualResearchPaths(repo, baselineRef);
  assert.deepEqual(paths, [supplementPath, researchPath, artPath]);
  for (const path of paths) {
    const units = [{ unitId: 'write', owner: 'test', paths: [path], acceptanceCommands: ['node --version'] }];
    const plan = { executionUnits: units, systemCoverage: createSystemCoverage(repo, work, units) };
    const planPath = await putJson(repo, 'research-test/plan.json', plan);
    const before = await readFile(resolve(repo, path));
    await assert.rejects(prepareWorkRecords({ repo, workItem: workPath, planPath }), /执行单元路径不能覆盖工作流控制记录/);
    assert.deepEqual(await readFile(resolve(repo, path)), before);
  }
});

test('补充记录缺失、损坏、错绑或引用被篡改时拒绝基线校验', async (t) => {
  const f = await supplementFixture(t);
  const { repo, baselineRef, baseline, research, researchPath, supplementPath, supplement } = f;
  const document = { ...baseline };
  const check = () => validateVisualResearch(repo, document, baselineRef);
  const assertInvalid = () => assert.throws(check, { name: 'WorkflowError' });
  await rm(resolve(repo, supplementPath));
  assert.deepEqual(collectVisualResearchPaths(repo, baselineRef), []);
  assert.throws(check, /全局视觉产品调研与美术参考.*路径/);
  await put(repo, supplementPath, '{ 非法 JSON');
  assertInvalid();
  assert.throws(() => collectVisualResearchPaths(repo, baselineRef), { name: 'WorkflowError' });
  await putJson(repo, supplementPath, { ...supplement, schemaVersion: '2.0' });
  assertInvalid();
  const otherPath = await put(repo, 'research-test/other.json', await readFile(resolve(repo, baselineRef.path)));
  await putJson(repo, supplementPath, { ...supplement, baselineRef: await frozenReview(repo, otherPath) });
  assertInvalid();
  await putJson(repo, supplementPath, { ...supplement, baselineRef: { ...baselineRef, sha256: '0'.repeat(64) } });
  assertInvalid();
  await putJson(repo, supplementPath, { ...supplement, visualResearchRef: { ...supplement.visualResearchRef, sha256: '0'.repeat(64) } });
  assertInvalid();
  await putJson(repo, researchPath, { ...research, artReferences: [] });
  await putJson(repo, supplementPath, { ...supplement, visualResearchRef: await frozenReview(repo, researchPath) });
  assert.throws(check, /缺少美术设定参考/);
  await putJson(repo, researchPath, { ...research, basisRef: await frozenReview(repo, otherPath) });
  await putJson(repo, supplementPath, { ...supplement, visualResearchRef: await frozenReview(repo, researchPath) });
  assertInvalid();
});
