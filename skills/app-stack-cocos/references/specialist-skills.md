# Cocos Creator 能力与原生适配

从公共能力入口进入任务，再按模式定位本栈[原生技术手册](native-contracts.md)的对应章节。专业差异集中维护，脚本、模板与校验器仍在各资源目录；旧专业目录不保留 SKILL.md 或 ADAPTER.md 入口。

领域输入与公共证据接线见[领域校验接入](domain-validation.md)。

| 公共能力 | 唯一入口 |
| --- | --- |
| 产品与游戏需求 | [app-product-planning](../../app-product-planning/SKILL.md) |
| 技术架构与模块设计 | [app-architecture](../../app-architecture/SKILL.md) |
| 游戏玩法实现 | [app-gameplay-development](../../app-gameplay-development/SKILL.md) |
| 游戏音频 | [app-audio](../../app-audio/SKILL.md) |
| 游戏数值与经济 | [app-game-balance](../../app-game-balance/SKILL.md) |
| 游戏与应用汁水设计 | [app-feedback](../../app-feedback/SKILL.md) |
| 候选交付与发布准备 | [app-release](../../app-release/SKILL.md) |
| 质量审核与性能验证 | [app-quality-review](../../app-quality-review/SKILL.md) |
| 动画制作与接入 | [app-animation](../../app-animation/SKILL.md) |
| 三维几何建模 | [app-3d-modeling](../../app-3d-modeling/SKILL.md) |
| Spine 生成式换皮 | [app-spine-reskin](../../app-spine-reskin/SKILL.md) |
| 界面布局与自适应 | [app-ui-layout](../../app-ui-layout/SKILL.md) |
| 项目整理与产物清理 | [app-artifact-cleanup](../../app-artifact-cleanup/SKILL.md) |
| 图片优化 | [app-image-optimization](../../app-image-optimization/SKILL.md) |
| 游戏广告接入 | [app-ad-integration](../../app-ad-integration/SKILL.md) |
| 有设计约束的素材生产 | [app-asset-workflow](../../app-asset-workflow/SKILL.md) |

## 原生适配模式

| 原专业能力 | 公共入口 | 完整原生规范 |
| --- | --- | --- |
| cocos-frame-animation | $app-animation | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation) |
| cocos-game-3d-modeling | $app-3d-modeling | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-3d-modeling) |
| cocos-game-ad-integration | $app-ad-integration | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-ad-integration) |
| cocos-game-architecture | $app-architecture | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-architecture) |
| cocos-game-artifact-cleanup | $app-artifact-cleanup | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-artifact-cleanup) |
| cocos-game-asset-integration | $app-asset-workflow | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration) |
| cocos-game-audio | $app-audio | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio) |
| cocos-game-balance | $app-game-balance | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-balance) |
| cocos-game-image-optimization | $app-image-optimization | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-image-optimization) |
| cocos-game-juice | $app-feedback | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-juice) |
| cocos-game-production | $app-product-planning | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-production) |
| cocos-game-qa-performance | $app-quality-review | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-qa-performance) |
| cocos-game-release | $app-release | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-release) |
| cocos-game-ui-layout | $app-ui-layout | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-ui-layout) |
| cocos-gameplay-development | $app-gameplay-development | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-gameplay-development) |
| cocos-spine-generative-reskin | $app-spine-reskin | [原生章节](../../app-stack-cocos/references/native-contracts.md#mode-cocos-spine-generative-reskin) |

## 共用实现与正文

这些规则与算法由公共能力调用，执行时只采用本栈适用部分。

| 能力 | 公共真源 |
| --- | --- |
| visual-atomic-contract | [skills/app-domain-toolkit/scripts/visual/visual-atomic-contract.mjs](../../app-domain-toolkit/scripts/visual/visual-atomic-contract.mjs) |
| visual-imagegen-format | [skills/app-domain-toolkit/scripts/visual/visual-imagegen-format.mjs](../../app-domain-toolkit/scripts/visual/visual-imagegen-format.mjs) |
| visual-human-review-contract | [skills/app-domain-toolkit/scripts/visual/visual-human-review-contract.mjs](../../app-domain-toolkit/scripts/visual/visual-human-review-contract.mjs) |
| global-visual-consistency-contract | [skills/app-domain-toolkit/scripts/visual/global-visual-consistency-contract.mjs](../../app-domain-toolkit/scripts/visual/global-visual-consistency-contract.mjs) |
| orientation-validation-scope | [skills/app-domain-toolkit/scripts/visual/orientation-validation-scope.mjs](../../app-domain-toolkit/scripts/visual/orientation-validation-scope.mjs) |
| visual-file-gate | [skills/app-domain-toolkit/scripts/visual/visual-file-gate.mjs](../../app-domain-toolkit/scripts/visual/visual-file-gate.mjs) |
| browser-game-domain-path-matcher | [skills/app-domain-toolkit/scripts/visual/path-matcher.mjs](../../app-domain-toolkit/scripts/visual/path-matcher.mjs) |
| workflow-dpr-contract | [skills/app-domain-toolkit/scripts/visual/workflow-dpr-contract.mjs](../../app-domain-toolkit/scripts/visual/workflow-dpr-contract.mjs) |
| display-layer-planning-contract | [skills/app-domain-toolkit/scripts/visual/display-layer-planning-contract.mjs](../../app-domain-toolkit/scripts/visual/display-layer-planning-contract.mjs) |
| visual-validation-policy | [skills/app-domain-toolkit/scripts/visual/visual-validation-policy.mjs](../../app-domain-toolkit/scripts/visual/visual-validation-policy.mjs) |
| effect-image-font | [skills/app-domain-toolkit/assets/effect-image-font.mjs](../../app-domain-toolkit/assets/effect-image-font.mjs) |
| web-transparent-raster | [skills/app-domain-toolkit/scripts/image/transparent-raster.mjs](../../app-domain-toolkit/scripts/image/transparent-raster.mjs) |
| web-background-removal | [skills/app-domain-toolkit/scripts/image/remove-background-local.mjs](../../app-domain-toolkit/scripts/image/remove-background-local.mjs) |
| web-image-inbetween-plan | [skills/app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs](../../app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs) |
| browser-game-project-control-templates | [skills/app-domain-toolkit/templates/project-control-templates.mjs](../../app-domain-toolkit/templates/project-control-templates.mjs) |
| artifact-cleanup | [skills/app-domain-toolkit/references/artifact-cleanup.md](../../app-domain-toolkit/references/artifact-cleanup.md) |
| image-optimization | [skills/app-domain-toolkit/references/image-optimization.md](../../app-domain-toolkit/references/image-optimization.md) |
| juice | [skills/app-domain-toolkit/references/juice.md](../../app-domain-toolkit/references/juice.md) |
| frame-animation | [skills/app-domain-toolkit/references/frame-animation.md](../../app-domain-toolkit/references/frame-animation.md) |
| release | [skills/app-domain-toolkit/references/release.md](../../app-domain-toolkit/references/release.md) |
| audio | [skills/app-domain-toolkit/references/audio.md](../../app-domain-toolkit/references/audio.md) |
| balance | [skills/app-domain-toolkit/references/balance.md](../../app-domain-toolkit/references/balance.md) |
| asset-production | [skills/app-domain-toolkit/references/asset-production.md](../../app-domain-toolkit/references/asset-production.md) |
| ui-layout | [skills/app-domain-toolkit/references/ui-layout.md](../../app-domain-toolkit/references/ui-layout.md) |
| quality-verification | [skills/app-domain-toolkit/references/quality-verification.md](../../app-domain-toolkit/references/quality-verification.md) |
| gameplay-implementation | [skills/app-domain-toolkit/references/gameplay-implementation.md](../../app-domain-toolkit/references/gameplay-implementation.md) |
| game-production | [skills/app-domain-toolkit/references/game-production.md](../../app-domain-toolkit/references/game-production.md) |
| spine-reskin-production | [skills/app-domain-toolkit/references/spine-reskin-production.md](../../app-domain-toolkit/references/spine-reskin-production.md) |
| frame-animation-execution | [skills/app-domain-toolkit/references/frame-animation-execution.md](../../app-domain-toolkit/references/frame-animation-execution.md) |
| feedback-lifecycle | [skills/app-domain-toolkit/references/feedback-lifecycle.md](../../app-domain-toolkit/references/feedback-lifecycle.md) |
| artifact-cleanup-execution | [skills/app-domain-toolkit/references/artifact-cleanup-execution.md](../../app-domain-toolkit/references/artifact-cleanup-execution.md) |
| audio-implementation | [skills/app-domain-toolkit/references/audio-implementation.md](../../app-domain-toolkit/references/audio-implementation.md) |
| modeling-production | [skills/app-domain-toolkit/references/modeling-production.md](../../app-domain-toolkit/references/modeling-production.md) |

## 支持资源

- [app-domain-toolkit](../../app-domain-toolkit)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-domain-contracts](../../cocos-domain-contracts)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-frame-animation](../../cocos-frame-animation)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-3d-modeling](../../cocos-game-3d-modeling)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-ad-integration](../../cocos-game-ad-integration)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-architecture](../../cocos-game-architecture)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-artifact-cleanup](../../cocos-game-artifact-cleanup)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-asset-integration](../../cocos-game-asset-integration)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-audio](../../cocos-game-audio)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-balance](../../cocos-game-balance)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-image-optimization](../../cocos-game-image-optimization)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-juice](../../cocos-game-juice)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-orchestrator](../../cocos-game-orchestrator)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-production](../../cocos-game-production)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-qa-performance](../../cocos-game-qa-performance)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-release](../../cocos-game-release)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-game-ui-layout](../../cocos-game-ui-layout)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-gameplay-development](../../cocos-gameplay-development)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [cocos-spine-generative-reskin](../../cocos-spine-generative-reskin)：领域资料、模板和工具依赖；不含独立全局流程入口。

## 原工具入口

运行 Node 专业工具前按安装说明准备统一依赖。视频、DCC 和引擎工具仍需对应外部程序，不因脚本存在而认定已经运行。

- `cocos-workflow`：[实现](../../app-workflow-control/scripts/workflow-control.mjs)，按专业技能中给出的 CLI 参数调用。
- `cocos-normalize-image`：[实现](../../cocos-domain-contracts/scripts/visual-image-normalization.mjs)，按专业技能中给出的 CLI 参数调用。
- `cocos-remove-background`：[实现](../../cocos-game-asset-integration/scripts/remove-background-local.mjs)，按专业技能中给出的 CLI 参数调用。
- `cocos-frame-animation`：[实现](../../cocos-frame-animation/scripts/video-to-atlas.mjs)，按专业技能中给出的 CLI 参数调用。
- `cocos-frame-plan`：[实现](../../cocos-frame-animation/scripts/image-inbetween-plan.mjs)，按专业技能中给出的 CLI 参数调用。
- `cocos-image-frame-animation`：[实现](../../cocos-frame-animation/scripts/images-to-atlas.mjs)，按专业技能中给出的 CLI 参数调用。
