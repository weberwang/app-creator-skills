/** 验证原生插件适配器的独立生命周期，全部插件均为本地替身。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { before, after, test } from 'node:test';

/** 查找已安装的 TypeScript，不安装依赖。 */
function compilerPath() {
  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = process.platform === 'win32' ? join(entry, 'node_modules/typescript/bin/tsc') : join(entry, 'tsc');
    if (existsSync(candidate)) return realpathSync(candidate);
  }
  throw new Error('缺少 TypeScript 编译器');
}
/** 创建可控制完成顺序的异步替身。 */
function deferred() {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
/** 等待队列内的异步任务继续执行。 */
async function tick() { await new Promise((resolve) => setImmediate(resolve)); }
const options = { platform: 'android', verifiedNative: true, initializationAllowed: true, timeoutMs: 500 };
let root; let load;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'mobile-sdk-capacitor-'));
  writeFileSync(join(root, 'package.json'), '{"type":"commonjs"}');
  const source = 'skills/app-domain-toolkit/assets/mobile-sdks';
  const build = spawnSync(process.execPath, [compilerPath(), '--strict', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--rootDir', source, '--outDir', root, `${source}/capacitor/composition-root.ts`], { encoding: 'utf8', windowsHide: true });
  assert.ifError(build.error); assert.equal(build.status, 0, build.stdout + build.stderr);
  load = createRequire(join(root, 'package.json'));
});
after(() => {
  if (!root) return;
  const real = realpathSync(root);
  assert.equal(dirname(real), realpathSync(tmpdir()));
  assert.ok(basename(real).startsWith('mobile-sdk-capacitor-'));
  rmSync(real, { recursive: true, force: true });
});

test('共享生命周期动态检查前置、去重、超时及释放', async () => {
  const { ManagedNativeSdk } = load('./shared/managed-sdk.js');
  /** 让测试控制底层初始化结果。 */
  class Probe extends ManagedNativeSdk {
    constructor(config, boot) { super(config); this.bootFn = boot; }
    boot(current) { return this.bootFn(current); }
    value() { return this.requirePlugin(); }
  }
  let allowed = false; let calls = 0; const source = deferred();
  const sdk = new Probe({ ...options, timeoutMs: 25, initializationAllowed: () => allowed }, () => { calls++; return source.promise; });
  await assert.rejects(sdk.initialize()); allowed = true;
  const first = sdk.initialize(); assert.equal(sdk.initialize(), first);
  await assert.rejects(first); assert.equal(calls, 1);
  await assert.rejects(sdk.initialize(), /仍在进行/); assert.equal(calls, 1);
  source.resolve({ ok: true }); await tick();
  await sdk.initialize(); assert.equal(calls, 2); assert.deepEqual(sdk.value(), { ok: true });
  sdk.dispose(); await assert.rejects(sdk.initialize()); assert.throws(() => sdk.value());
  const waiting = deferred(); const disposed = new Probe(options, () => waiting.promise);
  const pending = disposed.initialize(); await tick(); disposed.dispose(); await assert.rejects(pending);
  waiting.resolve({}); await tick(); assert.equal(disposed.state, 'disposed');
});

test('Firebase 事件参数与原生具名接口严格验证', async () => {
  const { validateEvent } = load('./shared/contracts.js');
  validateEvent('level_complete', { score: 1, mode: 'a' });
  for (const name of ['1bad', 'firebase_bad', 'a'.repeat(41)]) assert.throws(() => validateEvent(name, {}));
  for (const value of [NaN, Infinity, {}, null, true]) assert.throws(() => validateEvent('event', { value }));
  const { FirebaseAnalyticsSdk } = load('./capacitor/firebase-analytics-sdk.js');
  const calls = []; const plugin = {
    setEnabled: async (v) => calls.push(['enabled', v]), logEvent: async (v) => calls.push(['event', v]),
    setUserId: async (v) => calls.push(['user', v]), setUserProperty: async (v) => calls.push(['property', v]),
    getAppInstanceId: async () => ({ appInstanceId: 'id' }), setCurrentScreen: async (v) => calls.push(['screen', v]), resetAnalyticsData: async () => {},
  };
  const sdk = new FirebaseAnalyticsSdk({ ...options, collectionEnabled: true, loadPlugin: async () => plugin });
  await sdk.initialize(); await sdk.logEvent('level', { score: 5 }); await sdk.setCurrentScreen('home', 'Main');
  assert.deepEqual(calls.slice(0, 3), [['enabled', { enabled: true }], ['event', { name: 'level', params: { score: 5 } }], ['screen', { screenName: 'home', screenClassOverride: 'Main' }]]);
  assert.equal(await sdk.getAppInstanceId(), 'id');
  assert.deepEqual(await sdk.setCollectionEnabled(false), { requestedEnabled: false, automaticCollection: 'sdk-configured-restart-may-be-required' });
  assert.throws(() => sdk.logEvent('level')); assert.throws(() => sdk.setUserId('id')); await sdk.setUserId(null); await sdk.setUserProperty('x', null);
  sdk.dispose();
});

test('Firebase 禁采立即生效，旧的开启回调不能恢复手动写入', async () => {
  for (const [path, symbol, write] of [
    ['./capacitor/firebase-analytics-sdk.js', 'FirebaseAnalyticsSdk', (sdk) => sdk.logEvent('event')],
    ['./capacitor/firebase-crashlytics-sdk.js', 'FirebaseCrashlyticsSdk', (sdk) => sdk.log('message')],
  ]) {
    const slow = deferred(); let count = 0;
    const plugin = { setEnabled: () => (++count === 2 ? slow.promise : Promise.resolve()), logEvent: async () => {}, log: async () => {} };
    const Sdk = load(path)[symbol]; const sdk = new Sdk({ ...options, collectionEnabled: false, loadPlugin: async () => plugin });
    await sdk.initialize(); const enabling = sdk.setCollectionEnabled(true); const disabling = sdk.setCollectionEnabled(false);
    assert.throws(() => write(sdk)); await disabling; slow.resolve(); await enabling; assert.throws(() => write(sdk)); sdk.dispose();
  }
});

/** 构造能同步或异步触发官方监听的 AppsFlyer 替身。 */
function appsFlyerFake() {
  const calls = []; let session;
  const plugin = {
    registerDeepLinkListener: async () => { calls.push('deep'); },
    init: async () => { calls.push('init'); },
    registerConversionListener: async () => { calls.push('conversion'); },
    registerSessionReadyListener: async (callback) => { calls.push('session'); session = callback; },
    unregisterDeepLinkListener: async () => { calls.push('un-deep'); },
    unregisterConversionListener: async () => { calls.push('un-conversion'); },
    unregisterSessionReadyListener: async () => { calls.push('un-session'); },
    start: async (v) => { calls.push(['start', v]); },
    logEvent: async (v) => { calls.push(['event', v]); }, stop: async (v) => { calls.push(['stop', v]); },
  };
  return { plugin, calls, session: () => session() };
}

test('AppsFlyer 同步登记、真实会话启动、释放与停止', async () => {
  const { AppsFlyerSdk } = load('./capacitor/appsflyer-sdk.js'); const fake = appsFlyerFake();
  const init = deferred(); const start = deferred();
  fake.plugin.init = () => { fake.calls.push('init'); return init.promise; };
  fake.plugin.start = (v) => { fake.calls.push(['start', v]); return start.promise; };
  const sdk = new AppsFlyerSdk({ ...options, devKey: 'test', onDeepLink: () => {}, loadPlugin: async () => fake.plugin });
  const pending = sdk.initialize(); await tick();
  assert.deepEqual(fake.calls, ['deep', 'init', 'conversion', 'session']);
  fake.session(); await tick(); assert.equal(fake.calls.length, 4);
  init.resolve(); await tick(); assert.deepEqual(fake.calls[4], ['start', { awaitResponse: true }]); assert.equal(sdk.state, 'initializing');
  start.resolve(); await pending; fake.session(); await tick(); assert.equal(fake.calls.filter((x) => Array.isArray(x) && x[0] === 'start').length, 2);
  await sdk.logEvent('play', { level: 1 }); await sdk.stop(); await assert.rejects(sdk.logEvent('play'));
  sdk.dispose(); await sdk.waitForCleanup(); fake.session(); await tick();
  assert.equal(fake.calls.filter((x) => Array.isArray(x) && x[0] === 'start').length, 2);
  assert.deepEqual(fake.calls.filter((x) => typeof x === 'string' && x.startsWith('un-')), ['un-session', 'un-conversion', 'un-deep']);
});

test('AppsFlyer 深链登记失败仍清理自身监听', async () => {
  const { AppsFlyerSdk } = load('./capacitor/appsflyer-sdk.js'); const fake = appsFlyerFake();
  fake.plugin.registerDeepLinkListener = async () => { fake.calls.push('deep'); throw new Error('failed'); };
  const sdk = new AppsFlyerSdk({ ...options, devKey: 'test', onDeepLink: () => {}, loadPlugin: async () => fake.plugin });
  await assert.rejects(sdk.initialize(), /failed/);
  assert.deepEqual(fake.calls, ['deep', 'un-deep']); sdk.dispose();
});

test('组合入口只加载选定聚合，独立失败且不等待归因', async () => {
  const { createMobileSdkScope } = load('./capacitor/composition-root.js');
  const calls = []; const never = deferred();
  const config = { ...options, analytics: { initializationAllowed: true, collectionEnabled: true }, appsflyer: { initializationAllowed: true, devKey: '' }, advertising: { provider: 'admob', options: { initializationAllowed: true, units: {}, canRequestAds: () => true, nonPersonalizedInitializationVerified: true } } };
  const loaders = { analytics: () => never.promise, appsflyer: async () => { calls.push('af'); return {}; }, admob: async () => { calls.push('admob'); return { initialize: async () => {}, addListener: async () => ({ remove: async () => {} }) }; }, max: async () => { calls.push('max'); return {}; } };
  const scope = createMobileSdkScope(); const services = scope.create(config, loaders);
  assert.equal(scope.create(config, loaders), services); const failures = [];
  assert.equal(services.initialize((name) => failures.push(name)), undefined); await tick();
  assert.ok(calls.includes('admob')); assert.ok(!calls.includes('max')); assert.ok(failures.includes('appsflyer')); assert.equal(services.analytics.state, 'initializing');
  assert.throws(() => scope.create({ ...config, advertising: { provider: 'max', options: {} } }, loaders));
  config.analytics.collectionEnabled = false; assert.throws(() => scope.create(config, loaders));
  services.dispose(); assert.throws(() => scope.create(config, loaders)); never.resolve({});
});

test('SDK 同步失败和诊断失败不会阻断其他 SDK，授权缺失不等待', async () => {
  const { createMobileSdkScope } = load('./capacitor/composition-root.js');
  const config = { ...options, analytics: { initializationAllowed: false, collectionEnabled: false }, crashlytics: { initializationAllowed: true, collectionEnabled: true }, advertising: { provider: 'admob', options: { initializationAllowed: true, units: {}, canRequestAds: () => true, nonPersonalizedInitializationVerified: true } } };
  const calls = []; const never = deferred();
  const services = createMobileSdkScope().create(config, { analytics: async () => { throw new Error('不能加载'); }, crashlytics: () => never.promise, admob: async () => ({ initialize: async () => { calls.push('ads'); }, addListener: async () => ({ remove: async () => {} }) }) });
  services.analytics.initialize = () => { throw new Error('同步异常'); };
  assert.equal(services.initialize((name) => { calls.push(name); throw new Error('诊断异常'); }), undefined);
  await tick(); assert.ok(calls.includes('analytics')); assert.ok(calls.includes('ads')); assert.equal(services.crashlytics.state, 'initializing');
  services.dispose(); never.resolve({});
});

test('Crashlytics 按原生具名合同读写并允许关闭时清除', async () => {
  const { FirebaseCrashlyticsSdk } = load('./capacitor/firebase-crashlytics-sdk.js');
  const calls = []; const plugin = {
    setEnabled: async (value) => calls.push(['enabled', value]), recordException: async (value) => calls.push(['exception', value]),
    setCustomKey: async (value) => calls.push(['key', value]), log: async (value) => calls.push(['log', value]),
    setUserId: async (value) => calls.push(['user', value]), didCrashOnPreviousExecution: async () => ({ crashed: true }),
    sendUnsentReports: async () => calls.push(['send']), deleteUnsentReports: async () => calls.push(['delete']),
  };
  const sdk = new FirebaseCrashlyticsSdk({ ...options, collectionEnabled: true, loadPlugin: async () => plugin });
  await sdk.initialize(); const exception = { message: 'failure' }; const key = { key: 'stage', value: 'one', type: 'string' };
  await sdk.recordException(exception); await sdk.setCustomKey(key); await sdk.log('message'); await sdk.setUserId('id');
  assert.equal(await sdk.didCrashOnPreviousExecution(), true); await sdk.sendUnsentReports();
  assert.deepEqual(calls.slice(1, 5), [['exception', exception], ['key', key], ['log', { message: 'message' }], ['user', { userId: 'id' }]]);
  await sdk.setCollectionEnabled(false); assert.throws(() => sdk.recordException(exception)); assert.throws(() => sdk.sendUnsentReports());
  await sdk.setUserId(''); await sdk.deleteUnsentReports(); sdk.dispose();
});

test('AppsFlyer 同步回调内释放后等待注册完成再清理，不启动新会话', async () => {
  const { AppsFlyerSdk } = load('./capacitor/appsflyer-sdk.js'); const fake = appsFlyerFake(); const registration = deferred();
  let sdk;
  fake.plugin.registerSessionReadyListener = (callback) => { fake.calls.push('session'); sdk.dispose(); callback(); return registration.promise; };
  sdk = new AppsFlyerSdk({ ...options, devKey: 'test', loadPlugin: async () => fake.plugin });
  const pending = sdk.initialize(); await assert.rejects(pending); await tick();
  assert.equal(fake.calls.includes('un-session'), false); registration.resolve(); await sdk.waitForCleanup();
  assert.deepEqual(fake.calls, ['init', 'conversion', 'session', 'un-session', 'un-conversion']);
});

test('AppsFlyer 初始化同步抛错后注销已登记监听且阻止迟到会话', async () => {
  const { AppsFlyerSdk } = load('./capacitor/appsflyer-sdk.js'); const fake = appsFlyerFake();
  fake.plugin.init = () => { fake.calls.push('init'); throw new Error('init failed'); };
  const sdk = new AppsFlyerSdk({ ...options, devKey: 'test', loadPlugin: async () => fake.plugin });
  await assert.rejects(sdk.initialize(), /init failed/); fake.session(); await tick();
  assert.deepEqual(fake.calls, ['init', 'conversion', 'session', 'un-session', 'un-conversion']); sdk.dispose();
});
