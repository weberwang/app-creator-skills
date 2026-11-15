import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { extractFigmaNodeStyle } from '../../skills/app-workflow-control/scripts/runtime/figma-app-contract.mjs';

/** 本地测试替身仅证明合同，不连接 Figma、不表示实际工具执行或人工验收。 */
export function writeFigmaFixture(repo, path, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
  mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 读取已存在合成记录，便于保留测试专门设置的状态与来源。 */
function read(repo, ref) {
  return ref?.path && existsSync(join(repo, ref.path)) ? JSON.parse(readFileSync(join(repo, ref.path), 'utf8')) : null;
}

/** 生成可编辑节点、实际绑定变量与原始结构导出的本地样例。 */
export function figmaSnapshotFixture(repo, work, { prefix, previewRef, candidateId = work.visual.candidateId, variant = 0, viewport = { width: 390, height: 844 }, stateId = 'default', briefRef, hardware, nativePlan, nativeLayout } = {}) {
  prefix ??= `figma-fixture/${work.workItemId}/${candidateId}-${variant}`;
  briefRef ??= writeFigmaFixture(repo, `${prefix}/brief.json`, { targetUsers: '合成测试用户', primaryTask: '完成当前已确认任务', context: '协议测试，不代表真实界面', intent: 'explore', realContent: ['真实标题样例'], hardConstraints: ['业务与无障碍'], explorationSpace: ['布局和排版'] });
  let nodes = [
    { id: '1:1', type: 'FRAME', name: '页面内容容器', designItemId: 'screen', parentId: null, x: 0, y: 0, ...viewport, layoutMode: variant ? 'HORIZONTAL' : 'VERTICAL',
      properties: { fill: variant ? '#eeffee' : '#ffffff', spacing: 16, radius: 12 }, bindings: [{ field: 'fill', variableId: 'color' }, { field: 'spacing', variableId: 'spacing' }, { field: 'radius', variableId: 'radius' }] },
    { id: '1:2', type: 'TEXT', name: '主要任务标题', parentId: '1:1', x: 16, y: variant ? 64 : 32, width: 240, height: 48,
      characters: '真实标题样例', designItemId: 'heading', font: { family: 'Noto Sans', platformFamily: 'Noto Sans', available: true, size: variant ? 24 : 18, weight: 500, lineHeight: 1.4, letterSpacing: 0 },
      properties: { insets: { top: 8, right: 8, bottom: 8, left: 8 }, colors: { background: '#ffffff', foreground: '#222222' }, border: { width: 0, color: '#00000000' }, shape: { kind: 'rectangle', radius: 0 } } },
  ];
  if (nativePlan) {
    const elements = nativePlan.elements.filter((item) => item.targetRef.path === previewRef.path && item.targetRef.sha256 === previewRef.sha256);
    const keys = new Map(elements.map((item, index) => [item.id, `1:${index + 2}`]));
    nodes = [nodes[0], ...elements.map((element) => {
      const requirements = nativePlan.implementations.find((item) => item.id === element.implementationId).requirements;
      const font = requirements.typography.value;
      const text = font.applicable !== false;
      return { id: keys.get(element.id), type: text ? 'TEXT' : 'FRAME', name: `设计元素 ${element.label}`, designItemId: element.id,
        parentId: keys.get(element.parentId) ?? '1:1', x: element.region.x, y: element.region.y, width: requirements.size.value.width, height: requirements.size.value.height,
        ...(text ? { characters: element.label, font: { family: font.family, platformFamily: font.family, available: true, ...font } } : { layoutMode: 'VERTICAL' }),
        properties: { insets: requirements.spacing.value, colors: requirements.color.value,
          border: requirements.border.value.applicable === false ? { width: 0, color: '#00000000' } : requirements.border.value, shape: requirements.shape.value },
      };
    })];
  } else if (nativeLayout?.nodes?.every((node) => Number.isFinite(node.width) && Number.isFinite(node.height))) {
    const root = nativeLayout.nodes.find((node) => node.parentId === null);
    const keys = new Map(nativeLayout.nodes.map((node, index) => [node.id, node === root ? '1:1' : `2:${index + 1}`]));
    nodes = nativeLayout.nodes.map((node) => ({ ...(node === root ? nodes[0] : nodes[1]), id: keys.get(node.id), name: `原生设计 ${node.id}`, designItemId: node.id,
      type: node === root || nativeLayout.nodes.some((item) => item.parentId === node.id) ? 'FRAME' : 'TEXT',
      parentId: node.parentId === null ? null : keys.get(node.parentId), x: node.x, y: node.y, width: node.width, height: node.height, layoutMode: 'VERTICAL' }));
  }
  const variables = [{ id: 'color', name: '页面背景', kind: 'color', value: nodes[0].properties.fill }, { id: 'spacing', name: '内容间距', kind: 'spacing', value: 16 }, { id: 'radius', name: '组件圆角', kind: 'radius', value: 12 }];
  const shared = { fileKey: 'fixtureFile', nodeId: '1:1', stateId, viewport, nodes, variables, assets: [] };
  const captureRef = writeFigmaFixture(repo, `${prefix}/capture.json`, { source: 'figma-mcp', toolName: 'test-double:editable-node-inspection', capturedAt: '2026-11-15T00:00:00Z', ...shared });
  const snapshot = { schemaVersion: '1.0', source: 'figma-mcp', projectId: work.projectId ?? 'test-project', stack: work.stack, objectId: work.visual.objectId,
    candidateId, nodeUrl: 'https://www.figma.com/design/fixtureFile/Test?node-id=1-1', language: 'zh-CN', textScale: 1, previewRef, briefRef, captureRef, ...shared, ...(hardware ? { hardware } : {}) };
  return { snapshot, ref: writeFigmaFixture(repo, `${prefix}/snapshot.json`, snapshot) };
}

/** 将已有方向夹具切换为单一 Figma 方案；已冻结 Figma 基线不重新写入。 */
export function attachFigmaBaselineFixture(repo, work) {
  const record = read(repo, work.globalVisualBaselineRef);
  if (!record || record.designRoute === 'figma-app') return;
  const chosen = record.candidates.find((item) => item.candidateId === record.selectedCandidateId);
  const briefRef = writeFigmaFixture(repo, `figma-fixture/${work.workItemId}/baseline-brief.json`, { targetUsers: '合成测试用户', primaryTask: '相同任务', context: '相同条件', intent: 'explore', realContent: ['相同真实内容'], hardConstraints: ['相同业务'], explorationSpace: ['布局/排版'] });
  record.candidates = [chosen].map((candidate, index) => {
    const previewRef = { path: candidate.path, sha256: createHash('sha256').update(readFileSync(join(repo, candidate.path))).digest('hex') };
    const { ref } = figmaSnapshotFixture(repo, work, { prefix: `figma-fixture/${work.workItemId}/baseline-${candidate.candidateId}`, previewRef, candidateId: candidate.candidateId, variant: index, briefRef });
    return { ...candidate, figmaSnapshotRef: ref };
  });
  record.designRoute = 'figma-app'; record.exploration = { kind: 'initial' };
  const selection = read(repo, record.selectionReviewRef); selection.figmaDesignRef = record.candidates[0].figmaSnapshotRef;
  record.selectionReviewRef = writeFigmaFixture(repo, record.selectionReviewRef.path, selection);
  work.globalVisualBaselineRef = writeFigmaFixture(repo, work.globalVisualBaselineRef.path, record);
}

/** 为单目标领域夹具绑定 Figma 来源和必要交接，不自动改写已冻结的源设计。 */
export function attachFigmaAppFixture(repo, work, doc, options = {}) {
  work.projectId ??= 'test-project';
  const prefix = `figma-fixture/${work.workItemId}`;
  let target = read(repo, work.visual.reviews?.V2);
  const originalTarget = target;
  let snapshot;
  const nativePlan = doc.designReconstructionRef ? read(repo, doc.designReconstructionRef) : null;
  const nativeLayout = options.nativeLayout ?? (work.stack !== 'flutter' && doc.layoutSpecRef ? read(repo, doc.layoutSpecRef) : null);
  if (!doc.figmaDesignRef && target?.figmaDesignRef) {
    const previous = read(repo, target.figmaDesignRef);
    if (previous?.previewRef.path === doc.referenceTarget.path && previous.previewRef.sha256 === doc.referenceTarget.sha256) doc.figmaDesignRef = target.figmaDesignRef;
  }
  let viewport = options.viewport;
  if (!viewport && doc.platformProfileRef) viewport = read(repo, doc.platformProfileRef).viewport;
  let hardware;
  if (work.stack === 'esp32' && work.visual.designRoute === 'figma-app') {
    const board = read(repo, doc.boardProfileRef); viewport = { width: board.screen.width, height: board.screen.height };
    hardware = { boardProfileRef: doc.boardProfileRef, colorFormat: board.screen.colorFormat, inputMethods: board.inputMethods, fonts: board.fonts, resourceBudget: board.resourceBudget };
  }
  if (!doc.figmaDesignRef) {
    const condition = nativePlan?.conditions.find((item) => !item.targetRef || item.targetRef.path === doc.referenceTarget.path);
    const data = figmaSnapshotFixture(repo, work, { prefix, previewRef: doc.referenceTarget, viewport: viewport ?? condition?.viewport, stateId: condition?.stateId, hardware, nativePlan, nativeLayout });
    doc.figmaDesignRef = data.ref; snapshot = data.snapshot;
  } else snapshot = read(repo, doc.figmaDesignRef);
  const targets = [doc.figmaDesignRef];
  for (const [index, extra] of (doc.additionalTargets ?? []).entries()) {
    if (!extra.figmaDesignRef) {
      const element = nativePlan?.elements.find((item) => item.targetRef.path === extra.referenceTarget.path);
      const condition = nativePlan?.conditions.find((item) => item.id === element?.conditionIds[0]);
      extra.figmaDesignRef = figmaSnapshotFixture(repo, work, { prefix: `${prefix}/extra-${index}`, previewRef: extra.referenceTarget, viewport: condition?.viewport ?? (hardware ? viewport : { width: 844, height: 390 }), stateId: condition?.stateId ?? `extra-${index}`, nativePlan, hardware }).ref;
    }
    targets.push(extra.figmaDesignRef);
    if (extra.reviewRef) {
      const review = read(repo, extra.reviewRef); review.figmaDesignRef = extra.figmaDesignRef; review.figmaTargetRefs = [extra.figmaDesignRef];
      extra.reviewRef = writeFigmaFixture(repo, extra.reviewRef.path, review);
    }
  }
  if (!target) target = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: 'test-only://selected-figma' };
  target = { ...target, figmaDesignRef: doc.figmaDesignRef, figmaTargetRefs: targets, scope: target.scope ?? { kind: 'full-object', designItemIds: [], conditionIds: [] },
    schemaVersion: target.schemaVersion ?? '1.0', referenceTarget: target.referenceTarget ?? doc.referenceTarget,
    targetRef: target.targetRef ?? doc.referenceTarget.path, targetSha256: target.targetSha256 ?? doc.referenceTarget.sha256,
    workItemId: target.workItemId ?? work.workItemId, objectId: target.objectId ?? work.visual.objectId, targetId: target.targetId ?? work.visual.objectId, candidateId: target.candidateId ?? work.visual.candidateId,
    stage: target.stage ?? 'V2', purpose: target.purpose ?? 'target', decision: target.decision ?? 'APPROVED', userMessageRef: target.userMessageRef ?? 'test-only://selected-figma' };
  if (!isDeepStrictEqual(target, originalTarget)) work.visual.reviews.V2 = writeFigmaFixture(repo, work.visual.reviews?.V2?.path ?? `${prefix}/target-review.json`, target);
  attachFigmaBaselineFixture(repo, work);
  if (options.designOnly || doc.visualStage === 'V2') return { snapshot };
  for (const name of ['V4', 'V5']) {
    const review = read(repo, work.visual.reviews[name]);
    if (review) work.visual.reviews[name] = writeFigmaFixture(repo, work.visual.reviews[name].path, { ...review, figmaDesignRef: doc.figmaDesignRef });
  }
  const plan = nativePlan;
  const layout = work.stack !== 'flutter' && !plan && doc.layoutSpecRef ? read(repo, doc.layoutSpecRef) : null;
  const designIds = plan?.elements.map((item) => item.id) ?? layout?.nodes.map((item) => item.id) ?? ['title'];
  const handoff = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId,
    ...(work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {}),
    figmaDesignRef: doc.figmaDesignRef, layoutSpecRef: doc.layoutSpecRef, nativePlanRef: doc.designReconstructionRef ?? doc.layoutSpecRef,
    mappings: designIds.map((designItemId) => {
      const element = plan?.elements.find((item) => item.id === designItemId);
      const extra = element && doc.additionalTargets?.find((item) => item.referenceTarget.path === element.targetRef.path);
      const ref = extra?.figmaDesignRef ?? doc.figmaDesignRef; const target = read(repo, ref);
      const node = target.nodes.find((item) => item.designItemId === designItemId) ?? target.nodes.find((item) => item.id === '1:2');
      return { designItemId, nodeId: node.id, stateId: target.stateId, viewport: target.viewport, ...(extra ? { figmaDesignRef: ref } : {}), ...(!plan ? { nativeStyle: extractFigmaNodeStyle(node) } : {}) };
    }),
    adaptationRules: ['沿用当前原生安全区、字号和尺寸适配约束'], unresolved: [],
  };
  doc.figmaHandoffRef = writeFigmaFixture(repo, `${prefix}/handoff-${doc.visualStage}.json`, handoff);
  return { snapshot, handoff };
}
