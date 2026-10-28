/** 验证远程按栈取数、固定提交、内容缓存和目标安装事务。 */
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createGitHubSource, gitBlobSha, normalizeRepository } from '../install.mjs';
import { installRemoteSkills, runRemoteInstaller } from '../packages/installer/remote-install/install.mjs';

const REPOSITORY = 'example/app-creator-skills';
const BRANCH = 'feature/stack-install';
const REVISION = 'a'.repeat(40);
const TREE_SHA = 'b'.repeat(40);

/** 建立隔离测试目录，并在测试结束时只清理该目录。 */
function testDirectory(t) {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-remote-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** 创建最小但可由现有安装事务消费的多栈仓库树。 */
function makeRepository({ extraFiles = [], overrides = {} } = {}) {
  const files = new Map();
  const addText = (path, value) => files.set(path, Buffer.from(value));
  const catalog = {
    schemaVersion: '1.0',
    stacks: {
      unity: { capabilitySkills: ['app-feedback'], nativeAdapters: ['unity-feedback'], resourceDirectories: ['app-domain-toolkit', 'unity-native'] },
      flutter: { capabilitySkills: ['app-feedback'], nativeAdapters: ['flutter-feedback'], resourceDirectories: ['app-domain-toolkit', 'flutter-native'] },
    },
  };
  addText('packages/installer/catalog.json', JSON.stringify(catalog));
  for (const name of ['app-creator-workflow', 'app-workflow-control', 'grilling', 'app-asset-workflow', 'app-feedback', 'app-stack-unity', 'app-stack-flutter']) {
    addText(`skills/${name}/SKILL.md`, `# ${name}\n`);
  }
  for (const name of ['app-domain-toolkit', 'app-skill-runtime', 'unity-native', 'flutter-native']) {
    addText(`skills/${name}/${name === 'app-skill-runtime' ? 'direct-entry.mjs' : 'README.md'}`, `resource ${name}\n`);
  }
  for (const file of extraFiles) files.set(file.path, Buffer.from(file.bytes ?? 'fixture')); 

  const entries = [];
  const directories = new Set();
  for (const path of files.keys()) for (const parent of parentPaths(path)) directories.add(parent);
  for (const path of directories) entries.push({ path, mode: '040000', type: 'tree', sha: 'c'.repeat(40) });
  for (const [path, bytes] of files) entries.push({ path, mode: '100644', type: 'blob', sha: gitBlobSha(bytes), size: bytes.length });
  for (const [path, replacement] of Object.entries(overrides)) {
    const entry = entries.find((candidate) => candidate.path === path);
    if (entry) Object.assign(entry, replacement);
  }
  return { files, entries, catalog };
}

/** 枚举文件路径的所有父目录，生成与 Git Trees API 一致的目录记录。 */
function parentPaths(path) {
  const parts = path.split('/');
  const parents = [];
  for (let index = 1; index < parts.length; index += 1) parents.push(parts.slice(0, index).join('/'));
  return parents;
}

/** 创建内存 GitHub 端点，记录请求并支持坏响应、提交漂移与截断场景。 */
function fakeGitHub(repository, { truncated = false, corruptPath = null, failPath = null, treeShaResponse = TREE_SHA } = {}) {
  const requests = [];
  const state = { revision: REVISION, treeSha: TREE_SHA, ref: BRANCH, truncated };
  const endpoint = async (input, init = {}) => {
    const url = new URL(String(input));
    requests.push({ url, headers: new Headers(init.headers ?? {}), redirect: init.redirect });
    const json = (value) => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.hostname === 'api.github.com') {
      if (url.pathname === '/repos/example/app-creator-skills') return json({ default_branch: state.ref });
      if (url.pathname === `/repos/example/app-creator-skills/commits/${encodeURIComponent(state.ref)}`) return json({ sha: state.revision, commit: { tree: { sha: state.treeSha } } });
      if (url.pathname === `/repos/example/app-creator-skills/git/trees/${state.treeSha}`) return json({ sha: treeShaResponse, truncated: state.truncated, tree: repository.entries });
      if (url.pathname.startsWith('/repos/example/app-creator-skills/git/blobs/')) {
        const oid = url.pathname.split('/').at(-1);
        const record = [...repository.files.entries()].find(([, bytes]) => gitBlobSha(bytes) === oid);
        if (!record) return new Response('missing', { status: 404 });
        return new Response(record[1], { status: 200 });
      }
      return new Response('unexpected api route', { status: 404 });
    }
    if (url.hostname === 'raw.githubusercontent.com') {
      const parts = url.pathname.split('/').slice(1).map(decodeURIComponent);
      const path = parts.slice(3).join('/');
      if (path === failPath) return new Response('failure', { status: 503 });
      const bytes = repository.files.get(path);
      if (!bytes) return new Response('missing', { status: 404 });
      if (path === corruptPath) return new Response(Buffer.from('bad bytes'), { status: 200 });
      return new Response(bytes, { status: 200 });
    }
    throw new Error(`unexpected host: ${url.hostname}`);
  };
  return { fetchImpl: endpoint, requests, state };
}

/** 便于断言 GitHub Raw 请求的仓库相对路径。 */
function rawPaths(requests) {
  return requests.filter((request) => request.url.hostname === 'raw.githubusercontent.com').map((request) => request.url.pathname.split('/').slice(4).map(decodeURIComponent).join('/'));
}

/** 直接安装测试仓库的一个技术栈。 */
function installFixture(projectRoot, cacheRoot, repository, options = {}) {
  return installRemoteSkills({
    projectRoot, stacks: options.stacks ?? ['unity'], repo: REPOSITORY, ref: options.ref,
    dryRun: options.dryRun ?? false, cacheRoot,
    fetchImpl: options.fetchImpl, env: options.env ?? {},
  });
}

test('远程按栈下载固定提交闭包，热缓存重跑零载荷请求，追加栈只补缺失文件', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  const cache = join(root, 'cache', 'nested', 'github-blobs');
  mkdirSync(project);
  const repo = makeRepository();
  const firstTransport = fakeGitHub(repo);
  const first = await installFixture(project, cache, repo, { fetchImpl: firstTransport.fetchImpl, ref: BRANCH });
  assert.equal(first.remote.revision, REVISION);
  assert.equal(first.remote.ref, BRANCH);
  assert.ok(first.changed);
  assert.ok(firstTransport.requests.filter((request) => request.url.hostname === 'raw.githubusercontent.com').every((request) => request.url.pathname.split('/')[3] === REVISION));
  assert.ok(rawPaths(firstTransport.requests).includes('skills/app-stack-unity/SKILL.md'));
  assert.ok(!rawPaths(firstTransport.requests).some((path) => path.startsWith('skills/app-stack-flutter/')));
  assert.ok(!rawPaths(firstTransport.requests).some((path) => path.startsWith('skills/flutter-native/')));
  assert.ok(existsSync(join(project, '.agents', 'skills', 'app-stack-unity', 'SKILL.md')));
  assert.ok(!existsSync(join(project, '.agents', 'skills', 'app-stack-flutter')));

  const warmTransport = fakeGitHub(repo);
  const repeated = await installFixture(project, cache, repo, { fetchImpl: warmTransport.fetchImpl, ref: BRANCH });
  assert.equal(repeated.changed, false);
  assert.equal(rawPaths(warmTransport.requests).length, 0);
  assert.equal(repeated.remote.metrics.cacheHits > 0, true);

  const secondTransport = fakeGitHub(repo);
  const added = await installFixture(project, cache, repo, { fetchImpl: secondTransport.fetchImpl, stacks: ['flutter'], ref: BRANCH });
  assert.ok(added.changed);
  assert.deepEqual(rawPaths(secondTransport.requests), ['skills/app-stack-flutter/SKILL.md', 'skills/flutter-native/README.md']);
  assert.ok(existsSync(join(project, '.agents', 'skills', 'app-stack-unity', 'SKILL.md')));
  assert.ok(existsSync(join(project, '.agents', 'skills', 'app-stack-flutter', 'SKILL.md')));
});

test('dry-run 只读迁移清单，不下载载荷或写入目标目录', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository();
  const transport = fakeGitHub(repo);
  const result = await installFixture(project, join(root, 'cache'), repo, { fetchImpl: transport.fetchImpl, dryRun: true });
  assert.equal(result.remote.dryRun, true);
  assert.equal(result.remote.payloadDownloaded, 0);
  assert.deepEqual(rawPaths(transport.requests), ['packages/installer/catalog.json']);
  assert.equal(existsSync(join(project, '.agents')), false);
});

test('冷内容缓存可从现有安装逐文件复用且不请求技能载荷', async (t) => {
  const root = testDirectory(t);
  const originalProject = join(root, 'original-project');
  const reusedProject = join(root, 'reused-project');
  mkdirSync(originalProject);
  mkdirSync(reusedProject);
  const repo = makeRepository();
  await installFixture(originalProject, join(root, 'warm-cache'), repo, { fetchImpl: fakeGitHub(repo).fetchImpl });
  mkdirSync(join(reusedProject, '.agents'));
  cpSync(join(originalProject, '.agents', 'skills'), join(reusedProject, '.agents', 'skills'), { recursive: true });

  const coldTransport = fakeGitHub(repo);
  const result = await installFixture(reusedProject, join(root, 'new', 'nested', 'cache'), repo, { fetchImpl: coldTransport.fetchImpl });
  assert.equal(result.changed, false);
  assert.ok(result.remote.metrics.reusedLocal > 0);
  assert.ok(!rawPaths(coldTransport.requests).some((path) => path.startsWith('skills/')));
  assert.deepEqual(rawPaths(coldTransport.requests), ['packages/installer/catalog.json']);
});

test('私有仓库令牌只发往 GitHub API，二进制 blob 按原字节校验', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const binary = Buffer.from([0, 255, 1, 128, 13, 10]);
  const repo = makeRepository({ extraFiles: [{ path: 'skills/unity-native/raw.bin', bytes: binary }] });
  const transport = fakeGitHub(repo);
  const result = await installFixture(project, join(root, 'cache'), repo, {
    fetchImpl: transport.fetchImpl, env: { GH_TOKEN: 'fixture-only-secret' },
  });
  assert.ok(result.changed);
  assert.deepEqual(readFileSync(join(project, '.agents', 'skills', 'unity-native', 'raw.bin')), binary);
  assert.ok(transport.requests.every((request) => request.url.hostname === 'api.github.com'));
  assert.ok(transport.requests.every((request) => request.headers.get('authorization') === 'Bearer fixture-only-secret'));
  assert.ok(transport.requests.every((request) => request.redirect === 'error'));
  const blobRequest = transport.requests.find((request) => request.url.pathname.includes('/git/blobs/'));
  assert.equal(blobRequest.headers.get('accept'), 'application/vnd.github.raw+json');
});

test('远程暂存和事务安装保留 Git 可执行文件位', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository({
    extraFiles: [{ path: 'skills/unity-native/scripts/tool.sh', bytes: '#!/bin/sh\nexit 0\n' }],
    overrides: { 'skills/unity-native/scripts/tool.sh': { mode: '100755' } },
  });
  const result = await installFixture(project, join(root, 'cache'), repo, { fetchImpl: fakeGitHub(repo).fetchImpl });
  const installedMode = statSync(join(project, '.agents', 'skills', 'unity-native', 'scripts', 'tool.sh')).mode;
  assert.ok(result.changed);
  if (process.platform !== 'win32') assert.ok((installedMode & 0o111) !== 0);
});

test('网络失败或 Git blob 校验失败不会创建目标安装目录', async (t) => {
  for (const mode of ['failure', 'corrupt']) {
    const root = testDirectory(t);
    const project = join(root, 'project');
    mkdirSync(project);
    const repo = makeRepository();
    const path = 'skills/app-stack-unity/SKILL.md';
    const transport = fakeGitHub(repo, mode === 'failure' ? { failPath: path } : { corruptPath: path });
    await assert.rejects(installFixture(project, join(root, 'cache'), repo, { fetchImpl: transport.fetchImpl }), mode === 'failure' ? /HTTP 503/ : /Git SHA 校验失败/);
    assert.equal(existsSync(join(project, '.agents')), false);
  }
});

test('无效 Git 路径、符号链接、文件元数据和截断目录树均被拒绝', async (t) => {
  const cases = [
    { path: 'skills/unity-native/escape?.txt', replacement: null, message: /文件路径无效/ },
    { path: 'skills/unity-native/link', replacement: { type: 'blob', mode: '120000' }, message: /不接受链接|不是有效 blob/ },
    { path: 'skills/unity-native/bad-size', replacement: { type: 'blob', mode: '100644', size: Number.NaN }, message: /文件大小无效/ },
    { path: 'skills/unity-native/bad-sha', replacement: { type: 'blob', mode: '100644', sha: 'bad' }, message: /对象|SHA|元数据/ },
  ];
  for (const item of cases) {
    const root = testDirectory(t);
    const project = join(root, 'project');
    mkdirSync(project);
    const extraFiles = [{ path: item.path, bytes: 'bad metadata fixture' }];
    const repo = makeRepository({ extraFiles, overrides: item.replacement ? { [item.path]: item.replacement } : {} });
    const transport = fakeGitHub(repo);
    if (!item.replacement) repo.entries.find((entry) => entry.path === item.path).size = 20;
    await assert.rejects(installFixture(project, join(root, 'cache'), repo, { fetchImpl: transport.fetchImpl }), item.message);
    assert.equal(existsSync(join(project, '.agents')), false);
  }

  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository();
  const transport = fakeGitHub(repo, { truncated: true });
  await assert.rejects(installFixture(project, join(root, 'cache'), repo, { fetchImpl: transport.fetchImpl }), /不完整列表/);
  assert.equal(existsSync(join(project, '.agents')), false);
});

test('固定提交返回的树 SHA 必须一致', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository();
  const transport = fakeGitHub(repo, { treeShaResponse: 'c'.repeat(40) });
  await assert.rejects(installFixture(project, join(root, 'cache'), repo, { fetchImpl: transport.fetchImpl }), /目录树与固定提交不匹配/);
  assert.equal(existsSync(join(project, '.agents')), false);
});

test('所选栈内 Windows 大小写目录碰撞在任何载荷下载前被拒绝', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository({ extraFiles: [
    { path: 'skills/unity-native/Assets/a.txt', bytes: 'a' },
    { path: 'skills/unity-native/assets/b.txt', bytes: 'b' },
  ] });
  const transport = fakeGitHub(repo);
  await assert.rejects(installFixture(project, join(root, 'cache'), repo, { fetchImpl: transport.fetchImpl }), /大小写冲突路径/);
  assert.deepEqual(rawPaths(transport.requests), ['packages/installer/catalog.json']);
  assert.equal(existsSync(join(project, '.agents')), false);
});

test('缓存默认冷启动逐层创建，并拒绝缓存根祖先或哈希桶链接', async (t) => {
  const root = testDirectory(t);
  const defaultCacheHome = join(root, 'local-app-data');
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository();
  const defaultTransport = fakeGitHub(repo);
  const defaultSource = await createGitHubSource({ repo: REPOSITORY, ref: BRANCH, fetchImpl: defaultTransport.fetchImpl, env: { LOCALAPPDATA: defaultCacheHome } });
  const catalog = defaultSource.findBlob('packages/installer/catalog.json');
  await defaultSource.getBlob(catalog);
  const defaultBlob = join(defaultCacheHome, 'app-creator-skills', 'github-blobs', catalog.sha.slice(0, 2), catalog.sha);
  assert.ok(existsSync(defaultBlob));

  const coldCache = join(root, 'not-yet', 'created', 'cache');
  const coldTransport = fakeGitHub(repo);
  await installFixture(project, coldCache, repo, { fetchImpl: coldTransport.fetchImpl });
  assert.ok(existsSync(join(coldCache, gitBlobSha(repo.files.get('skills/app-stack-unity/SKILL.md')).slice(0, 2))));

  const outside = join(root, 'outside');
  mkdirSync(outside);
  const link = join(root, 'cache-link');
  symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  const linkedSource = await createGitHubSource({ repo: REPOSITORY, ref: BRANCH, cacheRoot: join(link, 'cache'), fetchImpl: fakeGitHub(repo).fetchImpl, env: {} });
  await assert.rejects(linkedSource.getBlob(linkedSource.findBlob('packages/installer/catalog.json')), /缓存路径不能包含链接/);

  const bucketCache = join(root, 'bucket-cache');
  mkdirSync(bucketCache);
  const bucket = join(bucketCache, gitBlobSha(repo.files.get('packages/installer/catalog.json')).slice(0, 2));
  symlinkSync(outside, bucket, process.platform === 'win32' ? 'junction' : 'dir');
  const bucketSource = await createGitHubSource({ repo: REPOSITORY, ref: BRANCH, cacheRoot: bucketCache, fetchImpl: fakeGitHub(repo).fetchImpl, env: {} });
  await assert.rejects(bucketSource.getBlob(bucketSource.findBlob('packages/installer/catalog.json')), /缓存路径不能包含链接/);
});

/** 远程默认直接更新所选目录，保留无关技能且不产生持久备份或暂存目录。 */
test('远程默认覆盖旧文件并清理事务，重复安装跳过', async (t) => {
  const root = testDirectory(t);
  const project = join(root, 'project');
  mkdirSync(project);
  const repo = makeRepository();
  const cache = join(root, 'cache');
  const first = await installFixture(project, cache, repo, { fetchImpl: fakeGitHub(repo).fetchImpl });
  assert.equal(first.backup, null);
  assert.deepEqual(readdirSync(join(project, '.agents')), ['skills']);
  const existingBackup = join(project, '.agents', 'skills-backups', 'existing');
  mkdirSync(existingBackup, { recursive: true });
  writeFileSync(join(existingBackup, 'keep.txt'), '历史资料');
  const target = join(project, '.agents', 'skills', 'grilling', 'SKILL.md');
  writeFileSync(target, '用户修改\n');
  const obsolete = join(project, '.agents', 'skills', 'grilling', 'obsolete.txt');
  writeFileSync(obsolete, '旧文件');
  const unrelated = join(project, '.agents', 'skills', 'my-skill');
  mkdirSync(unrelated);
  writeFileSync(join(unrelated, 'SKILL.md'), '无关技能');
  const transport = fakeGitHub(repo);
  const replaced = await installFixture(project, cache, repo, { fetchImpl: transport.fetchImpl });
  assert.equal(replaced.changed, true);
  assert.equal(replaced.backup, null);
  assert.equal(replaced.entries.find((entry) => entry.name === 'grilling').action, 'replace');
  assert.equal(readFileSync(target, 'utf8'), '# grilling\n');
  assert.equal(existsSync(obsolete), false);
  assert.equal(readFileSync(join(unrelated, 'SKILL.md'), 'utf8'), '无关技能');
  assert.deepEqual(readdirSync(join(project, '.agents')).sort(), ['skills', 'skills-backups']);
  assert.deepEqual(readdirSync(join(project, '.agents', 'skills-backups')), ['existing']);
  assert.equal(readFileSync(join(existingBackup, 'keep.txt'), 'utf8'), '历史资料');
  const repeated = await installFixture(project, cache, repo, { fetchImpl: fakeGitHub(repo).fetchImpl });
  assert.equal(repeated.changed, false);
  assert.equal(repeated.backup, null);
  assert.ok(repeated.entries.every((entry) => entry.action === 'skip'));
  assert.deepEqual(readdirSync(join(project, '.agents')).sort(), ['skills', 'skills-backups']);
  assert.deepEqual(readdirSync(join(project, '.agents', 'skills-backups')), ['existing']);
});

test('CLI 必须明确仓库和技术栈，仓库地址仅接受 GitHub 形式', async () => {
  assert.equal(normalizeRepository('https://github.com/example/app-creator-skills.git'), REPOSITORY);
  assert.throws(() => normalizeRepository('https://example.com/owner/repo'), /只接受/);
  assert.throws(() => normalizeRepository('owner/repo?token=secret'), /只接受/);
  await assert.rejects(runRemoteInstaller(['--repo', REPOSITORY]), /必须明确选择有效技术栈/);
});
