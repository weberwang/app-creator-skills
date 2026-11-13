# Unity Android / iOS 移动 SDK

这里的源码供生成项目复制使用；仅在 Android/iOS 原生构建启用，Unity Editor 和 Web 不能冒充成功。AppsFlyer 7.0.41 要求 Unity 2023.1 或更高版本。通过各官方安装方式导入项目实际使用的包，设置对应脚本编译符号：

| 能力 | 官方 SDK / 核对版本 | 编译符号 |
| --- | --- | --- |
| Analytics、Crashlytics | [Firebase Unity SDK](https://firebase.google.com/docs/unity/setup) | `APP_CREATOR_FIREBASE_SDK` |
| AdMob 聚合 | [Google Mobile Ads Unity SDK](https://developers.google.com/admob/unity/quick-start)，8+ API | `APP_CREATOR_ADMOB_SDK` |
| MAX 聚合 | [AppLovin MAX Unity 插件](https://github.com/AppLovin/AppLovin-MAX-Unity-Plugin)，8.6.6 | `APP_CREATOR_MAX_SDK` |
| 归因 | [AppsFlyer Unity 插件](https://github.com/AppsFlyerSDK/appsflyer-unity-plugin)，7.0.41 | `APP_CREATOR_APPSFLYER_SDK` |

仅安装并启用项目选中的顶层广告聚合。MAX 内使用 AdMob 网络 adapter 不意味着启动 AdMob 聚合；各 adapter 的安装、依赖解析、平台 App ID 及控制台设置以对应官方接入说明为准。配置不包含生产密钥或广告位默认值。

必须显式选择 `Advertising`；选择 MAX 时还需提供 `MaxSdkKey`，缺失时只会导致 MAX 初始化失败。`FirebaseInitializationAllowed` 默认关闭，满足隐私前置后才能启动 Firebase；两个模块可分别用 `SetInitializationAllowed` 更新授权，撤回后会关闭对应模块采集。Crashlytics 的采集变更生效时间遵循官方 SDK 行为。

启动场景中持有 `MobileSdkRuntime`，传入项目现有隐私状态和真实 Android/iOS 广告位，然后显式调用 `Start`；各 SDK 分别启动与报错。构造和释放都不自动初始化 SDK。组合根在进程内只创建一次，不在运行期间切换顶层聚合；启动超时并不取消厂商仍在进行的初始化。各 SDK 可单独重新调用自己的 `InitializeAsync`，但原生初始化未完成时不得并发重启。`Start` 不自动请求广告，业务按需要调用 `LoadInterstitial`、`LoadRewarded` 和 `ShowBanner`。

启动、场景加载与玩法不等待 SDK 初始化、隐私选择或广告加载；授权缺失时仅对应 SDK 受限并返回游戏流程。广告提前后台加载，展示接口返回不可展示时立即继续，奖励只在真实奖励回调后发放。错误报告回调自身失败也不会中断其他 SDK 投递。

Firebase 先检查并修复官方依赖，统计与异常采集分别控制。应在原生项目配置中按官方文档预先关闭自动采集，且考虑 SDK 持久化设置的优先级，保证进程启动前即满足项目真实授权策略；运行时 setter 不能撤回启动前已发生的数据采集。`LogEvent` 支持字符串、整数和浮点参数；`LogScreen`、用户属性、用户标识和异常记录受各自采集开关约束。

`AdPolicy` 的值必须来自项目已有授权和经过核实的构建配置。AdMob 初始化可能触发预加载，必须先满足隐私前置及所有启用广告源的非个性化设置；每次 Google 请求携带 `npa=1`，这不代替其他广告源的设置。MAX 内建隐私流程必须在真实构建配置中按项目选择关闭或完成，`MaxFlowConfigured` 只是项目确认，不会修改构建配置。已有真实同意状态不会被未知状态覆盖；首次未知时设置不同意，但广告请求仍须单独获得项目许可。

奖励仅由 SDK 的实际奖励回调发放，关闭、无填充和展示失败都不发奖。MAX 的每次展示使用随机 placement token，将其作为官方回调 `AdInfo.Placement` 与广告位一起关联；不传业务订单或用户标识。该做法会改变 MAX 后台 placement 维度，稳定业务场景名称应由项目自行记录。若回调缺少 placement 或与请求不匹配，不发放奖励。未收到奖励的已关闭展示保留关联记录以接收迟到回调；记录达到 `MaxPendingRewards`（默认 128）时拒绝新的激励展示，直到真实回调释放记录。不要以客户端回调代替服务端验签或结算。

AppsFlyer 使用官方 `AppsFlyer` 组件接收原生 RPC；启用前先满足项目真实跟踪授权。监听 session-ready 后调用 `start(false)`，返回只表示已派发，不证明网络送达或归因完成；归因结果由独立回调提供。所有公开操作应从 Unity 主线程发起，项目负责组件及组合根生命周期、平台权限、依赖版本和真机验证。

AppsFlyer Unity 7 的 [Session Ready 官方说明](https://github.com/AppsFlyerSDK/appsflyer-unity-plugin/blob/master/docs/BasicIntegration.md#session-ready-listener)指出：Android 首次冷启动时托管初始化可能错过首次 `onResume`。未收到 session-ready 时只有该 SDK 自身等待并可能超时，游戏、加载与其他 SDK 继续；可在后续真实前台事件或项目按官方要求完成早期宿主接线后重试。不跳转 Activity 或主动触发 pause/resume，也不伪造就绪。首次安装归因须以真实宿主验证。

同一聚合实例的插屏与激励共享全屏展示锁，真实关闭或展示失败后才可展示下一条。MAX 插屏也使用随机 placement 区分展示，回调缺失 placement 时保持锁定，且该值会改变后台统计维度。AdMob 为接收迟到奖励，最多保留 128 个尚未收到奖励的已展示对象，达到上限时拒绝新激励；收到奖励且展示结束或展示失败后释放，Dispose 会释放全部保留对象并停止交付迟到奖励。厂商若从不回调，需在适当的应用生命周期释放资源，不可推测用户应得奖励。
