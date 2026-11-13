import { WechatMinigameChannel as SharedWechatMinigameChannel } from '../../wechat-minigame-channel';
import type { WechatCapabilities } from './channel-capabilities';

/** Cocos Creator 的微信小游戏渠道实现。 */
export class WechatMinigameChannel extends SharedWechatMinigameChannel implements WechatCapabilities {}
