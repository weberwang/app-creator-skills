/** 验证 ESP32 阶段证据的文件身份、设备边界及宿主绑定。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateSingleDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/single-domain-check.mjs';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';

/** 写入当前测试独占的真实文件并返回摘要引用。 */
function write(repo, path, content) {
  const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 构造完整阶段输入，数据仅是合成夹具，不代表用户验收。 */
function fixture(t, { stage = 'V5', layer = false } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'esp32-domain-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const visual = { objectId: 'home', candidateId: 'candidate-a', stage, reviews: {} };
  const work = { workItemId: 'work-a', projectId: 'project-a', stack: 'esp32', workItemType: layer ? 'DISPLAY_LAYER' : 'PAGE', stageId: 'scene-production', visual };
  if (layer) Object.assign(visual, { hostId: 'host-a', layerType: 'modal' });
  const referenceTarget = write(repo, 'target.bin', '合成目标');
  const board = { chip: 'ESP32-S3', board: 'fixture', screen: { width: 320, height: 240, colorFormat: 'RGB565' }, sdk: { name: 'ESP-IDF', version: '5.x' }, gui: { name: 'LVGL', version: '9.x' } };
  const boardProfileRef = write(repo, 'board.json', board);
  const host = layer ? { hostId: visual.hostId, layerType: visual.layerType } : {};
  visual.reviews.V2 = write(repo, 'review-V2.json', { referenceTarget, boardProfileRef, ...host });
  visual.reviews.V3Decomposition = write(repo, 'review-V3Decomposition.json', { referenceTarget, ...host });
  const doc = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, workItemType: work.workItemType, visualStageModel: 'function-first-v1', visualStage: stage, objectId: visual.objectId, candidateId: visual.candidateId, referenceTarget, boardProfileRef, ...host };
  write(repo, 'ui.c', '合成布局源码');
  doc.layoutSourceRef = write(repo, 'snapshots/ui-before.c', '合成布局源码');
  const registrationRef = write(repo, 'asset-registration.c', '合成资源注册');
  const nodes = [{ id: 'screen', parentId: null, x: 0, y: 0, width: 320, height: 240, positioning: 'relative', references: ['viewport'] }];
  if (layer) nodes.push({ id: visual.objectId, parentId: 'screen', x: 8, y: 8, width: 200, height: 120, positioning: 'absolute', references: ['screen'], floatingKind: 'popup' });
  nodes.push({ id: 'title', parentId: layer ? visual.objectId : 'screen', x: 8, y: 8, width: 100, height: 20, positioning: 'relative', references: [layer ? visual.objectId : 'screen'] });
  const layout = { schemaVersion: '1.0', objectId: visual.objectId, boardProfileRef, screen: { width: 320, height: 240 }, sourcePath: 'ui.c', decompositionRef: visual.reviews.V3Decomposition, rootId: 'screen', nodes };
  doc.layoutSpecRef = write(repo, 'layout.json', layout);
  visual.reviews.V3Layout = write(repo, 'review-V3Layout.json', { referenceTarget, layoutSpecRef: doc.layoutSpecRef, ...host });
  const resource = write(repo, 'resource.bin', '合成资源');
  const assets = { schemaVersion: '1.0', objectId: visual.objectId, boardProfileRef, layoutSpecRef: doc.layoutSpecRef, budgetFlashBytes: 100, items: [{ id: 'icon', sourceRef: resource, generatedRef: resource, registrationRef, flashBytes: 10 }] };
  doc.assetManifestRef = write(repo, 'assets.json', assets);
  visual.reviews.V4 = write(repo, 'review-V4.json', { referenceTarget, assetManifestRef: doc.assetManifestRef, ...host });
  const evidence = write(repo, 'run.log', '合成运行、交互与资源证据');
  const build = { schemaVersion: '1.0', sourceRevision: 'fixture-commit', boardProfileRef, layoutSpecRef: doc.layoutSpecRef, layoutSourceRef: doc.layoutSourceRef, assetManifestRef: doc.assetManifestRef, binaryRef: write(repo, 'app.bin', '合成构建产物'), buildLogRef: write(repo, 'build.log', '合成构建输出') };
  const runtime = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: visual.objectId, candidateId: visual.candidateId, boardProfileRef, layoutSpecRef: doc.layoutSpecRef, layoutSourceRef: doc.layoutSourceRef, assetManifestRef: doc.assetManifestRef, buildIdentityRef: write(repo, 'build.json', build), environment: 'host-simulator', runEvidenceRef: evidence, interactionEvidenceRef: evidence, performanceEvidenceRef: evidence, ...host };
  if (layer) runtime.interactions = ['open', 'close', 'focus-restore'].map((action) => ({ action, status: 'PASS', evidenceRef: evidence }));
  /** 同步上下文、V5 用户确认与外层证据，模拟绑定后的最终输入。 */
  function save() {
    doc.runtimeContextRef = write(repo, 'runtime.json', runtime);
    visual.reviews.V5 = write(repo, 'review-V5.json', { referenceTarget, runtimeContextRef: doc.runtimeContextRef, ...host });
    visual.domainEvidenceRef = write(repo, 'domain.json', doc);
  }
  save();
  return { repo, work, doc, board, layout, assets, runtime, build, host, referenceTarget, save };
}

test('ESP32 页面可分别校验 V2 至 V5 阶段材料', (t) => {
  for (const stage of ['V2', 'V3', 'V4', 'V5']) {
    const f = fixture(t, { stage });
    assert.equal(validateSingleDomainTarget(f.repo, f.work, stage), true);
  }
});

test('ESP32 拒绝错对象、设备尺寸、失效布局源与拆解来源', (t) => {
  const f = fixture(t, { stage: 'V3' });
  f.layout.objectId = 'other'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /当前对象/);
  f.layout.objectId = 'home'; f.layout.screen.width = 319; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /分辨率/);
  f.layout.screen.width = 320; f.layout.nodes[1].parentId = 'title'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /父子关系/);
  f.layout.nodes[1].parentId = 'screen'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  write(f.repo, 'snapshots/ui-before.c', '快照被更改');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /正式布局源快照.*内容/);
  f.doc.layoutSourceRef = write(f.repo, 'snapshots/ui-before.c', '快照被更改'); f.layout.decompositionRef = write(f.repo, 'unrelated.json', { other: true }); f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /拆解确认.*当前文件/);
});

test('ESP32 资源必须绑定真实文件与预算，允许说明无外部资产', (t) => {
  const f = fixture(t, { stage: 'V4' });
  f.assets.items[0].flashBytes = 101; f.doc.assetManifestRef = write(f.repo, 'assets.json', f.assets); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V4'), /超出 Flash 预算/);
  f.assets.items = []; f.doc.assetManifestRef = write(f.repo, 'assets.json', f.assets); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V4'), /无外部资源原因/);
  f.assets.nativeOnlyReason = '仅使用内建控件'; f.doc.assetManifestRef = write(f.repo, 'assets.json', f.assets); f.save();
  f.work.visual.reviews.V4 = write(f.repo, 'review-V4.json', { referenceTarget: f.referenceTarget, assetManifestRef: f.doc.assetManifestRef });
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V4'), true);
});

test('ESP32 V5 缺少运行材料或用户对上下文的确认时不得通过', (t) => {
  const f = fixture(t);
  f.runtime.performanceEvidenceRef = write(f.repo, 'performance.log', '合成资源结果'); f.save();
  write(f.repo, 'performance.log', '已变更');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /performanceEvidenceRef.*内容/);
  f.runtime.performanceEvidenceRef = write(f.repo, 'performance.log', '已变更'); f.save();
  f.work.visual.reviews.V5 = write(f.repo, 'review-V5.json', { runtimeContextRef: write(f.repo, 'other.json', { other: true }) });
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /V5 用户确认运行上下文.*当前文件/);
});

test('ESP32 显示层须绑定宿主，并记录实际交互或不适用理由', (t) => {
  const f = fixture(t, { layer: true });
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.runtime.hostId = 'other'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /宿主/);
  f.runtime.hostId = 'host-a'; f.runtime.interactions[2] = { action: 'focus-restore', status: 'NOT_APPLICABLE', reason: '设备无焦点导航' }; f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.runtime.interactions[2].reason = ''; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /不适用原因/);
  f.runtime.interactions[2].reason = '设备无焦点导航'; f.save();
  f.work.visual.reviews.V3Layout = write(f.repo, 'other-review.json', { hostId: 'other', layerType: 'modal', layoutSpecRef: f.doc.layoutSpecRef });
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /显示层确认.*宿主/);
});

test('ESP32 已确认设备、布局和资源不可整体换新后沿用旧用户确认', (t) => {
  const board = fixture(t, { stage: 'V2' });
  const changedBoard = structuredClone(board.board);
  changedBoard.screen.width = 240;
  board.doc.boardProfileRef = write(board.repo, 'new-board.json', changedBoard); board.save();
  assert.throws(() => validateSingleDomainTarget(board.repo, board.work, 'V2'), /V2 确认 boardProfileRef.*当前文件/);

  const layout = fixture(t, { stage: 'V3' });
  const changedLayout = structuredClone(layout.layout);
  changedLayout.nodes[1].width = 120;
  write(layout.repo, 'new-ui.c', '替换后的正式源码'); changedLayout.sourcePath = 'new-ui.c';
  layout.doc.layoutSpecRef = write(layout.repo, 'new-layout.json', changedLayout); layout.save();
  assert.throws(() => validateSingleDomainTarget(layout.repo, layout.work, 'V3'), /V3Layout 确认 layoutSpecRef.*当前文件/);

  const assets = fixture(t, { stage: 'V4' });
  const changedAssets = structuredClone(assets.assets);
  changedAssets.items[0].flashBytes = 20;
  changedAssets.items[0].generatedRef = write(assets.repo, 'new-resource.bin', '替换后的资源');
  assets.doc.assetManifestRef = write(assets.repo, 'new-assets.json', changedAssets); assets.save();
  assert.throws(() => validateSingleDomainTarget(assets.repo, assets.work, 'V4'), /V4 确认 assetManifestRef.*当前文件/);
});

test('ESP32 相对布局限制普通页面及显示层内部定位', (t) => {
  const page = fixture(t, { stage: 'V3' });
  page.layout.nodes[1].positioning = 'absolute'; page.doc.layoutSpecRef = write(page.repo, 'layout-invalid-absolute.json', page.layout); page.save();
  assert.throws(() => validateSingleDomainTarget(page.repo, page.work, 'V3'), /普通 UI 必须相对布局/);
  page.layout.nodes[1].floatingKind = 'popup'; page.doc.layoutSpecRef = write(page.repo, 'layout-invalid-body.json', page.layout); page.save();
  assert.throws(() => validateSingleDomainTarget(page.repo, page.work, 'V3'), /PAGE 不能声明浮层本体/);
  delete page.layout.nodes[1].floatingKind; page.layout.nodes[1].positioning = 'relative'; page.layout.nodes[1].references = ['invented-root']; page.doc.layoutSpecRef = write(page.repo, 'layout-invalid-reference.json', page.layout); page.save();
  assert.throws(() => validateSingleDomainTarget(page.repo, page.work, 'V3'), /定位参照不存在/);

  const layer = fixture(t, { stage: 'V3', layer: true });
  layer.layout.nodes[2].references = ['viewport']; layer.doc.layoutSpecRef = write(layer.repo, 'layout-invalid-escape.json', layer.layout); layer.save();
  assert.throws(() => validateSingleDomainTarget(layer.repo, layer.work, 'V3'), /浮层内部定位参照.*逃出/);
  layer.layout.nodes[2].references = ['home']; layer.layout.nodes[1].floatingKind = 'toast'; layer.doc.layoutSpecRef = write(layer.repo, 'layout-invalid-kind.json', layer.layout); layer.save();
  assert.throws(() => validateSingleDomainTarget(layer.repo, layer.work, 'V3'), /唯一浮层本体/);
});

test('ESP32 运行证据须绑定当前材料构建身份及未篡改构建产物', (t) => {
  const f = fixture(t);
  f.build.sourceRevision = ''; f.runtime.buildIdentityRef = write(f.repo, 'build-invalid.json', f.build); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /构建源码版本/);
  f.build.sourceRevision = 'fixture-commit'; f.build.layoutSpecRef = write(f.repo, 'other-layout.json', { other: true }); f.runtime.buildIdentityRef = write(f.repo, 'build-stale.json', f.build); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /构建身份 layoutSpecRef.*当前文件/);
  f.build.layoutSpecRef = f.doc.layoutSpecRef; f.runtime.buildIdentityRef = write(f.repo, 'build-valid.json', f.build); f.save();
  write(f.repo, 'app.bin', '替换后的构建产物');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /构建 binaryRef.*内容/);
});

test('仅变更实现时保留旧源码快照和布局确认，历史及当前工作项均可复验', (t) => {
  const f = fixture(t);
  const historical = structuredClone(f.work);
  const originalLayoutRef = structuredClone(f.doc.layoutSpecRef);
  const originalReviewRef = structuredClone(f.work.visual.reviews.V3Layout);
  write(f.repo, 'ui.c', '只修改事件逻辑后的正式源码');
  const nextSource = write(f.repo, 'snapshots/ui-after.c', '只修改事件逻辑后的正式源码');
  assert.equal(validateSingleDomainTarget(f.repo, historical, 'V5'), true, '旧工作项应继续引用自己的源码快照');

  const doc = { ...f.doc, layoutSourceRef: nextSource };
  const work = structuredClone(f.work);
  const v3 = { ...doc, visualStage: 'V3' };
  work.visual.domainEvidenceRef = write(f.repo, 'new-domain-v3.json', v3);
  assert.equal(validateSingleDomainTarget(f.repo, work, 'V3'), true);
  assert.deepEqual(doc.layoutSpecRef, originalLayoutRef);
  assert.deepEqual(work.visual.reviews.V3Layout, originalReviewRef);

  const build = { ...f.build, layoutSourceRef: nextSource, sourceRevision: 'fixture-next' };
  const runtime = { ...f.runtime, layoutSourceRef: nextSource, buildIdentityRef: write(f.repo, 'new-build.json', build) };
  doc.runtimeContextRef = write(f.repo, 'new-runtime.json', runtime);
  work.visual.reviews.V5 = write(f.repo, 'new-review-V5.json', { referenceTarget: f.referenceTarget, runtimeContextRef: doc.runtimeContextRef });
  work.visual.domainEvidenceRef = write(f.repo, 'new-domain-v5.json', doc);
  assert.equal(validateSingleDomainTarget(f.repo, work, 'V5'), true);
  assert.equal(validateSingleDomainTarget(f.repo, historical, 'V5'), true, '新工作项不能覆盖历史证据');

  const stale = { ...build, layoutSourceRef: f.doc.layoutSourceRef };
  runtime.buildIdentityRef = write(f.repo, 'stale-build.json', stale);
  doc.runtimeContextRef = write(f.repo, 'stale-runtime.json', runtime);
  work.visual.reviews.V5 = write(f.repo, 'stale-review-V5.json', { referenceTarget: f.referenceTarget, runtimeContextRef: doc.runtimeContextRef });
  work.visual.domainEvidenceRef = write(f.repo, 'stale-domain-v5.json', doc);
  assert.throws(() => validateSingleDomainTarget(f.repo, work, 'V5'), /构建身份 layoutSourceRef.*当前文件/);
});

test('ESP32 正式源与快照应分别存在，布局几何和正式源位置变化仍需新确认', (t) => {
  const f = fixture(t, { stage: 'V3' });
  f.doc.layoutSourceRef = write(f.repo, 'ui.c', '可变正式源码'); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /快照不能指向可变/);
  f.doc.layoutSourceRef = write(f.repo, 'snapshots/next.c', '可变正式源码');
  const altered = structuredClone(f.layout);
  altered.nodes[1].width += 1;
  f.doc.layoutSpecRef = write(f.repo, 'altered-layout.json', altered); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /V3Layout 确认 layoutSpecRef.*当前文件/);
  altered.nodes[1].width -= 1; altered.sourcePath = 'elsewhere.c';
  write(f.repo, 'elsewhere.c', '可变正式源码');
  f.doc.layoutSpecRef = write(f.repo, 'moved-layout.json', altered); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /V3Layout 确认 layoutSpecRef.*当前文件/);
});

test('人工确认 schema 允许三个有摘要的 ESP32 文件引用并拒绝缺失摘要', () => {
  const schema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/human-review.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  const ref = { path: 'evidence.json', sha256: 'a'.repeat(64) };
  const review = { schemaVersion: '1.0', objectId: 'home', stage: 'V5', purpose: 'runtime-acceptance', decision: 'APPROVED', userMessageRef: '用户消息', boardProfileRef: ref, layoutSpecRef: ref, assetManifestRef: ref };
  assert.equal(validate(review), true, JSON.stringify(validate.errors));
  for (const key of ['boardProfileRef', 'layoutSpecRef', 'assetManifestRef']) {
    assert.equal(validate({ ...review, [key]: { path: 'evidence.json' } }), false, `${key} 必须包含摘要`);
  }
});

test('设备运行结果须引用当前设备动作的精确授权', (t) => {
  const f = fixture(t);
  f.runtime.environment = 'device'; f.runtime.deviceTarget = 'board-a'; f.runtime.approvalUserMessageRef = '用户消息'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /明确 device 授权/);
  f.work.action = { actionId: 'test-device', effects: ['device'], target: 'board-a', approval: { workItemId: f.work.workItemId, stack: 'esp32', stageId: f.work.stageId, actionId: 'test-device', effects: ['device'], target: 'board-a', userMessageRef: '用户消息' } };
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.runtime.deviceTarget = 'board-b'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /明确 device 授权/);
});
