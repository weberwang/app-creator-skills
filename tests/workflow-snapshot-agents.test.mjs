import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('skills/flutter-domain-contracts/tools/scripts/workflow-snapshot.js');

/** 在独立临时仓库内执行 Git，避免修改实际项目的索引。 */
function git(repo, ...args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

/** 写入测试文件并创建其父目录。 */
function put(repo, path, content) {
  const absolute = join(repo, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

/** 创建包含本地技能和业务路径的真实 Git 基线。 */
function fixture(t) {
  const tempRoot = realpathSync(tmpdir());
  const repo = mkdtempSync(join(tempRoot, 'workflow-agents-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), tempRoot);
    assert.match(basename(actual), /^workflow-agents-/);
    rmSync(actual, { recursive: true, force: true });
  });
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Workflow Test');
  git(repo, 'config', 'user.email', 'workflow@example.invalid');
  git(repo, 'config', 'commit.gpgsign', 'false');
  git(repo, 'config', 'core.autocrlf', 'false');
  put(repo, '.agents/tracked.txt', '唯一的本地技能跟踪文件\n');
  put(repo, '.agents/inside.txt', '唯一的另一个本地技能文件\n');
  put(repo, 'business/move-in.txt', '唯一的将移入技能目录的业务文件\n');
  put(repo, 'business/plain.txt', '唯一的保留业务文件\n');
  put(repo, 'src/.agents/business.txt', '嵌套业务文件\n');
  put(repo, '.agents-other/business.txt', '近似前缀业务文件\n');
  git(repo, 'add', '-f', '--', '.');
  git(repo, '-c', 'core.hooksPath=', 'commit', '-qm', 'baseline');
  return repo;
}

/** 获取当前工作树的工作流快照。 */
function snapshot(repo) {
  const result = spawnSync(process.execPath, [script], { cwd: repo, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('根技能目录的未暂存、暂存、未跟踪和内部移动不改变快照', (t) => {
  const repo = fixture(t);
  const initial = snapshot(repo);
  put(repo, '.agents/tracked.txt', '已修改\n');
  assert.equal(snapshot(repo).snapshotId, initial.snapshotId);
  git(repo, 'add', '-f', '--', '.agents/tracked.txt');
  put(repo, '.agents/untracked.txt', '未跟踪\n');
  assert.equal(snapshot(repo).snapshotId, initial.snapshotId);
  git(repo, 'mv', '-f', '--', '.agents/tracked.txt', '.agents/renamed.txt');
  unlinkSync(join(repo, '.agents/inside.txt'));
  const ignored = snapshot(repo);
  assert.equal(ignored.snapshotId, initial.snapshotId);
  assert.equal(ignored.baseSha, initial.baseSha);
  assert.deepEqual(ignored.changed, []);
  put(repo, '.agents-other/business.txt', '相似前缀变更\n');
  put(repo, 'src/.agents/business.txt', '嵌套路径变更\n');
  const business = snapshot(repo);
  assert.deepEqual(business.changed.map((item) => item.path), ['.agents-other/business.txt', 'src/.agents/business.txt']);
  assert.notEqual(business.snapshotId, initial.snapshotId);
  put(repo, 'src/.agents/business.txt', '再次变更\n');
  assert.notEqual(snapshot(repo).snapshotId, business.snapshotId);
});

test('跨根技能目录移动保留业务侧删除与新增', (t) => {
  const repo = fixture(t);
  const initial = snapshot(repo);
  git(repo, 'mv', '-f', '--', 'business/move-in.txt', '.agents/from-business.txt');
  git(repo, 'mv', '-f', '--', '.agents/tracked.txt', 'business/from-agent.txt');
  const result = snapshot(repo);
  assert.equal(result.baseSha, initial.baseSha);
  assert.deepEqual(result.changed.map(({ status, path }) => ({ status, path })), [
    { status: 'A', path: 'business/from-agent.txt' },
    { status: 'D', path: 'business/move-in.txt' },
  ]);
  assert.ok(result.changed[0].blobId);
  assert.equal(result.changed[1].blobId, null);
  assert.ok(result.changed.every((item) => !item.previousPath));
});

test('复制进入技能目录不会伪造业务源文件删除', (t) => {
  const repo = fixture(t);
  copyFileSync(join(repo, 'business/plain.txt'), join(repo, '.agents/copied.txt'));
  copyFileSync(join(repo, '.agents/inside.txt'), join(repo, 'business/copied.txt'));
  git(repo, 'add', '-f', '--', '.agents/copied.txt', 'business/copied.txt');
  const result = snapshot(repo);
  assert.deepEqual(result.changed.map(({ status, path }) => ({ status, path })), [
    { status: 'A', path: 'business/copied.txt' },
  ]);
  put(repo, '.agents/copied.txt', '本地复制件的后续修改\n');
  assert.equal(snapshot(repo).snapshotId, result.snapshotId);
});

test('根目录大小写遵循平台规则且保留带空格的业务路径', (t) => {
  const repo = fixture(t);
  put(repo, '.AGENTS/case.txt', '大小写路径\n');
  put(repo, 'business/中文 空格.txt', '业务内容\n');
  git(repo, 'add', '-f', '--', '.AGENTS/case.txt', 'business/中文 空格.txt');
  const paths = snapshot(repo).changed.map((item) => item.path);
  assert.ok(paths.includes('business/中文 空格.txt'));
  assert.equal(paths.includes('.AGENTS/case.txt'), process.platform !== 'win32');
});
