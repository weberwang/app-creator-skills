/** 验证渠道 SDK 透传、选择与生命周期，不连接真实宿主或商业服务。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../skills/app-release/assets/channel-sdks/typescript/', import.meta.url));

/** 定位现有 TypeScript 编译器；缺失时明确跳过，不自动安装依赖。 */
function findCompiler() {
  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    if (process.platform === 'win32') {
      const script = join(entry, 'node_modules/typescript/bin/tsc');
      if (existsSync(join(entry, 'tsc.cmd')) && existsSync(script)) return script;
    } else {
      const command = join(entry, 'tsc');
      if (existsSync(command)) return realpathSync(command);
    }
  }
  return undefined;
}

/** 收集真实资产中的全部引擎入口，确保编译覆盖分发结构。 */
function tsFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? tsFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

const compiler = findCompiler();
const reason = compiler ? false : '未安装 TypeScript 编译器，不能验证渠道运行时代码';
let temp;
let load;

before(() => {
  if (!compiler) return;
  temp = mkdtempSync(join(tmpdir(), 'channel-sdk-runtime-'));
  // CommonJS 让测试在不增加第三方加载器的前提下执行真实编译产物。
  writeFileSync(join(temp, 'package.json'), '{"type":"commonjs"}');
  const result = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--rootDir', source, '--outDir', temp, ...tsFiles(source)], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  load = createRequire(join(temp, 'package.json'));
});

after(() => {
  if (!temp) return;
  const actual = realpathSync(temp);
  assert.equal(dirname(actual), realpathSync(tmpdir()));
  assert.ok(basename(actual).startsWith('channel-sdk-runtime-'));
  rmSync(actual, { recursive: true, force: true });
});

/** 可控的异步结果用于复现超时、重试和迟到初始化。 */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** 构造仅用于本地测试的微信宿主选择参数。 */
function wechatSelection(sdk) {
  return { supportedPlatforms: ['wechat-minigame'], wechat: { timeoutMs: 100, verifiedMinigame: true, getWechatSdk: () => sdk } };
}

test('三个引擎分别选中本栈独立实现，只在初始化时读取选中宿主', { skip: reason }, async () => {
  for (const engine of ['cocos', 'phaser', 'threejs']) {
    const { createChannelSelector } = load(`./engines/${engine}/select-channel.js`);
    const { select: selectChannel } = createChannelSelector();
    const { WechatMinigameChannel } = load(`./engines/${engine}/wechat-minigame-channel.js`);
    let loads = 0;
    const sdk = { getLaunchOptionsSync() { return { scene: 42 }; } };
    const channel = selectChannel({ ...wechatSelection(sdk), wechat: { timeoutMs: 100, verifiedMinigame: true, getWechatSdk: () => { loads++; return sdk; } } });
    assert.ok(channel instanceof WechatMinigameChannel);
    assert.equal(loads, 0);
    assert.throws(() => channel.api, /尚未就绪/);
    const first = channel.initialize();
    assert.equal(channel.initialize(), first);
    await first;
    assert.equal(loads, 1);
    assert.equal(channel.api.getLaunchOptionsSync().scene, 42);
    await channel.initialize();
    assert.equal(loads, 1);
  }
});

test('拒绝未知、冲突和构建范围外的平台，且不触发 SDK 加载', { skip: reason }, () => {
  const { select: selectChannel } = load('./select-channel.js').createChannelSelector();
  let loads = 0;
  const wechat = { timeoutMs: 100, verifiedMinigame: true, getWechatSdk: () => { loads++; return {}; } };
  const crazygames = { timeoutMs: 100, candidate: true, loadSdk: async () => { loads++; return {}; } };
  assert.throws(() => selectChannel({ supportedPlatforms: [] }), /未知或冲突/);
  assert.throws(() => selectChannel({ supportedPlatforms: ['wechat-minigame', 'crazygames'], wechat, crazygames }), /未知或冲突/);
  assert.throws(() => selectChannel({ supportedPlatforms: ['crazygames'], wechat }), /不支持/);
  assert.equal(loads, 0);
});

test('每个引擎的选择作用域复用同一实例，配置变化必须先释放', { skip: reason }, async () => {
  for (const engine of ['cocos', 'phaser', 'threejs']) {
    const { createChannelSelector, selectChannel } = load(`./engines/${engine}/select-channel.js`);
    const selector = createChannelSelector();
    const independent = createChannelSelector();
    let loads = 0;
    let inits = 0;
    const sdk = { environment: 'crazygames', init() { inits++; return Promise.resolve(); } };
    const loadSdk = async () => { loads++; return sdk; };
    const options = { supportedPlatforms: ['crazygames'], crazygames: { candidate: true, timeoutMs: 100, loadSdk } };
    const first = selector.select(options);
    const again = selector.select({ ...options, crazygames: { ...options.crazygames } });
    assert.equal(first, again);
    assert.notEqual(first, independent.select(options));
    const init = first.initialize();
    assert.equal(again.initialize(), init);
    await init;
    assert.equal(loads, 1);
    assert.equal(inits, 1);
    assert.throws(() => selector.select({ ...options, crazygames: { ...options.crazygames, timeoutMs: 200 } }), /先释放/);
    assert.throws(() => selector.select({ supportedPlatforms: [], crazygames: options.crazygames }), /不支持/);
    assert.equal(selector.select(options), first);
    selector.dispose();
    assert.equal(first.state, 'disposed');
    const replacement = selector.select({ ...options, crazygames: { ...options.crazygames, timeoutMs: 200 } });
    assert.notEqual(replacement, first);
    replacement.dispose();
    independent.dispose();

    // 默认入口自身也必须跨重复调用复用实例，并在释放后允许重新选择。
    const defaultFirst = selectChannel(options);
    assert.equal(selectChannel(options), defaultFirst);
    defaultFirst.dispose();
    const defaultReplacement = selectChannel(options);
    assert.notEqual(defaultReplacement, defaultFirst);
    defaultReplacement.dispose();
  }
});

test('配置对象在选择后被外部修改不会悄悄改变现有实例', { skip: reason }, async () => {
  const selector = load('./select-channel.js').createChannelSelector();
  const firstSdk = { getAccountInfoSync: () => ({ name: 'first' }) };
  const secondSdk = { getAccountInfoSync: () => ({ name: 'second' }) };
  const config = { timeoutMs: 100, verifiedMinigame: true, getWechatSdk: () => firstSdk };
  const selection = { supportedPlatforms: ['wechat-minigame'], wechat: config };
  const first = selector.select(selection);
  config.getWechatSdk = () => secondSdk;
  assert.throws(() => selector.select(selection), /先释放/);
  await first.initialize();
  assert.equal(first.api.getAccountInfoSync().name, 'first');
  selector.dispose();
  const second = selector.select(selection);
  await second.initialize();
  assert.equal(second.api.getAccountInfoSync().name, 'second');
  selector.dispose();
});

test('同步释放后初始化微任务不应启动 CrazyGames 加载器', { skip: reason }, async () => {
  const selector = load('./select-channel.js').createChannelSelector();
  let loads = 0;
  const channel = selector.select({ supportedPlatforms: ['crazygames'], crazygames: { candidate: true, timeoutMs: 100, loadSdk: async () => { loads++; return {}; } } });
  const pending = channel.initialize();
  channel.dispose();
  await assert.rejects(pending, /取消|失效/);
  await Promise.resolve();
  assert.equal(loads, 0);
  assert.equal(channel.state, 'disposed');
});

test('释放后等待旧 SDK 的底层初始化结束，才允许同作用域重建', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  for (const release of ['channel', 'selector']) {
    const gate = deferred();
    let loads = 0;
    let inits = 0;
    const sdk = { environment: 'crazygames', init() { inits++; return gate.promise; } };
    const loadSdk = async () => { loads++; return sdk; };
    const selection = { supportedPlatforms: ['crazygames'], crazygames: { candidate: true, timeoutMs: 100, loadSdk } };
    const selector = createChannelSelector();
    const old = selector.select(selection);
    const pending = old.initialize();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(inits, 1);
    if (release === 'channel') old.dispose();
    else selector.dispose();
    await assert.rejects(pending, /取消|失效/);
    assert.equal(old.hasPendingInitialization, true);
    assert.throws(() => selector.select(selection), /初始化尚未结束/);
    assert.equal(inits, 1);
    assert.equal(loads, 1);
    gate.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(old.hasPendingInitialization, false);
    assert.equal(old.state, 'disposed');
    const next = selector.select(selection);
    assert.notEqual(next, old);
    await next.initialize();
    assert.equal(loads, 2);
    assert.equal(inits, 2);
    selector.dispose();
  }
});

test('拒绝非数字与超过计时器上限的超时配置', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const { loadCrazyGamesSdk } = load('./crazygames-loader.js');
  for (const timeoutMs of [NaN, Infinity, 0, 2147483648]) {
    assert.throws(() => createChannelSelector().select({ supportedPlatforms: ['wechat-minigame'], wechat: { timeoutMs, verifiedMinigame: true } }), /超时/);
    await assert.rejects(loadCrazyGamesSdk(timeoutMs), /超时/);
  }
});



test('微信默认只在确认小游戏宿主后读取全局 wx', { skip: reason }, async () => {
  const { select: selectChannel } = load('./select-channel.js').createChannelSelector();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'wx');
  let reads = 0;
  const sdk = { login: () => 'host-login' };
  Object.defineProperty(globalThis, 'wx', { configurable: true, get() { reads++; return sdk; } });
  try {
    assert.throws(() => selectChannel({ supportedPlatforms: ['wechat-minigame'], wechat: { timeoutMs: 100, verifiedMinigame: false } }), /未知或冲突/);
    assert.equal(reads, 0);
    const channel = selectChannel({ supportedPlatforms: ['wechat-minigame'], wechat: { timeoutMs: 100, verifiedMinigame: true } });
    assert.equal(reads, 0);
    await channel.initialize();
    assert.equal(reads, 1);
    assert.equal(channel.api.login(), 'host-login');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'wx', previous);
    else delete globalThis.wx;
  }
});

test('CrazyGames 官方脚本按需加载，同步请求复用同一脚本并处理失败', { skip: reason }, async () => {
  const { loadCrazyGamesSdk, CRAZYGAMES_SDK_URL } = load('./crazygames-loader.js');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldCrazyGames = Object.getOwnPropertyDescriptor(globalThis, 'CrazyGames');
  const appended = [];
  const fakeDocument = {
    head: { appendChild(script) { appended.push(script); } },
    createElement() { return { remove() { this.removed = true; } }; },
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
  delete globalThis.CrazyGames;
  try {
    const first = loadCrazyGamesSdk(100);
    const second = loadCrazyGamesSdk(100);
    assert.equal(first, second);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].src, CRAZYGAMES_SDK_URL);
    const sdk = { init: async () => {}, environment: 'crazygames' };
    globalThis.CrazyGames = { SDK: sdk };
    appended[0].onload();
    assert.equal(await first, sdk);
    assert.equal(await loadCrazyGamesSdk(100), sdk);
    assert.equal(appended.length, 1);

    delete globalThis.CrazyGames;
    const failed = loadCrazyGamesSdk(100);
    assert.equal(appended.length, 2);
    appended[1].onerror();
    await assert.rejects(failed, /加载失败/);
    assert.equal(appended[1].removed, true);
    const timedOut = loadCrazyGamesSdk(10);
    assert.equal(appended.length, 3);
    await assert.rejects(timedOut, /加载超时/);
    assert.equal(appended[2].removed, true);
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else delete globalThis.document;
    if (oldCrazyGames) Object.defineProperty(globalThis, 'CrazyGames', oldCrazyGames);
    else delete globalThis.CrazyGames;
  }
});

test('CrazyGames 仅在已选择后加载并等待真实初始化，环境不匹配时拒绝', { skip: reason }, async () => {
  const { select: selectChannel } = load('./select-channel.js').createChannelSelector();
  for (const [environment, allowLocalTesting, success] of [['crazygames', false, true], ['local', true, true], ['local', false, false], ['disabled', true, false]]) {
    let loads = 0;
    let inits = 0;
    let starts = 0;
    const sdk = { environment, init() { assert.equal(this, sdk); inits++; return Promise.resolve(); }, game: { gameplayStart() { starts++; } } };
    const channel = selectChannel({ supportedPlatforms: ['crazygames'], crazygames: { candidate: true, timeoutMs: 100, allowLocalTesting, loadSdk: async () => { loads++; return sdk; } } });
    assert.equal(loads, 0);
    if (success) {
      await channel.initialize();
      channel.api.game.gameplayStart();
      assert.equal(starts, 1);
      assert.equal('init' in channel.api, false);
    } else {
      await assert.rejects(channel.initialize(), /环境不可用/);
      assert.equal(channel.state, 'failed');
      assert.throws(() => channel.api, /尚未就绪/);
    }
    assert.equal(loads, 1);
    assert.equal(inits, 1);
    channel.dispose();
  }
});

test('超时和释放后的迟到结果不能变成就绪，也不重复启动未结束的 SDK', { skip: reason }, async () => {
  const { select: selectChannel } = load('./select-channel.js').createChannelSelector();
  const gate = deferred();
  let loads = 0;
  const sdk = { environment: 'crazygames', init: () => gate.promise };
  const channel = selectChannel({ supportedPlatforms: ['crazygames'], crazygames: { candidate: true, timeoutMs: 20, loadSdk: async () => { loads++; return sdk; } } });
  await assert.rejects(channel.initialize(), /超时/);
  assert.equal(channel.state, 'failed');
  await assert.rejects(channel.initialize(), /尚未结束/);
  assert.equal(loads, 1);
  gate.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(channel.state, 'failed');
  await channel.initialize();
  assert.equal(channel.state, 'ready');
  assert.equal(loads, 2);
  channel.dispose();

  const pending = deferred();
  let inits = 0;
  const disposed = selectChannel({ supportedPlatforms: ['crazygames'], crazygames: { candidate: true, timeoutMs: 100, loadSdk: () => pending.promise } });
  const result = disposed.initialize();
  await Promise.resolve();
  disposed.dispose();
  await assert.rejects(result, /取消|失效/);
  pending.resolve({ environment: 'crazygames', init() { inits++; } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(inits, 0);
  assert.equal(disposed.state, 'disposed');
  await assert.rejects(disposed.initialize(), /已释放/);
});
