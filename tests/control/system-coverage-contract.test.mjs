/** 此文件使用本地合成材料检查系统覆盖合同，不代表真实项目通过验收。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { collectSystemCoverageReferences, systemCoverageAreas, validateSystemCoverage } from '../../skills/app-workflow-control/scripts/runtime/system-coverage.mjs';

const schema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/system-coverage.schema.json', import.meta.url), 'utf8'));
const validateShape = new Ajv2020({ strict: false }).compile(schema);

/** 在单次测试私有目录生成引用及真实摘要，不触碰正式工程。 */
function fixture(t, stack = 'flutter') {
  const tempRoot = resolve(tmpdir());
  const repo = mkdtempSync(join(tempRoot, 'system-coverage-'));
  t.after(() => {
    assert.equal(dirname(repo), tempRoot);
    rmSync(repo, { recursive: true, force: true });
  });
  /** 写入材料并以实际字节生成文件身份。 */
  function write(path, content) {
    const absolute = join(repo, ...path.split('/'));
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
    return { path, sha256: createHash('sha256').update(content).digest('hex') };
  }
  const requirementsRef = write('docs/requirements.md', '真实需求：完成主要流程');
  const designRef = write('docs/design.md', '真实设计：描述状态、行为和验证');
  const evidenceRef = write('docs/reuse-evidence.txt', '已有模块的真实引用记录');
  const work = { stack };
  const pack = {
    executionUnits: [{ unitId: 'implementation', acceptanceCommands: ['node --test tests/behavior.test.mjs'] }],
    systemCoverage: {
      requirementsRef,
      requirements: [{ requirementId: 'req', description: '实现主要流程', scope: 'current', reason: '本批交付', moduleIds: ['main'] }],
      modules: [{
        moduleId: 'main', status: 'implement', reason: '由当前单元实现', dependsOn: [], designRefs: [designRef],
        implementationUnitIds: ['implementation'], verifications: [{ unitId: 'implementation', command: 'node --test tests/behavior.test.mjs' }], evidenceRefs: [],
      }],
      areas: systemCoverageAreas(stack).map((areaId) => ({ areaId, reason: `本批已检查 ${areaId}`, moduleIds: areaId === 'flow' ? ['main'] : [] })),
    },
  };
  return { repo, work, pack, write, designRef, evidenceRef };
}

test('游戏和非游戏合同各自覆盖适用领域并符合独立 Schema', (t) => {
  for (const stack of ['unity', 'flutter', 'esp32', 'nodejs']) {
    const f = fixture(t, stack);
    assert.equal(validateShape(f.pack.systemCoverage), true, JSON.stringify(validateShape.errors));
    assert.equal(validateSystemCoverage(f.repo, f.work, f.pack), f.pack.systemCoverage);
    assert.deepEqual(collectSystemCoverageReferences(f.pack), ['docs/requirements.md', 'docs/design.md']);
  }
  assert.deepEqual(collectSystemCoverageReferences({}), []);
});

test('缺少合同或检查领域时阻止实施', (t) => {
  const f = fixture(t, 'unity');
  delete f.pack.systemCoverage;
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /systemCoverage/);
  const g = fixture(t, 'unity');
  g.pack.systemCoverage.areas = g.pack.systemCoverage.areas.filter((area) => area.areaId !== 'economy');
  assert.throws(() => validateSystemCoverage(g.repo, g.work, g.pack), /缺少系统检查领域：economy/);
  const h = fixture(t);
  h.pack.systemCoverage.areas.push({ areaId: 'unknown', reason: '测试未知领域', moduleIds: [] });
  assert.throws(() => validateSystemCoverage(h.repo, h.work, h.pack), /不支持的系统检查领域/);
});

test('各游戏栈必须检查玩家反馈和广告，并可记录不适用理由', (t) => {
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'roblox']) {
    const f = fixture(t, stack);
    for (const areaId of ['player-feedback', 'advertising']) {
      const area = f.pack.systemCoverage.areas.find((entry) => entry.areaId === areaId);
      assert.ok(area, `${stack} 缺少 ${areaId}`);
      area.reason = '本批没有受影响的相关需求';
      area.moduleIds = [];
      assert.doesNotThrow(() => validateSystemCoverage(f.repo, f.work, f.pack));
      f.pack.systemCoverage.areas = f.pack.systemCoverage.areas.filter((entry) => entry.areaId !== areaId);
      assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), new RegExp(`缺少系统检查领域：${areaId}`));
      f.pack.systemCoverage.areas.push(area);
    }
  }
});

test('非游戏栈不要求玩家反馈和广告领域', (t) => {
  for (const stack of ['flutter', 'expo', 'esp32', 'nodejs']) {
    const f = fixture(t, stack);
    assert.equal(f.pack.systemCoverage.areas.some((area) => ['player-feedback', 'advertising'].includes(area.areaId)), false);
    assert.doesNotThrow(() => validateSystemCoverage(f.repo, f.work, f.pack));
  }
});

test('当前需求不能指向后置或未决模块，后续需求可保留未实现模块', (t) => {
  const f = fixture(t);
  const module = f.pack.systemCoverage.modules[0];
  module.status = 'defer';
  module.implementationUnitIds = [];
  module.verifications = [];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /关联未就绪模块/);

  const g = fixture(t);
  g.pack.systemCoverage.requirements.push({ requirementId: 'later', description: '未来成长', scope: 'later', reason: '后续批次', moduleIds: ['growth'] });
  g.pack.systemCoverage.modules.push({ moduleId: 'growth', status: 'pending', reason: '等待规则决定', dependsOn: [], designRefs: [], implementationUnitIds: [], verifications: [], evidenceRefs: [] });
  assert.doesNotThrow(() => validateSystemCoverage(g.repo, g.work, g.pack));
  g.pack.systemCoverage.modules[0].dependsOn = ['growth'];
  assert.throws(() => validateSystemCoverage(g.repo, g.work, g.pack), /依赖未就绪模块/);
});

test('当前需求及模块必须相互关联，防止声明孤立模块', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.requirements[0].moduleIds = [];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /moduleIds.*非空数组/);
  const g = fixture(t);
  g.pack.systemCoverage.modules.push({ moduleId: 'orphan', status: 'defer', reason: '待定', dependsOn: [], designRefs: [], implementationUnitIds: [], verifications: [], evidenceRefs: [] });
  assert.throws(() => validateSystemCoverage(g.repo, g.work, g.pack), /系统模块缺少需求关联：orphan/);
});

test('至少存在当前需求且所有执行或复用模块都由当前需求驱动', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.requirements[0].scope = 'later';
  assert.equal(validateShape(f.pack.systemCoverage), false);
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /至少需要一个 current 需求/);

  const g = fixture(t);
  g.pack.systemCoverage.requirements[0].scope = 'later';
  g.pack.systemCoverage.requirements.push({ requirementId: 'other-req', description: '本批目标', scope: 'current', reason: '本批执行', moduleIds: ['other'] });
  g.pack.systemCoverage.modules.push({
    moduleId: 'other', status: 'reuse', reason: '本批复用', dependsOn: [], designRefs: [g.designRef],
    implementationUnitIds: [], verifications: [{ unitId: 'implementation', command: 'node --test tests/behavior.test.mjs' }], evidenceRefs: [g.evidenceRef],
  });
  assert.throws(() => validateSystemCoverage(g.repo, g.work, g.pack), /系统模块缺少 current 需求关联：main/);
  g.pack.systemCoverage.requirements[1].moduleIds.push('main');
  g.pack.systemCoverage.areas[0].moduleIds.push('other');
  assert.doesNotThrow(() => validateSystemCoverage(g.repo, g.work, g.pack));
});

test('所有活跃模块均需映射实际检查领域，避免把全部领域标为不适用', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.areas.forEach((area) => { area.moduleIds = []; });
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /系统模块缺少检查领域关联：main/);
  f.pack.systemCoverage.areas.find((area) => area.areaId === 'flow').moduleIds.push('main');
  assert.doesNotThrow(() => validateSystemCoverage(f.repo, f.work, f.pack));
});

test('缺设计、变更来源、空需求源和伪造摘要均不能通过', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.modules[0].designRefs = [];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /缺少设计依据/);

  const g = fixture(t);
  g.write(g.designRef.path, '修改后的设计');
  assert.throws(() => validateSystemCoverage(g.repo, g.work, g.pack), /冻结摘要不一致/);

  const h = fixture(t);
  h.pack.systemCoverage.requirementsRef = h.write('docs/empty.md', '');
  assert.throws(() => validateSystemCoverage(h.repo, h.work, h.pack), /不能为空文件/);

  const i = fixture(t);
  i.pack.systemCoverage.requirementsRef.sha256 = 'fake';
  assert.throws(() => validateSystemCoverage(i.repo, i.work, i.pack), /小写 SHA-256/);
});

test('复用仍需已有证据和本批验证，不能用历史证据代替当前验证', (t) => {
  const f = fixture(t);
  const module = f.pack.systemCoverage.modules[0];
  module.status = 'reuse';
  module.implementationUnitIds = [];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /复用缺少已有证据/);
  module.evidenceRefs = [f.evidenceRef];
  module.verifications = [];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /缺少本批验证/);
  module.verifications = [{ unitId: 'implementation', command: 'node --test tests/behavior.test.mjs' }];
  assert.doesNotThrow(() => validateSystemCoverage(f.repo, f.work, f.pack));
  assert.deepEqual(collectSystemCoverageReferences(f.pack), ['docs/requirements.md', 'docs/design.md', 'docs/reuse-evidence.txt']);
});

test('必须关联真实单元与其声明的验收命令，所有单元都须有覆盖', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.modules[0].verifications[0].unitId = 'missing';
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /验证引用未知单元/);

  const g = fixture(t);
  g.pack.systemCoverage.modules[0].verifications[0].command = 'echo fake';
  assert.throws(() => validateSystemCoverage(g.repo, g.work, g.pack), /验证命令不属于单元/);

  const h = fixture(t);
  h.pack.executionUnits.push({ unitId: 'orphan', acceptanceCommands: ['node --version'] });
  assert.throws(() => validateSystemCoverage(h.repo, h.work, h.pack), /实施单元缺少系统模块关联：orphan/);
});

test('跨单元验证必须等待当前模块的实现单元，允许传递依赖', (t) => {
  const f = fixture(t);
  f.pack.executionUnits.push({ unitId: 'test', acceptanceCommands: ['node --test'] });
  f.pack.systemCoverage.modules[0].verifications = [{ unitId: 'test', command: 'node --test' }];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /缺少实施之后的验证/);

  f.pack.executionUnits.push({ unitId: 'middle', acceptanceCommands: ['node --check index.js'], dependsOn: ['implementation'] });
  f.pack.executionUnits[1].dependsOn = ['middle'];
  f.pack.systemCoverage.modules[0].verifications.push({ unitId: 'middle', command: 'node --check index.js' });
  assert.doesNotThrow(() => validateSystemCoverage(f.repo, f.work, f.pack));
});

test('模块循环依赖及未知依赖不能作为有效实施计划', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.modules[0].dependsOn = ['missing'];
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /依赖未知模块/);
  f.pack.systemCoverage.modules[0].dependsOn = ['other'];
  f.pack.systemCoverage.requirements[0].moduleIds.push('other');
  f.pack.systemCoverage.modules.push({
    moduleId: 'other', status: 'reuse', reason: '已有模块', dependsOn: ['main'], designRefs: [f.designRef],
    implementationUnitIds: [], verifications: [{ unitId: 'implementation', command: 'node --test tests/behavior.test.mjs' }], evidenceRefs: [f.evidenceRef],
  });
  f.pack.systemCoverage.areas[0].moduleIds.push('other');
  assert.throws(() => validateSystemCoverage(f.repo, f.work, f.pack), /依赖存在循环/);
});

test('Schema 拒绝未知字段、空白理由和不满足状态约束的数据', (t) => {
  const f = fixture(t);
  f.pack.systemCoverage.modules[0].unexpected = '拼写错误';
  assert.equal(validateShape(f.pack.systemCoverage), false);
  delete f.pack.systemCoverage.modules[0].unexpected;
  f.pack.systemCoverage.areas[0].reason = ' ';
  assert.equal(validateShape(f.pack.systemCoverage), false);
  f.pack.systemCoverage.areas[0].reason = '有依据';
  f.pack.systemCoverage.modules[0].status = 'reuse';
  assert.equal(validateShape(f.pack.systemCoverage), false);
});

test('Schema 与运行时均拒绝缺字段、未知字段、空数组成员及重复标识', (t) => {
  const missing = fixture(t);
  delete missing.pack.systemCoverage.modules[0].reason;
  assert.equal(validateShape(missing.pack.systemCoverage), false);
  assert.throws(() => validateSystemCoverage(missing.repo, missing.work, missing.pack), /缺少字段：reason/);

  const extra = fixture(t);
  extra.pack.systemCoverage.requirements[0].unknown = '误填';
  assert.equal(validateShape(extra.pack.systemCoverage), false);
  assert.throws(() => validateSystemCoverage(extra.repo, extra.work, extra.pack), /包含不支持字段：unknown/);

  const emptyItem = fixture(t);
  emptyItem.pack.systemCoverage.areas.push(null);
  assert.equal(validateShape(emptyItem.pack.systemCoverage), false);
  assert.throws(() => validateSystemCoverage(emptyItem.repo, emptyItem.work, emptyItem.pack), /areas 条目必须为对象/);

  const duplicateIds = fixture(t);
  duplicateIds.pack.systemCoverage.requirements[0].moduleIds.push('main');
  assert.equal(validateShape(duplicateIds.pack.systemCoverage), false);
  assert.throws(() => validateSystemCoverage(duplicateIds.repo, duplicateIds.work, duplicateIds.pack), /moduleIds 不允许重复/);

  const duplicateCheck = fixture(t);
  duplicateCheck.pack.systemCoverage.modules[0].verifications.push({ ...duplicateCheck.pack.systemCoverage.modules[0].verifications[0] });
  assert.equal(validateShape(duplicateCheck.pack.systemCoverage), false);
  assert.throws(() => validateSystemCoverage(duplicateCheck.repo, duplicateCheck.work, duplicateCheck.pack), /验证命令重复/);

  const duplicateRequirement = fixture(t);
  duplicateRequirement.pack.systemCoverage.requirements.push({ ...duplicateRequirement.pack.systemCoverage.requirements[0], description: '另一个条目使用相同标识' });
  assert.throws(() => validateSystemCoverage(duplicateRequirement.repo, duplicateRequirement.work, duplicateRequirement.pack), /requirementId 不允许重复/);
});
