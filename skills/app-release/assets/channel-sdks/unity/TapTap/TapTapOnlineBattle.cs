#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_ONLINE_BATTLE && !UNITY_EDITOR_OSX
using System.Collections.Generic;
using System.Threading.Tasks;
using TapSDK.OnlineBattle;

namespace AppCreator.ChannelSdk
{
    /// <summary>多人联机的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>连接官方联机服务。</summary>
        public Task<string> ConnectBattle() { ensureReady(); return TapTapOnlineBattle.Connect(); }
        /// <summary>断开官方联机连接。</summary>
        public Task DisconnectBattle() { return CleanupTask(TapTapOnlineBattle.Disconnect); }
        /// <summary>创建房间。</summary>
        public Task<RoomInfo> CreateRoom(CreateRoomConfig config) { ensureReady(); return TapTapOnlineBattle.CreateRoom(config); }
        /// <summary>按配置匹配房间。</summary>
        public Task<RoomInfo> MatchRoom(MatchRoomConfig config) { ensureReady(); return TapTapOnlineBattle.MatchRoom(config); }
        /// <summary>按类型和分页读取房间列表。</summary>
        public Task<RoomListData> GetRoomList(string type, int offset = 0, int limit = 20) { ensureReady(); return TapTapOnlineBattle.GetRoomList(type, offset, limit); }
        /// <summary>加入指定房间。</summary>
        public Task<RoomInfo> JoinRoom(string id, PlayerConfig config) { ensureReady(); return TapTapOnlineBattle.JoinRoom(id, config); }
        /// <summary>离开当前房间。</summary>
        public Task LeaveRoom() { return CleanupTask(TapTapOnlineBattle.LeaveRoom); }
        /// <summary>更新玩家自定义状态。</summary>
        public Task UpdatePlayerCustomStatus(int status) { ensureReady(); return TapTapOnlineBattle.UpdatePlayerCustomStatus(status); }
        /// <summary>更新玩家自定义属性。</summary>
        public Task UpdatePlayerCustomProperties(string properties) { ensureReady(); return TapTapOnlineBattle.UpdatePlayerCustomProperties(properties); }
        /// <summary>更新房间名称与属性。</summary>
        public Task UpdateRoomProperties(string name, string properties) { ensureReady(); return TapTapOnlineBattle.UpdateRoomProperties(name, properties); }
        /// <summary>启动房间帧同步。</summary>
        public Task StartFrameSync() { ensureReady(); return TapTapOnlineBattle.StartFrameSync(); }
        /// <summary>发送当前玩家的帧输入。</summary>
        public Task SendFrameInput(string data) { ensureReady(); return TapTapOnlineBattle.SendFrameInput(data); }
        /// <summary>使用对局种子创建官方一致性随机数生成器。</summary>
        public TapSDK.OnlineBattle.RandomNumberGenerator NewBattleRandomNumberGenerator(int seed) { ensureReady(); return TapTapOnlineBattle.NewRandomNumberGenerator(seed); }
        /// <summary>停止房间帧同步。</summary>
        public Task StopFrameSync() { return CleanupTask(TapTapOnlineBattle.StopFrameSync); }
        /// <summary>将指定玩家移出房间。</summary>
        public Task KickRoomPlayer(string playerId) { ensureReady(); return TapTapOnlineBattle.KickRoomPlayer(playerId); }
        /// <summary>向房间或指定玩家发送消息。</summary>
        public Task SendBattleMessage(string message, int type = 0, List<string> receivers = null) { ensureReady(); return TapTapOnlineBattle.SendCustomMessage(message, type, receivers); }
        /// <summary>注册联机事件。</summary>
        public void RegisterOnlineBattleCallback(ITapOnlineBattleCallback callback) { ensureReady(); TapTapOnlineBattle.RegisterOnlineBattleCallback(callback); }
        /// <summary>注销原联机事件，允许释放后清理监听。</summary>
        public void UnregisterOnlineBattleCallback(ITapOnlineBattleCallback callback) { TapTapOnlineBattle.UnRegisterOnlineBattleCallback(callback); }
    }
}
#endif
