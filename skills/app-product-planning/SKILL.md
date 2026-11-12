---
name: app-product-planning
description: "为游戏、应用或服务器制定产品与服务范围，或为既有规格与功能编写有边界的增量需求和验收条件。"
---

# 产品与游戏需求

多区域场景或多状态、多步骤用户流程按[分批生产](../app-domain-toolkit/references/incremental-production.md)明确实际总范围、可验证路径、关键状态与步骤、异常及本批边界；只向用户澄清会影响目标、范围或体验的取舍，避免把状态或步骤机械拆成独立工作项。

先区分新产品探索、既有产品/GDD增量策划和用户明确要求的市场验证，再形成匹配范围的设计与验收。尊重已确认的设计事实，不默认把普通策划变成MVP商业实验。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

涉及客户端界面文案时，先读取[通用文案原则](../app-domain-toolkit/references/ui-copy-principles.md)，再按当前技术栈完成规格、设计与实现。无界面服务器按本栈明确调用方、接口、数据、任务、错误合同与验收，不要求游戏循环、页面或视觉候选。

首次全局视觉设计前，按[产品市场调研](../app-creator-workflow/references/professional-conventions.md#product-market-research)完成竞品、受众与差异化分析，并交接设计依据；仅制作设计稿时也须完成。市场实验仍按用户明确范围执行。

目标包含商店或游戏平台展示时，按[商店文案与展示素材制作](../app-release/references/store-marketing-assets.md#平台要求与卖点依据)复用现有调研，提前确定目标平台、语言和真实卖点，并按实际槽位起草商店文案、封面构图、截图顺序及视频分镜。正式画面在相关功能和显示稳定后采集。

## 输入

目标涉及 CrazyGames、微信／抖音小游戏、Google Play 或 App Store 时，按[渠道与实现路线](../app-release/references/channel-platform-integration.md#确认渠道与实现路线)在现有产品范围中明确已选渠道、宿主／终端、地区、主体、商业能力、资质缺口与不做项；基础工程前交接实际接入任务，不默认接入全部平台或无关登录／广告／支付。

- 用户目标与任务范围；现有GDD、设计基准、实现状态和已作出的产品决定；证据或明确标出的假设；平台和团队约束。只有任务包含市场验证时再提供目标人群假设、渠道和实验限制。

## 共用操作步骤

1. 判断工作模式：新产品定义读取目标用户与问题；既有产品策划读取GDD/规则和当前任务，只打开相关章节；明确的市场验证任务额外识别待验证的市场假设。
2. 按[策划范围与验收约定](../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)区分已确认事实、证据、假设和未决事项；记录本次变化的用户目标与触发场景，不改写既有已确认设计。
3. 为目标变化写出可观察结果。仅在相关时描述应用关键任务流或游戏核心循环，不为局部功能增量重写无关产品循环。游戏新项目或机制变化按[游戏特点识别](../app-domain-toolkit/references/game-characteristics.md#identify)在现有 GDD 中关联实际特点、规则、风险与验收预期，交接 V1 优先验证项及 QA 用例；混合类型按机制组合，既有事实直接复用。
   创意与核心循环方案形成后，先按[玩家视角方案审查](../app-domain-toolkit/references/game-characteristics.md#player-review)推演首次接触、完整周期与连续重复的体验，在相关实现和正式视觉制作前修正方案问题，并将关键假设交给 V1 与真实参与者观察。记录写入当前 GDD 或方案评审，使用现有 F1/F2。
4. 按[策划范围与验收约定](../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)整理新产品必要能力与不做项，或既有策划中受影响的规则、内容、状态、依赖和回归条件。涉及游戏关卡、波次、谜题或任务内容时，按[关卡与内容生产](../app-domain-toolkit/references/game-content-playtesting.md#levels)明确本批目标、机制依赖、难度来源和完成/失败/恢复，沿用现有 GDD 清单，不把每关机械拆成场景或新增机制。
   从零复杂游戏或空间关系实质变化时，按[关卡与场景方案探索](../app-domain-toolkit/references/game-design-exploration.md#explore)由关卡设计师与场景设计师把目标转成结构草案和关键玩家视角概念图，在相关 V1 实现前展示可审阅方案，并交接需运行验证的空间、镜头与机制假设；普通局部修改复用有效方案。
5. 为范围设置可观察验收条件、依赖与回归点，并按[公共策划约定](../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)区分建议和用户决定。只有任务包含市场验证时，才设计样本、原型/人工服务实验、观察指标和停止条件。
   游戏需要声音反馈时，按[音效设计](../app-audio/references/sfx-production.md#design)在既有 GDD／音频计划中交接事件语义、体验与声音风格依据、使用频率及代表样本范围；与关卡／场景设计共享材质、区域、地标和镜头信息，不默认给每个操作添加声音。
   非游戏客户端仅在需求包含音频时按[App 音频工作流](../app-domain-toolkit/references/app-audio.md)确定用途、本批方案、代表路径及前后台策略；播放／录音功能与必要声音素材分开安排，不默认增加点击音或背景音乐，无需求则跳过。
6. 提交新产品简报或既有GDD的差异更新，保留对应工件结构，列出未决决定、来源证据与可复现验收方式；避免把假设写成已批准需求。

## 关键边界

- 既有GDD或普通功能增量不默认改写为MVP，也不自动提出商业验证实验；只有用户把市场/商业假设验证纳入范围时才设计样本和实验。
- 无证据的市场、转化和技术判断标为假设；影响范围或成本的未决取舍通过 grilling 澄清。游戏数值、具体实现和技术架构由对应能力深化。

## 交付

- 按[三项最小约定](../app-creator-workflow/references/output-files.md#每项任务的最小约定)说明目标结果、需要更新的规格路径及可观察验收。新产品、既有规格增量和市场验证分别只交付实际需要的范围、规则差异或实验判定；已有事实直接引用，普通讨论可在对话给出结论，不统一生成简报、依赖表或任务文档。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-product-planning [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取；`onDemand: true` 的参考按当前任务选择，读取器仅列出路径。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

