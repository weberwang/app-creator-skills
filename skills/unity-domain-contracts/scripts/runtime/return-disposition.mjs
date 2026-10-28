/** 根据真实影响范围确定恢复入口，避免调用者选择过晚的状态绕过上游门。 */
import { fail, STATES, stringArray, knownObject } from './control-primitives.mjs';
import { isValidIsoTimestamp } from './timestamp-contract.mjs';
import { resolve } from 'node:path';

/** 恢复点的先后顺序与影响范围映射。 */
const ORDER = ['BASELINE', 'PROPOSAL', 'REVIEW', 'IMPLEMENTING'];
const STAGE_TARGET = Object.freeze({
  'requirements-scope': 'BASELINE', 'global-baseline': 'BASELINE',
  'foundation-engineering': 'IMPLEMENTING', 'scene-production': 'PROPOSAL',
  'global-integration-validation': 'IMPLEMENTING', release: 'REVIEW',
  V0: 'PROPOSAL', V1: 'IMPLEMENTING', V2: 'PROPOSAL', V3: 'REVIEW', V4: 'IMPLEMENTING', V5: 'IMPLEMENTING',
});

/** 严格解析影响范围；未知范围不能被当成可以安全继续的局部修复。 */
export function deriveReturnState(affectedScope) {
  const scopes = stringArray(affectedScope, 'returnRecord.affectedScope', true);
  if (new Set(scopes).size !== scopes.length) fail('affectedScope 不得重复');
  const targets = scopes.map((scope) => {
    const match = /^(stage|scene|artifact):([^\s*?]+)$/.exec(scope);
    if (!match || match[2].includes('\\') || match[2].split('/').some((part) => !part || part === '.' || part === '..')) fail(`affectedScope 必须使用明确的 stage:/scene:/artifact: 范围：${scope}`);
    if (match[1] === 'stage') {
      if (!STAGE_TARGET[match[2]]) fail(`未知阶段影响范围：${scope}`);
      return STAGE_TARGET[match[2]];
    }
    return match[1] === 'scene' ? 'PROPOSAL' : 'IMPLEMENTING';
  });
  return ORDER[Math.min(...targets.map((target) => ORDER.indexOf(target)))];
}

/** 构造可审计的 RETURN 记录；恢复点仅由影响范围派生。 */
export function createReturnRecord(work, args) {
  if (args['return-state'] !== undefined || args.returnState !== undefined) fail('RETURN 恢复点由 affectedScope 推导，不能指定 return-state');
  const raw = args['affected-scope'] ?? args.scope;
  const affectedScope = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const record = {
    classification: String(args['return-category'] ?? args.classification ?? ''),
    reason: String(args['return-reason'] ?? args.reason ?? ''), affectedScope,
    fromState: work.globalState, toState: 'RETURN', returnState: deriveReturnState(affectedScope),
    invalidatedArtifacts: ['implementationPackage', 'executionState', 'evidenceManifest', 'approval'],
    invalidatedReferences: {
      implementationPackagePath: work.implementationPackagePath ?? work.implementationPackage ?? null,
      evidenceManifestPath: work.evidenceManifestPath ?? work.evidenceManifest ?? null,
      packageId: null, evidenceId: null, planVersion: null,
    },
    priorInvalidatedReferences: work.returnRecord ? [...(work.returnRecord.priorInvalidatedReferences ?? []), work.returnRecord.invalidatedReferences] : [],
    recordedAt: new Date().toISOString(), resolvedAt: null,
  };
  validateReturnRecord(record);
  return record;
}

/** 复核持久化恢复点及完整失效声明，拒绝手写一个更晚的出口。 */
export function validateReturnRecord(record, label = 'returnRecord') {
  knownObject(record, new Set(['classification', 'reason', 'affectedScope', 'fromState', 'toState', 'returnState', 'invalidatedArtifacts', 'invalidatedReferences', 'priorInvalidatedReferences', 'recordedAt', 'resolvedAt']), label);
  if (!['upstream-fact-invalidated', 'scope-changed', 'hard-gate-would-be-bypassed'].includes(record.classification) || !record.reason?.trim()) fail(`${label} 必须提供有效分类和理由`);
  if (!STATES.includes(record.fromState) || record.toState !== 'RETURN') fail(`${label} 状态不合法`);
  if (record.returnState !== deriveReturnState(record.affectedScope)) fail(`${label}.returnState 与影响范围推导不一致`);
  const invalidated = stringArray(record.invalidatedArtifacts, `${label}.invalidatedArtifacts`, true);
  if (invalidated.length !== 4 || new Set(invalidated).size !== 4 || ['implementationPackage', 'executionState', 'evidenceManifest', 'approval'].some((key) => !invalidated.includes(key))) fail(`${label} 缺少完整失效声明`);
  validateInvalidatedReferences(record.invalidatedReferences, `${label}.invalidatedReferences`);
  if (record.priorInvalidatedReferences !== undefined) {
    if (!Array.isArray(record.priorInvalidatedReferences)) fail(`${label}.priorInvalidatedReferences 必须为数组`);
    record.priorInvalidatedReferences.forEach((entry, index) => validateInvalidatedReferences(entry, `${label}.priorInvalidatedReferences[${index}]`));
  }
  if (!isValidIsoTimestamp(record.recordedAt) || record.resolvedAt !== null && !isValidIsoTimestamp(record.resolvedAt)) fail(`${label} 必须记录有效时间`);
  return record;
}

/** 每次退回的失效快照具有相同结构，历次失效记录不能因再次退回而丢失。 */
function validateInvalidatedReferences(value, label) {
  const fields = ['implementationPackagePath', 'evidenceManifestPath', 'packageId', 'evidenceId', 'planVersion'];
  knownObject(value, new Set(fields), label);
  if (fields.some((key) => value[key] !== null && (typeof value[key] !== 'string' || !value[key].trim()))) fail(`${label} 必须记录失效引用身份或明确的 null`);
}

/** 无论恢复是否已经结束，都禁止后续重新绑定历次被 RETURN 撤销的路径或身份。 */
export function assertActiveReferences(work, { repo = '.', pkg, evidence, packagePath, evidencePath } = {}) {
  if (!work.returnRecord) return;
  const snapshots = [...(work.returnRecord.priorInvalidatedReferences ?? []), work.returnRecord.invalidatedReferences];
  for (const entry of snapshots) {
    const samePath = (candidate, previous) => candidate && previous && resolve(repo, candidate) === resolve(repo, previous);
    if (samePath(packagePath, entry.implementationPackagePath) || pkg && entry.packageId && pkg.packageId === entry.packageId) fail('不能复用 RETURN 已失效的 Implementation Package 路径或身份');
    if (samePath(evidencePath, entry.evidenceManifestPath) || evidence && entry.evidenceId && evidence.evidenceId === entry.evidenceId) fail('不能复用 RETURN 已失效的 Evidence Manifest 路径或身份');
  }
}

/** 根据影响范围计算确认失效边界，不能以当前阶段截断失效边界。 */
function firstAffectedVisualStage(work, record) {
  const current = work.workItemType === 'SCENE' ? work.scene?.stage : work.workItemType === 'DISPLAY_LAYER' ? work.displayLayer?.stage : null;
  if (!current) return null;
  // 纯工程返修和明确的运行修复只撤销 V5，保留已有视觉决策。
  const runtimeOnly = record.affectedScope.every((scope) => scope.startsWith('artifact:') || scope === 'stage:V5');
  let first = runtimeOnly ? 5 : { BASELINE: 2, PROPOSAL: 2, REVIEW: 3, IMPLEMENTING: 4 }[record.returnState];
  if (record.returnState === 'IMPLEMENTING' && current === 'V5' && !record.affectedScope.some((scope) => ['stage:V4', 'stage:foundation-engineering'].includes(scope))) first = 5;
  // 显式影响阶段必须优先于笼统恢复状态，功能变化应回到 V1。
  for (const scope of record.affectedScope) {
    const match = /^stage:V([0-5])$/.exec(scope);
    if (match) first = Math.min(first, Number(match[1]));
  }
  return first;
}

/** 只撤销真实受影响阶段的确认；工程返修保留 V2–V4 确认。 */
export function invalidateStageReviews(work, record) {
  const first = firstAffectedVisualStage(work, record);
  if (first === null) return work.stageReviews ?? [];
  return (work.stageReviews ?? []).filter((review) => Number(review.stage.slice(1)) < first);
}

/** 退回只提前或保持当前阶段，失效边界独立于恢复后的阶段。 */
export function deriveReturnVisualStage(work, record) {
  const current = work.workItemType === 'SCENE' ? work.scene?.stage : work.workItemType === 'DISPLAY_LAYER' ? work.displayLayer?.stage : null;
  const first = firstAffectedVisualStage(work, record);
  if (first === null) return null;
  return `V${Math.min(Number(current.slice(1)), first)}`;
}
