import { validateEvidence } from './artifacts.mjs';
import { loadProfile } from './validation.mjs';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { repoPath, WorkflowError } from './io.mjs';
import { dependencyPath } from './feature-dependencies.mjs';

/** 以操作系统实际解析结果比较依赖文件，保留大小写敏感目录的差异。 */
export function sameDependencyPath(repo, a, b) {
  return realpathSync.native(repoPath(repo, dependencyPath(repo, a)).absolute) === realpathSync.native(repoPath(repo, dependencyPath(repo, b)).absolute);
}

/** 以实际文件和行为身份判断依赖，不依赖文本拼写。 */
export function sameFunctionDependency(repo, a, b) {
  return Boolean(a && b && a.caseId === b.caseId && sameDependencyPath(repo, a.workItemRef?.path, b.workItemRef?.path) && sameDependencyPath(repo, a.evidenceRef?.path, b.evidenceRef?.path) && a.evidenceRef?.sha256 === b.evidenceRef?.sha256);
}

/** 通过唯一行为标识匹配依赖，数组重排不改变功能范围。 */
export function sameFunctionDependencies(repo, a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const byCase = new Map(b.map((item) => [item?.caseId, item]));
  return byCase.size === b.length && new Set(a.map((item) => item?.caseId)).size === a.length && a.every((item) => sameFunctionDependency(repo, item, byCase.get(item?.caseId)));
}

/** 提取工程部分，允许视觉清单后续补充而不撤销已经完成的功能验证。 */
export function engineeringEvidence(repo, work) {
  const { manifest } = validateEvidence(repo, work, { requireEngineering: true, requireVisual: false, requireAssetImport: false });
  const categories = new Set(loadProfile(repo, work.stack).evidenceRequirements.engineering);
  // 条目顺序和 JSON 属性顺序不改变工程结论，标准化后再比较内容。
  const items = manifest.items.filter((item) => categories.has(item?.category)).map((item) => ({ category: item.category, status: item.status, path: item.path, ...(item.targetId === undefined ? {} : { targetId: item.targetId }) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { schemaVersion: manifest.schemaVersion, workItemId: manifest.workItemId, stack: manifest.stack, implementationPackageRef: manifest.implementationPackageRef, visualStage: manifest.visualStage ?? null, items };
}

/** 确保冻结的工程类别、状态和路径没有被变更或替换。 */
export function assertEngineeringEvidence(repo, work, expected) {
  if (!expected || JSON.stringify(engineeringEvidence(repo, work)) !== JSON.stringify(expected)) throw new WorkflowError('功能工程证据清单已变化，必须重新验证');
}

/** 只有来源的工程记录和交付物均未变化，才可免除重复执行。 */
export function unchangedFunctionSource(repo, source, frozen) {
  try {
    if (!frozen || source.implementationPackageRef?.path !== frozen.implementationPackageRef?.path || source.evidenceRef?.path !== frozen.evidenceRef?.path || source.evidenceRoot !== frozen.evidenceRoot || !Array.isArray(frozen.files) || !frozen.files.length) return false;
    assertEngineeringEvidence(repo, source, frozen.engineeringEvidence);
    return frozen.files.every((item) => createHash('sha256').update(readFileSync(repoPath(repo, item.path).absolute)).digest('hex') === item.sha256);
  } catch { return false; }
}
