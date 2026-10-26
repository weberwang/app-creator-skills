# 游戏与应用技能工作流

以 Unity 为公共流程基准，整合 Unity、Cocos Creator、Phaser、Three.js 和 Flutter。公共流程、同义生产规则和可复用算法集中维护；专业技能保留实际技术差异、完整能力入口、模板、校验器和测试。专业入口可以调用一份公共实现，不按源目录逐份维护相同正文和算法。

五个源仓库的 **91 个正式入口及 1 个 Flutter 生成模板**全部登记。目标按能力收敛为 **30 个可发现技能：21 个领域能力、4 个公共流程、5 个技术栈规范**。原77个专业模式与3个仓库新增模式集中到 **5份技术栈原生手册**，按能力和模式分节读取；旧目录不再保留 `SKILL.md` 或 `ADAPTER.md` 空壳。脚本、模板、校验器和其他必要载荷继续分发。逐项来源及公共入口见[技能迁移清单](docs/skill-migration.md)，文件去向、章节及摘要见 [migration/catalog.json](migration/catalog.json)。

公共能力调用20份共享工作流，并通过自己的 `native-adapters.json` 按 `path` 与 `section` 定位本栈原生模式。岗位、交接和审核职责集中在[公共专业约定](skills/app-creator-workflow/references/professional-conventions.md)；原生手册维护框架接口、资源格式、平台限制及工具调用。Unity UI 与2D角色动作生产复用已有模式，不复制正文。具体保留证据见[五栈正文复查](docs/skill-body-audit.md)；维护时可用 `npm run audit:bodies` 检查规则回流。

游戏与应用的汁水设计统一使用 [`app-feedback`](skills/app-feedback/SKILL.md)，共用事件语义、反馈矩阵、通道与强度预算、并发打断、异步结果和无障碍规则。四个游戏栈保留各自原生规范，Flutter 使用本仓库新增的应用反馈适配；新增规范单独溯源，入口总数保持 30 个。

五栈整理清理统一使用 [`app-artifact-cleanup`](skills/app-artifact-cleanup/SKILL.md)，先列出目录整理、移动/重命名和删除计划，再按当前栈的引用与资源身份规则执行和验证。发布使用 [`app-release`](skills/app-release/SKILL.md)，逐项核对第三方集成实际生效的参数及正式环境，并提醒是否需要额外性能检查、性能优化或打包/更新图集；不会因此自动清理项目、优化或重打图集。

## 公共流程与专业能力

| 入口 | 职责 |
| --- | --- |
| [app-creator-workflow](skills/app-creator-workflow/SKILL.md) | 唯一公共编排：选择技术栈、专业角色、交接、验证与交付 |
| [app-workflow-control](skills/app-workflow-control/SKILL.md) | 唯一公共状态机、风险门、实施单元、证据与恢复 |
| [grilling](skills/grilling/SKILL.md) | 核实事实后逐项处理必须由用户决定的实质取舍 |
| [app-asset-workflow](skills/app-asset-workflow/SKILL.md) | 视觉签名、三候选、素材生产、去 AI 味与人工验收 |
| [app-domain-toolkit](docs/shared-capabilities.md) | 一份公共生产规范、视觉合同、图片/补帧算法及字库；专业入口只维护栈差异和适配 |
| [Unity 原生手册](skills/app-stack-unity/references/native-contracts.md) | 17个模式：16个源专业模式及新增清理模式 |
| [Cocos 原生手册](skills/app-stack-cocos/references/native-contracts.md) | 16个模式，含帧动画、Spine、广告、UI与资源接入 |
| [Phaser 原生手册](skills/app-stack-phaser/references/native-contracts.md) | 15个模式，含帧动画、Spine、广告、图片优化与布局 |
| [Three.js 原生手册](skills/app-stack-threejs/references/native-contracts.md) | 18个模式，含建模、GLB校验、运行时、插件与Starter |
| [Flutter 原生手册](skills/app-stack-flutter/references/native-contracts.md) | 14个模式：12个源专业模式及新增反馈、清理模式 |

公共六阶段为“需求与范围 → 全局基线 → 基础工程 → 场景/页面/显示层生产 → 全局集成验证 → 发布”，可见对象使用 V0–V4。各栈原生合同与工具独立维护，不将 Unity 坐标、序列化或资源规则套到其他栈。

使用能力名进入任务，例如 `$app-character-rigging`、`$app-animation`、`$app-3d-asset-pipeline`、`$app-ui-layout`、`$app-spine-reskin`。同一能力只有一个入口；通过 manifest 的 `mode/when` 选择模式，再按 `path/section` 只读本栈手册的对应章节及其配套工具。原目录只保留有效载荷，纯适配空目录移除。领域报告纳入公共 Evidence；领域 schema 不直接作为公共 Work Item 使用。Unity序列化/Editor、Creator UUID/AssetDB、Phaser场景与输入、Three.js世界投影、Flutter Widget布局继续独立维护。

| 工作成果 | 公共能力入口 |
| --- | --- |
| 产品需求与架构 | `$app-product-planning`、`$app-architecture` |
| 玩法、音频、数值 | `$app-gameplay-development`、`$app-audio`、`$app-game-balance` |
| 游戏与应用汁水设计 | `$app-feedback` |
| 动画、角色绑定、Spine | `$app-animation`、`$app-character-rigging`、`$app-spine-reskin` |
| 三维几何、PBR、运行管线 | `$app-3d-modeling`、`$app-3d-texturing`、`$app-3d-asset-pipeline` |
| 布局与代码草图 | `$app-ui-layout`、`$app-ui-code-sketch` |
| 图片优化 | `$app-image-optimization` |
| 项目整理与产物清理 | `$app-artifact-cleanup` |
| 广告、运行时插件、工程基础 | `$app-ad-integration`、`$app-runtime-plugins`、`$app-project-foundation` |
| 质量审核与发布准备 | `$app-quality-review`、`$app-release` |

并非所有能力都适用五栈。以 manifest 声明的实际模式和原生合同为准，不因名称通用便给技术栈虚构支持。

图片优化沿用三源的显式触发策略，只在用户明确请求时进入 `$app-image-optimization`；包体过大、构建或发布阶段不会自动触发资源改写。

## 按模式读取规范

使用已安装的共用读取工具，直接取得当前模式正文、直接公共依赖和按需资源路径：

```powershell
node .agents/skills/app-skill-runtime/read-native-mode.mjs flutter app-feedback
node .agents/skills/app-skill-runtime/read-native-mode.mjs unity app-audio
node .agents/skills/app-skill-runtime/read-native-mode.mjs flutter app-quality-review flutter-ux-ui-quality
```

单模式能力省略第三个参数；多模式必须从 `native-adapters.json` 选择明确的 `sourceSkill`，未选择时工具列出候选并退出。加 `--json` 可获得结构化正文、资源清单及字符数统计。在维护本仓库时，将命令中的 `.agents/skills/` 换为 `skills/`。

读取器不递归展开整个规范网络：同栈其他模式、专业参考、脚本、模板及公共资料的进一步依赖只列出路径，由当前任务决定是否继续读取；外部链接保持在原文中。它不执行资源脚本、项目命令或安装依赖，不能代替公共能力入口及项目事实判断。

## 在项目中安装

要求 Node.js >=22.20。轻量 npx 入口准备为以下用法，默认安装到当前项目：

```powershell
npx app-creator-skills flutter
npx app-creator-skills unity,cocos
npx app-creator-skills
```

第三种用法在交互终端中提供中文技术栈选择；非交互环境必须指定技术栈。只有显式选择 `all` 才安装五栈。可选 `--dir ../my-app` 指定另一项目，`--dry-run` 预览，`--replace` 在备份后更新不同内容。已有相同内容和下载缓存直接复用，后续可以追加其他栈。

**默认远程仓库为私有仓库 `weberwang/app-creator-skills`，npx 包尚未发布。** 默认来源配置在 [installer.config.json](packages/cli/installer.config.json)，可选填写 `ref` 固定版本；轻量包发布后，上述命令才可从 npm 使用。访问私有仓库需通过 `GITHUB_TOKEN` 或 `GH_TOKEN` 提供 Contents 只读权限，具体方法见下方私库说明。临时来源可用 `--repo owner/repo` 覆盖，无需每次填写默认仓库。

轻量包位于 `packages/cli`，只有命令入口、默认配置和从唯一安装器真源生成的引导器，没有技能载荷、Sharp 或其他 npm 依赖。`npm run build:npx` 生成引导器；`npm run pack:npx` 只打包这个轻量子包，`prepack` 自动同步真源。发布前的 `prepublishOnly` 会拒绝空仓库配置。根包继续保持私有完整源码分发用途，不作为轻量 npx 包发布；也不使用会克隆整仓的 GitHub package spec。

以下独立安装器和本地入口保留显式选项：`--stack flutter`、`--stack unity,cocos` 或 `--stack all`，不指定时提示选择，不默认全装。

远程安装无需克隆整个仓库。在目标项目根目录执行以下示例，将仓库坐标和版本替换成已提供本安装器的可信公开 GitHub 仓库；固定提交 SHA 可以复现相同版本：

```powershell
$skillsRepo = 'OWNER/app-creator-skills'
$skillsRef = 'main' # 替换为实际分支、标签或提交 SHA
$installerPath = './app-creator-install.mjs'
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$skillsRepo/$skillsRef/install.mjs" -OutFile $installerPath
node $installerPath . --repo $skillsRepo --ref $skillsRef --stack flutter --dry-run
node $installerPath . --repo $skillsRepo --ref $skillsRef --stack flutter

# 后续只补装 Unity；相同公共内容直接复用
node $installerPath . --repo $skillsRepo --ref $skillsRef --stack unity
```

启动器只获取最小安装引擎，随后将分支/标签解析到一个不可变提交，读取目录元数据与安装清单，仅下载所选栈和公共依赖；不下载整仓压缩包、其他栈的专业目录或源迁移档案。公共资源包作为完整依赖分发。已有目标文件或缓存与远端 Git blob 摘要一致时直接复用；再次安装相同版本不重复下载技能载荷，也不重写相同目录。

私有仓库可通过 `GITHUB_TOKEN` 或 `GH_TOKEN` 提供 Contents 只读权限，令牌不放进命令参数或报告。上面的 `Invoke-WebRequest` 示例用于公开仓库，不会自动读取这两个变量；启动器位于私库时，先通过已登录的 GitHub 页面或已认证渠道下载可信 `install.mjs`，再指定私库执行，不能把令牌拼进下载 URL。远程安装需要网络；Node.js 22.20 不会自动采用代理环境变量，需要环境代理时，使用支持该能力的 Node.js 版本并按[官方代理说明](https://nodejs.org/learn/http/enterprise-network-configuration)启用。远端清单截断、下载损坏或权限不足时停止，不退回全仓下载。

已有本地仓库时仍可离线选装。在本技能仓库根目录执行以下命令，示例目标项目为同级目录 `../my-app`：

```powershell
node scripts/install-project-skills.mjs ../my-app --stack flutter --dry-run
node scripts/install-project-skills.mjs ../my-app --stack flutter

# 使用同一入口，从指定远端按栈获取
node scripts/install-project-skills.mjs ../my-app --repo OWNER/app-creator-skills --stack flutter
```

分发到目标 `.agents/skills/`，包含公共技能、所选栈的专业入口、领域资源、公共能力库和共享依赖声明。所需公共实现一并安装，运行不依赖五个源仓库，不修改项目源码或全局技能。后续可追加其他栈，已有栈和无关技能保留。

运行需要 Sharp、YAML 或 JSON Schema 的专业 Node 工具前，在目标项目根目录安装一次共享依赖：

```powershell
npm ci --prefix .agents/skills/app-skill-runtime
```

本地模式只复制文件；显式指定 `--repo` 时才联网下载。安装器不执行远端技能脚本、不自动安装 npm 依赖。脚本通过随安装分发的共享桥接加载依赖。FFmpeg、Unity/Creator、FVM/Flutter、Spine、Blender MCP 等能力按专业技能检查；脚本存在不代表外部程序已经运行。更新共享运行时会保留现有 `node_modules`；依赖清单变动后按上述命令重新安装依赖。

同名目录内容完全相同时跳过，追加栈无需重复替换公共目录；内容不同或含本地新增文件时默认停止。检查后用 `--replace` 更新，旧目录保存在 `.agents/skills-backups/<事务ID>/original/`。更新公共组件可能影响已安装的其他栈，应按影响范围验证。安装使用排他锁，失败恢复原目录；若异常留下 `.agents/app-creator-install.lock`，确认进程已结束再人工清理，不自动猜测失效。

已有项目应清点、备份并停用旧公共总控入口，避免两套总控同时发现。安装器不擅自删除清单外旧技能，不把旧确认改成新授权。部分资源目录沿用原编排名以保留工具路径，但没有根 SKILL.md，不构成另一全局入口。

## 使用与素材质量

按任务规模选择同一控制器中的编排方式：

| 任务 | 编排 |
| --- | --- |
| 查询、纯文案或注释 | 直接完成并检查差异，通常不建立完整工作项 |
| 一个本地模块修复 | `init --mode light --type MODULE`，直接进入实施前复核；保留F0–F3和真实工程证据 |
| 普通功能、视觉或跨模块任务 | 默认普通流程，按受影响阶段推进 |
| 发布检查或候选打包 | `init --type RELEASE`，默认 `prepare`，准备证据齐备后正常收尾 |
| 实际发布 | 显式 `init --type RELEASE --release-intent publish`，保留精确授权与实际发布结果 |

`plan --spec` 根据实际计划自动生成并关联实施包、单元路径及空证据清单；`record --report` 根据真实命令、退出码和原始输出关联执行结果。两者不执行项目命令，不自动通过F3/F4，也不代替 `unit-check`。模板与参数见[控制器](skills/app-workflow-control/SKILL.md)。

视觉增量可用 `reuse-visual` 从同项目、技术栈和对象的已完成工作项继承未变化的基线及V1/V2确认。布局变化重新确认布局，目标变化重新确认目标；当前V3导入、V4运行和人工验收仍独立完成，原始确认记录保持不变。具体规则见[任务分流与视觉复用](skills/app-creator-workflow/references/workflow.md)。

```text
使用 $app-creator-workflow 完成需求，按技术栈索引读取对应专业技能。
```

控制器 `init` 只创建记录；缺少门禁或证据时 `check` 阻断属于预期。`status/check` 只读，`run` 只推进控制状态，不执行实际制作、构建、引擎、设备或发布。具体命令见[控制器](skills/app-workflow-control/SKILL.md)。真机、签名、上传、付费和发布仍需对应明确授权。

“去 AI 味”流程明确视觉签名和预算，先做代表样本再扩展系列，分离原生 UI 与位图，检查结构、材质、边缘和一致性，再在实际场景中验收。具体制作使用完整的视觉、贴图、骨骼、动画、Spine、图集和图片优化技能，不用概述代替工具。

截图默认由用户人工检查；只有用户明确要求自动视觉验证时代理才分析。生成成功、Alpha 合格或工程 PASS 不替代显示验收，也没有自动保证质量的“AI 味分数”。

## 维护与验证

```powershell
npm ci
npm test
npm run test:flutter-layout
npm run check
npm run check:migration
npm run check:migration -- --source-root ..
npm pack --dry-run
```

上述维护命令在本技能仓库根目录执行。`--source-root ..` 适用于五个源仓库与本仓库位于同一父目录的布局；其他布局请传入源仓库父目录相对于当前目录的路径。

迁移校验逐文件检查缺失、改写和完整性；指定 source-root 后重读五源 Git NUL 清单及字节，防止清单自身漏项。共用能力还核对公共真源、真实导入、薄适配、完整规则段落及技术栈来源。断依赖、漏专业能力、漏模板、只登记共享却仍复制实现或用概述代替规则均应失败。

源仓库是只读输入。迁移脚本在 scripts/migration/；源更新后重新迁移、生成索引并验证。脚本不得覆盖与上一份清单不一致的本地手改。专业源包声明和锁文件保留以供审计。

[整合设计](docs/integration-design.md)、[来源与去向](docs/provenance.md)和[验证记录](docs/verification.md)说明边界。文件校验不能证明用户身份、外部回执真实性、引擎运行或人工视觉验收。
