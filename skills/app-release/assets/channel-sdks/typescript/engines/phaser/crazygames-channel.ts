import { CrazyGamesChannel as SharedCrazyGamesChannel } from '../../crazygames-channel';
import type { CrazyGamesCapabilities } from './channel-capabilities';

/** Phaser 的 CrazyGames HTML5 SDK 渠道实现。 */
export class CrazyGamesChannel extends SharedCrazyGamesChannel implements CrazyGamesCapabilities {}
