import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const commonAreas = ['flow', 'state-data', 'failure-recovery', 'persistence', 'platform'];
const gameAreas = ['combat', 'economy', 'progression', 'content'];
const appAreas = ['identity-access', 'business-rules', 'content', 'integration'];
const gameStacks = new Set(['unity', 'cocos', 'phaser', 'threejs', 'roblox']);

/** 为指定工作项构造独立的合成需求、设计和逐单元覆盖关系。 */
export function createSystemCoverage(repo, work, executionUnits) {
  const base = `test-fixtures/system-coverage/${work.workItemId}`;
  const source = Buffer.from(`仅供测试的需求与设计：${work.workItemId}\n`);
  const path = `${base}/scope.md`;
  mkdirSync(join(repo, base), { recursive: true });
  writeFileSync(join(repo, path), source);
  const ref = { path, sha256: createHash('sha256').update(source).digest('hex') };
  const requirements = [];
  const modules = [];
  for (const [index, unit] of executionUnits.entries()) {
    const moduleId = `fixture-module-${index + 1}`;
    requirements.push({ requirementId: `fixture-requirement-${index + 1}`, description: '测试工作项的合成需求', scope: 'current', reason: '覆盖当前测试单元', moduleIds: [moduleId] });
    modules.push({
      moduleId, status: 'implement', reason: '当前单元实现并验证测试模块', dependsOn: [],
      designRefs: [ref], implementationUnitIds: [unit.unitId],
      verifications: [{ unitId: unit.unitId, command: unit.acceptanceCommands?.[0] ?? 'node --version' }], evidenceRefs: [],
    });
  }
  const areas = [...commonAreas, ...(gameStacks.has(work.stack) ? gameAreas : appAreas)]
    .map((areaId) => ({ areaId, reason: '测试已检查该领域与当前合成需求的关系', moduleIds: areaId === 'flow' ? modules.map((module) => module.moduleId) : [] }));
  return { requirementsRef: ref, requirements, modules, areas };
}
