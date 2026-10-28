import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 核对项目内文件的冻结内容，避免正式组合或功能基线变化后沿用旧回归。 */
function verifyIdentity(repo, ref, label) {
  if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}必须提供路径和小写 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label}内容已变化，必须重新验证最终集成`);
  return path;
}

/** 比较已经按项目边界解析的文件引用及内容身份。 */
function sameIdentity(repo, left, right) {
  if (!left || !right || typeof left.path !== 'string' || typeof right.path !== 'string' || left.sha256 !== right.sha256) return false;
  const normalize = (path) => {
    const value = repoPath(repo, path, '最终集成文件身份').relative;
    return process.platform === 'win32' ? value.toLowerCase() : value;
  };
  return normalize(left.path) === normalize(right.path);
}

/** 提前冻结最终集成范围，避免执行后由结果自行缩减对象或行为。 */
export function validateIntegrationScope(repo, work) {
  if (work?.workItemType !== 'INTEGRATION') return null;
  if (!['feature', 'final'].includes(work.integrationPurpose)) throw new WorkflowError('集成工作项必须明确用途：feature 或 final');
  if (work.integrationPurpose === 'feature') return null;
  const path = verifyIdentity(repo, work.integrationScopeRef, '最终集成范围');
  const scope = readJson(repo, path, '最终集成范围');
  if (scope.schemaVersion !== '1.0' || scope.workItemId !== work.workItemId || scope.projectId !== work.projectId || scope.stack !== work.stack) throw new WorkflowError('最终集成范围身份不匹配');
  if (!Array.isArray(scope.objects) || !scope.objects.length || !Array.isArray(scope.cases) || !scope.cases.length) throw new WorkflowError('最终集成范围必须列出对象和行为');
  const objectIds = new Set();
  for (const object of scope.objects) {
    if (!object || typeof object.objectId !== 'string' || !object.objectId.trim() || objectIds.has(object.objectId)) throw new WorkflowError('最终集成范围对象必须非空且唯一');
    const sourcePath = verifyIdentity(repo, object.workItemRef, `范围对象 ${object.objectId} 工作项`);
    const source = readJson(repo, sourcePath, '范围对象工作项');
    // 开始回归前冻结实际完成版本与功能基线，防止相同对象名换绑新实现。
    if (source.workItemId === work.workItemId || source.projectId !== work.projectId || source.stack !== work.stack || !['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(source.workItemType) || source.visual?.objectId !== object.objectId || source.visual?.stage !== 'V5' || source.globalState !== 'COMPLETE') throw new WorkflowError(`范围对象 ${object.objectId} 必须属于当前项目与技术栈并已完成 V5`);
    verifyIdentity(repo, object.functionBaselineRef, `范围对象 ${object.objectId} 功能基线`);
    if (!sameIdentity(repo, source.visual.functionBaselineRef, object.functionBaselineRef)) throw new WorkflowError(`范围对象 ${object.objectId} 功能基线未绑定当前版本`);
    objectIds.add(object.objectId);
  }
  const caseIds = new Set();
  const covered = new Set();
  for (const entry of scope.cases) {
    if (!entry || typeof entry.caseId !== 'string' || !entry.caseId.trim() || caseIds.has(entry.caseId) || !Array.isArray(entry.objectIds) || !entry.objectIds.length || new Set(entry.objectIds).size !== entry.objectIds.length || entry.objectIds.some((id) => !objectIds.has(id))) throw new WorkflowError('最终集成范围行为必须唯一并引用已登记对象');
    caseIds.add(entry.caseId);
    for (const id of entry.objectIds) covered.add(id);
  }
  if (covered.size !== objectIds.size) throw new WorkflowError('最终集成范围必须覆盖全部对象');
  return scope;
}

/** 仅在最终正式组合上要求完整覆盖；早期功能集成不能依赖显示对象 V5。 */
export function validateFinalIntegration(repo, work, inspectSource) {
  if (work?.workItemType !== 'INTEGRATION') return;
  const scope = validateIntegrationScope(repo, work);
  if (!scope) return;
  if (typeof inspectSource !== 'function') throw new WorkflowError('最终集成必须严格检查参与对象');
  const evidencePath = verifyIdentity(repo, work.integrationEvidenceRef, '最终集成回归证据');
  const evidence = readJson(repo, evidencePath, '最终集成回归证据');
  if (evidence.schemaVersion !== '1.0' || evidence.workItemId !== work.workItemId || evidence.projectId !== work.projectId || evidence.stack !== work.stack || evidence.status !== 'PASS') throw new WorkflowError('最终集成回归证据的工作项、项目、技术栈或状态不匹配');
  const manifest = readJson(repo, work.evidenceRef?.path, '最终集成 Evidence Manifest');
  const samePath = (value) => {
    const path = repoPath(repo, value, '最终集成证据路径').relative;
    return process.platform === 'win32' ? path.toLowerCase() : path;
  };
  if (manifest.schemaVersion !== '1.0' || manifest.workItemId !== work.workItemId || manifest.stack !== work.stack || !Array.isArray(manifest.items) || !manifest.items.some((item) => item?.status === 'PASS' && typeof item.path === 'string' && samePath(item.path) === samePath(evidencePath))) throw new WorkflowError('最终集成回归证据必须列入当前工作项 PASS 清单');
  if (!Array.isArray(evidence.objects) || !evidence.objects.length || !Array.isArray(evidence.cases) || !evidence.cases.length) throw new WorkflowError('最终集成必须列出参与对象和实际回归行为范围');
  // 范围来自实施前冻结的独立记录，而不是从本次结果反向推导。
  const expectedObjects = scope.objects.map((entry) => entry.objectId).sort();
  const resultObjects = evidence.objects.map((entry) => entry?.objectId).sort();
  if (JSON.stringify(resultObjects) !== JSON.stringify(expectedObjects)) throw new WorkflowError('最终集成结果对象与预先冻结的范围不一致');
  for (const expected of scope.objects) {
    const actual = evidence.objects.find((entry) => entry?.objectId === expected.objectId);
    if (!sameIdentity(repo, actual?.workItemRef, expected.workItemRef) || !sameIdentity(repo, actual?.functionBaselineRef, expected.functionBaselineRef)) throw new WorkflowError(`最终集成对象 ${expected.objectId} 工作项或功能基线与预先冻结的范围不一致`);
  }
  const expectedCases = scope.cases.map((entry) => entry.caseId).sort();
  const resultCases = evidence.cases.map((entry) => entry?.caseId).sort();
  if (JSON.stringify(resultCases) !== JSON.stringify(expectedCases)) throw new WorkflowError('最终集成结果行为与预先冻结的范围不一致');
  for (const expected of scope.cases) {
    const actual = evidence.cases.find((entry) => entry?.caseId === expected.caseId);
    if (!Array.isArray(actual?.objectIds) || JSON.stringify([...actual.objectIds].sort()) !== JSON.stringify([...expected.objectIds].sort())) throw new WorkflowError(`最终集成行为 ${expected.caseId} 覆盖与预先冻结的范围不一致`);
  }
  const objects = new Map();
  for (const entry of evidence.objects) {
    if (!entry || typeof entry.objectId !== 'string' || !entry.objectId.trim() || objects.has(entry.objectId)) throw new WorkflowError('最终集成对象标识必须非空且唯一');
    const source = readJson(repo, verifyIdentity(repo, entry.workItemRef, '参与对象工作项'), '参与对象工作项');
    if (source.workItemId === work.workItemId || source.projectId !== work.projectId || source.stack !== work.stack || !['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(source.workItemType) || source.visual?.objectId !== entry.objectId || source.visual?.stage !== 'V5' || source.globalState !== 'COMPLETE') throw new WorkflowError(`参与对象 ${entry.objectId} 必须属于当前项目与技术栈并已完成 V5`);
    verifyIdentity(repo, entry.functionBaselineRef, `参与对象 ${entry.objectId} 功能基线`);
    if (source.visual.functionBaselineRef?.sha256 !== entry.functionBaselineRef.sha256 || samePath(source.visual.functionBaselineRef?.path) !== samePath(entry.functionBaselineRef.path)) throw new WorkflowError(`参与对象 ${entry.objectId} 功能基线未绑定当前版本`);
    const checked = inspectSource(repo, source, { strict: true });
    if (!checked || typeof checked.then === 'function' || checked.status !== 'PASS' || (Array.isArray(checked.blocking) && checked.blocking.length)) throw new WorkflowError(`参与对象 ${entry.objectId} 严格检查未通过`);
    objects.set(entry.objectId, source);
  }
  const seen = new Set();
  const covered = new Set();
  for (const entry of evidence.cases) {
    if (!entry || typeof entry.caseId !== 'string' || !entry.caseId.trim() || seen.has(entry.caseId) || !Array.isArray(entry.objectIds) || !entry.objectIds.length || new Set(entry.objectIds).size !== entry.objectIds.length) throw new WorkflowError('最终集成行为范围及覆盖对象必须非空且唯一');
    const casePath = verifyIdentity(repo, entry.evidenceRef, `最终行为 ${entry.caseId} 证据`);
    if (samePath(casePath) === samePath(evidencePath) || !manifest.items.some((item) => item?.status === 'PASS' && typeof item.path === 'string' && samePath(item.path) === samePath(casePath))) throw new WorkflowError(`最终行为 ${entry.caseId} 必须有独立 PASS 证据`);
    const actual = readJson(repo, casePath, '最终行为实际验证记录');
    if (actual.schemaVersion !== '1.0' || actual.workItemId !== work.workItemId || actual.projectId !== work.projectId || actual.stack !== work.stack || actual.caseId !== entry.caseId || actual.status !== 'PASS' || !Array.isArray(actual.objectIds) || JSON.stringify([...actual.objectIds].sort()) !== JSON.stringify([...entry.objectIds].sort())) throw new WorkflowError(`最终行为 ${entry.caseId} 的实际验证记录身份、状态或覆盖不匹配`);
    seen.add(entry.caseId);
    for (const id of entry.objectIds) {
      if (!objects.has(id)) throw new WorkflowError(`最终集成行为 ${entry.caseId} 引用了未登记对象`);
      covered.add(id);
    }
  }
  for (const [objectId, source] of objects) {
    if (!covered.has(objectId)) throw new WorkflowError(`最终集成未覆盖对象 ${objectId}`);
    // 引用共享功能来源的对象必须在最终组合中重跑其已冻结的各个行为范围。
    for (const dependency of source.visual.functionDependencies ?? []) {
      if (!evidence.cases.some((entry) => entry.caseId === dependency.caseId && entry.objectIds.includes(objectId))) throw new WorkflowError(`最终集成缺少对象 ${objectId} 的功能范围 ${dependency.caseId}`);
    }
  }
}
