/** 验证 Expo 单目标合同的阶段、原生身份、布局与用户确认绑定。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { syntheticDesignPng } from './visual-image-fixture.mjs';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { assertVisualReview } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { validateSingleDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/single-domain-check.mjs';
import { validateExpo } from '../../skills/app-workflow-control/scripts/runtime/expo-domain-check.mjs';
import { attachFigmaAppFixture, attachFigmaLineFixture } from './figma-app-fixture.mjs';
import { validateFigmaAppStage } from '../../skills/app-workflow-control/scripts/runtime/figma-app-contract.mjs';
import { extractFlutterPlan } from '../../skills/app-workflow-control/scripts/runtime/flutter-plan-extractor.mjs';

/** 写入隔离项目的合成文件并返回实际字节摘要。 */
function write(repo, path, content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 生成真实文件构成的合成合同；测试材料不能作为用户验收记录。 */
function fixture(t, { stage = 'V5', layer = false, platform = 'android' } = {}) {
  const temporaryRoot = realpathSync(tmpdir());
  const repo = mkdtempSync(join(temporaryRoot, 'expo-domain-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), temporaryRoot);
    assert.ok(basename(actual).startsWith('expo-domain-'));
    rmSync(actual, { recursive: true, force: true });
  });
  const visual = { objectId: 'home', candidateId: 'candidate-a', stage, reviews: {} };
  const work = { workItemId: 'work-a', projectId: 'project-a', stack: 'expo', workItemType: layer ? 'DISPLAY_LAYER' : 'PAGE', stageId: 'scene-production', visual };
  if (layer) Object.assign(visual, { hostId: 'host-a', layerType: 'modal' });
  const host = layer ? { hostId: visual.hostId, layerType: visual.layerType } : {};
  const referenceTarget = write(repo, 'target.png', syntheticDesignPng('expo-target'));
  const profile = { schemaVersion: '1.0', platform, viewport: { width: 390, height: 844 }, safeArea: { top: 24, right: 0, bottom: 16, left: 0 }, fontScale: 1, expoSdkVersion: 'fixture', reactNativeVersion: 'fixture' };
  const platformProfileRef = write(repo, 'platform.json', profile);
  visual.reviews.V2 = write(repo, 'review-v2.json', { referenceTarget, platformProfileRef, ...host });
  visual.reviews.V3Decomposition = write(repo, 'review-v3-decomposition.json', { referenceTarget, ...host });
  const doc = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, workItemType: work.workItemType, visualStageModel: 'function-first-v1', visualStage: stage, objectId: visual.objectId, candidateId: visual.candidateId, referenceTarget, platformProfileRef, ...host };
  write(repo, 'src/home.tsx', '合成组件');
  doc.layoutSourceRef = write(repo, 'snapshots/home.tsx', '合成组件');
  const nodes = [{ id: 'screen', parentId: null, x: 0, y: 0, width: 390, height: 844, positioning: 'relative', references: ['viewport'] }];
  if (layer) nodes.push({ id: visual.objectId, parentId: 'screen', x: 10.5, y: 20, width: 300, height: 200, positioning: 'absolute', references: ['screen'], floatingKind: 'popup' });
  nodes.push({ id: 'title', parentId: layer ? visual.objectId : 'screen', x: 8, y: 8, width: 100, height: 20.5, positioning: 'relative', references: [layer ? visual.objectId : 'screen'] });
  // 先冻结所选 Figma 的实际节点，再生成引用该设计的原生布局，避免循环引用。
  attachFigmaAppFixture(repo, work, doc, { designOnly: true, nativeLayout: { nodes } });
  const layout = { schemaVersion: '1.0', objectId: visual.objectId, platformProfileRef, unit: 'logical-pixel', viewport: profile.viewport, sourcePath: 'src/home.tsx', figmaDesignRef: doc.figmaDesignRef, rootId: 'screen', safeAreaStrategy: '避让系统边界', keyboardStrategy: '按页面滚动', textScaleStrategy: '系统字体缩放', nodes };
  doc.layoutSpecRef = write(repo, 'layout.json', layout);
  visual.reviews.V3Layout = write(repo, 'review-v3-layout.json', { referenceTarget, layoutSpecRef: doc.layoutSpecRef, ...host });
  const resource = write(repo, 'asset.bin', '合成素材');
  const assets = { schemaVersion: '1.0', objectId: visual.objectId, platformProfileRef, layoutSpecRef: doc.layoutSpecRef, items: [{ id: 'icon', sourceRef: resource, runtimeRef: resource, registrationRef: resource }] };
  doc.assetManifestRef = write(repo, 'assets.json', assets);
  visual.reviews.V4 = write(repo, 'review-v4.json', { referenceTarget, assetManifestRef: doc.assetManifestRef, ...host });
  const evidence = write(repo, 'run.log', '合成运行与交互记录');
  const refs = { platformProfileRef, layoutSpecRef: doc.layoutSpecRef, layoutSourceRef: doc.layoutSourceRef, assetManifestRef: doc.assetManifestRef };
  const runtimeKind = platform === 'web' ? 'web-export' : 'native-build';
  const environment = { android: 'android-emulator', ios: 'ios-simulator', web: 'web-browser' }[platform];
  const build = { schemaVersion: '1.0', sourceRevision: 'fixture-commit', platform, buildKind: 'development', runtimeKind, ...refs, artifactRef: write(repo, 'app.bin', '合成构建产物'), buildLogRef: write(repo, 'build.log', '合成构建输出') };
  const runtime = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: visual.objectId, candidateId: visual.candidateId, platform, environment, buildKind: 'development', runtimeKind, ...refs, buildIdentityRef: write(repo, 'build.json', build), runEvidenceRef: evidence, interactionEvidenceRef: evidence, ...host };
  if (layer) runtime.interactions = ['open', 'close', 'focus-restore'].map((action) => ({ action, status: 'PASS', evidenceRef: evidence }));
  /** 更新运行证据及当前确认引用，避免覆盖其他历史阶段材料。 */
  function save() {
    doc.runtimeContextRef = write(repo, 'runtime.json', runtime);
    visual.reviews.V5 = write(repo, 'review-v5.json', { referenceTarget, runtimeContextRef: doc.runtimeContextRef, ...host });
    attachFigmaAppFixture(repo, work, doc);
    visual.domainEvidenceRef = write(repo, 'domain.json', doc);
  }
  save();
  return { repo, work, doc, profile, layout, assets, build, runtime, host, referenceTarget, save };
}

test('Expo 页面和显示层分别通过 V2–V5，Web 独立记录其构建和运行', (t) => {
  for (const layer of [false, true]) for (const stage of ['V2', 'V3', 'V4', 'V5']) {
    const f = fixture(t, { stage, layer });
    assert.equal(validateSingleDomainTarget(f.repo, f.work, stage), true);
  }
  const web = fixture(t, { platform: 'web' });
  assert.equal(validateSingleDomainTarget(web.repo, web.work, 'V5'), true);
});

test('Expo 将 Figma 直线绘制边界交接到原生布局，保留源几何且拒绝伪造样式', (t) => {
  const f = fixture(t, { stage: 'V3' });
  const { bounds } = attachFigmaLineFixture(f.repo, f.work, f.doc, f.layout, { rotation: 90 });
  f.save();
  assert.deepEqual(bounds, { x: 119.5, y: 50, width: 1, height: 100, origin: { x: 0.5, y: 100 } });
  assert.doesNotThrow(() => validateFigmaAppStage(f.repo, f.work, 'V2', f.doc));
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V3'), true);
  // 样式只放在已有交接映射也能通过，不需要重复写入布局节点。
  assert.equal(f.layout.nodes.find((node) => node.id === 'separator').designProperties, undefined);
  const handoff = JSON.parse(readFileSync(join(f.repo, f.doc.figmaHandoffRef.path), 'utf8'));
  const mapping = handoff.mappings.find((item) => item.designItemId === 'separator');
  assert.equal(mapping.nativeStyle.designFacts.raw.other.rotation, 90);
  mapping.nativeStyle.designFacts.raw.other.rotation = 0;
  f.doc.figmaHandoffRef = write(f.repo, 'line/wrong-style.json', handoff);
  f.work.visual.domainEvidenceRef = write(f.repo, 'line/wrong-domain.json', f.doc);
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /字体、颜色或形态/);
  // 非直线仍须正尺寸，局部适配器也不能被零高普通文本绕过。
  f.layout.nodes.find((node) => node.id === 'title').height = 0;
  f.doc.layoutSpecRef = write(f.repo, 'line/invalid-text-layout.json', f.layout);
  const identity = (_repo, ref) => {
    const bytes = readFileSync(join(f.repo, ref.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.sha256);
    return ref.path;
  };
  assert.throws(() => validateExpo(f.repo, f.work, 'V3', f.doc, identity), /布局节点 height 无效/);
});

test('Figma 直线交接允许独立冻结的布局规格和原生计划', (t) => {
  const f = fixture(t, { stage: 'V3' });
  attachFigmaLineFixture(f.repo, f.work, f.doc, f.layout);
  f.save();
  const snapshot = JSON.parse(readFileSync(join(f.repo, f.doc.figmaDesignRef.path), 'utf8'));
  const handoff = JSON.parse(readFileSync(join(f.repo, f.doc.figmaHandoffRef.path), 'utf8'));
  const request = { workItemId: f.work.workItemId, objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
    referenceTarget: f.doc.referenceTarget, figmaDesignRef: f.doc.figmaDesignRef, conditionId: 'main', stateRule: '当前状态可见',
    adaptation: { platform: 'android', orientation: 'portrait', safeArea: { top: 24, right: 0, bottom: 16, left: 0 }, keyboard: 'hidden' },
    mappings: handoff.mappings.map((mapping) => ({ designItemId: mapping.designItemId, nodeId: mapping.nodeId, implementationId: `impl-${mapping.designItemId}`,
      label: mapping.designItemId, widget: 'NativeView', kind: 'native', designReason: '真实设计节点', consumers: [{ id: mapping.designItemId, sourcePath: 'src/home.tsx', symbol: 'Home' }] })) };
  const extracted = extractFlutterPlan(snapshot, request);
  f.doc.designReconstructionRef = write(f.repo, 'line/separate-native-plan.json', extracted.plan);
  handoff.nativePlanRef = f.doc.designReconstructionRef;
  handoff.mappings = extracted.mappings;
  f.doc.figmaHandoffRef = write(f.repo, 'line/separate-handoff.json', handoff);
  f.work.visual.domainEvidenceRef = write(f.repo, 'line/separate-domain.json', f.doc);
  assert.notEqual(f.doc.designReconstructionRef.path, f.doc.layoutSpecRef.path);
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V3'), true);
});

test('Expo Figma 布局直接绑定当前设计，V3 无需另画图或重复批准', (t) => {
  for (const layer of [false, true]) {
    const f = fixture(t, { stage: 'V3', layer });
    f.doc.figmaDesignRef = write(f.repo, 'figma-design.json', { nodeId: '1:2' });
    f.layout.figmaDesignRef = f.doc.figmaDesignRef;
    delete f.layout.decompositionRef;
    delete f.layout.sourcePath;
    delete f.doc.layoutSourceRef;
    delete f.work.visual.reviews.V3Decomposition;
    delete f.work.visual.reviews.V3Layout;
    f.doc.layoutSpecRef = write(f.repo, 'figma-layout.json', f.layout);
    /** 该单元只验证原生适配；Figma 身份与交接由公共合同另行覆盖。 */
    const identity = (_repo, ref) => {
      const bytes = readFileSync(join(f.repo, ref.path));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.sha256);
      return ref.path;
    };
    assert.doesNotThrow(() => validateExpo(f.repo, f.work, 'V3', f.doc, identity));
    f.layout.figmaDesignRef = write(f.repo, 'other-design.json', { nodeId: '9:9' });
    f.doc.layoutSpecRef = write(f.repo, 'figma-layout-other.json', f.layout);
    assert.throws(() => validateExpo(f.repo, f.work, 'V3', f.doc, identity), /布局 Figma 设计.*当前文件/);
    f.layout.figmaDesignRef = f.doc.figmaDesignRef;
    f.layout.unit = 'physical-pixel';
    f.doc.layoutSpecRef = write(f.repo, 'figma-layout-invalid-unit.json', f.layout);
    assert.throws(() => validateExpo(f.repo, f.work, 'V3', f.doc, identity), /单位或视口/);
  }
});

test('公共阶段门实际调用 Expo 合同并验证用户确认链', (t) => {
  const f = fixture(t, { stage: 'V2' });
  // 复用同一次源图确认及忠实重建授权，不为通过阶段门伪造第二次预览选稿。
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8'));
  f.work.visual.domainEvidenceRef = write(f.repo, 'public-domain-v2.json', f.doc);
  assert.doesNotThrow(() => assertVisualReview(f.repo, f.work, 'V2'));
  review.decision = 'REJECTED';
  f.work.visual.reviews.V2 = write(f.repo, 'public-rejected.json', review);
  assert.throws(() => assertVisualReview(f.repo, f.work, 'V2'), /未获用户确认|人工选择|确认|选稿/);
});

test('V2 不依赖未来阶段素材或运行证据，且必须绑定用户确认的平台', (t) => {
  const f = fixture(t, { stage: 'V2' });
  for (const key of ['layoutSpecRef', 'layoutSourceRef', 'assetManifestRef', 'runtimeContextRef']) delete f.doc[key];
  f.work.visual.domainEvidenceRef = write(f.repo, 'domain-v2.json', f.doc);
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V2'), true);
  f.doc.platformProfileRef = write(f.repo, 'other-platform.json', { ...f.profile, fontScale: 1.5 });
  f.work.visual.domainEvidenceRef = write(f.repo, 'domain-v2-new.json', f.doc);
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /V2 确认 platformProfileRef.*当前文件/);
});

test('布局拒绝错对象、父链、单位、定位和失效源码快照', (t) => {
  const f = fixture(t, { stage: 'V3' });
  f.layout.objectId = 'other'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /当前对象/);
  f.layout.objectId = 'home'; f.layout.unit = 'physical-pixel'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /单位或视口/);
  f.layout.unit = 'logical-pixel'; f.layout.nodes[1].parentId = 'title'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /父子关系/);
  f.layout.nodes[1].parentId = 'screen'; f.layout.nodes[1].positioning = 'absolute'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /普通 UI 必须相对布局/);
  f.layout.nodes[1].positioning = 'relative'; f.doc.layoutSpecRef = write(f.repo, 'layout.json', f.layout); f.save();
  write(f.repo, 'snapshots/home.tsx', '已替换快照');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V3'), /布局源快照.*内容/);
});

test('V4 资源为空时须说明原因，缺少实际素材文件不能通过', (t) => {
  const f = fixture(t, { stage: 'V4' });
  write(f.repo, 'asset.bin', '被替换的素材');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V4'), /资源 icon.*内容/);
  f.assets.items = []; f.doc.assetManifestRef = write(f.repo, 'new-assets.json', f.assets); f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V4'), /无外部资源原因/);
  f.assets.nativeOnlyReason = '仅使用平台控件'; f.doc.assetManifestRef = write(f.repo, 'native-assets.json', f.assets); f.save();
  f.work.visual.reviews.V4 = write(f.repo, 'new-review-v4.json', { referenceTarget: f.referenceTarget, assetManifestRef: f.doc.assetManifestRef, figmaDesignRef: f.doc.figmaDesignRef });
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V4'), true);
});

test('V5 区分平台、原生构建、构建类型和真实工件，拒绝冒用预览', (t) => {
  const f = fixture(t);
  f.runtime.environment = 'web-browser'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /运行环境与平台/);
  f.runtime.environment = 'android-emulator'; f.runtime.runtimeKind = 'expo-go'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /不能代替原生构建/);
  f.runtime.runtimeKind = 'native-build'; f.runtime.buildKind = 'release'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /构建身份与平台或运行类型/);
  f.runtime.buildKind = 'development'; f.save();
  write(f.repo, 'app.bin', '构建产物被替换');
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /构建 artifactRef.*内容/);
});

test('显示层阶段确认须绑定当前宿主且真实交互逐项有记录', (t) => {
  const f = fixture(t, { layer: true });
  f.runtime.hostId = 'other'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /宿主/);
  f.runtime.hostId = 'host-a'; f.runtime.interactions[2] = { action: 'focus-restore', status: 'NOT_APPLICABLE', reason: '' }; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /不适用原因/);
  f.runtime.interactions[2].reason = '设备无焦点导航'; f.save();
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.work.visual.reviews.V4 = write(f.repo, 'other-review.json', { hostId: 'other', layerType: 'modal', assetManifestRef: f.doc.assetManifestRef, figmaDesignRef: f.doc.figmaDesignRef });
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /显示层确认.*宿主/);
});

test('设备证据只接受与当前动作一致的公共精确批准', (t) => {
  const f = fixture(t);
  f.runtime.environment = 'android-device'; f.runtime.deviceTarget = 'phone-a'; f.runtime.approvalUserMessageRef = '用户消息'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /明确 device 授权/);
  f.work.action = { actionId: 'test-device', effects: ['device'], target: 'phone-a', approval: { workItemId: f.work.workItemId, stack: 'expo', stageId: f.work.stageId, actionId: 'test-device', effects: ['device'], target: 'phone-a', userMessageRef: '用户消息' } };
  assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V5'), true);
  f.runtime.deviceTarget = 'phone-b'; f.save();
  assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V5'), /明确 device 授权/);
});

test('确认 schema 接受 Expo 平台摘要引用并拒绝缺失摘要', () => {
  const schema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/human-review.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  const review = { schemaVersion: '1.0', objectId: 'home', stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: '用户消息', platformProfileRef: { path: 'platform.json', sha256: 'a'.repeat(64) } };
  assert.equal(validate(review), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...review, platformProfileRef: { path: 'platform.json' } }), false);
});
