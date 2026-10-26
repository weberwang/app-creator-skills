/** 提供原生手册的章节、标题片段与跨规范路由解析，不依赖仓库脚本或第三方包。 */

/** 从 Markdown 标题生成稳定的链接片段。 */
export function normalizeNativeHeadingFragment(heading) {
  return String(heading ?? '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, (character) => character === '-' || character === '_' ? character : '')
    .replace(/\s+/g, '-');
}

/** 严格提取且只接受唯一存在的一份原生来源贡献区块。 */
export function extractNativeSection(text, sourceSkill) {
  const start = `<!-- native-source:${sourceSkill}:start -->`;
  const end = `<!-- native-source:${sourceSkill}:end -->`;
  const begin = text.indexOf(start);
  const finish = text.indexOf(end);
  if (begin < 0 || finish <= begin || text.indexOf(start, begin + start.length) >= 0 || text.indexOf(end, finish + end.length) >= 0) {
    throw new Error(`原生手册缺少或重复来源章节：${sourceSkill}`);
  }
  return text.slice(begin + start.length, finish).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
}

/** 读取代码围栏之外的 Markdown 行，供锚点与标题解析共用。 */
function markdownLines(text) {
  let offset = 0;
  let fence = null;
  const commentState = { inComment: false };
  return String(text ?? '').split(/(?<=\n)/).map((raw) => {
    const start = offset;
    offset += raw.length;
    const line = raw.replace(/\r?\n$/, '');
    if (fence) {
      const closing = /^ {0,3}(`+|~+)\s*$/.exec(line)?.[1];
      const hidden = fence !== null;
      if (closing && closing[0] === fence.character && closing.length >= fence.length) fence = null;
      return { raw, line, visible: '', start, end: offset, hidden };
    }
    if (/^(?: {4}|\t)/.test(line)) return { raw, line, visible: '', start, end: offset, hidden: true };
    const withoutComments = maskHtmlComments(line, commentState);
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(withoutComments)?.[1];
    if (marker) {
      fence = { character: marker[0], length: marker.length };
      return { raw, line, visible: '', start, end: offset, hidden: true };
    }
    const visible = withoutComments.replace(/(`+)(.*?)\1/g, '');
    return { raw, line, content: withoutComments, visible, start, end: offset, hidden: false };
  });
}

/** 将跨行 HTML 注释替换为空格，避免注释内的标题和锚点进入索引。 */
function maskHtmlComments(line, state) {
  let cursor = 0;
  let masked = '';
  while (cursor < line.length) {
    if (state.inComment) {
      const end = line.indexOf('-->', cursor);
      if (end < 0) return `${masked}${' '.repeat(line.length - cursor)}`;
      masked += ' '.repeat(end + 3 - cursor);
      cursor = end + 3;
      state.inComment = false;
      continue;
    }
    const start = line.indexOf('<!--', cursor);
    if (start < 0) return masked + line.slice(cursor);
    masked += line.slice(cursor, start);
    const end = line.indexOf('-->', start + 4);
    if (end < 0) {
      state.inComment = true;
      return masked + ' '.repeat(line.length - start);
    }
    masked += ' '.repeat(end + 3 - start);
    cursor = end + 3;
  }
  return masked;
}

/** 收集可见标题并为重复标题生成 GitHub 风格的序号锚点。 */
function collectMarkdownHeadings(lines) {
  const counts = new Map();
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].hidden) continue;
    const match = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[index].content ?? lines[index].visible);
    if (!match) continue;
    const slug = normalizeNativeHeadingFragment(match[2]);
    if (!slug) continue;
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    headings.push({ index, level: match[1].length, slug: count ? `${slug}-${count}` : slug });
  }
  return headings;
}

/** 提取可阅读 Markdown 正文，隐藏代码区与 HTML 注释并保留行内代码。 */
export function markdownProse(text) {
  return markdownLines(text).map(({ raw, line, content, hidden }) => {
    if (hidden) return raw.replace(/[^\r\n]/g, ' ');
    return `${content ?? line}${raw.slice(line.length)}`;
  }).join('');
}

/** 收集原始标题到手册内带来源前缀的章节锚点。 */
export function collectNativeHeadingAnchors(text, sourceSkill) {
  const headings = collectMarkdownHeadings(markdownLines(text));
  const anchors = new Map(headings.map((heading) => [
    heading.slug,
    `mode-${sourceSkill}--${heading.slug}`,
  ]));
  if (!anchors.size) anchors.set('overview', `mode-${sourceSkill}--overview`);
  return anchors;
}

/** 根据手册章节和共享来源映射构建唯一的原生标题重定向表。 */
export function buildNativeTargets(sections, sharedCapabilities = []) {
  const targets = new Map();
  for (const section of sections) {
    if (!section.sourceSkill || !section.manualPath || !section.section || targets.has(section.sourceSkill)) {
      throw new Error(`原生章节路由无效或重复：${section.sourceSkill ?? '<unknown>'}`);
    }
    const stagePath = section.stagePath ?? `skills/${section.sourceSkill}/ADAPTER.md`;
    targets.set(section.sourceSkill, {
      stagePath,
      manualPath: section.manualPath,
      section: section.section,
      anchors: collectNativeHeadingAnchors(section.body ?? '', section.sourceSkill),
      redirects: new Map(),
    });
  }

  const redirects = new Map();
  for (const capability of sharedCapabilities) {
    if (!capability.implementation?.endsWith('.md')) continue;
    for (const source of capability.sources ?? []) {
      const sourceSkill = /^skills\/([^/]+)\/SKILL\.md$/.exec(source.sourcePath)?.[1];
      if (!sourceSkill || !targets.has(sourceSkill)) continue;
      for (const sharedSection of source.sections ?? []) {
        if (!sharedSection.sourceHeading || !sharedSection.heading) continue;
        const fragment = normalizeNativeHeadingFragment(sharedSection.sourceHeading);
        if (!fragment) continue;
        if (!redirects.has(sourceSkill)) redirects.set(sourceSkill, new Map());
        const byFragment = redirects.get(sourceSkill);
        if (!byFragment.has(fragment)) byFragment.set(fragment, []);
        byFragment.get(fragment).push({
          path: capability.implementation,
          anchor: normalizeNativeHeadingFragment(sharedSection.heading),
          sourceHeading: sharedSection.sourceHeading,
          heading: sharedSection.heading,
        });
      }
    }
  }

  for (const [sourceSkill, byFragment] of redirects) {
    const target = targets.get(sourceSkill);
    for (const [fragment, candidates] of byFragment) {
      const exact = candidates.find((candidate) => normalizeNativeHeadingFragment(candidate.sourceHeading) === normalizeNativeHeadingFragment(candidate.heading));
      const selected = exact ?? candidates.find((candidate) => /流程|交接|生命周期/.test(candidate.heading)) ?? candidates[0];
      target.redirects.set(fragment, { path: selected.path, anchor: selected.anchor });
    }
  }
  return targets;
}

/** 解析一个原生标题片段，未知片段会报错而不生成虚假跳转。 */
export function resolveNativeFragment(target, fragment, contextPath = '') {
  if (fragment === target.section) return { kind: 'native', anchor: target.section };
  const slug = normalizeNativeHeadingFragment(fragment);
  const nativeAnchor = target.anchors.get(fragment) ?? target.anchors.get(slug);
  if (nativeAnchor) return { kind: 'native', anchor: nativeAnchor };
  const shared = target.redirects.get(slug);
  if (shared) return { kind: 'shared', path: shared.path, anchor: shared.anchor };
  throw new Error(`旧原生模式链接片段没有已知章节或公共重定向：${contextPath} -> ${fragment}`);
}

/** 抽取公共 Markdown 的指定标题片段及其从属内容，完整锚点输入返回原文。 */
export function extractMarkdownSection(text, fragment) {
  if (!fragment) return String(text ?? '');
  const lines = markdownLines(text);
  const headings = collectMarkdownHeadings(lines);
  const normalizedFragment = String(fragment).replace(/^#/, '');
  const explicitMatches = [];
  const slugs = new Map();
  for (const heading of headings) {
    if (!slugs.has(heading.slug)) slugs.set(heading.slug, []);
    slugs.get(heading.slug).push(heading);
    const line = lines[heading.index].visible;
    for (const anchor of line.matchAll(/<a\b[^>]*\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>\s*<\/a\s*>/gi)) {
      const id = anchor[1] ?? anchor[2] ?? anchor[3];
      if (id === normalizedFragment) explicitMatches.push(heading);
    }
  }
  // 独立锚点关联其后的标题；边界定位也复用此表，避免吞入下一节锚点。
  const standaloneAnchors = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].hidden) continue;
    const line = lines[index].visible;
    const match = /^\s*<a\b[^>]*\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>\s*<\/a\s*>\s*$/i.exec(line);
    if (!match) continue;
    standaloneAnchors.push({ id: match[1] ?? match[2] ?? match[3], index, heading: headings.find((heading) => heading.index > index) });
  }

  const matchingStandaloneAnchors = standaloneAnchors.filter((anchor) => anchor.id === normalizedFragment);
  if (matchingStandaloneAnchors.some((anchor) => !anchor.heading)) throw new Error('公共 Markdown 锚点后缺少标题：' + normalizedFragment);
  const matches = [
    ...explicitMatches,
    ...matchingStandaloneAnchors.map((anchor) => ({ ...anchor.heading, startIndex: anchor.index })),
  ];
  if (matches.length > 1) throw new Error(`公共 Markdown 章节锚点重复：${normalizedFragment}`);
  let selected = matches[0];
  if (!selected) {
    const bySlug = slugs.get(normalizeNativeHeadingFragment(normalizedFragment)) ?? [];
    if (bySlug.length > 1) throw new Error('公共 Markdown 标题片段重复：' + normalizedFragment);
    selected = bySlug[0];
  }
  if (!selected) throw new Error(`公共 Markdown 章节锚点不存在：${normalizedFragment}`);

  const startIndex = selected.startIndex ?? selected.index;
  const nextHeading = headings.find((heading) => heading.index > selected.index && heading.level <= selected.level);
  const nextAnchor = nextHeading && standaloneAnchors.find((anchor) => anchor.heading?.index === nextHeading.index);
  const start = lines[startIndex].start;
  const endIndex = nextAnchor?.index ?? nextHeading?.index;
  const end = endIndex === undefined ? String(text).length : lines[endIndex].start;
  return String(text).slice(start, end).replace(/\s+$/, '');
}
