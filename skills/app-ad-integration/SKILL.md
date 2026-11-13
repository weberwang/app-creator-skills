---
name: app-ad-integration
description: "规划广告展示位置、频次、同意与失败回退，并在真实受支持平台验证SDK与用户流程。"
---

# 游戏广告接入

将广告位与游戏进度、用户同意、加载失败和生命周期结合，减少误触、阻塞玩法和收益侧不可复现风险。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

- 已确认广告需求及目标渠道。受支持的 Android／iOS 原生聚合在 AdMob 与 AppLovin MAX 中显式二选一，复用[按引擎的移动 SDK 实现](../app-domain-toolkit/references/mobile-sdk-integration.md)；固定七项网络仅约束 MAX；CrazyGames、微信／抖音小游戏按[渠道平台规范](../app-release/references/channel-platform-integration.md#隐私与商业能力)使用对应平台广告，未选能力不接入。[归因与广告直接启动和调用](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#归因与广告直接启动和调用)
- 目标平台和各渠道适用的广告格式；广告类型/变现目标；隐私同意和地区要求；页面/关卡节奏及测试广告标识。

## 共用操作步骤

1. 列出横幅、插页、激励广告等候选广告位，标明触发条件、离开/关闭行为、奖励结果和不能插入的高风险操作时刻。
2. 按[归因与广告直接启动和调用](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#归因与广告直接启动和调用)独立启动广告 SDK，业务触发时直接调用广告能力。不因普通接入擅自新增 CMP；已采用或官方要求的 CMP（包括 UMP）及其真实前置必须遵守。实际授权限制按[隐私流程与 SDK 解耦](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#隐私流程与-sdk-解耦)复用现有授权来源，通过策略接口接收用户同意、可用地区及儿童/隐私限制，不默认新增隐私弹窗或同意管理业务；授权缺失只限制需要授权的能力，广告业务层不自行管理隐私交互或同意状态；明确采用 SDK 内建隐私流程时，通过独立隐私能力与适配器按官方路径执行并同步真实状态，不把 SDK 状态作为应用授权的唯一权威。初始化本身需要授权时也须等待，未同意时不加载需要同意的跟踪/广告请求，撤回时阻止新请求并处理在途任务。
3. 所有广告请求保持非个性化模式；实际采用 AdMob 时按[AdMob 聚合约定](../app-domain-toolkit/references/reference-ad-admob-contract.md)执行；实际采用 MAX 时按[非个性化广告请求](../app-domain-toolkit/references/reference-ad-applovin-max-contract.md#非个性化广告请求)执行，平台 SDK 广告按其官方配置与合同核实，无法落实或确认时停用对应路径，不把 MAX 参数和回调直接套用。为实际 API 的加载、展示、完成、关闭、跳过、超时和失败建立状态与恢复规则；奖励仅在当前有效的完成结果后幂等发放。
4. 实现超时、断网、无填充、用户返回和重复请求的无阻塞回退；广告对象清理、暂停恢复与游戏生命周期正确配合。
5. 用测试广告标识在目标浏览器/设备验证展示位置、奖励一次性、退出恢复、实际授权限制、SDK版本和失败路径；隐私选择交互仅在已有或明确纳入范围时验证。
6. 记录SDK/适配器版本、平台覆盖、测试证据、发布配置限制和未验证区域；正式广告账户与线上配置独立审批。

## 关键边界

- 所有广告遵守[SDK 不阻塞应用流程](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md#sdk-不阻塞应用流程)：后台加载，触发展示即查即返；初始化、授权、加载、无填充与关闭回调都不能卡住启动、关卡、结算或下一局。不可用立即继续正常玩法，激励奖励仅据真实奖励回调发放，不创建广告 Loading 或等待队列。
- 广告 SDK 的实现归属遵循[独立管理与初始化规范](../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)，广告业务状态与 SDK 初始化状态分别管理。
- 不自行创建/修改广告账户、部署线上ID或执行外部写入；测试配置不得进入正式发行包。
- 浏览器政策、移动SDK/API与审核条件由当前栈适配和当前平台事实确认。

## 交付

- 广告位矩阵、授权来源与限制、范围内的隐私/同意流程（如有）、状态与回退规则、测试环境验证和发布配置清单。

## 当前技术栈的原生流程

AdMob 使用[移动 SDK 接入入口](../app-domain-toolkit/references/mobile-sdk-integration.md)和[AdMob 聚合约定](../app-domain-toolkit/references/reference-ad-admob-contract.md)。下列原生模式只用于实际采用 MAX 的受支持 Android／iOS 目标。渠道 SDK 广告先读取[对应平台专项](../app-release/references/channel-platform-integration.md)，按平台合同和当前栈实现；不因技术栈相同就加载 MAX 模式。原生阅读器只提供路径和所选模式，不会自动判断渠道。

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-ad-integration [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

