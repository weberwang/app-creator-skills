import { TaptapMinigameChannel as SharedTaptapMinigameChannel } from '../../taptap-minigame-channel';
import type { TaptapCapabilities } from './channel-capabilities';

/** Cocos Creator 的 Tap 小游戏渠道实现；须由真实导出能力验证宿主。 */
export class TaptapMinigameChannel extends SharedTaptapMinigameChannel implements TaptapCapabilities {}
