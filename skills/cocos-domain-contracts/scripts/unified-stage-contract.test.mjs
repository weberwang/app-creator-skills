import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../app-skill-runtime/ajv2020.mjs';
import addFormats from '../../app-skill-runtime/ajv-formats.mjs';

/** 构造无需视觉素材的真实 V1 功能包，验证其仍遵守实施单元合同。 */
function functionPackage() {
  return {
    packageId: 'pkg', workItemId: 'work', baselineVersion: '1', approvedRequirements: ['req'], approvedArchitecture: '功能方案',
    fileOwnership: { 'src': 'owner' }, allowedPaths: ['src'], forbiddenPaths: [], expectedAddedFiles: [], expectedDeletedFiles: [],
    testScope: ['功能验证'], compatibilityStrategy: '无旧版兼容', definitionOfDone: ['功能通过'], current_stage: 'V1', visualStageModel: 'function-first-v1',
    executionUnits: [{ unitId: 'unit', unitType: 'SCENE', scopeId: 'scope', moduleId: 'module', sceneId: 'scene', displayLayerId: null, hostSceneId: null,
      owner: 'owner', parallelMode: 'SERIAL', parallelGroup: null, ownedPaths: ['src'], stateOwnership: ['state'], acceptanceCommands: ['node --test'], serializationReason: '场景单写者', highFidelityPrerequisite: null }],
  };
}

for (const stack of ['cocos', 'phaser', 'threejs']) {
  test(`${stack} V0–V5 功能前置与视觉门使用同一语义标记`, async (t) => {
    const base = new URL(`../../${stack}-domain-contracts/`, import.meta.url);
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const visualSchema = JSON.parse(readFileSync(new URL('references/visual-stage.schema.json', base), 'utf8'));
    const validateVisual = ajv.compile(visualSchema);
    for (const stage of ['V0', 'V1']) {
      const work = { visualStageModel: 'function-first-v1', visualStage: stage, visualStageState: 'in-progress' };
      assert.equal(validateVisual(work), true, JSON.stringify(validateVisual.errors));
      assert.equal(validateVisual({ ...work, globalStaticBaselineState: 'global-static-baseline-frozen' }), false);
      const { visualStageModel, ...legacy } = work;
      assert.equal(validateVisual(legacy), false, '未标识的旧阶段不能按新阶段读取');
    }
    const schema = JSON.parse(readFileSync(new URL('references/implementation-package.schema.json', base), 'utf8'));
    const validatePackage = ajv.compile(schema);
    const pkg = functionPackage();
    assert.equal(validatePackage(pkg), true, JSON.stringify(validatePackage.errors));
    assert.equal(validatePackage({ ...pkg, visualContractVersion: '1' }), false, 'V1 不得声明正式视觉生产');
    const { visualStageModel, ...legacy } = pkg;
    assert.equal(validatePackage(legacy), false, '有阶段的旧实施包必须拒绝');
    const validatePrerequisite = ajv.compile({ $defs: schema.$defs, $ref: '#/$defs/highFidelityPrerequisite' });
    const prerequisite = { visualStageModel: 'function-first-v1', workItemId: 'work', status: 'COMPLETE', stage: 'V3', frozen: true,
      sceneId: 'scene', displayLayerId: null, hostSceneId: null, evidenceFile: 'evidence/plan.json' };
    assert.equal(validatePrerequisite(prerequisite), true, JSON.stringify(validatePrerequisite.errors));
    const { visualStageModel: prereqModel, ...oldPrerequisite } = prerequisite;
    assert.equal(validatePrerequisite(oldPrerequisite), false, '旧视觉前置不能被误读为 V3');
    const gate = await import(new URL('scripts/high-fidelity-prerequisite.mjs', base));
    const work = { workItemId: 'work', visualStage: 'V1', visualStageModel: 'function-first-v1', visualStageState: 'in-progress' };
    assert.equal(gate.assertFormalImplementationAfterV3(work, pkg), true);
    assert.equal(gate.assertFormalExecutionAfterV4(work, pkg), true);
    assert.throws(() => gate.assertFormalImplementationAfterV3({ ...work, visualStageModel: undefined }, pkg), /visualStageModel/);
    assert.throws(() => gate.assertFormalImplementationAfterV3({ ...work, visualIntegration: { formalRuntimeConsumption: true } }, pkg));
    assert.throws(() => gate.assertFormalExecutionAfterV4({ ...work, visualIntegration: { formalRuntimeConsumption: true } }, pkg));
    const integrationPackage = { workItemId: 'work', executionUnits: [{ unitId: 'integration', unitType: 'INTEGRATION', highFidelityPrerequisite: null }] };
    const integrationWork = { workItemId: 'work' };
    assert.equal(gate.assertFormalImplementationAfterV3(integrationWork, integrationPackage), true);
    assert.equal(gate.assertFormalExecutionAfterV4(integrationWork, integrationPackage), true);
    assert.throws(() => gate.assertFormalExecutionAfterV4({ ...integrationWork, visualIntegration: { formalRuntimeConsumption: true } }, integrationPackage), /V5|视觉/);
    assert.throws(() => gate.assertFormalImplementationAfterV3(integrationWork, { ...integrationPackage, visualManifestFile: 'visual-assets.json' }), /V3|视觉/);
    assert.throws(() => gate.assertFormalImplementationAfterV3(integrationWork, { ...integrationPackage, executionUnits: [...integrationPackage.executionUnits, { unitId: 'scene', unitType: 'SCENE' }] }), /V3|视觉/);
    const stageGate = await import(new URL('scripts/visual-stage-prerequisites.mjs', base));
    assert(stageGate.validateVisualStageDeclaration({ visualStage: 'V2', visualStageState: 'in-progress' }).some((item) => item.errorCode === 'VISUAL_STAGE_MODEL_INVALID'));
    const scene = await import(new URL('scripts/scene-reconstruction-contract.mjs', base));
    const production = await import(new URL('scripts/visual-production-contract.mjs', base));
    const legacyGate = { visual_production_gate: { status: 'passed', v2_status: 'passed', v3_status: 'passed', v4_status: 'passed' } };
    const legacyGateErrors = production.validateV5ProductionGate(legacyGate);
    assert(legacyGateErrors.some((item) => item.includes('禁止旧阶段字段 v2_status')));
    assert(legacyGateErrors.some((item) => item.includes('V5 runtime integration 未通过')));
    const identityManifest = { visualStageModel: 'function-first-v1', visualStage: 'V5' };
    const identityError = 'visualStage 必须与校验阶段完全一致';
    assert(scene.validateSceneReconstructionContract({}, identityManifest, { stage: 'V2' }).some((item) => item.includes(identityError)));
    assert(scene.validateSceneReconstructionContract({}, { ...identityManifest, visualStage: undefined }, { stage: 'V2' }).some((item) => item.includes(identityError)));
    for (const stage of ['V2', 'V3', 'V4', 'V5']) {
      assert(!scene.validateSceneReconstructionContract({}, { ...identityManifest, visualStage: stage }, { stage }).some((item) => item.includes(identityError)));
    }
    const legacyScene = scene.validateSceneReconstructionContract({}, { visualStage: 'V2' }, { stage: 'V2' });
    assert(legacyScene.some((item) => item.includes('visualStageModel')));
    const functionStage = scene.validateSceneReconstructionContract({}, { visualStageModel: 'function-first-v1' }, { stage: 'V1' });
    assert(functionStage.some((item) => item.includes('只接受 V2–V5')));
    const integration = { cocos: 'cocos-game-asset-integration', phaser: 'phaser4-game-asset-integration', threejs: 'threejs-game-asset-integration' }[stack];
    const manifest = await import(new URL(`../../${integration}/scripts/validate_visual_manifest.mjs`, import.meta.url));
    const fileGate = { visualStageModel: 'function-first-v1', visualStage: 'V5', effect_image_reconstruction: { applicability: 'effect-image', lifecycle: 'v3-ready' } };
    const implicitErrors = await manifest.checkManifestFiles(fileGate, process.cwd());
    const explicitErrors = await manifest.checkManifestFiles(fileGate, process.cwd(), { stage: 'V5' });
    assert.deepEqual(implicitErrors, explicitErrors, '隐式阶段必须执行与显式 V5 完全一致的文件门');
    assert(implicitErrors.some((item) => /production_contract_audit|visual_production_gate/.test(item)), '必须执行 V5 生产审计');
    const fixtures = await import(new URL(`../../${integration}/scripts/visual-manifest-test-fixtures.mjs`, import.meta.url));
    const root = mkdtempSync(join(tmpdir(), 'stage-audit-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const auditManifest = fixtures.validManifest();
    auditManifest.effect_image_reconstruction.lifecycle = 'v3-ready';
    await fixtures.createFixtureFiles(root);
    await fixtures.writeConfirmationFixtureFiles(root, auditManifest);
    // 生命周期仍在进行时，V5 清单也必须逐项比对实际产出而不是退回 V3。
    auditManifest.production_contract_audit.units[0].actual_assets[0].width += 1;
    const implicitAudit = await fixtures.checkManifestFiles(auditManifest, root);
    const explicitAudit = await fixtures.checkManifestFiles(auditManifest, root, { stage: 'V5' });
    assert.deepEqual(implicitAudit, explicitAudit);
    assert(implicitAudit.some((item) => item.includes('width') && item.includes('不一致')), implicitAudit.join('\n'));
    const legacyManifest = { visualStage: 'V3', visualStageState: 'v3-production-planning-complete' };
    assert(manifest.validateManifest(legacyManifest, { stage: 'V3' }).some((item) => item.includes('visualStageModel')));
    assert((await manifest.checkManifestFiles(legacyManifest, process.cwd(), { stage: 'V3' })).some((item) => item.includes('visualStageModel')));
  });
}
