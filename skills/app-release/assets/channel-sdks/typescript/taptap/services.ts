import type { TapCallbacks } from './types';

/** 单个云存档的业务元数据。 */
export interface TapArchiveMetadata { name: string; summary: string; extra?: string; playtime?: number }
/** 云存档创建或更新返回的稳定存档 ID 与变化的文件 ID。 */
export interface TapArchiveIdentity { uuid: string; fileId: string }
/** 云存档详情；时间戳为秒。 */
export interface TapArchiveDetail extends TapArchiveIdentity, TapArchiveMetadata { saveSize: number; coverSize: number; createdTime: number; modifiedTime: number }
/** 云存档创建参数；文件必须在宿主文件系统中真实存在。 */
export interface TapCreateArchiveOptions extends TapCallbacks<TapArchiveIdentity> { archiveMetaData: TapArchiveMetadata; archiveFilePath: string; archiveCoverPath?: string }
/** 更新已有存档时携带平台返回的 UUID。 */
export interface TapUpdateArchiveOptions extends TapCreateArchiveOptions { archiveUUID: string }
/** 列出用户所有云存档。 */
export interface TapArchiveListOptions extends TapCallbacks<{ saves: TapArchiveDetail[] }> {}
/** 将云存档文件下载至本地或平台临时路径。 */
export interface TapArchiveDownloadOptions extends TapCallbacks<{ filePath: string }> { archiveUUID: string; archiveFileId: string; targetFilePath?: string }
/** 删除指定云存档。 */
export interface TapArchiveDeleteOptions extends TapCallbacks<{ uuid: string }> { archiveUUID: string }
/** 宿主提供的云存档管理器；冲突决策和文件读写属于游戏业务。 */
export interface TapCloudSaveManager {
  /** 创建云存档。 */
  createArchive(options: TapCreateArchiveOptions): void;
  /** 更新指定存档。 */
  updateArchive(options: TapUpdateArchiveOptions): void;
  /** 获取存档列表。 */
  getArchiveList(options: TapArchiveListOptions): void;
  /** 下载存档文件。 */
  getArchiveData(options: TapArchiveDownloadOptions): void;
  /** 下载存档封面。 */
  getArchiveCover(options: TapArchiveDownloadOptions): void;
  /** 删除指定存档。 */
  deleteArchive(options: TapArchiveDeleteOptions): void;
}

/** 排行榜 API 使用与一般小游戏接口不同的成功和错误回调。 */
export interface TapRankCallback<T> { onSuccess?: (result: T) => void; onFailure?: (code: number, message: string) => void }
/** 当前可见榜单范围；好友榜受平台隐私授权约束。 */
export type TapRankCollection = 'public' | 'friends';
/** 排行榜条目的玩家公开信息。 */
export interface TapRankUser { name: string; openid: string; unionid: string; avatar: Record<string, unknown> }
/** 排行榜返回的分数与排名。 */
export interface TapRankScore { rank: number; rankDisplay: string; score: number; scoreDisplay: string; user: TapRankUser }
/** 排行榜条目列表及分页标记。 */
export interface TapRankPage { leaderboard: Record<string, unknown>; scores: TapRankScore[]; isTruncated: boolean; nextContinuationToken: string }
/** 当前玩家榜单成绩。 */
export interface TapCurrentRank { currentUserScore: TapRankScore; leaderboard: Record<string, unknown> }
/** 打开平台榜单页面。 */
export interface TapOpenLeaderboardOptions { leaderboardId: string; collection?: TapRankCollection; callback?: TapRankCallback<unknown> }
/** 提交分数，平台限定单次最多五个。 */
export interface TapSubmitScoresOptions { scores: Array<{ leaderboardId: string; score: number }>; callback?: TapRankCallback<{ results: unknown[] }> }
/** 查询指定榜单中当前玩家的分数。 */
export interface TapCurrentRankOptions { leaderboardId: string; collection?: TapRankCollection; periodToken?: string; callback?: TapRankCallback<TapCurrentRank> }
/** 使用 continuationToken 续取排行榜，不能混用其他平台的分页参数。 */
export interface TapRankPageOptions { leaderboardId: string; collection?: TapRankCollection; periodToken?: string; continuationToken?: string; maxSize?: number; callback?: TapRankCallback<TapRankPage> }
/** 官方小游戏榜单管理器，保留异于普通回调的 callback 契约。 */
export interface TapLeaderboardManager {
  /** 打开平台榜单页面。 */
  openLeaderboard(options: TapOpenLeaderboardOptions): void;
  /** 批量提交分数。 */
  submitScores(options: TapSubmitScoresOptions): void;
  /** 分页读取榜单。 */
  loadLeaderboardScores(options: TapRankPageOptions): void;
  /** 读取当前玩家分数。 */
  loadCurrentPlayerLeaderboardScore(options: TapCurrentRankOptions): void;
}
