import path from 'node:path';

const PUBLIC_EXECUTION_PATH = 'skills/app-creator-workflow/references/professional-execution.md';
const PREFIXES = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const OLD_PUBLIC_COMMANDS = /\b(?:preflight|diff-audit|evidence-check|prepare-approval|delegate-check|parallel-check)\b|`(?:route|advance|handoff|approve)`/i;

/** 按源文件职责分类，避免把技术栈原生 preflight 一律误判为旧公共命令。 */
function classifySource(stack, sourcePath) {
  const normalized = String(sourcePath ?? '').replaceAll('\\', '/').replace(/^\.\//, '');
  const prefix = PREFIXES[stack];
  if (prefix) {
    const skillRoot = `skills/${prefix}-`;
    if (normalized === `${skillRoot}game-audio/SKILL.md`) return 'audio-skill';
    if (normalized === `${skillRoot}gameplay-development/SKILL.md`) return 'gameplay-skill';
    if (normalized === `${skillRoot}game-artifact-cleanup/SKILL.md`) return 'cleanup-skill';
    if (normalized === `${skillRoot}game-release/SKILL.md`) return 'release-skill';
    if (normalized === `${skillRoot}game-orchestrator/references/delivery-artifacts.md`) return 'delivery-artifacts';
    if (normalized === `${skillRoot}game-workflow-control/SKILL.md`) return 'control-entry';
    if (normalized === `${skillRoot}game-workflow-control/references/control-model.md`) return 'control-model';
    if (normalized === `${skillRoot}game-workflow-control/references/schemas.md`) return 'control-schemas';
  }
  if (stack === 'unity' && normalized === 'unity-game-workflow-control/SKILL.md') return 'control-entry';
  return null;
}

/** 计算从生成文件到单一公共规范的 Markdown 相对链接。 */
function publicHref(destination) {
  const normalized = String(destination ?? '').replaceAll('\\', '/');
  if (!normalized || normalized.split('/').includes('..')) throw new TypeError('destination 必须是仓库内相对路径');
  return path.posix.relative(path.posix.dirname(normalized), PUBLIC_EXECUTION_PATH) || path.posix.basename(PUBLIC_EXECUTION_PATH);
}

/** 替换命中旧公共协议的整段，要求只在文件职责已确认时操作。 */
function replaceParagraphs(text, matcher, replacement, { minimum = 1, maximum = Infinity } = {}) {
  const blocks = text.split(/(\r?\n[ \t]*\r?\n)/);
  let count = 0;
  for (let index = 0; index < blocks.length; index += 2) {
    if (!matcher.test(blocks[index])) continue;
    count += 1;
    if (count > maximum) throw new Error(`公共协议段落出现重复，拒绝自动迁移：${count}`);
    blocks[index] = replacement;
  }
  if (count < minimum) throw new Error(`缺少预期公共协议段落，拒绝静默迁移：${count}`);
  return { text: blocks.join(''), count };
}

/** 对已确认的旧公共字面句做唯一替换，避免重写承载专业步骤的整段列表。 */
function replaceExactOnce(text, original, replacement, label) {
  const first = text.indexOf(original);
  if (first < 0 || text.indexOf(original, first + original.length) >= 0) {
    throw new Error(`${label}缺失或重复，拒绝静默迁移`);
  }
  return text.slice(0, first) + replacement + text.slice(first + original.length);
}

/** 合并同一 Markdown 连续生成的公共导航占位，并保留首个列表标记和所有专业步骤。 */
function coalesceSharedPlaceholders(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const output = [];
  let inFence = false;

  const bodyOf = (line) => line.replace(/\r?\n$/, '');
  const placeholderOf = (line) => {
    const match = bodyOf(line).match(/^([ \t]*(?:>\s*)?(?:(?:\d+[.)]|[-*+])\s+)?)(通用工作流步骤见\[完整规范\]\(([^)\r\n]+)\)\。)[ \t]*$/);
    return match ? { href: match[3] } : null;
  };
  const isBlank = (line) => /^[ \t]*(?:\r?\n)?$/.test(line);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const body = bodyOf(line);
    if (/^[ \t]*(?:```|~~~)/.test(body)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }
    const first = inFence ? null : placeholderOf(line);
    if (!first) {
      output.push(line);
      continue;
    }

    // 空行只在两条相同 href 的占位之间吞并，遇到原生步骤或不同链接便原样保留。
    let probe = index + 1;
    let lastMerged = index;
    while (probe < lines.length) {
      while (probe < lines.length && isBlank(lines[probe])) probe += 1;
      const next = probe < lines.length ? placeholderOf(lines[probe]) : null;
      if (!next || next.href !== first.href) break;
      lastMerged = probe;
      probe += 1;
    }

    output.push(line);
    index = lastMerged;
  }
  return output.join('');
}

/** 在限定专业文件中以当前控制合同替换退役全局 CLI 语义。 */
function routeSpecialist(text, role, href) {
  const reference = `[当前公共专业执行规范](${href})`;
  let output = text;
  if (role === 'audio-skill') {
    const boundary = replaceParagraphs(output, /^控制面边界：/m, '', { minimum: 1, maximum: 1 });
    const routed = replaceParagraphs(boundary.text, /\bpreflight\b/i,
      `Work Item 范围、实施结果、证据门、验证与用户确认统一按${reference}执行；本技能继续维护本栈音频设计和运行约束。`, { minimum: 1, maximum: 1 });
    output = routed.text.replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
  } else if (role === 'gameplay-skill') {
    const intro = replaceParagraphs(output, /全局阶段、视觉硬门和场景前置以[\s\S]*?本领域只负责/m,
      `全局阶段、V0–V4、状态、执行结果与证据门统一按${reference}执行。本领域只负责玩法规则、状态、交互和动态验收；场景仍使用同一 Work Item 的 V1→V2→V3→V4 链，V2 拆解和布局分别确认。`, { minimum: 1, maximum: 1 });
    output = intro.text;
    const boundary = replaceParagraphs(output, /^控制面边界：/m, '', { minimum: 1, maximum: 1 });
    const routed = replaceParagraphs(boundary.text, /\bpreflight\b[\s\S]*?\b(?:diff-audit|evidence-check)\b/i,
      `Work Item 范围、实际实施结果、证据与阶段迁移统一按${reference}执行；本技能继续维护本栈玩法规则、状态、交互和动态验收。`, { minimum: 1, maximum: 1 });
    output = routed.text.replace(/行为或验收变化建立 Change Request 并记录用户决定。/,
      `行为或验收变化更新当前 Work Item 的目标、范围与验收依据；确有用户取舍时按${reference}记录决定。`)
      .replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
  } else if (role === 'cleanup-skill') {
    const routed = replaceParagraphs(output, /以 \[`[^\]]+`\]\([^\n]+\) 为唯一任务范围[\s\S]*?状态迁移；不建立第二套状态机[^\n]*/i,
      `清理范围、路径所有权、验证证据与状态迁移统一按${reference}执行；本技能只维护清理对象判定、引用保护和本栈资源边界。`, { minimum: 1, maximum: 1 });
    output = routed.text;
    const approval = replaceParagraphs(output, /用户要求清理时，[\s\S]*?授权只覆盖批准清单和对应内容身份。/i,
      '用户要求清理时，在 Work Item 允许路径内处理已确认的本地产物，不重复请求普通本地操作批准。阶段收尾只处理本任务临时文件；历史记录、其他任务和共享目录不自动纳入。外部写入、设备、签名、上传、付费、破坏性操作或发布等具体副作用，须把精确动作和目标绑定到 Work Item 的明确用户批准。', { minimum: 1, maximum: 1 });
    output = approval.text;
    output = output.replace(/^4\. \*\*执行前复核\*\*：[^\r\n]*$/m,
      '4. **执行前复核**：按 Work Item 的允许/禁止路径核对清单，运行公共控制 CLI `check`；逐对象确认实际动作、引用和写入占用。公共控制器没有清理专用动作预检命令；受保护副作用必须由 Work Item 绑定精确用户批准。删除前重新检查引用，并用内部内容摘要防止并发写入后误删；这是删除事务保护，不是验收校验，不要求工件填写 SHA。清单生成后内容或依赖变化时跳过该对象并重新判定。');
    output = output.replace('按既有收尾规则提交本任务差异', '按当前 Work Item 报告本任务差异');
  } else if (role === 'release-skill') {
    output = replaceExactOnce(output,
      '共享基础和关键玩法流证据只能证明各自范围；G3/release 必须执行完整渠道/平台矩阵，不得自动发起真机验收。',
      '共享基础和关键玩法流证据只能证明各自范围；发布 Work Item 应覆盖实际目标渠道/平台矩阵，并以本栈发布清单确认对应项，不得自动发起真机验收。',
      '发布平台矩阵说明');
    output = replaceExactOnce(output,
      '5. 在平台矩阵和发布清单登记候选包、完成项、阻断项、风险与建议，向总控提交只读 F2 结论；只有总控可写任务 `review.md`。F3 不自动合并或发布，未获 G3 明确放行不得声称可以提交或已经上架。',
      '5. 在平台矩阵和发布清单登记候选包、完成项、阻断项、风险与建议。将实际候选包、构建/打包/签名结果及真实命令输出关联到当前 RELEASE Work Item 的 Evidence Manifest。外部提交、上传或发布前，按当前 Work Item 的 action.approval 核对用户明确批准的目标与动作；复用已覆盖同一目标和动作的真实用户消息引用，不重复索要相同批准。F4 只按当前 Work Item 和实际结果核对发布门禁；工作项完成不等于已提交或已上架，未执行或缺少证据时不得声称完成。',
      '旧发布完成步骤');
  }
  return output;
}

/** 替换纯公共交付/控制章节，同时留下其余领域文件、API 和证据规则。 */
function routeReference(text, role, href, destination) {
  const reference = `[当前公共专业执行规范](${href})`;
  if (role === 'delivery-artifacts') {
    const heading = /\n## 产物(?:存放|落盘)/;
    const boundary = heading.exec(text);
    const end = boundary?.index ?? -1;
    if (end < 0 || !OLD_PUBLIC_COMMANDS.test(text.slice(0, end))) throw new Error('交付参考缺少已知旧公共协议章节，拒绝迁移');
    let output = `${text.slice(0, text.indexOf('\n') + 1)}\n公共 Work Item、实施结果、真实证据、拷问、人工确认、受保护动作和 Git 验证规则统一见${reference}。下文只保留本技术栈的产物路径与领域工件职责。${text.slice(end)}`;
    const logStart = output.indexOf('\n## 留痕');
    if (logStart >= 0) {
      output = `${output.slice(0, logStart)}\n\n## 留痕\n\n公共状态、返工、证据和人工作业记录只按${reference}处理。清单中的领域工件仅按实际需要创建；被引用的实际资源、规格、结果和证据必须保留完整依赖。未经明确请求不提交或推送 Git，也不自动回滚、合并、发布或清理共享工作区。\n`;
    }
    return output;
  }
  if (role === 'control-entry') return routeControlEntry(text, href);
  if (role === 'control-model') return routeControlModel(text, href, destination);
  if (role === 'control-schemas') return routeControlSchemas(text, href);
  return text;
}

/** 将旧工作流入口的命令清单改为真实 CLI 路由，保留专业协作段落。 */
function routeControlEntry(text, href) {
  const link = `[当前公共专业执行规范](${href})`;
  let output = text.replace(/^- 需要 A3 委派、执行或证据：[\s\S]*Schema。$/m,
    `- 需要实施结果或证据：使用${link}中的当前公共 Schema 与 CLI；本栈专用验收合同仍按各自领域参考读取。`);
  output = output.replace(/^- \[Execution State schema\]\(schemas\/execution-state\.schema\.json\)、\[单元 Result schema\]\(schemas\/execution-unit-result\.schema\.json\)：当前实施计划、执行批次和验收命令结果的文件合同。$/m,
    `- Unity 专用执行扩展与单元 Result Schema：约束 Unity 领域报告字段；公共 Work Item、状态、Result 和 CLI 以${link}及公共控制面为准。`);
  if (output.includes('## 稳定 CLI')) {
    const start = output.indexOf('## 稳定 CLI');
    const end = output.indexOf('\n## 参考资料', start);
    if (end < 0) throw new Error('Unity 稳定 CLI 章节缺少专业参考边界，拒绝迁移');
    const replacement = `## 稳定公共 CLI\n\n公共控制命令、参数和实际状态语义统一见${link}。本文件保留的 Unity Editor、资产、布局和项目专用合同仍按各自领域参考执行；它们不是第二套全局状态机。\n`;
    output = `${output.slice(0, start)}${replacement}${output.slice(end)}`;
    output = replaceParagraphs(output, /^详细状态、门、Schema、视觉合同和返工规则分别见/,
      `公共状态、门禁与返工规则统一见${link}；Unity 专用 Editor、资产和布局验证仍见本节所列技术参考。`, { minimum: 0 }).text;
    return output;
  }
  const marker = '## 代理入口';
  const start = output.indexOf(marker);
  const end = output.indexOf('\n## 领域协作', start);
  if (start < 0 || end < 0 || !OLD_PUBLIC_COMMANDS.test(output.slice(start, end))) throw new Error('旧代理入口/高级诊断章节缺失，拒绝静默迁移');
  output = `${output.slice(0, start)}## 当前公共控制入口\n\n唯一公共 CLI 的实际命令、参数与状态见${link}。本控制参考只补充本栈技术约束，不再提供旧的路线诊断、动作预检、差异审计、证据检查或审批 CLI。\n\n${output.slice(end + 1)}`;
  output = replaceParagraphs(output, /^详细状态、门、Schema、视觉合同和返工规则分别见/,
    `公共状态、门禁与返工规则统一见${link}；本栈视觉、资产和运行合同由对应领域参考维护。`, { minimum: 0 }).text;
  return output;
}

/** 把混合控制模型中的旧命令段落换成当前公约，保留后续栈专用合同。 */
function routeControlModel(text, href, destination) {
  const reference = `[公共 Work Item、状态与结果协议](${href})`;
  const destinationDir = path.posix.dirname(String(destination ?? '').replaceAll('\\', '/'));
  const implementationSchemaHref = path.posix.relative(destinationDir, 'skills/app-workflow-control/schemas/implementation-package.schema.json');
  const implementationExecutionHref = path.posix.relative(destinationDir, 'skills/app-workflow-control/references/implementation-execution.md');
  let output = text.replace(/Approval Ledger/g, '独立审批账本');
  const replacements = [
    [/^默认闭环为：/, `公共实施、差异审查、验证和修复/重验闭环以${reference}为准；本参考只保留本技术栈额外的对象与证据要求。`],
    [/^`route` 应优先给出/,
      `全局状态与恢复只通过当前控制器 transition 命令；RETURN 使用 --reason 和 --affected-scope，恢复使用 --return-resolution，恢复点由影响范围推导。门禁失败先原地修复或重验；只有上游事实或范围真实变化时才回退。详情见${reference}。`],
    [/^产品、视觉、架构、预算、合规和数据边界取舍属于/,
      `产品、视觉、架构、预算、合规和数据边界取舍属于用户决定，只关联当前 Work Item、权威工件或拷问记录。精确批准只针对用户明确批准的具体受保护动作，并在 Work Item 的 action.approval 绑定对象、动作和真实用户消息引用；控制器只记录/校验，不替用户批准或执行副作用。详情见${reference}。`],
    [/^`route` 依据确定性规则输出/,
      `动作风险描述不能创建第二套全局状态或 CLI。状态、门禁和受保护动作的公共规则统一见${reference}；本参考中的视觉、资源和运行条款只定义相应技术栈对象的额外检查。`],
    [/^进入 A3 `IMPLEMENTING` 时创建/,
      `进入 IMPLEMENTING 时，当前公共控制器在 evidenceRoot 内建立 execution-state.json；执行者实际运行实施包命令后提交当前 Execution Result，公共 unit-check 只校验结果并更新执行状态，不运行命令。实施单元顺序、并行组和依赖以[Implementation Package Schema](${implementationSchemaHref})及[控制器实施执行参考](${implementationExecutionHref})为准；同一并行组结果收齐后才激活依赖组。旧的委派批次、差异审计和独立证据检查命令不属于当前协议。场景/显示层实现仍必须按本参考后续技术段落消费其 Work Item 的 V2/V3 事实；公共流程细节见${reference}。`],
  ];
  for (const [pattern, replacement] of replacements) {
    const routed = replaceParagraphs(output, pattern, replacement, { minimum: 1, maximum: 1 });
    output = routed.text;
  }
  if (!output.includes(reference)) throw new Error('控制模型没有接入当前公共执行规范');
  return output;
}

/** 移除退役公共 schema/工件目录和命令说明，保留本栈视觉 schema 内容。 */
function routeControlSchemas(text, href) {
  const reference = `[公共 Schema、CLI 与结果合同](${href})`;
  let output = text;
  const catalogStart = output.indexOf('机器文件使用 UTF-8 JSON。');
  const visualStart = output.indexOf('## 视觉阶段 Schema', catalogStart);
  if (catalogStart < 0 || visualStart < 0) throw new Error('旧 Schema 目录边界缺失，拒绝迁移');
  const catalog = output.slice(catalogStart, visualStart);
  const retained = catalog.split(/\r?\n/).filter((line) => /^- \[(?:视觉|项目美术|全局视觉|运行美术)/.test(line));
  output = `${output.slice(0, catalogStart)}公共 Work Item、Implementation Package、Execution Result、Evidence Manifest、Human Review、拷问和发布结果 schema 统一见${reference}。本目录以下仅保留本技术栈的视觉/领域合同；任何旧全局 Schema 不得作为当前 CLI 输入。${retained.length ? `\n\n${retained.join('\n')}` : ''}\n\n${output.slice(visualStart)}`;
  output = output.replace(/建议项目布局：[\s\S]*?```[\s\S]*?```/,
    `当前控制器默认记录路径：\n\n\`\`\`text\n.workflow-control/\n  work-items/<workItemId>.json\n  implementation-packages/<workItemId>.json\n  evidence/<workItemId>/execution-state.json\n  evidence/<workItemId>/<result>.json\n\`\`\`\n\n领域视觉产物可按本参考的后续合同另存，并通过当前 Work Item 的有效引用关联。`);
  output = replaceParagraphs(output, /^Work Item 保存用户原始请求/, `公共 Work Item、门禁、路径范围、拷问决定与具体副作用批准统一按${reference}执行；此处本栈专用视觉与资源证据字段仅约束各自领域工件，不新增全局状态、授权账本或 CLI。`).text;
  output = replaceParagraphs(output, /^所有动作字段使用固定/,
    `具体受保护动作、目标和批准消息只按 Work Item 的 action.approval 记录，规则见${reference}。`).text;
  output = replaceParagraphs(output, /^操作 pending 与 Approval Ledger/,
    `当前公共控制器不使用独立批准台账或 pending CLI；高影响用户确认规则见${reference}。`).text;
  output = output.replace(/^Work Item 与 Approval Ledger 使用排序后的非空 `moduleIds`。/m,
    `各领域身份、资源与视觉合同继续遵守本栈下文的专用约束；全局模块范围和执行计划由${reference}定义。`);
  output = output.replace(/A0-A2 Delegation Package[\s\S]*?单独委派不得放行。/,
    `公共实施单元的所有权、结果提交与顺序以${reference}为准。`);
  output = output.replace(/A0-A2 Delegation Package 禁止实施单元字段；串行 A3 使用 `delegate-check`，并行 A3 必须通过保存于 `delegations\/batches\/` 的完整不可变批次执行 `parallel-check`，单独委派不得放行。/,
    `公共实施单元的所有权、结果提交与顺序以${reference}为准。`);
  output = replaceParagraphs(output, /^`execution-state\.json` 是当前阶段实施顺序的可执行状态合同/,
    `当前公共控制器只维护绑定 Work Item 与实施包的单元顺序状态：进入 IMPLEMENTING 时在 evidenceRoot 创建 execution-state.json，每个单元的实际命令结果由执行者记录，unit-check 校验当前结果并更新顺序。Result 与执行状态的公共字段以${reference}及 app-workflow-control 的 Schema/运行时为准；此领域参考不定义额外状态字段、并行批次或委派门。`, { minimum: 1, maximum: 1 }).text;
  const resultParagraph = replaceParagraphs(output, /^Execution Unit Result 绑定/,
    `Execution Result、Evidence Manifest 和当前执行顺序只使用${reference}中的公共合同。`, { minimum: 0 });
  output = resultParagraph.text;
  output = replaceParagraphs(output, /^任务内更新未完成单元/,
    `实施包路径、验收命令或结果变化时，按${reference}中的当前合同重新运行受影响门；公共控制器不要求额外摘要或历史批次。`, { minimum: 0 }).text;
  output = replaceParagraphs(output, /^构造 Parallel Delegation Batch/,
    `当前公共控制器没有并行委派批次命令；专业协作边界与单元所有权以${reference}及本栈技能为准。`, { minimum: 0 }).text;
  output = output.replace(/方法变化必须由绑定区域、工作项、候选版本、用户原文和时间的 `?ACCEPTED`? Change Request 支持。/,
    '方法变化必须由当前 Work Item 记录的真实用户决定支持；区域、工作项、候选版本、用户原文和时间仍记在对应视觉领域记录中。');
  output = output.replace(/`(?:delegate-check|parallel-check|evidence-check|prepare-approval|preflight|route)`/g, '公共执行规范');
  return output;
}

/** 删除已由唯一公共协议承接的权限复述，原生 API 和混合专业步骤始终留在技能正文。 */
function routeCommonExecutionParagraphs(text) {
  const blocks = text.split(/(\r?\n[ \t]*\r?\n)/);
  let count = 0;
  let fenced = false;
  for (let index = 0; index < blocks.length; index += 2) {
    const block = blocks[index];
    const delimiters = (block.match(/^\s*(?:```|~~~)/gm) ?? []).length;
    const isPolicy = /^(?:控制面边界：|本领域可提议|\[`?\$?[^\]]*workflow-control`?\]\([^)]*\) 是唯一的全局状态)/.test(block.trimStart());
    const hasNativeRequirement = /\b(?:Creator|AssetDB|AudioMixer|Importer|Widget|Object3D|GLTFLoader)\b|\.meta|UUID|生产参数|音频事件/.test(block);
    if (!fenced && !delimiters && isPolicy && !hasNativeRequirement && block.length < 700) { blocks[index] = ''; count += 1; }
    if (delimiters % 2) fenced = !fenced;
  }
  return { text: blocks.join(''), count };
}

/** 返回已路由文本及独立公共引用，供迁移账本记录，绝不混入 sharedReferences。 */
export function applyProfessionalRouting(text, { stack, sourcePath, destination } = {}) {
  if (typeof text !== 'string') throw new TypeError('text 必须是字符串');
  const role = classifySource(stack, sourcePath);
  let output = text;
  const transforms = [];
  let publicExecutionRef;
  if (role) {
    const href = publicHref(destination);
    publicExecutionRef = PUBLIC_EXECUTION_PATH;
    output = role.endsWith('-skill')
      ? routeSpecialist(output, role, href)
      : routeReference(output, role, href, destination);
    if (output !== text) transforms.push(`route-${role}-to-public-execution`);
  }

  // 公共抽取对所有 Markdown 都会运行，因此精确折叠其占位，不受专业角色白名单限制。
  const isMarkdown = [sourcePath, destination]
    .some((value) => String(value ?? '').toLocaleLowerCase('en-US').endsWith('.md'));
  if (isMarkdown) {
    if (/^skills\/[^/]+\/(?:SKILL|ADAPTER)\.md$/.test(String(destination ?? ''))) {
      const policy = routeCommonExecutionParagraphs(output);
      if (policy.count) { output = policy.text; publicExecutionRef = PUBLIC_EXECUTION_PATH; transforms.push('use-single-public-execution-contract'); }
    }
    const coalesced = coalesceSharedPlaceholders(output);
    if (coalesced !== output) transforms.push('coalesce-shared-workflow-placeholders');
    output = coalesced;
  }
  const result = { text: output, transforms };
  if (publicExecutionRef) result.publicExecutionRef = publicExecutionRef;
  return result;
}
