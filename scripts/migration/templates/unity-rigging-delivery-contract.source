import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectRiggingDelivery,
  validateRiggingDeliveryEvidenceShape,
  validateRiggingDeliveryShape,
  validateRiggingDeliveryWorkItem,
} from './rigging-delivery-contract.mjs';

/** 构造最小正式角色合同，用于覆盖领域校验而不依赖旧全局控制器。 */
function validDelivery() {
  return {
    owners: { technicalArt: 'ta-1', rigging: 'rig-1', visualAssets: 'art-1', gameplay: 'game-1', qa: 'qa-1' },
    characters: [{
      characterId: 'hero',
      prefabPath: 'Assets/Characters/Hero.prefab',
      prefabGuid: '0123456789abcdef0123456789abcdef',
      sourceRevision: 'hero-v3',
      updatedAt: '2026-10-26T00:00:00Z',
      requiredRuntimeCases: ['runtime-instantiation', 'animation-playback'],
    }],
  };
}

test('骨骼交付合同校验正式角色、唯一负责人和运行回归范围', () => {
  const delivery = validDelivery();
  assert.deepEqual(validateRiggingDeliveryShape(delivery), []);
  assert.deepEqual(validateRiggingDeliveryWorkItem({ domain: '2d-rigging', riggingDelivery: delivery }, 'unity-asset-change'), []);
  assert.match(validateRiggingDeliveryWorkItem({ domain: '2d-rigging' }, 'unity-asset-change').join('\n'), /必须声明 riggingDelivery/);

  const invalid = validDelivery();
  invalid.owners.qa = invalid.owners.rigging;
  invalid.characters[0].prefabPath = 'Assets/__UwtRiggingTests_fixture/Hero.prefab';
  invalid.characters[0].requiredRuntimeCases = ['runtime-instantiation'];
  const errors = validateRiggingDeliveryShape(invalid).join('\n');
  assert.match(errors, /必须独立于生产负责人/);
  assert.match(errors, /不能使用骨骼检查夹具/);
  assert.match(errors, /缺少 animation-playback/);
});

test('交接证据缺失时由领域合同阻断并派发独立 QA 复验', () => {
  const work = { globalState: 'VALIDATING', riggingDelivery: validDelivery() };
  const result = inspectRiggingDelivery({ work, evidence: { verdict: 'PASS' }, repo: process.cwd() });
  assert.equal(result.handoffAllowed, false);
  assert.equal(result.blockers[0].code, 'RIGGING_DELIVERY_EVIDENCE_MISSING');
  assert.equal(result.repairs[0].role, 'qa');
  assert.equal(result.repairs[0].assignee, 'qa-1');
  assert.equal(JSON.stringify(result).includes(process.cwd()), false);
});

test('证据报告拒绝未声明字段和不完整的角色绑定', () => {
  const errors = validateRiggingDeliveryEvidenceShape({
    characters: [{ characterId: 'hero', prefabPath: 'Assets/Characters/Hero.prefab', extraEvidence: true }],
  }).join('\n');
  assert.match(errors, /未声明字段 extraEvidence/);
  assert.match(errors, /prefabGuid/);
  assert.match(errors, /regression/);
});
