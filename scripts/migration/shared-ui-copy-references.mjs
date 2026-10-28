/** 把四栈审阅一致的游戏内文案规则集中维护，并保留各栈文字渲染差异。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReferenceWorkflow, referenceBlockHash } from './reference-workflow-common.mjs';
import { readWorkflowBlocks } from './web-workflow-bodies.mjs';

const SOURCES = Object.freeze({
  cocos: { skill: 'cocos-game-ui-layout', hash: '570be01cf64a0794dd4b6c2710caad5dd9112e56303be80801818b5fe8835adb', renderer: 'Creator `Label`/`RichText`' },
  phaser: { skill: 'phaser4-game-ui-layout', hash: '6a03c692ec732b598716760424418664d47eb86f596dce56f6f2da10ebaa5553', renderer: '`Phaser.Text`' },
  threejs: { skill: 'threejs-game-ui-layout', hash: '3fcec011ffc09cec856f5ef9ac2ffb36bfbc40dd0c5fe6d8a328259d613877c5', renderer: 'DOM/CSS2D 文本或项目自建文字渲染' },
});
const UNITY_SOURCE = 'unity-development-workflow/references/game-copy.md';
const UNITY_HASH = '6cf3d18a99b4159aa394cd96e1280fa628db3beb4a94a5ce7636ca881985b401';

// 手工逐块核对 Unity 原文与三栈已有章节；只映射完整语义可由该章节覆盖的来源。
const UNITY_MAPPINGS = Object.freeze([
  { unity: 1, web: 0 }, { unity: 2, web: 2, also: [3] }, { unity: 3, web: 1, also: [4] },
  { unity: 6, web: 4, supplement: 'Unity 按项目实际可用的无障碍组件或平台接入；不得声称未在当前工程验证的默认行为。' },
  { unity: 7, web: 5, supplement: '| Unity 补充意图 | 优先表达 | 避免重复解释 |\n| --- | --- | --- |\n| 冷却状态 | 技能图标 + `4.2s` | 技能还需等待 4.2 秒 |\n| 当前余额 | 金币图标 + `100` | 你当前拥有 100 枚金币 |' },
  { unity: 8, web: 6, supplement: '示例也不限定实际字体。' },
  { unity: 9, web: 7, also: [8] }, { unity: 10, web: 8 },
  { unity: 11, web: 9, supplement: 'Unity 交接时还须标明玩家可见表达适用的节点。' },
  { unity: 12, web: 11, supplement: 'Unity 在 V2 生成前核对候选内容；动态数值代表值只用于表达布局，不作为运行常量。' },
  { unity: 17, web: 14 }, { unity: 18, web: 13 }, { unity: 19, web: 14 },
  { unity: 20, web: 15, supplement: 'Unity 的文字拆解发生在 V3，节点显示内容与来源指向玩家可见表达。' },
  { unity: 33, web: 18 }, { unity: 34, web: 18 },
  { unity: 35, web: 19, supplement: 'Unity 在 V4 组合时也提供实际画面与检查点。' },
  { unity: 36, web: 19 }, { unity: 37, web: 20 }, { unity: 38, web: 20 },
]);

/** 读取逐句审计过的 Unity 来源；源改动时必须重新确认语义而不是沿用旧映射。 */
function readUnitySource(sourceRoot) {
  const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, 'unity-skills') : sourceRoot?.unity;
  if (!root) throw new Error('缺少 unity 的文案源仓库');
  const text = readFileSync(resolve(root, UNITY_SOURCE), 'utf8');
  if (createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex') !== UNITY_HASH) throw new Error('unity 文案源正文已变化，须重新审查');
  return { stack: 'unity', sourcePath: UNITY_SOURCE, text };
}

/** 为已覆盖的 Unity 源块记录真实区间，同时扩大对应公共段落的适用范围。 */
function mergeUnityCopy(result, source) {
  const document = result.documents[0];
  const webBlocks = result.replacements.filter((item) => item.stack === 'cocos').sort((a, b) => a.sourceRange.start - b.sourceRange.start);
  const unityBlocks = readWorkflowBlocks(source.text);
  const sections = [];
  const sharedWebIndexes = new Set();
  for (const mapping of UNITY_MAPPINGS) {
    const original = unityBlocks[mapping.unity];
    const common = webBlocks[mapping.web];
    if (!original || !common) throw new Error('Unity 文案审计映射已失效');
    const section = { sourceHash: referenceBlockHash(original.original), canonicalHash: referenceBlockHash(common.canonical),
      heading: common.heading, sourceHeading: original.sourceHeading, sourceRange: original.sourceRange,
      original: original.original.trim().replaceAll('\r\n', '\n'), canonical: common.canonical };
    sections.push(section);
    result.replacements.push({ ...original, ...section, original: original.original, stack: 'unity', sourcePath: source.sourcePath,
      capabilityId: document.capabilityId, commonPath: document.path, referenceWorkflow: true,
      ...(mapping.supplement ? { nativeSupplement: mapping.supplement } : {}) });
    sharedWebIndexes.add(mapping.web);
    for (const index of mapping.also ?? []) sharedWebIndexes.add(index);
  }
  for (const index of sharedWebIndexes) {
    const common = webBlocks[index];
    if (!common) throw new Error('Unity 文案公共适用范围映射已失效');
    const old = `> 适用技术栈：cocos、phaser、threejs。\n\n${common.canonical}`;
    const updated = `> 适用技术栈：cocos、phaser、threejs、unity。\n\n${common.canonical}`;
    if (document.content.split(old).length !== 2) throw new Error('Unity 文案公共规则定位不唯一');
    document.content = document.content.replace(old, updated);
  }
  document.sources.push({ stack: 'unity', sourcePath: source.sourcePath, sections });
}

/** 从父目录或明确的按栈源根读取原始文本，源变更须重新核对文案规则。 */
function readSource(sourceRoot, stack, spec) {
  const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
  if (typeof root !== 'string' || !root) throw new Error(`缺少 ${stack} 的文案源仓库`);
  const sourcePath = `skills/${spec.skill}/references/game-copy.md`;
  const bytes = readFileSync(resolve(root, ...sourcePath.split('/')));
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error(`${stack} 文案参考不是有效 UTF-8`); }
  const normalized = text.replaceAll('\r\n', '\n');
  const hash = createHash('sha256').update(normalized).digest('hex');
  if (hash !== spec.hash) throw new Error(`${stack} 文案源正文已变化，须重新审查`);
  return { stack, sourcePath, text };
}

/** 构造三栈公共文案计划，目标只归一化已审核的运行时组件名称。 */
export function buildSharedUiCopyReferences({ sourceRoot, repositoryRoot } = {}) {
  const sources = Object.entries(SOURCES).map(([stack, spec]) => readSource(sourceRoot, stack, spec));
  const rendererCounts = new Map();
  const result = buildReferenceWorkflow({
    id: 'ui-game-copy', title: '游戏内文案', sources,
    reason: '三栈完整正文及 Unity 经逐块审阅的共同规则统一维护；运行时文字组件和阶段差异由各栈保留。',
    canonicalize(block) {
      const renderer = SOURCES[block.stack].renderer;
      const token = `运行时 ${renderer}、本地化键和动态更新`;
      const index = block.canonical.indexOf(token);
      if (index < 0) return block;
      if (block.canonical.indexOf(token, index + token.length) >= 0) throw new Error(`${block.stack} 文字组件声明重复`);
      rendererCounts.set(block.stack, (rendererCounts.get(block.stack) ?? 0) + 1);
      return { ...block, canonical: block.canonical.replace(token, '运行时文字组件、本地化键和动态更新'), nativeSupplement: `本栈运行时文字组件：${renderer}。` };
    },
  });
  // 全文均应进入公共规则；仅已审核的渲染组件差异留作本栈补充。
  for (const source of sources) {
    const replacements = result.replacements.filter((item) => item.stack === source.stack && item.sourcePath === source.sourcePath);
    if (rendererCounts.get(source.stack) !== 1 || replacements.length !== readWorkflowBlocks(source.text).length) {
      throw new Error(`${source.stack} 文案存在未归入公共规则的正文或缺失组件补充`);
    }
  }
  mergeUnityCopy(result, readUnitySource(sourceRoot));
  return { ...result, repositoryRoot };
}
