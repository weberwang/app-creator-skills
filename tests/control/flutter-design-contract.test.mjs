import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateFlutterDesign, validateFlutterAssetReview } from '../../skills/app-workflow-control/scripts/runtime/flutter-design-contract.mjs';
import { attachFlutterDesignFixture, writeRawDesignFixture, writeDesignFixture as write } from './flutter-design-fixture.mjs';
import { encodePngRgba } from '../../skills/app-asset-workflow/scripts/png-raster.mjs';
import { createHash } from 'node:crypto';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateSingleDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/single-domain-check.mjs';

/** 所有用户消息与截图均为明确的合成材料，只验证合同规则。 */
function fixture(t, stage = 'V5', targetBytes = '合成源图') {
  const repo = mkdtempSync(join(tmpdir(), 'flutter-design-contract-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const work = { workItemId: 'design-work', stack: 'flutter', workItemType: 'PAGE', visual: { objectId: 'home', candidateId: 'approved-a', reviews: {} } };
  const doc = { referenceTarget: write(repo, 'target.txt', targetBytes), visualStage: stage, layoutSpecRef: write(repo, 'layout.yaml', '合成布局') };
  const data = attachFlutterDesignFixture(repo, work, doc);
  return { repo, work, doc, ...data };
}

/** 仅重新冻结变异材料，保留其余身份，便于检查准确的失败原因。 */
function savePlan(f) {
  f.doc.designReconstructionRef = write(f.repo, 'mutated-plan.json', f.plan);
}

/** 合法变更计划后同步显式更新确认和当前观测，不从旧结论推测通过。 */
function rebind(f) {
  savePlan(f);
  for (const { report } of f.reports ?? []) {
    report.designReconstructionRef = f.doc.designReconstructionRef;
    writeRawDesignFixture(f.repo, f.work, f.doc, f.plan, report);
  }
  f.doc.implementationEvidenceRefs = (f.reports ?? []).map(({ report }, index) => write(f.repo, `report-${index}.json`, report));
  if (f.asset) {
    for (const [index, asset] of f.asset.assets.entries()) {
      const implementation = f.plan.implementations[index];
      asset.implementationEvidenceRef = f.doc.implementationEvidenceRefs[index];
      asset.componentEvidenceRef = asset.implementationEvidenceRef.path;
      asset.designItemIds = implementation.designItemIds; asset.consumerIds = implementation.consumers.map((item) => item.id);
    }
    f.work.assetReviewRef = write(f.repo, 'assets-rebound.json', f.asset);
  }
  for (const [name, ref] of Object.entries(f.work.visual.reviews)) {
    const review = JSON.parse(readFileSync(join(f.repo, ref.path), 'utf8'));
    review.designReconstructionRef = f.doc.designReconstructionRef;
    if (name === 'V4') review.assetReviewRef = f.work.assetReviewRef;
    f.work.visual.reviews[name] = write(f.repo, `reviews-${name}.json`, review);
  }
}

test('只有抽象框图或笼统原生声明不能判定 V3 素材拆解完成', (t) => {
  const f = fixture(t, 'V3');
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc));
  f.doc.designReconstructionRef = write(f.repo, 'abstract.json', { widgetTree: ['Scaffold', 'Column'], route: '全部原生' });
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /Schema/);
});

test('原生组件只有源码和非空证据，手写 PASS 仍被阻止', (t) => {
  const f = fixture(t, 'V4');
  f.doc.implementationEvidenceRefs = [write(f.repo, 'pretend.json', { sourcePath: 'lib/page.dart', status: 'PASS' })];
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /实现证据/);
  f.work.visual.domainEvidenceRef = write(f.repo, 'domain.json', f.doc);
  assert.throws(() => validateFlutterAssetReview(f.repo, f.work, f.asset), /实现证据/);
});

test('原始输出是任意文本或复制期望值而无源码定位时被阻止', (t) => {
  const f = fixture(t, 'V4'); const report = f.reports[0].report;
  report.executionRef = write(f.repo, 'arbitrary.txt', '所有属性 PASS');
  f.doc.implementationEvidenceRefs[0] = write(f.repo, 'claim.json', report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /不是有效 JSON/);
  writeRawDesignFixture(f.repo, f.work, f.doc, f.plan, report);
  const raw = JSON.parse(readFileSync(join(f.repo, report.executionRef.path), 'utf8'));
  for (const observation of raw.observations) delete observation.bindings;
  report.executionRef = write(f.repo, 'no-bindings.json', raw);
  f.doc.implementationEvidenceRefs[0] = write(f.repo, 'no-bindings-report.json', report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /可复算定位/);
});

test('只有空类源码并复制目标观测，不能通过原生还原检查', (t) => {
  const f = fixture(t, 'V4'); const report = f.reports[0].report;
  const raw = JSON.parse(readFileSync(join(f.repo, report.executionRef.path), 'utf8'));
  report.sourceRefs[0] = write(f.repo, report.sourceRefs[0].path, 'class Heading {}');
  raw.sourceRefs = report.sourceRefs;
  report.executionRef = write(f.repo, 'empty-class-observations.json', raw);
  f.doc.implementationEvidenceRefs[0] = write(f.repo, 'empty-class-report.json', report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /源码观测位置越界|源码实际属性/);
});

test('V2 样本或单项确认不能成为完整页面的设计目标', (t) => {
  const f = fixture(t, 'V3'); f.work.projectId = 'test-project';
  Object.assign(f.doc, { schemaVersion: '1.0', workItemId: f.work.workItemId, projectId: f.work.projectId, stack: 'flutter', workItemType: 'PAGE',
    objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId, visualStageModel: 'function-first-v1', visualStage: 'V2' });
  for (const kind of ['representative-sample', 'design-items', 'full-object']) {
    f.work.visual.reviews.V2 = write(f.repo, `target-${kind}.json`, { referenceTarget: f.doc.referenceTarget, scope: { kind, designItemIds: [], conditionIds: [] } });
    f.work.visual.domainEvidenceRef = write(f.repo, 'v2-domain.json', f.doc);
    if (kind === 'full-object') assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V2'), true);
    else assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /V2.*完整目标范围/);
  }
});

test('设计项缺失实现映射、源图定位或原生尺寸规格均被阻止', (t) => {
  const f = fixture(t, 'V3'); const original = structuredClone(f.plan);
  f.plan.elements[0].implementationId = 'unmapped'; savePlan(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /缺少实现映射/);
  f.plan = structuredClone(original); delete f.plan.elements[0].region; savePlan(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /Schema/);
  f.plan = structuredClone(original); delete f.plan.implementations[0].requirements.size; savePlan(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /Schema/);
  f.plan = structuredClone(original); f.plan.implementations[0].requirements.size.value = '沿用默认控件'; savePlan(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /Schema/);
});

test('图片 V3 必须有生产规格，但不要求提前生产或导入文件', (t) => {
  const f = fixture(t, 'V3'); f.plan.implementations[0].kind = 'image'; savePlan(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /Schema/);
  f.plan.implementations[0].production = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/templates/image-production.json', import.meta.url), 'utf8'));
  f.plan.implementations[0].production.consumerIds = ['heading-widget']; rebind(f);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc));
});

test('V4 与 V5 代表样本、单项范围不能提升为完整对象验收', (t) => {
  for (const [stage, name] of [['V4', 'V4'], ['V5', 'V5']]) {
    const f = fixture(t, stage);
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews[name].path), 'utf8'));
    for (const kind of ['representative-sample', 'design-items']) {
      review.scope.kind = kind; f.work.visual.reviews[name] = write(f.repo, `${name}-${kind}.json`, review);
      assert.throws(() => validateFlutterDesign(f.repo, f.work, stage, f.doc), /完整对象确认/);
    }
  }
});

test('单项替换决定不能关闭其他设计项或越过其条件和属性范围', (t) => {
  const f = fixture(t, 'V3');
  const requirement = f.plan.implementations[0].requirements.shape;
  requirement.basis = 'approved-change';
  requirement.approvalRef = write(f.repo, 'avatar-only.json', { schemaVersion: '1.0', workItemId: f.work.workItemId, objectId: 'home', candidateId: 'approved-a',
    stage: 'V3', purpose: 'design-change', decision: 'APPROVED', userMessageRef: 'test-only://replace-avatar', referenceTarget: f.doc.referenceTarget,
    scope: { kind: 'design-items', designItemIds: ['avatar'], conditionIds: ['default-phone'], properties: ['shape'] } });
  savePlan(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /设计变更设计项.*有效且唯一|超出设计项范围/);
});

test('局部替换授权不能用字符串子串、重复项或未知 ID 冒充范围', (t) => {
  const f = fixture(t, 'V3'); const requirement = f.plan.implementations[0].requirements.shape;
  requirement.basis = 'approved-change';
  const review = { schemaVersion: '1.0', workItemId: f.work.workItemId, objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId,
    stage: 'V3', purpose: 'design-change', decision: 'APPROVED', userMessageRef: 'test-only://shape', referenceTarget: f.doc.referenceTarget,
    scope: { kind: 'design-items', designItemIds: ['heading'], conditionIds: ['default-phone'], properties: ['shape'] } };
  for (const [field, value] of [['designItemIds', 'avatar-heading-other'], ['conditionIds', 'default-phone-extra'], ['properties', 'shape'], ['designItemIds', ['heading', 'heading']], ['designItemIds', ['unknown']]]) {
    const bad = structuredClone(review); bad.scope[field] = value;
    requirement.approvalRef = write(f.repo, 'malformed-scope.json', bad); savePlan(f);
    assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /有效且唯一的 ID 数组/);
  }
  requirement.approvalRef = write(f.repo, 'valid-local-scope.json', review); rebind(f);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc));
});

test('usability 仍需当前设计属性、完整组合对照和人工确认', (t) => {
  const f = fixture(t); f.doc.visualValidationMode = 'usability';
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc));
  const ref = f.doc.comparisonRef; delete f.doc.comparisonRef;
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /当前组合对照/);
  f.doc.comparisonRef = ref;
  const report = f.reports[0].report; report.observations = report.observations.filter((item) => item.property !== 'typography');
  f.doc.implementationEvidenceRefs[0] = write(f.repo, 'no-font.json', report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /typography.*还原依据/);
});

test('复用组件须匹配当前尺寸与结构，只有换色不能通过', (t) => {
  const f = fixture(t, 'V4');
  f.reports[0].report.observations.find((item) => item.property === 'size').value = { width: 80, height: 24 };
  f.doc.implementationEvidenceRefs[0] = write(f.repo, 'old-widget.json', f.reports[0].report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /size.*偏离/);
});

test('合法全原生页面与当前组件复用可通过，源码改变使证据失效', (t) => {
  const f = fixture(t, 'V4');
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc));
  const source = f.reports[0].report.sourceRefs[0]; writeFileSync(join(f.repo, source.path), 'changed');
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /当前组件源码.*不一致/);
});

test('表达式或动态布局可用真实形状的测量输出，无需为验收添加源码常量', (t) => {
  const f = fixture(t, 'V4'); const report = f.reports[0].report;
  const raw = JSON.parse(readFileSync(join(f.repo, report.executionRef.path), 'utf8'));
  report.method = 'layout-test'; raw.method = 'layout-test';
  report.sourceRefs[0] = write(f.repo, report.sourceRefs[0].path, '// 合成动态组件，属性由测试观测而非源码字面量提供\nclass Heading {}');
  raw.sourceRefs = report.sourceRefs;
  for (const observation of raw.observations) delete observation.bindings;
  const capture = { schemaVersion: 'command-capture-v1', command: 'fvm dart run tool/measure_design.dart', exitCode: 0, stdout: JSON.stringify(raw.observations), stderr: '' };
  raw.commandCaptureRef = write(f.repo, 'measurement-command.json', capture);
  report.executionRef = write(f.repo, 'measurement-observations.json', raw);
  f.doc.implementationEvidenceRefs[0] = write(f.repo, 'measured-report.json', report);
  f.asset.assets[0].implementationEvidenceRef = f.doc.implementationEvidenceRefs[0]; f.asset.assets[0].componentEvidenceRef = f.doc.implementationEvidenceRefs[0].path;
  f.work.assetReviewRef = write(f.repo, 'measured-assets.json', f.asset);
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V4.path), 'utf8'));
  review.assetReviewRef = f.work.assetReviewRef; f.work.visual.reviews.V4 = write(f.repo, 'measured-assets-review.json', review);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc));
  capture.stdout = 'PASS'; raw.commandCaptureRef = write(f.repo, 'bad-measurement-command.json', capture);
  report.executionRef = write(f.repo, 'bad-measurement.json', raw); f.doc.implementationEvidenceRefs[0] = write(f.repo, 'bad-measured-report.json', report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /stdout 必须包含结构化观测/);
});

test('合法共享图片覆盖多个消费者，导入来源、真实尺寸与消费者均需一致', (t) => {
  const f = fixture(t, 'V4'); const implementation = f.plan.implementations[0];
  implementation.kind = 'shared-image'; implementation.consumers.push({ ...implementation.consumers[0], id: 'heading-in-dialog', symbol: 'DialogHeading' });
  implementation.production = { identity: 'shared', consumerIds: implementation.consumers.map((item) => item.id),
    sourceRegion: f.plan.elements[0].region, outputPath: 'shared.png', outputSize: { width: 2, height: 2 }, displaySize: { width: 1, height: 1 }, density: 2,
    background: 'transparent', transparentInsets: { top: 0, right: 0, bottom: 0, left: 0 }, edgePolicy: '保留透明边缘' };
  const bytes = encodePngRgba(2, 2, Buffer.alloc(16)); writeFileSync(join(f.repo, 'shared.png'), bytes);
  const assetRef = { path: 'shared.png', sha256: createHash('sha256').update(bytes).digest('hex') };
  const report = f.reports[0].report;
  report.imported = { assetRef, provenanceRef: write(f.repo, 'provenance.json', { source: 'hand-authored', license: 'test-only' }),
    importEvidenceRef: write(f.repo, 'import-output.txt', '合成正式资源加载输出'), production: structuredClone(implementation.production), consumerIds: implementation.production.consumerIds };
  f.asset.assets[0].assetType = 'image'; f.asset.assets[0].output = 'shared.png';
  rebind(f);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc));
  delete report.imported.provenanceRef; rebind(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /素材实际来源/);
});

test('V5 对照必须绑定当前视口、语言、文字倍率和适配条件', (t) => {
  const f = fixture(t); const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  comparison.cases[0].conditions.textScale = 1.5;
  f.doc.comparisonRef = write(f.repo, 'wrong-scale.json', comparison);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /文字倍率或适配条件/);
});

test('V4 正式资源确认冻结实际资源记录，换新记录不能沿用旧批准', (t) => {
  const f = fixture(t, 'V4');
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc));
  f.work.assetReviewRef = write(f.repo, 'unreviewed-assets.json', { ...f.asset, userMessageRef: 'test-only://changed' });
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /V4 确认未绑定当前正式资源验收身份/);
});

test('V5 拒绝目标冒充运行图及文本伪造截图', (t) => {
  const f = fixture(t); const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  comparison.cases[0].runtimeRef = f.doc.referenceTarget;
  f.doc.comparisonRef = write(f.repo, 'target-as-runtime.json', comparison);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /目标图冒充运行截图/);
  const item = comparison.cases[0]; item.runtimeRef = write(f.repo, 'fake-runtime.txt', 'runtime PASS');
  const capture = JSON.parse(readFileSync(join(f.repo, item.captureRef.path), 'utf8'));
  capture.runtimeRef = item.runtimeRef; item.captureRef = write(f.repo, 'fake-capture.json', capture);
  f.doc.comparisonRef = write(f.repo, 'text-as-runtime.json', comparison);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /运行截图.*解码失败/);
});

test('独立采集且来源完整的运行截图可与目标同字节', (t) => {
  const bytes = encodePngRgba(390, 844, Buffer.alloc(390 * 844 * 4));
  const f = fixture(t, 'V5', bytes);
  const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  assert.equal(comparison.cases[0].runtimeRef.sha256, f.doc.referenceTarget.sha256);
  assert.notEqual(comparison.cases[0].runtimeRef.path, f.doc.referenceTarget.path);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc));
});

test('Windows 大小写路径别名不能重绑失效证据或冒充独立运行图', { skip: process.platform !== 'win32' }, (t) => {
  const f = fixture(t, 'V4'); const ref = f.doc.implementationEvidenceRefs[0];
  f.work.invalidatedRefs = [{ path: ref.path }];
  f.doc.implementationEvidenceRefs[0] = { ...ref, path: ref.path.toUpperCase() };
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /RETURN 已作废/);
  const g = fixture(t); const comparison = JSON.parse(readFileSync(join(g.repo, g.doc.comparisonRef.path), 'utf8'));
  comparison.cases[0].runtimeRef = { ...g.doc.referenceTarget, path: g.doc.referenceTarget.path.toUpperCase() };
  g.doc.comparisonRef = write(g.repo, 'case-alias.json', comparison);
  assert.throws(() => validateFlutterDesign(g.repo, g.work, 'V5', g.doc), /目标图冒充运行截图/);
});

test('额外已确认状态目标必须进入拆解和完整组合覆盖', (t) => {
  const f = fixture(t, 'V3'); const referenceTarget = write(f.repo, 'extra.txt', '另一已确认目标');
  const reviewRef = write(f.repo, 'extra-target-review.json', { schemaVersion: '1.0', workItemId: f.work.workItemId, objectId: f.work.visual.objectId,
    candidateId: f.work.visual.candidateId, stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: 'test-only://extra', referenceTarget,
    scope: { kind: 'full-object', designItemIds: [], conditionIds: [] } });
  f.doc.additionalTargets = [{ referenceTarget, reviewRef }];
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /覆盖遗漏已声明目标/);
  const data = attachFlutterDesignFixture(f.repo, f.work, { ...f.doc, designReconstructionRef: undefined });
  // 新计划必须由真实调用方绑定；测试仅重新冻结合成材料及对应确认。
  Object.assign(f.plan, data.plan); rebind(f);
  for (const name of ['V3Decomposition', 'V3Layout']) {
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews[name].path), 'utf8'));
    review.scope.designItemIds = f.plan.elements.map((item) => item.id); review.scope.conditionIds = f.plan.conditions.map((item) => item.id);
    f.work.visual.reviews[name] = write(f.repo, `${name}-extra.json`, review);
  }
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc));
});

test('原生、图片生产模板符合 Schema，空占位观测不能成为通过证据', () => {
  const schema = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/references/design-reconstruction.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  const plan = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/templates/design-reconstruction.json', import.meta.url), 'utf8'));
  assert.equal(validate(plan), true, JSON.stringify(validate.errors));
  plan.implementations[0].kind = 'image';
  assert.equal(validate(plan), false);
  plan.implementations[0].production = JSON.parse(readFileSync(new URL('../../skills/flutter-domain-contracts/templates/image-production.json', import.meta.url), 'utf8'));
  assert.equal(validate(plan), true, JSON.stringify(validate.errors));
});
