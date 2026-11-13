import type { ChannelPlatform } from './contracts';
import { CrazyGamesChannel, type CrazyGamesOptions } from './crazygames-channel';
import { WechatMinigameChannel, type WechatMinigameOptions } from './wechat-minigame-channel';

/** 入口返回可按真实渠道区分的具名能力，不把 API 类型擦除为普通 object。 */
export type SelectedChannel = WechatMinigameChannel | CrazyGamesChannel;

/** 从构建支持范围和已核实入口线索选择唯一渠道。 */
export interface ChannelSelection {
  readonly supportedPlatforms: readonly ChannelPlatform[];
  readonly wechat?: WechatMinigameOptions;
  readonly crazygames?: CrazyGamesOptions & { readonly candidate: boolean };
}

/** 引擎入口可注入对应的渠道实现，仍复用同一选择规则。 */
export interface ChannelFactories {
  /** 创建当前引擎的微信实现，不在创建时调用 SDK。 */
  wechat(options: WechatMinigameOptions): WechatMinigameChannel;
  /** 创建当前引擎的 CrazyGames 实现，不在创建时加载脚本。 */
  crazygames(options: CrazyGamesOptions): CrazyGamesChannel;
}

/** 选择结果所依赖的有效配置，避免把可变配置对象本身当作快照。 */
interface SelectionKey {
  readonly platform: ChannelPlatform;
  readonly timeoutMs: number;
  readonly loader: (() => object | Promise<object>) | undefined;
  readonly allowLocalTesting: boolean;
}

/** 应用装配入口持有的选择作用域。 */
export interface ChannelSelector {
  /** 在本应用作用域复用同一有效配置，拒绝未释放的配置切换。 */
  select(selection: ChannelSelection): SelectedChannel;
  /** 释放当前渠道，同时保留尚未结束的真实初始化占用。 */
  dispose(): void;
}

/** 校验宿主线索并记录对当前渠道真正生效的配置。 */
function resolveSelection(selection: ChannelSelection): SelectionKey {
  const wechat = selection.wechat?.verifiedMinigame === true;
  const crazygames = selection.crazygames?.candidate === true;
  if (Number(wechat) + Number(crazygames) !== 1) throw new Error('渠道环境未知或冲突');
  const platform: ChannelPlatform = wechat ? 'wechat-minigame' : 'crazygames';
  if (!selection.supportedPlatforms.includes(platform)) throw new Error('当前构建不支持该渠道');
  if (wechat) {
    const options = selection.wechat as WechatMinigameOptions;
    return { platform, timeoutMs: options.timeoutMs, loader: options.getWechatSdk, allowLocalTesting: false };
  }
  const options = selection.crazygames as CrazyGamesOptions;
  return { platform, timeoutMs: options.timeoutMs, loader: options.loadSdk, allowLocalTesting: options.allowLocalTesting === true };
}

/** 只比较初始化实际使用的配置；宿主线索已由 resolveSelection 验证。 */
function sameSelection(left: SelectionKey, right: SelectionKey): boolean {
  return left.platform === right.platform && left.timeoutMs === right.timeoutMs && left.loader === right.loader && left.allowLocalTesting === right.allowLocalTesting;
}

/** 每个应用生命周期持有独立选择器；重复选择复用实例，配置切换须先释放旧实例。 */
export function createChannelSelector(factories: ChannelFactories = {
  wechat: (options) => new WechatMinigameChannel(options),
  crazygames: (options) => new CrazyGamesChannel(options),
}): ChannelSelector {
  let current: SelectedChannel | undefined;
  let key: SelectionKey | undefined;
  return {
    /** 先验证宿主与当前实例，再决定复用或创建，避免重复官方初始化。 */
    select(selection): SelectedChannel {
      const nextKey = resolveSelection(selection);
      if (current && current.state !== 'disposed') {
        if (key && sameSelection(key, nextKey)) return current;
        throw new Error('当前渠道仍在使用，请先释放后切换配置');
      }
      // 释放无法取消官方异步初始化，必须等待底层任务结束才能重建实例。
      if (current?.hasPendingInitialization) throw new Error('旧渠道初始化尚未结束，不能创建新实例');
      const next = nextKey.platform === 'wechat-minigame'
        ? factories.wechat({ ...selection.wechat as WechatMinigameOptions })
        : factories.crazygames({ ...selection.crazygames as CrazyGamesOptions });
      current = next;
      key = nextKey;
      return next;
    },
    /** 保留实例引用，使旧初始化完成前不能通过重选绕过占用检查。 */
    dispose(): void { current?.dispose(); },
  };
}

/** 简便入口复用本模块的默认选择作用域；多应用或测试应分别创建选择器。 */
const defaultSelector = createChannelSelector();

/** 未知、冲突或不在构建范围内时拒绝猜选，也不会加载任何 SDK。 */
export function selectChannel(selection: ChannelSelection): SelectedChannel {
  return defaultSelector.select(selection);
}
