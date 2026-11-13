#import "ACAppsFlyerBridge.h"
#import "ACMobileBridge.h"
#import <AppsFlyerLib/AppsFlyerLib.h>

/** SDK 7 的授权和 session-ready 必须同时成立才能开始会话。 */
@interface ACAppsFlyerBridge () <AppsFlyerLibDelegate>
@property(nonatomic, copy) NSString *key;
@property(nonatomic, copy) NSString *appId;
@property(nonatomic) BOOL allowed;
@property(nonatomic) BOOL requested;
@property(nonatomic) BOOL ready;
@property(nonatomic) BOOL started;
@property(nonatomic, strong) NSMutableArray<ACMobileReply *> *waiters;
@end
@implementation ACAppsFlyerBridge
/** 保持 SDK delegate 生命周期，并集中管理跨回调状态。 */
+ (instancetype)owner { static ACAppsFlyerBridge *owner; static dispatch_once_t once; dispatch_once(&once, ^{ owner = [self new]; owner.waiters = [NSMutableArray array]; }); return owner; }
/** 必须从 didFinishLaunching 调用，未授权时不配置 SDK。 */
+ (void)configureEarlyWithKey:(NSString *)key appId:(NSString *)appId authorized:(BOOL)authorized launchOptions:(NSDictionary *)options {
    if (!authorized || !key.length || !appId.length) return;
    ACAppsFlyerBridge *owner = [self owner];
    if (owner.key) return;
    owner.key = key; owner.appId = appId;
    AppsFlyerLib *sdk = [AppsFlyerLib shared]; sdk.delegate = owner;
    [sdk initWithDevKey:key appleAppId:appId];
    if (options) [sdk handleLaunchOptions:options];
    [sdk registerSessionReadyListener:^{ dispatch_async(dispatch_get_main_queue(), ^{ owner.ready = YES; [owner startIfReady]; }); }];
}
/** SDK 接受会话启动不等于归因服务端已处理。 */
- (void)startIfReady {
    if (!self.allowed || !self.requested || !self.ready) return;
    self.ready = NO; self.started = YES;
    [[AppsFlyerLib shared] start];
    NSArray *waiters = [self.waiters copy]; [self.waiters removeAllObjects];
    for (ACMobileReply *reply in waiters) [reply success:nil];
}
/** 注册三项明确操作，未早期配置时拒绝迟到初始化。 */
+ (void)registerService {
    ACAppsFlyerBridge *owner = [self owner];
    [ACMobileBridge registerService:@"appsflyer" handler:^(NSString *operation, NSDictionary *payload, ACMobileReply *reply) {
        if ([operation isEqualToString:@"initialize"]) {
            if (!owner.key) { [reply fail:@"appsflyer-early-configuration-required"]; return; }
            if (![owner.key isEqual:payload[@"devKey"]] || ![owner.appId isEqual:payload[@"iosAppId"]]) { [reply fail:@"appsflyer-key-conflict"]; return; }
            if (![payload[@"allowAttribution"] boolValue]) { [reply fail:@"attribution-not-authorized"]; return; }
            owner.allowed = YES; owner.requested = YES;
            if (owner.started) { [reply success:nil]; return; }
            [owner.waiters addObject:reply]; owner.ready = owner.ready || [[AppsFlyerLib shared] isSessionReady]; [owner startIfReady]; return;
        }
        if ([operation isEqualToString:@"setAllowed"]) {
            BOOL allowed = [payload[@"allowed"] boolValue]; owner.allowed = allowed;
            if (!allowed) { owner.started = NO; owner.requested = NO; for (ACMobileReply *waiter in owner.waiters) [waiter fail:@"attribution-not-authorized"]; [owner.waiters removeAllObjects]; }
            if (owner.key) [AppsFlyerLib shared].isStopped = !allowed;
            [reply success:nil]; return;
        }
        if ([operation isEqualToString:@"logEvent"]) {
            if (!owner.allowed || !owner.started) { [reply fail:@"appsflyer-not-ready"]; return; }
            [[AppsFlyerLib shared] logEventWithEventName:payload[@"name"] eventValues:payload[@"values"] completionHandler:^(NSDictionary *result, NSError *error) {
                if (error) [reply fail:@"appsflyer-event-failed"]; else [reply success:nil];
            }]; return;
        }
        [reply fail:@"unsupported-appsflyer-operation"];
    }];
}
/** 仅转发 SDK 实际提供的归因数据，项目按授权处理。 */
- (void)onConversionDataSuccess:(NSDictionary *)data { if (self.allowed) [ACMobileBridge event:@"appsflyer" name:@"conversion" adUnit:nil requestId:nil value:data]; }
/** 归因失败只提供脱敏分类。 */
- (void)onConversionDataFail:(NSError *)error { if (self.allowed) [ACMobileBridge event:@"appsflyer" name:@"conversionError" adUnit:nil requestId:nil value:@"conversion-failed"]; }
@end
