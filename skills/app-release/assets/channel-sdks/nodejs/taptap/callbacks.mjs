import { createDecipheriv } from 'node:crypto';
import { getTapQueryClientId, TapTapVerificationError, verifyTapRequest } from './signature.mjs';

/** 校验公共签名，再核对应用身份；调用方必须提供原子持久化幂等处理。 */
function verifyCallback(request, options, identitySource) {
  if (!options || typeof options.clientId !== 'string' || !options.clientId) throw new TapTapVerificationError('configuration');
  verifyTapRequest(request, options);
  const queryClientId = getTapQueryClientId(request.rawPath);
  if ((identitySource === 'query' && queryClientId !== options.clientId) || (queryClientId !== undefined && queryClientId !== options.clientId)) throw new TapTapVerificationError('client');
}

/** 将经签名验证的原始 JSON 转为普通对象。 */
function parseBody(request) {
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(request.rawBody));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new TapTapVerificationError('body'); }
}

/** 要求字段是非空字符串，避免把缺失字段当成有效业务身份。 */
function requiredString(value) {
  if (typeof value !== 'string' || !value) throw new TapTapVerificationError('body');
  return value;
}

/** 解密已验签的手机号数据，认证标签无效时不返回明文。 */
function decryptPhone(encoded, serverSecret) {
  try {
    const key = Buffer.from(serverSecret, 'utf8');
    if (key.length !== 32 || typeof encoded !== 'string' || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error();
    const bytes = Buffer.from(encoded, 'base64url');
    if (bytes.length <= 28 || bytes.toString('base64url') !== encoded) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(bytes.length - 16));
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]));
  } catch { throw new TapTapVerificationError('decrypt'); }
}

/** 解析预约手机号授权事件；test 只返回测试标记，禁止写入正式业务。 */
export function parseReservePhoneCallback(request, options) {
  if (request.method !== 'POST') throw new TapTapVerificationError('method');
  verifyCallback(request, options, 'body');
  const body = parseBody(request);
  if (body.client_id !== options.clientId) throw new TapTapVerificationError('client');
  const eventId = requiredString(body.event_id);
  if (!['authorize', 'cancel', 'test'].includes(body.event_type)) throw new TapTapVerificationError('body');
  if (body.event_type === 'test') return { kind: 'test', eventId };
  const openid = requiredString(body.openid);
  if (!['android', 'pc'].includes(body.reserve_type) || !Number.isSafeInteger(body.time) || body.time < 0) throw new TapTapVerificationError('body');
  if (body.unionid !== undefined && typeof body.unionid !== 'string') throw new TapTapVerificationError('body');
  const event = { kind: body.event_type, eventId, openid, unionid: body.unionid, reserveType: body.reserve_type, time: body.time };
  if (body.event_type === 'cancel') return event;
  return { ...event, phone: decryptPhone(body.encrypted_phone, options.serverSecret) };
}

/** 解析角色绑定／解绑通知；重复请求由调用方根据真实业务状态幂等处理。 */
export function parseRoleBindingCallback(request, options) {
  if (request.method !== 'POST') throw new TapTapVerificationError('method');
  verifyCallback(request, options, 'query');
  const body = parseBody(request);
  if (typeof body.bind !== 'boolean') throw new TapTapVerificationError('body');
  return { roleId: requiredString(body.role_id), bind: body.bind };
}

/** 解析直达礼包发放请求；返回值不代表已经发放或具备发放资格。 */
export function parseDirectGiftCallback(request, options) {
  if (request.method !== 'POST') throw new TapTapVerificationError('method');
  verifyCallback(request, options, 'query');
  const body = parseBody(request);
  // 平台允许游戏没有区服概念，示例中的 server 不能擅自当作所有游戏的必填项。
  return { openid: requiredString(body.openid), unionid: requiredString(body.unionid), ...(body.server === undefined ? {} : { server: requiredString(body.server) }), roleId: requiredString(body.role_id), giftCode: requiredString(body.gift_code) };
}

/** 解析直达礼包区服列表查询；实际查询由游戏的用户和角色服务处理。 */
export function parseDirectGiftServerListRequest(request, options) {
  if (request.method !== 'GET') throw new TapTapVerificationError('method');
  verifyCallback(request, options, 'query');
  const params = new URLSearchParams(request.rawPath.split('?').slice(1).join('?'));
  const one = (key) => { const values = params.getAll(key); if (values.length !== 1) throw new TapTapVerificationError('body'); return values[0]; };
  const from = one('from'); const limit = one('limit');
  if (!/^\d+$/.test(from) || !/^\d+$/.test(limit) || !Number.isSafeInteger(Number(from)) || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1) throw new TapTapVerificationError('body');
  return { openid: requiredString(one('openid')), unionid: requiredString(one('unionid')), from: Number(from), limit: Number(limit) };
}

/** 解析直达礼包角色列表查询；不存在区服概念时允许省略 server_id。 */
export function parseDirectGiftRoleListRequest(request, options) {
  if (request.method !== 'GET') throw new TapTapVerificationError('method');
  verifyCallback(request, options, 'query');
  const params = new URLSearchParams(request.rawPath.split('?').slice(1).join('?'));
  const one = (key, required = true) => { const values = params.getAll(key); if (values.length > 1 || (required && values.length !== 1)) throw new TapTapVerificationError('body'); return values[0]; };
  const serverId = one('server_id', false);
  return { openid: requiredString(one('openid')), unionid: requiredString(one('unionid')), ...(serverId === undefined ? {} : { serverId: requiredString(serverId) }) };
}
