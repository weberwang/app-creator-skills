# Blender 场景生产接入

适用于已选用 Blender 的世界场景、场景模块和独立三维资产。Blender 内的任务分析、工序选取、装配、制作、检查和导出以随仓库交付的 [blender-director](../../blender-production-reference/blender-director/UPSTREAM.md) 及所选上游技能为主要实现。先读本页裁决，再读上游入口及当前工序引用的资料。上游提交及许可见[来源清单](../../blender-production-reference/upstream.json)和 [MIT 许可](../../blender-production-reference/LICENSE)。

## 已确认的执行规则

| 事项 | 执行规则 |
| --- | --- |
| 空间基线 | 正式引擎工程维护唯一的玩法空间基线。Blender 按需参考已验白模或建立试拼装配。通路、占地、镜头或接口需要改变时，回到原空间方案处理。 |
| 画面判断 | 代理按需要固定机位与照明、采集截图并说明检查项。参考对比、风格、材质显示和最终画面由用户人工检查，检查结果记入现有评审。 |
| 几何与颜色 | Blender 可用布尔、几何节点等辅助成形。正式可见模型及代表样本禁止程序切面和程序色块。导出前将开口、截面、厚度和连接落实到可编辑正式几何，颜色分区使用正式材质或贴图。清理临时切片、标识色和调试材质。 |
| 执行环境 | 先发现并复用健康的 Blender MCP 会话，以当前工具能力为准。MCP 或保存、导出、回读能力不可用时挂起受影响的生产，继续可独立进行的规格工作。实际执行按项目现有权限和输出路径。 |
| 模块接口 | 单位、轴向、Pivot、吸附点和容差以当前 V3 规格为准。上游的网格角原点、朝向和间距示例可用于新设计，导出前按目标栈约定核对坐标转换。 |

发现新的实质冲突时，在原工作项列出上游条款、本地约束、受影响的场景或阶段，以及可选方案及影响，交用户决定。挂起依赖该决定的工序，继续可独立进行的工作。上游文件按固定提交保留；本地决定写在本接入约定或已有工作记录中。

Unity 角色制作已确认采用上游规则。蒙皮网格在绑定前完成重拓扑，各 LOD 每顶点最多受 4 根骨骼影响，每个 Clip 的动作分配到 NLA 后单独导出。按共同角色基准在版本化导出副本上应用变换，并复验绑定与动画结果。Unity 路线对照本栈 `3d-character-handoff.md` 与 `3d-character-unity-import.md`，以及上游[动画](../../blender-production-reference/animation/UPSTREAM.md)、[绑定](../../blender-production-reference/rigging/UPSTREAM.md)和 [Unity 导出](../../blender-production-reference/unity-export/UPSTREAM.md)。

## 按区域生产并交接

1. **V0–V2 空间与方向。** 按[现有场景流程](game-design-exploration.md#scene-production-units)在正式引擎工程完成本批白模、功能验证、联合审查及空间和方向确认。在本批实施包给出区域与已实现邻区、玩家路径、角色尺度、目标镜头、交互边界及已确认方向。
2. **V3 制作简报。** 将上述依据交给 `blender-director`，按环境与模块工序选技能、确定 Blender 装配和可独立交付的单元。将最小模块集、代表组合、吸附与接缝、共享材质、预算及导出与消费者对应写入已有规格。已有参考按需复用，只补足会影响造型、连接或遮挡的视图和剖面。
3. **V4 代表组合先试接。** 以能暴露本批风险的最小组合为样本，例如门框与两侧墙板。样本在本批 Blender 装配中一起制作、试拼、回读和导出，再在目标引擎以实际尺度、镜头、通路及适用交互试接。沿用现有样本评审和 [`sampleRole`、`dependsOn`](../../app-workflow-control/references/implementation-execution.md#sample-dependencies) 约束，试接和适用评审通过后开放依赖批次。
4. **V4 在同一装配补齐本批。** 按可玩区域、连续路径或有明确接口的组团组织批次。在同一 Blender 装配中制作本批场景美术，核对墙、地面、设施和装饰的尺度、接缝与材质连续性。大型项目可链接分区源，在装配中保留邻区和共享模块引用。重复几何用实例，可动构件、碰撞代理、LOD 和需要独立加载或替换的资产保留交付边界；参考图按实际歧义使用。现有资源评审登记整批模型、版本、导入、消费者和专项检查。样本组合可以包含多个模型，沿用既有 `sampleRef` 的代表模型与实际试接场景记录组合证据。
5. **V5 正式引擎接入。** 由目标栈的正式场景写者消费已评审模型并替换宿主中的对应内容。按实际场景复验通行、碰撞、交互、镜头遮挡、适用的 LOD 与性能，以及最终显示。技术回读和用户人工显示结论沿用[原 V4/V5 证据链](../../app-workflow-control/references/world3d-scenes.md#model-asset-review)。

## 按工序读取上游技能

随工作流安装固定上游提交的全部 94 个技能及 175 份参考资料。每项 Blender 任务由 `blender-director` 根据资产用途、目标栈、风格和当前工序选读相关技能与依赖。下表列出常见场景入口，实际选择记录在现有任务包。引擎专项仅用于目标栈匹配的工作，原生接入与验收沿用项目约定。

| 当前工序 | 主要实现入口 |
| --- | --- |
| 制作规划、环境与装配 | [blender-director](../../blender-production-reference/blender-director/UPSTREAM.md)、[environment-artist](../../blender-production-reference/environment-artist/UPSTREAM.md)、[scene-assembly](../../blender-production-reference/scene-assembly/UPSTREAM.md)。已有场景先审计活动会话、对象及 Collection；按用途分组并优先复用已有几何。 |
| 几何与布景 | [blender-modeler](../../blender-production-reference/blender-modeler/UPSTREAM.md)、[hard-surface](../../blender-production-reference/hard-surface/UPSTREAM.md)、[set-dressing](../../blender-production-reference/set-dressing/UPSTREAM.md)。按真实任务加载道具、植被或辅助成形技能。先核对剪影和模块关系，再细化倒角、法线与布景。 |
| UV、贴图和展示 | [uv-workflow](../../blender-production-reference/uv-workflow/UPSTREAM.md)、[materials](../../blender-production-reference/materials/UPSTREAM.md)、[texture-workflow](../../blender-production-reference/texture-workflow/UPSTREAM.md)、[lookdev](../../blender-production-reference/lookdev/UPSTREAM.md)。灯光、相机、渲染和风格按需选择。贴图写入版本化派生源，位图制作遵循宿主图片技能和委派规则。 |
| 角色与可动构件 | 按需要选择 [character-artist](../../blender-production-reference/character-artist/UPSTREAM.md)、[creature-artist](../../blender-production-reference/creature-artist/UPSTREAM.md)、[rigging](../../blender-production-reference/rigging/UPSTREAM.md) 或 [animation](../../blender-production-reference/animation/UPSTREAM.md)。雕刻、重拓扑、毛发和布料按任务依赖读取，沿用原有资产交接。 |
| 动态表现与场景方向 | 从 [vfx-fx](../../blender-production-reference/vfx-fx/UPSTREAM.md)、[physics-sim](../../blender-production-reference/physics-sim/UPSTREAM.md)、[compositing](../../blender-production-reference/compositing/UPSTREAM.md) 及完整索引中按需选择。风格、世界主题、氛围和玩法类型用于指导 Blender 制作，场景功能在正式引擎中验收。 |
| 优化、导出和检查 | [asset-optimization](../../blender-production-reference/asset-optimization/UPSTREAM.md)、[export-pipeline](../../blender-production-reference/export-pipeline/UPSTREAM.md)、[qa-review](../../blender-production-reference/qa-review/UPSTREAM.md)。碰撞代理及 LOD 按当前栈、镜头和预算启用，格式、导出参数、引擎回读与验收时机以原生适配为准。 |

上游将入口称为 `SKILL.md`。本仓库以 `<技能名>/UPSTREAM.md` 随工作流安装。遇到上游对其他技能的 `SKILL.md` 相对引用，沿原相对目录读取 `UPSTREAM.md`，共享及专属 `references/` 沿用原路径。完整技能与逐文件来源见[上游索引](../../blender-production-reference/upstream.json)。所选入口或当前工序所需引用缺失时，报告缺失文件及受影响步骤。任务包沿用有效的规格、样本和审批记录。
