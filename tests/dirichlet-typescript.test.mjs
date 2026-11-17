/** 在独立临时目录编译并验证 Dirichlet TypeScript 接线，不连接真实广告服务。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';

/** 测试仅编译项目维护的真实 TypeScript 源码。 */
const source = resolve('skills/app-domain-toolkit/assets/mobile-sdks');
/** 编译产物隔离在本次独占的操作系统临时目录。 */
const temporary = mkdtempSync(join(tmpdir(), 'dirichlet-typescript-'));
/** 读取本次临时目录中的 CommonJS 编译结果。 */
const load = createRequire(import.meta.url);
let DirichletSdk;
let CocosDirichletPort;
let createDirichletCapacitorLoader;
let createCocosDirichletAds;
let createPhaserDirichletAds;
let createThreejsDirichletAds;

/** 查找已有 TypeScript CLI；缺失时明确失败，不下载或改动项目依赖。 */
function findCompiler() {
  for (const item of (process.env.PATH ?? '').split(delimiter)) {
    if (process.platform === 'win32') {
      const compiler = join(item, 'node_modules/typescript/bin/tsc');
      if (existsSync(join(item, 'tsc.cmd')) && existsSync(compiler)) return compiler;
    } else {
      const compiler = join(item, 'tsc');
      if (existsSync(compiler)) return realpathSync(compiler);
    }
  }
  throw new Error('缺少 TypeScript 编译器，不能验证真实源码');
}

/** 等待当前微任务和显式延迟的插件调用投递。 */
function tick() { return new Promise((done) => setImmediate(done)); }

/** 由用例手动完成真实时序，避免依赖网络或广告填充。 */
function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolveValue, rejectValue) => { resolvePromise = resolveValue; rejectPromise = rejectValue; });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

/** 测试替身只模拟调用与指定回调，不代表官方 SDK 或真实宿主。 */
class FakePort {
  /** 新建独立测试状态，避免多个用例共享原生回调。 */
  constructor() { this.calls = []; this.listeners = new Set(); this.gates = {}; }
  /** 按用例控制单项原生操作的真实完成时机。 */
  perform(name, options) {
    this.calls.push({ name, options });
    const gate = this.gates[name];
    return gate ? gate.promise : Promise.resolve();
  }
  /** 记录初始化请求及项目配置。 */
  initialize(options) { return this.perform('initialize', options); }
  /** 按测试时序完成激励加载。 */
  loadRewarded(options) { return this.perform('loadRewarded', options); }
  /** 按测试时序完成插屏加载。 */
  loadInterstitial(options) { return this.perform('loadInterstitial', options); }
  /** 记录激励展示对应的请求身份。 */
  showRewarded(options) { return this.perform('showRewarded', options); }
  /** 记录插屏展示对应的请求身份。 */
  showInterstitial(options) { return this.perform('showInterstitial', options); }
  /** 按测试时序完成横幅请求。 */
  showBanner(options) { return this.perform('showBanner', options); }
  /** 记录横幅隐藏。 */
  hideBanner() { return this.perform('hideBanner'); }
  /** 记录横幅销毁。 */
  removeBanner() { return this.perform('removeBanner'); }
  /** 记录应用同步的广告授权。 */
  setRequestsAllowed(options) { return this.perform('setRequestsAllowed', options); }
  /** 记录原生资源释放请求。 */
  dispose() { return this.perform('dispose'); }
  /** 记录并移除当前实例的事件监听，不假设可清空其他监听。 */
  async addListener(name, listener) {
    this.calls.push({ name: 'addListener', options: name });
    this.listeners.add(listener);
    return { remove: async () => { this.listeners.delete(listener); } };
  }
  /** 向监听者发送用例显式构造的原生事件。 */
  emit(event) { for (const listener of [...this.listeners]) listener(event); }
  /** 统计指定具名调用次数。 */
  count(name) { return this.calls.filter((call) => call.name === name).length; }
}

/** 使用明确的测试 ID 和动态授权来源建立一个独立管理器。 */
function fixture(overrides = {}) {
  const port = overrides.port ?? new FakePort();
  const policy = { allowed: true };
  const options = {
    platform: 'android', verifiedNative: true, initializationAllowed: true, timeoutMs: 1000,
    mediaId: '12', mediaName: '测试媒体', mediaKey: 'test-key',
    units: { rewarded: '21', interstitial: '22', banner: '23' },
    nonPersonalizedNetworksConfigured: true,
    canRequestAds: () => policy.allowed,
    loadPlugin: async () => port,
    ...overrides.options,
  };
  return { port, policy, options, sdk: new DirichletSdk(options) };
}

/** 为指定展示构造严格匹配的原生事件。 */
function event(attempt, { kind = 'reward', format = 'rewarded', adUnitId = '21', verified = true, amount = 5 } = {}) {
  return { kind, format, adUnitId, requestId: attempt.requestId, verified, reward: { type: 'coin', amount } };
}

before(() => {
  const entries = [
    'dirichlet/typescript/dirichlet-sdk.ts', 'dirichlet/typescript/cocos-port.ts',
    'dirichlet/typescript/capacitor-port.ts', 'engines/cocos/dirichlet-ads.ts',
    'engines/phaser/dirichlet-ads.ts', 'engines/threejs/dirichlet-ads.ts',
  ].map((entry) => join(source, entry));
  const result = spawnSync(process.execPath, [findCompiler(), '--strict', '--target', 'es2020', '--module', 'commonjs', '--outDir', temporary, ...entries], { encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
  ({ DirichletSdk } = load(join(temporary, 'dirichlet/typescript/dirichlet-sdk.js')));
  ({ CocosDirichletPort } = load(join(temporary, 'dirichlet/typescript/cocos-port.js')));
  ({ createDirichletCapacitorLoader } = load(join(temporary, 'dirichlet/typescript/capacitor-port.js')));
  ({ createCocosDirichletAds } = load(join(temporary, 'engines/cocos/dirichlet-ads.js')));
  ({ createPhaserDirichletAds } = load(join(temporary, 'engines/phaser/dirichlet-ads.js')));
  ({ createThreejsDirichletAds } = load(join(temporary, 'engines/threejs/dirichlet-ads.js')));
});

after(() => {
  // 仅清理本测试独占的真实临时目录，不接受符号链接或外部目标。
  assert.equal(dirname(realpathSync(temporary)), realpathSync(tmpdir()));
  assert.ok(basename(realpathSync(temporary)).startsWith('dirichlet-typescript-'));
  rmSync(temporary, { recursive: true, force: true });
});

test('三个引擎均可编译、创建能力且构造不加载原生 SDK', () => {
  const { options } = fixture();
  let loaded = 0;
  const input = { ...options, loadPlugin: async () => { loaded++; return new FakePort(); } };
  const cocos = createCocosDirichletAds({ ...input, bridge: { addNativeEventListener() {}, removeNativeEventListener() {}, dispatchEventToNative() {} } });
  const phaser = createPhaserDirichletAds(input);
  const threejs = createThreejsDirichletAds(input);
  assert.equal(loaded, 0);
  for (const sdk of [cocos, phaser, threejs]) {
    assert.equal(sdk.state, 'idle');
    assert.equal(sdk.tryShowInterstitial().status, 'not-ready');
    sdk.dispose();
  }
});

test('未知宿主、iOS 与无效媒体身份拒绝构造，授权不足不加载插件', async () => {
  const { options } = fixture();
  assert.throws(() => new DirichletSdk({ ...options, verifiedNative: false }), /原生宿主/);
  assert.throws(() => new DirichletSdk({ ...options, platform: 'ios' }), /iOS/);
  for (const mediaId of ['0', '-1', '1.1', '9223372036854775808']) {
    assert.throws(() => new DirichletSdk({ ...options, mediaId }), /媒体配置/);
  }
  let loaded = 0;
  const restricted = fixture({ options: { nonPersonalizedNetworksConfigured: false, loadPlugin: async () => { loaded++; return new FakePort(); } } });
  await assert.rejects(restricted.sdk.initialize(), /非个性化/);
  assert.equal(loaded, 0);
  restricted.sdk.dispose();
});

test('同一实例初始化只调用一次原生接口，另一实例不能占用同一插件', async () => {
  const { sdk, port, options } = fixture();
  port.gates.initialize = deferred();
  const first = sdk.initialize();
  assert.strictEqual(sdk.initialize(), first);
  await tick();
  assert.equal(port.count('initialize'), 1);
  const other = new DirichletSdk(options);
  await assert.rejects(other.initialize(), /已有管理器/);
  port.gates.initialize.resolve();
  await first;
  assert.equal(sdk.state, 'ready');
  other.dispose();
  sdk.dispose();
});

test('初始化超时后的迟到成功不能复活实例，在原调用未结束前不重启', async () => {
  const { sdk, port } = fixture({ options: { timeoutMs: 10 } });
  port.gates.initialize = deferred();
  await assert.rejects(sdk.initialize(), /超时/);
  assert.equal(sdk.state, 'failed');
  await assert.rejects(sdk.initialize(), /仍在进行/);
  port.gates.initialize.resolve();
  await tick();
  assert.equal(sdk.state, 'failed');
  assert.equal(port.count('initialize'), 1);
  sdk.dispose();
});

test('原生插件加载期间撤回初始化授权后，不能开始 SDK 初始化', async () => {
  const port = new FakePort();
  const pendingPlugin = deferred();
  let initializationAllowed = true;
  const { sdk } = fixture({ port, options: {
    initializationAllowed: () => initializationAllowed,
    loadPlugin: () => pendingPlugin.promise,
  } });
  const initializing = sdk.initialize();
  await tick();
  initializationAllowed = false;
  pendingPlugin.resolve(port);
  await assert.rejects(initializing, /初始化|授权|前置/);
  assert.equal(port.count('initialize'), 0);
  assert.notEqual(sdk.state, 'ready');
  sdk.dispose();
});

test('原生初始化在途时撤回初始化授权，迟到成功不能恢复 ready', async () => {
  let initializationAllowed = true;
  const { sdk, port } = fixture({ options: { initializationAllowed: () => initializationAllowed } });
  port.gates.initialize = deferred();
  const initializing = sdk.initialize();
  await tick();
  assert.equal(port.count('initialize'), 1);
  initializationAllowed = false;
  port.gates.initialize.resolve();
  await assert.rejects(initializing, /初始化|授权|前置/);
  assert.notEqual(sdk.state, 'ready');
  sdk.dispose();
});

test('未加载时立即返回，重复加载共享任务，全屏格式互斥', async () => {
  const { sdk, port } = fixture();
  await sdk.initialize();
  port.gates.loadRewarded = deferred();
  const first = sdk.loadRewarded();
  assert.strictEqual(sdk.loadRewarded(), first);
  assert.equal(sdk.tryShowRewarded({ onReward() {} }).status, 'not-ready');
  await tick();
  assert.equal(port.count('loadRewarded'), 1);
  port.gates.loadRewarded.resolve();
  assert.equal((await first).status, 'loaded');
  assert.equal((await sdk.loadInterstitial()).status, 'loaded');
  const shown = sdk.tryShowRewarded({ onReward() {} });
  assert.equal(shown.status, 'requested');
  assert.equal(sdk.tryShowInterstitial().status, 'busy');
  port.emit(event(shown, { kind: 'closed' }));
  const next = sdk.tryShowInterstitial();
  assert.equal(next.status, 'requested');
  port.emit(event(next, { kind: 'closed', format: 'interstitial', adUnitId: '22' }));
  sdk.dispose();
});

test('只接受同一展示的有效验证奖励，关闭不发奖且重复回调幂等', async () => {
  const { sdk, port } = fixture();
  await sdk.initialize();
  await sdk.loadRewarded();
  const rewards = [];
  const closes = [];
  const shown = sdk.tryShowRewarded({ onReward: (value) => rewards.push(value), onClosed: (value) => closes.push(value) }, 'level-end');
  assert.equal(shown.status, 'requested');
  port.emit(event(shown, { kind: 'closed' }));
  assert.equal(rewards.length, 0);
  port.emit(event(shown, { verified: false }));
  port.emit(event(shown, { amount: 0 }));
  port.emit(event(shown, { adUnitId: '99' }));
  port.emit(event(shown, { format: 'interstitial' }));
  port.emit({ ...event(shown), requestId: 'another-request' });
  assert.equal(rewards.length, 0);
  port.emit(event(shown));
  port.emit(event(shown));
  port.emit(event(shown, { kind: 'closed' }));
  assert.equal(rewards.length, 1);
  assert.equal(rewards[0].requestId, shown.requestId);
  assert.equal(rewards[0].businessPlacement, 'level-end');
  assert.deepEqual(rewards[0].reward, { type: 'coin', amount: 5 });
  assert.equal(closes.length, 1);
  sdk.dispose();
});

test('原请求关闭后页面释放，可信迟到奖励仍回到原业务所有者', async () => {
  const { sdk, port } = fixture();
  await sdk.initialize();
  await sdk.loadRewarded();
  const earned = [];
  const shown = sdk.tryShowRewarded({ onReward: (value) => earned.push(value) });
  port.emit(event(shown, { kind: 'closed' }));
  sdk.dispose();
  await tick();
  assert.equal(port.listeners.size, 1);
  port.emit(event(shown));
  await tick();
  assert.equal(earned.length, 1);
  assert.equal(earned[0].requestId, shown.requestId);
  assert.equal(port.listeners.size, 0);
  port.emit(event(shown));
  assert.equal(earned.length, 1);
});

test('上一条激励关闭后再次展示，迟到奖励仍归属上一条请求', async () => {
  const { sdk, port } = fixture();
  await sdk.initialize();
  await sdk.loadRewarded();
  const firstRewards = [];
  const secondRewards = [];
  const first = sdk.tryShowRewarded({ onReward: (value) => firstRewards.push(value) });
  port.emit(event(first, { kind: 'closed' }));
  await sdk.loadRewarded();
  const second = sdk.tryShowRewarded({ onReward: (value) => secondRewards.push(value) });
  assert.equal(second.status, 'requested');
  assert.notEqual(first.requestId, second.requestId);
  port.emit(event(first));
  assert.equal(firstRewards.length, 1);
  assert.equal(firstRewards[0].requestId, first.requestId);
  assert.equal(secondRewards.length, 0);
  port.emit(event(second));
  port.emit(event(second, { kind: 'closed' }));
  assert.equal(secondRewards.length, 1);
  assert.equal(secondRewards[0].requestId, second.requestId);
  sdk.dispose();
});

test('撤回授权使旧加载结果失效，重新授权不能恢复旧广告', async () => {
  const { sdk, port, policy } = fixture();
  await sdk.initialize();
  port.gates.loadRewarded = deferred();
  const loading = sdk.loadRewarded();
  await tick();
  policy.allowed = false;
  await sdk.refreshPolicy();
  assert.equal(sdk.tryShowRewarded({ onReward() {} }).status, 'restricted');
  port.gates.loadRewarded.resolve();
  assert.equal((await loading).status, 'restricted');
  policy.allowed = true;
  await sdk.refreshPolicy();
  assert.equal(sdk.isReady('rewarded'), false);
  assert.equal(sdk.tryShowRewarded({ onReward() {} }).status, 'not-ready');
  assert.ok(port.calls.some((call) => call.name === 'setRequestsAllowed' && call.options.allowed === false));
  sdk.dispose();
});

test('就绪后撤回初始化授权也会限制展示并通知原生请求门', async () => {
  let initializationAllowed = true;
  const { sdk, port } = fixture({ options: { initializationAllowed: () => initializationAllowed } });
  await sdk.initialize();
  assert.equal((await sdk.loadRewarded()).status, 'loaded');
  initializationAllowed = false;
  assert.equal(sdk.isReady('rewarded'), false);
  assert.equal(sdk.tryShowRewarded({ onReward() {} }).status, 'restricted');
  await sdk.refreshPolicy();
  assert.ok(port.calls.some((call) => call.name === 'setRequestsAllowed' && call.options.allowed === false));
  assert.equal(port.count('showRewarded'), 0);
  sdk.dispose();
});

test('横幅加载中隐藏时，迟到视图再次销毁且不报告成功', async () => {
  const { sdk, port } = fixture();
  await sdk.initialize();
  port.gates.showBanner = deferred();
  const showing = sdk.showBanner('bottom', true);
  await tick();
  assert.equal(port.count('showBanner'), 1);
  const hiding = sdk.hideBanner();
  port.gates.showBanner.resolve();
  assert.equal((await showing).status, 'restricted');
  await hiding;
  assert.ok(port.count('hideBanner') >= 1);
  assert.ok(port.count('removeBanner') >= 1);
  sdk.dispose();
});

test('原生拒绝展示释放互斥锁，业务回调异常不会阻断后续事件', async () => {
  const { sdk, port } = fixture();
  await sdk.initialize();
  await sdk.loadRewarded();
  await sdk.loadInterstitial();
  port.gates.showRewarded = deferred();
  const failures = [];
  const shown = sdk.tryShowRewarded({ onReward() { throw new Error('业务异常'); }, onFailed: (value) => failures.push(value) });
  port.gates.showRewarded.reject(new Error('native failure'));
  await tick();
  assert.equal(failures.length, 1);
  assert.equal(failures[0].requestId, shown.requestId);
  const interstitial = sdk.tryShowInterstitial({ onClosed() { throw new Error('业务异常'); } });
  assert.equal(interstitial.status, 'requested');
  port.emit(event(interstitial, { kind: 'closed', format: 'interstitial', adUnitId: '22' }));
  assert.equal((await sdk.loadRewarded()).status, 'loaded');
  const next = sdk.tryShowRewarded({ onReward() { throw new Error('业务异常'); } });
  assert.equal(next.status, 'requested');
  port.emit(event(next));
  port.emit(event(next, { kind: 'closed' }));
  sdk.dispose();
});

test('Cocos JSB 严格关联响应，复用桥并只移除指定业务监听', async () => {
  const listeners = new Map();
  const sent = [];
  const bridge = {
    addNativeEventListener(name, listener) { listeners.set(name, listener); },
    removeNativeEventListener(name) { listeners.delete(name); },
    dispatchEventToNative(name, raw) { sent.push({ name, ...JSON.parse(raw) }); },
  };
  const port = CocosDirichletPort.forBridge(bridge);
  assert.strictEqual(CocosDirichletPort.forBridge(bridge), port);
  const seen = [];
  const handle = await port.addListener('adEvent', (value) => seen.push(value));
  const first = port.loadRewarded({ adUnitId: '21' });
  const second = port.loadInterstitial({ adUnitId: '22' });
  assert.equal(sent[0].name, 'appcreator.dirichlet.request');
  assert.equal(sent[0].method, 'loadRewarded');
  assert.notEqual(sent[0].id, sent[1].id);
  listeners.get('appcreator.dirichlet.response')(JSON.stringify({ id: sent[1].id, ok: true }));
  await second;
  listeners.get('appcreator.dirichlet.response')(JSON.stringify({ id: sent[0].id, ok: false }));
  await assert.rejects(first, /原生操作失败/);
  listeners.get('appcreator.dirichlet.event')(JSON.stringify({ kind: 'closed', requestId: 'one' }));
  assert.equal(seen.length, 1);
  await handle.remove();
  listeners.get('appcreator.dirichlet.event')(JSON.stringify({ kind: 'closed', requestId: 'two' }));
  assert.equal(seen.length, 1);
});

test('Capacitor loader 仅注册真实 Android 插件并复用实例', async () => {
  const plugin = new FakePort();
  const names = [];
  const runtime = { isNativePlatform: () => true, getPlatform: () => 'android', registerPlugin(name) { names.push(name); return plugin; } };
  const loader = createDirichletCapacitorLoader(runtime);
  assert.deepEqual(names, []);
  assert.strictEqual(await loader(), plugin);
  assert.strictEqual(await loader(), plugin);
  assert.deepEqual(names, ['AppCreatorDirichlet']);
  await assert.rejects(createDirichletCapacitorLoader({ ...runtime, isNativePlatform: () => false })(), /Android/);
  await assert.rejects(createDirichletCapacitorLoader({ ...runtime, getPlatform: () => 'ios' })(), /Android/);
});
