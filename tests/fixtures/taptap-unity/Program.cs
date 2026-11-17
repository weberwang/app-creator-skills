using System;
using System.Threading.Tasks;
using AppCreator.ChannelSdk;
using TapSDK.Core;
using TapSDK.Login;

/// <summary>验证 TapTap 渠道的接线、授权和异步生命周期。</summary>
public static class Program
{
    /// <summary>断言可观察的行为，不记录凭证。</summary>
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }

    /// <summary>验证预期的同步异常。</summary>
    private static void Throws<T>(Action call) where T : Exception
    {
        try { call(); } catch (T) { return; }
        throw new Exception("未收到预期同步异常：" + typeof(T).Name);
    }

    /// <summary>验证异步结果未被伪装为成功。</summary>
    private static async Task ThrowsAsync<T>(Task task) where T : Exception
    {
        try { await task; } catch (T) { return; }
        throw new Exception("未收到预期异步异常：" + typeof(T).Name);
    }

    /// <summary>执行纯离线 SDK 行为测试。</summary>
    public static async Task Main()
    {
        bool consent = false;
        bool policyFails = false;
        var core = new TapTapSdkOptions { clientId = "app-a", clientToken = "public-token" };
        var options = new TapTapConfiguration(core, () => { if (policyFails) throw new Exception("private policy detail"); return consent; });
        core.clientId = "mutated";
        var selector = new ChannelSelector();
        Throws<InvalidOperationException>(() => selector.Select(true, false, true, true, false, true, TimeSpan.FromSeconds(1), options));
        Throws<InvalidOperationException>(() => selector.Select(false, false, false, false, false, true, TimeSpan.FromSeconds(1), options));
        var channel = selector.Select(false, false, true, false, false, true, TimeSpan.FromSeconds(1), options);
        Check(ReferenceEquals(channel, selector.Select(false, false, true, false, false, true, TimeSpan.FromSeconds(1), options)), "同配置必须复用渠道");
        await ThrowsAsync<InvalidOperationException>(channel.InitializeAsync());
        Check(TapTapSDK.Calls == 0, "未授权不得初始化 SDK");
        consent = true;
        Task first = channel.InitializeAsync();
        Check(ReferenceEquals(first, channel.InitializeAsync()), "重复初始化必须复用当前任务");
        Check(TapTapSDK.Calls == 1 && TapTapSDK.Options.clientId == "app-a", "必须使用配置快照且只调用一次");
        Check(((TapTapEventOptions)TapTapSDK.Modules[0]).enableTapTapEvent == false, "未选统计时必须关闭自动统计");
        Throws<InvalidOperationException>(() => { var unused = channel.TapTap; });
        var callback = TapTapSDK.Callback;
        callback.OnInitSuccess();
        callback.OnInitSuccess();
        await first;
        Check(channel.State == ChannelState.Ready && TapTapSDK.Callback == null, "仅真实完成回调可使渠道就绪");
        var api = channel.TapTap;
        string[] scopes = { "basic_info" };
        Check(await api.LoginWithScopes(scopes) != null && ReferenceEquals(TapTapLogin.Instance.Scopes, scopes), "必须透传官方登录参数");
        TapTapLogin.Instance.Cancel = true;
        await ThrowsAsync<TaskCanceledException>(api.LoginWithScopes(scopes));
        Check(await api.GetAgeRange() == 18 && await api.IsLaunchedFromTapTapPC(), "模块方法必须返回官方结果");
        Check(await api.GetArchiveList() != null && await api.ConnectBattle() == "connected", "跨模块接口必须保留返回值");
        Check(api.GetPurchasingModule() == TapSDK.IAP.TapPurchasingModule.Instance, "购买模块必须来自官方 SDK");
        Throws<InvalidOperationException>(() => api.LogAnalyticsDeviceLogin());
        int loginCalls = TapTapLogin.Instance.LoginCalls;
        consent = false;
        Throws<InvalidOperationException>(() => api.LoginWithScopes(scopes));
        api.Logout();
        api.ExitCompliance();
        api.ClearAnalyticsUser();
        api.ClearAnalyticsCommonProperty("one");
        api.ClearAnalyticsCommonProperties(new[] { "two" });
        api.ClearAllAnalyticsCommonProperties();
        await api.LeaveRoom();
        await api.StopFrameSync();
        Check(TapTapLogin.Instance.LogoutCount == 1 && TapSDK.Compliance.TapTapCompliance.ExitCalls == 1,
            "撤回授权后应清理登录和合规会话");
        Check(TapTapEvent.ClearUserCalls == 1 && TapTapEvent.ClearCommonCalls == 3,
            "撤回授权后应清理统计身份和公共属性");
        Check(TapSDK.OnlineBattle.TapTapOnlineBattle.LeaveRoomCalls == 1 && TapSDK.OnlineBattle.TapTapOnlineBattle.StopFrameSyncCalls == 1,
            "撤回授权后应离开房间并停止帧同步");
        TapSDK.OnlineBattle.TapTapOnlineBattle.DisconnectCompletion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        Task disconnect = api.DisconnectBattle();
        Check(TapSDK.OnlineBattle.TapTapOnlineBattle.DisconnectCalls == 1 && !disconnect.IsCompleted,
            "撤回授权后应启动真实断线并保留其任务");
        consent = true;
        policyFails = true;
        Throws<InvalidOperationException>(() => api.LoginWithScopes(scopes));
        Check(TapTapLogin.Instance.LoginCalls == loginCalls, "撤回授权或策略异常后不能进入官方登录");
        policyFails = false;
        selector.Release();
        Throws<InvalidOperationException>(() => api.Logout());

        // 服务与统计授权各自判断；动态属性回调在授权撤回后不能读取业务数据。
        bool analyticsAllowed = true;
        int propertyCalls = 0;
        var analyticsOptions = new TapTapConfiguration(core, () => true, () => true, () => analyticsAllowed,
            new TapTapEventOptions { enableTapTapEvent = true });
        var analyticsChannel = selector.Select(false, false, true, false, false, true, TimeSpan.FromSeconds(1), analyticsOptions);
        await ThrowsAsync<InvalidOperationException>(analyticsChannel.InitializeAsync());
        Check(TapTapSDK.Calls == 1, "旧会话异步收尾结束前禁止新实例初始化");
        TapSDK.OnlineBattle.TapTapOnlineBattle.DisconnectCompletion.SetResult(true);
        await disconnect;
        // 清理完成回调与调用方 await 的恢复顺序未定义，确保旧清理占用已经释放。
        Task analyticsInit = null;
        for (int attempt = 0; attempt < 100; attempt++)
        {
            analyticsInit = analyticsChannel.InitializeAsync();
            if (!analyticsInit.IsFaulted) break;
            await Task.Delay(1);
        }
        Check(analyticsInit != null && !analyticsInit.IsFaulted, "异步收尾完成后应允许新实例初始化");
        TapTapSDK.Callback.OnInitSuccess();
        await analyticsInit;
        var analyticsApi = analyticsChannel.TapTap;
        Throws<InvalidOperationException>(() => api.Logout());
        Throws<InvalidOperationException>(() => api.ClearAnalyticsUser());
        Throws<InvalidOperationException>(() => api.DisconnectBattle());
        Check(TapTapLogin.Instance.LogoutCount == 1 && TapTapEvent.ClearUserCalls == 1 && TapSDK.OnlineBattle.TapTapOnlineBattle.DisconnectCalls == 1,
            "旧句柄不能清理新所有者的会话");
        analyticsApi.RegisterAnalyticsDynamicProperties(() => { propertyCalls++; return new System.Collections.Generic.Dictionary<string, object> { ["score"] = 1 }; });
        Check(TapTapEvent.DynamicCallback().Count == 1 && propertyCalls == 1, "授权后可读取动态统计属性");
        analyticsAllowed = false;
        Throws<InvalidOperationException>(() => analyticsApi.LogAnalyticsDeviceLogin());
        Check(TapTapEvent.DynamicCallback().Count == 0 && propertyCalls == 1, "撤回授权后不得读取动态属性");
        selector.Release();

        // 超时并不取消原生初始化：旧回调前禁止重试，迟到成功也不能复活旧句柄。
        var shortChannel = selector.Select(false, false, true, false, false, true, TimeSpan.FromMilliseconds(20), options);
        var timed = shortChannel.InitializeAsync();
        var late = TapTapSDK.Callback;
        await ThrowsAsync<TimeoutException>(timed);
        Throws<InvalidOperationException>(() => shortChannel.InitializeAsync());
        Throws<InvalidOperationException>(() => selector.Release());
        late.OnInitSuccess();
        Check(shortChannel.State == ChannelState.TimedOut, "超时后的迟到成功不能改变状态");
        var retry = shortChannel.InitializeAsync();
        TapTapSDK.Callback.OnInitFail(7, "private vendor message");
        await ThrowsAsync<InvalidOperationException>(retry);
        Check(shortChannel.State == ChannelState.Failed, "官方失败必须保持失败");
        selector.Release();

        // 注册回调抛错时官方初始化仍可能进行，不能将其误认为已结束。
        TapTapSDK.ThrowOnRegister = true;
        var uncertain = selector.Select(false, false, true, false, false, true, TimeSpan.FromMilliseconds(20), options);
        var uncertainTask = uncertain.InitializeAsync();
        var uncertainCallback = TapTapSDK.Callback;
        await ThrowsAsync<TimeoutException>(uncertainTask);
        Throws<InvalidOperationException>(() => uncertain.InitializeAsync());
        uncertainCallback.OnInitSuccess();
        Check(uncertain.State == ChannelState.TimedOut, "回调注册状态未知时不能伪造成功");
        TapTapSDK.ThrowOnRegister = false;
        selector.Release();
        selector.Dispose();
        Console.WriteLine("TapTap Unity 离线验证通过");
    }
}
