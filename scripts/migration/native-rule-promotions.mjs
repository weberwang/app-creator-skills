import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_PATH = 'skills/app-creator-workflow/references/professional-conventions.md';
const PUBLIC_REFERENCE = '../app-creator-workflow/references/professional-conventions.md';

/** 按职责记录可从原生适配中精确提升的重复规则；未登记的专业正文保持原样。 */
const PROMOTION_RULES = Object.freeze([
  {
    id: 'planning-facts-and-decisions-unity', sourceSkill: 'unity-game-production', anchor: 'planning-scope-and-acceptance',
    sourceText: '先从代码和工件消除事实问题；核心循环、范围、目标玩家、验收、发行方式或模块边界确需人工取舍时，向 `$grilling` 提交“事实、选项与影响、推荐、最迟决定点”，不得自行把推荐写成用户决定。',
  },
  ...['cocos-game-production', 'phaser4-game-production', 'threejs-game-production'].map((sourceSkill) => ({
    id: `planning-work-item-facts-${sourceSkill}`, sourceSkill, anchor: 'planning-scope-and-acceptance',
    sourceText: '1. 读取 Work Item、当前任务说明、项目配置、GDD 和适用参考证据；以 F0-F4 质量门整理最小事实。',
  })),
  ...['cocos-game-production', 'phaser4-game-production', 'threejs-game-production'].map((sourceSkill) => ({
    id: `planning-scope-authority-${sourceSkill}`, sourceSkill, anchor: 'planning-scope-and-acceptance',
    sourceText: '本领域可以提议和审查需求，也可以在当前任务路径内修改规格；A3 实施包由控制面冻结后再交给 implementer。',
  })),
  {
    id: 'architecture-cocos-module-ownership', sourceSkill: 'cocos-game-architecture', anchor: 'architecture-module-contracts',
    sourceText: '维护模块职责与依赖方向：玩法规则和状态、表现配置、资源加载、音频、平台适配和第三方服务分别有明确所有者。',
  },
  ...['phaser4-game-architecture', 'threejs-game-architecture'].map((sourceSkill) => ({
    id: `architecture-shared-module-boundary-${sourceSkill}`, sourceSkill, anchor: 'architecture-module-contracts',
    sourceText: '公共代码和公共正式资源必须被至少两个已确认场景稳定复用，或属于运行必需；禁止无边界 `common`/`utils` 和公共素材库。',
  })),
  ...['phaser4-game-architecture', 'threejs-game-architecture'].map((sourceSkill) => ({
    id: `architecture-exclusive-module-writes-${sourceSkill}`, sourceSkill, anchor: 'architecture-module-contracts',
    sourceText: '模块可按互斥所有权并行，共享契约/入口保持串行。',
  })),
  {
    id: 'architecture-flutter-module-data-contracts', sourceSkill: 'flutter-tech-design', anchor: 'architecture-module-contracts',
    sourceText: '4. Define module/data ownership and cross-module contracts.',
  },
  ...['cocos-game-qa-performance', 'phaser4-game-qa-performance', 'threejs-game-qa-performance'].map((sourceSkill) => ({
    id: `quality-evidence-over-opinion-${sourceSkill}`, sourceSkill, anchor: 'quality-evidence-and-retests',
    sourceText: '证据优先于主观结论。项目未定义量化指标时只报告实测与决策缺口，不自造通用阈值。',
  })),
  ...['cocos-game-qa-performance', 'phaser4-game-qa-performance', 'threejs-game-qa-performance'].map((sourceSkill) => ({
    id: `quality-reuse-healthy-validation-process-${sourceSkill}`, sourceSkill, anchor: 'quality-evidence-and-retests',
    sourceText: '启动服务前检查同一项目、服务类型、模式、端口和健康状态；存在健康实例时复用，不终止归属不明的进程。',
  })),
  ...['cocos-game-qa-performance', 'phaser4-game-qa-performance', 'threejs-game-qa-performance'].map((sourceSkill) => ({
    id: `quality-evidence-scope-${sourceSkill}`, sourceSkill, anchor: 'quality-evidence-and-retests',
    sourceText: '局部任务证据不得宣称全平台通过，不得自动发起真机验收。',
  })),
  {
    id: 'quality-unverified-without-reproducible-evidence-cocos', sourceSkill: 'cocos-game-qa-performance', anchor: 'quality-evidence-and-retests',
    sourceText: '没有可复现证据时标记“未验证”。',
  },
  {
    id: 'quality-not-run-without-measurement-unity', sourceSkill: 'unity-game-qa-performance', anchor: 'quality-evidence-and-retests',
    sourceText: '缺少真实测量时标记 `NOT_RUN` 或 `unverified`。',
  },
  {
    id: 'quality-flutter-local-smoke-scope', sourceSkill: 'flutter-quality-review', anchor: 'quality-evidence-and-retests',
    sourceText: '局部烟测不得声称全平台通过。',
  },
  {
    id: 'quality-flutter-targeted-retest', sourceSkill: 'flutter-subagent-delivery', anchor: 'quality-evidence-and-retests',
    sourceText: '修复后只重跑失败或受影响命令，并重开输入指纹已变化的通道。',
  },
  ...['cocos-game-release', 'phaser4-game-release', 'threejs-game-release'].map((sourceSkill) => ({
    id: `release-candidate-identity-${sourceSkill}`, sourceSkill, anchor: 'release-candidate-evidence',
    sourceText: '从可复现的实际候选和实际执行的构建命令生成候选包，使版本、候选文件与测试证据对应。',
  })),
  ...['cocos-game-release', 'phaser4-game-release', 'threejs-game-release'].map((sourceSkill) => ({
    id: `release-candidate-matrix-${sourceSkill}`, sourceSkill, anchor: 'release-candidate-evidence',
    sourceText: '在平台矩阵和发布清单登记候选包、完成项、阻断项、风险与建议。',
  })),
  ...['cocos-game-release', 'phaser4-game-release', 'threejs-game-release'].map((sourceSkill) => ({
    id: `release-candidate-evidence-binding-${sourceSkill}`, sourceSkill, anchor: 'release-candidate-evidence',
    sourceText: '将实际候选包、构建/打包/签名结果及真实命令输出关联到当前 RELEASE Work Item 的 Evidence Manifest。外部提交、上传或发布前，按当前 Work Item 的 action.approval 核对用户明确批准的目标与动作；复用已覆盖同一目标和动作的真实用户消息引用，不重复索要相同批准。F4 只按当前 Work Item 和实际结果核对发布门禁；工作项完成不等于已提交或已上架，未执行或缺少证据时不得声称完成。',
  })),
  {
    id: 'delegation-flutter-authorized-work-package', sourceSkill: 'flutter-subagent-delivery', anchor: 'delegation-and-review',
    sourceText: 'Controller 记录明确授权、共同基线、互斥写入范围、所有者和项目原生命令；不得把完整会话粘进提示词。',
  },
  {
    id: 'delegation-flutter-read-only-review-record', sourceSkill: 'flutter-subagent-delivery', anchor: 'delegation-and-review',
    sourceText: '审核者只读并返回统一结论；Controller 是持久 review 记录唯一写入者。',
  },
]);

/** 导出按原生来源注册的精确规则声明，供迁移账本校验预期覆盖是否完整。 */
export function expectedNativePromotions(sourceSkill) {
  if (typeof sourceSkill !== 'string') throw new TypeError('sourceSkill 必须是字符串');
  return PROMOTION_RULES
    .filter((rule) => rule.sourceSkill === sourceSkill)
    .map(({ id, sourceSkill: registeredSource, anchor, sourceText }) => ({
      id,
      sourceSkill: registeredSource,
      anchor,
      sourceText,
    }));
}

/** 将文本换行统一为 LF，让章节读取及其哈希不受运行平台影响。 */
function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, '\n');
}

/** 对 UTF-8 文本片段生成 SHA-256，供迁移清单追溯源规则与公共正文。 */
function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** 从公共规范中读取显式锚点对应的完整二级章节，锚点漂移时拒绝静默生成断链。 */
function readPublicSection(markdown, anchor, publicPath) {
  const normalized = normalizeNewlines(markdown);
  const marker = `<a id="${anchor}"></a>`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0 || normalized.indexOf(marker, markerIndex + marker.length) >= 0) {
    throw new Error(`公共规范锚点缺失或重复：${publicPath}#${anchor}`);
  }

  const headingStart = normalized.indexOf('\n## ', markerIndex);
  if (headingStart < 0) throw new Error(`公共规范锚点后没有二级标题：${publicPath}#${anchor}`);
  const headingEnd = normalized.indexOf('\n', headingStart + 1);
  const nextHeading = normalized.indexOf('\n## ', headingEnd < 0 ? normalized.length : headingEnd);
  return normalized.slice(headingStart + 1, nextHeading < 0 ? normalized.length : nextHeading).trimEnd();
}

/** 精确提升已登记原生片段，并返回可校验的源片段与公共章节证据。 */
export function promoteNativeRules(text, { stack, sourceSkill, repositoryRoot } = {}) {
  if (typeof text !== 'string') throw new TypeError('待提升的原生适配正文必须是字符串');
  if (typeof sourceSkill !== 'string') throw new TypeError('sourceSkill 必须是字符串');
  if (!['unity', 'cocos', 'phaser', 'threejs', 'flutter'].includes(stack)) throw new TypeError(`未知技术栈：${stack}`);

  const rules = PROMOTION_RULES.filter((rule) => rule.sourceSkill === sourceSkill);
  if (!rules.length) return { text, promotions: [] };

  const root = path.resolve(repositoryRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
  const publicPath = PUBLIC_PATH;
  const publicFile = path.resolve(root, publicPath);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!publicFile.startsWith(rootPrefix)) throw new Error(`公共规范路径越出仓库：${publicPath}`);
  const publicMarkdown = readFileSync(publicFile, 'utf8');
  const sections = new Map();
  const promotions = [];
  let output = text;

  for (const rule of rules) {
    // 规则必须仍在它登记的技术栈内，避免同名 skill 被误当成迁移来源。
    if (!sourceSkill.startsWith(`${stack === 'phaser' ? 'phaser4' : stack}-`) && stack !== 'flutter') {
      throw new Error(`原生规则来源与技术栈不匹配：${sourceSkill} / ${stack}`);
    }
    const occurrences = countExact(output, rule.sourceText);
    if (occurrences !== 1) {
      throw new Error(`原生规则源片段漂移：${sourceSkill} / ${rule.id}，期望 1 处，实际 ${occurrences} 处`);
    }

    if (!sections.has(rule.anchor)) sections.set(rule.anchor, readPublicSection(publicMarkdown, rule.anchor, publicPath));
    const publicSection = sections.get(rule.anchor);
    const replacementText = `[公共${sectionLabel(rule.anchor)}](../app-creator-workflow/references/professional-conventions.md#${rule.anchor})`;
    output = replaceExactOnce(output, rule.sourceText, replacementText);
    promotions.push({
      id: rule.id,
      sourceSkill,
      stack,
      publicPath,
      anchor: rule.anchor,
      sourceText: rule.sourceText,
      replacementText,
      sourceHash: sha256(rule.sourceText),
      publicHash: sha256(publicSection),
    });
  }

  return { text: coalesceAdjacentReferences(output, promotions), promotions };
}

/** 把同一原生步骤中连续指向同一公共章节的链接合并成单个入口。 */
function coalesceAdjacentReferences(text, promotions) {
  let output = text;
  const links = [...new Set(promotions.map((promotion) => promotion.replacementText))];
  for (const link of links) output = output.replaceAll(link + link, link);
  return output;
}

/** 统计不重叠的逐字命中次数，避免含正则元字符的技术文本误匹配。 */
function countExact(text, fragment) {
  let count = 0;
  let offset = 0;
  while (true) {
    const found = text.indexOf(fragment, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + fragment.length;
  }
}

/** 仅在唯一命中时替换原文，确保规则改动必须同步更新其审计定义。 */
function replaceExactOnce(text, fragment, replacement) {
  const index = text.indexOf(fragment);
  if (index < 0 || text.indexOf(fragment, index + fragment.length) >= 0) {
    throw new Error('待替换片段在校验后发生变化，拒绝继续迁移');
  }
  return text.slice(0, index) + replacement + text.slice(index + fragment.length);
}

/** 根据锚点选择统一的人类可读链接名。 */
function sectionLabel(anchor) {
  return {
    'planning-scope-and-acceptance': '策划范围与验收约定',
    'architecture-module-contracts': '架构模块契约',
    'quality-evidence-and-retests': '质量证据与返修复验约定',
    'release-candidate-evidence': '发布候选与证据约定',
    'delegation-and-review': '委派与独立审核约定',
  }[anchor] ?? '岗位公共约定';
}
