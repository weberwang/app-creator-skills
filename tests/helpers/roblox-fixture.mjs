/** 创建独占临时项目中的合成 Roblox 合同夹具；它不代表实际 Studio 调用。 */
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

/** 用真实磁盘字节生成路径和摘要，供负例篡改后核对。 */
export function writeRobloxFixture(repo, path, value) {
  const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  const target = join(repo, ...path.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 用独占目录和合成响应构造可变的工程证据上下文，供多个控制器测试共享。 */
export function createRobloxFixture(t, { workItemType = 'MODULE', stage, published = false } = {}) {
  const temporaryRoot = realpathSync(tmpdir());
  const repo = mkdtempSync(join(temporaryRoot, 'roblox-contract-'));
  t.after(() => {
    // 只回收本用例在系统临时目录新建的独占路径。
    const actual = realpathSync(repo);
    if (dirname(actual) !== temporaryRoot || !basename(actual).startsWith('roblox-contract-')) throw new Error('拒绝清理越界测试目录');
    rmSync(actual, { recursive: true, force: true });
  });
  const evidenceRoot = '.workflow-control/evidence/work-a';
  const work = {
    workItemId: 'work-a', projectId: 'project-a', stack: 'roblox', workItemType,
    stageId: workItemType === 'INTEGRATION' ? 'global-integration-validation' : workItemType === 'RELEASE' ? 'release' : ['SCENE', 'DISPLAY_LAYER'].includes(workItemType) ? 'scene-production' : 'foundation-engineering',
    evidenceRoot, allowedPaths: ['places/**', 'src/**'], forbiddenPaths: [],
    implementationPackageRef: { path: '.workflow-control/implementation-packages/work-a.json' },
    action: { actionId: 'local-edit', effects: ['local-write'] },
  };
  if (stage) work.visual = { stageModel: 'function-first-v1', stage, objectId: 'object-a', candidateId: 'candidate-a', reviews: {} };
  if (workItemType === 'DISPLAY_LAYER') Object.assign(work.visual, { hostId: 'scene-a', layerType: 'modal' });
  const snapshotRef = writeRobloxFixture(repo, 'places/main.rbxl', '合成 Place 文件；不能用于实际验收。');
  const luauRef = writeRobloxFixture(repo, 'src/main.server.luau', '-- 合成 Luau 文件，仅供合同测试。\n');
  const pack = { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType,
    ...(stage ? { visualStage: stage } : {}), executionUnits: [{ unitId: 'unit-a', sequence: 1, type: ['SCENE', 'DISPLAY_LAYER', 'INTEGRATION', 'RELEASE'].includes(workItemType) ? workItemType : 'MODULE', owner: 'fixture', paths: ['places/**', 'src/**'], resultPath: `${evidenceRoot}/unit-a.json`, acceptanceCommands: ['node --version'] }] };
  const studio = { studioId: 'studio-a', place: { kind: published ? 'published' : 'local', placeKey: 'place-main', snapshotRef, savedAt: '2026-11-09T00:00:00.000Z', ...(published ? { placeId: '123', universeId: '456' } : {}) } };
  let captureNumber = 0;
  /** 构造显式标注为测试使用的规范化采集记录，不调用任何编辑器。 */
  function capture({ context = 'Edit', toolName = 'inspect_instance', targetPath = ['game', 'Workspace', 'Arena'], actual = 'fixture-observation', ...overrides } = {}) {
    const id = ++captureNumber;
    const request = { studio_id: studio.studioId, ...(toolName === 'execute_luau' || toolName === 'multi_edit' ? { datamodel_type: context } : {}), ...(toolName === 'execute_luau' ? { code: 'return "fixture-observation"' } : {}) };
    const record = {
      schemaVersion: 'roblox-mcp-capture/1.0', origin: 'studio-mcp', execution: 'actual',
      workItemId: work.workItemId, projectId: work.projectId, studioId: studio.studioId,
      context, toolName, observedAt: '2026-11-09T00:01:00.000Z',
      placeSnapshotRef: snapshotRef, sourceRefs: [snapshotRef, luauRef], targetPath, request,
      response: { content: [{ type: 'text', text: actual }] }, status: 'PASS',
      effects: [], ...(toolName === 'execute_luau' ? { effectsBasis: '合成夹具不访问任何云服务。' } : {}),
      ...(context === 'Edit' ? { sourceState: 'saved-readback' } : {}),
      ...(context === 'Client' ? { clientId: 'player-a' } : {}),
      ...overrides,
    };
    const ref = writeRobloxFixture(repo, `${evidenceRoot}/capture-${id}.json`, record);
    return { record, ref };
  }
  const edit = capture();
  const scriptPath = ['game', 'ServerScriptService', 'Main'];
  const scriptReadback = capture({ toolName: 'script_read', targetPath: scriptPath, actual: readFileSync(join(repo, 'src', 'main.server.luau'), 'utf8') });
  const runtime = capture({ context: 'Server', toolName: 'execute_luau' });
  const doc = {
    schemaVersion: 'roblox-engineering/1.0', workItemId: work.workItemId, projectId: work.projectId,
    stack: work.stack, workItemType: work.workItemType, implementationPackageRef: work.implementationPackageRef.path,
    ...(stage ? { visualStage: stage } : {}), studio,
    sources: [{ unitId: 'unit-a', ref: snapshotRef }, { unitId: 'unit-a', ref: luauRef, instancePath: scriptPath, readbackRef: scriptReadback.ref }],
    root: { objectId: stage ? 'object-a' : 'module-a', instancePath: ['game', 'Workspace', 'Arena'] },
    editReadbackRef: edit.ref, requiredContexts: ['Server'],
    checks: [{ id: 'check-a', context: 'Server', expected: 'fixture-observation', actual: 'fixture-observation', status: 'PASS', captureRef: runtime.ref }],
  };
  const manifest = { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack,
    implementationPackageRef: work.implementationPackageRef.path,
    ...(stage ? { visualStage: stage } : {}), items: [{ category: 'roblox-engineering', status: 'PASS', path: `${evidenceRoot}/engineering.json` }] };
  /** 将内存中的当前版本写入工程记录；不会创建真实运行数据。 */
  function save() { return writeRobloxFixture(repo, manifest.items[0].path, doc); }
  save();
  return { repo, work, manifest, pack, studio, snapshotRef, luauRef, edit, scriptReadback, runtime, doc, capture, save, read: (path) => readFileSync(join(repo, ...path.split('/')), 'utf8') };
}

/** 构造 SCENE 或 DISPLAY_LAYER 各阶段原生材料，所有响应均为合成测试数据。 */
export function createRobloxVisualFixture(t, { stage = 'V5', layer = false, published = false } = {}) {
  const fixture = createRobloxFixture(t, { workItemType: layer ? 'DISPLAY_LAYER' : 'SCENE', stage, published });
  const { repo, work, studio, capture, manifest, pack } = fixture;
  const evidenceRoot = work.evidenceRoot;
  const objectPath = layer ? ['game', 'StarterGui', 'Overlay'] : ['game', 'Workspace', 'Arena'];
  const runtimePath = layer ? ['game', 'Players', 'PlayerA', 'PlayerGui', 'Overlay'] : objectPath;
  const className = layer ? 'ScreenGui' : 'Model';
  const childClass = layer ? 'TextButton' : 'Part';
  const sourceChild = [...objectPath, 'Child'];
  const runtimeChild = [...runtimePath, 'Child'];
  const targetRef = writeRobloxFixture(repo, `${evidenceRoot}/target.png`, '合成目标图，不代表真实视觉确认。');
  const host = layer ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {};
  const target = layer ? undefined : { targetId: 'target-a', candidateId: 'candidate-a', sceneId: work.visual.objectId, stateId: 'normal', scope: 'fixture', viewport: { width: 1280, height: 720 }, referenceTarget: targetRef, reviews: {} };
  if (!layer) {
    delete work.visual.candidateId; delete work.visual.reviews;
    work.visual.targets = [target];
  }
  const targetId = target?.targetId ?? work.visual.objectId;
  const reviews = target?.reviews ?? work.visual.reviews;
  const id = { workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, workItemType: work.workItemType, objectId: work.visual.objectId, targetId, candidateId: 'candidate-a' };
  const edit = capture({ context: 'Edit', targetPath: objectPath });
  fixture.doc.root.instancePath = objectPath;
  fixture.doc.editReadbackRef = edit.ref;
  const screen = layer ? { xScale: 0, xOffset: 10, yScale: 0, yOffset: 20 } : { x: 0, y: 0, z: 0 };
  const size = layer ? { xScale: 1, xOffset: -10, yScale: 1, yOffset: -20 } : { x: 10, y: 10, z: 10 };
  const anchorPoint = { x: 0.5, y: 0.5 };
  const nodes = [
    { id: work.visual.objectId, className, instancePath: objectPath, parentId: null, space: layer ? 'screen-scale-offset' : 'world-studs', position: screen, size, positionReferenceId: layer ? 'safe-area' : 'world', ...(layer ? { screenInsets: 'CoreUISafeInsets', clipToDeviceSafeArea: true, sizeModifiers: [] } : {}) },
    { id: 'child-a', className: childClass, instancePath: sourceChild, parentId: work.visual.objectId, space: layer ? 'screen-scale-offset' : 'world-studs', position: screen, size, positionReferenceId: work.visual.objectId, ...(layer ? { anchorPoint, positionWriters: ['UDIM2'], sizeWriters: { horizontal: 'UDIM2', vertical: 'UDIM2' }, sizeConstraint: 'RelativeXY', sizeModifiers: [] } : {}) },
  ];
  const layout = { schemaVersion: 'roblox-layout/1.0', ...id, studio: structuredClone(studio), rootId: work.visual.objectId, nodes };
  const rootProperties = layer ? { IsGuiBase2d: true, ScreenInsets: 'CoreUISafeInsets', ClipToDeviceSafeArea: true, LayoutControllers: [], SizeModifiers: [] } : {};
  const childProperties = layer ? { IsGuiObject: true, Position: screen, Size: size, AnchorPoint: anchorPoint, AutomaticSize: 'None', SizeConstraint: 'RelativeXY', LayoutControllers: [], FlexItems: [], SizeModifiers: [] } : {};
  const editObservation = capture({ context: 'Edit', toolName: 'execute_luau', targetPath: objectPath, actual: JSON.stringify({ nodes: [{ instancePath: objectPath, className, properties: rootProperties }, { instancePath: sourceChild, className: childClass, properties: childProperties }] }) });
  if (layer) layout.editObservationRef = editObservation.ref;
  const rootInspection = capture({ context: 'Edit', toolName: 'execute_luau', targetPath: objectPath, actual: JSON.stringify({ nodes: [{ instancePath: objectPath, className, properties: {} }] }) });
  const assets = { schemaVersion: 'roblox-assets/1.0', visualStage: 'V4', ...id, studio: structuredClone(studio), externalAssets: 'none', items: [{ id: 'native-a', kind: 'native-instance', nodeId: work.visual.objectId, instancePath: objectPath, observed: 'fixture-observation', inspectionRef: rootInspection.ref }] };
  const observation = capture({ context: 'Client', toolName: 'execute_luau', targetPath: runtimePath, actual: JSON.stringify({ nodes: [{ instancePath: runtimePath, className, properties: rootProperties }, { instancePath: runtimeChild, className: childClass, properties: childProperties }] }) });
  const input = capture({ context: 'Client', toolName: 'user_mouse_input', targetPath: runtimeChild });
  const result = capture({ context: 'Client', toolName: 'inspect_instance', targetPath: runtimeChild, actual: 'activated' });
  const runtime = { schemaVersion: 'roblox-runtime/1.0', visualStage: 'V5', ...id, studio: structuredClone(studio), clientId: 'player-a', rootInstancePath: runtimePath, observationRef: observation.ref,
    bindings: [{ nodeId: work.visual.objectId, sourceInstancePath: objectPath, runtimeInstancePath: runtimePath, className }, { nodeId: 'child-a', sourceInstancePath: sourceChild, runtimeInstancePath: runtimeChild, className: childClass }],
    interactions: [{ nodeId: 'child-a', expected: 'activated', actual: 'activated', status: 'PASS', inputRef: input.ref, resultRef: result.ref }] };
  const state = target ? { sceneId: target.sceneId, stateId: target.stateId, viewport: target.viewport } : stage === 'V5' ? { stateId: 'normal', viewport: { width: 1280, height: 720 } } : {};
  const visual = { schemaVersion: 'roblox-visual/1.0', ...id, visualStage: stage, ...host, ...state, referenceTarget: targetRef, studio: structuredClone(studio), object: { id: work.visual.objectId, className, instancePath: objectPath }, editReadbackRef: edit.ref };
  const envelope = { schemaVersion: '1.0', ...id, visualStageModel: 'function-first-v1', visualStage: stage, ...host, ...state, referenceTarget: targetRef };

  /** 按引用依赖顺序重写布局、资源、运行及用户确认的合成数据。 */
  function saveVisual() {
    const layoutSpecRef = writeRobloxFixture(repo, `${evidenceRoot}/layout.json`, layout);
    assets.layoutSpecRef = layoutSpecRef;
    const assetManifestRef = writeRobloxFixture(repo, `${evidenceRoot}/assets.json`, assets);
    runtime.layoutSpecRef = layoutSpecRef; runtime.assetManifestRef = assetManifestRef;
    const runtimeContextRef = writeRobloxFixture(repo, `${evidenceRoot}/runtime.json`, runtime);
    const base = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, targetId, candidateId: 'candidate-a', decision: 'APPROVED', userMessageRef: 'synthetic-user-message', targetRef: targetRef.path, targetSha256: targetRef.sha256, referenceTarget: targetRef, ...host };
    const dimensions = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'];
    const qualityChecks = dimensions.map((dimension) => ({ dimension, status: 'PASS', evidenceRef: writeRobloxFixture(repo, `${evidenceRoot}/quality-${dimension}.txt`, '合成测试证据').path }));
    reviews.V2 = writeRobloxFixture(repo, `${evidenceRoot}/review-v2.json`, { ...base, stage: 'V2', purpose: 'target', qualityChecks });
    reviews.V3Decomposition = writeRobloxFixture(repo, `${evidenceRoot}/review-v3-decomposition.json`, { ...base, stage: 'V3', purpose: 'decomposition' });
    reviews.V3Layout = writeRobloxFixture(repo, `${evidenceRoot}/review-v3-layout.json`, { ...base, stage: 'V3', purpose: 'layout', layoutSpecRef, decompositionReviewRef: reviews.V3Decomposition });
    reviews.V4 = writeRobloxFixture(repo, `${evidenceRoot}/review-v4.json`, { ...base, stage: 'V4', purpose: 'imported-assets', assetManifestRef });
    reviews.V5 = writeRobloxFixture(repo, `${evidenceRoot}/review-v5.json`, { ...base, stage: 'V5', purpose: 'runtime-acceptance', runtimeContextRef });
    visual.layoutSpecRef = layoutSpecRef; visual.assetManifestRef = assetManifestRef; visual.runtimeContextRef = runtimeContextRef;
    envelope.robloxEvidenceRef = writeRobloxFixture(repo, `${evidenceRoot}/native-visual.json`, visual);
    const envelopeRef = writeRobloxFixture(repo, `${evidenceRoot}/envelope.json`, envelope);
    if (target) target.domainEvidenceRef = { path: envelopeRef.path };
    else work.visual.domainEvidenceRef = envelopeRef;
    manifest.items = [manifest.items[0], { category: 'asset-import', status: 'PASS', path: assetManifestRef.path, ...(target ? { targetId } : {}) }, { category: 'roblox-runtime', status: 'PASS', path: runtimeContextRef.path, ...(target ? { targetId } : {}) }];
    work.evidenceRef = { path: `${evidenceRoot}/manifest.json` };
    fixture.save();
    writeRobloxFixture(repo, work.evidenceRef.path, manifest);
    writeRobloxFixture(repo, work.implementationPackageRef.path, pack);
    return { layoutSpecRef, assetManifestRef, runtimeContextRef, envelopeRef };
  }
  saveVisual();
  return { ...fixture, target, envelope, visual, layout, assets, runtime, reviews, input, result, editObservation, observation, saveVisual };
}
