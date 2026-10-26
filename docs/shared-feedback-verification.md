# 游戏与应用公共汁水设计验证

日期：2026-10-26。实际执行 T2，覆盖公共反馈能力、迁移追溯、五栈安装闭包和静态校验。本轮未重跑上一轮全仓 T3，历史结果仍保留在[验证记录](verification.md)。

## 交付结构

- 唯一入口为 [`app-feedback`](../skills/app-feedback/SKILL.md)，游戏与应用共用[交互反馈规范](../skills/app-feedback/references/interaction-feedback.md)：事件语义、反馈矩阵、通道与强度预算、重复并发与打断、异步结果、生命周期、无障碍及人工体验验收。
- Unity、Cocos、Phaser、Three.js 继续使用各自原生规范和载荷。Flutter 新增[原生反馈适配](../skills/app-stack-flutter/references/native-contracts.md#mode-flutter-feedback)，由[仓库自有模板](../scripts/migration/templates/flutter-feedback.source)生成，不新增独立技能入口。
- 保留30个根技能、77份源专业规范及2条明确复用路由；新增1条独立 authored 路由，合计80条。新增规范使用 `repository-authored` 来源记录、模板及目标摘要，不计入91个源正式入口或1608个源跟踪文件。

## 实际验证

| 检查 | 命令/方式 | 结果 |
| --- | --- | --- |
| 迁移与能力入口 | `node --test tests/migration.test.mjs tests/capability-entry-integrity.test.mjs` | 22/22 PASS，包含新规范不能冒充源技能、标记缺失、模板缺失或变更等反例 |
| 路由、反馈、安装和专业载荷 | `node --test tests/capability-routing.test.mjs tests/feedback-capability.test.mjs tests/migration-output-cleanup.test.mjs tests/installer.test.mjs tests/professional-delivery.test.mjs` | 21/21 PASS；五栈分别安装闭包通过，Flutter实际安装后运行其工作流校验器通过 |
| 真实源完整性 | `node scripts/verify-migration.mjs --source-root E:/Git` | PASS，无错误或警告；1608文件、91入口及1嵌套模板逐项核对 |
| 仓库静态检查 | `npm run check` | PASS，30根技能、1794个维护文件；脚本语法、代码规模、JSON、文档链接和声明一致性通过 |
| 技能格式 | `python -X utf8 C:/Users/forjs/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/app-feedback` | PASS |
| 分发预检 | `npm pack --dry-run --json --silent` | PASS；公共入口、共享规范、Flutter适配及源模板均随包提供，无Flutter反馈SKILL别名 |
| 独立只读审查 | 检查最终入口、manifest、五栈profile、公共规则及Flutter生命周期 | 无未解决实质问题；模板与产物一致，7个本地链接和14个原游戏汁水文件存在且账本摘要相符 |

合计43项定向测试通过，0失败、0跳过。首次定向检查曾遇到尚未再生成的旧manifest，完成迁移及索引生成后复验通过。页面离开不会自动取消有效业务保存；过期展示回调与业务权威结果分开处理，动画完成不会冒充业务成功。

最终只读核对五源：四库无改动，Phaser原有未跟踪 `examples/` 保留。未初始化目标Git元数据、创建分支、worktree、提交、推送或安装全局技能。

## 未执行与边界

未启动游戏引擎、Flutter应用、开发服务、模拟器或真机，未生成实际图片、截图或执行视觉分析，未签名、上传、付费或发布。技术规则与安装验证通过不代表已完成实际产品的动效、声音、触觉或视觉验收；这些效果在项目接入后由用户人工检查。
