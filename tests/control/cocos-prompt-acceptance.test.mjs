import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadHistoricalPromptApprovals } from '../../skills/app-workflow-control/scripts/runtime/visual-prompt-acceptance.mjs';

/** 创建一个人工确认、真实生成收据和导入产物身份相互绑定的场景夹具。 */
function fixture(t, stack) {
  const root = mkdtempSync(join(tmpdir(), 'cocos-v4-prompt-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  /** 模拟独立已落盘文件，并计算真实摘要。 */
  function save(path, value) {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    writeFileSync(join(root, path), bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const referenceTarget = save('reference.png', '冻结效果图');
  const screenshot = save('preview.png', '实际试装');
  const source = save('source.png', '正式素材');
  const runtime = save('runtime.png', '正式素材');
  const raw = save('raw.png', '生成原图');
  const meta = save('runtime.png.meta', '导入元数据');
  const work = { stack, workItemId: 'lobby', workItemType: 'SCENE', visual: { objectId: 'Lobby' } };
  const target = { targetId: 'lobby-ready', candidateId: 'frozen', sceneId: 'Lobby', stateId: 'ready', referenceTarget, reviews: {} };
  const identity = { workItemId: 'lobby', candidateId: 'frozen', sceneId: 'Lobby', stateId: 'ready', referenceTarget };
  const userMessageRef = 'chat:thread/message:reviewed';
  const reviewRef = target.reviews.V4 = save('review.json', {
    schemaVersion: '1.0', ...identity, objectId: 'Lobby', targetId: target.targetId, stage: 'V4', purpose: 'imported-assets',
    decision: 'APPROVED', userMessageRef, targetRef: screenshot.path, targetSha256: screenshot.sha256,
  });
  const consent = { schemaVersion: '1.0', stack, targetId: target.targetId, workItemId: 'lobby', candidateId: 'frozen', reviewRef,
    decision: 'APPROVED', scope: 'verify-v4-original-prompts-and-approved-trial', userMessageRef: 'chat:thread/message:rule' };
  const prompt = '保持完整原稿中的元素';
  const receipt = { assetId: 'backdrop', candidateId: 'frozen', tool: 'image_gen', prompt, actualReferenceInputs: [referenceTarget], rawOutput: raw };
  const receiptRef = save('generation.json', receipt);
  const manifest = { assets: [{ id: 'backdrop', source_file: source.path, output_file: runtime.path, sha256: runtime.sha256,
    generation_record: { asset_id: 'backdrop', region_id: 'background', raw_source_file: raw.path,
      full_prompt: prompt, actual_prompt: prompt, prompt, receipt_refs: [receiptRef] } }] };
  const readback = stack === 'cocos' ? { ...identity, labels: { screenshot }, assets: [{ assetId: 'backdrop', source, runtime, meta }] }
    : { schemaVersion: 'visual-image-readback/1.0', stack, ...identity, targetId: target.targetId, visualStage: 'V4',
      measurementSource: 'runtime-component', screenshotRef: screenshot, assets: [{ assetId: 'backdrop', source, runtime, componentPath: 'Canvas/Backdrop' }] };
  let integration;
  if (stack !== 'cocos') {
    // 为独立采集保留 V3 冻结入口和 V4 同批正式图片消费者。
    const entryRef = save('scene.js', '正式场景');
    const layoutSpecRef = save('layout.json', { visualStage: 'V3', candidateVersion: target.candidateId,
      reference_target: { original_file: referenceTarget.path, target_sha256: referenceTarget.sha256 },
      scene_reconstruction_contract: { target_conditions: { scene_id: target.sceneId, state_id: target.stateId } },
      formalTarget: { entryPath: entryRef.path, rootComponentPath: 'Canvas' } });
    target.reviews.V3Layout = save('layout-review.json', { layoutSpecRef });
    integration = { schemaVersion: 'visual-image-integration/1.0', stack, ...identity, targetId: target.targetId,
      visualStage: 'V4', measurementSource: 'runtime-component', screenshotRef: screenshot,
      formalIntegration: { entryRef, rootComponentPath: 'Canvas', images: [{ assetId: 'backdrop', outputRef: runtime, componentPath: 'Canvas/Backdrop' }] } };
    readback.formalIntegrationRef = save('integration.json', integration);
  }
  const runtimeReadbackRef = save('readback.json', readback);
  const acceptance = { schemaVersion: 'visual-prompt-acceptance/1.0', stack, targetId: target.targetId, ...identity, userMessageRef,
    reviewRef, acceptedScreenshot: screenshot, ruleApprovalRef: save('consent.json', consent), runtimeReadbackRef,
    assets: [{ assetId: 'backdrop', source, runtime, receiptRefs: [receiptRef] }] };
  const review = { schemaVersion: '1.0', visualStage: 'V4', stack, workItemId: 'lobby', candidateId: 'frozen', technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef,
    assets: [{ assetId: 'backdrop', assetType: 'image', sourceKind: 'ai-generated', sourceRef: source.path,
      output: runtime.path, visualReviewScope: 'combined-runtime-trial' }] };
  /** 重新冻结已更动的测试决议，模拟资料本身有一致摘要但属于另一身份。 */
  function bind() {
    target.assetReviewRef = save('assets.json', { ...review, promptAcceptanceRef: save('acceptance.json', acceptance) });
  }
  bind();
  /** 正式控制器入口必须自行回读实际项目证据。 */
  function load(stage = 'V4') {
    return loadHistoricalPromptApprovals(root, work, target, manifest, stage);
  }
  return { save, work, target, acceptance, consent, manifest, readback, integration, review, load, bind };
}

for (const stack of ['cocos', 'phaser', 'threejs']) {
test(`${stack} 已确认的实际运行图与真实提示词可以核对，V3 不能使用此决议`, (t) => {
  const { load } = fixture(t, stack);
  assert.equal(load().get('backdrop').regionId, 'background');
  assert.equal(load('V5').get('backdrop').regionId, 'background');
  assert.equal(load('V3'), undefined);
});

test(`${stack} 历史提示词决议拒绝运行图变动、作废引用和仅内联授权`, (t) => {
  const { save, work, target, manifest, load } = fixture(t, stack);
  save('runtime.png', '变更图片');
  assert.throws(load, /摘要不符/);
  work.invalidatedRefs = [{ path: 'review.json' }];
  assert.throws(load, /已作废/);
  delete target.assetReviewRef;
  manifest.verifiedHistoricalPromptApprovals = { backdrop: true };
  assert.equal(load(), undefined);
});

test(`${stack} 视觉确认消息不能复用为修改规则的同意，真实提示词不能改写`, (t) => {
  const { save, consent, acceptance, manifest, bind, load } = fixture(t, stack);
  consent.userMessageRef = acceptance.userMessageRef;
  acceptance.ruleApprovalRef = save('consent.json', consent);
  bind();
  assert.throws(load, /独立于视觉确认/);
  consent.userMessageRef = 'chat:thread/message:another';
  acceptance.ruleApprovalRef = save('consent.json', consent);
  bind();
  manifest.assets[0].generation_record.full_prompt = '发出后改写的提示词';
  assert.throws(load, /改写了原始提示词/);
});

test(`${stack} 历史提示词决议拒绝跨栈和目标错绑`, (t) => {
  const { save, acceptance, consent, bind, load } = fixture(t, stack);
  acceptance.stack = stack === 'cocos' ? 'phaser' : 'cocos';
  bind();
  assert.throws(load, /错绑|不一致|未绑定/);
  acceptance.stack = stack;
  consent.targetId = 'other-target';
  acceptance.ruleApprovalRef = save('consent.json', consent);
  bind();
  assert.throws(load, /授权|绑定/);
});

test(`${stack} 历史提示词决议必须对应资源评审中逐项确认的图片`, (t) => {
  const { review, bind, load } = fixture(t, stack);
  review.assets = [];
  bind();
  assert.throws(load, /图片评审|资源评审|素材评审/);
  review.assets = [{ assetId: 'backdrop', assetType: 'image', sourceKind: 'ai-generated', sourceRef: 'source.png',
    output: 'runtime.png', visualReviewScope: 'other' }];
  bind();
  assert.throws(load, /资源评审|素材评审|试装/);
});

test(`${stack} 历史提示词验收只接受被允许的能力与技术通过的资源评审`, (t) => {
  const { save, acceptance, consent, review, bind, load } = fixture(t, stack);
  consent.scope = 'verify-v4-original-prompts';
  acceptance.ruleApprovalRef = save('consent.json', consent);
  bind();
  assert.equal(load().get('backdrop').assetId, 'backdrop');
  consent.scope = 'accept-v4-text-trial';
  acceptance.ruleApprovalRef = save('consent.json', consent);
  bind();
  assert.throws(load, /授权|范围/);
  consent.scope = 'verify-v4-original-prompts';
  acceptance.ruleApprovalRef = save('consent.json', consent);
  review.technicalStatus = 'FAIL';
  bind();
  assert.throws(load, /评审|技术|不一致/);
});

if (stack !== 'cocos') test(`${stack} 原始运行采集必须绑定同一截图和组件`, (t) => {
  const { save, acceptance, readback, bind, load } = fixture(t, stack);
  readback.screenshotRef = save('other.png', '另一张截图');
  acceptance.runtimeReadbackRef = save('readback.json', readback);
  bind();
  assert.throws(load, /截图|绑定/);
  readback.screenshotRef = acceptance.acceptedScreenshot;
  delete readback.assets[0].componentPath;
  acceptance.runtimeReadbackRef = save('readback.json', readback);
  bind();
  assert.throws(load, /组件|绑定|读回/);
});

if (stack !== 'cocos') test(`${stack} 图片运行采集必须对照 V3 入口和 V4 正式组件`, (t) => {
  const { save, acceptance, readback, integration, bind, load } = fixture(t, stack);
  integration.formalIntegration.images[0].componentPath = 'Canvas/Other';
  readback.formalIntegrationRef = save('integration.json', integration);
  acceptance.runtimeReadbackRef = save('readback.json', readback);
  bind();
  assert.throws(load, /组件|消费者|绑定/);
  integration.formalIntegration.images[0].componentPath = 'Canvas/Backdrop';
  integration.formalIntegration.entryRef = save('other.js', '其他入口');
  readback.formalIntegrationRef = save('integration.json', integration);
  acceptance.runtimeReadbackRef = save('readback.json', readback);
  bind();
  assert.throws(load, /入口|目标|绑定/);
});
}
