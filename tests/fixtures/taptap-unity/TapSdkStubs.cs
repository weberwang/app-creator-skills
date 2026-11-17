using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

// 以下替身只供离线验证，不包含官方 SDK 实现或网络请求。
namespace TapSDK.Core
{
    /// <summary>模拟已确认的初始化回调合同。</summary>
    public interface ITapInitCallback
    {
        /// <summary>模拟初始化成功回调。</summary>
        void OnInitSuccess();
        /// <summary>模拟初始化失败回调。</summary>
        void OnInitFail(int code, string message);
    }
    /// <summary>模拟官方模块配置合同。</summary>
    public interface TapTapSdkBaseOptions { string moduleName { get; } }
    /// <summary>模拟官方地区枚举。</summary>
    public enum TapTapRegionType { CN, Global }
    /// <summary>模拟官方语言枚举。</summary>
    public enum TapTapLanguageType { Auto }
    /// <summary>模拟官方核心配置字段。</summary>
    public sealed class TapTapSdkOptions : TapTapSdkBaseOptions
    {
        public string clientId, clientToken, clientPublicKey, gameVersion;
        public TapTapRegionType region;
        public TapTapLanguageType preferredLanguage;
        public bool enableLog;
        public int screenOrientation;
        public string moduleName => "core";
    }
    /// <summary>模拟官方事件配置。</summary>
    public sealed class TapTapEventOptions : TapTapSdkBaseOptions
    {
        public bool enableTapTapEvent = true;
        public string moduleName => "event";
    }
    /// <summary>模拟官方异步初始化与监听注册。</summary>
    public static class TapTapSDK
    {
        public static ITapInitCallback Callback;
        public static int Calls;
        public static bool ThrowOnRegister;
        public static TapTapSdkOptions Options;
        public static TapTapSdkBaseOptions[] Modules;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Init(TapTapSdkOptions options, TapTapSdkBaseOptions[] modules) { Calls++; Options = options; Modules = modules; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void AddInitCallback(ITapInitCallback callback) { Callback = callback; if (ThrowOnRegister) throw new InvalidOperationException("注册结果未知"); }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RemoveInitCallback(ITapInitCallback callback) { if (Callback == callback) Callback = null; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UpdateLanguage(TapTapLanguageType language) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<bool> IsLaunchedFromTapTapPC() => Task.FromResult(true);
    }
    /// <summary>模拟统计入口，避免连接真实分析服务。</summary>
    public static class TapTapEvent
    {
        public static int ClearUserCalls;
        public static int ClearCommonCalls;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SetUserID(string id) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SetUserID(string id, Dictionary<string, object> properties) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static string GetDeviceId() => "device";
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ClearUser() { ClearUserCalls++; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void LogEvent(string name, Dictionary<string, object> properties) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void DeviceInitialize(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void DeviceUpdate(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void DeviceAdd(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UserInitialize(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UserUpdate(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UserAdd(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void AddCommonProperty(string key, string value) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void AddCommon(Dictionary<string, object> p) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ClearCommonProperty(string key) { ClearCommonCalls++; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ClearCommonProperties(string[] keys) { ClearCommonCalls++; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ClearAllCommonProperties() { ClearCommonCalls++; }
        public static Func<Dictionary<string, object>> DynamicCallback;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterDynamicProperties(Func<Dictionary<string, object>> callback) { DynamicCallback = callback; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SetOAID(string value) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void LogDeviceLoginEvent() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void LogPurchasedEvent(string order, string product, long amount, string currency, string method, Dictionary<string, object> properties) { }
    }
}
namespace TapSDK.Login
{
    /// <summary>模拟官方账号。</summary>
    public sealed class TapTapAccount { }
    /// <summary>模拟官方登录，允许验证成功、取消与登出。</summary>
    public sealed class TapTapLogin
    {
        public static TapTapLogin Instance { get; } = new TapTapLogin();
        public string[] Scopes;
        public bool Cancel;
        public int LoginCalls;
        public int LogoutCount;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public Task<TapTapAccount> LoginWithScopes(string[] scopes) { LoginCalls++; Scopes = scopes; return Cancel ? Task.FromCanceled<TapTapAccount>(new CancellationToken(true)) : Task.FromResult(new TapTapAccount()); }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public Task<TapTapAccount> GetCurrentTapAccount() => Task.FromResult(new TapTapAccount());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public void Logout() { LogoutCount++; }
    }
}
namespace TapSDK.Compliance
{
    /// <summary>模拟实名消费校验结果。</summary>
    public sealed class CheckPayResult { }
    /// <summary>模拟实名和防沉迷合同。</summary>
    public static class TapTapCompliance
    {
        public static int ExitCalls;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterComplianceCallback(Action<int,string> c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Startup(string userId) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Exit() { ExitCalls++; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<int> GetAgeRange() => Task.FromResult(18);
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<int> GetRemainingTime() => Task.FromResult(10);
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<string> GetCurrentAccessToken() => Task.FromResult("test");
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void CheckPaymentLimit(long amount, Action<CheckPayResult> success, Action<string> failure) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SubmitPayment(long amount, Action success, Action<string> failure) { }
    }
}
namespace TapSDK.License
{
    /// <summary>模拟正版验证回调。</summary>
    public interface ITapLicenseCallback { }
    /// <summary>模拟 DLC 回调。</summary>
    public interface ITapDlcCallback { }
    /// <summary>模拟正版验证 API。</summary>
    public static class TapTapLicense
    {
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterLicenseCallBack(ITapLicenseCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterDLCCallback(ITapDlcCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void CheckLicense(bool force = false) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void QueryDLC(string[] dlcs) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void PurchaseDLC(string dlc) { }
    }
}
namespace TapSDK.CloudSave
{
    /// <summary>模拟存档元数据。</summary>
    public sealed class ArchiveMetadata { }
    /// <summary>模拟存档数据。</summary>
    public sealed class ArchiveData { }
    /// <summary>模拟存档回调。</summary>
    public interface ITapCloudSaveCallback { }
    /// <summary>模拟官方存档 API。</summary>
    public static class TapTapCloudSave
    {
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterCloudSaveCallback(ITapCloudSaveCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UnregisterCloudSaveCallback(ITapCloudSaveCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<ArchiveData> CreateArchive(ArchiveMetadata m, string f, string c) => Task.FromResult(new ArchiveData());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<ArchiveData> UpdateArchive(string id, ArchiveMetadata m, string f, string c) => Task.FromResult(new ArchiveData());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<ArchiveData> DeleteArchive(string id) => Task.FromResult(new ArchiveData());
        public static Task<List<ArchiveData>> GetArchiveList() => Task.FromResult(new List<ArchiveData>());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<byte[]> GetArchiveData(string id, string f) => Task.FromResult(new byte[0]);
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<byte[]> GetArchiveCover(string id, string f) => Task.FromResult(new byte[0]);
    }
}
namespace TapSDK.Achievement
{
    /// <summary>模拟成就回调。</summary>
    public interface ITapAchievementCallback { }
    /// <summary>模拟成就 API。</summary>
    public static class TapTapAchievement
    {
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Increment(string id, int step) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Unlock(string id) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ShowAchievements() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SetToastEnable(bool value) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterCallBack(ITapAchievementCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UnRegisterCallBack(ITapAchievementCallback c) { }
    }
}
namespace TapSDK.Leaderboard
{
    /// <summary>模拟成绩提交请求。</summary>
    public sealed class SubmitScoresRequest { /// <summary>模拟成绩条目。</summary>
        public sealed class ScoreItem { } }
    /// <summary>模拟提交结果。</summary>
    public sealed class SubmitScoresResponse { }
    /// <summary>模拟榜单成绩。</summary>
    public sealed class LeaderboardScoreResponse { }
    /// <summary>模拟玩家成绩。</summary>
    public sealed class UserScoreResponse { }
    /// <summary>模拟榜单回调。</summary>
    public interface ITapTapLeaderboardCallback { }
    /// <summary>模拟榜单分享回调。</summary>
    public interface ITapTapLeaderboardShareCallback { }
    /// <summary>模拟官方榜单 API。</summary>
    public static class TapTapLeaderboard
    {
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void OpenLeaderboard(string id, string collection) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ShowTapUserProfile(string openId, string unionId) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<SubmitScoresResponse> SubmitScores(List<SubmitScoresRequest.ScoreItem> s) => Task.FromResult(new SubmitScoresResponse());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<LeaderboardScoreResponse> LoadLeaderboardScores(string id, string c, string n, string p) => Task.FromResult(new LeaderboardScoreResponse());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<UserScoreResponse> LoadCurrentPlayerLeaderboardScore(string id, string c, string p) => Task.FromResult(new UserScoreResponse());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<LeaderboardScoreResponse> LoadPlayerCenteredScores(string id, string c, string p, int? n) => Task.FromResult(new LeaderboardScoreResponse());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterLeaderboardCallback(ITapTapLeaderboardCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UnregisterLeaderboardCallback(ITapTapLeaderboardCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SetShareCallback(ITapTapLeaderboardShareCallback c) { }
    }
}
namespace TapSDK.Relation
{
    /// <summary>模拟关系回调。</summary>
    public interface ITapTapRelationCallback { }
    /// <summary>模拟邀请回调。</summary>
    public interface ITapTapRelationInviteCallback { }
    /// <summary>模拟官方好友 API。</summary>
    public static class TapTapRelation
    {
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void StartMessenger() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Prepare() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void InviteGame() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void InviteTeam(string id) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void ShowTapUserProfile(string o, string u) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void GetNewFansCount(Action<int> c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void GetUnreadMessageCount(Action<int> c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterRelationCallback(ITapTapRelationCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UnregisterRelationCallback(ITapTapRelationCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterRelationInviteCallback(ITapTapRelationInviteCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UnregisterRelationInviteCallback(ITapTapRelationInviteCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Destroy() { }
    }
}
namespace TapSDK.OnlineBattle
{
    /// <summary>模拟创建配置。</summary>
    public sealed class CreateRoomConfig { }
    /// <summary>模拟匹配配置。</summary>
    public sealed class MatchRoomConfig { }
    /// <summary>模拟玩家配置。</summary>
    public sealed class PlayerConfig { }
    /// <summary>模拟房间信息。</summary>
    public sealed class RoomInfo { }
    /// <summary>模拟房间列表。</summary>
    public sealed class RoomListData { }
    /// <summary>模拟官方对局随机数生成器。</summary>
    public sealed class RandomNumberGenerator { }
    /// <summary>模拟联机回调。</summary>
    public interface ITapOnlineBattleCallback { }
    /// <summary>模拟官方联机 API。</summary>
    public static class TapTapOnlineBattle
    {
        public static TaskCompletionSource<bool> DisconnectCompletion;
        public static int DisconnectCalls;
        public static int LeaveRoomCalls;
        public static int StopFrameSyncCalls;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<string> Connect() => Task.FromResult("connected");
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task Disconnect() { DisconnectCalls++; return DisconnectCompletion?.Task ?? Task.CompletedTask; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<RoomInfo> CreateRoom(CreateRoomConfig c) => Task.FromResult(new RoomInfo());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<RoomInfo> MatchRoom(MatchRoomConfig c) => Task.FromResult(new RoomInfo());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<RoomListData> GetRoomList(string t, int offset = 0, int limit = 20) => Task.FromResult(new RoomListData());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task<RoomInfo> JoinRoom(string id, PlayerConfig c) => Task.FromResult(new RoomInfo());
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task LeaveRoom() { LeaveRoomCalls++; return Task.CompletedTask; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task UpdatePlayerCustomStatus(int s) => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task UpdatePlayerCustomProperties(string p) => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task UpdateRoomProperties(string n, string p) => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task StartFrameSync() => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task SendFrameInput(string d) => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static RandomNumberGenerator NewRandomNumberGenerator(int seed) => new RandomNumberGenerator();
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task StopFrameSync() { StopFrameSyncCalls++; return Task.CompletedTask; }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task KickRoomPlayer(string p) => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static Task SendCustomMessage(string m, int type = 0, List<string> receivers = null) => Task.CompletedTask;
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void RegisterOnlineBattleCallback(ITapOnlineBattleCallback c) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void UnRegisterOnlineBattleCallback(ITapOnlineBattleCallback c) { }
    }
}
namespace TapSDK.Moment
{
    /// <summary>模拟发布元数据。</summary>
    public sealed class PublishMetaData { }
    /// <summary>模拟官方动态 API。</summary>
    public static class TapTapMoment
    {
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void open() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void OpenScene(string id) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Publish(PublishMetaData d) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void Close() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void CloseWithTitle(string t, string d) { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void FetchNotification() { }
        /// <summary>模拟官方调用，仅用于离线验证。</summary>
        public static void SetCallback(Action<int,string> c) { }
    }
}
namespace TapSDK.Update { /// <summary>模拟更新 API。</summary>
    public static class TapTapUpdate
    {
        /// <summary>模拟更新调用。</summary>
        public static void UpdateGame(Action c) { }
        /// <summary>模拟强制更新检查。</summary>
        public static void CheckForceUpdate() { }
    } }
namespace TapSDK.Review { /// <summary>模拟评价 API。</summary>
    public static class TapTapReview
    {
        /// <summary>模拟打开评价页面。</summary>
        public static void OpenReview() { }
    } }
namespace TapSDK.Rep { /// <summary>模拟资源置换 API。</summary>
    public static class TapTapRep
    {
        /// <summary>模拟打开资源置换链接。</summary>
        public static void Open(string u, Action<int,string> c) { }
    } }
namespace TapSDK.IAP
{
    /// <summary>模拟官方购买模块。</summary>
    public sealed class TapPurchasingModule { public static TapPurchasingModule Instance { get; } = new TapPurchasingModule(); }
    /// <summary>模拟官方商店配置接口。</summary>
    public interface ITapTapStoreConfiguration
    {
        /// <summary>模拟配置应用身份。</summary>
        void SetClientId(string value);
        /// <summary>模拟配置客户端令牌。</summary>
        void SetClientToken(string value);
        /// <summary>模拟配置地区。</summary>
        void SetRegionCode(int value);
        /// <summary>模拟配置诊断日志。</summary>
        void SetEnableLog(bool value);
        /// <summary>模拟配置研发模式。</summary>
        void SetIsRNDMode(bool value);
    }
}
