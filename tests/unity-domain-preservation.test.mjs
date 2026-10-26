import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after, before, describe } from 'node:test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { extractUnityDomainValidation } from '../scripts/migration/unity-domain-extraction.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unitySkillsRoot = process.env.APP_CREATOR_UNITY_SOURCE_ROOT ?? path.resolve(repositoryRoot, '..', 'unity-skills');
const unityWorkflowRoot = path.join(unitySkillsRoot, 'unity-game-workflow-control');
const hasUnitySource = existsSync(path.join(unityWorkflowRoot, 'scripts', 'workflow-control.mjs'));

/** 比较结果和稳定错误字段，避免不同模块副本的异常原型影响等价性断言。 */
function outcome(run) {
  try {
    return { ok: true, value: run() };
  } catch (error) {
    return {
      ok: false,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
}

/** 构造通过 Unity 原生 Work Item 合同的工程级工作项。 */
function createWorkItem(overrides = {}) {
  return {
    schemaVersion: '1.0',
    workItemId: 'work-unity-contracts',
    projectId: 'sample-game',
    workItemType: 'FOUNDATION',
    moduleIds: ['gameplay', 'ui'],
    stageId: 'foundation-engineering',
    globalState: 'IMPLEMENTING',
    baselineHash: 'baseline-sha256',
    revision: 0,
    objective: '保留Unity领域合同校验',
    allowedPaths: ['Assets/**', 'ProjectSettings/**', 'Packages/**', 'Build/**'],
    forbiddenPaths: [],
    allowedActions: ['unity-code-change'],
    prohibitedActions: [],
    actionType: 'unity-code-change',
    actionLevel: 'A3',
    validationPlan: ['compile', 'domainReload'],
    ...overrides,
  };
}

/** 构造包含 prefab、配对 meta、GUID/Importer 和序列化资源所有权的合法包。 */
function createImplementationPackage(work, overrides = {}) {
  const files = ['Assets/Example.prefab', 'Assets/Example.prefab.meta'];
  return {
    schemaVersion: '1.0',
    packageId: 'package-unity-contracts',
    workItemId: work.workItemId,
    workItemType: work.workItemType,
    baselineHash: work.baselineHash,
    stageId: work.stageId,
    fileOwnership: Object.fromEntries(files.map((file) => [file, 'builder'])),
    expectedFiles: files,
    executionUnits: [{
      unitId: 'gameplay-unit',
      unitType: 'MODULE',
      moduleId: 'gameplay',
      owner: 'builder',
      files,
      status: 'READY',
      acceptanceCommands: ['node --check Assets/Example.mjs'],
    }],
    packageStatus: 'IN_PROGRESS',
    unityOwnership: {
      metaPairs: [{ asset: 'Assets/Example.prefab', meta: 'Assets/Example.prefab.meta' }],
      guidImporter: ['Assets/Example.prefab'],
      serializedAssets: ['Assets/Example.prefab'],
      scenePrefabScriptableObject: [],
      projectSettingsPackagesBuildSettings: [],
    },
    ...overrides,
  };
}

/** 构造满足公共门状态形状、同时覆盖 Unity 实现必需字段的 PASS 证据。 */
function createEvidence(work, packageId = 'package-unity-contracts', overrides = {}) {
  return {
    schemaVersion: '1.0',
    evidenceId: 'evidence-unity-contracts',
    workItemId: work.workItemId,
    packageId,
    workItemType: work.workItemType,
    visualStage: 'V0',
    contractVersions: { responsiveContract: 'unity-responsive/1.0' },
    baselineHash: work.baselineHash,
    recordedAt: '2026-10-26T00:00:00.000Z',
    verdict: 'PASS',
    gateResults: Object.fromEntries(['F0', 'F1', 'F2', 'F3', 'F4'].map((gate) => [gate, {
      status: gate === 'F4' ? 'NOT_RUN' : 'PASS',
      summary: 'synthetic evidence',
      evidenceRefs: [],
    }])),
    unityEvidence: {
      editorStable: 'PASS',
      compile: 'PASS',
      domainReload: 'PASS',
      console: 'PASS',
      scenePrefabImporterGuid: 'PASS',
    },
    ...overrides,
  };
}

describe('Unity原实现与迁移抽取模块行为对照', { skip: !hasUnitySource ? '未提供五个只读源仓库，跳过附加行为对照' : false }, () => {
  let temporaryRoot;
  let original;
  let extracted;

  before(async () => {
    assert.ok(await pathExists(path.join(unityWorkflowRoot, 'scripts', 'workflow-control.mjs')),
      `找不到Unity源仓库：${unityWorkflowRoot}`);
    temporaryRoot = await mkdtemp(path.join(tmpdir(), 'unity-domain-preservation-'));
    const installRoot = path.join(temporaryRoot, 'skills', 'unity-domain-contracts');
    const scriptsRoot = path.join(installRoot, 'scripts');
    const sourceText = await (await import('node:fs/promises')).readFile(
      path.join(unityWorkflowRoot, 'scripts', 'workflow-control.mjs'), 'utf8',
    );
    const extractedSource = extractUnityDomainValidation(sourceText);

    await mkdir(scriptsRoot, { recursive: true });
    await cp(path.join(unityWorkflowRoot, 'scripts', 'runtime'), path.join(scriptsRoot, 'runtime'), { recursive: true });
    // 只复制Unity技术合同脚本，避免把美术素材与模板带入临时测试夹具。
    await cp(path.join(unitySkillsRoot, 'unity-development-workflow', 'scripts'), path.join(temporaryRoot, 'skills', 'unity-development-workflow', 'scripts'), { recursive: true });
    const extractedPath = path.join(scriptsRoot, 'unity-contract-validation.mjs');
    await writeFile(extractedPath, extractedSource, 'utf8');

    original = await import(pathToFileURL(path.join(unityWorkflowRoot, 'scripts', 'workflow-control.mjs')).href);
    extracted = await import(`${pathToFileURL(extractedPath).href}?test=${Date.now()}`);
  });

  after(async () => {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  });

  test('只暴露原生验证接口，不携带全局状态机执行入口', () => {
    assert.deepEqual(Object.keys(extracted).sort(), [
      'approvalMatches',
      'assertPathOwnership',
      'requiresExactApproval',
      'statusOf',
      'validateEvidence',
      'validateImplementationPackage',
      'validateWorkItem',
    ]);
  });

  test('Work Item、路径、审批与Unity状态辅助函数和原实现一致', () => {
    const work = createWorkItem();
    assert.deepEqual(outcome(() => extracted.validateWorkItem(work)), outcome(() => original.validateWorkItem(work)));
    assert.deepEqual(
      outcome(() => extracted.assertPathOwnership('Assets/Player.prefab', work.allowedPaths, work.forbiddenPaths)),
      outcome(() => original.assertPathOwnership('Assets/Player.prefab', work.allowedPaths, work.forbiddenPaths)),
    );
    assert.deepEqual(
      outcome(() => extracted.assertPathOwnership('ProjectSettings/EditorSettings.asset', ['Assets/**'], [])),
      outcome(() => original.assertPathOwnership('ProjectSettings/EditorSettings.asset', ['Assets/**'], [])),
    );
    for (const value of [true, false, 'PASS', { status: 'NOT_RUN' }, null]) {
      assert.deepEqual(extracted.statusOf(value), original.statusOf(value));
    }

    const approvedWork = createWorkItem({
      actionType: 'unity-integration',
      actionLevel: 'A4',
      pendingApproval: {
        approvalId: 'approval-1',
        actionType: 'unity-integration',
        actionLevel: 'A4',
        gate: 'F4',
        object: 'integrate project settings',
        impact: ['ProjectSettings/EditorSettings.asset'],
        target: ['Unity Editor'],
      },
    });
    const approval = {
      approvalId: 'approval-1',
      workItemId: approvedWork.workItemId,
      baselineHash: approvedWork.baselineHash,
      stageId: approvedWork.stageId,
      actionLevel: 'A4',
      gate: 'F4',
      actionType: 'unity-integration',
      object: 'integrate project settings',
      impact: ['ProjectSettings/EditorSettings.asset'],
      target: ['Unity Editor'],
      approvedAt: '2026-10-26T00:00:00.000Z',
      approvedBy: 'user',
    };
    assert.deepEqual(extracted.requiresExactApproval(approvedWork), original.requiresExactApproval(approvedWork));
    assert.equal(extracted.requiresExactApproval(approvedWork), true);
    assert.deepEqual(
      outcome(() => extracted.approvalMatches(approvedWork, approval)),
      outcome(() => original.approvalMatches(approvedWork, approval)),
    );
    assert.equal(extracted.approvalMatches(approvedWork, approval), true);
  });

  test('合法Unity实施包通过，遗漏.meta、GUID/Importer或序列化所有权时保持原错误', () => {
    const work = extracted.validateWorkItem(createWorkItem());
    const repo = path.join(temporaryRoot, 'synthetic-project');
    const validPackage = createImplementationPackage(work);
    assert.deepEqual(
      outcome(() => extracted.validateImplementationPackage(validPackage, work, repo)),
      outcome(() => original.validateImplementationPackage(validPackage, work, repo)),
    );
    assert.equal(extracted.validateImplementationPackage(validPackage, work, repo).packageId, validPackage.packageId);

    const cases = [
      ['缺少.meta配对文件', (pkg) => {
        pkg.expectedFiles = ['Assets/Example.prefab'];
        pkg.executionUnits[0].files = ['Assets/Example.prefab'];
        delete pkg.fileOwnership['Assets/Example.prefab.meta'];
      }],
      ['缺少GUID/Importer所有权', (pkg) => { pkg.unityOwnership.guidImporter = []; }],
      ['序列化资源缺少所有权', (pkg) => { pkg.unityOwnership.serializedAssets = []; }],
    ];
    for (const [label, mutate] of cases) {
      const invalidPackage = structuredClone(validPackage);
      mutate(invalidPackage);
      const extractedResult = outcome(() => extracted.validateImplementationPackage(invalidPackage, work, repo));
      const originalResult = outcome(() => original.validateImplementationPackage(invalidPackage, work, repo));
      assert.deepEqual(extractedResult, originalResult, label);
      assert.equal(extractedResult.ok, false, label);
    }
  });

  test('Unity共享设置必须串行，且正式Editor写入者必须唯一', () => {
    const work = extracted.validateWorkItem(createWorkItem());
    const repo = path.join(temporaryRoot, 'synthetic-project');
    const sharedPackage = createImplementationPackage(work, {
      expectedFiles: ['ProjectSettings/EditorSettings.asset'],
      fileOwnership: { 'ProjectSettings/EditorSettings.asset': 'builder' },
      executionUnits: [{
        unitId: 'shared-settings',
        unitType: 'SHARED',
        moduleId: 'gameplay',
        owner: 'builder',
        files: ['ProjectSettings/EditorSettings.asset'],
        status: 'READY',
        parallelGroup: 'parallel-settings',
        acceptanceCommands: ['node --check settings.mjs'],
      }],
      unityOwnership: {
        metaPairs: [],
        guidImporter: [],
        serializedAssets: [],
        scenePrefabScriptableObject: [],
        projectSettingsPackagesBuildSettings: ['ProjectSettings/EditorSettings.asset'],
      },
    });
    const sharedResult = outcome(() => extracted.validateImplementationPackage(sharedPackage, work, repo));
    assert.deepEqual(sharedResult, outcome(() => original.validateImplementationPackage(sharedPackage, work, repo)));
    assert.match(sharedResult.error.message, /必须串行/);

    const files = [
      'Assets/Gameplay.cs', 'Assets/Gameplay.cs.meta',
      'Assets/Ui.cs', 'Assets/Ui.cs.meta',
    ];
    const multiWriter = createImplementationPackage(work, {
      expectedFiles: files,
      fileOwnership: Object.fromEntries([
        ['Assets/Gameplay.cs', 'gameplay-owner'], ['Assets/Gameplay.cs.meta', 'gameplay-owner'],
        ['Assets/Ui.cs', 'ui-owner'], ['Assets/Ui.cs.meta', 'ui-owner'],
      ]),
      executionUnits: [
        { unitId: 'gameplay', unitType: 'MODULE', moduleId: 'gameplay', owner: 'gameplay-owner', files: files.slice(0, 2), status: 'READY', acceptanceCommands: ['node --check gameplay.mjs'] },
        { unitId: 'ui', unitType: 'MODULE', moduleId: 'ui', owner: 'ui-owner', files: files.slice(2), status: 'READY', acceptanceCommands: ['node --check ui.mjs'] },
      ],
      unityOwnership: {
        metaPairs: [
          { asset: 'Assets/Gameplay.cs', meta: 'Assets/Gameplay.cs.meta' },
          { asset: 'Assets/Ui.cs', meta: 'Assets/Ui.cs.meta' },
        ],
        guidImporter: ['Assets/Gameplay.cs', 'Assets/Ui.cs'],
        serializedAssets: [],
        scenePrefabScriptableObject: [],
        projectSettingsPackagesBuildSettings: [],
      },
    });
    const writerResult = outcome(() => extracted.validateImplementationPackage(multiWriter, work, repo));
    assert.deepEqual(writerResult, outcome(() => original.validateImplementationPackage(multiWriter, work, repo)));
    assert.equal(writerResult.error.details.errorCode, 'UNITY_SINGLE_WRITER');
  });

  test('A2-A4 Unity PASS证据缺compile或domainReload时保持原门禁错误', () => {
    const work = extracted.validateWorkItem(createWorkItem());
    const baseEvidence = createEvidence(work);
    assert.deepEqual(
      outcome(() => extracted.validateEvidence(baseEvidence, work)),
      outcome(() => original.validateEvidence(baseEvidence, work)),
    );

    for (const field of ['compile', 'domainReload']) {
      const evidence = structuredClone(baseEvidence);
      delete evidence.unityEvidence[field];
      const extractedResult = outcome(() => extracted.validateEvidence(evidence, work));
      const originalResult = outcome(() => original.validateEvidence(evidence, work));
      assert.deepEqual(extractedResult, originalResult, `缺少${field}证据`);
      assert.equal(extractedResult.ok, false, `缺少${field}证据`);
      assert.match(extractedResult.error.message, new RegExp(`${field}.*必须为 PASS`));
    }
  });
});

/** 判断源Unity合同技能是否在当前迁移工作区可用。 */
async function pathExists(target) {
  try {
    await (await import('node:fs/promises')).access(target);
    return true;
  } catch {
    return false;
  }
}
