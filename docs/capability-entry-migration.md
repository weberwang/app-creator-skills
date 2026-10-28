# 按能力组织技能入口

## 当前结构

根技能入口从86个收敛为30个：21个领域能力、4个公共流程和5个技术栈规范。原77个专业模式加3个新增模式集中到五份原生技术手册；原专业目录不再保留SKILL.md或ADAPTER.md别名，只有必要的脚本、模板、校验器、夹具和资源继续分发。

例如，音频只通过 `$app-audio` 进入；Unity读取 `app-stack-unity/references/native-contracts.md#mode-unity-game-audio`，Phaser读取对应的Phaser手册章节。手册按能力组织，同栈多个模式共享一份物理文档；配套资源继续在原目录维护。

| 层级 | 内容 | 维护位置 |
| --- | --- | --- |
| 公共编排与状态 | 编排、控制、拷问、素材生产 | 4个公共流程SKILL |
| 领域能力 | 音频、数值、动画、绑定、几何、贴图、玩法、UI、质量、发布等 | 21个能力SKILL |
| 栈选择与规范 | 当前框架、平台、原生约束及证据要求 | 5个app-stack入口及profile |
| 原生模式 | 77个源专业模式、3个新增模式；2条复用不重复正文 | 五份app-stack原生手册及必要工具资源目录 |
| 共用正文和实现 | 以[公共能力清单](shared-capabilities.md)登记的完整正文、算法、资源与模板为准 | app-domain-toolkit与公共素材工具 |

策划、架构、质量、发布、委派与审核的共用岗位规则统一维护在[专业岗位共用约定](../skills/app-creator-workflow/references/professional-conventions.md)。迁移器从17个源模式中提升37处已登记片段，原生章节只引用对应公共约定；源片段或公共章节变化时必须重新生成并校验，不维护两套正文。

## 实际路由

每个能力的 `native-adapters.json` 按栈列出 `sourceSkill`、`path`、`section`、`mode` 与 `when`。模式是章节选择，不是另一份适配文件。只读取当前栈所选章节；共享正文还需满足其 `stacks` 限定。单栈安装携带本栈手册，不安装其他栈的私有资源。

已安装的 [read-native-mode.mjs](../skills/app-skill-runtime/read-native-mode.mjs) 将这项约定落实为实际读取：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <能力名> [sourceSkill]`。多模式时必须选择来源；输出完整所选模式及直接公共参考，原生资源和进一步依赖按需列出，不默认加载其他模式。直接公共引用带锚点时仅输出对应章节；manifest的共享工作流只在适用栈包含当前栈时展开。`--json` 输出相同内容的结构化结果。

模式、标题锚点与公共跳转的解析集中在 [native-contracts.mjs](../skills/app-skill-runtime/native-contracts.mjs)。迁移汇总、维护文档刷新和运行时读取使用同一实现；索引刷新按手册缓存读取，避免对每个来源重复加载同一本文件。解析模块随共享运行时安装，不依赖源仓库、迁移账本或第三方npm包。

77份源规范有77个主能力归属和2条明确复用，另有3条仓库新增适配，总计82条路由：

- Unity UI通过布局能力复用视觉资源规范，再调用原生UI框架路由；视觉资源的主入口仍为素材工作流。
- Unity 2D动作生产通过动画能力复用2D角色规范；其骨架绑定主入口仍为角色绑定。2D TA只维护技术管线、工具和诊断，不获得Clip/Controller制作职责。
- 游戏与应用汁水设计共用 `$app-feedback`，覆盖全部五栈。Flutter新增反馈模式位于本栈手册，原始模板与章节贡献摘要单独登记为 `repository-authored`；不计入77个源模式或91个源入口。完整共用设计见[交互反馈规范](../skills/app-feedback/references/interaction-feedback.md)。
- 项目整理与清理共用 `$app-artifact-cleanup`，覆盖全部五栈。保留原三栈专业适配，Unity/Flutter 补充本仓库新增的原生约束；整理、重命名、引用判定及清理流程统一维护在[公共整理规范](../skills/app-artifact-cleanup/references/project-cleanup.md)。
- `$app-release` 为五栈共用的发布入口，[发布检查规范](../skills/app-release/references/release-readiness.md)统一维护第三方参数与正式环境核对，以及性能检查、优化和图集打包提醒；构建、渠道、签名与框架约束仍由原生规范负责。

Flutter的质量审核与UX/UI审核、高保真目标图与bitmap拆解、实施计划与委派交付，在同一本原生手册中保留不同模式及完整顺序。Unity2D/3D骨架和动画同样按模式区分，不能因合并物理文件而互换格式或权限。

Three.js插件能力使用 `$app-runtime-plugins`，维护物理、碰撞查询、导航、模型解码及后处理扩展；不把它变成认证、支付或云服务工作流。基础工程能力同时区分新工程与既有运行时迭代，排查固定步、输入或资源泄漏不要求重建脚手架。

图片优化继承三个源技能原有的显式触发策略，公共入口的隐式调用保持关闭；默认保持格式、尺寸、方向和文件名，不因构建或发布自动改写资源。入口合并不能放宽原有触发范围和写入边界。

## 迁移与维护

唯一分组声明为 [capability-map.mjs](../scripts/capability-map.mjs)。公共领域步骤和模式定义见 [capability-content.mjs](../scripts/capability-content.mjs)，由生成器写入统一SKILL、UI元数据和manifest。

五源的91个正式入口仍全部列在迁移清单：原公共流程映射公共控制/编排/拷问；原77个专业入口同时登记公共目标、手册及对应章节。每源保留真实sourceSha256、整本destinationSha256和独立nativeSection贡献摘要；共享物理文件不等于共享来源身份。新增模板模式单独记录来源，脚本依赖逐文件核对。嵌套 `flutter-dev/SKILL.md` 作为项目生成模板保留，不计入当前根入口。

源更新后执行：

```powershell
node scripts/migration/migrate-specialists.mjs --source-root E:/Git
npm run index:skills
npm run check:migration -- --source-root E:/Git
npm test
npm run check
```

`index:skills` 同时重建能力入口、模式清单、五栈索引和当前仓库自有文档的调用路径。原生载荷通过迁移器从源变换再生，维护索引不会越过其摘要保护直接改写产物。

## 验证边界

入口检查要求30个准确的根技能、5份原生手册、80个唯一模式和82条合法路由，并拒绝旧专业SKILL/ADAPTER别名、错误归属、缺失章节及未声明复用。分发测试比较完整资源子树和字节，继续执行原有专业工具；单栈检查要求其实际选中模式及Markdown依赖闭包完整。来源保留检查分别核对77个源专业模式和3个仓库新增模式，不以同一本手册的其他章节代替。

已核对的专业能力和资源不因合并删除。真实引擎运行、设备、生成素材视觉效果与发布仍分别需要相应工具证据和授权，不能由入口检查代替。实际结果见[验证记录](verification.md)，逐项对应见[源技能迁移清单](skill-migration.md)。
