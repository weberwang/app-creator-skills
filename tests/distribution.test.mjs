/** 在临时目标项目运行实际安装后的命令，防止只在源码目录可用。 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { installSkills, STACKS } from '../scripts/install-project-skills.mjs';

/** 创建本测试独占的项目根目录并登记清理。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-distribution-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** 调用安装产物，不借用仓库内的控制脚本或模块路径。 */
function cli(root, ...args) {
  const entry = join(root, '.agents', 'skills', 'app-workflow-control', 'scripts', 'workflow-control.mjs');
  const result = spawnSync(process.execPath, [entry, ...args, '--repo', root], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  assert.equal(result.error, undefined);
  let data;
  try { data = JSON.parse(result.stdout.trim() || result.stderr.trim()); } catch { assert.fail(`控制器没有返回JSON：${result.stderr}\n${result.stdout}`); }
  for (const key of ['status', 'stage', 'changed', 'blocking', 'next', 'metadata']) assert.ok(Object.hasOwn(data, key), `缺少稳定字段 ${key}`);
  return { ...result, data };
}

/** 记录控制目录中的文件内容，用于证明只读命令没有修改记录。 */
function snapshot(root) {
  const result = {};
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) for (const [name, text] of Object.entries(snapshot(path))) result[`${entry.name}/${name}`] = text;
    else result[entry.name] = readFileSync(path, 'utf8');
  }
  return result;
}

for (const stack of STACKS) {
  test(`${stack} 选装包可独立初始化并只读诊断`, (t) => {
    const root = fixture(t);
    installSkills({ projectRoot: root, stacks: [stack] });
    const workItem = '.workflow-control/work-items/basic.json';
    const init = cli(root, 'init', '--work-item', workItem, '--stack', stack, '--id', 'basic', '--type', 'FOUNDATION', '--objective', '验证安装产物');
    assert.equal(init.status, 0, JSON.stringify(init.data));
    const work = JSON.parse(readFileSync(join(root, workItem), 'utf8'));
    assert.equal(work.stack, stack);
    assert.equal(work.globalState, 'INTAKE');
    const before = snapshot(join(root, '.workflow-control'));
    const status = cli(root, 'status', '--work-item', workItem);
    assert.equal(status.status, 0);
    const checked = cli(root, 'check', '--work-item', workItem);
    assert.notEqual(checked.status, 0, '初始工作项不能通过缺失门禁');
    const run = cli(root, 'run', '--work-item', workItem);
    assert.notEqual(run.status, 0, '自动推进遇到缺失门禁应返回失败退出码');
    assert.equal(run.data.changed, false);
    assert.deepEqual(snapshot(join(root, '.workflow-control')), before);
    const lint = cli(root, 'lint');
    assert.equal(lint.status, 0, JSON.stringify(lint.data));
    assert.deepEqual(lint.data.metadata.stacks, [stack]);
    assert.notEqual(cli(root, 'not-a-command', '--work-item', workItem).status, 0);
  });
}

test('同名记录初始化拒绝覆盖', (t) => {
  const root = fixture(t);
  installSkills({ projectRoot: root, stacks: ['flutter'] });
  const file = '.workflow-control/work-items/page.json';
  const args = ['init', '--work-item', file, '--stack', 'flutter', '--id', 'page', '--type', 'PAGE', '--objective', '页面验证'];
  assert.equal(cli(root, ...args).status, 0);
  const before = readFileSync(join(root, file), 'utf8');
  assert.equal(JSON.parse(before).visualBaselineRequired, true);
  assert.notEqual(cli(root, ...args).status, 0);
  assert.equal(readFileSync(join(root, file), 'utf8'), before);
});
