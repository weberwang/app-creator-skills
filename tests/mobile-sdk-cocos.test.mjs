import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const temporary = mkdtempSync(join(tmpdir(), 'cocos-mobile-sdk-'));
const source = resolve('skills/app-domain-toolkit/assets/mobile-sdks/cocos/typescript');
execFileSync('tsc', ['--strict', '--target', 'es2020', '--module', 'commonjs', '--outDir', temporary, ...['ads', 'appsflyer', 'bridge', 'firebase-analytics', 'firebase-crashlytics', 'index', 'sdk-manager'].map((name) => join(source, `${name}.ts`))], { shell: process.platform === 'win32', stdio: 'pipe' });
const require = createRequire(import.meta.url);
const { CocosMobileSdks } = require(join(temporary, 'index.js'));
after(() => { if (temporary.startsWith(resolve(tmpdir()) + sep) && temporary.includes('cocos-mobile-sdk-')) rmSync(temporary, { recursive: true, force: true }); });

/** 模拟 Cocos 事件桥，仅重放本测试显式发出的原生结果。 */
class FakePort {
  constructor() { this.listeners = new Map(); this.sent = []; }
  addNativeEventListener(name, listener) { this.listeners.set(name, listener); }
  removeNativeEventListener(name, listener) { if (this.listeners.get(name) === listener) this.listeners.delete(name); }
  dispatchEventToNative(name, raw) { this.sent.push({ name, ...JSON.parse(raw) }); }
  emit(name, data) { this.listeners.get(name)?.(JSON.stringify(data)); }
  respond(request) { this.emit('appcreator.mobile.response', { id: request.id, ok: true }); }
}

/** 构造显式授权的项目配置，避免测试依赖真实 SDK 或账号。 */
function config(provider = 'admob') {
  return { timeoutMs: 1000, adProvider: provider, analytics: { allowCollection: true }, crashlytics: { allowCollection: true }, appsflyer: { devKey: 'test', allowAttribution: true }, ads: { allowAds: true, hasUserConsent: true, nonPersonalizedVerified: true, maxFlowConfigured: true, layoutSafe: true, sdkKey: 'test' } };
}

test('独立初始化并按展示请求关联奖励，单个监听器错误不影响其他消费者', async () => {
  const port = new FakePort();
  const sdk = new CocosMobileSdks(port, config('max'));
  const first = sdk.ads.initialize();
  assert.equal(port.sent[0].name, 'appcreator.mobile.max');
  port.respond(port.sent[0]); await first;
  const removeBroken = sdk.ads.onAdEvent(() => { throw new Error('业务错误'); });
  const seen = [];
  const removeGood = sdk.ads.onAdEvent((event) => seen.push(event));
  const load = sdk.ads.loadRewarded('slot'); port.respond(port.sent.at(-1)); await load;
  const shown = sdk.ads.tryShowRewarded('slot');
  assert.equal(shown.status, 'requested');
  port.respond(port.sent.at(-1));
  port.emit('appcreator.mobile.event', { source: 'max', event: 'earned', adUnitId: 'slot', requestId: shown.requestId });
  assert.equal(seen[0].requestId, shown.requestId);
  port.emit('appcreator.mobile.event', { source: 'max', event: 'closed', adUnitId: 'slot', requestId: shown.requestId });
  removeBroken(); removeGood(); sdk.dispose();
});

test('无广告隐私条件时不发原生请求', async () => {
  const port = new FakePort(); const value = config(); value.ads.nonPersonalizedVerified = false;
  const sdk = new CocosMobileSdks(port, value);
  await assert.rejects(sdk.ads.initialize(), /ads-privacy-not-configured/);
  assert.equal(port.sent.length, 0); sdk.dispose();
});

test('撤回广告授权后拒绝新展示但允许隐藏和销毁广告', async () => {
  const port = new FakePort(); const value = config('max');
  const sdk = new CocosMobileSdks(port, value);
  const initialization = sdk.ads.initialize(); port.respond(port.sent.at(-1)); await initialization;
  value.ads.allowAds = false;
  await assert.rejects(sdk.ads.loadRewarded('slot'), /ads-not-authorized/);
  const hide = sdk.ads.hideBanner('slot'); assert.equal(port.sent.at(-1).operation, 'hideBanner'); port.respond(port.sent.at(-1)); await hide;
  const destroy = sdk.ads.destroyAd('slot'); assert.equal(port.sent.at(-1).operation, 'destroyAd'); port.respond(port.sent.at(-1)); await destroy;
  sdk.dispose();
});

test('释放后同一原生桥不能重用请求编号，避免迟到奖励归入新展示', () => {
  const port = new FakePort();
  const sdk = new CocosMobileSdks(port, config());
  sdk.dispose();
  assert.throws(() => new CocosMobileSdks(port, config()), /bridge-already-active/);
});

test('初始化超时后迟到的成功不能改变状态，原生请求仍需完成才能释放', async () => {
  const port = new FakePort(); const value = config(); value.timeoutMs = 10;
  const sdk = new CocosMobileSdks(port, value);
  await assert.rejects(sdk.ads.initialize(), /initialization-timeout/);
  assert.equal(sdk.ads.state, 'failed');
  assert.throws(() => sdk.bridge.close(), /native-operations-or-listeners-active/);
  port.respond(port.sent[0]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sdk.ads.state, 'failed'); sdk.dispose();
});

test('组合根立即返回，单项同步异常与失败通知异常不影响其他 SDK', async () => {
  const port = new FakePort(); const value = config(); value.appsflyer.allowAttribution = false;
  const sdk = new CocosMobileSdks(port, value); const failures = [];
  sdk.analytics.initialize = () => { throw new Error('同步异常'); };
  const returned = sdk.initialize((name) => { failures.push(name); throw new Error('诊断回调异常'); });
  assert.equal(returned, undefined); assert.equal(port.sent.length, 0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(failures.includes('analytics')); assert.ok(failures.includes('appsflyer'));
  assert.deepEqual(port.sent.map((request) => request.name).sort(), ['appcreator.mobile.admob', 'appcreator.mobile.firebase.crashlytics']);
  for (const request of port.sent) port.respond(request);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sdk.ads.state, 'ready'); assert.equal(sdk.crashlytics.state, 'ready'); sdk.dispose();
});

test('加载不回调时游戏可立即继续，展示只在真实就绪后受理并跨格式互斥', async () => {
  const port = new FakePort(); const sdk = new CocosMobileSdks(port, config());
  const initialization = sdk.ads.initialize(); port.respond(port.sent.at(-1)); await initialization;
  assert.equal(sdk.ads.preloadRewarded('reward'), undefined);
  await Promise.resolve();
  const pendingLoad = port.sent.at(-1);
  assert.equal(sdk.ads.tryShowRewarded('reward').status, 'not-ready');
  assert.equal(sdk.ads.tryShowInterstitial('interstitial').status, 'not-ready');
  const loadInterstitial = sdk.ads.loadInterstitial('interstitial'); port.respond(port.sent.at(-1)); await loadInterstitial;
  port.respond(pendingLoad); await new Promise((resolve) => setImmediate(resolve));
  const shown = sdk.ads.tryShowRewarded('reward'); assert.equal(shown.status, 'requested');
  const request = port.sent.at(-1); assert.equal(sdk.ads.tryShowInterstitial('interstitial').status, 'busy');
  port.respond(request);
  port.emit('appcreator.mobile.event', { source: 'admob', event: 'closed', adUnitId: 'reward', requestId: shown.requestId + 1 });
  assert.equal(sdk.ads.tryShowInterstitial('interstitial').status, 'busy');
  port.emit('appcreator.mobile.event', { source: 'admob', event: 'closed', adUnitId: 'reward', requestId: shown.requestId });
  const next = sdk.ads.tryShowInterstitial('interstitial'); assert.equal(next.status, 'requested');
  port.respond(port.sent.at(-1));
  port.emit('appcreator.mobile.event', { source: 'admob', event: 'closed', adUnitId: 'interstitial', requestId: next.requestId });
  sdk.dispose();
});

test('授权不可用立即回退，撤回后旧加载完成也不能恢复就绪', async () => {
  const port = new FakePort(); const sdk = new CocosMobileSdks(port, config());
  const initialization = sdk.ads.initialize(); port.respond(port.sent.at(-1)); await initialization;
  const load = sdk.ads.loadRewarded('slot'); const pending = port.sent.at(-1);
  sdk.ads.setAdsAllowed(false);
  assert.equal(sdk.ads.tryShowRewarded('slot').status, 'restricted');
  sdk.ads.setAdsAllowed(true); port.respond(pending);
  await assert.rejects(load, /ad-load-obsolete/);
  assert.equal(sdk.ads.tryShowRewarded('slot').status, 'not-ready'); sdk.dispose();
});

test('原生请求仍在途时释放立即返回，完成后可再次关闭桥', async () => {
  const port = new FakePort(); const sdk = new CocosMobileSdks(port, config());
  const initializing = sdk.ads.initialize(); const pending = port.sent.at(-1);
  const errors = [];
  assert.equal(sdk.dispose((name, error) => errors.push([name, error.code])), undefined);
  assert.deepEqual(errors, [['bridge', 'native-operations-or-listeners-active']]);
  port.respond(pending); await assert.rejects(initializing, /initialization-obsolete/);
  assert.doesNotThrow(() => sdk.dispose());
});

test('原生拒绝展示时后台报告失败并释放互斥锁', async () => {
  const port = new FakePort(); const sdk = new CocosMobileSdks(port, config());
  const initialization = sdk.ads.initialize(); port.respond(port.sent.at(-1)); await initialization;
  const loadRewarded = sdk.ads.loadRewarded('reward'); port.respond(port.sent.at(-1)); await loadRewarded;
  const loadInterstitial = sdk.ads.loadInterstitial('interstitial'); port.respond(port.sent.at(-1)); await loadInterstitial;
  const failures = [];
  assert.equal(sdk.ads.tryShowRewarded('reward', (error) => failures.push(error.code)).status, 'requested');
  assert.equal(sdk.ads.tryShowInterstitial('interstitial').status, 'busy');
  port.emit('appcreator.mobile.response', { id: port.sent.at(-1).id, ok: false, error: 'ad-not-ready' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(failures, ['ad-not-ready']);
  const next = sdk.ads.tryShowInterstitial('interstitial'); assert.equal(next.status, 'requested');
  port.respond(port.sent.at(-1));
  port.emit('appcreator.mobile.event', { source: 'admob', event: 'showFailed', adUnitId: 'interstitial', requestId: next.requestId });
  sdk.dispose();
});

test('先奖励后展示失败仍按展示身份释放锁', async () => {
  const port = new FakePort(); const sdk = new CocosMobileSdks(port, config('max'));
  const init = sdk.ads.initialize(); port.respond(port.sent.at(-1)); await init;
  const reward = sdk.ads.loadRewarded('reward'); port.respond(port.sent.at(-1)); await reward;
  const interstitial = sdk.ads.loadInterstitial('interstitial'); port.respond(port.sent.at(-1)); await interstitial;
  const shown = sdk.ads.tryShowRewarded('reward'); assert.equal(shown.status, 'requested');
  port.respond(port.sent.at(-1));
  port.emit('appcreator.mobile.event', { source: 'max', event: 'earned', adUnitId: 'reward', requestId: shown.requestId });
  assert.equal(sdk.ads.tryShowInterstitial('interstitial').status, 'busy');
  port.emit('appcreator.mobile.event', { source: 'max', event: 'showFailed', adUnitId: 'reward', requestId: shown.requestId });
  const next = sdk.ads.tryShowInterstitial('interstitial'); assert.equal(next.status, 'requested');
  port.respond(port.sent.at(-1));
  port.emit('appcreator.mobile.event', { source: 'max', event: 'closed', adUnitId: 'interstitial', requestId: next.requestId });
  sdk.dispose();
});
