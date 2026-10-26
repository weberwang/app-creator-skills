#!/usr/bin/env node
/** 校验五个源仓库的逐项迁移清单、交付文件和本地工具依赖。 */
import { createHash } from 'node:crypto';
import { closeSync, existsSync, lstatSync, openSync, readFileSync, readSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateSharedCapabilities } from './validate-shared-capabilities.mjs';
import { CAPABILITY_GROUPS, capabilityAdapters, capabilityForSourceSkill, nativeContractPath } from './capability-map.mjs';
import { validateNativeManuals } from './validate-native-manuals.mjs';

/** 正式入口数不包含 Flutter 项目初始化技能内嵌的 flutter-dev 模板。 */
export const FORMAL_SKILL_COUNTS = Object.freeze({ unity: 19, cocos: 19, phaser: 18, threejs: 21, flutter: 14 });

/** 公共工作流入口的迁移目标固定，避免把旧控制器作为专业技能重复分发。 */
export const MERGED_SKILLS = Object.freeze({
  unity: { 'unity-game-workflow-control': 'app-workflow-control', 'unity-development-workflow': 'app-creator-workflow', 'unity-game-grilling': 'grilling' },
  cocos: { 'cocos-game-workflow-control': 'app-workflow-control', 'cocos-game-orchestrator': 'app-creator-workflow', grilling: 'grilling' },
  phaser: { 'phaser4-game-workflow-control': 'app-workflow-control', 'phaser4-game-orchestrator': 'app-creator-workflow', grilling: 'grilling' },
  threejs: { 'threejs-game-workflow-control': 'app-workflow-control', 'threejs-game-orchestrator': 'app-creator-workflow', grilling: 'grilling' },
  flutter: { 'flutter-app-orchestrator': 'app-creator-workflow', grilling: 'grilling' },
});

const STACKS = Object.freeze(Object.keys(FORMAL_SKILL_COUNTS));
const FLUTTER_NESTED_TEMPLATE = 'flutter-project-init/assets/flutter-dev/SKILL.md';
const HASH_PATTERN = /^[a-f\d]{64}$/i;
const SOURCE_ONLY_REASONS = new Set(['migrated', 'kept', 'merged', 'same as above', 'see above', '迁移', '保留', '合并', '同上', '见上文', '已处理']);
const SHARED_RUNTIME_MODULES = new Set([
  'skills/app-skill-runtime/dependencies.cjs',
  'skills/app-skill-runtime/sharp.mjs',
  'skills/app-skill-runtime/yaml.mjs',
  'skills/app-skill-runtime/ajv2020.mjs',
  'skills/app-skill-runtime/ajv-formats.mjs',
  'skills/app-skill-runtime/direct-entry.mjs',
  'skills/app-workflow-control/scripts/runtime/constants.mjs',
  'skills/app-workflow-control/scripts/runtime/io.mjs',
  'skills/app-workflow-control/scripts/runtime/validation.mjs',
  'skills/app-workflow-control/scripts/runtime/workflow.mjs',
  'skills/app-workflow-control/scripts/runtime/artifacts.mjs',
  'skills/app-workflow-control/scripts/runtime/execution-batches.mjs',
  'skills/app-workflow-control/scripts/runtime/work-lock.mjs',
  'skills/app-asset-workflow/scripts/png-raster.mjs',
  'skills/app-asset-workflow/scripts/remove-background-local.mjs',
]);

/** 将清单相对路径限制在仓库内，并统一 Windows 与 POSIX 分隔符。 */
function safeRelative(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) { errors.push(`${label} 必须是非空仓库相对路径`); return null; }
  const normalized = value.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || segments.some((part) => !part || part === '.' || part === '..' || part.includes(':'))) {
    errors.push(`${label} 含绝对路径或路径穿越：${value}`);
    return null;
  }
  return segments.join('/');
}

/** 校验路径真实位置，拒绝经过软链接逃出目标仓库的清单路径。 */
function resolveInside(root, value, label, errors) {
  const safe = safeRelative(value, label, errors);
  if (!safe) return null;
  const target = resolve(root, ...safe.split('/'));
  const rel = relative(resolve(root), target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) { errors.push(`${label} 越出目标仓库：${value}`); return null; }
  if (!existsSync(target)) return target;
  try {
    const actual = realpathSync(target);
    const realRel = relative(realpathSync(root), actual);
    if (realRel === '..' || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) errors.push(`${label} 经过符号链接逃出目标仓库：${value}`);
  } catch (error) { errors.push(`${label} 无法解析：${value} (${error.message})`); }
  return target;
}

/** 计算文件 SHA-256，作为迁移清单与真实字节之间的校验依据。 */
function sha256(path) {
  const descriptor = openSync(path, 'r');
  const buffer = Buffer.allocUnsafe(128 * 1024);
  const hash = createHash('sha256');
  try {
    let bytesRead;
    // 流式摘要避免大型纹理或模型迁移校验时一次性占用同等大小内存。
    while ((bytesRead = readSync(descriptor, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytesRead));
  } finally { closeSync(descriptor); }
  return hash.digest('hex');
}

/** 归一化文件表，支持合同中的内嵌 files 和 filesRef 两种布局。 */
function readFileTable(root, catalog, errors) {
  if (Array.isArray(catalog.files)) return catalog.files;
  const ref = safeRelative(catalog.filesRef, 'catalog.filesRef', errors);
  if (!ref) return [];
  const path = resolve(root, ...ref.split('/'));
  if (!existsSync(path)) { errors.push(`迁移文件清单不存在：${ref}`); return []; }
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.files)) return value.files;
    errors.push(`${ref} 必须是文件记录数组或包含 files 数组的对象`);
  } catch (error) { errors.push(`${ref} JSON 无效：${error.message}`); }
  return [];
}

/** 读取源仓库的 Git 索引文件名；用 NUL 分隔以保留空格和 Unicode 路径。 */
function trackedFiles(repoRoot, stack, errors) {
  if (!existsSync(repoRoot)) { errors.push(`源仓库目录不存在：${stack} ${repoRoot}`); return null; }
  const result = spawnSync('git', ['-C', repoRoot, 'ls-files', '-z'], { encoding: 'buffer', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) { errors.push(`读取 ${stack} Git 跟踪清单失败：${result.stderr?.toString('utf8') || result.error?.message || result.status}`); return null; }
  return result.stdout.toString('utf8').split('\0').filter(Boolean).map((path) => path.replaceAll('\\', '/'));
}

/** 提取 YAML frontmatter 的 name 字段，避免只凭目录存在认定身份正确。 */
function skillFrontmatterName(path) {
  const content = readFileSync(path, 'utf8');
  const block = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return block?.[1].match(/^name:\s*([^\s#]+)\s*$/m)?.[1] ?? null;
}

/** 从技能目的路径推导目录名，兼容目录路径和直接指向 SKILL.md 的清单。 */
function skillDestinationName(destination) {
  const normalized = String(destination ?? '').replaceAll('\\', '/').replace(/\/$/, '');
  return basename(normalized.endsWith('/SKILL.md') ? dirname(normalized) : normalized);
}

/** 将技能级 destination 统一展开为分发包内的入口文件路径。 */
function skillFileDestination(destination) {
  const normalized = String(destination ?? '').replaceAll('\\', '/').replace(/\/$/, '');
  if (normalized.endsWith('/SKILL.md')) return normalized;
  return normalized.startsWith('skills/') ? `${normalized}/SKILL.md` : `skills/${normalized}/SKILL.md`;
}

/** 生成迁移契约中每个能力组应有的栈和原生适配映射。 */
function expectedCapabilityRecords() {
  return CAPABILITY_GROUPS.map((group) => ({
    name: group.name,
    core: group.core === true,
    stacks: [...new Set(capabilityAdapters(group).map((adapter) => adapter.stack))],
    nativeAdapters: capabilityAdapters(group),
  }));
}

/** 收集资源目录全部安装文件，后续逐项要求账本/生成摘要并检查本地依赖。 */
function collectResourceFiles(root, directory, result, errors) {
  const target = resolveInside(root, directory, 'resourceDirectories', errors);
  if (!target || !existsSync(target) || !lstatSync(target).isDirectory()) return;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    const child = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) errors.push(`资源目录不能包含符号链接：${child}`);
    else if (entry.isDirectory()) collectResourceFiles(root, child, result, errors);
    else if (entry.isFile()) result.add(child);
  }
}

/** 检查公共能力 catalog、manifest 和根入口是否与唯一映射真源一致。 */
function validateCapabilityCatalog(root, catalog, records, errors) {
  const expected = expectedCapabilityRecords();
  const actual = Array.isArray(catalog.capabilities) ? catalog.capabilities : [];
  if (!Array.isArray(catalog.capabilities)) errors.push('catalog.capabilities 必须是能力记录数组');
  const actualByName = new Map();
  for (const entry of actual) {
    if (!entry || typeof entry.name !== 'string' || actualByName.has(entry.name)) errors.push(`catalog.capabilities 含无效或重复能力：${entry?.name ?? '未命名'}`);
    else actualByName.set(entry.name, entry);
  }
  for (const expectedEntry of expected) {
    const entry = actualByName.get(expectedEntry.name);
    if (!entry) errors.push(`catalog.capabilities 缺少能力：${expectedEntry.name}`);
    else {
      if (entry.core !== expectedEntry.core) errors.push(`${expectedEntry.name}.core 与 capability-map 不符`);
      if (JSON.stringify(entry.stacks) !== JSON.stringify(expectedEntry.stacks)) errors.push(`${expectedEntry.name}.stacks 与 capability-map 不符`);
      if (JSON.stringify(entry.nativeAdapters) !== JSON.stringify(expectedEntry.nativeAdapters)) errors.push(`${expectedEntry.name}.nativeAdapters 与 capability-map 不符`);
    }
    const skillPath = `skills/${expectedEntry.name}/SKILL.md`;
    const skillFile = resolveInside(root, skillPath, `${expectedEntry.name}.SKILL.md`, errors);
    if (!skillFile || !existsSync(skillFile) || skillFrontmatterName(skillFile) !== expectedEntry.name) errors.push(`公共能力入口缺失或身份错误：${skillPath}`);

    const manifestPath = `skills/${expectedEntry.name}/native-adapters.json`;
    const manifestFile = resolveInside(root, manifestPath, `${expectedEntry.name}.native-adapters`, errors);
    if (!manifestFile || !existsSync(manifestFile)) {
      errors.push(`公共能力原生适配 manifest 缺失：${manifestPath}`);
      continue;
    }
    let manifest;
    try { manifest = JSON.parse(readFileSync(manifestFile, 'utf8')); }
    catch (error) { errors.push(`${manifestPath} JSON 无效：${error.message}`); continue; }
    if (manifest?.capability !== expectedEntry.name || !manifest.adapters || Array.isArray(manifest.adapters)) errors.push(`${manifestPath} capability 或 adapters 格式无效`);
    const expectedByStack = new Map();
    for (const adapter of expectedEntry.nativeAdapters) {
      if (!expectedByStack.has(adapter.stack)) expectedByStack.set(adapter.stack, []);
      const manifestPath = relative(resolve(root, 'skills', expectedEntry.name), resolve(root, ...adapter.path.split('/'))).split(sep).join('/');
      expectedByStack.get(adapter.stack).push({ ...adapter, path: manifestPath });
    }
    const adapterGroups = manifest?.adapters && typeof manifest.adapters === 'object' ? manifest.adapters : {};
    const actualStacks = Object.keys(adapterGroups).sort();
    const expectedStacks = [...expectedByStack.keys()].sort();
    if (JSON.stringify(actualStacks) !== JSON.stringify(expectedStacks)) errors.push(`${manifestPath} adapters 栈范围与 capability-map 不符`);
    for (const [stack, expectedAdapters] of expectedByStack) {
      const actualAdapters = adapterGroups[stack];
      if (!Array.isArray(actualAdapters) || actualAdapters.length !== expectedAdapters.length) {
        errors.push(`${manifestPath} ${stack} 原生适配数量与 capability-map 不符`);
        continue;
      }
      const actualBySource = new Map();
      for (const adapter of actualAdapters) {
        if (actualBySource.has(adapter?.sourceSkill)) errors.push(`${manifestPath} ${stack} 原生适配重复：${adapter?.sourceSkill}`);
        else actualBySource.set(adapter?.sourceSkill, adapter);
      }
      for (const expectedAdapter of expectedAdapters) {
        const adapter = actualBySource.get(expectedAdapter.sourceSkill);
        if (!adapter || adapter.path !== expectedAdapter.path || adapter.section !== expectedAdapter.section) errors.push(`${manifestPath} ${stack}/${expectedAdapter.sourceSkill} 路由与 capability-map 不符`);
        else if (expectedAdapter.reused) {
          if (adapter.reused !== true || adapter.authored === true || adapter.mode !== expectedAdapter.mode || adapter.when !== expectedAdapter.when) errors.push(`${manifestPath} ${stack}/${expectedAdapter.sourceSkill} 复用边界与 capability-map 不符`);
        } else if (expectedAdapter.authored) {
          if (adapter.authored !== true || adapter.reused === true || adapter.mode !== expectedAdapter.mode || adapter.when !== expectedAdapter.when) errors.push(`${manifestPath} ${stack}/${expectedAdapter.sourceSkill} authored 边界与 capability-map 不符`);
        } else if (adapter.reused === true || adapter.authored === true || typeof adapter.mode !== 'string' || !adapter.mode.trim() || typeof adapter.when !== 'string' || !adapter.when.trim()) {
          errors.push(`${manifestPath} ${stack}/${expectedAdapter.sourceSkill} 原生模式缺少有效 mode/when 或被误标为复用`);
        }
      }
    }
    // 此处只检查公开 manifest 中显式列出的可选路径；其余栈不等于当前安装的必需依赖。
    for (const adapters of Object.values(adapterGroups)) for (const adapter of Array.isArray(adapters) ? adapters : []) {
      if (typeof adapter?.path !== 'string') continue;
      const resolved = resolve(root, 'skills', expectedEntry.name, adapter.path);
      const relativePath = relative(resolve(root), resolved);
      if (relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath) || !existsSync(resolved)) errors.push(`${manifestPath} 原生适配路径不存在或越界：${adapter.path}`);
    }
  }
  for (const name of actualByName.keys()) if (!expected.some((entry) => entry.name === name)) errors.push(`catalog.capabilities 含未登记能力：${name}`);

  for (const stack of STACKS) {
    const record = records[stack];
    if (!record) continue;
    const expectedSkills = CAPABILITY_GROUPS.filter((group) => capabilityAdapters(group).some((adapter) => adapter.stack === stack)).map((group) => group.name);
    const actualSkills = Array.isArray(record.capabilitySkills) ? record.capabilitySkills : [];
    if (!Array.isArray(record.capabilitySkills) || new Set(actualSkills).size !== actualSkills.length || JSON.stringify([...actualSkills].sort()) !== JSON.stringify([...expectedSkills].sort())) errors.push(`${stack}.capabilitySkills 必须完整列出公共能力且不得重复`);
    const expectedAdapters = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.stack === stack && !adapter.reused && !adapter.authored).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section })));
    // catalog 数组顺序不承担路由语义，按源技能名稳定比较完整对象。
    const sortAdapters = (items) => [...items].sort((left, right) => String(left?.sourceSkill).localeCompare(String(right?.sourceSkill)));
    if (!Array.isArray(record.nativeAdapters) || JSON.stringify(sortAdapters(record.nativeAdapters)) !== JSON.stringify(sortAdapters(expectedAdapters))) errors.push(`${stack}.nativeAdapters 与 capability-map 不符`);
    const expectedAuthoredAdapters = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.stack === stack && adapter.authored).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section })));
    if (!Array.isArray(record.authoredAdapters) || JSON.stringify(sortAdapters(record.authoredAdapters)) !== JSON.stringify(sortAdapters(expectedAuthoredAdapters))) errors.push(`${stack}.authoredAdapters 与 capability-map 不符`);
    if (Object.hasOwn(record, 'specialistSkills')) errors.push(`${stack}.specialistSkills 已由 capabilitySkills/nativeAdapters 取代`);
  }
}

/** 给定已安装模块的相对导入，尝试 Node 常见扩展名和目录入口。 */
function resolveModuleFile(basePath) {
  const candidates = [basePath, ...['.mjs', '.js', '.cjs', '.json', '.ts', '.mts', '.cts'].map((extension) => `${basePath}${extension}`)];
  for (const candidate of candidates) if (existsSync(candidate) && lstatSync(candidate).isFile()) return candidate;
  if (existsSync(basePath) && lstatSync(basePath).isDirectory()) {
    const packageFile = join(basePath, 'package.json');
    if (existsSync(packageFile)) {
      try {
        const entry = JSON.parse(readFileSync(packageFile, 'utf8')).exports?.['.'] ?? JSON.parse(readFileSync(packageFile, 'utf8')).main;
        if (typeof entry === 'string') {
          const resolved = resolveModuleFile(resolve(basePath, entry));
          if (resolved) return resolved;
        }
      } catch { /* package.json 无效会由包自身校验器报告；继续尝试目录 index。 */ }
    }
    for (const name of ['index.mjs', 'index.js', 'index.cjs', 'index.json']) {
      const candidate = join(basePath, name);
      if (existsSync(candidate) && lstatSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

/** 标记代码区，避免把注释、字符串示例和模板文案里的伪 import 当成真实依赖。 */
function executableCodeMask(content) {
  const mask = new Uint8Array(content.length);
  mask.fill(1);
  let index = 0;
  while (index < content.length) {
    const current = content[index];
    const next = content[index + 1];
    if (current === '/' && next === '/') {
      const start = index;
      while (index < content.length && content[index] !== '\n' && content[index] !== '\r') index += 1;
      mask.fill(0, start, index);
      continue;
    }
    if (current === '/' && next === '*') {
      const start = index;
      index += 2;
      while (index < content.length && !(content[index] === '*' && content[index + 1] === '/')) index += 1;
      index = Math.min(content.length, index + 2);
      mask.fill(0, start, index);
      continue;
    }
    if (current === '\'' || current === '"' || current === '`') {
      const start = index;
      const quote = current;
      index += 1;
      while (index < content.length) {
        if (content[index] === '\\') { index += 2; continue; }
        if (content[index] === quote) { index += 1; break; }
        index += 1;
      }
      mask.fill(0, start, Math.min(content.length, index));
      continue;
    }
    index += 1;
  }
  return mask;
}

/** 收集 JavaScript 的静态、动态和 CommonJS 相对导入。 */
function localJavaScriptImports(content) {
  const imports = [];
  const pattern = /(?:\bimport\s*(?:[^'"();]*?\s+from\s*)?|\bexport\s+[^'"();]*?\s+from\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  const executable = executableCodeMask(content);
  for (const match of content.matchAll(pattern)) if (executable[match.index]) imports.push(match[1]);
  return imports;
}

/** 遍历 JSON Schema 中的本地 $ref，不把远程引用误判为安装缺失。 */
function jsonRefs(value, result = []) {
  if (!value || typeof value !== 'object') return result;
  if (typeof value.$ref === 'string') result.push(value.$ref);
  for (const child of Object.values(value)) jsonRefs(child, result);
  return result;
}

/** 验证坏链接确实来自同一源文件，并指向源仓库中同一个缺失目标。 */
function verifySourceIssue(row, reference, kind, sourceRoot, errors) {
  const issue = Array.isArray(row.sourceIssues) ? row.sourceIssues.find((entry) => entry?.kind === kind && entry.reference === reference) : null;
  if (!issue || typeof issue.target !== 'string' || typeof issue.reason !== 'string' || issue.reason.trim().length < 8) return null;
  const normalizedIssueTarget = issue.target.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalizedIssueTarget || normalizedIssueTarget.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  if (!sourceRoot) return { target: normalizedIssueTarget, reason: issue.reason.trim(), entry: issue, sourceVerified: false };
  const repoRoot = resolve(sourceRoot, `${row.stack}-skills`);
  const sourcePath = safeRelative(row.sourcePath, `${row.stack}.sourceIssues.sourcePath`, errors);
  if (!sourcePath) return null;
  const sourceFile = resolve(repoRoot, ...sourcePath.split('/'));
  if (!existsSync(sourceFile)) return null;
  let sourceReferences = [];
  try {
    const sourceContent = readFileSync(sourceFile, 'utf8');
    if (kind === 'module') sourceReferences = localJavaScriptImports(sourceContent);
    else sourceReferences = jsonRefs(JSON.parse(sourceContent));
  } catch { return null; }
  if (!sourceReferences.includes(reference)) return null;
  const relativeReference = reference.split('#')[0];
  const sourceTarget = resolve(dirname(sourceFile), relativeReference);
  const targetRelative = relative(repoRoot, sourceTarget).split(sep).join('/');
  const repoRelative = relative(repoRoot, sourceTarget);
  if (repoRelative === '..' || repoRelative.startsWith(`..${sep}`) || isAbsolute(repoRelative)) return null;
  if (targetRelative.toLowerCase() !== normalizedIssueTarget.toLowerCase()) return null;
  const targetExists = kind === 'module' ? Boolean(resolveModuleFile(sourceTarget)) : existsSync(sourceTarget);
  return targetExists ? null : { target: targetRelative, reason: issue.reason.trim(), entry: issue, sourceVerified: true };
}

/** 检查实际安装文件中专业工具的相对模块依赖与 JSON Schema 引用。 */
function validateProfessionalReferences(root, professionalDestinations, destinationRows, generatedDestinations, rowsByDestination, sourceRoot, warnings, errors) {
  const pending = [...professionalDestinations];
  const visited = new Set();
  while (pending.length) {
    const destination = pending.pop();
    const destinationKey = destination.toLowerCase();
    if (visited.has(destinationKey)) continue;
    visited.add(destinationKey);
    const file = resolve(root, ...destination.split('/'));
    const extension = destination.toLowerCase().split('.').at(-1);
    let references = [];
    try {
      const content = readFileSync(file, 'utf8');
      if (['mjs', 'js', 'cjs', 'mts', 'cts'].includes(extension)) references = localJavaScriptImports(content).map((value) => ({ kind: 'module', value }));
      else if (extension === 'json') references = jsonRefs(JSON.parse(content)).map((value) => ({ kind: 'json', value }));
    } catch (error) {
      if (extension === 'json') errors.push(`专业 JSON 无效：${destination} (${error.message})`);
      continue;
    }
    const usedIssues = new Set();
    for (const reference of references) {
      const value = reference.value.split('#')[0].split('?')[0];
      if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|data:|node:)/i.test(value)) continue;
      if (reference.kind === 'module' && !value.startsWith('./') && !value.startsWith('../')) continue;
      let decoded;
      try { decoded = decodeURIComponent(value); } catch { decoded = value; }
      const target = reference.kind === 'json' && decoded.startsWith('/')
        ? resolve(root, decoded.slice(1))
        : resolve(dirname(file), decoded);
      const rootRel = relative(resolve(root), target);
      if (rootRel === '..' || rootRel.startsWith(`..${sep}`) || isAbsolute(rootRel)) { errors.push(`专业工具引用越出安装包：${destination} → ${value}`); continue; }
      const resolved = reference.kind === 'module' ? resolveModuleFile(target) : existsSync(target) ? target : null;
      if (resolved) {
        const resolvedRelative = relative(resolve(root), resolved).split(sep).join('/');
        const resolvedRows = destinationRows.get(resolvedRelative.toLowerCase());
        if (!resolvedRows && !generatedDestinations.has(resolvedRelative.toLowerCase()) && !SHARED_RUNTIME_MODULES.has(resolvedRelative.toLowerCase())) {
          errors.push(`专业依赖目标未列入迁移或生成清单：${destination} → ${value} (${resolvedRelative})`);
          continue;
        }
        if (resolvedRows && resolvedRows.some((row) => !['copied', 'adapted'].includes(row.disposition))) {
          errors.push(`专业依赖目标文件不能标记为 source-only 或全局合并：${destination} → ${resolvedRelative}`);
          continue;
        }
        if (['mjs', 'js', 'cjs', 'mts', 'cts', 'json'].includes(resolvedRelative.toLowerCase().split('.').at(-1))) pending.push(resolvedRelative);
        continue;
      }
      const message = `专业工具本地引用不存在：${destination} → ${value}`;
      const kind = reference.kind === 'module' ? 'module' : 'json-ref';
      const sourceRows = rowsByDestination.get(destination) ?? [];
      const checked = sourceRows.map((row) => ({ row, issue: verifySourceIssue(row, reference.value, kind, sourceRoot, errors) })).find((entry) => entry.issue);
      if (checked) {
        usedIssues.add(checked.issue.entry);
        warnings.push(`${message}；${checked.issue.sourceVerified ? '已逐项核实源仓库原引用' : '离线依据清单中逐项登记的源引用'} ${reference.value} 指向缺失文件 ${checked.issue.target}，原因：${checked.issue.reason}`);
      } else errors.push(message);
    }
    for (const row of rowsByDestination.get(destination) ?? []) {
      for (const issue of row.sourceIssues ?? []) if (!usedIssues.has(issue)) errors.push(`sourceIssues 未对应当前实际缺失引用：${destination} → ${issue.reference ?? '引用缺失'}`);
    }
  }
}

/** 校验迁移器额外生成的依赖文件，允许闭包验证准确识别非源文件。 */
function validateGeneratedFiles(root, catalog, destinationRows, errors) {
  const generatedDestinations = new Set();
  if (catalog.generatedFiles === undefined) {
    errors.push('catalog.generatedFiles 必须登记原生手册及其他生成文件');
    return generatedDestinations;
  }
  if (!Array.isArray(catalog.generatedFiles)) {
    errors.push('catalog.generatedFiles 必须是数组');
    return generatedDestinations;
  }
  for (const entry of catalog.generatedFiles) {
    const destination = safeRelative(entry?.path, 'catalog.generatedFiles.path', errors);
    if (!destination) continue;
    const key = destination.toLowerCase();
    if (generatedDestinations.has(key)) errors.push(`catalog.generatedFiles 路径重复：${destination}`);
    const consolidatedNativePath = STACKS.some((stack) => nativeContractPath(stack).toLowerCase() === key);
    if (destinationRows.has(key) && !consolidatedNativePath) errors.push(`生成文件与源文件迁移目标冲突：${destination}`);
    generatedDestinations.add(key);
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 8) errors.push(`生成文件必须提供具体用途：${destination}`);
    if (!HASH_PATTERN.test(entry.destinationSha256 ?? '')) errors.push(`生成文件缺少有效 destinationSha256：${destination}`);
    const target = resolveInside(root, destination, 'catalog.generatedFiles.path', errors);
    if (!target || !existsSync(target) || !lstatSync(target).isFile()) errors.push(`生成文件不存在：${destination}`);
    else if (HASH_PATTERN.test(entry.destinationSha256 ?? '') && sha256(target).toLowerCase() !== entry.destinationSha256.toLowerCase()) errors.push(`生成文件摘要与实际文件不符：${destination}`);
  }

  return generatedDestinations;
}

/** 对迁移清单执行离线核验；传入 sourceRoot 时再逐项对比 Git tracked 文件。 */
export function validateMigration({ root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), sourceRoot = null, expectedSkillCounts = FORMAL_SKILL_COUNTS } = {}) {
  const errors = [];
  const warnings = [];
  const catalogFile = join(root, 'migration', 'catalog.json');
  if (!existsSync(catalogFile)) return { status: 'FAIL', errors: ['migration/catalog.json 不存在'], warnings, summary: { sourceInventoryVerified: Boolean(sourceRoot), files: 0, skills: 0 } };
  let catalog;
  try { catalog = JSON.parse(readFileSync(catalogFile, 'utf8')); }
  catch (error) { return { status: 'FAIL', errors: [`migration/catalog.json JSON 无效：${error.message}`], warnings, summary: { sourceInventoryVerified: Boolean(sourceRoot), files: 0, skills: 0 } }; }
  if (catalog.schemaVersion !== '1.0' || !catalog.stacks || Array.isArray(catalog.stacks)) errors.push('catalog.schemaVersion 或 stacks 格式无效');
  if (catalog.filesRef !== 'migration/files.json') errors.push('catalog.filesRef 必须指向仓库相对路径 migration/files.json');
  const records = catalog.stacks ?? {};
  for (const stack of STACKS) if (!records[stack]) errors.push(`缺少技术栈迁移记录：${stack}`);
  for (const stack of Object.keys(records)) if (!STACKS.includes(stack)) errors.push(`未知技术栈迁移记录：${stack}`);
  validateCapabilityCatalog(root, catalog, records, errors);
  const fileRows = readFileTable(root, catalog, errors);
  const nativeManuals = validateNativeManuals({ root, catalog, fileRows, errors });
  const sourceRows = new Map();
  const destinationRows = new Map();
  const rowsByDestination = new Map();
  const professionalSourceDirectories = new Map(STACKS.map((stack) => [stack, []]));
  const professionalDestinations = new Set();
  const professionalResourceFiles = new Set();
  const sourceRoots = new Map();
  const sourceTracked = new Map();
  const declaredToolDestinations = new Set();
  const fileDispositionAliases = new Map([['preserved', 'copied'], ['copy', 'copied'], ['transformed', 'adapted'], ['removed', 'source-only']]);

  for (const stack of STACKS) {
    const record = records[stack];
    if (!record) continue;
    if (record.sourceSkillCount !== expectedSkillCounts[stack]) errors.push(`${stack}.sourceSkillCount 应为 ${expectedSkillCounts[stack]}，实际为 ${record.sourceSkillCount}`);
    if (!Array.isArray(record.skills)) errors.push(`${stack}.skills 必须是技能入口数组`);
    if (typeof record.sourceRepository !== 'string' || !record.sourceRepository.trim()) errors.push(`${stack}.sourceRepository 缺失`);
    if (typeof record.sourceRevision !== 'string' || !record.sourceRevision.trim()) errors.push(`${stack}.sourceRevision 缺失`);
    if (!Array.isArray(record.resourceDirectories) || !Array.isArray(record.tools ?? [])) errors.push(`${stack} 资源目录或工具清单格式无效`);
    const skillRows = Array.isArray(record.skills) ? record.skills : [];
    const formalSkillRows = skillRows.filter((skill) => skill?.skillKind !== 'nested-template' && !(typeof skill?.sourcePath === 'string' && skill.sourcePath.replaceAll('\\', '/') === FLUTTER_NESTED_TEMPLATE));
    const nestedTemplateRows = skillRows.filter((skill) => skill?.skillKind === 'nested-template' || (typeof skill?.sourcePath === 'string' && skill.sourcePath.replaceAll('\\', '/') === FLUTTER_NESTED_TEMPLATE));
    if (formalSkillRows.length !== expectedSkillCounts[stack]) errors.push(`${stack}.skills 必须逐项包含 ${expectedSkillCounts[stack]} 个正式入口，nested-template 不计入口数`);
    const skillNames = new Set();
    const sourceSkillPaths = new Set();
    const expectedMerged = MERGED_SKILLS[stack];

    for (const skill of formalSkillRows) {
      if (!skill || typeof skill !== 'object') { errors.push(`${stack}.skills 含无效记录`); continue; }
      const name = skill.name;
      const sourcePath = safeRelative(skill.sourcePath, `${stack}.${name ?? 'skill'}.sourcePath`, errors);
      if (typeof name !== 'string' || !name) { errors.push(`${stack} 技能缺少 name`); continue; }
      if (typeof skill.reason !== 'string' || !skill.reason.trim() || SOURCE_ONLY_REASONS.has(skill.reason.trim().toLowerCase())) errors.push(`${stack}/${name} 技能迁移需要具体 reason`);
      if (skillNames.has(name)) errors.push(`${stack} 技能入口重复：${name}`);
      skillNames.add(name);
      if (!sourcePath || !sourcePath.endsWith('/SKILL.md') && sourcePath !== 'SKILL.md') errors.push(`${stack}/${name} sourcePath 必须指向正式 SKILL.md`);
      else {
        if (sourceSkillPaths.has(sourcePath.toLowerCase())) errors.push(`${stack} 技能源入口重复：${sourcePath}`);
        sourceSkillPaths.add(sourcePath.toLowerCase());
        if (basename(dirname(sourcePath)) !== name) errors.push(`${stack}/${name} 的 sourcePath 目录名不一致：${sourcePath}`);
      }
      if (skill.disposition === 'merged' && skill.skillKind === 'capability-adapter') {
        const capability = capabilityForSourceSkill(stack, name);
        if (!capability) errors.push(`${stack}/${name} 不在 capability-map 原生适配映射中`);
        else {
          const publicFile = `skills/${capability.name}/SKILL.md`;
          const adapterFile = nativeContractPath(stack);
          const adapterSection = capabilityAdapters(capability).find((adapter) => adapter.sourceSkill === name)?.section;
          if (skill.capability !== capability.name) errors.push(`${stack}/${name} capability 与 capability-map 不符`);
          if (skill.destination?.replaceAll('\\', '/') !== publicFile) errors.push(`${stack}/${name} 必须路由到公共能力 ${publicFile}`);
          if (skill.adapterDestination?.replaceAll('\\', '/') !== adapterFile || skill.adapterSection !== adapterSection) errors.push(`${stack}/${name} adapterDestination/adapterSection 必须指向 ${adapterFile}#${adapterSection}`);
          const adapter = resolveInside(root, adapterFile, `${stack}/${name}.adapterDestination`, errors);
          if (!adapter || !existsSync(adapter) || !lstatSync(adapter).isFile()) errors.push(`${stack}/${name} 原生手册缺失：${adapterFile}`);
          const publicSkill = resolveInside(root, publicFile, `${stack}/${name}.destination`, errors);
          if (!publicSkill || !existsSync(publicSkill) || skillFrontmatterName(publicSkill) !== capability.name) errors.push(`${stack}/${name} 公共能力 SKILL.md 缺失或身份错误：${publicFile}`);
          professionalDestinations.add(adapterFile);
          const alias = join(root, 'skills', name, 'SKILL.md');
          if (existsSync(alias)) errors.push(`${stack}/${name} 留有重复的顶层 SKILL.md 入口：skills/${name}/SKILL.md`);
        }
      } else if (skill.disposition === 'merged') {
        const expected = expectedMerged[name];
        if (!expected) errors.push(`${stack}/${name} 不在约定的公共合并入口中`);
        if (skillDestinationName(skill.destination) !== expected) errors.push(`${stack}/${name} 应指向公共技能 ${expected}，实际为 ${skill.destination}`);
        if (typeof skill.reason !== 'string' || !skill.reason.trim() || SOURCE_ONLY_REASONS.has(skill.reason.trim().toLowerCase())) errors.push(`${stack}/${name} 合并理由必须具体说明合并去向和保留/吸收内容`);
        const commonFile = resolveInside(root, skillFileDestination(skill.destination), `${stack}/${name}.destination`, errors);
        if (!commonFile || !existsSync(commonFile)) errors.push(`${stack}/${name} 指向的公共入口不存在：${skill.destination}`);
        else if (skillFrontmatterName(commonFile) !== expected) errors.push(`${stack}/${name} 公共目标 SKILL.md 身份错误，应为 ${expected}`);
      } else errors.push(`${stack}/${name} disposition/skillKind 必须是公共 merged 或 capability-adapter`);
    }

    for (const skill of nestedTemplateRows) {
      const sourcePath = safeRelative(skill?.sourcePath, `${stack}.nested-template.sourcePath`, errors);
      if (stack !== 'flutter' || sourcePath !== FLUTTER_NESTED_TEMPLATE || skill?.name !== 'flutter-dev') errors.push(`${stack} nested-template 只能是 Flutter flutter-dev 模板：${sourcePath}`);
      if (skill?.disposition !== 'preserved') errors.push(`${stack} nested Flutter 模板必须保留原内容`);
      const targetPath = skillFileDestination(skill?.destination);
      const target = resolveInside(root, targetPath, `${stack}.nested-template.destination`, errors);
      if (!target || !existsSync(target)) errors.push(`${stack} nested Flutter 模板目标缺失：${targetPath}`);
      else if (skillFrontmatterName(target) !== 'flutter-dev') errors.push(`${stack} nested Flutter 模板 frontmatter name 必须为 flutter-dev`);
    }

    for (const name of Object.keys(expectedMerged)) if (!skillNames.has(name)) errors.push(`${stack} 缺少必须合并的公共入口：${name}`);
    const expectedNativeNames = CAPABILITY_GROUPS.flatMap((group) => group.members[stack] ?? []);
    const actualNativeNames = formalSkillRows.filter((skill) => skill?.skillKind === 'capability-adapter').map((skill) => skill?.name);
    if (new Set(actualNativeNames).size !== actualNativeNames.length || JSON.stringify([...actualNativeNames].sort()) !== JSON.stringify([...expectedNativeNames].sort())) errors.push(`${stack} capability-adapter 技能行必须逐项匹配 capability-map 且不得重复`);
    const resourceDirectories = Array.isArray(record.resourceDirectories) ? record.resourceDirectories : [];
    if (new Set(resourceDirectories).size !== resourceDirectories.length) errors.push(`${stack}.resourceDirectories 存在重复目录`);
    for (const directory of resourceDirectories) {
      const safe = safeRelative(directory, `${stack}.resourceDirectories`, errors);
      if (!safe || safe.includes('/')) errors.push(`${stack} resourceDirectories 只能声明 skills/ 下的顶层目录名：${directory}`);
      else {
        const resourcePath = join(root, 'skills', safe);
        if (!existsSync(resourcePath) || !lstatSync(resourcePath).isDirectory()) errors.push(`${stack} 资源目录不存在：skills/${safe}`);
        else if (readdirSync(resourcePath).length === 0) errors.push(`${stack} 资源目录为空：skills/${safe}`);
        else collectResourceFiles(root, `skills/${safe}`, professionalResourceFiles, errors);
      }
    }
    for (const tool of Array.isArray(record.tools) ? record.tools : []) {
      if (tool?.path === null && tool.disposition === 'source-only') {
        const replacement = safeRelative(tool.replacement, `${stack}.tools.replacement`, errors);
        if (typeof tool.reason !== 'string' || !tool.reason.trim() || !replacement) errors.push(`${stack} 退役专业工具必须提供 source-only 理由和 replacement：${tool?.name ?? '未命名工具'}`);
        else {
          const replacementFile = resolveInside(root, replacement, `${stack}.tools.replacement`, errors);
          if (!replacementFile || !existsSync(replacementFile) || !lstatSync(replacementFile).isFile()) errors.push(`${stack} 退役工具替代目标不存在：${replacement}`);
        }
        continue;
      }
      if (typeof tool?.path !== 'string' || !tool.path.trim()) { errors.push(`${stack} 有效专业工具必须提供 path：${tool?.name ?? '未命名工具'}`); continue; }
      const path = safeRelative(tool?.path, `${stack}.tools.path`, errors);
      if (!path) continue;
      const actual = resolveInside(root, path, `${stack}.tools.path`, errors);
      if (!actual || !existsSync(actual) || !lstatSync(actual).isFile()) errors.push(`${stack} 专业工具不存在：${tool.path}`);
      else {
        const destination = relative(root, actual).split(sep).join('/');
        declaredToolDestinations.add(destination);
        if (tool.disposition !== 'merged') professionalDestinations.add(destination);
      }
    }

    if (sourceRoot) {
      const repoRoot = resolve(sourceRoot, `${stack}-skills`);
      sourceRoots.set(stack, repoRoot);
      const files = trackedFiles(repoRoot, stack, errors);
      if (files) sourceTracked.set(stack, new Set(files));
      if (files) {
        const formalSourceEntries = files.filter((path) => path.endsWith('/SKILL.md') || path === 'SKILL.md')
          .filter((path) => !(stack === 'flutter' && path === FLUTTER_NESTED_TEMPLATE));
        const actualPaths = new Set(formalSourceEntries.map((path) => path.toLowerCase()));
        for (const path of actualPaths) if (!sourceSkillPaths.has(path)) errors.push(`${stack} 源仓库正式入口未列入 skills 清单：${path}`);
        for (const path of sourceSkillPaths) if (!actualPaths.has(path)) errors.push(`${stack} skills 清单入口未在源仓库 tracked：${path}`);
        for (const skill of formalSkillRows.filter((entry) => ['preserved', 'capability-adapter'].includes(entry?.skillKind) && typeof entry.sourcePath === 'string')) {
          const sourcePath = resolve(repoRoot, ...skill.sourcePath.replaceAll('\\', '/').split('/'));
          if (existsSync(sourcePath) && skillFrontmatterName(sourcePath) !== skill.name) errors.push(`${stack}/${skill.name} 源 SKILL.md 身份与源技能名不一致`);
        }
      }
    }
  }

  if (sourceRoot && sourceRoots.has('flutter')) {
    const nested = sourceTracked.get('flutter')?.has(FLUTTER_NESTED_TEMPLATE);
    if (!nested) errors.push(`Flutter nested 模板未在源仓库 tracked：${FLUTTER_NESTED_TEMPLATE}`);
  }

  for (const row of fileRows) {
    if (!row || typeof row !== 'object' || !STACKS.includes(row.stack)) { errors.push(`文件清单含无效或未知技术栈记录：${row?.stack}`); continue; }
    const stack = row.stack;
    const sourcePath = safeRelative(row.sourcePath, `${stack}.files.sourcePath`, errors);
    if (!sourcePath) continue;
    const key = `${stack}:${sourcePath.toLowerCase()}`;
    if (sourceRows.has(key)) errors.push(`源文件重复登记：${stack}/${sourcePath}`);
    sourceRows.set(key, row);
    const disposition = fileDispositionAliases.get(row.disposition) ?? row.disposition;
    const reason = typeof row.reason === 'string' ? row.reason.trim() : '';
    if (!['copied', 'adapted', 'merged', 'source-only', 'test-replaced'].includes(disposition)) errors.push(`${stack}/${sourcePath} 文件 disposition 无效：${row.disposition}`);
    if (!reason || SOURCE_ONLY_REASONS.has(reason.toLowerCase())) errors.push(`${stack}/${sourcePath} ${disposition} 必须提供具体 reason`);
    if (['merged', 'test-replaced'].includes(disposition) && (!Array.isArray(row.transforms) || row.transforms.length === 0)) errors.push(`${stack}/${sourcePath} ${disposition} 必须记录具体整合或替代说明`);
    if (row.sourceIssues !== undefined && (!Array.isArray(row.sourceIssues) || row.sourceIssues.some((issue) => !issue || !['module', 'json-ref'].includes(issue.kind) || typeof issue.reference !== 'string' || typeof issue.target !== 'string' || typeof issue.reason !== 'string'))) errors.push(`${stack}/${sourcePath} sourceIssues 必须逐项提供 kind、原 reference、源 target 和 reason`);
    if (!HASH_PATTERN.test(row.sourceSha256 ?? '')) errors.push(`${stack}/${sourcePath} 缺少有效 sourceSha256`);
    const destination = row.destination === null ? null : safeRelative(row.destination, `${stack}/${sourcePath}.destination`, errors);
    const capabilityRef = row.capabilityRef === undefined ? null : safeRelative(row.capabilityRef, `${stack}/${sourcePath}.capabilityRef`, errors);
    if (capabilityRef) {
      const capabilityFile = resolveInside(root, capabilityRef, `${stack}/${sourcePath}.capabilityRef`, errors);
      if (!capabilityFile || !existsSync(capabilityFile) || !capabilityRef.endsWith('/SKILL.md')) errors.push(`${stack}/${sourcePath} capabilityRef 必须指向存在的公共 SKILL.md：${capabilityRef}`);
    }
    const replacement = row.replacement === undefined ? null : safeRelative(row.replacement, `${stack}/${sourcePath}.replacement`, errors);
    const pluralReplacements = row.replacements === undefined ? [] : Array.isArray(row.replacements) ? row.replacements : null;
    if (pluralReplacements === null) errors.push(`${stack}/${sourcePath} replacements 必须是路径数组`);
    const allReplacements = [...new Set([replacement, ...(pluralReplacements ?? []).map((path) => safeRelative(path, `${stack}/${sourcePath}.replacements`, errors))].filter(Boolean))];
    if (row.destination !== null && !destination) continue;
    if (destination && disposition === 'source-only') errors.push(`${stack}/${sourcePath} source-only 记录不能有 destination`);
    if (!destination && !['source-only', 'merged', 'test-replaced'].includes(disposition)) errors.push(`${stack}/${sourcePath} ${disposition} 缺少 destination`);
    if (['merged', 'test-replaced'].includes(disposition) && !destination && !replacement) errors.push(`${stack}/${sourcePath} ${disposition} 没有 destination 时必须明确 replacement`);
    for (const replacementPath of allReplacements) {
      const replacementFile = resolveInside(root, replacementPath, `${stack}/${sourcePath}.replacement`, errors);
      if (!replacementFile || !existsSync(replacementFile) || !lstatSync(replacementFile).isFile()) errors.push(`${stack}/${sourcePath} 替代目标不存在：${replacementPath}`);
    }
    if (disposition === 'test-replaced' && !allReplacements.length) errors.push(`${stack}/${sourcePath} test-replaced 必须列出具体替代测试路径`);
    if (destination) {
      if (!HASH_PATTERN.test(row.destinationSha256 ?? '')) errors.push(`${stack}/${sourcePath} 缺少有效 destinationSha256`);
      if (disposition === 'adapted' && (!Array.isArray(row.transforms) || row.transforms.length === 0)) errors.push(`${stack}/${sourcePath} adapted 必须列出 transforms`);
      const target = resolveInside(root, destination, `${stack}/${sourcePath}.destination`, errors);
      if (!target || !existsSync(target) || !lstatSync(target).isFile()) errors.push(`${stack}/${sourcePath} 目标文件不存在：${destination}`);
      else if (HASH_PATTERN.test(row.destinationSha256 ?? '') && sha256(target).toLowerCase() !== row.destinationSha256.toLowerCase()) errors.push(`${stack}/${destination} destinationSha256 与实际文件不符`);
      const destinationKey = destination.toLowerCase();
      if (!destinationRows.has(destinationKey)) destinationRows.set(destinationKey, []);
      destinationRows.get(destinationKey).push({ ...row, disposition });
      if (!rowsByDestination.has(destination)) rowsByDestination.set(destination, []);
      rowsByDestination.get(destination).push(row);
      if (professionalSourceDirectories.get(stack)?.some((directory) => sourcePath === directory || sourcePath.startsWith(`${directory}/`))) {
        if (!['copied', 'adapted'].includes(disposition)) errors.push(`${stack}/${sourcePath} 专业文件必须完整复制或适配，不能 ${disposition}`);
        professionalDestinations.add(destination);
        if (disposition === 'adapted' && (!Array.isArray(row.transforms) || row.transforms.length === 0)) errors.push(`${stack}/${sourcePath} 专业文件适配需记录 transforms`);
      }
      const resourceName = /^skills\/([^/]+)\//.exec(destination)?.[1];
      if (resourceName && records[stack]?.resourceDirectories?.includes(resourceName)) {
        if (!['copied', 'adapted'].includes(disposition)) errors.push(`${stack}/${sourcePath} 原生资源文件必须逐项复制或适配：${destination}`);
        professionalDestinations.add(destination);
      }
      if (pathIsOldWorkflowCli(sourcePath, stack, records) && !destination.startsWith('skills/app-workflow-control/')) {
        const unityNativeValidator = stack === 'unity'
          && destination === 'skills/unity-domain-contracts/scripts/unity-contract-validation.mjs'
          && records[stack]?.tools?.some((tool) => tool?.path === destination);
        if (!unityNativeValidator) errors.push(`旧全局 CLI 未合入唯一公共控制面，可能形成第二控制器：${stack}/${sourcePath} → ${destination}`);
      }
    } else if (professionalSourceDirectories.get(stack)?.some((directory) => sourcePath === directory || sourcePath.startsWith(`${directory}/`))) {
      errors.push(`${stack}/${sourcePath} 专业文件不能仅 source-only 或 test-replaced`);
    }
    if (pathIsOldWorkflowCli(sourcePath, stack, records) && replacement && !replacement.startsWith('skills/app-workflow-control/')) errors.push(`旧全局 CLI 替代目标必须落入唯一公共控制面：${replacement}`);
    if (sourceRoot && sourceRoots.has(stack)) {
      const tracked = sourceTracked.get(stack);
      const source = resolve(sourceRoots.get(stack), ...sourcePath.split('/'));
      if (tracked && !tracked.has(sourcePath)) errors.push(`${stack}/${sourcePath} 不在源 Git tracked 清单中`);
      if (tracked?.has(sourcePath) && existsSync(source)) {
        const actualHash = sha256(source);
        if (actualHash.toLowerCase() !== String(row.sourceSha256).toLowerCase()) errors.push(`${stack}/${sourcePath} sourceSha256 与源文件不符`);
        if (destination) {
          const target = resolve(root, ...destination.split('/'));
          if (existsSync(target) && actualHash !== sha256(target) && (!Array.isArray(row.transforms) || row.transforms.length === 0)) errors.push(`${stack}/${sourcePath} 源目标内容不同但没有 transforms`);
        }
      }
    }
  }

  for (const [destination, rows] of destinationRows) {
    const dispositions = new Set(rows.map((row) => row.disposition));
    const isNativeManual = [...nativeManuals.manuals.values()].some((manual) => manual.path.toLowerCase() === destination.toLowerCase());
    if (rows.length > 1 && !isNativeManual && (dispositions.size !== 1 || !['merged', 'test-replaced'].includes([...dispositions][0]))) errors.push(`多个源文件覆盖同一目标且未全部声明为同类整合/测试替代：${destination}`);
    if (rows.length > 1 && !isNativeManual && rows.some((row) => !row.reason || SOURCE_ONLY_REASONS.has(row.reason.trim().toLowerCase()))) errors.push(`多个源文件合并到同一目标时必须逐项说明合并理由：${destination}`);
  }

  for (const destination of declaredToolDestinations) if (!destinationRows.has(destination.toLowerCase())) errors.push(`专业工具没有对应的源文件迁移记录：${destination}`);

  for (const stack of STACKS) {
    const record = records[stack];
    if (!record) continue;
    for (const skill of Array.isArray(record.skills) ? record.skills : []) {
      const sourcePath = skill.sourcePath?.replaceAll('\\', '/');
      const row = sourceRows.get(`${stack}:${sourcePath?.toLowerCase()}`);
      if (!row) errors.push(`${stack}/${skill.name} 的 SKILL.md 未在文件清单登记：${sourcePath}`);
      else {
        if (skill.disposition === 'merged' && skill.skillKind === 'capability-adapter') {
          const publicEntry = skillFileDestination(skill.destination);
          const adapterPath = skill.adapterDestination?.replaceAll('\\', '/');
          if (row.disposition !== 'adapted' || row.destination?.replaceAll('\\', '/') !== adapterPath) errors.push(`${stack}/${skill.name} 源 SKILL.md 必须适配为 ${adapterPath}`);
          if (row.capabilityRef?.replaceAll('\\', '/') !== publicEntry) errors.push(`${stack}/${skill.name} 文件账本 capabilityRef 必须指向公共入口 ${publicEntry}`);
          if (!Array.isArray(row.transforms) || row.transforms.length === 0) errors.push(`${stack}/${skill.name} 原生适配转换需记录保留原生能力及接入公共路由的方式`);
        } else if (skill.disposition === 'merged') {
          const publicEntry = skillFileDestination(skill.destination);
          const archive = row.destination?.replaceAll('\\', '/');
          if (row.disposition !== 'adapted' || !archive || archive.toLowerCase() === publicEntry.toLowerCase() || !archive.includes('/references/')) {
            errors.push(`${stack}/${skill.name} 原始 SKILL.md 必须完整归档到技术 references 并标记 adapted`);
          }
          if (row.replacement?.replaceAll('\\', '/').toLowerCase() !== publicEntry.toLowerCase()) errors.push(`${stack}/${skill.name} 技术档案必须链接到公共入口 ${publicEntry}`);
          if (!Array.isArray(row.transforms) || row.transforms.length === 0) errors.push(`${stack}/${skill.name} 技术档案需记录正文保留与链接改写方式`);
        } else if (row.destination && skillDestinationName(row.destination) !== skill.name) {
          errors.push(`${stack}/${skill.name} 文件级目标与技能级目标不一致：${row.destination}`);
        }
      }
    }
    if (stack === 'flutter') {
      const templateRow = sourceRows.get(`flutter:${FLUTTER_NESTED_TEMPLATE.toLowerCase()}`);
      if (!templateRow || !templateRow.destination) errors.push(`Flutter nested flutter-dev 模板必须完整交付：${FLUTTER_NESTED_TEMPLATE}`);
    }
  }

  if (sourceRoot) {
    for (const stack of STACKS) {
      const tracked = sourceTracked.get(stack);
      if (!tracked) continue;
      for (const path of tracked) if (!sourceRows.has(`${stack}:${path.toLowerCase()}`)) errors.push(`${stack} 源 tracked 文件未迁移登记：${path}`);
      const trackedLower = new Set([...tracked].map((path) => path.toLowerCase()));
      for (const key of sourceRows.keys()) if (key.startsWith(`${stack}:`) && !trackedLower.has(key.slice(stack.length + 1))) errors.push(`${stack} 文件清单源路径不在 Git tracked 清单中：${key.slice(stack.length + 1)}`);
      for (const directory of professionalSourceDirectories.get(stack) ?? []) {
        for (const sourcePath of tracked) {
          if (!sourcePath.startsWith(`${directory}/`)) continue;
          const row = sourceRows.get(`${stack}:${sourcePath.toLowerCase()}`);
          if (!row || row.destination === null || !['copied', 'preserved', 'copy', 'adapted', 'transformed'].includes(row.disposition)) errors.push(`${stack}/${sourcePath} 专业文件未逐项交付`);
        }
      }
    }
  } else {
    warnings.push('离线模式未比对源仓库 Git tracked 文件；只能校验清单内部一致性与已列文件，完整源覆盖需使用 --source-root。');
  }

  const generatedDestinations = validateGeneratedFiles(root, catalog, destinationRows, errors);
  for (const destination of professionalResourceFiles) {
    if (!destinationRows.has(destination.toLowerCase()) && !generatedDestinations.has(destination.toLowerCase())) errors.push(`原生资源文件未登记于迁移或生成清单：${destination}`);
    professionalDestinations.add(destination);
  }
  validateProfessionalReferences(root, professionalDestinations, destinationRows, generatedDestinations, rowsByDestination, sourceRoot, warnings, errors);
  const shared = validateSharedCapabilities({ root, catalog, fileRows, sourceRoot, resolveFile: (path, label) => resolveInside(root, path, label, errors), errors });
  return {
    status: errors.length ? 'FAIL' : 'PASS', errors, warnings,
    summary: {
      sourceInventoryVerified: Boolean(sourceRoot), files: fileRows.length,
      skills: STACKS.reduce((sum, stack) => sum + (Array.isArray(records[stack]?.skills) ? records[stack].skills.filter((skill) => skill?.skillKind !== 'nested-template' && !(typeof skill?.sourcePath === 'string' && skill.sourcePath.replaceAll('\\', '/') === FLUTTER_NESTED_TEMPLATE)).length : 0), 0),
      nestedTemplates: STACKS.reduce((sum, stack) => sum + (Array.isArray(records[stack]?.skills) ? records[stack].skills.filter((skill) => skill?.skillKind === 'nested-template' || (typeof skill?.sourcePath === 'string' && skill.sourcePath.replaceAll('\\', '/') === FLUTTER_NESTED_TEMPLATE)).length : 0), 0),
      professionalTools: professionalDestinations.size,
      shared,
    },
  };
}

/** 仅把工作流控制技能中的旧全局 CLI 视为重复控制器。 */
function pathIsOldWorkflowCli(sourcePath, stack, records) {
  if (basename(sourcePath).toLowerCase() !== 'workflow-control.mjs') return false;
  const controlSkill = Object.keys(MERGED_SKILLS[stack] ?? {}).find((name) => name.endsWith('workflow-control'));
  const sourceDirectory = records[stack]?.skills?.find((skill) => skill.name === controlSkill)?.sourcePath?.replaceAll('\\', '/').replace(/\/SKILL\.md$/, '');
  return Boolean(sourceDirectory && (sourcePath === `${sourceDirectory}/workflow-control.mjs` || sourcePath.startsWith(`${sourceDirectory}/`)));
}

/** 解析最小 CLI 参数，允许指定源码仓库父目录以执行完整覆盖比对。 */
function parseArgs(argv) {
  const options = { root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), sourceRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source-root' && argv[index + 1]) options.sourceRoot = resolve(argv[++index]);
    else if (argv[index] === '--root' && argv[index + 1]) options.root = resolve(argv[++index]);
    else if (argv[index] === '--help' || argv[index] === '-h') options.help = true;
    else throw new Error(`未知或缺少参数值：${argv[index]}`);
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log('node scripts/verify-migration.mjs [--root <分发仓库>] [--source-root <源仓库父目录>]');
    else {
      const result = validateMigration(options);
      console.log(JSON.stringify(result, null, 2));
      if (result.errors.length) process.exitCode = 1;
    }
  } catch (error) { console.error(JSON.stringify({ status: 'FAIL', errors: [error.message] }, null, 2)); process.exitCode = 1; }
}
