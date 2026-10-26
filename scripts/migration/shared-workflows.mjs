/** 从三栈专业 Skill 中抽取可证实相同的工作规则，供迁移器生成公共参考文档。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildWebWorkflowBodies } from './web-workflow-bodies.mjs';
import { buildGameWorkflowFamilies } from './game-workflow-families.mjs';
import { buildModelingWorkflowFamily } from './modeling-workflow-family.mjs';

const STACKS = Object.freeze({
  cocos: Object.freeze({
    directory: 'cocos-skills',
    skills: Object.freeze({
      'artifact-cleanup': 'cocos-game-artifact-cleanup',
      'image-optimization': 'cocos-game-image-optimization',
      audio: 'cocos-game-audio',
      juice: 'cocos-game-juice',
      balance: 'cocos-game-balance',
      'frame-animation': 'cocos-frame-animation',
      release: 'cocos-game-release',
      'ad-integration': 'cocos-game-ad-integration',
    }),
  }),
  phaser: Object.freeze({
    directory: 'phaser-skills',
    skills: Object.freeze({
      'artifact-cleanup': 'phaser4-game-artifact-cleanup',
      'image-optimization': 'phaser4-game-image-optimization',
      audio: 'phaser4-game-audio',
      juice: 'phaser4-game-juice',
      balance: 'phaser4-game-balance',
      'frame-animation': 'phaser4-frame-animation',
      release: 'phaser4-game-release',
      'ad-integration': 'phaser4-game-ad-integration',
    }),
  }),
  threejs: Object.freeze({
    directory: 'threejs-skills',
    skills: Object.freeze({
      'artifact-cleanup': 'threejs-game-artifact-cleanup',
      'image-optimization': 'threejs-game-image-optimization',
      audio: 'threejs-game-audio',
      juice: 'threejs-game-juice',
      balance: 'threejs-game-balance',
      'frame-animation': 'threejs-frame-animation',
      release: 'threejs-game-release',
      'ad-integration': 'threejs-game-ad-integration',
    }),
  }),
});

const CAPABILITIES = Object.freeze([
  'artifact-cleanup',
  'image-optimization',
  'audio',
  'juice',
  'balance',
  'frame-animation',
  'release',
  'ad-integration',
]);
const CAPABILITY_TITLES = Object.freeze({
  'artifact-cleanup': '产物清理',
  'image-optimization': '图片优化',
  audio: '音频工作流',
  juice: '反馈表现',
  balance: '数值平衡',
  'frame-animation': '帧动画制作',
  release: '发布准备',
  'ad-integration': '广告接入',
});
const SHARED_PREFIX = 'skills/app-domain-toolkit/references/';
const MINIMUM_DOCUMENT_CHARACTERS = 120;
const HEADING_OVERRIDES = Object.freeze({
  'image-optimization': Object.freeze({ '全局控制接入': '优化目标' }),
  audio: Object.freeze({ '全局控制接入': '音频需求与资产交接' }),
  balance: Object.freeze({ '全局控制接入': '数值模型与参数交付' }),
  juice: Object.freeze({ '控制面与职责': '模块职责边界' }),
  release: Object.freeze({ '全局控制接入': '发布准备与依赖审查' }),
});
const CONTROL_POLICY_PATTERN = /\b(?:F[0-4]|V[0-4]|A[0-6]\s*[-–—]\s*A[0-6])\b|A4\s*[-–—]\s*A6|A5\s*\/\s*A6|workflow[- ]control|控制面|状态迁移|审批|请求批准|明确批准|明确授权|用户授权|已授权的范围|授权只覆盖|获准资源|唯一.{0,8}权威|用户未指定|用户审阅|用户明确.{0,8}(?:确认|选择|批准|授权)|截图|人工(?:验收|确认|检查)|手感由用户|真机|自动提交|自动发布|自动写入|自动分析画面|自动启动|外部写入|付费操作/i;
const LINK_PATTERN = /\]\s*\(|^\s*\[[^\]]+\]:\s*\S+/m;

/** 按迁移账本语义计算源块和公共块摘要，规避平台换行符差异。 */
function blockHash(text) {
  return createHash('sha256').update(text.trim().replace(/\r\n/g, '\n')).digest('hex');
}

/** 将不同形态的源根统一解析成按技术栈索引的绝对路径。 */
function resolveSourceRoot(sourceRoot, stack) {
  if (typeof sourceRoot === 'string') return path.resolve(sourceRoot, STACKS[stack].directory);
  if (sourceRoot && typeof sourceRoot === 'object' && typeof sourceRoot[stack] === 'string') {
    return path.resolve(sourceRoot[stack]);
  }
  throw new TypeError('sourceRoot 必须是 Git 父目录或包含 cocos、phaser、threejs 根路径的对象');
}

/** 按段解析 Markdown，避免把标题、代码围栏或空行误当作正文规则。 */
function extractMarkdownBlocks(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const blocks = [];
  let offset = 0;
  let start = -1;
  let currentHeading = '文档正文';
  let fenced = false;
  let listIndent = null;
  let frontmatter = text.startsWith('---\n') || text.startsWith('---\r\n');
  let frontmatterDelimiterCount = 0;
  let frontmatterEnded = !frontmatter;
  const tick = String.fromCharCode(96);

  const flush = (end) => {
    if (start >= 0 && end > start) {
      const original = text.slice(start, end);
      if (original.trim()) blocks.push({ heading: currentHeading, original, sourceRange: { start, end } });
    }
    start = -1;
    listIndent = null;
  };

  for (const lineWithEnding of lines) {
    const lineOffset = offset;
    offset += lineWithEnding.length;
    const line = lineWithEnding.replace(/\r?\n$/, '');
    if (!frontmatterEnded) {
      if (line.trim() === '---') {
        frontmatterDelimiterCount += 1;
        if (frontmatterDelimiterCount === 2) frontmatterEnded = true;
      }
      continue;
    }
    const trimmed = line.trimStart();
    if (trimmed.startsWith(tick.repeat(3)) || trimmed.startsWith('~~~')) {
      if (start < 0) start = lineOffset;
      fenced = !fenced;
      continue;
    }
    if (!fenced) {
      const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      if (headingMatch) {
        flush(lineOffset);
        currentHeading = headingMatch[1].trim();
        continue;
      }
      if (!line.trim()) {
        flush(lineOffset);
        continue;
      }
      const listMatch = line.match(/^([ \t]*)(?:\d+[.)]|[-*+])\s+/);
      if (listMatch && start >= 0 && listIndent !== null && listMatch[1].length === listIndent) flush(lineOffset);
      if (start < 0 && listMatch) listIndent = listMatch[1].length;
    }
    if (start < 0) start = lineOffset;
  }
  flush(text.length);
  return blocks;
}

/** 仅把可见正文中的栈名规范化；代码、路径和链接目标不参加等价判断。 */
function canonicalizeStackName(text, stack) {
  const stackPattern = stack === 'cocos'
    ? /\bCocos\b(?!\s+Creator)/gi
    : stack === 'phaser'
      ? /\bPhaser\b/gi
      : /\bThreeJS\b|\bThree\.js\b/gi;
  let output = '';
  let cursor = 0;
  let codeTicks = 0;
  for (let index = 0; index < text.length;) {
    if (text.charCodeAt(index) === 96) {
      let end = index + 1;
      while (text.charCodeAt(end) === 96) end += 1;
      const runLength = end - index;
      if (codeTicks === 0) {
        output += text.slice(cursor, index).replace(stackPattern, '[[STACK]]');
        cursor = index;
        codeTicks = runLength;
      } else if (runLength === codeTicks) {
        output += text.slice(cursor, end);
        cursor = end;
        codeTicks = 0;
      }
      index = end;
      continue;
    }
    index += 1;
  }
  const tail = text.slice(cursor);
  output += codeTicks === 0 ? tail.replace(stackPattern, '[[STACK]]') : tail;
  // 入口已合并，显式调用策略按公共能力名维护；这不是原生 API 的字符串归一化。
  return output.replace(/\r\n?/g, '\n').trim().replace(/\$(?:cocos|phaser4|threejs)-game-image-optimization\b/g, '$app-image-optimization');
}

/** 判断一个正文块是否只表达可移植工作，而不携带控制器或相对链接合同。 */
function isEligibleSharedBlock(block) {
  const text = block.original;
  if (text.includes(String.fromCharCode(96).repeat(3)) || text.includes('~~~') || LINK_PATTERN.test(text)) return false;
  if (/^[-*]\s+只有用户显式调用 `\$(?:cocos|phaser4|threejs)-game-image-optimization` 时才提出任务/.test(text)) return true;
  if (CONTROL_POLICY_PATTERN.test(text)) return false;
  if (/\b(?:AssetDB|WebGLRenderer|Raycaster|ScenePlugin|ScaleManager)\b|Phaser\.Scene|Creator\s+MCP|(?:\.meta|\.scene|\.prefab)\b|world\s+projection/i.test(text)) return false;
  return true;
}

/** 计算文档标题链接使用的稳定片段标识。 */
function headingAnchor(heading) {
  return heading
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** 对误放在控制接入标题下的专业内容使用准确标题，避免公共文档复活旧总控规则。 */
function sharedHeading(capabilityId, heading) {
  return HEADING_OVERRIDES[capabilityId]?.[heading] ?? heading;
}

/** 将迁移目标路径规范成相对仓库根的 POSIX 路径。 */
function destinationRelativePath(destination, repositoryRoot) {
  if (path.isAbsolute(destination)) return path.relative(repositoryRoot, destination).split(path.sep).join('/');
  return destination.replace(/\\/g, '/').replace(/^\.?\//, '');
}

/** 生成从专业入口到公共规范的链接，始终按最终目标文件位置计算。 */
function sharedLink(destination, repositoryRoot, commonPath, anchor) {
  const relativeDestination = destinationRelativePath(destination, repositoryRoot);
  const sourceDirectory = path.posix.dirname(relativeDestination);
  let href = path.posix.relative(sourceDirectory, commonPath);
  if (!href.startsWith('.')) href = './' + href;
  return href + '#' + anchor;
}

/** 替换块时保留 Markdown 列表标记及原有换行，避免入口结构损坏。 */
function replacementText(original, href) {
  const listPrefix = original.match(/^([ \t]*(?:\d+[.)]|[-*+])\s+)/)?.[1] ?? '';
  const lineEnding = original.endsWith('\r\n') ? '\r\n' : original.endsWith('\n') ? '\n' : '';
  const prefix = listPrefix || '> ';
  return prefix + '通用工作流步骤见[完整规范](' + href + ')。' + lineEnding;
}

/** 创建公共文档正文，保留每个已证明相同的完整规则块。 */
function renderDocument(capabilityId, groups) {
  const title = CAPABILITY_TITLES[capabilityId];
  const sections = new Map();
  for (const group of groups) {
    const heading = group.heading.replace(/\[\[STACK\]\]/g, '当前技术栈');
    if (!sections.has(heading)) sections.set(heading, []);
    sections.get(heading).push(group.canonicalContent);
  }
  const body = [];
  for (const [heading, blocks] of sections) {
    body.push('## ' + heading, blocks.join('\n\n'));
  }
  return [
    '# ' + title + ' 通用工作流',
    '',
    '本规范只承接三栈内容一致且不依赖引擎接口的完整规则块；专业入口继续维护各自的资源路径、API、版本与运行时约束。',
    '',
    body.join('\n\n'),
    '',
  ].join('\n');
}

/** 生成三栈共同规则及逐段迁移账本；未形成三方等价组的内容保持在专业入口。 */
function buildExactWorkflowPlan({ sourceRoot, repositoryRoot }) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot) {
    throw new TypeError('repositoryRoot 必须是非空路径');
  }
  const resolvedRepositoryRoot = path.resolve(repositoryRoot);
  const documents = [];
  const replacements = [];

  for (const capabilityId of CAPABILITIES) {
    const groupsByCanonical = new Map();
    for (const stack of Object.keys(STACKS)) {
      const root = resolveSourceRoot(sourceRoot, stack);
      const skillName = STACKS[stack].skills[capabilityId];
      const sourcePath = 'skills/' + skillName + '/SKILL.md';
      const absoluteSource = path.join(root, 'skills', skillName, 'SKILL.md');
      let sourceText;
      try {
        sourceText = readFileSync(absoluteSource, 'utf8');
      } catch (error) {
        throw new Error('无法读取三栈源 Skill：' + absoluteSource + ' (' + error.message + ')');
      }
      for (const block of extractMarkdownBlocks(sourceText)) {
        if (!isEligibleSharedBlock(block)) continue;
        const canonical = canonicalizeStackName(block.original, stack);
        const canonicalHeading = canonicalizeStackName(block.heading, stack);
        const identityHash = createHash('sha256').update(canonicalHeading + '\n' + canonical).digest('hex');
        const canonicalContent = canonical.replace(/\s*\[\[STACK\]\]\s*/g, '当前技术栈');
        if (!groupsByCanonical.has(identityHash)) {
          groupsByCanonical.set(identityHash, {
            canonical,
            canonicalContent,
            heading: sharedHeading(capabilityId, canonicalHeading.replace(/\[\[STACK\]\]/g, '当前技术栈')),
            canonicalHash: blockHash(canonicalContent),
            occurrences: { cocos: [], phaser: [], threejs: [] },
          });
        }
        groupsByCanonical.get(identityHash).occurrences[stack].push({
          stack,
          sourcePath,
          original: block.original,
          sourceHeading: block.heading,
          sourceRange: block.sourceRange,
          sourceHash: blockHash(block.original),
        });
      }
    }

    const commonGroups = [...groupsByCanonical.values()].filter((group) => (
      Object.keys(STACKS).every((stack) => group.occurrences[stack].length > 0)
      && Object.keys(STACKS).every((stack) => group.occurrences[stack].length === group.occurrences.cocos.length)
    ));
    const commonCharacterCount = commonGroups.reduce((sum, group) => sum + group.canonical.length, 0);
    if (!commonGroups.length || commonCharacterCount < MINIMUM_DOCUMENT_CHARACTERS) continue;

    const commonPath = SHARED_PREFIX + capabilityId + '.md';
    const document = {
      path: commonPath,
      content: renderDocument(capabilityId, commonGroups),
      capabilityId,
      sources: [],
    };
    for (const stack of Object.keys(STACKS)) {
      const destination = 'skills/' + STACKS[stack].skills[capabilityId] + '/SKILL.md';
      const sourceGroups = commonGroups.flatMap((group) => group.occurrences[stack].map((occurrence) => ({ group, occurrence })));
      const sourceSections = sourceGroups.map(({ group, occurrence }) => ({
        sourceHash: occurrence.sourceHash,
        canonicalHash: group.canonicalHash,
        heading: group.heading,
        sourceHeading: occurrence.sourceHeading,
        sourceRange: occurrence.sourceRange,
        original: occurrence.original.trim().replace(/\r\n/g, '\n'),
        canonical: group.canonicalContent,
      }));
      document.sources.push({
        stack,
        sourcePath: sourceGroups[0].occurrence.sourcePath,
        sections: sourceSections,
      });

      for (const { group, occurrence } of sourceGroups) {
        const anchor = headingAnchor(group.heading);
        const href = sharedLink(destination, resolvedRepositoryRoot, commonPath, anchor);
        const replacement = replacementText(occurrence.original, href);
        replacements.push({
          stack,
          sourcePath: occurrence.sourcePath,
          original: occurrence.original,
          replacement,
          capabilityId,
          commonPath,
          heading: group.heading,
          sourceHeading: occurrence.sourceHeading,
          sourceRange: occurrence.sourceRange,
          sourceHash: occurrence.sourceHash,
          canonicalHash: group.canonicalHash,
          canonical: group.canonicalContent,
        });
      }
    }
    documents.push(document);
  }

  return { documents, replacements, repositoryRoot: resolvedRepositoryRoot };
}

/** 在旧逐段抽取之上补齐素材、布局、QA、玩法与建模的完整公共正文。 */
export function buildSharedWorkflowPlan(options) {
  const base = buildExactWorkflowPlan(options);
  const games = buildGameWorkflowFamilies({ ...options, basePlan: base });
  const replaced = new Set(games.documents.map((document) => document.capabilityId));
  const documents = [...base.documents.filter((document) => !replaced.has(document.capabilityId)), ...games.documents];
  const replacements = [...base.replacements.filter((item) => !replaced.has(item.capabilityId)), ...games.replacements];
  const bodies = buildWebWorkflowBodies({ ...options, excludedReplacements: replacements });
  const modeling = buildModelingWorkflowFamily(options);
  const modelingIds = new Set(modeling.documents.map((document) => document.capabilityId));
  return { ...base, documents: [...documents, ...bodies.documents.filter((document) => !modelingIds.has(document.capabilityId)), ...modeling.documents],
    replacements: [...replacements, ...bodies.replacements.filter((item) => !modelingIds.has(item.capabilityId)), ...modeling.replacements] };
}

/** 在迁移前验证源规则仍与审计计划逐字一致，再替换成公共规范链接。 */
export function applySharedWorkflowSections(text, { stack, sourcePath, destination, repositoryRoot, plan }) {
  if (typeof text !== 'string') throw new TypeError('待迁移 Skill 必须是字符串');
  if (!['unity', 'flutter', ...Object.keys(STACKS)].includes(stack)) throw new TypeError('未知技术栈：' + stack);
  if (typeof sourcePath !== 'string' || typeof destination !== 'string' || !plan) {
    throw new TypeError('sourcePath、destination 与 plan 均为必需参数');
  }
  const normalizedSourcePath = sourcePath.replace(/\\/g, '/');
  const matches = plan.replacements.filter((item) => item.stack === stack && item.sourcePath === normalizedSourcePath);
  if (!matches.length) return { text, sharedReferences: [], transforms: [] };

  const root = repositoryRoot ? path.resolve(repositoryRoot) : path.resolve(plan.repositoryRoot ?? process.cwd());
  const occurrences = [];
  const byOriginal = new Map();
  for (const item of matches) {
    if (!byOriginal.has(item.original)) byOriginal.set(item.original, []);
    byOriginal.get(item.original).push(item);
  }
  for (const [original, items] of byOriginal) {
    let cursor = 0;
    const found = [];
    while (true) {
      const index = text.indexOf(original, cursor);
      if (index < 0) break;
      found.push(index);
      cursor = index + original.length;
    }
    if (found.length !== items.length) {
      throw new Error('公共工作流源块漂移：' + normalizedSourcePath + '，期望 ' + items.length + ' 处，实际 ' + found.length + ' 处');
    }
    items.sort((a, b) => a.sourceRange.start - b.sourceRange.start);
    for (let index = 0; index < found.length; index += 1) {
      const item = items[index];
      const actualHeading = [...text.slice(0, found[index]).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)].at(-1)?.[1]?.trim() ?? '文档正文';
      if (actualHeading !== item.sourceHeading) {
        throw new Error('公共工作流章节漂移：' + normalizedSourcePath + '，预期标题“' + item.sourceHeading + '”，实际“' + actualHeading + '”');
      }
      occurrences.push({ index: found[index], end: found[index] + original.length, item });
    }
  }
  occurrences.sort((a, b) => a.index - b.index);
  for (let index = 1; index < occurrences.length; index += 1) {
    if (occurrences[index].index < occurrences[index - 1].end) {
      throw new Error('公共工作流计划包含重叠源块：' + normalizedSourcePath);
    }
  }

  let output = text;
  const sharedReferences = [];
  const transforms = [];
  const referenceLinks = new Map();
  for (const occurrence of occurrences.reverse()) {
    const { item } = occurrence;
    const anchor = headingAnchor(item.heading);
    const href = sharedLink(destination, root, item.commonPath, anchor);
    const replacement = replacementText(item.original, href)
      + (item.nativeSupplement ? `\n${item.nativeSupplement}\n` : '');
    output = output.slice(0, occurrence.index) + replacement + output.slice(occurrence.end);
    sharedReferences.push({
      capabilityId: item.capabilityId,
      commonPath: item.commonPath,
      heading: item.heading,
      href,
    });
    transforms.push('extract-common-workflow:' + item.capabilityId);
    for (const link of item.referenceLinks ?? []) referenceLinks.set(`${link.label}:${link.target}`, link);
  }
  // 链接仍按原技能目录解释；公共正文只约定资料名称，不反向依赖其他栈的安装目录。
  if (referenceLinks.size) output = `${output.trimEnd()}\n\n## 本栈配套资料\n\n${[...referenceLinks.values()].map((link) => `- [${link.label}](${link.target})`).join('\n')}\n`;
  return {
    text: output,
    sharedReferences: [...new Set(sharedReferences.map((reference) => reference.href))],
    transforms: [...new Set(transforms)],
  };
}

