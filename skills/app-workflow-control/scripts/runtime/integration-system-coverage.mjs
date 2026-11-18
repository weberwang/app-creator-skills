import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { validateSystemCoverage } from './system-coverage.mjs';
import { WORK_ITEM_TYPES } from './constants.mjs';

/** 检查明确的字段集合，避免未识别的拼写产生虚假映射。 */
function fields(value, required, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkflowError(`${label} 必须为对象`);
  for (const key of Object.keys(value)) if (!required.includes(key)) throw new WorkflowError(`${label} 包含不支持字段：${key}`);
  for (const key of required) if (!Object.hasOwn(value, key)) throw new WorkflowError(`${label} 缺少字段：${key}`);
}

/** 要求标识和命令是非空文字，避免空值被当作覆盖。 */
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError(`${label} 必须为非空字符串`);
}

/** 要求标识数组非空且无重复，集合比较不依赖声明顺序。 */
function ids(value, label) {
  if (!Array.isArray(value) || !value.length) throw new WorkflowError(`${label} 必须为非空数组`);
  for (const id of value) text(id, label);
  if (new Set(value).size !== value.length) throw new WorkflowError(`${label} 不允许重复`);
}

/** 校验冻结引用格式并返回规范化路径身份。 */
function referenceKey(repo, ref, label) {
  fields(ref, ['path', 'sha256'], label);
  text(ref.path, `${label}.path`);
  if (!/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label}.sha256 必须为小写 SHA-256`);
  return fileIdentityKey(repo, ref.path);
}

/** 从同一份字节核验并解析来源包，不能由调用方传入不同内容冒充冻结来源。 */
function readSourcePackage(repo, source, work) {
  fields(source, ['packRef', 'pack', 'objectIds'], '系统覆盖来源');
  const key = referenceKey(repo, source.packRef, '来源实施包引用');
  ids(source.objectIds, '来源参与对象');
  const path = requireFile(repo, source.packRef.path, '来源实施包');
  const bytes = readFileSync(repoPath(repo, path).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== source.packRef.sha256) throw new WorkflowError('来源实施包内容与冻结摘要不一致');
  let actual;
  try { actual = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new WorkflowError(`来源实施包不是有效 JSON：${error.message}`); }
  if (!isDeepStrictEqual(actual, source.pack)) throw new WorkflowError('来源实施包内容与调用方提供的内容不一致');
  if (actual?.schemaVersion !== '1.0' || actual.stack !== work.stack || typeof actual.workItemId !== 'string' || !actual.workItemId.trim() || actual.workItemId === work.workItemId || !WORK_ITEM_TYPES.includes(actual.workItemType)) {
    throw new WorkflowError('来源实施包版本、工作项或技术栈无效');
  }
  validateSystemCoverage(repo, { stack: work.stack }, actual);
  return { key, pack: actual, packRef: source.packRef, objectIds: source.objectIds };
}

/** 校验最终集成目标与行为身份，建立用于反向核对的索引。 */
function scopeCases(scope) {
  if (!Array.isArray(scope?.objects) || !scope.objects.length || !Array.isArray(scope?.cases) || !scope.cases.length) throw new WorkflowError('最终集成范围必须包含对象和用例');
  const objects = new Set();
  for (const object of scope.objects) {
    text(object?.objectId, '最终集成对象 ID');
    if (objects.has(object.objectId)) throw new WorkflowError(`最终集成对象重复：${object.objectId}`);
    objects.add(object.objectId);
  }
  const cases = new Map();
  for (const entry of scope.cases) {
    text(entry?.caseId, '最终集成用例 ID');
    ids(entry.objectIds, `最终集成用例 ${entry.caseId}.objectIds`);
    if (cases.has(entry.caseId) || entry.objectIds.some((id) => !objects.has(id))) throw new WorkflowError(`最终集成用例重复或引用未知对象：${entry.caseId}`);
    cases.set(entry.caseId, entry);
  }
  return { objects, cases };
}

/** 冻结来源需求到最终用例和实际验收命令的映射，逐项拒绝遗漏及错误归属。 */
export function validateIntegrationSystemMappings(repo, work, scope, { sources, pack } = {}) {
  if (!work || work.workItemType !== 'INTEGRATION' || work.integrationPurpose !== 'final') throw new WorkflowError('系统覆盖映射仅适用于最终集成');
  const { objects, cases } = scopeCases(scope);
  if (!Array.isArray(sources) || !sources.length) throw new WorkflowError('最终集成缺少系统覆盖来源实施包');
  if (!Array.isArray(pack?.executionUnits) || !pack.executionUnits.length || !Array.isArray(pack.systemCoverage?.modules)) throw new WorkflowError('最终集成缺少实施单元或系统覆盖');
  const units = new Map(pack.executionUnits.map((unit) => [unit.unitId, unit]));
  const declaredChecks = new Set(pack.systemCoverage.modules.flatMap((module) => (module.verifications ?? []).map((item) => JSON.stringify([item.unitId, item.command]))));
  const sourceMap = new Map();
  for (const source of sources) {
    const parsed = readSourcePackage(repo, source, work);
    if (sourceMap.has(parsed.key)) throw new WorkflowError('同一来源实施包必须先合并对象上下文');
    if (parsed.objectIds.some((id) => !objects.has(id))) throw new WorkflowError('来源实施包关联了未知集成对象');
    sourceMap.set(parsed.key, parsed);
  }
  if (!Array.isArray(scope.systemCoverageMappings) || !scope.systemCoverageMappings.length) throw new WorkflowError('最终集成缺少 systemCoverageMappings');

  const seen = new Set();
  const caseChecks = new Map();
  const sourceObjects = new Map([...sourceMap.keys()].map((key) => [key, new Set()]));
  for (const mapping of scope.systemCoverageMappings) {
    fields(mapping, ['sourcePackageRef', 'requirementId', 'moduleIds', 'objectIds', 'verifications'], '系统覆盖映射');
    const key = referenceKey(repo, mapping.sourcePackageRef, '映射来源实施包');
    const source = sourceMap.get(key);
    if (!source || source.packRef.sha256 !== mapping.sourcePackageRef.sha256) throw new WorkflowError('系统覆盖映射引用未知或摘要不一致的来源实施包');
    text(mapping.requirementId, '系统覆盖映射 requirementId');
    ids(mapping.moduleIds, '系统覆盖映射 moduleIds');
    ids(mapping.objectIds, '系统覆盖映射 objectIds');
    if (mapping.objectIds.some((id) => !source.objectIds.includes(id))) throw new WorkflowError(`需求 ${mapping.requirementId} 引用了非来源消费者`);
    for (const id of mapping.objectIds) sourceObjects.get(key).add(id);
    const requirement = source.pack.systemCoverage.requirements.find((item) => item.requirementId === mapping.requirementId && item.scope === 'current');
    if (!requirement) throw new WorkflowError(`系统覆盖映射引用未知或非当前需求：${mapping.requirementId}`);
    const mappingKey = JSON.stringify([key, mapping.requirementId]);
    if (seen.has(mappingKey)) throw new WorkflowError(`系统覆盖映射需求重复：${mapping.requirementId}`);
    seen.add(mappingKey);
    if (JSON.stringify([...mapping.moduleIds].sort()) !== JSON.stringify([...requirement.moduleIds].sort())) throw new WorkflowError(`需求 ${mapping.requirementId} 的模块覆盖不一致`);
    if (!Array.isArray(mapping.verifications) || !mapping.verifications.length) throw new WorkflowError(`需求 ${mapping.requirementId} 缺少最终验证`);
    const coveredObjects = new Set();
    const checks = new Set();
    for (const verification of mapping.verifications) {
      fields(verification, ['caseId', 'unitId', 'command'], `需求 ${mapping.requirementId} 的最终验证`);
      for (const name of ['caseId', 'unitId', 'command']) text(verification[name], `最终验证 ${name}`);
      const entry = cases.get(verification.caseId);
      if (!entry) throw new WorkflowError(`系统覆盖映射引用未知用例：${verification.caseId}`);
      const unit = units.get(verification.unitId);
      if (!unit || !unit.acceptanceCommands?.includes(verification.command) || !declaredChecks.has(JSON.stringify([verification.unitId, verification.command]))) {
        throw new WorkflowError(`最终验证未关联当前系统覆盖验收命令：${verification.unitId}`);
      }
      const checkKey = JSON.stringify([verification.caseId, verification.unitId, verification.command]);
      if (checks.has(checkKey)) throw new WorkflowError(`需求 ${mapping.requirementId} 的最终验证重复`);
      checks.add(checkKey);
      const prior = caseChecks.get(verification.caseId);
      if (prior && (prior.unitId !== verification.unitId || prior.command !== verification.command)) throw new WorkflowError(`最终用例 ${verification.caseId} 关联多个验收命令`);
      caseChecks.set(verification.caseId, { unitId: verification.unitId, command: verification.command });
      for (const id of entry.objectIds) if (mapping.objectIds.includes(id)) coveredObjects.add(id);
    }
    if (mapping.objectIds.some((id) => !coveredObjects.has(id))) throw new WorkflowError(`需求 ${mapping.requirementId} 的最终用例未覆盖全部关联对象`);
  }
  for (const [key, source] of sourceMap) {
    for (const requirement of source.pack.systemCoverage.requirements.filter((item) => item.scope === 'current')) {
      if (!seen.has(JSON.stringify([key, requirement.requirementId]))) throw new WorkflowError(`最终集成缺少来源需求：${requirement.requirementId}`);
    }
    // 模块可以按需求服务不同页面，但所有映射合并后不能遗漏任何来源消费者。
    if (source.objectIds.some((id) => !sourceObjects.get(key).has(id))) throw new WorkflowError(`最终集成缺少来源消费者：${source.pack.workItemId}`);
  }
  for (const caseId of cases.keys()) if (!caseChecks.has(caseId)) throw new WorkflowError(`最终集成用例缺少系统覆盖映射：${caseId}`);
  return caseChecks;
}

/** 把最终用例绑定到冻结单元已登记的真实命令输出，而非另写无关的 PASS。 */
export function validateIntegrationSystemCase(repo, work, pack, expectedVerification, actual, { verifyIdentity } = {}) {
  if (!expectedVerification || typeof verifyIdentity !== 'function') throw new WorkflowError('最终用例缺少冻结验证映射或文件身份检查');
  text(expectedVerification.unitId, '最终验证单元');
  text(expectedVerification.command, '最终验证命令');
  if (actual?.unitId !== expectedVerification.unitId || actual?.command !== expectedVerification.command || actual?.exitCode !== 0) throw new WorkflowError('最终用例与冻结的验收单元、命令或退出码不一致');
  const unit = pack.executionUnits?.find((item) => item.unitId === expectedVerification.unitId);
  if (!unit || !unit.acceptanceCommands?.includes(expectedVerification.command)) throw new WorkflowError('最终用例的验收单元或命令不存在');
  const path = verifyIdentity(repo, actual.outputRef, '最终用例命令输出');
  const outputKey = fileIdentityKey(repo, path);
  const result = readJson(repo, unit.resultPath, '最终验收单元结果');
  if (result.schemaVersion !== '1.0' || result.workItemId !== work.workItemId || result.stack !== work.stack || result.unitId !== unit.unitId || result.status !== 'PASS' || result.exitCode !== 0 ||
      typeof result.implementationPackageRef !== 'string' || fileIdentityKey(repo, result.implementationPackageRef) !== fileIdentityKey(repo, work.implementationPackageRef.path)) {
    throw new WorkflowError('最终验收单元结果身份或状态不匹配');
  }
  if (!Array.isArray(result.commandOutputs) || !result.commandOutputs.some((item) => item?.command === expectedVerification.command && item.exitCode === 0 && typeof item.outputFile === 'string' && fileIdentityKey(repo, item.outputFile) === outputKey)) {
    throw new WorkflowError('最终用例输出未关联已登记的验收命令结果');
  }
}
