import type { CatalogPage, CrazyGamesRuntime, InventoryPage, PurchaseResult, ReadyCheck, StorePageOptions } from './types';

/** CrazyGames Store 平台内购接口；可用性由项目账号与平台资格决定。 */
export class CrazyGamesStore {
  /** 注入已选择且完成初始化的官方 SDK。 */
  constructor(private readonly sdk: CrazyGamesRuntime, private readonly ready: ReadyCheck) {}
  /** 显式选择商店沙箱；不得将本地模拟交易作为真实发货证据。 */
  setSandbox(enabled: boolean): void { this.ready(); this.sdk.store.setSandbox(enabled); }
  /** 获取当前玩家实际可见的商品与定价。 */
  getCatalogItems(options?: StorePageOptions): Promise<CatalogPage> { this.ready(); return this.sdk.store.getCatalogItems(options); }
  /** 获取平台库存。 */
  getPlayerInventory(options?: StorePageOptions): Promise<InventoryPage> { this.ready(); return this.sdk.store.getPlayerInventory(options); }
  /** 请求购买；成功只说明支付流程完成，不能直接当作可信发货凭据。 */
  buyItem(itemId: string): Promise<PurchaseResult> { this.ready(); return this.sdk.store.buyItem(itemId); }
  /** 按平台合同消耗已拥有的商品。 */
  consumeItem(sku: string, quantity: number): Promise<void> { this.ready(); return this.sdk.store.consumeItem(sku, quantity); }
  /** 返回必须由服务端或平台库存再核验的购买结果。 */
  async purchase(itemId: string): Promise<{ status: 'payment_completed'; requiresVerification: true; result: PurchaseResult }> {
    this.ready();
    // 已受理的交易结果不能因为页面或适配器释放而丢失。
    const result = await this.sdk.store.buyItem(itemId);
    return { status: 'payment_completed', requiresVerification: true, result };
  }
}
