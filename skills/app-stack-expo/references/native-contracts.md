# Expo 原生技术合同

公共入口负责状态、任务与确认，本手册只补充 Expo/React Native 的平台实施方式。按需读取[工程与架构](engineering.md)、[显示、资源与性能](display-and-assets.md)、[验证与交付](verification.md)及 [Expo 领域证据](../../expo-domain-contracts/references/domain-validation.md)。SDK、模块与平台能力以项目锁定版本及实际工程为准。

## 能力索引

- [工作流编排](#mode-expo-workflow)
- [产品范围](#mode-expo-product-planning)
- [架构设计](#mode-expo-architecture)
- [工程基础](#mode-expo-project-foundation)
- [界面布局](#mode-expo-ui-layout)
- [素材与字体](#mode-expo-asset-workflow)
- [交互反馈](#mode-expo-feedback)
- [SDK 接入](#mode-expo-runtime-plugins)
- [质量验证](#mode-expo-quality-review)
- [发布准备](#mode-expo-release)
- [项目清理](#mode-expo-artifact-cleanup)

<!-- native-source:expo-workflow:start -->
## mode-expo-workflow

以公共控制器为唯一状态机，应用页面使用 `PAGE`，独立弹窗使用 `DISPLAY_LAYER` 并绑定宿主，业务和平台适配使用 `MODULE`。V0 明确页面和交互边界，V1 先验证功能、导航与状态，白盒按需；V2 确认视觉目标，V3 拆解并确认原生布局，V4 导入真实素材，V5 绑定当前候选的实际运行证据与用户视觉确认。无视觉变化的纯功能增量不重做无关阶段。

按[显示与资源](display-and-assets.md)处理页面及弹窗，并按 [Expo 领域证据](../../expo-domain-contracts/references/domain-validation.md)提交阶段输入；不预造未来阶段文件。Web 仅在实际目标包含时进入其适用测试，不能用 Web 结果证明原生运行。
<!-- native-source:expo-workflow:end -->

<!-- native-source:expo-product-planning:start -->
## mode-expo-product-planning

确认用户目标、支持的 Android/iOS 与按需 Web、系统方向、语言、导航、首屏、离线和关键功能。页面、状态、弹窗及深链按实际用户流程拆解，SDK、登录、支付、通知和 OTA 仅在需求包含时纳入。已有语言决定直接沿用，新客户端按公共入口确认支持语言。

说明原生权限、设备能力、加载与异常恢复，并将明确性能目标写入现有计划；有外部服务或商店目标时同时明确哪些工作只能本地准备、哪些需要实际授权执行。详见[工程与架构](engineering.md)及[验证与交付](verification.md)。
<!-- native-source:expo-product-planning:end -->

<!-- native-source:expo-architecture:start -->
## mode-expo-architecture

根据实际规模组织路由/页面、共享组件、状态、业务服务、数据访问和平台 SDK 适配；不以路由文件承担所有业务，也不为简单功能增加无消费者的框架。共享导航与根加载宿主明确唯一写者；页面销毁时释放所属监听、动画和可取消请求，迟到结果不得覆盖当前页面。

新项目优先评估 Expo Router，已有项目沿用其选定导航。原生模块与 SDK 各自负责初始化和错误隔离，权限及隐私前置遵循[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)；网络或非必要 SDK 不作为首帧屏障。[工程与架构](engineering.md)明确 CNG 与原生源码维护方式。
<!-- native-source:expo-architecture:end -->

<!-- native-source:expo-project-foundation:start -->
## mode-expo-project-foundation

识别真实 Expo SDK、React Native、React、Node、包管理器和锁文件，明确 Android/iOS 及可选 Web 的构建路线；新工程按当前官方初始化方式创建，已有工程优先沿用配置。CNG 的配置和插件是正式生成来源；直接维护原生工程时保留 `android/ios` 正式源码，不擅自切换路线。

复用本地服务和构建环境，先检查已运行的 Metro 或其他相关进程；普通初始化不执行真机、云构建或发布。系统启动屏按[验证与交付](verification.md)与公共启动屏规则配置，Expo Go 不作为最终原生启动显示证据。详情见[工程与架构](engineering.md)。
<!-- native-source:expo-project-foundation:end -->

<!-- native-source:expo-ui-layout:start -->
## mode-expo-ui-layout

使用 React Native 真实组件树和逻辑像素，明确父级、Flexbox 排列、相对参照、尺寸、安全区、滚动及层序。覆盖支持方向、代表性宽高、键盘焦点、系统字体缩放、长短文案、辅助功能与返回行为；原生 Modal 先核对窗口层级和全局加载覆盖。[显示与资源](display-and-assets.md)列出页面和显示层规则。

V3 应以当前对象的可编辑源码和布局规格承接[公共相对布局](../../app-ui-layout/references/relative-layout.md)，V5 绑定对应平台实际运行与人工确认。Flutter Widget、DOM 节点和浏览器截图不作为 React Native 原生结构或运行证明。[领域证据](../../expo-domain-contracts/references/domain-validation.md)明确引用格式。

文本应按[文本布局](text-layout.md)配置 Text/TextInput 的字号、系统缩放、换行和受限收缩，核验真实字体、本地化及各平台结果。
<!-- native-source:expo-ui-layout:end -->

<!-- native-source:expo-asset-workflow:start -->
## mode-expo-asset-workflow

按[显示与资源](display-and-assets.md)记录图片、字体、图标、媒体的制作源、许可、运行文件、加载/注册与实际平台需求，复用已有组件和原生控件；不得用整页截图代替可访问交互。V4 基于实际导入和清单提交证据，未使用外部素材时说明真实原因。

首帧必需资源与按需资源分开，处理解码、缓存和释放；组件状态不因缓存资源而复用。性能或打包需求按公共规则评估，不默认生成图集或重写图片；[领域证据](../../expo-domain-contracts/references/domain-validation.md)记录 V4 与 V5 的资源绑定。
<!-- native-source:expo-asset-workflow:end -->

<!-- native-source:expo-feedback:start -->
## mode-expo-feedback

先读[交互反馈](../../app-feedback/references/interaction-feedback.md)，用项目现有组件表达可操作、加载、成功和错误状态；普通业务错误、确认型错误与后台失败沿用公共提示规则。动画、振动和音效只在实际需求及平台能力支持时使用，页面退出清理所属定时器、动画及订阅。

页面和应用自有弹窗共用同一个加载服务与全局显示职责；页面不透明、弹窗半透明，并发、失败和焦点恢复遵守公共规则。原生 Modal 的覆盖范围需按实际窗口验证，不新增另一套业务加载服务。详见[显示与资源](display-and-assets.md)。
<!-- native-source:expo-feedback:end -->

<!-- native-source:expo-runtime-plugins:start -->
## mode-expo-runtime-plugins

核实 Expo SDK/React Native 主版本、目标系统、所选模块的 Expo Go 与 development build 支持、原生依赖及 config plugin。优先适用的官方接口，再比较成熟社区模块；保留版本、来源、许可、权限、故障和消费者记录。Expo Go 预览不能证明自定义原生模块实际可用。

按[公共 SDK 初始化与隐私](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)处理自动初始化、条件、失败和撤回，非必要 SDK 不阻塞首帧。修改原生依赖或配置后判断是否需重新生成/构建；按[工程与架构](engineering.md)保留实际正式来源，禁止盲目清空原生目录。
<!-- native-source:expo-runtime-plugins:end -->

<!-- native-source:expo-quality-review:start -->
## mode-expo-quality-review

按[验证与交付](verification.md)推荐并执行适用的本地测试等级，覆盖当前项目实际类型检查、单元/组件测试、平台配置和资源引用；需要时用项目版本适配的 Expo Doctor 检查依赖。重点核对页面导航、键盘与字体、辅助功能、取消与重复进入、模态层序、SDK 授权和错误。

性能工作记录可比候选、环境及真实基线，按[性能规范](../../app-domain-toolkit/references/performance-optimization.md)定位 JS/UI 线程、列表、内存或启动瓶颈并复验；不要用 development 或模拟器数字冒充 release 真机结果。截图交用户检查，实际运行和用户视觉确认分开报告。
<!-- native-source:expo-quality-review:end -->

<!-- native-source:expo-release:start -->
## mode-expo-release

默认准备候选和证据，不自动签名、上传或发布。确认目标平台、版本与依赖、CNG/原生工程输入、环境变量、启动屏、产物路径及适用构建方式；Expo Go 和 Web 不能代替 release 原生启动确认。对实际选定的商店安排[截图与宣传图任务](../../app-release/references/store-marketing-assets.md#任务安排与完成条件)，真实运行画面与营销加工分别保留。

打包前按[内购 SDK 必要性](../../app-release/references/release-readiness.md#内购-sdk-必要性与移除)核查，未使用时移除专用依赖、插件和原生接入，重新构建并核对实际产物。OTA 按需使用，runtime version 与原生层保持兼容；付费构建、更新和外部写入须有对应明确授权。详见[验证与交付](verification.md)。
<!-- native-source:expo-release:end -->

<!-- native-source:expo-artifact-cleanup:start -->
## mode-expo-artifact-cleanup

按[项目清理](../../app-artifact-cleanup/references/project-cleanup.md)保留真实组件/原生源码、配置插件、锁文件、素材制作源和有效工作流证据，区分可重建缓存及必要提交和发布输入。实际维护的 `android/ios` 是正式源码；CNG 生成目录可重建不等于授权删除。`.expo/` 是本地开发状态，`.eas/workflows/` 可能是正式工作流源。

项目根 `.agents/` 不属于业务扫描、Git 和上传范围，`.easignore` 存在时需自行保留该排除及其他必要规则，核查真实上传内容；不得因此排除实际构建输入。继续按[验证与交付](verification.md)检查引用与未执行项，不自动提交、清理用户文件或发布。
<!-- native-source:expo-artifact-cleanup:end -->
