import { createDecipheriv, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { TapTapVerificationError } from './signature.mjs';

/** 小游戏发货事件名称由平台指定，不能作为通用 S2S 回调处理。 */
const DELIVERY_EVENT = 'minigame_game_pay_goods_deliver_notify';

/** 以固定分类拒绝请求，避免泄漏签名、密钥和原始消息。 */
function reject(code) { throw new TapTapVerificationError(code); }

/** 比较固定长度的规范十六进制摘要。 */
function sameHex(actual, expected) {
  if (typeof actual !== 'string' || !/^[0-9a-f]+$/.test(actual) || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

/** 解析单值 Query，阻止重复参数在网关和业务间产生歧义。 */
function single(params, key, required = true) {
  const values = params.getAll(key);
  if (values.length > 1 || (required && (values.length !== 1 || !values[0]))) reject('payment-query');
  return values[0];
}

/** 先校验 URL 签名与时间窗口，再解析或解密消息。 */
function verifyTransport(request, options, method) {
  if (!request || request.method !== method || typeof request.rawPath !== 'string' || !request.rawPath.startsWith('/') || request.rawPath.startsWith('//') || /[\r\n#]/.test(request.rawPath) || !Buffer.isBuffer(request.rawBody)) reject('payment-request');
  if (!options || typeof options.token !== 'string' || options.token.length !== 32 || typeof options.clientId !== 'string' || !options.clientId || typeof options.expectedPath !== 'string' || !options.expectedPath.startsWith('/') || options.expectedPath.includes('?') || !Number.isSafeInteger(options.nowSeconds) || !Number.isSafeInteger(options.maxAgeSeconds) || options.maxAgeSeconds < 0) reject('payment-configuration');
  if (request.rawPath.split('?', 1)[0] !== options.expectedPath) reject('payment-path');
  const queryAt = request.rawPath.indexOf('?');
  const params = new URLSearchParams(queryAt < 0 ? '' : request.rawPath.slice(queryAt + 1));
  const timestamp = single(params, 'timestamp');
  const nonce = single(params, 'nonce');
  const signature = single(params, 'signature');
  if (!/^\d{1,15}$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) || Math.abs(options.nowSeconds - Number(timestamp)) > options.maxAgeSeconds) reject('payment-time');
  const expected = createHash('sha1').update([options.token, timestamp, nonce].sort().join(''), 'utf8').digest('hex');
  if (!sameHex(signature, expected)) reject('payment-signature');
  return { params, timestamp, nonce };
}

/** 解析仅来自已认证请求的 UTF-8 JSON，失败不返回原始消息。 */
function parseJson(raw) {
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { reject('payment-body'); }
}

/** 校验安全模式密文签名并解密，严格检查填充、长度和应用身份。 */
function decryptMessage(encrypted, signature, timestamp, nonce, options) {
  if (typeof encrypted !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(encrypted) || !/^[A-Za-z0-9]{43}$/.test(options.encodingAesKey ?? '')) reject('payment-encryption-config');
  const messageSignature = createHash('sha1').update([options.token, timestamp, nonce, encrypted].sort().join(''), 'utf8').digest('hex');
  if (!sameHex(signature, messageSignature)) reject('payment-message-signature');
  try {
    const key = Buffer.from(`${options.encodingAesKey}=`, 'base64');
    const ciphertext = Buffer.from(encrypted, 'base64');
    if (key.length !== 32 || key.toString('base64').slice(0, -1) !== options.encodingAesKey || ciphertext.length === 0 || ciphertext.length % 16 !== 0 || ciphertext.toString('base64') !== encrypted) throw new Error();
    // CBC 的 IV 只影响首块；平台首块恰为丢弃的 16 字节随机数，不影响后续长度、正文和应用身份。
    const decipher = createDecipheriv('aes-256-cbc', key, Buffer.alloc(16));
    decipher.setAutoPadding(false);
    const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const pad = padded[padded.length - 1];
    if (!pad || pad > 32 || pad > padded.length || !padded.subarray(padded.length - pad).every((v) => v === pad)) throw new Error();
    const full = padded.subarray(0, padded.length - pad);
    if (full.length < 20) throw new Error();
    const size = full.readUInt32BE(16);
    if (size > full.length - 20) throw new Error();
    const suffix = new TextDecoder('utf-8', { fatal: true }).decode(full.subarray(20 + size));
    if (suffix !== options.clientId) throw new Error();
    return full.subarray(20, 20 + size);
  } catch { reject('payment-decrypt'); }
}

/** 验证平台 GET 接入探测并返回必须原样回复的 echostr。 */
export function verifyMiniappPaymentProbe(request, options) {
  const { params } = verifyTransport(request, options, 'GET');
  return single(params, 'echostr');
}

/** 验证小游戏发货通知的传输、应用、环境和原始 Payload 事件签名。 */
export function parseMiniappPaymentDelivery(request, options) {
  const { params, timestamp, nonce } = verifyTransport(request, options, 'POST');
  if (!['plaintext', 'aes'].includes(options.mode) || ![0, 1].includes(options.env) || typeof options.paymentKey !== 'string' || !options.paymentKey) reject('payment-configuration');
  const encryptType = single(params, 'encrypt_type', false);
  const msgSignature = single(params, 'msg_signature', false);
  let envelope = parseJson(request.rawBody);
  if (options.mode === 'aes') {
    if (encryptType !== 'aes' || !msgSignature || envelope.ToUserName !== options.clientId) reject('payment-encryption');
    envelope = parseJson(decryptMessage(envelope.Encrypt, msgSignature, timestamp, nonce, options));
  } else if (encryptType !== undefined || msgSignature !== undefined || envelope.Encrypt !== undefined) reject('payment-encryption');
  if (envelope.ToUserName !== options.clientId || envelope.FromUserName !== 'TapTap' || envelope.MsgType !== 'event' || envelope.Event !== DELIVERY_EVENT || !Number.isSafeInteger(envelope.CreateTime) || !envelope.MiniGame || typeof envelope.MiniGame !== 'object' || typeof envelope.MiniGame.Payload !== 'string' || typeof envelope.MiniGame.IsMock !== 'boolean') reject('payment-envelope');
  // 事件签名覆盖 Payload 原字符串，不能先解析再序列化后验签。
  const expected = createHmac('sha256', options.paymentKey).update(`${DELIVERY_EVENT}&${envelope.MiniGame.Payload}`, 'utf8').digest('hex');
  if (!sameHex(envelope.MiniGame.PayEventSig, expected)) reject('payment-event-signature');
  const payload = parseJson(Buffer.from(envelope.MiniGame.Payload, 'utf8'));
  const goods = payload.GoodsInfo;
  if (payload.Env !== options.env || typeof payload.OpenId !== 'string' || !payload.OpenId || typeof payload.OutTradeNo !== 'string' || !payload.OutTradeNo || !goods || typeof goods !== 'object' || typeof goods.ProductId !== 'string' || !goods.ProductId || !Number.isSafeInteger(goods.Quantity) || goods.Quantity <= 0 || !Number.isSafeInteger(goods.OrigPrice) || goods.OrigPrice < 0 || !Number.isSafeInteger(goods.ActualPrice) || goods.ActualPrice < 0 || goods.OrderSource !== 1 || (goods.Attach !== undefined && typeof goods.Attach !== 'string')) reject('payment-payload');
  return { clientId: options.clientId, env: payload.Env, openid: payload.OpenId, orderId: payload.OutTradeNo, productId: goods.ProductId, quantity: goods.Quantity, originalPrice: goods.OrigPrice, actualPrice: goods.ActualPrice, isMock: envelope.MiniGame.IsMock, ...(goods.Attach === undefined ? {} : { attach: goods.Attach }) };
}

/** 仅在业务的可信订单明确已支付且所有身份和商品金额一致时允许进入幂等发货事务。 */
export function assertMiniappDeliveryMatchesOrder(event, order) {
  if (!event || !order || event.isMock !== false || order.paid !== true || !['clientId', 'openid', 'orderId', 'productId'].every((key) => typeof order[key] === 'string' && order[key] && order[key] === event[key]) || ![0, 1].includes(order.env) || order.env !== event.env || !Number.isSafeInteger(order.quantity) || order.quantity <= 0 || order.quantity !== event.quantity || !Number.isSafeInteger(order.originalPrice) || order.originalPrice < 0 || order.originalPrice !== event.originalPrice || !Number.isSafeInteger(order.actualPrice) || order.actualPrice < 0 || order.actualPrice !== event.actualPrice) reject('payment-order');
  return true;
}
