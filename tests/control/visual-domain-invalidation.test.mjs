import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validateFlutterDesign } from '../../skills/app-workflow-control/scripts/runtime/flutter-design-contract.mjs';
import { attachFlutterDesignFixture, writeDesignFixture } from './flutter-design-fixture.mjs';
import { createFixture, putJson, readWork } from './controller-fixture.mjs';

/** 建立具备冻结 Flutter 领域材料的合成页面，测试数据不代表真实人工验收。 */
async function fixture(t) {
  const f = await createFixture({ id: 'domain-return', type: 'PAGE' });
  t.after(() => rm(f.repo, { recursive: true, force: true }));
  const work = await readWork(f.repo, f.workPath);
  Object.assign(work, { globalState: 'REVIEW' });
  Object.assign(work.visual, { stage: 'V5', candidateId: 'candidate-a', reviews: {} });
  const doc = { visualStage: 'V5', referenceTarget: writeDesignFixture(f.repo, 'target.txt', '合成目标'), layoutSpecRef: writeDesignFixture(f.repo, 'layout.yaml', '合成布局') };
  attachFlutterDesignFixture(f.repo, work, doc);
  work.visual.domainEvidenceRef = writeDesignFixture(f.repo, 'domain-old.json', doc);
  await putJson(f.repo, f.workPath, work);
  return { ...f, work, doc };
}

test('实现 RETURN 后新封套不能引用旧还原记录或旧组合对照', async (t) => {
  const f = await fixture(t);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'RETURN', args: { reason: '修复当前组件', 'affected-scope': 'implementation' } });
  const returned = await readWork(f.repo, f.workPath);
  const invalid = new Set(returned.invalidatedRefs.map((item) => item.path));
  for (const ref of [...f.doc.implementationEvidenceRefs, f.doc.comparisonRef]) {
    assert.ok(invalid.has(ref.path));
    assert.ok((await readFile(resolve(f.repo, ref.path))).length);
  }
  const comparison = JSON.parse(await readFile(resolve(f.repo, f.doc.comparisonRef.path), 'utf8'));
  for (const ref of [comparison.cases[0].runtimeRef, comparison.cases[0].captureRef]) {
    assert.ok(invalid.has(ref.path));
    assert.ok((await readFile(resolve(f.repo, ref.path))).length);
  }
  for (const ref of [f.doc.designReconstructionRef, f.doc.layoutSpecRef, f.doc.referenceTarget]) assert.ok(!invalid.has(ref.path));
  const freshEnvelope = writeDesignFixture(f.repo, 'domain-new.json', f.doc);
  returned.visual.domainEvidenceRef = freshEnvelope;
  const newDoc = JSON.parse(await readFile(resolve(f.repo, freshEnvelope.path), 'utf8'));
  assert.throws(() => validateFlutterDesign(f.repo, returned, 'V5', newDoc), /实现证据.*RETURN 已作废/);
  // 换新实现证据后独立检验组合对照，不能被前一个错误掩盖。
  const oldReport = JSON.parse(await readFile(resolve(f.repo, newDoc.implementationEvidenceRefs[0].path), 'utf8'));
  const raw = JSON.parse(await readFile(resolve(f.repo, oldReport.executionRef.path), 'utf8'));
  assert.ok(invalid.has(oldReport.executionRef.path));
  newDoc.implementationEvidenceRefs = [writeDesignFixture(f.repo, 'fresh-report-with-old-output.json', oldReport)];
  assert.throws(() => validateFlutterDesign(f.repo, returned, 'V5', newDoc), /检查原始输出.*RETURN 已作废/);
  oldReport.executionRef = writeDesignFixture(f.repo, 'fresh-output.json', raw);
  newDoc.implementationEvidenceRefs = [writeDesignFixture(f.repo, 'fresh-report.json', oldReport)];
  const asset = JSON.parse(await readFile(resolve(f.repo, returned.assetReviewRef.path), 'utf8'));
  asset.assets[0].implementationEvidenceRef = newDoc.implementationEvidenceRefs[0];
  asset.assets[0].componentEvidenceRef = newDoc.implementationEvidenceRefs[0].path;
  returned.assetReviewRef = writeDesignFixture(f.repo, 'fresh-asset-review.json', asset);
  const review = JSON.parse(await readFile(resolve(f.repo, returned.visual.reviews.V4.path), 'utf8'));
  review.assetReviewRef = returned.assetReviewRef;
  returned.visual.reviews.V4 = writeDesignFixture(f.repo, 'fresh-v4-review.json', review);
  assert.throws(() => validateFlutterDesign(f.repo, returned, 'V5', newDoc), /当前组合对照.*RETURN 已作废/);
});

test('V3 RETURN 作废设计与布局，摘要损坏时不信任封套内部路径', async (t) => {
  const f = await fixture(t);
  await transitionWork({ repo: f.repo, workItem: f.workPath, to: 'RETURN', args: { reason: '拆解不完整', 'affected-scope': 'visual:V3' } });
  const returned = await readWork(f.repo, f.workPath);
  const invalid = new Set(returned.invalidatedRefs.map((item) => item.path));
  for (const ref of [f.doc.designReconstructionRef, f.doc.layoutSpecRef, ...f.doc.implementationEvidenceRefs, f.doc.comparisonRef]) {
    assert.ok(invalid.has(ref.path));
    assert.ok((await readFile(resolve(f.repo, ref.path))).length);
  }
  assert.ok(!invalid.has(f.doc.referenceTarget.path));
  const g = await fixture(t);
  await putJson(g.repo, 'domain-old.json', { comparisonRef: { path: 'untrusted.json', sha256: 'a'.repeat(64) } });
  await transitionWork({ repo: g.repo, workItem: g.workPath, to: 'RETURN', args: { reason: '封套损坏', 'affected-scope': 'visual:V3' } });
  const damaged = await readWork(g.repo, g.workPath);
  assert.ok(damaged.invalidatedRefs.some((item) => item.path === 'domain-old.json'));
  assert.ok(!damaged.invalidatedRefs.some((item) => item.path === 'untrusted.json'));
});
