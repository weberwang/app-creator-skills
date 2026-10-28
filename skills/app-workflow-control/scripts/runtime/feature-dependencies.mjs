import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, existsSync, lstatSync } from 'node:fs';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 要求行为标识等关键字段是真实的非空文字。 */
function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label}必须为非空字符串`);
}

/** 统一项目内路径以比较证据和依赖身份；Windows 文件系统忽略大小写。 */
function pathIdentity(repo, path, label) {
  return realpathSync.native(repoPath(repo, dependencyPath(repo, path, label)).absolute);
}

/** 仅对功能依赖接受等价相对路径，逐级核验避免折叠路径掩盖符号链接逃逸。 */
export function dependencyPath(repo, value, label = '功能依赖路径') {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || /^[a-zA-Z]:/.test(value) || value.startsWith('/') || value.startsWith('\\')) throw new WorkflowError(`${label}必须为项目相对路径`);
  const input = process.platform === 'win32' ? value.replaceAll('\\', '/') : value;
  if (input.includes('\\')) throw new WorkflowError(`${label}必须使用项目相对路径`);
  const parts = [];
  for (const segment of input.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!parts.length) throw new WorkflowError(`${label}不能越出项目`);
      const parent = repoPath(repo, parts.join('/'), label);
      if (existsSync(parent.absolute) && lstatSync(parent.absolute).isSymbolicLink()) throw new WorkflowError(`${label}不能折叠符号链接`);
      parts.pop();
    } else parts.push(segment);
  }
  return repoPath(repo, parts.join('/'), label).relative;
}

/** 从真实清单核对行为证据，并以内容摘要防止复用过期或被替换的记录。 */
function checkEvidence(repo, source, dependency, work) {
  const evidencePath = requireFile(repo, dependencyPath(repo, dependency.evidenceRef?.path, '功能行为证据'), '功能行为证据');
  const absolute = repoPath(repo, evidencePath, '功能行为证据').absolute;
  if (!/^[a-f0-9]{64}$/.test(dependency.evidenceRef?.sha256 ?? '')) throw new WorkflowError('功能行为证据必须提供小写 SHA-256');
  const content = readFileSync(absolute);
  if (!content.length) throw new WorkflowError('功能行为证据不能为空');
  if (createHash('sha256').update(content).digest('hex') !== dependency.evidenceRef.sha256) throw new WorkflowError('功能行为证据内容已变化');

  const manifest = readJson(repo, source.evidenceRef?.path, '功能工作项 Evidence Manifest');
  if (manifest.schemaVersion !== '1.0' || manifest.workItemId !== source.workItemId || manifest.stack !== source.stack || !Array.isArray(manifest.items)) {
    throw new WorkflowError('功能工作项 Evidence Manifest 身份或内容不匹配');
  }
  const expected = pathIdentity(repo, evidencePath, '功能行为证据');
  const found = manifest.items.some((item) => item?.status === 'PASS' && typeof item.path === 'string'
    && pathIdentity(repo, item.path, 'Evidence Manifest 项目路径') === expected);
  if (!found) throw new WorkflowError('功能行为证据未列入来源工作项 PASS 清单');

  const evidence = readJson(repo, evidencePath, '功能行为证据');
  if (evidence.schemaVersion !== '1.0' || evidence.workItemId !== source.workItemId || evidence.projectId !== source.projectId
    || evidence.stack !== source.stack || evidence.caseId !== dependency.caseId || evidence.status !== 'PASS') {
    throw new WorkflowError('功能行为证据的来源、行为范围或状态不匹配');
  }
  if (!Array.isArray(evidence.objectIds) || !evidence.objectIds.length
    || evidence.objectIds.some((id) => typeof id !== 'string' || !id.trim())
    || new Set(evidence.objectIds).size !== evidence.objectIds.length || !evidence.objectIds.includes(work.visual.objectId)) {
    throw new WorkflowError('功能行为证据未覆盖当前显示对象');
  }
  // 显示层的打开、关闭等行为依赖真实宿主，跨对象证据必须注明验证上下文。
  if (work.workItemType === 'DISPLAY_LAYER' && (evidence.hostId !== work.visual.hostId || evidence.layerType !== work.visual.layerType)) {
    throw new WorkflowError('功能行为证据未绑定当前显示层宿主及类型');
  }
  return evidence;
}

/** 校验跨工作项功能依赖；执行和实际用户确认仍由对应工作项负责。 */
export function validateFeatureDependencies(repo, work, inspectSource) {
  const dependencies = work?.visual?.functionDependencies;
  if (dependencies === undefined) return [];
  if (!Array.isArray(dependencies)) throw new WorkflowError('功能依赖必须为数组');
  if (!dependencies.length) return [];
  requireText(work?.workItemId, '当前工作项 ID');
  requireText(work?.projectId, '当前项目 ID');
  requireText(work?.stack, '当前技术栈');
  requireText(work?.visual?.objectId, '当前显示对象 ID');
  if (typeof inspectSource !== 'function') throw new WorkflowError('功能依赖必须执行来源工作项严格检查');

  const seen = new Set();
  return dependencies.map((dependency) => {
    if (!dependency || typeof dependency !== 'object' || Array.isArray(dependency)) throw new WorkflowError('功能依赖必须为对象');
    requireText(dependency.caseId, '功能行为 caseId');
    const sourcePath = requireFile(repo, dependencyPath(repo, dependency.workItemRef?.path, '功能来源工作项'), '功能来源工作项');
    // 同一对象的行为标识是全局键，禁止不同来源以同名范围互相覆盖。
    if (seen.has(dependency.caseId)) throw new WorkflowError('功能依赖行为范围 caseId 不得重复');
    seen.add(dependency.caseId);
    const source = readJson(repo, sourcePath, '功能来源工作项');
    if (!source || typeof source !== 'object' || source.workItemId === work.workItemId) throw new WorkflowError('功能依赖不能引用当前工作项');
    requireText(source.workItemId, '功能来源工作项 ID');
    if (source.projectId !== work.projectId || source.stack !== work.stack) throw new WorkflowError('功能来源项目或技术栈不匹配');
    // 只允许非显示工作项作为来源，避免原型功能依赖场景视觉完成形成环路。
    if (!['MODULE', 'INTEGRATION'].includes(source.workItemType) || source.visual !== undefined) throw new WorkflowError('功能来源必须是无视觉阶段的 MODULE 或 INTEGRATION 工作项');
    // 最终集成等待对象 V5，不能反向作为这些对象的 V1 功能来源。
    if (source.workItemType === 'INTEGRATION' && source.integrationPurpose !== 'feature') throw new WorkflowError('功能来源集成工作项必须用于早期功能验证');
    if (!['PASSED', 'COMPLETE'].includes(source.globalState)) throw new WorkflowError('功能来源工作项尚未通过');
    const inspected = inspectSource(repo, source, { strict: true });
    if (!inspected || typeof inspected.then === 'function' || inspected.status !== 'PASS' || (Array.isArray(inspected.blocking) && inspected.blocking.length)) {
      throw new WorkflowError('功能来源工作项严格检查未通过');
    }
    const evidence = checkEvidence(repo, source, dependency, work);
    return { workItemId: source.workItemId, caseId: dependency.caseId, evidenceRef: { path: dependency.evidenceRef.path, sha256: dependency.evidenceRef.sha256 }, objectIds: evidence.objectIds };
  });
}
