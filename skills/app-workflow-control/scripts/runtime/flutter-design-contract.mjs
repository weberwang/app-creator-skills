import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readJson, repoPath, requireFile, fileIdentityKey, WorkflowError } from './io.mjs';
import { assertVisualReuse, resolveReuseOwner } from './visual-reuse-binding.mjs';

let validatePlan;
const PROPERTIES = ['structure', 'size', 'spacing', 'typography', 'color', 'border', 'shape', 'states'];
const imageCache = new Map();

/** 图片解码只核对技术身份和尺寸，绝不据此判断视觉还原通过。 */
function imageInfo(repo, work, ref, label) {
  file(repo, work, ref, label);
  const absolute = repoPath(repo, ref.path).absolute;
  const key = `${absolute}:${ref.sha256}`;
  if (imageCache.has(key)) return imageCache.get(key);
  const decoded = spawnSync(process.execPath, [fileURLToPath(new URL('./flutter-image-inspection.mjs', import.meta.url)), absolute], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  check(decoded.status === 0 && !decoded.error, `${label} 解码失败：${decoded.error?.message ?? decoded.stderr}`);
  const info = JSON.parse(decoded.stdout); imageCache.set(key, info);
  return info;
}

/** 读取 JSON 指针所指的源观测值，字段名转义按 RFC 6901 处理。 */
function atPointer(value, pointer) {
  if (pointer === '') return value;
  check(typeof pointer === 'string' && pointer.startsWith('/'), '源码观测 JSON 指针无效');
  return pointer.slice(1).split('/').reduce((current, key) => current?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], value);
}

/** 展开为最小观测值；空容器也须在源码中找到对应事实。 */
function leaves(value, path = '') {
  if (value && typeof value === 'object' && Object.keys(value).length) return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`));
  return [path];
}

/** 源码检查重新读取字面量，不能仅复制计划值；表达式求值应使用布局测试或运行测量。 */
function sourceObservation(repo, report, observation) {
  check(Array.isArray(observation.bindings), '源码观测缺少可复算定位');
  const pointers = observation.bindings.map((item) => item.pointer);
  sameIds(pointers, pointers.includes('') ? [''] : leaves(observation.observed), '源码观测属性');
  for (const binding of observation.bindings) {
    check(report.sourceRefs.some((ref) => ref.path === binding.sourcePath), '源码观测引用了未声明源码');
    const source = readFileSync(repoPath(repo, binding.sourcePath).absolute, 'utf8');
    check(Number.isSafeInteger(binding.start) && Number.isSafeInteger(binding.end) && binding.start >= 0 && binding.end > binding.start && binding.end <= source.length, '源码观测位置越界');
    const literal = source.slice(binding.start, binding.end);
    let actual;
    if (binding.encoding === 'text') actual = literal;
    else {
      check(binding.encoding === 'json', '源码观测编码无效');
      try { actual = JSON.parse(literal); } catch { check(false, '源码观测不是可复算字面量，请使用布局测试或运行测量'); }
    }
    check(isDeepStrictEqual(actual, atPointer(observation.observed, binding.pointer)), '源码实际属性与原始观测不一致');
  }
}

/** 原始输出必须结构化绑定实际源码和消费者，状态文字或任意非空日志不是还原证据。 */
function rawObservations(repo, work, doc, implementation, report) {
  const raw = json(repo, work, report.executionRef, '检查原始输出');
  context(work, raw, '原始观测');
  check(raw.format === 'flutter-design-observations-v1' && raw.implementationId === implementation.id && raw.method === report.method, '原始观测格式或实现错绑');
  check(sameRef(raw.designReconstructionRef, doc.designReconstructionRef) && isDeepStrictEqual(raw.sourceRefs, report.sourceRefs), '原始观测未绑定当前设计与源码');
  check(isDeepStrictEqual(raw.consumers, implementation.consumers), '原始观测消费者错绑');
  check(Array.isArray(raw.observations), '缺少原始观测');
  sameIds(raw.observations.map((item) => `${item.designItemId}/${item.conditionId}/${item.property}`), report.observations.map((item) => `${item.designItemId}/${item.conditionId}/${item.property}`), '原始观测');
  for (const observation of raw.observations) {
    const claimed = report.observations.find((item) => item.designItemId === observation.designItemId && item.conditionId === observation.conditionId && item.property === observation.property);
    check(isDeepStrictEqual(observation.observed, claimed.value), '声明值与原始 observed 不一致');
    if (report.method === 'source-inspection') sourceObservation(repo, report, observation);
  }
  if (report.method !== 'source-inspection') {
    const capture = json(repo, work, raw.commandCaptureRef, '原始测量命令采集');
    check(capture.schemaVersion === 'command-capture-v1' && capture.exitCode === 0 && typeof capture.command === 'string' && capture.command.trim(), '原始测量缺少成功命令采集');
    let output;
    try { output = JSON.parse(capture.stdout); } catch { check(false, '原始测量 stdout 必须包含结构化观测'); }
    check(isDeepStrictEqual(output, raw.observations), '原始测量命令输出与观测不一致');
  }
}

/** 统一拒绝合同缺失，不能将结构检查错误降级为视觉通过。 */
function check(ok, message) {
  if (!ok) throw new WorkflowError(`Flutter 设计还原合同：${message}`);
}

/** 校验当前项目内的非空冻结文件，并拒绝 RETURN 已作废的引用。 */
function file(repo, work, ref, label) {
  check(ref && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 ?? ''), `${label} 缺少路径或 SHA-256`);
  const normalized = repoPath(repo, ref.path).relative;
  check(normalized === ref.path, `${label} 必须使用规范路径`);
  check(!work.invalidatedRefs?.some((item) => fileIdentityKey(repo, item.path) === fileIdentityKey(repo, normalized)), `${label} 使用 RETURN 已作废引用`);
  requireFile(repo, ref.path, label);
  const bytes = readFileSync(repoPath(repo, ref.path).absolute);
  check(bytes.length && createHash('sha256').update(bytes).digest('hex') === ref.sha256, `${label} 内容与当前引用不一致`);
  return ref;
}

/** 引用既须内容相同也须路径相同，防止同名对象借用其他材料。 */
function sameRef(actual, expected) {
  return actual?.path === expected?.path && actual?.sha256 === expected?.sha256;
}

/** ID 集合须恰好覆盖目标范围，重复项和额外项均拒绝。 */
function sameIds(actual, expected, label) {
  check(Array.isArray(actual) && new Set(actual).size === actual.length && isDeepStrictEqual([...actual].sort(), [...expected].sort()), `${label} 覆盖不完整或身份不一致`);
}

/** 局部授权仅接受明确、去重的合法 ID 数组，禁止字符串子串冒充集合授权。 */
function scopeSubset(actual, allowed, label) {
  check(Array.isArray(actual) && actual.length > 0 && new Set(actual).size === actual.length && actual.every((id) => typeof id === 'string' && allowed.includes(id)), `${label} 必须是有效且唯一的 ID 数组`);
}

/** 所有阶段材料都绑定当前对象；运行材料不沿用其他工作项的结论。 */
function context(work, doc, label) {
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId })) {
    check(doc?.[key] === expected, `${label} ${key} 未绑定当前对象`);
  }
  if (work.workItemType === 'DISPLAY_LAYER') {
    check(doc.hostId === work.visual.hostId && doc.layerType === work.visual.layerType, `${label} 未绑定当前宿主或层类型`);
  }
}

/** 读取冻结 JSON，技术真实性来自内容身份；视觉效果仍由用户判断。 */
function json(repo, work, ref, label) {
  return readJson(repo, file(repo, work, ref, label).path, label);
}

/** 读取 V3 固定的生产计划；V4 实际证据放在领域封套，不改写已确认计划。 */
function planFor(repo, work, doc) {
  // 公共控制器也安装于非 Flutter 工程，仅在消费 Flutter 合同时读取该领域 Schema。
  if (!validatePlan) {
    const loadDependency = createRequire(import.meta.url)('../../../app-skill-runtime/dependencies.cjs');
    const Ajv2020 = loadDependency('ajv/dist/2020.js');
    validatePlan = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(readFileSync(new URL('../../../flutter-domain-contracts/references/design-reconstruction.schema.json', import.meta.url), 'utf8')));
  }
  const plan = json(repo, work, doc.designReconstructionRef, '设计拆解');
  check(validatePlan(plan), `设计拆解 Schema 失败：${JSON.stringify(validatePlan.errors)}`);
  // 设计复用仍使用原始确认拥有者；当前实际组件与运行证据必须重新核验。
  const owner = work.visual.reuse?.inheritedReviews?.includes('V3Decomposition')
    ? readJson(repo, work.visual.reviews.V3Decomposition.path).workItemId : work.workItemId;
  if (owner !== work.workItemId) {
    assertVisualReuse(repo, work);
    resolveReuseOwner(repo, work, owner, 'V3Decomposition');
  }
  context({ ...work, workItemId: owner }, plan, '设计拆解');
  check(sameRef(plan.referenceTarget, doc.referenceTarget), '设计拆解未绑定 V2 目标');
  file(repo, work, plan.referenceTarget, '设计目标');
  const approvedTargets = [plan.referenceTarget];
  for (const extra of doc.additionalTargets ?? []) {
    file(repo, work, extra.referenceTarget, '额外设计目标');
    const review = json(repo, work, extra.reviewRef, '额外目标确认');
    if (review.workItemId !== work.workItemId) {
      assertVisualReuse(repo, work); resolveReuseOwner(repo, work, review.workItemId, 'V2');
      let source = work;
      while (source.workItemId !== review.workItemId) source = readJson(repo, source.visual.reuse.sourceWorkItemRef.path, '额外目标拥有者');
      const sourceDoc = json(repo, work, source.visual.domainEvidenceRef, '额外目标来源领域证据');
      check(sourceDoc.additionalTargets?.some((entry) => sameRef(entry.referenceTarget, extra.referenceTarget) && sameRef(entry.reviewRef, extra.reviewRef)), '额外目标未绑定复用来源的确认');
    }
    context({ ...work, workItemId: review.workItemId }, review, '额外目标确认');
    check(review.stage === 'V2' && review.purpose === 'target' && review.decision === 'APPROVED' && review.userMessageRef?.trim() && review.scope?.kind === 'full-object' && sameRef(review.referenceTarget, extra.referenceTarget), '额外目标缺少完整范围的真实确认');
    check(!approvedTargets.some((ref) => sameRef(ref, extra.referenceTarget)), '额外目标身份重复');
    approvedTargets.push(extra.referenceTarget);
  }
  for (const condition of plan.conditions) check(approvedTargets.some((ref) => sameRef(ref, condition.targetRef ?? plan.referenceTarget)), `${condition.id} 未绑定已确认目标`);
  for (const target of approvedTargets) check(plan.conditions.some((condition) => sameRef(condition.targetRef ?? plan.referenceTarget, target)), '设计覆盖遗漏已声明目标');
  const ids = plan.elements.map((item) => item.id);
  const conditions = plan.conditions.map((item) => item.id);
  sameIds(ids, [...new Set(ids)], '设计项唯一 ID');
  sameIds(conditions, [...new Set(conditions)], '条件唯一 ID');
  sameIds(plan.implementations.map((item) => item.id), [...new Set(plan.implementations.map((item) => item.id))], '实现唯一 ID');
  const elements = new Map(plan.elements.map((item) => [item.id, item]));
  const implementations = new Map(plan.implementations.map((item) => [item.id, item]));
  const outputPaths = plan.implementations.filter((item) => item.production).map((item) => item.production.outputPath);
  sameIds(outputPaths, [...new Set(outputPaths)], '正式图片身份');
  for (const element of plan.elements) {
    check(element.conditionIds.every((id) => conditions.includes(id)), `${element.id} 状态/条件未定义`);
    check(element.conditionIds.every((id) => sameRef(element.targetRef, plan.conditions.find((item) => item.id === id).targetRef ?? plan.referenceTarget)), `${element.id} 未定位到适用条件的已确认源图`);
    check(element.parentId === null || elements.has(element.parentId), `${element.id} 父级不存在`);
    check(element.layoutReference === 'viewport' || elements.has(element.layoutReference), `${element.id} 布局参照不存在`);
    check(element.layoutReference !== element.id, `${element.id} 不能参照自身`);
    const seen = new Set([element.id]);
    let parent = element.parentId;
    while (parent !== null) {
      check(!seen.has(parent), `${element.id} 父子关系成环`);
      seen.add(parent); parent = elements.get(parent)?.parentId ?? null;
    }
    check(implementations.get(element.implementationId)?.designItemIds.includes(element.id), `${element.id} 缺少实现映射`);
  }
  for (const condition of conditions) check(plan.elements.some((item) => item.conditionIds.includes(condition)), `${condition} 没有设计项`);
  for (const implementation of plan.implementations) {
    const mapped = plan.elements.filter((item) => item.implementationId === implementation.id).map((item) => item.id);
    sameIds(implementation.designItemIds, mapped, `${implementation.id} 设计项映射`);
    const stateIds = [...new Set(mapped.flatMap((id) => elements.get(id).conditionIds.map((condition) => plan.conditions.find((item) => item.id === condition).stateId)))];
    sameIds(implementation.requirements.states.value.ids, stateIds, `${implementation.id} 状态规格`);
    sameIds(Object.keys(implementation.requirements.states.value.rules), stateIds, `${implementation.id} 状态变化规则`);
    const children = [...new Set(plan.elements.filter((item) => mapped.includes(item.parentId)).map((item) => item.id))];
    sameIds(implementation.requirements.structure.value.children, children, `${implementation.id} 真实子级`);
    sameIds(implementation.consumers.map((item) => item.id), [...new Set(implementation.consumers.map((item) => item.id))], '消费者唯一 ID');
    for (const consumer of implementation.consumers) repoPath(repo, consumer.sourcePath, '消费者源码');
    for (const property of PROPERTIES) {
      const requirement = implementation.requirements[property];
      if (requirement.basis === 'approved-change') {
        const review = json(repo, work, requirement.approvalRef, '设计变更确认');
        context(work, review, '设计变更确认');
        check(review.purpose === 'design-change' && review.decision === 'APPROVED' && review.userMessageRef?.trim(), '设计变更缺少真实用户决定');
        check(['V2', 'V3', 'V4', 'V5'].includes(review.stage), '设计变更确认阶段无效');
        check(sameRef(review.referenceTarget, plan.referenceTarget), '设计变更目标错绑');
        check(review.scope?.kind === 'design-items', '设计变更必须是设计项局部授权');
        scopeSubset(review.scope.properties, PROPERTIES, '设计变更属性');
        scopeSubset(review.scope.designItemIds, ids, '设计变更设计项');
        scopeSubset(review.scope.conditionIds, conditions, '设计变更条件');
        check(review.scope.properties.includes(property), '设计变更超出属性范围');
        check(implementation.designItemIds.every((id) => review.scope.designItemIds.includes(id)), '设计变更超出设计项范围');
        check(mapped.every((id) => elements.get(id).conditionIds.every((condition) => review.scope.conditionIds.includes(condition))), '设计变更超出状态/条件范围');
      }
    }
    if (implementation.production) {
      repoPath(repo, implementation.production.outputPath, '正式资源路径');
      sameIds(implementation.production.consumerIds, implementation.consumers.map((item) => item.id), '图片消费者');
      if (implementation.kind === 'shared-image') check(implementation.consumers.length > 1, '共享素材须有多个实际消费者');
      check(implementation.production.identity === (implementation.kind === 'shared-image' ? 'shared' : 'independent'), '图片共享身份与实现方式不一致');
    }
  }
  return plan;
}

/** 阶段确认精确绑定拆解、布局或对照及完整范围，样本确认无法提升为整页通过。 */
function reviewFor(repo, work, doc, plan, name, purpose, stage) {
  const review = json(repo, work, work.visual.reviews?.[name], `${name} 确认`);
  const inherited = work.visual.reuse?.inheritedReviews?.includes(name);
  context(inherited ? { ...work, workItemId: plan.workItemId } : work, review, name);
  check(review.stage === stage && review.purpose === purpose && review.decision === 'APPROVED' && review.userMessageRef?.trim(), `${name} 缺少对应阶段的真实确认`);
  check(review.scope?.kind === 'full-object', `${name} 必须是完整对象确认，代表样本或单项决定不能提升`);
  sameIds(review.scope.designItemIds, plan.elements.map((item) => item.id), `${name} 设计项`);
  sameIds(review.scope.conditionIds, plan.conditions.map((item) => item.id), `${name} 条件`);
  check(sameRef(review.referenceTarget, doc.referenceTarget) && sameRef(review.designReconstructionRef, doc.designReconstructionRef), `${name} 未绑定当前目标和设计拆解`);
  if (name === 'V3Layout') check(sameRef(review.layoutSpecRef, doc.layoutSpecRef), 'V3Layout 未绑定当前布局');
  if (name === 'V4') check(sameRef(review.assetReviewRef, work.assetReviewRef), 'V4 确认未绑定当前正式资源验收身份');
  if (name === 'V5') check(sameRef(review.comparisonRef, doc.comparisonRef), 'V5 未绑定当前完整组合对照');
  return review;
}

/** 原生与图片都须提供逐项、逐条件的当前观测，不接受源码加任意非空文件。 */
function implementationEvidence(repo, work, doc, plan) {
  check(Array.isArray(doc.implementationEvidenceRefs), '缺少逐项实现证据');
  const reports = doc.implementationEvidenceRefs.map((ref) => ({ ref, report: json(repo, work, ref, '实现证据') }));
  sameIds(reports.map(({ report }) => report.implementationId), plan.implementations.map((item) => item.id), '实现证据');
  for (const { report } of reports) {
    context(work, report, '实现证据');
    check(sameRef(report.designReconstructionRef, doc.designReconstructionRef), '实现证据未绑定当前设计拆解');
    const implementation = plan.implementations.find((item) => item.id === report.implementationId);
    check(Array.isArray(report.sourceRefs), '实现证据缺少当前源码身份');
    sameIds(report.sourceRefs.map((ref) => ref.path), [...new Set(implementation.consumers.map((item) => item.sourcePath))], '实现源码');
    for (const ref of report.sourceRefs) file(repo, work, ref, '当前组件源码');
    for (const consumer of implementation.consumers) {
      const source = readFileSync(repoPath(repo, consumer.sourcePath).absolute, 'utf8');
      check(source.includes(consumer.symbol), `${consumer.id} 当前源码缺少声明的组件或消费者符号`);
    }
    check(['source-inspection', 'layout-test', 'runtime-measurement'].includes(report.method), '实现证据缺少检查方法');
    const expectedKeys = [];
    for (const id of implementation.designItemIds) for (const condition of plan.elements.find((item) => item.id === id).conditionIds) for (const property of PROPERTIES) {
      expectedKeys.push(`${id}/${condition}/${property}`);
      const checks = report.observations?.filter((item) => item.designItemId === id && item.conditionId === condition && item.property === property);
      check(checks?.length === 1 && isDeepStrictEqual(checks[0].value, implementation.requirements[property].value), `${id}/${condition}/${property} 缺少当前还原依据或实际值偏离`);
    }
    sameIds(report.observations?.map((item) => `${item.designItemId}/${item.conditionId}/${item.property}`), expectedKeys, '实现观测');
    rawObservations(repo, work, doc, implementation, report);
    if (implementation.production) {
      const imported = report.imported;
      check(imported && imported.assetRef?.path === implementation.production.outputPath, '图片未绑定正式资源路径');
      file(repo, work, imported.assetRef, '正式资源');
      const image = imageInfo(repo, work, imported.assetRef, '正式图片');
      check(image.width === implementation.production.outputSize.width && image.height === implementation.production.outputSize.height, '正式图片实际尺寸与生产规格不符');
      if (implementation.production.background === 'transparent') check(image.hasAlpha, '透明图片缺少 Alpha 通道');
      if (image.pages > 1) check(image.pages === implementation.production.frames?.length, '动画图片实际帧序数量与生产规格不符');
      file(repo, work, imported.provenanceRef, '素材实际来源');
      file(repo, work, imported.importEvidenceRef, '导入加载原始输出');
      check(isDeepStrictEqual(imported.production, implementation.production), '实际导入参数与生产规格不符');
      sameIds(imported.consumerIds, implementation.production.consumerIds, '导入消费者');
    }
  }
  return reports;
}

/** 资源验收与计划及实际实现报告一一对应，不能用同一空泛组件关闭全部设计项。 */
export function validateFlutterAssetReview(repo, work, record, supplied) {
  const doc = supplied?.doc ?? json(repo, work, work.visual.domainEvidenceRef, '领域证据');
  const plan = supplied?.plan ?? planFor(repo, work, doc);
  const reports = supplied?.reports ?? implementationEvidence(repo, work, doc, plan);
  sameIds(record.assets?.map((item) => item.assetId), plan.implementations.map((item) => item.id), '资源验收实现');
  for (const implementation of plan.implementations) {
    const asset = record.assets.find((item) => item.assetId === implementation.id);
    const report = reports.find(({ report }) => report.implementationId === implementation.id);
    sameIds(asset.designItemIds, implementation.designItemIds, '资源验收设计项');
    sameIds(asset.consumerIds, implementation.consumers.map((item) => item.id), '资源验收消费者');
    check(sameRef(asset.implementationEvidenceRef, report.ref), '资源验收未绑定实际还原证据');
    const image = Boolean(implementation.production);
    check(asset.assetType === (image ? 'image' : 'native-component'), '资源验收实现类型错绑');
    check(asset.output === (image ? implementation.production.outputPath : implementation.consumers[0].sourcePath), '资源验收产物错绑');
    if (!image) check(asset.componentEvidenceRef === report.ref.path, '原生组件证据未关联当前设计');
  }
}

/** V3 规划、V4 生产、V5 当前组合分别收口；usability 也必须覆盖已确认设计。 */
export function validateFlutterDesign(repo, work, stage, doc) {
  const plan = planFor(repo, work, doc);
  reviewFor(repo, work, doc, plan, 'V3Decomposition', 'decomposition', 'V3');
  reviewFor(repo, work, doc, plan, 'V3Layout', 'layout', 'V3');
  if (stage === 'V3') return;
  const reports = implementationEvidence(repo, work, doc, plan);
  const assets = json(repo, work, work.assetReviewRef, '正式资源验收');
  validateFlutterAssetReview(repo, work, assets, { doc, plan, reports });
  reviewFor(repo, work, doc, plan, 'V4', 'imported-assets', 'V4');
  if (stage !== 'V5') return;
  const comparison = json(repo, work, doc.comparisonRef, '当前组合对照');
  context(work, comparison, '当前组合对照');
  check(sameRef(comparison.designReconstructionRef, doc.designReconstructionRef), '当前组合对照设计错绑');
  sameIds(comparison.implementationEvidenceRefs?.map((ref) => `${ref.path}:${ref.sha256}`), doc.implementationEvidenceRefs.map((ref) => `${ref.path}:${ref.sha256}`), '当前组合实现身份');
  sameIds(comparison.cases?.map((item) => item.conditionId), plan.conditions.map((item) => item.id), 'V5 对照条件');
  for (const item of comparison.cases) {
    const condition = plan.conditions.find((entry) => entry.id === item.conditionId);
    check(isDeepStrictEqual(item.conditions, condition), 'V5 视口/状态/语言/文字倍率或适配条件错绑');
    check(sameRef(item.targetRef, condition.targetRef ?? plan.referenceTarget), 'V5 未绑定已确认目标');
    file(repo, work, item.targetRef, 'V5 目标图'); file(repo, work, item.runtimeRef, 'V5 当前正式组合截图');
    // 独立采集可能恰好与目标同字节；拒绝直接复用目标路径，来源仍核对采集上下文。
    check(fileIdentityKey(repo, item.runtimeRef.path) !== fileIdentityKey(repo, item.targetRef.path), 'V5 不能把目标图冒充运行截图');
    const capture = json(repo, work, item.captureRef, 'V5 实际采集上下文');
    context(work, capture, 'V5 实际采集上下文');
    check(capture.format === 'flutter-runtime-capture-v1' && sameRef(capture.runtimeRef, item.runtimeRef) && sameRef(capture.designReconstructionRef, doc.designReconstructionRef), 'V5 采集未绑定当前正式组合');
    check(isDeepStrictEqual(capture.conditions, condition), 'V5 采集条件与当前对照不一致');
    sameIds(capture.implementationEvidenceRefs?.map((ref) => `${ref.path}:${ref.sha256}`), doc.implementationEvidenceRefs.map((ref) => `${ref.path}:${ref.sha256}`), 'V5 采集实现证据');
    const sourceRefs = reports.flatMap(({ report }) => report.sourceRefs);
    sameIds(capture.sourceRefs?.map((ref) => `${ref.path}:${ref.sha256}`), [...new Set(sourceRefs.map((ref) => `${ref.path}:${ref.sha256}`))], 'V5 采集源码');
    check(typeof capture.captureMethod === 'string' && capture.captureMethod.trim() && Number.isFinite(capture.pixelRatio) && capture.pixelRatio > 0, 'V5 缺少实际采集方式或像素倍率');
    file(repo, work, capture.captureOutputRef, 'V5 采集原始输出');
    const screenshot = imageInfo(repo, work, item.runtimeRef, 'V5 运行截图');
    check(screenshot.width === Math.round(condition.viewport.width * capture.pixelRatio) && screenshot.height === Math.round(condition.viewport.height * capture.pixelRatio), 'V5 截图实际尺寸与采集视口或像素倍率不符');
    sameIds(item.designItemIds, plan.elements.filter((element) => element.conditionIds.includes(item.conditionId)).map((element) => element.id), 'V5 对照设计项');
  }
  // 只核验真实人工确认的范围与材料，不读取截图判断美观，也不写入视觉 PASS。
  reviewFor(repo, work, doc, plan, 'V5', 'runtime-acceptance', 'V5');
}
