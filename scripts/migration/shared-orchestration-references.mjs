/** 将编排专业参考的已审阅共用规则集中维护，旧控制协议与原生差异不进入公共真源。 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { buildReferenceWorkflow } from './reference-workflow-common.mjs';
import { canonicalWorkflowBlock, readWorkflowBlocks } from './web-workflow-bodies.mjs';
import { unifySourceVisualStages } from './unified-stage-text.mjs';
import { ORCHESTRATION_REFERENCE_FAMILIES, ORCHESTRATION_TRACKED_REFERENCES } from './orchestration-reference-specs.mjs';

export { ORCHESTRATION_REFERENCE_FAMILIES } from './orchestration-reference-specs.mjs';

// 旧执行状态、动作批准和命令协议由现有公共控制面负责，不能重新生成第二套协议。
const LEGACY = /\b(?:A[1-6]|G[1-3]|preflight|pending|handoff|approve)\b|Approval Ledger|ledger\.json|\.workflow-control\/approvals/i;

const REVIEW_OLD = '返工时记录触发原因、当前候选和真实影响范围，并调用控制面的 `repair`、`revalidate` 或 `return` 处置。没有真实失败或范围变化时不得继续优化式修改；A3 实施代理只按冻结的 Implementation Package 执行。用户决定、视觉/证据硬门和高影响操作批准仍由控制面校验。';
const REVIEW_CURRENT = '返工时记录触发原因、当前候选和真实影响范围；视觉领域的 `repair`、`revalidate`、`return` 是处置分类，分别表示原地修复、真实复验和返回受影响阶段，不是控制器命令。只有需要返回时，按当前 Work Item 状态使用公共控制器的 `transition`；没有真实失败或范围变化时不得继续优化式修改。用户决定、视觉证据和高影响操作的明确批准仍按当前控制合同核对。';
const OLD_LEDGER = '只有高影响外部操作的显式批准写入 `.workflow-control/approvals/ledger.json`；普通任务不建立授权记录。';
const CURRENT_APPROVAL = '高影响外部操作须在当前 Work Item 的 `action.approval` 中关联用户明确批准的具体动作、目标和用户消息引用；普通产品决定不建立额外批准记录。';
const OWNERSHIP = '实现按可验收场景闭环。玩法独占规则、状态、碰撞和交互代码；美术可维护纯表现层资源配置、布局/表现预制数据和视觉集成调整，但不得改变玩法规则、碰撞语义或状态所有权。G1 内部顺序不构成第二套全局状态机。';
const ATOMIC = '原子部件补充：`component_count` 只计唯一 `atomic_visual_key`，重复可见实例必须用多个 `placements` 和 `visible_instance_count` 表达。② 六按钮逐部件登记；⑧ 三个相同表面可为一个 component 加三个 placements；⑨ 按实际复用关系登记。生成式位图每个唯一 component×required state 只允许独立位图，强制 individual 且禁止 atlas；说明、图例和 atomic image requirements 放在标注图右侧栏，左侧原图只保留框和编号/placement 标记；热区逐 placement 绑定，不计入资产。';

/** 将编排中重复的具体能力导向已存在的完整公共真源，保留本栈的标注安排。 */
export function routeOrchestrationImplementation(text, { destination } = {}) {
  if (typeof text !== 'string' || typeof destination !== 'string' || !destination.startsWith('skills/') || destination.split('/').includes('..')) throw new TypeError('编排路由需要正文和仓库内目标');
  const link = (target) => posix.relative(posix.dirname(destination), target);
  // 已审阅的原文必须唯一，避免源文档变更后静默丢失职责边界。
  const replaceOnce = (input, original, replacement) => {
    const at = input.indexOf(original);
    if (at < 0 || input.indexOf(original, at + original.length) >= 0) throw new Error('编排公共职责原文缺失或重复，拒绝静默迁移');
    return input.slice(0, at) + replacement + input.slice(at + original.length);
  };
  const output = replaceOnce(text, OWNERSHIP, `实现按可验收场景闭环；玩法与美术职责及状态所有权按[玩法实现规范](${link('skills/app-domain-toolkit/references/gameplay-implementation.md')}#玩法与美术职责)执行。游戏生产里程碑不构成第二套全局状态机。`);
  if (!output.includes('reference-orchestration-game-implementation.md#增量流程')) throw new Error('编排增量步骤尚未接入公共拆分规范');
  return output;
}

/** 逐项修正已核实的混合旧协议，具体事实和真实领域字段原样或等义保留。 */
function currentCommonRule(family, block, original) {
  const id = family.id;
  const value = (canonical, referenceLinks = []) => ({ canonical, referenceLinks });
  if (id === 'reference-orchestration-game-implementation') {
    if (original.startsWith('实施并行边界和 READY/委派校验')) return value('实施并行边界和 READY/委派校验以“模块划分”（见本栈配套资料）及控制面 Schema 为准：`SHARED`/`INTEGRATION` 强制串行，`MODULE`/`SCENE`/`DISPLAY_LAYER` 仅在依赖满足且文件与状态所有权互斥时并行；`DISPLAY_LAYER` 绑定实际宿主上下文并独立安排，不要求执行顺序紧邻宿主或等待宿主完成 V5。');
    if (original.startsWith('3. 每个场景 Work Item 先在 V1')) return value('3. 每个场景 Work Item 在公共 V1 完成当前功能范围的实际验证，白盒按需选择；公共 V2 确认 scene master/reference target、宿主上下文和视觉合同，公共 V3 先完成拆解确认，再完成布局确认，公共 V4 完成正式资源验收。');
    if (original.startsWith('4. V4 直接消费 V2')) return value('4. 公共 V5 消费公共 V3 已确认的布局目标和公共 V4 已验收资源，按冻结执行单元完成正式组合、运行态视觉接入及功能回归。跨场景功能应尽早实际验证；最终正式组合完成后再做联合验收。无副作用本地集成可按任务执行，外部写入、付费、真机、破坏性或外部删除和发布仍按具体动作核对用户明确授权。');
    if (original.startsWith('每个场景以 `SCENE` 聚合自身完成事实')) return value('每个 `SCENE` 聚合自身完成事实：公共 V1 实际验证当前功能，公共 V2 确认视觉目标与还原草案，公共 V3 确认拆解及布局，公共 V4 验收正式资源，公共 V5 完成正式组合及运行验收。modal/popup 等 `DISPLAY_LAYER` 建立独立 Work Item 和实施包；其上下文和宿主分别验证，不能由宿主确认替代。');
    if (original.startsWith('2. 场景 V1 时定义状态、输入')) return value('2. 公共 V1 定义并实际验证状态、输入、规则和反馈；可以直接实现正式功能，也可按需使用低保真草图或白盒，不以白盒为必经门。指定效果图还原时，公共 V2 生成或接收并确认 scene master/reference target、宿主上下文、参考身份、视口、状态、对比条件和还原草案，并声明 `visual_validation.mode=usability|exact`（默认 `usability`）。默认允许合理位置、尺寸、边距和换行差异；改变产品方向、玩法语义或上游结构，或明确要求 `exact` 时处理相应用户决定。');
    if (original.startsWith('场景与显示层实现消费同一场景 Work Item 的视觉真值。')) return value('场景与显示层分别维护自己的功能、视觉目标和验收；公共 V1 可先实现并验证功能，白盒按需使用。公共 V2 冻结经确认的 scene master/reference target 和必要宿主上下文，公共 V3 完成拆解、布局和生产方案，公共 V4 验收正式资源，公共 V5 验证正式组合和功能回归。原生目标、素材生成和确认记录须绑定实际场景与目标；全局基线不能替代对象确认，上游事实变化时按受影响范围重验。');
    if (original.startsWith('在当前用户任务、适用的 A0-A6/F0-F4')) return value('在当前用户任务、Work Item 适用门禁及视觉阶段的边界内，以最小充分事实实施：入口、关键调用链或契约、范围、主要风险和验收目标明确且无直接冲突后停止探索。需要实施包时，先绑定任务范围、文件所有权、验收和停止条件，再按包执行；可逆本地任务可记录合理假设，缺少完全证明不单独阻塞。任务内方案、路径和资源清单可随实施更新计划，并重验实际受影响部分。');
    if (original.startsWith('仅 A3 包冻结后，implementer')) return value('实施包冻结后按包执行；需求或范围变化、实质冲突或无法实施时处理受影响范围。顺序为：最小事实确认、冻结候选边界及适用实施包、实施、核对实际变更、推荐并自动执行适用等级验证、依据失败证据修正、完成。已确认事实不重复探索；返工须由测试、类型、构建、运行、需求、安全、越界、可复现缺陷或硬门失败驱动。普通候选身份变化只重验受影响范围，不自动 RETURN；非阻塞发现和其他可行方案作为未覆盖项或后续事项记录。用户决定、真实证据、视觉人工验收及受保护动作的明确授权继续生效。');
    if (original.startsWith('场景和显示层分别记录 `functional_status`')) return value(original.replace('显示层仍复用同一 V0、V1、V2、V3、V4 阶段及 A0-A6、F0-F4', '显示层复用公共 V0–V5 对象阶段及当前 Work Item 的适用 F0–F4 门禁'));
    if (original.startsWith('1. 冻结玩家行为、模块契约')) return value('1. 冻结玩家行为、模块契约、所有权、验收、服务复用和 V0 类型。模块边界变化先查事实，仅实质取舍触发模块审计和 grilling；带外部副作用的动作按当前 Work Item 的精确授权与 F4 要求处理。');
    if (original.startsWith(ATOMIC + '\n7. V1 灰盒')) {
      const steps = original.slice(ATOMIC.length).trim().replace('V1 灰盒只用于隔离验证结构与交互，不注册正式入口或承载正式业务逻辑。V4 按 V2 拆解与布局、V3 正式资源实现正式 Scene', '公共 V1 可直接实现并验证功能，白盒按需选择；公共 V5 按公共 V3 拆解与布局、公共 V4 正式资源组合正式 Scene').replace('F4 只做带副作用的 A4-A6 精确集成/发布操作批准', 'F4 按当前 Work Item 核对受保护动作的具体授权与结果').replace('V1/V2 的 `USER_DECISION`', '功能与视觉阶段的 `USER_DECISION`');
      return value(`原子部件数量、重复实例、独立位图与图集限制和热区合同按[效果图拆分规范](./reference-asset-effect-image-splitting.md)执行。标注图右侧栏包含该图的原子图片要求，左侧原图只保留框和编号/placement 标记。\n${steps}`);
    }
    if (block.sourceHeading === '回退' && original.startsWith('玩法契约或结构问题退 V1')) return value('玩法契约或结构事实失效时返回受影响视觉阶段并使受影响决定失效；模块边界变化仅在存在实质取舍时进入 grilling。修订后按当前 Work Item 重跑实际受影响的 F0–F3，受保护副作用按具体动作和目标核对授权。视觉拆解的真实用户确认及回执保持绑定相应工件，实施代理不得伪造或擅改确认；Git 提交或基线变更仅在用户明确要求时执行。');
    if (block.sourceHeading === 'G1 强制实施序列' && /^[34]\. /.test(original)) return value(original);
  }
  if (id === 'reference-orchestration-module-decomposition' && original.startsWith('- `SHARED` 定义为项目最小骨架')) {
    return value('- `SHARED` 定义为项目最小骨架，提供稳定契约和最小 Boot/Preload 生命周期；`MODULE` 可承载共享规则、状态和功能切片。纯工程工作按任务范围、实施包和工程证据推进，不要求先选视觉图。公共 V1 可直接实现并验证场景功能，白盒按需选择；正式视觉资源生产、显示层组合和运行验收分别按公共 V2–V5 的目标、布局、导入及运行门检查。SCENE 与 DISPLAY_LAYER 各自绑定当前对象的确认和证据，不能以其他场景的确认代替。');
  }
  if (id === 'reference-orchestration-review-funnel') {
    if (original.startsWith('| 门 | 语义 | 编排交付 |')) return value('| 门 | 语义 | 编排交付 |\n| --- | --- | --- |\n| F0 | 范围与流程合规 | 当前 Work Item 的 `check` 结果、任务范围、路径、目标、基线与停止条件；受保护操作核对明确授权 |\n| F1 | 规格一致性 | 实际 diff 到 `approvedRequirements`、模块、领域与阶段的追踪 |\n| F2 | 领域质量 | 独立产品、架构、玩法、视觉、资源、音频、数值和 QA 结论 |\n| F3 | 工程验证 | 当前代码与 diff、实际命令、环境、数据源、文件、判定和未覆盖项 |\n| F4 | 受保护动作 | 外部写入、付费、真机、破坏性或外部删除、发布的具体目标、明确授权与真实结果 |');
    if (original.startsWith('审查只检查需求覆盖、明确缺陷')) return value('审查只检查需求覆盖、明确缺陷、范围越界、硬门和当前证据真实性，不重复已完成的同类探索，也不把另一种实现当作缺陷。实施前确认入口、关键调用链或契约、任务范围、主要风险和验收目标明确且无直接冲突；记录候选的范围、假设和验收边界，需要实施包时按当前 Work Item 冻结并执行。需求或范围变化、实质冲突或无法实施时返回受影响范围。');
    if (original.startsWith('领域审查者只能提议和审查。')) return value('领域审查者负责提议与审查；状态迁移及最终门结论由公共控制器处理。产品决定不替代外部动作的明确授权，相关批准按当前 Work Item 的 `action.approval` 记录。');
  }
  if (id === 'reference-orchestration-technical-grilling') {
    if (original.startsWith('控制面边界：')) return value('控制面边界：在当前 Work Item 范围内提议和审查并记录决定；受保护外部动作的具体授权按当前公共控制面处理。');
    if (original.startsWith('Grilling 只形成 `USER_DECISION`')) return value('Grilling 只形成 `USER_DECISION` 澄清记录。将用户选择回写 Work Item、需求、架构、视觉等权威工件或独立决定记录，清除对应未决标志；产品选择不能当作受保护动作批准或改写 `action.approval`。');
    if (original.startsWith('7. V1/V2 已有明确需求或冻结基线')) return value(original.replace('发布仍按 A5/A6 记录。', '发布决定按当前发布 Work Item 和具体动作的明确授权记录。'));
  }
  if (id === 'reference-orchestration-grilling-integration') {
    if (original.startsWith('总控先从用户请求、代码、配置')) return value(original.replace('F4 只处理 A4 高影响集成与发布决定。', 'F4 按当前 Work Item 处理受保护动作的明确授权与真实结果。'));
    if (original.startsWith('2. F0 处理任务范围与流程合规')) return value('2. F0 处理范围与流程合规，F1 处理规格一致性，F2 处理专业质量，F3 处理工程验证；F4 按当前 Work Item 核对外部写入、付费、真机、破坏性或外部删除、发布等受保护动作的具体授权。无外部副作用的本地任务按已授权范围执行。');
    if (original.startsWith('- G3 外部发布及受保护风险接受')) return value('- 发布里程碑的外部发布和受保护风险接受，按当前 Work Item 中具体目标与动作核对用户明确授权。');
    if (original.startsWith('候选前决定记录决策 ID、权威工件版本')) return value(original.replace('控制面仅索引决定，详细事实留在各自权威交付物，且不写 Approval Ledger。', '控制面仅索引决定，详细事实留在各自权威交付物；产品决定不替代受保护动作的明确授权。'));
    if (original.startsWith('- 已有明确需求或冻结基线')) {
      const normalized = canonicalWorkflowBlock(original, { routeScripts: false });
      return { ...normalized, canonical: normalized.canonical.replace('“控制面不可绕过约束”（见本栈配套资料）',
        '[公共控制面不可绕过约束](../../app-workflow-control/SKILL.md#不可绕过约束)') };
    }
  }
  if (id === 'reference-orchestration-visual-quality-gate' && original.startsWith('普通资产在 schema 1.5 使用 `not-applicable`')) return value(original);
  if (id === 'reference-orchestration-module-decomposition' && original.startsWith('模块候选按统一')) {
    const normalized = canonicalWorkflowBlock(original, { routeScripts: false });
    return { ...normalized, canonical: normalized.canonical.replace('发布副作用的 A4-A6 操作', '发布等受保护的具体操作') };
  }
  if (id === 'reference-orchestration-technical-orchestration') {
    // 已无本栈差异的导航文件不再落盘，公共正文必须直接指向实际真源。
    if (original.startsWith('1. 读取 Work Item')) {
      const normalized = canonicalWorkflowBlock(original, { routeScripts: false });
      return { ...normalized, canonical: normalized.canonical.replace('“quality-gates.md”（见本栈配套资料）',
        '[游戏生产里程碑](./reference-orchestration-quality-gates.md)') };
    }
    if (original.startsWith('- 不覆盖并行代理的修改')) return value('- 不覆盖并行代理的修改，不自动回滚共享工作区；启动本地验证服务前先按[本地服务验证规则](./reference-orchestration-local-service-validation.md)查找可复用健康实例。Cocos 任务另需按本栈配套资料核对 Creator 预览说明。');
    if (original.startsWith('用户先按[')) return value('项目视图依次包括需求与范围、全局基线、基础工程、逐场景生产、全局集成验证及发布；单场景依次处理场景定义、拆解与布局确认、正式资源验收及正式还原与运行验收。视觉阶段通过 `visual.stage` 记录，适用门禁和证据以当前 Work Item 为准。');
    if (original.startsWith('3. A3 实施前冻结')) return value('3. 实施前按当前 Work Item 和任务需要冻结绑定任务范围、基线、文件所有权、执行单元、验收命令和停止条件的实施包；实施后记录实际变更并关联当前候选验证证据。');
    if (original.startsWith('4. 领域交付只在当前任务路径内进行')) return value('4. 领域交付只在当前任务路径内进行；方案、路径或资源清单变化时更新计划并重验受影响部分，需求或范围真实变化时更新 Work Item。按实际完成情况判断，不因中途调整追补无关历史修订；最终使用公共控制器的 `run`/`check` 核对和推进状态。');
    if (original.startsWith('5. 阶段验收完成后')) return value('5. 仅当用户明确要求 Git 提交时，按[最小提交规则](./git-minimal-submission.md)核对本任务运行、构建及有效引用的必要文件和实际产物，并记录提交结果；并行任务由主代理统一收尾，子代理不各自提交共享工作区。');
    if (original.startsWith('- A0-A3 依据当前用户任务')) return value('- 无外部副作用的本地任务按当前用户授权范围执行；外部写入、付费、真机、破坏性或外部删除及发布等受保护动作，在当前 Work Item 中核对具体目标与用户明确批准。本领域不擅自执行这些动作。');
  }
  return null;
}

/** 精确修正已核实的旧协议文字，保留实际业务检查和视觉处置分类。 */
function correctedBlock(family, block) {
  const original = block.original.trim().replaceAll('\r\n', '\n');
  const current = currentCommonRule(family, block, original);
  if (current) return current;
  if (family.id === 'reference-orchestration-visual-quality-gate' && original.includes('V0、V1、V2、V3、V4 是 `stageId`')) {
    const normalized = canonicalWorkflowBlock(original, { routeScripts: false });
    return { ...normalized, canonical: normalized.canonical.replace('V0、V1、V2、V3、V4 是 `stageId`',
      '公共对象阶段为 V0–V5，Work Item 使用 `visual.stage` 记录，不能将其作为工作项的 `stageId`；各技术栈均使用一致的 V0–V5 阶段') };
  }
  if (family.id === 'reference-orchestration-delivery-artifacts') {
    return block.sourceHeading === '产物落盘' && original.startsWith('待确认文件先完成保留目录落盘和引用更新再展示，')
      ? { canonical: original, referenceLinks: [] } : { canonical: '', referenceLinks: [] };
  }
  if (family.id === 'reference-orchestration-review-funnel' && original === REVIEW_OLD) return { canonical: REVIEW_CURRENT, referenceLinks: [] };
  if (family.id === 'reference-orchestration-technical-grilling' && block.sourceHeading === '完成与记录' && original.includes(OLD_LEDGER)) {
    const normalized = canonicalWorkflowBlock(original, { routeScripts: false });
    if (!normalized.canonical.includes(OLD_LEDGER)) throw new Error('拷问记录的旧批准说明无法唯一识别');
    return { canonical: normalized.canonical.replace(OLD_LEDGER, CURRENT_APPROVAL), referenceLinks: normalized.referenceLinks };
  }
  if (family.id !== 'reference-orchestration-quality-gates') return null;
  if (original === 'G0-G3 是领域 `stageId`，由全局控制面映射到唯一 `globalState`，不能自行授权动作。') {
    return { canonical: 'G0–G3 是游戏生产里程碑，不是控制器的 `stageId` 字段，也不自行授权动作。实际阶段、状态、门禁和证据以当前 Work Item 与公共控制器 Schema 为准。', referenceLinks: [] };
  }
  if (original.startsWith('| 门 | 出口 | 全局状态范围 |')) {
    return { canonical: '| 里程碑 | 业务检查与交付 |\n| --- | --- |\n| G0 | 建立任务范围和工程基线；正式视觉选择在相关功能验证后进行。 |\n| G1 | 完成必要基础能力，按功能切片和对象范围推进公共 V1→V2→V3→V4→V5；跨场景行为可先用真实功能或可选白盒验证，无需等待全部场景视觉完成。 |\n| G2 | 检查全场景集成、预算、响应式、性能、存档/恢复、正式资源完整性与全功能回归。 |\n| G3 | 发布工作项汇总逐渠道候选、合规、风险和回滚事实；外部发布等具体动作须取得明确授权并记录真实证据。 |', referenceLinks: [] };
  }
  if (original.startsWith('任一门都必须应用统一 F0-F4。')) {
    const normalized = original.replace('任一门都必须应用统一 F0-F4。', '各里程碑依据当前 Work Item 的适用门禁和真实证据执行。')
      .replace(/默认禁止 (?:Cocos|Phaser|ThreeJS) 真机、商店、生产迁移和发布；非 (?:Cocos|Phaser|ThreeJS) 操作不进入这些门。/, '真机、商店、生产迁移与发布等外部动作须有用户对具体目标和动作的明确授权，不自动执行。');
    if (/默认禁止/.test(normalized)) throw new Error('游戏里程碑的本栈风险说明发生变化');
    return { canonical: normalized, referenceLinks: [] };
  }
  if (original.startsWith('首个可玩切片是 G1 中间里程碑')) return { canonical: original, referenceLinks: [] };
  throw new Error('游戏里程碑出现未经审阅的正文块');
}

/** 显式解析每栈源目录，不借其他栈补齐缺失文件。 */
function sourceRootFor(sourceRoot, stack) {
  const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
  if (typeof root !== 'string' || !root) throw new Error(`编排参考缺少 ${stack} 源仓库`);
  return resolve(root);
}

/** 检查编排目录的全部 Markdown 和拷问入口，发现新增或丢失时停止自动共享。 */
function validateTracked(root, stack, supplied) {
  const prefix = `skills/${stack === 'phaser' ? 'phaser4' : stack}-game-orchestrator/references/`;
  const rootEntry = `skills/${stack === 'phaser' ? 'phaser4' : stack}-game-orchestrator/SKILL.md`;
  let files;
  if (supplied !== undefined) {
    if (!Array.isArray(supplied) && !(supplied instanceof Set)) throw new TypeError(`${stack} 跟踪清单必须为数组或集合`);
    files = [...supplied];
  } else {
    try { files = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', prefix, rootEntry, 'skills/grilling/SKILL.md'], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean); }
    catch (error) { throw new Error(`${stack} 编排来源 Git 清单不可读：${error.message}`); }
  }
  const actual = files.filter((path) => typeof path === 'string' && ((path.startsWith(prefix) && path.endsWith('.md')) || path === 'skills/grilling/SKILL.md' || path === rootEntry)).sort();
  if (JSON.stringify(actual) !== JSON.stringify(ORCHESTRATION_TRACKED_REFERENCES[stack])) throw new Error(`${stack} 编排参考 Git 清单变化，必须重新审查`);
}

/** 只归一栈目录前缀；远程地址和锚点不同代表不同资料，不能按同名链接合并。 */
function targetIdentity(target) {
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return target;
  return target.replace(/(?:cocos|phaser4|threejs)(?=-)/g, 'stack');
}

/** 以完整原文判定安全范围，示例代码原样保留，有序步骤不得丢失编号。 */
function normalizeBlock(block) {
  const original = block.original.trim().replaceAll('\r\n', '\n');
  if (LEGACY.test(block.sourceHeading) || LEGACY.test(original) || /!\[[^\]]*\]\(/.test(original)) return null;
  if (/(?:\bCocos\b|\bCreator\b|\bPhaser\b|\bThreeJS\b|three\.js|\bTHREE\b)/i.test(original)) return null;
  if (/^(?:```|~~~)/.test(original)) return { canonical: original, referenceLinks: [] };
  if (/```|~~~/.test(original)) return null;
  const normalized = canonicalWorkflowBlock(original, { routeScripts: false });
  let canonical = normalized.canonical.replace(/\$(?:cocos|phaser4|threejs)-game-workflow-control\b/g, '$app-workflow-control');
  const numbered = original.match(/^(\d+[.)]\s+)/);
  if (numbered) canonical = numbered[1] + canonical;
  // 使用 worktree 本身不授权提交或集成，源提示中需写明对应动作仍需用户要求。
  canonical = canonical.replace('任务完成后在对应 worktree 运行必要检查，并按普通 Git 流程提交和集成。', '任务完成后在对应 worktree 运行必要检查；仅在用户明确要求提交或集成时，按普通 Git 流程执行。');
  return { canonical, referenceLinks: normalized.referenceLinks };
}

/** 同一正文内链接目标不等价时整块留原生，避免同名链接造成伪共享。 */
function ambiguousBlocks(sources) {
  const targets = new Map();
  for (const source of sources) for (const block of readWorkflowBlocks(source.text)) {
    const normalized = normalizeBlock(block);
    if (!normalized) continue;
    const key = `${block.sourceHeading}\n${normalized.canonical}`;
    if (!targets.has(key)) targets.set(key, new Set());
    targets.get(key).add(JSON.stringify(normalized.referenceLinks.map((link) => [link.label.replace(/(?:cocos|phaser4|threejs)(?=-)/g, 'stack'), targetIdentity(link.target)])));
  }
  return new Set([...targets].filter(([, values]) => values.size > 1).map(([key]) => key));
}

/** 构造带逐源摘要和字符区间的公共参考计划，不修改源仓库。 */
export function buildSharedOrchestrationReferences({ sourceRoot, repositoryRoot, trackedFilesByStack } = {}) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot) throw new TypeError('编排参考需要目标仓库根');
  const roots = Object.fromEntries(Object.keys(ORCHESTRATION_TRACKED_REFERENCES).map((stack) => [stack, sourceRootFor(sourceRoot, stack)]));
  for (const [stack, root] of Object.entries(roots)) validateTracked(root, stack, trackedFilesByStack?.[stack]);
  const documents = [];
  const replacements = [];
  for (const family of ORCHESTRATION_REFERENCE_FAMILIES) {
    const sources = family.sources.map((source) => {
      let bytes;
      try { bytes = readFileSync(resolve(roots[source.stack], ...source.sourcePath.split('/'))); }
      catch (error) { throw new Error(`编排参考来源不可读取：${source.stack}/${source.sourcePath} (${error.message})`); }
      if (createHash('sha256').update(bytes).digest('hex') !== source.sourceSha256) throw new Error(`编排参考源摘要漂移：${source.stack}/${source.sourcePath}`);
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error(`编排参考来源不是有效 UTF-8：${source.stack}/${source.sourcePath}`); }
      return { stack: source.stack, sourcePath: source.sourcePath, text };
    });
    const ambiguous = ambiguousBlocks(sources);
    const plan = buildReferenceWorkflow({ id: family.id, title: family.title, sources, canonicalStagesUnified: true,
      reason: '按完整源块和资料链接核对编排规则，旧控制协议、原生阶段及不同技术栈专属条件继续独立处理。',
      canonicalize: (block) => {
        const normalized = correctedBlock(family, block) ?? normalizeBlock(block);
        if (!normalized || ambiguous.has(`${block.sourceHeading}\n${normalized.canonical}`)) return null;
        return { ...normalized, canonical: unifySourceVisualStages(normalized.canonical) };
      } });
    // 原生领域合同保留视觉阶段编号，公共工作项的新功能阶段不能与其混读。
    if (/\bV[1-5]\b/.test(plan.documents[0].content)) plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n各技术栈统一使用 V0–V5；V1 是功能实现与验证，白盒可选，正式功能不必等待视觉目标。\n\n## ');
    documents.push(...plan.documents);
    replacements.push(...plan.replacements);
  }
  return { documents, replacements, repositoryRoot: resolve(repositoryRoot) };
}
