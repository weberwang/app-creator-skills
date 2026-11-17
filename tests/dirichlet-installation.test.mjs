/** 验证按引擎交付真实聚合实现、源码隔离以及官方包摘要下载。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { installTapTapAds, planTapTapAdsInstallation } from '../skills/app-release/scripts/install-taptap-ads.mjs';
import { downloadTapTapAdSdk, planTapTapAdSdkDownload } from '../skills/app-release/scripts/download-taptap-ads-sdk.mjs';
import { installMobileSdks } from '../skills/app-domain-toolkit/scripts/sdk/install-mobile-sdks.mjs';

/** 创建独占临时工程，仅在绝对父目录和前缀核实后递归清理。 */
function project(t) {
  const directory = mkdtempSync(join(tmpdir(), 'dirichlet-install-'));
  t.after(() => {
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.ok(basename(directory).startsWith('dirichlet-install-'));
    rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

for (const engine of ['unity', 'cocos', 'phaser', 'threejs']) {
  test(`${engine} 单栈安装后能选择性接入对应聚合封装和真实宿主接线`, async (t) => {
    const root = project(t);
    installSkills({ projectRoot: root, stacks: [engine] });
    const module = await import(pathToFileURL(join(root, '.agents/skills/app-release/scripts/install-taptap-ads.mjs')).href);
    const preview = module.installTapTapAds({ projectRoot: root, engine, target: 'native', dryRun: true });
    assert.equal(preview.changed, false);
    assert.equal(existsSync(preview.destination), false);
    const result = module.installTapTapAds({ projectRoot: root, engine, target: 'native' });
    assert.equal(result.changed, true);
    const names = result.files.map((file) => relative(root, file.target).replaceAll('\\', '/'));
    for (const file of result.files) assert.deepEqual(readFileSync(file.target), readFileSync(file.source));
    assert.ok(names.every((name) => !/Firebase|AppsFlyer|AdMobManager|MaxManager|sdk-services|composition-root/.test(name)), '仅选聚合广告不能带入其他 SDK 组合');
    if (engine === 'unity') {
      assert.ok(names.some((name) => /Dirichlet.*\.cs$/.test(name)));
      assert.ok(names.some((name) => name.endsWith('MobileSdkContracts.cs')));
      assert.ok(names.every((name) => !name.endsWith('.ts') && !name.endsWith('.java')));
    } else {
      assert.ok(names.some((name) => name.endsWith(`engines/${engine}/dirichlet-ads.ts`)));
      assert.ok(names.some((name) => name.includes('/core/') && name.endsWith('.java')));
      const binding = engine === 'cocos' ? '/cocos/' : '/capacitor/';
      assert.ok(names.some((name) => name.includes(binding) && name.endsWith('.java')));
      assert.ok(names.every((name) => !name.includes('/engines/') || name.includes(`/engines/${engine}/`)));
      if (engine === 'cocos') assert.ok(names.every((name) => !name.includes('/android/capacitor/')));
      else assert.ok(names.every((name) => !name.includes('/android/cocos/')));
    }
    assert.equal(module.installTapTapAds({ projectRoot: root, engine, target: 'native' }).changed, false);
    const downloader = await import(pathToFileURL(join(root, '.agents/skills/app-release/scripts/download-taptap-ads-sdk.mjs')).href);
    const selected = downloader.planTapTapAdSdkDownload({ projectRoot: root, engine });
    assert.match(selected.file, engine === 'unity' ? /unity.*\.unitypackage$/ : /mediation.*\.zip$/);
    assert.equal(selected.action, 'download');
  });
}

test('源码冲突和不支持平台在任何复制前拒绝，不把 Unity 小游戏文档当可编译绑定', (t) => {
  const root = project(t);
  const plan = planTapTapAdsInstallation({ projectRoot: root, engine: 'unity', target: 'native' });
  const file = plan.files.at(-1);
  mkdirSync(dirname(file.target), { recursive: true });
  writeFileSync(file.target, '项目已有内容');
  assert.throws(() => installTapTapAds({ projectRoot: root, engine: 'unity', target: 'native' }), /已存在且不同/);
  assert.equal(readFileSync(file.target, 'utf8'), '项目已有内容');
  assert.ok(plan.files.slice(0, -1).every((entry) => !existsSync(entry.target)));
  assert.throws(() => planTapTapAdsInstallation({ projectRoot: root, engine: 'unity', target: 'minigame' }), /缺少广告/);
  assert.throws(() => planTapTapAdsInstallation({ projectRoot: root, engine: 'cocos', target: 'native', platform: 'ios' }), /尚未交付/);
  const ios = planTapTapAdSdkDownload({ projectRoot: root, engine: 'unity', platform: 'ios' });
  assert.equal(ios.version, '5.3.0.1');
  assert.match(ios.file, /5\.3\.0\.1/);
  for (const output of ['..', '.', '.git/ads', '.agents/ads']) assert.throws(() => planTapTapAdsInstallation({ projectRoot: root, engine: 'unity', target: 'native', output }), /工程内|元数据/);
});

test('下载目标拒绝符号链接及越界，匹配摘要的已有官方包直接复用且不请求网络', async (t) => {
  const root = project(t);
  const outside = project(t);
  symlinkSync(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => planTapTapAdSdkDownload({ projectRoot: root, engine: 'unity', output: 'linked/sdk' }), /符号链接/);
  assert.throws(() => planTapTapAdSdkDownload({ projectRoot: root, engine: 'unity', output: '../sdk' }), /工程内/);
  assert.throws(() => planTapTapAdSdkDownload({ projectRoot: root, engine: 'unity', output: '.git/sdk' }), /元数据/);
  const bytes = Buffer.from('由测试传输明确返回的 SDK 字节');
  const manifest = fixtureManifest(bytes);
  const options = { projectRoot: root, engine: 'unity' };
  let requests = 0;
  const fetchImpl = async (url, init) => {
    ++requests;
    assert.equal(url, manifest.artifacts.unity.url);
    assert.equal(init.redirect, 'error');
    return new Response(bytes);
  };
  const preview = await downloadTapTapAdSdk({ ...options, dryRun: true }, { manifest, fetchImpl });
  assert.equal(requests, 0);
  assert.equal(existsSync(dirname(preview.target)), false);
  const downloaded = await downloadTapTapAdSdk(options, { manifest, fetchImpl });
  assert.equal(downloaded.imported, false);
  assert.equal(downloaded.downloaded, true);
  assert.deepEqual(readFileSync(downloaded.target), bytes);
  assert.equal(requests, 1);
  assert.equal((await downloadTapTapAdSdk(options, { manifest, fetchImpl })).action, 'reuse');
  assert.equal(requests, 1);
  writeFileSync(downloaded.target, '用户修改过的文件');
  await assert.rejects(downloadTapTapAdSdk(options, { manifest, fetchImpl }), /拒绝覆盖/);
  assert.equal(requests, 1);
});

test('错误下载、响应失败与摘要不符均不留下 SDK 或临时半包', async (t) => {
  const root = project(t);
  const bytes = Buffer.from('可信的完整包');
  const manifest = fixtureManifest(bytes);
  const options = { projectRoot: root, engine: 'phaser' };
  const plan = planTapTapAdSdkDownload(options, { manifest });
  await assert.rejects(downloadTapTapAdSdk(options, { manifest, fetchImpl: async () => new Response('错误页面', { status: 404 }) }), /下载失败/);
  assert.equal(existsSync(dirname(plan.target)), false);
  await assert.rejects(downloadTapTapAdSdk(options, { manifest, fetchImpl: async () => new Response('错误包') }), /摘要校验失败/);
  assert.equal(existsSync(plan.target), false);
  assert.deepEqual(readdirSync(dirname(plan.target)), []);
});

for (const order of ['mobile-first', 'taptap-first']) {
  test(`Unity 两种安装顺序均复用公共契约，不重复引入聚合类：${order}`, (t) => {
    const root = project(t);
    const installMobile = () => installMobileSdks({ projectRoot: root, engine: 'unity', adProvider: 'admob' });
    const installTap = () => installTapTapAds({ projectRoot: root, engine: 'unity', target: 'native' });
    if (order === 'mobile-first') { installMobile(); installTap(); }
    else { installTap(); installMobile(); }
    const files = recursiveFiles(join(root, 'Assets'));
    for (const name of ['MobileSdkContracts.cs', 'SdkInitialization.cs', 'DirichletManager.cs', 'DirichletAds.cs']) {
      assert.equal(files.filter((file) => basename(file) === name).length, 1, `同一 Unity 工程不能重复定义 ${name}`);
    }
    // 在同一个 C# 工程编译两次安装后的共享类型，覆盖重复命名空间定义问题。
    const projectFile = join(root, 'SharedTypes.csproj');
    writeFileSync(projectFile, '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup><Compile Include="Assets/**/MobileSdkContracts.cs;Assets/**/SdkInitialization.cs;Assets/**/Dirichlet*.cs" /></ItemGroup></Project>');
    const result = spawnSync('dotnet', ['build', projectFile, '--nologo', '-v:q'], { encoding: 'utf8', timeout: 120000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
  });
}

test('磁盘写入部分字节后失败时，回收当前半文件与此前本次新建文件', (t) => {
  const root = project(t);
  const helper = pathToFileURL(resolve('skills/app-release/scripts/taptap-project-files.mjs')).href;
  // 子进程只注入其自己的文件写入故障，避免污染并行测试或真实工程。
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    import { join } from 'node:path';
    const originalWrite = fs.writeSync;
    let calls = 0;
    fs.writeSync = (fd, bytes, offset, length) => {
      if (++calls === 2) { originalWrite(fd, bytes, offset, 2); throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); }
      return originalWrite(fd, bytes, offset, length);
    };
    syncBuiltinESMExports();
    const { applyCopies } = await import(process.argv[1]);
    const root = process.argv[2];
    const files = ['first.cs', 'second.cs'].map((name) => ({ target: join(root, name), contents: Buffer.from('complete-content'), action: 'install' }));
    let failed = false;
    try { applyCopies(files); } catch (error) { failed = error.code === 'ENOSPC'; }
    if (!failed || files.some((file) => fs.existsSync(file.target))) process.exit(1);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, helper, root], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Unity 内部契约不会静默跨 asmdef 复用，指定相同程序集目录后可以安装', (t) => {
  const root = project(t);
  const mobile = installMobileSdks({ projectRoot: root, engine: 'unity', adProvider: 'admob' });
  writeFileSync(join(mobile.destination, 'Foundation.asmdef'), JSON.stringify({ name: 'FoundationSdks' }));
  assert.throws(() => installTapTapAds({ projectRoot: root, engine: 'unity', target: 'native' }), /同一程序集/);
  assert.equal(existsSync(join(root, 'Assets/Scripts/Platform/TapTapAds')), false);
  const result = installTapTapAds({ projectRoot: root, engine: 'unity', target: 'native', output: relative(root, mobile.destination) });
  assert.equal(result.changed, true);
  assert.ok(existsSync(join(mobile.destination, 'DirichletManager.cs')));
});

/** 只枚举本用例普通工程源码，以实际文件数核对重复类型。 */
function recursiveFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false);
    return entry.isDirectory() ? recursiveFiles(path) : [path];
  });
}

/** 用可控内容测试流式下载与摘要保护，仍使用允许的官方 CDN 域名。 */
function fixtureManifest(bytes) {
  const artifact = { file: 'sdk.zip', url: 'https://tapad-platform.tapimg.com/sdk/test.zip', sha256: createHash('sha256').update(bytes).digest('hex') };
  return { version: 'test', artifacts: { unity: artifact, android: artifact } };
}
