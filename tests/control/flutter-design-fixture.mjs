import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { encodePngRgba } from '../../skills/app-asset-workflow/scripts/png-raster.mjs';

/** 写入明确标记的合成协议材料，绝不代表真实应用或用户视觉验收。 */
export function writeDesignFixture(repo, path, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
  mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 构造可从实际源字面量复算的原始观测，避免期望值加任意文本即可通过。 */
export function writeRawDesignFixture(repo, work, doc, plan, report) {
  const implementation = plan.implementations.find((item) => item.id === report.implementationId);
  const source = implementation.consumers.map((item) => `class ${item.symbol} {}`).join('\n') + '\n' + Object.entries(implementation.requirements).map(([property, requirement]) => `const ${property} = ${JSON.stringify(requirement.value)};`).join('\n');
  report.sourceRefs = [...new Set(implementation.consumers.map((item) => item.sourcePath))].map((path) => writeDesignFixture(repo, path, source));
  const identity = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId,
    ...(work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {}) };
  const raw = { ...identity, format: 'flutter-design-observations-v1', implementationId: implementation.id,
    designReconstructionRef: doc.designReconstructionRef, consumers: implementation.consumers, sourceRefs: report.sourceRefs, method: report.method,
    observations: report.observations.map(({ value, ...item }) => {
      const prefix = `const ${item.property} = `;
      const start = source.indexOf(prefix) + prefix.length;
      return { ...item, observed: value, bindings: [{ pointer: '', sourcePath: report.sourceRefs[0].path, start, end: start + JSON.stringify(value).length, encoding: 'json' }] };
    }),
  };
  report.executionRef = writeDesignFixture(repo, `design-fixture/${work.workItemId}/${implementation.id}-observations.json`, raw);
}

/** 构造可核验的全原生合同，用于阶段门、复用和负向变异测试。 */
export function attachFlutterDesignFixture(repo, work, doc) {
  const base = `design-fixture/${work.workItemId}`;
  const host = work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {};
  const identity = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId, ...host };
  const requirements = Object.fromEntries(Object.entries({
    structure: { widget: 'Text', layout: 'column', children: [] }, size: { width: 240, height: 48 },
    spacing: { top: 8, right: 8, bottom: 8, left: 8 }, typography: { family: 'Noto Sans', size: 18, weight: 500, lineHeight: 1.4, letterSpacing: 0 },
    color: { background: '#ffffff', foreground: '#222222' }, border: { width: 0, color: '#00000000' },
    shape: { kind: 'rectangle', radius: 0 }, states: { ids: ['default'], rules: { default: '显示当前标题' } },
  }).map(([key, value]) => [key, { value, basis: 'measured', reason: '合成测试目标的固定规格' }]));
  const plan = { ...identity, referenceTarget: doc.referenceTarget,
    conditions: [{ id: 'default-phone', stateId: 'default', viewport: { width: 390, height: 844 }, language: 'zh-CN', textScale: 1,
      adaptation: { platform: 'android', orientation: 'portrait', safeArea: { top: 24, right: 0, bottom: 24, left: 0 }, keyboard: 'hidden' } }],
    elements: [{ id: 'heading', label: '源图标题', targetRef: doc.referenceTarget, region: { x: 16, y: 32, width: 240, height: 48, unit: 'px' }, conditionIds: ['default-phone'], parentId: null, layoutReference: 'viewport', implementationId: 'native-heading' }],
    implementations: [{ id: 'native-heading', kind: 'native', designItemIds: ['heading'], consumers: [{ id: 'heading-widget', sourcePath: `${base}/heading.dart`, symbol: 'Heading' }], designReason: '标题为可访问动态文字，原生组件按当前设计设置几何和字体', requirements }],
  };
  for (const [index, extra] of (doc.additionalTargets ?? []).entries()) {
    const condition = { ...structuredClone(plan.conditions[0]), id: `extra-${index}`, targetRef: extra.referenceTarget, viewport: { width: 844, height: 390 } };
    condition.adaptation.orientation = 'landscape'; plan.conditions.push(condition);
    const element = { ...structuredClone(plan.elements[0]), id: `heading-extra-${index}`, targetRef: extra.referenceTarget, conditionIds: [condition.id] };
    plan.elements.push(element); plan.implementations[0].designItemIds.push(element.id);
  }
  // 原始 V3 复用计划保持身份；仅在测试确有继承确认时沿用来源冻结计划。
  const inherited = work.visual.reuse?.inheritedReviews?.includes('V3Decomposition');
  if (inherited) {
    const review = JSON.parse(readFileSync(join(repo, work.visual.reviews.V3Decomposition.path), 'utf8'));
    if (review.designReconstructionRef) {
      Object.assign(plan, JSON.parse(readFileSync(join(repo, review.designReconstructionRef.path), 'utf8')));
      doc.designReconstructionRef = review.designReconstructionRef;
    }
  }
  doc.designReconstructionRef ??= writeDesignFixture(repo, `${base}/plan.json`, plan);
  const scope = { kind: 'full-object', designItemIds: plan.elements.map((item) => item.id), conditionIds: plan.conditions.map((item) => item.id) };
  /** 在合成测试中补全真实形状的确认，保留已有测试的原图与质量信息。 */
  function review(name, stage, purpose, extra = {}) {
    if (work.visual.reuse?.inheritedReviews?.includes(name)) return;
    const oldRef = work.visual.reviews[name];
    const old = oldRef && existsSync(join(repo, oldRef.path)) ? JSON.parse(readFileSync(join(repo, oldRef.path), 'utf8')) : {};
    work.visual.reviews[name] = writeDesignFixture(repo, oldRef?.path ?? `${base}/${name}.json`, {
      ...identity, stage, purpose, decision: 'APPROVED', userMessageRef: 'test-only://synthetic-confirmation', ...old,
      scope, referenceTarget: doc.referenceTarget, designReconstructionRef: doc.designReconstructionRef, ...extra,
    });
  }
  review('V3Decomposition', 'V3', 'decomposition');
  review('V3Layout', 'V3', 'layout', { layoutSpecRef: doc.layoutSpecRef, decompositionReviewRef: work.visual.reviews.V3Decomposition });
  if (doc.visualStage === 'V3') return { plan, review };
  const reports = plan.implementations.map((implementation) => {
    const report = { ...identity, implementationId: implementation.id, designReconstructionRef: doc.designReconstructionRef,
      sourceRefs: [...new Set(implementation.consumers.map((item) => item.sourcePath))].map((path) => writeDesignFixture(repo, path, '// 合成协议夹具\nclass Heading {}\n')),
      method: 'source-inspection',
      observations: implementation.designItemIds.flatMap((id) => plan.elements.find((item) => item.id === id).conditionIds.flatMap((conditionId) => Object.entries(implementation.requirements).map(([property, requirement]) => ({ designItemId: id, conditionId, property, value: requirement.value })))),
    };
    writeRawDesignFixture(repo, work, doc, plan, report);
    return { report, ref: writeDesignFixture(repo, `${base}/${implementation.id}-report.json`, report) };
  });
  doc.implementationEvidenceRefs = reports.map((item) => item.ref);
  review('V4', 'V4', 'imported-assets');
  const oldAsset = work.assetReviewRef && existsSync(join(repo, work.assetReviewRef.path)) ? JSON.parse(readFileSync(join(repo, work.assetReviewRef.path), 'utf8')) : {};
  const asset = { schemaVersion: '1.0', workItemId: work.workItemId, stack: 'flutter', visualStage: 'V4', candidateId: work.visual.candidateId,
    technicalStatus: 'PASS', humanStatus: 'PASS', ...oldAsset,
    userMessageRef: JSON.parse(readFileSync(join(repo, work.visual.reviews.V4.path), 'utf8')).userMessageRef,
    assets: plan.implementations.map((item, index) => ({ assetId: item.id, assetType: 'native-component', output: item.consumers[0].sourcePath,
      componentEvidenceRef: reports[index].ref.path, implementationEvidenceRef: reports[index].ref, designItemIds: item.designItemIds, consumerIds: item.consumers.map((consumer) => consumer.id) })),
  };
  work.assetReviewRef = writeDesignFixture(repo, work.assetReviewRef?.path ?? `${base}/assets.json`, asset);
  review('V4', 'V4', 'imported-assets', { assetReviewRef: work.assetReviewRef });
  if (doc.visualStage === 'V5') {
    const comparison = { ...identity, designReconstructionRef: doc.designReconstructionRef, implementationEvidenceRefs: doc.implementationEvidenceRefs,
      cases: plan.conditions.map((conditions) => {
        const runtimeRef = writeDesignFixture(repo, `${base}/runtime-${conditions.id}.png`, encodePngRgba(conditions.viewport.width, conditions.viewport.height, Buffer.alloc(conditions.viewport.width * conditions.viewport.height * 4)));
        const captureRef = writeDesignFixture(repo, `${base}/capture-${conditions.id}.json`, { ...identity,
          format: 'flutter-runtime-capture-v1', runtimeRef, conditions, pixelRatio: 1, designReconstructionRef: doc.designReconstructionRef,
          implementationEvidenceRefs: doc.implementationEvidenceRefs, sourceRefs: reports.flatMap(({ report }) => report.sourceRefs),
          captureMethod: 'test-only-synthetic', captureOutputRef: writeDesignFixture(repo, `${base}/capture-output.txt`, '合成采集输出，非真实 Flutter 截图'),
        });
        return { conditionId: conditions.id, conditions, targetRef: conditions.targetRef ?? plan.referenceTarget, runtimeRef, captureRef,
          designItemIds: plan.elements.filter((item) => item.conditionIds.includes(conditions.id)).map((item) => item.id) };
      }),
    };
    doc.comparisonRef = writeDesignFixture(repo, `${base}/comparison.json`, comparison);
    review('V5', 'V5', 'runtime-acceptance', { comparisonRef: doc.comparisonRef });
  }
  return { plan, reports, asset, review };
}
