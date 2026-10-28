/** 整合经逐句核对的 Unity 与三栈游戏美术共同判断，保留各自合同细节。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { referenceBlockHash } from './reference-workflow-common.mjs';
import { readWorkflowBlocks } from './web-workflow-bodies.mjs';

const SOURCES = Object.freeze({
  unity: { path: 'unity-development-workflow/references/art-quality-contract.md', hash: 'ddf45b3884c88d3074cdeab0cf4d696c79c80c379a4c4982e77e706f082536ab' },
  cocos: { path: 'skills/cocos-game-asset-integration/references/art-quality-contract.md', hash: 'a1db25dc49a5f5afff75b2f690fc303df3bb6ef39792c406ae0fd4d1177ffcf6' },
  phaser: { path: 'skills/phaser4-game-asset-integration/references/art-quality-contract.md', hash: '2fb6bd64f448f86b8cd9f97c27751170b0bafa5a622bc81e7d29215ec4d13216' },
  threejs: { path: 'skills/threejs-game-asset-integration/references/art-quality-contract.md', hash: '0d6c0b7ccf5f659968b76a3201a7e8bd559458c0b1ce9a25434f25d3b92800ca' },
});
const UNITY_BRIEF_PREFIX = '按 Work Item 写明主题、目标玩家/受众、核心循环、体验目标和主要观看情境，并说明视觉层级、关键玩法信息、刺激预算与已有规范。';
const BRIEF = '美术 brief 写明项目主题、目标玩家与受众、核心循环、体验目标、主要观看情境、视觉层级、关键玩法信息和刺激预算；内部说明只作为理解与生成依据，不直接成为画面文字。';
const DIMENSIONS = '| 共同维度 | 判断原则 |\n| --- | --- |\n| 主题贴合 | 检查视觉表现是否服务当前项目主题。 |\n| 受众适配 | 检查表现是否符合目标玩家和实际观看情境。 |\n| 玩法可读 | 检查玩家能否分辨主体、状态、危险、目标及交互结果，数值归属、必要条件与后果是否清楚。 |\n| 观看舒适 | 检查视觉变化、注意力分配及效果叠加是否符合项目约定。 |\n| 美术完成度 | 检查正式资源和组合的细节、材质、字体及边缘质量是否协调。 |';
const UNITY_DETAILS = 'Unity 具体检查：主题包含色彩、形状、材质、光照、镜头和动效；受众包含表现尺度、节奏与内容；玩法信息须在所需时间内可辨，不能混入内部规格说明或重复标签；观看舒适包含闪烁、亮度变化、镜头运动、运动密度与叠加是否符合已确认的刺激预算；美术完成度须检查正式资源、组合、细节、边缘、材质、字体及状态是否保留已确认 V1 的显著视觉特征，而非仅保持同风格。';
const TARGET = 'skills/app-domain-toolkit/references/art-quality-principles.md';
const FEEDBACK_TARGET = 'skills/app-feedback/references/interaction-feedback.md';

/** 只替换已核对的三个 Unity 公共反馈条款，原生时间和对象生命周期仍由 Unity 维护。 */
export function routeUnityFeedback(text, { destination } = {}) {
  if (typeof text !== 'string' || typeof destination !== 'string' || !destination || destination.replaceAll('\\', '/').split('/').includes('..')) {
    throw new TypeError('Unity 反馈路由需要正文和仓库内目标路径');
  }
  const href = path.posix.relative(path.posix.dirname(destination.replaceAll('\\', '/')), FEEDBACK_TARGET);
  const changes = [
    ['- **重复**：同一事件再次触发时，声明重播、重置、合并、限频或忽略等策略，并说明选择理由。',
      `- 重复和叠加遵循[公共反馈竞争规则](${href}#3-处理重复并发和打断)；Unity 可选重播或重置，按项目限制并发数量，避免多个反馈争用同一属性。`],
    ['- **叠加**：声明并行、合并、限量或优先级规则，避免多个反馈争用同一属性或遮蔽玩法信息。', ''],
    ['- **中断与收尾**：声明被更高优先级事件打断、对象禁用、关闭显示层或离开场景时如何结束；结束后恢复被临时修改的视觉属性。',
      `- 被更高优先级事件打断、对象禁用、关闭显示层或离开场景时，遵循[公共反馈生命周期](${href}#5-尊重生命周期与可访问性)；结束后恢复被临时修改的视觉属性。`],
  ];
  let output = text;
  for (const [original, replacement] of changes) {
    const index = output.indexOf(original);
    if (index < 0 || output.indexOf(original, index + original.length) >= 0) throw new Error('Unity 反馈公共条款缺失或重复，须重新审查');
    let end = index + original.length;
    // 删除第二个旧列表项时一并移除其换行，避免把同一组专业约束拆成两个列表。
    if (!replacement && output.slice(end, end + 2) === '\r\n') end += 2;
    else if (!replacement && output[end] === '\n') end += 1;
    output = output.slice(0, index) + replacement + output.slice(end);
  }
  return output;
}

/** 每份来源单独固定原始字节摘要，字段或含义变动时须重新审阅。 */
function readSource(sourceRoot, stack, spec) {
  const directory = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
  if (typeof directory !== 'string' || !directory) throw new Error(`缺少 ${stack} 美术合同源仓库`);
  const bytes = readFileSync(resolve(directory, spec.path));
  if (createHash('sha256').update(bytes).digest('hex') !== spec.hash) throw new Error(`${stack} 美术合同源正文已变化，须重新审查`);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error(`${stack} 美术合同不是有效 UTF-8`); }
  return { stack, sourcePath: spec.path, text, blocks: readWorkflowBlocks(text) };
}

/** 从固定章节选中唯一完整来源块，禁止以相似标题猜测范围。 */
function selectBlock(source, heading, prefix) {
  const blocks = source.blocks.filter((item) => item.sourceHeading === heading && item.original.trimStart().startsWith(prefix));
  if (blocks.length !== 1) throw new Error(`${source.stack} 美术合同章节不唯一：${heading}`);
  return blocks[0];
}

/** 只提炼跨四栈通用判断，Web 公共表与 Unity 专属验收字段各自维持适用范围。 */
export function buildSharedUnityPrinciples({ sourceRoot, repositoryRoot } = {}) {
  const sources = Object.entries(SOURCES).map(([stack, spec]) => readSource(sourceRoot, stack, spec));
  const web = sources.filter((source) => source.stack !== 'unity');
  const briefTables = web.map((source) => selectBlock(source, '项目美术 brief', '| 内容 |'));
  const qualityTables = web.map((source) => selectBlock(source, '五项质量与候选淘汰', '| 质量项 |'));
  const identical = (items, label) => {
    const values = items.map((item) => item.original.trim().replaceAll('\r\n', '\n'));
    if (new Set(values).size !== 1) throw new Error(`Web ${label} 原始检查表不一致，须重新审查`);
    return values[0];
  };
  const webBrief = identical(briefTables, '美术 brief');
  const webQuality = identical(qualityTables, '美术质量');
  const replacements = [];
  const records = [];
  for (const source of sources) {
    const isUnity = source.stack === 'unity';
    const brief = isUnity ? selectBlock(source, 'V1 brief', UNITY_BRIEF_PREFIX) : briefTables[web.indexOf(source)];
    const quality = isUnity ? selectBlock(source, '五项逐项通过', '| 维度 |') : qualityTables[web.indexOf(source)];
    const unityBrief = brief.original.trim().slice(UNITY_BRIEF_PREFIX.length);
    const candidates = [
      { block: brief, canonical: BRIEF, heading: '项目美术 brief', supplement: isUnity
        ? `Unity 另须说明已有规范。${unityBrief}`
        : '三栈具体 brief 字段见[本栈 brief 检查表](../../app-domain-toolkit/references/art-quality-principles.md#web-brief-检查表)。' },
      { block: quality, canonical: DIMENSIONS, heading: '五项共同判断', supplement: isUnity
        ? UNITY_DETAILS
        : '三栈具体检查问题见[本栈五项检查表](../../app-domain-toolkit/references/art-quality-principles.md#web-五项检查表)。' },
    ];
    const sections = [];
    for (const { block, canonical, heading, supplement } of candidates) {
      const section = { sourceHash: referenceBlockHash(block.original), canonicalHash: referenceBlockHash(canonical), heading,
        sourceHeading: block.sourceHeading, sourceRange: block.sourceRange,
        original: block.original.trim().replaceAll('\r\n', '\n'), canonical };
      sections.push(section);
      replacements.push({ ...block, ...section, original: block.original, stack: source.stack, sourcePath: source.sourcePath,
        capabilityId: 'art-quality-principles', commonPath: TARGET, referenceWorkflow: true, nativeSupplement: supplement });
    }
    records.push({ stack: source.stack, sourcePath: source.sourcePath, sections });
  }
  const content = `# 游戏美术质量共同原则\n\n执行本参考时，同时读取当前技术栈合同的原生字段、候选绑定与证据要求；结构化检查不代替用户对显示效果的人工验收。\n\n## 项目美术 brief\n\n> 适用技术栈：unity、cocos、phaser、threejs。\n\n${BRIEF}\n\n## 五项共同判断\n\n> 适用技术栈：unity、cocos、phaser、threejs。\n\n${DIMENSIONS}\n\n## Web brief 检查表\n\n> 适用技术栈：cocos、phaser、threejs。\n\n${webBrief}\n\n## Web 五项检查表\n\n> 适用技术栈：cocos、phaser、threejs。\n\n${webQuality}\n`;
  return { repositoryRoot, documents: [{ path: TARGET, capabilityId: 'art-quality-principles', content, sources: records,
    reason: '四栈共用美术 brief 与五项判断；具体字段、状态、候选和原生运行验收保持独立。' }], replacements };
}
