import { createHmac, timingSafeEqual } from 'node:crypto';

/** 表示不含敏感请求内容的 TapTap 回调校验失败。 */
export class TapTapVerificationError extends Error {
  /** 创建可安全记录的错误分类。 */
  constructor(code) { super(`TapTap 请求校验失败：${code}`); this.name = 'TapTapVerificationError'; this.code = code; }
}

/** 只读取原始报头，拒绝折叠后的重复字段，避免验签和业务读取不同内容。 */
function tapHeaders(rawHeaders) {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) throw new TapTapVerificationError('headers');
  const headers = new Map();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i];
    const value = rawHeaders[i + 1];
    if (typeof name !== 'string' || typeof value !== 'string') throw new TapTapVerificationError('headers');
    const key = name.toLowerCase();
    if (!key.startsWith('x-tap-')) continue;
    if (!/^x-tap-[a-z0-9-]+$/.test(key) || /[\r\n]/.test(value) || headers.has(key)) throw new TapTapVerificationError('headers');
    headers.set(key, value);
  }
  return headers;
}

/** 校验签名输入为网关收到的原始路径、报头和未解析的请求体。 */
function validateRawRequest(request) {
  if (!request || !['GET', 'POST'].includes(request.method) || typeof request.rawPath !== 'string' || !request.rawPath.startsWith('/') || request.rawPath.startsWith('//') || /[\r\n#]/.test(request.rawPath) || !Buffer.isBuffer(request.rawBody)) throw new TapTapVerificationError('request');
  return tapHeaders(request.rawHeaders);
}

/** 按官方 S2S 公共协议对请求原始字节签名；不适用于小游戏支付协议。 */
export function signTapRequest(request, serverSecret) {
  if (typeof serverSecret !== 'string' || !serverSecret) throw new TapTapVerificationError('secret');
  const headers = validateRawRequest(request);
  const headerPart = [...headers.entries()].filter(([key]) => key !== 'x-tap-sign').sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}:${value}`).join('\n');
  const hmac = createHmac('sha256', serverSecret);
  // 不能重新序列化 JSON 或重新排列 Query，否则会改变平台计算签名的原始字节。
  hmac.update(`${request.method}\n${request.rawPath}\n${headerPart}\n`, 'utf8');
  hmac.update(request.rawBody);
  hmac.update('\n');
  return hmac.digest('base64');
}

/** 校验签名、时间窗口和路由；幂等与防重放存储由业务事务承担。 */
export function verifyTapRequest(request, { serverSecret, expectedPath, nowSeconds, maxAgeSeconds }) {
  if (typeof expectedPath !== 'string' || !expectedPath.startsWith('/') || expectedPath.includes('?') || !Number.isSafeInteger(nowSeconds) || !Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 0) throw new TapTapVerificationError('configuration');
  const headers = validateRawRequest(request);
  if (request.rawPath.split('?', 1)[0] !== expectedPath) throw new TapTapVerificationError('path');
  const timestamp = headers.get('x-tap-ts');
  const nonce = headers.get('x-tap-nonce');
  const signature = headers.get('x-tap-sign');
  if (!timestamp || !/^\d{1,15}$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) || !nonce || nonce.length !== 8 || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) throw new TapTapVerificationError('headers');
  if (Math.abs(nowSeconds - Number(timestamp)) > maxAgeSeconds) throw new TapTapVerificationError('time');
  const expected = Buffer.from(signTapRequest(request, serverSecret), 'base64');
  const received = Buffer.from(signature, 'base64');
  if (received.length !== expected.length || received.toString('base64') !== signature || !timingSafeEqual(expected, received)) throw new TapTapVerificationError('signature');
  return true;
}

/** 取唯一 client_id；重复 Query 字段不得让验签与业务身份产生分歧。 */
export function getTapQueryClientId(rawPath) {
  const query = rawPath.indexOf('?');
  const params = new URLSearchParams(query < 0 ? '' : rawPath.slice(query + 1));
  const ids = params.getAll('client_id');
  if (ids.length > 1) throw new TapTapVerificationError('client');
  return ids[0];
}
