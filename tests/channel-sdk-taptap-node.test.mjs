/** 离线验证 TapTap 服务端协议，不访问平台或启动监听服务。 */
import assert from 'node:assert/strict';
import { createCipheriv, createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import {
  TapTapMiniappClient, TapTapMiniappError, TapTapVerificationError,
  parseDirectGiftCallback, parseDirectGiftRoleListRequest, parseDirectGiftServerListRequest,
  parseReservePhoneCallback, parseRoleBindingCallback, signGameItemPayment, signTapRequest, verifyTapRequest,
  assertMiniappDeliveryMatchesOrder, parseMiniappPaymentDelivery, signTapUserData, verifyMiniappPaymentProbe,
} from '../skills/app-release/assets/channel-sdks/nodejs/taptap/index.mjs';

const secret = '12345678901234567890123456789012';
const now = 1760000000;
const clientId = 'project-client';

/** 生成只用于本地测试的原始请求，保留字节与重复报头。 */
function signedRequest({ method = 'POST', rawPath = '/callback', body = '{}', rawBody = Buffer.from(body) } = {}) {
  const request = { method, rawPath, rawHeaders: ['X-Tap-Ts', String(now), 'X-Tap-Nonce', '12345678'], rawBody };
  request.rawHeaders.push('X-Tap-Sign', signTapRequest(request, secret));
  return request;
}

/** 使用测试时钟和显式应用、路由构造验签约束。 */
function options(expectedPath = '/callback') { return { serverSecret: secret, expectedPath, nowSeconds: now, maxAgeSeconds: 60, clientId }; }

/** 生成独立于被测解密实现的 AES-GCM 测试密文。 */
function phoneCipher(phone) {
  const nonce = Buffer.alloc(12, 3);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(secret), nonce);
  const ciphertext = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]).toString('base64url');
}

/** 构造可控 HTTP 响应，不泄露秘密到异常或日志。 */
function response(value, overrides = {}) { return { ok: true, status: 200, redirected: false, json: async () => value, ...overrides }; }

test('公共签名严格使用原始路径、排序报头和原始请求体字节', () => {
  const rawBody = Buffer.from('{ "名称": "内容" }');
  const req = { method: 'POST', rawPath: '/p?b=2&a=%2F', rawHeaders: ['X-Tap-Ts', String(now), 'x-Tap-Nonce', '12345678', 'Content-Type', 'application/json'], rawBody };
  const expected = createHmac('sha256', secret).update(`POST\n/p?b=2&a=%2F\nx-tap-nonce:12345678\nx-tap-ts:${now}\n`).update(rawBody).update('\n').digest('base64');
  assert.equal(signTapRequest(req, secret), expected);
  req.rawHeaders.push('x-tap-sign', expected);
  assert.equal(verifyTapRequest(req, { ...options('/p') }), true);
  assert.throws(() => verifyTapRequest({ ...req, rawPath: '/p?a=%2F&b=2' }, options('/p')), TapTapVerificationError);
  assert.throws(() => verifyTapRequest({ ...req, rawBody: Buffer.from('{"名称":"内容"}') }, options('/p')), /signature/);
  assert.throws(() => verifyTapRequest(req, options('/other')), /path/);
  assert.throws(() => verifyTapRequest(req, { ...options('/p'), nowSeconds: now + 61 }), /time/);
  assert.throws(() => verifyTapRequest(req, { ...options('/p'), nowSeconds: now - 61 }), /time/);
});

test('签名报头重复、缺失、篡改、无效编码或配置不合法时拒绝', () => {
  const request = signedRequest();
  const altered = [...request.rawHeaders]; altered[5] = `${altered[5].slice(0, -2)}AA`;
  assert.throws(() => verifyTapRequest({ ...request, rawHeaders: altered }, options()), TapTapVerificationError);
  assert.throws(() => verifyTapRequest({ ...request, rawHeaders: [...request.rawHeaders, 'x-TAP-ts', String(now)] }, options()), /headers/);
  assert.throws(() => verifyTapRequest({ ...request, rawHeaders: request.rawHeaders.slice(0, 4) }, options()), /headers/);
  assert.throws(() => verifyTapRequest(request, { ...options(), maxAgeSeconds: -1 }), /configuration/);
  assert.throws(() => verifyTapRequest({ ...request, rawBody: '{}' }, options()), /request/);
  assert.throws(() => signTapRequest(request, ''), /secret/);
});

test('预约手机号先验签再解密，拒绝篡改，取消与测试事件不会包含手机号', () => {
  const body = { event_id: 'evt-1', event_type: 'authorize', client_id: clientId, openid: 'user', unionid: 'union', reserve_type: 'android', time: now, encrypted_phone: phoneCipher('13800138000') };
  const req = signedRequest({ body: JSON.stringify(body) });
  assert.deepEqual(parseReservePhoneCallback(req, options()), { kind: 'authorize', eventId: 'evt-1', openid: 'user', unionid: 'union', reserveType: 'android', time: now, phone: '13800138000' });
  assert.throws(() => parseReservePhoneCallback({ ...req, rawBody: Buffer.from(JSON.stringify({ ...body, event_id: 'evt-2' })) }, options()), /signature/);
  assert.throws(() => parseReservePhoneCallback(signedRequest({ body: JSON.stringify({ ...body, client_id: 'other' }) }), options()), /client/);
  const broken = Buffer.from(body.encrypted_phone, 'base64url'); broken[broken.length - 1] ^= 1;
  assert.throws(() => parseReservePhoneCallback(signedRequest({ body: JSON.stringify({ ...body, encrypted_phone: broken.toString('base64url') }) }), options()), /decrypt/);
  const cancel = parseReservePhoneCallback(signedRequest({ body: JSON.stringify({ ...body, event_type: 'cancel' }) }), options());
  assert.equal(cancel.kind, 'cancel'); assert.equal('phone' in cancel, false);
  assert.deepEqual(parseReservePhoneCallback(signedRequest({ body: JSON.stringify({ event_id: 'test', event_type: 'test', client_id: clientId }) }), options()), { kind: 'test', eventId: 'test' });
});

test('角色绑定和直达礼包要求正确身份、路由及业务字段', () => {
  const rawPath = `/callback?client_id=${clientId}`;
  const role = signedRequest({ rawPath, body: JSON.stringify({ role_id: 'role-1', bind: false }) });
  assert.deepEqual(parseRoleBindingCallback(role, options()), { roleId: 'role-1', bind: false });
  const gift = signedRequest({ rawPath, body: JSON.stringify({ openid: 'open', unionid: 'union', server: '1', role_id: 'role-1', gift_code: 'gift' }) });
  assert.deepEqual(parseDirectGiftCallback(gift, options()), { openid: 'open', unionid: 'union', server: '1', roleId: 'role-1', giftCode: 'gift' });
  assert.deepEqual(parseDirectGiftCallback(signedRequest({ rawPath, body: JSON.stringify({ openid: 'open', unionid: 'union', role_id: 'role-1', gift_code: 'gift' }) }), options()), { openid: 'open', unionid: 'union', roleId: 'role-1', giftCode: 'gift' });
  assert.throws(() => parseDirectGiftCallback(gift, { ...options(), clientId: 'other' }), /client/);
  assert.throws(() => parseRoleBindingCallback(signedRequest({ rawPath: `${rawPath}&client_id=${clientId}`, body: JSON.stringify({ role_id: '1', bind: true }) }), options()), /client/);
  assert.throws(() => parseRoleBindingCallback(signedRequest({ rawPath, body: JSON.stringify({ role_id: '1', bind: 'false' }) }), options()), /body/);
  const list = signedRequest({ method: 'GET', rawPath: `${rawPath}&openid=open&unionid=union&from=0&limit=10`, body: '' });
  assert.deepEqual(parseDirectGiftServerListRequest(list, options()), { openid: 'open', unionid: 'union', from: 0, limit: 10 });
  const roles = signedRequest({ method: 'GET', rawPath: `${rawPath}&openid=open&unionid=union&server_id=s`, body: '' });
  assert.deepEqual(parseDirectGiftRoleListRequest(roles, options()), { openid: 'open', unionid: 'union', serverId: 's' });
  assert.throws(() => parseDirectGiftRoleListRequest(signedRequest({ method: 'GET', rawPath: `${rawPath}&openid=a&openid=b&unionid=u`, body: '' }), options()), /body/);
});

test('用户态签名保留请求原文，登录态校验接受空响应并拒绝平台错误', async () => {
  const raw = '{ "商品": 1 }';
  const userSignature = signTapUserData(raw, 'session-secret');
  assert.equal(userSignature, createHmac('sha256', 'session-secret').update(raw).digest('hex'));
  assert.notEqual(userSignature, signTapUserData('{"商品":1}', 'session-secret'));
  assert.equal(signTapUserData('', 'session-secret'), createHmac('sha256', 'session-secret').update('').digest('hex'));
  let observed;
  const client = new TapTapMiniappClient({ appId: 'app', secret: 'secret', region: 'cn', fetchImpl: async (url, init) => { observed = { url: new URL(url), init }; return response({}, { text: async () => '' }); } });
  assert.equal(await client.checkSessionKey({ openid: 'player', accessToken: 'token', signature: userSignature }), true);
  assert.equal(observed.url.pathname, '/auth/v1/checksession');
  assert.equal(observed.url.searchParams.get('signature'), userSignature);
  assert.equal(observed.url.searchParams.get('sig_method'), 'hmac_sha256');
  const bad = new TapTapMiniappClient({ appId: 'app', secret: 'secret', region: 'cn', fetchImpl: async () => response({}, { text: async () => JSON.stringify({ errcode: 1087009, errmsg: 'private' }) }) });
  await assert.rejects(bad.checkSessionKey({ openid: 'player', accessToken: 'token', signature: 'invalid' }), (error) => error.code === 'platform' && error.platformCode === 1087009);
});

const token = '12345678901234567890123456789012';
const paymentKey = 'payment-key';
const paymentNonce = 'nonce-1';
const aesKey = 'A'.repeat(43);
const aesIv = Buffer.alloc(16, 7);
const eventName = 'minigame_game_pay_goods_deliver_notify';

/** 根据平台 URL 合同生成待测试的签名参数。 */
function paymentQuery(extra = {}) {
  const timestamp = String(now);
  const signature = createHash('sha1').update([token, timestamp, paymentNonce].sort().join('')).digest('hex');
  return new URLSearchParams({ signature, timestamp, nonce: paymentNonce, ...extra });
}

/** 生成经过独立 HMAC 的测试发货消息。 */
function deliveryEnvelope(overrides = {}) {
  const payload = JSON.stringify({ OpenId: 'open', Env: 1, OutTradeNo: 'order-1', GoodsInfo: { ProductId: 'sword', Quantity: 2, OrigPrice: 1200, ActualPrice: 1100, OrderSource: 1, Attach: 'extra' }, ...overrides });
  return { ToUserName: clientId, FromUserName: 'TapTap', CreateTime: now, MsgType: 'event', Event: eventName, MiniGame: { Payload: payload, PayEventSig: createHmac('sha256', paymentKey).update(`${eventName}&${payload}`).digest('hex'), IsMock: false } };
}

/** 使用测试密钥生成独立 CBC 密文，模拟 32 字节 PKCS#7 填充。 */
function encryptDelivery(envelope) {
  const body = Buffer.from(JSON.stringify(envelope));
  const size = Buffer.alloc(4); size.writeUInt32BE(body.length);
  const full = Buffer.concat([Buffer.alloc(16, 9), size, body, Buffer.from(clientId)]);
  const pad = 32 - full.length % 32;
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(`${aesKey}=`, 'base64'), aesIv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(Buffer.concat([full, Buffer.alloc(pad, pad)])), cipher.final()]).toString('base64');
}

/** 构造仅用于离线测试的小游戏支付推送。 */
function paymentRequest(method, params, body = '') {
  return { method, rawPath: `/pay?${params.toString()}`, rawHeaders: [], rawBody: Buffer.from(body) };
}

/** 构造显式绑定应用和时间窗口的本地支付测试配置。 */
function paymentOptions(overrides = {}) { return { token, clientId, expectedPath: '/pay', nowSeconds: now, maxAgeSeconds: 60, paymentKey, env: 1, mode: 'plaintext', ...overrides }; }

test('小游戏支付 GET 探测校验签名、时间与唯一参数后原样回显', () => {
  const query = paymentQuery({ echostr: 'echo-中文' });
  const request = paymentRequest('GET', query);
  assert.equal(verifyMiniappPaymentProbe(request, paymentOptions()), 'echo-中文');
  const duplicate = paymentQuery({ echostr: 'echo' }); duplicate.append('nonce', paymentNonce);
  assert.throws(() => verifyMiniappPaymentProbe(paymentRequest('GET', duplicate), paymentOptions()), /payment-query/);
  assert.throws(() => verifyMiniappPaymentProbe(request, paymentOptions({ nowSeconds: now + 61 })), /payment-time/);
  assert.throws(() => verifyMiniappPaymentProbe(request, paymentOptions({ token: 'X'.repeat(32) })), /payment-signature/);
});

test('小游戏明文发货在签名、身份、环境和可信订单全部一致时允许事务处理', () => {
  const request = paymentRequest('POST', paymentQuery(), JSON.stringify(deliveryEnvelope()));
  const event = parseMiniappPaymentDelivery(request, paymentOptions());
  assert.deepEqual(event, { clientId, env: 1, openid: 'open', orderId: 'order-1', productId: 'sword', quantity: 2, originalPrice: 1200, actualPrice: 1100, isMock: false, attach: 'extra' });
  const order = { ...event, paid: true };
  assert.equal(assertMiniappDeliveryMatchesOrder(event, order), true);
  for (const bad of [{ ...order, paid: false }, { ...order, openid: 'other' }, { ...order, quantity: 3 }, { ...order, actualPrice: 100 }, { ...order, productId: 'other' }, { ...order, originalPrice: undefined }, { ...order, orderId: '' }]) assert.throws(() => assertMiniappDeliveryMatchesOrder(event, bad), /payment-order/);
  assert.throws(() => assertMiniappDeliveryMatchesOrder({ ...event, isMock: true }, order), /payment-order/);
  assert.throws(() => parseMiniappPaymentDelivery(request, paymentOptions({ env: 0 })), /payment-payload/);
  assert.throws(() => parseMiniappPaymentDelivery(request, paymentOptions({ paymentKey: 'wrong' })), /payment-event-signature/);
  assert.throws(() => parseMiniappPaymentDelivery(request, paymentOptions({ clientId: 'other' })), /payment-envelope/);
  const tampered = deliveryEnvelope(); tampered.MiniGame.Payload = tampered.MiniGame.Payload.replace('sword', 'other');
  assert.throws(() => parseMiniappPaymentDelivery(paymentRequest('POST', paymentQuery(), JSON.stringify(tampered)), paymentOptions()), /payment-event-signature/);
});

test('AES 发货先验签再解密并校验应用，拒绝密文篡改和明文降级', () => {
  const envelope = deliveryEnvelope();
  const encrypted = encryptDelivery(envelope);
  const messageSignature = createHash('sha1').update([token, String(now), paymentNonce, encrypted].sort().join('')).digest('hex');
  const query = paymentQuery({ encrypt_type: 'aes', msg_signature: messageSignature });
  const request = paymentRequest('POST', query, JSON.stringify({ ToUserName: clientId, Encrypt: encrypted }));
  const aesOptions = paymentOptions({ mode: 'aes', encodingAesKey: aesKey });
  assert.equal(parseMiniappPaymentDelivery(request, aesOptions).orderId, 'order-1');
  assert.throws(() => parseMiniappPaymentDelivery(request, { ...aesOptions, encodingAesKey: undefined }), /payment-encryption-config/);
  assert.throws(() => parseMiniappPaymentDelivery(request, { ...aesOptions, encodingAesKey: 'B'.repeat(43) }), /payment-decrypt/);
  const modified = paymentQuery({ encrypt_type: 'aes', msg_signature: 'a'.repeat(40) });
  assert.throws(() => parseMiniappPaymentDelivery(paymentRequest('POST', modified, request.rawBody.toString()), aesOptions), /payment-message-signature/);
  assert.throws(() => parseMiniappPaymentDelivery(request, paymentOptions()), /payment-encryption/);
  assert.throws(() => parseMiniappPaymentDelivery(paymentRequest('POST', paymentQuery(), JSON.stringify(envelope)), aesOptions), /payment-encryption/);
});

test('小游戏 code2Session 和稳定令牌只使用指定平台，调用可控且不自动重试', async () => {
  const requests = [];
  const client = new TapTapMiniappClient({ appId: 'app', secret: 'private-secret', region: 'global', fetchImpl: async (url, init) => {
    requests.push({ url, init });
    return response(requests.length === 1 ? { openid: 'uid', session_key: 'private-session', unionid: 'union' } : { access_token: 'private-token', expires_in: 7200 });
  } });
  assert.equal(requests.length, 0);
  assert.deepEqual(await client.code2Session('one-time'), { openid: 'uid', sessionKey: 'private-session', unionid: 'union' });
  const url = new URL(requests[0].url);
  assert.equal(url.hostname, 'cloud-miniapp.tapapis.com'); assert.equal(url.searchParams.get('grant_type'), 'authorization_code');
  assert.equal(url.searchParams.get('secret'), 'private-secret'); assert.equal(requests[0].init.redirect, 'error');
  assert.deepEqual(await client.getStableAccessToken(), { accessToken: 'private-token', expiresIn: 7200 });
  assert.equal(JSON.parse(requests[1].init.body).force_refresh, false);
  assert.throws(() => new TapTapMiniappClient({ appId: 'a', secret: 's', region: 'other' }), /configuration/);
});

test('登录失败、超时、重定向及响应错误均脱敏且不重试', async () => {
  let calls = 0;
  const create = (fetchImpl, timeoutMs = 50) => new TapTapMiniappClient({ appId: 'a', secret: 'TOP-SECRET', region: 'cn', fetchImpl, timeoutMs });
  const network = create(async () => { calls++; throw new Error('TOP-SECRET URL'); });
  await assert.rejects(network.code2Session('code'), (error) => error instanceof TapTapMiniappError && error.code === 'network' && !error.message.includes('SECRET'));
  assert.equal(calls, 1);
  await assert.rejects(create(async () => response({ errcode: 1040029, errmsg: 'TOP-SECRET' })).code2Session('c'), (error) => error.code === 'platform' && error.platformCode === 1040029 && !error.message.includes('SECRET'));
  await assert.rejects(create(async () => response({}, { redirected: true })).code2Session('c'), /http/);
  await assert.rejects(create(async () => response({ openid: 'x' })).code2Session('c'), /response/);
  await assert.rejects(create(() => new Promise(() => {}), 10).code2Session('c'), /timeout/);
});

test('小游戏订单和道具支付使用独立签名，订单查询不能自行发货', async () => {
  let request;
  const client = new TapTapMiniappClient({ appId: 'app', secret: 'secret', region: 'cn', fetchImpl: async (url, init) => { request = { url: new URL(url), init }; return response({ errcode: 0, out_trade_no: 'order-1', product_id: 'item-1', pay_state: 2, deliver_state: 1 }); } });
  const result = await client.getOrderDetail({ accessToken: 'token', paymentKey: 'pay-key', openid: 'player', offerId: 'app', outTradeNo: 'order-1', env: 1, timestamp: now });
  assert.deepEqual(result, { orderId: 'order-1', productId: 'item-1', payState: 2, deliverState: 1 });
  const expected = createHmac('sha256', 'pay-key').update(`/order/v1/detail&${request.init.body}`).digest('hex');
  assert.equal(request.url.searchParams.get('pay_sig'), expected);
  assert.equal(JSON.parse(request.init.body).env, 1);
  assert.equal(JSON.parse(request.init.body).biz_id, 2);
  assert.equal(signGameItemPayment('{ "offerId": "app" }', 'pay-key'), createHmac('sha256', 'pay-key').update('requestPaymentGameItem&{ "offerId": "app" }').digest('hex'));
  const wrong = new TapTapMiniappClient({ appId: 'app', secret: 'secret', region: 'cn', fetchImpl: async () => response({ errcode: 0, out_trade_no: 'other', product_id: 'item', pay_state: 2, deliver_state: 1 }) });
  await assert.rejects(wrong.getOrderDetail({ accessToken: 't', paymentKey: 'k', openid: 'p', offerId: 'a', outTradeNo: 'order-1', env: 1, timestamp: now }), /response/);
  const unconfirmed = new TapTapMiniappClient({ appId: 'app', secret: 'secret', region: 'cn', fetchImpl: async () => response({ out_trade_no: 'order-1', product_id: 'item', pay_state: 2, deliver_state: 1 }) });
  await assert.rejects(unconfirmed.getOrderDetail({ accessToken: 't', paymentKey: 'k', openid: 'p', offerId: 'a', outTradeNo: 'order-1', env: 1, timestamp: now }), /response/);
});
