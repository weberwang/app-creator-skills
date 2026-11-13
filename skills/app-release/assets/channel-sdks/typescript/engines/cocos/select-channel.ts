import { createChannelSelector as createSharedSelector, type ChannelSelection, type ChannelSelector } from '../../select-channel';
import type { ChannelCapabilities } from './channel-capabilities';
import { WechatMinigameChannel } from './wechat-minigame-channel';
import { CrazyGamesChannel } from './crazygames-channel';

/** 为 Cocos 应用生命周期创建独立渠道选择作用域。 */
export function createChannelSelector(): ChannelSelector {
  return createSharedSelector({
    wechat: (options) => new WechatMinigameChannel(options),
    crazygames: (options) => new CrazyGamesChannel(options),
  });
}

const defaultSelector = createChannelSelector();

/** 使用默认选择作用域复用当前 Cocos 渠道实例。 */
export function selectChannel(selection: ChannelSelection): ChannelCapabilities {
  return defaultSelector.select(selection);
}
