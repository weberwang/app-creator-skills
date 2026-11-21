import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { fileIdentityKey, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 读取实际冻结字节，防止阶段推进后替换已确认的风险或模型规格。 */
function frozenJson(repo, work, ref, label) {
  if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}必须绑定路径和 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  if (path !== ref.path) throw new WorkflowError(`${label}路径不规范`);
  const key = fileIdentityKey(repo, path);
  if (work.invalidatedRefs?.some((item) => item?.path && fileIdentityKey(repo, item.path) === key)) throw new WorkflowError(`${label}已作废`);
  const absolute = repoPath(repo, path).absolute;
  if (statSync(absolute).size > 5 * 1024 * 1024) throw new WorkflowError(`${label}过大`);
  const bytes = readFileSync(absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label}为空或内容已变化`);
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid object');
    return value;
  } catch {
    throw new WorkflowError(`${label}必须为有效 JSON 对象`);
  }
}

/** 仅接受同一项目文件的同一摘要，避免用不同路径的近似内容重绑规格。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256 && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 读取同一场景及候选的冻结 V3 合同，供模型生产与 HUD 返修使用。 */
function readWorld3DProductionBasis(repo, work) {
  const archive = frozenJson(repo, work, work.visual?.modelProductionBasisRef, 'V3 模型生产基线');
  const basis = archive.world3dModelProductionBasis;
  if (archive.visualStage !== 'V3' || !basis || typeof basis !== 'object' || Array.isArray(basis)) throw new WorkflowError('V3 模型生产基线不是有效的阶段归档');
  const expected = { workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, objectId: work.visual.objectId, candidateId: work.visual.candidateId };
  for (const [field, value] of Object.entries(expected)) if (basis[field] !== value) throw new WorkflowError(`V3 模型生产基线 ${field} 身份错绑`);
  const previous = frozenJson(repo, work, basis.domainEvidenceRef, 'V3 场景领域合同');
  for (const [field, value] of Object.entries(expected)) if (previous[field] !== value) throw new WorkflowError(`V3 场景领域合同 ${field} 身份错绑`);
  if (previous.schemaVersion !== '1.0' || previous.designRoute !== 'world-3d' || previous.stage !== 'V3') throw new WorkflowError('V3 模型生产基线未绑定有效场景合同');
  return previous;
}

/** HUD 可重做上下文预览，空间、白模与世界方向仍须引用已用于模型生产的依据。 */
export function assertWorld3DSpaceForHudReturn(repo, work, contract) {
  const previous = readWorld3DProductionBasis(repo, work);
  for (const field of ['spatialSpecRef', 'blockoutRef', 'blockoutRunRef', 'reviewRef', 'spaceApprovalRef', 'directionRef', 'directionApprovalRef']) {
    if (previous[field] === undefined && contract[field] === undefined) continue;
    if (!sameRef(repo, previous[field], contract[field])) throw new WorkflowError(`仅 HUD 返修须保留三维空间依据 ${field}；变更时须返回普通 V2`);
  }
  if (!Array.isArray(previous.scopeIds) || !Array.isArray(contract.scopeIds)
    || JSON.stringify([...previous.scopeIds].sort()) !== JSON.stringify([...contract.scopeIds].sort())) {
    throw new WorkflowError('仅 HUD 返修须保留三维空间范围；变更时须返回普通 V2');
  }
}

/** 检查 V3 已确认的生产风险及模型规格在 V4 保持一致。 */
export function assertWorld3DModelProductionBasis(repo, work, contract) {
  const previous = readWorld3DProductionBasis(repo, work);
  if (!['low', 'high'].includes(previous.productionRisk) || previous.productionRisk !== contract.productionRisk) throw new WorkflowError('V4 生产风险与 V3 模型生产基线不一致');
  if (!sameRef(repo, previous.modelSpecRef, contract.modelSpecRef)) throw new WorkflowError('V4 模型规格与 V3 模型生产基线不一致');
}
