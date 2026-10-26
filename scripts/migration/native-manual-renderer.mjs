import path from 'node:path';
import { buildNativeTargets, collectNativeHeadingAnchors, normalizeNativeHeadingFragment, resolveNativeFragment } from '../../skills/app-skill-runtime/native-contracts.mjs';

export { buildNativeTargets, collectNativeHeadingAnchors, normalizeNativeHeadingFragment, resolveNativeFragment };

/** 把逐源文档中的 Markdown 链接从临时适配目录重基到最终栈手册。 */
export function rebaseNativeMarkdownLinks(text, { stagePath, manualPath, sourceSkill, targets, nativeOnly = false }) {
  const rewrite = (rawTarget) => {
    const wrapped = rawTarget.startsWith('<') && rawTarget.endsWith('>');
    const value = wrapped ? rawTarget.slice(1, -1) : rawTarget;
    if (!value || /^(?:[a-z]+:|\/)/i.test(value)) return rawTarget;
    const splitAt = value.search(/[?#]/);
    const pathPart = splitAt < 0 ? value : value.slice(0, splitAt);
    const suffix = splitAt < 0 ? '' : value.slice(splitAt);
    const fragmentAt = suffix.indexOf('#');
    const rawFragment = fragmentAt < 0 ? '' : suffix.slice(fragmentAt + 1);
    let decodedPath = pathPart;
    let decodedFragment = rawFragment;
    try { decodedPath = decodeURIComponent(pathPart); } catch { /* 非法百分号序列保持其字面路径。 */ }
    try { decodedFragment = decodeURIComponent(rawFragment); } catch { /* 非法百分号序列保持其字面片段。 */ }

    if (!decodedPath) {
      if (!rawFragment) return rawTarget;
      if (!sourceSkill) return rawTarget;
      const sourceTarget = targets.get(sourceSkill);
      if (!sourceTarget) throw new Error(`原生模式本地锚点缺少来源章节：${stagePath}`);
      const mapped = resolveNativeFragment(sourceTarget, decodedFragment, stagePath);
      const query = suffix.slice(0, fragmentAt);
      if (mapped.kind === 'shared') {
        const relativePath = path.posix.relative(path.posix.dirname(manualPath), mapped.path);
        const result = `${relativePath}${query}#${mapped.anchor}`;
        return wrapped ? `<${result}>` : result;
      }
      const result = `${query}#${mapped.anchor}`;
      return wrapped ? `<${result}>` : result;
    }

    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(stagePath), decodedPath));
    const nativeTarget = targets.get(path.posix.basename(path.posix.dirname(resolved)));
    if (nativeTarget && nativeTarget.stagePath === resolved) {
      const relativePath = nativeTarget.manualPath === manualPath ? '' : path.posix.relative(path.posix.dirname(manualPath), nativeTarget.manualPath);
      const query = fragmentAt < 0 ? suffix : suffix.slice(0, fragmentAt);
      if (!rawFragment) {
        const result = `${relativePath}${query}#${nativeTarget.section}`;
        return wrapped ? `<${result}>` : result;
      }
      const mapped = resolveNativeFragment(nativeTarget, decodedFragment, stagePath);
      if (mapped.kind === 'shared') {
        const sharedPath = path.posix.relative(path.posix.dirname(manualPath), mapped.path);
        const result = `${sharedPath}${query}#${mapped.anchor}`;
        return wrapped ? `<${result}>` : result;
      }
      const fragment = mapped.anchor;
      const result = `${relativePath}${query}#${fragment}`;
      return wrapped ? `<${result}>` : result;
    }

    if (nativeOnly) return rawTarget;

    const relativePath = path.posix.relative(path.posix.dirname(manualPath), resolved);
    const result = `${relativePath}${suffix}`;
    return wrapped ? `<${result}>` : result;
  };

  let inFence = false;
  return text.split(/(?<=\n)/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line; }
    if (inFence) return line;
    if (/^(?: {4}|\t)/.test(line)) return line;
    let updated = line.replace(/\]\(\s*(<[^>]+>|[^\s)]+)([^)]*)\)/g, (_match, target, suffix) => `](${rewrite(target)}${suffix})`);
    updated = updated.replace(/^(\s*\[[^\]]+\]:\s*)(<[^>]+>|\S+)(.*)$/g, (_match, prefix, target, suffix) => `${prefix}${rewrite(target)}${suffix}`);
    return updated;
  }).join('');
}

/** 将说明中的旧适配器路径映射到原生章节，同时保留代码块里的示例原样。 */
export function rebaseNativeCodePathReferences(text, { targets }) {
  let fence = null;
  return text.split(/(?<=\n)/).map((line) => {
    const fenceMarker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const closing = /^\s{0,3}(`+|~+)\s*$/.exec(line);
      if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) fence = null;
      return line;
    }
    if (fenceMarker) {
      fence = { marker: fenceMarker[1][0], length: fenceMarker[1].length };
      return line;
    }
    if (/^(?: {4}|\t)/.test(line)) return line;
    return line.replace(/(`+)([^`\r\n]+?)\1/g, (token, ticks, value) => {
      const match = /^(?:(\.agents\/skills\/)|(skills\/))?([a-z0-9][a-z0-9-]*)\/(?:ADAPTER|SKILL)\.md(?:#(.+))?$/.exec(value);
      if (!match) return token;
      const [, projectPrefix, repositoryPrefix, sourceSkill, rawFragment] = match;
      const target = targets.get(sourceSkill);
      if (!target) return token;
      let destination = target.manualPath;
      let anchor = target.section;
      if (rawFragment) {
        let fragment = rawFragment;
        try { fragment = decodeURIComponent(rawFragment); } catch { /* 非法编码片段按字面值查询。 */ }
        const mapped = resolveNativeFragment(target, fragment, sourceSkill);
        if (mapped.kind === 'shared') { destination = mapped.path; anchor = mapped.anchor; }
        else anchor = mapped.anchor;
      }
      if (projectPrefix) destination = `.agents/${destination}`;
      else if (!repositoryPrefix) destination = `skills/${destination.replace(/^skills\//, '')}`;
      return `${ticks}${destination}#${anchor}${ticks}`;
    });
  }).join('');
}

/** 为原文标题生成模式内锚点，并将标题层级缩进到能力手册中。 */
export function indentNativeHeadings(text, sourceSkill) {
  const prefix = `mode-${sourceSkill}`;
  const counts = new Map();
  const output = [];
  let inFence = false;
  let hasTopHeading = false;
  for (const line of text.split(/(?<=\n)/)) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; output.push(line); continue; }
    const heading = inFence ? null : /^(\s{0,3})(#{1,6})(\s+)(.+?)(\s*#*\s*)(\r?\n)?$/.exec(line);
    if (!heading) { output.push(line); continue; }
    if (heading[2].length === 1) hasTopHeading = true;
    const slug = normalizeNativeHeadingFragment(heading[4]);
    const occurrence = counts.get(slug) ?? 0;
    counts.set(slug, occurrence + 1);
    const anchor = `${prefix}--${slug}${occurrence ? `-${occurrence}` : ''}`;
    const level = Math.min(6, heading[2].length + (hasTopHeading ? 2 : 1));
    output.push(`${heading[1]}<a id="${anchor}"></a>\n`);
    output.push(`${heading[1]}${'#'.repeat(level)}${heading[3]}${heading[4]}${heading[5]}${heading[6] ?? ''}`);
  }
  if (!hasTopHeading) output.unshift(`<a id="${prefix}--overview"></a>\n### ${sourceSkill}\n\n`);
  return output.join('');
}

/** 按公共能力组织一个技术栈的模式目录，保留能力入口到原生章节的稳定跳转。 */
export function renderNativeManual({ stack, capabilityGroups, sections }) {
  const titles = new Map(sections.map((section) => {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/m.exec(section.body);
    return [section.sourceSkill, heading?.[1] ?? section.mode ?? section.sourceSkill];
  }));
  const routes = capabilityGroups.flatMap((group) => group.adapters
    .filter((adapter) => adapter.stack === stack)
    .map((adapter) => ({ capability: group, adapter })));
  const uniqueRoutes = [...new Map(routes.map(({ capability, adapter }) => [`${capability.name}:${adapter.sourceSkill}`, { capability, adapter }])).values()];
  const lines = [`# ${stack} 原生技术合同`, '', '本手册按公共能力组织技术栈专属规则；每个模式保留来源边界，脚本、模板和校验器继续由对应技术栈目录提供。', '', '## 能力索引', ''];
  for (const group of capabilityGroups) {
    const items = uniqueRoutes.filter(({ capability }) => capability.name === group.name);
    if (!items.length) continue;
    lines.push(`- **${group.title}**`);
    for (const { adapter } of items) lines.push(`  - [${adapter.mode ?? titles.get(adapter.sourceSkill) ?? adapter.sourceSkill}](#${adapter.section})`);
  }
  const byCapability = new Map();
  for (const section of sections) {
    if (!byCapability.has(section.capability)) byCapability.set(section.capability, []);
    byCapability.get(section.capability).push(section);
  }
  for (const group of capabilityGroups) {
    const items = byCapability.get(group.name) ?? [];
    if (!items.length) continue;
    lines.push('', `## ${group.title}`, '');
    for (const section of items) {
      const block = `<!-- native-source:${section.sourceSkill}:start -->\n<a id="${section.section}"></a>\n\n${section.body}\n<!-- native-source:${section.sourceSkill}:end -->`;
      lines.push(block, '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
