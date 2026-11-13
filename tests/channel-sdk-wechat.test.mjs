/** 验证微信渠道具名接口及业务结果，不加载真实宿主或发送商业请求。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { generateWechatBindings } from '../skills/app-release/scripts/generate-wechat-bindings.mjs';

const source = fileURLToPath(new URL('../skills/app-release/assets/channel-sdks/typescript/wechat/', import.meta.url));
const manifest = JSON.parse(readFileSync(join(source, 'surface.json'), 'utf8'));

/** 只使用现有 TypeScript 编译器，不在测试中安装工具或修改依赖。 */
function findCompiler() {
  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    const script = process.platform === 'win32' ? join(entry, 'node_modules/typescript/bin/tsc') : join(entry, 'tsc');
    if (existsSync(script)) return realpathSync(script);
  }
  return undefined;
}

const compiler = findCompiler();
const skip = compiler ? false : '缺少 TypeScript，微信渠道实现尚未验证';
let temp;
let WechatApi;
let generated;

before(() => {
  if (!compiler) return;
  temp = mkdtempSync(join(tmpdir(), 'channel-wechat-named-'));
  writeFileSync(join(temp, 'package.json'), '{"type":"commonjs"}');
  const files = readdirSync(source).filter((name) => name.endsWith('.ts')).map((name) => join(source, name));
  const result = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2020', '--module', 'commonjs', '--rootDir', source, '--outDir', temp, ...files], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const load = createRequire(join(temp, 'package.json'));
  ({ WechatApi } = load('./api.js'));
  generated = load('./platform.generated.js');
});

after(() => {
  if (!temp) return;
  const actual = realpathSync(temp);
  assert.equal(dirname(actual), realpathSync(tmpdir()));
  assert.ok(basename(actual).startsWith('channel-wechat-named-'));
  rmSync(actual, { recursive: true, force: true });
});

test('渠道快照可重复生成，专属根方法均直接调用实际同名 SDK 方法', { skip }, () => {
  assert.equal(generateWechatBindings({ check: true }).Runtime, manifest.included.length);
  let ready = true;
  const calls = [];
  const returned = {};
  const sdk = Object.fromEntries(manifest.included.map(({ name }) => [name, function(...args) { assert.equal(this, sdk); calls.push({ name, args }); return returned; }]));
  const api = new WechatApi(sdk, () => { if (!ready) throw new Error('released'); });
  for (const { name } of manifest.included) {
    const argument = { marker: name };
    const callback = () => {};
    assert.equal(typeof api[name], 'function', name);
    api[name](argument, callback);
    assert.equal(calls.at(-1).name, name);
    assert.deepEqual(calls.at(-1).args, [argument, callback]);
  }
  for (const name of ['call', 'get', 'handle', 'request', 'downloadFile', 'createInnerAudioContext', 'createCanvas', 'getSharedCanvas', 'getGameLogManager', 'getMiniReportManager', 'getScenePerformanceManager', 'onTouchStart', 'getSystemInfoSync', 'cloud']) assert.equal(name in api, false, name);
  ready = false;
  for (const { name } of manifest.included) assert.throws(() => api[name](), /released/);
});

test('广告、平台按钮和开放数据对象逐项具名封装，保留接收者和回调身份', { skip }, () => {
  for (const [name, methods] of Object.entries(manifest.objectMethods)) {
    if (name === 'Runtime') continue;
    const calls = [];
    const expected = Promise.resolve('platform-result');
    const sdk = Object.fromEntries(methods.map((method) => [method, function(...args) { assert.equal(this, sdk); calls.push([method, args]); return expected; }]));
    const api = new generated[`Wechat${name}Api`](sdk, () => {});
    for (const method of methods) {
      const callback = () => {};
      assert.equal(api[method](callback), expected);
      assert.deepEqual(calls.at(-1), [method, [callback]]);
    }
    if (name === 'OpenDataContext') assert.equal('canvas' in api, false, '开放数据仅提供渠道通信，不包装基础渲染');
  }
});

test('登录只返回临时 code，失败、空 code 和同步异常不冒充认证成功', { skip }, async () => {
  for (const [action, status] of [
    [(options) => options.success({ code: 'temporary-code' }), 'code_acquired'],
    [(options) => options.success({ code: '' }), 'error'],
    [(options) => options.fail({ errMsg: 'login:fail' }), 'error'],
    [() => { throw new Error('host-error'); }, 'error'],
  ]) {
    const api = new WechatApi({ login: action }, () => {});
    const result = await api.loginCredential(500);
    assert.equal(result.status, status);
    if (status === 'code_acquired') assert.equal(result.code, 'temporary-code');
  }
});

/** 创建可控激励广告，保存原始监听以复现关闭、错误和重复通知。 */
function rewardedFixture() {
  let close;
  let error;
  let destroyed = 0;
  let shown = 0;
  let ready = true;
  const ad = {
    onClose(callback) { close = callback; }, offClose(callback) { assert.equal(callback, close); },
    onError(callback) { error = callback; }, offError(callback) { assert.equal(callback, error); },
    load: () => Promise.resolve(), show: () => { shown++; return Promise.resolve(); }, destroy: () => { destroyed++; },
  };
  const api = new WechatApi({ createRewardedVideoAd: () => ad }, () => { if (!ready) throw new Error('released'); });
  return { api, ad, close: (value) => close(value), error: (value) => error(value), release: () => { ready = false; }, get destroyed() { return destroyed; }, get shown() { return shown; } };
}

test('激励完成、提前关闭、未知关闭与错误分别结算，重复回调只清理一次', { skip }, async () => {
  for (const [result, expected] of [[{ isEnded: true }, 'completed'], [{ isEnded: false }, 'dismissed'], [undefined, 'error']]) {
    const fixture = rewardedFixture();
    const pending = fixture.api.showRewardedAd({ adUnitId: 'test-only' });
    assert.equal((await fixture.api.showRewardedAd({ adUnitId: 'test-only' })).status, 'error');
    await Promise.resolve();
    fixture.close(result);
    fixture.close({ isEnded: true });
    fixture.error({ errCode: 1004 });
    assert.equal((await pending).status, expected);
    assert.equal(fixture.destroyed, 1);
  }
  const fixture = rewardedFixture();
  const pending = fixture.api.showRewardedAd({ adUnitId: 'test-only' });
  fixture.error({ errCode: 1004 });
  fixture.close({ isEnded: true });
  assert.equal((await pending).status, 'error');
});

test('释放后不开始新的展示，但已经受理广告的可信迟到完成仍能结算', { skip }, async () => {
  const beforeShow = rewardedFixture();
  const pending = beforeShow.api.showRewardedAd({ adUnitId: 'test-only' });
  beforeShow.release();
  assert.equal((await pending).status, 'error');
  assert.equal(beforeShow.shown, 0);
  const accepted = rewardedFixture();
  const acceptedResult = accepted.api.showRewardedAd({ adUnitId: 'test-only' });
  await Promise.resolve();
  accepted.release();
  accepted.close({ isEnded: true });
  assert.equal((await acceptedResult).status, 'completed');
  assert.equal(accepted.destroyed, 1);
});

test('签名支付原串不变，客户端成功明确要求后端验证，失败不发货', { skip }, async () => {
  const signData = '{ "order": "server-signed", "amount": 1 }';
  let pending;
  const api = new WechatApi({ requestMidasPaymentGameItem(options) { assert.equal(options.signData, signData); pending = options; } }, () => {});
  const operation = api.payGameItem({ signData, paySig: 'test-signature', signature: 'test-session-signature' });
  pending.success({ errMsg: 'ok' });
  pending.fail({ errCode: 1 });
  assert.deepEqual(await operation, { status: 'client_completed', requiresVerification: true, receipt: { errMsg: 'ok' } });
  const cancelled = api.payGameItem({ signData, paySig: 'test-signature', signature: 'test-session-signature' });
  pending.fail({ errCode: 1 });
  assert.equal((await cancelled).status, 'cancelled');
  assert.equal((await api.payGameItem({ signData: {}, paySig: '', signature: '' })).status, 'error');
});

test('虚拟支付具体方法保留参数与回调；宿主缺失时明确不支持', { skip }, async () => {
  let options;
  const api = new WechatApi({ requestVirtualPayment(value) { options = value; } }, () => {});
  const request = { mode: 'project-approved-mode', paySig: 'test', signature: 'test', signData: '{ "signed": true }' };
  const callback = () => {};
  api.requestVirtualPayment({ ...request, success: callback });
  assert.equal(options.success, callback);
  const pending = api.payVirtual(request);
  assert.equal(options.signData, request.signData);
  options.success({ errMsg: 'ok' });
  assert.equal((await pending).requiresVerification, true);
  assert.equal((await new WechatApi({}, () => {}).payVirtual(request)).status, 'unsupported');
});
