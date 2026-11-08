/** 验证真实安装事务对项目根 .agents 忽略规则的维护与失败边界。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { appendFileSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';

/** 仅回收本用例在系统临时目录中独占创建的项目。 */
function temporaryProject(t) {
  const temporaryRoot = realpathSync(tmpdir());
  const project = mkdtempSync(join(temporaryRoot, 'app-creator-ignore-'));
  t.after(() => {
    assert.equal(dirname(project), temporaryRoot);
    assert.ok(basename(project).startsWith('app-creator-ignore-'));
    rmSync(project, { recursive: true, force: true });
  });
  return project;
}

/** 在隔离项目中调用真实 Git，并保留错误信息以便定位失败。 */
function git(project, ...args) {
  const result = spawnSync('git', ['-C', project, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

/** 预演必须完全只读，即便项目还没有忽略文件或技能目录。 */
test('dry-run 不创建忽略文件和 .agents 目录', (t) => {
  const project = temporaryProject(t);
  const result = installSkills({ projectRoot: project, stacks: ['flutter'], dryRun: true });
  assert.equal(result.changed, false);
  assert.equal(existsSync(join(project, '.gitignore')), false);
  assert.equal(existsSync(join(project, '.agents')), false);
});

/** Git 根目录忽略生效，同时业务文件和嵌套的同名目录仍可跟踪。 */
test('真实 Git 安装忽略根级 .agents 并保留原有规则和业务文件', (t) => {
  const project = temporaryProject(t);
  git(project, 'init', '-q');
  const ignore = join(project, '.gitignore');
  const original = 'node_modules/\r\n!/.agents/\r\n';
  writeFileSync(ignore, original);
  writeFileSync(join(project, 'app.txt'), '业务文件');
  mkdirSync(join(project, 'nested', '.agents'), { recursive: true });
  writeFileSync(join(project, 'nested', '.agents', 'business.txt'), '业务文件');
  assert.equal(installSkills({ projectRoot: project, stacks: ['flutter'] }).changed, true);
  assert.equal(readFileSync(ignore, 'utf8'), `${original}/.agents/\r\n`);
  assert.match(git(project, 'check-ignore', '--no-index', '.agents/skills/app-stack-flutter/SKILL.md'), /^\.agents\//);
  const status = git(project, 'status', '--porcelain', '--untracked-files=all');
  assert.match(status, /app\.txt/);
  assert.match(status, /nested\/\.agents\/business\.txt/);
  assert.doesNotMatch(status, /^\?\? \.agents\//m);
  assert.ok(existsSync(join(project, '.agents', 'skills', 'app-stack-flutter', 'SKILL.md')));
});

/** 同一有效规则不重复追加，安装结果仅在实际修复忽略文件时改变。 */
test('有效规则幂等，全部技能跳过时仍修复缺失规则', (t) => {
  const project = temporaryProject(t);
  const ignore = join(project, '.gitignore');
  const original = '/.agents/\n*.log\n!important.txt\n';
  writeFileSync(ignore, original);
  installSkills({ projectRoot: project, stacks: ['flutter'] });
  assert.equal(readFileSync(ignore, 'utf8'), original);
  assert.equal(installSkills({ projectRoot: project, stacks: ['flutter'] }).changed, false);
  unlinkSync(ignore);
  const repaired = installSkills({ projectRoot: project, stacks: ['flutter'] });
  assert.equal(repaired.changed, true);
  assert.ok(repaired.entries.every((entry) => entry.action === 'skip'));
  assert.equal(readFileSync(ignore, 'utf8'), '/.agents/\n');
  assert.equal(installSkills({ projectRoot: project, stacks: ['flutter'] }).changed, false);
});

/** 后续否定规则会覆盖忽略时，追加一次有效规则并保持内容不变。 */
test('后续放行规则被覆盖且不会反复添加', (t) => {
  const project = temporaryProject(t);
  const ignore = join(project, '.gitignore');
  const original = '/.agents/\n!*/\n';
  writeFileSync(ignore, original);
  installSkills({ projectRoot: project, stacks: ['flutter'] });
  const first = readFileSync(ignore, 'utf8');
  assert.equal(first, `${original}/.agents/\n`);
  assert.equal(installSkills({ projectRoot: project, stacks: ['flutter'] }).changed, false);
  assert.equal(readFileSync(ignore, 'utf8'), first);
});

/** Git 忽略大小写时，大写的否定规则也不能重新放行根目录。 */
test('大小写不敏感的 Git 否定规则仍被覆盖', (t) => {
  const project = temporaryProject(t);
  git(project, 'init', '-q');
  git(project, 'config', 'core.ignoreCase', 'true');
  const ignore = join(project, '.gitignore');
  const original = '/.agents/\n!/.AGENTS/\n';
  writeFileSync(ignore, original);
  assert.equal(installSkills({ projectRoot: project, stacks: ['flutter'] }).changed, true);
  assert.equal(readFileSync(ignore, 'utf8'), `${original}/.agents/\n`);
  assert.match(git(project, 'check-ignore', '--no-index', '.agents/skills/app-stack-flutter/SKILL.md'), /^\.agents\//);
  assert.equal(installSkills({ projectRoot: project, stacks: ['flutter'] }).changed, false);
});

/** 转义字符也可能参与 Git 模式匹配，不能忽略后续否定规则。 */
test('转义的否定规则被保守覆盖', (t) => {
  const project = temporaryProject(t);
  git(project, 'init', '-q');
  const ignore = join(project, '.gitignore');
  const original = '/.agents/\n!/.a\\gents/\n';
  writeFileSync(ignore, original);
  installSkills({ projectRoot: project, stacks: ['flutter'] });
  assert.equal(readFileSync(ignore, 'utf8'), `${original}/.agents/\n`);
  assert.match(git(project, 'check-ignore', '--no-index', '.agents/skills/app-stack-flutter/SKILL.md'), /^\.agents\//);
});

/** 符号链接与硬链接不能被当成可修改的项目忽略文件。 */
test('拒绝链接或目录形式的 .gitignore', (t) => {
  const directoryProject = temporaryProject(t);
  mkdirSync(join(directoryProject, '.gitignore'));
  assert.throws(() => installSkills({ projectRoot: directoryProject, stacks: ['flutter'] }), /普通文件/);
  assert.equal(existsSync(join(directoryProject, '.agents')), false);

  const linkedProject = temporaryProject(t);
  const external = join(temporaryProject(t), 'other.txt');
  writeFileSync(external, '外部内容');
  linkSync(external, join(linkedProject, '.gitignore'));
  assert.throws(() => installSkills({ projectRoot: linkedProject, stacks: ['flutter'] }), /普通文件/);
  assert.equal(readFileSync(external, 'utf8'), '外部内容');

  const symlinkProject = temporaryProject(t);
  try { symlinkSync(external, join(symlinkProject, '.gitignore'), 'file'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return;
    throw error;
  }
  assert.equal(lstatSync(join(symlinkProject, '.gitignore')).isSymbolicLink(), true);
  assert.throws(() => installSkills({ projectRoot: symlinkProject, stacks: ['flutter'] }), /普通文件/);
  assert.equal(readFileSync(external, 'utf8'), '外部内容');
});

/** 最后写入失败时回滚本轮技能目录并保留原始忽略内容。 */
test('忽略规则写入失败会恢复技能事务', (t) => {
  const project = temporaryProject(t);
  const ignore = join(project, '.gitignore');
  writeFileSync(ignore, '*.log\n');
  const originalOpen = fs.openSync;
  fs.openSync = (path, flags, ...rest) => {
    if (path === ignore && flags === 'a+') throw new Error('模拟忽略规则写入失败');
    return originalOpen(path, flags, ...rest);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installSkills({ projectRoot: project, stacks: ['flutter'] }), /模拟忽略规则写入失败/); }
  finally { fs.openSync = originalOpen; syncBuiltinESMExports(); }
  assert.equal(readFileSync(ignore, 'utf8'), '*.log\n');
  assert.equal(existsSync(join(project, '.agents', 'skills', 'app-stack-flutter')), false);
});

/** 写入中途失败时无法安全区分外部编辑，须保留全部现存字节。 */
test('部分写入失败保留并发追加内容并回滚技能', (t) => {
  const project = temporaryProject(t);
  const ignore = join(project, '.gitignore');
  writeFileSync(ignore, '*.log\n');
  const originalOpen = fs.openSync;
  const originalWrite = fs.writeFileSync;
  let ignoreHandle;
  fs.openSync = (path, flags, ...rest) => {
    const handle = originalOpen(path, flags, ...rest);
    if (path === ignore && flags === 'a+') ignoreHandle = handle;
    return handle;
  };
  fs.writeFileSync = (target, data, ...rest) => {
    if (target === ignoreHandle) {
      originalWrite(target, '/.age');
      appendFileSync(ignore, '用户并发内容\n');
      throw new Error('模拟部分写入失败');
    }
    return originalWrite(target, data, ...rest);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installSkills({ projectRoot: project, stacks: ['flutter'] }), /模拟部分写入失败.*保留项目 \.gitignore/); }
  finally { fs.openSync = originalOpen; fs.writeFileSync = originalWrite; syncBuiltinESMExports(); }
  assert.equal(readFileSync(ignore, 'utf8'), '*.log\n/.age用户并发内容\n');
  assert.equal(existsSync(join(project, '.agents', 'skills', 'app-stack-flutter')), false);
});

/** 新建文件写入失败也保留文件，避免删除其他进程刚写入的内容。 */
test('新建忽略文件写入失败时保留当前内容', (t) => {
  const project = temporaryProject(t);
  const ignore = join(project, '.gitignore');
  const originalOpen = fs.openSync;
  const originalWrite = fs.writeFileSync;
  let ignoreHandle;
  fs.openSync = (path, flags, ...rest) => {
    const handle = originalOpen(path, flags, ...rest);
    if (path === ignore && flags === 'ax+') ignoreHandle = handle;
    return handle;
  };
  fs.writeFileSync = (target, data, ...rest) => {
    if (target === ignoreHandle) throw new Error('模拟新建文件写入失败');
    return originalWrite(target, data, ...rest);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installSkills({ projectRoot: project, stacks: ['flutter'] }), /模拟新建文件写入失败.*保留项目 \.gitignore/); }
  finally { fs.openSync = originalOpen; fs.writeFileSync = originalWrite; syncBuiltinESMExports(); }
  assert.equal(readFileSync(ignore, 'utf8'), '');
  assert.equal(existsSync(join(project, '.agents', 'skills', 'app-stack-flutter')), false);
});

/** 检测到外部编辑时停止安装，不覆盖用户刚写入的内容。 */
test('并发修改忽略文件不会被覆盖或回滚', (t) => {
  const project = temporaryProject(t);
  const ignore = join(project, '.gitignore');
  writeFileSync(ignore, '*.log\n');
  const originalOpen = fs.openSync;
  let edited = false;
  fs.openSync = (path, flags, ...rest) => {
    if (!edited && path === ignore && flags === 'a+') { edited = true; appendFileSync(ignore, '用户并发内容\n'); }
    return originalOpen(path, flags, ...rest);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installSkills({ projectRoot: project, stacks: ['flutter'] }), /发生变化/); }
  finally { fs.openSync = originalOpen; syncBuiltinESMExports(); }
  assert.equal(readFileSync(ignore, 'utf8'), '*.log\n用户并发内容\n');
  assert.equal(existsSync(join(project, '.agents', 'skills', 'app-stack-flutter')), false);
});
