import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import loadDependency from '../skills/app-skill-runtime/dependencies.cjs';
import { assertAssetReview } from '../skills/app-workflow-control/scripts/runtime/artifacts.mjs';

test('V4 正式生图拒绝风格代替原图、附件错绑和生成画布误用', async (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'generated-image-review-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const sharp = loadDependency('sharp');
  /** 用实际可解码的位图确认 V4 会核对最终文件尺寸。 */
  async function image(path, width, height) {
    await sharp({ create: { width, height, channels: 3, background: 'blue' } }).png().toFile(join(repo, path));
  }
  /** 保存和冻结证据，使错误仅来自本次刻意修改的内容。 */
  function freeze(path, doc) {
    if (doc) writeFileSync(join(repo, path), JSON.stringify(doc));
    return { path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') };
  }

  await Promise.all([image('v2.png', 320, 200), image('local.png', 40, 32), image('icon.png', 40, 32)]);
  const referenceTarget = freeze('v2.png');
  const reviewRef = freeze('v2-review.json', { referenceTarget });
  const work = { workItemId: 'home-ui', stack: 'unity', visual: { candidateId: 'blue', reviews: { V2: reviewRef } } };
  const original = { id: 'confirmed', role: 'source-target', purpose: '按冻结稿重建部件', ref: 'v2.png' };
  const detail = { id: 'detail', role: 'source-detail', purpose: '对照局部转折', ref: 'local.png' };
  const generation = {
    assetId: 'action', candidateId: 'blue', referenceTarget: 'v2.png',
    region: { id: 'action-icon', bounds: { x: 100, y: 100, width: 40, height: 32 }, requiresDetail: true },
    runtimePath: 'icon.png', runtimeSize: { width: 40, height: 32 },
    generationInputs: {
      artifact: { kind: '蓝色按钮图标', purpose: '主操作' }, mode: 'reproduce',
      sections: [{ id: 'shape', origin: 'fact', text: '保留倾斜角度' }],
      references: [original, detail], preserve: ['保留深蓝轮廓'],
    },
    actualReferenceInputs: [referenceTarget, freeze('local.png')],
    prompt: '为主操作制作蓝色按钮图标。按冻结稿重建部件，对照局部转折。保留倾斜角度，保留深蓝轮廓。',
  };
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({ dimension, status: 'PASS', evidenceRef: 'v2-review.json' }));
  const antiAiChecks = ['structure-fidelity', 'intentional-detail', 'material-lighting', 'series-consistency', 'ui-specificity', 'product-character', 'edge-quality', 'integration-cohesion'].map((id) => ({ id, status: 'PASS', evidenceRef: 'v2-review.json' }));
  /** 通过控制器正式的 V4 资产评审入口复验生成证据。 */
  function validate(record) {
    const { path, sha256 } = freeze('generation.json', record);
    work.assetReviewRef = freeze('assets.json', {
      schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4', candidateId: work.visual.candidateId,
      technicalStatus: 'PASS', humanStatus: 'PASS', userMessageRef: 'user-review-1', qualityChecks,
      assets: [{ assetId: 'action', assetType: 'image', output: 'icon.png', sourceRef: 'source.png', sourceKind: 'ai-generated', designItemIds: ['action-icon'], generationRecord: path, generationRecordSha256: sha256, antiAiChecks }],
    });
    return assertAssetReview(repo, work);
  }

  assert.doesNotThrow(() => validate(generation));
  assert.throws(() => validate({ ...generation, candidateId: 'prior' }), /未绑定当前资产和冻结候选/);
  assert.throws(() => validate({ ...generation, referenceTarget: 'local.png' }), /当前 V2/);
  assert.throws(() => validate({ ...generation, generationInputs: { ...generation.generationInputs, mode: 'explore' } }), /还原或局部编辑/);
  assert.throws(() => validate({ ...generation, generationInputs: { ...generation.generationInputs, references: [{ ...original, role: 'style' }] } }), /source-target/);
  assert.throws(() => validate({ ...generation, actualReferenceInputs: [] }), /实际发送/);
  assert.throws(() => validate({ ...generation, actualReferenceInputs: [...generation.actualReferenceInputs].reverse() }), /顺序不符/);
  assert.throws(() => validate({ ...generation, actualReferenceInputs: [referenceTarget, { path: 'local.png', sha256: '0'.repeat(64) }] }), /内容已变化/);
  assert.throws(() => validate({ ...generation, generationInputs: { ...generation.generationInputs, references: [original] } }), /缺少局部细节/);
  assert.throws(() => validate({ ...generation, region: { ...generation.region, id: 'other-icon' } }), /未绑定当前资产的设计项/);
  await image('icon.png', 1254, 1254);
  assert.throws(() => validate(generation), /实际尺寸 1254×1254 与正式规格 40×32 不符/);
});
