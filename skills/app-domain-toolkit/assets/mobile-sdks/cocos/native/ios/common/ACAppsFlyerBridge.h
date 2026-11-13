#import <Foundation/Foundation.h>
/** AppsFlyer 7 的冷启动接线与 JS 服务注册。 */
@interface ACAppsFlyerBridge : NSObject
+ (void)configureEarlyWithKey:(NSString *)key appId:(NSString *)appId authorized:(BOOL)authorized launchOptions:(NSDictionary *)options;
+ (void)registerService;
@end
