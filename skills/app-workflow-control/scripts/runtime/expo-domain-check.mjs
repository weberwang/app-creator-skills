import { createRequire } from 'node:module';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { hasPreciseApproval } from './approval.mjs';

const require = createRequire(import.meta.url);
const { validateRelativeLayoutNodes } = require('../../../app-ui-layout/scripts/relative-layout-policy.cjs');

/** 检查必须由实际项目提供的非空事实，避免缺项被当作已确认。 */
function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`Expo ${label} 必须为非空字符串`);
}

/** 绑定两份文件引用的路径和内容身份，防止替换后沿用确认。 */
function sameRef(repo, actual, expected, label, identity) {
  if (identity(repo, actual, label) !== identity(repo, expected, label) || actual.sha256 !== expected.sha256) {
    throw new WorkflowError(`Expo ${label} 未绑定当前文件`);
  }
}

/** 根据项目实际逻辑尺寸与系统设置核对目标平台资料。 */
function readPlatform(repo, doc, identity) {
  const profile = readJson(repo, identity(repo, doc.platformProfileRef, 'Expo 平台配置'), 'Expo 平台配置');
  if (profile.schemaVersion !== '1.0' || !['android', 'ios', 'web'].includes(profile.platform)) throw new WorkflowError('Expo 平台配置的版本或平台无效');
  for (const key of ['expoSdkVersion', 'reactNativeVersion']) requireText(profile[key], key);
  for (const key of ['width', 'height']) if (!Number.isFinite(profile.viewport?.[key]) || profile.viewport[key] <= 0) throw new WorkflowError(`Expo 视口 ${key} 必须是正数`);
  for (const edge of ['top', 'right', 'bottom', 'left']) if (!Number.isFinite(profile.safeArea?.[edge]) || profile.safeArea[edge] < 0) throw new WorkflowError(`Expo 安全区 ${edge} 必须是非负数`);
  if (profile.safeArea.left + profile.safeArea.right >= profile.viewport.width || profile.safeArea.top + profile.safeArea.bottom >= profile.viewport.height) throw new WorkflowError('Expo 安全区不能占满视口');
  if (!Number.isFinite(profile.fontScale) || profile.fontScale <= 0) throw new WorkflowError('Expo 字体缩放必须为正数');
  return profile;
}

/** 校验布局源、逻辑坐标和节点父链，并复用公共相对布局策略。 */
function readLayout(repo, work, doc, profile, identity) {
  const layout = readJson(repo, identity(repo, doc.layoutSpecRef, 'Expo 布局规格'), 'Expo 布局规格');
  if (layout.schemaVersion !== '1.0' || layout.objectId !== work.visual.objectId) throw new WorkflowError('Expo 布局规格未绑定当前对象');
  sameRef(repo, layout.platformProfileRef, doc.platformProfileRef, '布局平台配置', identity);
  sameRef(repo, layout.decompositionRef, work.visual.reviews?.V3Decomposition, '拆解确认', identity);
  if (layout.unit !== 'logical-pixel' || layout.viewport?.width !== profile.viewport.width || layout.viewport?.height !== profile.viewport.height) throw new WorkflowError('Expo 布局单位或视口与平台配置不一致');
  for (const key of ['safeAreaStrategy', 'keyboardStrategy', 'textScaleStrategy']) requireText(layout[key], `布局 ${key}`);
  const source = requireFile(repo, layout.sourcePath, 'Expo 正式布局源');
  const snapshot = identity(repo, doc.layoutSourceRef, 'Expo 正式布局源快照');
  if (repoPath(repo, source).relative === repoPath(repo, snapshot).relative) throw new WorkflowError('Expo 正式布局源快照不能指向可变的正式源文件');
  if (!Array.isArray(layout.nodes) || !layout.nodes.length) throw new WorkflowError('Expo 布局节点不能为空');
  const nodes = new Map();
  for (const node of layout.nodes) {
    requireText(node?.id, '布局节点 id');
    if (nodes.has(node.id)) throw new WorkflowError('Expo 布局节点 id 重复');
    for (const key of ['x', 'y', 'width', 'height']) if (!Number.isFinite(node[key]) || (['width', 'height'].includes(key) && node[key] <= 0)) throw new WorkflowError(`Expo 布局节点 ${key} 无效`);
    nodes.set(node.id, node);
  }
  const root = nodes.get(layout.rootId);
  if (!root || root.parentId !== null || root.x !== 0 || root.y !== 0 || root.width !== profile.viewport.width || root.height !== profile.viewport.height) throw new WorkflowError('Expo 布局根节点与视口几何不一致');
  if (nodes.has('viewport') || !Array.isArray(root.references) || root.references.length !== 1 || root.references[0] !== 'viewport') throw new WorkflowError('Expo 根节点必须引用固定 viewport');
  for (const node of nodes.values()) {
    if (node === root) continue;
    const seen = new Set([node.id]);
    let current = node;
    // 仅允许连接当前视口根的父链，阻止循环和脱离页面的节点。
    while (current !== root) {
      if (typeof current.parentId !== 'string' || !nodes.has(current.parentId) || seen.has(current.parentId)) throw new WorkflowError('Expo 布局父子关系无效');
      seen.add(current.parentId);
      current = nodes.get(current.parentId);
    }
  }
  const bodies = [...nodes.values()].filter((node) => node.floatingKind != null);
  if (work.workItemType === 'PAGE' && bodies.length) throw new WorkflowError('Expo PAGE 不能声明浮层本体');
  if (work.workItemType === 'DISPLAY_LAYER') {
    const expected = work.visual.layerType === 'toast' ? 'toast' : 'popup';
    if (bodies.length !== 1 || bodies[0].id !== work.visual.objectId || bodies[0].floatingKind !== expected || bodies[0].parentId !== root.id) throw new WorkflowError('Expo 显示层必须绑定当前对象对应的唯一浮层本体及视口父级');
  }
  const mapped = [...nodes.values()].map((node) => ({ id: node.id, parentId: node === root ? 'viewport' : node.parentId, mode: node.positioning, references: node.references, floatingKind: node.floatingKind ?? null }));
  const errors = validateRelativeLayoutNodes(mapped, { roots: ['viewport'], label: 'Expo 布局' });
  if (errors.length) throw new WorkflowError(`Expo 相对布局合同失败：${errors.join('；')}`);
}

/** 资源清单关联真实制作源、运行资源与注册位置；无资源须明确原因。 */
function readAssets(repo, work, doc, identity) {
  const assets = readJson(repo, identity(repo, doc.assetManifestRef, 'Expo 资源清单'), 'Expo 资源清单');
  if (assets.schemaVersion !== '1.0' || assets.objectId !== work.visual.objectId) throw new WorkflowError('Expo 资源清单未绑定当前对象');
  sameRef(repo, assets.platformProfileRef, doc.platformProfileRef, '资源平台配置', identity);
  sameRef(repo, assets.layoutSpecRef, doc.layoutSpecRef, '资源布局规格', identity);
  if (!Array.isArray(assets.items)) throw new WorkflowError('Expo 资源清单缺少 items');
  if (!assets.items.length) requireText(assets.nativeOnlyReason, '无外部资源原因');
  const ids = new Set();
  for (const item of assets.items) {
    requireText(item?.id, '资源 id');
    if (ids.has(item.id)) throw new WorkflowError('Expo 资源 id 重复');
    ids.add(item.id);
    for (const key of ['sourceRef', 'runtimeRef', 'registrationRef']) identity(repo, item[key], `Expo 资源 ${item.id} ${key}`);
  }
}

/** 显示层各阶段用户确认必须绑定其实际宿主及窗口类型。 */
function checkLayerReviews(repo, work, stage, identity) {
  const names = ['V2', ...(stage !== 'V2' ? ['V3Decomposition', 'V3Layout'] : []), ...(['V4', 'V5'].includes(stage) ? ['V4'] : []), ...(stage === 'V5' ? ['V5'] : [])];
  for (const name of names) {
    const review = readJson(repo, identity(repo, work.visual.reviews?.[name], `Expo ${name} 显示层确认`), `Expo ${name} 显示层确认`);
    if (review.hostId !== work.visual.hostId || review.layerType !== work.visual.layerType) throw new WorkflowError(`Expo ${name} 显示层确认未绑定当前宿主或层类型`);
  }
}

/** 已确认材料变更后不能沿用原确认。 */
function checkConfirmedRef(repo, work, name, field, expected, identity) {
  const review = readJson(repo, identity(repo, work.visual.reviews?.[name], `Expo ${name} 用户确认`), `Expo ${name} 用户确认`);
  sameRef(repo, review[field], expected, `${name} 确认 ${field}`, identity);
}

/** 验证构建和运行材料与平台、当前布局及素材的身份一致。 */
function checkRuntime(repo, work, doc, profile, identity) {
  const runtime = readJson(repo, identity(repo, doc.runtimeContextRef, 'Expo 运行上下文'), 'Expo 运行上下文');
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId, platform: profile.platform })) {
    if (runtime[key] !== expected) throw new WorkflowError(`Expo 运行上下文 ${key} 未绑定当前对象或平台`);
  }
  const environments = { android: ['android-emulator', 'android-device'], ios: ['ios-simulator', 'ios-device'], web: ['web-browser'] };
  if (!environments[profile.platform].includes(runtime.environment)) throw new WorkflowError('Expo 运行环境与平台不一致');
  if (!['development', 'release'].includes(runtime.buildKind)) throw new WorkflowError('Expo 构建类型必须是 development 或 release');
  const runtimeKind = profile.platform === 'web' ? 'web-export' : 'native-build';
  if (runtime.runtimeKind !== runtimeKind) throw new WorkflowError('Expo 运行类型不符合平台；Expo Go 或浏览器预览不能代替原生构建');
  for (const key of ['platformProfileRef', 'layoutSpecRef', 'layoutSourceRef', 'assetManifestRef']) sameRef(repo, runtime[key], doc[key], `运行上下文 ${key}`, identity);
  const build = readJson(repo, identity(repo, runtime.buildIdentityRef, 'Expo 构建身份'), 'Expo 构建身份');
  if (build.schemaVersion !== '1.0' || build.platform !== profile.platform || build.buildKind !== runtime.buildKind || build.runtimeKind !== runtimeKind) throw new WorkflowError('Expo 构建身份与平台或运行类型不一致');
  requireText(build.sourceRevision, '构建源码版本');
  for (const key of ['platformProfileRef', 'layoutSpecRef', 'layoutSourceRef', 'assetManifestRef']) sameRef(repo, build[key], doc[key], `构建身份 ${key}`, identity);
  for (const key of ['artifactRef', 'buildLogRef']) identity(repo, build[key], `Expo 构建 ${key}`);
  for (const key of ['runEvidenceRef', 'interactionEvidenceRef']) identity(repo, runtime[key], `Expo 运行 ${key}`);
  if (runtime.environment.endsWith('-device')) {
    // 真实设备操作必须关联现有动作的精确批准；证据文件本身不能授予权限。
    if (!work.action?.effects?.includes('device') || !hasPreciseApproval(work) || runtime.deviceTarget !== work.action.target || runtime.approvalUserMessageRef !== work.action.approval?.userMessageRef) throw new WorkflowError('Expo 设备运行缺少当前目标的明确 device 授权');
  }
  checkConfirmedRef(repo, work, 'V5', 'runtimeContextRef', doc.runtimeContextRef, identity);
  if (work.workItemType !== 'DISPLAY_LAYER') return;
  if (runtime.hostId !== work.visual.hostId || runtime.layerType !== work.visual.layerType) throw new WorkflowError('Expo 运行上下文未绑定显示层宿主或类型');
  for (const action of ['open', 'close', 'focus-restore']) {
    const items = Array.isArray(runtime.interactions) ? runtime.interactions.filter((item) => item?.action === action) : [];
    if (items.length !== 1) throw new WorkflowError(`Expo 运行上下文缺少唯一的 ${action} 记录`);
    if (items[0].status === 'PASS') identity(repo, items[0].evidenceRef, `Expo ${action} 证据`);
    else if (items[0].status !== 'NOT_APPLICABLE' || typeof items[0].reason !== 'string' || !items[0].reason.trim()) throw new WorkflowError(`Expo ${action} 须提供通过证据或不适用原因`);
  }
}

/** 连接 Expo 单对象各阶段的原生证据，状态和用户确认仍由公共门禁管理。 */
export function validateExpo(repo, work, stage, doc, identity) {
  if (!['PAGE', 'DISPLAY_LAYER'].includes(work.workItemType)) throw new WorkflowError('Expo 单目标领域合同仅适用于 PAGE 或 DISPLAY_LAYER');
  const profile = readPlatform(repo, doc, identity);
  checkConfirmedRef(repo, work, 'V2', 'platformProfileRef', doc.platformProfileRef, identity);
  if (work.workItemType === 'DISPLAY_LAYER') checkLayerReviews(repo, work, stage, identity);
  if (stage === 'V2') return;
  readLayout(repo, work, doc, profile, identity);
  checkConfirmedRef(repo, work, 'V3Layout', 'layoutSpecRef', doc.layoutSpecRef, identity);
  if (stage === 'V3') return;
  readAssets(repo, work, doc, identity);
  checkConfirmedRef(repo, work, 'V4', 'assetManifestRef', doc.assetManifestRef, identity);
  if (stage === 'V5') checkRuntime(repo, work, doc, profile, identity);
}
