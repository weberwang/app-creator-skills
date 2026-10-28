/** 参考正文共享沿用工作流的源区间与摘要合同，原生差异和资料链接留在本栈。 */
import { createHash } from 'node:crypto';
import { readWorkflowBlocks, canonicalWorkflowBlock } from './web-workflow-bodies.mjs';
import { adaptOptionalReviewDocument } from './optional-review-documents.mjs';
import { unifySourceVisualStages } from './unified-stage-text.mjs';

/** 段落仅统一换行和外层空白，保留所有规则、参数和原生标识。 */
export function referenceBlockHash(text) {
  return createHash('sha256').update(text.trim().replaceAll('\r\n', '\n')).digest('hex');
}

/** 构造一份参考主题的公共正文计划，不改写任何未匹配的源字符。 */
export function buildReferenceWorkflow({ id, title, sources, canonicalize, reason, canonicalStagesUnified = false }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id ?? '') || typeof title !== 'string' || !title.trim()
    || !Array.isArray(sources) || new Set(sources.map((source) => source.stack)).size < 2) throw new Error('共享参考需要主题和至少两栈完整来源');
  const identities = new Set();
  const groups = new Map();
  for (const source of sources) {
    const identity = `${source.stack}:${source.sourcePath}`;
    if (identities.has(identity) || typeof source.text !== 'string' || !source.sourcePath) throw new Error(`共享参考来源重复或无正文：${identity}`);
    identities.add(identity);
    for (const block of readWorkflowBlocks(source.text)) {
      if (['目录', '本栈配套资料'].includes(block.sourceHeading)) continue;
      // 示例围栏是完整代码，不把其中的 Markdown 字符串误当作资料链接改写。
      const base = /^\s*(?:```|~~~)/.test(block.original)
        ? { canonical: block.original.trim().replaceAll('\r\n', '\n'), referenceLinks: [] }
        : canonicalWorkflowBlock(block.original, { routeScripts: false });
      const normalized = canonicalize ? canonicalize({ ...block, ...base, stack: source.stack, sourcePath: source.sourcePath }) : base;
      if (!normalized || typeof normalized.canonical !== 'string' || !normalized.canonical.trim()) continue;
      const adapted = adaptOptionalReviewDocument(normalized.canonical.trim().replaceAll('\r\n', '\n'), { sourcePath: source.sourcePath, destination: `skills/app-domain-toolkit/references/${id}.md` }).text;
      const canonical = canonicalStagesUnified ? adapted : unifySourceVisualStages(adapted);
      const key = `${block.sourceHeading}\n${canonical}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...block, ...normalized, canonical, stack: source.stack, sourcePath: source.sourcePath });
    }
  }
  const shared = [...groups.values()].filter((items) => new Set(items.map((item) => item.stack)).size >= 2
    && items.length === new Set(items.map((item) => item.stack)).size);
  if (!shared.length) throw new Error(`${id} 没有可证明相同的完整规则块`);
  const commonPath = `skills/app-domain-toolkit/references/${id}.md`;
  const bySource = new Map();
  const byHeading = new Map();
  const replacements = [];
  for (const items of shared) {
    // 来源标题只用于定位原始区间；对外标题与真实统一阶段保持一致。
    const heading = unifySourceVisualStages(items[0].sourceHeading);
    if (!byHeading.has(heading)) byHeading.set(heading, []);
    byHeading.get(heading).push(`> 适用技术栈：${items.map((item) => item.stack).join('、')}。\n\n${items[0].canonical}`);
    for (const item of items) {
      const section = { sourceHash: referenceBlockHash(item.original), canonicalHash: referenceBlockHash(item.canonical),
        heading, sourceHeading: item.sourceHeading, sourceRange: item.sourceRange,
        original: item.original.trim().replaceAll('\r\n', '\n'), canonical: item.canonical };
      const key = `${item.stack}:${item.sourcePath}`;
      if (!bySource.has(key)) bySource.set(key, { stack: item.stack, sourcePath: item.sourcePath, sections: [] });
      bySource.get(key).sections.push(section);
      replacements.push({ ...item, ...section, original: item.original, capabilityId: id, commonPath, referenceWorkflow: true });
    }
  }
  const content = [`# ${title}`, '', '执行公共规则时，同时读取当前技术栈参考中的原生补充和“本栈配套资料”。各段仅适用于标注的技术栈；结构化证据不代替用户对显示效果的人工验收。', '',
    ...[...byHeading].flatMap(([heading, blocks]) => [`## ${heading}`, '', blocks.join('\n\n'), ''])].join('\n');
  return { documents: [{ path: commonPath, capabilityId: id, content, sources: [...bySource.values()],
    reason: reason ?? '参考资料逐段核对后集中维护完整公共规则，原生差异、锚点和资料依赖保留在技术栈参考。' }], replacements };
}

/** 相邻规则抽取到同一公共章节时只保留一个导航，标题和原生补充会终止折叠。 */
export function compactReferenceWorkflowLinks(text) {
  let previousHref = null;
  let suppressBlanks = false;
  const output = [];
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    if (!line.trim()) { if (!suppressBlanks) output.push(line); continue; }
    suppressBlanks = false;
    const link = /^\s*(?:>\s*|[-*+]\s+|\d+[.)]\s+)?通用工作流步骤见\[完整规范\]\(([^)]+)\)。\s*$/.exec(line);
    if (link) {
      if (previousHref !== link[1]) output.push(line);
      else {
        // 只收紧被移除导航留下的空行，不触碰原生代码围栏内部的排版。
        while (output.length && !output.at(-1).trim()) output.pop();
        output.push(line.endsWith('\r\n') ? '\r\n' : '\n');
        suppressBlanks = true;
      }
      previousHref = link[1];
    } else { previousHref = null; output.push(line); }
  }
  while (output.length && !output.at(-1).trim()) output.pop();
  return output.join('');
}
