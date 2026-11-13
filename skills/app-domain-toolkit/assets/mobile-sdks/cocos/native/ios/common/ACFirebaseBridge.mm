#import "ACFirebaseBridge.h"
#import "ACMobileBridge.h"
#import <FirebaseCore/FirebaseCore.h>
#import <FirebaseAnalytics/FirebaseAnalytics.h>
#import <FirebaseCrashlytics/FirebaseCrashlytics.h>

@implementation ACFirebaseBridge
/** 注册两个互相独立的服务；创建桥时不配置 Firebase 或启动采集。 */
+ (void)registerServices {
    __block BOOL analyticsEnabled = NO;
    __block BOOL crashlyticsEnabled = NO;
    [ACMobileBridge registerService:@"firebase.analytics" handler:^(NSString *operation, NSDictionary *payload, ACMobileReply *reply) {
        if ([operation isEqualToString:@"initialize"]) {
            if (![FIRApp defaultApp]) [FIRApp configure];
            analyticsEnabled = NO; [FIRAnalytics setAnalyticsCollectionEnabled:NO]; [reply success:nil]; return;
        }
        if (![FIRApp defaultApp]) { [reply fail:@"firebase-not-ready"]; return; }
        if ([operation isEqualToString:@"setCollectionEnabled"]) { analyticsEnabled = [payload[@"enabled"] boolValue]; [FIRAnalytics setAnalyticsCollectionEnabled:analyticsEnabled]; [reply success:nil]; return; }
        if (!analyticsEnabled) { [reply fail:@"analytics-disabled"]; return; }
        else if ([operation isEqualToString:@"logEvent"]) [FIRAnalytics logEventWithName:payload[@"name"] parameters:payload[@"parameters"]];
        else if ([operation isEqualToString:@"setUserId"]) [FIRAnalytics setUserID:payload[@"userId"] == NSNull.null ? nil : payload[@"userId"]];
        else if ([operation isEqualToString:@"setUserProperty"]) [FIRAnalytics setUserPropertyString:payload[@"value"] == NSNull.null ? nil : payload[@"value"] forName:payload[@"name"]];
        else { [reply fail:@"unsupported-analytics-operation"]; return; }
        [reply success:nil];
    }];
    [ACMobileBridge registerService:@"firebase.crashlytics" handler:^(NSString *operation, NSDictionary *payload, ACMobileReply *reply) {
        if ([operation isEqualToString:@"initialize"]) {
            if (![FIRApp defaultApp]) [FIRApp configure];
            crashlyticsEnabled = NO; [[FIRCrashlytics crashlytics] setCrashlyticsCollectionEnabled:NO]; [reply success:nil]; return;
        }
        if (![FIRApp defaultApp]) { [reply fail:@"firebase-not-ready"]; return; }
        FIRCrashlytics *sdk = [FIRCrashlytics crashlytics];
        if ([operation isEqualToString:@"setCollectionEnabled"]) { crashlyticsEnabled = [payload[@"enabled"] boolValue]; [sdk setCrashlyticsCollectionEnabled:crashlyticsEnabled]; [reply success:nil]; return; }
        if (!crashlyticsEnabled) { [reply fail:@"crashlytics-disabled"]; return; }
        else if ([operation isEqualToString:@"recordException"]) {
            NSDictionary *report = payload[@"error"];
            if (![report isKindOfClass:NSDictionary.class]) { [reply fail:@"invalid-error"]; return; }
            // 调用方负责脱敏，异常仅在业务显式上报时记录。
            NSError *error = [NSError errorWithDomain:report[@"name"] ?: @"JavascriptError" code:1 userInfo:@{NSLocalizedDescriptionKey: report[@"message"] ?: @""}];
            [sdk recordError:error];
        }
        else if ([operation isEqualToString:@"log"]) [sdk log:payload[@"message"]];
        else if ([operation isEqualToString:@"setCustomKey"]) [sdk setCustomValue:payload[@"value"] forKey:payload[@"key"]];
        else if ([operation isEqualToString:@"setUserId"]) [sdk setUserID:payload[@"userId"]];
        else { [reply fail:@"unsupported-crashlytics-operation"]; return; }
        [reply success:nil];
    }];
}
@end
