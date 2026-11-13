#import "ACMobileBridge.h"
#import "cocos/platform/apple/JsbBridgeWrapper.h"
#include "application/ApplicationManager.h"
#include "base/Scheduler.h"

/** 回到 Cocos 游戏线程，避免 JSB 事件字典被多线程并发修改。 */
static void ACDispatch(NSString *event, NSDictionary *value) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:value options:0 error:nil];
    if (!data) return;
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    dispatch_async(dispatch_get_main_queue(), ^{
        auto app = cc::ApplicationManager::getInstance()->getCurrentApp();
        if (!app || !app->getEngine() || !app->getEngine()->getScheduler()) return;
        app->getEngine()->getScheduler()->performFunctionInCocosThread([event, json]() {
            [[JsbBridgeWrapper sharedInstance] dispatchEventToScript:event arg:json];
        });
    });
}

@implementation ACMobileReply { BOOL _completed; }
/** 保存 JS 请求编号。 */
- (instancetype)initWithId:(NSNumber *)requestId { if ((self = [super init])) _requestId = requestId; return self; }
/** 原生接口实际完成后回复一次。 */
- (void)success:(id)value { [self finish:YES value:value error:nil]; }
/** 不泄露原生异常和凭据。 */
- (void)fail:(NSString *)code { [self finish:NO value:nil error:code]; }
/** 竞争回调只允许首次完成。 */
- (void)finish:(BOOL)ok value:(id)value error:(NSString *)error {
    @synchronized (self) { if (_completed) return; _completed = YES; }
    NSMutableDictionary *result = [@{ @"id": self.requestId, @"ok": @(ok) } mutableCopy];
    if (value) result[@"value"] = value; if (error) result[@"error"] = error;
    ACDispatch(@"appcreator.mobile.response", result);
}
@end

@implementation ACMobileBridge
/** 项目初始化时在游戏线程注册服务，原生 SDK 操作切到主线程。 */
+ (void)registerService:(NSString *)service handler:(void (^)(NSString *, NSDictionary *, ACMobileReply *))handler {
    NSString *name = [@"appcreator.mobile." stringByAppendingString:service];
    OnScriptEventListener listener = ^(NSString *raw) {
        NSData *data = [raw dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *message = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        if (![message isKindOfClass:NSDictionary.class] || ![message[@"id"] isKindOfClass:NSNumber.class] || ![message[@"operation"] isKindOfClass:NSString.class]) return;
        NSDictionary *payload = [message[@"payload"] isKindOfClass:NSDictionary.class] ? message[@"payload"] : @{};
        ACMobileReply *reply = [[ACMobileReply alloc] initWithId:message[@"id"]];
        dispatch_async(dispatch_get_main_queue(), ^{ handler(message[@"operation"], payload, reply); });
    };
    // Creator 3.8 的非 ARC 实现会消费传入 block 的一次所有权。
    OnScriptEventListener retained = (__bridge OnScriptEventListener)CFBridgingRetain([listener copy]);
    [[JsbBridgeWrapper sharedInstance] addScriptEventListener:name listener:retained];
}
/** 保留真实广告位和展示编号，未提供的字段不写入 JSON。 */
+ (void)event:(NSString *)source name:(NSString *)name adUnit:(NSString *)adUnit requestId:(NSNumber *)requestId value:(id)value {
    NSMutableDictionary *event = [@{ @"source": source, @"event": name } mutableCopy];
    if (adUnit) event[@"adUnitId"] = adUnit; if (requestId) event[@"requestId"] = requestId; if (value) event[@"value"] = value;
    ACDispatch(@"appcreator.mobile.event", event);
}
@end
