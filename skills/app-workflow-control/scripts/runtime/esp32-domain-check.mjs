import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { hasPreciseApproval } from './approval.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateRelativeLayoutNodes } = require('../../../app-ui-layout/scripts/relative-layout-policy.cjs');

/** 拒绝缺失设备信息，以实际项目约束限定布局与资源。 */
function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`ESP32 ${name} 必须为非空字符串`);
}

/** 要求两份记录指向同一已验证文件，避免阶段中途更换设备或材料。 */
function sameRef(repo, actual, expected, label, identity) {
  if (identity(repo, actual, label) !== identity(repo, expected, label) || actual.sha256 !== expected.sha256) throw new WorkflowError(`ESP32 ${label} 未绑定当前文件`);
}

/** 验证设备资料和版本；这些事实描述目标，不等于已经进行硬件测试。 */
function readBoard(repo, doc, identity) {
  const board = readJson(repo, identity(repo, doc.boardProfileRef, 'ESP32 设备配置'), 'ESP32 设备配置');
  for (const [key, value] of Object.entries({ chip: board.chip, board: board.board, colorFormat: board.screen?.colorFormat, sdk: board.sdk?.name, sdkVersion: board.sdk?.version, gui: board.gui?.name, guiVersion: board.gui?.version })) text(value, key);
  for (const key of ['width', 'height']) if (!Number.isSafeInteger(board.screen?.[key]) || board.screen[key] < 1) throw new WorkflowError(`ESP32 屏幕 ${key} 必须是正整数`);
  return board;
}

/** 检查页面布局树的真实几何、父子关系和确认来源。 */
function readLayout(repo, work, doc, board, identity) {
  const layout = readJson(repo, identity(repo, doc.layoutSpecRef, 'ESP32 布局规格'), 'ESP32 布局规格');
  if (layout.schemaVersion !== '1.0' || layout.objectId !== work.visual.objectId) throw new WorkflowError('ESP32 布局规格未绑定当前对象');
  sameRef(repo, layout.boardProfileRef, doc.boardProfileRef, '布局设备配置', identity);
  if (layout.screen?.width !== board.screen.width || layout.screen?.height !== board.screen.height) throw new WorkflowError('ESP32 布局分辨率与设备配置不一致');
  // 布局确认只冻结正式源的位置，当前版本由工作项独立留存的快照承载。
  const source = requireFile(repo, layout.sourcePath, 'ESP32 正式布局源');
  const snapshot = identity(repo, doc.layoutSourceRef, 'ESP32 正式布局源快照');
  if (repoPath(repo, source).relative === repoPath(repo, snapshot).relative) throw new WorkflowError('ESP32 正式布局源快照不能指向可变的正式源文件');
  sameRef(repo, layout.decompositionRef, work.visual.reviews?.V3Decomposition, '拆解确认', identity);
  if (!Array.isArray(layout.nodes) || !layout.nodes.length) throw new WorkflowError('ESP32 布局节点不能为空');
  const nodes = new Map();
  for (const node of layout.nodes) {
    text(node?.id, '布局节点 id');
    if (nodes.has(node.id)) throw new WorkflowError('ESP32 布局节点 id 重复');
    for (const key of ['x', 'y', 'width', 'height']) if (!Number.isSafeInteger(node[key]) || (['width', 'height'].includes(key) && node[key] < 1)) throw new WorkflowError(`ESP32 布局节点 ${key} 无效`);
    nodes.set(node.id, node);
  }
  const root = nodes.get(layout.rootId);
  if (!root || root.parentId !== null || root.x !== 0 || root.y !== 0 || root.width !== board.screen.width || root.height !== board.screen.height) throw new WorkflowError('ESP32 布局根节点与屏幕几何不一致');
  if (nodes.has('viewport')) throw new WorkflowError('ESP32 viewport 是固定稳定根，不能作为实际节点声明');
  if (!Array.isArray(root.references) || root.references.length !== 1 || root.references[0] !== 'viewport') throw new WorkflowError('ESP32 屏幕根必须引用固定 viewport');
  for (const node of nodes.values()) {
    if (node === root) continue;
    const seen = new Set([node.id]);
    let current = node;
    // 父链必须唯一汇入当前根，既排除循环，也排除脱离页面的孤立节点。
    while (current !== root) {
      if (typeof current.parentId !== 'string' || !nodes.has(current.parentId) || seen.has(current.parentId)) throw new WorkflowError('ESP32 布局父子关系无效');
      seen.add(current.parentId);
      current = nodes.get(current.parentId);
    }
  }
  const bodies = [...nodes.values()].filter((node) => node.floatingKind != null);
  if (work.workItemType === 'PAGE' && bodies.length) throw new WorkflowError('ESP32 PAGE 不能声明浮层本体');
  if (work.workItemType === 'DISPLAY_LAYER') {
    const expectedKind = work.visual.layerType === 'toast' ? 'toast' : 'popup';
    if (bodies.length !== 1 || bodies[0].id !== work.visual.objectId || bodies[0].floatingKind !== expectedKind || bodies[0].parentId !== root.id) throw new WorkflowError('ESP32 显示层必须绑定当前对象对应的唯一浮层本体及屏幕父级');
  }
  // 共用唯一相对布局规则，稳定根由适配器固定，不能由工件自行增加。
  const mapped = [...nodes.values()].map((node) => ({ id: node.id, parentId: node === root ? 'viewport' : node.parentId, mode: node.positioning, references: node.references, floatingKind: node.floatingKind ?? null }));
  const errors = validateRelativeLayoutNodes(mapped, { roots: ['viewport'], label: 'ESP32 布局' });
  if (errors.length) throw new WorkflowError(`ESP32 相对布局合同失败：${errors.join('；')}`);
  return layout;
}

/** 核对资源源文件、设备可用产物和注册材料及声明的 Flash 预算。 */
function readAssets(repo, work, doc, identity) {
  const assets = readJson(repo, identity(repo, doc.assetManifestRef, 'ESP32 资源清单'), 'ESP32 资源清单');
  if (assets.schemaVersion !== '1.0' || assets.objectId !== work.visual.objectId) throw new WorkflowError('ESP32 资源清单未绑定当前对象');
  sameRef(repo, assets.boardProfileRef, doc.boardProfileRef, '资源设备配置', identity);
  sameRef(repo, assets.layoutSpecRef, doc.layoutSpecRef, '资源布局规格', identity);
  if (!Array.isArray(assets.items)) throw new WorkflowError('ESP32 资源清单缺少 items');
  if (!Number.isSafeInteger(assets.budgetFlashBytes) || assets.budgetFlashBytes < 0) throw new WorkflowError('ESP32 Flash 预算无效');
  if (!assets.items.length) text(assets.nativeOnlyReason, '无外部资源原因');
  const ids = new Set();
  let total = 0;
  for (const item of assets.items) {
    text(item?.id, '资源 id');
    if (ids.has(item.id)) throw new WorkflowError('ESP32 资源 id 重复');
    ids.add(item.id);
    for (const key of ['sourceRef', 'generatedRef', 'registrationRef']) identity(repo, item[key], `ESP32 资源 ${item.id} ${key}`);
    if (!Number.isSafeInteger(item.flashBytes) || item.flashBytes < 0) throw new WorkflowError('ESP32 资源大小无效');
    total += item.flashBytes;
    if (!Number.isSafeInteger(total) || total > assets.budgetFlashBytes) throw new WorkflowError('ESP32 资源超出 Flash 预算');
  }
}

/** 显示层每次人工确认必须对应实际宿主，不能从另一页面迁移。 */
function checkLayerReviews(repo, work, stage, identity) {
  const names = ['V2', ...(stage !== 'V2' ? ['V3Decomposition', 'V3Layout'] : []), ...(['V4', 'V5'].includes(stage) ? ['V4'] : []), ...(stage === 'V5' ? ['V5'] : [])];
  for (const name of names) {
    const review = readJson(repo, identity(repo, work.visual.reviews?.[name], `ESP32 ${name} 显示层确认`), `ESP32 ${name} 显示层确认`);
    if (review.hostId !== work.visual.hostId || review.layerType !== work.visual.layerType) throw new WorkflowError(`ESP32 ${name} 显示层确认未绑定当前宿主或层类型`);
  }
}

/** 逐阶段绑定已确认文件，阻止连同引用一起替换材料而沿用旧决定。 */
function checkConfirmedRef(repo, work, reviewName, field, expected, identity) {
  const review = readJson(repo, identity(repo, work.visual.reviews?.[reviewName], `ESP32 ${reviewName} 用户确认`), `ESP32 ${reviewName} 用户确认`);
  sameRef(repo, review[field], expected, `${reviewName} 确认 ${field}`, identity);
}

/** 核对真实运行上下文及审批引用；主机模拟不表示硬件运行通过。 */
async function checkRuntime(repo, work, doc, identity) {
  const runtime = readJson(repo, identity(repo, doc.runtimeContextRef, 'ESP32 运行上下文'), 'ESP32 运行上下文');
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId })) {
    if (runtime[key] !== expected) throw new WorkflowError(`ESP32 运行上下文 ${key} 未绑定当前对象`);
  }
  for (const key of ['boardProfileRef', 'layoutSpecRef', 'layoutSourceRef', 'assetManifestRef']) sameRef(repo, runtime[key], doc[key], `运行上下文 ${key}`, identity);
  if (!['host-simulator', 'device'].includes(runtime.environment)) throw new WorkflowError('ESP32 运行环境必须是 host-simulator 或 device');
  const build = readJson(repo, identity(repo, runtime.buildIdentityRef, 'ESP32 构建身份'), 'ESP32 构建身份');
  if (build.schemaVersion !== '1.0') throw new WorkflowError('ESP32 构建身份 schemaVersion 必须为 1.0');
  text(build.sourceRevision, '构建源码版本');
  for (const key of ['boardProfileRef', 'layoutSpecRef', 'layoutSourceRef', 'assetManifestRef']) sameRef(repo, build[key], doc[key], `构建身份 ${key}`, identity);
  for (const key of ['binaryRef', 'buildLogRef']) identity(repo, build[key], `ESP32 构建 ${key}`);
  for (const key of ['runEvidenceRef', 'interactionEvidenceRef', 'performanceEvidenceRef']) identity(repo, runtime[key], `ESP32 运行 ${key}`);
  if (runtime.environment === 'device') {
    // 复用控制器已有精确批准语义，日志和本地 JSON 不构成执行授权。
    if (!work.action?.effects?.includes('device') || !hasPreciseApproval(work) || runtime.deviceTarget !== work.action.target || runtime.approvalUserMessageRef !== work.action.approval?.userMessageRef) throw new WorkflowError('ESP32 设备运行缺少当前目标的明确 device 授权');
  }
  const review = readJson(repo, identity(repo, work.visual.reviews?.V5, 'ESP32 V5 用户确认'), 'ESP32 V5 用户确认');
  sameRef(repo, review.runtimeContextRef, doc.runtimeContextRef, 'V5 用户确认运行上下文', identity);
  if (work.workItemType !== 'DISPLAY_LAYER') return;
  if (runtime.hostId !== work.visual.hostId || runtime.layerType !== work.visual.layerType) throw new WorkflowError('ESP32 运行上下文未绑定显示层宿主或类型');
  for (const action of ['open', 'close', 'focus-restore']) {
    const items = Array.isArray(runtime.interactions) ? runtime.interactions.filter((item) => item?.action === action) : [];
    if (items.length !== 1) throw new WorkflowError(`ESP32 运行上下文缺少唯一的 ${action} 记录`);
    if (items[0].status === 'PASS') identity(repo, items[0].evidenceRef, `ESP32 ${action} 证据`);
    else if (items[0].status !== 'NOT_APPLICABLE' || typeof items[0].reason !== 'string' || !items[0].reason.trim()) throw new WorkflowError(`ESP32 ${action} 须提供通过证据或不适用原因`);
  }
}

/** 连接 ESP32 单对象阶段输入；公共门禁继续负责用户确认与阶段迁移。 */
export async function validateEsp32(repo, work, stage, doc, identity) {
  if (!['PAGE', 'DISPLAY_LAYER'].includes(work.workItemType)) throw new WorkflowError('ESP32 单目标领域合同仅适用于 PAGE 或 DISPLAY_LAYER');
  const board = readBoard(repo, doc, identity);
  checkConfirmedRef(repo, work, 'V2', 'boardProfileRef', doc.boardProfileRef, identity);
  if (work.workItemType === 'DISPLAY_LAYER') checkLayerReviews(repo, work, stage, identity);
  if (stage === 'V2') return;
  readLayout(repo, work, doc, board, identity);
  checkConfirmedRef(repo, work, 'V3Layout', 'layoutSpecRef', doc.layoutSpecRef, identity);
  if (stage === 'V3') return;
  readAssets(repo, work, doc, identity);
  checkConfirmedRef(repo, work, 'V4', 'assetManifestRef', doc.assetManifestRef, identity);
  if (stage === 'V5') await checkRuntime(repo, work, doc, identity);
}
