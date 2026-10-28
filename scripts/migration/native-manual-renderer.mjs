import path from 'node:path';
import { buildNativeTargets, collectNativeHeadingAnchors, normalizeNativeHeadingFragment, resolveNativeFragment } from '../../skills/app-skill-runtime/native-contracts.mjs';
import { unifySourceVisualStages } from './unified-stage-text.mjs';

export { buildNativeTargets, collectNativeHeadingAnchors, normalizeNativeHeadingFragment, resolveNativeFragment };

/** 将 Flutter 原生材料中的草图专用规则限定在已选择草图的路线，避免形成公共必经门。 */
export function adaptFlutterOptionalSketch(text) {
  const replacements = [
    ['在生产 Flutter 骨架中实现中性、可测试的页面结构。此 skill 只负责草图实现、结构证据和独立审阅；', '仅在按风险选择 Code Sketch 时，在生产 Flutter 骨架中实现中性、可测试的页面结构；直接实现的功能无需草图。此 skill 只负责草图实现、结构证据和独立审阅；'],
    ['F2：只读检查被分配的专业事实；UI 变化才检查语义合同、Code Sketch、冻结目标、资产、测量和同视口 parity。', 'F2：只读检查被分配的专业事实；UI 变化检查功能语义、已确认目标和适用资产与测量，Code Sketch 仅在选用时检查，完整同视口 parity 仅在 exact 时要求。'],
    ['需要资产时调用 `flutter-asset-atlas`；随后把同一 layout-spec 升级为 `phase: fidelity`，在同一骨架还原并进入独立 Visual QA。', '需要资产时调用 `flutter-asset-atlas`，在同一骨架完成正式组合；仅明确要求 exact 时将 layout-spec 升级为 `phase: fidelity`。截图由用户检查。'],
    ['Code Sketch Review 通过后才生成、评审并由用户冻结高保真目标图。', '选择草图路线时，完成 Code Sketch Review 后再交接；其他路线直接以 V1 实际功能验证和页面语义进入 V2，由用户确认视觉目标。'],
    ['完成资产拆解和确认后，把同一 `layout-spec.yaml` 升级为 `phase: fidelity`；在同一 Flutter 骨架上正常重构实现，禁止用 `Stack/Positioned` 覆盖旧草图凑像素。', '完成资产拆解和确认后在同一 Flutter 骨架上实现；仅明确要求 exact 时将同一 `layout-spec.yaml` 升级为 `phase: fidelity`，禁止用 `Stack/Positioned` 覆盖旧草图凑像素。'],
    ['最终通过 fidelity validator、实际 Widget 关系测量、target/Flutter 同视口截图 parity 和独立 Visual QA。validator 只证明规格结构与元数据，不证明实际视觉一致。', '最终通过实际 Widget 关系和功能验证，由用户检查截图；仅明确要求 exact 时执行 fidelity validator 和完整同视口 parity。validator 只证明规格结构与元数据，不证明实际视觉一致。'],
    ['仅在 Code Sketch Review 通过后生成页面目标图。高保真目标是最终视觉来源，但不能静默改变已审语义合同、状态、导航、滚动、断点、无障碍或 ownership。', 'V1 实际验证功能和页面语义后进入 V2 目标设计；白盒或 Code Sketch 按风险选择，仅选用草图路线时需要相应审阅。视觉目标须由用户确认，不能静默改变已验证语义、状态、导航、滚动、断点、无障碍或 ownership。'],
    ['已审页面语义合同、Code Sketch Level 与 Code Sketch Review。', 'V1 已验证的页面功能与语义合同；仅使用草图路线时提供 Code Sketch Level 与审阅结果。'],
    ['`phase: sketch` 的 `layout-spec.yaml`、外部 spec hash、关系测试和风险需要的截图证据。', '适用的页面布局合同与真实关系测试；`phase: sketch` 仅表示布局关系数据，不要求草图画面。需要截图时由用户检查。'],
    ['高风险/核心/探索页安排与 producer 不同的只读 Effect Image Reviewer，检查任务层级、状态、可读性、无障碍、系统区域和全局方向。', '高风险/核心/探索页提供任务层级、状态、无障碍和系统区域的检查要点；由用户检查效果图，未经明确授权不得自动分析截图。'],
    ['将冻结目标与已审语义合同/layout-spec(sketch)逐项回对。若范围、状态、导航语义、滚动 owner、断点、无障碍或 data/UI/asset ownership 改变，返回 UX/UI 与 Code Sketch 阶段更新并独立重审。', '将冻结目标与已验证语义及适用布局合同回对。范围、状态、导航、滚动 owner、断点、无障碍或 ownership 变化时更新受影响功能并重验；仅草图路线更新草图审阅。'],
    ['将同一 layout-spec 升级 `phase: fidelity` 后在同一生产 Flutter 骨架高保真还原，并执行 target/Flutter parity 与独立 Visual QA。', '在同一生产 Flutter 骨架完成正式实现和可用性验收；仅明确要求 exact 时将同一 layout-spec 升级 `phase: fidelity` 并执行完整 target/Flutter parity。'],
    ['不得在 Code Sketch Review 前生成页面目标；', '不得把未实际验证的功能声称为通过；'],
    ['先以 `phase: sketch` 表达语义结构与关系证据；冻结高保真目标后把同一文件升级为 `phase: fidelity`。', '以 `phase: sketch` 表达语义结构与关系证据，不要求草图画面；仅明确要求 exact 时把同一文件升级为 `phase: fidelity`。'],
    ['运行 validator、实际 Widget 测量测试、target/Flutter 同视口截图复核和独立 Visual QA。validator 只证明 schema、中心复算、delta、容差和证据元数据，不证明实际视觉一致。', '运行适用 validator 和实际 Widget 测量测试；截图由用户检查，未经明确授权不得自动分析。仅 exact 模式要求完整同视口 parity。validator 不证明实际视觉一致。'],
  ];
  return replacements.reduce((result, [before, after]) => result.replaceAll(before, after), text)
    // 链接在原生手册重定位前后路径不同，保留原链接并统一其适用条件。
    .replace(/高保真目标冻结并与语义合同回对后，参考 (\[fidelity 模板\]\([^)]+\)) 升级同一文件，补充 target↔Flutter `critical_alignments` 与 `parity_cases`。/g,
      '明确要求 exact 且目标已确认时，参考 $1 升级同一文件，补充 target↔Flutter `critical_alignments` 与 `parity_cases`；默认可用性模式不强制完整矩阵。');
}

/** 来源链接仍指向旧标题时，仅在改写后的标题真实存在时重定向锚点。 */
function resolveMigratedFragment(target, fragment, context) {
  try { return resolveNativeFragment(target, fragment, context); }
  catch (error) {
    const shifted = fragment.replace(/\bv([1-4])\b/g, (_match, number) => `v${Number(number) + 1}`);
    if (shifted === fragment) throw error;
    try { return resolveNativeFragment(target, shifted, context); }
    catch { throw error; }
  }
}

/** 消除已审阅的旧流程禁令，并将来源视觉步骤统一到 V0–V5。 */
export function adaptNativeFunctionFirst(text, { stack } = {}) {
  let output = unifySourceVisualStages(text)
    .replaceAll('场景仍使用同一 Work Item 的 V2→V3→V4→V5 链，V3 拆解和布局分别确认。', '场景按 V0–V5 推进；V1 验证功能，V3 的拆解和布局分别确认。')
    .replaceAll('V3 前的灰盒或视觉样片必须与正式运行链隔离，不得注册正式入口或实现正式业务逻辑；', 'V1 可按已授权范围实现并验证正式功能，白盒按需使用；视觉样片不能伪装成正式可交互场景。')
    .replaceAll('必要低保真/灰盒与预算，只定义契约，不写正式场景功能代码', '功能验证方式与预算，可直接实现并验证正式功能，低保真或灰盒按需使用')
    .replaceAll('V2 在已验证功能基础上确认玩法视觉契约与预算；', 'V2 基于已验证功能确认玩法视觉契约与预算；')
    .replaceAll('foundation-only 基础实施完成后，V2 建立功能规格、玩法视觉契约、功能验证方式与预算，可直接实现并验证正式功能，低保真或灰盒按需使用；', 'foundation-only 基础实施完成后，V1 建立功能规格并实现、验证功能，低保真或白盒按需使用；V2 基于已验证功能确认玩法视觉契约与预算；')
    .replaceAll('提交草图/灰盒和 Scene/Prefab/UXML 结构', '按需提交草图或灰盒，并记录 Scene/Prefab/UXML 结构')
    .replace('### V2 换皮草图与结构映射', '### V1 功能验证\n\n先使用现有角色和临时资源验证切换、动画与交互功能；白盒按需使用，不是进入 V2 的前提。\n\n### V2 换皮草图与结构映射')
    .replace('2. **V2 对象定义**', '1. **V1 功能验证**：先使用临时资源实现并验证玩法、交互和跨场景状态；白盒可选，不要求先冻结视觉目标。\n\n2. **V2 对象定义**')
    .replaceAll('沿用现有 Work Item、Implementation Package 与 V0–V5 阶段，不创建反馈专用状态机或 Work Item 类型。V0 内部分流无常规确认；V2–V5 按控制面提交真实交付，V3 拆解图和布局图分别确认。', '沿用现有 Work Item、Implementation Package 与 V0–V5 阶段，不创建反馈专用状态机或 Work Item 类型。V0 内部分流无常规确认；V1 验证功能，V2–V5 按控制面提交真实交付，V3 拆解图和布局图分别确认。')
    .replaceAll('沿用既有 Work Item/V0–V5 和 `animation-intent-contract`', '沿用既有 Work Item/V0–V5 和 `animation-intent-contract`')
    .replaceAll('SCENE / DISPLAY_LAYER 按现有控制面使用 V0–V5 与 `stageReviews`；内容一致时拆件确认可并入 V3。', 'SCENE / DISPLAY_LAYER 按现有控制面使用 V0–V5 与阶段确认；内容一致时拆件确认可并入 V3。')
    .replaceAll('共用当前 Work Item、资源清单和 V0–V5 阶段。V2 冻结模型几何规格，V3 制作路线并在有用时做 blockout，V4 按 V0 分类交付正式模型或烘焙源并核验，只有运行模型在 V5 验证 GLB 的真实消费', '共用当前 Work Item、资源清单和 V0–V5 阶段；V1 验证功能，V2 冻结模型几何规格，V3 制作路线并在有用时做 blockout，V4 按 V0 分类交付正式模型或烘焙源并核验，只有运行模型在 V5 验证 GLB 的真实消费');
  if (stack === 'flutter') {
    output = adaptFlutterOptionalSketch(output)
      .replace('3. 依据 `flutter-code-sketch/references/code-sketch-level-standard.md` 选择 Full、Lightweight 或 Reuse 并记录理由。', '3. 按风险决定是否使用 Code Sketch；可直接实现并验证已明确的页面功能。选择草图路线时依据 `flutter-code-sketch/references/code-sketch-level-standard.md` 决定 Full、Lightweight 或 Reuse 并记录理由。')
      .replace('4. 调用 `adaptive-layout-implementation` 创建 `phase: sketch` 的页面 `layout-spec.yaml`；此阶段不含未来视觉 parity 字段。', '4. 需要布局合同或选择草图路线时，调用 `adaptive-layout-implementation` 创建 `phase: sketch` 的页面 `layout-spec.yaml`；此阶段不含未来视觉 parity 字段。')
      .replace('5. 由 Flutter Engineer 使用 `flutter-code-sketch` 在生产骨架实现中性草图、关系测试和风险选择的截图，再由独立 Code Sketch Reviewer 审阅。', '5. 选择 Code Sketch 时，由 Flutter Engineer 在生产骨架实现中性草图并执行关系测试；需要截图时由用户人工检查。直接实现路线保留相应真实功能和结构验证。')
      .replace('6. Review 通过后调用 `flutter-hifi-mockup` 生成、评审并由用户冻结高保真目标。', '6. 公共 V1 功能行为经实际验证后，按需调用 `flutter-hifi-mockup` 生成、评审并由用户冻结高保真目标。');
  }
  return output;
}

/** 把逐源文档中的 Markdown 链接从临时适配目录重基到最终栈手册。 */
export function rebaseNativeMarkdownLinks(text, { stagePath, manualPath, sourceSkill, targets, nativeOnly = false }) {
  const rewrite = (rawTarget) => {
    const wrapped = rawTarget.startsWith('<') && rawTarget.endsWith('>');
    const value = wrapped ? rawTarget.slice(1, -1) : rawTarget;
    if (!value || /^(?:[a-z]+:|\/)/i.test(value)) return rawTarget;
    const splitAt = value.search(/[?#]/);
    const pathPart = splitAt < 0 ? value : value.slice(0, splitAt);
    const suffix = splitAt < 0 ? '' : value.slice(splitAt);
    const fragmentAt = suffix.indexOf('#');
    const rawFragment = fragmentAt < 0 ? '' : suffix.slice(fragmentAt + 1);
    let decodedPath = pathPart;
    let decodedFragment = rawFragment;
    try { decodedPath = decodeURIComponent(pathPart); } catch { /* 非法百分号序列保持其字面路径。 */ }
    try { decodedFragment = decodeURIComponent(rawFragment); } catch { /* 非法百分号序列保持其字面片段。 */ }

    if (!decodedPath) {
      if (!rawFragment) return rawTarget;
      if (!sourceSkill) return rawTarget;
      const sourceTarget = targets.get(sourceSkill);
      if (!sourceTarget) throw new Error(`原生模式本地锚点缺少来源章节：${stagePath}`);
      const mapped = resolveMigratedFragment(sourceTarget, decodedFragment, stagePath);
      const query = suffix.slice(0, fragmentAt);
      if (mapped.kind === 'shared') {
        const relativePath = path.posix.relative(path.posix.dirname(manualPath), mapped.path);
        const result = `${relativePath}${query}#${mapped.anchor}`;
        return wrapped ? `<${result}>` : result;
      }
      const result = `${query}#${mapped.anchor}`;
      return wrapped ? `<${result}>` : result;
    }

    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(stagePath), decodedPath));
    const nativeTarget = targets.get(path.posix.basename(path.posix.dirname(resolved)));
    if (nativeTarget && nativeTarget.stagePath === resolved) {
      const relativePath = nativeTarget.manualPath === manualPath ? '' : path.posix.relative(path.posix.dirname(manualPath), nativeTarget.manualPath);
      const query = fragmentAt < 0 ? suffix : suffix.slice(0, fragmentAt);
      if (!rawFragment) {
        const result = `${relativePath}${query}#${nativeTarget.section}`;
        return wrapped ? `<${result}>` : result;
      }
      const mapped = resolveMigratedFragment(nativeTarget, decodedFragment, stagePath);
      if (mapped.kind === 'shared') {
        const sharedPath = path.posix.relative(path.posix.dirname(manualPath), mapped.path);
        const result = `${sharedPath}${query}#${mapped.anchor}`;
        return wrapped ? `<${result}>` : result;
      }
      const fragment = mapped.anchor;
      const result = `${relativePath}${query}#${fragment}`;
      return wrapped ? `<${result}>` : result;
    }

    if (nativeOnly) return rawTarget;

    const relativePath = path.posix.relative(path.posix.dirname(manualPath), resolved);
    const result = `${relativePath}${suffix}`;
    return wrapped ? `<${result}>` : result;
  };

  let inFence = false;
  return text.split(/(?<=\n)/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line; }
    if (inFence) return line;
    if (/^(?: {4}|\t)/.test(line)) return line;
    let updated = line.replace(/\]\(\s*(<[^>]+>|[^\s)]+)([^)]*)\)/g, (_match, target, suffix) => `](${rewrite(target)}${suffix})`);
    updated = updated.replace(/^(\s*\[[^\]]+\]:\s*)(<[^>]+>|\S+)(.*)$/g, (_match, prefix, target, suffix) => `${prefix}${rewrite(target)}${suffix}`);
    return updated;
  }).join('');
}

/** 将说明中的旧适配器路径映射到原生章节，同时保留代码块里的示例原样。 */
export function rebaseNativeCodePathReferences(text, { targets }) {
  let fence = null;
  return text.split(/(?<=\n)/).map((line) => {
    const fenceMarker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const closing = /^\s{0,3}(`+|~+)\s*$/.exec(line);
      if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) fence = null;
      return line;
    }
    if (fenceMarker) {
      fence = { marker: fenceMarker[1][0], length: fenceMarker[1].length };
      return line;
    }
    if (/^(?: {4}|\t)/.test(line)) return line;
    return line.replace(/(`+)([^`\r\n]+?)\1/g, (token, ticks, value) => {
      const match = /^(?:(\.agents\/skills\/)|(skills\/))?([a-z0-9][a-z0-9-]*)\/(?:ADAPTER|SKILL)\.md(?:#(.+))?$/.exec(value);
      if (!match) return token;
      const [, projectPrefix, repositoryPrefix, sourceSkill, rawFragment] = match;
      const target = targets.get(sourceSkill);
      if (!target) return token;
      let destination = target.manualPath;
      let anchor = target.section;
      if (rawFragment) {
        let fragment = rawFragment;
        try { fragment = decodeURIComponent(rawFragment); } catch { /* 非法编码片段按字面值查询。 */ }
        const mapped = resolveMigratedFragment(target, fragment, sourceSkill);
        if (mapped.kind === 'shared') { destination = mapped.path; anchor = mapped.anchor; }
        else anchor = mapped.anchor;
      }
      if (projectPrefix) destination = `.agents/${destination}`;
      else if (!repositoryPrefix) destination = `skills/${destination.replace(/^skills\//, '')}`;
      return `${ticks}${destination}#${anchor}${ticks}`;
    });
  }).join('');
}

/** 为原文标题生成模式内锚点，并将标题层级缩进到能力手册中。 */
export function indentNativeHeadings(text, sourceSkill) {
  const prefix = `mode-${sourceSkill}`;
  const counts = new Map();
  const output = [];
  let inFence = false;
  let hasTopHeading = false;
  for (const line of text.split(/(?<=\n)/)) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; output.push(line); continue; }
    const heading = inFence ? null : /^(\s{0,3})(#{1,6})(\s+)(.+?)(\s*#*\s*)(\r?\n)?$/.exec(line);
    if (!heading) { output.push(line); continue; }
    if (heading[2].length === 1) hasTopHeading = true;
    const slug = normalizeNativeHeadingFragment(heading[4]);
    const occurrence = counts.get(slug) ?? 0;
    counts.set(slug, occurrence + 1);
    const anchor = `${prefix}--${slug}${occurrence ? `-${occurrence}` : ''}`;
    const level = Math.min(6, heading[2].length + (hasTopHeading ? 2 : 1));
    output.push(`${heading[1]}<a id="${anchor}"></a>\n`);
    output.push(`${heading[1]}${'#'.repeat(level)}${heading[3]}${heading[4]}${heading[5]}${heading[6] ?? ''}`);
  }
  if (!hasTopHeading) output.unshift(`<a id="${prefix}--overview"></a>\n### ${sourceSkill}\n\n`);
  return output.join('');
}

/** 按公共能力组织一个技术栈的模式目录，保留能力入口到原生章节的稳定跳转。 */
export function renderNativeManual({ stack, capabilityGroups, sections }) {
  const titles = new Map(sections.map((section) => {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/m.exec(section.body);
    return [section.sourceSkill, heading?.[1] ?? section.mode ?? section.sourceSkill];
  }));
  const routes = capabilityGroups.flatMap((group) => group.adapters
    .filter((adapter) => adapter.stack === stack)
    .map((adapter) => ({ capability: group, adapter })));
  const uniqueRoutes = [...new Map(routes.map(({ capability, adapter }) => [`${capability.name}:${adapter.sourceSkill}`, { capability, adapter }])).values()];
  const lines = [`# ${stack} 原生技术合同`, '', '本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。', '', '各技术栈统一使用 V0–V5：V0 范围、V1 功能验证、V2 视觉目标、V3 拆解布局、V4 资源导入、V5 正式运行验收；白盒按需使用。包含视觉阶段的领域记录必须声明 `visualStageModel: function-first-v1`，无阶段的纯资源协议不需要该字段。', '', '## 能力索引', ''];
  for (const group of capabilityGroups) {
    const items = uniqueRoutes.filter(({ capability }) => capability.name === group.name);
    if (!items.length) continue;
    lines.push(`- **${group.title}**`);
    for (const { adapter } of items) lines.push(`  - [${adapter.mode ?? titles.get(adapter.sourceSkill) ?? adapter.sourceSkill}](#${adapter.section})`);
  }
  const byCapability = new Map();
  for (const section of sections) {
    if (!byCapability.has(section.capability)) byCapability.set(section.capability, []);
    byCapability.get(section.capability).push(section);
  }
  for (const group of capabilityGroups) {
    const items = byCapability.get(group.name) ?? [];
    if (!items.length) continue;
    lines.push('', `## ${group.title}`, '');
    for (const section of items) {
      const block = `<!-- native-source:${section.sourceSkill}:start -->\n<a id="${section.section}"></a>\n\n${section.body}\n<!-- native-source:${section.sourceSkill}:end -->`;
      lines.push(block, '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
