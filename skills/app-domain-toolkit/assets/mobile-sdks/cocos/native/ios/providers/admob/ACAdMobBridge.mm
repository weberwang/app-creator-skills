#import "ACAdMobBridge.h"
#import "ACMobileBridge.h"
#import <GoogleMobileAds/GoogleMobileAds.h>

/** 一次全屏展示持有自己的请求编号，避免迟到奖励关联到其他展示。 */
@interface ACAdMobPresentation : NSObject <GADFullScreenContentDelegate>
@property(nonatomic, copy) NSString *unit;
@property(nonatomic, strong) ACMobileReply *reply;
@property(nonatomic) BOOL earned;
@property(nonatomic, copy) void (^releaseOwner)(void);
@end
@implementation ACAdMobPresentation
/** 展示由 SDK 确认后才返回成功。 */
- (void)adDidPresentFullScreenContent:(id<GADFullScreenPresentingAd>)ad { [self.reply success:nil]; [ACMobileBridge event:@"admob" name:@"shown" adUnit:self.unit requestId:self.reply.requestId value:nil]; }
/** 关闭不是奖励，保持奖励闭包自身身份。 */
- (void)adDidDismissFullScreenContent:(id<GADFullScreenPresentingAd>)ad { [ACMobileBridge event:@"admob" name:@"closed" adUnit:self.unit requestId:self.reply.requestId value:nil]; if (self.releaseOwner) self.releaseOwner(); }
/** 展示失败只返回脱敏分类。 */
- (void)ad:(id<GADFullScreenPresentingAd>)ad didFailToPresentFullScreenContentWithError:(NSError *)error { [self.reply fail:@"ad-show-failed"]; [ACMobileBridge event:@"admob" name:@"showFailed" adUnit:self.unit requestId:self.reply.requestId value:nil]; if (self.releaseOwner) self.releaseOwner(); }
@end

/** Banner 加载回调负责完成对应请求。 */
@interface ACAdMobBanner : NSObject <GADBannerViewDelegate>
@property(nonatomic, strong) GADBannerView *view;
@property(nonatomic, strong) ACMobileReply *reply;
@property(nonatomic, copy) NSString *unit;
@end
@implementation ACAdMobBanner
/** 通知业务实际加载结果。 */
- (void)bannerViewDidReceiveAd:(GADBannerView *)bannerView { [self.reply success:nil]; [ACMobileBridge event:@"admob" name:@"loaded" adUnit:self.unit requestId:nil value:nil]; }
/** 转换加载失败为稳定错误码。 */
- (void)bannerView:(GADBannerView *)bannerView didFailToReceiveAdWithError:(NSError *)error { [self.reply fail:@"ad-load-failed"]; [ACMobileBridge event:@"admob" name:@"loadFailed" adUnit:self.unit requestId:nil value:nil]; }
@end

/** 广告对象仅由选中的 AdMob 服务持有。 */
@interface ACAdMobBridge ()
@property(nonatomic, weak) UIViewController *controller;
@property(nonatomic) BOOL ready;
@property(nonatomic, strong) NSMutableDictionary *rewarded;
@property(nonatomic, strong) NSMutableDictionary *interstitial;
@property(nonatomic, strong) NSMutableDictionary *banners;
@property(nonatomic, strong) NSMutableDictionary *pending;
@property(nonatomic, strong) NSMutableSet *presentations;
@end
@implementation ACAdMobBridge
/** 对每个请求显式设置非个性化广告参数。 */
- (GADRequest *)request { GADRequest *request = [GADRequest request]; GADExtras *extras = [GADExtras new]; extras.additionalParameters = @{ @"npa": @"1" }; [request registerAdNetworkExtras:extras]; return request; }
/** 注册一次，宿主重建时更新当前控制器。 */
+ (void)registerWithViewController:(UIViewController *)controller {
    static ACAdMobBridge *owner; static dispatch_once_t once;
    dispatch_once(&once, ^{ owner = [self new]; owner.rewarded = [NSMutableDictionary dictionary]; owner.interstitial = [NSMutableDictionary dictionary]; owner.banners = [NSMutableDictionary dictionary]; owner.pending = [NSMutableDictionary dictionary]; owner.presentations = [NSMutableSet set];
        [ACMobileBridge registerService:@"admob" handler:^(NSString *operation, NSDictionary *payload, ACMobileReply *reply) { [owner handle:operation payload:payload reply:reply]; }];
    }); owner.controller = controller;
}
/** 映射 JS 调用到具体 Google Mobile Ads 接口。 */
- (void)handle:(NSString *)op payload:(NSDictionary *)payload reply:(ACMobileReply *)reply {
    if ([op isEqual:@"initialize"]) {
        if (![payload[@"nonPersonalizedVerified"] boolValue]) { [reply fail:@"ads-privacy-not-configured"]; return; }
        if (self.ready) { [reply success:nil]; return; }
        [[GADMobileAds sharedInstance] startWithCompletionHandler:^(GADInitializationStatus *status) { self.ready = YES; [reply success:nil]; }]; return;
    }
    if (!self.ready || !self.controller) { [reply fail:@"admob-not-ready"]; return; }
    NSString *unit = payload[@"adUnitId"]; if (![unit isKindOfClass:NSString.class] || !unit.length) { [reply fail:@"missing-ad-unit"]; return; }
    if ([op isEqual:@"loadRewarded"] || [op isEqual:@"loadInterstitial"]) {
        NSString *key = [op stringByAppendingString:unit]; if (self.pending[key]) { [reply fail:@"ad-load-in-progress"]; return; } self.pending[key] = reply;
        if ([op isEqual:@"loadRewarded"]) [GADRewardedAd loadWithAdUnitID:unit request:[self request] completionHandler:^(GADRewardedAd *ad, NSError *error) {
            if (self.pending[key] != reply) return; [self.pending removeObjectForKey:key]; if (error) { [reply fail:@"ad-load-failed"]; return; }
            self.rewarded[unit] = ad; [reply success:nil]; [ACMobileBridge event:@"admob" name:@"loaded" adUnit:unit requestId:nil value:nil];
        }];
        else [GADInterstitialAd loadWithAdUnitID:unit request:[self request] completionHandler:^(GADInterstitialAd *ad, NSError *error) {
            if (self.pending[key] != reply) return; [self.pending removeObjectForKey:key]; if (error) { [reply fail:@"ad-load-failed"]; return; }
            self.interstitial[unit] = ad; [reply success:nil]; [ACMobileBridge event:@"admob" name:@"loaded" adUnit:unit requestId:nil value:nil];
        }]; return;
    }
    if ([op isEqual:@"showRewarded"] || [op isEqual:@"showInterstitial"]) {
        BOOL reward = [op isEqual:@"showRewarded"]; id ad = reward ? self.rewarded[unit] : self.interstitial[unit];
        if (!ad) { [reply fail:@"ad-not-ready"]; return; }
        if (reward) [self.rewarded removeObjectForKey:unit]; else [self.interstitial removeObjectForKey:unit];
        ACAdMobPresentation *present = [ACAdMobPresentation new]; present.unit = unit; present.reply = reply; [self.presentations addObject:present];
        __weak ACAdMobBridge *weakSelf = self; __weak ACAdMobPresentation *weakPresent = present;
        present.releaseOwner = ^{ [weakSelf.presentations removeObject:weakPresent]; };
        if (reward) { GADRewardedAd *rewarded = ad; rewarded.fullScreenContentDelegate = present;
            [rewarded presentFromRootViewController:self.controller userDidEarnRewardHandler:^{ if (!present.earned) { present.earned = YES; [ACMobileBridge event:@"admob" name:@"earned" adUnit:unit requestId:reply.requestId value:nil]; } }];
        } else { GADInterstitialAd *interstitial = ad; interstitial.fullScreenContentDelegate = present; [interstitial presentFromRootViewController:self.controller]; } return;
    }
    if ([op isEqual:@"createBanner"]) {
        if (self.banners[unit]) { [reply fail:@"banner-already-exists"]; return; }
        NSString *position = payload[@"position"]; if (![position isEqual:@"top"] && ![position isEqual:@"bottom"]) { [reply fail:@"invalid-banner-position"]; return; }
        ACAdMobBanner *banner = [ACAdMobBanner new]; banner.unit = unit; banner.reply = reply; banner.view = [[GADBannerView alloc] initWithAdSize:GADAdSizeBanner]; banner.view.adUnitID = unit; banner.view.rootViewController = self.controller; banner.view.delegate = banner; banner.view.translatesAutoresizingMaskIntoConstraints = NO;
        [self.controller.view addSubview:banner.view]; [NSLayoutConstraint activateConstraints:@[[banner.view.centerXAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.centerXAnchor], [position isEqual:@"top"] ? [banner.view.topAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.topAnchor] : [banner.view.bottomAnchor constraintEqualToAnchor:self.controller.view.safeAreaLayoutGuide.bottomAnchor]]]; self.banners[unit] = banner; [banner.view loadRequest:[self request]]; return;
    }
    if ([op isEqual:@"showBanner"] || [op isEqual:@"hideBanner"]) { ACAdMobBanner *banner = self.banners[unit]; if (!banner) { [reply fail:@"banner-not-found"]; return; } banner.view.hidden = [op isEqual:@"hideBanner"]; [reply success:nil]; return; }
    if ([op isEqual:@"destroyAd"]) { for (NSString *prefix in @[@"loadRewarded", @"loadInterstitial"]) { NSString *key = [prefix stringByAppendingString:unit]; [self.pending[key] fail:@"ad-destroyed"]; [self.pending removeObjectForKey:key]; } [self.rewarded removeObjectForKey:unit]; [self.interstitial removeObjectForKey:unit]; ACAdMobBanner *banner = self.banners[unit]; [banner.reply fail:@"ad-destroyed"]; [banner.view removeFromSuperview]; [self.banners removeObjectForKey:unit]; [reply success:nil]; return; }
    [reply fail:@"unsupported-admob-operation"];
}
@end
