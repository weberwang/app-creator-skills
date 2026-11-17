import type { Buffer } from 'node:buffer';

/** 来自 HTTP 原始请求的未重排路径、报头和未解析请求体。 */
export interface RawTapRequest {
  method: 'GET' | 'POST';
  rawPath: string;
  rawHeaders: readonly string[];
  rawBody: Buffer;
}

/** 服务端固定的签名、路由与时间窗口；事件重放仍由业务持久化去重。 */
export interface TapVerificationOptions {
  serverSecret: string;
  expectedPath: string;
  nowSeconds: number;
  maxAgeSeconds: number;
}

/** 针对单个应用的回调认证配置。 */
export interface TapCallbackOptions extends TapVerificationOptions { clientId: string }

/** 不含原始请求和密钥的校验失败。 */
export class TapTapVerificationError extends Error { readonly code: string; constructor(code: string) }
/** 使用公共 S2S 协议签名原始请求。 */
export function signTapRequest(request: RawTapRequest, serverSecret: string): string;
/** 校验公共签名、路由和时间窗口。 */
export function verifyTapRequest(request: RawTapRequest, options: TapVerificationOptions): true;

/** 已验签的授权事件；取消授权不会包含手机号。 */
export type ReservePhoneEvent =
  | { kind: 'test'; eventId: string }
  | { kind: 'cancel'; eventId: string; openid: string; unionid: string | undefined; reserveType: 'android' | 'pc'; time: number }
  | { kind: 'authorize'; eventId: string; openid: string; unionid: string | undefined; reserveType: 'android' | 'pc'; time: number; phone: string };
/** 验签并解析预约手机号事件；事件 ID 必须由业务原子去重。 */
export function parseReservePhoneCallback(request: RawTapRequest, options: TapCallbackOptions): ReservePhoneEvent;
/** 验签并解析角色绑定状态通知。 */
export function parseRoleBindingCallback(request: RawTapRequest, options: TapCallbackOptions): { roleId: string; bind: boolean };
/** 验签并解析直达礼包发放请求。 */
export function parseDirectGiftCallback(request: RawTapRequest, options: TapCallbackOptions): { openid: string; unionid: string; server?: string; roleId: string; giftCode: string };
/** 验签并解析直达礼包区服查询。 */
export function parseDirectGiftServerListRequest(request: RawTapRequest, options: TapCallbackOptions): { openid: string; unionid: string; from: number; limit: number };
/** 验签并解析直达礼包角色查询。 */
export function parseDirectGiftRoleListRequest(request: RawTapRequest, options: TapCallbackOptions): { openid: string; unionid: string; serverId?: string };

/** 不包含密钥、URL 和响应正文的服务端请求错误。 */
export class TapTapMiniappError extends Error { readonly code: string; readonly platformCode?: number; constructor(code: string, platformCode?: number) }
/** 小游戏服务端凭据与网络配置。 */
export interface TapMiniappOptions { appId: string; secret: string; region: 'cn' | 'global'; fetchImpl?: typeof fetch; timeoutMs?: number }
/** 小游戏服务端会话凭据，不能下发给客户端。 */
export interface TapMiniappSession { openid: string; sessionKey: string; unionid?: string }
/** 通过可信服务端订单号查询的实际支付状态。 */
export interface TapMiniappOrder { orderId: string; productId: string; payState: 1 | 2; deliverState: 1 | 2; payFinishTime?: number }
/** 小游戏登录、调用凭证及订单查询客户端。 */
export class TapTapMiniappClient {
  constructor(options: TapMiniappOptions);
  /** 使用一次性 code 换取服务端会话。 */
  code2Session(code: string): Promise<TapMiniappSession>;
  /** 获取稳定凭据，强制刷新需调用方明确选择。 */
  getStableAccessToken(options?: { forceRefresh?: boolean }): Promise<{ accessToken: string; expiresIn: number }>;
  /** 检查登录态；signature 按当前官方接口要求提供，原串不可猜测。 */
  checkSessionKey(options: { openid: string; accessToken: string; signature: string }): Promise<true>;
  /** 查询订单状态，发货须另行核验并通过业务事务完成。 */
  getOrderDetail(options: { accessToken: string; paymentKey: string; openid: string; offerId: string; outTradeNo: string; env: 0 | 1; timestamp: number }): Promise<TapMiniappOrder>;
}
/** 根据原始 signData 生成服务端小游戏道具直购签名。 */
export function signGameItemPayment(signData: string, paymentKey: string): string;
/** 对原始请求体计算用户态 HMAC 签名。 */
export function signTapUserData(rawData: string, sessionKey: string): string;

/** 发货 URL 验证所需的应用、原始路由和时间窗口配置。 */
export interface MiniappPaymentProbeOptions { token: string; clientId: string; expectedPath: string; nowSeconds: number; maxAgeSeconds: number }
/** 明文和 AES 安全模式必须显式选择，不允许降级。 */
export type MiniappPaymentOptions = MiniappPaymentProbeOptions & { paymentKey: string; env: 0 | 1 } & (
  | { mode: 'plaintext' }
  | { mode: 'aes'; encodingAesKey: string }
);
/** 已验签发货事件；不表示业务已验证订单或完成发货。 */
export interface MiniappPaymentDelivery {
  clientId: string; env: 0 | 1; openid: string; orderId: string; productId: string;
  quantity: number; originalPrice: number; actualPrice: number; isMock: boolean; attach?: string;
}
/** 游戏订单服务提供的可信订单快照，发货须在同一业务事务中幂等执行。 */
export interface MiniappTrustedOrder {
  clientId: string; env: 0 | 1; openid: string; orderId: string; productId: string;
  quantity: number; originalPrice: number; actualPrice: number; paid: boolean;
}
/** 验证 GET 接入探测并返回原样回显的 echostr。 */
export function verifyMiniappPaymentProbe(request: RawTapRequest, options: MiniappPaymentProbeOptions): string;
/** 验签并解析发货通知；安全模式解密只使用第一个随机块之后的内容。 */
export function parseMiniappPaymentDelivery(request: RawTapRequest, options: MiniappPaymentOptions): MiniappPaymentDelivery;
/** 对照可信订单核查身份、状态和商品金额，结果不代替幂等发货事务。 */
export function assertMiniappDeliveryMatchesOrder(event: MiniappPaymentDelivery, order: MiniappTrustedOrder): true;
