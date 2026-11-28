import assert from 'node:assert/strict';
import test from 'node:test';
import { response } from '../../skills/app-workflow-control/scripts/runtime/responses.mjs';

test('工作流进度覆盖视觉阶段、阻断、返工和完成状态', () => {
  const work = { stageId: 'scene-production', globalState: 'REVIEW', stack: 'unity', workItemType: 'SCENE', visual: { stage: 'V1' } };
  assert.equal(response({ status: 'PASS', work }).metadata.progress, '进度 5/V1·审查中');
  for (const stage of ['V2', 'V3', 'V4', 'V5']) {
    assert.equal(response({ status: 'PASS', work: { ...work, visual: { stage } } }).metadata.progress, `进度 5/${stage}·审查中`);
  }
  assert.equal(response({ status: 'BLOCKED', work }).metadata.progress, '进度 5/V1·阻断');
  assert.equal(response({ status: 'PASS', work: { ...work, globalState: 'BLOCKED' } }).metadata.progress, '进度 5/V1·阻断');
  assert.equal(response({ status: 'PASS', work: { ...work, globalState: 'RETURN' } }).metadata.progress, '进度 5/V1·返工中');
  assert.equal(response({ status: 'PASS', work: { ...work, globalState: 'COMPLETE' } }).metadata.progress, '进度 5/V1·已完成');
});

test('进度按工作项实际阶段输出并保留非游戏阶段名称', () => {
  const work = { stageId: 'commercial-initiation', globalState: 'INTAKE', stack: 'unity', workItemType: 'PROJECT' };
  assert.equal(response({ status: 'PASS', work }).metadata.progress, '进度 1·进行中');
  assert.equal(response({ status: 'PASS', work }).metadata.workflowView.phaseLabel, '玩法与题材立项');
  assert.equal(response({ status: 'PASS', work: { ...work, stack: 'flutter' } }).metadata.workflowView.phaseLabel, '商业立项');
  assert.equal(response({ status: 'PASS', work: { ...work, stageId: 'release', globalState: 'RELEASE_APPROVAL_REQUIRED' } }).metadata.progress, '进度 发布·待确认');
  assert.equal(response({ status: 'PASS', work: { ...work, stageId: 'cross-module-integration', globalState: 'INTEGRATING' } }).metadata.progress, '进度 6·集成中');
  assert.equal(response({ status: 'PASS', work: { ...work, stageId: 'global-integration-validation', globalState: 'COMPLETE' } }).metadata.progress, '进度 7·已完成');
  assert.equal(response({ status: 'PASS', work: { ...work, stageId: 'unknown' } }).metadata.progress, '进度 未登记');
  assert.equal(response({ status: 'PASS' }).metadata.progress, undefined);
});
