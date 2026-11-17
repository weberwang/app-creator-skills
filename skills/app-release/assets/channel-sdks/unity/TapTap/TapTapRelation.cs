#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_RELATION
using System;
using TapSDK.Relation;

namespace AppCreator.ChannelSdk
{
    /// <summary>好友与邀请的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>打开好友消息页面。</summary>
        public void StartMessenger() { ensureReady(); TapTapRelation.StartMessenger(); }
        /// <summary>准备好友关系服务。</summary>
        public void PrepareRelation() { ensureReady(); TapTapRelation.Prepare(); }
        /// <summary>打开邀请游戏界面。</summary>
        public void InviteGame() { ensureReady(); TapTapRelation.InviteGame(); }
        /// <summary>邀请好友加入指定队伍。</summary>
        public void InviteTeam(string teamId) { ensureReady(); TapTapRelation.InviteTeam(teamId); }
        /// <summary>打开 TapTap 用户资料。</summary>
        public void ShowTapUserProfile(string openId, string unionId) { ensureReady(); TapTapRelation.ShowTapUserProfile(openId, unionId); }
        /// <summary>读取新粉丝数量。</summary>
        public void GetNewFansCount(Action<int> callback) { ensureReady(); TapTapRelation.GetNewFansCount(callback); }
        /// <summary>读取未读消息数量。</summary>
        public void GetUnreadMessageCount(Action<int> callback) { ensureReady(); TapTapRelation.GetUnreadMessageCount(callback); }
        /// <summary>注册关系事件回调。</summary>
        public void RegisterRelationCallback(ITapTapRelationCallback callback) { ensureReady(); TapTapRelation.RegisterRelationCallback(callback); }
        /// <summary>移除原关系事件回调。</summary>
        public void UnregisterRelationCallback(ITapTapRelationCallback callback) { TapTapRelation.UnregisterRelationCallback(callback); }
        /// <summary>注册邀请事件回调。</summary>
        public void RegisterRelationInviteCallback(ITapTapRelationInviteCallback callback) { ensureReady(); TapTapRelation.RegisterRelationInviteCallback(callback); }
        /// <summary>移除原邀请事件回调。</summary>
        public void UnregisterRelationInviteCallback(ITapTapRelationInviteCallback callback) { TapTapRelation.UnregisterRelationInviteCallback(callback); }
        /// <summary>由持有关系服务的业务释放官方对象。</summary>
        public void DestroyRelation() { Cleanup(TapTapRelation.Destroy); }
    }
}
#endif
