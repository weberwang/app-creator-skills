#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_LEADERBOARD
using System.Collections.Generic;
using System.Threading.Tasks;
using TapSDK.Leaderboard;

namespace AppCreator.ChannelSdk
{
    /// <summary>排行榜的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>打开指定榜单和集合。</summary>
        public void OpenLeaderboard(string id, string collection) { ensureReady(); TapTapLeaderboard.OpenLeaderboard(id, collection); }
        /// <summary>通过排行榜模块打开指定用户资料。</summary>
        public void ShowLeaderboardUserProfile(string openId, string unionId) { ensureReady(); TapTapLeaderboard.ShowTapUserProfile(openId, unionId); }
        /// <summary>批量提交官方成绩对象。</summary>
        public Task<SubmitScoresResponse> SubmitScores(List<SubmitScoresRequest.ScoreItem> scores) { ensureReady(); return TapTapLeaderboard.SubmitScores(scores); }
        /// <summary>读取指定榜单及分页。</summary>
        public Task<LeaderboardScoreResponse> LoadLeaderboardScores(string id, string collection, string nextPage, string periodToken)
        { ensureReady(); return TapTapLeaderboard.LoadLeaderboardScores(id, collection, nextPage, periodToken); }
        /// <summary>读取当前玩家的榜单成绩。</summary>
        public Task<UserScoreResponse> LoadCurrentPlayerLeaderboardScore(string id, string collection, string periodToken)
        { ensureReady(); return TapTapLeaderboard.LoadCurrentPlayerLeaderboardScore(id, collection, periodToken); }
        /// <summary>读取当前玩家附近的榜单成绩。</summary>
        public Task<LeaderboardScoreResponse> LoadPlayerCenteredScores(string id, string collection, string periodToken, int? maxCount)
        { ensureReady(); return TapTapLeaderboard.LoadPlayerCenteredScores(id, collection, periodToken, maxCount); }
        /// <summary>注册榜单事件回调。</summary>
        public void RegisterLeaderboardCallback(ITapTapLeaderboardCallback callback) { ensureReady(); TapTapLeaderboard.RegisterLeaderboardCallback(callback); }
        /// <summary>注销原榜单回调，允许释放后清理监听。</summary>
        public void UnregisterLeaderboardCallback(ITapTapLeaderboardCallback callback) { TapTapLeaderboard.UnregisterLeaderboardCallback(callback); }
        /// <summary>设置官方榜单分享回调。</summary>
        public void SetLeaderboardShareCallback(ITapTapLeaderboardShareCallback callback) { ensureReady(); TapTapLeaderboard.SetShareCallback(callback); }
    }
}
#endif
