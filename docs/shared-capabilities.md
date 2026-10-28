# 公共能力与技术栈适配

本表列出实际抽出的公共真源。原专业入口继续表达技术栈边界；共用规则和算法只维护一份，适配层负责具体标识、资源导入及调用。完整源映射仍见迁移文件清单。

| 公共能力 | 类型 | 适用栈 | 实际真源 |
| --- | --- | --- | --- |
| visual-atomic-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-atomic-contract.mjs](../skills/app-domain-toolkit/scripts/visual/visual-atomic-contract.mjs) |
| visual-imagegen-format | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-imagegen-format.mjs](../skills/app-domain-toolkit/scripts/visual/visual-imagegen-format.mjs) |
| visual-human-review-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-human-review-contract.mjs](../skills/app-domain-toolkit/scripts/visual/visual-human-review-contract.mjs) |
| global-visual-consistency-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/global-visual-consistency-contract.mjs](../skills/app-domain-toolkit/scripts/visual/global-visual-consistency-contract.mjs) |
| orientation-validation-scope | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/orientation-validation-scope.mjs](../skills/app-domain-toolkit/scripts/visual/orientation-validation-scope.mjs) |
| visual-file-gate | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-file-gate.mjs](../skills/app-domain-toolkit/scripts/visual/visual-file-gate.mjs) |
| browser-game-domain-path-matcher | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/path-matcher.mjs](../skills/app-domain-toolkit/scripts/visual/path-matcher.mjs) |
| workflow-dpr-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/workflow-dpr-contract.mjs](../skills/app-domain-toolkit/scripts/visual/workflow-dpr-contract.mjs) |
| display-layer-planning-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/display-layer-planning-contract.mjs](../skills/app-domain-toolkit/scripts/visual/display-layer-planning-contract.mjs) |
| visual-validation-policy | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-validation-policy.mjs](../skills/app-domain-toolkit/scripts/visual/visual-validation-policy.mjs) |
| effect-image-font | 公共资源 | cocos、phaser、threejs | [skills/app-domain-toolkit/assets/effect-image-font.mjs](../skills/app-domain-toolkit/assets/effect-image-font.mjs) |
| production-build-validator | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/build/validate-production-build.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.mjs) |
| production-build-validator-tests | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs) |
| spine-alpha | 公共算法 | cocos、phaser | [skills/app-domain-toolkit/scripts/spine/spine_alpha.mjs](../skills/app-domain-toolkit/scripts/spine/spine_alpha.mjs) |
| spine-assets | 公共算法 | cocos、phaser | [skills/app-domain-toolkit/scripts/spine/spine_assets.mjs](../skills/app-domain-toolkit/scripts/spine/spine_assets.mjs) |
| spine-atlas | 公共算法 | cocos、phaser | [skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs](../skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs) |
| spine-control | 公共算法 | cocos、phaser | [skills/app-domain-toolkit/scripts/spine/spine_control.mjs](../skills/app-domain-toolkit/scripts/spine/spine_control.mjs) |
| reference-spine-batch-review | 公共资源 | cocos、phaser | [skills/app-domain-toolkit/references/spine-reskin/batch-review.md](../skills/app-domain-toolkit/references/spine-reskin/batch-review.md) |
| reference-effect-image-font | 公共资源 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/visual-assets/effect-image-font.md](../skills/app-domain-toolkit/references/visual-assets/effect-image-font.md) |
| web-image-frame-source | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/animation/image-frame-source.mjs](../skills/app-domain-toolkit/scripts/animation/image-frame-source.mjs) |
| web-images-to-atlas | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/animation/images-to-atlas.mjs](../skills/app-domain-toolkit/scripts/animation/images-to-atlas.mjs) |
| web-video-to-atlas | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/animation/video-to-atlas.mjs](../skills/app-domain-toolkit/scripts/animation/video-to-atlas.mjs) |
| web-ui-center-alignment | 公共算法 | cocos、threejs | [skills/app-domain-toolkit/scripts/layout/center-alignment.mjs](../skills/app-domain-toolkit/scripts/layout/center-alignment.mjs) |
| web-visual-image-normalization-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-image-normalization-contract.mjs](../skills/app-domain-toolkit/scripts/visual/visual-image-normalization-contract.mjs) |
| web-transparency-production-contract | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/visual/visual-transparent-background-contract.mjs](../skills/app-domain-toolkit/scripts/visual/visual-transparent-background-contract.mjs) |
| web-project-doc-initializer | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/project/initialize-project-docs.mjs](../skills/app-domain-toolkit/scripts/project/initialize-project-docs.mjs) |
| web-transparent-raster | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/image/transparent-raster.mjs](../skills/app-domain-toolkit/scripts/image/transparent-raster.mjs) |
| web-background-removal | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/image/remove-background-local.mjs](../skills/app-domain-toolkit/scripts/image/remove-background-local.mjs) |
| web-image-inbetween-plan | 公共算法 | cocos、phaser、threejs | [skills/app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs](../skills/app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs) |
| browser-game-project-control-templates | 公共项目模板 | cocos、phaser、threejs | [skills/app-domain-toolkit/templates/project-control-templates.mjs](../skills/app-domain-toolkit/templates/project-control-templates.mjs) |
| artifact-cleanup | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/artifact-cleanup.md](../skills/app-domain-toolkit/references/artifact-cleanup.md) |
| image-optimization | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/image-optimization.md](../skills/app-domain-toolkit/references/image-optimization.md) |
| juice | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/juice.md](../skills/app-domain-toolkit/references/juice.md) |
| frame-animation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-animation.md](../skills/app-domain-toolkit/references/frame-animation.md) |
| release | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/release.md](../skills/app-domain-toolkit/references/release.md) |
| audio | 公共生产规范 | cocos、phaser、threejs、unity | [skills/app-domain-toolkit/references/audio.md](../skills/app-domain-toolkit/references/audio.md) |
| balance | 公共生产规范 | cocos、phaser、threejs、unity | [skills/app-domain-toolkit/references/balance.md](../skills/app-domain-toolkit/references/balance.md) |
| asset-production | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/asset-production.md](../skills/app-domain-toolkit/references/asset-production.md) |
| ui-layout | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/ui-layout.md](../skills/app-domain-toolkit/references/ui-layout.md) |
| quality-verification | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/quality-verification.md](../skills/app-domain-toolkit/references/quality-verification.md) |
| gameplay-implementation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/gameplay-implementation.md](../skills/app-domain-toolkit/references/gameplay-implementation.md) |
| game-production | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/game-production.md](../skills/app-domain-toolkit/references/game-production.md) |
| architecture-handoff | 公共生产规范 | phaser、threejs | [skills/app-domain-toolkit/references/architecture-handoff.md](../skills/app-domain-toolkit/references/architecture-handoff.md) |
| spine-reskin-production | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/spine-reskin-production.md](../skills/app-domain-toolkit/references/spine-reskin-production.md) |
| frame-animation-execution | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-animation-execution.md](../skills/app-domain-toolkit/references/frame-animation-execution.md) |
| feedback-lifecycle | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/feedback-lifecycle.md](../skills/app-domain-toolkit/references/feedback-lifecycle.md) |
| advertising-integration | 公共生产规范 | phaser、threejs | [skills/app-domain-toolkit/references/advertising-integration.md](../skills/app-domain-toolkit/references/advertising-integration.md) |
| artifact-cleanup-execution | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/artifact-cleanup-execution.md](../skills/app-domain-toolkit/references/artifact-cleanup-execution.md) |
| audio-implementation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/audio-implementation.md](../skills/app-domain-toolkit/references/audio-implementation.md) |
| modeling-production | 公共生产规范 | cocos、threejs、unity | [skills/app-domain-toolkit/references/modeling-production.md](../skills/app-domain-toolkit/references/modeling-production.md) |
| frame-reference-action-timing | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-action-timing.md](../skills/app-domain-toolkit/references/frame-reference-action-timing.md) |
| frame-reference-animation-direction | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/frame-reference-animation-direction.md](../skills/app-domain-toolkit/references/frame-reference-animation-direction.md) |
| frame-reference-character-animation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-character-animation.md](../skills/app-domain-toolkit/references/frame-reference-character-animation.md) |
| frame-reference-effect-animation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-effect-animation.md](../skills/app-domain-toolkit/references/frame-reference-effect-animation.md) |
| frame-reference-image-inbetween | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-image-inbetween.md](../skills/app-domain-toolkit/references/frame-reference-image-inbetween.md) |
| frame-reference-intent-driven-design | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-intent-driven-design.md](../skills/app-domain-toolkit/references/frame-reference-intent-driven-design.md) |
| frame-reference-object-animation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-object-animation.md](../skills/app-domain-toolkit/references/frame-reference-object-animation.md) |
| frame-reference-region-planning | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-region-planning.md](../skills/app-domain-toolkit/references/frame-reference-region-planning.md) |
| frame-reference-ui-frame-animation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-ui-frame-animation.md](../skills/app-domain-toolkit/references/frame-reference-ui-frame-animation.md) |
| frame-reference-workflow-integration | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/frame-reference-workflow-integration.md](../skills/app-domain-toolkit/references/frame-reference-workflow-integration.md) |
| ui-game-copy | 公共生产规范 | cocos、phaser、threejs、unity | [skills/app-domain-toolkit/references/ui-game-copy.md](../skills/app-domain-toolkit/references/ui-game-copy.md) |
| responsive-visual-validation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/responsive-visual-validation.md](../skills/app-domain-toolkit/references/responsive-visual-validation.md) |
| art-quality-principles | 公共生产规范 | cocos、phaser、threejs、unity | [skills/app-domain-toolkit/references/art-quality-principles.md](../skills/app-domain-toolkit/references/art-quality-principles.md) |
| reference-ad-applovin-max-contract | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ad-applovin-max-contract.md](../skills/app-domain-toolkit/references/reference-ad-applovin-max-contract.md) |
| reference-asset-visual-production-pipeline | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-visual-production-pipeline.md](../skills/app-domain-toolkit/references/reference-asset-visual-production-pipeline.md) |
| reference-asset-asset-production-routes | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-asset-production-routes.md](../skills/app-domain-toolkit/references/reference-asset-asset-production-routes.md) |
| reference-asset-global-visual-control | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-global-visual-control.md](../skills/app-domain-toolkit/references/reference-asset-global-visual-control.md) |
| reference-asset-visual-reconstruction | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-visual-reconstruction.md](../skills/app-domain-toolkit/references/reference-asset-visual-reconstruction.md) |
| reference-asset-effect-image-prompt-contract | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md](../skills/app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md) |
| reference-asset-effect-image-splitting | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-effect-image-splitting.md](../skills/app-domain-toolkit/references/reference-asset-effect-image-splitting.md) |
| reference-asset-art-quality-contract | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-art-quality-contract.md](../skills/app-domain-toolkit/references/reference-asset-art-quality-contract.md) |
| reference-asset-game-feel-quality-gate | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-game-feel-quality-gate.md](../skills/app-domain-toolkit/references/reference-asset-game-feel-quality-gate.md) |
| reference-asset-gameplay-visual-contract | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-gameplay-visual-contract.md](../skills/app-domain-toolkit/references/reference-asset-gameplay-visual-contract.md) |
| reference-asset-full-bleed-background | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-full-bleed-background.md](../skills/app-domain-toolkit/references/reference-asset-full-bleed-background.md) |
| reference-asset-nine-slice-ui | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-nine-slice-ui.md](../skills/app-domain-toolkit/references/reference-asset-nine-slice-ui.md) |
| reference-asset-transparency-capability-audit | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-transparency-capability-audit.md](../skills/app-domain-toolkit/references/reference-asset-transparency-capability-audit.md) |
| reference-asset-visual-alignment-authoring | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md](../skills/app-domain-toolkit/references/reference-asset-visual-alignment-authoring.md) |
| reference-ui-layout-contract | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-layout-contract.md](../skills/app-domain-toolkit/references/reference-ui-layout-contract.md) |
| reference-ui-layout-review-artifacts | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-layout-review-artifacts.md](../skills/app-domain-toolkit/references/reference-ui-layout-review-artifacts.md) |
| reference-ui-layout-hierarchy | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-layout-hierarchy.md](../skills/app-domain-toolkit/references/reference-ui-layout-hierarchy.md) |
| reference-ui-evidence-matrix | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-evidence-matrix.md](../skills/app-domain-toolkit/references/reference-ui-evidence-matrix.md) |
| reference-ui-workflow-gates | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-workflow-gates.md](../skills/app-domain-toolkit/references/reference-ui-workflow-gates.md) |
| reference-ui-layout-calibration | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-layout-calibration.md](../skills/app-domain-toolkit/references/reference-ui-layout-calibration.md) |
| reference-ui-functional-semantic-grouping | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md](../skills/app-domain-toolkit/references/reference-ui-functional-semantic-grouping.md) |
| reference-feedback-design-guide | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-feedback-design-guide.md](../skills/app-domain-toolkit/references/reference-feedback-design-guide.md) |
| reference-feedback-workflow-integration | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-feedback-workflow-integration.md](../skills/app-domain-toolkit/references/reference-feedback-workflow-integration.md) |
| reference-spine-progress-state | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/reference-spine-progress-state.md](../skills/app-domain-toolkit/references/reference-spine-progress-state.md) |
| reference-spine-atlas-rebuild | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/reference-spine-atlas-rebuild.md](../skills/app-domain-toolkit/references/reference-spine-atlas-rebuild.md) |
| reference-spine-skeleton-upgrade | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/reference-spine-skeleton-upgrade.md](../skills/app-domain-toolkit/references/reference-spine-skeleton-upgrade.md) |
| reference-spine-runtime-validation | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/reference-spine-runtime-validation.md](../skills/app-domain-toolkit/references/reference-spine-runtime-validation.md) |
| reference-architecture-production-build | 公共生产规范 | phaser、threejs | [skills/app-domain-toolkit/references/reference-architecture-production-build.md](../skills/app-domain-toolkit/references/reference-architecture-production-build.md) |
| reference-architecture-project-structure | 公共生产规范 | phaser、threejs | [skills/app-domain-toolkit/references/reference-architecture-project-structure.md](../skills/app-domain-toolkit/references/reference-architecture-project-structure.md) |
| reference-architecture-sdk-initialization | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/reference-architecture-sdk-initialization.md](../skills/app-domain-toolkit/references/reference-architecture-sdk-initialization.md) |
| git-minimal-submission | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/git-minimal-submission.md](../skills/app-domain-toolkit/references/git-minimal-submission.md) |
| reference-orchestration-worktree-integration | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md) |
| reference-orchestration-local-service-validation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md](../skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md) |
| reference-orchestration-grilling-integration | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md) |
| reference-orchestration-game-implementation | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-game-implementation.md](../skills/app-domain-toolkit/references/reference-orchestration-game-implementation.md) |
| reference-orchestration-visual-quality-gate | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md](../skills/app-domain-toolkit/references/reference-orchestration-visual-quality-gate.md) |
| reference-orchestration-module-decomposition | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-module-decomposition.md](../skills/app-domain-toolkit/references/reference-orchestration-module-decomposition.md) |
| reference-orchestration-review-funnel | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-review-funnel.md](../skills/app-domain-toolkit/references/reference-orchestration-review-funnel.md) |
| reference-orchestration-quality-gates | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md](../skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md) |
| reference-orchestration-dependency-capability-profiles | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md](../skills/app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md) |
| reference-orchestration-technical-grilling | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-technical-grilling.md](../skills/app-domain-toolkit/references/reference-orchestration-technical-grilling.md) |
| reference-orchestration-technical-orchestration | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-orchestration-technical-orchestration.md](../skills/app-domain-toolkit/references/reference-orchestration-technical-orchestration.md) |
| reference-orchestration-delivery-artifacts | 公共生产规范 | cocos、phaser | [skills/app-domain-toolkit/references/reference-orchestration-delivery-artifacts.md](../skills/app-domain-toolkit/references/reference-orchestration-delivery-artifacts.md) |
| reference-domain-completion | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-completion.md](../skills/app-domain-toolkit/references/reference-domain-completion.md) |
| reference-domain-display-ownership | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-display-ownership.md](../skills/app-domain-toolkit/references/reference-domain-display-ownership.md) |
| reference-domain-visual-sequence | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-visual-sequence.md](../skills/app-domain-toolkit/references/reference-domain-visual-sequence.md) |
| reference-domain-visual-schema | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-visual-schema.md](../skills/app-domain-toolkit/references/reference-domain-visual-schema.md) |
| reference-domain-visual-gates | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-visual-gates.md](../skills/app-domain-toolkit/references/reference-domain-visual-gates.md) |
| reference-domain-visual-admission | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-visual-admission.md](../skills/app-domain-toolkit/references/reference-domain-visual-admission.md) |
| reference-domain-scene-contract | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-scene-contract.md](../skills/app-domain-toolkit/references/reference-domain-scene-contract.md) |
| reference-domain-visual-review | 公共生产规范 | cocos、phaser、threejs | [skills/app-domain-toolkit/references/reference-domain-visual-review.md](../skills/app-domain-toolkit/references/reference-domain-visual-review.md) |

## visual-atomic-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-atomic-contract.mjs | [skills/cocos-domain-contracts/scripts/visual-atomic-contract.mjs](../skills/cocos-domain-contracts/scripts/visual-atomic-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-atomic-contract.mjs | [skills/phaser-domain-contracts/scripts/visual-atomic-contract.mjs](../skills/phaser-domain-contracts/scripts/visual-atomic-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-atomic-contract.mjs | [skills/threejs-domain-contracts/scripts/visual-atomic-contract.mjs](../skills/threejs-domain-contracts/scripts/visual-atomic-contract.mjs) |

三种浏览器游戏技术栈共用的 visual-atomic-contract.mjs 领域实现。

## visual-imagegen-format

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-imagegen-format.mjs | [skills/cocos-domain-contracts/scripts/visual-imagegen-format.mjs](../skills/cocos-domain-contracts/scripts/visual-imagegen-format.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-imagegen-format.mjs | [skills/phaser-domain-contracts/scripts/visual-imagegen-format.mjs](../skills/phaser-domain-contracts/scripts/visual-imagegen-format.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-imagegen-format.mjs | [skills/threejs-domain-contracts/scripts/visual-imagegen-format.mjs](../skills/threejs-domain-contracts/scripts/visual-imagegen-format.mjs) |

三种浏览器游戏技术栈共用的 visual-imagegen-format.mjs 领域实现。

## visual-human-review-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-human-review-contract.mjs | [skills/cocos-domain-contracts/scripts/visual-human-review-contract.mjs](../skills/cocos-domain-contracts/scripts/visual-human-review-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-human-review-contract.mjs | [skills/phaser-domain-contracts/scripts/visual-human-review-contract.mjs](../skills/phaser-domain-contracts/scripts/visual-human-review-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-human-review-contract.mjs | [skills/threejs-domain-contracts/scripts/visual-human-review-contract.mjs](../skills/threejs-domain-contracts/scripts/visual-human-review-contract.mjs) |

三种浏览器游戏技术栈共用的 visual-human-review-contract.mjs 领域实现。

## global-visual-consistency-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/global-visual-consistency-contract.mjs | [skills/cocos-domain-contracts/scripts/global-visual-consistency-contract.mjs](../skills/cocos-domain-contracts/scripts/global-visual-consistency-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/global-visual-consistency-contract.mjs | [skills/phaser-domain-contracts/scripts/global-visual-consistency-contract.mjs](../skills/phaser-domain-contracts/scripts/global-visual-consistency-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/global-visual-consistency-contract.mjs | [skills/threejs-domain-contracts/scripts/global-visual-consistency-contract.mjs](../skills/threejs-domain-contracts/scripts/global-visual-consistency-contract.mjs) |

三种浏览器游戏技术栈共用的 global-visual-consistency-contract.mjs 领域实现。

## orientation-validation-scope

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/orientation-validation-scope.mjs | [skills/cocos-domain-contracts/scripts/orientation-validation-scope.mjs](../skills/cocos-domain-contracts/scripts/orientation-validation-scope.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/orientation-validation-scope.mjs | [skills/phaser-domain-contracts/scripts/orientation-validation-scope.mjs](../skills/phaser-domain-contracts/scripts/orientation-validation-scope.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/orientation-validation-scope.mjs | [skills/threejs-domain-contracts/scripts/orientation-validation-scope.mjs](../skills/threejs-domain-contracts/scripts/orientation-validation-scope.mjs) |

三种浏览器游戏技术栈共用的 orientation-validation-scope.mjs 领域实现。

## visual-file-gate

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-file-gate.mjs | [skills/cocos-domain-contracts/scripts/visual-file-gate.mjs](../skills/cocos-domain-contracts/scripts/visual-file-gate.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-file-gate.mjs | [skills/phaser-domain-contracts/scripts/visual-file-gate.mjs](../skills/phaser-domain-contracts/scripts/visual-file-gate.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-file-gate.mjs | [skills/threejs-domain-contracts/scripts/visual-file-gate.mjs](../skills/threejs-domain-contracts/scripts/visual-file-gate.mjs) |

三种浏览器游戏技术栈共用的 visual-file-gate.mjs 领域实现。

## browser-game-domain-path-matcher

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/path-matcher.mjs | [skills/cocos-domain-contracts/scripts/path-matcher.mjs](../skills/cocos-domain-contracts/scripts/path-matcher.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/path-matcher.mjs | [skills/phaser-domain-contracts/scripts/path-matcher.mjs](../skills/phaser-domain-contracts/scripts/path-matcher.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/path-matcher.mjs | [skills/threejs-domain-contracts/scripts/path-matcher.mjs](../skills/threejs-domain-contracts/scripts/path-matcher.mjs) |

三种浏览器游戏工作流共用的领域路径模式合同，不作为公共控制器的授权路径匹配器。

## workflow-dpr-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/workflow-dpr-contract.mjs | [skills/cocos-domain-contracts/scripts/workflow-dpr-contract.mjs](../skills/cocos-domain-contracts/scripts/workflow-dpr-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/workflow-dpr-contract.mjs | [skills/phaser-domain-contracts/scripts/workflow-dpr-contract.mjs](../skills/phaser-domain-contracts/scripts/workflow-dpr-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/workflow-dpr-contract.mjs | [skills/threejs-domain-contracts/scripts/workflow-dpr-contract.mjs](../skills/threejs-domain-contracts/scripts/workflow-dpr-contract.mjs) |

仅定义浏览器游戏工作流的 DPR 合同，不外推为 Unity 或 Flutter 原生渲染规则。

## display-layer-planning-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/display-layer-planning-contract.mjs | [skills/cocos-domain-contracts/scripts/display-layer-planning-contract.mjs](../skills/cocos-domain-contracts/scripts/display-layer-planning-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/display-layer-planning-contract.mjs | [skills/phaser-domain-contracts/scripts/display-layer-planning-contract.mjs](../skills/phaser-domain-contracts/scripts/display-layer-planning-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/display-layer-planning-contract.mjs | [skills/threejs-domain-contracts/scripts/display-layer-planning-contract.mjs](../skills/threejs-domain-contracts/scripts/display-layer-planning-contract.mjs) |

三种浏览器游戏技术栈共用的 display-layer-planning-contract.mjs 领域实现。

## visual-validation-policy

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-validation-policy.mjs | [skills/cocos-domain-contracts/scripts/visual-validation-policy.mjs](../skills/cocos-domain-contracts/scripts/visual-validation-policy.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-validation-policy.mjs | [skills/phaser-domain-contracts/scripts/visual-validation-policy.mjs](../skills/phaser-domain-contracts/scripts/visual-validation-policy.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-validation-policy.mjs | [skills/threejs-domain-contracts/scripts/visual-validation-policy.mjs](../skills/threejs-domain-contracts/scripts/visual-validation-policy.mjs) |

仅用于浏览器游戏三栈的视觉验收策略，不作为 Unity 或 Flutter 原生验收规则。

## effect-image-font

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/scripts/effect_image_font.mjs | [skills/cocos-game-asset-integration/scripts/effect_image_font.mjs](../skills/cocos-game-asset-integration/scripts/effect_image_font.mjs) |
| phaser | skills/phaser4-game-asset-integration/scripts/effect_image_font.mjs | [skills/phaser4-game-asset-integration/scripts/effect_image_font.mjs](../skills/phaser4-game-asset-integration/scripts/effect_image_font.mjs) |
| threejs | skills/threejs-game-asset-integration/scripts/effect_image_font.mjs | [skills/threejs-game-asset-integration/scripts/effect_image_font.mjs](../skills/threejs-game-asset-integration/scripts/effect_image_font.mjs) |

共享固定中文点阵字库；保留源模块内的 Noto Sans CJK SC 字形、许可证与重建来源元数据。

## production-build-validator

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-architecture/scripts/validate-production-build.mjs | [skills/app-domain-toolkit/scripts/build/validate-production-build.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.mjs) |
| phaser | skills/phaser4-game-architecture/scripts/validate-production-build.mjs | [skills/app-domain-toolkit/scripts/build/validate-production-build.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.mjs) |
| threejs | skills/threejs-game-architecture/scripts/validate-production-build.mjs | [skills/app-domain-toolkit/scripts/build/validate-production-build.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.mjs) |

多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。

## production-build-validator-tests

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-architecture/scripts/validate-production-build.test.mjs | [skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs) |
| phaser | skills/phaser4-game-architecture/scripts/validate-production-build.test.mjs | [skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs) |
| threejs | skills/threejs-game-architecture/scripts/validate-production-build.test.mjs | [skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs](../skills/app-domain-toolkit/scripts/build/validate-production-build.test.mjs) |

多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。

## spine-alpha

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/scripts/spine_alpha.mjs | [skills/app-domain-toolkit/scripts/spine/spine_alpha.mjs](../skills/app-domain-toolkit/scripts/spine/spine_alpha.mjs) |
| phaser | skills/phaser4-spine-generative-reskin/scripts/spine_alpha.mjs | [skills/app-domain-toolkit/scripts/spine/spine_alpha.mjs](../skills/app-domain-toolkit/scripts/spine/spine_alpha.mjs) |

多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。

## spine-assets

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/scripts/spine_assets.mjs | [skills/app-domain-toolkit/scripts/spine/spine_assets.mjs](../skills/app-domain-toolkit/scripts/spine/spine_assets.mjs) |
| phaser | skills/phaser4-spine-generative-reskin/scripts/spine_assets.mjs | [skills/app-domain-toolkit/scripts/spine/spine_assets.mjs](../skills/app-domain-toolkit/scripts/spine/spine_assets.mjs) |

多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。

## spine-atlas

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/scripts/spine_atlas.mjs | [skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs](../skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs) |
| phaser | skills/phaser4-spine-generative-reskin/scripts/spine_atlas.mjs | [skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs](../skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs) |

多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。

## spine-control

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/scripts/spine_control.mjs | [skills/app-domain-toolkit/scripts/spine/spine_control.mjs](../skills/app-domain-toolkit/scripts/spine/spine_control.mjs) |
| phaser | skills/phaser4-spine-generative-reskin/scripts/spine_control.mjs | [skills/app-domain-toolkit/scripts/spine/spine_control.mjs](../skills/app-domain-toolkit/scripts/spine/spine_control.mjs) |

多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。

## reference-spine-batch-review

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/references/batch-review.md | [skills/app-domain-toolkit/references/spine-reskin/batch-review.md](../skills/app-domain-toolkit/references/spine-reskin/batch-review.md) |
| phaser | skills/phaser4-spine-generative-reskin/references/batch-review.md | [skills/app-domain-toolkit/references/spine-reskin/batch-review.md](../skills/app-domain-toolkit/references/spine-reskin/batch-review.md) |

多个技术栈的参考资料字节一致；集中保存完整正文和逐项来源摘要。

## reference-effect-image-font

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/effect-image-font.md | [skills/app-domain-toolkit/references/visual-assets/effect-image-font.md](../skills/app-domain-toolkit/references/visual-assets/effect-image-font.md) |
| phaser | skills/phaser4-game-asset-integration/references/effect-image-font.md | [skills/app-domain-toolkit/references/visual-assets/effect-image-font.md](../skills/app-domain-toolkit/references/visual-assets/effect-image-font.md) |
| threejs | skills/threejs-game-asset-integration/references/effect-image-font.md | [skills/app-domain-toolkit/references/visual-assets/effect-image-font.md](../skills/app-domain-toolkit/references/visual-assets/effect-image-font.md) |

多个技术栈的参考资料字节一致；集中保存完整正文和逐项来源摘要。

## web-image-frame-source

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/scripts/image-frame-source.mjs | [skills/cocos-domain-contracts/resources/frame-animation/scripts/image-frame-source.mjs](../skills/cocos-domain-contracts/resources/frame-animation/scripts/image-frame-source.mjs) |
| phaser | skills/phaser4-frame-animation/scripts/image-frame-source.mjs | [skills/phaser-domain-contracts/resources/frame-animation/scripts/image-frame-source.mjs](../skills/phaser-domain-contracts/resources/frame-animation/scripts/image-frame-source.mjs) |
| threejs | skills/threejs-frame-animation/scripts/image-frame-source.mjs | [skills/threejs-domain-contracts/resources/frame-animation/scripts/image-frame-source.mjs](../skills/threejs-domain-contracts/resources/frame-animation/scripts/image-frame-source.mjs) |

三栈图片来源结构、依赖图、路径和实际图像校验算法一致，按技术栈注入来源 schema 与延迟加载桥。

## web-images-to-atlas

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/scripts/images-to-atlas.mjs | [skills/cocos-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs](../skills/cocos-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs) |
| phaser | skills/phaser4-frame-animation/scripts/images-to-atlas.mjs | [skills/phaser-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs](../skills/phaser-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs) |
| threejs | skills/threejs-frame-animation/scripts/images-to-atlas.mjs | [skills/threejs-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs](../skills/threejs-domain-contracts/resources/frame-animation/scripts/images-to-atlas.mjs) |

三栈图片图集共享经过逐源校验的执行算法，报告和运行绑定由技术栈显式注入。

## web-video-to-atlas

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/scripts/video-to-atlas.mjs | [skills/cocos-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs](../skills/cocos-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs) |
| phaser | skills/phaser4-frame-animation/scripts/video-to-atlas.mjs | [skills/phaser-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs](../skills/phaser-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs) |
| threejs | skills/threejs-frame-animation/scripts/video-to-atlas.mjs | [skills/threejs-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs](../skills/threejs-domain-contracts/resources/frame-animation/scripts/video-to-atlas.mjs) |

严格核对三栈完整源及导出后，共用视频抽帧与写入算法并注入各栈资源合同。

## web-ui-center-alignment

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/scripts/center-alignment.mjs | [skills/cocos-game-ui-layout/scripts/center-alignment.mjs](../skills/cocos-game-ui-layout/scripts/center-alignment.mjs) |
| threejs | skills/threejs-game-ui-layout/scripts/center-alignment.mjs | [skills/threejs-game-ui-layout/scripts/center-alignment.mjs](../skills/threejs-game-ui-layout/scripts/center-alignment.mjs) |

Cocos 与 Three.js 的居中算法逐字节一致；根边界合同由各栈适配入口注入并独立验证。

## web-visual-image-normalization-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-image-normalization-contract.mjs | [skills/cocos-domain-contracts/scripts/visual-image-normalization-contract.mjs](../skills/cocos-domain-contracts/scripts/visual-image-normalization-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-image-normalization-contract.mjs | [skills/phaser-domain-contracts/scripts/visual-image-normalization-contract.mjs](../skills/phaser-domain-contracts/scripts/visual-image-normalization-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-image-normalization-contract.mjs | [skills/threejs-domain-contracts/scripts/visual-image-normalization-contract.mjs](../skills/threejs-domain-contracts/scripts/visual-image-normalization-contract.mjs) |

三栈归一化合同源字节一致；统一校验逻辑并显式注入各栈项目路径合同。

## web-transparency-production-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/scripts/visual-transparent-background-contract.mjs | [skills/cocos-domain-contracts/scripts/visual-transparent-background-contract.mjs](../skills/cocos-domain-contracts/scripts/visual-transparent-background-contract.mjs) |
| phaser | skills/phaser4-game-workflow-control/scripts/visual-transparent-background-contract.mjs | [skills/phaser-domain-contracts/scripts/visual-transparent-background-contract.mjs](../skills/phaser-domain-contracts/scripts/visual-transparent-background-contract.mjs) |
| threejs | skills/threejs-game-workflow-control/scripts/visual-transparent-background-contract.mjs | [skills/threejs-domain-contracts/scripts/visual-transparent-background-contract.mjs](../skills/threejs-domain-contracts/scripts/visual-transparent-background-contract.mjs) |

三栈透明生产合同源字节一致，公共算法显式注入各栈路线与预览合同。

## web-project-doc-initializer

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/scripts/initialize_project_docs.mjs | [skills/cocos-game-orchestrator/scripts/initialize_project_docs.mjs](../skills/cocos-game-orchestrator/scripts/initialize_project_docs.mjs) |
| phaser | skills/phaser4-game-orchestrator/scripts/initialize_project_docs.mjs | [skills/phaser4-game-orchestrator/scripts/initialize_project_docs.mjs](../skills/phaser4-game-orchestrator/scripts/initialize_project_docs.mjs) |
| threejs | skills/threejs-game-orchestrator/scripts/initialize_project_docs.mjs | [skills/threejs-game-orchestrator/scripts/initialize_project_docs.mjs](../skills/threejs-game-orchestrator/scripts/initialize_project_docs.mjs) |

三栈文档选择、路径保护与公共工作项授权逻辑一致；模板和技术栈身份由各自适配器注入。

## web-transparent-raster

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/scripts/transparent-raster.mjs | [skills/cocos-game-asset-integration/scripts/transparent-raster.mjs](../skills/cocos-game-asset-integration/scripts/transparent-raster.mjs) |
| phaser | skills/phaser4-game-asset-integration/scripts/transparent-raster.mjs | [skills/phaser4-game-asset-integration/scripts/transparent-raster.mjs](../skills/phaser4-game-asset-integration/scripts/transparent-raster.mjs) |
| threejs | skills/threejs-game-asset-integration/scripts/transparent-raster.mjs | [skills/threejs-game-asset-integration/scripts/transparent-raster.mjs](../skills/threejs-game-asset-integration/scripts/transparent-raster.mjs) |

三栈透明像素统计、预览路径保护与深浅底合成实现逐字一致；只把依赖接到现有公共 PNG codec，保留所有导出和像素算法。

## web-background-removal

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/scripts/remove-background-local.mjs | [skills/cocos-game-asset-integration/scripts/remove-background-local.mjs](../skills/cocos-game-asset-integration/scripts/remove-background-local.mjs) |
| phaser | skills/phaser4-game-asset-integration/scripts/remove-background-local.mjs | [skills/phaser4-game-asset-integration/scripts/remove-background-local.mjs](../skills/phaser4-game-asset-integration/scripts/remove-background-local.mjs) |
| threejs | skills/threejs-game-asset-integration/scripts/remove-background-local.mjs | [skills/threejs-game-asset-integration/scripts/remove-background-local.mjs](../skills/threejs-game-asset-integration/scripts/remove-background-local.mjs) |

共享像素填充算法与完全等价的公共纯 API；保留 Web 自有 0..64 容差及 hard-edge/color-separation-verified 门禁、edge_profile、transparency_preview、背景检查、SHA 证据、错误结构与原 CLI。

## web-image-inbetween-plan

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/scripts/image-inbetween-plan.mjs | [skills/cocos-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs](../skills/cocos-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs) |
| phaser | skills/phaser4-frame-animation/scripts/image-inbetween-plan.mjs | [skills/phaser-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs](../skills/phaser-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs) |
| threejs | skills/threejs-frame-animation/scripts/image-inbetween-plan.mjs | [skills/threejs-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs](../skills/threejs-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs) |

三栈帧量化、循环闭合、关键帧验证、分层补帧顺序、CLI 与独占写入实现相同；只通过 planSchema 保留各专业输出身份。

## browser-game-project-control-templates

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/scripts/project_doc_templates.mjs | [skills/cocos-game-orchestrator/scripts/project_doc_templates.mjs](../skills/cocos-game-orchestrator/scripts/project_doc_templates.mjs) |
| phaser | skills/phaser4-game-orchestrator/scripts/project_doc_templates.mjs | [skills/phaser4-game-orchestrator/scripts/project_doc_templates.mjs](../skills/phaser4-game-orchestrator/scripts/project_doc_templates.mjs) |
| threejs | skills/threejs-game-orchestrator/scripts/project_doc_templates.mjs | [skills/threejs-game-orchestrator/scripts/project_doc_templates.mjs](../skills/threejs-game-orchestrator/scripts/project_doc_templates.mjs) |

三栈共用 Work Item 控制面模板；专业 GDD、TDD、视觉和可选模板仍由各栈原生声明维护。

## artifact-cleanup

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-artifact-cleanup/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-artifact-cleanup) |
| phaser | skills/phaser4-game-artifact-cleanup/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-artifact-cleanup) |
| threejs | skills/threejs-game-artifact-cleanup/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-artifact-cleanup) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## image-optimization

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-image-optimization/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-image-optimization) |
| phaser | skills/phaser4-game-image-optimization/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-image-optimization) |
| threejs | skills/threejs-game-image-optimization/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-image-optimization) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## juice

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-juice/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-juice) |
| phaser | skills/phaser4-game-juice/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-juice) |
| threejs | skills/threejs-game-juice/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-juice) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## frame-animation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation) |
| phaser | skills/phaser4-frame-animation/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-frame-animation) |
| threejs | skills/threejs-frame-animation/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## release

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-release/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-release) |
| phaser | skills/phaser4-game-release/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-release) |
| threejs | skills/threejs-game-release/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-release) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## audio

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-audio/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio) |
| phaser | skills/phaser4-game-audio/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-audio) |
| threejs | skills/threejs-game-audio/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-audio) |
| unity | unity-game-audio/ADAPTER.md | [skills/app-stack-unity/references/native-contracts.md](../skills/app-stack-unity/references/native-contracts.md#mode-unity-game-audio) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## balance

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-balance/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-balance) |
| phaser | skills/phaser4-game-balance/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-balance) |
| threejs | skills/threejs-game-balance/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-balance) |
| unity | unity-game-balance/ADAPTER.md | [skills/app-stack-unity/references/native-contracts.md](../skills/app-stack-unity/references/native-contracts.md#mode-unity-game-balance) |

从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。

## asset-production

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-asset-integration) |
| phaser | skills/phaser4-game-asset-integration/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-asset-integration) |
| threejs | skills/threejs-game-asset-integration/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-asset-integration) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## ui-layout

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-ui-layout) |
| phaser | skills/phaser4-game-ui-layout/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-ui-layout) |
| threejs | skills/threejs-game-ui-layout/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-ui-layout) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## quality-verification

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-qa-performance/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-qa-performance) |
| phaser | skills/phaser4-game-qa-performance/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-qa-performance) |
| threejs | skills/threejs-game-qa-performance/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-qa-performance) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## gameplay-implementation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-gameplay-development/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-gameplay-development) |
| phaser | skills/phaser4-gameplay-development/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-gameplay-development) |
| threejs | skills/threejs-gameplay-development/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-gameplay-development) |
| cocos | skills/cocos-game-asset-integration/references/visual-production-pipeline.md | [skills/cocos-game-asset-integration/references/visual-production-pipeline.md](../skills/cocos-game-asset-integration/references/visual-production-pipeline.md) |
| phaser | skills/phaser4-game-asset-integration/references/visual-production-pipeline.md | [skills/phaser4-game-asset-integration/references/visual-production-pipeline.md](../skills/phaser4-game-asset-integration/references/visual-production-pipeline.md) |
| threejs | skills/threejs-game-asset-integration/references/visual-production-pipeline.md | [skills/threejs-game-asset-integration/references/visual-production-pipeline.md](../skills/threejs-game-asset-integration/references/visual-production-pipeline.md) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## game-production

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-production/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-production) |
| phaser | skills/phaser4-game-production/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-production) |
| threejs | skills/threejs-game-production/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-production) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## architecture-handoff

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| phaser | skills/phaser4-game-architecture/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-architecture) |
| threejs | skills/threejs-game-architecture/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-architecture) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## spine-reskin-production

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-spine-generative-reskin) |
| phaser | skills/phaser4-spine-generative-reskin/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-spine-generative-reskin) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## frame-animation-execution

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation) |
| phaser | skills/phaser4-frame-animation/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-frame-animation) |
| threejs | skills/threejs-frame-animation/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-frame-animation) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## feedback-lifecycle

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-juice/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-juice) |
| phaser | skills/phaser4-game-juice/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-juice) |
| threejs | skills/threejs-game-juice/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-juice) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## advertising-integration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| phaser | skills/phaser4-game-ad-integration/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-ad-integration) |
| threejs | skills/threejs-game-ad-integration/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-ad-integration) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## artifact-cleanup-execution

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-artifact-cleanup/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-artifact-cleanup) |
| phaser | skills/phaser4-game-artifact-cleanup/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-artifact-cleanup) |
| threejs | skills/threejs-game-artifact-cleanup/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-artifact-cleanup) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## audio-implementation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-audio/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-audio) |
| phaser | skills/phaser4-game-audio/ADAPTER.md | [skills/app-stack-phaser/references/native-contracts.md](../skills/app-stack-phaser/references/native-contracts.md#mode-phaser4-game-audio) |
| threejs | skills/threejs-game-audio/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-audio) |

按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。

## modeling-production

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| unity | unity-game-3d-modeling/ADAPTER.md | [skills/app-stack-unity/references/native-contracts.md](../skills/app-stack-unity/references/native-contracts.md#mode-unity-game-3d-modeling) |
| cocos | skills/cocos-game-3d-modeling/ADAPTER.md | [skills/app-stack-cocos/references/native-contracts.md](../skills/app-stack-cocos/references/native-contracts.md#mode-cocos-game-3d-modeling) |
| threejs | skills/threejs-game-3d-modeling/ADAPTER.md | [skills/app-stack-threejs/references/native-contracts.md](../skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-3d-modeling) |

从三个建模专业技能的明确源区间提取完整共用模型简报、Blender 制作、几何与表面检查、派生导出回读和交付步骤；引擎导入和各栈专属职责仍留在原技能。

## frame-reference-action-timing

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/action-timing.md | [skills/cocos-domain-contracts/resources/frame-animation/references/action-timing.md](../skills/cocos-domain-contracts/resources/frame-animation/references/action-timing.md) |
| phaser | skills/phaser4-frame-animation/references/action-timing.md | [skills/phaser-domain-contracts/resources/frame-animation/references/action-timing.md](../skills/phaser-domain-contracts/resources/frame-animation/references/action-timing.md) |
| threejs | skills/threejs-frame-animation/references/action-timing.md | [skills/threejs-domain-contracts/resources/frame-animation/references/action-timing.md](../skills/threejs-domain-contracts/resources/frame-animation/references/action-timing.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-animation-direction

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/animation-direction.md | [skills/cocos-domain-contracts/resources/frame-animation/references/animation-direction.md](../skills/cocos-domain-contracts/resources/frame-animation/references/animation-direction.md) |
| phaser | skills/phaser4-frame-animation/references/animation-direction.md | [skills/phaser-domain-contracts/resources/frame-animation/references/animation-direction.md](../skills/phaser-domain-contracts/resources/frame-animation/references/animation-direction.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-character-animation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/character-animation.md | [skills/cocos-domain-contracts/resources/frame-animation/references/character-animation.md](../skills/cocos-domain-contracts/resources/frame-animation/references/character-animation.md) |
| phaser | skills/phaser4-frame-animation/references/character-animation.md | [skills/phaser-domain-contracts/resources/frame-animation/references/character-animation.md](../skills/phaser-domain-contracts/resources/frame-animation/references/character-animation.md) |
| threejs | skills/threejs-frame-animation/references/character-animation.md | [skills/threejs-domain-contracts/resources/frame-animation/references/character-animation.md](../skills/threejs-domain-contracts/resources/frame-animation/references/character-animation.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-effect-animation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/effect-animation.md | [skills/cocos-domain-contracts/resources/frame-animation/references/effect-animation.md](../skills/cocos-domain-contracts/resources/frame-animation/references/effect-animation.md) |
| phaser | skills/phaser4-frame-animation/references/effect-animation.md | [skills/phaser-domain-contracts/resources/frame-animation/references/effect-animation.md](../skills/phaser-domain-contracts/resources/frame-animation/references/effect-animation.md) |
| threejs | skills/threejs-frame-animation/references/effect-animation.md | [skills/threejs-domain-contracts/resources/frame-animation/references/effect-animation.md](../skills/threejs-domain-contracts/resources/frame-animation/references/effect-animation.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-image-inbetween

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/image-inbetween.md | [skills/cocos-domain-contracts/resources/frame-animation/references/image-inbetween.md](../skills/cocos-domain-contracts/resources/frame-animation/references/image-inbetween.md) |
| phaser | skills/phaser4-frame-animation/references/image-inbetween.md | [skills/phaser-domain-contracts/resources/frame-animation/references/image-inbetween.md](../skills/phaser-domain-contracts/resources/frame-animation/references/image-inbetween.md) |
| threejs | skills/threejs-frame-animation/references/image-inbetween.md | [skills/threejs-domain-contracts/resources/frame-animation/references/image-inbetween.md](../skills/threejs-domain-contracts/resources/frame-animation/references/image-inbetween.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-intent-driven-design

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/intent-driven-design.md | [skills/cocos-domain-contracts/resources/frame-animation/references/intent-driven-design.md](../skills/cocos-domain-contracts/resources/frame-animation/references/intent-driven-design.md) |
| phaser | skills/phaser4-frame-animation/references/intent-driven-design.md | [skills/phaser-domain-contracts/resources/frame-animation/references/intent-driven-design.md](../skills/phaser-domain-contracts/resources/frame-animation/references/intent-driven-design.md) |
| threejs | skills/threejs-frame-animation/references/intent-driven-design.md | [skills/threejs-domain-contracts/resources/frame-animation/references/intent-driven-design.md](../skills/threejs-domain-contracts/resources/frame-animation/references/intent-driven-design.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-object-animation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/object-animation.md | [skills/cocos-domain-contracts/resources/frame-animation/references/object-animation.md](../skills/cocos-domain-contracts/resources/frame-animation/references/object-animation.md) |
| phaser | skills/phaser4-frame-animation/references/object-animation.md | [skills/phaser-domain-contracts/resources/frame-animation/references/object-animation.md](../skills/phaser-domain-contracts/resources/frame-animation/references/object-animation.md) |
| threejs | skills/threejs-frame-animation/references/object-animation.md | [skills/threejs-domain-contracts/resources/frame-animation/references/object-animation.md](../skills/threejs-domain-contracts/resources/frame-animation/references/object-animation.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-region-planning

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/region-planning.md | [skills/cocos-domain-contracts/resources/frame-animation/references/region-planning.md](../skills/cocos-domain-contracts/resources/frame-animation/references/region-planning.md) |
| phaser | skills/phaser4-frame-animation/references/region-planning.md | [skills/phaser-domain-contracts/resources/frame-animation/references/region-planning.md](../skills/phaser-domain-contracts/resources/frame-animation/references/region-planning.md) |
| threejs | skills/threejs-frame-animation/references/region-planning.md | [skills/threejs-domain-contracts/resources/frame-animation/references/region-planning.md](../skills/threejs-domain-contracts/resources/frame-animation/references/region-planning.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-ui-frame-animation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/ui-frame-animation.md | [skills/cocos-domain-contracts/resources/frame-animation/references/ui-frame-animation.md](../skills/cocos-domain-contracts/resources/frame-animation/references/ui-frame-animation.md) |
| phaser | skills/phaser4-frame-animation/references/ui-frame-animation.md | [skills/phaser-domain-contracts/resources/frame-animation/references/ui-frame-animation.md](../skills/phaser-domain-contracts/resources/frame-animation/references/ui-frame-animation.md) |
| threejs | skills/threejs-frame-animation/references/ui-frame-animation.md | [skills/threejs-domain-contracts/resources/frame-animation/references/ui-frame-animation.md](../skills/threejs-domain-contracts/resources/frame-animation/references/ui-frame-animation.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## frame-reference-workflow-integration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-frame-animation/references/workflow-integration.md | [skills/cocos-domain-contracts/resources/frame-animation/references/workflow-integration.md](../skills/cocos-domain-contracts/resources/frame-animation/references/workflow-integration.md) |
| phaser | skills/phaser4-frame-animation/references/workflow-integration.md | [skills/phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md](../skills/phaser-domain-contracts/resources/frame-animation/references/workflow-integration.md) |
| threejs | skills/threejs-frame-animation/references/workflow-integration.md | [skills/threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md](../skills/threejs-domain-contracts/resources/frame-animation/references/workflow-integration.md) |

帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。

## ui-game-copy

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/game-copy.md | [skills/cocos-game-ui-layout/references/game-copy.md](../skills/cocos-game-ui-layout/references/game-copy.md) |
| phaser | skills/phaser4-game-ui-layout/references/game-copy.md | [skills/phaser4-game-ui-layout/references/game-copy.md](../skills/phaser4-game-ui-layout/references/game-copy.md) |
| threejs | skills/threejs-game-ui-layout/references/game-copy.md | [skills/threejs-game-ui-layout/references/game-copy.md](../skills/threejs-game-ui-layout/references/game-copy.md) |
| unity | unity-development-workflow/references/game-copy.md | [skills/unity-development-workflow/references/game-copy.md](../skills/unity-development-workflow/references/game-copy.md) |

三栈完整正文及 Unity 经逐块审阅的共同规则统一维护；运行时文字组件和阶段差异由各栈保留。

## responsive-visual-validation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-qa-performance/references/responsive-visual-validation.md | [skills/cocos-game-qa-performance/references/responsive-visual-validation.md](../skills/cocos-game-qa-performance/references/responsive-visual-validation.md) |
| phaser | skills/phaser4-game-qa-performance/references/responsive-visual-validation.md | [skills/phaser4-game-qa-performance/references/responsive-visual-validation.md](../skills/phaser4-game-qa-performance/references/responsive-visual-validation.md) |
| threejs | skills/threejs-game-qa-performance/references/responsive-visual-validation.md | [skills/threejs-game-qa-performance/references/responsive-visual-validation.md](../skills/threejs-game-qa-performance/references/responsive-visual-validation.md) |

逐源核对完整测量、假通过、根因和动态视口规则；原生策略、Hook、合同模板与工具保留在各栈。

## art-quality-principles

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| unity | unity-development-workflow/references/art-quality-contract.md | [skills/unity-development-workflow/references/art-quality-contract.md](../skills/unity-development-workflow/references/art-quality-contract.md) |
| cocos | skills/cocos-game-asset-integration/references/art-quality-contract.md | [skills/cocos-game-asset-integration/references/art-quality-contract.md](../skills/cocos-game-asset-integration/references/art-quality-contract.md) |
| phaser | skills/phaser4-game-asset-integration/references/art-quality-contract.md | [skills/phaser4-game-asset-integration/references/art-quality-contract.md](../skills/phaser4-game-asset-integration/references/art-quality-contract.md) |
| threejs | skills/threejs-game-asset-integration/references/art-quality-contract.md | [skills/threejs-game-asset-integration/references/art-quality-contract.md](../skills/threejs-game-asset-integration/references/art-quality-contract.md) |

四栈共用美术 brief 与五项判断；具体字段、状态、候选和原生运行验收保持独立。

## reference-ad-applovin-max-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ad-integration/references/applovin-max-contract.md | [skills/cocos-game-ad-integration/references/applovin-max-contract.md](../skills/cocos-game-ad-integration/references/applovin-max-contract.md) |
| phaser | skills/phaser4-game-ad-integration/references/applovin-max-contract.md | [skills/phaser4-game-ad-integration/references/applovin-max-contract.md](../skills/phaser4-game-ad-integration/references/applovin-max-contract.md) |
| threejs | skills/threejs-game-ad-integration/references/applovin-max-contract.md | [skills/threejs-game-ad-integration/references/applovin-max-contract.md](../skills/threejs-game-ad-integration/references/applovin-max-contract.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-visual-production-pipeline

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/visual-production-pipeline.md | [skills/cocos-game-asset-integration/references/visual-production-pipeline.md](../skills/cocos-game-asset-integration/references/visual-production-pipeline.md) |
| phaser | skills/phaser4-game-asset-integration/references/visual-production-pipeline.md | [skills/phaser4-game-asset-integration/references/visual-production-pipeline.md](../skills/phaser4-game-asset-integration/references/visual-production-pipeline.md) |
| threejs | skills/threejs-game-asset-integration/references/visual-production-pipeline.md | [skills/threejs-game-asset-integration/references/visual-production-pipeline.md](../skills/threejs-game-asset-integration/references/visual-production-pipeline.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-asset-production-routes

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/asset-production-routes.md | [skills/cocos-game-asset-integration/references/asset-production-routes.md](../skills/cocos-game-asset-integration/references/asset-production-routes.md) |
| phaser | skills/phaser4-game-asset-integration/references/asset-production-routes.md | [skills/phaser4-game-asset-integration/references/asset-production-routes.md](../skills/phaser4-game-asset-integration/references/asset-production-routes.md) |
| threejs | skills/threejs-game-asset-integration/references/asset-production-routes.md | [skills/threejs-game-asset-integration/references/asset-production-routes.md](../skills/threejs-game-asset-integration/references/asset-production-routes.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-global-visual-control

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/global-visual-control.md | [skills/cocos-game-asset-integration/references/global-visual-control.md](../skills/cocos-game-asset-integration/references/global-visual-control.md) |
| phaser | skills/phaser4-game-asset-integration/references/global-visual-control.md | [skills/phaser4-game-asset-integration/references/global-visual-control.md](../skills/phaser4-game-asset-integration/references/global-visual-control.md) |
| threejs | skills/threejs-game-asset-integration/references/global-visual-control.md | [skills/threejs-game-asset-integration/references/global-visual-control.md](../skills/threejs-game-asset-integration/references/global-visual-control.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-visual-reconstruction

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/visual-reconstruction.md | [skills/cocos-game-asset-integration/references/visual-reconstruction.md](../skills/cocos-game-asset-integration/references/visual-reconstruction.md) |
| phaser | skills/phaser4-game-asset-integration/references/visual-reconstruction.md | [skills/phaser4-game-asset-integration/references/visual-reconstruction.md](../skills/phaser4-game-asset-integration/references/visual-reconstruction.md) |
| threejs | skills/threejs-game-asset-integration/references/visual-reconstruction.md | [skills/threejs-game-asset-integration/references/visual-reconstruction.md](../skills/threejs-game-asset-integration/references/visual-reconstruction.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-effect-image-prompt-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/effect-image-prompt-contract.md | [skills/cocos-game-asset-integration/references/effect-image-prompt-contract.md](../skills/cocos-game-asset-integration/references/effect-image-prompt-contract.md) |
| phaser | skills/phaser4-game-asset-integration/references/effect-image-prompt-contract.md | [skills/phaser4-game-asset-integration/references/effect-image-prompt-contract.md](../skills/phaser4-game-asset-integration/references/effect-image-prompt-contract.md) |
| threejs | skills/threejs-game-asset-integration/references/effect-image-prompt-contract.md | [skills/threejs-game-asset-integration/references/effect-image-prompt-contract.md](../skills/threejs-game-asset-integration/references/effect-image-prompt-contract.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-effect-image-splitting

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/effect-image-splitting.md | [skills/cocos-game-asset-integration/references/effect-image-splitting.md](../skills/cocos-game-asset-integration/references/effect-image-splitting.md) |
| phaser | skills/phaser4-game-asset-integration/references/effect-image-splitting.md | [skills/phaser4-game-asset-integration/references/effect-image-splitting.md](../skills/phaser4-game-asset-integration/references/effect-image-splitting.md) |
| threejs | skills/threejs-game-asset-integration/references/effect-image-splitting.md | [skills/threejs-game-asset-integration/references/effect-image-splitting.md](../skills/threejs-game-asset-integration/references/effect-image-splitting.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-art-quality-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/art-quality-contract.md | [skills/cocos-game-asset-integration/references/art-quality-contract.md](../skills/cocos-game-asset-integration/references/art-quality-contract.md) |
| phaser | skills/phaser4-game-asset-integration/references/art-quality-contract.md | [skills/phaser4-game-asset-integration/references/art-quality-contract.md](../skills/phaser4-game-asset-integration/references/art-quality-contract.md) |
| threejs | skills/threejs-game-asset-integration/references/art-quality-contract.md | [skills/threejs-game-asset-integration/references/art-quality-contract.md](../skills/threejs-game-asset-integration/references/art-quality-contract.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-game-feel-quality-gate

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/game-feel-quality-gate.md | [skills/cocos-game-asset-integration/references/game-feel-quality-gate.md](../skills/cocos-game-asset-integration/references/game-feel-quality-gate.md) |
| phaser | skills/phaser4-game-asset-integration/references/game-feel-quality-gate.md | [skills/phaser4-game-asset-integration/references/game-feel-quality-gate.md](../skills/phaser4-game-asset-integration/references/game-feel-quality-gate.md) |
| threejs | skills/threejs-game-asset-integration/references/game-feel-quality-gate.md | [skills/threejs-game-asset-integration/references/game-feel-quality-gate.md](../skills/threejs-game-asset-integration/references/game-feel-quality-gate.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-gameplay-visual-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/gameplay-visual-contract.md | [skills/cocos-game-asset-integration/references/gameplay-visual-contract.md](../skills/cocos-game-asset-integration/references/gameplay-visual-contract.md) |
| phaser | skills/phaser4-game-asset-integration/references/gameplay-visual-contract.md | [skills/phaser4-game-asset-integration/references/gameplay-visual-contract.md](../skills/phaser4-game-asset-integration/references/gameplay-visual-contract.md) |
| threejs | skills/threejs-game-asset-integration/references/gameplay-visual-contract.md | [skills/threejs-game-asset-integration/references/gameplay-visual-contract.md](../skills/threejs-game-asset-integration/references/gameplay-visual-contract.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-full-bleed-background

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/full-bleed-background.md | [skills/cocos-game-asset-integration/references/full-bleed-background.md](../skills/cocos-game-asset-integration/references/full-bleed-background.md) |
| phaser | skills/phaser4-game-asset-integration/references/full-bleed-background.md | [skills/phaser4-game-asset-integration/references/full-bleed-background.md](../skills/phaser4-game-asset-integration/references/full-bleed-background.md) |
| threejs | skills/threejs-game-asset-integration/references/full-bleed-background.md | [skills/threejs-game-asset-integration/references/full-bleed-background.md](../skills/threejs-game-asset-integration/references/full-bleed-background.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-nine-slice-ui

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/nine-slice-ui.md | [skills/cocos-game-asset-integration/references/nine-slice-ui.md](../skills/cocos-game-asset-integration/references/nine-slice-ui.md) |
| phaser | skills/phaser4-game-asset-integration/references/nine-slice-ui.md | [skills/phaser4-game-asset-integration/references/nine-slice-ui.md](../skills/phaser4-game-asset-integration/references/nine-slice-ui.md) |
| threejs | skills/threejs-game-asset-integration/references/nine-slice-ui.md | [skills/threejs-game-asset-integration/references/nine-slice-ui.md](../skills/threejs-game-asset-integration/references/nine-slice-ui.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-transparency-capability-audit

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/transparency-capability-audit.md | [skills/cocos-game-asset-integration/references/transparency-capability-audit.md](../skills/cocos-game-asset-integration/references/transparency-capability-audit.md) |
| phaser | skills/phaser4-game-asset-integration/references/transparency-capability-audit.md | [skills/phaser4-game-asset-integration/references/transparency-capability-audit.md](../skills/phaser4-game-asset-integration/references/transparency-capability-audit.md) |
| threejs | skills/threejs-game-asset-integration/references/transparency-capability-audit.md | [skills/threejs-game-asset-integration/references/transparency-capability-audit.md](../skills/threejs-game-asset-integration/references/transparency-capability-audit.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-asset-visual-alignment-authoring

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-asset-integration/references/visual-alignment-authoring.md | [skills/cocos-game-asset-integration/references/visual-alignment-authoring.md](../skills/cocos-game-asset-integration/references/visual-alignment-authoring.md) |
| phaser | skills/phaser4-game-asset-integration/references/visual-alignment-authoring.md | [skills/phaser4-game-asset-integration/references/visual-alignment-authoring.md](../skills/phaser4-game-asset-integration/references/visual-alignment-authoring.md) |
| threejs | skills/threejs-game-asset-integration/references/visual-alignment-authoring.md | [skills/threejs-game-asset-integration/references/visual-alignment-authoring.md](../skills/threejs-game-asset-integration/references/visual-alignment-authoring.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-layout-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/layout-contract.md | [skills/cocos-game-ui-layout/references/layout-contract.md](../skills/cocos-game-ui-layout/references/layout-contract.md) |
| phaser | skills/phaser4-game-ui-layout/references/layout-contract.md | [skills/phaser4-game-ui-layout/references/layout-contract.md](../skills/phaser4-game-ui-layout/references/layout-contract.md) |
| threejs | skills/threejs-game-ui-layout/references/layout-contract.md | [skills/threejs-game-ui-layout/references/layout-contract.md](../skills/threejs-game-ui-layout/references/layout-contract.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-layout-review-artifacts

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/layout-review-artifacts.md | [skills/cocos-game-ui-layout/references/layout-review-artifacts.md](../skills/cocos-game-ui-layout/references/layout-review-artifacts.md) |
| phaser | skills/phaser4-game-ui-layout/references/layout-review-artifacts.md | [skills/phaser4-game-ui-layout/references/layout-review-artifacts.md](../skills/phaser4-game-ui-layout/references/layout-review-artifacts.md) |
| threejs | skills/threejs-game-ui-layout/references/layout-review-artifacts.md | [skills/threejs-game-ui-layout/references/layout-review-artifacts.md](../skills/threejs-game-ui-layout/references/layout-review-artifacts.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-layout-hierarchy

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/layout-hierarchy.md | [skills/cocos-game-ui-layout/references/layout-hierarchy.md](../skills/cocos-game-ui-layout/references/layout-hierarchy.md) |
| phaser | skills/phaser4-game-ui-layout/references/layout-hierarchy.md | [skills/phaser4-game-ui-layout/references/layout-hierarchy.md](../skills/phaser4-game-ui-layout/references/layout-hierarchy.md) |
| threejs | skills/threejs-game-ui-layout/references/layout-hierarchy.md | [skills/threejs-game-ui-layout/references/layout-hierarchy.md](../skills/threejs-game-ui-layout/references/layout-hierarchy.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-evidence-matrix

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/evidence-matrix.md | [skills/cocos-game-ui-layout/references/evidence-matrix.md](../skills/cocos-game-ui-layout/references/evidence-matrix.md) |
| phaser | skills/phaser4-game-ui-layout/references/evidence-matrix.md | [skills/phaser4-game-ui-layout/references/evidence-matrix.md](../skills/phaser4-game-ui-layout/references/evidence-matrix.md) |
| threejs | skills/threejs-game-ui-layout/references/evidence-matrix.md | [skills/threejs-game-ui-layout/references/evidence-matrix.md](../skills/threejs-game-ui-layout/references/evidence-matrix.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-workflow-gates

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/workflow-gates.md | [skills/cocos-game-ui-layout/references/workflow-gates.md](../skills/cocos-game-ui-layout/references/workflow-gates.md) |
| phaser | skills/phaser4-game-ui-layout/references/workflow-gates.md | [skills/phaser4-game-ui-layout/references/workflow-gates.md](../skills/phaser4-game-ui-layout/references/workflow-gates.md) |
| threejs | skills/threejs-game-ui-layout/references/workflow-gates.md | [skills/threejs-game-ui-layout/references/workflow-gates.md](../skills/threejs-game-ui-layout/references/workflow-gates.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-layout-calibration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/layout-calibration.md | [skills/cocos-game-ui-layout/references/layout-calibration.md](../skills/cocos-game-ui-layout/references/layout-calibration.md) |
| phaser | skills/phaser4-game-ui-layout/references/layout-calibration.md | [skills/phaser4-game-ui-layout/references/layout-calibration.md](../skills/phaser4-game-ui-layout/references/layout-calibration.md) |
| threejs | skills/threejs-game-ui-layout/references/layout-calibration.md | [skills/threejs-game-ui-layout/references/layout-calibration.md](../skills/threejs-game-ui-layout/references/layout-calibration.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-ui-functional-semantic-grouping

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-ui-layout/references/functional-semantic-grouping.md | [skills/cocos-game-ui-layout/references/functional-semantic-grouping.md](../skills/cocos-game-ui-layout/references/functional-semantic-grouping.md) |
| phaser | skills/phaser4-game-ui-layout/references/functional-semantic-grouping.md | [skills/phaser4-game-ui-layout/references/functional-semantic-grouping.md](../skills/phaser4-game-ui-layout/references/functional-semantic-grouping.md) |
| threejs | skills/threejs-game-ui-layout/references/functional-semantic-grouping.md | [skills/threejs-game-ui-layout/references/functional-semantic-grouping.md](../skills/threejs-game-ui-layout/references/functional-semantic-grouping.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-feedback-design-guide

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-juice/references/design-guide.md | [skills/cocos-game-juice/references/design-guide.md](../skills/cocos-game-juice/references/design-guide.md) |
| phaser | skills/phaser4-game-juice/references/design-guide.md | [skills/phaser4-game-juice/references/design-guide.md](../skills/phaser4-game-juice/references/design-guide.md) |
| threejs | skills/threejs-game-juice/references/design-guide.md | [skills/threejs-game-juice/references/design-guide.md](../skills/threejs-game-juice/references/design-guide.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-feedback-workflow-integration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-juice/references/workflow-integration.md | [skills/cocos-game-juice/references/workflow-integration.md](../skills/cocos-game-juice/references/workflow-integration.md) |
| phaser | skills/phaser4-game-juice/references/workflow-integration.md | [skills/phaser4-game-juice/references/workflow-integration.md](../skills/phaser4-game-juice/references/workflow-integration.md) |
| threejs | skills/threejs-game-juice/references/workflow-integration.md | [skills/threejs-game-juice/references/workflow-integration.md](../skills/threejs-game-juice/references/workflow-integration.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-spine-progress-state

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/references/progress-state.md | [skills/cocos-spine-generative-reskin/references/progress-state.md](../skills/cocos-spine-generative-reskin/references/progress-state.md) |
| phaser | skills/phaser4-spine-generative-reskin/references/progress-state.md | [skills/phaser4-spine-generative-reskin/references/progress-state.md](../skills/phaser4-spine-generative-reskin/references/progress-state.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-spine-atlas-rebuild

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/references/atlas-rebuild.md | [skills/cocos-spine-generative-reskin/references/atlas-rebuild.md](../skills/cocos-spine-generative-reskin/references/atlas-rebuild.md) |
| phaser | skills/phaser4-spine-generative-reskin/references/atlas-rebuild.md | [skills/phaser4-spine-generative-reskin/references/atlas-rebuild.md](../skills/phaser4-spine-generative-reskin/references/atlas-rebuild.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-spine-skeleton-upgrade

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/references/skeleton-upgrade.md | [skills/cocos-spine-generative-reskin/references/skeleton-upgrade.md](../skills/cocos-spine-generative-reskin/references/skeleton-upgrade.md) |
| phaser | skills/phaser4-spine-generative-reskin/references/skeleton-upgrade.md | [skills/phaser4-spine-generative-reskin/references/skeleton-upgrade.md](../skills/phaser4-spine-generative-reskin/references/skeleton-upgrade.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-spine-runtime-validation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-spine-generative-reskin/references/runtime-validation.md | [skills/cocos-spine-generative-reskin/references/runtime-validation.md](../skills/cocos-spine-generative-reskin/references/runtime-validation.md) |
| phaser | skills/phaser4-spine-generative-reskin/references/runtime-validation.md | [skills/phaser4-spine-generative-reskin/references/runtime-validation.md](../skills/phaser4-spine-generative-reskin/references/runtime-validation.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-architecture-production-build

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| phaser | skills/phaser4-game-architecture/references/production-build.md | [skills/phaser4-game-architecture/references/production-build.md](../skills/phaser4-game-architecture/references/production-build.md) |
| threejs | skills/threejs-game-architecture/references/production-build.md | [skills/threejs-game-architecture/references/production-build.md](../skills/threejs-game-architecture/references/production-build.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-architecture-project-structure

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| phaser | skills/phaser4-game-architecture/references/project-structure.md | [skills/phaser4-game-architecture/references/project-structure.md](../skills/phaser4-game-architecture/references/project-structure.md) |
| threejs | skills/threejs-game-architecture/references/project-structure.md | [skills/threejs-game-architecture/references/project-structure.md](../skills/threejs-game-architecture/references/project-structure.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## reference-architecture-sdk-initialization

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-architecture/references/sdk-initialization.md | [skills/cocos-game-architecture/references/sdk-initialization.md](../skills/cocos-game-architecture/references/sdk-initialization.md) |
| phaser | skills/phaser4-game-architecture/references/sdk-initialization.md | [skills/phaser4-game-architecture/references/sdk-initialization.md](../skills/phaser4-game-architecture/references/sdk-initialization.md) |

按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。

## git-minimal-submission

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/minimal-git.md | [skills/cocos-domain-contracts/references/minimal-git.md](../skills/cocos-domain-contracts/references/minimal-git.md) |
| phaser | skills/phaser4-game-workflow-control/references/minimal-git.md | [skills/phaser-domain-contracts/references/minimal-git.md](../skills/phaser-domain-contracts/references/minimal-git.md) |
| threejs | skills/threejs-game-workflow-control/references/minimal-git.md | [skills/threejs-domain-contracts/references/minimal-git.md](../skills/threejs-domain-contracts/references/minimal-git.md) |

共同 Git 文件选择和引用闭包只维护一份；原生资源身份、工程路径和模板保持技术栈差异。

## reference-orchestration-worktree-integration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/worktree-integration.md | [skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md) |
| phaser | skills/phaser4-game-orchestrator/references/worktree-integration.md | [skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md) |
| threejs | skills/threejs-game-orchestrator/references/worktree-integration.md | [skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-worktree-integration.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-local-service-validation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/local-service-validation.md | [skills/cocos-game-orchestrator/references/local-service-validation.md](../skills/cocos-game-orchestrator/references/local-service-validation.md) |
| phaser | skills/phaser4-game-orchestrator/references/local-service-validation.md | [skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md](../skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md) |
| threejs | skills/threejs-game-orchestrator/references/local-service-validation.md | [skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md](../skills/app-domain-toolkit/references/reference-orchestration-local-service-validation.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-grilling-integration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/grilling-integration.md | [skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md) |
| phaser | skills/phaser4-game-orchestrator/references/grilling-integration.md | [skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md](../skills/app-domain-toolkit/references/reference-orchestration-grilling-integration.md) |
| threejs | skills/threejs-game-orchestrator/references/grilling-integration.md | [skills/threejs-game-orchestrator/references/grilling-integration.md](../skills/threejs-game-orchestrator/references/grilling-integration.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-game-implementation

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/game-implementation.md | [skills/cocos-game-orchestrator/references/game-implementation.md](../skills/cocos-game-orchestrator/references/game-implementation.md) |
| phaser | skills/phaser4-game-orchestrator/references/game-implementation.md | [skills/phaser4-game-orchestrator/references/game-implementation.md](../skills/phaser4-game-orchestrator/references/game-implementation.md) |
| threejs | skills/threejs-game-orchestrator/references/game-implementation.md | [skills/threejs-game-orchestrator/references/game-implementation.md](../skills/threejs-game-orchestrator/references/game-implementation.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-visual-quality-gate

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/visual-quality-gate.md | [skills/cocos-game-orchestrator/references/visual-quality-gate.md](../skills/cocos-game-orchestrator/references/visual-quality-gate.md) |
| phaser | skills/phaser4-game-orchestrator/references/visual-quality-gate.md | [skills/phaser4-game-orchestrator/references/visual-quality-gate.md](../skills/phaser4-game-orchestrator/references/visual-quality-gate.md) |
| threejs | skills/threejs-game-orchestrator/references/visual-quality-gate.md | [skills/threejs-game-orchestrator/references/visual-quality-gate.md](../skills/threejs-game-orchestrator/references/visual-quality-gate.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-module-decomposition

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/module-decomposition.md | [skills/cocos-game-orchestrator/references/module-decomposition.md](../skills/cocos-game-orchestrator/references/module-decomposition.md) |
| phaser | skills/phaser4-game-orchestrator/references/module-decomposition.md | [skills/phaser4-game-orchestrator/references/module-decomposition.md](../skills/phaser4-game-orchestrator/references/module-decomposition.md) |
| threejs | skills/threejs-game-orchestrator/references/module-decomposition.md | [skills/threejs-game-orchestrator/references/module-decomposition.md](../skills/threejs-game-orchestrator/references/module-decomposition.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-review-funnel

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/review-funnel.md | [skills/cocos-game-orchestrator/references/review-funnel.md](../skills/cocos-game-orchestrator/references/review-funnel.md) |
| phaser | skills/phaser4-game-orchestrator/references/review-funnel.md | [skills/phaser4-game-orchestrator/references/review-funnel.md](../skills/phaser4-game-orchestrator/references/review-funnel.md) |
| threejs | skills/threejs-game-orchestrator/references/review-funnel.md | [skills/threejs-game-orchestrator/references/review-funnel.md](../skills/threejs-game-orchestrator/references/review-funnel.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-quality-gates

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/quality-gates.md | [skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md](../skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md) |
| phaser | skills/phaser4-game-orchestrator/references/quality-gates.md | [skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md](../skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md) |
| threejs | skills/threejs-game-orchestrator/references/quality-gates.md | [skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md](../skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-dependency-capability-profiles

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/dependency-capability-profiles.md | [skills/cocos-game-orchestrator/references/dependency-capability-profiles.md](../skills/cocos-game-orchestrator/references/dependency-capability-profiles.md) |
| phaser | skills/phaser4-game-orchestrator/references/dependency-capability-profiles.md | [skills/phaser4-game-orchestrator/references/dependency-capability-profiles.md](../skills/phaser4-game-orchestrator/references/dependency-capability-profiles.md) |
| threejs | skills/threejs-game-orchestrator/references/dependency-capability-profiles.md | [skills/threejs-game-orchestrator/references/dependency-capability-profiles.md](../skills/threejs-game-orchestrator/references/dependency-capability-profiles.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-technical-grilling

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/grilling/SKILL.md | [skills/cocos-domain-contracts/references/technical-grilling.md](../skills/cocos-domain-contracts/references/technical-grilling.md) |
| phaser | skills/grilling/SKILL.md | [skills/phaser-domain-contracts/references/technical-grilling.md](../skills/phaser-domain-contracts/references/technical-grilling.md) |
| threejs | skills/grilling/SKILL.md | [skills/threejs-domain-contracts/references/technical-grilling.md](../skills/threejs-domain-contracts/references/technical-grilling.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-technical-orchestration

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/SKILL.md | [skills/cocos-game-orchestrator/references/technical-orchestration.md](../skills/cocos-game-orchestrator/references/technical-orchestration.md) |
| phaser | skills/phaser4-game-orchestrator/SKILL.md | [skills/phaser4-game-orchestrator/references/technical-orchestration.md](../skills/phaser4-game-orchestrator/references/technical-orchestration.md) |
| threejs | skills/threejs-game-orchestrator/SKILL.md | [skills/threejs-game-orchestrator/references/technical-orchestration.md](../skills/threejs-game-orchestrator/references/technical-orchestration.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-orchestration-delivery-artifacts

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-orchestrator/references/delivery-artifacts.md | [skills/cocos-game-orchestrator/references/delivery-artifacts.md](../skills/cocos-game-orchestrator/references/delivery-artifacts.md) |
| phaser | skills/phaser4-game-orchestrator/references/delivery-artifacts.md | [skills/phaser4-game-orchestrator/references/delivery-artifacts.md](../skills/phaser4-game-orchestrator/references/delivery-artifacts.md) |

按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。

## reference-domain-completion

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/control-model.md | [skills/cocos-domain-contracts/references/control-model.md](../skills/cocos-domain-contracts/references/control-model.md) |
| phaser | skills/phaser4-game-workflow-control/references/control-model.md | [skills/phaser-domain-contracts/references/control-model.md](../skills/phaser-domain-contracts/references/control-model.md) |
| threejs | skills/threejs-game-workflow-control/references/control-model.md | [skills/threejs-domain-contracts/references/control-model.md](../skills/threejs-domain-contracts/references/control-model.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-display-ownership

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/control-model.md | [skills/cocos-domain-contracts/references/control-model.md](../skills/cocos-domain-contracts/references/control-model.md) |
| phaser | skills/phaser4-game-workflow-control/references/control-model.md | [skills/phaser-domain-contracts/references/control-model.md](../skills/phaser-domain-contracts/references/control-model.md) |
| threejs | skills/threejs-game-workflow-control/references/control-model.md | [skills/threejs-domain-contracts/references/control-model.md](../skills/threejs-domain-contracts/references/control-model.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-visual-sequence

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/control-model.md | [skills/cocos-domain-contracts/references/control-model.md](../skills/cocos-domain-contracts/references/control-model.md) |
| phaser | skills/phaser4-game-workflow-control/references/control-model.md | [skills/phaser-domain-contracts/references/control-model.md](../skills/phaser-domain-contracts/references/control-model.md) |
| threejs | skills/threejs-game-workflow-control/references/control-model.md | [skills/threejs-domain-contracts/references/control-model.md](../skills/threejs-domain-contracts/references/control-model.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-visual-schema

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/schemas.md | [skills/cocos-domain-contracts/references/schemas.md](../skills/cocos-domain-contracts/references/schemas.md) |
| phaser | skills/phaser4-game-workflow-control/references/schemas.md | [skills/phaser-domain-contracts/references/schemas.md](../skills/phaser-domain-contracts/references/schemas.md) |
| threejs | skills/threejs-game-workflow-control/references/schemas.md | [skills/threejs-domain-contracts/references/schemas.md](../skills/threejs-domain-contracts/references/schemas.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-visual-gates

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/state-gates.md | [skills/cocos-domain-contracts/references/state-gates.md](../skills/cocos-domain-contracts/references/state-gates.md) |
| phaser | skills/phaser4-game-workflow-control/references/state-gates.md | [skills/phaser-domain-contracts/references/state-gates.md](../skills/phaser-domain-contracts/references/state-gates.md) |
| threejs | skills/threejs-game-workflow-control/references/state-gates.md | [skills/threejs-domain-contracts/references/state-gates.md](../skills/threejs-domain-contracts/references/state-gates.md) |
| cocos | skills/cocos-game-workflow-control/references/simplified-workflow.md | [skills/cocos-domain-contracts/references/simplified-workflow.md](../skills/cocos-domain-contracts/references/simplified-workflow.md) |
| phaser | skills/phaser4-game-workflow-control/references/simplified-workflow.md | [skills/phaser-domain-contracts/references/simplified-workflow.md](../skills/phaser-domain-contracts/references/simplified-workflow.md) |
| threejs | skills/threejs-game-workflow-control/references/simplified-workflow.md | [skills/threejs-domain-contracts/references/simplified-workflow.md](../skills/threejs-domain-contracts/references/simplified-workflow.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-visual-admission

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/control-model.md | [skills/cocos-domain-contracts/references/control-model.md](../skills/cocos-domain-contracts/references/control-model.md) |
| phaser | skills/phaser4-game-workflow-control/references/control-model.md | [skills/phaser-domain-contracts/references/control-model.md](../skills/phaser-domain-contracts/references/control-model.md) |
| threejs | skills/threejs-game-workflow-control/references/control-model.md | [skills/threejs-domain-contracts/references/control-model.md](../skills/threejs-domain-contracts/references/control-model.md) |
| cocos | skills/cocos-game-workflow-control/references/state-gates.md | [skills/cocos-domain-contracts/references/state-gates.md](../skills/cocos-domain-contracts/references/state-gates.md) |
| phaser | skills/phaser4-game-workflow-control/references/state-gates.md | [skills/phaser-domain-contracts/references/state-gates.md](../skills/phaser-domain-contracts/references/state-gates.md) |
| threejs | skills/threejs-game-workflow-control/references/state-gates.md | [skills/threejs-domain-contracts/references/state-gates.md](../skills/threejs-domain-contracts/references/state-gates.md) |
| cocos | skills/cocos-game-workflow-control/references/schemas.md | [skills/cocos-domain-contracts/references/schemas.md](../skills/cocos-domain-contracts/references/schemas.md) |
| phaser | skills/phaser4-game-workflow-control/references/schemas.md | [skills/phaser-domain-contracts/references/schemas.md](../skills/phaser-domain-contracts/references/schemas.md) |
| threejs | skills/threejs-game-workflow-control/references/schemas.md | [skills/threejs-domain-contracts/references/schemas.md](../skills/threejs-domain-contracts/references/schemas.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-scene-contract

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/schemas.md | [skills/cocos-domain-contracts/references/schemas.md](../skills/cocos-domain-contracts/references/schemas.md) |
| phaser | skills/phaser4-game-workflow-control/references/schemas.md | [skills/phaser-domain-contracts/references/schemas.md](../skills/phaser-domain-contracts/references/schemas.md) |
| threejs | skills/threejs-game-workflow-control/references/schemas.md | [skills/threejs-domain-contracts/references/schemas.md](../skills/threejs-domain-contracts/references/schemas.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## reference-domain-visual-review

| 原技术栈 | 源文件 | 当前专业适配入口 |
| --- | --- | --- |
| cocos | skills/cocos-game-workflow-control/references/simplified-workflow.md | [skills/cocos-domain-contracts/references/simplified-workflow.md](../skills/cocos-domain-contracts/references/simplified-workflow.md) |
| phaser | skills/phaser4-game-workflow-control/references/simplified-workflow.md | [skills/phaser-domain-contracts/references/simplified-workflow.md](../skills/phaser-domain-contracts/references/simplified-workflow.md) |
| cocos | skills/cocos-game-workflow-control/SKILL.md | [skills/cocos-domain-contracts/references/technical-control.md](../skills/cocos-domain-contracts/references/technical-control.md) |
| phaser | skills/phaser4-game-workflow-control/SKILL.md | [skills/phaser-domain-contracts/references/technical-control.md](../skills/phaser-domain-contracts/references/technical-control.md) |
| threejs | skills/threejs-game-workflow-control/SKILL.md | [skills/threejs-domain-contracts/references/technical-control.md](../skills/threejs-domain-contracts/references/technical-control.md) |

按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。

## 保持独立的规则

Unity 序列化、`.meta/GUID` 和 Editor 单写者，Creator AssetDB/UUID，Phaser Scale/Scene/Input，Three.js 世界投影/renderer，以及 Flutter Widget/SafeArea/文字缩放继续按各栈规范维护。浏览器游戏 DPR 合同的适用范围仅为其表中所列技术栈，不推给 Unity 或 Flutter。

具体源段落、文件摘要、配置差异和依赖见 migration/catalog.json 的 sharedCapabilities、generatedFiles 及 migration/files.json 的 sharedImplementationRef/sharedReferences。
