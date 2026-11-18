import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { createSystemCoverage } from './control/system-coverage-fixture.mjs';

/** 调用已安装项目的控制器，确保运行不借用仓库源码入口。 */
function cli(repo, ...args) {
  const entry = join(repo, '.agents/skills/app-workflow-control/scripts/workflow-control.mjs');
  const result = spawnSync(process.execPath, [entry, ...args, '--repo', repo], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  assert.equal(result.error, undefined);
  return { code: result.status, data: JSON.parse(result.stdout.trim() || result.stderr.trim()) };
}

test('安装诊断拒绝缺失的系统覆盖与最终映射合同文件', (t) => {
  const prefix = join(resolve(tmpdir()), 'coverage-delivery-lint-');
  const repo = mkdtempSync(prefix);
  t.after(() => { assert.ok(repo.startsWith(prefix)); rmSync(repo, { recursive: true, force: true }); });
  installSkills({ projectRoot: repo, stacks: ['flutter'] });
  const root = join(repo, '.agents/skills/app-workflow-control');
  for (const path of ['schemas/system-coverage.schema.json', 'templates/system-coverage.json', 'schemas/integration-system-coverage.schema.json', 'templates/integration-system-coverage.json']) {
    const file = join(root, path);
    const original = readFileSync(file);
    try {
      unlinkSync(file);
      const result = cli(repo, 'lint');
      assert.notEqual(result.code, 0);
      assert.match(JSON.stringify(result.data), /无效或缺失/);
    } finally { writeFileSync(file, original); }
  }
  assert.equal(cli(repo, 'lint').code, 0);
});

for (const stack of ['unity', 'flutter', 'nodejs']) {
  test(`${stack} 单栈安装保留防遗漏资料并通过实际 CLI 强制覆盖门禁`, (t) => {
    const repo = mkdtempSync(join(resolve(tmpdir()), `coverage-delivery-${stack}-`));
    // 目录由本用例独占创建，清理前核对其父级和前缀，避免越出测试范围。
    t.after(() => {
      assert.ok(repo.startsWith(join(resolve(tmpdir()), `coverage-delivery-${stack}-`)));
      rmSync(repo, { recursive: true, force: true });
    });
    installSkills({ projectRoot: repo, stacks: [stack] });
    const root = join(repo, '.agents/skills');
    for (const path of [
      'app-creator-workflow/references/system-module-coverage.md',
      'app-workflow-control/scripts/runtime/system-coverage.mjs',
      'app-workflow-control/scripts/runtime/system-coverage-binding.mjs',
      'app-workflow-control/schemas/system-coverage.schema.json',
      'app-workflow-control/templates/system-coverage.json',
    ]) assert.ok(existsSync(join(root, path)), `安装遗漏 ${path}`);
    const initialized = cli(repo, 'init', '--stack', stack, '--id', 'feature', '--type', 'MODULE', '--objective', '验证已安装系统覆盖门禁');
    assert.equal(initialized.code, 0);
    const workPath = initialized.data.metadata.workItemPath;
    const work = JSON.parse(readFileSync(join(repo, workPath), 'utf8'));
    work.globalState = 'REVIEW';
    for (const gate of ['F0', 'F1', 'F2']) work.gateStatus[gate] = 'PASS';
    const path = stack === 'unity' ? 'Assets/Code/Feature.cs' : 'lib/feature.dart';
    work.allowedPaths = [path];
    writeFileSync(join(repo, workPath), JSON.stringify(work));
    const executionUnits = [{ unitId: 'feature', owner: 'test-owner', paths: [path], acceptanceCommands: ['node --version'] }];
    writeFileSync(join(repo, 'plan.json'), JSON.stringify({ executionUnits }));
    const rejected = cli(repo, 'plan', '--work-item', workPath, '--spec', 'plan.json');
    assert.notEqual(rejected.code, 0);
    assert.match(JSON.stringify(rejected.data), /systemCoverage/);
    const systemCoverage = createSystemCoverage(repo, work, executionUnits);
    writeFileSync(join(repo, 'plan.json'), JSON.stringify({ executionUnits, systemCoverage }));
    assert.equal(cli(repo, 'plan', '--work-item', workPath, '--spec', 'plan.json').code, 0);
    assert.equal(cli(repo, 'transition', '--work-item', workPath, '--to', 'IMPLEMENTING').code, 0);
    const state = JSON.parse(readFileSync(join(repo, work.evidenceRoot, 'execution-state.json'), 'utf8'));
    assert.deepEqual(state.executionPlan.systemCoverage, systemCoverage);
  });
}
