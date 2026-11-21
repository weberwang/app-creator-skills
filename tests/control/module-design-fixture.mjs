import { advanceVisual } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { createQualityChecks, frozenReview, prepareFormalVisualFixture, put, putJson, putVisualReview,
  readWork, reviewRecord, runEngineeringStage } from './controller-fixture.mjs';
import { moduleDesignItems } from './module-rules-fixture.mjs';
import { writeSingleDomainFixture } from './single-domain-fixture.mjs';
import { syntheticDesignPng } from './visual-image-fixture.mjs';

/** 为测试项目绑定本轮 V1 条目、已选设计目标与对应的 V2 合成确认。 */
export async function confirmModuleDesignFixture(repo, work, targets) {
  const plan = await readWork(repo, work.visual.modulePlanRef.path);
  const entries = moduleDesignItems(plan).map((item, index) => ({ ...item, ...targets[index % targets.length] }));
  // 多张合成稿都必须有归属，目标多于测试条目时由同一条目承载附加目标。
  if (targets.length > entries.length) entries[0].additionalTargets = targets.slice(entries.length);
  const prefix = `fixtures/${work.workItemId}`;
  const designPath = `${prefix}/module-design.json`;
  await putJson(repo, designPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, modulePlanRef: work.visual.modulePlanRef,
    baselineRef: work.globalVisualBaselineRef, entries,
  });
  work.visual.moduleDesignRef = await frozenReview(repo, designPath);
  const reviewPath = `${prefix}/module-review.json`;
  await putJson(repo, reviewPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stage: 'V2', decision: 'approved',
    userMessageRef: 'test-message://module-design', subjectRef: work.visual.moduleDesignRef,
  });
  work.visual.moduleDesignReviewRef = await frozenReview(repo, reviewPath);
}

/** 为 Flutter 模块建立真实冻结方案并确认 V2，进入 V4 资源准备。 */
export async function prepareFlutterModuleV4({ repo, workPath }) {
  await prepareFormalVisualFixture({ repo, workPath });
  await advanceVisual({ repo, workItem: workPath, to: 'V2' });
  let work = await readWork(repo, workPath);
  const prefix = `fixtures/${work.workItemId}/stages`;
  work.visual.candidateId = 'direction-a';
  const targetPath = await put(repo, `${prefix}/target.png`, syntheticDesignPng(work.workItemId));
  const reviewPath = `${prefix}/target-review.json`;
  const checks = await createQualityChecks(repo, `${prefix}/quality`);
  await putVisualReview(repo, reviewPath, { ...reviewRecord({ objectId: work.visual.objectId,
    candidateId: work.visual.candidateId, stage: 'V2', purpose: 'target',
    userMessageRef: 'test://module-target', targetRef: targetPath, qualityChecks: checks }),
    scope: { kind: 'full-object', designItemIds: [], conditionIds: [] } }, work.workItemId, targetPath);
  work.visual.reviews.V2 = await frozenReview(repo, reviewPath);
  await writeSingleDomainFixture(repo, work, 'V3');
  const v3DomainRef = work.visual.domainEvidenceRef;
  const v3Domain = await readWork(repo, v3DomainRef.path);
  const v2Path = `${prefix}/domain-v2.json`;
  await putJson(repo, v2Path, { ...v3Domain, visualStage: 'V2' });
  work.visual.domainEvidenceRef = await frozenReview(repo, v2Path);
  await confirmModuleDesignFixture(repo, work, [{ targetRef: v3Domain.referenceTarget, designRef: v3Domain.figmaDesignRef }]);
  await putJson(repo, workPath, work);
  await advanceVisual({ repo, workItem: workPath, to: 'V3' });
  work = await readWork(repo, workPath);
  work.visual.domainEvidenceRef = v3DomainRef;
  await putJson(repo, workPath, work);
  await advanceVisual({ repo, workItem: workPath, to: 'V4' });
  return await readWork(repo, workPath);
}

/** 完成 V4 正式执行和资源验收后进入 V5，供后续执行回归用例复用。 */
export async function prepareFlutterModuleV5(context, { beforeAdvance } = {}) {
  const { repo, workPath } = context;
  const work = await prepareFlutterModuleV4(context);
  const prefix = `fixtures/${work.workItemId}/stages`;
  const component = await put(repo, `lib/${work.workItemId}-component.dart`, 'class FixtureComponent {}\n');
  const evidence = await put(repo, `${work.evidenceRoot}/component-check.txt`, '合成组件检查\n');
  const assetPath = `${prefix}/asset-review.json`;
  await putJson(repo, assetPath, { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    visualStage: 'V4', candidateId: work.visual.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS',
    userMessageRef: 'test://assets', qualityChecks: await createQualityChecks(repo, `${prefix}/asset-quality`),
    assets: [{ assetId: 'fixture-component', assetType: 'native-component', output: component, componentEvidenceRef: evidence }] });
  work.assetReviewRef = await frozenReview(repo, assetPath);
  const reviewPath = `${prefix}/asset-stage-review.json`;
  await putJson(repo, reviewPath, reviewRecord({ objectId: work.visual.objectId, candidateId: work.visual.candidateId,
    stage: 'V4', purpose: 'imported-assets', userMessageRef: 'test://assets' }));
  work.visual.reviews.V4 = await frozenReview(repo, reviewPath);
  await writeSingleDomainFixture(repo, work, 'V4');
  await putJson(repo, workPath, work);
  const passed = await runEngineeringStage(context, 'V4');
  if (beforeAdvance) await beforeAdvance(passed);
  await advanceVisual({ repo, workItem: workPath, to: 'V5' });
  return await readWork(repo, workPath);
}
