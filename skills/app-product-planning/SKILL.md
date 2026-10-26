---
name: app-product-planning
description: "为新游戏或应用制定产品范围，或为既有 GDD 与功能编写有边界的增量策划和验收条件。"
---

# 产品与游戏需求

先区分新产品探索、既有产品/GDD增量策划和用户明确要求的市场验证，再形成匹配范围的设计与验收。尊重已确认的设计事实，不默认把普通策划变成MVP商业实验。

执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。

## 输入

- 用户目标与任务范围；现有GDD、设计基准、实现状态和已作出的产品决定；证据或明确标出的假设；平台和团队约束。只有任务包含市场验证时再提供目标人群假设、渠道和实验限制。

## 共用操作步骤

1. 判断工作模式：新产品定义读取目标用户与问题；既有产品策划读取GDD/规则和当前任务，只打开相关章节；明确的市场验证任务额外识别待验证的市场假设。
2. 按[策划范围与验收约定](../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)区分已确认事实、证据、假设和未决事项；记录本次变化的用户目标与触发场景，不改写既有已确认设计。
3. 为目标变化写出可观察结果。仅在相关时描述应用关键任务流或游戏核心循环，不为局部功能增量重写无关产品循环。
4. 按[策划范围与验收约定](../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)整理新产品必要能力与不做项，或既有策划中受影响的规则、内容、状态、依赖和回归条件。
5. 为范围设置可观察验收条件、依赖与回归点，并按[公共策划约定](../app-creator-workflow/references/professional-conventions.md#planning-scope-and-acceptance)区分建议和用户决定。只有任务包含市场验证时，才设计样本、原型/人工服务实验、观察指标和停止条件。
6. 提交新产品简报或既有GDD的差异更新，保留对应工件结构，列出未决决定、来源证据与可复现验收方式；避免把假设写成已批准需求。

## 关键边界

- 既有GDD或普通功能增量不默认改写为MVP，也不自动提出商业验证实验；只有用户把市场/商业假设验证纳入范围时才设计样本和实验。
- 无证据的市场、转化和技术判断标为假设；影响范围或成本的未决取舍通过 grilling 澄清。游戏数值、具体实现和技术架构由对应能力深化。

## 交付

- 新产品任务交付产品简报与首发范围；既有项目交付对应GDD/规则差异、受影响依赖和回归条件；市场验证任务另附实验设计与判定标准。

## 当前技术栈的原生流程

先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。
使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> app-product-planning [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。
若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。

