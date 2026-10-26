/** 验证安装选择、更新备份和冲突时的无写入行为。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chmodSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { COMMON_SKILLS, installSkills, planInstallation, SOURCE_ROOT } from '../scripts/install-project-skills.mjs';

/** 建立并在测试结束后回收隔离项目。 */
function project(t) {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-installer-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('只安装公共技能和选定技术栈，预演不写入', (t) => {
  const root = project(t);
  const result = installSkills({ projectRoot: root, stacks: ['flutter'], dryRun: true });
  assert.equal(result.changed, false);
  assert.equal(existsSync(join(root, '.agents')), false);
  installSkills({ projectRoot: root, stacks: ['flutter'] });
  for (const name of [...COMMON_SKILLS, 'app-stack-flutter']) assert.ok(existsSync(join(root, '.agents', 'skills', name, 'SKILL.md')));
  assert.equal(existsSync(join(root, '.agents', 'skills', 'app-stack-unity')), false);
});

/** 追加第二个技术栈时只复制新增目录，完全相同的公共目录保持原样。 */
test('追加技术栈会跳过字节相同的公共目录并保留已装技术栈', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['unity'] });
  const skills = join(root, '.agents', 'skills');
  const shared = join(skills, 'grilling');
  const before = statSync(shared).mtimeMs;
  const plan = planInstallation({ projectRoot: root, stacks: ['flutter'] });
  assert.equal(plan.entries.find((entry) => entry.name === 'grilling').action, 'skip');
  const added = installSkills({ projectRoot: root, stacks: ['flutter', 'flutter'] });
  assert.equal(added.changed, true);
  assert.equal(statSync(shared).mtimeMs, before);
  assert.ok(existsSync(join(skills, 'app-stack-unity', 'SKILL.md')));
  assert.ok(existsSync(join(skills, 'app-stack-flutter', 'SKILL.md')));
  assert.equal(added.entries.filter((entry) => entry.name === 'app-stack-flutter').length, 1);
});

/** 所有已安装目录都匹配时保持无操作，不创建新的安装备份事务。 */
test('同版本重复安装是无写入操作', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['flutter'] });
  const backups = join(root, '.agents', 'skills-backups');
  const before = readdirSync(backups).sort();
  const result = installSkills({ projectRoot: root, stacks: ['flutter'] });
  assert.equal(result.changed, false);
  assert.equal(result.backup, null);
  assert.ok(result.entries.every((entry) => entry.action === 'skip'));
  assert.deepEqual(readdirSync(backups).sort(), before);
});

/** POSIX 下同字节文件只改变 Git 执行位也必须走冲突与备份更新。 */
test('同字节执行位差异会冲突并由替换更新', (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows 文件权限位不保证 POSIX/Git 执行位语义');
    return;
  }

  const root = project(t);
  const sourceEntries = planInstallation({ projectRoot: root, stacks: ['flutter'] }).entries;
  const sourceRoot = project(t);
  mkdirSync(join(sourceRoot, 'skills'), { recursive: true });
  mkdirSync(join(sourceRoot, 'migration'), { recursive: true });
  copyFileSync(join(SOURCE_ROOT, 'migration', 'catalog.json'), join(sourceRoot, 'migration', 'catalog.json'));
  for (const entry of sourceEntries) {
    cpSync(entry.source, join(sourceRoot, 'skills', entry.name), { recursive: true, errorOnExist: true, force: false });
  }

  const sourceFile = join(sourceRoot, 'skills', 'app-skill-runtime', 'direct-entry.mjs');
  const installedFile = join(root, '.agents', 'skills', 'app-skill-runtime', 'direct-entry.mjs');
  chmodSync(sourceFile, statSync(sourceFile).mode & ~0o100);
  installSkills({ projectRoot: root, stacks: ['flutter'], sourceRoot });
  chmodSync(sourceFile, statSync(sourceFile).mode | 0o100);

  assert.deepEqual(readFileSync(sourceFile), readFileSync(installedFile));
  assert.equal(statSync(installedFile).mode & 0o100, 0);
  assert.throws(() => installSkills({ projectRoot: root, stacks: ['flutter'], sourceRoot }), /技能已存在/);
  const result = installSkills({ projectRoot: root, stacks: ['flutter'], sourceRoot, replace: true });
  const backupFile = join(result.backup, 'app-skill-runtime', 'direct-entry.mjs');
  assert.equal(result.entries.find((entry) => entry.name === 'app-skill-runtime').action, 'replace');
  assert.equal(statSync(installedFile).mode & 0o100, 0o100);
  assert.equal(statSync(backupFile).mode & 0o100, 0);
  assert.deepEqual(readFileSync(sourceFile), readFileSync(installedFile));
});

/** 更新共享运行时源码时沿用项目中已安装的依赖目录。 */
test('显式替换共享运行时会保留已安装 node_modules', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['flutter'] });
  const runtime = join(root, '.agents', 'skills', 'app-skill-runtime');
  const dependency = join(runtime, 'node_modules', 'fixture-dependency', 'index.js');
  mkdirSync(join(runtime, 'node_modules', 'fixture-dependency'), { recursive: true });
  writeFileSync(dependency, 'module.exports = "installed";');
  const packageFile = join(runtime, 'package.json');
  writeFileSync(packageFile, `${JSON.stringify({ modified: true })}\n`);
  const result = installSkills({ projectRoot: root, stacks: ['flutter'], replace: true });
  assert.equal(result.entries.find((entry) => entry.name === 'app-skill-runtime').action, 'replace');
  assert.equal(readFileSync(dependency, 'utf8'), 'module.exports = "installed";');
  assert.equal(readFileSync(join(result.backup, 'app-skill-runtime', 'node_modules', 'fixture-dependency', 'index.js'), 'utf8'), 'module.exports = "installed";');
});

test('默认冲突保留本地修改，显式更新可恢复且保留无关技能', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['unity'] });
  const modified = join(root, '.agents', 'skills', 'grilling', 'local.txt');
  writeFileSync(modified, '本地资料');
  const unrelated = join(root, '.agents', 'skills', 'my-skill');
  mkdirSync(unrelated); writeFileSync(join(unrelated, 'SKILL.md'), '其他技能');
  assert.throws(() => installSkills({ projectRoot: root, stacks: ['unity'] }), /技能已存在/);
  assert.equal(readFileSync(modified, 'utf8'), '本地资料');
  const updated = installSkills({ projectRoot: root, stacks: ['unity'], replace: true });
  assert.equal(readFileSync(join(updated.backup, 'grilling', 'local.txt'), 'utf8'), '本地资料');
  assert.equal(existsSync(modified), false);
  assert.equal(readFileSync(join(unrelated, 'SKILL.md'), 'utf8'), '其他技能');
});

test('无效技术栈和越界安装路径提前拒绝', (t) => {
  const root = project(t);
  assert.throws(() => planInstallation({ projectRoot: root, stacks: ['../escape'] }), /有效技术栈/);
  assert.throws(() => planInstallation({ projectRoot: root, stacks: [] }), /选择有效技术栈/);
  const outside = project(t);
  symlinkSync(outside, join(root, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => installSkills({ projectRoot: root, stacks: ['unity'] }), /符号链接/);
  assert.equal(existsSync(join(outside, 'skills')), false);
});

/** lstat 必须发现目标消失后仍留在技能路径链上的悬空 Junction。 */
test('预检拒绝 .agents 和技能目标上的悬空 Junction', (t) => {
  const skillProject = project(t);
  const skillsRoot = join(skillProject, '.agents', 'skills');
  mkdirSync(skillsRoot, { recursive: true });
  const danglingSkill = join(skillsRoot, 'app-stack-unity');
  const removedSkillTarget = project(t);
  symlinkSync(removedSkillTarget, danglingSkill, 'junction');
  rmSync(removedSkillTarget, { recursive: true, force: true });
  assert.equal(existsSync(danglingSkill), false);
  assert.equal(lstatSync(danglingSkill).isSymbolicLink(), true);
  assert.throws(() => installSkills({ projectRoot: skillProject, stacks: ['unity'] }), /安装路径不能含符号链接/);
  assert.deepEqual(readdirSync(skillsRoot), ['app-stack-unity']);

  const agentsProject = project(t);
  const danglingAgents = join(agentsProject, '.agents');
  const removedAgentsTarget = project(t);
  symlinkSync(removedAgentsTarget, danglingAgents, 'junction');
  rmSync(removedAgentsTarget, { recursive: true, force: true });
  assert.equal(existsSync(danglingAgents), false);
  assert.equal(lstatSync(danglingAgents).isSymbolicLink(), true);
  assert.throws(() => installSkills({ projectRoot: agentsProject, stacks: ['flutter'] }), /安装路径不能含符号链接/);
  assert.equal(existsSync(join(agentsProject, 'skills')), false);
});

/** 运行时依赖根是链接时不能把它当成普通 npm node_modules 而跳过或覆盖。 */
test('共享运行时中的 node_modules 链接不会被增量跳过或跟随', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['flutter'] });
  const runtime = join(root, '.agents', 'skills', 'app-skill-runtime');
  const packageBefore = readFileSync(join(runtime, 'package.json'));
  const dependencies = join(runtime, 'node_modules');
  const outside = project(t);
  symlinkSync(outside, dependencies, 'junction');
  assert.throws(() => installSkills({ projectRoot: root, stacks: ['flutter'], replace: true }), /node_modules 不是普通目录/);
  assert.equal(lstatSync(dependencies).isSymbolicLink(), true);
  assert.deepEqual(readdirSync(outside), []);
  assert.deepEqual(readFileSync(join(runtime, 'package.json')), packageBefore);
});

test('安装锁阻止交错更新，不修改现有技能或别人的锁', (t) => {
  const root = project(t);
  const agents = join(root, '.agents');
  mkdirSync(agents);
  const lock = join(agents, 'app-creator-install.lock');
  writeFileSync(lock, '另一个安装事务');
  assert.throws(() => installSkills({ projectRoot: root, stacks: ['unity'] }), /持有锁/);
  assert.equal(existsSync(join(agents, 'skills')), false);
  assert.equal(readFileSync(lock, 'utf8'), '另一个安装事务');
});

test('更新中途失败会恢复所有旧技能并释放安装锁', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['unity'] });
  const names = [...COMMON_SKILLS, 'app-stack-unity'];
  for (const name of names) writeFileSync(join(root, '.agents', 'skills', name, 'local.txt'), `原目录-${name}`);
  const nativeRename = fs.renameSync;
  let stagedRenames = 0;
  // 模拟复制已完成、第二个正式目录接入时发生的磁盘故障，覆盖真实回滚路径。
  fs.renameSync = (from, to) => {
    if (String(from).replaceAll('\\', '/').includes('/staged/') && ++stagedRenames === 2) throw new Error('模拟目录接入失败');
    return nativeRename(from, to);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => installSkills({ projectRoot: root, stacks: ['unity'], replace: true }), /已恢复旧技能/);
  } finally {
    fs.renameSync = nativeRename;
    syncBuiltinESMExports();
  }
  for (const name of names) assert.equal(readFileSync(join(root, '.agents', 'skills', name, 'local.txt'), 'utf8'), `原目录-${name}`);
  assert.equal(existsSync(join(root, '.agents', 'app-creator-install.lock')), false);
});
