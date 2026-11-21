import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateWebTextStage } from '../../skills/app-workflow-control/scripts/runtime/web-text-stage.mjs';

test('Web V5 文字使用 V3 冻结目标，实际读数不能重定义预期样式', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'web-text-stage-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const target = { sceneId: 'shop', stateId: 'loaded', candidateId: 'current', referenceTarget: { path: 'target.png', sha256: '0'.repeat(64) } };
  const design = {
    visualStage: 'V3', candidateVersion: target.candidateId,
    reference_target: { original_file: target.referenceTarget.path, target_sha256: target.referenceTarget.sha256 },
    scene_reconstruction_contract: {
      target_conditions: { scene_id: target.sceneId, state_id: target.stateId },
      text_decomposition: { text_nodes: [{ text_node_id: 'timer', typography_target: { font_size: 24, fill: '#FFFFFFFF' } }] },
    },
  };
  const bytes = JSON.stringify(design);
  writeFileSync(join(repo, 'v3.json'), bytes);
  writeFileSync(join(repo, 'review.json'), JSON.stringify({ layoutSpecRef: { path: 'v3.json', sha256: createHash('sha256').update(bytes).digest('hex') } }));
  const current = structuredClone(design);
  current.visualStage = 'V5';
  const nodes = current.scene_reconstruction_contract.text_decomposition.text_nodes;
  nodes[0].runtime_verification = { actual_typography: { font_size: 24, fill: '#FFFFFFFF' } };
  nodes[0].required_resources = [{ path: 'fonts/current.fnt' }];
  assert.doesNotThrow(() => validateWebTextStage(repo, current, { path: 'review.json' }, target));
  nodes[0].typography_target.font_size = 16;
  nodes[0].runtime_verification.actual_typography.font_size = 16;
  assert.throws(() => validateWebTextStage(repo, current, { path: 'review.json' }, target), /timer.*typography_target.*偏离/);
  nodes.pop();
  assert.throws(() => validateWebTextStage(repo, current, { path: 'review.json' }, target), /timer.*缺少/);
  assert.doesNotThrow(() => validateWebTextStage(repo, current, undefined, target));
});
