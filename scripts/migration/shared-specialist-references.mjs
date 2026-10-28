/** 将已审计的三栈专业参考按完整规则块共享，保留技术栈差异和原生资料。 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReferenceWorkflow } from './reference-workflow-common.mjs';
import { readWorkflowBlocks } from './web-workflow-bodies.mjs';
import { unifySourceVisualStages } from './unified-stage-text.mjs';
import { SPECIALIST_REFERENCE_FAMILIES, SPECIALIST_TRACKED_REFERENCES } from './specialist-reference-specs.mjs';

export { SPECIALIST_REFERENCE_FAMILIES } from './specialist-reference-specs.mjs';

/** 允许统一父目录或逐栈指定根，避免从其他技术栈补齐缺失来源。 */
function sourceRepository(sourceRoot, stack) {
  const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
  if (typeof root !== 'string' || !root) throw new TypeError(`专业参考缺少 ${stack} 源仓库`);
  return resolve(root);
}

/** 核对每个专业目录的完整 Git 跟踪清单，新增资料时要求重新审查而不是静默漏迁。 */
function verifyTrackedReferences(root, stack, supplied) {
  const entries = Object.entries(SPECIALIST_TRACKED_REFERENCES[stack]);
  const prefixes = entries.map(([skill]) => `skills/${stack === 'phaser' ? 'phaser4' : stack}-${skill}/references/`);
  let tracked;
  if (supplied !== undefined) {
    if (!Array.isArray(supplied) && !(supplied instanceof Set)) throw new TypeError(`${stack} 跟踪清单必须是数组或集合`);
    tracked = [...supplied];
  } else {
    try {
      tracked = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', ...prefixes], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
    } catch (error) { throw new Error(`无法读取 ${stack} 专业参考 Git 清单：${error.message}`); }
  }
  for (const [skill, expected] of entries) {
    // 空目录也必须有确定前缀，避免新增专业资料后仍被视为无来源。
    const prefix = `skills/${stack === 'phaser' ? 'phaser4' : stack}-${skill}/references/`;
    const actual = tracked.filter((path) => typeof path === 'string' && path.startsWith(prefix) && path.endsWith('.md')).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${stack}/${skill} 专业参考 Git 清单变化，必须重新审查`);
  }
}

/** 只归一栈目录前缀；URL 和锚点原样比较，避免把同名但不同含义的链接合并。 */
function equivalentTarget(target) {
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return target;
  const [path, ...anchor] = target.split('#');
  return `${path.replace(/(?:cocos|phaser4|threejs)(?=-)/g, 'stack')}${anchor.length ? `#${anchor.join('#')}` : ''}`;
}

/** 完整代码围栏保持逐字一致；普通正文只将安全的 Markdown 链接交回本栈。 */
function normalizeBlock(original) {
  const text = original.trim().replaceAll('\r\n', '\n');
  if (/^(?:```|~~~)/.test(text)) return { canonical: text, referenceLinks: [] };
  // 混合代码围栏、图片或代码内链接必须保留原位，避免误改示例与资源引用。
  if (/```|~~~|!\[[^\]]*\]\(/.test(text)) return null;
  const matches = [...text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  for (const match of matches) {
    const lineStart = text.lastIndexOf('\n', match.index) + 1;
    const before = text.slice(lineStart, match.index);
    if ((before.match(/(?<!\\)`/g) ?? []).length % 2 !== 0) return null;
  }
  const referenceLinks = matches.map((match) => ({ label: match[1], target: match[2] }));
  const canonical = publicControllerAlias(text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label) => `“${label}”（见本栈配套资料）`));
  return { canonical, referenceLinks };
}

/** 旧控制技能只剩公共入口，正文和链接标签使用同一已确认名称；不改代码示例或原生 API。 */
function publicControllerAlias(text) {
  return text.replace(/`(\$?)(?:cocos|phaser4|threejs)-game-workflow-control`/g, '`$1app-workflow-control`');
}

/** 历史源文档可能误复制其他引擎的对象或名称，不能因文字相同而赋予其他栈同一要求。 */
function containsForeignEngine(text, stack, sourcePath, sourceHeading) {
  // Phaser 的 Spine 输入实际支持读取 Cocos 导出容器；这是一种数据格式而非引擎 API。
  if (stack === 'phaser' && sourcePath === 'skills/phaser4-spine-generative-reskin/references/progress-state.md'
    && sourceHeading === '进度清单 Schema v3 与状态机'
    && text === '- `asset_input`、`control_binding`：原版目录/独立导出或 Cocos 容器来源，以及 Work Item、production contract、适用 V2 方案证据的实际路径；SHA 仅作可选追踪。') return false;
  const markers = {
    cocos: /\b(?:Cocos|Creator|AssetDB|UITransform|SpriteFrame)\b/,
    phaser: /\b(?:Phaser|ScaleManager|Sound Manager)\b/,
    threejs: /\b(?:ThreeJS|THREE|WebGLRenderer|Object3D|AnimationMixer)\b|three\.js/i,
  };
  return Object.entries(markers).some(([engine, pattern]) => engine !== stack && pattern.test(text));
}

/** 已由其他公共规范接管的源区间不能再次抽取，否则会产生交叠和重复真源。 */
function overlapsExcluded(block, stack, sourcePath, excluded) {
  return excluded.some((item) => item.stack === stack && item.sourcePath === sourcePath
    && item.sourceRange?.start < block.sourceRange.end && item.sourceRange?.end > block.sourceRange.start);
}

/** 先核对同名链接的真实目标，只有目标按栈目录映射等价时才共享其正文。 */
function ambiguousLinks(sources, excluded) {
  const groups = new Map();
  for (const source of sources) for (const block of readWorkflowBlocks(source.text)) {
    if (overlapsExcluded(block, source.stack, source.sourcePath, excluded)) continue;
    const normalized = normalizeBlock(block.original);
    if (!normalized || containsForeignEngine(normalized.canonical, source.stack, source.sourcePath, block.sourceHeading)) continue;
    const key = `${block.sourceHeading}\n${normalized.canonical}`;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(JSON.stringify(normalized.referenceLinks.map((link) => [publicControllerAlias(link.label), equivalentTarget(link.target)])));
  }
  return new Set([...groups].filter(([, targets]) => targets.size > 1).map(([key]) => key));
}

/** 构造完整可追溯的专业参考计划；保留所有未匹配的原生规则及既有锚点。 */
export function buildSharedSpecialistReferences({ sourceRoot, repositoryRoot, excludedReplacements = [], trackedFilesByStack } = {}) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot) throw new TypeError('专业参考需要目标仓库根');
  if (!Array.isArray(excludedReplacements)) throw new TypeError('已接管源区间必须是数组');
  const roots = Object.fromEntries(Object.keys(SPECIALIST_TRACKED_REFERENCES).map((stack) => [stack, sourceRepository(sourceRoot, stack)]));
  for (const [stack, root] of Object.entries(roots)) verifyTrackedReferences(root, stack, trackedFilesByStack?.[stack]);
  const documents = [];
  const replacements = [];
  for (const family of SPECIALIST_REFERENCE_FAMILIES) {
    const sources = family.sources.map((source) => {
      let bytes;
      try { bytes = readFileSync(resolve(roots[source.stack], ...source.sourcePath.split('/'))); }
      catch (error) { throw new Error(`专业参考来源不可读取：${source.stack}/${source.sourcePath} (${error.message})`); }
      if (createHash('sha256').update(bytes).digest('hex') !== source.sourceSha256) throw new Error(`专业参考源摘要漂移，必须重新审查：${source.stack}/${source.sourcePath}`);
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error(`专业参考来源不是有效 UTF-8：${source.stack}/${source.sourcePath}`); }
      return { stack: source.stack, sourcePath: source.sourcePath, text };
    });
    const unsafe = ambiguousLinks(sources, excludedReplacements);
    const plan = buildReferenceWorkflow({ id: family.id, title: family.title, sources, canonicalStagesUnified: true,
      reason: '按完整源块及等价资料链接核对公共规则，原生 API、资源路径、阶段和验证条件继续在各栈维护。',
      canonicalize: (block) => {
        if (overlapsExcluded(block, block.stack, block.sourcePath, excludedReplacements)) return null;
        const normalized = normalizeBlock(block.original);
        if (!normalized || containsForeignEngine(normalized.canonical, block.stack, block.sourcePath, block.sourceHeading)
          || unsafe.has(`${block.sourceHeading}\n${normalized.canonical}`)) return null;
        if (family.id === 'reference-ui-layout-contract' && normalized.canonical.startsWith('尺寸策略可以是')) {
          // 旧源允许普通绝对定位仅做专项审查；当前用户规则已收窄为浮层本体例外。
          normalized.canonical = normalized.canonical.replace('固定尺寸、绝对定位和悬浮元素是可审查模式，不是格式错误；缺少参照、策略或证据才退回。',
            '固定尺寸和悬浮元素需按实际约束审查；独立定位只允许弹窗、浮窗和 Toast 本体，内部 UI 必须保持相对关系。缺少实际父级、合法参照、策略或证据，以及普通 UI 使用独立定位时均拒绝；规则与字段见[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)。');
        }
        if (family.id === 'reference-ui-layout-contract' && normalized.canonical.startsWith('`dynamic_content.localization` 记录默认语言')) {
          // 语言范围由项目初始化确定，旧来源的五语言固定要求不能覆盖当前项目选择。
          normalized.canonical = normalized.canonical
            .replace('必须包含英语 `en`、简体中文 `zh-CN`、日语 `ja`、俄语 `ru`、西班牙语 `es`', '与项目已确认的语言清单一致；新项目默认简体中文 `zh-CN`，英语 `en` 等其他语言可选，既有项目沿用已确认的语言范围')
            .replace('绑定五语种真实字形宽度', '绑定全部所选语言的真实字形宽度');
        }
        if (family.id === 'reference-asset-game-feel-quality-gate') {
          // 方向取舍与目标画面确认分别记录，明确需求也不能绕过 V1 人工确认。
          normalized.canonical = normalized.canonical.replace('明确需求/参考路径写 `AUTO` 决策进入 V2', '明确需求/参考路径写 `AUTO` 决策，真实目标图经用户确认后进入 V2');
        }
        normalized.canonical = unifySourceVisualStages(normalized.canonical);
        return normalized;
      },
    });
    // 示例来自专业资源目录，不能把公共参考目录误当作脚本或项目文件的工作目录。
    plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n示例中的相对脚本和文件路径按当前技术栈的原生资料与项目约定解析；运行前核对已安装的专业资源位置。\n\n## ');
    if (/\bV[1-5]\b/.test(plan.documents[0].content)) plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n各技术栈统一使用 V0–V5；V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。\n\n## ');
    documents.push(...plan.documents);
    replacements.push(...plan.replacements);
  }
  return { documents, replacements, repositoryRoot: resolve(repositoryRoot) };
}
