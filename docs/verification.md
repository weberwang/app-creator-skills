# 整合验证记录

日期：2026-10-27。执行环境：Windows、PowerShell 7、Node.js v24.20.0。

## 审阅产物按需生成的 T3 验证

普通审查直接输出报告；静态布局默认输出 PNG、节点、决策和生成记录。三栈布局生成器仅在传入 `--interactive-review` 时生成交互审阅页，帧动画图集仅在指定 `--output-preview` 时生成播放页。三栈的模板、Schema、原生文件门、共享规范及安装资源均已同步；提供网页时仍校验实际文件、内容和关联身份。静态布局确认仍从已确认 proposal 和决策重算节点，并与 PNG 中的实际几何核对。

本次修改涉及多个生成器、校验器、来源迁移与安装交付，推荐并执行 T3，结果如下。

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 最终全量测试 | `node --test --test-concurrency=2` | 3015 项：3008 通过、0 失败、7 项既有跳过、0 取消 |
| 按需生成与原生文件门 | 定向运行三栈真实生成器、动画图集、布局确认及资料路由 | 148/148 通过；包含默认无 HTML、显式网页、缺失或错配网页、节点篡改及真实 PNG 打包 |
| 五栈安装与路由复验 | `node --test --test-concurrency=1 tests/capability-entry-integrity.test.mjs tests/consolidation-delivery.test.mjs` | 9/9 通过 |
| 仓库检查 | `npm run check` | 通过：30 个根技能、1903 个维护文件，0 错误 |
| npx 打包预检 | `npm pack ./packages/cli --dry-run --json` | 通过：4 个文件、10991 字节，未发布 |
| 独立只读审查 | 原生重算、可选网页绑定、动画预览和来源正文 | 修复审查与回归发现后，无剩余本次改动的实质 P1/P2；Three.js 默认 PNG 及网页声明反例独立通过 |
| 五源核验 | `node scripts/verify-migration.mjs --source-root ..` | 本次迁移生成后曾通过；最终工作区检查有 6 个 Unity 来源/目标差异尚未登记变换，详见下文 |

首轮全量测试暴露旧测试仍期待默认 HTML，以及 Three.js 原生布局派生被误用的问题；已恢复本栈派生、更新旧测试并复验。另修复测试子进程继承 `NODE_TEST_CONTEXT` 时可能未实际执行用例的问题。另一项工作同时修改了同一仓库及迁移账本，造成一次安装摘要测试失败；等待账本稳定后，五栈安装复验及最终全量测试均通过。

最终五源核验仍发现另一项工作中 6 份 Unity 文件的目标内容与来源不同、账本未登记变换：`TmpFontAtlasGenerator.cs`、`TmpFontAtlasPlan.cs`、`LocalizedTmpFontBinder.cs`、`tmp-font-atlas-workflow.md`、`control-model.md` 和 `work-item.schema.json`。这些变更予以保留，没有为消除错误而覆盖文件或虚构来源变换；因此不能将当前整个仓库的五源核验报告为通过。

7 项既有跳过为 6 项已被公共控制器回归替代的旧全局控制器用例，以及 1 项 Windows 不保证的 POSIX/Git 执行位语义。未启动真实引擎、开发服务或真机，未自动分析截图或执行视觉验收，也未发布或修改外部系统。以下保留前轮验证记录。

## 历史：UI 相对布局模板与校验器的 T3 验证

本次将相对布局规则接入五栈实际模板、原生校验入口和安装闭包。公共检查模块只维护一份，技术栈适配器从正式节点提取实际父级、定位参照与浮层身份，不另外维护脱离原生工件的关系图。Unity 新增完整浮层计划模板；三栈普通布局模板补齐真实父链；Flutter 两阶段模板绑定真实 region、Key、参照及实现信号。迁移变换与文件账本同步更新，五个源仓库保持只读。

只有合法的弹窗、浮窗和 Toast 本体可独立定位；普通 UI、伪造本体、重复嵌套本体、内部后代独立定位、内部参照逃出本体、缺失或成环的关系均被拒绝。Unity 与 Web 三栈的运行采样继续核验浮层内部中心及边缘间距，包含多级后代随动和参照缩放。Flutter 的关系表达式采用受限算术语法，拒绝外部节点、索引与不支持的语法，不能靠声明相对定位绕过实际关系检查。公共参考中旧的普通 UI 绝对定位许可同步移除。

本次跨越模板、Schema、静态和运行证据校验、迁移及安装交付，推荐并执行 T3；覆盖范围及实际结果如下。

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 最终全量回归 | `node --test --test-concurrency=2` | 2981 项：2974 通过、0 失败、7 项既有跳过、0 取消 |
| 新增定向回归 | `node --test --test-concurrency=4 tests/relative-layout-policy.test.mjs tests/flutter-relative-layout.test.mjs tests/unity-relative-layout.test.mjs tests/web-relative-layout.test.mjs tests/relative-layout-delivery.test.mjs` | 36/36 通过；覆盖五栈正反例、运行采样和五栈独立安装后的真实校验入口 |
| 仓库检查 | `npm run check` | 通过：30 个根技能、1888 个维护文件，0 错误 |
| 确定性迁移与索引 | `node scripts/migration/migrate-specialists.mjs --source-root ..`、`node scripts/generate-specialist-index.mjs` | 通过；新模板及原生变换已进入迁移账本与安装清单 |
| 最终真实源核验 | `node scripts/verify-migration.mjs --source-root ..` | 通过：1608 个来源文件、91 个正式来源入口、1 个嵌套模板，0 错误、0 警告 |
| Flutter 原有夹具 | `npm run test:flutter-layout` | 48/48 通过，保持原有正例与预期拒绝的负例 |
| npx 打包预检 | `npm pack ./packages/cli --dry-run --json` | 通过；4 个文件、10991 字节、无捆绑依赖，未发布 |
| 独立只读审查 | 核对实际校验入口、浮层身份、运行随动和表达式逃逸 | 发现的两项 P2 已修复并复验，最终无剩余实质 P1/P2 |

首轮回归发现迁移测试夹具遗漏新增作者模板，已改为从正式生成资源清单构造夹具。Web 测试副本曾在仓库内干扰引用扫描，现改在系统临时目录创建独占副本，未放宽仓库扫描规则。一次视频测试的子 Node 进程启动失败，隔离复验与相关迁移测试共 8/8 通过；随后降低全量并发，最终全部回归通过，未新增跳过。7 项既有跳过仍为 6 项已被公共控制器回归替代的旧全局控制器用例，以及 1 项 Windows 不保证的 POSIX/Git 执行位语义。

未启动真实引擎、开发服务或真机，未执行截图分析或视觉验收；运行证据测试使用合成采样，静态合同不能证明实际应用的 Widget、场景节点或显示效果均已验收。没有执行外部系统写入、签名、上传或发布。以下保留前轮规范与正文整合的历史验证记录。

## 历史：UI 相对布局规则的 T2 验证

本次将全部 UI 的相对布局与定位要求统一到[公共规则](../skills/app-ui-layout/references/relative-layout.md)：仅弹窗、浮窗和 Toast 本体允许独立落位，内部后代不继承例外。五栈原生模式、Flutter 草图、素材拆解入口均引用同一规则；Flutter 原有宽泛的叠层许可已收窄。保留父级约束求解后的运行坐标，以及 CSS absolute、Flutter Positioned 等原生实现方式。

推荐并执行 T2：重新迁移并生成五栈资料后，运行相对布局路由、专业路由、能力路由、模式读取器、原生手册、交付安装、参考交付及引用刷新八组测试，共 50/50 通过、0 失败、0 跳过。`npm run check` 通过，检查 30 个根技能和 1874 个维护文件；`node scripts/verify-migration.mjs --source-root ..` 核对 1608 个源文件，0 错误、0 警告。差异空白检查通过，独立只读审查没有剩余实质问题。

测试发现并修复了旧路由断言与新增公共引用不一致，以及新测试对相邻 Flutter 仓库的硬依赖；后者改为自含夹具，没有新增跳过。当前更新约束规范和读取链，未新增浮层本体识别字段，不能声称现有静态校验器已自动证明全部运行关系。未启动引擎、开发服务或真机，未做视觉验收。本次没有重跑全量测试；以下保留前轮公共正文整合的 T3 记录。

## 验证范围

本轮继续收敛五栈专业参考、编排、拷问和领域视觉合同。新增 52 个公共正文主题，公共真源合计 114 项，其中正文 84 项；仍为 30 个根技能、5 份原生手册、77 个源专业模式、80 个唯一模式及 82 条路由。完整对应见[公共能力清单](shared-capabilities.md)、[迁移清单](../migration/catalog.json)和[文件账本](../migration/files.json)。

已移除 10 份纯导航参考，来源元数据共归档 87 份；清理无 CommonJS 脚本的作用域目录并复用已有公共图片工具。公共段落、原生补充、完整围栏和表格都按来源区间与摘要核对；脚本、模板、校验器、夹具及 Flutter 嵌套模板继续交付。旧控制入口的全局状态、pending 批准和执行器说明已改为引用当前公共协议。

按跨模块影响推荐并执行 T3，覆盖公共生成、来源追溯、五栈安装、远程增量引导、专业工具、控制器与分发内容。没有要求人工选择普通测试等级。

## 实际结果

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 全量测试 | `npm test` | 2941 项：2934 通过、0 失败、7 项既有跳过、0 取消 |
| 仓库检查 | `npm run check` | 通过：30 个根技能、1871 个维护文件；语法、JSON、引用、路由与代码规模检查通过 |
| 确定性迁移与索引 | `node scripts/migration/migrate-specialists.mjs --source-root ..`、`npm run index:skills` | 通过；1608 个跟踪文件、91 个正式来源入口、77 个源专业模式及 1 个嵌套模板有完整去向 |
| 最终真实源核验 | `node scripts/verify-migration.mjs --source-root ..` | 通过，0 错误、0 警告；114 项公共能力及完整来源清单核对成功 |
| 最终交付定向复验 | `node --test tests/shared-domain-references.test.mjs tests/reference-redirects.test.mjs tests/consolidation-delivery.test.mjs migration/source-tests/unity/tests/node/spine-reskin-skill.test.mjs` | 21/21 通过；包含五栈独立临时安装、资源闭包、旧导航清理、来源防伪和真实公共元数据 |
| 远程引导及轻量 CLI | `node --test tests/remote-bootstrap.test.mjs tests/npx-package.test.mjs tests/npx-cli.test.mjs` | 16/16 通过；11 个引导文件构成实际依赖闭包，支持所选栈与追加安装 |
| Flutter 布局夹具 | `npm run test:flutter-layout` | 48/48 通过；包括正例与预期拒绝的负例 |
| 正文审计 | `npm run audit:bodies`、`npm run audit:references` | 原生手册待审项为 0；305 份参考的 38 组字面重复已逐条复核，见[正文审计](skill-body-audit.md) |
| npx 打包预检 | `npm pack ./packages/cli --dry-run --json` | 通过；轻量包 4 个文件、10991 字节、无捆绑依赖，未发布 |
| 目录、路径与差异 | 目录扫描、README 路径检查、`git -c core.whitespace=cr-at-eol diff --check` | 无空目录、无仅剩 agents 的目录；README 无绝对路径；差异检查通过 |
| 独立只读审查 | 专业内容、旧控制协议、来源重定向、写入保护与最终 38 组候选逐项复核 | 发现的问题已修复；最终没有剩余实质 P1/P2 |

全量测试后仅清理空章节和文档尾部空行。重新生成后逐份比较 15 份领域参考，确认变化只涉及该排版清理；随后执行上述最终源核验、21 项交付复验和差异检查。迁移主文件降至 964 行，CommonJS 作用域规划拆入单一模块。

## 修复与限制

测试期间发现并修复了远程引导缺少新主题清单依赖、旧元数据断言误读归档、导航合并的自链接断言和生成目标碰撞判定。没有通过新增跳过隐藏失败。7 项既有跳过包括：三栈共 6 项旧全局控制器用例，由当前公共控制器回归覆盖；1 项因 Windows 不保证 POSIX/Git 执行位语义。

剩余字面重复主要是公共规范导航、退役边界、本栈 Schema 绑定和领域枚举说明；不以分类标签替代逐条审查，也不把字面重复数描述为零。专业 Schema、接口、资源导入及引擎差异继续独立维护。

本轮没有启动开发服务、真实引擎或真机，没有执行视觉验收、外部系统写入、签名、上传或发布。临时安装与模拟 GitHub 响应只验证工具行为，不代表真实设备、显示效果或线上发布验收。五个源仓库与用户项目保持只读。
