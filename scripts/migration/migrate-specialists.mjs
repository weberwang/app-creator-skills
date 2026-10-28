#!/usr/bin/env node
/** 按 Git 跟踪清单，将五个源仓库的专业技能与资源可复现地迁入当前仓库。 */
import { createHash } from 'node:crypto';
import { isStarterRuntime, planCommonJsScopes } from './module-scopes.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { readFileSync, writeFileSync } from './file-io.mjs';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractUnityDomainValidation } from './unity-domain-extraction.mjs';
import { adaptProjectInitializer } from './project-initializer-adapter.mjs';
import { adaptImageFrameSourceTest, adaptUnityInstallerTest, adaptUnitySourceTest, routeControlCommands, skipLegacyControllerCliTests } from './source-test-adapter.mjs';
import { adaptFlutterValidator } from './flutter-validator-adapter.mjs';
import { adaptFlutterVisualReview } from './flutter-visual-review-adapter.mjs';
import { assertNoDestinationLinks, AUTHORED_CONTROL_RESOURCES, GENERATED_DOMAIN_RESOURCES, removeStaleGeneratedFiles } from './output-cleanup.mjs';
import { applyNativeManualResources } from './native-manuals.mjs';
import { mapSourceFile, PUBLIC_SKILLS, RUNTIME_MODULES, STACK_POLICIES } from './source-policy.mjs';
import { applySharedCapabilities, buildDirectSharedCapabilities, buildSharedFrameAtlasCapability, buildSharedFrameSourceCapability, buildSharedProjectInitCapability, buildSharedTransparencyContractCapability, buildSharedUiAlignmentCapability, buildSharedVideoAtlasCapability, buildSharedVisualCapabilities, buildSharedVisualNormalizationCapability, buildSharedWorkflowCapabilities, prepareReferenceRedirects, referenceRedirectHash } from './shared-modules.mjs';
import { buildSharedCliPlan } from './shared-cli-modules.mjs';
import { applySharedWorkflowDocument as applySharedWorkflowSections, buildCompleteSharedWorkflowPlan as buildSharedWorkflowPlan } from './shared-workflows.mjs';
import { writeMigrationCatalog } from './migration-catalog.mjs';
import { parseMigrationArguments } from './migration-arguments.mjs';
import { buildSharedProjectTemplatePlan } from './shared-project-templates.mjs';
import { applyProfessionalRouting } from './professional-routing.mjs';
import { assertTransformablePlans } from './transform-preflight.mjs';
import { routeCliEntry } from './cli-entry-routing.mjs';
import { routeCapabilityPlan, routeCapabilityText } from './capability-entry-routing.mjs';
import { validateAuthoredAssetReuse } from './authored-asset-reuse.mjs';
import { adaptRelativeLayoutContracts } from './relative-layout-contract-adapter.mjs';
import { adaptOptionalReviewArtifacts } from './optional-review-adapter.mjs';
import { adaptProjectLocales, assertProjectLocaleAdaptablePlans } from './project-locale-adapter.mjs';
import { adaptUnifiedStages, adaptUnifiedSharedCapabilities, assertUnifiedStageAdaptablePlans, loadUnifiedStagePatches } from './unified-stage-adapter.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '../..');
const SOURCE_ROOT = resolve(REPOSITORY_ROOT, '..');
const STACK_NAMES = Object.keys(STACK_POLICIES);
const UTF8_TEXT_EXTENSIONS = new Set(['.cjs', '.css', '.csv', '.html', '.js', '.json', '.md', '.mjs', '.scss', '.ts', '.tsx', '.txt', '.yaml', '.yml', '.xml']);
const PROJECT_PATH_ROOTS = new Set(['Assets', 'Artifacts', 'Packages', 'ProjectSettings', 'assets', 'build', 'coverage', 'docs', 'evidence', 'public', 'src', 'tests']);
/** 执行 Git 子命令并保留二进制输出，NUL 路径因此不会被转义或按行截断。 */
function runGit(repository, args) {
  try {
    return execFileSync('git', ['-C', repository, ...args], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const detail = error.stderr ? error.stderr.toString('utf8').trim() : error.message;
    throw new Error(`读取源仓库 Git 清单失败：${repository} (${detail})`);
  }
}

/** 从 NUL 分隔的原始路径清单提取 UTF-8 路径，避免引号/八进制转义误判文件存在性。 */
function listTrackedFiles(repository) {
  return runGit(repository, ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
}

/** 计算文件内容摘要，摘要只用于审计迁移是否逐字保留。 */
function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** 将 POSIX 源路径安全解析到源仓库，拒绝绝对路径和目录上跳。 */
function resolveSource(repository, sourcePath) {
  if (isAbsolute(sourcePath) || sourcePath.split('/').some((part) => part === '..')) throw new Error(`不安全的 Git 路径：${sourcePath}`);
  return resolve(repository, ...sourcePath.split('/'));
}

/** 判断正式根入口和嵌套模板，根入口按仓库约定必须只有一层目录。 */
function discoverSkills(stack, sourceFiles) {
  const policy = STACK_POLICIES[stack];
  const rootPrefix = policy.skillPrefix;
  const rootSkills = [];
  const nestedSkills = [];
  for (const sourcePath of sourceFiles) {
    if (!sourcePath.endsWith('/SKILL.md') && sourcePath !== 'SKILL.md') continue;
    const relativePath = rootPrefix && sourcePath.startsWith(rootPrefix) ? sourcePath.slice(rootPrefix.length) : sourcePath;
    const parts = relativePath.split('/');
    if (parts.length === 2 && parts[1] === 'SKILL.md') rootSkills.push({ name: parts[0], sourcePath });
    else nestedSkills.push({ name: parts.at(-2), sourcePath });
  }
  rootSkills.sort((a, b) => a.name.localeCompare(b.name));
  nestedSkills.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  if (rootSkills.length !== policy.expectedRootSkillCount) {
    throw new Error(`${stack}: 根技能入口数量为 ${rootSkills.length}，期望 ${policy.expectedRootSkillCount}；请检查源仓库提交和入口目录定义。`);
  }
  for (const required of [policy.orchestrator, policy.grilling, ...(policy.control ? [policy.control] : [])]) {
    if (!rootSkills.some((skill) => skill.name === required)) throw new Error(`${stack}: 缺少策略要求的正式技能入口 ${required}`);
  }
  return { rootSkills, nestedSkills, rootSkillNames: new Set(rootSkills.map((skill) => skill.name)) };
}

/** 生成一个源路径的迁移条目，所有未承接项也必须给出明确处置理由。 */
function planFile(stack, sourcePath, rootSkills, toolPaths) {
  const plan = mapSourceFile(stack, sourcePath, rootSkills);
  if (plan.disposition === 'test-replaced' && !/(?:替代|replaced)/i.test(plan.reason)) {
    const replacements = [...new Set([plan.replacement, ...(plan.replacements ?? [])].filter(Boolean))];
    return { ...plan, reason: `${plan.reason}；回归由 ${replacements.join('、') || '目标公共与领域测试'} 替代。` };
  }
  if (toolPaths.has(sourcePath) && plan.disposition === 'source-only') {
    if (!sourcePath.startsWith('scripts/install') && !sourcePath.startsWith('bin/install')) {
      return { destination: `skills/${stack}-domain-contracts/tools/${sourcePath}`, disposition: 'copied', reason: '由源包专业工具入口引用，递归保留其实现与静态依赖。', transforms: ['preserve-package-bin-tool'] };
    }
    return { ...plan, destination: null, replacement: 'scripts/install-project-skills.mjs', reason: '源包安装器由目标统一安装器替代。' };
  }
  return plan;
}

/** 解析 package.json 的命令映射，不把旧安装器作为目标包命令迁移。 */
function packageBins(repository, sourceFiles) {
  const tracked = new Set(sourceFiles);
  const packages = sourceFiles.filter((file) => file === 'package.json' || file.endsWith('/package.json'));
  const bins = [];
  for (const packagePath of packages) {
    let contents;
    try { contents = JSON.parse(readFileSync(resolveSource(repository, packagePath), 'utf8')); }
    catch { continue; }
    const values = typeof contents.bin === 'string'
      ? [[contents.name ?? packagePath, contents.bin]]
      : Object.entries(contents.bin ?? {});
    const packageDirectory = packagePath === 'package.json' ? '' : dirname(packagePath).replaceAll('\\', '/');
    for (const [name, relativeEntry] of values) {
      const sourcePath = posix.normalize(posix.join(packageDirectory, relativeEntry.replaceAll('\\', '/').replace(/^\.\//, '')));
      bins.push({ name, sourcePath, tracked: tracked.has(sourcePath), packagePath });
    }
  }
  return bins;
}

/** 解析静态相对模块引用；包名、内建模块和运行时构造路径不在这里猜测。 */
function relativeSpecifiers(text) {
  const found = [];
  const patterns = [
    /\bfrom\s*(['"])(\.{1,2}\/[^'"\n]+)\1/g,
    /\bimport\s*\(\s*(['"])(\.{1,2}\/[^'"\n]+)\1\s*\)/g,
    /\brequire\s*\(\s*(['"])(\.{1,2}\/[^'"\n]+)\1\s*\)/g,
    /\bimport\s+(['"])(\.{1,2}\/[^'"\n]+)\1/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) found.push({ full: match[0], specifier: match[2], index: match.index + match[0].lastIndexOf(match[2]) });
  }
  return found.sort((a, b) => a.index - b.index);
}

/** 将文件导入目标映射到 Git 清单路径，支持 Node 的常见扩展名省略规则。 */
function findTrackedTarget(sourcePath, specifier, tracked) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = posix.normalize(posix.join(posix.dirname(sourcePath), clean));
  const candidates = [base, base.replace(/\/ADAPTER\.md$/, '/SKILL.md')];
  if (!/\.[a-z0-9]+$/i.test(base)) for (const extension of ['.mjs', '.js', '.cjs', '.json', '.yaml', '.yml']) candidates.push(`${base}${extension}`);
  for (const candidate of [...candidates]) for (const extension of ['.mjs', '.js', '.json']) candidates.push(`${candidate}/index${extension}`);
  return candidates.find((candidate) => tracked.has(candidate)) ?? null;
}

/** 解析代码中以源仓库技能目录开头的字面路径，支持从仓库根和当前文件目录两种基准。 */
function findLiteralTarget(sourcePath, literal, stack, tracked) {
  const clean = literal.replaceAll('\\', '/');
  const candidates = [];
  if (clean.startsWith('./') || clean.startsWith('../')) candidates.push(posix.normalize(posix.join(posix.dirname(sourcePath), clean)));
  else {
    candidates.push(clean.replace(/^\.\//, ''));
    const policy = STACK_POLICIES[stack];
    if (policy.skillPrefix && !clean.startsWith(policy.skillPrefix)) candidates.push(`${policy.skillPrefix}${clean}`);
  }
  return candidates.flatMap((candidate) => [candidate, candidate.replace(/\/ADAPTER\.md$/, '/SKILL.md')]).find((candidate) => tracked.has(candidate)) ?? null;
}

/** 将指向源技能目录的路径映射到保留后的目标目录，含不带文件名的 schema 根路径。 */
function findLiteralDirectoryDestination(sourcePath, literal, stack, tracked, entries) {
  const clean = literal.replaceAll('\\', '/').replace(/\/$/, '');
  const candidates = [];
  if (clean.startsWith('./') || clean.startsWith('../')) candidates.push(posix.normalize(posix.join(posix.dirname(sourcePath), clean)));
  else {
    candidates.push(clean.replace(/^\.\//, ''));
    const policy = STACK_POLICIES[stack];
    if (policy.skillPrefix && !clean.startsWith(policy.skillPrefix)) candidates.push(`${policy.skillPrefix}${clean}`);
  }
  for (const candidate of candidates) {
    const member = [...tracked].find((path) => path.startsWith(`${candidate}/`));
    const destination = member ? entries.get(member)?.destination : null;
    const suffix = member?.slice(candidate.length);
    if (destination && suffix && destination.endsWith(suffix)) return destination.slice(0, -suffix.length);
    const archivedRoot = entries.get(`${candidate}/SKILL.md`);
    if (archivedRoot?.destination?.endsWith('/ADAPTER.md')) return posix.dirname(archivedRoot.destination);
    if (archivedRoot?.destination && /\/references\/technical-[^/]+\.md$/.test(archivedRoot.destination)) {
      return archivedRoot.destination.replace(/\/references\/technical-[^/]+\.md$/, '');
    }
  }
  return null;
}

/** 改写专业测试/工具内硬编码的源仓库路径，避免重命名后路径仍指向旧目录。 */
function rebasePathLiterals(text, sourcePath, destination, stack, tracked, entries) {
  if (stack === 'flutter' && sourcePath === 'scripts/validate-workflow.js') return { text, changed: false };
  if (['cocos', 'phaser', 'threejs'].includes(stack) && sourcePath === `skills/${STACK_POLICIES[stack].orchestrator}/scripts/initialize_project_docs.mjs`) return { text, changed: false };
  if (!/\.(?:mjs|cjs|js|ts)$/.test(sourcePath) || isStarterRuntime(sourcePath)) return { text, changed: false };
  const pattern = /(["'`])((?:\.\.?\/|skills\/)?[A-Za-z0-9_.-]+(?:\/[^"'`\r\n]+)?)\1/g;
  let changed = false;
  let output = text.replace(pattern, (match, quote, literal) => {
    if (literal.includes('${') || literal.includes('*')) return match;
    const firstPathSegment = literal.replace(/^(?:\.\.\/|\.\/)+/, '').split('/')[0];
    if (PROJECT_PATH_ROOTS.has(firstPathSegment)) return match;
    if (!literal.includes('/') && !/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(literal)) return match;
    const targetSource = findLiteralTarget(sourcePath, literal, stack, tracked);
    const target = targetSource ? entries.get(targetSource)?.destination : findLiteralDirectoryDestination(sourcePath, literal, stack, tracked, entries);
    if (!target) return match;
    let rewritten;
    if (literal.startsWith('./') || literal.startsWith('../')) {
      rewritten = posix.relative(posix.dirname(destination), target);
      if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
    } else rewritten = target;
    if (rewritten === literal) return match;
    changed = true;
    return `${quote}${rewritten}${quote}`;
  });
  if (destination.startsWith('migration/source-tests/')) {
    const rootPath = posix.relative(posix.dirname(destination), '.') || '.';
    const rootExpression = new RegExp(`(const\\s+(?:ROOT|root|repositoryRoot|REPO_ROOT)\\s*=\\s*(?:path\\.)?resolve\\(import\\.meta\\.dirname,\\s*)(["'])\\.{1,2}(?:/\\.{1,2})*\\2\\s*\\)`);
    const adapted = output.replace(rootExpression, (_match, prefix, quote) => `${prefix}${quote}${rootPath}${quote})`);
    if (adapted !== output) { output = adapted; changed = true; }
  }
  return { text: output, changed };
}

/** 递归改写 JSON Schema 的本地 $ref 路径，并保留片段定位。 */
function rebaseJsonReferences(text, sourcePath, destination, tracked, entries) {
  let value;
  try { value = JSON.parse(text); } catch { return { text, changed: false }; }
  let changed = false;
  const visit = (item) => {
    if (Array.isArray(item)) { for (const child of item) visit(child); return; }
    if (!item || typeof item !== 'object') return;
    for (const [key, child] of Object.entries(item)) {
      if (key === '$ref' && typeof child === 'string' && !child.startsWith('#') && !/^[a-z]+:/i.test(child)) {
        const fragmentIndex = child.indexOf('#');
        const refPath = fragmentIndex >= 0 ? child.slice(0, fragmentIndex) : child;
        const fragment = fragmentIndex >= 0 ? child.slice(fragmentIndex) : '';
        const targetSource = findTrackedTarget(sourcePath, refPath, tracked);
        const target = targetSource ? entries.get(targetSource)?.destination : null;
        if (target) {
          let rewritten = posix.relative(posix.dirname(destination), target);
          if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
          if (`${rewritten}${fragment}` !== child) { item[key] = `${rewritten}${fragment}`; changed = true; }
        }
      } else visit(child);
    }
  };
  visit(value);
  return { text: changed ? `${JSON.stringify(value, null, 2)}\n` : text, changed };
}

/** 依赖公共 runtime bridge 的模块必须使用相对文件引用，以兼容各项目本地安装。 */
function replaceDependencyImports(text, destination, sourcePath, stack) {
  const extension = sourcePath.split('.').at(-1);
  if (!['js', 'mjs', 'cjs', 'ts'].includes(extension) || isStarterRuntime(sourcePath)) return { text, transforms: [] };
  const directory = posix.dirname(destination);
  let output = text;
  const transforms = [];
  for (const [packageName, runtimeFile] of Object.entries(RUNTIME_MODULES)) {
    const target = `skills/app-skill-runtime/${runtimeFile}`;
    let bridge = posix.relative(directory, target);
    if (!bridge.startsWith('.')) bridge = `./${bridge}`;
    const literal = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const esm = new RegExp(`((?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\bimport\\s+)(["']))${literal}\\2`, 'g');
    const cjs = new RegExp(`(\\brequire\\s*\\(\\s*)(["'])${literal}\\2(\\s*\\))`, 'g');
    output = output.replace(esm, (_match, prefix, quote) => `${prefix}${bridge}${quote}`);
    output = output.replace(cjs, (_match, prefix, quote) => `${prefix}${quote}${posix.relative(directory, 'skills/app-skill-runtime/dependencies.cjs').replace(/^(?!\.)/, './')}${quote})(${quote}${packageName}${quote})`);
    if (output !== text && !transforms.includes(`runtime-bridge:${packageName}`)) transforms.push(`runtime-bridge:${packageName}`);
  }
  return { text: output, transforms };
}

/** 更新旧技能的公共路由名称，但保留技术栈专属合同模块的路径名称。 */
function routePublicNames(text, stack, sourcePath) {
  const policy = STACK_POLICIES[stack];
  let output = text;
  const oldControl = policy.control;
  const oldOrchestrator = policy.orchestrator;
  if (oldControl && sourcePath.endsWith('.md')) {
    output = output.replace(new RegExp(`(?:skills/)?${escapeRegExp(oldControl)}/SKILL\\.md`, 'g'), `${PUBLIC_SKILLS.control}/SKILL.md`);
    output = output.replace(new RegExp(`(?:skills/)?${escapeRegExp(oldControl)}/scripts/workflow-control\\.mjs`, 'g'), '.agents/skills/app-workflow-control/scripts/workflow-control.mjs');
    output = output.replace(new RegExp(`${escapeRegExp(oldControl)}/(?=(?:scripts|references|assets|templates)/)`, 'g'), `${stack}-domain-contracts/`);
    output = output.replace(new RegExp(`(?<![\\w/.-])${escapeRegExp(oldControl)}(?![\\w/.-])`, 'g'), PUBLIC_SKILLS.control);
  }
  if (sourcePath.endsWith('.md')) {
    output = output.replace(new RegExp(`${escapeRegExp(oldOrchestrator)}/SKILL\\.md`, 'g'), `${PUBLIC_SKILLS.orchestrator}/SKILL.md`);
    output = output.replace(new RegExp(`(?<![\\w/.-])${escapeRegExp(oldOrchestrator)}(?![\\w/.-])`, 'g'), PUBLIC_SKILLS.orchestrator);
    if (policy.grilling !== 'grilling') {
      output = output.replace(new RegExp(`${escapeRegExp(policy.grilling)}/SKILL\\.md`, 'g'), `${PUBLIC_SKILLS.grilling}/SKILL.md`);
      output = output.replace(new RegExp(`(?<![\\w/.-])${escapeRegExp(policy.grilling)}(?![\\w/.-])`, 'g'), PUBLIC_SKILLS.grilling);
    }
  }
  if (sourcePath.endsWith('/agents/openai.yaml')) {
    if (oldControl) output = output.replace(new RegExp(`\\$${escapeRegExp(oldControl)}\\b`, 'g'), `$${PUBLIC_SKILLS.control}`);
    output = output.replace(new RegExp(`\\$${escapeRegExp(oldOrchestrator)}\\b`, 'g'), `$${PUBLIC_SKILLS.orchestrator}`);
  }
  return routeCapabilityText(output, { stack, sourcePath });
}

/** 根据源文件与目标文件的新位置改写静态 JS import 和 Markdown 相对链接。 */
function rebaseReferences(text, sourcePath, destination, tracked, entries) {
  let output = text;
  const transforms = [];
  const replacements = [];
  for (const item of relativeSpecifiers(text)) {
    const targetSource = findTrackedTarget(sourcePath, item.specifier, tracked);
    const target = targetSource ? entries.get(targetSource)?.destination : null;
    if (!target) continue;
    let newSpecifier = posix.relative(posix.dirname(destination), target);
    if (!newSpecifier.startsWith('.')) newSpecifier = `./${newSpecifier}`;
    const oldSpecifier = item.specifier;
    if (newSpecifier !== oldSpecifier) replacements.push([oldSpecifier, newSpecifier]);
  }
  for (const [oldSpecifier, newSpecifier] of replacements) {
    const quotedOld = new RegExp(`(['"])${escapeRegExp(oldSpecifier)}\\1`, 'g');
    output = output.replace(quotedOld, (_match, quote) => `${quote}${newSpecifier}${quote}`);
  }
  if (output !== text) transforms.push('rebase-relative-imports');

  output = rewriteMarkdownLinks(output, sourcePath, destination, tracked, entries, transforms);
  return { text: output, transforms: [...new Set(transforms)] };
}

/** 将普通相对 Markdown 链接按目标路径重算，保留查询、片段、标题与 angle-bracket 写法。 */
function rewriteMarkdownLinks(text, sourcePath, destination, tracked, entries, transforms) {
  let fenced = false;
  return text.split(/(?<=\n)/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (fenced) return line;
    const rewrite = (rawTarget) => {
      const wrapped = rawTarget.startsWith('<') && rawTarget.endsWith('>');
      const targetValue = wrapped ? rawTarget.slice(1, -1) : rawTarget;
      if (!targetValue || /^(?:[a-z]+:|\/|#)/i.test(targetValue)) return rawTarget;
      const splitAt = targetValue.search(/[?#]/);
      const pathPart = splitAt >= 0 ? targetValue.slice(0, splitAt) : targetValue;
      const suffix = splitAt >= 0 ? targetValue.slice(splitAt) : '';
      if (!pathPart || pathPart.startsWith('/')) return rawTarget;
      let decodedPath = pathPart;
      try { decodedPath = decodeURIComponent(pathPart); } catch { /* Git 路径也可能含非法百分号序列，保持原文。 */ }
      const targetSource = findTrackedTarget(sourcePath, decodedPath, tracked);
      let target = targetSource ? entries.get(targetSource)?.destination : null;
      if (!target && /^(?:\.\.?\/)+/.test(decodedPath)) {
        const routedPath = decodedPath.replace(/^(?:\.\.?\/)+/, '').replace(/^skills\//, '');
        const candidate = `skills/${routedPath}`;
        if ([...entries.values()].some((entry) => entry.destination === candidate) || existsSync(resolve(REPOSITORY_ROOT, ...candidate.split('/')))) {
          target = candidate;
        }
      }
      if (!target) return rawTarget;
      let relativePath = posix.relative(posix.dirname(destination), target);
      if (!relativePath.startsWith('.')) relativePath = `./${relativePath}`;
      if (relativePath === pathPart) return rawTarget;
      transforms.push('rebase-markdown-links');
      const result = `${relativePath}${suffix}`;
      return wrapped ? `<${result}>` : result;
    };
    let updated = line.replace(/\]\(\s*(<[^>]+>|[^\s)]+)([^)]*)\)/g, (_match, target, suffix) => `](${rewrite(target)}${suffix})`);
    updated = updated.replace(/^(\s*\[[^\]]+\]:\s*)(<[^>]+>|\S+)(.*)$/g, (_match, prefix, target, suffix) => `${prefix}${rewrite(target)}${suffix}`);
    return updated;
  }).join('');
}

/** 转义正则表达式中的特殊字符，防止技术栈名按正则语法解释。 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 判断文件是否为可按 UTF-8 文本规则修改的格式。 */
function readTextIfSupported(buffer, sourcePath) {
  const extension = sourcePath.split('.').at(-1)?.toLowerCase();
  if (!UTF8_TEXT_EXTENSIONS.has(`.${extension}`)) return null;
  const text = buffer.toString('utf8');
  return Buffer.from(text, 'utf8').equals(buffer) ? text : null;
}

/** 抽取已核对共享块，并对没有共享块的原生参考继续执行精确适配。 */
function transformSharedWorkflow(text, plan, entry, sharedWorkflowPlan) {
  return applySharedWorkflowSections(text, { stack: plan.stack, sourcePath: entry.sourcePath, destination: entry.destination, repositoryRoot: REPOSITORY_ROOT, plan: sharedWorkflowPlan });
}

/** 为保留的入口正文添加最短公共路由说明，不覆盖或概述原文。 */
function addSkillRoute(text) {
  const rule = '> 执行前读取[公共执行协议](../app-creator-workflow/references/professional-execution.md)，再按本文处理专业步骤与原生约束。\n\n';
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end >= 0) return `${text.slice(0, end + 4)}\n\n${rule}${text.slice(end + 5).replace(/^\n+/, '')}`;
  }
  return `${rule}${text}`;
}

/** 对旧入口原文增加归档说明，避免已退役的总控规范被误当作生效规则。 */
function addArchiveNotice(text, kind, stack) {
  const notices = {
    control: '> 迁移说明：公共 WorkItem、执行包、阶段状态与总控命令已合并到 `$app-workflow-control`；下文完整保留旧版领域合同和工具文档。旧全局 CLI/状态实现不再安装，命令请使用 `.agents/skills/app-workflow-control/scripts/workflow-control.mjs`。\n\n',
    orchestrator: '> 迁移说明：公共阶段流程唯一入口为 `$app-creator-workflow`，公共状态唯一入口为 `$app-workflow-control`。本文件完整保留原技术栈编排正文供领域参考，冲突处遵守当前仓库公共规则：未经用户明确要求不提交、不创建分支或 worktree；截图由用户人工检查。\n\n',
    grilling: '> 迁移说明：公共追问入口为 `$grilling`；本文件完整保留源仓库的问题素材与技术栈背景，具体追问策略以公共技能为准。\n\n',
  };
  if (kind !== 'control') return notices[kind] + text;
  const contract = `> 领域合同边界：下文旧 Work Item、schema、CLI 和状态约定只解释原技术栈输入。新任务状态、执行包和 Evidence 使用公共控制面及[${stack}领域校验接线](../../app-stack-${stack}/references/domain-validation.md)；领域上下文继续独立校验，不作为新 Work Item 的旧版兼容解析或第二状态机。${stack === 'unity' ? '旧 baselineHash 只属于原 Unity 领域输入，不要求扩展公共 Work Item。' : ''}\n\n`;
  return notices[kind] + contract + text;
}

/** 应用已审核的公共流程改动和依赖桥，同时记录每一项变换名称。 */
function transformText(text, entry, stack, tracked, entries) {
  const routed = applyProfessionalRouting(text, { stack, sourcePath: entry.sourcePath, destination: entry.destination });
  let output = routed.text;
  const transforms = [...routed.transforms];
  if (routed.publicExecutionRef) entry.publicExecutionRef = routed.publicExecutionRef;
  const sourcePath = entry.sourcePath;
  if (/^skills\/(?:cocos|phaser4|threejs)-frame-animation\/scripts\/image-frame-source\.test\.mjs$/.test(sourcePath)) { output = adaptImageFrameSourceTest(output); transforms.push('adapt-shared-frame-source-test'); }
  const destination = entry.destination;
  const isSkillEntry = sourcePath.endsWith('/SKILL.md') || sourcePath === 'SKILL.md';
  if (entry.transforms.includes('extract-unity-domain-validation')) {
    output = extractUnityDomainValidation(output);
    transforms.push('extract-unity-native-readonly-validator');
  }
  if (entry.transforms.includes('retain-read-only-path-contract')) {
    const pathContract = /\/\*\* 将 Unity 文件或 glob 模式规范化[\s\S]*?export function canonicalizePosixPath[\s\S]*?^\}/m.exec(output);
    if (!pathContract) throw new Error('Unity io.mjs 中缺少只读 canonicalizePosixPath 合同，拒绝迁移写入函数');
    output = `/** 仅供领域校验使用的只读路径合同；不包含原控制器的写入与锁逻辑。 */\n${pathContract[0]}\n`;
    transforms.push('strip-workflow-write-and-lock-runtime');
  }
  if (entry.commonJsScope && destination.endsWith('/package.json')) {
    const packageData = JSON.parse(output);
    packageData.type = 'commonjs';
    output = `${JSON.stringify(packageData, null, 2)}\n`;
    transforms.push('preserve-commonjs-package-scope');
  }
  if (entry.disposition === 'copied' && isSkillEntry && !sourcePath.includes('/assets/flutter-dev/')) {
    output = addSkillRoute(output);
    transforms.push('add-public-skill-routing');
  }
  if (['merged', 'adapted'].includes(entry.disposition) && sourcePath.endsWith('/SKILL.md') && entry.transforms.some((item) => item.startsWith('archive-'))) {
    const kind = entry.transforms.includes('archive-control-entry') ? 'control'
      : entry.transforms.includes('archive-orchestrator-entry') ? 'orchestrator' : 'grilling';
    output = addArchiveNotice(output, kind, stack);
    transforms.push(`archive-notice:${kind}`);
  }
  if (destination.startsWith('migration/source-docs/')) {
    output = `> 源仓库归档材料：该文件保留供审计和领域参考，不能覆盖目标仓库公共工作流。\n\n${output}`;
    transforms.push('archive-source-document');
  }
  const withRoutes = routePublicNames(output, stack, sourcePath);
  if (withRoutes !== output) transforms.push('route-public-skill-names');
  output = withRoutes;
  const withCli = routeControlCommands(output);
  if (withCli !== output) transforms.push('route-public-control-cli');
  output = withCli;

  if (['cocos', 'phaser', 'threejs'].includes(stack) && sourcePath === `skills/${STACK_POLICIES[stack].orchestrator}/scripts/initialize_project_docs.mjs`) {
    output = adaptProjectInitializer(output, stack);
    transforms.push('adapt-initializer-to-public-work-item-scope');
  }

  if (sourcePath.endsWith('.json')) {
    const jsonRefs = rebaseJsonReferences(output, sourcePath, destination, tracked, entries);
    output = jsonRefs.text;
    if (jsonRefs.changed) transforms.push('rebase-json-refs');
  }
  const rebased = rebaseReferences(output, sourcePath, destination, tracked, entries);
  output = rebased.text;
  transforms.push(...rebased.transforms);
  const dependencies = replaceDependencyImports(output, destination, sourcePath, stack);
  output = dependencies.text;
  transforms.push(...dependencies.transforms);

  if (stack === 'flutter' && sourcePath === 'flutter-app-orchestrator/SKILL.md') {
    const updated = output.replace('单写者完成改动后，报告推荐测试等级和命令并等待人工选择；获批后实现者执行 F0。没有真实命令证据不进入正式审核。', '单写者完成改动后，报告推荐测试等级、理由、覆盖范围和命令，随后自动执行适用验证并根据结果修复或推进。没有真实命令证据不进入正式审核。');
    if (updated !== output) { output = updated; transforms.push('execute-validation-after-recommendation'); }
  }
  if (stack === 'unity' && sourcePath === 'tests/node/ui-layout-contract.test.mjs') {
    output = adaptUnityInstallerTest(output);
    transforms.push('adapt-professional-install-test-to-public-cli');
  }
  if (sourcePath === `${STACK_POLICIES[stack].skillPrefix}${STACK_POLICIES[stack].control}/scripts/visual-stage-prerequisites.test.mjs`) {
    const adapted = skipLegacyControllerCliTests(output);
    if (adapted !== output) { output = adapted; transforms.push('replace-old-global-control-test-cases'); }
  }
  if (stack === 'flutter' && sourcePath === 'scripts/validate-workflow.js') {
    const adapted = adaptFlutterValidator(output);
    if (adapted !== output) { output = adapted; transforms.push('adapt-flutter-tool-root-and-catalog'); }
  }
  if (stack === 'flutter' && (sourcePath === 'flutter-quality-review/references/review-rubric.md' || sourcePath === 'flutter-ux-ui-quality/references/visual-qa-rubric.md')) {
    const note = '> 截图视觉验收：代理默认只核验机器可读的布局与证据；截图由用户人工检查。只有用户明确要求自动视觉验证时才自动分析截图。\n\n';
    if (!output.includes('截图视觉验收：')) { output = `${note}${output}`; transforms.push('manual-screenshot-review-default'); }
  }
  if (/\.md$/i.test(sourcePath)) {
    const updated = output
      .replace(/每个阶段验收 `PASS` 后，([^。\n]*?)自动整理并创建本地阶段提交/g, '每个阶段验收 `PASS` 后，$1仅在用户明确要求时整理并创建本地阶段提交')
      .replace(/验收通过后，([^。\n]*?)自动创建本地阶段提交/g, '验收通过后，$1仅在用户明确要求时创建本地阶段提交')
      .replace('阶段任务满足验收条件后，由执行代理按下述“阶段收尾与 Git 提交”自动提交本次任务改动', '阶段任务满足验收条件后，由执行代理仅在用户明确要求时按下述“阶段收尾与 Git 提交”提交本次任务改动')
      .replace('每个阶段任务完成并通过适用验证后，执行代理自动在当前分支创建本地 Git 提交，无需再次询问', '每个阶段任务完成并通过适用验证后，仅在用户明确要求时由执行代理创建本地 Git 提交')
      .replace('阶段验收完成后，执行代理按[阶段收尾与 Git 提交](', '阶段验收完成后，执行代理仅在用户明确要求时按[阶段收尾与 Git 提交](')
      .replace(/(?:代理|Agent)([^\n。]{0,80})(?:自动|必须)([^\n。]{0,40})提交(?:本地)?(?:Git )?commit([^\n。]*)/gi, '未经用户明确要求，代理不得提交 Git commit$3');
    if (updated !== output) { output = updated; transforms.push('require-explicit-commit-request'); }
  }
  const literalPaths = rebasePathLiterals(output, sourcePath, destination, stack, tracked, entries);
  output = literalPaths.text;
  if (literalPaths.changed) transforms.push('rebase-source-path-literals');
  const unityTest = stack === 'unity' ? adaptUnitySourceTest(output, sourcePath) : { text: output };
  output = unityTest.text;
  if (unityTest.transform) transforms.push(unityTest.transform);
  const cli = routeCliEntry(output, { sourcePath, destination, enabled: entry.cliEntry === true });
  output = cli.text;
  transforms.push(...cli.transforms);
  // 原生路径与依赖重定位完成后，统一接入实际节点的相对布局校验。
  const layout = adaptRelativeLayoutContracts(output, { stack, sourcePath, destination });
  output = layout.text;
  transforms.push(...layout.transforms);
  // 静态布局保留 PNG 和机器事实，HTML 仅在明确需要交互或播放时生成。
  const review = adaptOptionalReviewArtifacts(output, { stack, sourcePath, destination });
  output = review.text;
  transforms.push(...review.transforms);
  if (stack === 'flutter') {
    const adapted = adaptFlutterVisualReview(output, sourcePath);
    if (adapted !== output) { output = adapted; transforms.push('optional-sketch-and-visual-acceptance-mode'); }
  }
  return { text: output, transforms: [...new Set([...entry.transforms, ...transforms])] };
}

/** 返回旧 control 目录的 sourcePath 前缀，避免误判同名普通文档。 */
function controlSourcePrefix(stack) {
  const policy = STACK_POLICIES[stack];
  return policy.control ? `${policy.skillPrefix}${policy.control}/` : null;
}

/** 判定源路径是否位于旧 control 目录。 */
function isControlSource(stack, sourcePath) {
  const prefix = controlSourcePrefix(stack);
  return Boolean(prefix && sourcePath.startsWith(prefix));
}

/** 将专业依赖闭包内的 control 文件映射到新的领域合同目录。 */
function retainControlFile(plan, sourcePath, reason) {
  const entry = plan.entries.get(sourcePath);
  if (!entry || !isControlSource(plan.stack, sourcePath)) return false;
  if (entry.disposition === 'merged' || entry.disposition === 'test-replaced') return false;
  if (entry.transforms?.includes('extract-unity-domain-validation')) return true;
  if (entry.transforms?.includes('retain-read-only-path-contract')) return true;
  const prefix = controlSourcePrefix(plan.stack);
  entry.destination = `skills/${plan.stack}-domain-contracts/${sourcePath.slice(prefix.length)}`;
  entry.disposition = 'copied';
  entry.reason = reason;
  entry.transforms = [...new Set([...(entry.transforms ?? []), 'preserve-professional-dependency-closure'])];
  return true;
}

/** 提取文档里显式列出的脚本路径，作为领域工具的迁移种子。 */
function documentedToolReferences(text) {
  const paths = [];
  const pattern = /(?:\.\.?\/|skills\/)?[\w@.-]+(?:\/[\w@.-]+)*\/(?:scripts|bin)\/[\w@./-]+\.(?:mjs|cjs|js)/g;
  for (const match of text.matchAll(pattern)) paths.push(match[0]);
  const local = /(?:^|[`\s])((?:\.\.?\/)*scripts\/[\w@./-]+\.(?:mjs|cjs|js))(?:[`\s]|$)/gm;
  for (const match of text.matchAll(local)) paths.push(match[1]);
  return [...new Set(paths)];
}

/** 解析显式工具路径；只有 Git 跟踪且属于 control/scripts 的工具才成为种子。 */
function resolveDocumentTool(sourcePath, token, stack, tracked) {
  const policy = STACK_POLICIES[stack];
  const prefix = controlSourcePrefix(stack);
  if (!prefix) return null;
  const clean = token.replace(/[?#].*$/, '').replaceAll('\\', '/');
  const candidates = [];
  if (clean.startsWith('skills/')) candidates.push(clean);
  if (clean.startsWith(`${policy.control}/`)) candidates.push(`${policy.skillPrefix}${clean}`);
  if (clean.startsWith('./') || clean.startsWith('../')) candidates.push(posix.normalize(posix.join(posix.dirname(sourcePath), clean)));
  if (clean.startsWith('scripts/') || clean.startsWith('bin/')) {
    candidates.push(posix.normalize(posix.join(posix.dirname(sourcePath), clean)));
    candidates.push(`${prefix}${clean}`);
  }
  for (const candidate of candidates) if (tracked.has(candidate) && candidate.startsWith(prefix) && /\.(?:mjs|cjs|js)$/.test(candidate)) return candidate;
  return null;
}

/** 由专业脚本静态导入、文档显式工具和 package.bin 入口递归保留领域实现。 */
function retainControlDependencyClosure(plan, packageEntries) {
  const seeds = new Map();
  for (const entry of plan.entries.values()) {
    if (!entry.destination || entry.disposition === 'test-replaced' || isControlSource(plan.stack, entry.sourcePath) || !/\.(?:mjs|cjs|js)$/.test(entry.sourcePath) || isStarterRuntime(entry.sourcePath)) continue;
    const text = readTextIfSupported(plan.sourceBuffers.get(entry.sourcePath), entry.sourcePath);
    if (text === null) continue;
    for (const item of relativeSpecifiers(text)) {
      const target = findTrackedTarget(entry.sourcePath, item.specifier, plan.sourceFiles);
      if (target && isControlSource(plan.stack, target)) seeds.set(target, `被 ${entry.sourcePath} 的静态导入引用`);
    }
  }
  for (const entry of plan.entries.values()) {
    if (!entry.destination || !entry.sourcePath.endsWith('.md')) continue;
    const oldControlEntry = isControlSource(plan.stack, entry.sourcePath) && entry.sourcePath.endsWith('/SKILL.md');
    if (isControlSource(plan.stack, entry.sourcePath) && !oldControlEntry) continue;
    const text = readTextIfSupported(plan.sourceBuffers.get(entry.sourcePath), entry.sourcePath);
    if (text === null) continue;
    for (const token of documentedToolReferences(text)) {
      const target = resolveDocumentTool(entry.sourcePath, token, plan.stack, plan.sourceFiles);
      if (target) seeds.set(target, `在 ${entry.sourcePath} 中作为可调用工具显式记录`);
    }
    for (const match of text.matchAll(/\]\(\s*(<[^>]+>|[^\s)]+)(?:[^)]*)\)/g)) {
      const target = resolveDocumentTool(entry.sourcePath, match[1].replace(/^<|>$/g, ''), plan.stack, plan.sourceFiles);
      if (target) seeds.set(target, `在 ${entry.sourcePath} 的专业资源链接中引用`);
    }
  }
  for (const bin of packageEntries) {
    if (bin.tracked && isControlSource(plan.stack, bin.sourcePath) && !/workflow-control\.mjs$/i.test(bin.sourcePath)) {
      seeds.set(bin.sourcePath, `由 ${bin.packagePath} 的 package.bin 公布为领域工具`);
    }
  }
  if (plan.stack === 'unity') {
    const prefix = controlSourcePrefix(plan.stack);
    for (const path of [
      'scripts/runtime/control-primitives.mjs',
      'scripts/runtime/visible-contract.mjs',
      'scripts/runtime/stage-confirmation.mjs',
      'scripts/runtime/rigging-delivery-contract.mjs',
      'scripts/runtime/return-disposition.mjs',
      'scripts/runtime/resource-handoff-evidence.mjs',
    ]) {
      const sourcePath = `${prefix}${path}`;
      if (plan.sourceFiles.has(sourcePath)) seeds.set(sourcePath, 'Unity 只读领域验证器所需的本地技术合同闭包');
    }
  }
  if (['cocos', 'phaser', 'threejs'].includes(plan.stack)) {
    const prefix = controlSourcePrefix(plan.stack);
    const professionalContracts = [
      'scripts/responsive-viewport-contract.mjs',
      'scripts/responsive-viewport-contract.test.mjs',
      'scripts/native-route-schema.test.mjs',
      'scripts/transparent-route-schema.test.mjs',
      'scripts/visual-background-pipeline.test.mjs',
      'scripts/scene-reconstruction-summary-projection.test.mjs',
      'scripts/world-viewport-contract.mjs',
      'scripts/world-viewport-contract.test.mjs',
    ];
    for (const path of professionalContracts) {
      const sourcePath = `${prefix}${path}`;
      if (plan.sourceFiles.has(sourcePath)) seeds.set(sourcePath, '保留技术栈专属视口/渲染/透明资源领域算法及原回归测试');
    }
  }

  const queue = [...seeds.entries()].map(([sourcePath, reason]) => ({ sourcePath, reason }));
  const visited = new Set();
  while (queue.length) {
    const { sourcePath, reason } = queue.shift();
    if (visited.has(sourcePath)) continue;
    visited.add(sourcePath);
    const entry = plan.entries.get(sourcePath);
    if (!entry) continue;
    if (isControlSource(plan.stack, sourcePath)) {
      // 旧全局 CLI 与其公共状态机已合并；不要从它们反向拖入整套旧执行器。
      if (entry.disposition === 'merged' || entry.disposition === 'test-replaced' || entry.transforms?.includes('extract-unity-domain-validation')) continue;
      const selected = retainControlFile(plan, sourcePath, reason);
      if (!selected && !entry.destination) continue;
      if (/\.(?:mjs|js|cjs)$/.test(sourcePath) && !/\.test\.(?:mjs|js|cjs)$/.test(sourcePath) && !sourcePath.endsWith('/runtime/io.mjs')) {
        const testPath = sourcePath.replace(/\.(mjs|js|cjs)$/, '.test.$1');
        if (plan.sourceFiles.has(testPath) && !plan.policy.replacedControlTests.some((name) => testPath.endsWith(name))) {
          retainControlFile(plan, testPath, `保留领域工具 ${sourcePath} 的配套专业回归测试`);
          queue.push({ sourcePath: testPath, reason: `专业测试 ${testPath} 的依赖闭包` });
        }
      }
    }
    const text = readTextIfSupported(plan.sourceBuffers.get(sourcePath), sourcePath);
    if (text === null) continue;
    for (const item of relativeSpecifiers(text)) {
      const target = findTrackedTarget(sourcePath, item.specifier, plan.sourceFiles);
      if (target && isControlSource(plan.stack, target)) queue.push({ sourcePath: target, reason: `被 ${sourcePath} 的静态导入引用` });
    }
  }
}

/** 确认目标只能写入迁移专属技能资源或 migration 归档目录。 */
export function assertSafeDestination(destination) {
  const absolute = assertNoDestinationLinks(REPOSITORY_ROOT, destination);
  const rel = relative(REPOSITORY_ROOT, absolute);
  if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new Error(`迁移目标越出仓库：${destination}`);
  const first = destination.split('/')[0];
  if (!['skills', 'migration'].includes(first)) throw new Error(`迁移目标超出允许目录：${destination}`);
  if (destination.startsWith('skills/')) {
    const skillName = destination.split('/')[1];
    if (['app-creator-workflow', 'app-workflow-control', 'grilling', 'app-asset-workflow', 'app-stack-unity', 'app-stack-cocos', 'app-stack-phaser', 'app-stack-threejs', 'app-stack-flutter', 'app-skill-runtime'].includes(skillName) && !/^skills\/app-stack-(?:unity|cocos|phaser|threejs|flutter)\/references\/native-contracts\.md$/.test(destination)) {
      throw new Error(`迁移不得覆盖公共技能或运行时：${destination}`);
    }
  }
  return absolute;
}

/** 生成目标仓库相对路径的 SHA-256，未迁移文件以 null 明确标记。 */
function destinationHash(destination) {
  if (!destination) return null;
  const absolute = assertSafeDestination(destination);
  return existsSync(absolute) ? sha256(readFileSync(absolute)) : null;
}

/** 发现通用工具 entry，并将来源 bin 与目标路径写入技能目录清单。 */
function collectTools(stack, bins, entries, sourceFiles) {
  const tools = [];
  for (const bin of bins) {
    const entry = entries.get(bin.sourcePath);
    const installationCommand = /(?:^|[-_])(skills|install|installer)(?:$|[-_])/i.test(bin.name) || /(?:^|\/)(?:install[^/]*\.(?:mjs|js))$/i.test(bin.sourcePath);
    const globalController = /(?:^|\/)scripts\/workflow-control\.mjs$/i.test(bin.sourcePath);
    let targetPath = entry?.destination ?? null;
    let disposition = entry?.disposition ?? 'source-only';
    let reason = entry?.reason ?? '声明的源 bin 路径不在 Git 跟踪清单中。';
    let replacement = entry?.replacement ?? null;
    if (installationCommand) {
      targetPath = null;
      disposition = 'source-only';
      reason = '源仓库安装器由目标统一安装器替代。';
      replacement = 'scripts/install-project-skills.mjs';
    } else if (globalController) {
      targetPath = 'skills/app-workflow-control/scripts/workflow-control.mjs';
      disposition = 'merged';
      reason = '旧全局 CLI 映射到唯一公共控制器。';
      replacement = 'skills/app-workflow-control/scripts/workflow-control.mjs';
    }
    tools.push({ name: bin.name, path: targetPath, sourcePath: bin.sourcePath, disposition, reason, replacement, packagePath: bin.packagePath, tracked: bin.tracked && sourceFiles.has(bin.sourcePath) });
  }
  for (const sourcePath of STACK_POLICIES[stack].rootTools) {
    const entry = entries.get(sourcePath);
    tools.push({ name: sourcePath.split('/').at(-1).replace(/\.[^.]+$/, ''), path: entry?.destination ?? null, sourcePath, disposition: entry?.disposition ?? 'source-only', reason: entry?.reason ?? '专业工具未能映射。', packagePath: 'package.json', tracked: sourceFiles.has(sourcePath) });
  }
  if (stack === 'unity') {
    const sourcePath = `${controlSourcePrefix(stack)}scripts/workflow-control.mjs`;
    const entry = entries.get(sourcePath);
    if (entry?.transforms.includes('extract-unity-domain-validation')) {
      tools.push({
        name: 'unity-domain-validation',
        path: entry.destination,
        sourcePath,
        disposition: 'adapted',
        reason: '从旧混合 CLI 中抽取的只读 Unity 原生验证模块；通过领域入口导入，不作为 CLI 执行。',
        replacement: 'skills/app-workflow-control/scripts/workflow-control.mjs',
        kind: 'module',
        packagePath: 'package.json',
        tracked: sourceFiles.has(sourcePath),
      });
    }
  }
  return tools;
}

/** 构建一次技术栈迁移计划，并以 Git 源文件为唯一清单基准。 */
function buildStackPlan(stack, sourceRoot) {
  const policy = STACK_POLICIES[stack];
  const repository = resolve(sourceRoot, policy.repository);
  if (!existsSync(repository)) throw new Error(`找不到源仓库：${repository}`);
  const sourceFilesArray = listTrackedFiles(repository);
  const sourceFiles = new Set(sourceFilesArray);
  const revision = runGit(repository, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const discovery = discoverSkills(stack, sourceFilesArray);
  const packageEntries = packageBins(repository, sourceFilesArray);
  const packageToolPaths = new Set(packageEntries.map((bin) => bin.sourcePath));
  const entries = new Map();
  for (const sourcePath of sourceFilesArray) {
    const plan = planFile(stack, sourcePath, discovery.rootSkillNames, packageToolPaths);
    entries.set(sourcePath, { stack, sourcePath, ...plan, sourceSha256: null, destinationSha256: null });
  }

  for (const sourcePath of policy.rootTools) {
    if (!sourceFiles.has(sourcePath)) throw new Error(`${stack}: 专业根工具没有进入 git ls-files -z：${sourcePath}`);
  }
  for (const bin of packageEntries) {
    const installerEntry = /install/i.test(bin.name) || /(?:^|\/)install(?:-|\.)/i.test(bin.sourcePath);
    if (bin.tracked && !installerEntry && !entries.get(bin.sourcePath)?.destination && !/workflow-control\.mjs$/.test(bin.sourcePath) && !isControlSource(stack, bin.sourcePath)) {
      const packageEntry = entries.get(bin.sourcePath);
      packageEntry.destination = `skills/${stack}-domain-contracts/tools/${bin.sourcePath}`;
      packageEntry.disposition = 'copied';
      packageEntry.reason = '由源 package.bin 暴露的专业工具，按原文件路径保留。';
      packageEntry.transforms = ['preserve-package-bin-tool'];
    }
  }

  const rootSkillEntries = [];
  for (const skill of discovery.rootSkills) {
    const kind = skill.name === policy.control ? 'merged-control'
      : skill.name === policy.orchestrator ? 'merged-orchestrator'
        : skill.name === policy.grilling ? 'merged-grilling' : 'specialist';
    const entry = entries.get(skill.sourcePath);
    const publicTarget = kind === 'merged-control' ? `skills/${PUBLIC_SKILLS.control}/SKILL.md`
      : kind === 'merged-orchestrator' ? `skills/${PUBLIC_SKILLS.orchestrator}/SKILL.md`
        : kind === 'merged-grilling' ? `skills/${PUBLIC_SKILLS.grilling}/SKILL.md` : entry.destination;
    rootSkillEntries.push({ name: skill.name, sourcePath: skill.sourcePath, disposition: kind.startsWith('merged') ? 'merged' : 'preserved', destination: publicTarget, reason: kind === 'specialist' ? '保留专业能力与原生差异；共同规则和算法引用公共真源，不用概述替代。' : entry.reason, kind });
  }
  for (const skill of discovery.nestedSkills) {
    const entry = entries.get(skill.sourcePath);
    rootSkillEntries.push({ name: skill.name, sourcePath: skill.sourcePath, disposition: 'preserved', destination: entry.destination, reason: '保留作为技术栈专业技能的嵌套模板，不计入正式根入口。', kind: 'nested-template' });
  }

  const filePlans = [...entries.values()];
  const sourceBuffers = new Map();
  for (const entry of filePlans) sourceBuffers.set(entry.sourcePath, readFileSync(resolveSource(repository, entry.sourcePath)));
  const partialPlan = { stack, policy, sourceFiles, entries, sourceBuffers };
  retainControlDependencyClosure(partialPlan, packageEntries);
  const commonJsScopes = planCommonJsScopes(stack, entries, sourceBuffers);
  const tools = collectTools(stack, packageEntries, entries, sourceFiles);
  for (const tool of tools) {
    const entry = entries.get(tool.sourcePath);
    if (tool.kind !== 'module' && tool.path && !tool.path.startsWith('skills/app-workflow-control/') && entry?.destination === tool.path && entry.sourcePath.endsWith('.mjs')) entry.cliEntry = true;
  }
  const resourceDirectories = new Set([`${stack}-domain-contracts`]);
  if (policy.orchestrator) resourceDirectories.add(policy.orchestrator);
  if (['unity', 'cocos', 'phaser', 'threejs'].includes(stack)) resourceDirectories.add('app-domain-toolkit');
  if (sourceFilesArray.some((path) => path.startsWith('skills/'))) {
    for (const sourcePath of sourceFilesArray.filter((path) => path.startsWith('skills/'))) {
      const sourceTop = sourcePath.split('/')[1];
      if (!discovery.rootSkillNames.has(sourceTop)) resourceDirectories.add(`${stack}-domain-contracts`);
    }
  }
  return routeCapabilityPlan({ stack, policy, repository, revision, sourceFiles, sourceFilesArray, discovery, entries, sourceBuffers, commonJsScopes, tools, rootSkillEntries, resourceDirectories: [...resourceDirectories].sort() });
}
/** 写出计划中的文件并记录实际源/目标哈希、处置、理由和可追踪变换。 */
function applyStackPlan(plan, sharedWorkflowPlan, stagePatches) {
  const output = [];
  const sourceRoots = plan.sourceFilesArray;
  for (const entry of plan.entries.values()) {
    const sourceBuffer = plan.sourceBuffers.get(entry.sourcePath);
    entry.sourceSha256 = sha256(sourceBuffer);
    if (!entry.destination) { output.push({ ...entry }); continue; }
    // 来源完整覆盖已预检；公共文件仅由共享生成器写入，源正文不得覆盖它。
    if (entry.referenceRedirect) { entry.destinationSha256 = referenceRedirectHash(entry, sharedWorkflowPlan); output.push({ ...entry }); continue; }
    if (entry.transforms.includes('reuse-existing-authored-asset-tool')) { entry.destinationSha256 = validateAuthoredAssetReuse({ root: REPOSITORY_ROOT, entry, sourceBuffer }); output.push({ ...entry }); continue; } // 只读取已审核的公共作者文件，禁止迁移写入。
    const text = entry.transforms.includes('archive-legacy-agent-metadata') ? null : readTextIfSupported(sourceBuffer, entry.sourcePath);
    let destinationBuffer = sourceBuffer;
    if (text !== null) {
      const shared = transformSharedWorkflow(text, plan, entry, sharedWorkflowPlan);
      const transformed = transformText(shared.text, entry, plan.stack, plan.sourceFiles, plan.entries);
      destinationBuffer = Buffer.from(transformed.text, 'utf8');
      entry.transforms = [...new Set([...entry.transforms.filter((item) => item === 'archive-legacy-agent-metadata'), ...shared.transforms, ...transformed.transforms])];
      if (shared.sharedReferences.length) {
        entry.sharedReferences = [...new Set(sharedWorkflowPlan.replacements
          .filter((item) => item.stack === plan.stack && item.sourcePath === entry.sourcePath)
          .map((item) => item.commonPath))];
      }
    }
    // 字体及语言合同以经审计的旧来源和作者规范生成，不能回退到旧五语约束。
    const locale = adaptProjectLocales(destinationBuffer, { stack: plan.stack, sourcePath: entry.sourcePath, destination: entry.destination, repositoryRoot: REPOSITORY_ROOT, sourceBuffer });
    if (locale.changed) {
      destinationBuffer = locale.buffer;
      entry.transforms = [...new Set([...entry.transforms, 'project-selected-locales'])];
    }
    // 阶段修改在语言合同之后应用，保证两种适配不相互覆盖。
    const stage = adaptUnifiedStages(destinationBuffer, { stack: plan.stack, sourcePath: entry.sourcePath, destination: entry.destination, sourceBuffer, patches: stagePatches });
    if (stage.changed) { destinationBuffer = stage.buffer; entry.transforms = [...new Set([...entry.transforms, 'unified-visual-stages'])]; }
    if (entry.disposition === 'copied' && !destinationBuffer.equals(sourceBuffer)) entry.disposition = 'adapted';
    if (entry.disposition === 'merged' && entry.transforms.includes('replaced-by-app-workflow-control')) {
      // 清单记录公共入口作为替代目标，但源 CLI 字节不得覆盖目标控制器。
      const target = resolve(REPOSITORY_ROOT, ...entry.destination.split('/'));
      if (!existsSync(target)) throw new Error(`公共控制器替代目标不存在：${entry.destination}`);
      entry.destinationSha256 = sha256(readFileSync(target));
      output.push({ ...entry });
      continue;
    }
    const target = assertSafeDestination(entry.destination);
    if (existsSync(target) && !isOwnedPreviousOutput(entry.destination)) {
      if (!sameBytes(target, destinationBuffer)) throw new Error(`迁移目标已存在且内容不属于本次预期，拒绝覆盖：${entry.destination}`);
      entry.destinationSha256 = sha256(destinationBuffer);
      output.push({ ...entry });
      continue;
    }
    if (existsSync(target) && entry.sharedAdapterSha256 && destinationHash(entry.destination) === entry.sharedAdapterSha256) { entry.destinationSha256 = entry.sharedAdapterSha256; output.push({ ...entry }); continue; } // 中断恢复仅复用本轮预期字节。
    if (sameBytes(target, destinationBuffer)) { entry.destinationSha256 = sha256(destinationBuffer); output.push({ ...entry }); continue; } // 相同字节不重复写入，减少文件监听和临时占用。
    if (existsSync(target) && !isUnmodifiedPreviousOutput(entry.destination) && !sameBytes(target, destinationBuffer)) throw new Error(`上一轮迁移后文件已被修改，拒绝覆盖：${entry.destination}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, destinationBuffer);
    entry.destinationSha256 = sha256(destinationBuffer);
    output.push({ ...entry });
  }
  for (const [destination, generated] of plan.commonJsScopes) {
    const target = assertSafeDestination(destination);
    const content = Buffer.from(generated.content, 'utf8');
    if (existsSync(target)) {
      if (!isOwnedPreviousOutput(destination)) {
        if (!sameBytes(target, content)) throw new Error(`CommonJS 作用域目标已存在且非本次预期，拒绝覆盖：${destination}`);
        continue;
      }
      if (!isUnmodifiedPreviousOutput(destination)) throw new Error(`上一轮生成的 CommonJS 作用域已被修改，拒绝覆盖：${destination}`);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  // 内部中断恢复摘要只参与覆盖保护，不写入公开迁移清单。
  for (const entry of output) delete entry.sharedAdapterSha256;
  return output;
}

/** 读取上一轮清单，只有迁移器曾生成的文件才允许在重跑时更新。 */
let previousDestinationHashes = null;
function previousOutputs() {
  if (previousDestinationHashes === null) {
    previousDestinationHashes = new Map();
    const previous = join(REPOSITORY_ROOT, 'migration', 'files.json');
    if (existsSync(previous)) {
      try {
        const parsed = JSON.parse(readFileSync(previous, 'utf8'));
        for (const file of parsed.files ?? []) if (file.destination && file.destinationSha256) previousDestinationHashes.set(file.destination, file.destinationSha256);
        const catalogPath = join(REPOSITORY_ROOT, 'migration', 'catalog.json');
        if (existsSync(catalogPath)) for (const file of JSON.parse(readFileSync(catalogPath, 'utf8')).generatedFiles ?? []) if (file.path && file.destinationSha256) previousDestinationHashes.set(file.path, file.destinationSha256);
      } catch { /* 上一份清单损坏时不自动取得覆盖权。 */ }
    }
  }
  return previousDestinationHashes;
}

/** 只允许覆盖哈希与上一份迁移清单一致的文件，防止重跑覆盖人工修改。 */
function isOwnedPreviousOutput(destination) {
  return previousOutputs().has(destination);
}

/** 验证已登记输出仍保持上次生成的字节。 */
function isUnmodifiedPreviousOutput(destination) {
  const expected = previousOutputs().get(destination);
  return Boolean(expected && destinationHash(destination) === expected);
}

/** 比较目标与本次预期字节，支持中断后安全复用尚未写入清单的完整输出。 */
function sameBytes(path, expected) {
  return existsSync(path) && sha256(readFileSync(path)) === sha256(expected);
}

/** 检查复制的 JavaScript 静态导入是否仍可解析到已迁移模块。 */
function auditImports(plans, sharedWorkflowPlan) {
  const issues = [];
  for (const plan of plans) {
    for (const entry of plan.entries.values()) {
      if (!entry.destination || !['copied', 'adapted'].includes(entry.disposition) || entry.destination.startsWith('migration/') || !/\.(?:mjs|cjs|js)$/.test(entry.sourcePath) || isStarterRuntime(entry.sourcePath)) continue;
      const text = readTextIfSupported(plan.sourceBuffers.get(entry.sourcePath), entry.sourcePath);
      if (text === null) continue;
      const shared = transformSharedWorkflow(text, plan, entry, sharedWorkflowPlan);
      const migratedText = transformText(shared.text, entry, plan.stack, plan.sourceFiles, plan.entries).text;
      for (const item of relativeSpecifiers(migratedText)) {
        const targetSource = findTrackedTarget(entry.sourcePath, item.specifier, plan.sourceFiles);
        if (!targetSource) continue;
        const target = plan.entries.get(targetSource);
        if (!target?.destination) issues.push(`${plan.stack}:${entry.sourcePath} -> ${item.specifier} (${targetSource} 被标记为 ${target?.disposition ?? '未分类'})`);
      }
    }
  }
  return issues;
}

/** 执行迁移前检查源技能、全文件分类和专业导入闭包，再写文件与清单。 */
export function migrateSpecialists(argv = process.argv.slice(2)) {
  const options = parseMigrationArguments(argv, SOURCE_ROOT);
  if (options.help) {
    console.log('node scripts/migration/migrate-specialists.mjs [--source-root <E:\\Git>] [--dry-run]');
    return { status: 'HELP' };
  }
  const plans = STACK_NAMES.map((stack) => buildStackPlan(stack, options.sourceRoot));
  const sharedWorkflowPlan = buildSharedWorkflowPlan({ sourceRoot: options.sourceRoot, repositoryRoot: REPOSITORY_ROOT });
  prepareReferenceRedirects(plans, sharedWorkflowPlan, { readText: readTextIfSupported, transformShared: transformSharedWorkflow, transformText });
  const sharedCapabilityPlan = [
    ...buildSharedVisualCapabilities(plans), ...buildDirectSharedCapabilities(plans), buildSharedFrameSourceCapability(plans), buildSharedFrameAtlasCapability(plans), buildSharedVideoAtlasCapability(plans), buildSharedUiAlignmentCapability(plans), buildSharedVisualNormalizationCapability(plans), buildSharedTransparencyContractCapability(plans), buildSharedProjectInitCapability(plans),
    ...buildSharedCliPlan({ sourceRoot: options.sourceRoot, repositoryRoot: REPOSITORY_ROOT }).capabilities,
    ...buildSharedProjectTemplatePlan({ sourceRoot: options.sourceRoot, repositoryRoot: REPOSITORY_ROOT }).capabilities,
    ...buildSharedWorkflowCapabilities(sharedWorkflowPlan, plans),
  ];
  const stagePatches = loadUnifiedStagePatches(REPOSITORY_ROOT);
  adaptUnifiedSharedCapabilities(sharedCapabilityPlan, plans, stagePatches, { readText: readTextIfSupported, transformShared: transformSharedWorkflow, transformText, sharedWorkflowPlan, repositoryRoot: REPOSITORY_ROOT });
  const plansByStack = new Map(plans.map((plan) => [plan.stack, plan]));
  for (const capability of sharedCapabilityPlan) for (const source of capability.sources) {
    const entry = plansByStack.get(source.stack)?.entries.get(source.sourcePath);
    if (!entry) throw new Error(`共享能力 ${capability.id} 无法关联已规划源文件：${source.stack}:${source.sourcePath}`);
    if (capability.transforms?.includes('unified-visual-stages') && source.adapterDestination === capability.implementation) entry.sharedAdapterSha256 = sha256(capability.content);
    if (source.adapterContent !== undefined) {
      entry.sharedImplementationRef = capability.implementation;
      entry.sharedAdapterSha256 = sha256(Buffer.from(source.adapterContent, 'utf8'));
    }
  }
  const imports = auditImports(plans, sharedWorkflowPlan);
  if (imports.length) throw new Error(`发现专业静态导入依赖未保留：\n${imports.join('\n')}`);
  assertTransformablePlans(plans, sharedWorkflowPlan, { readText: readTextIfSupported, transformShared: transformSharedWorkflow, transformText });
  assertProjectLocaleAdaptablePlans(plans, sharedWorkflowPlan, { readText: readTextIfSupported, transformShared: transformSharedWorkflow, transformText, repositoryRoot: REPOSITORY_ROOT });
  assertUnifiedStageAdaptablePlans(plans, sharedWorkflowPlan, { readText: readTextIfSupported, transformShared: transformSharedWorkflow, transformText, repositoryRoot: REPOSITORY_ROOT, patches: stagePatches });
  const trackedCount = plans.reduce((count, plan) => count + plan.sourceFilesArray.length, 0);
  const formalSkillCount = plans.reduce((count, plan) => count + plan.discovery.rootSkills.length, 0);
  const specialistCount = plans.reduce((count, plan) => count + plan.rootSkillEntries.filter((skill) => skill.kind === 'specialist').length, 0);
  if (formalSkillCount !== 91 || specialistCount !== 77) throw new Error(`源技能入口核对失败：正式 ${formalSkillCount}/91，专业 ${specialistCount}/77。`);
  if (options.dryRun) {
    console.log(JSON.stringify({ status: 'DRY_RUN', trackedFiles: trackedCount, formalSkills: formalSkillCount, nativeAdapters: specialistCount, templateSkills: plans.reduce((count, plan) => count + plan.discovery.nestedSkills.length, 0), sharedCapabilities: sharedCapabilityPlan.length, importsChecked: true }, null, 2));
    return { status: 'DRY_RUN' };
  }
  const files = plans.flatMap((plan) => applyStackPlan(plan, sharedWorkflowPlan, stagePatches));
  const sharedOutputs = applySharedCapabilities({ capabilities: sharedCapabilityPlan, files, previousHashes: previousOutputs(), resolveDestination: assertSafeDestination, destinationHash, sha256 });
  const domainGeneratedFiles = applyNativeManualResources({ repositoryRoot: REPOSITORY_ROOT, previousHashes: previousOutputs(), resolveDestination: assertSafeDestination, hashDestination: destinationHash, sha256, files, plans, sharedOutputs });
  const currentDestinations = new Set(files.map((file) => file.destination).filter(Boolean));
  for (const plan of plans) for (const destination of plan.commonJsScopes.keys()) currentDestinations.add(destination);
  for (const entry of GENERATED_DOMAIN_RESOURCES) currentDestinations.add(entry.path);
  // 即使历史清单包含这些路径，也不能将本仓库控制器误当过期迁移产物清除。
  for (const path of AUTHORED_CONTROL_RESOURCES) currentDestinations.add(path);
  for (const generated of sharedOutputs.generatedFiles) currentDestinations.add(generated.path);
  removeStaleGeneratedFiles(previousOutputs(), currentDestinations, assertSafeDestination, destinationHash);
  const catalog = writeMigrationCatalog({ plans, files, domainGeneratedFiles, sourceRoot: options.sourceRoot, repositoryRoot: REPOSITORY_ROOT, sharedOutputs, sha256, resolveDestination: assertSafeDestination });
  console.log(JSON.stringify({ status: 'PASS', trackedFiles: files.length, formalSkills: formalSkillCount, nativeAdapters: specialistCount, tools: Object.values(catalog.stacks).reduce((count, stack) => count + stack.tools.length, 0), files: 'migration/files.json', catalog: 'migration/catalog.json' }, null, 2));
  return { status: 'PASS', catalog, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { migrateSpecialists(); }
  catch (error) { console.error(JSON.stringify({ status: 'FAIL', error: error.message })); process.exitCode = 1; }
}
