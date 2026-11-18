import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { extractFigmaNodeStyle } from '../../skills/app-workflow-control/scripts/runtime/figma-app-contract.mjs';
import { extractFigmaLineLayout } from '../../skills/app-workflow-control/scripts/runtime/figma-native-facts.mjs';

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

/** 以真实来源直线及当前栈可绘制范围更新冻结样例，不创建额外生产工件。 */
export function attachFigmaLineFixture(repo, work, doc, layout, { rotation = 0 } = {}) {
  const snapshot = read(repo, doc.figmaDesignRef); const root = snapshot.nodes.find((node) => node.parentId === null);
  const line = { id: '8:1', designItemId: 'separator', name: '真实分隔线', type: 'LINE', parentId: root.id,
    x: 120, y: 150, width: 100, height: 0, rotation, strokeWeight: 1, strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] };
  snapshot.nodes.push(line);
  const capture = read(repo, snapshot.captureRef); capture.nodes = snapshot.nodes;
  snapshot.captureRef = writeFigmaFixture(repo, 'line/capture.json', capture);
  doc.figmaDesignRef = writeFigmaFixture(repo, 'line/design.json', snapshot);
  const bounds = extractFigmaLineLayout(snapshot.nodes, line, root, { pixelGrid: work.stack === 'esp32' });
  layout.figmaDesignRef = doc.figmaDesignRef;
  layout.nodes.push({ id: 'separator', parentId: layout.rootId, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, positioning: 'relative', references: [layout.rootId] });
  doc.layoutSpecRef = writeFigmaFixture(repo, 'line/layout.json', layout);
  attachFigmaAppFixture(repo, work, doc);
  return { line, bounds };
}

/** 合成图片来源单独冻结，先生成后确认，不能让重建预览冒充来源。 */
function visualSourceFixture(repo, work, { prefix, previewRef, candidateId, briefRef }) {
  return writeFigmaFixture(repo, `${prefix}/visual-source.json`, { schemaVersion: '1.0', projectId: work.projectId, stack: work.stack, candidateId, version: 'fixture-v1', origin: 'generated', generationMethod: 'imagegen', imageRef: previewRef, briefRef, prompt: '合成测试提示词', generator: 'test-double', generatorVersion: 'fixture-v1' });
}

/** 生成可编辑节点、实际绑定变量与原始结构导出的本地样例。 */
export function figmaSnapshotFixture(repo, work, { prefix, previewRef, candidateId = work.visual.candidateId, variant = 0, viewport = { width: 390, height: 844 }, stateId = 'default', briefRef, visualSourceRef, hardware, nativePlan, nativeLayout } = {}) {
  prefix ??= `figma-fixture/${work.workItemId}/${candidateId}-${variant}`;
  briefRef ??= writeFigmaFixture(repo, `${prefix}/brief.json`, { targetUsers: '合成测试用户', primaryTask: '完成当前已确认任务', context: '协议测试，不代表真实界面', intent: 'explore', realContent: ['真实标题样例'], keyStates: ['默认'], platformConstraints: ['目标视口'], hardConstraints: ['业务与无障碍'], explorationSpace: ['布局和排版'] });
  let nodes = [
    { id: '1:1', type: 'FRAME', name: '页面内容容器', designItemId: 'screen', parentId: null, x: 0, y: 0, ...viewport, layoutMode: variant ? 'HORIZONTAL' : 'VERTICAL',
      properties: { fill: variant ? '#eeffee' : '#ffffff', spacing: 16, radius: 12 }, bindings: [{ field: 'fill', variableId: 'color' }, { field: 'spacing', variableId: 'spacing' }, { field: 'radius', variableId: 'radius' }] },
    { id: '1:2', type: 'TEXT', name: '主要任务标题', parentId: '1:1', x: 16, y: variant ? 64 : 32, width: 240, height: 48,
      characters: '真实标题样例', designItemId: 'heading', font: { family: 'Noto Sans', platformFamily: 'Noto Sans', available: true, size: variant ? 24 : 18, weight: 500, lineHeight: { unit: 'PERCENT', value: 140 }, letterSpacing: { unit: 'PIXELS', value: 0 } },
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 } }], opacity: 1,
      properties: { insets: { top: 8, right: 8, bottom: 8, left: 8 }, colors: { background: '#ffffff', foreground: '#222222' }, border: { width: 0, color: '#00000000' }, shape: { kind: 'rectangle', radius: 0 } } },
  ];
  if (nativePlan) {
    const elements = nativePlan.elements.filter((item) => item.targetRef.path === previewRef.path && item.targetRef.sha256 === previewRef.sha256);
    // 每个目标视口都有自己的根元素，不能按主视口的固定 ID 识别。
    const rootElement = elements.find((item) => item.parentId === null);
    const keys = new Map(elements.map((item, index) => [item.id, item === rootElement ? '1:1' : `1:${index + 2}`]));
    const constructed = elements.map((element) => {
      const requirements = nativePlan.implementations.find((item) => item.id === element.implementationId).requirements;
      const raw = requirements.appearance.value.raw;
      const text = raw.nodeType === 'TEXT';
      const isRoot = element === rootElement;
      return { id: keys.get(element.id), type: raw.nodeType, name: `设计元素 ${element.label}`, designItemId: element.id,
        parentId: isRoot ? null : (keys.get(element.parentId) ?? '1:1'), x: element.region.x, y: element.region.y, width: requirements.size.value.width, height: requirements.size.value.height,
        ...(text ? { characters: element.label, font: raw.font } : { layoutMode: 'VERTICAL' }),
        properties: raw.properties, ...raw.other, ...(raw.fills != null ? { fills: raw.fills } : {}), ...(raw.imageFills != null ? { imageFills: raw.imageFills } : {}),
        ...(raw.opacity != null ? { opacity: raw.opacity } : {}), ...(raw.strokes != null ? { strokes: raw.strokes } : {}),
        ...(raw.strokeWeight != null ? { strokeWeight: raw.strokeWeight } : {}), ...(raw.cornerRadius != null ? { cornerRadius: raw.cornerRadius } : {}),
        ...(raw.rectangleCornerRadii != null ? { rectangleCornerRadii: raw.rectangleCornerRadii } : {}), ...(raw.cornerRadii != null ? { cornerRadii: raw.cornerRadii } : {}),
        ...(isRoot ? { bindings: [{ field: 'fill', variableId: 'color' }, { field: 'spacing', variableId: 'spacing' }, { field: 'radius', variableId: 'radius' }] } : {}),
      };
    });
    nodes = rootElement ? [constructed.find((node) => node.id === '1:1'), ...constructed.filter((node) => node.id !== '1:1')] : [nodes[0], ...constructed];
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
  const rebuiltPreviewRef = writeFigmaFixture(repo, `${prefix}/rebuilt-preview.png`, readFileSync(join(repo, previewRef.path)));
  const currentReview = read(repo, work.visual.reviews?.V2);
  const existingSource = read(repo, currentReview?.visualSourceRef);
  visualSourceRef ??= existingSource?.candidateId === candidateId && isDeepStrictEqual(existingSource.imageRef, previewRef) && isDeepStrictEqual(existingSource.briefRef, briefRef)
    ? currentReview.visualSourceRef : visualSourceFixture(repo, work, { prefix, previewRef, candidateId, briefRef });
  const authorizationRef = work.visual.reviews?.V2 ?? writeFigmaFixture(repo, `${prefix}/authorization.json`, { decision: 'APPROVED' });
  const snapshot = { schemaVersion: '1.0', source: 'figma-mcp', projectId: work.projectId ?? 'test-project', stack: work.stack, objectId: work.visual.objectId,
    candidateId, nodeUrl: 'https://www.figma.com/design/fixtureFile/Test?node-id=1-1', language: 'zh-CN', textScale: 1, previewRef: rebuiltPreviewRef, briefRef, captureRef,
    reconstruction: { sourceTargetRef: previewRef, authorizationRef, visualSourceRef, method: 'use_figma-plugin', toolName: 'test-double:plugin' }, ...shared, ...(hardware ? { hardware } : {}) };
  return { snapshot, ref: writeFigmaFixture(repo, `${prefix}/snapshot.json`, snapshot) };
}

/** 将已有方向夹具切换为单一 Figma 方案；已冻结 Figma 基线不重新写入。 */
export function attachFigmaBaselineFixture(repo, work) {
  const record = read(repo, work.globalVisualBaselineRef);
  if (!record || record.designRoute === 'figma-app') return;
  const chosen = record.candidates.find((item) => item.candidateId === record.selectedCandidateId);
  const briefRef = writeFigmaFixture(repo, `figma-fixture/${work.workItemId}/baseline-brief.json`, { targetUsers: '合成测试用户', primaryTask: '相同任务', context: '相同条件', intent: 'explore', realContent: ['相同真实内容'], keyStates: ['默认'], platformConstraints: ['目标视口'], hardConstraints: ['相同业务'], explorationSpace: ['布局/排版'] });
  record.candidates = [chosen].map((candidate, index) => {
    const previewRef = { path: candidate.path, sha256: createHash('sha256').update(readFileSync(join(repo, candidate.path))).digest('hex') };
    const { ref } = figmaSnapshotFixture(repo, work, { prefix: `figma-fixture/${work.workItemId}/baseline-${candidate.candidateId}`, previewRef, candidateId: candidate.candidateId, variant: index, briefRef });
    const snapshot = read(repo, ref);
    return { ...candidate, visualSourceRef: snapshot.reconstruction.visualSourceRef };
  });
  record.designRoute = 'figma-app'; record.exploration = { kind: 'initial' };
  const selection = read(repo, record.selectionReviewRef); selection.visualSourceRef = record.candidates[0].visualSourceRef;
  record.selectionReviewRef = writeFigmaFixture(repo, record.selectionReviewRef.path, selection);
  work.globalVisualBaselineRef = writeFigmaFixture(repo, work.globalVisualBaselineRef.path, record);
}

/** 为单目标领域夹具绑定 Figma 来源和必要交接，不自动改写已冻结的源设计。 */
export function attachFigmaAppFixture(repo, work, doc, options = {}) {
  work.projectId ??= 'test-project';
  const prefix = `figma-fixture/${work.workItemId}`;
  let target = read(repo, work.visual.reviews?.V2);
  const originalTarget = target;
  const inheritedV2 = work.visual.reuse?.inheritedReviews?.includes('V2');
  const existingSource = read(repo, target?.visualSourceRef);
  // 复用已冻结的 V2 决定时，继续引用来源任务书和批准，不能覆盖原始确认文件。
  if (inheritedV2 && (!target || !existingSource)) throw new Error('继承的 V2 缺少来源确认或图片来源');
  if (inheritedV2 && !isDeepStrictEqual(existingSource.imageRef, doc.referenceTarget)) throw new Error('继承的 V2 图片与当前目标不一致');
  const briefRef = inheritedV2 ? existingSource.briefRef : writeFigmaFixture(repo, `${prefix}/brief.json`, { targetUsers: '合成测试用户', primaryTask: '完成当前已确认任务', context: '协议测试，不代表真实界面', intent: 'explore', realContent: ['真实标题样例'], keyStates: ['默认'], platformConstraints: ['目标视口'], hardConstraints: ['业务与无障碍'], explorationSpace: ['布局和排版'] });
  const visualSourceRef = existingSource && isDeepStrictEqual(existingSource.imageRef, doc.referenceTarget) && isDeepStrictEqual(existingSource.briefRef, briefRef)
    ? target.visualSourceRef : visualSourceFixture(repo, work, { prefix, previewRef: doc.referenceTarget, candidateId: work.visual.candidateId, briefRef });
  const extraSources = (doc.additionalTargets ?? []).map((extra, index) => {
    if (isDeepStrictEqual(extra.referenceTarget, doc.referenceTarget)) return visualSourceRef;
    if (!inheritedV2) return visualSourceFixture(repo, work, { prefix: `${prefix}/extra-${index}`, previewRef: extra.referenceTarget, candidateId: work.visual.candidateId, briefRef });
    const ref = (target.approvedVisualSourceRefs ?? []).find((candidate) => isDeepStrictEqual(read(repo, candidate)?.imageRef, extra.referenceTarget));
    if (!ref) throw new Error('继承的 V2 未包含额外视口的图片来源');
    return ref;
  });
  let snapshot;
  const nativePlan = doc.designReconstructionRef ? read(repo, doc.designReconstructionRef) : null;
  const nativeLayout = options.nativeLayout ?? (work.stack !== 'flutter' && doc.layoutSpecRef ? read(repo, doc.layoutSpecRef) : null);
  if (!target) target = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: 'test-only://selected-image' };
  target = { ...target, rebuildAuthorization: target.rebuildAuthorization ?? { scope: 'faithful', userMessageRef: 'test-only://rebuild-authorized' },
    scope: target.scope ?? { kind: 'full-object', designItemIds: [], conditionIds: [] }, schemaVersion: target.schemaVersion ?? '1.0',
    referenceTarget: target.referenceTarget ?? doc.referenceTarget, targetRef: target.targetRef ?? doc.referenceTarget.path, targetSha256: target.targetSha256 ?? doc.referenceTarget.sha256,
    workItemId: target.workItemId ?? work.workItemId, objectId: target.objectId ?? work.visual.objectId, targetId: target.targetId ?? work.visual.objectId, candidateId: target.candidateId ?? work.visual.candidateId,
    stage: target.stage ?? 'V2', purpose: target.purpose ?? 'target', decision: target.decision ?? 'APPROVED', userMessageRef: target.userMessageRef ?? 'test-only://selected-image',
    visualSourceRef, approvedVisualSourceRefs: extraSources.length ? extraSources : [visualSourceRef],
    approvedTargetRefs: doc.additionalTargets?.length ? doc.additionalTargets.map((entry) => entry.referenceTarget) : [doc.referenceTarget] };
  if (inheritedV2) target = originalTarget;
  else if (!isDeepStrictEqual(target, originalTarget)) work.visual.reviews.V2 = writeFigmaFixture(repo, work.visual.reviews?.V2?.path ?? `${prefix}/target-review.json`, target);
  let viewport = options.viewport;
  if (!viewport && doc.platformProfileRef) viewport = read(repo, doc.platformProfileRef).viewport;
  let hardware;
  if (work.stack === 'esp32' && work.visual.designRoute === 'figma-app') {
    const board = read(repo, doc.boardProfileRef); viewport = { width: board.screen.width, height: board.screen.height };
    hardware = { boardProfileRef: doc.boardProfileRef, colorFormat: board.screen.colorFormat, inputMethods: board.inputMethods, fonts: board.fonts, resourceBudget: board.resourceBudget };
  }
  if (!doc.figmaDesignRef) {
    const condition = nativePlan?.conditions.find((item) => !item.targetRef || item.targetRef.path === doc.referenceTarget.path);
    const data = figmaSnapshotFixture(repo, work, { prefix, previewRef: doc.referenceTarget, briefRef, visualSourceRef, viewport: viewport ?? condition?.viewport, stateId: condition?.stateId, hardware, nativePlan, nativeLayout });
    doc.figmaDesignRef = data.ref; snapshot = data.snapshot;
  } else snapshot = read(repo, doc.figmaDesignRef);
  const targets = [doc.figmaDesignRef];
  for (const [index, extra] of (doc.additionalTargets ?? []).entries()) {
    if (!extra.figmaDesignRef) {
      const element = nativePlan?.elements.find((item) => item.targetRef.path === extra.referenceTarget.path);
      const condition = nativePlan?.conditions.find((item) => item.id === element?.conditionIds[0]);
      extra.figmaDesignRef = figmaSnapshotFixture(repo, work, { prefix: `${prefix}/extra-${index}`, previewRef: extra.referenceTarget, briefRef, visualSourceRef: extraSources[index], viewport: condition?.viewport ?? (hardware ? viewport : { width: 844, height: 390 }), stateId: condition?.stateId ?? `extra-${index}`, nativePlan, hardware }).ref;
    }
    targets.push(extra.figmaDesignRef);
    if (extra.reviewRef && !inheritedV2) {
      const review = read(repo, extra.reviewRef); review.figmaDesignRef = extra.figmaDesignRef; review.figmaTargetRefs = [extra.figmaDesignRef];
      extra.reviewRef = writeFigmaFixture(repo, extra.reviewRef.path, review);
    }
  }
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
