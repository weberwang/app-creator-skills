import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { readFileSync, writeFileSync } from './file-io.mjs';
import { dirname, join, resolve } from 'node:path';
import { CAPABILITY_GROUPS, capabilityAdapters, extractNativeSection, nativeAdapterPath, nativeContractPath, nativeSectionId } from '../capability-map.mjs';
import { applyGeneratedDomainResources } from './output-cleanup.mjs';
import { promoteNativeRules } from './native-rule-promotions.mjs';
import { adaptNativeFunctionFirst, buildNativeTargets, collectNativeHeadingAnchors, indentNativeHeadings, rebaseNativeCodePathReferences, rebaseNativeMarkdownLinks, renderNativeManual } from './native-manual-renderer.mjs';

/** 计算稳定的 SHA-256，用于逐来源章节和整本手册的独立完整性校验。 */
function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** 删除源入口 frontmatter 与仅用于旧逐源文件的迁移通知。 */
function stripNativePreamble(text) {
  let output = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, '').replace(/\r\n/g, '\n');
  output = output.replace(/^> 原生适配规范：[^\n]*(?:\n\n)?/, '');
  output = output.replace(/^> (?:本文件是 app-creator-skills 仓库新增|本规范为 app-creator-skills 仓库新增)[^\n]*(?:\n\n)?/, '');
  return output.trimStart().trimEnd();
}

/** 将 Unity 来源中的旧固定五语言规则改为项目初始化时确定的范围。 */
function applyUnityLocaleSelection(text, stack) {
  if (stack !== 'unity') return text;
  return text
    .replace('程序化文本同时实现 `en`、`zh-CN`、`ja`、`ru`、`es`', '程序化文本默认实现 `zh-CN`，英语 `en` 等其他语言按项目选择实现')
    .replace('程序化文本对 `en`、`zh-CN`、`ja`、`ru`、`es` 分别验证', '程序化文本对项目所选语言（默认 `zh-CN`，英语 `en` 可选）分别验证')
    .replace('程序化文本必须覆盖 `en`、`zh-CN`、`ja`、`ru`、`es`', '程序化文本默认覆盖 `zh-CN`，英语 `en` 等其他语言按项目选择覆盖');
}

/** 汇集来源、重用和仓库作者模式的目录信息，保证同一真实文档只迁入一次。 */
function buildAdapterIndexes(plans) {
  const groups = CAPABILITY_GROUPS.map((group) => ({ ...group, adapters: capabilityAdapters(group) }));
  const authored = groups.flatMap((group) => group.adapters
    .filter((adapter) => adapter.authored)
    .map((adapter) => ({ ...adapter, capability: group.name })));
  const sourceRecords = [];
  const seen = new Set();
  for (const plan of plans) {
    for (const skill of plan.rootSkillEntries.filter((entry) => entry.kind === 'specialist')) {
      if (seen.has(`${plan.stack}:${skill.name}`)) throw new Error(`原生专业入口重复：${plan.stack}/${skill.name}`);
      seen.add(`${plan.stack}:${skill.name}`);
      sourceRecords.push({
        stack: plan.stack,
        sourceSkill: skill.name,
        sourcePath: skill.sourcePath,
        stagePath: skill.adapterDestination,
        capability: skill.capability,
        section: nativeSectionId(skill.name),
      });
    }
  }
  return { groups, authored, sourceRecords };
}

/** 先检查旧生成文档的哈希所有权，再安排作者模式源文件的安全清理。 */
function prepareAuthoredCleanup({ authored, previousHashes, resolveDestination, hashDestination }) {
  const removals = [];
  for (const adapter of authored) {
    const oldPath = nativeAdapterPath(adapter.sourceSkill);
    const target = resolveDestination(oldPath);
    if (!existsSync(target)) continue;
    const metadata = lstatSync(target);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`旧作者模式不是普通文件，拒绝移除：${oldPath}`);
    const expectedHash = previousHashes.get(oldPath);
    if (!expectedHash) throw new Error(`旧作者模式缺少上一轮清单哈希，拒绝移除：${oldPath}`);
    if (hashDestination(oldPath) !== expectedHash) throw new Error(`旧作者模式已被手动修改，拒绝移除：${oldPath}`);
    removals.push({ adapter, oldPath, target });
  }
  return removals;
}

/** 读取每个来源已经完成旧迁移变换和共享能力替换的完整正文。 */
function readPreparedSections({ sourceRecords, authored, files, repositoryRoot, resolveDestination, sha256, promoteRules }) {
  const sections = [];
  for (const record of sourceRecords) {
    const ledgerRow = files.find((file) => file.stack === record.stack && file.sourcePath === record.sourcePath);
    if (!ledgerRow || ledgerRow.destination !== record.stagePath || !ledgerRow.sourceSha256) {
      throw new Error(`原生入口无法关联逐文件迁移账本：${record.stack}:${record.sourcePath}`);
    }
    const stagedPath = resolveDestination(record.stagePath);
    const stagedBytes = readFileSync(stagedPath);
    if (sha256(stagedBytes) !== ledgerRow.destinationSha256) throw new Error(`逐源适配文件在汇总前已变化：${record.stagePath}`);
    record.stagedSha256 = ledgerRow.destinationSha256;
    record.sourceSha256 = ledgerRow.sourceSha256;
    const promoted = promoteRules(stagedBytes.toString('utf8'), { stack: record.stack, sourceSkill: record.sourceSkill, repositoryRoot });
    if (!promoted || typeof promoted.text !== 'string') throw new Error(`原生公共规则提升器未返回正文：${record.stack}/${record.sourceSkill}`);
    const body = adaptNativeFunctionFirst(applyUnityLocaleSelection(stripNativePreamble(promoted.text), record.stack), { stack: record.stack });
    sections.push({
      ...record,
      body,
      promotions: promoted.promotions,
      anchors: collectNativeHeadingAnchors(body, record.sourceSkill),
      origin: 'source',
    });
  }
  for (const adapter of authored) {
    const template = `scripts/migration/templates/${adapter.sourceSkill}.source`;
    const templateBytes = readFileSync(resolve(repositoryRoot, ...template.split('/')));
    const promoted = promoteRules(templateBytes.toString('utf8'), { stack: adapter.stack, sourceSkill: adapter.sourceSkill, repositoryRoot });
    if (!promoted || typeof promoted.text !== 'string') throw new Error(`原生公共规则提升器未返回作者模式正文：${adapter.stack}/${adapter.sourceSkill}`);
    const body = adaptNativeFunctionFirst(applyUnityLocaleSelection(stripNativePreamble(promoted.text), adapter.stack), { stack: adapter.stack });
    sections.push({
      stack: adapter.stack,
      sourceSkill: adapter.sourceSkill,
      sourcePath: template,
      stagePath: nativeAdapterPath(adapter.sourceSkill),
      capability: adapter.capability,
      section: nativeSectionId(adapter.sourceSkill),
      sourceSha256: sha256(templateBytes),
      template,
      body,
      promotions: promoted.promotions,
      anchors: collectNativeHeadingAnchors(body, adapter.sourceSkill),
      origin: 'repository-authored',
      mode: adapter.mode,
    });
  }
  const uniqueSections = new Set();
  for (const section of sections) {
    const key = `${section.stack}:${section.section}`;
    if (uniqueSections.has(key)) throw new Error(`原生模式章节键重复：${key}`);
    uniqueSections.add(key);
  }
  return sections;
}

/** 先建好多源标题映射，再重基手册正文中指向其他旧适配文档的链接。 */
function renderSections(sections, manuals, sharedCapabilities) {
  const targets = buildNativeTargets(sections.map((section) => ({ ...section, manualPath: manuals.get(section.stack) })), sharedCapabilities);
  return sections.map((section) => {
    const manualPath = manuals.get(section.stack);
    const linked = rebaseNativeMarkdownLinks(section.body, {
      stagePath: section.stagePath,
      manualPath,
      sourceSkill: section.sourceSkill,
      targets,
    });
    const linkedCodePaths = rebaseNativeCodePathReferences(linked, { targets });
    return { ...section, body: indentNativeHeadings(linkedCodePaths, section.sourceSkill) };
  });
}

/** 预检并准备账本拥有的 Markdown 链接；逐字源归档不属于可变目标。 */
function preparePublishedReferenceUpdates({ files, sharedOutputs, manuals, renderedSections, resolveDestination, sha256 }) {
  const recordsByPath = new Map();
  const stagingPaths = new Set(renderedSections.map((section) => section.stagePath));
  const addRecord = (path, record, kind) => {
    const rawArchive = path?.includes('/replaced/') || path?.endsWith('.source');
    if (!path || rawArchive || (kind === 'generated' && !path.startsWith('skills/')) || !path.toLowerCase().endsWith('.md') || manuals.has(path) || stagingPaths.has(path)) return;
    if (!recordsByPath.has(path)) recordsByPath.set(path, []);
    recordsByPath.get(path).push({ record, kind });
  };
  for (const file of files) addRecord(file.destination, file, 'ledger');
  for (const file of sharedOutputs.generatedFiles) addRecord(file.path, file, 'generated');

  const targets = buildNativeTargets(renderedSections.map((section) => ({ ...section, manualPath: manuals.get(section.stack) })), sharedOutputs.sharedCapabilities);
  const updates = [];
  for (const [path, records] of recordsByPath) {
    const currentBytes = readFileSync(resolveDestination(path));
    const currentHash = sha256(currentBytes);
    for (const { record } of records) {
      if (record.destinationSha256 && record.destinationSha256 !== currentHash) throw new Error(`已登记 Markdown 在重基引用前发生变化：${path}`);
    }
    const currentText = currentBytes.toString('utf8');
    const rewrittenLinks = rebaseNativeMarkdownLinks(currentText, {
      stagePath: path,
      manualPath: path,
      sourceSkill: '',
      targets,
      nativeOnly: true,
    });
    const rebasedCodePaths = rebaseNativeCodePathReferences(rewrittenLinks, { targets });
    const rewrittenText = clarifyFlutterTemplateResourceReference(path, rebasedCodePaths);
    if (rewrittenText === currentText) continue;
    if (records.some((item) => item.kind === 'generated') && /skills\/(?:app-creator-workflow|app-domain-toolkit)\/references\//.test(path)) {
      throw new Error(`共享规范正文包含旧原生适配链接，需先确认公共真源归属：${path}`);
    }
    updates.push({ path, records, target: resolveDestination(path), content: Buffer.from(rewrittenText, 'utf8') });
  }
  return updates;
}

/** 写入预检通过的旧适配链接重定向，并同步账本和生成 Markdown 的最终哈希。 */
function applyPublishedReferenceUpdates(updates, sha256) {
  for (const update of updates) {
    writeFileSync(update.target, update.content);
    const destinationSha256 = sha256(update.content);
    for (const { record } of update.records) {
      record.destinationSha256 = destinationSha256;
      record.transforms = [...new Set([...(record.transforms ?? []), 'rebase-native-manual-links'])];
    }
  }
}

/** 新 Flutter 模板同时读取独立布局适配资源，显式定位以免被误认为手册相邻文件。 */
function clarifyFlutterTemplateResourceReference(path, text) {
  if (path !== 'skills/flutter-project-init/assets/flutter-dev/SKILL.md') return text;
  return text.replace(' and its `references/flutter-adapter.md`', ' and `.agents/skills/adaptive-layout-implementation/references/flutter-adapter.md`');
}

/** 验证现存手册没有被人工修改；无所有权记录时只接受完全相同的预期字节。 */
function assertManualWritable({ path, content, previousHashes, resolveDestination, hashDestination, sha256 }) {
  const target = resolveDestination(path);
  if (!existsSync(target)) return target;
  const expectedHash = previousHashes.get(path);
  const actualHash = hashDestination(path);
  // 中断可能发生在整本手册已写完而账本尚未提交时；只有完整预期字节才允许复用。
  if (actualHash === sha256(Buffer.from(content, 'utf8'))) return target;
  if (expectedHash && actualHash !== expectedHash) throw new Error(`原生手册已被手动修改，拒绝覆盖：${path}`);
  if (!expectedHash && actualHash !== sha256(Buffer.from(content, 'utf8'))) throw new Error(`原生手册目标已存在且内容不属于本次预期，拒绝覆盖：${path}`);
  return target;
}

/** 只删除单个生成中间文件，并在文件与目录身份异常时停止而不递归清理。 */
function removeVerifiedFile(path, expectedHash, { resolveDestination, hashDestination }) {
  const target = resolveDestination(path);
  if (!existsSync(target)) return false;
  const metadata = lstatSync(target);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`原生中间目标不是普通文件，拒绝移除：${path}`);
  if (hashDestination(path) !== expectedHash) throw new Error(`原生中间目标在汇总期间已变化，拒绝移除：${path}`);
  unlinkSync(target);
  return true;
}

/** 判断一个旧资源根是否仍含文件，避免清理用户资源或工具载荷目录。 */
function directoryHasFiles(directory) {
  let metadata;
  try { metadata = lstatSync(directory); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) return true;
  return readdirSync(directory, { withFileTypes: true }).some((entry) => {
    const child = join(directory, entry.name);
    if (entry.isSymbolicLink()) return true;
    return entry.isDirectory() ? directoryHasFiles(child) : entry.isFile();
  });
}

/** 仅在来源 skill 目录已无文件时移除目录声明，并尝试删除空壳目录本身。 */
function pruneEmptyResourceRoots(plans, sourceRecords, authored, repositoryRoot) {
  const namesByStack = new Map();
  for (const record of [...sourceRecords, ...authored]) {
    if (!namesByStack.has(record.stack)) namesByStack.set(record.stack, new Set());
    namesByStack.get(record.stack).add(record.sourceSkill);
  }
  for (const plan of plans) {
    const removed = new Set();
    for (const name of namesByStack.get(plan.stack) ?? []) {
      const root = resolve(repositoryRoot, 'skills', name);
      if (directoryHasFiles(root)) continue;
      plan.resourceDirectories = plan.resourceDirectories.filter((directory) => directory !== name);
      removed.add(root);
    }
    for (const root of removed) {
      try { rmdirSync(root); }
      catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
    }
  }
}

/** 将源模式、仓库作者模式和公共领域测试写入受哈希保护的最终输出。 */
export function applyNativeManualResources({ repositoryRoot, previousHashes, resolveDestination, hashDestination, sha256 = hashBytes, files, plans, sharedOutputs, promoteRules = promoteNativeRules }) {
  const domainGeneratedFiles = applyGeneratedDomainResources({ repositoryRoot, previousHashes, resolveDestination, hashDestination, sha256 });
  const { groups, authored, sourceRecords } = buildAdapterIndexes(plans);
  if (sourceRecords.length !== 77) throw new Error(`原生源模式数量异常：${sourceRecords.length}/77`);
  if (authored.length !== 3) throw new Error(`仓库作者模式数量异常：${authored.length}/3`);
  const authoredRemovals = prepareAuthoredCleanup({ authored, previousHashes, resolveDestination, hashDestination });
  const preparedSections = readPreparedSections({ sourceRecords, authored, files, repositoryRoot, resolveDestination, sha256, promoteRules });
  const manuals = new Map(plans.map((plan) => [plan.stack, nativeContractPath(plan.stack)]));
  const renderedSections = renderSections(preparedSections, manuals, sharedOutputs.sharedCapabilities);
  const referenceUpdates = preparePublishedReferenceUpdates({ files, sharedOutputs, manuals, renderedSections, resolveDestination, sha256 });
  const manualContents = new Map();
  for (const plan of plans) {
    const content = renderNativeManual({ stack: plan.stack, capabilityGroups: groups, sections: renderedSections.filter((section) => section.stack === plan.stack) });
    manualContents.set(plan.stack, content);
  }

  const manualTargets = new Map();
  for (const [stack, path] of manuals) manualTargets.set(stack, assertManualWritable({ path, content: manualContents.get(stack), previousHashes, resolveDestination, hashDestination, sha256 }));
  for (const [stack, path] of manuals) {
    const content = manualContents.get(stack);
    const target = manualTargets.get(stack);
    // 写入权限已统一预检；未变手册不再次触发文件监听或占用。
    if (existsSync(target) && hashDestination(path) === sha256(Buffer.from(content, 'utf8'))) continue;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
  }
  applyPublishedReferenceUpdates(referenceUpdates, sha256);

  const generatedFiles = [];
  for (const plan of plans) {
    const path = manuals.get(plan.stack);
    const content = manualContents.get(plan.stack);
    const destinationSha256 = sha256(Buffer.from(content, 'utf8'));
    const stackSections = renderedSections.filter((section) => section.stack === plan.stack);
    const sectionRows = [];
    for (const section of stackSections) {
      const nativeContent = extractNativeSection(content, section.sourceSkill);
      const contributionHash = sha256(Buffer.from(nativeContent, 'utf8'));
      if (section.origin === 'source') {
        const ledgerRow = files.find((file) => file.stack === section.stack && file.sourcePath === section.sourcePath);
        if (ledgerRow.sourceSha256 !== section.sourceSha256) throw new Error(`原生源哈希不能回写或替换：${section.stack}:${section.sourcePath}`);
        ledgerRow.destination = path;
        ledgerRow.destinationSha256 = destinationSha256;
        ledgerRow.nativeSection = { sourceSkill: section.sourceSkill, section: section.section, sha256: contributionHash };
        ledgerRow.transforms = [...new Set([...(ledgerRow.transforms ?? []), 'consolidate-native-manual-section'])];
      }
      sectionRows.push({
        sourceSkill: section.sourceSkill,
        capability: section.capability,
        section: section.section,
        sha256: contributionHash,
        origin: section.origin,
        sourceSha256: section.sourceSha256,
        ...(section.template ? { template: section.template } : {}),
        ...(section.promotions?.length ? { rulePromotions: section.promotions } : {}),
      });
    }
    generatedFiles.push({
      kind: 'native-manual',
      origin: 'consolidated-native',
      stack: plan.stack,
      path,
      reason: `汇总 ${plan.stack} 技术栈的原生专业模式，并保留每个来源章节的独立哈希证明。`,
      destinationSha256,
      sections: sectionRows,
    });
  }

  for (const record of sourceRecords) {
    const ledgerRow = files.find((file) => file.stack === record.stack && file.sourcePath === record.sourcePath);
    const rootSkill = plans.find((plan) => plan.stack === record.stack).rootSkillEntries.find((skill) => skill.name === record.sourceSkill);
    rootSkill.adapterDestination = ledgerRow.destination;
    rootSkill.adapterSection = ledgerRow.nativeSection.section;
  }
  for (const capability of sharedOutputs.sharedCapabilities) {
    for (const source of capability.sources) {
      const ledgerRow = files.find((file) => file.stack === source.stack && file.sourcePath === source.sourcePath && file.nativeSection);
      if (!ledgerRow) continue;
      source.adapterDestination = ledgerRow.destination;
      source.adapterSection = ledgerRow.nativeSection.section;
    }
  }

  for (const record of sourceRecords) {
    removeVerifiedFile(record.stagePath, record.stagedSha256, { resolveDestination, hashDestination });
  }
  for (const { oldPath, target } of authoredRemovals) {
    const expectedHash = previousHashes.get(oldPath);
    if (hashDestination(oldPath) !== expectedHash) throw new Error(`旧作者模式在汇总期间已变化，拒绝移除：${oldPath}`);
    unlinkSync(target);
  }
  pruneEmptyResourceRoots(plans, sourceRecords, authored, repositoryRoot);
  return [...domainGeneratedFiles, ...generatedFiles];
}
