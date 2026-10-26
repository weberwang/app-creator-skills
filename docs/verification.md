# 整合验证记录

日期：2026-10-26。执行环境：Windows、PowerShell 7、Node.js v24.20.0；运行时最低要求为 Node.js 22.20。

## 任务分流、记录生成与视觉复用的 T3 验证

本轮在原有公共控制器内落实四项工作流优化：轻量工程任务直接进入实施前复核；发布准备与实际发布分别收尾；从实际计划/报告自动生成关联记录；从完整完成的同项目、技术栈和对象来源继承未变化的基线及V1/V2确认。保留同一状态机、30个根技能及80个专业模式，五份原生手册与修改前逐字节一致。

轻量模式仍要求F0–F3、单个独立单元及原生工程证据，拒绝视觉、发布、集成及受保护动作。`plan`只转录有理由的显式F0/F1/F2自评并收窄路径，`record`只关联真实退出码、非空输出与证据；二者不执行命令、不自动通过F3/F4，后续仍走 `unit-check`。发布准备默认 `prepare`，只有真实独立准备材料齐备后才完成；`publish`仍要求F4、精确批准与实际发布结果。视觉复用不复制V3/V4、工程证据或旧执行状态，源工作项必须通过完整执行闭环检查。

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 全仓自动测试 | `npm test` | 2851项：2844 PASS、0 FAIL、7既有SKIP，无取消 |
| 控制器定向回归 | `node --test --test-concurrency=4 tests/control/*.test.mjs` | 70/70 PASS；覆盖轻量CLI闭环、准备/发布、计划与记录、视觉复用、RETURN恢复及并行批次 |
| 静态校验 | `npm run check` | PASS：30根技能、1770维护文件；脚本语法、JSON、引用、代码规模与路由一致 |
| 真实源完整性 | 真实迁移及 `node scripts/verify-migration.mjs --source-root ..` | PASS，1608源文件、91正式源入口及1嵌套模板完整，无错误或警告；公共CLI替代记录及新增运行时依赖登记已刷新 |
| 手册与专业保留 | 比较当前五份原生手册与本轮修改前Git版本的原始字节 | 5/5完全一致；80唯一模式、82路由及37处规则提升保持 |
| 五栈实际安装冒烟 | 各自在独占临时项目安装后，从项目外运行已安装CLI的lint、轻量init和RELEASE init | 5/5 PASS；每个安装闭包均有12份schema与12份模板，默认准备意图正确；无需引擎或额外npm依赖 |
| 技能格式 | 官方 `skill-creator/scripts/quick_validate.py` 检查30根技能及嵌套模板 | 31/31 PASS |
| 分发预检 | `npm pack --dry-run --json --silent` | 1767分发文件；5个新增运行时模块、3组schema/模板完整，0旧ADAPTER |
| 正文与差异 | `npm run audit:bodies`、`git diff --check`及README路径检查 | reviewNeeded为0；差异检查通过，README继续只使用相对文件路径 |
| 独立只读审查 | 检查事实绑定、事务、材料自证、来源完成结构及恢复路径 | 发现的5项P2均已修复并复核，无剩余实质问题 |

审查发现并补齐了：历史实施包阻止RETURN/阶段切换后的新计划、失败事务留下空证据根导致无法重试、manifest并发更新可能丢失、控制记录冒充准备材料，以及来源声明完成但执行状态未闭合仍可复用。对应回归均已加入，最终全量没有失败项。机器记录生成依赖文件系统支持硬链接；不支持时会拒绝写入，不降级为覆盖既有文件。

本轮测试使用隔离项目、实际本地Node命令及明确标记的合成领域/人审材料，验证协议与工具行为，不代表真实Flutter分析、引擎运行或用户视觉验收。未启动开发服务、引擎、应用或真机，未执行签名、产品上传、付费、实际产品发布或npm发布。五个源仓库保持只读，Phaser原有未跟踪 `examples/` 保留。以下保留此前验证历史。

## GitHub私有源配置的 T1 验证

已将默认来源配置为用户指定的私有仓库 `weberwang/app-creator-skills`，README同步说明私有仓库所需的Contents只读权限；npx包尚未发布。本轮仅调整来源配置、说明及Git行尾属性，执行T1：`node --test tests/npx-cli.test.mjs tests/npx-package.test.mjs` 14/14 PASS；`npm run --prefix packages/cli prepublishOnly` 配置校验PASS，未执行npm publish。

迁移账本依赖原始文件字节，新增 `.gitattributes` 的 `* -text` 禁止Git自动转换行尾。首次提交准备阶段的1754个暂存文件全部与工作区原始字节一致；node_modules、Artifacts、生成引导副本和打包缓存未纳入提交。此前完整T3结果保留如下。

## 按模式读取与统一解析的 T3 验证

本轮执行按模式加载和解析器统一两项优化，日常维护真源策略保持原样。共用运行时新增只读的 `read-native-mode.mjs`，按技术栈、公共能力及可选来源模式选择一章；展开所选模式及其直接公共依赖，附属资源、其他模式和公共资料的进一步依赖只列路径。多模式不猜测，不执行所列脚本，不增加技能入口或重新拆分五份手册。

章节提取、标题锚点、公共片段、代码与注释边界及来源重定向集中在 `native-contracts.mjs`，供读取器、迁移渲染和维护文档刷新复用。刷新索引时每本手册只读一次；原生和公共资料先核对当前栈及路径归属，再读取正文。纯解析模块随共享运行时分发，远程引导清单由7文件增至8文件，轻量npx包仍是4文件、零依赖。

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 全仓自动测试 | `npm test` | 2807项：2800 PASS、0 FAIL、7既有SKIP，无取消 |
| 模式读取、解析与分发定向验证 | `node --test --test-concurrency=4 tests/native-mode-reader.test.mjs tests/native-contracts.test.mjs tests/refresh-capability-links.test.mjs tests/native-manual-migration.test.mjs tests/remote-bootstrap.test.mjs` | 27/27 PASS；涵盖全部82条实际路由、模式歧义、公共片段、非递归依赖、路径/Junction、模拟远程增量安装 |
| 仓库静态检查 | `npm run check` | PASS：30根技能、1754维护文件；语法、JSON、链接、代码规模与路由一致 |
| 真实源迁移与完整性 | `node scripts/migration/migrate-specialists.mjs --source-root E:/Git`、`node scripts/verify-migration.mjs --source-root E:/Git` | PASS；1608源文件、91正式源入口及1嵌套模板完整，无错误或警告；最终解析器重新迁移后，5手册SHA-256与优化前完全一致 |
| 已安装读取器 | 临时项目仅安装Flutter，再从项目外运行已安装读取CLI | PASS；无需维护仓库scripts、迁移账本或node_modules，实际返回反馈模式及公共规范；双质量模式未选择来源时明确失败 |
| npx与引导关联回归 | `node --test tests/remote-bootstrap.test.mjs tests/npx-package.test.mjs tests/npx-cli.test.mjs` | 16/16 PASS；第8个引导依赖实际下载并可导入，选栈、缓存与增量边界保持 |
| 官方技能格式 | `skill-creator/scripts/quick_validate.py` 检查30根入口及嵌套生成模板 | 31/31 PASS |
| 正文复查 | `npm run audit:bodies` | reviewNeeded为0，仍为77个源模式及5组受控生成/原生命令文本 |
| 分发预检 | 根包dry-run与实际轻量包打包 | 根包1752文件，读取器和纯解析模块均存在、0旧ADAPTER；轻量包4文件、10938字节、零依赖 |
| 独立只读审查 | 选择、解析、依赖边界、路径安全与引导闭包 | 无剩余实质问题；多行HTML注释、相邻章节锚点及围栏内语言标记的P2均已修复并加入回归 |

只读输出的代表性字符数如下，包含所选原生正文、直接公共规则、标题和资源路径，不代表所有能力都具有相同比例：

| 选择 | 原手册字符数 | 实际输出字符数 |
| --- | ---: | ---: |
| Unity音频 | 54233 | 2635 |
| Flutter应用反馈 | 34938 | 13568 |
| Flutter质量审核 | 34938 | 2645 |

本轮新增代码的函数及复杂逻辑补充了中文注释，主迁移器仍为999行。五源保持只读，Phaser原有未跟踪 `examples/` 保留。没有修改用户项目或全局技能，未启动真实引擎、应用、开发服务或真机，未做视觉验收、线上安装、签名或发布；远程用例均使用模拟GitHub响应。npx默认地址继续留空，未发布npm包。以下保留前轮验证历史。

## 原生手册收敛的 T3 验证

本轮推荐并执行T3：改动覆盖五源迁移、公共规则提升、来源摘要、能力路由、原生校验器及本地/远程安装，需验证跨模块依赖和实际分发。80个独立ADAPTER文件收敛为5份原生手册，保留77个源专业模式、3个仓库新增模式与2条复用，共82条路由；30个根入口保持不变。脚本、模板和校验器继续随所选技术栈分发。

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 全仓自动测试 | `npm test` | 2788项：2781 PASS、0 FAIL、7 SKIP，无取消 |
| 最后模板修正的定向复验 | `node --test --test-concurrency=4 tests/native-manual-migration.test.mjs tests/refresh-capability-links.test.mjs tests/professional-delivery.test.mjs tests/feedback-capability.test.mjs tests/remote-bootstrap.test.mjs` | 15/15 PASS；覆盖章节汇总、手改保护、旧链接、嵌套模板、本地专业工具及模拟远程增量安装 |
| 真实源逐文件核对 | `node scripts/verify-migration.mjs --source-root E:/Git` | PASS，0错误、0警告；1608源文件、91正式源入口、1嵌套模板完整 |
| 静态检查 | `npm run check` | PASS：30根技能、1750维护文件；JSON、引用、脚本语法、代码规模和路由通过；最后模板变换另经语法和定向复验 |
| 原生模式完整性 | catalog、逐文件账本、公共manifest及实际HTML锚点交叉核对 | 5手册、80唯一模式、82路由；源摘要、整本摘要、独立章节摘要及作者模板来源一致；拒绝缺失、重复或错放的模式锚点 |
| 公共规则及正文复查 | `npm run audit:bodies` 与独立只读审查 | 17个源模式的37处规则提升至公共专业约定；reviewNeeded为0，剩余5组仅为单点生成协议和原生命令示例 |
| Flutter布局 | `npm run test:flutter-layout` | 48/48 PASS |
| Flutter生成技能冒烟 | 独占临时项目单栈安装后，执行已安装的 `create_flutter_dev_skill.js --skills-dir .agents/skills` | PASS；生成技能读取本栈手册模式和真实布局参考文件，无旧ADAPTER路径；未启动Flutter或设备 |
| 官方技能格式 | `skill-creator/scripts/quick_validate.py` 检查30根技能及嵌套模板 | 31/31 PASS，最终调整的编排入口和模板再次校验通过 |
| 分发预检与轻量包 | `npm pack --dry-run --json --silent`、`npm pack ./packages/cli --json --silent --pack-destination <临时目录>` | 根包包含5手册、0旧ADAPTER；轻量包仍为4文件、10925字节、零依赖 |
| 独立只读审查 | 实际手册、公共规则、路径重基、摘要和安装闭包 | 无剩余实质问题；最终Flutter模板完整路径和账本摘要复核一致 |

首轮全量发现3项失败：两项来自Flutter维护文档的旧ADAPTER链接，一项来自远程测试仍把已移除的作者模式空目录列为安装目标。修正生成与重基逻辑、更新目录断言后，最终全量全部通过。另补齐了源文档链接和嵌套生成模板中的反引号路径；最终模板资源归属明确后，重生成并完成上述15项定向复验及实际安装生成冒烟，没有遗留失败项。

7项SKIP为此前6个退役旧控制CLI用例和Windows上的1个POSIX执行位用例；没有将新的专业失败改为跳过。检查了新增函数及复杂逻辑的中文注释，主迁移器保持999行。五源保持只读，Phaser原有未跟踪 `examples/` 未改动。

本轮未运行真实引擎、开发服务、应用或真机，未进行截图视觉验收、线上第三方参数核验、性能测量、图集重打、签名或发布。远程测试使用GitHub模拟响应，npx默认远程地址仍按用户要求留空，未发布npm包。下文保留此前各轮验证历史，其文件数与路由数不代表当前结构。

## 轻量 npx 的 T2 验证

轻量 npx 入口实际执行 T2。独立包位于 `packages/cli`，零依赖、单一 bin，日常命令为 `npx app-creator-skills flutter` 或逗号多栈，默认目标为当前目录；交互终端可选择技术栈，非交互环境不默认全装。默认远程地址按用户要求留空，等待后续填写；本次没有发布 npm 包。

| 检查 | 命令/方式 | 结果 |
| --- | --- | --- |
| npx 参数与包生成 | `node --test tests/npx-cli.test.mjs tests/npx-package.test.mjs` | 14/14 PASS；包含干净源码检出无generated时的实际帮助命令、TTY/非TTY、配置空值、链接防护和真源同步 |
| 既有安装关联回归 | 同时运行 `installer-cli`、`remote-installer`、`remote-bootstrap` 测试 | 19/19 PASS；合计33项相关Node用例，无失败或跳过 |
| 实际轻量打包 | `npm pack ./packages/cli --json --silent --pack-destination <独占临时目录>` | 4文件、10925字节：cli、默认配置、生成引导器和package.json；无技能载荷或npm依赖 |
| 真实npm命令转发 | 在独占临时cwd和npm cache中执行 `npm exec --offline --yes --ignore-scripts --package=<本地tgz> -- app-creator-skills --help` | PASS，使用tarball内新入口，未借用同名根源码bin |
| 最短命令实际安装 | 临时缓存内配置fixture默认仓库，通过标准GitHub模拟响应运行真实 `npx --offline --package=<本地tgz> app-creator-skills flutter` | 首装新增32项、重跑新增0且跳过32；只有Flutter及公共闭包，无Unity专业目录 |
| 未配置来源的发布检查 | `npm run --prefix packages/cli prepublishOnly` | 按预期在空repository时阻断；未执行npm publish |
| 仓库与迁移检查 | `npm run check`、`node scripts/verify-migration.mjs --source-root E:/Git` | PASS：30根技能、1815维护文件，1608源文件及91源入口完整；最终CLI调整另经语法和定向用例复验 |
| 独立只读审查 | 复核包边界、参数、相对导入、配置后补和实际npm入口 | 无未解决实质问题 |

引导器从根 `install.mjs` 单点生成，不另维护下载/事务算法。已修正prepack输出污染npm JSON的问题，并将引导器加载推迟到实际安装，帮助和纯参数测试不依赖残留构建产物。离线模拟首次缺少Git目录项，补齐标准树响应后重验通过。所有命名函数及复杂边界补充中文注释，新增文件未超过1000行。

真实npx验收只改独占临时缓存中的fixture配置；维护仓库的 `installer.config.json` 仍为空。远程请求全部模拟，未连接线上技能仓库、未测试真实npm registry安装或发布、未向真实用户项目或全局技能安装。默认地址补齐且轻量包正式发布后，README中的远程npx命令才可从npm直接使用。

### 远程按技术栈增量安装的 T2 记录

远程按技术栈增量安装实际执行 T2。新增独立 `install.mjs` 启动器，原安装 CLI 通过显式 `--repo` 接入同一远程实现；必须指定单栈、多栈或显式 `all`，不默认安装五栈。先解析固定提交及对应树，再按所选栈闭包获取文件；已有相同内容和可信缓存可复用，冲突、锁、备份及回滚仍由公共安装事务处理。

| 检查 | 命令/方式 | 结果 |
| --- | --- | --- |
| 安装、CLI、远程与单文件引导 | `node --test tests/installer.test.mjs tests/installer-cli.test.mjs tests/remote-installer.test.mjs tests/remote-bootstrap.test.mjs` | 30项：29 PASS、1 SKIP、0 FAIL；Windows上明确跳过POSIX执行位集成用例 |
| 关联能力与专业交付 | 安装回归同时执行 `capability-routing`、`cleanup-capability`、`feedback-capability`、`professional-delivery` 测试 | 13项 PASS，五栈闭包及已安装专业工具可执行 |
| 迁移完整性 | `node scripts/verify-migration.mjs --source-root E:/Git` | PASS，无错误或警告；1608源文件、91正式入口和1嵌套模板保留 |
| 仓库静态检查 | `npm run check` | PASS：30技能、1808维护文件；最终调整的安装模块另经 `node --check` 复验 |
| 分发预检 | `npm pack --dry-run --json --silent` | PASS：1806个分发文件，独立启动器及7个最小引导文件全部存在 |
| 独立只读审查 | 复核固定提交、Git blob、凭据隔离、缓存、路径、增量事务和模式变更 | 无未解决实质问题；POSIX权限差异已进入比较与replace回归 |

共43项相关测试，42 PASS、1 SKIP、0 FAIL。远程测试使用内存GitHub响应，独立引导测试下载并动态导入当前仓库的真实安装引擎副本；覆盖单栈选择、追加栈、热缓存和冷本地复用、预览、坏摘要、网络失败、非法路径/大小/目录、截断及树SHA不符、假令牌仅随API请求、二进制原字节校验和无目标写入。真实CLI曾暴露缺失 `fileURLToPath` 导入，已修复并复验；缓存边界、测试环境凭据隔离和POSIX仅执行位变化问题均已关闭。

未连接实际GitHub仓库或私库、未测试真实令牌和代理、未在Linux/macOS实测POSIX执行位；未向真实用户项目或全局技能安装、未安装新依赖、运行引擎/设备、创建分支、提交或发布。五源保持只读，Phaser原有未跟踪 `examples/` 保留。完整操作方式和私库启动边界见[安装说明](../README.md#在项目中安装)。

### 整理清理与发布检查的 T2 记录

项目整理清理与发布检查扩展后实际执行 T2。唯一 `app-artifact-cleanup` 入口覆盖五栈，新增 Unity/Flutter 原生约束；`app-release` 统一核对第三方有效参数和正式环境，在候选构建前提醒性能检查、优化及图集处理。保留30个根入口和77份源专业规范；当前77条主归属、2条复用、3条仓库新增适配，共82条路由。

| 检查 | 命令/方式 | 结果 |
| --- | --- | --- |
| 新能力安装、入口与迁移回归 | `node --test tests/cleanup-capability.test.mjs tests/feedback-capability.test.mjs tests/capability-entry-integrity.test.mjs tests/migration.test.mjs tests/capability-routing.test.mjs` | 41 PASS、0 FAIL、0 SKIP；Unity/Flutter实际单栈安装获得共用规范及本栈适配，无独立别名或跨栈适配 |
| 安装事务、生成保护与专业交付 | `node --test tests/migration-output-cleanup.test.mjs tests/installer.test.mjs tests/professional-delivery.test.mjs` | 14 PASS、0 FAIL、0 SKIP |
| 真实源迁移完整性 | `node scripts/verify-migration.mjs --source-root E:/Git` | PASS，无错误或警告；1608源文件、91正式入口和1嵌套模板保持完整 |
| 静态与声明检查 | `npm run check` | PASS：30个根技能、1802个维护文件；脚本语法、代码规模、JSON、链接和路由一致性通过 |
| 官方技能格式 | `skill-creator/scripts/quick_validate.py` 分别检查 `app-artifact-cleanup`、`app-release` | 2/2 PASS |
| 分发预检 | `npm pack --dry-run --json --silent` | PASS：1800个分发文件；两份公共规范、两份新增ADAPTER和源模板完整，无新SKILL别名 |
| 独立只读审查 | 核对最终入口、manifest、profile、模板、原生边界与发布流程 | 无未解决实质问题；可选提醒不形成构建审批门，冻结证据和活跃写入者受到保护 |

合计55项定向测试通过。首次完整性检查在索引更新前提示缺少新增路由；完成索引生成后复验通过。审查发现的可选提醒阻断构建、清理缺少活跃写入检查及表格列数问题均已修复；最终无失败项。检查了新增代码的中文注释，主迁移器仍为998行。

本轮没有执行实际项目整理删除、第三方线上参数核验、性能测量/优化、图集重打、引擎或应用运行、真机、视觉验收、签名、上传或发布。上述测试验证技能规则和分发结构，不代表某个产品已经正式就绪。五源保持只读，Phaser原有未跟踪 `examples/` 保留；未创建分支、worktree或提交。

此前游戏与应用汁水设计统一的 T2 记录见[公共汁水设计验证](shared-feedback-verification.md)，其中80条路由为新增两份清理适配前的统计。以下保留入口合并的 T3 历史记录，其中79条路由为新增Flutter反馈适配前的统计；本轮未重跑全量T3。

## 入口合并的 T3 结果

实际执行 T3。整合跨公共控制器、五栈专业能力、公共算法、模板、迁移器和安装器，执行全仓 Node 回归、真实源逐文件核对、安装冒烟、模板构建和分发验证。没有启动引擎、开发服务或设备，没有执行外部系统写入。

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 全仓自动测试 | `npm test` | 2725 项：2719 PASS、0 FAIL、6 SKIP，无取消 |
| 技能、引用、JSON、代码规模与脚本语法 | `npm run check` | PASS：30 个根技能、1790 个维护文件；旧专业 SKILL 别名全部清除 |
| 真实源迁移完整性 | `node scripts/verify-migration.mjs --source-root E:/Git` | PASS：1608 个源 Git 跟踪文件、91 个正式源入口及 1 个嵌套模板逐项核对，无错误或警告 |
| 公共抽取与适配闭包 | 同上，独立核对真实源内容、公共真源及适配依赖 | 35 项共享实现、104 个来源绑定；20 份完整工作流正文及539条源段落映射；专业引用与资源闭包完整 |
| 能力入口与模式 | registry、catalog、public manifest 和五栈安装计划交叉检查 | 21 个领域能力加4个公共流程、5个栈规范；77份原生规范、79条主/复用路由；单栈Markdown及所选模式闭包通过 |
| 旧安装目录升级 | 临时项目放入旧Unity音频SKILL，再执行 `--stack unity --replace` | 旧入口从活动目录移除、新公共入口及ADAPTER就位、原文件备份保留，全部通过 |
| 正文重复复查 | `npm run audit:bodies` 与独立语义审查 | 长度至少 120 字符的等价段落从 108 组降至 6 组；剩余为单点生成的协议适配和本栈命令示例，无待合并的独立正文副本 |
| Flutter 布局夹具 | `npm run test:flutter-layout` | 48/48 PASS |
| Three.js 真实模板构建 | 生成模板后执行 `npm ci`、`npm run build` | TypeScript 检查和 Vite 生产构建 PASS；实际 dist 校验 PASS |
| 打包预检 | `npm pack --dry-run --json --silent`，逐项核对声明目录、迁移目标、替代实现、生成文件及 bin | PASS，全部必需路径均存在 |
| 官方技能格式校验 | `python -X utf8 <skill-creator>/scripts/quick_validate.py <技能目录>` | 30 个根技能加1个嵌套生成模板，31/31 PASS |
| 独立只读审查 | reviewer检查实际入口、模式语义、专业载荷与单栈安装闭包 | 已报P2均关闭；入口完整性3/3通过，1508条有目标载荷记录的SHA全部一致，无已知阻断项 |

## 自动测试覆盖

- 公共控制器与边界：五栈初始化、门禁、实施单元、错栈、假 PASS、V0–V4、拷问、RETURN、BLOCKED、批准绑定与发布记录。并行批次保持冻结顺序、前批依赖、路径互斥、串行共享设置及真实结果；拒绝未来批次提前 PASS、结果覆盖控制文件和未知字段，覆盖锁与写入失败恢复。
- 素材和公共算法：PNG 解码、Alpha、边缘连通、严格背景容差、非法输入、源文件保护、硬链接与 Junction；共享模块与原实现的行为对照、系列视觉合同、补帧计划的栈身份及专业门禁。
- 专业载荷：迁入的 Unity Toolkit、原生契约、三种浏览器游戏栈专业回归、Flutter 布局夹具，以及技能、模板和校验器的实际依赖闭包。Unity Toolkit 源文件保持原文；测试宿主的本地包依赖按新目录准确重定位并验证真实目标。
- 迁移和去重：真实 Git 清单和摘要、遗漏与损坏反例、公共正文逐段追溯、唯一实现、适配导入、模板公共字段与原生字段保留；迁移写入前预检、手改保护和链接越界拒绝。
- 正文与原生补充：四栈音频/数值及三栈模型生产完整规则、原生 API 不因名字相似而合并、部分适用范围、真实资料导航、源漂移拒绝，以及 Unity 失焦暂停、UV 冻结报告和模型标题锚点回归。
- 入口与模式：30个唯一根入口、77份原生规范及79条明确路由；Unity UI/2D动作适配复用不改变原主职责；旧入口不存在；图片优化继承源三栈的显式调用策略。专业资源包仍逐文件比较实际安装内容。
- 安装与分发：五栈单独安装后运行实际产物，覆盖选装、预演、冲突、备份、无关技能保留、安装锁、故障恢复和领域初始化真实产物。专业 CLI 通过目录别名调用仍实际执行。

6 个 SKIP 是 Cocos、Phaser、Three.js 各两个已退役旧全局 CLI 状态用例；公共控制器回归覆盖相应行为，专业领域用例继续运行，未把专业失败改为跳过。

全量测试发现的 UnityHost 旧路径已在迁移适配器修复，重新生成后定向与全仓复验均通过。独立审查发现的链接路径、结果路径冲突、未知字段、批次状态和 CLI 别名问题均已修复并复验，最终无未解决失败项。

本轮正文抽取的定向测试初次发现夹具长度阈值问题，已修正夹具后复验；独立审查发现 Unity 失焦暂停被条件化，现已在 Unity 原生入口明确保留强制要求，Web 平台分支未被扩张。最终全仓无新增 SKIP 或未解决失败项。详细范围及保留证据见[五栈正文复查](skill-body-audit.md)。

入口合并的定向回归发现旧源测试动态目录和ADAPTER路径重基遗漏，已在迁移器修复并重新生成。审查发现的策划范围扩张、无请求的兼容窗口、2D TA写入职责、Flutter目标图/bitmap触发、Three.js插件职责、运行时迭代及单栈断链均已修正。源图片优化的显式调用策略和默认保持格式/尺寸/方向/文件名也已继承。当前没有残留旧入口别名；详细结构见[能力入口迁移](capability-entry-migration.md)。

Three.js 生产构建保留一项包体警告：主 JavaScript 约 541.13 kB，超过 Vite 的 500 kB 提示阈值；gzip 约 132.40 kB。该警告不影响本次模板构建通过，实际产品仍需按内容与性能预算决定拆包。

详细迁移去向见[技能逐项清单](skill-migration.md)，共享实现及原生适配见[公共能力清单](shared-capabilities.md)。登记的公共算法/资源及适配相较原重复载荷减少700161字节；该统计不含正文去重，也不代表整个仓库体积。

## 未执行与证据边界

除上述 Three.js 模板生产构建外，未执行五栈目标产品的引擎或应用运行验收；未启动开发服务、Standalone/Player、模拟器或真机；未生成或编辑实际游戏/App 素材；未执行签名、上传、付费或发布。

控制器测试中的图片路径、人工消息与外部发布记录是合成夹具，只用于验证数据关系与状态控制，不证明真实图像、真实用户身份、真实引擎运行或发布。PNG 工具测试使用合成像素，不进行截图显示效果验收。实际素材的“去 AI 味”仍须在生产流程中按视觉签名、代表样本、系列一致性、技术导入及人工审阅执行，不宣称已有真实素材通过。

文件存在、非空与绑定校验无法证明提交者没有伪造材料。实际操作必须回到宿主用户指令、真实工具输出、目标工程及人工验收记录核对。

五个源仓库未改动；Phaser 原有未跟踪 `examples/` 保留。没有安装全局技能、迁移既有项目、创建分支、worktree、提交或推送。目标目录起初没有 Git 元数据，本次未擅自初始化仓库。
