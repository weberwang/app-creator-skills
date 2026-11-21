import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { validateMultiVisualStage } from './multi-visual-contract.mjs';

const HUD_FIELDS = new Set(['scopeIds', 'globalVisualBaselineRef', 'targets', 'coverageRef', 'integrationEvidenceRef']);
const REVIEW_NAMES = ['V2', 'V3Decomposition', 'V3Layout', 'V4'];

/** HUD 身份只属于真实三维场景，错误记录不能靠可选字段被忽略。 */
function insist(condition, message) {
  if (!condition) throw new WorkflowError(`三维场景 HUD：${message}`);
}

/** 绑定同一项目内文件和内容摘要，并拒绝已作废版本。 */
function frozenFile(repo, work, ref, label) {
  insist(ref && typeof ref === 'object' && typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256 ?? ''), `${label} 必须包含路径及 SHA-256`);
  const path = repoPath(repo, ref.path, label).relative;
  insist(path === ref.path, `${label} 路径不规范`);
  const key = fileIdentityKey(repo, path);
  insist(!work.invalidatedRefs?.some((item) => item?.path && fileIdentityKey(repo, item.path) === key), `${label} 引用了已作废记录`);
  requireFile(repo, path, label);
  const bytes = readFileSync(repoPath(repo, path).absolute);
  insist(bytes.length > 0 && createHash('sha256').update(bytes).digest('hex') === ref.sha256, `${label} 为空或内容已变化`);
  return path;
}

/** 校验显式声明的 HUD 范围及引用形状；是否真的覆盖场景仍由设计者负责。 */
export function validateWorldHudShape(work, { repo } = {}) {
  const hud = work?.visual?.hud;
  if (hud === undefined) return;
  insist(work.workItemType === 'SCENE' && work.visual.designRoute === 'world-3d', '仅 world-3d 场景可声明 HUD 容器');
  insist(hud && typeof hud === 'object' && !Array.isArray(hud), 'hud 必须为对象');
  for (const name of Object.keys(hud)) insist(HUD_FIELDS.has(name), `不支持字段 ${name}`);
  insist(Array.isArray(hud.scopeIds) && hud.scopeIds.length > 0 && hud.scopeIds.every((id) => typeof id === 'string' && id.trim()) && new Set(hud.scopeIds).size === hud.scopeIds.length, 'scopeIds 必须是非空且唯一的范围身份');
  insist(hud.targets === undefined || Array.isArray(hud.targets), 'targets 必须为数组');
  const ids = new Set();
  for (const target of hud.targets ?? []) {
    insist(target && typeof target === 'object' && !Array.isArray(target) && typeof target.targetId === 'string' && target.targetId.trim() && !ids.has(target.targetId), 'HUD 目标身份必须非空且唯一');
    ids.add(target.targetId);
    if (target.sceneId !== undefined) insist(target.sceneId === work.visual.objectId, '目标必须绑定同一宿主场景');
  }
  const refs = [hud.globalVisualBaselineRef, hud.coverageRef, hud.integrationEvidenceRef].map((ref) => ({ ref, digest: true }));
  for (const target of hud.targets ?? []) {
    refs.push(...[target.referenceTarget, target.assetReviewRef, ...Object.values(target.reviews ?? {})].map((ref) => ({ ref, digest: true })));
    // 原图片领域合同是路径引用；其身份和内容由原生校验器继续负责。
    refs.push({ ref: target.domainEvidenceRef, digest: false });
  }
  for (const { ref, digest } of refs.filter((entry) => entry.ref != null)) {
    insist(typeof ref.path === 'string' && (!digest || /^[a-f0-9]{64}$/.test(ref.sha256 ?? '')), 'HUD 引用路径或 SHA-256 无效');
    if (repo) {
      const path = repoPath(repo, ref.path, 'HUD 引用').relative;
      insist(path === ref.path, 'HUD 引用路径不规范');
      insist(!work.invalidatedRefs?.some((item) => item?.path && fileIdentityKey(repo, item.path) === fileIdentityKey(repo, path)), 'HUD 不得重新绑定已作废引用');
    }
  }
}

/** V1 功能基线冻结是否有 HUD 及本批范围，后续改动不能改标为无界面。 */
export function assertFrozenWorldHud(work, snapshot) {
  if (work?.visual?.designRoute !== 'world-3d') return;
  const before = snapshot?.work?.visual?.hud;
  const current = work.visual.hud;
  insist(Boolean(before) === Boolean(current), 'HUD 是否存在已变化，必须返回 V1');
  if (!current) return;
  validateWorldHudShape(work);
  const previous = before.scopeIds;
  insist(Array.isArray(previous) && new Set(previous).size === previous.length && JSON.stringify([...previous].sort()) === JSON.stringify([...current.scopeIds].sort()), 'HUD 范围已变化，必须返回 V1');
}

/** 为现有 V4 归档记录精确 HUD 目标及其已验收资产，不创建另一个状态机。 */
export function captureWorldHudAssets(work) {
  const hud = work?.visual?.hud;
  if (!hud) return null;
  validateWorldHudShape(work);
  insist(Array.isArray(hud.targets) && hud.targets.length, 'V4 缺少 HUD 目标');
  // 固定属性顺序和 Windows 路径大小写，避免等价引用仅因 JSON 排列触发返工。
  const ref = (value) => value ? { path: process.platform === 'win32' ? value.path.toLowerCase() : value.path, sha256: value.sha256 } : null;
  return {
    scopeIds: [...hud.scopeIds].sort(),
    globalVisualBaselineRef: ref(hud.globalVisualBaselineRef),
    coverageRef: ref(hud.coverageRef),
    targets: hud.targets.map((target) => ({
      targetId: target.targetId, candidateId: target.candidateId, sceneId: target.sceneId,
      stateId: target.stateId, scope: target.scope, viewport: { width: target.viewport?.width, height: target.viewport?.height },
      referenceTarget: ref(target.referenceTarget),
      reviews: Object.fromEntries(REVIEW_NAMES.map((name) => [name, ref(target.reviews?.[name])])),
      assetReviewRef: ref(target.assetReviewRef),
    })).sort((a, b) => a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0),
  };
}

/** V5 不允许替换成未经过本场景 V4 工程闭环的 HUD 目标或资源。 */
function assertHudArchive(repo, work) {
  const path = frozenFile(repo, work, work.visual.modelBaselineRef, 'V4 场景归档');
  const archive = readJson(repo, path, 'V4 场景归档');
  insist(archive.visualStage === 'V4' && archive.world3dModelBaseline?.workItemId === work.workItemId && archive.world3dModelBaseline?.objectId === work.visual.objectId, 'HUD 归档与场景身份不一致');
  insist(JSON.stringify(archive.world3dHudAssets) === JSON.stringify(captureWorldHudAssets(work)), 'HUD 目标或资源已变化，必须返回 V4');
}

/** 在同一 SCENE 下复用原图片目标合同；工程包与领域回调始终接收真实 3D 工作项。 */
export function validateWorldHud(repo, work, stage, { validateGlobalBaseline, validateDomainTarget, validateAssetReview, manifest, visualCategories } = {}) {
  validateWorldHudShape(work, { repo });
  const hud = work.visual.hud;
  if (!hud) return null;
  insist(work.visual.stage === stage && ['V2', 'V3', 'V4', 'V5'].includes(stage), 'HUD 阶段与场景当前阶段不一致');
  insist(typeof validateGlobalBaseline === 'function' && typeof validateDomainTarget === 'function' && typeof validateAssetReview === 'function', '缺少真实图片、领域或资源校验器');
  frozenFile(repo, work, hud.globalVisualBaselineRef, 'HUD 图片基线');
  // 只读投影供原图片基线/多目标合约使用，不允许它替代工作项身份及工程证据。
  const imageWork = { ...work, globalVisualBaselineRef: hud.globalVisualBaselineRef, visual: { ...work.visual, designRoute: 'game-ui', targets: hud.targets, coverageRef: hud.coverageRef, integrationEvidenceRef: hud.integrationEvidenceRef } };
  validateGlobalBaseline(repo, imageWork, { required: true });
  if (stage === 'V5') assertHudArchive(repo, work);
  return validateMultiVisualStage(repo, imageWork, stage, {
    validateDomainTarget: (_root, _projected, target, phase) => validateDomainTarget(repo, work, target, phase),
    validateAssetReview: (_root, _projected, target) => {
      const record = validateAssetReview(repo, work, target);
      insist(!record?.assets?.some((asset) => asset.assetType === 'model'), 'HUD 资源评审不能代替世界模型评审');
      return record;
    },
    manifest, visualCategories,
  });
}

/** 判断当前 RETURN 是否仅影响常驻 HUD，用于复用仍有效的世界模型归档。 */
export function isWorldHudReturn(work) {
  return work?.visual?.designRoute === 'world-3d' && /^hud:V[2-5]$/i.test(work.returnRecord?.affectedScope ?? '');
}

/** 按最早受影响阶段撤销 HUD 确认；世界空间、方向和模型确认保持原有依据。 */
export function invalidateWorldHud(repo, work, invalidatedRefs, stage) {
  const hud = work.visual?.hud;
  if (!hud) throw new WorkflowError('当前 3D 场景没有可返修的 HUD');
  const index = Number(stage.slice(1));
  if (index < 2) return;
  const order = { V2: 2, V3Decomposition: 3, V3Layout: 3, V4: 4, V5: 5 };
  /** 保留原始源文件，避免未受影响资源因局部返修被重新制作。 */
  function mark(ref, affected) {
    if (!ref?.path) return;
    const path = repoPath(repo, ref.path, 'HUD 失效引用').relative;
    if (!invalidatedRefs.some((item) => fileIdentityKey(repo, item.path) === fileIdentityKey(repo, path))) invalidatedRefs.push({ path, state: affected });
  }
  for (const target of hud.targets ?? []) {
    for (const [name, ref] of Object.entries(target.reviews ?? {})) if (order[name] >= index) { mark(ref, name); delete target.reviews[name]; }
    if (index <= 4 && target.assetReviewRef) { mark(target.assetReviewRef, 'V4'); delete target.assetReviewRef; }
  }
  if (index <= 2 && hud.coverageRef) { mark(hud.coverageRef, 'V2'); delete hud.coverageRef; }
  if (hud.integrationEvidenceRef) { mark(hud.integrationEvidenceRef, 'V5'); delete hud.integrationEvidenceRef; }
}

/** 深入 HUD 控制记录引用，避免输出或原始证据覆盖目标、资产及真实人工决定。 */
export function collectWorldHudReferences(repo, work) {
  const hud = work?.visual?.hud;
  if (!hud) return [];
  const controls = new Set(['globalVisualBaselineRef', 'coverageRef', 'integrationEvidenceRef', 'domainEvidenceRef', 'assetReviewRef', 'selectionReviewRef', ...REVIEW_NAMES, 'V5']);
  const stringPaths = new Set(['sourceRef', 'output', 'generationRecord', 'evidenceRef', 'targetRef', 'componentEvidenceRef']);
  const found = new Map();
  const scanned = new Set();
  const pending = [{ value: hud, key: '' }];
  let examined = 0;
  while (pending.length) {
    insist(++examined <= 100000, '引用结构过大');
    const { value, key } = pending.pop();
    if (typeof value === 'string' && stringPaths.has(key)) {
      try { const path = repoPath(repo, value).relative; found.set(fileIdentityKey(repo, path), path); } catch { /* 历史 RETURN 不被损坏引用阻断。 */ }
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    if (typeof value.path === 'string') {
      try {
        const path = repoPath(repo, value.path).relative;
        const id = fileIdentityKey(repo, path);
        found.set(id, path);
        if (controls.has(key) && !scanned.has(id)) {
          scanned.add(id);
          const absolute = repoPath(repo, path).absolute;
          if (existsSync(absolute)) {
            const stat = lstatSync(absolute);
            if (stat.isFile()) {
              insist(stat.size <= 5 * 1024 * 1024, '控制记录超过安全读取上限');
              try { pending.push({ value: JSON.parse(readFileSync(absolute, 'utf8')), key: '' }); } catch { /* 当前阶段仍会拒绝无效记录。 */ }
            }
          }
        }
      } catch (error) {
        if (error instanceof WorkflowError && /控制记录超过安全读取上限/.test(error.message)) throw error;
      }
    }
    for (const [name, child] of Object.entries(value)) if (name !== 'path') pending.push({ value: child, key: name });
  }
  return [...found.values()];
}
