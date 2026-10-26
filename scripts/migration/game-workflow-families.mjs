/** 将多技术栈游戏音频与数值工作流融入现有完整公共规范。 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FAMILY_PATHS = Object.freeze({
  audio: Object.freeze({
    title: '音频工作流', heading: '音频需求与资产交接', lifecycleHeading: '后台暂停与恢复约束',
    skills: Object.freeze({ unity: 'unity-game-audio', cocos: 'cocos-game-audio', phaser: 'phaser4-game-audio', threejs: 'threejs-game-audio' }),
    common: Object.freeze({
      '1. 按核心反馈': '1. 按核心反馈、用户界面、环境、音乐、语音与可访问性定义事件、优先级和静默降级行为；标明首次播放依赖的用户交互。',
      '2. 向美术接入角色': '2. 在资源登记记录来源、授权或生成、格式、采样率、声道、时长、循环点、响度、压缩、加载方式、大小、用途和发布资格；共享登记由单一所有者串行更新。',
      '3. 设计静音': '3. 在基础模块规划统一音频服务、分组、静音、首次交互播放和生命周期接入；后台暂停与恢复必须遵守下方实例所有权、暂停原因及恢复边界。',
      '4. 依据运行时内存': '4. 按运行时内存、解码与加载预算及渠道音频规格选择策略；标出未授权、不可循环、峰值过高或违反渠道限制的资源，再决定压缩、分组和加载方式。',
      '向玩法提供触发时机': '向玩法交付事件语义、触发时机、分组和资源标识；向测试交付功能、响度、生命周期与预算检查；向发布交付来源授权及发布资格。',
    }),
    lifecycle: Object.freeze({
      '- 在基础模块阶段': '- 在基础模块建立统一生命周期服务及平台适配。页面隐藏、应用后台或系统音频中断时立即暂停当前所有应管理的音乐、音效和语音；仅当桌面目标规定失焦会中断音频时，再将窗口失焦加入暂停原因。后台期间不启动新播放，也不推迟到各场景分别处理。',
      '- 暂停时保存播放位置': '- 记录此次因生命周期暂停的有效实例及播放位置；所有后台原因解除后，只恢复仍有效且无其他暂停原因的实例，并保留位置、循环、音量和静音设置。手动暂停、停止、销毁、场景退出或用户取消的实例不得复活或重复创建。',
      '- 页面可见性、原生生命周期': '- 合并页面、宿主、系统中断、手动和玩法暂停原因，重复或交错通知保持幂等；只有全部暂停原因解除才恢复。后台新请求直接丢弃、不排队补播；异步恢复期间再次进入后台不得发声。',
      '- 浏览器或宿主限制自动恢复': '- 遵守浏览器自动播放和宿主恢复限制：不能自动恢复时保留待恢复状态，等待获准的用户交互或音频恢复事件并如实记录失败，不绕过限制或假报成功。生命周期监听随服务销毁清理。项目技术设计记录必须声明无法精确续播时可验证的恢复误差与降级行为。',
    }),
  }),
  balance: Object.freeze({
    title: '数值平衡', heading: '数值模型与参数交付',
    skills: Object.freeze({ unity: 'unity-game-balance', cocos: 'cocos-game-balance', phaser: 'phaser4-game-balance', threejs: 'threejs-game-balance' }),
    common: Object.freeze({
      '将体验目标转': '把体验目标转成可解释、可调整、可验证的模型；每次调整都记录依据，不能用没有记录的主观试值代替证据。',
      '1. 定义玩家节奏': '1. 定义玩家节奏与成功率、资源来源和消耗、失败成本、保底、上下限及异常边界；涉及经济或成长时说明关键流入、流出及玩家进程。',
      '2. 在 balance.md': '2. 在 balance.md 记录参数名称、单位、默认值、来源、公式、影响、敏感度和验证方式；运行时从集中且可版本化的配置读取，使结果可以追溯和复现。',
      '3. 为高风险曲线': '3. 为高风险曲线保留可复现计算、模拟种子、样本规模和试玩记录；模拟或表格不是游戏内验证，涉及合规或商业能力时交由发布角色同步核对。',
      '交给玩法的是参数表': '向玩法交付参数、边界行为和验收样例；向 QA 交付统计口径、容差、预期结果及高风险场景；证据须区分离线模型结果与实际游戏行为。',
    }),
    extraHeading: '参数变更影响与复验',
    extra: '5. 参数变化时标出受影响的场景、存档、测试和性能结论，只对实际受影响项目复验；更新模型版本及关键证据，保持前后配置可比。',
  }),
});

const STACKS = Object.freeze(['unity', 'cocos', 'phaser', 'threejs']);
const DIRECTORIES = Object.freeze({ unity: '', cocos: 'skills', phaser: 'skills', threejs: 'skills' });

/** 以源规则审计约定统一换行与首尾空白后计算 SHA-256。 */
function digestWorkflowBlock(value) {
  return createHash('sha256').update(value.trim().replace(/\r\n/g, '\n')).digest('hex');
}

/** 将源输入解析成各栈绝对路径，兼容 Git 父目录和隔离测试根。 */
function resolveStackRoot(sourceRoot, stack) {
  if (typeof sourceRoot === 'string') return path.resolve(sourceRoot, `${stack}-skills`);
  if (sourceRoot && typeof sourceRoot[stack] === 'string') return path.resolve(sourceRoot[stack]);
  throw new TypeError(`sourceRoot 缺少 ${stack} 源仓库`);
}

/** 提取 Markdown 正文块并保留 UTF-16 字符区间以供迁移账本准确追溯。 */
function extractBlocks(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const blocks = [];
  let offset = 0;
  let start = -1;
  let heading = '文档正文';
  let fence = false;
  let listIndent = null;
  let inFrontmatter = text.startsWith('---\n') || text.startsWith('---\r\n');
  let frontmatterEnd = !inFrontmatter;
  let delimiters = 0;
  // 保留每个正文块的原始字符边界，使账本摘要能直接回读源文件。
  const flush = (end) => {
    if (start >= 0 && end > start && text.slice(start, end).trim()) blocks.push({ heading, original: text.slice(start, end), sourceRange: { start, end } });
    start = -1;
    listIndent = null;
  };
  for (const raw of lines) {
    const lineOffset = offset;
    offset += raw.length;
    const line = raw.replace(/\r?\n$/, '');
    if (!frontmatterEnd) {
      if (line.trim() === '---' && ++delimiters === 2) frontmatterEnd = true;
      continue;
    }
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (start < 0) start = lineOffset;
      fence = !fence;
      continue;
    }
    if (!fence) {
      const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      if (match) { flush(lineOffset); heading = match[1].trim(); continue; }
      if (!line.trim()) { flush(lineOffset); continue; }
      const list = line.match(/^([ \t]*)(?:\d+[.)]|[-*+])\s+/);
      if (list && start >= 0 && listIndent !== null && list[1].length === listIndent) flush(lineOffset);
      if (list && start < 0) listIndent = list[1].length;
    }
    if (start < 0) start = lineOffset;
  }
  flush(text.length);
  return blocks;
}

/** 源标记必须唯一且仍包含关键职责，避免改名或删减时静默漏抽。 */
function selectUniqueBlock(blocks, sourcePath, marker, requiredTerms) {
  const matches = blocks.filter((block) => block.original.trimStart().startsWith(marker));
  if (matches.length !== 1) throw new Error(`公共工作流源漂移：${sourcePath} 的“${marker}”应唯一出现，实际 ${matches.length} 处`);
  const block = matches[0];
  const missing = requiredTerms.filter((term) => !block.original.includes(term));
  if (missing.length) throw new Error(`公共工作流职责发生变化：${sourcePath} 的“${marker}”缺少 ${missing.join('、')}`);
  return block;
}

/** 以统一规则段落建立一条可从原技能区间复算的公共来源记录。 */
function createSection(source, block, canonical, heading) {
  return {
    stack: source.stack,
    sourcePath: source.sourcePath,
    sourceHash: digestWorkflowBlock(block.original),
    canonicalHash: digestWorkflowBlock(canonical),
    heading,
    sourceHeading: block.heading,
    sourceRange: block.sourceRange,
    original: block.original.trim().replace(/\r\n/g, '\n'),
    canonical,
  };
}

/** 替换已有共用段落，并同步改写原来源映射的公共摘要。 */
function reviseBaseParagraph(document, replacements) {
  for (const [before, after] of replacements) {
    if ((document.content.split(before).length - 1) !== 1) throw new Error(`公共规范段落漂移：${document.capabilityId}/${before.slice(0, 28)}`);
    document.content = document.content.replace(before, after);
    for (const source of document.sources) for (const section of source.sections) {
      if (section.canonical !== before) continue;
      section.canonical = after;
      section.canonicalHash = digestWorkflowBlock(after);
      section.heading = document.capabilityId === 'audio' && after.startsWith('- ')
        ? FAMILY_PATHS.audio.lifecycleHeading
        : document.capabilityId === 'audio' ? FAMILY_PATHS.audio.heading : FAMILY_PATHS.balance.heading;
    }
  }
}

/** 把 Unity 精确选中的领域段落加入原公共账本和可执行替换计划。 */
function addUnitySource(document, replacements, source, blocks, family, selections) {
  let sourceEntry = document.sources.find((entry) => entry.stack === source.stack && entry.sourcePath === source.sourcePath);
  if (!sourceEntry) {
    sourceEntry = { stack: source.stack, sourcePath: source.sourcePath, sections: [] };
    document.sources.push(sourceEntry);
  }
  for (const [marker, terms, canonical, heading, relatedCanonicals = [], nativeSupplement] of selections) {
    const block = selectUniqueBlock(blocks, source.sourcePath, marker, terms);
    for (const mappedCanonical of new Set([canonical, ...relatedCanonicals])) {
      sourceEntry.sections.push(createSection(source, block, mappedCanonical, heading));
    }
    const section = createSection(source, block, canonical, heading);
    replacements.push({
      stack: source.stack, sourcePath: source.sourcePath, original: block.original,
      capabilityId: family, commonPath: document.path, heading, sourceHeading: block.heading,
      sourceRange: block.sourceRange, sourceHash: section.sourceHash,
      canonicalHash: section.canonicalHash, canonical,
      ...(nativeSupplement ? { nativeSupplement } : {}),
    });
  }
}

/** 生成音频和数值两项跨 Unity 与浏览器游戏的正文融合计划。 */
export function buildGameWorkflowFamilies({ sourceRoot, repositoryRoot, basePlan }) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot) throw new TypeError('repositoryRoot 必须是非空路径');
  if (!basePlan || !Array.isArray(basePlan.documents) || !Array.isArray(basePlan.replacements)) throw new TypeError('basePlan 必须包含现有公共文档与逐段替换计划');
  if (sourceRoot && typeof sourceRoot === 'object' && typeof sourceRoot.unity !== 'string') return { documents: [], replacements: [] };
  const unityRoot = resolveStackRoot(sourceRoot, 'unity');
  if (!existsSync(unityRoot)) return { documents: [], replacements: [] };
  const documents = [];
  const replacements = [];

  for (const family of ['audio', 'balance']) {
    const spec = FAMILY_PATHS[family];
    const baseDocument = basePlan.documents.find((document) => document.capabilityId === family);
    if (!baseDocument) throw new Error(`基础三栈公共规范缺失：${family}`);
    const document = structuredClone(baseDocument);
    const oldScope = '本规范只承接三栈内容一致且不依赖引擎接口的完整规则块；专业入口继续维护各自的资源路径、API、版本与运行时约束。';
    const newScope = '本规范融合 Unity、Cocos Creator、Phaser 与 Three.js 可共用的领域规则；引擎对象、导入接口和生命周期差异由各专业入口维护。';
    if (document.content.split(oldScope).length !== 2) throw new Error(`公共规范适用范围摘要漂移：${family}`);
    document.content = document.content.replace(oldScope, newScope);
    const familyReplacements = basePlan.replacements.filter((item) => item.capabilityId === family).map((item) => structuredClone(item));
    const paragraphMap = new Map(Object.entries(spec.common));
    if (family === 'audio') for (const [marker, canonical] of Object.entries(spec.lifecycle)) paragraphMap.set(marker, canonical);
    const revisions = [];
    for (const replacement of familyReplacements) {
      const before = replacement.canonical;
      const marker = [...paragraphMap.keys()].find((candidate) => before.startsWith(candidate));
      if (!marker) throw new Error(`基础共用来源无法归入完整公共规范：${family}/${replacement.sourcePath}/${before.slice(0, 40)}`);
      const after = paragraphMap.get(marker);
      replacement.canonical = after;
      replacement.canonicalHash = digestWorkflowBlock(after);
      replacement.heading = family === 'audio' && marker.startsWith('- ') ? spec.lifecycleHeading : spec.heading;
      if (!revisions.some(([existing]) => existing === before)) revisions.push([before, after]);
    }
    reviseBaseParagraph(document, revisions);

    for (const sourceStack of ['cocos', 'phaser', 'threejs']) {
      const otherRoot = resolveStackRoot(sourceRoot, sourceStack);
      const sourcePath = `${DIRECTORIES[sourceStack] ? 'skills/' : ''}${spec.skills[sourceStack]}/SKILL.md`;
      const sourceText = readFileSync(path.join(otherRoot, ...sourcePath.split('/')), 'utf8');
      const source = document.sources.find((entry) => entry.stack === sourceStack && entry.sourcePath === sourcePath);
      if (!source) throw new Error(`基础公共规范缺少 ${sourceStack} 来源：${sourcePath}`);
      for (const section of source.sections) {
        const block = extractBlocks(sourceText).find((candidate) => candidate.sourceRange.start === section.sourceRange.start && digestWorkflowBlock(candidate.original) === section.sourceHash);
        if (!block) throw new Error(`公共工作流源范围漂移：${sourcePath}/${section.sourceRange.start}`);
      }
    }

    const sourcePath = `${spec.skills.unity}/SKILL.md`;
    const sourceText = readFileSync(path.join(unityRoot, ...sourcePath.split('/')), 'utf8');
    const source = { stack: 'unity', sourcePath };
    const blocks = extractBlocks(sourceText);
    if (family === 'audio') {
      const unitySelections = [
        ['1. 按核心反馈', ['语音', '可访问性', '优先级', '静默降级'], spec.common['1. 按核心反馈'], spec.heading],
        ['2. 在资源登记', ['采样率', '声道', '循环点', '发布资格'], spec.common['2. 向美术接入角色'], spec.heading],
        ['4. 音频服务统一处理', ['暂停原因集合', '系统、手动和玩法暂停', '原播放位置恢复', '新播放请求直接丢弃', 'TDD'], spec.lifecycle['- 浏览器或宿主限制自动恢复'], spec.lifecycleHeading, Object.values(spec.lifecycle), 'Unity 工程必须将窗口失焦加入暂停原因；窗口、应用和系统中断通知沿用统一暂停原因集合与恢复边界。'],
        ['6. 向玩法提供', ['触发时机', 'QA', '发布'], spec.common['向玩法提供触发时机'], spec.heading],
      ];
      addUnitySource(document, familyReplacements, source, blocks, family, unitySelections);
    } else {
      const opening = blocks.find((block) => block.original.includes('把体验目标转为可解释、可调整、可验证的模型'));
      if (!opening || !opening.original.includes('未记录的主观调参')) throw new Error(`Unity 数值目标段落漂移：${sourcePath}`);
      const openingCanonical = spec.common['将体验目标转'];
      const unitySelections = [
        ['1. 定义玩家节奏', ['成功率', '资源来源/消耗', '失败成本', '上下限', '异常行为'], spec.common['1. 定义玩家节奏'], spec.heading],
        ['2. 在 ', ['balance.md', '单位', '默认值', '来源', '公式', '敏感度', '可版本化配置'], spec.common['2. 在 balance.md'], spec.heading],
        ['3. 为关键曲线', ['可复现计算', '模拟种子', '样本规模', '试玩记录', '游戏内验证'], spec.common['3. 为高风险曲线'], spec.heading],
        ['4. 向玩法提供', ['配置', 'QA', '统计口径', '容差'], spec.common['交给玩法的是参数表'], spec.heading],
      ];
      const unityOpening = createSection(source, opening, openingCanonical, spec.heading);
      document.sources.push({ stack: 'unity', sourcePath, sections: [unityOpening] });
      familyReplacements.push({ stack: 'unity', sourcePath, original: opening.original, capabilityId: family, commonPath: document.path, heading: spec.heading, sourceHeading: opening.heading, sourceRange: opening.sourceRange, sourceHash: unityOpening.sourceHash, canonicalHash: unityOpening.canonicalHash, canonical: openingCanonical });
      addUnitySource(document, familyReplacements, source, blocks, family, unitySelections);
      const impactText = spec.extra;
      const extraSection = { heading: spec.extraHeading, content: impactText };
      document.content += `\n## ${extraSection.heading}\n\n${extraSection.content}\n`;
      const fifth = selectUniqueBlock(blocks, sourcePath, '5. 变更参数时', ['受影响场景', '存档', '测试', '性能结论', '复验']);
      const extraRecord = createSection(source, fifth, impactText, spec.extraHeading);
      document.sources.at(-1).sections.push(extraRecord);
      familyReplacements.push({ stack: 'unity', sourcePath, original: fifth.original, capabilityId: family, commonPath: document.path, heading: spec.extraHeading, sourceHeading: fifth.heading, sourceRange: fifth.sourceRange, sourceHash: extraRecord.sourceHash, canonicalHash: extraRecord.canonicalHash, canonical: impactText });
    }
    documents.push(document);
    replacements.push(...familyReplacements);
  }
  return { documents, replacements };
}
