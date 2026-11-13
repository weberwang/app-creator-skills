# Unity 渠道 SDK 复用

通过[渠道 SDK 复用指南](../../../references/channel-sdk-reuse.md)将本目录复制到 Unity 正式工程。仅导入项目采用的官方渠道 SDK，并在 Unity Player Settings 的 Scripting Define Symbols 配置 `APP_CREATOR_WECHAT_SDK` 和／或 `APP_CREATOR_CRAZYGAMES_SDK`；未导入的渠道不启用对应符号。`UNITY_EDITOR`、`UNITY_WEBGL` 或小游戏平台符号仍按官方插件和目标构建设置，不能以这些编译标志推定真实宿主。

来源快照：微信官方[转换 SDK 提交 915d4bf4](https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk/tree/915d4bf4f60ef0cd1c29316a8d67257185d609a7)；CrazyGames Unity 官方包 5.38.0，包 SHA-256 `bcee1f79c0dc17718f40140eb7bfca7520af1e9833001f9112c4a704f02da3f8`。`Generated/sdk-bindings-manifest.json` 逐项记录参与生成的 SDK 方法、源文件摘要及 SDK 根初始化所有权。变更插件版本时需核对官方方法签名并重新生成、编译及验证；不能把快照直接当成任意新版本已验证。

应用组合根持有唯一 `ChannelSelector`，确认真实宿主和构建范围后调用 `selector.Select(...)`，再独立发起 `InitializeAsync()`；相同配置重复选择复用同一实例和初始化任务。不得把 SDK 初始化设为首帧或无关模块的等待前置。微信 `WX.InitSDK` 的真实完成回调来自[官方小游戏运行时](https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk/blob/915d4bf4f60ef0cd1c29316a8d67257185d609a7/Runtime/wechat-default/unity-sdk/index.js)，当前版本的成功码为 `200`。CrazyGames 使用官方可用状态和真实完成回调；编辑器和本地模拟不证明正式平台可用。

就绪后业务通过 `IChannelCapabilities.Wechat` 或 `IChannelCapabilities.CrazyGames` 取得具名能力。微信入口包含账号、隐私、广告、支付、分享、关系、开放数据、统计和生命周期；返回的广告、按钮及开放数据对象也有具名封装。CrazyGames 按 `Ad`、`Banner`、`Game`、`User`、`Data`、`Analytics`、`Store` 分模块直接调用官方类型的方法。参数与回调使用所选 SDK 的真实类型，不经字符串方法名或通用反射调用。客户端支付完成仍须依据服务端可信验单与幂等发货；展示请求完成不代表激励视频观看完成。

监听和广告对象由业务持有者明确注销、销毁；释放渠道不自动取消已经受理的交易或奖励通知。初始化超时不代表官方操作已终止；旧操作结束前选择器拒绝创建第二套渠道，迟到完成也不会把已失效实例标为就绪。

快照生成器位于 `.agents/skills/app-release/scripts/unity-sdk-bindings/`，使用本机 .NET 9 SDK 自带 Roslyn；输入为官方微信 `Runtime` 目录、CrazyGames `Assets/CrazySDK/Scripts` 目录、输出目录和来源描述。它只读取官方源码的方法声明，按固定渠道能力清单生成具名方法；不复制或运行官方 SDK。生成后核对清单及官方文档，并在实际锁定 SDK 的 Unity 工程编译。新项目直接使用随工作流交付的生成文件，无须每次运行生成器。

当前本地测试使用 SDK 替身；官方 Unity 包、不同引擎版本、IL2CPP/AOT、真实宿主以及真实广告和支付均须在获得相应授权后按项目分别验证。构建前仍按项目实际跨程序集和 Unity 版本核对裁剪配置；不把代码生成、编译或模拟结果称为渠道通过。
