/** 验证 Roblox 栈通过真实安装事务、能力路由和远程闭包交付。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, planInstallation, SOURCE_ROOT } from '../packages/installer/install-project-skills.mjs';
import { readSkillCatalog } from '../packages/installer/skill-catalog.mjs';
import { CORE_SKILLS } from '../packages/installer/capability-map.mjs';
import { installRemoteSkills } from '../packages/installer/remote-install/install.mjs';
import { runGitHubNpxInstaller } from '../packages/installer/github-npx-install.mjs';
import { runRemoteBootstrap } from '../install.mjs';

const REPOSITORY = 'example/roblox-skills';
const REVISION = 'a'.repeat(40);
const TREE_SHA = 'b'.repeat(40);
const BOOTSTRAP_FILES = [
  'install.mjs',
  'packages/installer/remote-install/install.mjs',
  'packages/installer/installation-content.mjs',
  'packages/installer/install-project-skills.mjs',
  'packages/installer/skill-catalog.mjs',
  'packages/installer/capability-map.mjs',
  'skills/app-skill-runtime/direct-entry.mjs',
  'skills/app-skill-runtime/native-contracts.mjs',
];

/** 按 Git blob 格式独立计算摘要，避免使用被测远程下载器的校验实现。 */
function blobSha(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/** 建立测试专属临时项目；清理前再次检查真实路径位于系统临时目录。 */
function temporaryProject(t) {
  const temporaryRoot = realpathSync(tmpdir());
  const project = mkdtempSync(join(temporaryRoot, 'roblox-installer-'));
  t.after(() => {
    const actual = realpathSync(project);
    assert.equal(dirname(actual), temporaryRoot);
    assert.ok(basename(actual).startsWith('roblox-installer-'));
    rmSync(actual, { recursive: true, force: true });
  });
  return project;
}

/** 加载安装产物中的模式读取器，避免源码目录掩盖安装遗漏。 */
async function installedReader(project) {
  const skillsRoot = join(project, '.agents', 'skills');
  const reader = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/read-native-mode.mjs')).href);
  return { skillsRoot, reader };
}

/** 根据真实所选目录构造离线 GitHub 树，模拟固定提交的元数据与文件响应。 */
function fakeRemoteRepository() {
  const catalog = readSkillCatalog(SOURCE_ROOT);
  const profile = catalog.stacks.roblox;
  const roots = new Set([...CORE_SKILLS, ...profile.capabilitySkills, ...profile.resourceDirectories, 'app-skill-runtime', 'app-stack-roblox']);
  const files = new Map();
  const entries = new Map();
  /** 逐级创建模拟远程目录，使路径和父目录都参与安装器安全检查。 */
  function directory(path) {
    if (!path || path === '.') return;
    const normalized = path.split(sep).join('/');
    if (entries.has(normalized)) return;
    directory(dirname(normalized));
    entries.set(normalized, { path: normalized, type: 'tree', mode: '040000', sha: 'c'.repeat(40) });
  }
  /** 收集仓库文件的真实字节与 Git blob 标识，拒绝链接和特殊文件。 */
  function addFile(path, bytes) {
    const normalized = path.split(sep).join('/');
    directory(dirname(normalized));
    const content = Buffer.from(bytes);
    files.set(normalized, content);
    entries.set(normalized, { path: normalized, type: 'blob', mode: '100644', sha: blobSha(content), size: content.length });
  }
  /** 递归读取所选技能根；假远程服务不访问外部网络。 */
  function addTree(root, prefix) {
    const metadata = lstatSync(root);
    if (metadata.isSymbolicLink()) throw new Error(`测试源不能包含链接：${root}`);
    if (metadata.isDirectory()) {
      directory(prefix);
      for (const name of readdirSync(root)) addTree(join(root, name), `${prefix}/${name}`);
    } else if (metadata.isFile()) addFile(prefix, readFileSync(root));
    else throw new Error(`测试源不是普通文件：${root}`);
  }
  addFile('packages/installer/catalog.json', readFileSync(join(SOURCE_ROOT, 'packages/installer/catalog.json')));
  for (const root of roots) addTree(join(SOURCE_ROOT, 'skills', root), `skills/${root}`);
  for (const path of BOOTSTRAP_FILES) addFile(path, readFileSync(join(SOURCE_ROOT, path)));
  // 多加一个未选择栈，证明真实远程选择不会下载无关引擎内容。
  addFile('skills/app-stack-unity/SKILL.md', readFileSync(join(SOURCE_ROOT, 'skills/app-stack-unity/SKILL.md')));
  const requests = [];
  /** 只响应固定提交的模拟 GitHub 端点，任何未预期的网络目标都会失败。 */
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    /** 将模拟元数据响应编码为 API 格式。 */
    const json = (value) => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.hostname === 'api.github.com') {
      if (url.pathname === `/repos/${REPOSITORY}`) return json({ default_branch: 'main' });
      if (url.pathname === `/repos/${REPOSITORY}/commits/main`) return json({ sha: REVISION, commit: { tree: { sha: TREE_SHA } } });
      if (url.pathname === `/repos/${REPOSITORY}/git/trees/${TREE_SHA}`) return json({ sha: TREE_SHA, truncated: false, tree: [...entries.values()] });
    }
    if (url.hostname === 'raw.githubusercontent.com') {
      const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);
      assert.equal(parts.slice(0, 2).join('/'), REPOSITORY);
      assert.equal(parts[2], REVISION);
      const path = parts.slice(3).join('/');
      requests.push(path);
      const bytes = files.get(path);
      return bytes ? new Response(bytes, { status: 200 }) : new Response('not found', { status: 404 });
    }
    throw new Error(`测试不能访问外部网络：${url.hostname}${url.pathname}`);
  };
  return { fetchImpl, requests };
}

/** 使用安装产物逐项核对原生模式与跨栈读取边界。 */
test('Roblox 独立安装后可读取全部声明的原生模式', async (t) => {
  const project = temporaryProject(t);
  const preview = planInstallation({ projectRoot: project, stacks: ['roblox'] });
  assert.ok(preview.entries.some((entry) => entry.name === 'app-stack-roblox'));
  assert.equal(existsSync(join(project, '.agents')), false);
  const installed = installSkills({ projectRoot: project, stacks: ['roblox'] });
  assert.equal(installed.changed, true);
  const { skillsRoot, reader } = await installedReader(project);
  const profile = JSON.parse(readFileSync(join(skillsRoot, 'app-stack-roblox/profile.json'), 'utf8'));
  const catalog = readSkillCatalog(SOURCE_ROOT).stacks.roblox;
  assert.deepEqual(profile.capabilitySkills, catalog.capabilitySkills);
  assert.deepEqual(profile.nativeAdapters, catalog.nativeAdapters);
  assert.deepEqual(profile.resourceDirectories, catalog.resourceDirectories);
  assert.ok(existsSync(join(skillsRoot, 'roblox-domain-contracts')));
  assert.ok(existsSync(join(skillsRoot, 'app-domain-toolkit/references/game-characteristics.md')));
  assert.ok(existsSync(join(skillsRoot, 'app-domain-toolkit/references/game-content-playtesting.md')));
  for (const route of profile.nativeAdapters) {
    const result = reader.loadNativeMode({ skillsRoot, stack: 'roblox', capability: route.capability, sourceSkill: route.sourceSkill });
    assert.equal(result.documents[0].path, 'app-stack-roblox/references/native-contracts.md');
    assert.equal(result.documents[0].section, route.section);
    assert.ok(result.documents[0].content.trim());
    assert.ok(!result.documents.some((doc) => /^app-stack-(?!roblox\/)/.test(doc.path)));
  }
  assert.equal(existsSync(join(skillsRoot, 'app-stack-unity')), false);
  assert.throws(() => planInstallation({ projectRoot: project, stacks: ['roblox-unknown'] }), /有效技术栈/);
});

/** 比较追加前后真实文件，确认安装事务保持已有栈内容。 */
test('追加 Roblox 保留现有栈与公共内容，同版本重装无需覆盖', (t) => {
  const project = temporaryProject(t);
  installSkills({ projectRoot: project, stacks: ['flutter'] });
  const skillsRoot = join(project, '.agents', 'skills');
  const flutterBefore = readFileSync(join(skillsRoot, 'app-stack-flutter/SKILL.md'));
  const commonBefore = readFileSync(join(skillsRoot, 'app-creator-workflow/SKILL.md'));
  const result = installSkills({ projectRoot: project, stacks: ['roblox'] });
  assert.equal(result.changed, true);
  assert.deepEqual(readFileSync(join(skillsRoot, 'app-stack-flutter/SKILL.md')), flutterBefore);
  assert.deepEqual(readFileSync(join(skillsRoot, 'app-creator-workflow/SKILL.md')), commonBefore);
  assert.ok(result.entries.some((entry) => entry.name === 'app-creator-workflow' && entry.action === 'skip'));
  assert.equal(installSkills({ projectRoot: project, stacks: ['roblox'] }).changed, false);
});

/** 调用真实 GitHub 包入口，核对预览、安装和拒绝无效栈。 */
test('GitHub 包入口可预览和安装 Roblox，未知栈不写入', async (t) => {
  const project = temporaryProject(t);
  const output = [];
  const io = { isTTY: false, write(value) { output.push(value); } };
  const preview = await runGitHubNpxInstaller(['roblox', '--dry-run'], { cwd: project, io });
  assert.equal(preview.changed, false);
  assert.equal(existsSync(join(project, '.agents')), false);
  await assert.rejects(runGitHubNpxInstaller(['roblox-unknown'], { cwd: project, io }), /无法识别技术栈/);
  assert.equal(existsSync(join(project, '.agents')), false);
  const result = await runGitHubNpxInstaller(['roblox'], { cwd: project, io });
  assert.equal(result.changed, true);
  assert.ok(existsSync(join(project, '.agents/skills/app-stack-roblox/profile.json')));
  assert.ok(output.some((value) => value.includes('roblox')));
});

/** 通过模拟 GitHub 端点执行真实远程引导与安装事务。 */
test('远程安装 Roblox 固定提交闭包且不下载其他游戏栈', async (t) => {
  const project = temporaryProject(t);
  const cache = join(project, 'cache');
  const remote = fakeRemoteRepository();
  const options = { projectRoot: project, stacks: ['roblox'], repo: REPOSITORY, ref: 'main', cacheRoot: cache, env: {}, fetchImpl: remote.fetchImpl };
  const preview = await installRemoteSkills({ ...options, dryRun: true });
  assert.equal(preview.changed, false);
  assert.equal(preview.remote.payloadDownloaded, 0);
  assert.deepEqual(remote.requests, ['packages/installer/catalog.json']);
  assert.equal(existsSync(join(project, '.agents')), false);
  // 使用独立远程引导入口，验证其自己的栈枚举及下载后的完整安装闭包。
  const installed = await runRemoteBootstrap([project, '--repo', REPOSITORY, '--ref', 'main', '--stack', 'roblox'], {
    cacheRoot: cache, env: {}, fetchImpl: remote.fetchImpl,
  });
  assert.equal(installed.remote.revision, REVISION);
  assert.deepEqual(installed.remote.stacks, ['roblox']);
  assert.ok(installed.remote.selectedDirectories.includes('roblox-domain-contracts'));
  assert.equal(installed.remote.metrics.bootstrapFiles, BOOTSTRAP_FILES.length);
  assert.ok(remote.requests.some((path) => path.startsWith('skills/app-stack-roblox/')));
  assert.ok(!remote.requests.some((path) => path.startsWith('skills/app-stack-unity/')));
  const { skillsRoot, reader } = await installedReader(project);
  assert.ok(existsSync(join(skillsRoot, 'app-stack-roblox/profile.json')));
  assert.ok(existsSync(join(skillsRoot, 'roblox-domain-contracts')));
  assert.equal(existsSync(join(skillsRoot, 'app-stack-unity')), false);
  const mode = reader.loadNativeMode({ skillsRoot, stack: 'roblox', capability: 'app-gameplay-development' });
  assert.equal(mode.documents[0].path, 'app-stack-roblox/references/native-contracts.md');
  assert.ok(relative(project, skillsRoot) && !relative(project, skillsRoot).startsWith('..'));
});
