#import "ACMaxBridge.h"
#import "ACMobileBridge.h"
#import <AppLovinSDK/AppLovinSDK.h>

/** MAX 独立广告实现与回调所有者。 */
@interface ACMaxBridge () <MARewardedAdDelegate, MAAdViewAdDelegate>
@property(nonatomic, weak) UIViewController *controller;
@property(nonatomic) BOOL ready;
@property(nonatomic, strong) NSMutableDictionary *rewarded;
@property(nonatomic, strong) NSMutableDictionary *interstitial;
@property(nonatomic, strong) NSMutableDictionary *banners;
@property(nonatomic, strong) NSMutableDictionary<NSString *, ACMobileReply *> *loads;
@property(nonatomic, strong) NSMutableDictionary<NSString *, ACMobileReply *> *shows;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSNumber *> *rewards;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSNumber *> *presentations;
@property(nonatomic, strong) NSMutableSet<NSString *> *retiredLoads;
@end
@implementation ACMaxBridge
/** 注册一次服务，更新当前界面控制器。 */
+ (void)registerWithViewController:(UIViewController *)controller {
    static ACMaxBridge *owner; static dispatch_once_t once;
    dispatch_once(&once, ^{ owner = [self new]; owner.rewarded = [NSMutableDictionary dictionary]; owner.interstitial = [NSMutableDictionary dictionary]; owner.banners = [NSMutableDictionary dictionary]; owner.loads = [NSMutableDictionary dictionary]; owner.shows = [NSMutableDictionary dictionary]; owner.rewards = [NSMutableDictionary dictionary]; owner.presentations = [NSMutableDictionary dictionary]; owner.retiredLoads = [NSMutableSet set];
        [ACMobileBridge registerService:@"max" handler:^(NSString *operation, NSDictionary *payload, ACMobileReply *reply) { [owner handle:operation payload:payload reply:reply]; }];
    }); owner.controller = controller;
}
/** 通过真实 MAX SDK 处理已选择的广告操作。 */
- (void)handle:(NSString *)op payload:(NSDictionary *)payload reply:(ACMobileReply *)reply {
    if ([op isEqual:@"initialize"]) {
        if (![payload[@"nonPersonalizedVerified"] boolValue] || ![payload[@"maxFlowConfigured"] boolValue]) { [reply fail:@"ads-privacy-not-configured"]; return; }
        NSString *key = payload[@"sdkKey"]; if (!key.length) { [reply fail:@"max-missing-key"]; return; }
        if (self.ready) { [reply success:nil]; return; }
        [ALPrivacySettings setHasUserConsent:[payload[@"hasUserConsent"] boolValue]];
        ALSdkInitializationConfiguration *config = [ALSdkInitializationConfiguration configurationWithSdkKey:key builderBlock:^(ALSdkInitializationConfigurationBuilder *builder) { builder.mediationProvider = ALMediationProviderMAX; }];
        [[ALSdk shared] initializeWithConfiguration:config completionHandler:^(ALSdkConfiguration *status) { self.ready = YES; [reply success:nil]; }]; return;
    }
    if (!self.ready || !self.controller) { [reply fail:@"max-not-ready"]; return; }
    NSString *unit = payload[@"adUnitId"]; if (![unit isKindOfClass:NSString.class] || !unit.length) { [reply fail:@"missing-ad-unit"]; return; }
    if ([self.retiredLoads containsObject:unit] && ([op hasPrefix:@"load"] || [op isEqual:@"createBanner"])) { [reply fail:@"ad-previous-load-pending"]; return; }
    if ([op isEqual:@"loadRewarded"] || [op isEqual:@"loadInterstitial"]) {
        if (self.loads[unit]) { [reply fail:@"ad-load-in-progress"]; return; } self.loads[unit] = reply;
        if ([op isEqual:@"loadRewarded"]) { MARewardedAd *ad = self.rewarded[unit]; if (!ad) { ad = [MARewardedAd sharedWithAdUnitIdentifier:unit]; ad.delegate = self; self.rewarded[unit] = ad; } [ad loadAd]; }
        else { MAInterstitialAd *ad = self.interstitial[unit]; if (!ad) { ad = [[MAInterstitialAd alloc] initWithAdUnitIdentifier:unit]; ad.delegate = self; self.interstitial[unit] = ad; } [ad loadAd]; } return;
    }
    if ([op isEqual:@"showRewarded"]) {
        MARewardedAd *ad = self.rewarded[unit]; if (!ad || !ad.ready) { [reply fail:@"ad-not-ready"]; return; }
        // 不丢弃未结算奖励，达到上限时拒绝新的展示。
        if (self.rewards.count >= 128 || self.presentations.count >= 128) { [reply fail:@"pending-reward-capacity-reached"]; return; }
        NSString *placement = NSUUID.UUID.UUIDString; self.rewards[placement] = reply.requestId; self.presentations[placement] = reply.requestId; self.shows[placement] = reply; [ad showAdForPlacement:placement]; return;
    }
    if ([op isEqual:@"showInterstitial"]) { MAInterstitialAd *ad = self.interstitial[unit]; if (!ad || !ad.ready) { [reply fail:@"ad-not-ready"]; return; } if (self.presentations.count >= 128) { [reply fail:@"pending-presentation-capacity-reached"]; return; } NSString *placement = NSUUID.UUID.UUIDString; self.shows[placement] = reply; self.presentations[placement] = reply.requestId; [ad showAdForPlacement:placement]; return; }
    if ([op isEqual:@"createBanner"]) {
        if (self.banners[unit] || self.loads[unit]) { [reply fail:@"banner-already-exists"]; return; }
        NSString *position = payload[@"position"]; if (![position isEqual:@"top"] && ![position isEqual:@"bottom"]) { [reply fail:@"invalid-banner-position"]; return; }
        MAAdView *view = [[MAAdView alloc] initWithAdUnitIdentifier:unit adFormat:MAAdFormat.banner]; view.delegate = self; view.translatesAutoresizingMaskIntoConstraints = NO; self.banners[unit] = view; self.loads[unit] = reply;
        [self.controller.view addSubview:view]; [NSLayoutConstraint activateConstraints:@[[view.widthAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.widthAnchor], [view.heightAnchor constraintEqualToConstant:50], [view.centerXAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.centerXAnchor], [position isEqual:@"top"] ? [view.topAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.topAnchor] : [view.bottomAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.bottomAnchor]]]; [view loadAd]; return;
    }
    if ([op isEqual:@"showBanner"] || [op isEqual:@"hideBanner"]) { MAAdView *view = self.banners[unit]; if (!view) { [reply fail:@"banner-not-found"]; return; } view.hidden = [op isEqual:@"hideBanner"]; if (view.hidden) [view stopAutoRefresh]; else [view startAutoRefresh]; [reply success:nil]; return; }
    if ([op isEqual:@"destroyAd"]) { if (self.loads[unit]) [self.retiredLoads addObject:unit]; [self.loads[unit] fail:@"ad-destroyed"]; [self.loads removeObjectForKey:unit]; [self.rewarded removeObjectForKey:unit]; [self.interstitial removeObjectForKey:unit]; MAAdView *view = self.banners[unit]; [view stopAutoRefresh]; [view removeFromSuperview]; [self.banners removeObjectForKey:unit]; [reply success:nil]; return; }
    [reply fail:@"unsupported-max-operation"];
}
/** SDK 加载完成后结束对应请求。 */
- (void)didLoadAd:(MAAd *)ad { if ([self.retiredLoads containsObject:ad.adUnitIdentifier]) { [self.retiredLoads removeObject:ad.adUnitIdentifier]; return; } ACMobileReply *reply = self.loads[ad.adUnitIdentifier]; if (!reply) return; [self.loads removeObjectForKey:ad.adUnitIdentifier]; [reply success:nil]; [ACMobileBridge event:@"max" name:@"loaded" adUnit:ad.adUnitIdentifier requestId:nil value:nil]; }
/** SDK 加载失败后保留稳定错误分类。 */
- (void)didFailToLoadAdForAdUnitIdentifier:(NSString *)unit withError:(MAError *)error { if ([self.retiredLoads containsObject:unit]) { [self.retiredLoads removeObject:unit]; return; } ACMobileReply *reply = self.loads[unit]; if (!reply) return; [self.loads removeObjectForKey:unit]; [reply fail:@"ad-load-failed"]; [ACMobileBridge event:@"max" name:@"loadFailed" adUnit:unit requestId:nil value:nil]; }
/** 根据 placement 找回本次展示请求。 */
- (void)didDisplayAd:(MAAd *)ad { ACMobileReply *reply = self.shows[ad.placement ?: @""]; [self.shows removeObjectForKey:(ad.placement ?: @"")]; [reply success:nil]; [ACMobileBridge event:@"max" name:@"shown" adUnit:ad.adUnitIdentifier requestId:self.rewards[ad.placement ?: @""] ?: reply.requestId value:nil]; }
/** 关闭事件不消费奖励令牌，允许 SDK 迟到奖励。 */
- (void)didHideAd:(MAAd *)ad { NSString *token = ad.placement ?: @""; NSNumber *identifier = self.presentations[token]; [self.presentations removeObjectForKey:token]; [ACMobileBridge event:@"max" name:@"closed" adUnit:ad.adUnitIdentifier requestId:identifier value:nil]; }
/** 原生失败明确结束展示请求。 */
- (void)didFailToDisplayAd:(MAAd *)ad withError:(MAError *)error { NSString *token = ad.placement ?: @""; ACMobileReply *reply = self.shows[token]; [self.shows removeObjectForKey:token]; NSNumber *identifier = self.presentations[token]; [self.presentations removeObjectForKey:token]; [self.rewards removeObjectForKey:token]; [reply fail:@"ad-show-failed"]; [ACMobileBridge event:@"max" name:@"showFailed" adUnit:ad.adUnitIdentifier requestId:identifier value:nil]; }
/** 一次性 placement 只在 SDK 发奖时消费，防止重复结算。 */
- (void)didRewardUserForAd:(MAAd *)ad withReward:(MAReward *)reward { NSNumber *identifier = self.rewards[ad.placement ?: @""]; if (!identifier) return; [self.rewards removeObjectForKey:(ad.placement ?: @"")]; [ACMobileBridge event:@"max" name:@"earned" adUnit:ad.adUnitIdentifier requestId:identifier value:nil]; }
/** 当前业务接口不需要点击和展开状态。 */
- (void)didClickAd:(MAAd *)ad {}
- (void)didExpandAd:(MAAd *)ad {}
- (void)didCollapseAd:(MAAd *)ad {}
@end
