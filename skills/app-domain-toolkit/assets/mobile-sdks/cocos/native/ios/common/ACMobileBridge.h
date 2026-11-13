#import <Foundation/Foundation.h>

/** 将原生 SDK 的单次异步结果返回到对应 JS 请求。 */
@interface ACMobileReply : NSObject
@property(nonatomic, readonly) NSNumber *requestId;
- (instancetype)initWithId:(NSNumber *)requestId;
- (void)success:(id)value;
- (void)fail:(NSString *)code;
@end

/** Cocos JSB 按服务注册与消息回传，不覆盖其他插件的回调。 */
@interface ACMobileBridge : NSObject
+ (void)registerService:(NSString *)service handler:(void (^)(NSString *, NSDictionary *, ACMobileReply *))handler;
+ (void)event:(NSString *)source name:(NSString *)name adUnit:(NSString *)adUnit requestId:(NSNumber *)requestId value:(id)value;
@end
