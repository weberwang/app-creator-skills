/** 验证 CrazyGames 具名接口的官方参数、回调与业务结果，不调用真实 SDK。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../skills/app-release/assets/channel-sdks/typescript/crazygames/', import.meta.url));
const manifest = JSON.parse(readFileSync(join(source, 'api-manifest.json'), 'utf8'));

/** 查找本机已有 TypeScript 编译器，不改变工作区依赖。 */
function findCompiler() {
  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    if (process.platform === 'win32') {
      const script = join(entry, 'node_modules/typescript/bin/tsc');
      if (existsSync(join(entry, 'tsc.cmd')) && existsSync(script)) return script;
    } else if (existsSync(join(entry, 'tsc'))) return realpathSync(join(entry, 'tsc'));
  }
  return undefined;
}

const compiler = findCompiler();
let temp;
let CrazyGamesApi;
before(() => {
  if (!compiler) return;
  temp = mkdtempSync(join(tmpdir(), 'channel-crazy-api-'));
  writeFileSync(join(temp, 'package.json'), '{"type":"commonjs"}');
  const files = readdirSync(source).filter((name) => name.endsWith('.ts')).map((name) => join(source, name));
  const result = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--rootDir', source, '--outDir', temp, ...files], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  ({ CrazyGamesApi } = createRequire(join(temp, 'package.json'))('./api.js'));
});
after(() => {
  if (!temp) return;
  const actual = realpathSync(temp);
  assert.equal(dirname(actual), realpathSync(tmpdir()));
  assert.ok(basename(actual).startsWith('channel-crazy-api-'));
  rmSync(actual, { recursive: true, force: true });
});
const skip = compiler ? false : '缺少 TypeScript 编译器，未执行具体 SDK 接口验证';

/** 构造仅用于验证具名方法的本地 SDK 替身。 */
function fixture() {
  let ready = true;
  const calls = [];
  const result = Symbol('官方原始返回');
  const sdk = { environment: 'crazygames', isQaTool: false };
  for (const [module, methods] of Object.entries(manifest.methods)) {
    sdk[module] = {};
    for (const name of methods) {
      sdk[module][name] = function (...args) {
        assert.equal(this, sdk[module], `${module}.${name} 必须保持官方 this`);
        calls.push({ module, name, args });
        return result;
      };
    }
  }
  Object.assign(sdk.game, { link: 'game-url', id: 'game-id', settings: { muteAudio: false, disableChat: true }, isInstantMultiplayer: false, isOfflineMode: false, inviteParams: { room: '1' } });
  sdk.user.isUserAccountAvailable = true;
  const api = new CrazyGamesApi(sdk, () => { if (!ready) throw new Error('SDK 已释放'); });
  return { sdk, api, calls, result, close: () => { ready = false; } };
}

test('清单中的每个官方渠道方法均以具名实现直达同名 SDK，保留参数、返回值和调用接收者', { skip }, () => {
  const { api, calls, result } = fixture();
  const argument = { sample: '参数身份' };
  const listener = () => {};
  for (const [module, methods] of Object.entries(manifest.methods)) {
    for (const name of methods) {
      assert.equal(typeof api[module][name], 'function', `${module}.${name} 缺少具名实现`);
      const returnValue = api[module][name](argument, listener);
      const returnsSdkResult = new Set(['game.inviteLink', 'game.showInviteButton', 'game.getInviteParam', 'ad.hasAdblock', 'banner.requestBanner', 'banner.requestResponsiveBanner', 'user.getUser', 'user.showAuthPrompt', 'user.getUserToken', 'user.getXsollaUserToken', 'user.showAccountLinkPrompt', 'user.listFriends', 'data.getItem', 'store.getCatalogItems', 'store.getPlayerInventory', 'store.buyItem', 'store.consumeItem']);
      assert.equal(returnValue, returnsSdkResult.has(`${module}.${name}`) ? result : undefined, `${module}.${name} 改变了官方返回合同`);
      assert.deepEqual(calls.pop(), { module, name, args: [argument, listener].slice(0, expectedArgumentCount(module, name)) });
    }
  }
});

/** 对齐官方方法签名的实参数量，用于发现参数被丢弃或凭空增加。 */
function expectedArgumentCount(module, name) {
  if (['gameplayStart', 'gameplayStop', 'loadingStart', 'loadingStop', 'happytime', 'hideInviteButton', 'leftRoom', 'clearGameContext', 'hasAdblock', 'clearAllBanners', 'getUser', 'showAuthPrompt', 'getXsollaUserToken', 'showAccountLinkPrompt', 'clear'].includes(name)) return 0;
  if ((module === 'data' && name === 'setItem') || (module === 'ad' && name === 'requestAd') || (module === 'analytics' && name === 'trackOrder') || (module === 'store' && name === 'consumeItem')) return 2;
  return 1;
}

test('具名属性读取实际平台值，释放后不能读取或开始新 SDK 操作', { skip }, () => {
  const { sdk, api, close } = fixture();
  assert.equal(api.environment, sdk.environment);
  assert.equal(api.isQaTool, sdk.isQaTool);
  assert.equal(api.game.link, sdk.game.link);
  assert.equal(api.game.id, sdk.game.id);
  assert.equal(api.game.settings, sdk.game.settings);
  assert.equal(api.game.isInstantMultiplayer, sdk.game.isInstantMultiplayer);
  assert.equal(api.game.isOfflineMode, sdk.game.isOfflineMode);
  assert.equal(api.game.inviteParams, sdk.game.inviteParams);
  assert.equal(api.user.isUserAccountAvailable, true);
  close();
  assert.throws(() => api.game.gameplayStart(), /释放/);
  assert.throws(() => api.environment, /释放/);
  assert.throws(() => api.store.buyItem('sku'), /释放/);
});

test('激励广告仅以首次真实完成发奖，重复、禁用和失败不产生错误奖励', { skip }, async () => {
  const { sdk, api, close } = fixture();
  let callbacks;
  let starts = 0;
  sdk.ad.requestAd = (type, value) => { assert.equal(type, 'rewarded'); callbacks = value; };
  const pending = api.ad.showRewardedAd(() => { starts++; });
  assert.deepEqual(await api.ad.showRewardedAd(), { status: 'error', error: { code: 'requestInProgress', message: '激励广告请求尚未结束' } });
  callbacks.adStarted();
  close();
  callbacks.adFinished();
  callbacks.adError({ code: 'other', message: '迟到' });
  assert.deepEqual(await pending, { status: 'completed' });
  assert.equal(starts, 1);

  const second = fixture();
  second.sdk.ad.requestAd = (_type, value) => { value.adError({ code: 'adsDisabled', message: 'disabled' }); value.adFinished(); };
  assert.deepEqual(await second.api.ad.showRewardedAd(), { status: 'unsupported', error: { code: 'adsDisabled', message: 'disabled' } });
  second.sdk.ad.requestAd = (_type, value) => value.adError({ code: 'unfilled', message: 'empty' });
  assert.deepEqual(await second.api.ad.showRewardedAd(), { status: 'error', error: { code: 'unfilled', message: 'empty' } });
  second.sdk.ad.requestAd = () => { throw new Error('request failed'); };
  assert.equal((await second.api.ad.showRewardedAd()).status, 'error');
  const failure = new Error('暂停回调异常');
  second.sdk.ad.requestAd = (_type, value) => { value.adStarted(); value.adStarted(); value.adFinished(); };
  assert.deepEqual(await second.api.ad.showRewardedAd(() => { throw failure; }), { status: 'completed', onStartedError: failure });
});

test('登录明确区分游客、平台不可用、缺少凭证和已获取服务端 token', { skip }, async () => {
  const { sdk, api, close } = fixture();
  const user = { username: 'user', profilePictureUrl: 'image' };
  sdk.user.isUserAccountAvailable = false;
  assert.deepEqual(await api.user.login(), { status: 'unavailable' });
  sdk.user.isUserAccountAvailable = true;
  let currentUser = null;
  sdk.user.getUser = async () => currentUser;
  sdk.user.showAuthPrompt = async () => { currentUser = user; return user; };
  sdk.user.getUserToken = async () => null;
  assert.deepEqual(await api.user.login(), { status: 'guest' });
  assert.deepEqual(await api.user.login({ promptIfNeeded: true }), { status: 'credential_unavailable', user });
  let received;
  sdk.user.getUserToken = async (options) => { received = options; return 'token'; };
  const tokenOptions = { signingKeyType: 'IN_GAME_AUTH' };
  assert.deepEqual(await api.user.login({ promptIfNeeded: true, tokenOptions }), { status: 'token_acquired', user, token: 'token' });
  assert.equal(received, tokenOptions);
  sdk.user.getUserToken = async () => { close(); return 'old-token'; };
  await assert.rejects(api.user.login({ promptIfNeeded: true }), /释放/);
});

test('登录期间切换账号不组合旧用户和新凭证，并在成功、失败及释放时注销原监听', { skip }, async () => {
  const { sdk, api, close } = fixture();
  const user = { username: 'first', profilePictureUrl: 'first-image' };
  const changed = { username: 'second', profilePictureUrl: 'second-image' };
  const listeners = new Set();
  let added;
  let removed;
  sdk.user.addAuthListener = (listener) => { added = listener; listeners.add(listener); };
  sdk.user.removeAuthListener = (listener) => { removed = listener; listeners.delete(listener); };
  sdk.user.getUser = async () => user;
  let completeToken;
  sdk.user.getUserToken = () => new Promise((resolve) => { completeToken = resolve; });
  const pending = api.user.login();
  await Promise.resolve();
  assert.equal(typeof completeToken, 'function');
  for (const listener of listeners) listener(changed);
  completeToken('new-user-token');
  assert.deepEqual(await pending, { status: 'auth_changed' });
  assert.equal(removed, added);
  assert.equal(listeners.size, 0);

  sdk.user.getUserToken = async () => 'token';
  assert.deepEqual(await api.user.login(), { status: 'token_acquired', user, token: 'token' });
  assert.equal(removed, added);
  assert.equal(listeners.size, 0);
  sdk.user.getUserToken = async () => { throw new Error('获取失败'); };
  await assert.rejects(api.user.login(), /获取失败/);
  assert.equal(removed, added);
  assert.equal(listeners.size, 0);
  sdk.user.getUserToken = async () => { close(); return 'expired'; };
  await assert.rejects(api.user.login(), /释放/);
  assert.equal(removed, added);
  assert.equal(listeners.size, 0);
});

test('主动登录弹窗的身份变更完成后重读用户，再取得相同身份的凭证', { skip }, async () => {
  const { sdk, api } = fixture();
  const user = { username: 'user', profilePictureUrl: 'image' };
  let current = null;
  let listener;
  let reads = 0;
  sdk.user.addAuthListener = (value) => { listener = value; };
  sdk.user.removeAuthListener = (value) => { assert.equal(value, listener); };
  sdk.user.getUser = async () => { reads++; return current; };
  sdk.user.showAuthPrompt = async () => { current = user; listener(user); return user; };
  sdk.user.getUserToken = async () => 'token';
  assert.deepEqual(await api.user.login({ promptIfNeeded: true }), { status: 'token_acquired', user, token: 'token' });
  assert.equal(reads, 2);
});

test('支付成功保留服务端验证要求，失败保持平台错误，释放不会丢失已受理订单', { skip }, async () => {
  const { sdk, api, close } = fixture();
  let finish;
  sdk.store.buyItem = (itemId) => new Promise((resolve) => { assert.equal(itemId, 'sku'); finish = resolve; });
  const pending = api.store.purchase('sku');
  close();
  finish({ itemId: 'sku' });
  assert.deepEqual(await pending, { status: 'payment_completed', requiresVerification: true, result: { itemId: 'sku' } });
  const second = fixture();
  const error = { code: 'purchaseCancelled', message: 'cancelled' };
  second.sdk.store.buyItem = async () => { throw error; };
  await assert.rejects(second.api.store.purchase('sku'), (actual) => actual === error);
});
