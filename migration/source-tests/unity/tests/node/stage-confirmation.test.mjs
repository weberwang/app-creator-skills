import assert from 'node:assert/strict';
import test from 'node:test';
import { stageConfirmationBlockers, validateStageReviewsShape } from '../../../../../skills/unity-domain-contracts/scripts/runtime/stage-confirmation.mjs';

/** 构造带用户消息引用的阶段确认记录；测试中不使用文件摘要。 */
function confirmation(stage, confirmedAt = '2026-10-20T10:00:00+08:00') {
  return { workItemId: 'WI-STAGE', stage, confirmedBy: 'test-user', confirmedAt, userMessageRef: `message-${stage}-${confirmedAt}` };
}

/** 为指定阶段创建当前可见工作项，避免测试依赖控制器和外部文件。 */
function workAt(stage, status = 'IN_PROGRESS', stageReviews = [], globalState = 'ACTIVE') {
  return {
    workItemId: 'WI-STAGE', workItemType: 'SCENE', visualStageModel: 'function-first-v1', globalState,
    scene: { sceneId: 'scene-test', stage, status }, stageReviews,
  };
}

/** 为门禁用例提供各阶段的完整确认事实。 */
const v2 = { stage: 'V2', confirmation: confirmation('V2') };
const v3 = {
  stage: 'V3',
  decompositionConfirmation: confirmation('V3', '2026-10-20T10:00:00+08:00'),
  layoutConfirmation: confirmation('V3', '2026-10-20T10:01:00+08:00'),
};
const v4 = { stage: 'V4', confirmation: confirmation('V4') };
const v5 = { stage: 'V5', confirmation: confirmation('V5') };

test('确认记录只接受 V2-V5，且 V3 必须分别记录拆解和布局确认', () => {
  assert.deepEqual(validateStageReviewsShape(workAt('V5', 'IN_PROGRESS', [v2, v3, v4, v5])), []);
  assert.ok(validateStageReviewsShape(workAt('V2', 'IN_PROGRESS', [{ stage: 'V0', confirmation: confirmation('V0') }])).length > 0);
  assert.ok(validateStageReviewsShape(workAt('V2', 'IN_PROGRESS', [{ stage: 'V1', confirmation: confirmation('V1') }])).length > 0);
  assert.ok(validateStageReviewsShape(workAt('V3', 'IN_PROGRESS', [{ stage: 'V3', confirmation: confirmation('V3') }])).length > 0);
  assert.ok(validateStageReviewsShape(workAt('V3', 'IN_PROGRESS', [{ stage: 'V3', decompositionConfirmation: confirmation('V3') }])).length === 0);
});

test('布局确认不得早于拆解确认，且两条确认都绑定 V3 用户消息', () => {
  const earlierLayout = {
    stage: 'V3',
    decompositionConfirmation: confirmation('V3', '2026-10-20T10:02:00+08:00'),
    layoutConfirmation: confirmation('V3', '2026-10-20T10:01:00+08:00'),
  };
  assert.ok(validateStageReviewsShape(workAt('V3', 'IN_PROGRESS', [earlierLayout])).length > 0);
  const wrongBinding = structuredClone(v3);
  wrongBinding.layoutConfirmation.userMessageRef = '';
  assert.ok(validateStageReviewsShape(workAt('V3', 'IN_PROGRESS', [wrongBinding])).length > 0);
});

test('确认记录必须属于当前工作项且匹配记录阶段', () => {
  const stale = structuredClone(v2);
  stale.confirmation.workItemId = 'WI-OTHER';
  const mismatchedStage = structuredClone(v4);
  mismatchedStage.confirmation.stage = 'V3';
  assert.ok(stageConfirmationBlockers(workAt('V4', 'IN_PROGRESS', [stale, mismatchedStage])).some((item) => item.code === 'STAGE_CONFIRMATION_STALE'));
  assert.ok(stageConfirmationBlockers(workAt('V4', 'IN_PROGRESS', [stale, mismatchedStage])).some((item) => item.code === 'STAGE_CONFIRMATION_PENDING'));
});

test('V0 与 V1 功能验证不要求视觉确认，V2 启动也不要求提前确认', () => {
  assert.deepEqual(stageConfirmationBlockers(workAt('V0', 'PASS')), []);
  assert.deepEqual(stageConfirmationBlockers(workAt('V1', 'PASS')), []);
  assert.deepEqual(stageConfirmationBlockers(workAt('V2')), []);
});

test('当前阶段 PASS 要确认当前阶段，V3 两项确认缺一不能推进 V4', () => {
  const v2Work = workAt('V2', 'PASS');
  assert.equal(stageConfirmationBlockers(v2Work)[0]?.code, 'STAGE_CONFIRMATION_PENDING');
  assert.deepEqual(stageConfirmationBlockers(workAt('V2', 'PASS', [v2])), []);

  const v3Work = workAt('V3', 'PASS', [v2, { stage: 'V3', decompositionConfirmation: v3.decompositionConfirmation }]);
  const missingLayout = stageConfirmationBlockers(v3Work);
  assert.equal(missingLayout.length, 1);
  assert.equal(missingLayout[0].code, 'STAGE_CONFIRMATION_PENDING');
  assert.deepEqual(stageConfirmationBlockers(workAt('V4', 'IN_PROGRESS', [v2, v3])), []);
});

test('V4 的 V3 前置确认按先后顺序校验，V5 和 COMPLETE 仍要求最终确认', () => {
  const reversed = {
    stage: 'V3',
    decompositionConfirmation: confirmation('V3', '2026-10-20T10:02:00+08:00'),
    layoutConfirmation: confirmation('V3', '2026-10-20T10:01:00+08:00'),
  };
  assert.ok(stageConfirmationBlockers(workAt('V4', 'IN_PROGRESS', [v2, reversed])).some((item) => item.code === 'STAGE_CONFIRMATION_ORDER_INVALID'));

  const beforeV5Confirm = stageConfirmationBlockers(workAt('V5', 'PASS', [v2, v3, v4]));
  assert.ok(beforeV5Confirm.some((item) => item.code === 'STAGE_CONFIRMATION_PENDING'));
  assert.deepEqual(stageConfirmationBlockers(workAt('V5', 'IN_PROGRESS', [v2, v3, v4, v5]), null, 'COMPLETE'), []);
});
