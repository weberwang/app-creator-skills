/** 整合三栈可证明一致的领域事实，并将退役全局协议定向到公共控制器。 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { buildReferenceWorkflow } from './reference-workflow-common.mjs';
import { routeSharedControlText } from './domain-reference-routing.mjs';
import { DOMAIN_REFERENCE_FAMILIES, DOMAIN_SOURCE_HASHES, DOMAIN_ENTRY_HASHES } from './domain-reference-specs.mjs';
import { unifySourceVisualStages } from './unified-stage-text.mjs';

export { DOMAIN_REFERENCE_FAMILIES } from './domain-reference-specs.mjs';

const PREFIX = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const DOMAIN_FILES = Object.freeze(['schemas', 'control-model', 'state-gates', 'simplified-workflow', 'entry']);

/** 固定源文件路径，避免把同名的其他领域参考混入合同。 */
function sourcePath(stack, name) {
  if (name === 'entry') return `skills/${PREFIX[stack]}-game-workflow-control/SKILL.md`;
  return `skills/${PREFIX[stack]}-game-workflow-control/references/${name}.md`;
}

/** 只接受已审计的 Git 跟踪文件和原始字节；目录内其他原生资料由既有迁移清单维护。 */
function readSources(sourceRoot, trackedFilesByStack) {
  const result = new Map();
  for (const stack of Object.keys(PREFIX)) {
    const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
    if (!root) throw new Error(`领域参考缺少 ${stack} 源仓库`);
    const expected = DOMAIN_FILES.map((name) => sourcePath(stack, name));
    let tracked = trackedFilesByStack?.[stack];
    if (tracked === undefined) {
      try { tracked = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', ...expected], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean); }
      catch (error) { throw new Error(`${stack} 领域参考 Git 清单不可读：${error.message}`); }
    }
    if (!Array.isArray(tracked) && !(tracked instanceof Set)) throw new TypeError('领域参考 Git 清单必须是数组或集合');
    for (const name of DOMAIN_FILES) {
      const source = sourcePath(stack, name);
      if (![...tracked].includes(source)) throw new Error(`${stack}/${name} 领域参考不在 Git 跟踪清单`);
      const bytes = readFileSync(resolve(root, ...source.split('/')));
      const expectedHash = name === 'entry' ? DOMAIN_ENTRY_HASHES[stack] : DOMAIN_SOURCE_HASHES[stack][name];
      if (createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw new Error(`${stack}/${name} 领域参考源摘要漂移`);
      result.set(`${stack}:${name}`, { stack, sourcePath: source, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) });
    }
  }
  return result;
}

/** 仅选取已经逐段核对的完整领域规则，不占用公共控制段的旧路由范围。 */
function selected(family, block) {
  const text = block.original.trim().replaceAll('\r\n', '\n');
  if (family.id === 'reference-domain-completion') return block.sourceHeading === '按实际完成情况验收';
  if (family.id === 'reference-domain-display-ownership') {
    return block.sourceHeading === '弹窗工作项与场景解耦' && /^(?:场景工作项和弹窗工作项|\- 场景 `display_layer_planning|\- 弹窗 Work Item 的 `inventory`|\- `SCENE` 与 `DISPLAY_LAYER`|\- 大厅或其他宿主场景|\- 弹窗与宿主需要联合调试)/.test(text);
  }
  if (family.id === 'reference-domain-visual-sequence') {
    return block.sourceHeading === '弹窗工作项与场景解耦' && text.startsWith('```text\n建立全局视觉基线 brief');
  }
  if (family.id === 'reference-domain-visual-schema') {
    return block.sourceHeading === '视觉阶段 Schema' && /^(?:生成式位图的源文件、运行时文件和实际输出 MIME|Evidence Manifest、Implementation Package 与 Work Item 三份 JSON Schema 共用)/.test(text);
  }
  if (family.id === 'reference-domain-visual-gates') {
    return (block.sourceHeading === '视觉生产硬门' && /^(?:V2 必须完成逐 region|生成式位图的每个唯一|V3 `production_contract_audit`|Spine 换皮的)/.test(text))
      || (block.sourceHeading === '任务范围与显式批准' && text.startsWith('视觉生产合同属于 V2'))
      || (block.sourceHeading === '图片优先的确认方式' && text.startsWith('拆解确认后再生成布局'));
  }
  if (family.id === 'reference-domain-visual-admission') {
    return /^(?:正式 Scene\/UI 注册|`highFidelityPrerequisite` 是|SCENE 与 DISPLAY_LAYER 分别绑定|具有视觉依赖的 foundation-only 包必须|任务范围和工程基线完成后，纯工程 foundation-only 包|`global-static-baseline-frozen` 是静态基线|V2→V3 是同一场景 Work Item|视觉验收通过 `visual_validation\.mode`|视觉阶段使用机器枚举|`visualStage` 只能是|全局基线冻结前必须先建立视觉 brief|选择根证据顶层 `workItemId`|效果图还原是当前场景实现|正式代码包按 `SHARED`|\| 阶段 \| 唯一完成状态 \| 下游硬依赖 \||V3 资源验收通过后，V4 直接)/.test(text);
  }
  if (family.id === 'reference-domain-scene-contract') {
    return (block.sourceHeading === '场景还原 schema 与验证命令' && /^(?:效果图 `scene_reconstruction_contract` 的 V1 最低字段|Evidence Manifest 的 `current_stage` 为 V2|V4 的合同还必须声明|根因只使用|场景 V2 不再保留旧式|上述限制针对机器工件|效果图相关 Schema 统一使用)/.test(text))
      || (block.sourceHeading === '视觉阶段 Schema' && /^(?:确认前置文件只能冻结|旧的单数 `visualDecompositionConfirmation`)/.test(text))
      || (block.sourceHeading === '结构化 Schema' && /^(?:`display_layer_planning` 不再支持|场景视觉阶段依次使用)/.test(text));
  }
  if (family.id === 'reference-domain-visual-review') {
    return (block.sourceHeading === '图片优先的确认方式' && text.startsWith('| 任务 | 用户看到的候选 | 内部处理 |'))
      || (block.sourceHeading === '不可绕过约束' && text.startsWith('- 程序化文本纳入实施与审查硬约束'));
  }
  return false;
}

/** 共享完整领域规则；图片合同明确指本栈领域 Schema，不冒充公共控制器输入。 */
export function buildSharedDomainReferences({ sourceRoot, repositoryRoot, trackedFilesByStack } = {}) {
  if (!repositoryRoot) throw new TypeError('领域参考需要目标仓库根');
  const available = readSources(sourceRoot, trackedFilesByStack);
  const documents = [];
  const replacements = [];
  for (const family of DOMAIN_REFERENCE_FAMILIES) {
    const sources = Object.keys(PREFIX).flatMap((stack) => family.files.map((name) => available.get(`${stack}:${name}`)));
    const plan = buildReferenceWorkflow({ id: family.id, title: family.title, sources, canonicalStagesUnified: true,
      reason: '按完整来源区间共享已核实的视觉、显示层或验收领域事实；全局协议由公共控制器维护。',
      canonicalize: (block) => {
        if (!selected(family, block)) return null;
        const original = block.original.trim().replaceAll('\r\n', '\n');
        let canonical = family.id === 'reference-domain-visual-schema'
          ? original.replace('Evidence Manifest、Implementation Package 与 Work Item 三份 JSON Schema 共用', '本栈领域 Evidence Manifest、Implementation Package 与 Work Item JSON Schema 共用') : original;
        if (family.id === 'reference-domain-visual-sequence') {
          canonical = replaceOnce(canonical, '→ 跨场景 INTEGRATION/联合验收 → A4 正式入口（带副作用时进入 F4）', '→ 跨场景 INTEGRATION/联合验收 → 按当前 Work Item 完成集成（受保护副作用按 action.approval 核对）', '视觉序列集成出口');
        }
        if (family.id === 'reference-domain-visual-admission') {
          canonical = canonical.replaceAll('Approval Ledger 原文', '批准记录文字');
          // 视觉资源装配的原生门不应被误用为先验证功能的阻断条件。
          canonical = canonical.replace('正式 Scene/UI 注册、Boot→可见 Scene 入口修改、正式消费可见资产、删除旧视觉实现或声明视觉完成，必须', '正式消费已确认的视觉资产、替换旧视觉实现或声明视觉完成时，必须');
          canonical = canonical.replace('V3 正式资源验收作为正式实现前置', 'V3 正式资源验收作为正式视觉资源装配前置');
          canonical = canonical.replace('V3 正式资源验收作为正式实施前置', 'V3 正式资源验收作为正式视觉资源装配前置');
          canonical = canonical.replaceAll('声明正式入口或可见资源消费等视觉行为', '声明正式视觉资源消费等视觉行为');
          canonical = canonical.replace('各正式单元直接读取所属 Work Item 的 V2/V3 证据', '正式视觉资源装配单元直接读取所属 Work Item 的 V2/V3 证据');
          canonical = canonical.replace('V0/V1 必须先建立全局基线 brief', '公共 V2 内、离开公共 V2 前须建立或复用全局基线 brief（不阻断公共 V1 功能验证）');
          canonical = canonical.replace('V2→V3 是同一场景 Work Item 的阶段推进。', '公共 V3→公共 V4 是同一场景 Work Item 的阶段推进。');
          canonical = canonical.replace('V4 正式实施包进入 `IMPLEMENTING`', '公共 V5 正式组合实施包进入 `IMPLEMENTING`').replace('只有当前 Work Item 的 V4 运行态联合验收证据闭合后', '只有当前 Work Item 的公共 V5 运行态联合验收证据闭合后');
          canonical = canonical.replace('工作流默认沿 V0→V1→V2→V3→V4 和当前全局状态向前推进', '工作项按统一阶段和当前全局状态向前推进');
          canonical = canonical.replace('基础实施完成后按各场景 Work Item 进入 V1；每个 V1 内生成或接收并冻结', '公共 V1 功能验证后各场景进入公共 V2；此视觉阶段生成或接收并冻结');
        }
        if (family.id === 'reference-domain-visual-review' && canonical.startsWith('- 程序化文本纳入实施与审查硬约束')) {
          // 公共视觉审查按项目所选语言覆盖，不能重新引入旧来源的固定五语要求。
          canonical = canonical.replace('必须同时实现英语 `en`、简体中文 `zh-CN`、日语 `ja`、俄语 `ru`、西班牙语 `es`', '默认实现简体中文 `zh-CN`，并实现项目确认的英语 `en` 等其他语言');
        }
        if (family.id === 'reference-domain-visual-admission') canonical = canonical.replace('[`global-visual-baseline-selection.schema.json`](global-visual-baseline-selection.schema.json)', '本栈 `global-visual-baseline-selection.schema.json`');
        if (family.id === 'reference-domain-visual-gates') canonical = canonical.replace('不写入全局 Approval Ledger', '不构成公共控制器的动作批准');
        if (family.id === 'reference-domain-scene-contract' && canonical.startsWith('确认前置文件只能冻结')) {
          const split = canonical.indexOf('\n效果图 Evidence');
          if (split < 0) throw new Error('视觉确认与场景证据边界缺失');
          canonical = `视觉确认前置文件和实际用户确认按[视觉质量专业复核](./reference-orchestration-visual-quality-gate.md)执行。${canonical.slice(split)}`;
        }
        if (family.id === 'reference-domain-scene-contract') canonical = canonical.replace('[控制模型](control-model.md#弹窗工作项与场景解耦)', '[场景与显示层职责](./reference-domain-display-ownership.md)');
        canonical = unifySourceVisualStages(canonical);
        if (family.id === 'reference-domain-visual-admission') canonical = canonical.replace('机器枚举 `V0`、`V2`、`V3`、`V4`、`V5`', '机器枚举 `V0`、`V1`、`V2`、`V3`、`V4`、`V5`').replace('只能是 `V0`、`V2`、`V3`、`V4` 或 `V5`', '只能是 `V0`、`V1`、`V2`、`V3`、`V4` 或 `V5`');
        return { canonical, referenceLinks: [] };
      },
    });
    if (family.id === 'reference-domain-visual-schema') {
      plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n以下字段描述当前技术栈的领域证据合同；公共控制器的工作项、实施包和结果 Schema 以公共控制规范为准。\n\n## ');
    }
    if (family.id === 'reference-domain-visual-sequence') {
      plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n本顺序适用于声明视觉依赖的基础包和视觉任务；纯工程基础包可先按当前工作项完成。示例中的确认枚举属于本栈领域视觉合同，不是公共控制器字段；动作及状态按公共规范执行。\n\n## ');
    }
    if (/\bV[1-5]\b/.test(plan.documents[0].content)) plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n各技术栈统一按 V0–V5 推进；V1 先验证功能，白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。\n\n## ');
    documents.push(...plan.documents);
    replacements.push(...plan.replacements);
  }
  return { documents, replacements, repositoryRoot: resolve(repositoryRoot) };
}

/** 在真实 Markdown 章节内局部替换正文，并保留原有标题锚点。 */
function replaceSection(text, heading, body) {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  if (start < 0 || text.indexOf(marker, start + marker.length) >= 0) throw new Error(`领域参考缺少唯一章节：${heading}`);
  const next = text.indexOf('\n## ', start + marker.length);
  const end = next < 0 ? text.length : next;
  return `${text.slice(0, start)}${marker}\n\n${body}\n${text.slice(end)}`;
}

/** 唯一替换来源句式；遇到上游变化必须重新审查，不能猜测适配。 */
function replaceOnce(text, original, replacement, label) {
  const index = text.indexOf(original);
  if (index < 0 || text.indexOf(original, index + original.length) >= 0) throw new Error(`${label} 的原文缺失或重复`);
  return text.slice(0, index) + replacement + text.slice(index + original.length);
}

/** 在既有公共路由之后纠正本栈旧状态、命令和授权说明，领域字段继续由本栈校验器执行。 */
export function routeNativeControlReferences(text, { stack, sourcePath: source, destination } = {}) {
  if (!PREFIX[stack] || typeof source !== 'string' || typeof destination !== 'string') return { text, transforms: [] };
  const name = DOMAIN_FILES.find((candidate) => source === sourcePath(stack, candidate));
  if (!name) return { text, transforms: [] };
  if (!destination.startsWith('skills/') || destination.split('/').includes('..')) throw new TypeError('领域参考目标必须位于技能目录');
  const link = (target) => posix.relative(posix.dirname(destination), target);
  const protocol = `[当前公共控制协议](${link('skills/app-creator-workflow/references/professional-execution.md')})`;
  const milestones = `[游戏生产里程碑](${link('skills/app-domain-toolkit/references/reference-orchestration-quality-gates.md')})`;
  const workflow = `[公共工作流](${link('skills/app-creator-workflow/references/workflow.md')})`;
  let output = unifySourceVisualStages(text);
  if (name === 'state-gates') {
    output = replaceSection(output, '全局状态', `Work Item 状态、阶段、用户决定、BLOCKED/RETURN 与恢复规则以${protocol}及公共控制器 Schema 为唯一准据；此文件只说明本栈领域证据。`);
    output = replaceSection(output, '三级处置', `本栈视觉校验器将结果分类为 \`repair\`（修复当前事实）、\`revalidate\`（重验受影响证据）或 \`return\`（上游事实失效等须返回的情况）；它们是领域 disposition，而不是控制器命令。需要返回时按${protocol}使用当前 transition 和真实原因、影响范围；恢复点及字段由公共控制器推导。`);
    output = replaceSection(output, '阶段映射', `G0–G3 是${milestones}；工作项统一使用 V0–V5，其中 V1 实现并验证功能，白盒可选，V2–V5 分别对应视觉目标、拆解布局、资源导入和运行验收。实际阶段、状态和迁移使用${protocol}。`);
    output = output.replace('不写入全局 Approval Ledger', '不构成公共控制器的动作批准');
  } else if (name === 'control-model') {
    output = replaceSection(output, 'A0-A6 动作等级', `本标题仅保留原资料引用定位，不代表当前控制器提供 A0–A6 字段或动作等级。本栈编辑器、资源、平台与项目对象的真实操作限制按原生能力执行；受保护副作用与具体动作批准以${protocol}和 Work Item 的 action.approval 为准，不定义第二套全局动作等级或审批记录。`);
    output = replaceSection(output, 'F0-F4 唯一语义', `公共 F0–F4、验证证据和完成条件以${protocol}为唯一准据；本参考后续只补充视觉、资源和显示层的领域事实。`);
    const execution = output.indexOf('## 执行优先与证据收敛');
    const completion = output.indexOf('### 按实际完成情况验收', execution);
    const disposition = output.indexOf('### 前进优先与三级处置', completion);
    const task = output.indexOf('## 任务范围与显式批准', disposition);
    if (execution < 0 || completion < 0 || disposition < 0 || task < 0) throw new Error('领域执行、验收与处置章节边界缺失');
    output = `${output.slice(0, execution)}## 执行优先与证据收敛\n\n任务范围、实施计划和验证按${protocol}执行；实际完成情况与必要领域证据见以下参考。\n\n${output.slice(completion, disposition)}### 前进优先与三级处置\n\n本栈视觉校验器的 repair/revalidate/return 是领域 disposition，不是公共控制器命令；返回及恢复按${protocol}执行。\n\n${output.slice(task)}`;
    const start = output.indexOf('## 任务范围与显式批准');
    const extractedVisual = output.indexOf('> 通用工作流步骤见[完整规范](', start);
    const visual = extractedVisual >= 0 ? extractedVisual : output.indexOf('视觉生产合同属于 V3、V4、V5 的领域证据', start);
    if (start < 0 || visual < 0) throw new Error('领域任务范围与视觉合同边界缺失');
    output = `${output.slice(0, start)}## 任务范围与显式批准\n\n任务范围、用户决定和受保护动作统一按${protocol}执行；本栈视觉合同仍需满足下面的字段和实际证据要求。\n\n${output.slice(visual)}`;
    const oldApproval = '已完成的 A4-A6 副作用批准只覆盖其明确对象、阶段、模块、文件范围和动作等级；这些内容变化时创建新审批，旧记录只读保留。无副作用本地集成和普通任务内迭代不需要审批记录。';
    output = replaceOnce(output, oldApproval, `受保护副作用的实际对象、动作和明确批准按${protocol}核对。`, '旧动作等级批准');
  } else if (name === 'simplified-workflow') {
    output = replaceSection(output, 'CLI 输出', `当前状态与命令输出以${protocol}和公共控制器实际输出为准。对象阶段使用 \`visual-stage --to <V1|V2|V3|V4|V5>\`，工作项状态迁移使用 \`transition\`；\`status\` 与 \`check\` 只读，\`run\` 不执行专业工作或测试。`);
    const oldCommand = 'node <skill-dir>/scripts/workflow-control.mjs transition --work-item <work-item> --to REVIEW --visual-stage V3';
    const command = 'node .agents/skills/app-workflow-control/scripts/workflow-control.mjs visual-stage --repo <项目路径> --work-item <工作项路径> --to V4';
    output = replaceOnce(output, unifySourceVisualStages(oldCommand), command, '视觉阶段 CLI');
    const oldProgress = 'V3 证据闭合后直接进入 V4 并激活正式实施包；V4 实施及运行证据闭合后提交 `--visual-stage-state v4-runtime-integration-candidate`，再进入 `VALIDATING → PASSED → COMPLETE`。阶段入口使用的全局状态与命令参数以控制面当前校验结果为准，禁止直接改状态字段跨过确认门。';
    output = replaceOnce(output, unifySourceVisualStages(oldProgress), `V4 实际资源验收通过后，按${protocol}显式进入 V5；V5 使用本阶段独立实施包、实际运行结果和证据，不能复用 V4 完成状态。后续状态迁移以当前 Work Item 和公共控制器实际校验为准，不直接改写状态字段。`, 'V4 到 V5 说明');
    const oldSteps = 'V2→V3→V4 在同一场景 Work Item 内通过显式阶段入口推进。每个入口默认写入 `in-progress`。V3 正式资源验收和 V2 证据闭合后，直接激活 V4 正式实施；V4 运行态证据闭合后提交 `v4-runtime-integration-candidate`。视图直接消费真实视觉阶段，实施包状态不能跳过 V2/V3 前置。';
    output = replaceOnce(output, unifySourceVisualStages(oldSteps), `V1 先验证功能，白盒可选；V2→V3→V4→V5 在同一场景 Work Item 内按${protocol}相邻推进。每阶段保留各自确认、实施结果及实际证据；V4 与 V5 使用独立实施包和执行闭环，不能跳过视觉目标和布局前置。`, '视觉步骤说明');
    const oldFields = '但 `sceneStepId` 和 `sceneStepLabel` 必须为 `null`';
    output = replaceOnce(output, oldFields, '但当前视觉阶段字段缺失', '场景步骤投影');
    output = output.replace(unifySourceVisualStages('也不替代 `globalState`、G0-G3、V0/V1/V2/V3/V4、A0-A6、F0-F4、审批账本、证据哈希或任何 Schema'), `其状态和实际输出以${protocol}及当前公共 Schema 为准`);
    output = output.replace('| 步骤 ID | 用户步骤 | 内部阶段 | 关键产物 |', '| 领域步骤（非控制器字段） | 用户步骤 | 视觉阶段 | 关键产物 |');
    const oldApproval = '涉及外部写入、付费、真机、破坏性或外部删除、发布副作用的 A4-A6 操作仍按明确对象和影响逐项审批，无副作用本地 A4 不因等级标签额外审批；';
    output = replaceOnce(output, oldApproval, '外部写入、付费、真机、破坏性操作和发布须核对用户对具体动作和目标的明确授权，普通本地执行不因等级标签另设审批；', '旧门禁批准范围');
  }
  output = routeSharedControlText(output, { name, protocol, workflow });
  return { text: output, transforms: output === text ? [] : [`route-native-${name}-to-public-control`] };
}
