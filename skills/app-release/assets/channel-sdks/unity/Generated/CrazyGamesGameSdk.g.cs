// 此文件由 UnitySdkBindings 根据官方 SDK 源生成；不要手工修改。
#if APP_CREATOR_CRAZYGAMES_SDK
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using CrazyGames;
namespace AppCreator.ChannelSdk
{
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.Game 的官方公开方法。</summary>
    public sealed partial class CrazyGamesGameSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesGameSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>读取官方渠道属性 IsInstantJoin。</summary>
        public bool IsInstantJoin { get { ensureReady(); return global::CrazyGames.CrazySDK.Game.IsInstantJoin; } }
        /// <summary>读取官方渠道属性 IsInstantMultiplayer。</summary>
        public bool IsInstantMultiplayer { get { ensureReady(); return global::CrazyGames.CrazySDK.Game.IsInstantMultiplayer; } }
        /// <summary>读取官方渠道属性 IsOfflineMode。</summary>
        public bool IsOfflineMode { get { ensureReady(); return global::CrazyGames.CrazySDK.Game.IsOfflineMode; } }
        /// <summary>读取官方渠道属性 Settings。</summary>
        public GameSettings Settings { get { ensureReady(); return global::CrazyGames.CrazySDK.Game.Settings; } }
        /// <summary>读取官方渠道属性 Quality。</summary>
        public GameQuality Quality { get { ensureReady(); return global::CrazyGames.CrazySDK.Game.Quality; } }
        /// <summary>读取官方渠道属性 InviteParams。</summary>
        public Dictionary<string, string> InviteParams { get { ensureReady(); return global::CrazyGames.CrazySDK.Game.InviteParams; } }
        /// <summary>调用官方 AddJoinRoomListener，保留其原始参数、返回和回调语义。</summary>
        public void AddJoinRoomListener(Action<Dictionary<string, string>> listener) { ensureReady(); global::CrazyGames.CrazySDK.Game.AddJoinRoomListener(listener); }
        /// <summary>调用官方 AddQualityChangeListener，保留其原始参数、返回和回调语义。</summary>
        public void AddQualityChangeListener(Action<GameQuality> listener) { ensureReady(); global::CrazyGames.CrazySDK.Game.AddQualityChangeListener(listener); }
        /// <summary>调用官方 AddSettingsChangeListener，保留其原始参数、返回和回调语义。</summary>
        public void AddSettingsChangeListener(Action<GameSettings> listener) { ensureReady(); global::CrazyGames.CrazySDK.Game.AddSettingsChangeListener(listener); }
        /// <summary>调用官方 ClearGameContext，保留其原始参数、返回和回调语义。</summary>
        public void ClearGameContext() { ensureReady(); global::CrazyGames.CrazySDK.Game.ClearGameContext(); }
        /// <summary>调用官方 GameplayStart，保留其原始参数、返回和回调语义。</summary>
        public void GameplayStart() { ensureReady(); global::CrazyGames.CrazySDK.Game.GameplayStart(); }
        /// <summary>调用官方 GameplayStop，保留其原始参数、返回和回调语义。</summary>
        public void GameplayStop() { ensureReady(); global::CrazyGames.CrazySDK.Game.GameplayStop(); }
        /// <summary>调用官方 GetInviteLinkParameter，保留其原始参数、返回和回调语义。</summary>
        public string GetInviteLinkParameter(string paramName) { ensureReady(); return global::CrazyGames.CrazySDK.Game.GetInviteLinkParameter(paramName); }
        /// <summary>调用官方 HappyTime，保留其原始参数、返回和回调语义。</summary>
        public void HappyTime() { ensureReady(); global::CrazyGames.CrazySDK.Game.HappyTime(); }
        /// <summary>调用官方 HideInviteButton，保留其原始参数、返回和回调语义。</summary>
        public void HideInviteButton() { ensureReady(); global::CrazyGames.CrazySDK.Game.HideInviteButton(); }
        /// <summary>调用官方 InviteLink，保留其原始参数、返回和回调语义。</summary>
        public string InviteLink(Dictionary<string, string> parameters) { ensureReady(); return global::CrazyGames.CrazySDK.Game.InviteLink(parameters); }
        /// <summary>调用官方 LeftRoom，保留其原始参数、返回和回调语义。</summary>
        public void LeftRoom() { ensureReady(); global::CrazyGames.CrazySDK.Game.LeftRoom(); }
        /// <summary>调用官方 RemoveJoinRoomListener，保留其原始参数、返回和回调语义。</summary>
        public void RemoveJoinRoomListener(Action<Dictionary<string, string>> listener) { ensureReady(); global::CrazyGames.CrazySDK.Game.RemoveJoinRoomListener(listener); }
        /// <summary>调用官方 RemoveQualityChangeListener，保留其原始参数、返回和回调语义。</summary>
        public void RemoveQualityChangeListener(Action<GameQuality> listener) { ensureReady(); global::CrazyGames.CrazySDK.Game.RemoveQualityChangeListener(listener); }
        /// <summary>调用官方 RemoveSettingsChangeListener，保留其原始参数、返回和回调语义。</summary>
        public void RemoveSettingsChangeListener(Action<GameSettings> listener) { ensureReady(); global::CrazyGames.CrazySDK.Game.RemoveSettingsChangeListener(listener); }
        /// <summary>调用官方 ReportGameCompletedPercentage，保留其原始参数、返回和回调语义。</summary>
        public void ReportGameCompletedPercentage(int percentage) { ensureReady(); global::CrazyGames.CrazySDK.Game.ReportGameCompletedPercentage(percentage); }
        /// <summary>调用官方 SetGameContext，保留其原始参数、返回和回调语义。</summary>
        public void SetGameContext(Dictionary<string, string> context) { ensureReady(); global::CrazyGames.CrazySDK.Game.SetGameContext(context); }
        /// <summary>调用官方 ShowInviteButton，保留其原始参数、返回和回调语义。</summary>
        public string ShowInviteButton(Dictionary<string, string> parameters) { ensureReady(); return global::CrazyGames.CrazySDK.Game.ShowInviteButton(parameters); }
        /// <summary>调用官方 UpdateRoom，保留其原始参数、返回和回调语义。</summary>
        public void UpdateRoom(UpdateRoomInput input) { ensureReady(); global::CrazyGames.CrazySDK.Game.UpdateRoom(input); }
    }
}
#endif
