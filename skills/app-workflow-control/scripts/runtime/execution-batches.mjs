import { lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { WorkflowError } from './io.mjs';

const PARALLEL_FORBIDDEN_TYPES = new Set(['SHARED', 'INTEGRATION', 'RELEASE']);
const GLOB_MARKERS = /\*/;

/** 将固定顺序的执行单元分组成连续批次，不重排计划者声明的顺序。 */
export function buildExecutionBatches(units, { repo } = {}) {
  const batches = [];
  const seenGroups = new Set();
  const knownEarlier = new Map();

  for (let index = 0; index < units.length;) {
    const unit = units[index];
    const group = unit.parallelGroup;
    if (group === undefined) {
      validateDependencies(unit, index, knownEarlier, null);
      batches.push({ unitIds: [unit.unitId], parallelGroup: null });
      knownEarlier.set(unit.unitId, batches.length - 1);
      index += 1;
      continue;
    }

    if (typeof group !== 'string' || !group.trim()) {
      throw new WorkflowError(`executionUnits[${index}].parallelGroup 必须为非空字符串`);
    }
    const repeatedGroup = units.slice(index).find((entry) => entry.parallelGroup !== undefined && seenGroups.has(entry.parallelGroup));
    if (repeatedGroup) throw new WorkflowError(`parallelGroup 必须连续出现：${repeatedGroup.parallelGroup}`);
    if (seenGroups.has(group)) throw new WorkflowError(`parallelGroup 必须连续出现：${group}`);
    seenGroups.add(group);
    const members = [];
    while (index < units.length && units[index].parallelGroup === group) members.push(units[index++]);
    if (members.length < 2) throw new WorkflowError(`parallelGroup 至少包含两个连续执行单元：${group}`);
    if (members.some((member) => PARALLEL_FORBIDDEN_TYPES.has(member.type))) {
      throw new WorkflowError(`SHARED/INTEGRATION/RELEASE 单元必须串行执行：${group}`);
    }

    const batchIndex = batches.length;
    validateParallelOwnership(repo, members, group);
    for (const member of members) validateDependencies(member, units.indexOf(member), knownEarlier, batchIndex);
    batches.push({ unitIds: members.map((member) => member.unitId), parallelGroup: group });
    for (const member of members) knownEarlier.set(member.unitId, batchIndex);
  }
  return batches;
}

/** 保存影响执行顺序、文件所有权或验收结果的计划字段，供启动后发现计划被改写。 */
export function createExecutionPlanSnapshot(pack, { repo } = {}) {
  const batches = buildExecutionBatches(pack.executionUnits, { repo });
  return {
    units: pack.executionUnits.map((unit) => ({
      unitId: unit.unitId,
      sequence: unit.sequence,
      type: unit.type,
      owner: unit.owner,
      paths: [...unit.paths],
      resultPath: unit.resultPath,
      acceptanceCommands: [...unit.acceptanceCommands],
      parallelGroup: unit.parallelGroup ?? null,
      dependsOn: unit.dependsOn === undefined ? [] : [...unit.dependsOn],
    })),
    batches,
  };
}

/** 根据已验证单元状态推导唯一可提交的当前批次。 */
export function expectedActiveBatch(batches, stateUnits) {
  for (const batch of batches) {
    if (!batch.unitIds.every((id) => stateUnits.find((unit) => unit.unitId === id)?.status === 'PASS')) {
      return [...batch.unitIds];
    }
  }
  return [];
}

/** 校验依赖只指向先前已经完成的批次，拒绝同批、未来、未知或重复引用。 */
function validateDependencies(unit, index, knownEarlier, currentBatchIndex) {
  if (unit.dependsOn === undefined) return;
  if (!Array.isArray(unit.dependsOn)) throw new WorkflowError(`executionUnits[${index}].dependsOn 必须为字符串数组`);
  const seen = new Set();
  for (const dependency of unit.dependsOn) {
    if (typeof dependency !== 'string' || !dependency.trim()) throw new WorkflowError(`executionUnits[${index}].dependsOn 必须包含非空单元 ID`);
    if (seen.has(dependency)) throw new WorkflowError(`executionUnits[${index}].dependsOn 重复：${dependency}`);
    seen.add(dependency);
    if (!knownEarlier.has(dependency)) throw new WorkflowError(`executionUnits[${index}].dependsOn 只能引用更早批次：${dependency}`);
    if (currentBatchIndex !== null && knownEarlier.get(dependency) === currentBatchIndex) {
      throw new WorkflowError(`并行批次内不得相互依赖：${unit.unitId} -> ${dependency}`);
    }
  }
}

/** 并行成员须使用可证明互斥的具体路径，避免 glob 和目录前缀造成写入竞态。 */
function validateParallelOwnership(repo, members, group) {
  const owned = [];
  for (const unit of members) {
    for (const path of unit.paths) {
      if (GLOB_MARKERS.test(path)) throw new WorkflowError(`并行批次文件所有权不能使用 glob：${group} / ${path}`);
      const normalized = process.platform === 'win32' ? path.toLowerCase() : path;
      const pathInfo = repo === undefined ? null : inspectPathOwnership(repo, path, unit.unitId);
      for (const prior of owned) {
        if (prior.unitId === unit.unitId) continue;
        if (pathsOverlap(normalized, prior.path)) {
          throw new WorkflowError(`并行批次文件所有权冲突：${prior.unitId} (${prior.path}) 与 ${unit.unitId} (${path})`);
        }
        if (pathInfo?.fileIdentity && pathInfo.fileIdentity === prior.fileIdentity) {
          throw new WorkflowError(`并行批次存在硬链接别名：${prior.unitId} (${prior.path}) 与 ${unit.unitId} (${path})`);
        }
      }
      owned.push({ unitId: unit.unitId, path: normalized, fileIdentity: pathInfo?.fileIdentity ?? null });
    }
  }
}

/** 检查并行所有权路径的现存祖先，拒绝链接别名并记录文件硬链接身份。 */
function inspectPathOwnership(repo, relativePath, unitId) {
  const segments = relativePath.split('/');
  let cursor = resolve(repo);
  let leafStat = null;
  for (const segment of segments) {
    cursor = resolve(cursor, segment);
    let currentStat;
    try {
      // lstat 能看到链接本身；existsSync/stat 会漏掉指向不存在目标的悬空链接。
      currentStat = lstatSync(cursor);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') break;
      throw new WorkflowError(`无法检查并行路径祖先 ${relativePath}：${error.message}`);
    }
    if (currentStat.isSymbolicLink()) {
      const linkPath = cursor.slice(resolve(repo).length).replaceAll('\\', '/').replace(/^\//, '');
      throw new WorkflowError(`并行单元 ${unitId} 的所有权路径含符号链接或 Junction 祖先：${linkPath}`);
    }
    leafStat = currentStat;
  }
  if (!leafStat?.isFile()) return { fileIdentity: null };
  return { fileIdentity: `${leafStat.dev}:${leafStat.ino}` };
}

/** 判断文件、父目录或子目录声明是否相交。 */
function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}
