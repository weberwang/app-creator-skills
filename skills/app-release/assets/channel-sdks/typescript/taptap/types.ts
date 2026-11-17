import type { TapCloudSaveManager, TapLeaderboardManager } from './services';

/** Tap 小游戏回调可能返回的平台错误或状态。 */
export interface TapMessage { errMsg: string; errno?: number; errCode?: number }

/** 平台原生回调约定；不同 API 的结果类型各自定义。 */
export interface TapCallbacks<T = TapMessage> {
  success?: (result: T) => void;
  fail?: (error: TapMessage) => void;
  complete?: (result: T | TapMessage) => void;
}

/** 短期登录凭证只供可信服务端换取会话。 */
export interface TapLoginResponse { code: string }
/** 登录超时由宿主以毫秒解释。 */
export interface TapLoginOptions extends TapCallbacks<TapLoginResponse> { timeout?: number }
/** 调用小游戏登录态检查的回调。 */
export interface TapCheckSessionOptions extends TapCallbacks {}
/** 申请指定权限；头像授权需采用官方用户信息按钮。 */
export interface TapAuthorizeOptions extends TapCallbacks { scope: string }
/** 已授权权限的当前状态。 */
export interface TapSettingResponse { authSetting: Record<string, boolean>; errMsg?: string }
/** 查询授权状态的回调。 */
export interface TapSettingOptions extends TapCallbacks<TapSettingResponse> {}
/** 已授权玩家资料；敏感密文需要可信服务端校验。 */
export interface TapUserInfo { nickName: string; avatarUrl: string; gender: number; province: string; city: string; country: string }
/** 玩家资料与可能由平台返回的校验材料。 */
export interface TapUserInfoResponse { userInfo: TapUserInfo; rawData?: string; signature?: string; encryptedData?: string; iv?: string; cloudID?: string }
/** 仅允许官方文档列出的用户资料选项。 */
export interface TapUserInfoOptions extends TapCallbacks<TapUserInfoResponse> { withCredentials?: boolean; lang?: 'en' | 'zh_CN' | 'zh_TW' }
/** 用户信息按钮使用宿主渲染的真实坐标和样式。 */
export interface TapUserInfoButtonStyle {
  left: number; top: number; width: number; height: number; backgroundColor: string;
  borderColor?: string; borderWidth?: number; borderRadius?: number; color?: string;
  textAlign?: 'left' | 'center' | 'right'; fontSize?: number; lineHeight?: number;
}
/** 通过原生按钮请求用户资料授权，而不把 scope.userInfo 的 authorize 当作弹窗。 */
export interface TapUserInfoButtonOptions {
  type: 'text' | 'image'; text?: string; image?: string; style: TapUserInfoButtonStyle;
  withCredentials?: boolean; lang?: 'en' | 'zh_CN' | 'zh_TW';
}
/** 用户信息按钮由业务持有者移除监听并销毁。 */
export interface TapUserInfoButton {
  /** 显示授权按钮。 */
  show(): void;
  /** 隐藏授权按钮。 */
  hide(): void;
  /** 销毁按钮及其原生资源。 */
  destroy(): void;
  /** 添加玩家点击监听。 */
  onTap(listener: (result: TapUserInfoResponse | TapMessage) => void): void;
  /** 移除指定监听。 */
  offTap(listener: (result: TapUserInfoResponse | TapMessage) => void): void;
}
/** 分享面板回调只代表打开面板，不代表分享成功。 */
export interface TapShareboardOptions extends TapCallbacks { templateId: string; sceneParam?: string }
/** 控制菜单分享面板显示，不影响主动打开的分享面板。 */
export interface TapShareboardHiddenOptions extends TapCallbacks { hidden: boolean }
/** 从后台回到前台时的官方场景参数。 */
export interface TapShowEvent { scene: number; query: Record<string, string> }
/** 宿主发来的广告错误。 */
export interface TapAdError { errCode?: number; errMsg?: string }
/** 激励广告关闭通知；只在 isEnded 明确为 true 时确认观看完成。 */
export interface TapRewardedCloseEvent { isEnded?: boolean }
/** 激励广告由宿主保有全局单例，业务不能假设重复创建独立实例。 */
export interface TapRewardedAd {
  load(): Promise<void>;
  show(): Promise<void>;
  onLoad(listener: () => void): void;
  onError(listener: (error: TapAdError) => void): void;
  onClose(listener: (result?: TapRewardedCloseEvent) => void): void;
}
/** 真实广告位配置。 */
export interface TapAdOptions { adUnitId: string }
/** Banner 使用宿主真实像素坐标，不包含虚构的安全区偏移。 */
export interface TapBannerOptions extends TapAdOptions { style: { left: number; top: number; width: number }; adIntervals?: number }
/** Banner 对象由使用页面负责隐藏和销毁。 */
export interface TapBannerAd {
  /** 展示已创建的横幅。 */
  show(): Promise<void>;
  /** 隐藏横幅，允许在渠道释放后清理。 */
  hide(): void;
  /** 销毁横幅，允许在渠道释放后清理。 */
  destroy(): void;
  /** 添加加载监听。 */
  onLoad(listener: () => void): void;
  /** 移除指定加载监听。 */
  offLoad(listener: () => void): void;
  /** 添加错误监听。 */
  onError(listener: (error: TapAdError) => void): void;
  /** 移除指定错误监听。 */
  offError(listener: (error: TapAdError) => void): void;
  /** 添加尺寸监听。 */
  onResize(listener: (size: { width: number; height: number }) => void): void;
  /** 移除指定尺寸监听。 */
  offResize(listener: (size: { width: number; height: number }) => void): void;
}
/** 插屏对象按宿主生命周期展示并由使用方销毁。 */
export interface TapInterstitialAd {
  /** 展示插屏。 */
  show(): Promise<void>;
  /** 加载插屏。 */
  load(): Promise<void>;
  /** 销毁插屏，允许在渠道释放后清理。 */
  destroy(): void;
  /** 添加加载监听。 */
  onLoad(listener: () => void): void;
  /** 移除指定加载监听。 */
  offLoad(listener: () => void): void;
  /** 添加错误监听。 */
  onError(listener: (error: TapAdError) => void): void;
  /** 移除指定错误监听。 */
  offError(listener: (error: TapAdError) => void): void;
  /** 添加关闭监听。 */
  onClose(listener: () => void): void;
  /** 移除指定关闭监听。 */
  offClose(listener: () => void): void;
}
/** 服务端签发的支付原串和签名；客户端不得重新序列化原串。 */
export interface TapGameItemPayment extends TapCallbacks<TapMessage> { signData: string; paySig: string; signature: string }

/** 已核实的 Tap 小游戏宿主方法；按实际版本检查可选能力。 */
export interface TapRuntime {
  login?(options: TapLoginOptions): void;
  checkSession?(options: TapCheckSessionOptions): void;
  authorize?(options: TapAuthorizeOptions): void;
  getSetting?(options: TapSettingOptions): void;
  getUserInfo?(options: TapUserInfoOptions): void;
  createUserInfoButton?(options: TapUserInfoButtonOptions): TapUserInfoButton;
  showShareboard?(options: TapShareboardOptions): void;
  setShareboardHidden?(options: TapShareboardHiddenOptions): void;
  onShow?(listener: (event: TapShowEvent) => void): void;
  offShow?(listener: (event: TapShowEvent) => void): void;
  onHide?(listener: () => void): void;
  offHide?(listener: () => void): void;
  createRewardedVideoAd?(options: TapAdOptions): TapRewardedAd;
  createBannerAd?(options: TapBannerOptions): TapBannerAd;
  createInterstitialAd?(options: TapAdOptions): TapInterstitialAd;
  requestPaymentGameItem?(options: TapGameItemPayment): void;
  getCloudSaveManager?(): TapCloudSaveManager;
  getLeaderboardManager?(): TapLeaderboardManager;
}
