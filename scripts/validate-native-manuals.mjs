/** 统一核验五栈原生手册、来源章节、分发路由与章节级追溯。 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CAPABILITY_GROUPS, capabilityAdapters, extractNativeSection, nativeContractPath } from './capability-map.mjs';
import { expectedNativePromotions } from './migration/native-rule-promotions.mjs';

const STACKS = Object.freeze(['unity', 'cocos', 'phaser', 'threejs', 'flutter']);
const HASH_PATTERN = /^[a-f\d]{64}$/i;

/** 对字节或已提取章节计算 SHA-256。 */
export function nativeDigest(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** 为正向和负向校验建立唯一的源技能身份表；复用路由不重复计算正文。 */
function expectedNativeSections() {
  const sections = new Map();
  for (const group of CAPABILITY_GROUPS) for (const adapter of capabilityAdapters(group)) {
    if (adapter.reused) continue;
    sections.set(`${adapter.stack}:${adapter.sourceSkill}`, { ...adapter, capability: group.name, origin: adapter.authored ? 'repository-authored' : 'source' });
  }
  return sections;
}

/** 限制清单路径位于仓库内，校验所需文件时不跟随外部目标。 */
function safeFile(root, path) {
  if (typeof path !== 'string' || path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  const file = resolve(root, ...path.split('/'));
  return file.startsWith(`${resolve(root)}\\`) || file.startsWith(`${resolve(root)}/`) ? file : null;
}

/** 以文件表 sourcePath 定位原技能正文，避免同一个手册路径覆盖来源身份。 */
function sourceName(sourcePath) {
  const normalized = String(sourcePath ?? '').replaceAll('\\', '/');
  const match = /(?:^|\/)([^/]+)\/SKILL\.md$/i.exec(normalized);
  return match?.[1] ?? null;
}

/** 只统计 Markdown 中实际渲染的 HTML 锚点，忽略注释、围栏代码和行内代码示例。 */
function actualHtmlAnchorIds(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '').split('\n');
  const visibleLines = [];
  let fence = null;
  for (const line of lines) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence.character && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker) {
      fence = { character: marker[0], length: marker.length };
      continue;
    }
    visibleLines.push(line.replace(/(`+)(.*?)\1/g, ''));
  }
  const visibleText = visibleLines.join('\n');
  const ids = [];
  for (const anchor of visibleText.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const attribute = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(anchor[1]);
    if (attribute) ids.push(attribute[1] ?? attribute[2] ?? attribute[3]);
  }
  return ids;
}

/** 按每个来源章节核对正文、源摘要、作者模板和旧入口清理结果。 */
export function validateNativeManuals({ root, catalog, fileRows = [], errors }) {
  const expected = expectedNativeSections();
  const manuals = new Map();
  const generatedRows = Array.isArray(catalog.generatedFiles) ? catalog.generatedFiles : [];
  const nativeGeneratedRows = generatedRows.filter((entry) => entry?.kind === 'native-manual' || entry?.origin === 'consolidated-native');
  if (!Array.isArray(catalog.generatedFiles)) errors.push('catalog.generatedFiles 必须登记五栈原生手册');
  const rowsBySource = new Map();
  const manualPaths = new Map(STACKS.map((stack) => [nativeContractPath(stack), stack]));
  for (const row of fileRows) {
    const sourceSkill = sourceName(row?.sourcePath);
    const destination = row?.destination?.replaceAll?.('\\', '/');
    if (manualPaths.has(destination) && !expected.has(`${row.stack}:${sourceSkill}`)) errors.push(`${row.stack}/${row.sourcePath} 未映射的源文件不能写入原生手册：${destination}`);
    if (sourceSkill && expected.has(`${row.stack}:${sourceSkill}`)) {
      const key = `${row.stack}:${sourceSkill}`;
      if (!rowsBySource.has(key)) rowsBySource.set(key, []);
      rowsBySource.get(key).push(row);
    }
  }

  for (const stack of STACKS) {
    const path = nativeContractPath(stack);
    const record = catalog.stacks?.[stack];
    if (record?.nativeManual !== path) errors.push(`${stack}.nativeManual 必须指向唯一原生手册：${path}`);
    const file = safeFile(root, path);
    if (!file || !existsSync(file) || !lstatSync(file).isFile()) {
      errors.push(`${stack} 原生手册缺失：${path}`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const fileHash = nativeDigest(readFileSync(file));
    manuals.set(stack, { path, file, text, fileHash });
    const manualAnchorIds = actualHtmlAnchorIds(text);
    const markerSources = [...text.matchAll(/<!-- native-source:([^:]+):start -->/g)].map((match) => match[1]);
    const markerEnds = [...text.matchAll(/<!-- native-source:([^:]+):end -->/g)].map((match) => match[1]);
    const expectedSources = [...expected.values()].filter((entry) => entry.stack === stack).map((entry) => entry.sourceSkill);
    if (markerSources.length !== expectedSources.length || new Set(markerSources).size !== markerSources.length
      || markerEnds.length !== expectedSources.length || new Set(markerEnds).size !== markerEnds.length
      || markerSources.some((sourceSkill) => !expectedSources.includes(sourceSkill))
      || markerEnds.some((sourceSkill) => !expectedSources.includes(sourceSkill))) errors.push(`${stack} 原生手册物理章节集合与映射不一致`);
    const matching = nativeGeneratedRows.filter((entry) => entry?.stack === stack || entry?.path?.replaceAll?.('\\', '/') === path);
    if (matching.length !== 1) errors.push(`${stack} 原生手册必须且只能有一条 native-manual generatedFiles 记录`);
    const generated = matching[0];
    if (!generated) continue;
    if (generated.kind !== 'native-manual' || generated.origin !== 'consolidated-native' || generated.path?.replaceAll?.('\\', '/') !== path) errors.push(`${stack} generatedFiles 原生手册身份或路径错误`);
    if (!HASH_PATTERN.test(generated.destinationSha256 ?? '') || generated.destinationSha256.toLowerCase() !== fileHash) errors.push(`${stack} 原生手册 destinationSha256 与实际文件不符`);
    if (typeof generated.reason !== 'string' || generated.reason.trim().length < 8) errors.push(`${stack} 原生手册生成记录缺少具体 reason`);

    const expectedForStack = [...expected.values()].filter((entry) => entry.stack === stack);
    const actualSections = Array.isArray(generated.sections) ? generated.sections : [];
    const actualBySource = new Map();
    for (const section of actualSections) {
      const key = `${stack}:${section?.sourceSkill}`;
      if (actualBySource.has(key)) errors.push(`${stack} 原生手册重复登记章节：${section?.sourceSkill}`);
      else actualBySource.set(key, section);
    }
    if (actualSections.length !== expectedForStack.length) errors.push(`${stack} 原生手册章节数量错误：应为 ${expectedForStack.length}，实际为 ${actualSections.length}`);

    for (const adapter of expectedForStack) {
      const key = `${stack}:${adapter.sourceSkill}`;
      let body;
      try { body = extractNativeSection(text, adapter.sourceSkill); }
      catch (error) { errors.push(`${path}: ${error.message}`); continue; }
      const ownAnchorCount = actualHtmlAnchorIds(body).filter((id) => id === adapter.section).length;
      const manualAnchorCount = manualAnchorIds.filter((id) => id === adapter.section).length;
      if (ownAnchorCount !== 1 || manualAnchorCount !== 1) errors.push(`${stack}/${adapter.sourceSkill} 原生章节必须包含且仅包含自身的实际模式锚点 <a id="${adapter.section}"></a>，其他来源章节不得代替`);
      const sectionHash = nativeDigest(body);
      const section = actualBySource.get(key);
      if (!section) errors.push(`${stack} 原生手册 ledger 缺少章节：${adapter.sourceSkill}`);
      else {
        if (section.capability !== adapter.capability || section.section !== adapter.section || section.origin !== adapter.origin) errors.push(`${stack}/${adapter.sourceSkill} 原生手册章节身份、能力或来源类别错误`);
        if (!HASH_PATTERN.test(section.sha256 ?? '') || section.sha256.toLowerCase() !== sectionHash) errors.push(`${stack}/${adapter.sourceSkill} 章节摘要与实际章节不符`);
        validateRulePromotions(root, file, body, stack, adapter.sourceSkill, section.rulePromotions, errors);
        if (adapter.authored) {
          if ((rowsBySource.get(key) ?? []).length) errors.push(`${stack}/${adapter.sourceSkill} authored 章节不得伪装为源 SKILL 文件账本`);
          validateAuthoredSection(root, adapter, section, errors);
        }
        else {
          if (section.template !== undefined) errors.push(`${stack}/${adapter.sourceSkill} source 章节不能绑定仓库作者模板`);
          const sourceRows = rowsBySource.get(key) ?? [];
          if (sourceRows.length !== 1) errors.push(`${stack}/${adapter.sourceSkill} 必须且只能有一条源 SKILL 文件账本`);
          const row = sourceRows[0];
          if (row) {
            if (row.destination?.replaceAll?.('\\', '/') !== path) errors.push(`${stack}/${adapter.sourceSkill} 文件账本目标必须是 ${path}`);
            if (row.nativeSection?.sourceSkill !== adapter.sourceSkill || row.nativeSection?.section !== adapter.section) errors.push(`${stack}/${adapter.sourceSkill} 文件账本 nativeSection 绑定错误`);
            if (row.nativeSection?.sha256 !== sectionHash) errors.push(`${stack}/${adapter.sourceSkill} 文件账本章节摘要与实际章节不符`);
            if (row.destinationSha256?.toLowerCase() !== fileHash) errors.push(`${stack}/${adapter.sourceSkill} destinationSha256 必须摘要整本手册`);
            if (section.sourceSha256 !== row.sourceSha256) errors.push(`${stack}/${adapter.sourceSkill} 手册 sourceSha256 与源文件账本不符`);
          }
        }
      }
      const oldAdapter = resolve(root, 'skills', adapter.sourceSkill, 'ADAPTER.md');
      const oldAlias = resolve(root, 'skills', adapter.sourceSkill, 'SKILL.md');
      if (existsSync(oldAdapter)) errors.push(`${stack}/${adapter.sourceSkill} 仍残留旧 ADAPTER.md：skills/${adapter.sourceSkill}/ADAPTER.md`);
      if (existsSync(oldAlias)) errors.push(`${stack}/${adapter.sourceSkill} 仍残留旧 SKILL.md 别名：skills/${adapter.sourceSkill}/SKILL.md`);
    }
    for (const key of actualBySource.keys()) if (!expected.has(key)) errors.push(`${stack} 原生手册登记了未知章节：${key.slice(stack.length + 1)}`);
  }
  for (const entry of nativeGeneratedRows) {
    const stack = entry?.stack;
    if (!STACKS.includes(stack) || entry.path?.replaceAll?.('\\', '/') !== nativeContractPath(stack)) errors.push(`generatedFiles 含未知或路径错误的原生手册：${entry?.path ?? '无路径'}`);
  }
  for (const entry of generatedRows.filter((item) => item?.origin === 'repository-authored')) {
    errors.push(`旧式 repository-authored 原生文件记录必须改为手册章节来源：${entry?.path ?? '无路径'}`);
  }
  for (const row of fileRows) {
    const sourceSkill = sourceName(row?.sourcePath);
    if (row?.nativeSection && !expected.has(`${row.stack}:${sourceSkill}`)) errors.push(`${row.stack}/${row.sourcePath} 非原生来源不能伪造 nativeSection`);
  }
  return { manuals, expected, rowsBySource };
}

/** 作者规范只接受登记的源模板摘要，手册章节内容可由迁移转换。 */
function validateAuthoredSection(root, adapter, section, errors) {
  const expectedTemplate = `scripts/migration/templates/${adapter.sourceSkill}.source`;
  const template = safeFile(root, section.template);
  if (section.template !== expectedTemplate || !template || !existsSync(template) || !lstatSync(template).isFile()) {
    errors.push(`${adapter.stack}/${adapter.sourceSkill} authored 章节生成模板缺失或绑定错误：${section.template ?? '无模板'}`);
    return;
  }
  const sourceHash = nativeDigest(readFileSync(template));
  if (!HASH_PATTERN.test(section.sourceSha256 ?? '') || section.sourceSha256.toLowerCase() !== sourceHash) errors.push(`${adapter.stack}/${adapter.sourceSkill} authored sourceSha256 与原始模板不符`);
}

/** 校验被提升规则的源片段、公共锚点正文摘要和本模式内的实际链接。 */
function validateRulePromotions(root, manual, body, stack, sourceSkill, promotions, errors) {
  const expected = expectedNativePromotions(sourceSkill);
  if (!expected.length && promotions === undefined) return;
  if (!Array.isArray(promotions)) { errors.push(`${stack}/${sourceSkill} rulePromotions 必须是数组`); return; }
  const ids = new Set();
  const byId = new Map();
  for (const promotion of promotions) {
    const label = `${stack}/${sourceSkill}/${promotion?.id ?? 'rule-promotion'}`;
    if (!promotion || typeof promotion.id !== 'string' || !promotion.id.trim() || ids.has(promotion.id)) errors.push(`${label} 原生规则提升 id 缺失或重复`);
    else { ids.add(promotion.id); byId.set(promotion.id, promotion); }
  }
  if (ids.size !== expected.length || expected.some((rule) => !ids.has(rule.id))) errors.push(`${stack}/${sourceSkill} rulePromotions 与注册规则集合不完整`);
  for (const rule of expected) {
    const promotion = byId.get(rule.id);
    if (!promotion) continue;
    const label = `${stack}/${sourceSkill}/${rule.id}`;
    if (promotion.id !== rule.id || promotion.sourceSkill !== sourceSkill || promotion.stack !== stack
      || promotion.sourceText !== rule.sourceText || promotion.anchor !== rule.anchor) errors.push(`${label} 注册来源、源片段或锚点被改写`);
    if (typeof promotion?.sourceText !== 'string' || !promotion.sourceText || !HASH_PATTERN.test(promotion.sourceHash ?? '')
      || nativeDigest(promotion.sourceText) !== promotion.sourceHash) errors.push(`${label} sourceText 与 sourceHash 不符`);
    else if (body.includes(promotion.sourceText)) errors.push(`${label} 被提升源规则仍留在原生章节`);
    if (typeof promotion?.replacementText !== 'string' || !promotion.replacementText.trim()) errors.push(`${label} 缺少公共规则替换引用`);

    const publicPath = typeof promotion?.publicPath === 'string' ? promotion.publicPath.replaceAll('\\', '/') : '';
    if (publicPath !== 'skills/app-creator-workflow/references/professional-conventions.md') errors.push(`${label} 公共规则路径与提升器契约不符：${publicPath || '无路径'}`);
    const publicFile = safeFile(root, publicPath);
    if (!publicFile || !existsSync(publicFile) || !lstatSync(publicFile).isFile()) {
      errors.push(`${label} 公共规则文件不存在：${publicPath || '无路径'}`);
      continue;
    }
    const anchor = promotion.anchor;
    let publicSection;
    try { publicSection = readPublicAnchorSection(readFileSync(publicFile, 'utf8'), anchor); }
    catch (error) { errors.push(`${label} 公共锚点无效：${error.message}`); continue; }
    if (!HASH_PATTERN.test(promotion.publicHash ?? '') || nativeDigest(publicSection) !== promotion.publicHash) errors.push(`${label} publicHash 与实际公共锚点章节不符`);
    if (!linksToPublicAnchor(body, manual, publicFile, anchor)) errors.push(`${label} 原生章节缺少正确公共规范引用：${publicPath}#${anchor}`);
  }
}

/** 读取提升器使用的显式 HTML 锚点及其后完整二级标题正文。 */
function readPublicAnchorSection(markdown, anchor) {
  if (typeof anchor !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(anchor)) throw new Error(`锚点格式无效：${anchor}`);
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const marker = `<a id="${anchor}"></a>`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0 || normalized.indexOf(marker, markerIndex + marker.length) >= 0) throw new Error(`锚点缺失或重复：${anchor}`);
  const headingStart = normalized.indexOf('\n## ', markerIndex);
  if (headingStart < 0) throw new Error(`锚点后没有二级标题：${anchor}`);
  const headingEnd = normalized.indexOf('\n', headingStart + 1);
  const nextHeading = normalized.indexOf('\n## ', headingEnd < 0 ? normalized.length : headingEnd);
  return normalized.slice(headingStart + 1, nextHeading < 0 ? normalized.length : nextHeading).trimEnd();
}

/** 要求章节链接解析到公共文件本身及同一个锚点，正文其他章节不能代替。 */
function linksToPublicAnchor(body, manual, publicFile, anchor) {
  for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '');
    const fragmentIndex = target.indexOf('#');
    if (fragmentIndex < 0 || target.slice(fragmentIndex + 1) !== anchor) continue;
    const path = target.slice(0, fragmentIndex).split('?')[0];
    if (/^(?:[a-z]+:|\/)/i.test(path)) continue;
    try { if (resolve(dirname(manual), decodeURIComponent(path)) === publicFile) return true; }
    catch { /* 非法百分号转义不是可验证的本地引用。 */ }
  }
  return false;
}
