/** 本文件只构造控制器合同测试替身，不运行引擎，也不代表真实人工验收。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

/** 构建隔离项目，文件摘要与用户消息均仅用于测试协议。 */
export function createWorld3DFixture(t, { stack = 'threejs', repo: sharedRepo, workItemId = 'world-task', controlPrefix = '' } = {}) {
  const repo = sharedRepo ?? mkdtempSync(join(tmpdir(), 'world3d-contract-'));
  if (!sharedRepo) t.after(() => {
    // 只删除本测试创建且确认位于系统临时目录下的独占目录。
    assert.equal(dirname(resolve(repo)), resolve(tmpdir()));
    assert.ok(basename(repo).startsWith('world3d-contract-'));
    rmSync(repo, { recursive: true, force: true });
  });
  const work = {
    schemaVersion: '1.0', workItemId, projectId: 'world-project',
    stack, workItemType: 'SCENE', evidenceRoot: `.workflow-control/evidence/${workItemId}`,
    visual: { objectId: 'world-scene', designRoute: 'world-3d', stageModel: 'function-first-v1', stage: 'V1', candidateId: 'world-candidate' },
  };
  const paths = [];

  /** 同项目后批使用独立控制记录；控制器证据目录已按工作项隔离，不重复加前缀。 */
  function fixturePath(path) {
    return controlPrefix && !path.startsWith(`${controlPrefix}/`) && !path.startsWith('.workflow-control/') ? `${controlPrefix}/${path}` : path;
  }

  /** 保存指定路径的合成材料并返回真实内容摘要。 */
  function write(path, data) {
    path = fixturePath(path);
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
    const full = join(repo, ...path.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, bytes);
    paths.push(path);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }

  /** 读取当前文件的内容与实际摘要，供测试构造合法或失效引用。 */
  function identity(path) {
    path = fixturePath(path);
    const bytes = readFileSync(join(repo, ...path.split('/')));
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }

  /** 读取合成 JSON，调用者可用 write 明确生成新版本。 */
  function read(ref) {
    return JSON.parse(readFileSync(join(repo, ...ref.path.split('/')), 'utf8'));
  }

  const context = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId };
  const scopeIds = ['world-scope'];
  const spatialSpecRef = write('spec/world-space.json', {
    ...context, dimension: 3, units: 'm', scopeIds,
    regions: [{ id: 'entry' }],
    camera: { position: [0, 5, 10], target: [0, 0, 0] }, playerScale: [0.6, 1.8, 0.6],
  });
  const blockoutRef = write('src/game/blockout-source.ts', '// 合成测试用三维白模源，不代表真实场景\n');
  const logs = {};
  for (const name of ['command', 'camera', 'navigation', 'collision', 'interaction']) {
    logs[name] = write(`${work.evidenceRoot}/blockout-${name}.txt`, `仅测试合同引用：${name}\n`);
  }
  const run = {
    ...context, phase: 'blockout', executionMode: 'engine', engineSessionId: 'synthetic-session',
    startedAt: '2026-11-15T00:00:00Z', completedAt: '2026-11-15T00:01:00Z',
    sceneRef: blockoutRef, commandEvidenceRef: logs.command,
    checks: ['camera', 'navigation', 'collision', 'interaction'].map((id) => ({ id, status: 'PASS', evidenceRef: logs[id] })),
  };
  const blockoutRunRef = write(`${work.evidenceRoot}/blockout-run.json`, run);
  const contract = {
    ...context, designRoute: 'world-3d', stage: 'V1', scopeIds,
    spatialSpecRef, blockoutRef, blockoutRunRef,
  };
  work.visual.domainEvidenceRef = write('spec/world-V1.json', contract);
  return { repo, work, paths, context, scopeIds, contract, run, logs, write, read, identity, sequence: 0 };
}

/** 创建指定阶段的合成引擎日志和关联检查，每个阶段独立记录来源。 */
function writeRun(fixture, work, phase, sceneRef, extra = {}) {
  const logs = {};
  for (const name of ['command', 'camera', 'navigation', 'collision', 'interaction']) {
    logs[name] = fixture.write(`${work.evidenceRoot}/${phase}-${name}.txt`, `仅用于控制器协议测试：${phase}/${name}\n`);
  }
  return fixture.write(`${work.evidenceRoot}/${phase}-run.json`, {
    ...fixture.context, phase, executionMode: 'engine', engineSessionId: `synthetic-${phase}`,
    startedAt: '2026-11-15T00:00:00Z', completedAt: '2026-11-15T00:01:00Z', sceneRef,
    commandEvidenceRef: logs.command,
    checks: ['camera', 'navigation', 'collision', 'interaction'].map((id) => ({ id, status: 'PASS', evidenceRef: logs[id] })),
    ...extra,
  });
}

/** 按当前场景和候选记录合成确认，测试消息不表示真实用户批准。 */
function writeApproval(fixture, name, stage, purpose, subjectRef, basisRefs) {
  return fixture.write(`reviews/${name}.json`, {
    ...fixture.context, stage, purpose, decision: 'APPROVED', userMessageRef: `test-only://${name}`,
    subjectRef, basisRefs,
  });
}

/** 建立不含图片候选的方向依据，并冻结其合成人工记录。 */
function attachBaseline(fixture, work) {
  if (fixture.directionRef) return;
  fixture.directionRef = fixture.write('spec/world-direction.md', '测试用风格与模型方向；不代表真实审美确认。\n');
  const selectionReviewRef = fixture.write('reviews/baseline.json', {
    schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, objectId: 'world-baseline',
    stage: 'BASELINE', purpose: 'visual-baseline', decision: 'APPROVED',
    userMessageRef: 'test-only://baseline', subjectRef: fixture.directionRef,
  });
  fixture.baselineRef = fixture.write('spec/world-baseline.json', {
    schemaVersion: '1.0', designRoute: 'world-3d', baselineId: 'world-baseline',
    projectId: work.projectId, stack: work.stack, directionRef: fixture.directionRef, selectionReviewRef,
  });
}

/** 建立空间联合审查、当前空间确认和正式方向确认的冻结关系。 */
function attachDesign(fixture, work, contract) {
  if (!fixture.reviewRef) {
    fixture.reviewRef = fixture.write('reviews/design-review.json', {
      ...fixture.context, kind: 'world-3d-design-review', rounds: 1, status: 'COMPLETE',
      basisRefs: [contract.spatialSpecRef, contract.blockoutRef, contract.blockoutRunRef], issues: [],
    });
    fixture.spaceApprovalRef = writeApproval(fixture, 'space', 'V2', 'space-baseline', contract.spatialSpecRef,
      [contract.blockoutRef, contract.blockoutRunRef, fixture.reviewRef]);
  }
  attachBaseline(fixture, work);
  fixture.directionApprovalRef ??= writeApproval(fixture, 'direction', 'V2', 'visual-direction', fixture.directionRef,
    [fixture.spaceApprovalRef]);
}

/** 仅模拟一次空间联合审查与用户确认；方向仍留待 V2。 */
export function attachWorld3DPreflight(fixture, work) {
  fixture.reviewRef = fixture.write('reviews/design-review.json', {
    ...fixture.context, kind: 'world-3d-design-review', rounds: 1, status: 'COMPLETE',
    basisRefs: [fixture.contract.spatialSpecRef, fixture.contract.blockoutRef, fixture.contract.blockoutRunRef], issues: [],
  });
  fixture.spaceApprovalRef = writeApproval(fixture, 'space', 'V2', 'space-baseline', fixture.contract.spatialSpecRef,
    [fixture.contract.blockoutRef, fixture.contract.blockoutRunRef, fixture.reviewRef]);
  const contract = { ...fixture.contract, stage: 'V1', reviewRef: fixture.reviewRef, spaceApprovalRef: fixture.spaceApprovalRef };
  work.visual.domainEvidenceRef = fixture.write('spec/world-preflight.json', contract);
}

/** 在模型制作之前冻结尺寸与接口规格。 */
function attachModelSpec(fixture) {
  if (fixture.modelSpecRef) return;
  fixture.modelSpecRef = fixture.write('spec/world-models.json', {
    ...fixture.context, units: 'm', models: [{ assetId: 'building-a', dimensions: [3, 4, 5], pivot: [0, 0, 0], interfaces: [{ id: 'door', position: [0, 0, 2] }] }],
  });
}

/** 建立非空模型源、模型输出、导入证据、消费者及代表模块试接。 */
function attachModel(fixture, work) {
  if (fixture.model) return;
  attachModelSpec(fixture);
  const source = fixture.write('assets-source/building.blend', '合成模型源；不代表实际 Blender 文件。\n');
  const output = fixture.write('public/assets/building.glb', '合成模型；不代表实际 glTF 资产。\n');
  const sceneRef = fixture.write('src/game/sample-scene.ts', '// 合成代表模块试接场景源。\n');
  const importLog = fixture.write(`${work.evidenceRoot}/model-import.log`, '合成模型导入命令输出\n');
  const importEvidenceRef = fixture.write(`${work.evidenceRoot}/model-import.json`, {
    ...fixture.context, assetId: 'building-a', status: 'PASS', importer: 'synthetic-importer',
    outputRef: output, commandEvidenceRef: importLog,
  });
  const consumerEvidenceRef = fixture.write(`${work.evidenceRoot}/model-consumer.json`, {
    ...fixture.context, assetId: 'building-a', status: 'PASS', nodeId: 'World/Building', sceneRef, outputRef: output,
  });
  const modelQualityEvidenceRef = fixture.write(`${work.evidenceRoot}/model-quality.md`, '合成专项评审：固定视角无需多角度稿，正式几何和材质检查通过。\n');
  fixture.model = {
    assetType: 'model', assetId: 'building-a', sourceKind: 'hand-authored', sourceRef: source.path,
    sourceSha256: source.sha256, output: output.path, outputSha256: output.sha256,
    importEvidenceRef, consumerEvidenceRef,
    modelQuality: { designViews: 'NOT_APPLICABLE', noProgrammaticCuts: 'PASS', noProgrammaticColorBlocks: 'PASS', evidenceRef: modelQualityEvidenceRef },
  };
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => {
    const ref = fixture.write(`${work.evidenceRoot}/model-quality-${dimension}.txt`, `合成审阅记录：${dimension}\n`);
    return { dimension, status: 'PASS', evidenceRef: ref.path };
  });
  const runtimeRef = writeRun(fixture, work, 'sample', sceneRef);
  fixture.sampleRef = fixture.write(`${work.evidenceRoot}/sample.json`, {
    ...fixture.context, phase: 'sample', assetId: 'building-a', sceneRef, runtimeRef,
    sourceRefs: [source], outputs: [output],
  });
  fixture.assetReviewRef = fixture.write('reviews/assets.json', {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, visualStage: 'V4',
    candidateId: work.visual.candidateId, technicalStatus: 'PASS', humanStatus: 'PASS',
    userMessageRef: 'test-only://model-approval', qualityChecks, assets: [fixture.model],
    evidenceRoot: work.evidenceRoot, modelSampleRef: fixture.sampleRef,
  });
}

/** 使用同一白模与空间依据建立当前阶段的新冻结合同，不覆盖历史阶段文件。 */
export function attachWorld3DPhase(fixture, stage, work = fixture.work) {
  const index = ['V1', 'V2', 'V3', 'V4', 'V5'].indexOf(stage);
  assert.ok(index >= 0);
  if (stage === 'V5' && !work.visual.modelBaselineRef) {
    // 仅单元测试构造合成 V4 归档；公共流程由控制器自行冻结真实阶段归档。
    attachWorld3DPhase(fixture, 'V4', work);
    work.visual.modelBaselineRef = fixture.write('spec/synthetic-v4-archive.json', {
      visualStage: 'V4', revision: 1,
      world3dModelBaseline: {
        workItemId: work.workItemId, projectId: work.projectId, stack: work.stack,
        objectId: work.visual.objectId, candidateId: work.visual.candidateId,
        evidenceRoot: work.evidenceRoot, assetReviewRef: work.assetReviewRef,
        domainEvidenceRef: work.visual.domainEvidenceRef,
      },
    });
  }
  work.visual.stage = stage;
  work.visual.candidateId = fixture.context.candidateId;
  const contract = { ...fixture.contract, stage };
  if (index >= 1) {
    attachDesign(fixture, work, contract);
    work.globalVisualBaselineRef = fixture.baselineRef;
    work.visual.functionBaselineRef ??= fixture.write(`${work.evidenceRoot}/synthetic-function-baseline.json`, {
      ...fixture.context, mode: 'local', designRoute: 'world-3d',
      world3dBlockoutEvidenceRoot: fixture.work.evidenceRoot,
      world3dBlockoutRefs: { spatialSpecRef: contract.spatialSpecRef, blockoutRef: contract.blockoutRef, blockoutRunRef: contract.blockoutRunRef },
      work: { ...structuredClone(fixture.work), globalState: 'PASSED', visual: { ...fixture.work.visual, stage: 'V1' } },
    });
    Object.assign(contract, {
      reviewRef: fixture.reviewRef, spaceApprovalRef: fixture.spaceApprovalRef,
      directionRef: fixture.directionRef, directionApprovalRef: fixture.directionApprovalRef,
      functionBaselineRef: work.visual.functionBaselineRef,
    });
  }
  if (index >= 2) {
    attachModelSpec(fixture);
    contract.modelSpecRef = fixture.modelSpecRef;
  }
  if (index >= 3) {
    attachModel(fixture, work);
    contract.sampleRef = fixture.sampleRef;
    work.assetReviewRef = fixture.assetReviewRef;
  }
  if (index >= 4) {
    const formalSceneRef = fixture.write('src/game/formal-scene.ts', '// 合成最终场景源。\n');
    const formalRunRef = writeRun(fixture, work, 'formal', formalSceneRef, {
      modelBindings: [{ assetId: fixture.model.assetId, nodeId: 'World/Building', outputRef: { path: fixture.model.output, sha256: fixture.model.outputSha256 } }],
    });
    const displayApprovalRef = writeApproval(fixture, 'display', 'V5', 'runtime-acceptance', formalSceneRef,
      [formalRunRef, fixture.assetReviewRef]);
    Object.assign(contract, { formalSceneRef, formalRunRef, displayApprovalRef });
  }
  fixture.contract = contract;
  fixture.sequence += 1;
  work.visual.domainEvidenceRef = fixture.write(`spec/world-${stage}-${fixture.sequence}.json`, contract);
  fixture.work = work;
  return contract;
}

/** 模拟领域模块的必要回调，正式控制器闭环测试另行执行真实工程证据门。 */
export function syntheticCallbacks(fixture) {
  return {
    validateEvidence: () => ({ manifest: { synthetic: true } }),
    validateAssetReview: (_repo, work) => fixture.read(work.assetReviewRef),
  };
}
