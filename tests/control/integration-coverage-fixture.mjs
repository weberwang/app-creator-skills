import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createSystemCoverage } from './system-coverage-fixture.mjs';

/** 写入隔离工程内的合成记录，仅用于验证控制器合同。 */
function put(repo, path, value) {
  const file = join(repo, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

/** 以实际文件字节建立冻结身份，确保测试能发现记录变化。 */
export function coverageIdentity(repo, path) {
  return { path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') };
}

/** 创建带真实需求／设计引用的合成实施包，不表示实际项目执行通过。 */
export function putCoveragePackage(repo, work, { path, resultPath, unitId = 'integration-unit', command = 'node --version', ownedPath = 'src/integration.mjs' }) {
  const unit = { unitId, sequence: 1, type: work.workItemType, owner: 'test-owner', paths: [ownedPath], resultPath, acceptanceCommands: [command] };
  const pack = { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, workItemType: work.workItemType, ...(work.visual ? { visualStage: work.visual.stage } : {}), ...(work.productionScopeRef ? { productionScopeRef: structuredClone(work.productionScopeRef) } : {}), ...(work.productionBatchId ? { productionBatchId: work.productionBatchId } : {}), ...(work.productionDependencies ? { productionDependencies: structuredClone(work.productionDependencies) } : {}), executionUnits: [unit] };
  pack.systemCoverage = createSystemCoverage(repo, work, pack.executionUnits);
  put(repo, path, pack);
  return { pack, unit, ref: coverageIdentity(repo, path) };
}

/** 为每个来源当前需求显式绑定覆盖该对象的冻结集成用例及单元命令。 */
export function coverageMappings(repo, scope, sources, { unitId = 'integration-unit', command = 'node --version' } = {}) {
  return sources.flatMap(({ objectId, packPath }) => {
    const pack = JSON.parse(readFileSync(join(repo, packPath), 'utf8'));
    const items = scope.cases.filter((entry) => entry.objectIds.includes(objectId));
    if (!items.length) throw new Error(`测试来源没有对应对象用例：${objectId}`);
    return pack.systemCoverage.requirements.filter((entry) => entry.scope === 'current').map((entry) => ({
      sourcePackageRef: coverageIdentity(repo, packPath), requirementId: entry.requirementId, moduleIds: [...entry.moduleIds], objectIds: [objectId],
      verifications: items.map((item) => ({ caseId: item.caseId, unitId, command })),
    }));
  });
}

/** 建立与实际单元命令、输出文件和结果绑定的合成执行材料。 */
export function putCoverageExecution(repo, work, unit, { outputPath = 'final/output.log', output = '仅供合同测试的输出\n' } = {}) {
  put(repo, outputPath, output);
  const outputRef = coverageIdentity(repo, outputPath);
  put(repo, unit.resultPath, {
    schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, implementationPackageRef: work.implementationPackageRef.path,
    unitId: unit.unitId, sequence: unit.sequence, status: 'PASS', exitCode: 0, files: unit.paths,
    commandOutputs: [{ command: unit.acceptanceCommands[0], exitCode: 0, outputFile: outputPath }],
  });
  return { unitId: unit.unitId, command: unit.acceptanceCommands[0], exitCode: 0, outputRef };
}
