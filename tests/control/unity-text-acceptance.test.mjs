import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { validateUnityTextStage } from '../../skills/app-workflow-control/scripts/runtime/unity-text-stage.mjs';
import { verifyApprovedUnityTextTrial } from '../../skills/app-workflow-control/scripts/runtime/unity-text-acceptance.mjs';
import { unityGameViewCaptureFixture, unityLayoutFixture, unityLayoutMeasurement } from './unity-text-fixture.mjs';
import { formalIntegrationFixture } from './v4-formal-integration-fixture.mjs';

/** 以真实文件摘要建立 Unity 同一目标、用户决议和原生试装采集。 */
function fixture(t, { withText = true } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'unity-text-acceptance-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 测试证据都落盘并绑定实际文件内容。 */
  function save(path, value) {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    const file = join(repo, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const referenceTarget = save('visual/target.png', '冻结目标');
  const screenshot = save('visual/confirmed.png', '用户确认的试装截图');
  const work = { workItemId: 'work', projectId: 'project', workItemType: 'SCENE', stack: 'unity',
    evidenceRoot: 'evidence', visual: { objectId: 'Main' } };
  const target = { targetId: 'view', candidateId: 'candidate', sceneId: 'Main', stateId: 'default', referenceTarget };
  const layout = unityLayoutFixture(save, target, { prefix: 'docs/layout', withText });
  const reviewRef = save('docs/v4-review.json', { schemaVersion: '1.0', workItemId: 'work', objectId: 'Main',
    targetId: 'view', candidateId: 'candidate', stage: 'V4', purpose: 'imported-assets', decision: 'APPROVED',
    userMessageRef: 'chat:conversation/message:review', referenceTarget, targetRef: screenshot.path, targetSha256: screenshot.sha256 });
  target.reviews = { V4: reviewRef, V3Layout: save('docs/v3-layout.json', { layoutSpecRef: layout.planRef }) };
  const identity = { stack: 'unity', workItemId: 'work', targetId: 'view', sceneId: 'Main', stateId: 'default', candidateId: 'candidate', referenceTarget };
  const approval = { schemaVersion: '1.0', stack: 'unity', workItemId: 'work', targetId: 'view', candidateId: 'candidate',
    reviewRef, scope: 'accept-v4-text-trial', decision: 'APPROVED', userMessageRef: 'chat:conversation/message:authorization' };
  const report = unityLayoutMeasurement(layout.plan, layout.planRef, { workItemId: 'work', candidateId: 'candidate', outputPath: 'evidence/v4-text.json' });
  report.textOnly = true;
  report.formalIntegration = formalIntegrationFixture(repo, layout.plan.scenePath);
  const review = { schemaVersion: '1.0', workItemId: 'work', stack: 'unity', visualStage: 'V4', candidateId: 'candidate',
    technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: 'chat:conversation/message:review',
    assets: [{ assetId: 'scene', assetType: 'native-component', output: layout.plan.scenePath }] };
  const decision = { schemaVersion: 'visual-text-acceptance/1.0', ...identity, reviewRef, acceptedScreenshot: screenshot,
    userMessageRef: review.userMessageRef, ruleApprovalRef: save('docs/authorization.json', approval) };
  /** 单独冻结决议，便于模拟引用同一截图但采集报告被篡改。 */
  function bindDecision() {
    review.textAcceptanceRef = save('docs/decision.json', decision);
    target.assetReviewRef = save('docs/assets.json', review);
  }
  /** 每次修改测试文件后重新冻结引用，单独测试身份约束。 */
  function bind() {
    review.textRestorationRef = save(report.outputPath, report);
    decision.textRestorationRef = review.textRestorationRef;
    decision.gameViewCaptureRef = unityGameViewCaptureFixture(save, screenshot, review.textRestorationRef, report, Buffer.byteLength('用户确认的试装截图'));
    bindDecision();
  }
  bind();
  const native = { responsiveContract: { uiSystem: 'UGUI' } };
  const finalReport = unityLayoutMeasurement(layout.plan, layout.planRef, { workItemId: 'work', candidateId: 'candidate', outputPath: 'evidence/v5-layout.json' });
  finalReport.runId = 'final-run';
  /** 按正常工作流入口绑定当前 V5 的运行文件。 */
  function saveFinal() {
    save(finalReport.outputPath, finalReport);
    work.evidenceRef = save('evidence/manifest.json', { workItemId: 'work', stack: 'unity', visualStage: 'V5',
      items: [{ category: 'runtime-layout', status: 'PASS', targetId: 'view', path: finalReport.outputPath }] });
  }
  saveFinal();
  const evidence = { candidateId: 'candidate', uiLayoutMeasurementRef: { path: finalReport.outputPath } };
  return { repo, save, work, target, layout, report, finalReport, review, decision, approval, bind, bindDecision, saveFinal, native, evidence };
}

test('Unity 用户授权试装与独立 V5 原生读数使用同一文字属性', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native));
  assert.doesNotThrow(() => validateUnityTextStage(f.repo, f.work, f.target, 'V5', f.native, f.evidence));
  f.finalReport.runId = f.report.runId;
  f.saveFinal();
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V5', f.native, f.evidence), /不能复用 V4/);
});

test('Unity 文字试装拒绝用户授权、截图和冻结报告错绑', (t) => {
  const f = fixture(t);
  f.approval.userMessageRef = f.review.userMessageRef;
  f.decision.ruleApprovalRef = f.save('docs/authorization.json', f.approval);
  f.bind();
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native), /授权|确认/);
  f.approval.userMessageRef = 'chat:conversation/message:authorization';
  f.decision.ruleApprovalRef = f.save('docs/authorization.json', f.approval);
  f.decision.acceptedScreenshot = f.save('visual/other.png', '其他截图');
  f.bind();
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native), /截图/);
});

test('Unity 文字试装的原生截图和布局读数必须属于同一次帧末采集', (t) => {
  const f = fixture(t);
  const capturePath = f.decision.gameViewCaptureRef.path;
  const capture = JSON.parse(readFileSync(join(f.repo, capturePath), 'utf8'));
  capture.layoutMeasurement.frameCount += 1;
  f.decision.gameViewCaptureRef = f.save(capturePath, capture);
  f.bindDecision();
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native), /同一帧/);
  capture.layoutMeasurement.frameCount = f.report.frameCount;
  capture.layoutMeasurement.runId = 'another-run';
  f.decision.gameViewCaptureRef = f.save(capturePath, capture);
  f.bindDecision();
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native), /同一帧/);
});

test('Unity 已授权试装要求 V5 实际属性保持一致，普通验收保持原有行为', (t) => {
  const f = fixture(t);
  const fill = f.finalReport.measurements[0].componentSnapshot.textStyle.find((item) => item.name === 'fill');
  fill.actualValue = '#ffffffff';
  f.saveFinal();
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V5', f.native, f.evidence), /属性.*复验/);
  delete f.review.textAcceptanceRef;
  f.target.assetReviewRef = f.save('docs/assets.json', f.review);
  assert.doesNotThrow(() => validateUnityTextStage(f.repo, f.work, f.target, 'V5', f.native, f.evidence));
});

test('Unity V5 的补充属性必须来自相同运行批次，合并后复验已确认试装', (t) => {
  const f = fixture(t);
  const item = f.finalReport.measurements[0];
  const font = item.componentSnapshot.textStyle.shift();
  f.saveFinal();
  const extra = { measurementSource: 'UNITY_EDITOR_LOADED_SCENE', runId: f.finalReport.runId,
    frameCount: f.finalReport.frameCount, scenePath: f.finalReport.scenePath, stateId: f.finalReport.stateId, uiSystem: f.finalReport.uiSystem,
    measurements: [{ id: item.id, objectPath: item.objectPath, textStyle: [font] }] };
  f.evidence.uiLayoutMeasurementRef.textEvidencePath = f.save('evidence/text-extra.json', extra).path;
  assert.doesNotThrow(() => validateUnityTextStage(f.repo, f.work, f.target, 'V5', f.native, f.evidence));
  extra.runId = 'other-run';
  f.save('evidence/text-extra.json', extra);
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V5', f.native, f.evidence), /同一 Unity 场景|同批/);
});

test('未接入的工作项类型不能使用 Unity 场景文字试装决议', (t) => {
  const f = fixture(t);
  f.work.workItemType = 'DISPLAY_LAYER';
  f.work.assetReviewRef = f.target.assetReviewRef;
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native), /没有适用.*证据校验器/);
});

test('无文字的 Unity 场景不得声明文字试装决议', (t) => {
  const f = fixture(t, { withText: false });
  assert.throws(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native), /缺少当前目标的文字节点/);
  delete f.review.textAcceptanceRef;
  f.target.assetReviewRef = f.save('docs/assets.json', f.review);
  assert.doesNotThrow(() => validateUnityTextStage(f.repo, f.work, f.target, 'V4', f.native));
});

test('Unity 试装复验拒绝不同文字组件和属性漂移，同时保留视口变化空间', (t) => {
  const f = fixture(t);
  const plan = f.layout.plan;
  const current = structuredClone(f.finalReport);
  current.measurements[0].actualRect.x += 1;
  assert.doesNotThrow(() => verifyApprovedUnityTextTrial(f.repo, plan, f.report, current));
  current.measurements[0].componentSnapshot.textStyle[0].actualValue = '其他字体';
  assert.throws(() => verifyApprovedUnityTextTrial(f.repo, plan, f.report, current), /属性.*复验/);
  current.measurements[0].componentSnapshot.textStyle[0].actualValue = f.report.measurements[0].componentSnapshot.textStyle[0].actualValue;
  current.measurements[0].objectPath = 'Canvas/Another';
  assert.throws(() => verifyApprovedUnityTextTrial(f.repo, plan, f.report, current), /组件/);
  const uiPlan = { ...plan, uiSystem: 'UI_TOOLKIT' };
  const uiTrial = structuredClone(f.report);
  const uiCurrent = structuredClone(f.finalReport);
  uiTrial.measurements[0].elementName = 'Title';
  uiCurrent.measurements[0].elementName = 'Title';
  assert.doesNotThrow(() => verifyApprovedUnityTextTrial(f.repo, uiPlan, uiTrial, uiCurrent));
  uiCurrent.measurements[0].elementName = 'Other';
  assert.throws(() => verifyApprovedUnityTextTrial(f.repo, uiPlan, uiTrial, uiCurrent), /组件/);
});
