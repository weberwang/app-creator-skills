/** 验证 Node.js 服务端最终集成冻结真实模块范围及独立行为输出。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateFinalIntegration, validateIntegrationScope } from '../../skills/app-workflow-control/scripts/runtime/final-integration.mjs';

/** 在隔离目录创建合成文件并按真实内容生成引用。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'nodejs-integration-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const put = (path, value) => { const file = join(repo, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  const identity = (path) => ({ path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') });
  const project = { projectId: 'project', stack: 'nodejs' };
  const objects = ['account', 'orders'].map((name) => {
    const file = `src/${name}/service.mjs`;
    const helper = `src/${name}/helper.mjs`;
    put(file, `export const name = '${name}';\n`); put(helper, 'export const valid = true;\n');
    const packPath = `records/${name}-pack.json`;
    const unitPath = `records/${name}-result.json`;
    put(unitPath, { schemaVersion: '1.0', workItemId: name, status: 'PASS' });
    put(`evidence/${name}/execution-state.json`, { schemaVersion: '1.0', workItemId: name });
    put(packPath, { schemaVersion: '1.0', workItemId: name, stack: project.stack, workItemType: 'MODULE', executionUnits: [{ paths: [`src/${name}`], resultPath: unitPath }] });
    const manifestPath = `records/${name}-manifest.json`;
    put(manifestPath, { schemaVersion: '1.0', workItemId: name, stack: project.stack, implementationPackageRef: packPath, items: [] });
    const workPath = `records/${name}-work.json`;
    put(workPath, { ...project, workItemId: name, workItemType: 'MODULE', globalState: 'COMPLETE', evidenceRoot: `evidence/${name}`, implementationPackageRef: { path: packPath }, evidenceRef: { path: manifestPath } });
    return { objectId: name, workItemRef: identity(workPath), implementationPackageRef: identity(packPath), evidenceRef: identity(manifestPath), deliverableRefs: [identity(file), identity(helper)] };
  });
  put('final/checks/result.json', { schemaVersion: '1.0', workItemId: 'final', status: 'PASS' });
  put('final/execution-state.json', { schemaVersion: '1.0', workItemId: 'final' });
  put('final/pack.json', { schemaVersion: '1.0', executionUnits: [{ resultPath: 'final/checks/result.json' }] });
  const work = { ...project, workItemId: 'final', workItemType: 'INTEGRATION', integrationPurpose: 'final', evidenceRoot: 'final', implementationPackageRef: { path: 'final/pack.json' }, evidenceRef: { path: 'final/manifest.json' } };
  const scope = { schemaVersion: '1.0', ...project, workItemId: work.workItemId, objects: structuredClone(objects), cases: [{ caseId: 'submit', objectIds: ['account', 'orders'] }] };
  put('final/scope.json', scope); work.integrationScopeRef = identity('final/scope.json');
  const result = { schemaVersion: '1.0', ...project, workItemId: work.workItemId, status: 'PASS', objects: structuredClone(objects), cases: [{ caseId: 'submit', objectIds: ['account', 'orders'] }] };
  put('final/output.log', '合成的命令原始输出\n');
  const actual = { schemaVersion: '1.0', ...project, workItemId: work.workItemId, caseId: 'submit', status: 'PASS', objectIds: ['account', 'orders'], command: 'node --test', exitCode: 0, outputRef: identity('final/output.log') };
  /** 分别冻结范围和结果；测试替换材料时不能自动改写已冻结范围。 */
  const save = () => {
    put('final/case.json', actual); result.cases[0].evidenceRef = identity('final/case.json');
    put('final/result.json', result); work.integrationEvidenceRef = identity('final/result.json');
    put('final/manifest.json', { schemaVersion: '1.0', workItemId: work.workItemId, stack: work.stack, items: [{ status: 'PASS', path: 'final/result.json' }, { status: 'PASS', path: 'final/case.json' }] });
  };
  save();
  return { repo, put, identity, work, scope, result, actual, save, inspect: () => ({ status: 'PASS', blocking: [] }) };
}

test('服务端最终集成可验证已完成模块及其全部交付，不需要视觉阶段', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => validateIntegrationScope(f.repo, f.work));
  assert.doesNotThrow(() => validateFinalIntegration(f.repo, f.work, f.inspect));
  assert.throws(() => validateFinalIntegration(f.repo, f.work, () => ({ status: 'BLOCKED' })), /严格检查未通过/);
  f.result.cases[0].objectIds = ['account']; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /覆盖与预先冻结的范围不一致/);
});

test('不允许替换来源模块、实施包、清单或源码', (t) => {
  const f = fixture(t);
  f.put('src/account/service.mjs', '变更后的内容');
  assert.throws(() => validateIntegrationScope(f.repo, f.work), /交付文件内容已变化/);
  const f2 = fixture(t); f2.put('src/account/new.mjs', '新文件');
  assert.throws(() => validateIntegrationScope(f2.repo, f2.work), /未覆盖实施包的全部实际文件/);
  const f3 = fixture(t); f3.put('records/account-pack.json', {});
  assert.throws(() => validateIntegrationScope(f3.repo, f3.work), /implementationPackageRef内容已变化/);
  const f4 = fixture(t); f4.put('records/account-manifest.json', {});
  assert.throws(() => validateIntegrationScope(f4.repo, f4.work), /evidenceRef内容已变化/);
  const f5 = fixture(t); const source = JSON.parse(readFileSync(join(f5.repo, 'records/account-work.json'), 'utf8')); source.globalState = 'PASSED'; f5.put('records/account-work.json', source); f5.scope.objects[0].workItemRef = f5.identity('records/account-work.json'); f5.put('final/scope.json', f5.scope); f5.work.integrationScopeRef = f5.identity('final/scope.json');
  assert.throws(() => validateIntegrationScope(f5.repo, f5.work), /已完成的无视觉 MODULE/);
});

test('交付文件可以为空，但仍必须冻结和校验其实际摘要', (t) => {
  const f = fixture(t);
  f.put('src/account/empty.txt', '');
  f.scope.objects[0].deliverableRefs.push(f.identity('src/account/empty.txt'));
  f.put('final/scope.json', f.scope); f.work.integrationScopeRef = f.identity('final/scope.json');
  f.result.objects = structuredClone(f.scope.objects); f.save();
  assert.doesNotThrow(() => validateFinalIntegration(f.repo, f.work, f.inspect));
  f.put('src/account/empty.txt', '文件内容不再为空');
  assert.throws(() => validateIntegrationScope(f.repo, f.work), /交付文件内容已变化/);
});

test('范围不能遗漏文件，结果不能换绑已冻结的文件或借控制记录自证', (t) => {
  const f = fixture(t); f.scope.objects[0].deliverableRefs.pop(); f.put('final/scope.json', f.scope); f.work.integrationScopeRef = f.identity('final/scope.json');
  assert.throws(() => validateIntegrationScope(f.repo, f.work), /未覆盖实施包的全部实际文件/);
  const f2 = fixture(t); f2.result.objects[0].deliverableRefs[0] = f2.result.objects[0].deliverableRefs[1]; f2.save();
  assert.throws(() => validateFinalIntegration(f2.repo, f2.work, f2.inspect), /交付文件与冻结范围不一致/);
  const f3 = fixture(t); f3.actual.outputRef = f3.identity('final/scope.json'); f3.save();
  assert.throws(() => validateFinalIntegration(f3.repo, f3.work, f3.inspect), /原始输出不能使用控制记录/);
  // 相同文件的硬链接别名仍是控制记录，不能通过换路径规避检查。
  const f4 = fixture(t); linkSync(join(f4.repo, 'final/scope.json'), join(f4.repo, 'final/alias.log')); f4.actual.outputRef = f4.identity('final/alias.log'); f4.save();
  assert.throws(() => validateFinalIntegration(f4.repo, f4.work, f4.inspect), /原始输出不能使用控制记录/);
});

test('最终行为必须包含成功命令及不可篡改的独立原始输出', (t) => {
  const f = fixture(t); f.actual.exitCode = 1; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /零退出码/);
  f.actual.exitCode = 0; f.actual.command = ''; f.save();
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /真实命令/);
  f.actual.command = 'node --test'; f.save(); f.put('final/output.log', '输出被修改');
  assert.throws(() => validateFinalIntegration(f.repo, f.work, f.inspect), /原始输出内容已变化/);
  const f2 = fixture(t); f2.put('outside.log', '其他工作项日志'); f2.actual.outputRef = f2.identity('outside.log'); f2.save();
  assert.throws(() => validateFinalIntegration(f2.repo, f2.work, f2.inspect), /当前工作项的 evidenceRoot/);
});

test('原始输出不能指向任意命名的执行结果或执行状态，包括硬链接别名', (t) => {
  const current = fixture(t); current.actual.outputRef = current.identity('final/checks/result.json'); current.save();
  assert.throws(() => validateFinalIntegration(current.repo, current.work, current.inspect), /原始输出不能使用控制记录/);
  const currentAlias = fixture(t); linkSync(join(currentAlias.repo, 'final/checks/result.json'), join(currentAlias.repo, 'final/result-alias.log')); currentAlias.actual.outputRef = currentAlias.identity('final/result-alias.log'); currentAlias.save();
  assert.throws(() => validateFinalIntegration(currentAlias.repo, currentAlias.work, currentAlias.inspect), /原始输出不能使用控制记录/);
  const sourceAlias = fixture(t); linkSync(join(sourceAlias.repo, 'records/account-result.json'), join(sourceAlias.repo, 'final/source-alias.log')); sourceAlias.actual.outputRef = sourceAlias.identity('final/source-alias.log'); sourceAlias.save();
  assert.throws(() => validateFinalIntegration(sourceAlias.repo, sourceAlias.work, sourceAlias.inspect), /原始输出不能使用控制记录/);
  const sourceState = fixture(t); linkSync(join(sourceState.repo, 'evidence/account/execution-state.json'), join(sourceState.repo, 'final/state-alias.log')); sourceState.actual.outputRef = sourceState.identity('final/state-alias.log'); sourceState.save();
  assert.throws(() => validateFinalIntegration(sourceState.repo, sourceState.work, sourceState.inspect), /原始输出不能使用控制记录/);
});
