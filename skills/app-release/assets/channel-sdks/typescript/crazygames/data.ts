import type { CrazyGamesRuntime, ReadyCheck } from './types';

/** CrazyGames 平台存档；游客数据与账号同步遵守官方模块行为。 */
export class CrazyGamesData {
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 读取平台存档值。 */
  getItem(key: string): string | null { this.ready(); return this.sdk.data.getItem(key); }
  /** 写入平台存档值。 */
  setItem(key: string, value: string): void { this.ready(); this.sdk.data.setItem(key, value); }
  /** 移除指定平台存档。 */
  removeItem(key: string): void { this.ready(); this.sdk.data.removeItem(key); }
  /** 清理当前游戏的平台存档。 */
  clear(): void { this.ready(); this.sdk.data.clear(); }
}
