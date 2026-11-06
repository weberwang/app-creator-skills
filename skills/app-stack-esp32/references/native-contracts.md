# ESP32 原生技术合同

公共入口编排状态，本手册仅补充设备端 GUI 的实施方法。工程使用的芯片、SDK、LVGL 与移植组件版本以实际项目为准，不提供跨主版本兼容层。共同约束见[工程与硬件](engineering.md)、[显示与资源](display-and-assets.md)、[验证与交付](verification.md)与[领域证据合同](domain-validation.md)，按当前任务读取。

## 能力索引

- [工作流编排](#mode-esp32-workflow)
- [产品范围](#mode-esp32-product-planning)
- [架构设计](#mode-esp32-architecture)
- [工程基础](#mode-esp32-project-foundation)
- [界面布局](#mode-esp32-ui-layout)
- [素材与字体](#mode-esp32-asset-workflow)
- [交互反馈](#mode-esp32-feedback)
- [组件接入](#mode-esp32-runtime-plugins)
- [质量验证](#mode-esp32-quality-review)
- [发布准备](#mode-esp32-release)
- [项目清理](#mode-esp32-artifact-cleanup)

<!-- native-source:esp32-workflow:start -->
## mode-esp32-workflow

从板卡与功能范围建立 `PROJECT` / `FOUNDATION`，驱动、业务、通信使用 `MODULE`；设备页面使用 `PAGE`，独立瞬态层使用 `DISPLAY_LAYER` 并绑定真实页面宿主。保持公共控制器为唯一状态机，跨页面导航先做功能验证，再进入各页面正式视觉。多个客户端存在时按技术栈分开工作项，通过接口衔接，不把手机页面算成设备页面。

V0 确定设备、界面状态、输入、资源与验收边界；V1 验证功能/导航，必要时白盒；V2 冻结真实分辨率与资源预算内的视觉目标；V3 确认拆解和原生布局；V4 转换/注册真实资源；V5 分别记录主机、设备和用户视觉结果。阶段证据按[领域合同](domain-validation.md)绑定，不假造未来阶段材料。

按[工程与硬件](engineering.md)选择实际入口；涉及硬件未决事实时继续独立业务和主机准备，不猜引脚。没有硬件授权时保留设备未执行，不自动改变已确认的验收范围以关闭工作项。普通代码与文档增量只验证实际受影响范围。
<!-- native-source:esp32-workflow:end -->

<!-- native-source:esp32-product-planning:start -->
## mode-esp32-product-planning

确认设备要完成的主要任务、芯片/板卡/屏幕、安装与使用环境、触控/按键/旋钮、显示语言、离线与断电行为。联网、传感器、配网、存储、升级只按实际需求纳入。已有语言选择直接沿用；新项目按公共入口确认语言与动态文本范围。

用用户流程说明页面、状态、操作与异常恢复，将性能、电源和存储要求转成可测指标；区分本地能验证的部分与需硬件验证的部分。正式视觉前核对屏幕与字库预算，避免目标依赖不存在的 PSRAM、解码器或输入硬件。详细约束见[显示与资源](display-and-assets.md)。
<!-- native-source:esp32-product-planning:end -->

<!-- native-source:esp32-architecture:start -->
## mode-esp32-architecture

按[工程与硬件](engineering.md)拆分板级驱动、GUI 端口、页面/控件、状态/业务、存储/通信。外设事件通过受控消息进入 GUI 所有者，页面退出可取消任务，不允许服务保存已销毁控件指针。LVGL 锁、显示缓冲/刷新完成、输入与资源生命周期均有唯一所有者。

SDK/组件的独立文件职责按[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)；已有可用 BSP/移植组件优先，不为了一个页面自研屏幕驱动或建立冗余事件框架。接口变更记录调用者、状态与错误，按实际模块测试，不默认引入远程服务。
<!-- native-source:esp32-architecture:end -->

<!-- native-source:esp32-project-foundation:start -->
## mode-esp32-project-foundation

核实板卡规格、工程目标与 SDK 环境，优先用适用官方工程/BSP建立最小编译路径，确认屏幕、输入端口和 GUI 所有者接口。复用已有工程、构建目录和进程，不重置用户配置。按[工程与硬件](engineering.md)固定实际依赖并保留可编辑源，业务和生成代码职责分开。

初始验证执行工程实际构建与逻辑测试；`idf.py build` 仅用于对应已激活的 ESP-IDF 环境。初始化不包含烧录、串口设备操作或 `idf.py set-target` 的无条件执行。SDK 接入读取[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)。
<!-- native-source:esp32-project-foundation:end -->

<!-- native-source:esp32-ui-layout:start -->
## mode-esp32-ui-layout

按[显示与资源](display-and-assets.md)和[文本布局](text-layout.md)以实际屏幕像素与 LVGL 对象树实现布局。保留真实父级、定位参照、对齐/间距、尺寸、滚动、层序和输入所有者；按键/旋钮使用明确焦点路径，触控有真实命中区与坐标变换。不套用浏览器 DPR、Flutter 安全区或游戏 Camera。

使用[公共相对布局](../../app-ui-layout/references/relative-layout.md)，普通控件相对容器，浮层例外不扩展到其内部控件。极值文案、缺字、数值变化、加载/错误与重入纳入测试。V3 的拆解、布局和正式源、V5 的实际对象回读与人工确认按[领域合同](domain-validation.md)提交。
<!-- native-source:esp32-ui-layout:end -->

<!-- native-source:esp32-asset-workflow:start -->
## mode-esp32-asset-workflow

按[显示与资源](display-and-assets.md)预先确认 Flash、RAM、字库、图片与帧缓冲预算，执行公共 V2 目标、V3 拆解、V4 资源导入与 V5 组合。复用原生控件、有效资源与现有字体，只有需要位图时调用生图工具；不把含动态文案和按钮的整页图片直接打进固件替代真实控件。

资源以当前 GUI 主版本匹配的转换器生成；交付源/输出/注册文件及摘要、转换参数、尺寸/色格式/alpha、许可、存储与加载方式。字库覆盖确认语言及动态内容，实际解码和可加载性需验证。默认不运行无请求的图片优化；必要格式转换仍须保持目标规格。[领域合同](domain-validation.md)明确资源清单的阶段绑定。
<!-- native-source:esp32-asset-workflow:end -->

<!-- native-source:esp32-feedback:start -->
## mode-esp32-feedback

先读[资源与视觉流程分流](../../app-feedback/references/interaction-feedback.md#资源与视觉流程分流)，沿用当前页面正式源、共享控件与素材。按芯片和屏幕刷新预算设计按下、选中、忙碌、成功/失败反馈；蜂鸣、振动与音频仅在已有硬件及需求允许时接入，不默认为设备增加能力。

计时器、动画和提示随页面/显示层销毁而停止，迟到业务结果不访问失效对象。前台异步操作的加载与输入阻断按公共规则实现，后台任务不占用全局蒙层。反馈的功能验证与视觉确认分开，主机事件通过不证明设备实际响应性能。具体预算见[显示与资源](display-and-assets.md)。
<!-- native-source:esp32-feedback:end -->

<!-- native-source:esp32-runtime-plugins:start -->
## mode-esp32-runtime-plugins

先核对 SDK、芯片、LVGL 与 BSP/移植组件实际版本，再选择官方组件或成熟方案。记录硬件/总线支持、许可证、构建开关、内存成本、依赖和调用边界；不能把其他主版本的示例拼成一套接口。

组件初始化、并发、重入和错误由独立适配模块负责，业务代码调用明确接口。读取[工程与硬件](engineering.md)及[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)，本地构建先验证；硬件、云端注册与外部写入另按具体授权执行。
<!-- native-source:esp32-runtime-plugins:end -->

<!-- native-source:esp32-quality-review:start -->
## mode-esp32-quality-review

按[验证与交付](verification.md)推荐并自动执行 T0–T3 内的普通本地检查，检查构建、逻辑、资源体积、导航/重入、生命周期和适用主机测试。驱动、DMA、锁与资源变更重点检查缓冲回收、线程所有者、迟到消息和重复进入。

工程通过、主机通过、硬件通过、用户视觉确认分别报告。`idf.py size` 不证明动态堆峰值，桌面模拟不证明屏幕与触控。按[领域合同](domain-validation.md)核对对象、候选、配置、资源与真实运行文件，不自动分析截图或填入人工 PASS。缺工具或授权时说明未执行范围。
<!-- native-source:esp32-quality-review:end -->

<!-- native-source:esp32-release:start -->
## mode-esp32-release

默认完成发布准备：固定 SDK/组件与目标配置、板卡/分区、资源清单、构建步骤、固件摘要、测试和未完成硬件项。按[验证与交付](verification.md)区分本地固件产物、已烧录、已验收和实际发布，不因能链接就宣称整机可交付。

烧录、擦除、OTA、签名、上传、安全启动/加密和熔丝操作不能混入普通构建。只有明确授权对应动作及目标后执行，并记录真实结果；发布准备不需要为了关闭工作项主动操作硬件。
<!-- native-source:esp32-release:end -->

<!-- native-source:esp32-artifact-cleanup:start -->
## mode-esp32-artifact-cleanup

保留正式 UI 源、字体/图片制作源与许可、转换参数和生成入口、配置及仍有效的控制器证据。按项目策略处理组件锁文件，不能删除当前引用资源、设备配置或密钥；敏感内容不得进入归档。

只整理用户要求范围内的产物，先检查引用与目标路径。`build/`、下载组件与缓存不当作手工源，但删除、重建和扩大清理范围须按实际任务与保护规则处理，不擅自清空。交付遵循[验证与交付](verification.md)，不默认提交或推送。
<!-- native-source:esp32-artifact-cleanup:end -->
