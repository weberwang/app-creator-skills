// 本文件仅为离线测试提供具名替身，不代表厂商 SDK 的编译或运行验证。
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace UnityEngine {
    public class MonoBehaviour { }
}
namespace Firebase {
    public enum DependencyStatus { Available, Unavailable }
    public class FirebaseApp {
        public static int Checks;
        public static FirebaseApp DefaultInstance => new FirebaseApp();
        public static Task<DependencyStatus> CheckAndFixDependenciesAsync() { Checks++; return Task.FromResult(DependencyStatus.Available); }
    }
}
namespace Firebase.Analytics {
    public class Parameter {
        public object Value; public Parameter(string n, string v) { Value = v; } public Parameter(string n, long v) { Value = v; } public Parameter(string n, double v) { Value = v; }
    }
    public static class FirebaseAnalytics {
        public const string EventScreenView = "screen", ParameterScreenName = "name", ParameterScreenClass = "class";
        public static bool Enabled; public static Parameter[] Last;
        public static void SetAnalyticsCollectionEnabled(bool v) { Enabled = v; }
        public static void LogEvent(string name, params Parameter[] values) { Last = values; }
        public static void SetUserProperty(string n, string v) { }
        public static void SetUserId(string id) { }
    }
}
namespace Firebase.Crashlytics {
    public static class Crashlytics {
        public static bool IsCrashlyticsCollectionEnabled { get; set; }
        public static void LogException(Exception e) { } public static void Log(string s) { }
        public static void SetCustomKey(string k, string v) { } public static void SetUserId(string id) { }
    }
}
namespace AppsFlyerSDK {
    public class AppsFlyer : UnityEngine.MonoBehaviour {
        public static event EventHandler OnSessionReady; public static bool StartArgument = true; public static int Starts;
        public static Task init(string key, string id, UnityEngine.MonoBehaviour receiver) => Task.CompletedTask;
        public static bool isRPCBridgeAvailable() => true;
        public static Task registerConversionListener(Action<string> success, Action<string> failure) => Task.CompletedTask;
        public static Task unregisterConversionListener() => Task.CompletedTask;
        public static bool SessionRegistered;
        public static void TriggerSession() => OnSessionReady?.Invoke(null, EventArgs.Empty);
        public static Task registerSessionReadyListener() {
            SessionRegistered = true;
#if !UNITY_ANDROID
            TriggerSession();
#endif
            return Task.CompletedTask;
        }
        public static Task start(bool response) { Starts++; StartArgument = response; return Task.CompletedTask; }
        public static Task stop(bool value) => Task.CompletedTask;
        public static Task logEvent(string name, Dictionary<string,string> values, bool response) => Task.CompletedTask;
    }
}
#if APP_CREATOR_ADMOB_SDK
namespace GoogleMobileAds.Common { public static class MobileAdsEventExecutor { public static void ExecuteInUpdate(Action a) => a(); } }
namespace GoogleMobileAds.Api {
    public class InitializationStatus { }
    public static class MobileAds { public static void Initialize(Action<InitializationStatus> a) => a(new InitializationStatus()); }
    public class AdRequest { public Dictionary<string,string> Extras { get; set; } }
    public class LoadAdError { } public class AdError { }
    public class InterstitialAd {
        public event Action OnAdFullScreenContentClosed; public event Action<AdError> OnAdFullScreenContentFailed;
        public static InterstitialAd Last;
        public static void Load(string id, AdRequest r, Action<InterstitialAd,LoadAdError> done) { Last = new InterstitialAd(); done(Last, null); }
        public bool CanShowAd() => true; public void Show() { } public void Destroy() { }
        public void Close() => OnAdFullScreenContentClosed?.Invoke();
    }
    public class Reward { public string Type = "coin"; public double Amount = 1; }
    public class RewardedAd {
        public static RewardedAd Last; public static AdRequest Request; public Action<Reward> RewardCallback; public bool Destroyed;
        public event Action OnAdFullScreenContentClosed; public event Action<AdError> OnAdFullScreenContentFailed;
        public static void Load(string id, AdRequest r, Action<RewardedAd,LoadAdError> done) { Request = r; Last = new RewardedAd(); done(Last, null); }
        public bool CanShowAd() => true; public void Show(Action<Reward> a) { RewardCallback = a; } public void Destroy() { Destroyed = true; }
        public void Close() => OnAdFullScreenContentClosed?.Invoke();
    }
    public class AdSize { public static AdSize Banner = new AdSize(); } public enum AdPosition { Top, Bottom }
    public class BannerView {
        public event Action OnBannerAdLoaded; public event Action<LoadAdError> OnBannerAdLoadFailed;
        public BannerView(string id, AdSize s, AdPosition p) { } public void Hide() { } public void Show() { }
        public void LoadAd(AdRequest r) { } public void Destroy() { }
    }
}
#endif
#if APP_CREATOR_MAX_SDK
public static class MaxSdkBase {
    public class SdkConfiguration { } public class AdInfo { public string Placement; } public class ErrorInfo { }
    public struct Reward { public string Label; public double Amount; }
    public enum AdViewPosition { TopCenter, BottomCenter }
    public class AdViewConfiguration { public AdViewConfiguration(AdViewPosition p) { } }
}
public static class MaxSdkCallbacks {
    public static event Action<MaxSdkBase.SdkConfiguration> OnSdkInitializedEvent;
    public static void Initialized() => OnSdkInitializedEvent?.Invoke(new MaxSdkBase.SdkConfiguration());
    public static class Interstitial {
        public static event Action<string,MaxSdkBase.AdInfo> OnAdLoadedEvent, OnAdHiddenEvent;
        public static event Action<string,MaxSdkBase.ErrorInfo> OnAdLoadFailedEvent;
        public static event Action<string,MaxSdkBase.ErrorInfo,MaxSdkBase.AdInfo> OnAdDisplayFailedEvent;
        public static void Loaded(string id) => OnAdLoadedEvent?.Invoke(id, new MaxSdkBase.AdInfo());
        public static void Closed(string id, string token) => OnAdHiddenEvent?.Invoke(id, new MaxSdkBase.AdInfo { Placement = token });
    }
    public static class Rewarded {
        public static event Action<string,MaxSdkBase.AdInfo> OnAdLoadedEvent, OnAdHiddenEvent;
        public static event Action<string,MaxSdkBase.ErrorInfo> OnAdLoadFailedEvent;
        public static event Action<string,MaxSdkBase.ErrorInfo,MaxSdkBase.AdInfo> OnAdDisplayFailedEvent;
        public static event Action<string,MaxSdkBase.Reward,MaxSdkBase.AdInfo> OnAdReceivedRewardEvent;
        public static void Loaded(string id) => OnAdLoadedEvent?.Invoke(id, new MaxSdkBase.AdInfo());
        public static void Closed(string id, string token) => OnAdHiddenEvent?.Invoke(id, new MaxSdkBase.AdInfo { Placement = token });
        public static void Earned(string id, string token) => OnAdReceivedRewardEvent?.Invoke(id, new MaxSdkBase.Reward { Label = "coin", Amount = 1 }, new MaxSdkBase.AdInfo { Placement = token });
    }
    public static class Banner {
        public static event Action<string,MaxSdkBase.AdInfo> OnAdLoadedEvent;
        public static event Action<string,MaxSdkBase.ErrorInfo> OnAdLoadFailedEvent;
    }
}
public static class MaxSdk {
    public static string Key, Placement; public static void SetSdkKey(string k) { Key = k; }
    public static void SetHasUserConsent(bool v) { } public static bool IsUserConsentSet() => false;
    public static bool IsInitialized() => false; public static void InitializeSdk() => MaxSdkCallbacks.Initialized();
    public static void LoadInterstitial(string id) => MaxSdkCallbacks.Interstitial.Loaded(id); public static bool IsInterstitialReady(string id) => true; public static void ShowInterstitial(string id, string placement) { Placement = placement; }
    public static void LoadRewardedAd(string id) => MaxSdkCallbacks.Rewarded.Loaded(id);
    public static bool IsRewardedAdReady(string id) => true; public static void ShowRewardedAd(string id, string placement) { Placement = placement; }
    public static void CreateBanner(string id, MaxSdkBase.AdViewConfiguration c) { } public static void ShowBanner(string id) { }
    public static void HideBanner(string id) { } public static void DestroyBanner(string id) { }
}
#endif
