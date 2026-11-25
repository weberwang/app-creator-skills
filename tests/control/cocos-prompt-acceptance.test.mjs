import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadCocosHistoricalPromptApprovals } from '../../skills/app-workflow-control/scripts/runtime/cocos-prompt-acceptance.mjs';

/** 创建一个人工确认、真实生成收据和导入产物身份相互绑定的场景夹具。 */
function fixture(t) {
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
  const work = { stack: 'cocos', workItemId: 'lobby', workItemType: 'SCENE', visual: { objectId: 'Lobby' } };
  const target = { targetId: 'lobby-ready', candidateId: 'frozen', sceneId: 'Lobby', stateId: 'ready', referenceTarget, reviews: {} };
  const identity = { workItemId: 'lobby', candidateId: 'frozen', sceneId: 'Lobby', stateId: 'ready', referenceTarget };
  const userMessageRef = 'chat:thread/message:reviewed';
  const reviewRef = target.reviews.V4 = save('review.json', {
    schemaVersion: '1.0', ...identity, objectId: 'Lobby', targetId: target.targetId, stage: 'V4', purpose: 'imported-assets',
    decision: 'APPROVED', userMessageRef, targetRef: screenshot.path, targetSha256: screenshot.sha256,
  });
  const consent = { schemaVersion: '1.0', workItemId: 'lobby', candidateId: 'frozen', reviewRef,
    decision: 'APPROVED', scope: 'verify-cocos-v4-original-prompts-and-approved-trial', userMessageRef: 'chat:thread/message:rule' };
  const prompt = '保持完整原稿中的元素';
  const receipt = { assetId: 'backdrop', candidateId: 'frozen', tool: 'image_gen', prompt, actualReferenceInputs: [referenceTarget], rawOutput: raw };
  const receiptRef = save('generation.json', receipt);
  const manifest = { assets: [{ id: 'backdrop', source_file: source.path, output_file: runtime.path, sha256: runtime.sha256,
    generation_record: { asset_id: 'backdrop', region_id: 'background', raw_source_file: raw.path,
      full_prompt: prompt, actual_prompt: prompt, prompt, receipt_refs: [receiptRef] } }] };
  const creatorReadbackRef = save('creator.json', { ...identity, labels: { screenshot },
    assets: [{ assetId: 'backdrop', source, runtime, meta }] });
  const acceptance = { schemaVersion: 'cocos-prompt-acceptance/1.0', ...identity, userMessageRef,
    reviewRef, acceptedScreenshot: screenshot, ruleApprovalRef: save('consent.json', consent), creatorReadbackRef,
    assets: [{ assetId: 'backdrop', source, runtime, receiptRefs: [receiptRef] }] };
  const review = { humanStatus: 'PASS', userMessageRef };
  /** 重新冻结已更动的测试决议，模拟资料本身有一致摘要但属于另一身份。 */
  function bind() {
    target.assetReviewRef = save('assets.json', { ...review, promptAcceptanceRef: save('acceptance.json', acceptance) });
  }
  bind();
  /** 正式控制器入口必须自行回读实际项目证据。 */
  function load(stage = 'V4') {
    return loadCocosHistoricalPromptApprovals(root, work, target, manifest, stage);
  }
  return { save, work, target, acceptance, consent, manifest, load, bind };
}

test('已确认的实际运行图与真实提示词可以核对，V3 不能使用此决议', (t) => {
  const { load } = fixture(t);
  assert.equal(load().get('backdrop').regionId, 'background');
  assert.equal(load('V3'), undefined);
});

test('历史提示词决议拒绝运行图变动、作废引用和仅内联授权', (t) => {
  const { save, work, target, manifest, load } = fixture(t);
  save('runtime.png', '变更图片');
  assert.throws(load, /已确认摘要不符/);
  work.invalidatedRefs = [{ path: 'review.json' }];
  assert.throws(load, /已作废/);
  delete target.assetReviewRef;
  manifest.verifiedHistoricalPromptApprovals = { backdrop: true };
  assert.equal(load(), undefined);
});

test('视觉确认消息不能复用为修改规则的同意，真实提示词不能改写', (t) => {
  const { save, consent, acceptance, manifest, bind, load } = fixture(t);
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
