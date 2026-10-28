/** 独立核对公共能力真源、专业薄入口和源段落追溯，避免把搬运副本当成复用。 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { extractNativeSection, nativeSectionId } from './capability-map.mjs';
import { readWorkflowBlocks } from './migration/web-workflow-bodies.mjs';
import { isReferenceRedirect } from './migration/reference-redirects.mjs';
import { loadUnifiedStagePatches } from './migration/unified-stage-adapter.mjs';

/** 对完整字节计算摘要，不使用文件名或相似标题代替内容判断。 */
function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** 段落摘要只统一换行与外层空白，不能抹去原生 API、版本或技术字段差异。 */
function sectionDigest(value) {
  return digest(value.trim().replaceAll('\r\n', '\n'));
}

/** 资料链接是原生依赖入口，保留在附录不等于重复维护执行规则。 */
function isReferenceList(text) {
  return text.trim().split(/\r?\n/).filter((line) => line.trim())
    .every((line) => /^\s*(?:[-*+]\s+|\d+[.)]\s+)?\[[^\]]+\]\([^)]+\)[。.]?\s*$/.test(line));
}

/** 同时核对完整段落、列表项与围栏，内部空行不能截断代码示例的来源证明。 */
function paragraphs(text, { ignoreReferences = false } = {}) {
  return [...text.split(/\r?\n\s*\r?\n/), ...readWorkflowBlocks(text).map((block) => block.original)]
    .filter((block) => !ignoreReferences || !isReferenceList(block)).map(sectionDigest);
}

/** 验证薄入口真的引用公共真源，防止只登记共享字段而继续维护重复算法。 */
function referencesImplementation(content, file, implementation) {
  const imports = [...content.matchAll(/\b(?:from\s*|import\s*\(\s*)(['"])(\.{1,2}\/[^'"\n]+)\1/g)];
  return imports.some((match) => resolve(dirname(file), match[2]) === implementation);
}

/** 规则入口必须链接到可读取的公共正文，单独登记元数据不构成接入。 */
function referencesDocument(content, file, implementation) {
  return [...content.matchAll(/\]\(([^)]+)\)/g)].some((match) => {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) return false;
    return resolve(dirname(file), target) === implementation;
  });
}

/** 只有逐源摘要与实际公共字节完全一致，才允许多源直接指向同一文件。 */
export function isDirectSharedDestination({ catalog, destination, rows, actualSha256, errors = [] }) {
  const start = errors.length;
  const capabilities = Array.isArray(catalog.sharedCapabilities) ? catalog.sharedCapabilities : [];
  const matches = capabilities.filter((item) => item?.directShared === true && item.implementation === destination);
  if (matches.length !== 1 || !destination.startsWith('skills/app-domain-toolkit/')) return false;
  const capability = matches[0];
  const sources = capability.sources;
  const hashPattern = /^[a-f\d]{64}$/i;
  if (!['module', 'asset'].includes(capability.kind)) errors.push(`${destination} 直接共享只能用于模块或资源`);
  if (!Array.isArray(sources) || !Array.isArray(rows) || sources.length !== rows.length || rows.length < 2) {
    errors.push(`${destination} 直接共享来源必须与文件账本逐项对应且不少于两个`);
    return false;
  }
  if (new Set(sources.map((source) => source?.stack)).size < 2) errors.push(`${destination} 直接共享必须来自至少两个技术栈`);
  const keys = new Set();
  for (const source of sources) {
    const key = `${source?.stack}:${source?.sourcePath}`;
    if (keys.has(key)) errors.push(`${destination} 直接共享来源重复：${key}`);
    keys.add(key);
    const matching = rows.filter((row) => row.stack === source?.stack && row.sourcePath === source?.sourcePath);
    const row = matching[0];
    if (matching.length !== 1 || !row || row.directShared !== true || !['copied', 'adapted'].includes(row.disposition)
      || row.destination !== destination || row.sharedImplementationRef !== destination || source.adapterDestination !== destination) {
      errors.push(`${destination} 直接共享来源未与文件账本正确绑定：${key}`);
      continue;
    }
    if (!hashPattern.test(actualSha256 ?? '') || !hashPattern.test(source.sourceSha256 ?? '')
      || source.sourceSha256.toLowerCase() !== actualSha256.toLowerCase()
      || String(row.sourceSha256).toLowerCase() !== actualSha256.toLowerCase()
      || String(row.destinationSha256).toLowerCase() !== actualSha256.toLowerCase()) {
      errors.push(`${destination} 直接共享源摘要或目标摘要与实际文件不符：${key}`);
    }
  }
  return errors.length === start;
}

/** 仅允许阶段差异清单明确锁定的多源共享适配，逐一绑定实际源和输出摘要。 */
export function isUnifiedSharedDestination({ root, catalog, destination, rows, actualSha256, errors = [] }) {
  const capability = (catalog.sharedCapabilities ?? []).find((item) => item.implementation === destination && item.transforms?.includes('unified-visual-stages'));
  if (!capability || capability.directShared || !Array.isArray(rows) || rows.length < 2 || capability.sources.length !== rows.length) return false;
  if (new Set(capability.sources.map((source) => source.stack)).size < 2 || capability.sources.some((source) => !/^[a-f\d]{64}$/i.test(source.sourceSha256 ?? ''))) return false;
  const origins = capability.sources.map(({ stack, sourcePath, sourceSha256 }) => ({ stack, sourcePath, sourceSha256 })).sort((a, b) => `${a.stack}:${a.sourcePath}`.localeCompare(`${b.stack}:${b.sourcePath}`, 'en'));
  let patch;
  try { patch = [...loadUnifiedStagePatches(root).values()].find((item) => item.stack === 'shared' && item.sourcePath === capability.id && item.destination === destination); } catch { return false; }
  const generated = (catalog.generatedFiles ?? []).find((item) => item.path === destination);
  if (!patch || patch.sourceSha256 !== digest(Buffer.from(JSON.stringify(origins))) || patch.outputSha256 !== actualSha256 || generated?.destinationSha256 !== actualSha256 || generated.sourceSha256 !== null || generated.sourceOrigins?.length !== origins.length) return false;
  const expected = new Set();
  for (const source of capability.sources) {
    const key = `${source.stack}:${source.sourcePath}`;
    if (expected.has(key)) return false;
    expected.add(key);
    const matches = rows.filter((row) => row.stack === source.stack && row.sourcePath === source.sourcePath);
    if (matches.length !== 1) return false;
    const row = matches[0];
    if (row.sourceSha256 !== source.sourceSha256 || row.destinationSha256 !== actualSha256 || row.disposition !== 'adapted' || row.sharedImplementationRef !== destination || source.adapterDestination !== destination || !row.transforms?.includes('unified-visual-stages') || row.directShared) return false;
    if (!generated.sourceOrigins?.some((origin) => origin.stack === source.stack && origin.sourcePath === source.sourcePath && origin.sourceSha256 === source.sourceSha256)) return false;
  }
  return true;
}

/** 核验共享能力与文件账本、实际分发文件和可选的只读源仓库一致。 */
export function validateSharedCapabilities({ root, catalog, fileRows, sourceRoot, resolveFile, errors }) {
  const capabilities = catalog.sharedCapabilities ?? [];
  const result = { capabilities: 0, modules: 0, assets: 0, workflows: 0, templates: 0, adapters: 0, sourceBytes: 0, implementationBytes: 0, adapterBytes: 0 };
  if (!Array.isArray(capabilities)) {
    errors.push('sharedCapabilities 必须为数组');
    return result;
  }
  const rows = new Map(fileRows.map((row) => [`${row.stack}:${row.sourcePath}`, row]));
  const generated = new Set((catalog.generatedFiles ?? []).map((entry) => entry.path));
  const ids = new Set();
  const implementations = new Set();
  const hashPattern = /^[a-f\d]{64}$/i;
  for (const capability of capabilities) {
    const id = capability?.id;
    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id) || ids.has(id)) {
      errors.push(`公共能力 id 无效或重复：${id}`);
      continue;
    }
    ids.add(id);
    if (!['module', 'asset', 'workflow', 'template'].includes(capability.kind)) errors.push(`${id} 公共能力 kind 无效`);
    const implementation = capability.implementation;
    if (typeof implementation !== 'string' || !implementation.startsWith('skills/app-domain-toolkit/')) {
      errors.push(`${id} 公共真源必须位于 app-domain-toolkit`);
      continue;
    }
    if (implementations.has(implementation)) errors.push(`${id} 重复登记公共真源：${implementation}`);
    implementations.add(implementation);
    const canonical = resolveFile(implementation, `${id}.implementation`);
    if (!canonical || !existsSync(canonical) || !lstatSync(canonical).isFile()) {
      errors.push(`${id} 公共真源不存在：${implementation}`);
      continue;
    }
    if (!generated.has(implementation)) errors.push(`${id} 公共真源没有 generatedFiles 摘要记录`);
    const sources = capability.sources;
    if (!Array.isArray(sources) || new Set(sources.map((entry) => entry.stack)).size < 2) {
      errors.push(`${id} 需要至少两个技术栈的明确来源，不能把单栈算法冒充公共能力`);
      continue;
    }
    if (!Array.isArray(capability.stacks) || sources.some((entry) => !capability.stacks.includes(entry.stack))) errors.push(`${id} stacks 未覆盖实际来源`);
    if (capability.directShared === true) {
      const directRows = fileRows.filter((row) => row.destination === implementation);
      isDirectSharedDestination({ catalog, destination: implementation, rows: directRows, actualSha256: digest(readFileSync(canonical)), errors });
    }
    const unifiedShared = isUnifiedSharedDestination({ root, catalog, destination: implementation, rows: fileRows.filter((row) => row.destination === implementation), actualSha256: digest(readFileSync(canonical)) });
    const canonicalParagraphs = capability.kind === 'workflow' ? new Set(paragraphs(readFileSync(canonical, 'utf8'))) : null;
    for (const source of sources) {
      const row = rows.get(`${source.stack}:${source.sourcePath}`);
      if (!row) {
        errors.push(`${id} 公共来源没有源文件账本：${source.stack}/${source.sourcePath}`);
        continue;
      }
      if (source.sourceSha256 !== row.sourceSha256 || !hashPattern.test(source.sourceSha256 ?? '')) errors.push(`${id} 来源摘要与文件账本不符：${source.sourcePath}`);
      if (source.adapterDestination !== row.destination) errors.push(`${id} 专业适配目标与文件账本不符：${source.sourcePath}`);
      const adapter = row.destination ? resolveFile(row.destination, `${id}.adapter`) : null;
      if (!adapter || !existsSync(adapter) || !lstatSync(adapter).isFile()) {
        errors.push(`${id} 专业入口不存在：${row.destination}`);
        continue;
      }
      let adapterContent = readFileSync(adapter, 'utf8');
      if (row.nativeSection) {
        const sourceSkill = String(source.sourcePath).replaceAll('\\', '/').match(/(?:^|\/)([^/]+)\/SKILL\.md$/)?.[1];
        let expectedSection = null;
        try { expectedSection = nativeSectionId(sourceSkill ?? ''); } catch { /* 无效来源身份通过下面的绑定错误报告。 */ }
        if (!sourceSkill || row.nativeSection.sourceSkill !== sourceSkill || row.nativeSection.section !== expectedSection
          || (source.adapterSection !== undefined && row.nativeSection.section !== source.adapterSection)) {
          errors.push(`${id} 专业来源绑定的原生章节与文件账本不符：${source.sourcePath}`);
        }
        try { adapterContent = extractNativeSection(adapterContent, row.nativeSection.sourceSkill); }
        catch (error) { errors.push(`${id} 公共规范引用章节缺失：${source.sourcePath} (${error.message})`); continue; }
      }
      if (capability.kind === 'workflow') {
        const redirect = isReferenceRedirect(row, implementation);
        if (row.referenceRedirect && (!redirect || row.destinationSha256 !== digest(readFileSync(canonical)))) errors.push(`${id} 导航合并来源或目标摘要不符：${source.sourcePath}`);
        if (!Array.isArray(row.sharedReferences) || !row.sharedReferences.includes(implementation)) errors.push(`${id} 专业技能没有登记公共规范引用：${source.sourcePath}`);
        if (!redirect && !referencesDocument(adapterContent, adapter, canonical)) errors.push(`${id} 专业技能没有链接到完整公共规范：${row.destination}#${row.nativeSection?.section ?? ''}`);
        if (!Array.isArray(source.sections) || !source.sections.length) errors.push(`${id} 缺少抽取的具体规则段落：${source.sourcePath}`);
        const adapterParagraphs = new Set(paragraphs(adapterContent, { ignoreReferences: true }));
        let sourceText;
        let sourceParagraphs;
        if (sourceRoot) {
          const original = resolve(sourceRoot, `${source.stack}-skills`, ...source.sourcePath.split('/'));
          if (existsSync(original)) {
            sourceText = readFileSync(original, 'utf8');
            sourceParagraphs = new Set(paragraphs(sourceText));
          }
        }
        for (const section of source.sections ?? []) {
          if (!hashPattern.test(section.sourceHash ?? '') || !hashPattern.test(section.canonicalHash ?? '')) errors.push(`${id} 规则段落缺少有效摘要`);
          if (!canonicalParagraphs.has(section.canonicalHash)) errors.push(`${id} 公共规范遗漏具体规则段落：${section.heading ?? section.canonicalHash}`);
          if (sourceText !== undefined && section.sourceRange) {
            // 连续列表项在源文件中没有空行，必须按已审计的原始字符区间核验，不能重新分段猜测边界。
            const { start, end } = section.sourceRange;
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > sourceText.length
              || sectionDigest(sourceText.slice(start, end)) !== section.sourceHash) errors.push(`${id} 抽取段落不属于实际源技能：${source.sourcePath}`);
          } else if (sourceParagraphs && !sourceParagraphs.has(section.sourceHash)) errors.push(`${id} 抽取段落不属于实际源技能：${source.sourcePath}`);
          if (!redirect && adapterParagraphs.has(section.sourceHash)) errors.push(`${id} 公共规则仍在专业入口重复维护：${source.sourcePath}`);
        }
      } else {
        if (row.sharedImplementationRef !== implementation) errors.push(`${id} 文件账本没有绑定公共实现：${source.sourcePath}`);
        if (capability.directShared !== true && !unifiedShared && !referencesImplementation(adapterContent, adapter, canonical)) errors.push(`${id} 专业入口没有导入公共真源：${row.destination}`);
        // 薄入口只负责路由和栈配置；长度门槛用于阻止保留整份旧算法而仅补一条共享声明。
        if (capability.kind === 'template') {
          // 模板组合器保留本栈 GDD/TDD 静态正文，仅公共控制字段下沉，不能按总代码长度误删专业内容。
          const keys = [...(source.sharedTemplateKeys ?? [])].sort();
          if (!row.destination.endsWith('/scripts/project_doc_templates.mjs')
            || JSON.stringify(keys) !== JSON.stringify(['control-plane.md', 'project-profile.yaml'])
            || !Array.isArray(source.nativeTemplateKeys) || !source.nativeTemplateKeys.length) errors.push(`${id} 局部模板抽取必须明确两项公共字段及其余原生模板`);
        } else if (capability.directShared !== true && !unifiedShared && adapterContent.length > 8000) errors.push(`${id} 适配入口仍包含大段实现，应下沉公共真源：${row.destination}`);
        if (capability.directShared !== true) result.adapterBytes += Buffer.byteLength(adapterContent);
        if (sourceRoot) {
          const original = resolve(sourceRoot, `${source.stack}-skills`, ...source.sourcePath.split('/'));
          if (existsSync(original)) result.sourceBytes += readFileSync(original).length;
        }
      }
      result.adapters += 1;
    }
    for (const dependency of capability.dependencies ?? []) {
      const file = resolveFile(dependency, `${id}.dependency`);
      if (!file || !existsSync(file) || !lstatSync(file).isFile()) errors.push(`${id} 共享依赖不存在：${dependency}`);
      if (/skills\/(?:unity|cocos|phaser|threejs|flutter)[^/]*\//.test(dependency)) errors.push(`${id} 公共实现反向依赖单栈私有文件：${dependency}`);
    }
    result.capabilities += 1;
    if (capability.kind === 'module') result.modules += 1;
    if (capability.kind === 'asset') result.assets += 1;
    if (capability.kind === 'workflow') result.workflows += 1;
    if (capability.kind === 'template') result.templates += 1;
    if (capability.kind !== 'workflow') result.implementationBytes += readFileSync(canonical).length;
  }
  for (const row of fileRows) {
    if (row.directShared === true && !capabilities.some((item) => item?.directShared === true && item.implementation === row.destination && item.sources?.some((source) => source?.stack === row.stack && source.sourcePath === row.sourcePath))) errors.push(`${row.stack}/${row.sourcePath} 直接共享来源没有公共能力登记`);
    for (const target of [row.sharedImplementationRef, ...(row.sharedReferences ?? [])].filter(Boolean)) {
      if (!implementations.has(target)) errors.push(`${row.stack}/${row.sourcePath} 共享目标没有公共能力登记：${target}`);
    }
  }
  result.savedImplementationBytes = sourceRoot ? result.sourceBytes - result.implementationBytes - result.adapterBytes : null;
  return result;
}
