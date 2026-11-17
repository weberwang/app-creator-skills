/** 在临时目录编译并验证 Tap 小游戏渠道，不连接真实宿主。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const source = fileURLToPath(new URL('../skills/app-release/assets/channel-sdks/typescript/', import.meta.url));

/** 使用环境已有的 TypeScript 编译器，不安装新依赖。 */
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

/** 收集所有已安装的渠道文件，让新增类型与现有两个渠道一起编译。 */
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

const compiler = findCompiler();
const reason = compiler ? false : '未安装 TypeScript 编译器';
let root;
let load;
before(() => {
  if (!compiler) return;
  root = mkdtempSync(join(tmpdir(), 'taptap-channel-'));
  writeFileSync(join(root, 'package.json'), '{"type":"commonjs"}');
  const result = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--rootDir', source, '--outDir', root, ...files(source)], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  load = createRequire(join(root, 'package.json'));
});
after(() => {
  if (!root) return;
  const actual = realpathSync(root);
  assert.equal(dirname(actual), realpathSync(tmpdir()));
  assert.ok(basename(actual).startsWith('taptap-channel-'));
  rmSync(actual, { recursive: true, force: true });
});

/** 构建仅包含真实调用所需方法的本地宿主替身。 */
function selection(sdk) {
  return { supportedPlatforms: ['taptap-minigame'], taptap: { timeoutMs: 100, verifiedMinigame: true, getTapSdk: () => sdk } };
}

test('三个引擎只在已验证 Tap 宿主时创建本栈渠道，禁止其他信号冲突', { skip: reason }, async () => {
  for (const engine of ['cocos', 'phaser', 'threejs']) {
    const { createChannelSelector } = load(`./engines/${engine}/select-channel.js`);
    const { TaptapMinigameChannel } = load(`./engines/${engine}/taptap-minigame-channel.js`);
    const selector = createChannelSelector();
    const sdk = {};
    const options = selection(sdk);
    const channel = selector.select(options);
    assert.ok(channel instanceof TaptapMinigameChannel);
    assert.equal(selector.select(options), channel);
    assert.throws(() => channel.api, /尚未就绪/);
    await channel.initialize();
    assert.equal(channel.platform, 'taptap-minigame');
    selector.dispose();
    assert.throws(() => channel.api, /尚未就绪/);
    assert.throws(() => createChannelSelector().select({ ...options, wechat: { timeoutMs: 100, verifiedMinigame: true } }), /未知或冲突/);
    assert.throws(() => createChannelSelector().select({ ...options, supportedPlatforms: [] }), /不支持/);
    assert.throws(() => createChannelSelector().select({ ...options, taptap: { ...options.taptap, verifiedMinigame: false } }), /未知或冲突/);
  }
});

test('具名 API 透传官方回调、上下文、签名及监听身份', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const calls = [];
  const cloud = { createArchive(options) { assert.equal(this, cloud); calls.push(['archive', options]); } };
  const rank = { submitScores(options) { assert.equal(this, rank); calls.push(['score', options]); } };
  const button = { onTap(listener) { assert.equal(this, button); calls.push(['tap', listener]); }, offTap() {}, show() {}, hide() {}, destroy() {} };
  const sdk = {
    login(options) { assert.equal(this, sdk); calls.push(['login', options]); options.success({ code: 'short' }); },
    requestPaymentGameItem(options) { assert.equal(this, sdk); calls.push(['pay', options]); options.success({ errCode: 0, errMsg: 'ok' }); },
    showShareboard(options) { calls.push(['share', options]); },
    onShow(listener) { calls.push(['onShow', listener]); },
    offShow(listener) { calls.push(['offShow', listener]); },
    getCloudSaveManager() { return cloud; },
    getLeaderboardManager() { return rank; },
    createUserInfoButton(options) { calls.push(['button', options]); return button; },
  };
  const channel = createChannelSelector().select(selection(sdk));
  await channel.initialize();
  const code = [];
  channel.api.login({ success: (value) => code.push(value.code) });
  assert.deepEqual(code, ['short']);
  const signed = '{ "mode" : "goods" }';
  let paid;
  channel.api.requestPaymentGameItem({ signData: signed, paySig: 'a', signature: 'b', success: (result) => { paid = result; } });
  assert.equal(calls[1][1].signData, signed);
  assert.equal(paid.errCode, 0);
  const listener = () => {};
  channel.api.onShow(listener);
  channel.api.offShow(listener);
  assert.equal(calls[2][1], listener);
  assert.equal(calls[3][1], listener);
  channel.api.showShareboard({ templateId: 'reviewed', sceneParam: 'room' });
  assert.equal(calls[4][1].templateId, 'reviewed');
  const callback = () => {};
  const archive = { archiveMetaData: { name: 'slot', summary: 'level' }, archiveFilePath: 'tapfile://usr/save', success: callback };
  channel.api.getCloudSaveManager().createArchive(archive);
  assert.equal(calls[5][1], archive);
  assert.equal(calls[5][1].success, callback);
  const scores = { scores: [{ leaderboardId: 'score', score: 10 }], callback: { onSuccess: callback } };
  channel.api.getLeaderboardManager().submitScores(scores);
  assert.equal(calls[6][1], scores);
  assert.equal(calls[6][1].callback.onSuccess, callback);
  const userButton = channel.api.createUserInfoButton({ type: 'text', text: '授权', style: { left: 0, top: 0, width: 100, height: 40, backgroundColor: '#ffffff' } });
  userButton.onTap(callback);
  assert.equal(calls[8][1], callback);
  assert.throws(() => channel.api.getSetting({}), /没有授权状态/);
});

test('渠道释放后对象拒绝新业务，但可以清理原监听和宿主资源', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const calls = [];
  const showListener = () => {};
  const hideListener = () => {};
  const adListener = () => {};
  const resizeListener = () => {};
  const errorListener = () => {};
  const tapListener = () => {};
  /** 记录真实宿主方法的接收者、名称和参数，不以包装器替身代替行为。 */
  function native(methods) {
    const target = {};
    for (const name of methods) {
      target[name] = function (...args) { assert.equal(this, target); calls.push([name, ...args]); return Promise.resolve(); };
    }
    return target;
  }
  const bannerSource = native(['show', 'hide', 'destroy', 'onLoad', 'offLoad', 'onError', 'offError', 'onResize', 'offResize']);
  const interstitialSource = native(['show', 'load', 'destroy', 'onLoad', 'offLoad', 'onError', 'offError', 'onClose', 'offClose']);
  const buttonSource = native(['show', 'hide', 'destroy', 'onTap', 'offTap']);
  const cloudSource = native(['createArchive', 'updateArchive', 'getArchiveList', 'getArchiveData', 'getArchiveCover', 'deleteArchive']);
  const rankSource = native(['openLeaderboard', 'submitScores', 'loadLeaderboardScores', 'loadCurrentPlayerLeaderboardScore']);
  const sdk = {
    getCloudSaveManager() { return cloudSource; }, getLeaderboardManager() { return rankSource; },
    createBannerAd() { return bannerSource; }, createInterstitialAd() { return interstitialSource; }, createUserInfoButton() { return buttonSource; },
    onShow(listener) { calls.push(['onShow', listener]); }, offShow(listener) { calls.push(['offShow', listener]); },
    onHide(listener) { calls.push(['onHide', listener]); }, offHide(listener) { calls.push(['offHide', listener]); },
  };
  const selector = createChannelSelector();
  const channel = selector.select(selection(sdk));
  await channel.initialize();
  const api = channel.api;
  const cloud = api.getCloudSaveManager();
  const rank = api.getLeaderboardManager();
  const banner = api.createBannerAd({ adUnitId: 'banner', style: { left: 0, top: 0, width: 320 } });
  const interstitial = api.createInterstitialAd({ adUnitId: 'interstitial' });
  const button = api.createUserInfoButton({ type: 'text', style: { left: 0, top: 0, width: 100, height: 40, backgroundColor: '#fff' } });
  api.onShow(showListener);
  api.onHide(hideListener);
  banner.onLoad(adListener);
  banner.onResize(resizeListener);
  banner.onError(errorListener);
  interstitial.onClose(adListener);
  button.onTap(tapListener);
  await banner.show();
  await interstitial.load();
  button.show();
  selector.dispose();
  const prior = calls.length;
  const archiveOptions = { archiveMetaData: { name: 'slot', summary: 'save' }, archiveFilePath: 'tapfile://usr/save' };
  for (const operation of [
    () => cloud.createArchive(archiveOptions), () => cloud.updateArchive({ ...archiveOptions, archiveUUID: 'id' }),
    () => cloud.getArchiveList({}), () => cloud.getArchiveData({ archiveUUID: 'id', archiveFileId: 'file' }),
    () => cloud.getArchiveCover({ archiveUUID: 'id', archiveFileId: 'file' }), () => cloud.deleteArchive({ archiveUUID: 'id' }),
    () => rank.openLeaderboard({ leaderboardId: 'rank' }), () => rank.submitScores({ scores: [] }),
    () => rank.loadLeaderboardScores({ leaderboardId: 'rank' }), () => rank.loadCurrentPlayerLeaderboardScore({ leaderboardId: 'rank' }),
    () => banner.show(), () => banner.onLoad(adListener), () => interstitial.show(), () => interstitial.load(),
    () => interstitial.onClose(adListener), () => button.show(), () => button.onTap(tapListener),
  ]) assert.throws(operation, /尚未就绪/);
  assert.equal(calls.length, prior, '释放后不能向宿主发起新业务');
  api.offShow(showListener);
  api.offHide(hideListener);
  banner.offLoad(adListener);
  banner.offResize(resizeListener);
  banner.offError(errorListener);
  banner.hide();
  banner.destroy();
  interstitial.offClose(adListener);
  interstitial.destroy();
  button.offTap(tapListener);
  button.hide();
  button.destroy();
  assert.deepEqual(calls.slice(prior), [
    ['offShow', showListener], ['offHide', hideListener], ['offLoad', adListener],
    ['offResize', resizeListener], ['offError', errorListener], ['hide'], ['destroy'],
    ['offClose', adListener], ['destroy'], ['offTap', tapListener], ['hide'], ['destroy'],
  ]);
});

test('激励广告在全局单例中串行结算，重复关闭和渠道释放不会重复发奖', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const listeners = {};
  let count = 0;
  let creates = 0;
  const ad = {
    onLoad(fn) { listeners.load = fn; }, onError(fn) { listeners.error = fn; }, onClose(fn) { listeners.close = fn; },
    show() { count++; return Promise.resolve(); },
  };
  const sdk = { createRewardedVideoAd({ adUnitId }) { assert.equal(adUnitId, 'slot'); creates++; return ad; } };
  const options = selection(sdk);
  const selector = createChannelSelector();
  const channel = selector.select(options);
  await channel.initialize();
  const first = channel.api.prepareRewardedAd({ adUnitId: 'slot' });
  assert.equal(first.tryShow().status, 'not-ready');
  listeners.load();
  const shown = first.tryShow();
  assert.equal(shown.status, 'started');
  assert.equal(first.tryShow().status, 'busy');
  selector.dispose();
  listeners.close({ isEnded: true });
  assert.deepEqual(await shown.outcome, { status: 'completed' });
  listeners.close({ isEnded: true });
  assert.throws(() => first.tryShow(), /尚未就绪/);
  const next = selector.select(options);
  await next.initialize();
  const second = next.api.prepareRewardedAd({ adUnitId: 'slot' });
  assert.equal(second.tryShow().status, 'not-ready');
  listeners.load();
  listeners.close({ isEnded: true });
  const again = second.tryShow();
  assert.equal(again.status, 'started');
  listeners.close({ isEnded: false });
  assert.deepEqual(await again.outcome, { status: 'dismissed' });
  assert.equal(count, 2);
  assert.equal(creates, 1);
  assert.throws(() => next.api.prepareRewardedAd({ adUnitId: 'another' }), /单例/);
});

test('激励广告缺少完成标记和展示失败都不会产生完成结果', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const callbacks = {};
  const ad = { onLoad(fn) { callbacks.load = fn; }, onError(fn) { callbacks.error = fn; }, onClose(fn) { callbacks.close = fn; }, load() { return Promise.resolve(); }, show() { return Promise.reject(new Error('no fill')); } };
  const channel = createChannelSelector().select(selection({ createRewardedVideoAd: () => ad }));
  await channel.initialize();
  const controller = channel.api.prepareRewardedAd({ adUnitId: 'reward' });
  callbacks.load();
  const attempt = controller.tryShow();
  assert.equal((await attempt.outcome).status, 'error');
  assert.equal(controller.tryShow().status, 'quarantined');
  // 失败展示的迟到关闭只解除隔离，不能结算为下一次完成。
  callbacks.load();
  assert.equal(controller.tryShow().status, 'quarantined');
  await assert.rejects(controller.load(), /尚未收到关闭/);
  callbacks.close({ isEnded: true });
  assert.equal(controller.tryShow().status, 'not-ready');
  await controller.load();
  callbacks.load();
  ad.show = () => Promise.resolve();
  const unknown = controller.tryShow();
  callbacks.close();
  assert.equal((await unknown.outcome).status, 'unknown');
});

test('激励广告自动加载失败可后台重试，展示期间错误先结算并隔离旧关闭', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const callbacks = {};
  let loads = 0;
  let shows = 0;
  const ad = {
    onLoad(fn) { callbacks.load = fn; }, onError(fn) { callbacks.error = fn; }, onClose(fn) { callbacks.close = fn; },
    load() { loads++; return Promise.resolve(); },
    show() { shows++; return Promise.resolve(); },
  };
  const selector = createChannelSelector();
  const channel = selector.select(selection({ createRewardedVideoAd: () => ad }));
  await channel.initialize();
  const controller = channel.api.prepareRewardedAd({ adUnitId: 'retry' });
  callbacks.error({ errCode: 1004 });
  assert.equal(controller.tryShow().status, 'not-ready');
  await controller.load();
  assert.equal(loads, 1);
  assert.equal(controller.tryShow().status, 'not-ready');
  callbacks.load();
  const first = controller.tryShow();
  await Promise.resolve();
  callbacks.error({ errCode: 1003 });
  assert.deepEqual(await first.outcome, { status: 'error', error: { errCode: 1003 } });
  assert.equal(controller.tryShow().status, 'quarantined');
  callbacks.load();
  assert.equal(controller.tryShow().status, 'quarantined');
  callbacks.close({ isEnded: true });
  assert.equal(controller.tryShow().status, 'not-ready');
  await controller.load();
  callbacks.load();
  const second = controller.tryShow();
  assert.equal(second.status, 'started');
  callbacks.close({ isEnded: false });
  assert.equal((await second.outcome).status, 'dismissed');
  assert.equal(shows, 2);
});

test('展示同步异常隔离，加载任务不由展示入口等待且重复加载共享任务', { skip: reason }, async () => {
  const { createChannelSelector } = load('./select-channel.js');
  const callbacks = {};
  let resolveLoad;
  let loads = 0;
  const ad = {
    onLoad(fn) { callbacks.load = fn; }, onError(fn) { callbacks.error = fn; }, onClose(fn) { callbacks.close = fn; },
    load() { loads++; return new Promise((resolve) => { resolveLoad = resolve; }); },
    show() { callbacks.load(); throw new Error('show failed'); },
  };
  const channel = createChannelSelector().select(selection({ createRewardedVideoAd: () => ad }));
  await channel.initialize();
  const controller = channel.api.prepareRewardedAd({ adUnitId: 'throws' });
  const firstLoad = controller.load();
  assert.equal(controller.load(), firstLoad);
  assert.equal(controller.tryShow().status, 'not-ready');
  resolveLoad();
  await firstLoad;
  assert.equal(controller.tryShow().status, 'not-ready');
  callbacks.load();
  const first = controller.tryShow();
  assert.equal((await first.outcome).status, 'error');
  assert.equal(controller.tryShow().status, 'quarantined');
  assert.equal(loads, 1);
});
