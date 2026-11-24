import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateWebTextStage, webTextReadbackOptions } from '../../skills/app-workflow-control/scripts/runtime/web-text-stage.mjs';

test('Web V4 文字试装使用资源评审冻结的实际文件', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'web-text-trial-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 写入测试产物并返回冻结身份。 */
  function freeze(path, value) {
    const bytes = JSON.stringify(value);
    writeFileSync(join(repo, path), bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const work = { workItemType: 'SCENE', workItemId: 'work', stack: 'cocos' };
  const target = { candidateId: 'current', sceneId: 'shop', stateId: 'loaded', referenceTarget: { path: 'target.png', sha256: 'a'.repeat(64) } };
  const scene = { scene_reconstruction_contract: { text_decomposition: { text_nodes: [{ text_node_id: 'price', layout_node_id: 'price-label' }] } } };
  const read = () => webTextReadbackOptions(repo, work, scene, target, 'V4');
  const readFinal = () => webTextReadbackOptions(repo, work, scene, target, 'V5');
  assert.throws(read, /资源评审.*缺少路径/);
  const trial = {
    schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', visualStage: 'V4', runId: 'trial-1',
    workItemId: work.workItemId, stack: work.stack, candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId,
    referenceTarget: target.referenceTarget, nodes: [{ textNodeId: 'price', layoutNodeId: 'price-label', componentPath: 'Panel/Price',
      measurement: { actual_content: '50', actual_visible: true } }],
  };
  /** 按资源评审文档的流程冻结一个新的试装报告版本。 */
  function recordTrial(report) {
    const ref = freeze('trial.json', report);
    target.assetReviewRef = freeze('assets.json', { schemaVersion: '1.0', visualStage: 'V4',
      workItemId: work.workItemId, stack: work.stack, candidateId: target.candidateId, textRestorationRef: ref });
    return ref;
  }
  const trialRef = recordTrial(trial);
  assert.deepEqual(read().textReadbackIdentity.runtimeEvidenceRef, trialRef);
  assert.equal(readFinal().textTrialRunId, trial.runId);
  freeze('trial.json', { visualStage: 'V4', runId: 'replaced-trial' });
  assert.throws(read, /textRestorationRef.*冻结摘要不符/);
  recordTrial({});
  assert.throws(readFinal, /试装未绑定/);
  recordTrial({ ...trial, stateId: 'wrong' });
  assert.throws(readFinal, /试装未绑定/);
  recordTrial({ ...trial, nodes: [] });
  assert.throws(readFinal, /节点范围/);
  assert.equal(webTextReadbackOptions(repo, work, {}, target, 'V4').requireNativeTextReadback, false);
});

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
