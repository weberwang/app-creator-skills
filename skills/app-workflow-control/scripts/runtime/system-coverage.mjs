import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { repoPath, requireFile, WorkflowError } from './io.mjs';

/** 游戏和应用都必须从真实使用流程及生命周期反向检查覆盖。 */
const COMMON_AREAS = Object.freeze(['flow', 'state-data', 'failure-recovery', 'persistence', 'platform']);
/** 类型只决定应检查的领域，不代表项目必须引入对应系统。 */
const GAME_AREAS = Object.freeze(['combat', 'economy', 'progression', 'content', 'player-feedback', 'advertising']);
const APP_AREAS = Object.freeze(['identity-access', 'business-rules', 'content', 'integration']);
const GAME_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'roblox']);
const ACTIVE_STATUSES = new Set(['implement', 'reuse']);
const MODULE_STATUSES = new Set(['implement', 'reuse', 'defer', 'exclude', 'pending']);
const REQUIREMENT_SCOPES = new Set(['current', 'later', 'excluded']);

/** 返回当前技术栈必须逐项检查的领域，不自动启用这些功能。 */
export function systemCoverageAreas(stack) {
  return [...COMMON_AREAS, ...(GAME_STACKS.has(stack) ? GAME_AREAS : APP_AREAS)];
}

/** 拒绝缺失字段和未声明字段，避免拼写错误被当作有效覆盖。 */
function fields(value, required, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须为对象`);
  for (const key of Object.keys(value)) if (!required.includes(key)) throw new WorkflowError(`${label} 包含不支持字段：${key}`);
  for (const key of required) if (!Object.hasOwn(value, key)) throw new WorkflowError(`${label} 缺少字段：${key}`);
}

/** 非空文本包含真实内容，不能仅填空格。 */
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label} 必须为非空字符串`);
}

/** 校验不重复的标识列表；是否允许空集合由调用位置决定。 */
function ids(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && !value.length)) throw new WorkflowError(`${label} 必须为${nonEmpty ? '非空' : ''}数组`);
  value.forEach((item) => text(item, label));
  if (new Set(value).size !== value.length) throw new WorkflowError(`${label} 不允许重复`);
}

/** 需求、设计与复用依据均绑定项目内真实文件及其当前字节身份。 */
function frozenRef(repo, value, label) {
  fields(value, ['path', 'sha256'], label);
  text(value.path, `${label}.path`);
  if (typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) throw new WorkflowError(`${label}.sha256 必须为小写 SHA-256`);
  const path = requireFile(repo, value.path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length) throw new WorkflowError(`${label} 不能为空文件`);
  if (createHash('sha256').update(bytes).digest('hex') !== value.sha256) throw new WorkflowError(`${label} 内容与冻结摘要不一致`);
}

/** 校验所有来源引用，即使当前模块不使用该来源也不接受失效记录。 */
function refs(repo, values, label) {
  if (!Array.isArray(values)) throw new WorkflowError(`${label} 必须为数组`);
  values.forEach((value, index) => frozenRef(repo, value, `${label}[${index}]`));
}

/** 把具有唯一标识的对象数组建索引，避免同名条目互相覆盖。 */
function indexBy(values, key, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(values) || (nonEmpty && !values.length)) throw new WorkflowError(`${label} 必须为${nonEmpty ? '非空' : ''}数组`);
  const result = new Map();
  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 条目必须为对象`);
    text(value[key], `${label}.${key}`);
    if (result.has(value[key])) throw new WorkflowError(`${label}.${key} 不允许重复：${value[key]}`);
    result.set(value[key], value);
  }
  return result;
}

/** 验证模块依赖闭包，阻止未决定或后置前置被当前实现消费。 */
function validateModuleDependencies(modules) {
  const visiting = new Set();
  const visited = new Set();
  /** 深度优先遍历同时发现未知依赖和依赖环。 */
  function visit(module) {
    if (visiting.has(module.moduleId)) throw new WorkflowError(`系统模块依赖存在循环：${module.moduleId}`);
    if (visited.has(module.moduleId)) return;
    visiting.add(module.moduleId);
    for (const dependencyId of module.dependsOn) {
      const dependency = modules.get(dependencyId);
      if (!dependency) throw new WorkflowError(`系统模块 ${module.moduleId} 依赖未知模块：${dependencyId}`);
      if (ACTIVE_STATUSES.has(module.status) && !ACTIVE_STATUSES.has(dependency.status)) throw new WorkflowError(`系统模块 ${module.moduleId} 依赖未就绪模块：${dependencyId}`);
      visit(dependency);
    }
    visiting.delete(module.moduleId);
    visited.add(module.moduleId);
  }
  for (const module of modules.values()) visit(module);
}

/** 判断验证单元是否为实现单元本身或在依赖链之后执行。 */
function followsUnit(verificationId, implementationId, units) {
  const pending = [verificationId];
  const seen = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (current === implementationId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    const dependencies = units.get(current)?.dependsOn;
    if (Array.isArray(dependencies)) pending.push(...dependencies);
  }
  return false;
}

/** 校验本批模块的设计依据、实现归属及实际验收命令映射。 */
function validateModule(repo, module, units, mappedUnits) {
  const label = `系统模块 ${module.moduleId}`;
  fields(module, ['moduleId', 'status', 'reason', 'dependsOn', 'designRefs', 'implementationUnitIds', 'verifications', 'evidenceRefs'], label);
  if (!MODULE_STATUSES.has(module.status)) throw new WorkflowError(`${label}.status 无效`);
  text(module.reason, `${label}.reason`);
  ids(module.dependsOn, `${label}.dependsOn`);
  ids(module.implementationUnitIds, `${label}.implementationUnitIds`);
  refs(repo, module.designRefs, `${label}.designRefs`);
  refs(repo, module.evidenceRefs, `${label}.evidenceRefs`);
  if (!Array.isArray(module.verifications)) throw new WorkflowError(`${label}.verifications 必须为数组`);

  const active = ACTIVE_STATUSES.has(module.status);
  if (active && !module.designRefs.length) throw new WorkflowError(`${label} 缺少设计依据`);
  if (module.status === 'reuse' && !module.evidenceRefs.length) throw new WorkflowError(`${label} 复用缺少已有证据`);
  if (active && !module.verifications.length) throw new WorkflowError(`${label} 缺少本批验证`);
  if (module.status === 'implement' && !module.implementationUnitIds.length) throw new WorkflowError(`${label} 缺少实施单元`);
  if (module.status !== 'implement' && module.implementationUnitIds.length) throw new WorkflowError(`${label} 不允许声明实施单元`);
  if (!active && module.verifications.length) throw new WorkflowError(`${label} 当前不执行，不能声明验证`);

  for (const unitId of module.implementationUnitIds) {
    if (!units.has(unitId)) throw new WorkflowError(`${label} 引用未知实施单元：${unitId}`);
    mappedUnits.add(unitId);
  }
  const checks = new Set();
  for (const [index, verification] of module.verifications.entries()) {
    fields(verification, ['unitId', 'command'], `${label}.verifications[${index}]`);
    text(verification.unitId, `${label}.verifications[${index}].unitId`);
    text(verification.command, `${label}.verifications[${index}].command`);
    const unit = units.get(verification.unitId);
    if (!unit) throw new WorkflowError(`${label} 验证引用未知单元：${verification.unitId}`);
    if (!Array.isArray(unit.acceptanceCommands) || !unit.acceptanceCommands.includes(verification.command)) throw new WorkflowError(`${label} 验证命令不属于单元 ${verification.unitId}`);
    const key = JSON.stringify([verification.unitId, verification.command]);
    if (checks.has(key)) throw new WorkflowError(`${label} 验证命令重复`);
    checks.add(key);
    mappedUnits.add(verification.unitId);
  }
  // 验证必须处于实现之后；仅列出无依赖的其他单元不能证明本实现受检。
  for (const unitId of module.implementationUnitIds) {
    if (!module.verifications.some((verification) => followsUnit(verification.unitId, unitId, units))) throw new WorkflowError(`${label} 的实施单元 ${unitId} 缺少实施之后的验证`);
  }
}

/** 校验需求到模块、设计、当前单元和验收命令的完整声明与冻结来源。 */
export function validateSystemCoverage(repo, work, pack) {
  const coverage = pack?.systemCoverage;
  fields(coverage, ['requirementsRef', 'requirements', 'modules', 'areas'], 'systemCoverage');
  frozenRef(repo, coverage.requirementsRef, 'systemCoverage.requirementsRef');
  const requirements = indexBy(coverage.requirements, 'requirementId', 'requirements', { nonEmpty: true });
  const modules = indexBy(coverage.modules, 'moduleId', 'modules', { nonEmpty: true });
  const areas = indexBy(coverage.areas, 'areaId', 'areas');
  const units = indexBy(pack.executionUnits, 'unitId', 'executionUnits', { nonEmpty: true });
  const expectedAreas = systemCoverageAreas(work.stack);
  const areaModules = new Set();
  for (const area of areas.values()) {
    fields(area, ['areaId', 'reason', 'moduleIds'], `领域 ${area.areaId}`);
    if (!expectedAreas.includes(area.areaId)) throw new WorkflowError(`不支持的系统检查领域：${area.areaId}`);
    text(area.reason, `领域 ${area.areaId}.reason`);
    ids(area.moduleIds, `领域 ${area.areaId}.moduleIds`);
    for (const moduleId of area.moduleIds) {
      if (!modules.has(moduleId)) throw new WorkflowError(`领域 ${area.areaId} 引用未知模块：${moduleId}`);
      areaModules.add(moduleId);
    }
  }
  for (const areaId of expectedAreas) if (!areas.has(areaId)) throw new WorkflowError(`缺少系统检查领域：${areaId}`);

  const linkedModules = new Set();
  const currentModules = new Set();
  let currentCount = 0;
  for (const requirement of requirements.values()) {
    const label = `需求 ${requirement.requirementId}`;
    fields(requirement, ['requirementId', 'description', 'scope', 'reason', 'moduleIds'], label);
    text(requirement.description, `${label}.description`);
    text(requirement.reason, `${label}.reason`);
    if (!REQUIREMENT_SCOPES.has(requirement.scope)) throw new WorkflowError(`${label}.scope 无效`);
    ids(requirement.moduleIds, `${label}.moduleIds`, { nonEmpty: requirement.scope === 'current' });
    if (requirement.scope === 'current') currentCount += 1;
    for (const moduleId of requirement.moduleIds) {
      const module = modules.get(moduleId);
      if (!module) throw new WorkflowError(`${label} 引用未知模块：${moduleId}`);
      if (requirement.scope === 'current' && !ACTIVE_STATUSES.has(module.status)) throw new WorkflowError(`${label} 关联未就绪模块：${moduleId}`);
      linkedModules.add(moduleId);
      if (requirement.scope === 'current') currentModules.add(moduleId);
    }
  }
  // 本批实施必须有当前需求驱动，避免把全部范围标为后续仍执行任务。
  if (!currentCount) throw new WorkflowError('systemCoverage 至少需要一个 current 需求');
  const mappedUnits = new Set();
  for (const module of modules.values()) {
    if (!linkedModules.has(module.moduleId)) throw new WorkflowError(`系统模块缺少需求关联：${module.moduleId}`);
    if (ACTIVE_STATUSES.has(module.status) && !currentModules.has(module.moduleId)) throw new WorkflowError(`系统模块缺少 current 需求关联：${module.moduleId}`);
    // 本批模块必须落在至少一个实际检查领域，不能把所有领域都登记为不适用。
    if (ACTIVE_STATUSES.has(module.status) && !areaModules.has(module.moduleId)) throw new WorkflowError(`系统模块缺少检查领域关联：${module.moduleId}`);
    validateModule(repo, module, units, mappedUnits);
  }
  validateModuleDependencies(modules);
  assertReuseEvidenceSeparation(repo, coverage);
  for (const unitId of units.keys()) if (!mappedUnits.has(unitId)) throw new WorkflowError(`实施单元缺少系统模块关联：${unitId}`);
  return coverage;
}

/** 需求和设计只能说明计划，不能通过改名或硬链接充当已存在模块的工程证据。 */
function assertReuseEvidenceSeparation(repo, coverage) {
  /** 使用实际文件身份识别同一路径及硬链接别名。 */
  const identity = (ref) => {
    const info = statSync(repoPath(repo, ref.path).absolute, { bigint: true });
    return `${info.dev}:${info.ino}`;
  };
  const designFiles = new Set([coverage.requirementsRef, ...coverage.modules.flatMap((module) => module.designRefs)].map(identity));
  for (const module of coverage.modules.filter((entry) => entry.status === 'reuse')) {
    if (module.evidenceRefs.some((ref) => designFiles.has(identity(ref)))) throw new WorkflowError(`系统模块 ${module.moduleId} 的复用证据不能使用需求或设计文件自证`);
  }
}

/** 收集覆盖合同中的冻结来源，供调用方保护文件与检测写入边界。 */
export function collectSystemCoverageReferences(pack) {
  const coverage = pack?.systemCoverage;
  if (!coverage || typeof coverage !== 'object') return [];
  const values = [coverage.requirementsRef];
  if (Array.isArray(coverage.modules)) {
    for (const module of coverage.modules) {
      if (Array.isArray(module?.designRefs)) values.push(...module.designRefs);
      if (Array.isArray(module?.evidenceRefs)) values.push(...module.evidenceRefs);
    }
  }
  return values.filter((value) => typeof value?.path === 'string' && value.path.trim()).map((value) => value.path);
}
