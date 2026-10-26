# Unity 能力与原生适配

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
| 角色骨架与绑定 | [app-character-rigging](../../app-character-rigging/SKILL.md) |
| 三维几何建模 | [app-3d-modeling](../../app-3d-modeling/SKILL.md) |
| 三维材质与贴图生产 | [app-3d-texturing](../../app-3d-texturing/SKILL.md) |
| Spine 生成式换皮 | [app-spine-reskin](../../app-spine-reskin/SKILL.md) |
| 界面布局与自适应 | [app-ui-layout](../../app-ui-layout/SKILL.md) |
| 项目整理与产物清理 | [app-artifact-cleanup](../../app-artifact-cleanup/SKILL.md) |
| 有设计约束的素材生产 | [app-asset-workflow](../../app-asset-workflow/SKILL.md) |

## 原生适配模式

| 原专业能力 | 公共入口 | 完整原生规范 |
| --- | --- | --- |
| unity-game-2d-animation-ta | $app-animation | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-2d-animation-ta) |
| unity-game-2d-rigging | $app-character-rigging | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-2d-rigging) |
| unity-game-3d-animation | $app-animation | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-3d-animation) |
| unity-game-3d-modeling | $app-3d-modeling | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-3d-modeling) |
| unity-game-3d-rigging | $app-character-rigging | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-3d-rigging) |
| unity-game-3d-texturing | $app-3d-texturing | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-3d-texturing) |
| unity-game-architecture | $app-architecture | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-architecture) |
| unity-game-audio | $app-audio | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-audio) |
| unity-game-balance | $app-game-balance | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-balance) |
| unity-game-juice | $app-feedback | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-juice) |
| unity-game-production | $app-product-planning | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-production) |
| unity-game-qa-performance | $app-quality-review | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-qa-performance) |
| unity-game-release | $app-release | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-release) |
| unity-game-spine-reskin | $app-spine-reskin | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-spine-reskin) |
| unity-game-visual-assets | $app-asset-workflow | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-game-visual-assets) |
| unity-gameplay-development | $app-gameplay-development | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-gameplay-development) |
| unity-artifact-cleanup（本仓库新增） | $app-artifact-cleanup | [原生章节](../../app-stack-unity/references/native-contracts.md#mode-unity-artifact-cleanup) |

## 共用实现与正文

这些规则与算法由公共能力调用，执行时只采用本栈适用部分。

| 能力 | 公共真源 |
| --- | --- |
| audio | [skills/app-domain-toolkit/references/audio.md](../../app-domain-toolkit/references/audio.md) |
| balance | [skills/app-domain-toolkit/references/balance.md](../../app-domain-toolkit/references/balance.md) |
| modeling-production | [skills/app-domain-toolkit/references/modeling-production.md](../../app-domain-toolkit/references/modeling-production.md) |

## 支持资源

- [app-domain-toolkit](../../app-domain-toolkit)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-development-workflow](../../unity-development-workflow)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-domain-contracts](../../unity-domain-contracts)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-2d-animation-ta](../../unity-game-2d-animation-ta)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-2d-rigging](../../unity-game-2d-rigging)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-3d-animation](../../unity-game-3d-animation)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-3d-modeling](../../unity-game-3d-modeling)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-3d-rigging](../../unity-game-3d-rigging)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-3d-texturing](../../unity-game-3d-texturing)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-architecture](../../unity-game-architecture)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-audio](../../unity-game-audio)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-balance](../../unity-game-balance)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-juice](../../unity-game-juice)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-production](../../unity-game-production)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-qa-performance](../../unity-game-qa-performance)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-release](../../unity-game-release)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-spine-reskin](../../unity-game-spine-reskin)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-game-visual-assets](../../unity-game-visual-assets)：领域资料、模板和工具依赖；不含独立全局流程入口。
- [unity-gameplay-development](../../unity-gameplay-development)：领域资料、模板和工具依赖；不含独立全局流程入口。

## 原工具入口

运行 Node 专业工具前按安装说明准备统一依赖。视频、DCC 和引擎工具仍需对应外部程序，不因脚本存在而认定已经运行。

- `unity-domain-validation`：[实现](../../unity-domain-contracts/scripts/unity-contract-validation.mjs)，通过 ESM 导入的校验接口，不作为命令执行。
