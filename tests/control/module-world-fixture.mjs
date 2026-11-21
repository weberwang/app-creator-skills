/** 三维共享夹具使用真实控制器完成基础工程，人工和引擎材料均为测试替身。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { completeUnit, initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { bindEvidence, bindImplementation, put, putJson, readWork } from './controller-fixture.mjs';

/** 真实执行一个基础工程单元，并在活动模块中冻结阶段四视觉清单。 */
export async function finishWorldFoundation(fixture, baselineRef) {
  const { repo, context } = fixture;
  const initialized = await initializeWork({ repo, args: { id: `foundation-${context.workItemId}`, stack: context.stack, type: 'FOUNDATION',
    objective: '建立基础工程与全局方向', 'project-id': context.projectId } });
  const workPath = initialized.metadata.workItemPath;
  let work = await readWork(repo, workPath);
  const manifest = fixture.write('spec/foundation-manifest.json', { schemaVersion: '1.0', foundationWorkItemPath: workPath,
    projectId: work.projectId, stack: work.stack, baselines: [{ route: 'world-3d', ref: baselineRef }] });
  work.foundationVisualRef = manifest;
  work.globalState = 'REVIEW';
  for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
  await putJson(repo, workPath, work);
  const sourcePath = work.stack === 'unity' ? `Assets/Scripts/${work.workItemId}.cs` : `src/game/${work.workItemId}.ts`;
  const { packPath, units } = await bindImplementation({ repo, work, workPath, stage: 'foundation', unitPaths: [sourcePath] });
  const pack = JSON.parse(await readFile(resolve(repo, packPath), 'utf8'));
  pack.systemCoverage.modules[0].designRefs.push(manifest);
  await putJson(repo, packPath, pack);
  await transitionWork({ repo, workItem: workPath, to: 'IMPLEMENTING', args: {} });
  work = await readWork(repo, workPath);
  await put(repo, sourcePath, '// 测试基础工程单元\n');
  const command = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true });
  assert.equal(command.status, 0, command.stderr);
  const output = `${work.evidenceRoot}/node-version.txt`;
  await put(repo, output, command.stdout);
  await putJson(repo, units[0].resultPath, { schemaVersion: '1.0', status: 'PASS', workItemId: work.workItemId,
    stack: work.stack, implementationPackageRef: packPath, unitId: units[0].unitId, sequence: 1, exitCode: 0,
    files: units[0].paths, commandOutputs: [{ command: 'node --version', exitCode: 0, outputFile: output }] });
  await completeUnit({ repo, workItem: workPath, resultPath: units[0].resultPath });
  work = await readWork(repo, workPath);
  await bindEvidence({ repo, work, workPath, packPath, stage: 'foundation' });
  await transitionWork({ repo, workItem: workPath, to: 'VALIDATING', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'PASSED', args: {} });
  await transitionWork({ repo, workItem: workPath, to: 'COMPLETE', args: {} });
  return manifest;
}
