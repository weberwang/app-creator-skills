/** 独立核对公共能力真源、专业薄入口和源段落追溯，避免把搬运副本当成复用。 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { extractNativeSection, nativeSectionId } from './capability-map.mjs';

/** 对完整字节计算摘要，不使用文件名或相似标题代替内容判断。 */
function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** 段落摘要只统一换行与外层空白，不能抹去原生 API、版本或技术字段差异。 */
function sectionDigest(value) {
  return digest(value.trim().replaceAll('\r\n', '\n'));
}

/** 枚举文档的完整段落，以验证抽出的原规则仍在公共规范里。 */
function paragraphs(text) {
  return text.split(/\r?\n\s*\r?\n/).map(sectionDigest);
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
        if (!Array.isArray(row.sharedReferences) || !row.sharedReferences.includes(implementation)) errors.push(`${id} 专业技能没有登记公共规范引用：${source.sourcePath}`);
        if (!referencesDocument(adapterContent, adapter, canonical)) errors.push(`${id} 专业技能没有链接到完整公共规范：${row.destination}#${row.nativeSection?.section ?? ''}`);
        if (!Array.isArray(source.sections) || !source.sections.length) errors.push(`${id} 缺少抽取的具体规则段落：${source.sourcePath}`);
        const adapterParagraphs = new Set(paragraphs(adapterContent));
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
          if (adapterParagraphs.has(section.sourceHash)) errors.push(`${id} 公共规则仍在专业入口重复维护：${source.sourcePath}`);
        }
      } else {
        if (row.sharedImplementationRef !== implementation) errors.push(`${id} 文件账本没有绑定公共实现：${source.sourcePath}`);
        if (!referencesImplementation(adapterContent, adapter, canonical)) errors.push(`${id} 专业入口没有导入公共真源：${row.destination}`);
        // 薄入口只负责路由和栈配置；长度门槛用于阻止保留整份旧算法而仅补一条共享声明。
        if (capability.kind === 'template') {
          // 模板组合器保留本栈 GDD/TDD 静态正文，仅公共控制字段下沉，不能按总代码长度误删专业内容。
          const keys = [...(source.sharedTemplateKeys ?? [])].sort();
          if (!row.destination.endsWith('/scripts/project_doc_templates.mjs')
            || JSON.stringify(keys) !== JSON.stringify(['control-plane.md', 'project-profile.yaml'])
            || !Array.isArray(source.nativeTemplateKeys) || !source.nativeTemplateKeys.length) errors.push(`${id} 局部模板抽取必须明确两项公共字段及其余原生模板`);
        } else if (adapterContent.length > 8000) errors.push(`${id} 适配入口仍包含大段实现，应下沉公共真源：${row.destination}`);
        result.adapterBytes += Buffer.byteLength(adapterContent);
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
    for (const target of [row.sharedImplementationRef, ...(row.sharedReferences ?? [])].filter(Boolean)) {
      if (!implementations.has(target)) errors.push(`${row.stack}/${row.sourcePath} 共享目标没有公共能力登记：${target}`);
    }
  }
  result.savedImplementationBytes = sourceRoot ? result.sourceBytes - result.implementationBytes - result.adapterBytes : null;
  return result;
}
