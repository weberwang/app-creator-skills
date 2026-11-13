import type { CrazyGamesRuntime, GameSettings, InviteParameters, JoinRoomListener, ReadyCheck, RoomState, SettingsListener } from './types';

/** CrazyGames 游戏生命周期、设置及多人房间的具名 SDK 实现。 */
export class CrazyGamesGame {
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 读取平台提供的游戏链接。 */
  get link(): string { this.ready(); return this.sdk.game.link; }
  /** 读取平台提供的游戏身份。 */
  get id(): string { this.ready(); return this.sdk.game.id; }
  /** 读取当前平台设置；音频与聊天策略由游戏服务落实。 */
  get settings(): GameSettings { this.ready(); return this.sdk.game.settings; }
  /** 判断是否由平台要求立即进入多人模式。 */
  get isInstantMultiplayer(): boolean { this.ready(); return this.sdk.game.isInstantMultiplayer; }
  /** 读取平台的离线模式标志。 */
  get isOfflineMode(): boolean { this.ready(); return this.sdk.game.isOfflineMode; }
  /** 读取启动时的邀请参数。 */
  get inviteParams(): Record<string, string> | null { this.ready(); return this.sdk.game.inviteParams; }
  /** 通知平台游戏实际开始或继续。 */
  gameplayStart(): void { this.ready(); this.sdk.game.gameplayStart(); }
  /** 通知平台游戏实际中断。 */
  gameplayStop(): void { this.ready(); this.sdk.game.gameplayStop(); }
  /** 报告加载开始，不能代替游戏本身的加载页面。 */
  loadingStart(): void { this.ready(); this.sdk.game.loadingStart(); }
  /** 报告加载结束。 */
  loadingStop(): void { this.ready(); this.sdk.game.loadingStop(); }
  /** 在实际积极事件发生时报告 happytime。 */
  happytime(): void { this.ready(); this.sdk.game.happytime(); }
  /** 报告游戏实际完成百分比。 */
  reportGameCompletedPercentage(value: number): void { this.ready(); this.sdk.game.reportGameCompletedPercentage(value); }
  /** 根据当前房间参数生成邀请链接。 */
  inviteLink(params: InviteParameters): string { this.ready(); return this.sdk.game.inviteLink(params); }
  /** 展示平台邀请按钮并返回链接。 */
  showInviteButton(params: InviteParameters): string { this.ready(); return this.sdk.game.showInviteButton(params); }
  /** 用户不能加入房间时隐藏平台邀请按钮。 */
  hideInviteButton(): void { this.ready(); this.sdk.game.hideInviteButton(); }
  /** 读取指定邀请参数。 */
  getInviteParam(name: string): string | null { this.ready(); return this.sdk.game.getInviteParam(name); }
  /** 注册设置监听，需用同一函数注销。 */
  addSettingsChangeListener(listener: SettingsListener): void { this.ready(); this.sdk.game.addSettingsChangeListener(listener); }
  /** 移除指定设置监听。 */
  removeSettingsChangeListener(listener: SettingsListener): void { this.ready(); this.sdk.game.removeSettingsChangeListener(listener); }
  /** 更新本玩家当前房间的信息。 */
  updateRoom(room: Partial<RoomState>): void { this.ready(); this.sdk.game.updateRoom(room); }
  /** 玩家离开房间后通知平台。 */
  leftRoom(): void { this.ready(); this.sdk.game.leftRoom(); }
  /** 注册房间加入请求监听。 */
  addJoinRoomListener(listener: JoinRoomListener): void { this.ready(); this.sdk.game.addJoinRoomListener(listener); }
  /** 用注册时的同一函数移除房间监听。 */
  removeJoinRoomListener(listener: JoinRoomListener): void { this.ready(); this.sdk.game.removeJoinRoomListener(listener); }
  /** 设定实际游戏上下文。 */
  setGameContext(context: Record<string, unknown> | null): void { this.ready(); this.sdk.game.setGameContext(context); }
  /** 清除不再适用的游戏上下文。 */
  clearGameContext(): void { this.ready(); this.sdk.game.clearGameContext(); }
}
