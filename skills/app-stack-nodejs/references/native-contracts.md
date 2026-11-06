# Node.js 服务器原生技术合同

本手册只补充服务器实施规则，公共状态与证据仍由统一控制器管理。无界面服务端不使用客户端布局、Toast、V0–V5 或视觉确认；完整产品含前端时按模块选择其自身技术栈。

## 能力索引

- [服务端工作流](#mode-nodejs-workflow)
- [产品与服务范围](#mode-nodejs-product-planning)
- [架构设计](#mode-nodejs-architecture)
- [工程基础](#mode-nodejs-project-foundation)
- [SDK 与组件](#mode-nodejs-runtime-plugins)
- [质量验证](#mode-nodejs-quality-review)
- [发布准备](#mode-nodejs-release)
- [项目清理](#mode-nodejs-artifact-cleanup)

<!-- native-source:nodejs-workflow:start -->
## mode-nodejs-workflow

使用 PROJECT/FOUNDATION/MODULE/INTEGRATION/RELEASE，默认不创建 visual 或视觉基线。需求定义服务结果、接口和外部边界；基线确定版本、架构、数据与资源约束；基础工程和 MODULE 实现服务功能；INTEGRATION 冻结模块与用例后验证实际组合；RELEASE 准备交付材料。保留公共阶段 ID，`scene-production` 的显示对象规则只在实际视觉栈使用，不为后端创建伪页面。

按[架构规范](architecture.md)拆工作项和所有权，按[验证规范](verification.md)记录真实输出。跨模块业务先验证接口与数据流，最终集成按[服务端证据合同](integration-evidence.md)检查当前完成 MODULE，不依赖 V5。小范围本地模块修复可使用已有 light 模式，不把普通测试改成用户审批。

服务端只在需求实际包含本地化 API 内容时确认其语言合同，不询问屏幕方向、设计稿或客户端显示语言。测试需要外部系统时继续独立本地工作，把受保护动作与真实目标单列，不自动联通生产库或发布。
<!-- native-source:nodejs-workflow:end -->

<!-- native-source:nodejs-product-planning:start -->
## mode-nodejs-product-planning

确认调用方、服务范围、核心业务、HTTP/消息/任务入口、部署目标、数据所有者和依赖系统。接口、鉴权、租户、数据一致性、负载与可用性仅按实际需求纳入，不默认搭建账号平台、微服务、缓存或消息队列。

按[接口规范](api.md)将关键用例写成可观察的输入、结果、错误和权限边界；按[数据与任务](data-and-jobs.md)明确重复、并发和恢复行为。已有明确合同直接沿用，小改动只覆盖受影响部分。不用视觉候选、页面验收或虚构吞吐目标替代服务器验收。
<!-- native-source:nodejs-product-planning:end -->

<!-- native-source:nodejs-architecture:start -->
## mode-nodejs-architecture

读取[架构规范](architecture.md)，按业务模块明确传输、业务用例、数据访问/外部适配与装配职责。Controller 不承载业务事务，业务不依赖 request/response，跨模块不访问私有实现。资源和状态有明确所有者，请求/任务上下文不进入跨请求可变全局状态。

简单实现不机械拆层，复杂流程再提取稳定契约；沿真实用例交接依赖、状态、事务、错误、取消和验证入口。配置与启停见[运行与交付](operations.md)，并发与副作用见[数据与任务](data-and-jobs.md)。SDK 独立文件职责直接复用[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)，仅用于实际服务端能力，不导入移动广告或客户端交互要求。
<!-- native-source:nodejs-architecture:end -->

<!-- native-source:nodejs-project-foundation:start -->
## mode-nodejs-project-foundation

按[工程基础](engineering.md)核实 Node、包管理器、锁文件、模块系统、实际框架与部署入口，沿用明确选择。新项目优先评估 TypeScript 严格模式，实际依赖按需要引入，不强制某一 Web 框架或 ORM。

将应用装配与监听分开，配置集中校验并显式注入，依赖初始化与关闭有界。建立工程真实静态检查/测试/构建/启动脚本；无构建步骤不创建空脚本，有构建步骤核对实际产物入口。模块导入不自动启动服务器或访问真实外部系统。SDK 接入遵循[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)。
<!-- native-source:nodejs-project-foundation:end -->

<!-- native-source:nodejs-runtime-plugins:start -->
## mode-nodejs-runtime-plugins

先核实现有能力，再按需求选择框架插件、数据库驱动、队列与外部 SDK，记录实际 Node/框架版本、模块系统、用途、许可和运行成本。不能用安装成功证明生命周期、事务、超时或取消已经正确接入。

按[架构规范](architecture.md)及[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)为每项外部能力设置清晰的适配与释放边界。内部异常转换为适用接口错误，版本相关 API 查一手资料，不为旧路径增加无需求的兼容层；外部写入和付费另核对具体授权。
<!-- native-source:nodejs-runtime-plugins:end -->

<!-- native-source:nodejs-quality-review:start -->
## mode-nodejs-quality-review

按[验证规范](verification.md)推荐 T0–T3 并自动执行授权内的普通本地检查，核对输入与权限、错误、事务与并发、幂等、取消、资源有界性和关闭。只覆盖本项目实际能力，不把客户端截图或 Toast 动画作为后端验收项。

测试替代适配器与真实依赖联调分开报告。接口测试优先实际应用装配/请求注入，需要监听服务先查重复进程；真实数据库和第三方写入不混入默认测试。[最终集成证据](integration-evidence.md)冻结完成模块、交付文件和关键行为，真实原始输出与自评记录分开。
<!-- native-source:nodejs-quality-review:end -->

<!-- native-source:nodejs-release:start -->
## mode-nodejs-release

默认完成 RELEASE prepare：依赖与运行版本、源码与产物身份、配置、实际启动/关闭、迁移说明、测试及剩余问题，具体见[运行与交付](operations.md)。无构建 JS 服务记录实际启动入口，不伪造可执行包。

实际部署、上传、镜像推送、真实数据库迁移、基础设施和共享服务重启按具体目标和动作取得明确授权。构建通过不等于服务已部署，发布准备完成不能标成已上线；恢复能力按真实数据与外部副作用说明。
<!-- native-source:nodejs-release:end -->

<!-- native-source:nodejs-artifact-cleanup:start -->
## mode-nodejs-artifact-cleanup

保留正式源码、迁移、锁文件、配置说明、构建入口和仍被使用的控制器证据；日志与归档不包含凭据。生成产物、缓存、覆盖率和 node_modules 按项目实际用途管理，不把它们当业务真源。

清理前核对引用、目录与所有权，不能删除实际数据库卷、用户上传、共享缓存或部署数据。只整理请求范围，不夹带升级依赖、改写锁文件、数据库清空、提交或发布。交付范围与验证见[验证规范](verification.md)。
<!-- native-source:nodejs-artifact-cleanup:end -->
