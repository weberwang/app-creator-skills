#if APP_CREATOR_DIRICHLET_SDK
using System;
using System.Globalization;
using System.Threading.Tasks;
using Dirichlet.Mediation;
#if UNITY_ANDROID && !UNITY_EDITOR
using UnityEngine;
#endif

namespace AppCreator.MobileSdk
{
    /// <summary>TapADN Unity 聚合 SDK 的独立广告管理器；只在明确初始化后触碰官方 SDK。</summary>
    public sealed partial class DirichletManager : IMobileAds
    {
        private static readonly object OwnerGate = new object();
        private static DirichletManager owner;
        private static DirichletIdentity initializedIdentity;
        private static int pendingRewards;
        private const int PendingRewardLimit = 128;
        private readonly MainThread thread = new MainThread();
        private readonly SdkInitialization initialization;
        private readonly DirichletIdentity identity;
        private readonly AdUnits units;
        private readonly Func<bool> applyNetworkPrivacy;
        private AdPolicy policy;
        private bool disposed;
        private int policyGeneration;

        /// <summary>保存真实媒体配置；同一进程已有 SDK 时必须使用相同配置。</summary>
        private sealed class DirichletIdentity
        {
            internal readonly long MediaId;
            internal readonly string MediaName, MediaKey;
            internal readonly bool AllowIdfa, ShakeEnabled;

            /// <summary>只缓存必要字段，不向日志输出媒体密钥。</summary>
            internal DirichletIdentity(long id, string name, string key, bool allowIdfa, bool shakeEnabled)
            { MediaId = id; MediaName = name; MediaKey = key; AllowIdfa = allowIdfa; ShakeEnabled = shakeEnabled; }

            /// <summary>比较全部影响初始化的配置，避免复用其他媒体的全局实例。</summary>
            internal bool SameAs(DirichletIdentity other) => other != null && MediaId == other.MediaId &&
                MediaName == other.MediaName && MediaKey == other.MediaKey && AllowIdfa == other.AllowIdfa && ShakeEnabled == other.ShakeEnabled;
        }

        /// <summary>保存项目配置与隐私配置函数，不初始化 SDK、申请权限或发送广告请求。</summary>
        public DirichletManager(long mediaId, string mediaName, string mediaKey, int timeoutMilliseconds,
            AdUnits units, AdPolicy policy, Func<bool> applyNetworkPrivacy, bool allowIdfa = false, bool shakeEnabled = false)
        {
            if (mediaId <= 0) throw new ArgumentOutOfRangeException(nameof(mediaId));
            if (string.IsNullOrWhiteSpace(mediaName)) throw new ArgumentException("媒体名称不能为空。", nameof(mediaName));
            if (string.IsNullOrWhiteSpace(mediaKey)) throw new ArgumentException("媒体密钥不能为空。", nameof(mediaKey));
            this.units = units ?? throw new ArgumentNullException(nameof(units));
            this.policy = policy ?? throw new ArgumentNullException(nameof(policy));
            this.applyNetworkPrivacy = applyNetworkPrivacy ?? throw new ArgumentNullException(nameof(applyNetworkPrivacy));
            initialization = new SdkInitialization(timeoutMilliseconds);
            identity = new DirichletIdentity(mediaId, mediaName, mediaKey, allowIdfa, shakeEnabled);
        }

        /// <summary>当前实例的真实初始化状态。</summary>
        public SdkState State
        {
            get
            {
                var state = initialization.State;
                return state == SdkState.Ready && (!policy.InitializationAllowed || !policy.RequestsAllowed || !policy.NonPersonalizedNetworksConfigured)
                    ? SdkState.Restricted : state;
            }
        }
        /// <summary>即便等待超时，厂商初始化仍可能尚未结束。</summary>
        public bool InitializationPending => initialization.Pending;

        /// <summary>真实隐私配置失败时拒绝初始化或广告请求。</summary>
        private bool ApplyPrivacy(bool requireRequests)
        {
            if (disposed || !policy.InitializationAllowed || !policy.NonPersonalizedNetworksConfigured ||
                (requireRequests && !policy.RequestsAllowed)) return false;
            try
            {
                // 项目负责为所有已启用网络执行真实配置，不能仅以媒体开通状态代替。
                if (!applyNetworkPrivacy()) return false;
#if UNITY_ANDROID && !UNITY_EDITOR
                // 5.3.3.0 AAR 与官方文档均确认这是聚合设置接口及关闭个性化的值。
                using (var sdk = new AndroidJavaClass("com.tapsdk.tapad.group.DirichletSdk"))
                    sdk.CallStatic("putMediaGlobalSettings", "personal_ads_type", "0");
#endif
                return true;
            }
            catch { return false; }
        }

        /// <summary>按官方 C# API 初始化唯一聚合实例，并隔离超时与其他媒体配置。</summary>
        public Task InitializeAsync()
        {
            thread.Require(); MobilePlatform.Require();
            lock (OwnerGate) CheckOwner();
            if (!ApplyPrivacy(false)) { initialization.Restrict(); throw new InvalidOperationException("聚合广告初始化隐私前置未满足。"); }
            return initialization.Start(() =>
            {
                lock (OwnerGate)
                {
                    CheckOwner();
                    owner = this;
                    if (DirichletSdk.IsInitialized) return Task.CompletedTask;
                }

                var completion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                var config = new DirichletAdConfig.Builder().WithMediaId(identity.MediaId)
                    .WithMediaName(identity.MediaName).WithMediaKey(identity.MediaKey).EnableDebug(false)
                    .AllowIDFAAccess(identity.AllowIdfa).ShakeEnabled(identity.ShakeEnabled).Build();
                try
                {
                    DirichletSdk.Init(config, result =>
                    {
                        if (result == null || !result.Success || !DirichletSdk.IsInitialized)
                        { completion.TrySetException(new InvalidOperationException("聚合广告 SDK 初始化未成功。")); return; }
                        lock (OwnerGate) initializedIdentity = identity;
                        completion.TrySetResult(true);
                    }, error => completion.TrySetException(new InvalidOperationException("聚合广告 SDK 初始化失败。")));
                }
                catch { completion.TrySetException(new InvalidOperationException("聚合广告 SDK 初始化失败。")); }
                return completion.Task;
            });
        }

        /// <summary>在设置任何全局隐私参数前确认唯一所有者及现有媒体身份。</summary>
        private void CheckOwner()
        {
            if (owner != null && !ReferenceEquals(owner, this) &&
                (!owner.disposed || owner.InitializationPending || owner.HasActiveShow))
                throw new InvalidOperationException("聚合广告 SDK 已由其他实例持有。");
            if (initializedIdentity != null && !initializedIdentity.SameAs(identity))
                throw new InvalidOperationException("聚合广告 SDK 已使用其他媒体配置初始化。");
            if (DirichletSdk.IsInitialized && initializedIdentity == null)
                throw new InvalidOperationException("无法核实已有聚合 SDK 的媒体配置。");
        }

        /// <summary>策略变更使未展示缓存及旧加载代次失效；已受理展示保留原始结算回调。</summary>
        public void UpdatePolicy(AdPolicy next)
        {
            thread.Require();
            if (disposed) throw new ObjectDisposedException(nameof(DirichletManager));
            policy = next ?? throw new ArgumentNullException(nameof(next));
            policyGeneration++;
            InvalidateUnshown();
        }

        /// <summary>广告位是官方正整数 ID，不接受占位或其他格式。</summary>
        private static DirichletAdRequest Request(string value)
        {
            if (!long.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out long id) || id <= 0)
                throw new InvalidOperationException("当前聚合广告位未配置有效数字 ID。");
            return new DirichletAdRequest.Builder().WithSpaceId(id).Build();
        }

        /// <summary>只在真实就绪且当前策略仍允许时创建官方广告加载器。</summary>
        private DirichletAdNative Loader()
        {
            thread.Require();
            if (!CanRequest()) return null;
            try { return DirichletAdManager.CreateAdNative(); } catch { return null; }
        }

        /// <summary>授权读取失败或被撤回时立即作废旧缓存，重新授权也不能复用旧请求结果。</summary>
        private bool CanRequest()
        {
            if (initialization.State != SdkState.Ready) return false;
            if (ApplyPrivacy(true)) return true;
            policyGeneration++;
            InvalidateUnshown();
            return false;
        }

        /// <summary>单个业务回调异常不能影响广告清理或其他回调。</summary>
        private static void Notify(Action callback) { try { callback?.Invoke(); } catch { } }

        /// <summary>释放未展示广告；已受理激励继续持有其官方事件直至真实结算。</summary>
        public void Dispose()
        {
            thread.Require();
            if (disposed) return;
            disposed = true; policyGeneration++; initialization.Dispose();
            InvalidateUnshown();
        }
    }
}
#endif
