import type { AccountLinkResult, AuthListener, CrazyGamesRuntime, FriendsOptions, FriendsPage, LoginOptions, LoginResult, PortalUser, ReadyCheck, UserTokenOptions } from './types';

/** CrazyGames 账号、好友和排行榜的具名 SDK 实现。 */
export class CrazyGamesUser {
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 判断当前宿主是否提供平台账号。 */
  get isUserAccountAvailable(): boolean { this.ready(); return this.sdk.user.isUserAccountAvailable; }
  /** 获取平台用户；游客返回 null。 */
  getUser(): Promise<PortalUser | null> { this.ready(); return this.sdk.user.getUser(); }
  /** 在用户主动请求时展示平台登录弹窗。 */
  showAuthPrompt(): Promise<PortalUser | null> { this.ready(); return this.sdk.user.showAuthPrompt(); }
  /** 取得可由可信服务端验证的用户 token。 */
  getUserToken(options?: UserTokenOptions): Promise<string | null> { this.ready(); return this.sdk.user.getUserToken(options); }
  /** 取得已获邀请的 Xsolla 集成所用短期 token。 */
  getXsollaUserToken(): Promise<string | null> { this.ready(); return this.sdk.user.getXsollaUserToken(); }
  /** 展示平台账号绑定弹窗。 */
  showAccountLinkPrompt(): Promise<AccountLinkResult> { this.ready(); return this.sdk.user.showAccountLinkPrompt(); }
  /** 按平台分页合同读取好友。 */
  listFriends(options: FriendsOptions): Promise<FriendsPage> { this.ready(); return this.sdk.user.listFriends(options); }
  /** 注册账号变化通知，供调用方在生命周期结束时注销。 */
  addAuthListener(listener: AuthListener): void { this.ready(); this.sdk.user.addAuthListener(listener); }
  /** 用注册时的函数移除账号变化通知。 */
  removeAuthListener(listener: AuthListener): void { this.ready(); this.sdk.user.removeAuthListener(listener); }
  /** 提交已按平台要求加密的排行榜成绩。 */
  submitScore(score: { encryptedScore: string; score?: number }): void { this.ready(); this.sdk.user.submitScore(score); }
  /** 按需取得账号与认证凭证；默认不会自动弹出登录界面。 */
  async login(options: LoginOptions = {}): Promise<LoginResult> {
    this.ready();
    if (!this.sdk.user.isUserAccountAvailable) return { status: 'unavailable' };
    let authGeneration = 0;
    // 平台换号与异步 token 返回可交错；任何变更都使当前组合失效。
    const listener: AuthListener = () => { authGeneration++; };
    this.sdk.user.addAuthListener(listener);
    try {
      let generation = authGeneration;
      let user = await this.sdk.user.getUser();
      this.ready();
      if (generation !== authGeneration) return { status: 'auth_changed' };
      if (!user && options.promptIfNeeded) {
        await this.sdk.user.showAuthPrompt();
        this.ready();
        // 登录弹窗会触发正常账号变更；其结束后重新读取当前身份再绑定 token。
        generation = authGeneration;
        user = await this.sdk.user.getUser();
        this.ready();
        if (generation !== authGeneration) return { status: 'auth_changed' };
      }
      if (!user) return { status: 'guest' };
      generation = authGeneration;
      const token = await this.sdk.user.getUserToken(options.tokenOptions);
      this.ready();
      if (generation !== authGeneration) return { status: 'auth_changed' };
      // 用户对象本身不是可信身份；只有实际取得 token 才交服务端认证。
      return token ? { status: 'token_acquired', user, token } : { status: 'credential_unavailable', user };
    } finally {
      // 释放期间也要注销已登记的原始监听，不能依赖已经失效的业务入口。
      this.sdk.user.removeAuthListener(listener);
    }
  }
}
