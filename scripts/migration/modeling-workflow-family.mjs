/** 从 Unity、Cocos Creator 和 Three.js 的建模入口抽取完整共用步骤，并记录准确源区间。 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STACKS = Object.freeze({
  unity: { sourcePath: 'unity-game-3d-modeling/SKILL.md', adapter: 'skills/unity-game-3d-modeling/SKILL.md' },
  cocos: { sourcePath: 'skills/cocos-game-3d-modeling/SKILL.md', adapter: 'skills/cocos-game-3d-modeling/SKILL.md' },
  threejs: { sourcePath: 'skills/threejs-game-3d-modeling/SKILL.md', adapter: 'skills/threejs-game-3d-modeling/SKILL.md' },
});
const COMMON_PATH = 'skills/app-domain-toolkit/references/modeling-production.md';
const STEPS = Object.freeze([
  { id: 'brief', heading: '冻结模型简报', text: '冻结模型简报：记录已批准的视觉基线（如 Unity Visual Bible）、用途、目标轮廓与观看距离、单位和轴向、Pivot、玩法交互体积、拓扑与面数预算、材质槽、适用 LOD 和碰撞代理、导出格式、许可、来源、输入输出路径及目标工程。缺少会改变模型形状、预算或导入结果的事实时，先标出假设并停下受影响的生产。',
    match: { unity: ['- 要求已有 Visual Bible'], cocos: ['- 输入应明确模型用途'], threejs: ['- 本技能负责静态网格形体'] } },
  { id: 'session', heading: '检查 Blender 工作区', text: '制作前检查可复用的 Blender 实例、活动文件、对象集合、工具和未保存状态；先核对当前 MCP 工具及参数，不把脚本可运行误认为所需能力都可用。只有确认无可复用实例后才启动；不得重置场景或覆盖无关对象。保存带版本的 `.blend` 源、工具版本、可复现配方、关键参数和派生关系；按目标格式实际需要，在独立副本上应用修改器、三角化或轴向调整，重新打开并读取真实导出物，核对对象、网格、UV、变换和预算。源文件与导出成功提示都不能替代回读。',
    match: { unity: ['1. 先发现可复用的 Blender 实例'], cocos: ['1. 用 Blender MCP 的实时工具能力'] } },
  { id: 'geometry', heading: '完成模型结构', text: '按冻结规格制作形体和结构：根据目标在硬表面结构建模或有机雕刻间选择，落实需要的厚度、连接、转折、倒角和曲面；需要高低模时完成高模与重拓扑，直接低模路线仍须有合理边流和真实结构。Blockout 只用于比例、轮廓或玩法空间检查，不能作为正式可见模型交付；若目标本来就是简单几何，则完成其必需结构与技术检查即可，不为增加复杂度堆叠细节。基础几何体只能作为起始网格、中间检查或碰撞代理。',
    match: { unity: ['2. 在 Blender 中确定轮廓', '3. 按资产需要执行硬表面结构建模', '- 基础几何体仅可作为起始网格'], cocos: ['- Blockout 可用于比例'] } },
  { id: 'surface', heading: '核对表面与性能预算', text: '完成拓扑清理、法线与切线策略、UV 展开与检查，冻结实际 UV 位置及报告、材质槽和烘焙交接信息；按预算准备适用的 LOD 与碰撞代理。不以贴图、光照、高面数、增加零件、细分或光滑着色掩盖未完成的几何；不要求所有模型都雕刻高模或使用全四边面，制作方法由形体、变形和烘焙需求决定。',
    match: { unity: ['4. 完成拓扑清理', '- 不以增加分段'], cocos: ['2. 正式网格按规格完成'] } },
]);

/** 按 Markdown 列表项、空行与标题切块，并保留每块在原文件中的 UTF-16 字符区间。 */
export function splitModelingBlocks(text) {
  const blocks = [];
  let offset = 0;
  let start = null;
  let heading = '正文';
  let frontmatter = text.startsWith('---');
  let delimiterCount = 0;
  let fenced = false;
  let listIndent = null;
  // 保留切片前的字符偏移，这样清单摘要能对回多字节源文中的真实区间。
  const flush = (end) => {
    if (start !== null && text.slice(start, end).trim()) blocks.push({ original: text.slice(start, end), sourceHeading: heading, sourceRange: { start, end } });
    start = null;
    listIndent = null;
  };
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const lineStart = offset;
    offset += line.length;
    if (frontmatter) {
      if (line.trim() === '---' && ++delimiterCount === 2) frontmatter = false;
      continue;
    }
    if (/^\s*(?:```|~~~)/.test(line)) fenced = !fenced;
    if (!fenced) {
      const title = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      if (title) { flush(lineStart); heading = title[1]; continue; }
      if (!line.trim()) { flush(lineStart); continue; }
      const item = line.match(/^([ \t]*)(?:\d+[.)]|[-*+])\s+/);
      if (item && start !== null && listIndent === item[1].length) flush(lineStart);
      if (start === null && item) listIndent = item[1].length;
    }
    if (start === null) start = lineStart;
  }
  flush(text.length);
  return blocks;
}

/** 仅按审定的源段首句选择，不使用相似度猜测来源或吞并相邻原生规则。 */
function selectSourceBlock(blocks, selector, sourcePath) {
  const matches = blocks.filter((block) => selector.some((prefix) => block.original.trimStart().startsWith(prefix)));
  if (matches.length !== 1) throw new Error(`建模技能源块漂移：${sourcePath}，选择器“${selector.join(' / ')}”命中 ${matches.length} 处。`);
  return matches[0];
}

/** 将精准源区间映射到文档中的完整共用步骤，保存两端摘要以供独立核验。 */
function sourceSection(step, block) {
  const original = block.original.trim().replaceAll('\r\n', '\n');
  return {
    sourceHash: createHash('sha256').update(original).digest('hex'),
    canonicalHash: createHash('sha256').update(step.text.trim().replaceAll('\r\n', '\n')).digest('hex'),
    heading: step.heading,
    sourceHeading: block.sourceHeading,
    sourceRange: block.sourceRange,
    original,
    canonical: step.text,
  };
}

/** 接受 Git 父目录、逐栈目录映射或技能源根目录映射。 */
function stackRoot(sourceRoot, stack) {
  if (typeof sourceRoot === 'string') return resolve(sourceRoot, `${stack}-skills`);
  if (!sourceRoot || typeof sourceRoot !== 'object') return null;
  const candidate = sourceRoot[stack] ?? sourceRoot[`${stack}-skills`];
  if (!candidate) return null;
  const absolute = resolve(candidate);
  return existsSync(resolve(absolute, ...STACKS[stack].sourcePath.split('/'))) ? absolute : resolve(absolute, `${stack}-skills`);
}

/** 构造可追溯的跨栈建模公共文档与三个原技能入口的正文替换。 */
export function buildModelingWorkflowFamily({ sourceRoot, repositoryRoot }) {
  const roots = Object.keys(STACKS).map((stack) => [stack, stackRoot(sourceRoot, stack)]);
  const present = roots.filter(([stack, root]) => root && existsSync(resolve(root, ...STACKS[stack].sourcePath.split('/'))));
  if (!present.length) return { documents: [], replacements: [], repositoryRoot };
  if (present.length !== Object.keys(STACKS).length) throw new Error('建模共用规划要求 Unity、Cocos 与 Three.js 三个专业技能同时可用。');

  const documentParagraphs = [];
  const sources = [];
  const replacements = [];
  for (const [index, step] of STEPS.entries()) {
    const sections = [];
    for (const [stack, root] of roots) {
      const descriptor = STACKS[stack];
      const sourceText = readFileSync(resolve(root, ...descriptor.sourcePath.split('/')), 'utf8');
      const blocks = splitModelingBlocks(sourceText);
      const selectors = step.match[stack];
      if (!selectors) continue;
      for (const selector of selectors) {
        const block = selectSourceBlock(blocks, [selector], descriptor.sourcePath);
        sections.push({ stack, sourcePath: descriptor.sourcePath, adapterDestination: descriptor.adapter, ...sourceSection(step, block), referenceLinks: [] });
      }
    }
    documentParagraphs.push(`### ${step.heading}\n\n${step.text}`);
    for (const section of sections) replacements.push({
      ...section,
      capabilityId: 'modeling-production',
      commonPath: COMMON_PATH,
    });
    for (const stack of new Set(sections.map((section) => section.stack))) {
      const sourcePath = STACKS[stack].sourcePath;
      const stackSections = sections.filter((section) => section.stack === stack).map(({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange }) => ({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange }));
      let source = sources.find((item) => item.stack === stack);
      if (!source) { source = { stack, sourcePath, sections: stackSections }; sources.push(source); }
      else source.sections.push(...stackSections);
    }
  }
  return {
    repositoryRoot,
    documents: [{
      path: COMMON_PATH,
      capabilityId: 'modeling-production',
      reason: '从三个建模专业技能的明确源区间提取完整共用模型简报、Blender 制作、几何与表面检查、派生导出回读和交付步骤；引擎导入和各栈专属职责仍留在原技能。',
      content: `# 正式三维模型生产\n\n本规范统一几何建模的共同步骤。按需同时读取所选技术栈专业技能，决定实际支持的导出格式与导入验证方式；本规范不决定专属插件、资源身份或运行时管线。\n\n## 生产流程\n\n${documentParagraphs.join('\n\n')}\n`,
      sources,
    }],
    replacements,
  };
}
