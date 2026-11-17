#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_ACHIEVEMENT
using TapSDK.Achievement;

namespace AppCreator.ChannelSdk
{
    /// <summary>成就系统的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>按指定步长增加成就进度。</summary>
        public void IncrementAchievement(string id, int step) { ensureReady(); TapTapAchievement.Increment(id, step); }
        /// <summary>解锁指定成就。</summary>
        public void UnlockAchievement(string id) { ensureReady(); TapTapAchievement.Unlock(id); }
        /// <summary>显示官方成就页面。</summary>
        public void ShowAchievements() { ensureReady(); TapTapAchievement.ShowAchievements(); }
        /// <summary>设置官方成就提示显示。</summary>
        public void SetAchievementToastEnable(bool enabled) { ensureReady(); TapTapAchievement.SetToastEnable(enabled); }
        /// <summary>注册成就回调。</summary>
        public void RegisterAchievementCallback(ITapAchievementCallback callback) { ensureReady(); TapTapAchievement.RegisterCallBack(callback); }
        /// <summary>注销原成就回调，允许释放后清理监听。</summary>
        public void UnregisterAchievementCallback(ITapAchievementCallback callback) { TapTapAchievement.UnRegisterCallBack(callback); }
    }
}
#endif
