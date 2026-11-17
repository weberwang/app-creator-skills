import { createHmac } from 'node:crypto';

/** 不包含接口请求 URL、密钥、响应正文或身份数据的错误。 */
export class TapTapMiniappError extends Error {
  /** 保存可用于判断的错误分类与平台数字错误码。 */
  constructor(code, platformCode) { super(`Tap 小游戏服务端接口失败：${code}`); this.name = 'TapTapMiniappError'; this.code = code; if (Number.isSafeInteger(platformCode)) this.platformCode = platformCode; }
}

/** 拒绝缺失的真实应用配置，不能用占位值冒充平台身份。 */
function text(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TapTapMiniappError('configuration');
  return value;
}

/** 小游戏服务端客户端；构造和导入都不会发起网络请求。 */
export class TapTapMiniappClient {
  #appId;
  #secret;
  #base;
  #fetch;
  #timeoutMs;

  /** 国内和国际域名必须显式选择，不能将应用密钥发送到任意目标。 */
  constructor({ appId, secret, region, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
    this.#appId = text(appId);
    this.#secret = text(secret);
    if (!['cn', 'global'].includes(region) || typeof fetchImpl !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) throw new TapTapMiniappError('configuration');
    this.#base = region === 'cn' ? 'https://cloud-miniapp.tapapis.cn' : 'https://cloud-miniapp.tapapis.com';
    this.#fetch = fetchImpl;
    this.#timeoutMs = timeoutMs;
  }

  /** 发起单次请求并拒绝重定向；错误统一脱敏且不重试一次性 code。 */
  async #request(url, init, allowEmpty = false) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new TapTapMiniappError('timeout')); }, this.#timeoutMs); });
    const operation = (async () => {
      const response = await this.#fetch(url, { ...init, redirect: 'error', signal: controller.signal });
      if (!response || response.redirected || !response.ok || response.status < 200 || response.status >= 300) throw new TapTapMiniappError('http');
      let value;
      try {
        if (allowEmpty) {
          const raw = await response.text();
          value = raw.length ? JSON.parse(raw) : {};
        } else value = await response.json();
      } catch { throw new TapTapMiniappError('response'); }
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TapTapMiniappError('response');
      if (value.errcode !== undefined && value.errcode !== 0) throw new TapTapMiniappError('platform', value.errcode);
      return value;
    })();
    try { return await Promise.race([operation, timeout]); }
    catch (error) { if (error instanceof TapTapMiniappError) throw error; throw new TapTapMiniappError('network'); }
    finally { clearTimeout(timer); }
  }

  /** 将一次性 code 换为服务端会话材料；sessionKey 不得下发给客户端。 */
  async code2Session(code) {
    const url = new URL('/auth/v1/jscode2session', this.#base);
    url.searchParams.set('appid', this.#appId);
    url.searchParams.set('secret', this.#secret);
    url.searchParams.set('js_code', text(code));
    url.searchParams.set('grant_type', 'authorization_code');
    const value = await this.#request(url.toString(), { method: 'GET' });
    if (typeof value.openid !== 'string' || !value.openid || typeof value.session_key !== 'string' || !value.session_key || (value.unionid !== undefined && typeof value.unionid !== 'string')) throw new TapTapMiniappError('response');
    return { openid: value.openid, sessionKey: value.session_key, ...(value.unionid === undefined ? {} : { unionid: value.unionid }) };
  }

  /** 获取稳定调用凭据；共享缓存和刷新时机由业务进程或持久层管理。 */
  async getStableAccessToken({ forceRefresh = false } = {}) {
    if (typeof forceRefresh !== 'boolean') throw new TapTapMiniappError('configuration');
    const body = JSON.stringify({ appid: this.#appId, secret: this.#secret, grant_type: 'client_credential', force_refresh: forceRefresh });
    const value = await this.#request(`${this.#base}/auth/v1/stable-token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (typeof value.access_token !== 'string' || !value.access_token || !Number.isSafeInteger(value.expires_in) || value.expires_in <= 0) throw new TapTapMiniappError('response');
    return { accessToken: value.access_token, expiresIn: value.expires_in };
  }

  /** 校验用户登录态；签名原串由接入方按当前接口合同明确提供，不猜测 GET 的签名内容。 */
  async checkSessionKey({ openid, accessToken, signature }) {
    const url = new URL('/auth/v1/checksession', this.#base);
    url.searchParams.set('openid', text(openid));
    url.searchParams.set('access_token', text(accessToken));
    url.searchParams.set('signature', text(signature));
    url.searchParams.set('sig_method', 'hmac_sha256');
    const value = await this.#request(url.toString(), { method: 'GET' }, true);
    if (Object.keys(value).length && value.errcode !== 0) throw new TapTapMiniappError('response');
    return true;
  }

  /** 查询支付订单；结果必须结合可信订单、商品和业务幂等逻辑处理。 */
  async getOrderDetail({ accessToken, paymentKey, openid, offerId, outTradeNo, env, timestamp }) {
    text(accessToken); text(paymentKey); text(openid); text(offerId); text(outTradeNo);
    if (![0, 1].includes(env) || !Number.isSafeInteger(timestamp) || timestamp <= 0) throw new TapTapMiniappError('configuration');
    const path = '/order/v1/detail';
    const body = JSON.stringify({ openid, offer_id: offerId, ts: timestamp, env, out_trade_no: outTradeNo, biz_id: 2 });
    // 小游戏支付使用独立的十六进制签名，不能套用 S2S 公共 Base64 协议。
    const paySig = createHmac('sha256', paymentKey).update(`${path}&${body}`).digest('hex');
    const url = new URL(path, this.#base);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('sig_method', 'hmac_sha256');
    url.searchParams.set('pay_sig', paySig);
    const value = await this.#request(url.toString(), { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (value.errcode !== 0 || value.out_trade_no !== outTradeNo || ![1, 2].includes(value.pay_state) || ![1, 2].includes(value.deliver_state) || typeof value.product_id !== 'string' || !value.product_id) throw new TapTapMiniappError('response');
    return { orderId: value.out_trade_no, productId: value.product_id, payState: value.pay_state, deliverState: value.deliver_state, ...(Number.isSafeInteger(value.pay_finish_time) ? { payFinishTime: value.pay_finish_time } : {}) };
  }
}

/** 生成道具直购支付签名，原始 signData 必须与客户端收到的字节一致。 */
export function signGameItemPayment(signData, paymentKey) {
  text(signData); text(paymentKey);
  return createHmac('sha256', paymentKey).update(`requestPaymentGameItem&${signData}`, 'utf8').digest('hex');
}

/** 使用服务端会话密钥签署官方要求的原始请求体，不向客户端暴露密钥。 */
export function signTapUserData(rawData, sessionKey) {
  if (typeof rawData !== 'string') throw new TapTapMiniappError('configuration');
  text(sessionKey);
  return createHmac('sha256', sessionKey).update(rawData, 'utf8').digest('hex');
}
