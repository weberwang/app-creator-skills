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
import { attachFigmaAppFixture } from './figma-app-fixture.mjs';
import { formalIntegrationFixture } from './v4-formal-integration-fixture.mjs';

/** 所有用户消息与截图均为明确的合成材料，只验证合同规则。 */
function fixture(t, stage = 'V5', targetBytes = '合成源图') {
  const repo = mkdtempSync(join(tmpdir(), 'flutter-design-contract-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const work = { workItemId: 'design-work', projectId: 'test-project', stack: 'flutter', workItemType: 'PAGE', visual: { objectId: 'home', candidateId: 'approved-a', reviews: {} } };
  const doc = { referenceTarget: write(repo, 'target.txt', targetBytes), visualStage: stage, layoutSpecRef: write(repo, 'layout.yaml', '合成布局') };
  work.visual.reviews.V2 = write(repo, 'figma-target-review.json', { schemaVersion: '1.0', workItemId: work.workItemId,
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'target', decision: 'APPROVED',
    userMessageRef: 'test-only://selected-target', referenceTarget: doc.referenceTarget, scope: { kind: 'full-object', designItemIds: [], conditionIds: [] } });
  const data = attachFlutterDesignFixture(repo, work, doc);
  attachFigmaAppFixture(repo, work, doc);
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
    const trial = JSON.parse(readFileSync(join(f.repo, f.asset.textRestorationRef.path), 'utf8'));
    trial.designReconstructionRef = f.doc.designReconstructionRef;
    for (const [index, asset] of f.asset.assets.entries()) {
      const implementation = f.plan.implementations[index];
      asset.implementationEvidenceRef = f.doc.implementationEvidenceRefs[index];
      asset.componentEvidenceRef = asset.implementationEvidenceRef.path;
      asset.designItemIds = implementation.designItemIds; asset.consumerIds = implementation.consumers.map((item) => item.id);
    }
    trial.formalIntegration = formalIntegrationFixture(f.repo, f.reports[0].report.sourceRefs[0].path, f.asset.assets);
    f.asset.textRestorationRef = write(f.repo, 'v4-text-rebound.json', trial);
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

test('Flutter 原生合同复用已选 Figma 的交接，不强制另画 V3 两图', (t) => {
  const f = fixture(t, 'V4');
  delete f.work.visual.reviews.V3Decomposition;
  delete f.work.visual.reviews.V3Layout;
  // 公共 Figma 合同单独验证所选稿及交接；本例仅检查原生领域不要求重复人工节点。
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc));
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V4.path), 'utf8'));
  review.scope.kind = 'representative-sample';
  f.work.visual.reviews.V4 = write(f.repo, 'sample-not-complete.json', review);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /完整对象确认/);
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
  const f = fixture(t, 'V3', encodePngRgba(390, 844, Buffer.alloc(390 * 844 * 4))); f.work.projectId = 'test-project';
  Object.assign(f.doc, { schemaVersion: '1.0', workItemId: f.work.workItemId, projectId: f.work.projectId, stack: 'flutter', workItemType: 'PAGE',
    objectId: f.work.visual.objectId, candidateId: f.work.visual.candidateId, visualStageModel: 'function-first-v1', visualStage: 'V2' });
  const targetReview = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8'));
  for (const kind of ['representative-sample', 'design-items', 'full-object']) {
    f.work.visual.reviews.V2 = write(f.repo, `target-${kind}.json`, { ...targetReview, scope: { kind, designItemIds: [], conditionIds: [] } });
    // 合成样例更新选稿范围时，重建来源也必须绑定该次明确授权。
    const snapshot = JSON.parse(readFileSync(join(f.repo, f.doc.figmaDesignRef.path), 'utf8'));
    snapshot.reconstruction.authorizationRef = f.work.visual.reviews.V2;
    f.doc.figmaDesignRef = write(f.repo, `target-${kind}-snapshot.json`, snapshot);
    f.work.visual.domainEvidenceRef = write(f.repo, 'v2-domain.json', f.doc);
    if (kind === 'full-object') assert.equal(validateSingleDomainTarget(f.repo, f.work, 'V2'), true);
    else assert.throws(() => validateSingleDomainTarget(f.repo, f.work, 'V2'), /V2.*完整目标范围|V2 缺少当前完整目标/);
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

test('文字目标与实际值必须包含字体颜色和透明度', (t) => {
  const missing = [
    (appearance) => { appearance.normalized.textFill = null; },
    (appearance) => { appearance.normalized.textOpacity = null; },
    (appearance) => { delete appearance.normalized.textFill[0].color.a; },
  ];
  for (const mutate of missing) {
    const f = fixture(t, 'V3');
    mutate(f.plan.implementations[0].requirements.appearance.value); savePlan(f);
    assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /Schema|文字颜色|文字透明度/);
  }
  for (const mutate of [
    (appearance) => { appearance.normalized.textFill[0].color.r = 0.8; },
    (appearance) => { appearance.normalized.textFill[0].color.a = 0.5; },
    (appearance) => { appearance.normalized.textOpacity.value = 0.5; },
    (appearance) => { appearance.normalized.textFill = null; },
  ]) {
    const f = fixture(t, 'V4');
    const report = f.reports[0].report;
    mutate(report.observations.find((item) => item.property === 'appearance').value);
    f.doc.implementationEvidenceRefs[0] = write(f.repo, 'different-text-color.json', report);
    assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /appearance.*偏离/);
  }
});

test('Flutter V4 试装不得漏字或隐藏文字', (t) => {
  const f = fixture(t, 'V4');
  const missing = { ...f.asset };
  delete missing.textRestorationRef;
  const saved = f.work.assetReviewRef;
  f.work.assetReviewRef = write(f.repo, 'v4-asset-no-text.json', missing);
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V4.path), 'utf8'));
  review.assetReviewRef = f.work.assetReviewRef;
  f.work.visual.reviews.V4 = write(f.repo, 'v4-review-no-text.json', review);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /textRestorationRef.*缺少/);
  f.work.assetReviewRef = saved;
  const report = JSON.parse(readFileSync(join(f.repo, f.asset.textRestorationRef.path), 'utf8'));
  /** 更新资源评审引用，确保每个反例都经正式 V4 入口。 */
  function check() {
    f.asset.textRestorationRef = write(f.repo, 'v4-text-change.json', report);
    f.work.assetReviewRef = write(f.repo, 'v4-asset-change.json', f.asset);
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V4.path), 'utf8'));
    review.assetReviewRef = f.work.assetReviewRef;
    f.work.visual.reviews.V4 = write(f.repo, 'v4-review-change.json', review);
    return validateFlutterDesign(f.repo, f.work, 'V4', f.doc);
  }
  assert.doesNotThrow(check);
  const item = report.entries[0];
  item.actualContent = '';
  assert.throws(check, /actualContent.*为空/);
  item.actualContent = '合成文字';
  item.visible = false;
  assert.throws(check, /visible.*true/);
  item.visible = true;
  report.entries.shift();
  assert.throws(check, /文字节点和状态/);
});

test('Flutter V5 文字必须读取当前运行的组件样式', (t) => {
  const f = fixture(t);
  const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  const item = comparison.cases[0];
  const capture = JSON.parse(readFileSync(join(f.repo, item.captureRef.path), 'utf8'));
  const output = JSON.parse(readFileSync(join(f.repo, capture.captureOutputRef.path), 'utf8'));
  /** 固定当前采集、组合和既有确认，独立验证每个实际读数。 */
  function check() {
    capture.captureOutputRef = write(f.repo, 'text-current.json', output);
    item.captureRef = write(f.repo, 'capture-current.json', capture);
    f.doc.comparisonRef = write(f.repo, 'comparison-current.json', comparison);
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V5.path), 'utf8'));
    review.comparisonRef = f.doc.comparisonRef;
    f.work.visual.reviews.V5 = write(f.repo, 'v5-current.json', review);
    return validateFlutterDesign(f.repo, f.work, 'V5', f.doc);
  }
  assert.doesNotThrow(check);
  const entry = output.entries.find((item) => item.designItemId === 'heading');
  entry.actualContent = '';
  assert.throws(check, /heading.*actualContent.*为空/);
  entry.actualContent = '合成文字';
  entry.visible = false;
  assert.throws(check, /heading.*visible/);
  entry.visible = true;
  const originalOpacity = entry.values.textOpacity;
  entry.values.textOpacity = { ...originalOpacity, value: 0 };
  assert.throws(check, /heading.*整体文字透明度为 0/);
  entry.values.textOpacity = originalOpacity;
  delete entry.propertySources.visible;
  assert.throws(check, /heading.*visible.*回读来源/);
  entry.propertySources.visible = { componentType: 'RenderParagraph', propertyPath: 'visible' };
  entry.values.fontFamily = 'prototype-font';
  assert.throws(check, /heading\/default-phone\/fontFamily.*不一致/);
  entry.values.fontFamily = f.plan.implementations[0].requirements.appearance.value.normalized.typography.family;
  delete entry.propertySources.fontSize;
  assert.throws(check, /heading\/default-phone\/fontSize.*回读/);
  entry.propertySources.fontSize = { componentType: 'RenderParagraph', propertyPath: 'text.style.fontSize' };
  output.runId = 'old-run';
  assert.throws(check, /未绑定当前计划、截图及运行条件/);
  output.runId = capture.runId;
  output.designReconstructionRef = { path: 'old-plan.json', sha256: '0'.repeat(64) };
  assert.throws(check, /未绑定当前计划、截图及运行条件/);
});

test('Flutter 同状态的多个文字设计项不能共用一个组件读数', (t) => {
  const f = fixture(t);
  const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  const item = comparison.cases[0];
  const capture = JSON.parse(readFileSync(join(f.repo, item.captureRef.path), 'utf8'));
  const output = JSON.parse(readFileSync(join(f.repo, capture.captureOutputRef.path), 'utf8'));
  assert.equal(output.entries.length, 2);
  assert.deepEqual(output.entries[0].values, output.entries[1].values);
  output.entries[1].runtimeNodeId = output.entries[0].runtimeNodeId;
  capture.captureOutputRef = write(f.repo, 'duplicate-component-output.json', output);
  item.captureRef = write(f.repo, 'duplicate-component-capture.json', capture);
  f.doc.comparisonRef = write(f.repo, 'duplicate-component-comparison.json', comparison);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /文字组件.*已被其他设计节点使用/);
});

test('Flutter V3 缺少字体规格或使用估计值时保留未完成', (t) => {
  const missing = fixture(t, 'V3');
  missing.plan.implementations[0].requirements.appearance.value.normalized.typography.family = '';
  savePlan(missing);
  assert.throws(() => validateFlutterDesign(missing.repo, missing.work, 'V3', missing.doc), /Schema|fontFamily/);
  const estimated = fixture(t, 'V3');
  estimated.plan.implementations[0].requirements.typography.basis = 'estimated';
  savePlan(estimated);
  assert.throws(() => validateFlutterDesign(estimated.repo, estimated.work, 'V3', estimated.doc), /typography.*估计值/);
});

test('Flutter V5 确认目标无文字时跳过文字组件回读', (t) => {
  const f = fixture(t);
  for (const implementation of f.plan.implementations) {
    const requirements = implementation.requirements;
    const appearance = requirements.appearance.value;
    appearance.raw.nodeType = 'FRAME'; appearance.raw.font = null; appearance.raw.textVisual = null;
    appearance.normalized.typography = null; appearance.normalized.textFill = null; appearance.normalized.textOpacity = null;
    requirements.typography.value = { applicable: false, reason: '当前目标没有文字' };
    const report = f.reports.find((entry) => entry.report.implementationId === implementation.id).report;
    for (const observation of report.observations) observation.value = requirements[observation.property].value;
  }
  rebind(f);
  const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  comparison.designReconstructionRef = f.doc.designReconstructionRef;
  comparison.implementationEvidenceRefs = f.doc.implementationEvidenceRefs;
  const item = comparison.cases[0];
  const capture = JSON.parse(readFileSync(join(f.repo, item.captureRef.path), 'utf8'));
  capture.designReconstructionRef = f.doc.designReconstructionRef;
  capture.implementationEvidenceRefs = f.doc.implementationEvidenceRefs;
  capture.sourceRefs = f.reports.flatMap(({ report }) => report.sourceRefs);
  capture.captureOutputRef = write(f.repo, 'no-text-capture.log', '无文字的运行采集');
  delete capture.runId;
  item.captureRef = write(f.repo, 'no-text-capture.json', capture);
  f.doc.comparisonRef = write(f.repo, 'no-text-comparison.json', comparison);
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V5.path), 'utf8'));
  review.comparisonRef = f.doc.comparisonRef;
  f.work.visual.reviews.V5 = write(f.repo, 'no-text-v5.json', review);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc));
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
  const trial = JSON.parse(readFileSync(join(f.repo, f.asset.textRestorationRef.path), 'utf8'));
  trial.formalIntegration = formalIntegrationFixture(f.repo, report.sourceRefs[0].path, f.asset.assets);
  f.asset.textRestorationRef = write(f.repo, 'measured-v4-text.json', trial);
  f.work.assetReviewRef = write(f.repo, 'measured-assets.json', f.asset);
  const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V4.path), 'utf8'));
  review.assetReviewRef = f.work.assetReviewRef; f.work.visual.reviews.V4 = write(f.repo, 'measured-assets-review.json', review);
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc));
  capture.command = '<执行某项检查>'; raw.commandCaptureRef = write(f.repo, 'placeholder-measurement-command.json', capture);
  report.executionRef = write(f.repo, 'placeholder-measurement.json', raw); f.doc.implementationEvidenceRefs[0] = write(f.repo, 'placeholder-measured-report.json', report);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V4', f.doc), /实际可复跑命令|命令占位/);
  capture.command = 'fvm dart run tool/measure_design.dart';
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

test('Flutter V3 和 V5 按消费者检查九宫格真实倍率和最小显示框', (t) => {
  const f = fixture(t, 'V5'); const implementation = f.plan.implementations[0];
  implementation.kind = 'image';
  implementation.production = { identity: 'independent', consumerIds: implementation.consumers.map((item) => item.id),
    sourceRegion: f.plan.elements[0].region, outputPath: 'panel.png', outputSize: { width: 16, height: 12 }, displaySize: { width: 20, height: 16 }, density: 1,
    background: 'transparent', transparentInsets: { top: 0, right: 0, bottom: 0, left: 0 }, edgePolicy: '保留透明边缘',
    slice: { left: 4, right: 5, top: 3, bottom: 4 }, nineSlice: { minimumSize: { width: 20, height: 16 } } };
  const bytes = encodePngRgba(16, 12, Buffer.alloc(16 * 12 * 4)); writeFileSync(join(f.repo, 'panel.png'), bytes);
  const assetRef = { path: 'panel.png', sha256: createHash('sha256').update(bytes).digest('hex') };
  f.reports[0].report.imported = { assetRef, provenanceRef: write(f.repo, 'provenance.json', { source: 'hand-authored' }),
    importEvidenceRef: write(f.repo, 'load.txt', '合成资源加载输出'), production: structuredClone(implementation.production), consumerIds: implementation.production.consumerIds };
  f.asset.assets[0].assetType = 'image'; f.asset.assets[0].output = 'panel.png';
  rebind(f);
  const comparison = JSON.parse(readFileSync(join(f.repo, f.doc.comparisonRef.path), 'utf8'));
  comparison.designReconstructionRef = f.doc.designReconstructionRef;
  comparison.implementationEvidenceRefs = f.doc.implementationEvidenceRefs;
  const item = comparison.cases[0]; const capture = JSON.parse(readFileSync(join(f.repo, item.captureRef.path), 'utf8'));
  capture.designReconstructionRef = f.doc.designReconstructionRef; capture.implementationEvidenceRefs = f.doc.implementationEvidenceRefs;
  capture.sourceRefs = f.reports.flatMap(({ report }) => report.sourceRefs);
  const textOutput = JSON.parse(readFileSync(join(f.repo, capture.captureOutputRef.path), 'utf8'));
  textOutput.designReconstructionRef = f.doc.designReconstructionRef;
  capture.captureOutputRef = write(f.repo, 'slice-text-output.json', textOutput);
  const sample = { nodeId: 'heading', conditionId: item.conditionId, runtimeNodeId: 'Heading', sourcePath: 'panel.png', sourceSize: { width: 16, height: 12 },
    border: implementation.production.slice, scale: 1, transformScaleX: 1, transformScaleY: 1, displaySize: { width: 20, height: 16 } };
  /** 每次变异均重新绑定当前采集证据和人工确认引用。 */
  function bindCapture() {
    item.captureRef = write(f.repo, 'slice-capture.json', capture);
    f.doc.comparisonRef = write(f.repo, 'slice-comparison.json', comparison);
    const review = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V5.path), 'utf8'));
    review.comparisonRef = f.doc.comparisonRef; f.work.visual.reviews.V5 = write(f.repo, 'slice-v5.json', review);
  }
  capture.nineSliceMeasurements = [sample]; bindCapture();
  assert.doesNotThrow(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc));
  sample.scale = 1.000000001; bindCapture();
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /倍率.*严格/);
  sample.scale = 1; sample.displaySize.width = 9; bindCapture();
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /中心/);
  sample.displaySize.width = 21; bindCapture();
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V5', f.doc), /最小显示框/);
  implementation.production.outputSize = { width: 24, height: 16 };
  writeFileSync(join(f.repo, 'panel.png'), encodePngRgba(24, 16, Buffer.alloc(24 * 16 * 4)));
  rebind(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /不得大于显示框/);
  implementation.production.outputSize = { width: 16, height: 12 };
  writeFileSync(join(f.repo, 'panel.png'), encodePngRgba(16, 12, Buffer.alloc(16 * 12 * 4)));
  implementation.production.density = 2; rebind(f);
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /密度必须严格为 1/);
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
  const textOutput = JSON.parse(readFileSync(join(f.repo, capture.captureOutputRef.path), 'utf8'));
  textOutput.runtimeRef = item.runtimeRef; capture.captureOutputRef = write(f.repo, 'fake-text-output.json', textOutput);
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

test('V2 明确覆盖的额外 Figma 状态无需逐图确认，但必须进入设计项覆盖', (t) => {
  const f = fixture(t, 'V3'); const referenceTarget = write(f.repo, 'extra.txt', '另一已确认目标');
  f.doc.additionalTargets = [{ referenceTarget }];
  attachFigmaAppFixture(f.repo, f.work, f.doc, { designOnly: true });
  const targetReview = JSON.parse(readFileSync(join(f.repo, f.work.visual.reviews.V2.path), 'utf8'));
  f.work.visual.reviews.V2 = write(f.repo, 'v2-missing-extra.json', { ...targetReview, approvedTargetRefs: [f.doc.referenceTarget] });
  assert.throws(() => validateFlutterDesign(f.repo, f.work, 'V3', f.doc), /额外 Figma 目标未列入 V2 授权范围/);
  f.work.visual.reviews.V2 = write(f.repo, 'v2-with-extra.json', targetReview);
  assert.equal(f.doc.additionalTargets[0].reviewRef, undefined);
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
