/** 以隔离的合成记录测试最终系统覆盖绑定，不声明真实项目已经验收。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateIntegrationSystemMappings, validateIntegrationSystemCase } from '../../skills/app-workflow-control/scripts/runtime/integration-system-coverage.mjs';
import { createSystemCoverage } from './system-coverage-fixture.mjs';

const schema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/integration-system-coverage.schema.json', import.meta.url), 'utf8'));
const validateShape = new Ajv2020({ strict: false }).compile(schema);

/** 创建独占临时项目，来源有两项需求，最终用一个跨对象用例验证。 */
function fixture(t, stack = 'flutter') {
  const parent = resolve(tmpdir());
  const repo = mkdtempSync(join(parent, 'final-system-coverage-'));
  t.after(() => {
    assert.equal(dirname(resolve(repo)), parent);
    assert.ok(basename(repo).startsWith('final-system-coverage-'));
    rmSync(repo, { recursive: true, force: true });
  });
  /** 保存真实字节并返回可核对的冻结身份。 */
  function put(path, value) {
    const absolute = join(repo, ...path.split('/'));
    mkdirSync(dirname(absolute), { recursive: true });
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    writeFileSync(absolute, bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const sourceUnits = [
    { unitId: 'source-a', acceptanceCommands: ['node --version'] },
    { unitId: 'source-b', acceptanceCommands: ['node --version'] },
  ];
  const sourceWork = { workItemId: 'source', stack };
  const sourcePack = { schemaVersion: '1.0', workItemId: 'source', stack, workItemType: 'MODULE', executionUnits: sourceUnits };
  sourcePack.systemCoverage = createSystemCoverage(repo, sourceWork, sourceUnits);
  const sourceRef = put('sources/pack.json', sourcePack);
  const sources = [{ packRef: sourceRef, pack: sourcePack, objectIds: ['first', 'second'] }];
  const units = [{ unitId: 'final-unit', acceptanceCommands: ['node --test tests/final.test.mjs'], resultPath: 'evidence/unit.json' }];
  const work = { schemaVersion: '1.0', workItemId: 'final', stack, workItemType: 'INTEGRATION', integrationPurpose: 'final', implementationPackageRef: { path: 'final/pack.json' } };
  const pack = { executionUnits: units, systemCoverage: createSystemCoverage(repo, work, units) };
  const scope = {
    objects: [{ objectId: 'first' }, { objectId: 'second' }],
    cases: [{ caseId: 'final-case', objectIds: ['first', 'second'] }],
    systemCoverageMappings: sourcePack.systemCoverage.requirements.map((requirement) => ({
      sourcePackageRef: sourceRef, requirementId: requirement.requirementId, moduleIds: [...requirement.moduleIds],
      objectIds: ['first', 'second'],
      verifications: [{ caseId: 'final-case', unitId: 'final-unit', command: units[0].acceptanceCommands[0] }],
    })),
  };
  const outputRef = put('evidence/command.log', '测试命令输出');
  const result = {
    schemaVersion: '1.0', workItemId: work.workItemId, stack, unitId: units[0].unitId,
    implementationPackageRef: work.implementationPackageRef.path, status: 'PASS', exitCode: 0,
    commandOutputs: [{ command: units[0].acceptanceCommands[0], exitCode: 0, outputFile: outputRef.path }],
  };
  put(units[0].resultPath, result);
  const actual = { unitId: units[0].unitId, command: units[0].acceptanceCommands[0], exitCode: 0, outputRef };
  /** 模拟调用方对实际输出内容和摘要的严格核对。 */
  function verifyIdentity(root, ref) {
    assert.equal(root, repo);
    const bytes = readFileSync(join(root, ...ref.path.split('/')));
    assert.ok(bytes.length);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.sha256);
    return ref.path;
  }
  return { repo, work, scope, sources, pack, put, sourcePack, sourceRef, result, actual, verifyIdentity };
}

/** 通过正式入口读取单次测试冻结映射。 */
function mappings(f) {
  return validateIntegrationSystemMappings(f.repo, f.work, f.scope, { sources: f.sources, pack: f.pack });
}

test('游戏与非游戏的来源需求可共同关联真实最终用例及验收输出', (t) => {
  for (const stack of ['unity', 'cocos', 'flutter', 'expo', 'esp32', 'nodejs']) {
    const f = fixture(t, stack);
    assert.equal(validateShape(f.scope.systemCoverageMappings), true, JSON.stringify(validateShape.errors));
    const checks = mappings(f);
    assert.deepEqual(checks.get('final-case'), { unitId: 'final-unit', command: f.actual.command });
    assert.doesNotThrow(() => validateIntegrationSystemCase(f.repo, f.work, f.pack, checks.get('final-case'), f.actual, { verifyIdentity: f.verifyIdentity }));
  }
});

test('遗漏当前需求、引用非当前需求或重复映射都不能通过', (t) => {
  const f = fixture(t);
  f.scope.systemCoverageMappings.pop();
  assert.throws(() => mappings(f), /缺少来源需求/);
  const g = fixture(t);
  g.scope.systemCoverageMappings[0].requirementId = '不存在';
  assert.throws(() => mappings(g), /未知或非当前需求/);
  const h = fixture(t);
  h.scope.systemCoverageMappings.push(structuredClone(h.scope.systemCoverageMappings[0]));
  assert.equal(validateShape(h.scope.systemCoverageMappings), false);
  assert.throws(() => mappings(h), /需求重复/);
});

test('来源包身份、冻结摘要、提供内容及模块集合必须一致', (t) => {
  const f = fixture(t);
  f.scope.systemCoverageMappings[0].sourcePackageRef = { ...f.sourceRef, sha256: '0'.repeat(64) };
  assert.throws(() => mappings(f), /未知或摘要不一致/);
  const g = fixture(t);
  g.sources[0].packRef = { ...g.sourceRef, sha256: '0'.repeat(64) };
  assert.throws(() => mappings(g), /冻结摘要不一致/);
  const h = fixture(t);
  h.sources[0].pack = { ...h.sourcePack, workItemId: 'other' };
  assert.throws(() => mappings(h), /调用方提供的内容不一致/);
  const i = fixture(t);
  i.scope.systemCoverageMappings[0].moduleIds = ['unknown-module'];
  assert.throws(() => mappings(i), /模块覆盖不一致/);
});

test('未知用例、未关联命令、同一用例的冲突映射及缺少对象覆盖都会阻断', (t) => {
  const f = fixture(t);
  f.scope.systemCoverageMappings[0].verifications[0].caseId = 'unknown';
  assert.throws(() => mappings(f), /未知用例/);
  const g = fixture(t);
  g.scope.systemCoverageMappings[0].verifications[0].command = 'node other.js';
  assert.throws(() => mappings(g), /未关联当前系统覆盖验收命令/);
  const h = fixture(t);
  h.scope.cases[0].objectIds = ['first'];
  assert.throws(() => mappings(h), /未覆盖全部关联对象/);
  const i = fixture(t);
  i.pack.executionUnits[0].acceptanceCommands.push('node alternative.js');
  i.pack.systemCoverage.modules[0].verifications.push({ unitId: 'final-unit', command: 'node alternative.js' });
  i.scope.systemCoverageMappings[1].verifications[0].command = 'node alternative.js';
  assert.throws(() => mappings(i), /关联多个验收命令/);
});

test('多条最终用例可以共同覆盖来源关联的全部对象', (t) => {
  const f = fixture(t);
  f.scope.cases[0].objectIds = ['first'];
  f.scope.cases.push({ caseId: 'second-case', objectIds: ['second'] });
  for (const mapping of f.scope.systemCoverageMappings) {
    mapping.verifications.push({ caseId: 'second-case', unitId: 'final-unit', command: f.actual.command });
  }
  assert.equal(mappings(f).size, 2);
});

test('同一来源的不同需求可分别映射各自消费者，但合计不得遗漏消费者', (t) => {
  const f = fixture(t);
  f.scope.cases[0].objectIds = ['first'];
  f.scope.cases.push({ caseId: 'second-case', objectIds: ['second'] });
  f.scope.systemCoverageMappings[0].objectIds = ['first'];
  f.scope.systemCoverageMappings[1].objectIds = ['second'];
  f.scope.systemCoverageMappings[1].verifications[0].caseId = 'second-case';
  assert.equal(validateShape(f.scope.systemCoverageMappings), true, JSON.stringify(validateShape.errors));
  assert.equal(mappings(f).size, 2);
  const g = fixture(t);
  for (const mapping of g.scope.systemCoverageMappings) mapping.objectIds = ['first'];
  assert.throws(() => mappings(g), /缺少来源消费者/);
});

test('每项需求的消费者必须明确、唯一且属于该来源', (t) => {
  const f = fixture(t);
  f.scope.systemCoverageMappings[0].objectIds = [];
  assert.equal(validateShape(f.scope.systemCoverageMappings), false);
  assert.throws(() => mappings(f), /objectIds.*非空/);
  const g = fixture(t);
  g.scope.systemCoverageMappings[0].objectIds = ['first', 'first'];
  assert.throws(() => mappings(g), /objectIds.*重复/);
  const h = fixture(t);
  h.scope.systemCoverageMappings[0].objectIds = ['outside'];
  assert.throws(() => mappings(h), /非来源消费者/);
});

test('结果需与冻结命令及该单元已登记输出绑定，失败和无关日志不能通过', (t) => {
  const f = fixture(t);
  const expected = mappings(f).get('final-case');
  const verify = (actual = f.actual) => validateIntegrationSystemCase(f.repo, f.work, f.pack, expected, actual, { verifyIdentity: f.verifyIdentity });
  assert.throws(() => verify({ ...f.actual, exitCode: 1 }), /退出码不一致/);
  assert.throws(() => verify({ ...f.actual, command: 'other' }), /命令或退出码不一致/);
  const unrelated = f.put('evidence/unrelated.log', '同样非空但不是单元命令输出');
  assert.throws(() => verify({ ...f.actual, outputRef: unrelated }), /未关联已登记/);
  f.result.commandOutputs[0].exitCode = 1;
  f.put(f.pack.executionUnits[0].resultPath, f.result);
  assert.throws(() => verify(), /未关联已登记/);
  f.result.status = 'FAIL';
  f.put(f.pack.executionUnits[0].resultPath, f.result);
  assert.throws(() => verify(), /结果身份或状态/);
});

test('字段、来源上下文、结果文件和遗漏的用例都不允许绕过', (t) => {
  const f = fixture(t);
  f.scope.systemCoverageMappings[0].unknown = true;
  assert.equal(validateShape(f.scope.systemCoverageMappings), false);
  assert.throws(() => mappings(f), /不支持字段/);
  const g = fixture(t);
  g.sources[0].objectIds = ['outside'];
  assert.throws(() => mappings(g), /未知集成对象/);
  const h = fixture(t);
  h.scope.cases.push({ caseId: 'orphan', objectIds: ['first'] });
  assert.throws(() => mappings(h), /用例缺少系统覆盖映射/);
  const i = fixture(t);
  i.result.implementationPackageRef = 'other/pack.json';
  i.put(i.pack.executionUnits[0].resultPath, i.result);
  assert.throws(() => validateIntegrationSystemCase(i.repo, i.work, i.pack, mappings(i).get('final-case'), i.actual, { verifyIdentity: i.verifyIdentity }), /结果身份或状态/);
});
