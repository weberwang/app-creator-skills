import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from '../../../app-skill-runtime/ajv2020.mjs';
import addFormats from '../../../app-skill-runtime/ajv-formats.mjs';
import { validateVisibleEvidenceContract, validateVisibleImplementationPackage, validateVisibleWorkItemContract } from './visible-contract.mjs';
import { stageConfirmationBlockers, validateStageReviewsShape } from './stage-confirmation.mjs';
import { validateVisualBaseline } from './visual-baseline-contract.mjs';
import { deriveReturnState, deriveReturnVisualStage, invalidateStageReviews } from './return-disposition.mjs';

/** 构造不携带视觉目标的功能工作项，专门验证阶段边界。 */
function makeWork(stage) {
  return { visualStageModel: 'function-first-v1', workItemType: 'SCENE', workItemId: 'scene-1', projectId: 'project-1', stageId: 'scene-production', globalState: 'REVIEW', scene: { sceneId: 'main', stage, status: 'PASS' } };
}

test('V1 可独立实施功能而不需要视觉合同、基线或人工选图', () => {
  const work = makeWork('V1');
  assert.deepEqual(validateVisibleWorkItemContract(work), []);
  const { visualStageModel, ...oldWork } = work;
  assert.match(validateVisibleWorkItemContract(oldWork).join('\n'), /visualStageModel/);
  assert.match(validateVisibleWorkItemContract({ ...work, visualStageModel: 'old' }).join('\n'), /visualStageModel/);
  assert.deepEqual(validateVisibleImplementationPackage({ workItemType: 'SCENE', executionUnits: [{ unitType: 'SCENE', unitId: 'u1', sceneId: 'main' }] }, work, process.cwd()), []);
  assert.deepEqual(validateVisualBaseline(work, {}, process.cwd()), []);
  assert.deepEqual(stageConfirmationBlockers(work), []);
  const visualWork = makeWork('V2');
  assert.ok(validateVisibleWorkItemContract(visualWork).length > 0);
  assert.ok(validateVisualBaseline(visualWork, {}, process.cwd()).length > 0);
  visualWork.scene.status = 'IN_PROGRESS';
  assert.deepEqual(validateVisualBaseline(visualWork, {}, process.cwd()), []);
});

test('V4 资源证据不冒充 V5 运行验收，V5 不能缺少运行和人工材料', () => {
  const evidence = { visualStageModel: 'function-first-v1', workItemType: 'SCENE', visualStage: 'V4', verdict: 'PASS', contractVersions: { responsiveContract: '1' } };
  assert.deepEqual(validateVisibleEvidenceContract(evidence, makeWork('V4'), process.cwd()), []);
  const { visualStageModel, ...oldEvidence } = evidence;
  assert.match(validateVisibleEvidenceContract(oldEvidence, makeWork('V4'), process.cwd()).join('\n'), /visualStageModel/);
  assert.match(validateVisibleEvidenceContract({ ...evidence, visualStageModel: 'old' }, makeWork('V4'), process.cwd()).join('\n'), /visualStageModel/);
  const errors = validateVisibleEvidenceContract({ ...evidence, visualStage: 'V5' }, makeWork('V5'), process.cwd());
  assert.match(errors.join('\n'), /V5|artExperienceAcceptanceRef|responsiveEvidence/);
  assert.match(validateVisibleEvidenceContract(evidence, makeWork('V5'), process.cwd()).join('\n'), /阶段/);
});

test('视觉阶段身份在场景与显示层的 V1–V5 证据中均独立校验', () => {
  for (const type of ['SCENE', 'DISPLAY_LAYER']) {
    for (const stage of ['V1', 'V2', 'V3', 'V4', 'V5']) {
      const work = type === 'SCENE' ? makeWork(stage) : { ...makeWork(stage), workItemType: type, scene: undefined, displayLayer: { displayLayerId: 'popup', hostSceneId: 'main', type: 'popup', stage, status: 'IN_PROGRESS' } };
      const evidence = { workItemType: type, visualStageModel: 'function-first-v1', visualStage: stage, verdict: 'NOT_RUN', contractVersions: { responsiveContract: '1' } };
      assert.deepEqual(validateVisibleEvidenceContract(evidence, work, process.cwd()), [], `${type} ${stage}`);
      const { visualStageModel, ...oldEvidence } = evidence;
      assert.match(validateVisibleEvidenceContract(oldEvidence, work, process.cwd()).join('\n'), /visualStageModel/, `${type} ${stage}`);
      assert.match(validateVisibleEvidenceContract({ ...evidence, visualStageModel: 'old' }, work, process.cwd()).join('\n'), /visualStageModel/, `${type} ${stage}`);
    }
  }
});

test('阶段确认仅记录 V2–V5，V3 拆解和布局必须分别确认', () => {
  assert.deepEqual(validateStageReviewsShape({ ...makeWork('V1'), stageReviews: [] }), []);
  assert.match(validateStageReviewsShape({ ...makeWork('V2'), stageReviews: [{ stage: 'V1' }] }).join('\n'), /只能是 V2/);
  assert.match(validateStageReviewsShape({ ...makeWork('V3'), stageReviews: [{ stage: 'V3', confirmation: {} }] }).join('\n'), /分别使用/);
  assert.equal(stageConfirmationBlockers(makeWork('V4'), null, 'COMPLETE')[0].code, 'STAGE_COMPLETE_REQUIRES_V5');
  // 合成确认仅用于验证阶段组合，不代表用户已验收。
  const receipt = (stage) => ({ workItemId: 'scene-1', stage, confirmedBy: 'user', confirmedAt: '2026-10-28T00:00:00Z', userMessageRef: 'example' });
  const work = { ...makeWork('V5'), stageReviews: [{ stage: 'V2', confirmation: receipt('V2') }, { stage: 'V3', decompositionConfirmation: receipt('V3'), layoutConfirmation: receipt('V3') }, { stage: 'V4', confirmation: receipt('V4') }, { stage: 'V5', confirmation: receipt('V5') }] };
  assert.deepEqual(validateStageReviewsShape(work), []);
  assert.deepEqual(stageConfirmationBlockers(work, null, 'COMPLETE'), []);
});

test('Unity 场景与显示层 schema 均接受 V0–V5，V1 不需要响应式视觉合同', () => {
  const schema = JSON.parse(readFileSync(new URL('../../schemas/work-item.schema.json', import.meta.url), 'utf8'));
  const ajv = new Ajv2020({ strict: false });
  const scene = ajv.compile(schema.properties.scene);
  const layer = ajv.compile({ $defs: schema.$defs, $ref: '#/$defs/displayLayer' });
  for (const stage of ['V0', 'V1', 'V2', 'V3', 'V4', 'V5']) {
    assert.equal(scene({ sceneId: 'main', stage, status: 'IN_PROGRESS' }), true, stage);
    assert.equal(layer({ displayLayerId: 'popup', hostSceneId: 'main', type: 'popup', stage, status: 'IN_PROGRESS' }), true, stage);
  }
  const constraints = ajv.compile({ allOf: schema.allOf.filter((rule) => ['SCENE', 'DISPLAY_LAYER'].includes(rule.if?.properties?.workItemType?.const)) });
  assert.equal(constraints(makeWork('V1')), true, JSON.stringify(constraints.errors));
  const identity = ajv.compile({ properties: { visualStageModel: schema.properties.visualStageModel }, allOf: schema.allOf.filter((rule) => rule.then?.required?.includes('visualStageModel')) });
  for (const type of ['SCENE', 'DISPLAY_LAYER']) {
    assert.equal(identity({ workItemType: type, visualStageModel: 'function-first-v1' }), true);
    assert.equal(identity({ workItemType: type }), false);
    assert.equal(identity({ workItemType: type, visualStageModel: 'old' }), false);
  }
  assert.equal(identity({ workItemType: 'PROJECT' }), true);
  assert.equal(constraints(makeWork('V2')), false);
});

test('Evidence Schema 在 V1 不要求视觉版本，V5 必须具备运行证据', () => {
  const schema = JSON.parse(readFileSync(new URL('../../schemas/evidence-manifest.schema.json', import.meta.url), 'utf8'));
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const evidence = { visualStageModel: 'function-first-v1', schemaVersion: '1.0', evidenceId: 'e', workItemId: 'w', packageId: 'p', workItemType: 'SCENE', visualStage: 'V1', baselineHash: 'baseline', recordedAt: '2026-10-28T00:00:00Z', verdict: 'PASS', gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, { status: 'PASS' }])) };
  assert.equal(validate(evidence), true, JSON.stringify(validate.errors));
  const { visualStageModel, ...oldEvidence } = evidence;
  assert.equal(validate(oldEvidence), false);
  assert.equal(validate({ ...evidence, visualStageModel: 'old' }), false);
  assert.equal(validate({ ...oldEvidence, workItemType: 'PROJECT' }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...evidence, visualStage: 'V2' }), false);
  assert.equal(validate({ ...evidence, visualStage: 'V4', contractVersions: { responsiveContract: '1' } }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...evidence, visualStage: 'V5', contractVersions: { responsiveContract: '1' } }), false);
});

test('功能变化退回 V1；纯运行修复保留 V4 资源确认', () => {
  const work = makeWork('V5');
  const functional = { returnState: deriveReturnState(['stage:V1']), affectedScope: ['stage:V1'] };
  assert.equal(deriveReturnVisualStage(work, functional), 'V1');
  assert.equal(deriveReturnVisualStage(work, { returnState: 'IMPLEMENTING', affectedScope: ['artifact:Assets/test.cs'] }), 'V5');
});


test('纯工程返修保留 V2–V4 确认，显式范围仍撤销受影响阶段', () => {
  const reviews = ['V2', 'V3', 'V4', 'V5'].map((stage) => ({ stage }));
  const stages = (work, scopes) => invalidateStageReviews(work, { affectedScope: scopes, returnState: deriveReturnState(scopes) }).map((review) => review.stage);
  for (const current of ['V3', 'V4', 'V5']) {
    const work = { ...makeWork(current), stageReviews: reviews.filter((review) => review.stage <= current) };
    const record = { affectedScope: ['artifact:Assets/test.cs'], returnState: 'IMPLEMENTING' };
    assert.equal(deriveReturnVisualStage(work, record), current);
    assert.deepEqual(stages(work, record.affectedScope), reviews.filter((review) => review.stage <= current && review.stage !== 'V5').map((review) => review.stage));
  }
  const work = { ...makeWork('V5'), stageReviews: reviews };
  assert.deepEqual(stages(work, ['stage:V1']), []);
  assert.deepEqual(stages(work, ['stage:V3']), ['V2']);
  assert.deepEqual(stages(work, ['stage:V4', 'artifact:Assets/test.cs']), ['V2', 'V3']);
  assert.deepEqual(stages(work, ['scene:main', 'artifact:Assets/test.cs']), []);
  assert.deepEqual(stages(work, ['stage:foundation-engineering']), ['V2', 'V3']);
});
