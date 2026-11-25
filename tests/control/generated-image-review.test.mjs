import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateGeneratedImageReview } from '../../skills/app-workflow-control/scripts/runtime/generated-image-review.mjs';
import { minimalPng } from '../../skills/cocos-game-asset-integration/scripts/visual-manifest-test-fixtures.mjs';

test('统一历史生图决议只采用实际提示词，保留附件、部件范围和位图尺寸校验', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'generated-image-review-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const target = minimalPng(64, 64);
  const source = { path: 'target.png', sha256: createHash('sha256').update(target).digest('hex') };
  writeFileSync(join(repo, source.path), target);
  writeFileSync(join(repo, 'runtime.png'), minimalPng(32, 24));
  const asset = { assetId: 'picture', output: 'runtime.png', designItemIds: ['panel'] };
  const record = {
    assetId: 'picture', candidateId: 'candidate', referenceTarget: source.path,
    region: { id: 'panel', requiresDetail: false, bounds: { x: 2, y: 2, width: 32, height: 24 } },
    generationInputs: { artifact: { kind: '位图', purpose: '正式背景' }, mode: 'reproduce',
      sections: [{ id: 'background', origin: 'fact', text: '保留蓝色面板' }], preserve: ['面板尺寸'],
      references: [{ id: 'target', role: 'source-target', purpose: '冻结布局位置', ref: source.path }] },
    prompt: '历史工具发送的原文', actualReferenceInputs: [source], runtimePath: 'runtime.png', runtimeSize: { width: 32, height: 24 },
  };
  const options = { candidateId: 'candidate', approvedSources: [source],
    /** 项目文件仍需以实际内容核对，授权不能替换附件身份。 */
    verifyFile(ref) {
      assert.equal(createHash('sha256').update(readFileSync(join(repo, ref.path))).digest('hex'), ref.sha256);
      return ref.path;
    } };
  assert.throws(() => validateGeneratedImageReview(repo, record, asset, options), /提示词遗漏/);
  const approved = { ...options, historicalPromptSha256: createHash('sha256').update(record.prompt).digest('hex') };
  assert.doesNotThrow(() => validateGeneratedImageReview(repo, record, asset, approved));
  assert.throws(() => validateGeneratedImageReview(repo, { ...record, prompt: '改写的原文' }, asset, approved), /提示词原文/);
  assert.throws(() => validateGeneratedImageReview(repo, { ...record, actualReferenceInputs: [] }, asset, approved), /附件清单/);
  assert.throws(() => validateGeneratedImageReview(repo, { ...record, runtimeSize: { width: 24, height: 32 } }, asset, approved), /实际尺寸/);
});
