import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runGitHubNpxInstaller } from '../packages/installer/github-npx-install.mjs';

/** 创建隔离项目与可观察的命令行输出。 */
function fixture(t, answer = '') {
  const cwd = mkdtempSync(join(tmpdir(), 'github-npx-install-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const output = [];
  const io = { isTTY: Boolean(answer), write(value) { output.push(value); }, async prompt() { return answer; } };
  return { cwd, io, output };
}

test('GitHub 包内载荷按调用目录预览并安装指定技术栈', async (t) => {
  const f = fixture(t);
  const preview = await runGitHubNpxInstaller(['flutter', '--dry-run'], f);
  assert.equal(preview.changed, false);
  assert.equal(existsSync(join(f.cwd, '.agents')), false);
  assert.match(f.output.at(-1), /预览完成/);
  const result = await runGitHubNpxInstaller(['flutter'], f);
  assert.equal(result.changed, true);
  assert.equal(existsSync(join(f.cwd, '.agents', 'skills', 'app-stack-flutter', 'SKILL.md')), true);
  assert.equal(existsSync(join(f.cwd, '.agents', 'skills', 'app-stack-unity')), false);
});

/** GitHub 包默认安装命令更新所选内容，不留下旧目录备份。 */
test('GitHub 包默认覆盖旧文件且不保留备份', async (t) => {
  const f = fixture(t);
  const first = await runGitHubNpxInstaller(['flutter'], f);
  assert.equal(first.backup, null);
  assert.deepEqual(readdirSync(join(f.cwd, '.agents')), ['skills']);
  const skills = join(f.cwd, '.agents', 'skills');
  const oldFile = join(skills, 'grilling', 'local.txt');
  writeFileSync(oldFile, '旧文件');
  const unrelated = join(skills, 'my-skill');
  mkdirSync(unrelated);
  writeFileSync(join(unrelated, 'SKILL.md'), '无关技能');
  const result = await runGitHubNpxInstaller(['flutter'], f);
  assert.equal(result.changed, true);
  assert.equal(result.backup, null);
  assert.equal(result.entries.find((entry) => entry.name === 'grilling').action, 'replace');
  assert.equal(existsSync(oldFile), false);
  assert.equal(readFileSync(join(unrelated, 'SKILL.md'), 'utf8'), '无关技能');
  assert.deepEqual(readdirSync(join(f.cwd, '.agents')), ['skills']);
  const repeated = await runGitHubNpxInstaller(['flutter'], f);
  assert.equal(repeated.changed, false);
  assert.equal(repeated.backup, null);
  assert.ok(repeated.entries.every((entry) => entry.action === 'skip'));
  assert.deepEqual(readdirSync(join(f.cwd, '.agents')), ['skills']);
});

test('交互选择及显式远程选项交由统一入口处理', async (t) => {
  const f = fixture(t, '5');
  const calls = [];
  const bootstrap = async (args) => { calls.push(args); return { entries: [], destination: f.cwd }; };
  await runGitHubNpxInstaller([], { ...f, bootstrap });
  assert.ok(calls[0].includes('flutter'));
  await runGitHubNpxInstaller(['unity', '--repo', 'owner/repo', '--ref', 'abc'], { ...f, bootstrap });
  assert.ok(calls[1].includes('owner/repo'));
  assert.ok(calls[1].includes('abc'));
  await assert.rejects(runGitHubNpxInstaller([], { ...f, io: { ...f.io, isTTY: false }, bootstrap }), /非交互/);
  await runGitHubNpxInstaller(['--help'], { ...f, bootstrap });
  assert.equal(calls.length, 2);
});
