package org.appcreator.dirichlet;

import java.util.ArrayList;
import java.util.List;

/** 使用可控厂商对象检验广告生命周期，不访问设备、网络或真实广告。 */
public final class DirichletAndroidFixture {
    /** 记录某个原生调用只完成一次以及实际错误。 */
    private static final class Completion implements DirichletAds.Completion {
        int successes, failures;
        String error;
        @Override public void success() { successes++; }
        @Override public void fail(String code) { failures++; error = code; }
    }

    /** 记录交给业务的原始展示身份与验证结果。 */
    private static final class Events implements DirichletAds.Events {
        final List<String> values = new ArrayList<>();
        @Override public void event(String kind, String format, String unit, String request, boolean verified, String type, int amount) {
            values.add(kind + ":" + format + ":" + unit + ":" + request + ":" + verified + ":" + type + ":" + amount);
        }
    }

    /** 重放真实激励对象的有效、关闭及奖励验证状态。 */
    private static final class Reward implements DirichletAds.RewardAd {
        DirichletAds.RewardEvents events;
        boolean valid = true, destroyed, throwsOnShow, closesBeforeThrow;
        @Override public boolean isValid() { return valid && !destroyed; }
        @Override public void destroy() { destroyed = true; }
        @Override public void show(DirichletAds.RewardEvents next) {
            events = next; if (closesBeforeThrow) next.closed(); if (throwsOnShow) throw new IllegalStateException();
        }
    }

    /** 重放插屏对象的关闭回调。 */
    private static final class Interstitial implements DirichletAds.InterstitialAd {
        DirichletAds.InterstitialEvents events;
        boolean valid = true, destroyed;
        @Override public boolean isValid() { return valid && !destroyed; }
        @Override public void destroy() { destroyed = true; }
        @Override public void show(DirichletAds.InterstitialEvents next) { events = next; }
    }

    /** 重放横幅创建、隐藏和释放。 */
    private static final class Banner implements DirichletAds.BannerAd {
        boolean destroyed, shown, hidden;
        @Override public boolean isValid() { return !destroyed; }
        @Override public void destroy() { destroyed = true; }
        @Override public void show(String position) { shown = true; }
        @Override public void hide() { hidden = true; }
    }

    /** 手动交付初始化和加载结果，确保测试不会访问官方 SDK。 */
    private static final class Vendor implements DirichletAds.Vendor {
        int privacyCalls, initCalls;
        DirichletAds.Completion initialization;
        DirichletAds.Loaded<DirichletAds.RewardAd> reward;
        DirichletAds.Loaded<DirichletAds.InterstitialAd> interstitial;
        DirichletAds.Loaded<DirichletAds.BannerAd> banner;
        @Override public void applyNonPersonalized() { privacyCalls++; }
        @Override public void initialize(long id, String name, String key, boolean debug, DirichletAds.Completion completion) { initCalls++; initialization = completion; }
        @Override public void loadRewarded(long id, DirichletAds.Loaded<DirichletAds.RewardAd> result) { reward = result; }
        @Override public void loadInterstitial(long id, DirichletAds.Loaded<DirichletAds.InterstitialAd> result) { interstitial = result; }
        @Override public void loadBanner(long id, DirichletAds.Loaded<DirichletAds.BannerAd> result) { banner = result; }
    }

    /** 断言结果包含上下文，失败直接中止测试。 */
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }

    /** 创建已由真实回调完成初始化的对象。 */
    private static DirichletAds ready(Vendor vendor) {
        DirichletAds ads = new DirichletAds(vendor);
        Completion result = new Completion();
        ads.initialize("7", "测试媒体", "测试密钥", true, true, true, false, result);
        check(result.successes == 0 && vendor.initCalls == 1, "不能提前报告初始化完成");
        vendor.initialization.success();
        check(result.successes == 1 && vendor.privacyCalls == 1, "应等待官方初始化并配置非个性化");
        return ads;
    }

    /** 验证授权、真实初始化回调和媒体身份约束。 */
    private static void initialization() {
        Vendor vendor = new Vendor(); DirichletAds ads = new DirichletAds(vendor);
        Completion denied = new Completion(); ads.initialize("7", "媒体", "密钥", false, true, true, false, denied);
        check("privacy-not-configured".equals(denied.error) && vendor.initCalls == 0 && vendor.privacyCalls == 0, "未授权不得初始化");
        Completion networks = new Completion(); ads.initialize("7", "媒体", "密钥", true, true, false, false, networks);
        check("privacy-not-configured".equals(networks.error) && vendor.initCalls == 0, "未核实聚合网络隐私不得初始化");
        Completion requests = new Completion(); ads.initialize("7", "媒体", "密钥", true, false, true, false, requests);
        check("privacy-not-configured".equals(requests.error) && vendor.initCalls == 0, "初始化可能预加载，未授权广告请求时不得启动");
        Completion malformed = new Completion(); ads.initialize("999999999999999999999", "媒体", "密钥", true, true, true, false, malformed);
        check("invalid-media-id".equals(malformed.error) && vendor.initCalls == 0, "拒绝媒体 ID 溢出");
        Completion first = new Completion(); ads.initialize("7", "媒体", "密钥", true, true, true, false, first);
        Completion concurrent = new Completion(); ads.initialize("7", "媒体", "密钥", true, true, true, false, concurrent);
        check("initialization-pending".equals(concurrent.error) && vendor.initCalls == 1, "并发不得重复初始化");
        ads.setRequestsAllowed(false); vendor.initialization.success();
        check("initialization-obsolete".equals(first.error), "撤回后不得恢复旧初始化请求");
        Completion same = new Completion(); ads.initialize("7", "媒体", "密钥", true, true, true, false, same);
        check(same.successes == 1 && vendor.initCalls == 1, "已完成的全局 SDK 不得再次初始化");
        Completion different = new Completion(); ads.initialize("8", "媒体", "密钥", true, true, true, false, different);
        check("different-media-config".equals(different.error), "同进程不得切换媒体身份");
    }

    /** 验证旧加载、重复回调及授权撤回不会生成可展示状态。 */
    private static void loadingAndPolicy() {
        Vendor vendor = new Vendor(); DirichletAds ads = ready(vendor);
        Completion invalid = new Completion(); ads.loadRewarded("not-a-number", invalid);
        check("invalid-ad-unit-or-privacy".equals(invalid.error) && vendor.reward == null, "必须先核实真实数值广告位");
        Completion old = new Completion(); ads.loadRewarded("123", old);
        DirichletAds.Loaded<DirichletAds.RewardAd> oldCallback = vendor.reward;
        Completion pending = new Completion(); ads.loadRewarded("123", pending);
        check("load-pending".equals(pending.error), "重复加载应被隔离");
        ads.setRequestsAllowed(false); ads.setRequestsAllowed(true);
        Reward obsolete = new Reward(); oldCallback.success(obsolete);
        check(obsolete.destroyed && "load-obsolete".equals(old.error), "授权更新后旧广告不得恢复");
        Completion fresh = new Completion(); ads.loadRewarded("123", fresh); Reward active = new Reward();
        vendor.reward.success(active); oldCallback.success(obsolete);
        check(fresh.successes == 1 && !active.destroyed, "旧重复回调不得破坏新广告");
        check(vendor.privacyCalls >= 3, "每次真实加载前应恢复非个性化限制");
    }

    /** 关闭、奖励与释放分别处理，保留已受理的迟到奖励。 */
    private static void showLifecycle() {
        Vendor vendor = new Vendor(); DirichletAds ads = ready(vendor);
        Completion rewardLoad = new Completion(); ads.loadRewarded("123", rewardLoad); Reward reward = new Reward(); vendor.reward.success(reward);
        Completion interLoad = new Completion(); ads.loadInterstitial("124", interLoad); Interstitial inter = new Interstitial(); vendor.interstitial.success(inter);
        Events events = new Events(); Completion shown = new Completion(); ads.showRewarded("123", "request-1", events, shown);
        check(shown.successes == 1 && events.values.isEmpty(), "展示受理不等于奖励或关闭");
        Completion busy = new Completion(); ads.showInterstitial("124", "request-2", events, busy);
        check("busy".equals(busy.error), "不同格式的全屏展示必须互斥");
        reward.events.verified(false, 1, "coin");
        reward.events.verified(true, 0, "coin");
        check(events.values.isEmpty(), "无效验证不得发奖");
        reward.events.closed(); reward.events.closed();
        check(events.values.size() == 1 && !reward.destroyed, "关闭只通知一次并等待迟到奖励");
        Completion next = new Completion(); ads.showInterstitial("124", "request-2", events, next);
        check(next.successes == 1, "关闭后应允许其他格式展示");
        ads.dispose(); reward.events.verified(true, 3, "coin"); reward.events.verified(true, 3, "coin");
        check(events.values.size() == 2 && events.values.get(1).contains(":request-1:true:coin:3"), "释放后迟到奖励须保持原请求身份且只通知一次");
        check(reward.destroyed, "关闭与奖励都完成后释放对应实例");
        inter.events.closed();
        check(events.values.size() == 3 && inter.destroyed, "已受理插屏在释放后仍应结束");
        Completion denied = new Completion(); ads.loadRewarded("123", denied);
        check("disposed".equals(denied.error), "释放后禁止新请求");
    }

    /** 展示同步失败隔离广告并拒绝伪造迟到奖励。 */
    private static void showFailure() {
        Vendor vendor = new Vendor(); DirichletAds ads = ready(vendor);
        Completion loaded = new Completion(); ads.loadRewarded("123", loaded); Reward reward = new Reward(); reward.throwsOnShow = true; vendor.reward.success(reward);
        Events events = new Events(); Completion shown = new Completion(); ads.showRewarded("123", "failure", events, shown);
        check("show-failed".equals(shown.error) && reward.destroyed && events.values.size() == 1, "展示异常需释放并通知失败");
        reward.events.verified(true, 1, "coin");
        check(events.values.size() == 1, "展示失败后的回调不能发奖");

        Completion nextLoad = new Completion(); ads.loadRewarded("123", nextLoad); Reward closed = new Reward();
        closed.closesBeforeThrow = true; closed.throwsOnShow = true; vendor.reward.success(closed);
        Completion accepted = new Completion(); ads.showRewarded("123", "closed-before-throw", events, accepted);
        check(accepted.successes == 1 && !closed.destroyed, "已同步关闭的展示不能因后续异常丢弃迟到奖励");
        closed.events.verified(true, 2, "coin");
        check(events.values.get(events.values.size() - 1).contains(":closed-before-throw:true:coin:2") && closed.destroyed, "同步关闭后的奖励仍属于原展示");
    }

    /** 撤回或隐藏横幅使旧视图失效，不影响同时在途的全屏广告加载。 */
    private static void banner() {
        Vendor vendor = new Vendor(); DirichletAds ads = ready(vendor);
        Completion rewardLoad = new Completion(); ads.loadRewarded("123", rewardLoad);
        Completion bannerLoad = new Completion(); ads.showBanner("125", "top", bannerLoad); ads.hideBanner();
        Reward reward = new Reward(); vendor.reward.success(reward);
        Banner old = new Banner(); vendor.banner.success(old);
        check(rewardLoad.successes == 1 && !reward.destroyed, "隐藏横幅不得使激励加载失效");
        check(old.destroyed && "load-obsolete".equals(bannerLoad.error), "隐藏后迟到横幅不可显示");
        Completion bannerAgain = new Completion(); ads.showBanner("125", "bottom", bannerAgain); Banner current = new Banner(); vendor.banner.success(current);
        check(current.shown && bannerAgain.successes == 1, "真实加载之后才显示横幅");
        ads.setRequestsAllowed(false); check(current.destroyed, "撤回授权必须销毁已显示横幅");
    }

    /** 未结算奖励达到容量时拒绝新展示，不删除原记录或猜测回调归属。 */
    private static void capacity() {
        Vendor vendor = new Vendor(); DirichletAds ads = ready(vendor); Events events = new Events(); Reward first = null;
        for (int index = 0; index < 128; index++) {
            Completion load = new Completion(); ads.loadRewarded("123", load); Reward ad = new Reward(); vendor.reward.success(ad);
            Completion show = new Completion(); ads.showRewarded("123", "capacity-" + index, events, show);
            check(show.successes == 1, "容量内展示应受理"); ad.events.closed(); if (index == 0) first = ad;
        }
        Completion load = new Completion(); ads.loadRewarded("123", load); Reward extra = new Reward(); vendor.reward.success(extra);
        Completion full = new Completion(); ads.showRewarded("123", "capacity-overflow", events, full);
        check("reward-capacity".equals(full.error) && !first.destroyed, "容量满时保留旧请求并拒绝展示");
        first.events.verified(true, 1, "coin");
        Completion after = new Completion(); ads.showRewarded("123", "capacity-after", events, after);
        check(after.successes == 1, "旧请求真实结算后可恢复容量");
    }

    /** 连续执行可复现的纯 Java 行为验证。 */
    public static void main(String[] args) {
        initialization(); loadingAndPolicy(); showLifecycle(); showFailure(); banner(); capacity();
        System.out.println("PASS");
    }
}
