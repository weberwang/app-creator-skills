/** 抽取游戏专业技能中完整等价的正文，原生接口和配套资料继续由栈入口持有。 */
import { createHash } from 'node:crypto';
import { adaptOptionalReviewDocument } from './optional-review-documents.mjs';
import { unifySourceVisualStages } from './unified-stage-text.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PREFIXES = Object.freeze({ unity: 'unity', cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const FAMILIES = Object.freeze([
  { id: 'asset-production', title: '视觉素材生产与还原', suffix: 'game-asset-integration' },
  { id: 'ui-layout', title: '界面布局生产', suffix: 'game-ui-layout' },
  { id: 'quality-verification', title: '游戏质量验证', suffix: 'game-qa-performance' },
  { id: 'gameplay-implementation', title: '玩法实施与交接', suffix: 'gameplay-development' },
  { id: 'modeling-production', title: '正式模型生产', suffix: 'game-3d-modeling', stacks: ['unity', 'cocos', 'threejs'] },
  { id: 'game-production', title: '游戏需求与制作交接', suffix: 'game-production' },
  { id: 'architecture-handoff', title: '工程架构与模块交接', suffix: 'game-architecture' },
  { id: 'spine-reskin-production', title: 'Spine 生成式换皮生产', suffix: 'spine-generative-reskin' },
  { id: 'frame-animation-execution', title: '帧动画生产与执行约束', suffix: 'frame-animation' },
  { id: 'feedback-lifecycle', title: '动态反馈生命周期', suffix: 'game-juice' },
  { id: 'advertising-integration', title: '广告接入的通用交接', suffix: 'game-ad-integration' },
  { id: 'artifact-cleanup-execution', title: '产物保留与清理执行', suffix: 'game-artifact-cleanup' },
  { id: 'audio-implementation', title: '音频基础服务与验证', suffix: 'game-audio' },
]);
const PUBLIC_POLICY = /控制面边界|本领域可提议|Implementation Package|game-workflow-control|风险门|preflight|diff-audit|evidence-check|prepare-approval|为唯一任务范围|用户要求清理时|执行前复核|`(?:handoff|approve)`/;
const NATIVE_RULES = /\b(?:Unity|Creator|Cocos|Phaser|ThreeJS|AssetDB|UITransform|SpriteFrame|Widget|ModelImporter|LODGroup|GLTFLoader|Object3D|WebGLRenderer|ScaleManager)\b|Three\.js|Phaser\.|(?:cocos|phaser|threejs)-native|Time\.timeScale/;

/** 仅统一换行及外层空白，不抹去参数、平台或原生对象差异。 */
function digest(text) {
  return createHash('sha256').update(text.trim().replaceAll('\r\n', '\n')).digest('hex');
}

/** 按完整段落和列表项记录原字符区间，围栏代码及嵌套续行始终留在原技能。 */
export function readWorkflowBlocks(text) {
  const result = [];
  let offset = 0;
  let start = null;
  let heading = '正文';
  let fenced = false;
  let frontmatter = text.startsWith('---');
  let delimiters = 0;
  let listIndent = null;
  // 段落切片保留原始换行，后续可以逐字校验未抽出的专业内容。
  const flush = (end) => {
    if (start !== null && text.slice(start, end).trim()) result.push({ original: text.slice(start, end), sourceRange: { start, end }, sourceHeading: heading });
    start = null;
    listIndent = null;
  };
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const position = offset;
    offset += line.length;
    if (frontmatter) {
      if (line.trim() === '---' && ++delimiters === 2) frontmatter = false;
      continue;
    }
    if (/^\s*(?:```|~~~)/.test(line)) fenced = !fenced;
    if (!fenced) {
      const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      if (match) { flush(position); heading = match[1]; continue; }
      if (!line.trim()) { flush(position); continue; }
      const item = line.match(/^([ \t]*)(?:\d+[.)]|[-*+])\s+/);
      if (item && start !== null && listIndent === item[1].length) flush(position);
      if (start === null && item) listIndent = item[1].length;
    }
    if (start === null) start = position;
  }
  flush(text.length);
  return result;
}

/** 资料名称可以通用，真实 href 仍在各自入口解析，避免公共文档依赖未安装的其他栈。 */
function normalizeReferenceLabel(label) {
  return label.replace(/(?:cocos|phaser4|threejs)-game-ui-layout/g, '本栈 UI 布局技能')
    .replace(/(?:cocos|phaser4|threejs)-frame-animation/g, '本栈帧动画技能')
    .replace(/(?:cocos|phaser4|threejs)-game-workflow-control/g, 'app-workflow-control');
}

/** 只消除资料链接和列表编号的表示差异，禁止用替换引擎名推断实现等价。 */
export function canonicalWorkflowBlock(original, { routeScripts = true } = {}) {
  const referenceLinks = [];
  const canonical = original.trim().replaceAll('\r\n', '\n').replace(/^\d+[.)]\s+/, '')
    .replace(/`(?:cocos|phaser4|threejs)-game-workflow-control`/g, '`app-workflow-control`')
    .replace(/`(scripts\/[^`\s]+\.(?:mjs|js))`/g, (_match, script) => {
      if (!routeScripts) return _match;
      referenceLinks.push({ label: script, target: `./${script}` });
      return `本栈脚本 ${script.split('/').at(-1)}（见本栈配套资料）`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, target) => {
      referenceLinks.push({ label, target });
      return `“${normalizeReferenceLabel(label).replaceAll('`', '')}”（见本栈配套资料）`;
    });
  return { canonical, referenceLinks };
}

/** 扫描已声明的同领域技能；只抽出至少两栈正文完全等价的段落。 */
export function buildWebWorkflowBodies({ sourceRoot, repositoryRoot, excludedReplacements = [] }) {
  const documents = [];
  const replacements = [];
  for (const family of FAMILIES) {
    const groups = new Map();
    for (const stack of family.stacks ?? Object.keys(PREFIXES)) {
      const stackRoot = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
      if (!stackRoot) continue;
      const sourcePath = `${stack === 'unity' ? '' : 'skills/'}${PREFIXES[stack]}-${family.suffix}/SKILL.md`;
      const sourceFile = resolve(stackRoot, sourcePath);
      if (!existsSync(sourceFile)) continue;
      for (const block of readWorkflowBlocks(readFileSync(sourceFile, 'utf8'))) {
        // 旧公共正文仍只有一份真源，新增抽取不能再次占用已有的源规则区间。
        if (excludedReplacements.some((item) => item.stack === stack && item.sourcePath === sourcePath
          && item.sourceRange.start < block.sourceRange.end && item.sourceRange.end > block.sourceRange.start)) continue;
        if (block.original.length < 80 || /```|~~~/.test(block.original)) continue;
        const normalized = canonicalWorkflowBlock(block.original);
        const { referenceLinks } = normalized;
        let canonical = adaptOptionalReviewDocument(normalized.canonical, { sourcePath, destination: `skills/app-domain-toolkit/references/${family.id}.md` }).text;
        let alreadyUnified = false;
        if (family.id === 'ui-layout') {
          // 多语言范围由项目初始化选择，迁移旧源时不能恢复固定五语言要求。
          canonical = canonical.replace('程序化文本必须同时交付英语、简体中文、日语、俄语和西班牙语', '程序化文本默认交付简体中文 `zh-CN`，英语 `en` 等其他语言按项目初始化时确认的清单交付');
        }
        if (family.id === 'asset-production') {
          // AUTO 只消除额外产品取舍，不能替代 V1 目标图的真实用户确认。
          canonical = canonical
            .replace('用户在 V2 只需分别确认拆解 PNG 与布局 PNG', '`AUTO` 只表示无需额外产品取舍，V1 的真实目标图仍须用户确认；用户在 V2 分别确认拆解 PNG 与布局 PNG')
            .replace('只有产品方向、玩法语义或结构存在实质歧义时才询问。V2 保持', '只有产品方向、玩法语义或结构存在实质歧义时才询问额外取舍；目标图仍须在 V1 由用户确认。V2 保持');
          // 公共控制器已先验证功能；原生视觉合同编号不能冒充公共阶段。
          const prior = canonical;
          canonical = canonical.replace('当前场景 Work Item 按控制面定义的 V1→V2→V3→V4 阶段推进；本领域负责在 V2 依次完成拆解 PNG 和布局 PNG 两次独立人工确认后生产正式资源，在 V3 完成资源级验收，V4 直接在正式场景实现、校准并验收运行态画面。正式代码只消费当前场景或合规 `shared` 且 V3 `accepted` 的资源；公共正式资源只允许至少两个场景稳定复用或属于运行必需。场景联合验收前必须清除灰盒、占位和 fallback。',
            '当前场景 Work Item 按 V1 功能验证、V2 视觉目标、V3 拆解与布局、V4 正式资源和 V5 运行验收推进，白盒按需使用。V3 依次完成人工确认拆解 PNG 和布局 PNG，V4 进行资源级验收，V5 在正式场景组合、校准并验收运行态画面。正式视觉装配只消费当前场景或合规 `shared` 且 V4 `accepted` 的资源；公共正式资源只允许至少两个场景稳定复用或属于运行必需。场景联合验收前清除不再使用的灰盒、占位和 fallback。');
          alreadyUnified = canonical !== prior;
        }
        if (family.id === 'frame-animation-execution') {
          canonical = canonical.replace('不得自动截图或启动真机验收', '可采集截图供用户人工检查，未经明确授权不得自动分析截图或代判；不得自动启动真机验收');
        }
        if (family.id === 'gameplay-implementation' && /全局阶段、视觉硬门和场景前置以/.test(canonical)) continue;
        if (PUBLIC_POLICY.test(canonical) || NATIVE_RULES.test(canonical) || /\bnode\s+scripts\//.test(canonical)) continue;
        if (!alreadyUnified) canonical = unifySourceVisualStages(canonical);
        if (!groups.has(canonical)) groups.set(canonical, []);
        groups.get(canonical).push({ ...block, canonical, referenceLinks, stack, sourcePath });
      }
    }
    const shared = [...groups.values()].filter((items) => new Set(items.map((item) => item.stack)).size >= 2
      && new Set(items.map((item) => item.stack)).size === items.length);
    if (!shared.length) continue;
    const commonPath = `skills/app-domain-toolkit/references/${family.id}.md`;
    const sources = new Map();
    for (const items of shared) for (const item of items) {
      const section = { sourceHash: digest(item.original), canonicalHash: digest(item.canonical), heading: '完整流程', sourceHeading: item.sourceHeading, sourceRange: item.sourceRange, original: item.original.trim().replaceAll('\r\n', '\n'), canonical: item.canonical };
      const key = `${item.stack}:${item.sourcePath}`;
      if (!sources.has(key)) sources.set(key, { stack: item.stack, sourcePath: item.sourcePath, sections: [] });
      sources.get(key).sections.push(section);
      replacements.push({ ...item, ...section, original: item.original, capabilityId: family.id, commonPath });
    }
    const stageNote = shared.some((items) => /\bV[1-5]\b/.test(items[0].canonical))
      ? '\n各技术栈统一使用 V0–V5，V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。\n' : '';
    documents.push({
      path: commonPath, capabilityId: family.id,
      reason: '按完整正文核对后合并专业技能规则；只归一化引用表示，原生 API、运行时与平台约束不参与相似替换。',
      content: `# ${family.title}\n\n本规范是列入迁移清单的技术栈共用的完整规则。每段标明适用栈；执行时同时读取本栈技能的原生约束与“本栈配套资料”，资料路径和具体工具由栈入口维护。公共状态与授权仍由 app-workflow-control 管理。\n${stageNote}\n## 完整流程\n\n${shared.map((items) => `### ${/全局控制接入|控制面与职责/.test(items[0].sourceHeading) ? '专业执行与交付' : unifySourceVisualStages(items[0].sourceHeading)}（${items.map((item) => item.stack).join('、')}）\n\n${items[0].canonical}`).join('\n\n')}\n`,
      sources: [...sources.values()],
    });
  }
  return { documents, replacements, repositoryRoot };
}
