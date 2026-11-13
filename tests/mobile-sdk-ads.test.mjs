/** 验证 MAX 真实回调和奖励关联，不启动广告 SDK。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

/** 复用当前环境的 TypeScript 编译器，不安装全局依赖。 */
function compilerPath() {
  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = process.platform === 'win32' ? join(entry, 'node_modules/typescript/bin/tsc') : join(entry, 'tsc');
    if (existsSync(candidate)) return realpathSync(candidate);
  }
  throw new Error('缺少 TypeScript 编译器，无法验证广告适配');
}

test('MAX 初始化只认回调，并使用 placement 隔离重复与迟到奖励', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mobile-max-test-'));
  t.after(() => { const real = realpathSync(root); assert.equal(dirname(real), realpathSync(tmpdir())); assert.ok(basename(real).startsWith('mobile-max-test-')); rmSync(real, { recursive: true, force: true }); });
  writeFileSync(join(root, 'package.json'), '{"type":"commonjs"}');
  const source = 'skills/app-domain-toolkit/assets/mobile-sdks';
  const compiler = compilerPath();
  const build = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2020', '--module', 'commonjs', '--rootDir', source, '--outDir', root, `${source}/capacitor/max-sdk.ts`], { encoding: 'utf8', windowsHide: true });
  assert.ifError(build.error); assert.equal(build.status, 0, build.stdout + build.stderr);
  const { MaxSdk } = createRequire(join(root, 'package.json'))('./capacitor/max-sdk.js');
  const target = new EventTarget();
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  let initialize;
  let placement;
  const sdk = { isInitialized: () => false, setHasUserConsent() {}, setDoNotSell() {}, initialize(_key, callback) { initialize = callback; }, isRewardedAdReady: () => true, isInterstitialReady: () => true, showRewardedAd(_unit, value) { placement = value; } };
  const manager = new MaxSdk({ platform: 'android', verifiedNative: true, initializationAllowed: true, timeoutMs: 1000, units: { rewarded: 'unit' }, canRequestAds: () => true, sdkKey: 'test', eventTarget: target, hasUserConsent: false, doNotSell: true, termsFlowDisabledVerified: true, nonPersonalizedRequestsVerified: true, loadPlugin: async () => sdk });
  const pending = manager.initialize();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(manager.state, 'initializing'); initialize({}); await pending;
  let rewards = 0;
  const first = manager.tryShowRewarded({ onReward: () => rewards++ });
  assert.equal(first.status, 'requested');
  /** 使用 SDK 原生事件字段模拟平台事件。 */
  const emit = (name, value) => { const event = new Event(name); Object.assign(event, value); target.dispatchEvent(event); };
  emit('OnRewardedAdHiddenEvent', { adUnitId: 'unit', placement });
  const old = placement;
  const second = manager.tryShowRewarded({ onReward: () => rewards++ });
  assert.equal(second.status, 'requested');
  emit('OnRewardedAdReceivedRewardEvent', { adUnitId: 'unit', placement: old, rewardAmount: 1, rewardLabel: 'coin' });
  emit('OnRewardedAdReceivedRewardEvent', { adUnitId: 'unit', placement: old, rewardAmount: 1, rewardLabel: 'coin' });
  assert.equal(rewards, 1);
  manager.dispose();
  emit('OnRewardedAdReceivedRewardEvent', { adUnitId: 'unit', placement, rewardAmount: 1, rewardLabel: 'coin' });
  assert.equal(rewards, 2);
});

/** 创建可精确控制异步完成时机的广告替身。 */
function deferred() {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** 将真实适配器编译到独占临时目录，避免依赖真实移动宿主。 */
function compile(t) {
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  const root = mkdtempSync(join(tmpdir(), 'mobile-ads-test-'));
  t.after(() => { const real = realpathSync(root); assert.equal(dirname(real), realpathSync(tmpdir())); assert.ok(basename(real).startsWith('mobile-ads-test-')); rmSync(real, { recursive: true, force: true }); });
  writeFileSync(join(root, 'package.json'), '{"type":"commonjs"}');
  const source = 'skills/app-domain-toolkit/assets/mobile-sdks';
  const compiler = compilerPath();
  const build = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2020', '--module', 'commonjs', '--rootDir', source, '--outDir', root, `${source}/capacitor/admob-sdk.ts`, `${source}/capacitor/max-sdk.ts`], { encoding: 'utf8', windowsHide: true });
  assert.ifError(build.error); assert.equal(build.status, 0, build.stdout + build.stderr);
  return createRequire(join(root, 'package.json'));
}

test('MAX 横幅位置变化重建视图，撤回授权仍可销毁', async (t) => {
  const { MaxSdk } = compile(t)('./capacitor/max-sdk.js');
  const calls = [];
  let allowed = true;
  const sdk = { isInitialized: () => false, setHasUserConsent() {}, setDoNotSell() {}, initialize(_key, callback) { callback({}); }, createBanner(unit, position) { calls.push(['create', unit, position]); }, showBanner(unit) { calls.push(['show', unit]); }, destroyBanner(unit) { calls.push(['destroy', unit]); } };
  const manager = new MaxSdk({ platform: 'android', verifiedNative: true, initializationAllowed: true, timeoutMs: 1000, units: { banner: 'banner' }, canRequestAds: () => allowed, sdkKey: 'test', eventTarget: new EventTarget(), hasUserConsent: false, doNotSell: true, termsFlowDisabledVerified: true, nonPersonalizedRequestsVerified: true, loadPlugin: async () => sdk });
  await manager.initialize();
  await manager.showBanner('top', true);
  await manager.showBanner('bottom', true);
  assert.deepEqual(calls, [['create', 'banner', 'top_center'], ['show', 'banner'], ['destroy', 'banner'], ['create', 'banner', 'bottom_center'], ['show', 'banner']]);
  allowed = false;
  await manager.removeBanner();
  assert.deepEqual(calls.at(-1), ['destroy', 'banner']);
  manager.dispose();
});

test('MAX 待决奖励达到上限时拒绝新展示，旧奖励确认后才能继续', async (t) => {
  const { MaxSdk } = compile(t)('./capacitor/max-sdk.js');
  const target = new EventTarget();
  let placement; let callback;
  const sdk = { isInitialized: () => false, setHasUserConsent() {}, setDoNotSell() {}, initialize(_key, done) { callback = done; }, isRewardedAdReady: () => true, showRewardedAd(_unit, value) { placement = value; } };
  const manager = new MaxSdk({ platform: 'android', verifiedNative: true, initializationAllowed: true, timeoutMs: 1000, units: { rewarded: 'unit' }, canRequestAds: () => true, sdkKey: 'test', eventTarget: target, hasUserConsent: false, doNotSell: true, termsFlowDisabledVerified: true, nonPersonalizedRequestsVerified: true, maxPendingRewards: 1, loadPlugin: async () => sdk });
  const init = manager.initialize(); await Promise.resolve(); await Promise.resolve(); callback({}); await init;
  const emit = (name, value) => { const event = new Event(name); Object.assign(event, value); target.dispatchEvent(event); };
  let rewards = 0;
  assert.equal(manager.tryShowRewarded({ onReward: () => rewards++ }).status, 'requested');
  emit('OnRewardedAdHiddenEvent', { adUnitId: 'unit', placement });
  assert.equal(manager.tryShowRewarded({ onReward: () => rewards++ }).status, 'busy');
  emit('OnRewardedAdReceivedRewardEvent', { adUnitId: 'unit', placement, rewardAmount: 1, rewardLabel: 'coin' });
  assert.equal(rewards, 1);
  assert.equal(manager.tryShowRewarded({ onReward: () => rewards++ }).status, 'requested');
  manager.dispose();
});

test('AdMob 初始化、NPA、展示及迟到奖励按各次真实请求关联', async (t) => {
  const { AdMobSdk } = compile(t)('./capacitor/admob-sdk.js');
  const init = deferred(); const events = new Map(); const requests = []; const rewards = [];
  let allowed = true;
  const sdk = {
    initialize: () => init.promise,
    addListener: async (name, callback) => { events.set(name, callback); return { remove: async () => events.delete(name) }; },
    prepareRewardVideoAd: async (options) => { requests.push(options); return { adUnitId: options.adId }; },
    prepareInterstitial: async (options) => { requests.push(options); return { adUnitId: options.adId }; },
    showRewardVideoAd: () => { const result = deferred(); rewards.push(result); return result.promise; },
    showInterstitial: async () => {}, showBanner: async () => {}, hideBanner: async () => {}, removeBanner: async () => {}, resumeBanner: async () => {},
  };
  const manager = new AdMobSdk({ platform: 'ios', verifiedNative: true, initializationAllowed: true, timeoutMs: 1000, units: { rewarded: 'reward', interstitial: 'inter', banner: 'banner' }, canRequestAds: () => allowed, nonPersonalizedInitializationVerified: true, loadPlugin: async () => sdk });
  const pending = manager.initialize(); assert.equal(manager.initialize(), pending);
  await Promise.resolve(); await Promise.resolve(); assert.equal(manager.state, 'initializing'); init.resolve(); await pending;
  assert.equal((await manager.loadRewarded()).status, 'loaded');
  assert.deepEqual(requests[0], { adId: 'reward', npa: true, isTesting: undefined });
  const obtained = [];
  const first = manager.tryShowRewarded({ onReward: (value) => obtained.push(value) });
  assert.equal(first.status, 'requested');
  events.get('onRewardedVideoAdDismissed')();
  assert.equal(obtained.length, 0);
  await manager.loadRewarded();
  const second = manager.tryShowRewarded({ onReward: (value) => obtained.push(value) });
  assert.equal(second.status, 'requested');
  rewards[0].resolve({ type: 'coin', amount: 1 }); await Promise.resolve();
  assert.equal(obtained[0].requestId, first.requestId);
  rewards[1].resolve({ type: 'coin', amount: 2 }); await Promise.resolve();
  assert.equal(obtained[1].requestId, second.requestId);
  allowed = false;
  assert.equal(manager.tryShowInterstitial().status, 'restricted');
  assert.equal((await manager.showBanner('bottom', false)).status, 'restricted');
  manager.dispose();
  assert.equal(manager.isReady('rewarded'), false);
});

test('AdMob 横幅迟到时销毁原生视图，预加载失败或释放后不能就绪', async (t) => {
  const { AdMobSdk } = compile(t)('./capacitor/admob-sdk.js');
  const banner = deferred(); const loading = deferred(); let removed = 0;
  const sdk = {
    initialize: async () => {}, addListener: async () => ({ remove: async () => {} }),
    prepareRewardVideoAd: () => loading.promise, prepareInterstitial: async () => { throw new Error('no fill'); },
    showBanner: () => banner.promise, hideBanner: async () => {}, removeBanner: async () => { removed++; }, resumeBanner: async () => {},
  };
  const manager = new AdMobSdk({ platform: 'android', verifiedNative: true, initializationAllowed: true, timeoutMs: 1000, units: { rewarded: 'reward', interstitial: 'inter', banner: 'banner' }, canRequestAds: () => true, nonPersonalizedInitializationVerified: true, loadPlugin: async () => sdk });
  await manager.initialize();
  assert.equal((await manager.loadInterstitial()).status, 'error');
  const load = manager.loadRewarded();
  const show = manager.showBanner('bottom', true); await Promise.resolve();
  const remove = manager.removeBanner(); banner.resolve(); await show; await remove;
  assert.ok(removed >= 1);
  manager.dispose(); loading.resolve({ adUnitId: 'reward' });
  assert.equal((await load).status, 'disposed');
  assert.equal(manager.isReady('rewarded'), false);
});
