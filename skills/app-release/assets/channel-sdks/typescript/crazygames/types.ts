/** CrazyGames HTML5 v3 官方公开类型；未知的附加字段原样保留。 */
export type CrazyGamesEnvironment = 'crazygames' | 'local' | 'disabled' | 'uninitialized';
/** SDK 返回的结构化错误。 */
export interface CrazyGamesError { code: string; message: string }
/** 广告视频类型。 */
export type CrazyAdType = 'midgame' | 'rewarded';
/** SDK 广告回调；调用方使用原函数管理自身业务生命周期。 */
export interface CrazyAdCallbacks { adStarted?: () => void; adFinished?: () => void; adError?: (error: CrazyGamesError) => void }
/** 广告真实结果；SDK 没有公开独立的取消回调，因此不猜测取消状态。 */
export type RewardedAdResult = ({ status: 'completed' } | { status: 'unsupported' | 'error'; error: unknown }) & { onStartedError?: unknown };
/** 横幅固定尺寸请求。 */
export interface BannerRequest { id: string; width: number; height: number }
/** 平台设置。 */
export interface GameSettings { disableChat: boolean; muteAudio: boolean }
/** 多人房间状态。 */
export interface RoomState { roomId: string; isJoinable: boolean; inviteParams: Record<string, string> | null }
/** 邀请链接参数。 */
export type InviteParameters = Record<string, string | number>;
/** 房间通知回调。 */
export type JoinRoomListener = (params: Record<string, string>) => void;
/** 设置变化回调。 */
export type SettingsListener = (settings: GameSettings) => void;
/** 当前用户；危险用户 ID 不能用于服务端身份认证。 */
export interface PortalUser { username: string; profilePictureUrl: string; __dangerousUserId?: string }
/** 账号状态变化回调。 */
export type AuthListener = (user: PortalUser | null) => void;
/** 用户 Token 签名方式。 */
export interface UserTokenOptions { signingKeyType?: 'IN_GAME_AUTH' | 'IN_GAME_AUTH_LEGACY' }
/** 好友列表分页参数。 */
export interface FriendsOptions { page: number; size: number }
/** 平台好友资料。 */
export interface Friend { id: string; username: string; profilePictureUrl: string }
/** 分页好友结果。 */
export interface FriendsPage { friends: Friend[]; page: number; size: number; hasMore: boolean; total: number }
/** 商店分页参数。 */
export interface StorePageOptions { limit?: number; offset?: number }
/** 商品目录分页；平台提供是否还有后续条目。 */
export interface CatalogPage { items: CatalogItem[]; hasMore: boolean }
/** 玩家库存分页；官方运行时仅返回商品数组。 */
export interface InventoryPage { items: InventoryItem[] }
/** 平台给当前用户的商品价格。 */
export interface CatalogPrice { amount: string; amountWithoutDiscount: string; currency: string }
/** 商店商品，保留 SDK 返回的扩展定价信息。 */
export interface CatalogItem { sku: string; name: string; description?: string; imageUrl?: string; price: CatalogPrice | null; isFree: boolean; canBeBought: boolean; [key: string]: unknown }
/** 玩家库存商品。 */
export interface InventoryItem { sku: string; name: string; description: string | null; imageUrl: string | null; quantity: number | null }
/** SDK 支付流程完成结果；不代表后端已核验权益。 */
export interface PurchaseResult { itemId: string }
/** 账号绑定弹窗结果。 */
export interface AccountLinkResult { response: 'yes' | 'no' }
/** 可交给服务端验证的登录结果；未验证凭证不冒充已登录。 */
export type LoginResult = { status: 'unavailable' | 'guest' | 'auth_changed' } | { status: 'credential_unavailable'; user: PortalUser } | { status: 'token_acquired'; user: PortalUser; token: string };
/** 登录时是否由用户主动触发平台登录弹窗。 */
export interface LoginOptions { promptIfNeeded?: boolean; tokenOptions?: UserTokenOptions }
/** 游戏模块的官方 HTML5 方法与属性。 */
export interface RuntimeGame {
  readonly link: string; readonly id: string; readonly settings: GameSettings; readonly isInstantMultiplayer: boolean;
  readonly isOfflineMode: boolean; readonly inviteParams: Record<string, string> | null;
  happytime(): void; gameplayStart(): void; gameplayStop(): void; loadingStart(): void; loadingStop(): void;
  reportGameCompletedPercentage(value: number): void; inviteLink(params: InviteParameters): string;
  showInviteButton(params: InviteParameters): string; hideInviteButton(): void; getInviteParam(name: string): string | null;
  addSettingsChangeListener(listener: SettingsListener): void; removeSettingsChangeListener(listener: SettingsListener): void;
  updateRoom(room: Partial<RoomState>): void; leftRoom(): void; addJoinRoomListener(listener: JoinRoomListener): void;
  removeJoinRoomListener(listener: JoinRoomListener): void; setGameContext(context: Record<string, unknown> | null): void;
  clearGameContext(): void;
}
/** 视频广告官方模块。 */
export interface RuntimeAd { requestAd(type: CrazyAdType, callbacks?: CrazyAdCallbacks): void; hasAdblock(): Promise<boolean> }
/** 横幅官方模块。 */
export interface RuntimeBanner { requestBanner(banner: BannerRequest): Promise<void>; requestResponsiveBanner(id: string): Promise<void>; clearBanner(id: string): void; clearAllBanners(): void }
/** 用户官方模块。 */
export interface RuntimeUser {
  readonly isUserAccountAvailable: boolean;
  getUser(): Promise<PortalUser | null>; showAuthPrompt(): Promise<PortalUser | null>;
  getUserToken(options?: UserTokenOptions): Promise<string | null>; getXsollaUserToken(): Promise<string | null>;
  showAccountLinkPrompt(): Promise<AccountLinkResult>; listFriends(options: FriendsOptions): Promise<FriendsPage>;
  addAuthListener(listener: AuthListener): void; removeAuthListener(listener: AuthListener): void;
  submitScore(score: { encryptedScore: string; score?: number }): void;
}
/** 云存档官方模块。 */
export interface RuntimeData { clear(): void; getItem(key: string): string | null; removeItem(key: string): void; setItem(key: string, value: string): void }
/** 支付订单上报官方模块。 */
export interface RuntimeAnalytics { trackOrder(provider: 'xsolla', order: Record<string, unknown>): void }
/** 内购官方模块。 */
export interface RuntimeStore {
  setSandbox(enabled: boolean): void; getCatalogItems(options?: StorePageOptions): Promise<CatalogPage>;
  getPlayerInventory(options?: StorePageOptions): Promise<InventoryPage>;
  buyItem(itemId: string): Promise<PurchaseResult>; consumeItem(sku: string, quantity: number): Promise<void>;
}
/** 初始化完成后由官方脚本提供的运行时根对象。 */
export interface CrazyGamesRuntime {
  readonly environment: CrazyGamesEnvironment; readonly isQaTool: boolean; readonly game: RuntimeGame;
  readonly ad: RuntimeAd; readonly banner: RuntimeBanner; readonly user: RuntimeUser; readonly data: RuntimeData;
  readonly analytics: RuntimeAnalytics; readonly store: RuntimeStore;
}
/** 每个具体能力调用前检查 SDK 生命周期。 */
export type ReadyCheck = () => void;
