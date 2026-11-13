import type { ChannelCapabilities as SharedChannelCapabilities } from '../../contracts';
import type { WechatApi } from '../../wechat/api';
import type { CrazyGamesApi } from '../../crazygames/api';

/** Three.js 项目中的微信渠道专属能力接口。 */
export interface WechatCapabilities extends SharedChannelCapabilities<WechatApi> { readonly platform: 'wechat-minigame' }
/** Three.js 项目中的 CrazyGames 渠道专属能力接口。 */
export interface CrazyGamesCapabilities extends SharedChannelCapabilities<CrazyGamesApi> { readonly platform: 'crazygames' }
/** 入口识别平台后将对应的明确能力接口注入业务。 */
export type ChannelCapabilities = WechatCapabilities | CrazyGamesCapabilities;
