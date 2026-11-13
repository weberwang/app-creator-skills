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
    /// <summary>逐项封装 global::CrazyGames.CrazySDK.Store 的官方公开方法。</summary>
    public sealed partial class CrazyGamesStoreSdk
    {
        private readonly Action ensureReady;
        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>
        internal CrazyGamesStoreSdk(Action ensureReady) { this.ensureReady = ensureReady; }
        /// <summary>读取官方商品目录的单页上限。</summary>
        public int MaxCatalogLimit { get { ensureReady(); return global::CrazyGames.StoreModule.MaxCatalogLimit; } }
        /// <summary>调用官方 BuyItem，保留其原始参数、返回和回调语义。</summary>
        public void BuyItem(string itemId, Action<SdkError, PurchaseResult> callback) { ensureReady(); global::CrazyGames.CrazySDK.Store.BuyItem(itemId, callback); }
        /// <summary>调用官方 BuyItemAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<PurchaseResult> BuyItemAsync(string itemId) { ensureReady(); return global::CrazyGames.CrazySDK.Store.BuyItemAsync(itemId); }
        /// <summary>调用官方 ConsumeItem，保留其原始参数、返回和回调语义。</summary>
        public void ConsumeItem(string sku, int quantity, Action<SdkError> callback) { ensureReady(); global::CrazyGames.CrazySDK.Store.ConsumeItem(sku, quantity, callback); }
        /// <summary>调用官方 ConsumeItemAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task ConsumeItemAsync(string sku, int quantity) { ensureReady(); return global::CrazyGames.CrazySDK.Store.ConsumeItemAsync(sku, quantity); }
        /// <summary>调用官方 GetCatalogItems，保留其原始参数、返回和回调语义。</summary>
        public void GetCatalogItems(Action<SdkError, CatalogPage> callback) { ensureReady(); global::CrazyGames.CrazySDK.Store.GetCatalogItems(callback); }
        /// <summary>调用官方 GetCatalogItems，保留其原始参数、返回和回调语义。</summary>
        public void GetCatalogItems(int limit, int offset, Action<SdkError, CatalogPage> callback) { ensureReady(); global::CrazyGames.CrazySDK.Store.GetCatalogItems(limit, offset, callback); }
        /// <summary>调用官方 GetCatalogItemsAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<CatalogPage> GetCatalogItemsAsync() { ensureReady(); return global::CrazyGames.CrazySDK.Store.GetCatalogItemsAsync(); }
        /// <summary>调用官方 GetCatalogItemsAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<CatalogPage> GetCatalogItemsAsync(int limit, int offset) { ensureReady(); return global::CrazyGames.CrazySDK.Store.GetCatalogItemsAsync(limit, offset); }
        /// <summary>调用官方 GetPlayerInventory，保留其原始参数、返回和回调语义。</summary>
        public void GetPlayerInventory(Action<SdkError, InventoryPage> callback) { ensureReady(); global::CrazyGames.CrazySDK.Store.GetPlayerInventory(callback); }
        /// <summary>调用官方 GetPlayerInventory，保留其原始参数、返回和回调语义。</summary>
        public void GetPlayerInventory(int limit, int offset, Action<SdkError, InventoryPage> callback) { ensureReady(); global::CrazyGames.CrazySDK.Store.GetPlayerInventory(limit, offset, callback); }
        /// <summary>调用官方 GetPlayerInventoryAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<InventoryPage> GetPlayerInventoryAsync() { ensureReady(); return global::CrazyGames.CrazySDK.Store.GetPlayerInventoryAsync(); }
        /// <summary>调用官方 GetPlayerInventoryAsync，保留其原始参数、返回和回调语义。</summary>
        public System.Threading.Tasks.Task<InventoryPage> GetPlayerInventoryAsync(int limit, int offset) { ensureReady(); return global::CrazyGames.CrazySDK.Store.GetPlayerInventoryAsync(limit, offset); }
        /// <summary>调用官方 SetSandbox，保留其原始参数、返回和回调语义。</summary>
        public void SetSandbox(bool sandbox) { ensureReady(); global::CrazyGames.CrazySDK.Store.SetSandbox(sandbox); }
    }
}
#endif
