import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isFigmaApp, readFigmaSnapshot, validateFigmaBaseline, validateFigmaAppStage } from '../../skills/app-workflow-control/scripts/runtime/figma-app-contract.mjs';
import { initializeWork, advanceVisual, transitionWork, loadWork, inspectWork, checkProtectedAction } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validateGlobalBaseline } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { attachFigmaAppFixture, figmaSnapshotFixture, writeFigmaFixture as write } from './figma-app-fixture.mjs';
import { encodePngRgba } from '../../skills/app-asset-workflow/scripts/png-raster.mjs';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { attachFlutterDesignFixture } from './flutter-design-fixture.mjs';

/** 全部远端和批准事实均为本地测试替身，不创建实际设计或代表真实视觉通过。 */
function fixture(t, stack = 'flutter', stage = 'V2') {
  const repo = mkdtempSync(join(tmpdir(), 'figma-app-contract-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const work = { workItemId: 'page-work', projectId: 'project-a', stack, workItemType: 'PAGE', visual: { objectId: 'page-a', candidateId: 'direction-a', stage, reviews: {} } };
  const referenceTarget = write(repo, 'preview.png', encodePngRgba(390, 844, Buffer.alloc(390 * 844 * 4)));
  const doc = { referenceTarget, visualStage: stage };
  const data = attachFigmaAppFixture(repo, work, doc, { designOnly: true });
  return { repo, work, doc, ...data };
}

/** 构造人工质量记录的合成形状，工具和测试本身不作审美判断。 */
function checks(f) {
  const evidence = write(f.repo, 'synthetic-quality.txt', '合成确认材料，仅用于测试协议');
  return ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension) => ({ dimension, status: 'PASS', evidenceRef: evidence.path }));
}

/** 默认单一精修方案，多方案夹具保持比较条件相同且结构不同。 */
function baseline(f, count = 1) {
  const candidates = [{ candidateId: 'direction-a', path: f.doc.referenceTarget.path, figmaSnapshotRef: f.doc.figmaDesignRef, qualityChecks: checks(f) }];
  for (let index = 1; index < count; index++) {
    const { ref } = figmaSnapshotFixture(f.repo, f.work, { prefix: `direction-${index}`, previewRef: f.doc.referenceTarget, candidateId: `direction-${index}`, variant: index, briefRef: f.snapshot.briefRef });
    candidates.push({ candidateId: `direction-${index}`, path: f.doc.referenceTarget.path, figmaSnapshotRef: ref, qualityChecks: checks(f) });
  }
  const selectionReviewRef = write(f.repo, 'baseline-review.json', { schemaVersion: '1.0', objectId: 'baseline-a', stage: 'BASELINE', purpose: 'visual-baseline',
    decision: 'APPROVED', userMessageRef: 'test-only://selected', candidateId: 'direction-a', targetRef: f.doc.referenceTarget.path, targetSha256: f.doc.referenceTarget.sha256,
    figmaDesignRef: f.doc.figmaDesignRef, qualityChecks: checks(f) });
  return { schemaVersion: '1.0', baselineId: 'baseline-a', projectId: f.work.projectId, stack: f.work.stack, designRoute: 'figma-app', exploration: { kind: 'initial' }, candidates, selectedCandidateId: 'direction-a', selectionReviewRef };
}

/** 变异节点后同时更新原始采集，区分格式一致性和语义门禁。 */
function snapshotRef(f, value) {
  const version = f.snapshotSequence = (f.snapshotSequence ?? 0) + 1;
  const raw = JSON.parse(readFileSync(join(f.repo, value.captureRef.path), 'utf8'));
  for (const key of ['fileKey', 'nodeId', 'stateId', 'viewport', 'nodes', 'variables', 'assets']) raw[key] = value[key];
  value.captureRef = write(f.repo, `mutated-capture-${version}.json`, raw);
  return write(f.repo, `mutated-snapshot-${version}.json`, value);
}

test('Figma 路线仅默认适用 Flutter/Expo App，ESP32显式选择，游戏和Node隔离', () => {
  for (const stack of ['flutter', 'expo']) for (const workItemType of ['PAGE', 'DISPLAY_LAYER']) assert.equal(isFigmaApp({ stack, workItemType }), true);
  for (const stack of ['unity', 'roblox', 'cocos', 'phaser', 'threejs', 'nodejs']) for (const workItemType of ['PAGE', 'DISPLAY_LAYER', 'MODULE']) assert.equal(isFigmaApp({ stack, workItemType }), false);
  assert.equal(isFigmaApp({ stack: 'esp32', workItemType: 'PAGE' }), false);
  assert.equal(isFigmaApp({ stack: 'esp32', workItemType: 'PAGE', visual: { designRoute: 'figma-app' } }), true);
});

test('App 默认一个精修方案，无需先申请候选数量；不擅自增加方向', (t) => {
  const f = fixture(t); const record = baseline(f);
  assert.doesNotThrow(() => validateFigmaBaseline(f.repo, f.work, record));
  for (const count of [2, 3]) assert.throws(() => validateFigmaBaseline(f.repo, f.work, baseline(f, count)), /1 个方向/);
});

test('单方案仍须真实设计检查和原有人工质量确认，不能用精修标签代替通过', (t) => {
  const f = fixture(t); const record = baseline(f);
  f.work.globalVisualBaselineRef = write(f.repo, 'single-baseline.json', record);
  assert.doesNotThrow(() => validateGlobalBaseline(f.repo, f.work, { required: true }));
  record.candidates[0].qualityChecks[0].status = 'NOT_RUN';
  f.work.globalVisualBaselineRef = write(f.repo, 'single-not-reviewed.json', record);
  assert.throws(() => validateGlobalBaseline(f.repo, f.work, { required: true }), /尚未 PASS/);
  const snapshot = structuredClone(f.snapshot); snapshot.nodes[1].font.available = false;
  record.candidates[0].figmaSnapshotRef = snapshotRef(f, snapshot);
  assert.throws(() => validateFigmaBaseline(f.repo, f.work, record), /字体不可用/);
});

test('明确要求多方案时不能仅换色凑数，单方案不降低实际设计检查', (t) => {
  const f = fixture(t); const record = baseline(f, 2);
  record.exploration = { kind: 'initial', requestedCount: 2, userMessageRef: 'test-only://compare-two-directions' };
  const second = structuredClone(f.snapshot); second.candidateId = 'direction-1';
  second.nodes[0].properties.fill = '#000000'; second.variables[0].value = '#000000';
  record.candidates[1].figmaSnapshotRef = snapshotRef(f, second);
  assert.throws(() => validateFigmaBaseline(f.repo, f.work, record), /不能只替换颜色/);
});

test('用户指定多方案必须有真实消息引用，并仍核对比较条件', (t) => {
  const f = fixture(t); const record = baseline(f, 2); record.exploration.requestedCount = 2;
  assert.throws(() => validateFigmaBaseline(f.repo, f.work, record), /用户明确指定/);
  record.exploration.userMessageRef = 'test-only://two-directions';
  assert.doesNotThrow(() => validateFigmaBaseline(f.repo, f.work, record));
  const mismatch = baseline(f, 2); mismatch.exploration = { kind: 'initial', requestedCount: 2, userMessageRef: 'test-only://two-directions' };
  const second = JSON.parse(readFileSync(join(f.repo, mismatch.candidates[1].figmaSnapshotRef.path), 'utf8'));
  second.language = 'en'; mismatch.candidates[1].figmaSnapshotRef = snapshotRef(f, second);
  assert.throws(() => validateFigmaBaseline(f.repo, f.work, mismatch), /相同任务/);
});

test('有效方向的局部增量直接复用，并防止无来源或循环复用', (t) => {
  const f = fixture(t); const source = baseline(f); const sourceRef = write(f.repo, 'source-baseline.json', source);
  const local = { ...source, baselineId: 'increment', candidates: [source.candidates[0]], exploration: { kind: 'increment', sourceBaselineRef: sourceRef } };
  assert.doesNotThrow(() => validateFigmaBaseline(f.repo, f.work, local));
  delete local.exploration.sourceBaselineRef;
  assert.throws(() => validateFigmaBaseline(f.repo, f.work, local), /方向来源/);
});

test('同一逻辑基线的不同冻结版本可沿已选方向新增局部目标', (t) => {
  const f = fixture(t); const source = baseline(f); const sourceRef = write(f.repo, 'old-version.json', source);
  const localTarget = figmaSnapshotFixture(f.repo, f.work, { prefix: 'local-target', previewRef: f.doc.referenceTarget, candidateId: 'direction-a', variant: 1, briefRef: f.snapshot.briefRef });
  const local = { ...source, exploration: { kind: 'increment', sourceBaselineRef: sourceRef, changeScope: 'local', changeReason: '沿用选定方向补本批局部内容' },
    candidates: [{ ...source.candidates[0], figmaSnapshotRef: localTarget.ref, directionSourceRef: source.candidates[0].figmaSnapshotRef }] };
  const review = JSON.parse(readFileSync(join(f.repo, source.selectionReviewRef.path), 'utf8')); review.figmaDesignRef = localTarget.ref;
  local.selectionReviewRef = write(f.repo, 'local-version-selection.json', review);
  assert.doesNotThrow(() => validateFigmaBaseline(f.repo, f.work, local));
});

test('用户明确要求比较并组合时可冻结组合节点，不新增探索方向', (t) => {
  const f = fixture(t); const record = baseline(f, 2); record.exploration = { kind: 'initial', requestedCount: 2, userMessageRef: 'test-only://compare-and-combine' };
  const selected = figmaSnapshotFixture(f.repo, f.work, { prefix: 'combined', previewRef: f.doc.referenceTarget, candidateId: 'combined', variant: 2, briefRef: f.snapshot.briefRef });
  record.selectedCandidateId = 'combined'; record.combination = { candidateId: 'combined', path: f.doc.referenceTarget.path, figmaSnapshotRef: selected.ref,
    sourceCandidateIds: ['direction-a', 'direction-1'], userMessageRef: 'test-only://combine-parts', qualityChecks: checks(f) };
  const review = JSON.parse(readFileSync(join(f.repo, record.selectionReviewRef.path), 'utf8')); review.candidateId = 'combined'; review.figmaDesignRef = selected.ref;
  record.selectionReviewRef = write(f.repo, 'combination-review.json', review);
  assert.doesNotThrow(() => validateFigmaBaseline(f.repo, f.work, record));
  record.combination.sourceCandidateIds = ['unknown'];
  assert.throws(() => validateFigmaBaseline(f.repo, f.work, record), /组合来源/);
});

test('Figma真实节点、预览和MCP原始导出逐级冻结，编辑后不能沿用旧确认', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc));
  write(f.repo, f.snapshot.captureRef.path, 'changed');
  assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc), /原始结构采集.*内容已变化/);
});

test('全页图片冒充、不可用字体及未绑定变量不能通过可编辑设计检查', (t) => {
  const f = fixture(t); const original = structuredClone(f.snapshot);
  for (const mode of ['image', 'font', 'unbound']) {
    const snapshot = structuredClone(original);
    if (mode === 'image') snapshot.nodes[0].type = 'IMAGE';
    if (mode === 'font') snapshot.nodes[1].font.available = false;
    if (mode === 'unbound') snapshot.nodes[0].bindings = [];
    assert.throws(() => readFigmaSnapshot(f.repo, snapshotRef(f, snapshot)), /可编辑 Frame|字体不可用|变量没有实际绑定/);
  }
});

test('变量缺失值与不存在的属性不能以 undefined 相等伪装实际绑定', (t) => {
  const f = fixture(t); const snapshot = structuredClone(f.snapshot);
  for (const variable of snapshot.variables) delete variable.value;
  for (const binding of snapshot.nodes[0].bindings) binding.field = 'missing-property';
  assert.throws(() => readFigmaSnapshot(f.repo, snapshotRef(f, snapshot)), /真实名称或已解析值/);
  const other = structuredClone(f.snapshot); other.nodes[0].bindings[0].field = 'missing-property';
  assert.throws(() => readFigmaSnapshot(f.repo, snapshotRef(f, other)), /真实节点属性/);
});

test('独立全屏照片保留可编辑前景时允许，素材范围必须是真实数组', (t) => {
  const f = fixture(t); const snapshot = structuredClone(f.snapshot);
  snapshot.nodes.push({ id: '1:3', type: 'RECTANGLE', name: '独立摄影背景', parentId: '1:1', x: 0, y: 0, width: 390, height: 844, imageFills: [{ assetId: 'photo' }] });
  snapshot.assets.push({ id: 'photo', role: 'photo', nodeIds: ['1:3'], sourceRef: f.doc.referenceTarget });
  assert.doesNotThrow(() => readFigmaSnapshot(f.repo, snapshotRef(f, snapshot)));
  snapshot.assets[0].nodeIds = 'prefix-1:3-suffix';
  assert.throws(() => readFigmaSnapshot(f.repo, snapshotRef(f, snapshot)), /nodeIds.*唯一数组/);
});

test('原始导出与节点声明不符被阻止，截图不替代实际可编辑结构', (t) => {
  const f = fixture(t); const snapshot = structuredClone(f.snapshot); snapshot.nodes[1].width = 320;
  const ref = write(f.repo, 'unverified-structure.json', snapshot);
  assert.throws(() => readFigmaSnapshot(f.repo, ref), /原始采集 nodes/);
  snapshot.nodes = [];
  assert.throws(() => readFigmaSnapshot(f.repo, snapshotRef(f, snapshot)), /节点、变量/);
});

test('已选Figma稿直接形成V3交接，无需独立拆解和布局批准', (t) => {
  const f = fixture(t, 'expo', 'V3');
  const layout = { nodes: [{ id: 'screen', parentId: null, x: 0, y: 0, width: 390, height: 844 }, { id: 'title', parentId: 'screen', x: 16, y: 32, width: 240, height: 48 }] };
  f.doc.layoutSpecRef = write(f.repo, 'native-layout.json', layout);
  attachFigmaAppFixture(f.repo, f.work, f.doc);
  assert.equal(f.work.visual.reviews.V3Decomposition, undefined); assert.equal(f.work.visual.reviews.V3Layout, undefined);
  assert.doesNotThrow(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc));
  const handoff = JSON.parse(readFileSync(join(f.repo, f.doc.figmaHandoffRef.path), 'utf8')); handoff.mappings.pop();
  f.doc.figmaHandoffRef = write(f.repo, 'missing-native-node.json', handoff);
  assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc), /原生布局节点交接/);
});

test('Expo交接须保留源节点字体和组件形态，几何相同也不能只换色或用默认字形', (t) => {
  const f = fixture(t, 'expo', 'V3');
  f.doc.layoutSpecRef = write(f.repo, 'native-layout.json', { nodes: [{ id: 'screen', parentId: null, x: 0, y: 0, width: 390, height: 844 }, { id: 'title', parentId: 'screen', x: 16, y: 32, width: 240, height: 48 }] });
  attachFigmaAppFixture(f.repo, f.work, f.doc);
  const handoff = JSON.parse(readFileSync(join(f.repo, f.doc.figmaHandoffRef.path), 'utf8'));
  handoff.mappings.find((item) => item.designItemId === 'title').nativeStyle.typography.size = 12;
  f.doc.figmaHandoffRef = write(f.repo, 'old-default-style.json', handoff);
  assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc), /字体、颜色或形态/);
});

test('Figma节点的尺寸和字体必须进入原生规格，旧页面规格不能只换节点ID', (t) => {
  const f = fixture(t, 'flutter', 'V3'); f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', '合成布局规格');
  attachFlutterDesignFixture(f.repo, f.work, f.doc); attachFigmaAppFixture(f.repo, f.work, f.doc);
  delete f.work.visual.reviews.V3Decomposition; delete f.work.visual.reviews.V3Layout;
  assert.doesNotThrow(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc));
  for (const property of ['size', 'typography']) {
    const snapshot = structuredClone(f.snapshot);
    if (property === 'size') snapshot.nodes[1].width = 300;
    else snapshot.nodes[1].font.size = 30;
    f.doc.figmaDesignRef = snapshotRef(f, snapshot);
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8')); review.figmaDesignRef = f.doc.figmaDesignRef;
    f.work.visual.reviews.V2 = write(f.repo, `changed-${property}-review.json`, review);
    attachFigmaAppFixture(f.repo, f.work, f.doc);
    assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc), new RegExp(`heading\\.${property}.*不一致`));
  }
});

test('Figma中仍有未映射的可见元素时不能只交付一个旧标题', (t) => {
  const f = fixture(t, 'flutter', 'V3'); f.doc.layoutSpecRef = write(f.repo, 'layout.yaml', '合成布局规格');
  attachFlutterDesignFixture(f.repo, f.work, f.doc);
  const snapshot = structuredClone(f.snapshot); snapshot.nodes.push({ id: '1:3', type: 'VECTOR', name: '必要功能图标', parentId: '1:1', x: 16, y: 100, width: 24, height: 24 });
  f.doc.figmaDesignRef = snapshotRef(f, snapshot);
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8')); review.figmaDesignRef = f.doc.figmaDesignRef;
  f.work.visual.reviews.V2 = write(f.repo, 'new-icon-review.json', review); attachFigmaAppFixture(f.repo, f.work, f.doc);
  assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc), /可见元素 1:3.*覆盖/);
});

test('机器结构成功不能代替V2人工选择，样本范围不能提升为整页', (t) => {
  const f = fixture(t); const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8'));
  for (const mutation of ['decision', 'message', 'sample']) {
    const bad = structuredClone(review);
    if (mutation === 'decision') bad.decision = 'REJECTED';
    if (mutation === 'message') bad.userMessageRef = '';
    if (mutation === 'sample') bad.scope.kind = 'representative-sample';
    f.work.visual.reviews.V2 = write(f.repo, `${mutation}.json`, bad);
    assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc), /人工选择/);
  }
});

test('ESP32采用Figma时必须绑定真实分辨率、输入、字体、色深和预算', (t) => {
  const f = fixture(t, 'esp32'); f.work.visual.designRoute = 'figma-app';
  const board = { screen: { width: 390, height: 844, colorFormat: 'RGB565' }, inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: { flashBytes: 100000, ramBytes: 32000 } };
  f.doc.boardProfileRef = write(f.repo, 'board.json', board);
  f.snapshot.hardware = { boardProfileRef: f.doc.boardProfileRef, colorFormat: 'RGB565', inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: board.resourceBudget };
  f.doc.figmaDesignRef = snapshotRef(f, f.snapshot);
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8')); review.figmaDesignRef = f.doc.figmaDesignRef;
  f.work.visual.reviews.V2 = write(f.repo, 'hardware-review.json', review);
  assert.doesNotThrow(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc));
  f.snapshot.hardware.inputMethods = ['mouse']; f.doc.figmaDesignRef = snapshotRef(f, f.snapshot); review.figmaDesignRef = f.doc.figmaDesignRef;
  f.work.visual.reviews.V2 = write(f.repo, 'wrong-input-review.json', review);
  assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc), /inputMethods/);
});

test('ESP32 不可使用板卡外字体或虚构PSRAM预算', (t) => {
  const f = fixture(t, 'esp32'); f.work.visual.designRoute = 'figma-app';
  const board = { screen: { width: 390, height: 844, colorFormat: 'RGB565' }, inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: { flashBytes: 100000, ramBytes: 32000 } };
  f.doc.boardProfileRef = write(f.repo, 'board.json', board);
  for (const mode of ['font', 'psram']) {
    const snapshot = structuredClone(f.snapshot);
    snapshot.hardware = { boardProfileRef: f.doc.boardProfileRef, colorFormat: 'RGB565', inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: { ...board.resourceBudget } };
    if (mode === 'font') snapshot.nodes[1].font.platformFamily = 'Unavailable Font';
    else snapshot.hardware.resourceBudget.psramBytes = 1000000;
    if (mode === 'font') snapshot.nodes[1].font.substitutionReason = '合成错误替代，用于负向测试';
    f.doc.figmaDesignRef = snapshotRef(f, snapshot);
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8')); review.figmaDesignRef = f.doc.figmaDesignRef;
    f.work.visual.reviews.V2 = write(f.repo, `${mode}-hardware-review.json`, review);
    assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc), /设备可用字体|PSRAM/);
  }
});

test('ESP32额外状态同样受实际分辨率、字体与预算约束', (t) => {
  const f = fixture(t, 'esp32'); f.work.visual.designRoute = 'figma-app';
  const board = { screen: { width: 390, height: 844, colorFormat: 'RGB565' }, inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: { flashBytes: 100000, ramBytes: 32000 } };
  f.doc.boardProfileRef = write(f.repo, 'extra-board.json', board);
  const hardware = { boardProfileRef: f.doc.boardProfileRef, colorFormat: 'RGB565', inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: board.resourceBudget };
  f.snapshot.hardware = hardware; f.doc.figmaDesignRef = snapshotRef(f, f.snapshot);
  for (const mode of ['resolution', 'font', 'psram']) {
    const extra = figmaSnapshotFixture(f.repo, f.work, { prefix: `extra-${mode}`, previewRef: f.doc.referenceTarget, stateId: 'expanded', hardware: structuredClone(hardware) });
    if (mode === 'resolution') { extra.snapshot.viewport.width = 400; extra.snapshot.nodes[0].width = 400; }
    if (mode === 'font') { extra.snapshot.nodes[1].font.platformFamily = 'Desktop Only'; extra.snapshot.nodes[1].font.substitutionReason = '用于负向测试'; }
    if (mode === 'psram') extra.snapshot.hardware.resourceBudget.psramBytes = 1000;
    const ref = snapshotRef(f, extra.snapshot); f.doc.additionalTargets = [{ referenceTarget: f.doc.referenceTarget, figmaDesignRef: ref }];
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8')); review.figmaDesignRef = f.doc.figmaDesignRef; review.figmaTargetRefs = [f.doc.figmaDesignRef, ref];
    f.work.visual.reviews.V2 = write(f.repo, `${mode}-extra-review.json`, review);
    assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc), /分辨率和色深|设备可用字体|PSRAM/);
  }
});

test('已有精确批准可在V2检查Figma写入，但设计提案不获得设备或付费权限', async (t) => {
  const f = fixture(t);
  const created = await initializeWork({ repo: f.repo, args: { id: 'authorized-design', stack: 'flutter', type: 'PAGE', objective: '合成设计动作', 'design-intent': 'proposal' } });
  const path = created.metadata.workItemPath; const work = loadWork(f.repo, path);
  work.visual.stage = 'V2'; work.globalState = 'PROPOSAL';
  for (const gate of ['F0', 'F1', 'F2', 'F4']) work.gateStatus[gate] = 'PASS';
  work.action = { actionId: 'edit-design', effects: ['external-write'], target: 'figma:fixtureFile', approval: {
    workItemId: work.workItemId, stack: work.stack, stageId: work.stageId, actionId: 'edit-design', effects: ['external-write'], target: 'figma:fixtureFile', userMessageRef: 'test-only://prior-approval',
  } }; write(f.repo, path, work);
  assert.equal(checkProtectedAction({ repo: f.repo, workItem: path, actionId: 'edit-design', effect: 'external-write', target: 'figma:fixtureFile' }).status, 'PASS');
  for (const effect of ['device', 'payment']) {
    work.action.effects = [effect]; work.action.approval.effects = [effect]; write(f.repo, path, work);
    assert.throws(() => checkProtectedAction({ repo: f.repo, workItem: path, actionId: 'edit-design', effect, target: 'figma:fixtureFile' }), /尚未到达可执行/);
  }
});

test('游戏基线仍须三候选，Node服务不被要求Figma', (t) => {
  const f = fixture(t); const record = baseline(f); record.stack = 'cocos'; delete record.designRoute;
  f.work.stack = 'cocos'; f.work.workItemType = 'DISPLAY_LAYER'; f.work.globalVisualBaselineRef = write(f.repo, 'game-baseline.json', record);
  assert.throws(() => validateGlobalBaseline(f.repo, f.work, { required: true }), /三张/);
  assert.equal(validateFigmaAppStage(f.repo, { stack: 'nodejs', workItemType: 'MODULE' }, 'V2', {}), null);
});

test('Schema接受可编辑Figma快照并拒绝缺节点身份，模板不预写批准', (t) => {
  const f = fixture(t); const schema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/figma-app-design.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(validate(f.snapshot), true, JSON.stringify(validate.errors));
  delete f.snapshot.nodeId; assert.equal(validate(f.snapshot), false);
  const template = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/templates/figma-app-baseline.json', import.meta.url), 'utf8'));
  assert.equal(template.candidates.length, 1); assert.ok(template.candidates.every((candidate) => candidate.qualityChecks.every((item) => item.status === 'NOT_RUN')));
});

test('基线Schema默认一个方案，明确指定数量才接受多方案，游戏仍要求三个', (t) => {
  const f = fixture(t); const base = new URL('../../skills/app-workflow-control/schemas/', import.meta.url);
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  for (const name of ['work-item.schema.json', 'human-review.schema.json']) ajv.addSchema(JSON.parse(readFileSync(new URL(name, base), 'utf8')), name);
  const validate = ajv.compile(JSON.parse(readFileSync(new URL('global-visual-baseline.schema.json', base), 'utf8')));
  assert.equal(validate(baseline(f)), true, JSON.stringify(validate.errors));
  const multiple = baseline(f, 2); assert.equal(validate(multiple), false);
  multiple.exploration = { kind: 'initial', requestedCount: 2, userMessageRef: 'test-only://requested-two' };
  assert.equal(validate(multiple), true, JSON.stringify(validate.errors));
  const game = baseline(f); game.stack = 'cocos'; delete game.designRoute;
  assert.equal(validate(game), false);
  game.candidates = baseline(f, 3).candidates;
  assert.equal(validate(game), true, JSON.stringify(validate.errors));
});

test('仅设计提案沿现有控制器V2交付，不预建工程且不能进入正式实现', async (t) => {
  const f = fixture(t);
  const created = await initializeWork({ repo: f.repo, args: { id: 'proposal', stack: 'flutter', type: 'PAGE', objective: '仅设计提案', 'design-intent': 'proposal', 'object-id': 'page-a', 'project-id': 'project-a' } });
  const path = created.metadata.workItemPath; let work = loadWork(f.repo, path);
  work.gateStatus.F0 = 'PASS'; work.gateStatus.F1 = 'PASS'; work.globalState = 'PROPOSAL'; write(f.repo, path, work);
  await advanceVisual({ repo: f.repo, workItem: path, to: 'V1' }); await advanceVisual({ repo: f.repo, workItem: path, to: 'V2' });
  work = loadWork(f.repo, path); work.visual.candidateId = 'direction-a';
  const doc = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: 'flutter', workItemType: 'PAGE', visualStageModel: 'function-first-v1', visualStage: 'V2', objectId: work.visual.objectId, candidateId: 'direction-a', referenceTarget: f.doc.referenceTarget };
  attachFigmaAppFixture(f.repo, work, doc, { designOnly: true });
  const target = JSON.parse(readFileSync(join(f.repo, work.visual.reviews.V2.path), 'utf8')); target.qualityChecks = checks(f);
  work.visual.reviews.V2 = write(f.repo, 'proposal-target.json', target);
  const proposalFixture = { ...f, work, doc, snapshot: JSON.parse(readFileSync(join(f.repo, doc.figmaDesignRef.path), 'utf8')) };
  work.globalVisualBaselineRef = write(f.repo, 'proposal-baseline.json', baseline(proposalFixture));
  work.visual.domainEvidenceRef = write(f.repo, 'proposal-domain.json', doc); write(f.repo, path, work);
  assert.equal(work.implementationPackageRef, null); assert.equal(work.visual.functionBaselineRef, undefined);
  await assert.rejects(advanceVisual({ repo: f.repo, workItem: path, to: 'V3' }), /设计提案/);
  await assert.rejects(transitionWork({ repo: f.repo, workItem: path, to: 'REVIEW', args: {} }).then(() => transitionWork({ repo: f.repo, workItem: path, to: 'IMPLEMENTING', args: {} })), /F2|提案/);
  await transitionWork({ repo: f.repo, workItem: path, to: 'COMPLETE', args: {} });
  work = loadWork(f.repo, path); assert.equal(work.visual.stage, 'V2'); assert.equal(work.globalState, 'COMPLETE'); assert.equal(inspectWork(f.repo, work, { strict: true }).status, 'PASS');
});
