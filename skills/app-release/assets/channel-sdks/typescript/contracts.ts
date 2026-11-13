/** 当前适配器可选择的渠道。 */
export type ChannelPlatform = 'wechat-minigame' | 'crazygames';

/** 表示适配器自身的初始化状态，不代表广告或支付已经可用。 */
export type ChannelState = 'idle' | 'initializing' | 'ready' | 'failed' | 'disposed';

/** 各引擎注入业务的统一 SDK 能力入口。 */
export interface ChannelCapabilities<TApi extends object = object> {
  readonly platform: ChannelPlatform;
  readonly state: ChannelState;
  /** 底层初始化是否仍在运行；释放只能停止等待，不能取消厂商内部操作。 */
  readonly hasPendingInitialization: boolean;
  /** 当前渠道的具名能力接口，不提供字符串分发或基础引擎 API。 */
  readonly api: TApi;
  /** 只请求当前 SDK 初始化，不作为应用首帧的等待条件。 */
  initialize(): Promise<void>;
  /** 使调用句柄失效，不宣称取消厂商已经受理的业务操作。 */
  dispose(): void;
}

/** 初始化配置：超时仅报告未就绪，不推断 SDK 的最终结果。 */
export interface InitializationOptions {
  readonly timeoutMs: number;
}
