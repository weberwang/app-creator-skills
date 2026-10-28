import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CORE_SKILLS } from '../packages/installer/capability-map.mjs';
import { runRemoteBootstrap } from '../install.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY = 'fixture/app-creator-skills';
const REVISION = 'a'.repeat(40);
const TREE_SHA = 'b'.repeat(40);
const BOOTSTRAP_PATHS = Object.freeze([
  'install.mjs',
  'packages/installer/remote-install/install.mjs',
  'packages/installer/installation-content.mjs',
  'packages/installer/install-project-skills.mjs',
  'packages/installer/skill-catalog.mjs',
  'packages/installer/capability-map.mjs',
  'skills/app-skill-runtime/direct-entry.mjs',
  'skills/app-skill-runtime/native-contracts.mjs',
]);

/** 独立计算 Git blob 标识，避免用启动器自身的校验函数验证自身。 */
function calculateGitBlobSha(bytes) {
  const content = Buffer.from(bytes);
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

/** 把父目录逐级加入递归 Git 树，目录 SHA 仅提供 API 所需的合法格式。 */
function addDirectory(path, state) {
  const parts = path.split('/');
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (state.directories.has(current)) continue;
    state.directories.add(current);
    state.tree.push({ path: current, mode: '040000', type: 'tree', sha: 'c'.repeat(40) });
  }
}

/** 记录真实仓库文件的字节和 Git blob SHA，供假 GitHub raw 响应使用。 */
function addBlob(path, bytes, state) {
  const content = Buffer.from(bytes);
  addDirectory(dirname(path).split(sep).join('/'), state);
  state.blobs.set(path, content);
  state.tree.push({ path, mode: '100644', type: 'blob', sha: calculateGitBlobSha(content), size: content.length });
}

/** 递归读取选定仓库目录，拒绝链接和特殊文件以保持 fixture 可重复。 */
function addRealDirectory(sourcePath, gitPath, state) {
  addDirectory(gitPath, state);
  for (const name of readdirSync(sourcePath).sort()) {
    const absolute = join(sourcePath, name);
    const path = `${gitPath}/${name}`;
    const metadata = lstatSync(absolute);
    if (metadata.isSymbolicLink()) throw new Error(`测试 fixture 不接受符号链接：${path}`);
    if (metadata.isDirectory()) addRealDirectory(absolute, path, state);
    else if (metadata.isFile()) addBlob(path, readFileSync(absolute), state);
    else throw new Error(`测试 fixture 不接受特殊文件：${path}`);
  }
}

/** 用本仓库真实引擎、技能和迁移清单构造离线 GitHub 目录树。 */
function createRepositoryFixture() {
  const state = { tree: [], directories: new Set(), blobs: new Map() };
  addBlob('install.mjs', readFileSync(join(REPOSITORY_ROOT, 'install.mjs')), state);
  for (const directory of ['packages/installer', 'skills', 'docs', 'tests']) {
    addRealDirectory(join(REPOSITORY_ROOT, directory), directory, state);
  }
  for (const path of ['README.md', 'package.json', 'package-lock.json', '.gitignore']) {
    const absolute = join(REPOSITORY_ROOT, path);
    if (existsSync(absolute)) addBlob(path, readFileSync(absolute), state);
  }
  for (const path of BOOTSTRAP_PATHS) assert.ok(state.blobs.has(path), `bootstrap fixture 缺少 ${path}`);
  state.tree.sort((left, right) => left.path.localeCompare(right.path));
  return state;
}

/** 在内存中模拟 GitHub 元数据和 raw 文件服务，并记录每次请求。 */
function createFakeFetch(fixture) {
  const requests = [];
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.hostname === 'api.github.com') {
      requests.push({ kind: 'api', path: `${url.pathname}${url.search}` });
      if (url.pathname === `/repos/${REPOSITORY}`) {
        return new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 });
      }
      if (url.pathname === `/repos/${REPOSITORY}/commits/main`) {
        return new Response(JSON.stringify({ sha: REVISION, commit: { tree: { sha: TREE_SHA } } }), { status: 200 });
      }
      if (url.pathname === `/repos/${REPOSITORY}/git/trees/${TREE_SHA}` && url.searchParams.get('recursive') === '1') {
        return new Response(JSON.stringify({ sha: TREE_SHA, truncated: false, tree: fixture.tree }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }
    if (url.hostname === 'raw.githubusercontent.com') {
      const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);
      const repository = `${parts[0]}/${parts[1]}`;
      const revision = parts[2];
      const path = parts.slice(3).join('/');
      requests.push({ kind: 'raw', path });
      assert.equal(repository, REPOSITORY, 'raw 请求必须固定到 fixture 仓库');
      assert.equal(revision, REVISION, 'raw 请求必须固定到选定提交');
      const content = fixture.blobs.get(path);
      if (!content) return new Response('not found', { status: 404 });
      return new Response(content, { status: 200 });
    }
    throw new Error(`测试遇到未预期的外部主机：${url.hostname}`);
  };
  return { fetchImpl, requests };
}

/** 根据真实迁移目录计算某栈必须安装的公共与专业目录。 */
function expectedRootsFor(stacks) {
  const catalog = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'packages', 'installer', 'catalog.json'), 'utf8'));
  const roots = new Set(CORE_SKILLS);
  for (const stack of stacks) {
    const profile = catalog.stacks[stack];
    roots.add(`app-stack-${stack}`);
    for (const name of profile.capabilitySkills) if (!CORE_SKILLS.includes(name)) roots.add(name);
    for (const name of profile.resourceDirectories) roots.add(name);
  }
  // 作者模式已合入本栈手册，只有清单明确列出的真实资源目录需要单独下载。
  roots.add('app-skill-runtime');
  roots.add('app-domain-toolkit');
  return [...roots].sort();
}

/** 检查远程内容请求只读取启动器、目录清单及本次选择的技能根。 */
function assertRawRequestsStayWithinSelection(rawPaths, selectedRoots) {
  const selected = new Set(selectedRoots);
  for (const path of rawPaths) {
    if (BOOTSTRAP_PATHS.includes(path) || path === 'packages/installer/catalog.json') continue;
    assert.ok(path.startsWith('skills/'), `不应下载技能以外内容：${path}`);
    const root = path.split('/')[1];
    assert.ok(selected.has(root), `不应下载未选技术栈或无关技能：${path}`);
  }
  assert.ok(rawPaths.every((path) => !path.startsWith('docs/') && !path.startsWith('tests/')));

  assert.ok(rawPaths.every((path) => !path.startsWith('packages/installer/') || path === 'packages/installer/catalog.json' || BOOTSTRAP_PATHS.includes(path)));
}

/** 以独占临时项目和缓存运行 bootstrap，并在用例结束时清理。 */
async function withTemporaryProject(t, action) {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-bootstrap-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  const cacheRoot = join(root, 'cache');
  mkdirSync(project);
  await action({ root, project, cacheRoot });
}

const repositoryFixture = createRepositoryFixture();

test('独立 bootstrap 只安装所选闭包，复用缓存并允许追加第二栈', async (t) => {
  await withTemporaryProject(t, async ({ project, cacheRoot }) => {
    const { fetchImpl, requests } = createFakeFetch(repositoryFixture);
    const runtime = { fetchImpl, cacheRoot, env: {} };
    const flutterRoots = expectedRootsFor(['flutter']);

    const firstStart = requests.length;
    const first = await runRemoteBootstrap([project, '--repo', REPOSITORY, '--ref', 'main', '--stack', 'flutter'], runtime);
    const firstRequests = requests.slice(firstStart);
    const firstRawPaths = firstRequests.filter((request) => request.kind === 'raw').map((request) => request.path);
    assert.deepEqual(first.remote.stacks, ['flutter']);
    assert.deepEqual(first.remote.selectedDirectories, flutterRoots);
    assert.equal(first.changed, true);
    assert.ok(first.remote.payloadDownloaded > 0);
    for (const path of BOOTSTRAP_PATHS) assert.ok(firstRawPaths.includes(path), `首次启动应下载引擎文件：${path}`);
    assert.ok(firstRawPaths.includes('packages/installer/catalog.json'));
    assertRawRequestsStayWithinSelection(firstRawPaths, flutterRoots);
    assert.ok(firstRawPaths.some((path) => path.startsWith('skills/app-stack-flutter/')));
    assert.ok(!firstRawPaths.some((path) => path.startsWith('skills/app-stack-unity/')));
    assert.ok(!firstRawPaths.some((path) => path.startsWith('skills/app-stack-cocos/')));
    const installedRoot = join(project, '.agents', 'skills');
    const firstInstalled = readdirSync(installedRoot).sort();
    assert.deepEqual(firstInstalled, flutterRoots);
    const flutterManual = readFileSync(join(installedRoot, 'app-stack-flutter', 'references', 'native-contracts.md'), 'utf8');
    assert.match(flutterManual, /<!-- native-source:flutter-feedback:start -->/);
    assert.match(flutterManual, /<!-- native-source:flutter-artifact-cleanup:start -->/);
    assert.ok(!firstRawPaths.some((path) => path.endsWith('/ADAPTER.md')), '远程安装不能重新下载旧适配文件');
    assert.ok(!existsSync(join(installedRoot, 'flutter-feedback')), '无资源的作者模式不能留下空壳目录');
    const commonName = CORE_SKILLS.find((name) => existsSync(join(installedRoot, name, 'SKILL.md')));
    assert.ok(commonName, '至少应安装一个公共技能入口');
    const commonBytesBeforeAppend = readFileSync(join(installedRoot, commonName, 'SKILL.md'));

    const repeatStart = requests.length;
    const repeated = await runRemoteBootstrap([project, '--repo', REPOSITORY, '--ref', 'main', '--stack', 'flutter'], runtime);
    const repeatRawPaths = requests.slice(repeatStart).filter((request) => request.kind === 'raw').map((request) => request.path);
    assert.equal(repeated.changed, false);
    assert.equal(repeated.remote.payloadDownloaded, 0);
    assert.ok(repeated.remote.metrics.cacheHits > 0);
    assert.deepEqual(repeatRawPaths, [], '同一栈重复安装应命中 blob 缓存，不再请求文件载荷');

    const unityRoots = expectedRootsFor(['unity']);
    const appendStart = requests.length;
    const appended = await runRemoteBootstrap([project, '--repo', REPOSITORY, '--ref', 'main', '--stack', 'unity'], runtime);
    const appendRawPaths = requests.slice(appendStart).filter((request) => request.kind === 'raw').map((request) => request.path);
    assert.deepEqual(appended.remote.stacks, ['unity']);
    assert.equal(appended.changed, true);
    assertRawRequestsStayWithinSelection(appendRawPaths, unityRoots);
    for (const path of appendRawPaths) {
      if (!path.startsWith('skills/')) continue;
      assert.ok(!flutterRoots.includes(path.split('/')[1]), `追加技术栈时公共内容应复用缓存：${path}`);
    }
    const combinedRoots = [...new Set([...flutterRoots, ...unityRoots])].sort();
    assert.deepEqual(readdirSync(installedRoot).sort(), combinedRoots);
    assert.ok(existsSync(join(installedRoot, 'app-stack-flutter', 'SKILL.md')));
    assert.ok(existsSync(join(installedRoot, 'app-stack-unity', 'SKILL.md')));
    assert.deepEqual(readFileSync(join(installedRoot, commonName, 'SKILL.md')), commonBytesBeforeAppend);
  });
});

test('dry-run 仅下载引擎和目录元数据，不取技能载荷或写入项目目录', async (t) => {
  await withTemporaryProject(t, async ({ project, cacheRoot }) => {
    const { fetchImpl, requests } = createFakeFetch(repositoryFixture);
    const result = await runRemoteBootstrap(
      [project, '--repo', REPOSITORY, '--ref', 'main', '--stack', 'unity', '--dry-run'],
      { fetchImpl, cacheRoot, env: {} },
    );
    const rawPaths = requests.filter((request) => request.kind === 'raw').map((request) => request.path);
    assert.equal(result.changed, false);
    assert.equal(result.remote.dryRun, true);
    assert.equal(result.remote.payloadDownloaded, 0);
    assert.equal(result.remote.metrics.metadataDownloaded, 1);
    assert.ok(!existsSync(join(project, '.agents')));
    assert.ok(BOOTSTRAP_PATHS.every((path) => rawPaths.includes(path)));
    assert.ok(rawPaths.includes('packages/installer/catalog.json'));
    assert.ok(rawPaths.every((path) => !path.startsWith('skills/') || BOOTSTRAP_PATHS.includes(path)));
    assertRawRequestsStayWithinSelection(rawPaths, expectedRootsFor(['unity']));
  });
});
