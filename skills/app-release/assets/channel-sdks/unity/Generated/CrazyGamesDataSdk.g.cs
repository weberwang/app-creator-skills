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
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.Data 的官方公开方法。</summary>
    public sealed partial class CrazyGamesDataSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesDataSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>调用官方 DeleteAll，保留其原始参数、返回和回调语义。</summary>
        public void DeleteAll() { ensureReady(); global::CrazyGames.CrazySDK.Data.DeleteAll(); }
        /// <summary>调用官方 DeleteKey，保留其原始参数、返回和回调语义。</summary>
        public void DeleteKey(string key) { ensureReady(); global::CrazyGames.CrazySDK.Data.DeleteKey(key); }
        /// <summary>调用官方 GetFloat，保留其原始参数、返回和回调语义。</summary>
        public float GetFloat(string key) { ensureReady(); return global::CrazyGames.CrazySDK.Data.GetFloat(key); }
        /// <summary>调用官方 GetFloat，保留其原始参数、返回和回调语义。</summary>
        public float GetFloat(string key, float defaultValue) { ensureReady(); return global::CrazyGames.CrazySDK.Data.GetFloat(key, defaultValue); }
        /// <summary>调用官方 GetInt，保留其原始参数、返回和回调语义。</summary>
        public int GetInt(string key) { ensureReady(); return global::CrazyGames.CrazySDK.Data.GetInt(key); }
        /// <summary>调用官方 GetInt，保留其原始参数、返回和回调语义。</summary>
        public int GetInt(string key, int defaultValue) { ensureReady(); return global::CrazyGames.CrazySDK.Data.GetInt(key, defaultValue); }
        /// <summary>调用官方 GetString，保留其原始参数、返回和回调语义。</summary>
        public string GetString(string key) { ensureReady(); return global::CrazyGames.CrazySDK.Data.GetString(key); }
        /// <summary>调用官方 GetString，保留其原始参数、返回和回调语义。</summary>
        public string GetString(string key, string defaultValue) { ensureReady(); return global::CrazyGames.CrazySDK.Data.GetString(key, defaultValue); }
        /// <summary>调用官方 HasKey，保留其原始参数、返回和回调语义。</summary>
        public bool HasKey(string key) { ensureReady(); return global::CrazyGames.CrazySDK.Data.HasKey(key); }
        /// <summary>调用官方 SetFloat，保留其原始参数、返回和回调语义。</summary>
        public void SetFloat(string key, float value) { ensureReady(); global::CrazyGames.CrazySDK.Data.SetFloat(key, value); }
        /// <summary>调用官方 SetInt，保留其原始参数、返回和回调语义。</summary>
        public void SetInt(string key, int value) { ensureReady(); global::CrazyGames.CrazySDK.Data.SetInt(key, value); }
        /// <summary>调用官方 SetString，保留其原始参数、返回和回调语义。</summary>
        public void SetString(string key, string value) { ensureReady(); global::CrazyGames.CrazySDK.Data.SetString(key, value); }
    }
}
#endif
