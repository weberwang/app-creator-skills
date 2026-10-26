import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import * as unity from '../skills/unity-domain-contracts/scripts/unity-contract-validation.mjs';

/** 构造覆盖 Unity 工程字段的有效工作项。 */
function workItem(overrides = {}) {
  return {
    schemaVersion: '1.0', workItemId: 'work-native-unity', projectId: 'native-fixture',
    workItemType: 'FOUNDATION', moduleIds: ['gameplay', 'ui'], stageId: 'foundation-engineering',
    globalState: 'IMPLEMENTING', baselineHash: 'baseline-native', revision: 0,
    objective: '验证迁入的 Unity 原生合同', allowedPaths: ['Assets/**', 'ProjectSettings/**', 'Packages/**', 'Build/**'],
    forbiddenPaths: [], allowedActions: ['unity-code-change'], prohibitedActions: [],
    actionType: 'unity-code-change', actionLevel: 'A3', validationPlan: ['compile', 'domainReload'],
    ...overrides,
  };
}

/** 构造包含 .meta、GUID/Importer 及序列化资源所有权的有效实施包。 */
function implementationPackage(work, overrides = {}) {
  const files = ['Assets/Example.prefab', 'Assets/Example.prefab.meta'];
  return {
    schemaVersion: '1.0', packageId: 'package-native-unity', workItemId: work.workItemId,
    workItemType: work.workItemType, baselineHash: work.baselineHash, stageId: work.stageId,
    fileOwnership: Object.fromEntries(files.map((file) => [file, 'builder'])), expectedFiles: files,
    executionUnits: [{ unitId: 'gameplay-unit', unitType: 'MODULE', moduleId: 'gameplay', owner: 'builder', files, status: 'READY', acceptanceCommands: ['node --check Assets/Example.mjs'] }],
    packageStatus: 'IN_PROGRESS',
    unityOwnership: {
      metaPairs: [{ asset: 'Assets/Example.prefab', meta: 'Assets/Example.prefab.meta' }],
      guidImporter: ['Assets/Example.prefab'], serializedAssets: ['Assets/Example.prefab'],
      scenePrefabScriptableObject: [], projectSettingsPackagesBuildSettings: [],
    },
    ...overrides,
  };
}

/** 构造覆盖 Unity 编译和 Domain Reload 字段的合成 PASS 证据。 */
function evidence(work, overrides = {}) {
  return {
    schemaVersion: '1.0', evidenceId: 'evidence-native-unity', workItemId: work.workItemId,
    packageId: 'package-native-unity', workItemType: work.workItemType, visualStage: 'V0',
    contractVersions: { responsiveContract: 'unity-responsive/1.0' }, baselineHash: work.baselineHash,
    recordedAt: '2026-10-26T00:00:00.000Z', verdict: 'PASS',
    gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, {
      status: gate === 'F4' ? 'NOT_RUN' : 'PASS', summary: 'synthetic evidence', evidenceRefs: [],
    }])),
    unityEvidence: { editorStable: 'PASS', compile: 'PASS', domainReload: 'PASS', console: 'PASS', scenePrefabImporterGuid: 'PASS' },
    ...overrides,
  };
}

test('发布目录中的 Unity 原生校验模块保留工程约束并拒绝违规实施包', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'unity-domain-delivery-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));

  assert.deepEqual(Object.keys(unity).sort(), [
    'approvalMatches', 'assertPathOwnership', 'requiresExactApproval', 'statusOf',
    'validateEvidence', 'validateImplementationPackage', 'validateWorkItem',
  ]);
  const work = unity.validateWorkItem(workItem());
  const valid = implementationPackage(work);
  assert.equal(unity.validateImplementationPackage(valid, work, project).packageId, valid.packageId);

  const missingMeta = structuredClone(valid);
  missingMeta.expectedFiles = ['Assets/Example.prefab'];
  missingMeta.executionUnits[0].files = ['Assets/Example.prefab'];
  delete missingMeta.fileOwnership['Assets/Example.prefab.meta'];
  assert.throws(() => unity.validateImplementationPackage(missingMeta, work, project), /\.meta/);

  const missingGuid = structuredClone(valid);
  missingGuid.unityOwnership.guidImporter = [];
  assert.throws(() => unity.validateImplementationPackage(missingGuid, work, project), /GUID\/Importer/);

  const missingSerializedOwner = structuredClone(valid);
  missingSerializedOwner.unityOwnership.serializedAssets = [];
  assert.throws(() => unity.validateImplementationPackage(missingSerializedOwner, work, project), /序列化 Unity 资源/);
});

test('Unity 工程共享设置必须串行，Editor 正式写入者必须唯一', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'unity-domain-ownership-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  const work = unity.validateWorkItem(workItem());
  const shared = implementationPackage(work, {
    expectedFiles: ['ProjectSettings/EditorSettings.asset'],
    fileOwnership: { 'ProjectSettings/EditorSettings.asset': 'builder' },
    executionUnits: [{ unitId: 'shared-settings', unitType: 'SHARED', moduleId: 'gameplay', owner: 'builder', files: ['ProjectSettings/EditorSettings.asset'], status: 'READY', parallelGroup: 'parallel-settings', acceptanceCommands: ['node --check settings.mjs'] }],
    unityOwnership: { metaPairs: [], guidImporter: [], serializedAssets: [], scenePrefabScriptableObject: [], projectSettingsPackagesBuildSettings: ['ProjectSettings/EditorSettings.asset'] },
  });
  assert.throws(() => unity.validateImplementationPackage(shared, work, project), /必须串行/);

  const files = ['Assets/Gameplay.cs', 'Assets/Gameplay.cs.meta', 'Assets/Ui.cs', 'Assets/Ui.cs.meta'];
  const multiWriter = implementationPackage(work, {
    expectedFiles: files,
    fileOwnership: Object.fromEntries([['Assets/Gameplay.cs', 'gameplay-owner'], ['Assets/Gameplay.cs.meta', 'gameplay-owner'], ['Assets/Ui.cs', 'ui-owner'], ['Assets/Ui.cs.meta', 'ui-owner']]),
    executionUnits: [
      { unitId: 'gameplay', unitType: 'MODULE', moduleId: 'gameplay', owner: 'gameplay-owner', files: files.slice(0, 2), status: 'READY', acceptanceCommands: ['node --check gameplay.mjs'] },
      { unitId: 'ui', unitType: 'MODULE', moduleId: 'ui', owner: 'ui-owner', files: files.slice(2), status: 'READY', acceptanceCommands: ['node --check ui.mjs'] },
    ],
    unityOwnership: { metaPairs: [{ asset: files[0], meta: files[1] }, { asset: files[2], meta: files[3] }], guidImporter: [files[0], files[2]], serializedAssets: [], scenePrefabScriptableObject: [], projectSettingsPackagesBuildSettings: [] },
  });
  assert.throws(() => unity.validateImplementationPackage(multiWriter, work, project), (error) => error.details?.errorCode === 'UNITY_SINGLE_WRITER');
});

test('Unity PASS 证据必须包含 compile 和 domainReload', () => {
  const work = unity.validateWorkItem(workItem());
  const valid = evidence(work);
  assert.equal(unity.validateEvidence(valid, work).verdict, 'PASS');
  for (const field of ['compile', 'domainReload']) {
    const incomplete = structuredClone(valid);
    delete incomplete.unityEvidence[field];
    assert.throws(() => unity.validateEvidence(incomplete, work), new RegExp(`${field}.*必须为 PASS`));
  }
});
