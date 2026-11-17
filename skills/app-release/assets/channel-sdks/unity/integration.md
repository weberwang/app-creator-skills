# Unity 渠道 SDK 复用

TapTap 使用本目录 `TapTap/` 下的自有具名封装，详见[运行时与材料前置](../../../references/taptap-runtime-integration.md)及 `TapTap/source-manifest.json`。锁定官方 TapSDK 4.11.1 提交 `a241d3bd89530b4590936e0065a06d765097cb32`，从官方 UPM 源按需引入 Core、Login 和实际模块，例如 `https://github.com/taptap/tapsdk-unity-dist.git?path=/Core#4.11.1` 和 `https://github.com/taptap/tapsdk-unity-dist.git?path=/Login#4.11.1`；其他模块的具体包路径以官方集成指南和来源清单为准。

启用 `APP_CREATOR_TAPTAP_CORE`，再只为已安装且实际使用的模块配置来源清单中的 `APP_CREATOR_TAPTAP_*` 符号。组合根使用 `TapTapConfiguration` 和 `ChannelSelector.Select` 的 TapTap 重载；用户同意隐私后请求初始化，实际 ready 来自官方初始化结果回调，不能把 `Init` 返回当成功。TapSDK 静态初始化由本入口唯一持有；别处已启动官方 SDK 时先消除双入口，不通过自造就绪状态强行接管。

就绪后消费 `IChannelCapabilities.TapTap` 的明确方法，登录／合规／存档／排行／成就／好友／联机／社区等均按模块编译，未选模块不要求其官方依赖。默认关闭 TapDB 自动事件模块；TapDB 采集及事件上报依实际授权和消费者启用，不能由此推断其他厂商模块或全部后台采集已停止。官方模块的平台范围分别核对，Android 更新／评价／IAP 不推定可在 iOS 或 PC 使用；Unity 没有官方 Share 模块时不冒充支持。

`TapTapConfiguration` 可分别注入 `mayInitialize`、`mayUseServices`、`mayUseAnalytics`；初始化判断不等于全部运行时用途的永久许可。仅提供初始化策略的便捷构造默认拒绝统计，显式启用 `TapTapEventOptions.enableTapTapEvent` 时必须同时提供有效统计策略。封装阻止撤权后的新受限调用，并允许当前 SDK 所有者执行必要收尾；自行明确启用官方自动统计后，撤回是否立即停止全部厂商后台采集仍需目标环境核实，不能以手动事件已阻止作保证。

Unity IAP 沿官方 `TapPurchasingModule` 与 Unity Purchasing 路线，在项目锁定的购买依赖中接线；工作流只提供明确商店模块和配置入口，不生成“购买成功即发货”的实现。真实订单验单、补单、退款和持久幂等由项目服务端完成。各模块回调、邀请、联机房间和异步任务由业务所有者按官方合同管理，页面释放不自动撤销交易。

通过[渠道 SDK 复用指南](../../../references/channel-sdk-reuse.md)将本目录复制到 Unity 正式工程。仅导入项目采用的官方渠道 SDK，并在 Unity Player Settings 的 Scripting Define Symbols 配置 `APP_CREATOR_WECHAT_SDK` 和／或 `APP_CREATOR_CRAZYGAMES_SDK`；未导入的渠道不启用对应符号。`UNITY_EDITOR`、`UNITY_WEBGL` 或小游戏平台符号仍按官方插件和目标构建设置，不能以这些编译标志推定真实宿主。

来源快照：微信官方[转换 SDK 提交 915d4bf4](https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk/tree/915d4bf4f60ef0cd1c29316a8d67257185d609a7)；CrazyGames Unity 官方包 5.38.0，包 SHA-256 `bcee1f79c0dc17718f40140eb7bfca7520af1e9833001f9112c4a704f02da3f8`。`Generated/sdk-bindings-manifest.json` 逐项记录参与生成的 SDK 方法、源文件摘要及 SDK 根初始化所有权。变更插件版本时需核对官方方法签名并重新生成、编译及验证；不能把快照直接当成任意新版本已验证。

应用组合根持有唯一 `ChannelSelector`，确认真实宿主和构建范围后调用 `selector.Select(...)`，再独立发起 `InitializeAsync()`；相同配置重复选择复用同一实例和初始化任务。不得把 SDK 初始化设为首帧或无关模块的等待前置。微信 `WX.InitSDK` 的真实完成回调来自[官方小游戏运行时](https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk/blob/915d4bf4f60ef0cd1c29316a8d67257185d609a7/Runtime/wechat-default/unity-sdk/index.js)，当前版本的成功码为 `200`。CrazyGames 使用官方可用状态和真实完成回调；编辑器和本地模拟不证明正式平台可用。

就绪后业务通过 `IChannelCapabilities.Wechat` 或 `IChannelCapabilities.CrazyGames` 取得具名能力。微信入口包含账号、隐私、广告、支付、分享、关系、开放数据、统计和生命周期；返回的广告、按钮及开放数据对象也有具名封装。CrazyGames 按 `Ad`、`Banner`、`Game`、`User`、`Data`、`Analytics`、`Store` 分模块直接调用官方类型的方法。参数与回调使用所选 SDK 的真实类型，不经字符串方法名或通用反射调用。客户端支付完成仍须依据服务端可信验单与幂等发货；展示请求完成不代表激励视频观看完成。

监听和广告对象由业务持有者明确注销、销毁；释放渠道不自动取消已经受理的交易或奖励通知。初始化超时不代表官方操作已终止；旧操作结束前选择器拒绝创建第二套渠道，迟到完成也不会把已失效实例标为就绪。

快照生成器位于 `.agents/skills/app-release/scripts/unity-sdk-bindings/`，使用本机 .NET 9 SDK 自带 Roslyn；输入为官方微信 `Runtime` 目录、CrazyGames `Assets/CrazySDK/Scripts` 目录、输出目录和来源描述。它只读取官方源码的方法声明，按固定渠道能力清单生成具名方法；不复制或运行官方 SDK。生成后核对清单及官方文档，并在实际锁定 SDK 的 Unity 工程编译。新项目直接使用随工作流交付的生成文件，无须每次运行生成器。

当前本地测试使用 SDK 替身；官方 Unity 包、不同引擎版本、IL2CPP/AOT、真实宿主以及真实广告和支付均须在获得相应授权后按项目分别验证。构建前仍按项目实际跨程序集和 Unity 版本核对裁剪配置；不把代码生成、编译或模拟结果称为渠道通过。
