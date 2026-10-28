# Three.js 能力与原生适配

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
| 界面布局与自适应 | [app-ui-layout](../../app-ui-layout/SKILL.md) |
| 项目整理与产物清理 | [app-artifact-cleanup](../../app-artifact-cleanup/SKILL.md) |
| 图片优化 | [app-image-optimization](../../app-image-optimization/SKILL.md) |
| 游戏广告接入 | [app-ad-integration](../../app-ad-integration/SKILL.md) |
| 三维资源与运行管线 | [app-3d-asset-pipeline](../../app-3d-asset-pipeline/SKILL.md) |
| 运行时插件与扩展 | [app-runtime-plugins](../../app-runtime-plugins/SKILL.md) |
| 项目初始化与基础运行时 | [app-project-foundation](../../app-project-foundation/SKILL.md) |
| 有设计约束的素材生产 | [app-asset-workflow](../../app-asset-workflow/SKILL.md) |

界面文案统一读取[通用文案原则](../../app-domain-toolkit/references/ui-copy-principles.md)，本栈资料仅补充原生实现与流程差异。

## 原生适配模式

| 原专业能力 | 公共入口 | 完整原生规范 |
| --- | --- | --- |
| threejs-frame-animation | $app-animation | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation) |
| threejs-game-3d-modeling | $app-3d-modeling | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-3d-modeling) |
| threejs-game-ad-integration | $app-ad-integration | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-ad-integration) |
| threejs-game-architecture | $app-architecture | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-architecture) |
| threejs-game-artifact-cleanup | $app-artifact-cleanup | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-artifact-cleanup) |
| threejs-game-asset-integration | $app-asset-workflow | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-asset-integration) |
| threejs-game-audio | $app-audio | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-audio) |
| threejs-game-balance | $app-game-balance | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-balance) |
| threejs-game-image-optimization | $app-image-optimization | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-image-optimization) |
| threejs-game-juice | $app-feedback | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-juice) |
| threejs-game-model-pipeline | $app-3d-asset-pipeline | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline) |
| threejs-game-plugins | $app-runtime-plugins | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-plugins) |
| threejs-game-production | $app-product-planning | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-production) |
| threejs-game-qa-performance | $app-quality-review | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-qa-performance) |
| threejs-game-release | $app-release | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-release) |
| threejs-game-runtime | $app-project-foundation | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-runtime) |
| threejs-game-ui-layout | $app-ui-layout | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-game-ui-layout) |
| threejs-gameplay-development | $app-gameplay-development | [原生章节](../../app-stack-threejs/references/native-contracts.md#mode-threejs-gameplay-development) |

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
| production-build-validator | [skills/app-domain-toolkit/scripts/build/validate-production-build.mjs](../../app-domain-toolkit/scripts/build/validate-production-build.mjs) |
| production-build-validator-tests | [skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs](../../app-domain-toolkit/scripts/build/validate-production-build.test.mjs) |
| reference-effect-image-font | [skills/app-domain-toolkit/references/visual-assets/effect-image-font.md](../../app-domain-toolkit/references/visual-assets/effect-image-font.md) |
| web-image-frame-source | [skills/app-domain-toolkit/scripts/animation/image-frame-source.mjs](../../app-domain-toolkit/scripts/animation/image-frame-source.mjs) |
| web-images-to-atlas | [skills/app-domain-toolkit/scripts/animation/images-to-atlas.mjs](../../app-domain-toolkit/scripts/animation/images-to-atlas.mjs) |
| web-video-to-atlas | [skills/app-domain-toolkit/scripts/animation/video-to-atlas.mjs](../../app-domain-toolkit/scripts/animation/video-to-atlas.mjs) |
| web-ui-center-alignment | [skills/app-domain-toolkit/scripts/layout/center-alignment.mjs](../../app-domain-toolkit/scripts/layout/center-alignment.mjs) |
| web-visual-image-normalization-contract | [skills/app-domain-toolkit/scripts/visual/visual-image-normalization-contract.mjs](../../app-domain-toolkit/scripts/visual/visual-image-normalization-contract.mjs) |
| web-transparency-production-contract | [skills/app-domain-toolkit/scripts/visual/visual-transparent-background-contract.mjs](../../app-domain-toolkit/scripts/visual/visual-transparent-background-contract.mjs) |
| web-project-doc-initializer | [skills/app-domain-toolkit/scripts/project/initialize-project-docs.mjs](../../app-domain-toolkit/scripts/project/initialize-project-docs.mjs) |
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
| architecture-handoff | [skills/app-domain-toolkit/references/architecture-handoff.md](../../app-domain-toolkit/references/architecture-handoff.md) |
| frame-animation-execution | [skills/app-domain-toolkit/references/frame-animation-execution.md](../../app-domain-toolkit/references/frame-animation-execution.md) |
| feedback-lifecycle | [skills/app-domain-toolkit/references/feedback-lifecycle.md](../../app-domain-toolkit/references/feedback-lifecycle.md) |
| advertising-integration | [skills/app-domain-toolkit/references/advertising-integration.md](../../app-domain-toolkit/references/advertising-integration.md) |
| artifact-cleanup-execution | [skills/app-domain-toolkit/references/artifact-cleanup-execution.md](../../app-domain-toolkit/references/artifact-cleanup-execution.md) |
| audio-implementation | [skills/app-domain-toolkit/references/audio-implementation.md](../../app-domain-toolkit/references/audio-implementation.md) |
| modeling-production | [skills/app-domain-toolkit/references/modeling-production.md](../../app-domain-toolkit/references/modeling-production.md) |
| frame-reference-action-timing | [skills/app-domain-toolkit/references/frame-reference-action-timing.md](../../app-domain-toolkit/references/frame-reference-action-timing.md) |
| frame-reference-character-animation | [skills/app-domain-toolkit/references/frame-reference-character-animation.md](../../app-domain-toolkit/references/frame-reference-character-animation.md) |
| frame-reference-effect-animation | [skills/app-domain-toolkit/references/frame-reference-effect-animation.md](../../app-domain-toolkit/references/frame-reference-effect-animation.md) |
| frame-reference-image-inbetween | [skills/app-domain-toolkit/references/frame-reference-image-inbetween.md](../../app-domain-toolkit/references/frame-reference-image-inbetween.md) |
| frame-reference-intent-driven-design | [skills/app-domain-toolkit/references/frame-reference-intent-driven-design.md](../../app-domain-toolkit/references/frame-reference-intent-driven-design.md) |
| frame-reference-object-animation | [skills/app-domain-toolkit/references/frame-reference-object-animation.md](../../app-domain-toolkit/references/frame-reference-object-animation.md) |
| frame-reference-region-planning | [skills/app-domain-toolkit/references/frame-reference-region-planning.md](../../app-domain-toolkit/references/frame-reference-region-planning.md) |
| frame-reference-ui-frame-animation | [skills/app-domain-toolkit/references/frame-reference-ui-frame-animation.md](../../app-domain-toolkit/references/frame-reference-ui-frame-animation.md) |
| frame-reference-workflow-integration | [skills/app-domain-toolkit/references/frame-reference-workflow-integration.md](../../app-domain-toolkit/references/frame-reference-workflow-integration.md) |
| ui-game-copy | [skills/app-domain-toolkit/references/ui-game-copy.md](../../app-domain-toolkit/references/ui-game-copy.md) |
| responsive-visual-validation | [skills/app-domain-toolkit/references/responsive-visual-validation.md](../../app-domain-toolkit/references/responsive-visual-validation.md) |
| art-quality-principles | [skills/app-domain-toolkit/references/art-quality-principles.md](../../app-domain-toolkit/references/art-quality-principles.md) |
| reference-ad-applovin-max-contract | [skills/app-domain-toolkit/references/reference-ad-applovin-max-contract.md](../../app-domain-toolkit/references/reference-ad-applovin-max-contract.md) |
| reference-asset-visual-production-pipeline | [skills/app-domain-toolkit/references/reference-asset-visual-production-pipeline.md](../../app-domain-toolkit/references/reference-asset-visual-production-pipeline.md) |
| reference-asset-asset-production-routes | [skills/app-domain-toolkit/references/reference-asset-asset-production-routes.md](../../app-domain-toolkit/references/reference-asset-asset-production-routes.md) |
| reference-asset-global-visual-control | [skills/app-domain-toolkit/references/reference-asset-global-visual-control.md](../../app-domain-toolkit/references/reference-asset-global-visual-control.md) |
| reference-asset-visual-reconstruction | [skills/app-domain-toolkit/references/reference-asset-visual-reconstruction.md](../../app-domain-toolkit/references/reference-asset-visual-reconstruction.md) |
| reference-asset-effect-image-prompt-contract | [skills/app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md) |
| reference-asset-effect-image-splitting | [skills/app-domain-toolkit/references/reference-asset-effect-image-splitting.md](../../app-domain-toolkit/references/reference-asset-effect-image-splitting.md) |
| reference-asset-art-quality-contract | [skills/app-domain-toolkit/references/reference-asset-art-quality-contract.md](../../app-domain-toolkit/references/reference-asset-art-quality-contract.md) |
| reference-asset-game-feel-quality-gate | [skills/app-domain-toolkit/references/reference-asset-game-feel-quality-gate.md](../../app-domain-toolkit/references/reference-asset-game-feel-quality-gate.md) |
| reference-asset-gameplay-visual-contract | [skills/app-domain-toolkit/references/reference-asset-gameplay-visual-contract.md](../../app-domain-toolkit/references/reference-asset-gameplay-visual-contract.md) |
| reference-asset-full-bleed-background | [skills/app-domain-toolkit/references/reference-asset-full-bleed-background.md](../../app-domain-toolkit/references/reference-asset-full-bleed-background.md) |
| reference-asset-nine-slice-ui | [skills/app-domain-toolkit/references/reference-asset-nine-slice-ui.md](../../app-domain-toolkit/references/reference-asset-nine-slice-ui.md) |
| reference-asset-transparency-capability-audit | [skills/app-domain-toolkit/references/reference-asset-transparency-capability-audit.md](../../app-domain-toolkit/references/reference-asset-transparency-capability-audit.md) |
| reference-asset-visual-alignment-authoring | [skills/app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md](../../app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md) |
| reference-ui-layout-contract | [skills/app-domain-toolkit/references/reference-ui-layout-contract.md](../../app-domain-toolkit/references/reference-ui-layout-contract.md) |
| reference-ui-layout-review-artifacts | [skills/app-domain-toolkit/references/reference-ui-layout-review-artifacts.md](../../app-domain-toolkit/references/reference-ui-layout-review-artifacts.md) |
| reference-ui-layout-hierarchy | [skills/app-domain-toolkit/references/reference-ui-layout-hierarchy.md](../../app-domain-toolkit/references/reference-ui-layout-hierarchy.md) |
| reference-ui-evidence-matrix | [skills/app-domain-toolkit/references/reference-ui-evidence-matrix.md](../../app-domain-toolkit/references/reference-ui-evidence-matrix.md) |
| reference-ui-workflow-gates | [skills/app-domain-toolkit/references/reference-ui-workflow-gates.md](../../app-domain-toolkit/references/reference-ui-workflow-gates.md) |
| reference-ui-layout-calibration | [skills/app-domain-toolkit/references/reference-ui-layout-calibration.md](../../app-domain-toolkit/references/reference-ui-layout-calibration.md) |
| reference-ui-functional-semantic-grouping | [skills/app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md](../../app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md) |
| reference-feedback-design-guide | [skills/app-domain-toolkit/references/reference-feedback-design-guide.md](../../app-domain-toolkit/references/reference-feedback-design-guide.md) |
| reference-feedback-workflow-integration | [skills/app-domain-toolkit/references/reference-feedback-workflow-integration.md](../../app-domain-toolkit/references/reference-feedback-workflow-integration.md) |
| reference-architecture-production-build | [skills/app-domain-toolkit/references/reference-architecture-production-build.md](../../app-domain-toolkit/references/reference-architecture-production-build.md) |
| reference-architecture-project-structure | [skills/app-domain-toolkit/references/reference-architecture-project-structure.md](../../app-domain-toolkit/references/reference-architecture-project-structure.md) |
| git-minimal-submission | [skills/app-domain-toolkit/references/git-minimal-submission.md](../../app-domain-toolkit/references/git-minimal-submission.md) |
| reference-orchestration-worktree-integration | [skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md](../../app-domain-toolkit/references/reference-orchestration-worktree-integration.md) |
| reference-orchestration-local-service-validation | [skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md](../../app-domain-toolkit/references/reference-orchestration-local-service-validation.md) |
| reference-orchestration-grilling-integration | [skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md](../../app-domain-toolkit/references/reference-orchestration-grilling-integration.md) |
| reference-orchestration-game-implementation | [skills/app-domain-toolkit/references/reference-orchestration-game-implementation.md](../../app-domain-toolkit/references/reference-orchestration-game-implementation.md) |
| reference-orchestration-visual-quality-gate | [skills/app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md](../../app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md) |
| reference-orchestration-module-decomposition | [skills/app-domain-toolkit/references/reference-orchestration-module-decomposition.md](../../app-domain-toolkit/references/reference-orchestration-module-decomposition.md) |
| reference-orchestration-review-funnel | [skills/app-domain-toolkit/references/reference-orchestration-review-funnel.md](../../app-domain-toolkit/references/reference-orchestration-review-funnel.md) |
| reference-orchestration-quality-gates | [skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md](../../app-domain-toolkit/references/reference-orchestration-quality-gates.md) |
| reference-orchestration-dependency-capability-profiles | [skills/app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md](../../app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md) |
| reference-orchestration-technical-grilling | [skills/app-domain-toolkit/references/reference-orchestration-technical-grilling.md](../../app-domain-toolkit/references/reference-orchestration-technical-grilling.md) |
| reference-orchestration-technical-orchestration | [skills/app-domain-toolkit/references/reference-orchestration-technical-orchestration.md](../../app-domain-toolkit/references/reference-orchestration-technical-orchestration.md) |
| reference-domain-completion | [skills/app-domain-toolkit/references/reference-domain-completion.md](../../app-domain-toolkit/references/reference-domain-completion.md) |
| reference-domain-display-ownership | [skills/app-domain-toolkit/references/reference-domain-display-ownership.md](../../app-domain-toolkit/references/reference-domain-display-ownership.md) |
| reference-domain-visual-sequence | [skills/app-domain-toolkit/references/reference-domain-visual-sequence.md](../../app-domain-toolkit/references/reference-domain-visual-sequence.md) |
| reference-domain-visual-schema | [skills/app-domain-toolkit/references/reference-domain-visual-schema.md](../../app-domain-toolkit/references/reference-domain-visual-schema.md) |
| reference-domain-visual-gates | [skills/app-domain-toolkit/references/reference-domain-visual-gates.md](../../app-domain-toolkit/references/reference-domain-visual-gates.md) |
| reference-domain-visual-admission | [skills/app-domain-toolkit/references/reference-domain-visual-admission.md](../../app-domain-toolkit/references/reference-domain-visual-admission.md) |
| reference-domain-scene-contract | [skills/app-domain-toolkit/references/reference-domain-scene-contract.md](../../app-domain-toolkit/references/reference-domain-scene-contract.md) |
| reference-domain-visual-review | [skills/app-domain-toolkit/references/reference-domain-visual-review.md](../../app-domain-toolkit/references/reference-domain-visual-review.md) |

## 支持资源

- [app-domain-toolkit](../../app-domain-toolkit)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-domain-contracts](../../threejs-domain-contracts)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-3d-modeling](../../threejs-game-3d-modeling)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-ad-integration](../../threejs-game-ad-integration)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-architecture](../../threejs-game-architecture)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-asset-integration](../../threejs-game-asset-integration)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-juice](../../threejs-game-juice)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-model-pipeline](../../threejs-game-model-pipeline)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-orchestrator](../../threejs-game-orchestrator)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-plugins](../../threejs-game-plugins)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-qa-performance](../../threejs-game-qa-performance)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-runtime](../../threejs-game-runtime)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [threejs-game-ui-layout](../../threejs-game-ui-layout)：领域资料、模板和工具依赖；不含独立全局流程入口。

## 原工具入口

运行 Node 专业工具前按安装说明准备统一依赖。视频、DCC 和引擎工具仍需对应外部程序，不因脚本存在而认定已经运行。

- `threejs-workflow`：[实现](../../app-workflow-control/scripts/workflow-control.mjs)，按专业技能中给出的 CLI 参数调用。
- `threejs-normalize-image`：[实现](../../threejs-domain-contracts/scripts/visual-image-normalization.mjs)，按专业技能中给出的 CLI 参数调用。
- `threejs-remove-background`：[实现](../../threejs-game-asset-integration/scripts/remove-background-local.mjs)，按专业技能中给出的 CLI 参数调用。
- `threejs-frame-animation`：[实现](../../threejs-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs)，按专业技能中给出的 CLI 参数调用。
- `threejs-frame-plan`：[实现](../../threejs-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs)，按专业技能中给出的 CLI 参数调用。
- `threejs-image-frame-animation`：[实现](../../threejs-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs)，按专业技能中给出的 CLI 参数调用。
- `threejs-create-game`：[实现](../../threejs-game-runtime/scripts/create-game.mjs)，按专业技能中给出的 CLI 参数调用。
- `verify-game-build`：[实现](../../threejs-domain-contracts/tools/scripts/verify-game-build.mjs)，按专业技能中给出的 CLI 参数调用。
