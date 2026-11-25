import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { readUnityImagePlacements } from '../../skills/app-workflow-control/scripts/runtime/unity-image-acceptance.mjs';
import { loadHistoricalPromptApprovals } from '../../skills/app-workflow-control/scripts/runtime/visual-prompt-acceptance.mjs';
import { deriveUiLayoutPlan } from '../../skills/unity-development-workflow/scripts/layout-plan-derive.mjs';
import { unityGameViewCaptureFixture } from './unity-text-fixture.mjs';

/** 为 Unity 图片验收生成真实摘要文件和模拟的原生布局快照。 */
function fixture(t, uiSystem) {
  const repo = mkdtempSync(join(tmpdir(), 'unity-image-acceptance-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 写入测试文件并返回其精确字节身份。 */
  function save(path, value) {
    const absolute = join(repo, path);
    const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const screenshot = save('review/confirmed.png', '用户确认截图');
  const referenceTarget = save('review/reference.png', '冻结参考');
  const image = save('Assets/image.png', '实际图片');
  const entryRef = save('Assets/Main.unity', '已保存场景');
  const guid = 'a'.repeat(32);
  const meta = save('Assets/image.png.meta', `fileFormatVersion: 2\nguid: ${guid}\n`);
  const work = { stack: 'unity', workItemType: 'SCENE', workItemId: 'sample', evidenceRoot: 'evidence/current' };
  const target = { targetId: 'view', candidateId: 'candidate', sceneId: 'scene', stateId: 'ready', referenceTarget, reviews: {} };
  const identity = { stack: work.stack, workItemId: work.workItemId, targetId: target.targetId,
    candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId, referenceTarget };
  const source = JSON.parse(readFileSync(new URL('../../skills/unity-development-workflow/templates/ui-layout-plan.json', import.meta.url), 'utf8'));
  source.nodes = [source.nodes[0]];
  source.scenePath = entryRef.path;
  source.sceneId = target.sceneId;
  source.stateId = target.stateId;
  source.nodes[0].layoutBinding.uiLayout.imageSizing = { mode: 'EXPLICIT', reason: '模拟正式图片尺寸' };
  if (uiSystem === 'UI_TOOLKIT') {
    source.uiSystem = 'UI_TOOLKIT';
    source.coordinateSpace = 'UI_TOOLKIT_LOGICAL_POINTS';
    source.nodes[0].layoutBinding.coordinateSpace = 'UI_TOOLKIT_PANEL';
    source.nodes[0].layoutBinding.uiLayout.positionDriver = 'UITOOLKIT_LAYOUT';
    source.nodes[0].layoutBinding.uiLayout.sizeDrivers = { width: 'UITOOLKIT_LAYOUT', height: 'UITOOLKIT_LAYOUT' };
  }
  const plan = deriveUiLayoutPlan(source);
  const planRef = save('review/layout.json', plan);
  target.reviews.V3Layout = save('review/layout-review.json', { layoutSpecRef: planRef });
  const node = plan.nodes[0];
  const actualRect = { ...node.targetBounds };
  const driver = uiSystem === 'UGUI' ? 'RECT_TRANSFORM' : 'UITOOLKIT_LAYOUT';
  const snapshot = { active: true, observationScope: 'ENGINE_COMPONENTS_AND_REGISTERED_WRITERS',
    positionWriters: [driver], widthWriters: [driver], heightWriters: [driver], layoutGroup: null, parentLayoutGroup: null,
    contentSizeFitter: null, aspectRatioFitter: null, image: null, uiToolkit: null, externalWriters: [], rectTransform: null };
  if (uiSystem === 'UGUI') {
    snapshot.rectTransform = { anchorMin: node.layoutBinding.anchor.min, anchorMax: node.layoutBinding.anchor.max,
      pivot: node.layoutBinding.pivot, anchoredPosition: { x: 0, y: 0 }, localSize: { width: actualRect.width, height: actualRect.height } };
    snapshot.image = { assetGuid: guid, localId: '1', assetPath: image.path, sourceSize: { width: 64, height: 64 },
      localSize: { width: actualRect.width, height: actualRect.height }, nativeSize: { width: 32, height: 32 },
      pixelsPerUnit: 200, imagePixelsPerUnit: 2, referencePixelsPerUnit: 100, pixelsPerUnitMultiplier: 1,
      type: 'Simple', hasBorder: true, preserveAspect: false, border: [8, 8, 8, 8] };
  } else {
    snapshot.uiToolkit = { position: 'Relative', backgroundAssetGuid: guid, sliceLeft: 0, sliceBottom: 0, sliceRight: 0,
      sliceTop: 0, sliceScale: 1, width: actualRect.width, height: actualRect.height };
  }
  const componentPath = uiSystem === 'UGUI' ? 'Canvas/SafeArea/Panel' : 'Panel';
  const report = { measurementSource: 'UNITY_EDITOR_LOADED_SCENE', taskId: work.workItemId, candidateId: target.candidateId,
    layoutPlanSha256: planRef.sha256, outputPath: 'evidence/trial/layout.json', runId: 'trial',
    generatedAtUtc: '2026-11-20T00:00:00Z', frameCount: 1, includesComponentSnapshots: true,
    uiSystem: plan.uiSystem, coordinateSpace: plan.coordinateSpace, stateId: plan.stateId, scenePath: plan.scenePath,
    status: 'PASS', viewportRect: plan.roots.viewport, safeAreaRect: plan.roots['safe-area'],
    measurements: [{ id: node.id, objectPath: 'Canvas/SafeArea/Panel', elementName: 'Panel', parentPath: 'Canvas/SafeArea',
      referenceId: 'safe-area', referencePath: 'safe-area', parentRect: plan.roots['safe-area'], referenceRect: plan.roots['safe-area'],
      actualRect, targetRect: null, tolerance: null, delta: null, status: 'PASS', componentSnapshot: snapshot }] };
  const placement = { assetId: 'picture', outputRef: image, componentPath, ...(uiSystem === 'UI_TOOLKIT' ? { importMetadataRef: meta } : {}) };
  const capture = { schemaVersion: 'visual-image-integration/1.0', ...identity, visualStage: 'V4',
    measurementSource: 'runtime-component', screenshotRef: screenshot, runId: report.runId,
    nativeLayoutRef: save(report.outputPath, report), formalIntegration: { entryRef,
      rootComponentPath: uiSystem === 'UGUI' ? 'Canvas' : 'Canvas/SafeArea/Panel', images: [placement] } };
  const review = { assets: [{ assetId: 'picture', assetType: 'image', output: image.path }] };
  /** 重写冻结封套，使负例检验字段绑定而不是仅检验摘要。 */
  function bind({ refreshGameView = true } = {}) {
    capture.nativeLayoutRef = save(report.outputPath, report);
    if (refreshGameView) capture.gameViewCaptureRef = unityGameViewCaptureFixture(save, screenshot, capture.nativeLayoutRef, report,
      readFileSync(join(repo, screenshot.path)).length);
    return save('review/integration.json', capture);
  }
  let integrationRef = bind();
  /** 使用当前冻结证据运行指定视觉阶段检查。 */
  function check(stage = 'V4') {
    return readUnityImagePlacements(repo, work, target, stage, review, integrationRef, identity, screenshot);
  }
  /** 在工作项当前证据目录模拟一份独立运行布局采集。 */
  function bindV5(current) {
    const path = `${work.evidenceRoot}/layout.json`;
    const reference = save(path, { ...current, outputPath: path });
    work.evidenceRef = save('evidence/manifest.json', { workItemId: work.workItemId, stack: work.stack, visualStage: 'V5',
      items: [{ category: 'runtime-layout', targetId: target.targetId, status: 'PASS', path: reference.path }] });
  }
  return { repo, save, work, target, screenshot, identity, image, plan, report, capture, placement, review, check, bindV5,
    rebind(options) { integrationRef = bind(options); }, get integrationRef() { return integrationRef; } };
}

for (const uiSystem of ['UGUI', 'UI_TOOLKIT']) {
  test(`${uiSystem} 图片验收绑定正式组件，V5 使用独立批次复验`, (t) => {
    const f = fixture(t, uiSystem);
    assert.equal(f.check()[0].assetId, 'picture');
    f.bindV5({ ...f.report, runId: 'runtime' });
    assert.equal(f.check('V5')[0].assetId, 'picture');
    f.bindV5({ ...f.report, runId: 'trial' });
    assert.throws(() => f.check('V5'), /复用|批次/);
    const current = structuredClone(f.report);
    current.runId = 'runtime';
    current.measurements[0].componentSnapshot.active = false;
    f.bindV5(current);
    assert.throws(() => f.check('V5'), /活动|布局采集/);
    if (uiSystem === 'UGUI') {
      current.measurements[0].componentSnapshot.active = true;
      current.measurements[0].componentSnapshot.image.localId = '2';
      f.bindV5(current);
      assert.throws(() => f.check('V5'), /Sprite 子资源/);
    }
  });

  test(`${uiSystem} 图片验收拒绝组件、正式入口及截图或批次错绑`, (t) => {
    const f = fixture(t, uiSystem);
    f.placement.componentPath = uiSystem === 'UGUI' ? 'Canvas/Other' : 'Other';
    f.rebind();
    assert.throws(() => f.check(), /组件/);
    f.placement.componentPath = uiSystem === 'UGUI' ? 'Canvas/SafeArea/Panel' : 'Panel';
    f.capture.formalIntegration.entryRef = f.save('Assets/Other.unity', '其他场景');
    f.rebind();
    assert.throws(() => f.check(), /正式接入入口/);
    f.capture.formalIntegration.entryRef = f.save('Assets/Main.unity', '已保存场景');
    f.report.runId = 'other';
    f.rebind();
    assert.throws(() => f.check(), /截图|批次/);
    f.report.runId = 'trial';
    f.rebind();
    const captureRef = f.capture.gameViewCaptureRef;
    const gameView = JSON.parse(readFileSync(join(f.repo, captureRef.path), 'utf8'));
    gameView.screenshot.frameCount += 1;
    f.capture.gameViewCaptureRef = f.save(captureRef.path, gameView);
    f.rebind({ refreshGameView: false });
    assert.throws(() => f.check(), /截图.*同一帧/);
    gameView.screenshot.frameCount = f.report.frameCount;
    gameView.screenshot.sha256 = '0'.repeat(64);
    f.capture.gameViewCaptureRef = f.save(captureRef.path, gameView);
    f.rebind({ refreshGameView: false });
    assert.throws(() => f.check(), /截图.*同一帧/);
  });
}

test('UI Toolkit 图片输出必须绑定真实导入元数据与实际背景 GUID', (t) => {
  const f = fixture(t, 'UI_TOOLKIT');
  f.placement.importMetadataRef = f.save('Assets/other.png.meta', `guid: ${'a'.repeat(32)}\n`);
  f.rebind();
  assert.throws(() => f.check(), /导入元数据/);
  f.placement.importMetadataRef = f.save('Assets/image.png.meta', `guid: ${'b'.repeat(32)}\n`);
  f.rebind();
  assert.throws(() => f.check(), /GUID/);
});

test('Unity 图文联合决议和 UI Toolkit 宿主必须绑定同一原生目标', (t) => {
  const f = fixture(t, 'UI_TOOLKIT');
  f.review.textAcceptanceRef = f.save('review/text.json', {});
  f.review.textRestorationRef = f.save('evidence/trial/other.json', {});
  assert.throws(() => f.check(), /同一份原生采集报告/);
  f.review.textRestorationRef = f.capture.nativeLayoutRef;
  assert.equal(f.check().length, 1);
  const current = structuredClone(f.report);
  current.runId = 'runtime';
  current.measurements[0].objectPath = 'Canvas/OtherDocument';
  f.bindV5(current);
  assert.throws(() => f.check('V5'), /UIDocument/);
});

for (const uiSystem of ['UGUI', 'UI_TOOLKIT']) {
  test(`${uiSystem} 共用历史生图验收复核 Unity 实际产物、发送原文和附件`, (t) => {
    const f = fixture(t, uiSystem);
    const { repo, save, work, target, screenshot, identity, image, placement, review } = f;
    work.visual = { objectId: target.sceneId };
    const source = save('Assets/source.png', '真实生图成品');
    const raw = save('evidence/generated.png', '生成原图');
    const userMessageRef = 'chat:thread/message:review';
    target.reviews.V4 = save('review/review.json', { schemaVersion: '1.0', ...identity, objectId: target.sceneId,
      stage: 'V4', purpose: 'imported-assets', decision: 'APPROVED', userMessageRef,
      targetRef: screenshot.path, targetSha256: screenshot.sha256 });
    const consent = { schemaVersion: '1.0', stack: 'unity', workItemId: work.workItemId, targetId: target.targetId,
      candidateId: target.candidateId, reviewRef: target.reviews.V4, decision: 'APPROVED',
      scope: 'verify-v4-original-prompts', userMessageRef: 'chat:thread/message:rule' };
    const prompt = '按已确认参考制作实际背景';
    const receipt = { assetId: 'picture', candidateId: target.candidateId, tool: 'image_gen', prompt,
      actualReferenceInputs: [target.referenceTarget], rawOutput: raw };
    const generation = { assetId: 'picture', candidateId: target.candidateId, referenceTarget: target.referenceTarget.path,
      region: { id: 'backdrop' }, runtimePath: image.path, prompt, rawOutput: raw,
      actualReferenceInputs: [target.referenceTarget], receiptRefs: [save('review/receipt.json', receipt)] };
    const acceptedAsset = { assetId: 'picture', source, runtime: image, receiptRefs: generation.receiptRefs };
    const readback = { schemaVersion: 'visual-image-readback/1.0', ...identity, visualStage: 'V4',
      measurementSource: 'runtime-component', screenshotRef: screenshot, formalIntegrationRef: f.integrationRef,
      assets: [{ assetId: 'picture', source, runtime: image, componentPath: placement.componentPath }] };
    const decision = { schemaVersion: 'visual-prompt-acceptance/1.0', ...identity, reviewRef: target.reviews.V4,
      acceptedScreenshot: screenshot, userMessageRef, ruleApprovalRef: save('review/consent.json', consent),
      runtimeReadbackRef: save('review/readback.json', readback), assets: [acceptedAsset] };
    const record = { ...review, schemaVersion: '1.0', visualStage: 'V4', stack: work.stack, workItemId: work.workItemId,
      candidateId: target.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef,
      assets: [{ assetId: 'picture', assetType: 'image', sourceKind: 'ai-generated', sourceRef: source.path,
        output: image.path, visualReviewScope: 'combined-runtime-trial', designItemIds: ['backdrop'] }] };
    /** 将更改后的生成记录与资源评审重新冻结，验证实际身份关联。 */
    function bind() {
      const ref = save('review/generation.json', generation);
      record.assets[0].generationRecord = ref.path;
      record.assets[0].generationRecordSha256 = ref.sha256;
      decision.assets[0].receiptRefs = generation.receiptRefs;
      record.promptAcceptanceRef = save('review/decision.json', decision);
      target.assetReviewRef = save('review/assets.json', record);
    }
    bind();
    const approvals = () => loadHistoricalPromptApprovals(repo, work, target, null, 'V4');
    assert.equal(approvals().get('picture').sourceFile, source.path);
    generation.prompt = '被改写的提示词';
    bind();
    assert.throws(approvals, /改写|提示词/);
    generation.prompt = prompt;
    receipt.actualReferenceInputs = [save('review/other.png', '其他附件')];
    generation.receiptRefs = [save('review/receipt.json', receipt)];
    bind();
    assert.throws(approvals, /参考|附件/);
  });
}
