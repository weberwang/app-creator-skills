import { WechatMinigameChannel as SharedWechatMinigameChannel } from '../../wechat-minigame-channel';
import type { WechatCapabilities } from './channel-capabilities';

/** Three.js 的微信小游戏渠道实现；实际导出必须有已验证的宿主适配。 */
export class WechatMinigameChannel extends SharedWechatMinigameChannel implements WechatCapabilities {}
