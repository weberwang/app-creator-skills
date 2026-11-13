# Cocos Creator 3.8 移动 SDK 接入状态

当前提供 TypeScript 业务接口、Android 与 iOS 的 Firebase / AppsFlyer 桥以及 AdMob / MAX 原生实现。**Android 与 iOS 原生代码尚未以真实第三方 SDK 构建验证；不得将此目录视为已经完成的平台接入。**

Android 项目在 SDK 授权、依赖和清单配置完成后，于 `Application.onCreate` 早期调用 `AppsFlyerBridge.configureEarly(application, devKey, authorized)`。Creator 引擎创建完成后通过 `CocosHelper.runOnGameThread` 注册 `FirebaseAnalyticsBridge.register(activity)`、`FirebaseCrashlyticsBridge.register(activity)`、`AppsFlyerBridge.register(activity)` 和 `AdMobBridge.register(activity)` 或 `MaxBridge.register(activity)`。Activity 重建后重新注册以更新窗口引用，Banner 应先由业务释放。只复制、引入选中 provider 的文件及其 SDK。

项目须将 `native/android/common` 和所选 `native/android/providers` 中的 Java 源加入 Android 工程源码集，并按供应商文档配置 Firebase Analytics、Crashlytics、AppsFlyer 7 和所选广告 SDK 的 Gradle 依赖及应用标识；iOS 将 `native/ios/common` 和所选 provider 源加入 Xcode target，并配置对应原生依赖、Firebase 配置及广告应用标识。安装脚本复制源码，不会替项目修改 Gradle、Pod、Xcode target 或应用配置。版本锁定后必须在项目实际环境编译、检查官方 API 及原生启动顺序。

iOS 在 `application:didFinishLaunchingWithOptions:` 中、已有真实授权时调用 `[ACAppsFlyerBridge configureEarlyWithKey:devKey appId:appleAppId authorized:YES launchOptions:launchOptions]`，从项目实际配置提供 ID。引擎启动后在 Cocos 游戏线程调用 `[ACFirebaseBridge registerServices]`、`[ACAppsFlyerBridge registerService]` 和 `[ACAdMobBridge registerWithViewController:controller]` 或 `[ACMaxBridge registerWithViewController:controller]`。所有 `.mm` 以 ARC 编译并加入目标，第三方 SDK 使用项目实际依赖版本。控制器重建时需重新注册并先释放 Banner；不要同时编译两个 provider。AppsFlyer 7 缺少早期接线时明确报错；授权不可用时不得伪造授权启动 SDK。

MAX 对每次激励展示生成随机 placement，映射容量为 128；超过上限时拒绝新展示，旧记录不会因关闭或超时被当作已结算。加载过程中销毁 MAX 广告后，在旧回调到达前拒绝同广告位的后续加载；若 SDK 不再回调，则该广告位需要重启进程后恢复。placement 会进入聚合平台统计，不得写入用户、交易或订单信息，项目需评估报表维度数量。

Firebase 必须在原生清单中预先关闭 Analytics 和 Crashlytics 的自动采集，取得项目实际授权后才按需启用；Crashlytics 的运行时关闭可能从下次启动起生效，不能声称立即停止全部采集。广告初始化前由项目验证非个性化请求和各聚合网络的隐私设置；MAX 还需配置它的隐私流程。业务要确保 Banner 不遮挡可交互内容。SDK 初始化互相独立，不要阻塞首帧。

游戏入口调用 `sdk.initialize(onFailure)` 后立即继续加载和进入游戏；各 SDK 自己启动并报告失败，不等待任何 SDK、广告或隐私选择。未满足授权的能力保持受限，其他能力及游戏正常继续。广告 SDK 就绪后调用 `sdk.ads.preloadRewarded(unit, onFailure)` 或 `preloadInterstitial(unit, onFailure)` 在后台发起加载；不要把加载 Promise、广告回调或失败作为进入游戏、关卡切换与游戏恢复的前置条件。通过 `tryShowRewarded(unit, onFailure)` 或 `tryShowInterstitial(unit, onFailure)` 同步取得 `requested`、`not-ready`、`restricted`、`busy`、`unconfigured` 或 `error`，未受理时立即走游戏既有回退。`requested` 只表示请求已发出，奖励仍由 `onAdEvent` 的真实 `earned` 事件结算；正常关闭、失败和广告未加载均不自动发奖。插屏和激励共享展示锁，真实关闭或失败才允许下一次展示。隐私状态变化时调用 `setAdsAllowed` 更新策略；撤回立即阻止新广告并失效旧加载，受限期间仍可隐藏、销毁横幅。需要满足授权后重新启动广告 SDK 时单独调用 `sdk.ads.initialize()`，不要暂停游戏等待。

`sdk.dispose(onFailure)` 独立释放管理器并立即返回；仍有原生请求或业务监听时桥会保持打开，回调会报告关闭失败，可在在途请求完成且监听注销后再次调用。不能把等待原生回调或桥关闭作为场景切换的前置条件。

奖励只能以 `earned` 事件结算，`closed` 不代表发奖；MAX 使用随机 placement 关联原展示请求，业务不能以当前广告位代替原请求进行结算。事件消费者应在释放前注销自己的监听器；原生请求仍在处理时保留桥以接收真实回调，游戏无需等待请求完成。

使用已安装入口时，把 Creator 的 `native.jsbBridgeWrapper` 和唯一配置对象传给 `createInstalledMobileSdks`，调用组合根的 `initialize()` 后立即继续游戏；各能力在自身就绪后按需使用，独立处理失败。原生桥绑定到同一 JSB 实例的进程生命周期，关闭后不可重新创建，以免迟到奖励和新请求编号碰撞。实例应由应用组合根持有，不能跟随场景切换重建。

参考文档：[Creator 原生事件桥](https://github.com/cocos/cocos-example-projects/blob/master/native-script-bridge/README-jsbBridgeWrapper.md)、[AppsFlyer Android SDK 7](https://dev.appsflyer.com/hc/docs/android-sdk-7)、[AdMob Android](https://developers.google.com/admob/android/quick-start)、[MAX Android](https://developers.applovin.com/en/max/android/overview/integration/)。
