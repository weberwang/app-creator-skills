/** 以隔离的合成记录测试最终系统覆盖绑定，不声明真实项目已经验收。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateIntegrationSystemMappings, validateIntegrationSystemCase } from '../../skills/app-workflow-control/scripts/runtime/integration-system-coverage.mjs';
import { collectIntegrationSystemSources } from '../../skills/app-workflow-control/scripts/runtime/integration-system-sources.mjs';
import { validateFinalIntegration, validateIntegrationScope } from '../../skills/app-workflow-control/scripts/runtime/final-integration.mjs';
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

/** 构造同一对象的历史及当前来源，历史 V1 包独立冻结。 */
function cumulativeFixture(t, { stack = 'unity', type = 'SCENE' } = {}) {
  const f = fixture(t, stack);
  f.work.projectId = 'project-a';
  const unit = [{ unitId: 'scene-unit', acceptanceCommands: ['node --version'] }];
  /** 为每个场景或历史功能来源建立独立实施包，避免按同名需求合并来源。 */
  function makePack(id) {
    const pack = { schemaVersion: '1.0', workItemId: id, stack, workItemType: type, executionUnits: unit };
    pack.systemCoverage = createSystemCoverage(f.repo, { workItemId: id, stack }, unit);
    return { pack, ref: f.put(`sources/${id}-pack.json`, pack) };
  }
  const oldV1 = makePack('old-v1');
  const oldPack = makePack('old');
  const currentPack = makePack('current');
  const oldBaseline = f.put('sources/old-baseline.json', { schemaVersion: '1.0', systemCoverageOrigins: [oldV1.ref] });
  const currentBaseline = f.put('sources/current-baseline.json', { schemaVersion: '1.0' });
  const base = { projectId: 'project-a', stack, workItemType: type, globalState: 'COMPLETE' };
  const old = { ...base, workItemId: 'old', implementationPackageRef: { path: oldPack.ref.path }, visual: { objectId: 'first', stage: 'V5', functionBaselineRef: oldBaseline } };
  const current = { ...base, workItemId: 'current', implementationPackageRef: { path: currentPack.ref.path }, visual: { objectId: 'first', stage: 'V5', functionBaselineRef: currentBaseline } };
  const oldRef = f.put('sources/old-work.json', old);
  const currentRef = f.put('sources/current-work.json', current);
  f.scope.objects = [{ objectId: 'first', workItemRef: currentRef, functionBaselineRef: currentBaseline }];
  f.scope.cases = [{ caseId: 'final-case', objectIds: ['first'] }];
  f.scope.productionSources = [{ workItemRef: oldRef, objectIds: ['first'] }];
  f.scope.systemCoverageMappings = [];
  const inspections = [];
  /** 记录实际调用的校验模式；本夹具以合成结果替代来源检查器。 */
  const inspect = (repo, source, options) => {
    assert.equal(repo, f.repo);
    inspections.push({ workItemId: source.workItemId, ...options });
    return { status: 'PASS', blocking: [] };
  };
  return { ...f, old, oldRef, current, currentRef, oldV1, oldPack, currentPack, inspect, inspections, makePack };
}

/** 按已收集的真实来源包生成最终映射，验证缺项时由正式覆盖检查器拒绝。 */
function mapCumulativeSources(f, sources) {
  f.scope.systemCoverageMappings = sources.flatMap(({ packRef, pack, objectIds }) => pack.systemCoverage.requirements
    .filter((requirement) => requirement.scope === 'current')
    .map((requirement) => ({
      sourcePackageRef: packRef, requirementId: requirement.requirementId, moduleIds: [...requirement.moduleIds], objectIds,
      verifications: [{ caseId: 'final-case', unitId: 'final-unit', command: f.actual.command }],
    })));
}

test('未绑定总范围的场景历史来源将旧需求和 V1 原包映射到当前验收命令', (t) => {
  const f = cumulativeFixture(t);
  const sources = collectIntegrationSystemSources(f.repo, f.work, f.scope, f.inspect);
  assert.deepEqual(sources.map((item) => item.pack.workItemId).sort(), ['current', 'old', 'old-v1']);
  assert.deepEqual(f.inspections, [
    { workItemId: 'current', strict: true, historical: false },
    { workItemId: 'old', strict: true, historical: true },
  ]);
  mapCumulativeSources(f, sources);
  const checks = validateIntegrationSystemMappings(f.repo, f.work, f.scope, { sources, pack: f.pack });
  assert.doesNotThrow(() => validateIntegrationSystemCase(f.repo, f.work, f.pack, checks.get('final-case'), f.actual, { verifyIdentity: f.verifyIdentity }));
  f.scope.systemCoverageMappings = f.scope.systemCoverageMappings.filter((mapping) => mapping.sourcePackageRef.path !== f.oldV1.ref.path);
  assert.throws(() => validateIntegrationSystemMappings(f.repo, f.work, f.scope, { sources, pack: f.pack }), /缺少来源需求/);
});

test('未绑定总范围的页面多批历史来源均映射到当前验收，遗漏旧包时拒绝', (t) => {
  const f = cumulativeFixture(t, { stack: 'flutter', type: 'PAGE' });
  const secondPack = f.makePack('old-second');
  const second = { ...f.old, workItemId: 'old-second', implementationPackageRef: { path: secondPack.ref.path } };
  f.scope.productionSources.push({ workItemRef: f.put('sources/old-second.json', second), objectIds: ['first'] });
  const sources = collectIntegrationSystemSources(f.repo, f.work, f.scope, f.inspect);
  assert.deepEqual(sources.map((item) => item.pack.workItemId).sort(), ['current', 'old', 'old-second', 'old-v1']);
  assert.deepEqual(f.inspections.map(({ workItemId, historical }) => [workItemId, historical]), [
    ['current', false], ['old', true], ['old-second', true],
  ]);
  mapCumulativeSources(f, sources);
  const checks = validateIntegrationSystemMappings(f.repo, f.work, f.scope, { sources, pack: f.pack });
  assert.doesNotThrow(() => validateIntegrationSystemCase(f.repo, f.work, f.pack, checks.get('final-case'), f.actual, { verifyIdentity: f.verifyIdentity }));
  f.scope.systemCoverageMappings = f.scope.systemCoverageMappings.filter((mapping) => mapping.sourcePackageRef.path !== secondPack.ref.path);
  assert.throws(() => validateIntegrationSystemMappings(f.repo, f.work, f.scope, { sources, pack: f.pack }), /缺少来源需求/);
});

test('页面历史批次必须与当前对象同类型、同身份且真实完成', (t) => {
  for (const [label, mutate] of [
    ['场景不能冒充页面', (old) => { old.workItemType = 'SCENE'; }],
    ['显示层不能冒充页面', (old) => { old.workItemType = 'DISPLAY_LAYER'; }],
    ['项目不匹配', (old) => { old.projectId = 'other'; }],
    ['技术栈不匹配', (old) => { old.stack = 'expo'; }],
    ['页面不匹配', (old) => { old.visual.objectId = 'other'; }],
    ['同一工作项', (old) => { old.workItemId = 'current'; }],
    ['仅通过未完成', (old) => { old.globalState = 'PASSED'; }],
    ['阶段未完成', (old) => { old.visual.stage = 'V4'; }],
    ['设计提案', (old) => { old.visual.designIntent = 'proposal'; }],
    ['绑定其他范围', (old) => { old.productionScopeRef = { path: 'other.json', sha256: 'a'.repeat(64) }; }],
  ]) {
    const f = cumulativeFixture(t, { stack: 'flutter', type: 'PAGE' });
    mutate(f.old);
    f.scope.productionSources[0].workItemRef = f.put('sources/old-work.json', f.old);
    assert.throws(() => collectIntegrationSystemSources(f.repo, f.work, f.scope, f.inspect), /历史来源必须是同项目/, label);
  }
  const duplicate = cumulativeFixture(t, { stack: 'flutter', type: 'PAGE' });
  duplicate.scope.productionSources.push(structuredClone(duplicate.scope.productionSources[0]));
  assert.throws(() => collectIntegrationSystemSources(duplicate.repo, duplicate.work, duplicate.scope, duplicate.inspect), /历史对象来源不能重复/);
  const forged = cumulativeFixture(t, { stack: 'flutter', type: 'PAGE' });
  forged.put('sources/old-work.json', { ...forged.old, altered: true });
  assert.throws(() => collectIntegrationSystemSources(forged.repo, forged.work, forged.scope, forged.inspect), /内容已变化/);
  const strict = cumulativeFixture(t, { stack: 'flutter', type: 'PAGE' });
  assert.throws(() => collectIntegrationSystemSources(strict.repo, strict.work, strict.scope, (repo, source, options) => {
    assert.equal(options.historical, source.workItemId === 'old');
    return source.workItemId === 'old' ? { status: 'FAIL', blocking: ['伪造完成'] } : { status: 'PASS', blocking: [] };
  }), /严格检查未通过/);
});

for (const [type, stack] of [['SCENE', 'unity'], ['PAGE', 'flutter']]) test(`${type} 完整 final 入口检查未绑定范围的历史需求与本次真实命令结果`, (t) => {
  const f = cumulativeFixture(t, { type, stack });
  const sources = collectIntegrationSystemSources(f.repo, f.work, f.scope, f.inspect);
  mapCumulativeSources(f, sources);
  Object.assign(f.scope, { schemaVersion: '1.0', projectId: f.work.projectId, stack: f.work.stack, workItemId: f.work.workItemId });
  f.work.evidenceRoot = 'evidence';
  f.pack.executionUnits[0].paths = ['src/final.mjs'];
  f.put(f.work.implementationPackageRef.path, f.pack);
  f.work.integrationScopeRef = f.put('final/scope.json', f.scope);
  const caseRef = f.put('evidence/final-case.json', {
    schemaVersion: '1.0', projectId: f.work.projectId, stack: f.work.stack, workItemId: f.work.workItemId,
    caseId: 'final-case', status: 'PASS', objectIds: ['first'], ...f.actual,
  });
  f.work.integrationEvidenceRef = f.put('evidence/final-result.json', {
    schemaVersion: '1.0', projectId: f.work.projectId, stack: f.work.stack, workItemId: f.work.workItemId,
    status: 'PASS', objects: f.scope.objects, cases: [{ caseId: 'final-case', objectIds: ['first'], evidenceRef: caseRef }],
  });
  f.work.evidenceRef = f.put('evidence/manifest.json', {
    schemaVersion: '1.0', workItemId: f.work.workItemId, stack: f.work.stack,
    items: [{ status: 'PASS', path: caseRef.path }, { status: 'PASS', path: f.work.integrationEvidenceRef.path }],
  });
  assert.doesNotThrow(() => validateFinalIntegration(f.repo, f.work, f.inspect));
  f.scope.systemCoverageMappings = f.scope.systemCoverageMappings.filter((mapping) => mapping.sourcePackageRef.path !== f.oldV1.ref.path);
  f.work.integrationScopeRef = f.put('final/scope.json', f.scope);
  assert.throws(() => validateIntegrationScope(f.repo, f.work, { inspectSource: f.inspect }), /缺少来源需求/);
});

test('未绑定总范围的历史来源必须是当前对象的不同已完成场景', (t) => {
  const variants = [
    ['不同项目', (old) => { old.projectId = 'other'; }],
    ['不同技术栈', (old) => { old.stack = 'cocos'; }],
    ['其他对象', (old) => { old.visual.objectId = 'other'; }],
    ['其他类型', (old) => { old.workItemType = 'PAGE'; }],
    ['同一工作项', (old) => { old.workItemId = 'current'; }],
    ['空工作项标识', (old) => { old.workItemId = '  '; }],
    ['已绑定其他范围', (old) => { old.productionScopeRef = { path: 'other.json', sha256: 'a'.repeat(64) }; }],
    ['尚未完成', (old) => { old.globalState = 'PASSED'; }],
    ['尚未到 V5', (old) => { old.visual.stage = 'V4'; }],
    ['仅设计提案', (old) => { old.visual.designIntent = 'proposal'; }],
  ];
  for (const [label, mutate] of variants) {
    const f = cumulativeFixture(t);
    mutate(f.old);
    f.scope.productionSources[0].workItemRef = f.put('sources/old-work.json', f.old);
    assert.throws(() => collectIntegrationSystemSources(f.repo, f.work, f.scope, f.inspect), /历史来源必须是同项目/, label);
  }
  const missing = cumulativeFixture(t);
  delete missing.scope.productionSources[0].workItemRef.sha256;
  assert.throws(() => collectIntegrationSystemSources(missing.repo, missing.work, missing.scope, missing.inspect), /必须冻结工作项/);
  const duplicate = cumulativeFixture(t);
  duplicate.scope.productionSources.push(structuredClone(duplicate.scope.productionSources[0]));
  assert.throws(() => collectIntegrationSystemSources(duplicate.repo, duplicate.work, duplicate.scope, duplicate.inspect), /历史对象来源不能重复/);
  const alias = cumulativeFixture(t);
  alias.scope.productionSources.push({ workItemRef: alias.put('sources/old-alias.json', alias.old), objectIds: ['first'] });
  assert.throws(() => collectIntegrationSystemSources(alias.repo, alias.work, alias.scope, alias.inspect), /历史对象来源不能重复/);
  const current = cumulativeFixture(t);
  current.scope.productionSources[0].workItemRef = current.currentRef;
  assert.throws(() => collectIntegrationSystemSources(current.repo, current.work, current.scope, current.inspect), /历史来源必须是同项目/);
  const changed = cumulativeFixture(t);
  changed.put('sources/old-work.json', { ...changed.old, changed: true });
  assert.throws(() => collectIntegrationSystemSources(changed.repo, changed.work, changed.scope, changed.inspect), /内容已变化/);
});

test('当前和历史场景分别执行严格检查，任何一侧失败均不能被另一侧通过代替', (t) => {
  for (const failing of ['current', 'old']) {
    const f = cumulativeFixture(t);
    assert.throws(() => collectIntegrationSystemSources(f.repo, f.work, f.scope, (repo, source, options) => {
      assert.equal(options.strict, true);
      assert.equal(options.historical, source.workItemId === 'old');
      return source.workItemId === failing ? { status: 'FAIL', blocking: ['合成失败'] } : { status: 'PASS', blocking: [] };
    }), /严格检查未通过/);
  }
});
