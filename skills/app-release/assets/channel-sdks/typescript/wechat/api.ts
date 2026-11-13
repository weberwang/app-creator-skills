import { WechatPlatformApi } from './platform.generated';
import type { Wechat } from './types.generated';

export type { Wechat } from './types.generated';

/** 登录凭证只用于可信服务端换取会话，不代表客户端已经完成身份认证。 */
export type WechatLoginResult = { status: 'code_acquired'; code: string } | { status: 'error'; error: unknown };
/** 激励广告只有明确完整观看才返回 completed。 */
export type WechatRewardedAdResult = { status: 'completed' | 'dismissed' } | { status: 'unsupported' | 'error'; error: unknown };
/** 支付成功仅表示客户端流程完成，权益必须由服务端核验。 */
export type WechatPaymentResult = { status: 'client_completed'; requiresVerification: true; receipt: unknown } | { status: 'cancelled' | 'error' | 'unsupported'; error: unknown };
/** 业务提交支付时不自行注入第二套成功或失败回调。 */
export type WechatMidasRequest = Omit<Wechat.RequestMidasPaymentOption, 'success' | 'fail' | 'complete'>;
/** 已签名支付原串原样传递，不能在客户端重新序列化。 */
export type WechatGameItemRequest = Omit<Wechat.RequestMidasPaymentGameItemOption, 'success' | 'fail' | 'complete'>;

/** 官方虚拟支付的签名参数；模式和资格由项目按实际渠道开通配置确定。 */
export interface WechatVirtualPaymentRequest { mode: string; paySig: string; signData: string; signature: string }
/** 虚拟支付回调保留平台提供的错误码，不合并各支付接口的码表。 */
export interface WechatVirtualPaymentError { errMsg: string; errCode?: number; errno?: number; [key: string]: unknown }
/** 未被 3.8.22 小游戏类型包声明的官方虚拟支付，按真实宿主提供能力核实。 */
export interface WechatVirtualPaymentOptions extends WechatVirtualPaymentRequest {
  success?: (receipt: Record<string, unknown>) => void;
  fail?: (error: WechatVirtualPaymentError) => void;
  complete?: (result: Record<string, unknown>) => void;
}
/** 仅补充已由官方 Unity 绑定确认的专属接口，不增加基础 API。 */
interface VirtualPaymentRuntime extends Wechat.Runtime { requestVirtualPayment?: (options: WechatVirtualPaymentOptions) => void }

/** 微信渠道具名接口及可直接复用的登录、激励广告与支付处理。 */
export class WechatApi extends WechatPlatformApi {
  private rewardPending = false;

  /** 使用官方登录回调取得短期 code，失败不伪造游客身份或服务器会话。 */
  loginCredential(timeout?: number): Promise<WechatLoginResult> {
    this.assertReady();
    return new Promise((resolve) => {
      try {
        this.runtime.login({ timeout,
          success: (result) => resolve(result.code ? { status: 'code_acquired', code: result.code } : { status: 'error', error: new Error('微信登录没有返回凭证') }),
          fail: (error) => resolve({ status: 'error', error }),
        });
      } catch (error) { resolve({ status: 'error', error }); }
    });
  }

  /** 为每次用户主动请求创建独立广告对象，监听与该对象一起释放。 */
  showRewardedAd(options: Wechat.CreateRewardedVideoAdOption): Promise<WechatRewardedAdResult> {
    this.assertReady();
    if (this.rewardPending) return Promise.resolve({ status: 'error', error: new Error('已有激励广告请求正在进行') });
    if (typeof this.runtime.createRewardedVideoAd !== 'function') return Promise.resolve({ status: 'unsupported', error: new Error('当前宿主没有激励广告接口') });
    this.rewardPending = true;
    return new Promise((resolve) => {
      let settled = false;
      let ad: Wechat.RewardedVideoAd | undefined;
      /** 已受理广告的回调仍可结算；清理直接使用持有对象，不被页面或渠道释放截断。 */
      const finish = (result: WechatRewardedAdResult): void => {
        if (settled) return;
        settled = true;
        this.rewardPending = false;
        if (ad) {
          // 释放异常不能把真实完成改成错误，也不能阻止其他监听和对象释放。
          for (const cleanup of [() => ad?.offClose(onClose), () => ad?.offError(onError), () => ad?.destroy()]) {
            try { cleanup(); } catch {}
          }
        }
        resolve(result);
      };
      /** 缺少明确完成标记时不给奖励，不沿用旧版 undefined 等同完成的推断。 */
      const onClose = (result: Wechat.RewardedVideoAdOnCloseListenerResult): void => {
        if (result?.isEnded === true) finish({ status: 'completed' });
        else if (result?.isEnded === false) finish({ status: 'dismissed' });
        else finish({ status: 'error', error: new Error('广告关闭结果缺少完成标记') });
      };
      /** 广告加载或展示错误不返回完成。 */
      const onError = (error: unknown): void => finish({ status: 'error', error });
      try {
        ad = this.runtime.createRewardedVideoAd(options);
        ad.onClose(onClose);
        if (settled) return;
        ad.onError(onError);
        if (settled) return;
        // 原始 load/show 均保留在具名接口；此便捷路径不自动重试或叠加平台广告频控。
        void ad.load().then(() => { if (!settled) { this.assertReady(); return ad?.show(); } }).catch(onError);
      } catch (error) { finish({ status: 'error', error }); }
    });
  }

  /** 发起米大师游戏币支付，客户端结果只交给已有订单服务继续核验。 */
  payMidas(options: WechatMidasRequest): Promise<WechatPaymentResult> {
    this.assertReady();
    if (typeof this.runtime.requestMidasPayment !== 'function') return Promise.resolve({ status: 'unsupported', error: new Error('当前宿主没有米大师支付接口') });
    return new Promise((resolve) => {
      try {
        this.runtime.requestMidasPayment({ ...options,
          success: (receipt) => resolve({ status: 'client_completed', requiresVerification: true, receipt }),
          fail: (error) => resolve({ status: error.errCode === 1 ? 'cancelled' : 'error', error }),
        });
      } catch (error) { resolve({ status: 'error', error }); }
    });
  }

  /** 发起游戏道具支付，严格保留服务端生成的 signData 字节串。 */
  payGameItem(options: WechatGameItemRequest): Promise<WechatPaymentResult> {
    this.assertReady();
    if (typeof this.runtime.requestMidasPaymentGameItem !== 'function') return Promise.resolve({ status: 'unsupported', error: new Error('当前宿主没有游戏道具支付接口') });
    if (typeof options.signData !== 'string') return Promise.resolve({ status: 'error', error: new Error('签名支付原串必须为字符串') });
    return new Promise((resolve) => {
      try {
        this.runtime.requestMidasPaymentGameItem({ ...options,
          success: (receipt) => resolve({ status: 'client_completed', requiresVerification: true, receipt }),
          fail: (error) => resolve({ status: error.errCode === 1 ? 'cancelled' : 'error', error }),
        });
      } catch (error) { resolve({ status: 'error', error }); }
    });
  }

  /** 直接调用官方虚拟支付，类型包遗漏不等于宿主已有能力或项目已开通。 */
  requestVirtualPayment(options: WechatVirtualPaymentOptions): void {
    this.assertReady();
    const runtime = this.runtime as VirtualPaymentRuntime;
    if (typeof runtime.requestVirtualPayment !== 'function') throw new Error('微信渠道能力不可用：requestVirtualPayment');
    if (typeof options.signData !== 'string') throw new Error('签名支付原串必须为字符串');
    runtime.requestVirtualPayment(options);
  }

  /** 虚拟支付返回只表示客户端流程完成，不自动核销订单或发放权益。 */
  payVirtual(options: WechatVirtualPaymentRequest): Promise<WechatPaymentResult> {
    this.assertReady();
    if (typeof (this.runtime as VirtualPaymentRuntime).requestVirtualPayment !== 'function') return Promise.resolve({ status: 'unsupported', error: new Error('当前宿主没有虚拟支付接口') });
    return new Promise((resolve) => {
      try {
        this.requestVirtualPayment({ ...options,
          success: (receipt) => resolve({ status: 'client_completed', requiresVerification: true, receipt }),
          // 虚拟支付错误码与米大师的码表分开，不把未核实错误猜成用户取消。
          fail: (error) => resolve({ status: 'error', error }),
        });
      } catch (error) { resolve({ status: 'error', error }); }
    });
  }
}
