using System;
using System.IO;
using System.Threading.Tasks;
using AppCreator.ChannelSdk;
using AppCreator.ChannelSdk.Editor;

namespace UnityEditor
{
    /// <summary>模拟 Unity 菜单标记，仅用于本地编译。</summary>
    [AttributeUsage(AttributeTargets.Method)] public sealed class MenuItem : Attribute
    {
        /// <summary>保留编辑器菜单构造签名。</summary>
        public MenuItem(string name) { }
    }
    /// <summary>模拟编辑器资源刷新。</summary>
    public static class AssetDatabase { /// <summary>模拟刷新。</summary>
        public static void Refresh() { } }
}

/// <summary>验证具名平台方法和初始化生命周期。</summary>
public static class Program
{
    /// <summary>断言失败时返回非零进程状态。</summary>
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    /// <summary>验证同步异常。</summary>
    private static void Throws<T>(Action action) where T : Exception { try { action(); } catch (T) { return; } throw new Exception("未抛出 " + typeof(T).Name); }
    /// <summary>验证异步异常。</summary>
    private static async Task ThrowsAsync<T>(Task task) where T : Exception { try { await task; } catch (T) { return; } throw new Exception("未抛出 " + typeof(T).Name); }

    /// <summary>对本地替身执行真实具名调用，不访问平台或商业能力。</summary>
    public static async Task Main()
    {
        TimeSpan timeout = TimeSpan.FromMilliseconds(120);
        var selector = new ChannelSelector();
        Throws<InvalidOperationException>(() => selector.Select(true, true, false, false, timeout));
        Throws<InvalidOperationException>(() => selector.Select(true, true, true, true, timeout));
        Throws<InvalidOperationException>(() => selector.Select(false, true, true, false, timeout));
        var wx = selector.Select(true, true, true, false, timeout);
        var repeated = selector.Select(true, true, true, false, timeout);
        Check(ReferenceEquals(wx, repeated), "同一配置复用渠道");
        Throws<InvalidOperationException>(() => selector.Select(true, true, false, true, timeout));
        Task first = wx.InitializeAsync();
        Check(ReferenceEquals(first, repeated.InitializeAsync()), "重复调用复用初始化任务");
        Check(WeChatWASM.WX.InitializeCount == 1, "只调用一次官方初始化");
        Throws<InvalidOperationException>(() => { var ignored = wx.Wechat; });
        WeChatWASM.WX.Callback(200);
        await first;
        var capabilities = wx.Wechat;
        var login = new WeChatWASM.LoginOption();
        capabilities.Login(login);
        Check(ReferenceEquals(login, WeChatWASM.WX.LastLogin), "具名登录方法传递官方参数");
        var payment = new WeChatWASM.RequestVirtualPaymentOption { signData = "server-signature-data" };
        capabilities.RequestVirtualPayment(payment);
        Check(ReferenceEquals(payment, WeChatWASM.WX.LastPayment) && WeChatWASM.WX.LastPayment.signData == "server-signature-data", "虚拟支付参数原样传递");
        var ad = capabilities.CreateRewardedVideoAd(new WeChatWASM.WXCreateRewardedVideoAdParam());
        int rewards = 0;
        Action<WeChatWASM.WXRewardedVideoAdOnCloseResponse> close = result => { if (result.isEnded) rewards++; };
        ad.OnClose(close);
        WeChatWASM.WX.LastRewarded.Closed(new WeChatWASM.WXRewardedVideoAdOnCloseResponse { isEnded = false });
        WeChatWASM.WX.LastRewarded.Closed(new WeChatWASM.WXRewardedVideoAdOnCloseResponse { isEnded = true });
        Check(rewards == 1, "激励广告真实关闭结果由业务判断");
        ad.OffClose(close);
        Check(WeChatWASM.WX.LastRewarded.Closed == null, "注销使用同一回调");
        Action<WeChatWASM.OnShowListenerResult> onShow = result => { };
        capabilities.OnShow(onShow);
        Check(ReferenceEquals(WeChatWASM.WX.ShowListener, onShow), "生命周期注册保留回调身份");
        capabilities.OffShow(onShow);
        Check(WeChatWASM.WX.ShowListener == null, "生命周期监听正确注销");
        Throws<InvalidOperationException>(() => { var ignored = wx.CrazyGames; });
        wx.Dispose();
        Throws<InvalidOperationException>(() => capabilities.Login(login));
        Throws<InvalidOperationException>(() => ad.Load());

        var waiting = new WechatMinigameChannel(true, TimeSpan.FromMilliseconds(20));
        Task late = waiting.InitializeAsync();
        Action<int> old = WeChatWASM.WX.Callback;
        await ThrowsAsync<TimeoutException>(late);
        Throws<InvalidOperationException>(() => waiting.InitializeAsync());
        old(200);
        Check(waiting.State == ChannelState.TimedOut, "迟到结果不能伪装成功");
        Task retry = waiting.InitializeAsync();
        var next = WeChatWASM.WX.Callback;
        old(200);
        Check(waiting.State == ChannelState.Initializing, "旧回调不能完成新初始化");
        next(200);
        await retry;
        waiting.Dispose();

        var pendingSelector = new ChannelSelector();
        IChannelCapabilities pending = pendingSelector.Select(true, false, true, false, timeout);
        Task pendingTask = pending.InitializeAsync();
        Action<int> pendingCallback = WeChatWASM.WX.Callback;
        Throws<InvalidOperationException>(() => pendingSelector.Release());
        pending.Dispose();
        Throws<InvalidOperationException>(() => pendingSelector.Select(true, false, true, false, timeout));
        pendingCallback(200);
        await ThrowsAsync<ObjectDisposedException>(pendingTask);
        Check(!ReferenceEquals(pending, pendingSelector.Select(true, false, true, false, timeout)), "旧操作结束才允许重建");
        pendingSelector.Dispose();

        var crazy = selector.Select(true, true, false, true, timeout);
        Task crazyInit = crazy.InitializeAsync();
        CrazyGames.CrazySDK.Callback();
        await crazyInit;
        var cg = crazy.CrazyGames;
        cg.Game.GameplayStart();
        Check(CrazyGames.CrazySDK.Game.Count == 1, "具名玩法事件直达官方模块");
        int started = 0, failed = 0, finished = 0;
        cg.Ad.RequestAd(CrazyGames.CrazyAdType.Rewarded, () => started++, error => failed++, () => finished++);
        CrazyGames.CrazySDK.Ad.Started();
        CrazyGames.CrazySDK.Ad.Failed(new CrazyGames.SdkError());
        Check(started == 1 && failed == 1 && finished == 0, "广告失败不可冒充观看完成");
        var buyCallbackCount = 0;
        cg.Store.BuyItem("item-1", (error, result) => buyCallbackCount++);
        Check(CrazyGames.CrazySDK.Store.LastItemId == "item-1" && buyCallbackCount == 0, "下单受理不代表交易完成");
        CrazyGames.CrazySDK.Store.PurchaseCallback(new CrazyGames.SdkError(), null);
        Check(buyCallbackCount == 1, "支付错误回调被原样传递");
        selector.Release();
        Throws<InvalidOperationException>(() => cg.Game.GameplayStart());
        selector.Dispose();
        var unverified = new WechatMinigameChannel(false, timeout);
        await ThrowsAsync<InvalidOperationException>(unverified.InitializeAsync());
        ChannelSdkLinkerGenerator.Generate();
        string xml = File.ReadAllText("Assets/AppCreatorChannelSdkGenerated/link.xml");
        Check(xml.Contains("ChannelSdkFixture") && xml.Contains("preserve=\"all\""), "绑定实际 SDK 程序集");
        Console.WriteLine("Unity 渠道 SDK 模拟验证通过");
    }
}
