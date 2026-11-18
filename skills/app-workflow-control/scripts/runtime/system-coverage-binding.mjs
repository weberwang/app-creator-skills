import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { requireFile, repoPath, fileIdentityKey, WorkflowError } from './io.mjs';
import { pathMatch } from './validation.mjs';
import { getWorkSource } from './work-source.mjs';
import { validateSystemCoverage, collectSystemCoverageReferences } from './system-coverage.mjs';
import { collectIntegrationScopeReferences } from './integration-system-sources.mjs';

/** 从同一份实际字节解析计划并计算摘要，避免编辑器保存时校验与内容错位。 */
export function readCoveragePlan(repo, path) {
  const source = requireFile(repo, path, '系统覆盖计划来源');
  const bytes = readFileSync(repoPath(repo, source).absolute);
  let plan;
  try { plan = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new WorkflowError(`系统覆盖计划来源不是有效 JSON：${error.message}`); }
  return { plan, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 将领域覆盖与当前控制记录、文件所有权和执行依赖绑定，拒绝自证与先用后建。 */
export function assertSystemCoverageBindings(repo, work, pack) {
  const coverage = validateSystemCoverage(repo, work, pack);
  if (work.planningRef?.path) {
    const { plan, sha256 } = readCoveragePlan(repo, work.planningRef.path);
    if (sha256 !== work.planningRef.sha256) {
      throw new WorkflowError('冻结计划来源摘要不一致，须 RETURN 后重新规划');
    }
    if (!isDeepStrictEqual(plan.systemCoverage, coverage)) throw new WorkflowError('系统覆盖与冻结计划来源不一致，须 RETURN 后重新规划');
  }
  const controls = [getWorkSource(work), work.implementationPackageRef?.path, work.planningRef?.path,
    work.evidenceRef?.path, `${work.evidenceRoot}/execution-state.json`, ...pack.executionUnits.map((unit) => unit.resultPath)].filter(Boolean);
  const controlKeys = new Set(controls.map((path) => fileIdentityKey(repo, path)));
  for (const path of [...collectSystemCoverageReferences(pack), ...collectIntegrationScopeReferences(repo, work)]) {
    const key = fileIdentityKey(repo, path);
    if (controlKeys.has(key)) throw new WorkflowError(`系统需求、设计或复用证据不能引用当前控制记录：${path}`);
    for (const unit of pack.executionUnits) {
      if (unit.paths.some((owned) => pathMatch(key, fileIdentityKey(repo, owned)))) {
        throw new WorkflowError(`实施单元不能修改冻结的系统需求、设计或复用证据：${unit.unitId} / ${path}`);
      }
    }
  }
  assertModuleTaskDependencies(coverage, pack.executionUnits);
}

/** 系统依赖必须落实到实现任务；允许联合实施后统一验证，不制造验收反向依赖。 */
function assertModuleTaskDependencies(coverage, units) {
  const modules = new Map(coverage.modules.map((module) => [module.moduleId, module]));
  const unitMap = new Map(units.map((unit) => [unit.unitId, unit]));
  for (const module of coverage.modules.filter((item) => ['implement', 'reuse'].includes(item.status))) {
    const consumers = module.implementationUnitIds.length ? module.implementationUnitIds : module.verifications.map((entry) => entry.unitId);
    for (const dependencyId of modulePredecessors(module.moduleId, modules)) {
      const dependency = modules.get(dependencyId);
      // 复用模块已有冻结证据，当前适用性可在后续组合验证，不能反向阻塞消费实现。
      const prerequisites = dependency.implementationUnitIds;
      for (const consumer of consumers) {
        const predecessors = taskPredecessors(consumer, unitMap);
        for (const prerequisite of prerequisites) {
          if (prerequisite !== consumer && !predecessors.has(prerequisite)) {
            throw new WorkflowError(`系统依赖未关联任务前置：${module.moduleId} -> ${dependencyId} / ${consumer} 须依赖 ${prerequisite}`);
          }
        }
      }
    }
  }
}

/** 复用模块不能截断依赖闭包，间接依赖的本批实现同样必须先准备好。 */
function modulePredecessors(moduleId, modules, seen = new Set()) {
  for (const predecessor of modules.get(moduleId)?.dependsOn ?? []) {
    if (seen.has(predecessor)) continue;
    seen.add(predecessor);
    modulePredecessors(predecessor, modules, seen);
  }
  return seen;
}

/** 收集传递前置并防御异常循环，不根据数组位置猜测任务已经有依赖关系。 */
function taskPredecessors(unitId, units, seen = new Set()) {
  for (const predecessor of units.get(unitId)?.dependsOn ?? []) {
    if (seen.has(predecessor)) continue;
    seen.add(predecessor);
    taskPredecessors(predecessor, units, seen);
  }
  return seen;
}
