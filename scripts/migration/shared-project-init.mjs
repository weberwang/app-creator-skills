/** 将三栈项目文档初始化的共同授权和写入逻辑提取为可注入的公共工厂。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { adaptProjectInitializer } from './project-initializer-adapter.mjs';

const STACKS = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/project/initialize-project-docs.mjs';
const EXPORTS = Object.freeze(['parseIncludeList', 'validateProjectRoot', 'selectTemplates', 'initializeDocuments', 'runPreflight', 'main']);
const GUARD = 'if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main();';
const DEPENDENCIES = Object.freeze({
  repoPath: 'skills/app-workflow-control/scripts/runtime/io.mjs',
  loadWork: 'skills/app-workflow-control/scripts/runtime/workflow.mjs',
  validation: 'skills/app-workflow-control/scripts/runtime/validation.mjs',
  artifacts: 'skills/app-workflow-control/scripts/runtime/artifacts.mjs',
});
const EXPECTED_IMPORTS = Object.freeze([
  'import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";',
  'import { isAbsolute, parse, resolve } from "node:path";',
  'import { pathToFileURL } from "node:url";',
  'import { CORE_TEMPLATES, OPTIONAL_TEMPLATES } from "./project_doc_templates.mjs";',
  'import { repoPath } from "../../app-workflow-control/scripts/runtime/io.mjs";',
  'import { loadWork } from "../../app-workflow-control/scripts/runtime/workflow.mjs";',
  'import { assertOwnedPath, loadProfile } from "../../app-workflow-control/scripts/runtime/validation.mjs";',
  'import { assertNoOpenGrilling } from "../../app-workflow-control/scripts/runtime/artifacts.mjs";',
]);

/** 锚点必须唯一，防止源文件漂移后留下未验证的旧授权路径。 */
function replaceOnce(text, before, after, label) {
  const position = text.indexOf(before);
  if (position < 0 || text.indexOf(before, position + before.length) !== -1) throw new Error(`${label} 必须恰好出现一次`);
  return text.slice(0, position) + after + text.slice(position + before.length);
}

/** 所有引用均从实际迁移目标计算，避免重定位时仍指向旧目录。 */
function relativeModule(from, to) {
  const relative = posix.relative(posix.dirname(from), to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 迁移目标必须是 skills 内普通相对模块路径，不能借计划注入目录跳转。 */
function assertModuleTarget(path, label) {
  if (typeof path !== 'string' || !path.startsWith('skills/') || !path.endsWith('.mjs')
    || /[\\:]/.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`${label} 不是安全的技能模块目标`);
  }
}

/** 严格校验原初始化器仅有栈名称差异，并保留现有公共控制面适配。 */
function normalizedSource(bytes, stack, prefix) {
  let text = bytes.toString('utf8').replace(/\r\n?/g, '\n');
  text = replaceOnce(text, `${prefix}-game-workflow-control`, '[[WORKFLOW]]', `${stack} 控制入口`);
  return replaceOnce(text, `${stack}-spec-candidate`, '[[ACTION]]', `${stack} 原授权动作`);
}

/** 在生成工厂前检查原生导出和直接执行入口，禁止丢失任何公开行为。 */
function extractBody(raw, stack) {
  const adapted = adaptProjectInitializer(raw.toString('utf8').replace(/\r\n?/g, '\n'), stack).replace(/\r\n?/g, '\n');
  const marker = `const EXPECTED_STACK = ${JSON.stringify(stack)};`;
  const index = adapted.indexOf(marker);
  if (index < 0 || adapted.indexOf(marker, index + marker.length) >= 0) throw new Error(`${stack} 技术栈身份锚点无效`);
  let prefix = adapted.slice(0, index);
  // 丢弃原前缀前逐条验证完整导入，防止三栈同时新增依赖后工厂静默遗漏。
  prefix = replaceOnce(prefix, '#!/usr/bin/env node', '', `${stack} 脚本入口`);
  for (const declaration of EXPECTED_IMPORTS) prefix = replaceOnce(prefix, declaration, '', `${stack} 导入声明`);
  if (prefix.trim()) throw new Error(`${stack} 初始化器前缀含未知声明或依赖，拒绝共享`);
  const withoutGuard = replaceOnce(adapted.slice(index + marker.length), GUARD, '', `${stack} 命令入口`).trim();
  // 旧预检的子进程导入会被适配器删除；若正文仍使用它，不能生成缺少依赖的工厂。
  if (/\bspawnSync\b/.test(withoutGuard)) throw new Error(`${stack} 初始化器仍依赖已移除的旧控制子进程`);
  const names = [...withoutGuard.matchAll(/^export (?:async function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
  if (JSON.stringify(names) !== JSON.stringify(EXPORTS)) throw new Error(`${stack} 初始化器导出 API 已变化`);
  return withoutGuard.replace(/^export /gm, '');
}

/** 构建唯一公共算法和各栈模板、身份、授权依赖的显式绑定计划。 */
export function buildSharedProjectInitCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('初始化器共享计划必须提供迁移计划数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('初始化器迁移计划包含重复技术栈');
  let canonicalSource;
  let canonicalBody;
  const sources = [];
  const adapterTargets = new Set();
  for (const [stack, prefix] of Object.entries(STACKS)) {
    const plan = byStack.get(stack);
    const skill = `${prefix}-game-orchestrator`;
    const sourcePath = `skills/${skill}/scripts/initialize_project_docs.mjs`;
    const templatePath = `skills/${skill}/scripts/project_doc_templates.mjs`;
    const bytes = plan?.sourceBuffers?.get(sourcePath);
    const entry = plan?.entries?.get(sourcePath);
    const templates = plan?.entries?.get(templatePath)?.destination;
    if (!Buffer.isBuffer(bytes) || !entry?.destination || !templates) throw new Error(`${stack} 初始化器或模板来源缺失`);
    assertModuleTarget(entry.destination, `${stack} 初始化器`);
    assertModuleTarget(templates, `${stack} 模板`);
    if (adapterTargets.has(entry.destination) || entry.destination === IMPLEMENTATION) throw new Error(`${stack} 初始化器目标与其他栈或公共工厂冲突`);
    adapterTargets.add(entry.destination);
    const normalized = normalizedSource(bytes, stack, prefix);
    if (canonicalSource !== undefined && normalized !== canonicalSource) throw new Error(`${stack} 初始化器除已知栈身份外存在源差异`);
    canonicalSource ??= normalized;
    const body = extractBody(bytes, stack);
    if (canonicalBody !== undefined && body !== canonicalBody) throw new Error(`${stack} 初始化器公共授权适配存在差异`);
    canonicalBody ??= body;
    const destination = entry.destination;
    const adapter = [
      '#!/usr/bin/env node',
      'import { pathToFileURL } from "node:url";',
      `import { CORE_TEMPLATES, OPTIONAL_TEMPLATES } from ${JSON.stringify(relativeModule(destination, templates))};`,
      `import { repoPath } from ${JSON.stringify(relativeModule(destination, DEPENDENCIES.repoPath))};`,
      `import { loadWork } from ${JSON.stringify(relativeModule(destination, DEPENDENCIES.loadWork))};`,
      `import { assertOwnedPath, loadProfile } from ${JSON.stringify(relativeModule(destination, DEPENDENCIES.validation))};`,
      `import { assertNoOpenGrilling } from ${JSON.stringify(relativeModule(destination, DEPENDENCIES.artifacts))};`,
      `import { createProjectDocInitializer } from ${JSON.stringify(relativeModule(destination, IMPLEMENTATION))};`,
      '',
      `const tools = createProjectDocInitializer({ stack: ${JSON.stringify(stack)}, CORE_TEMPLATES, OPTIONAL_TEMPLATES, repoPath, loadWork, assertOwnedPath, loadProfile, assertNoOpenGrilling });`,
      `export const { ${EXPORTS.join(', ')} } = tools;`,
      '',
      '// 保留原有命令入口，仅直接执行时初始化项目文档。',
      GUARD,
      '',
    ].join('\n');
    sources.push({ stack, sourcePath, sourceSha256: createHash('sha256').update(bytes).digest('hex'), adapterDestination: destination, adapterContent: adapter, transforms: ['share-project-doc-initializer', 'inject-stack-templates-and-preflight'] });
  }
  const content = [
    'import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";',
    'import { isAbsolute, parse, resolve } from "node:path";',
    '',
    '/** 为指定技术栈创建项目文档初始化器，显式传入其模板和公共授权合同。 */',
    'export function createProjectDocInitializer({ stack, CORE_TEMPLATES, OPTIONAL_TEMPLATES, repoPath, loadWork, assertOwnedPath, loadProfile, assertNoOpenGrilling } = {}) {',
    '  if (typeof stack !== "string" || !stack || !CORE_TEMPLATES || !OPTIONAL_TEMPLATES || [repoPath, loadWork, assertOwnedPath, loadProfile, assertNoOpenGrilling].some((value) => typeof value !== "function")) throw new TypeError("初始化器缺少技术栈、模板或授权依赖");',
    '  const EXPECTED_STACK = stack;',
    ...canonicalBody.split('\n').map((line) => `  ${line}`),
    `  return { ${EXPORTS.join(', ')} };`,
    '}',
    '',
  ].join('\n');
  return { id: 'web-project-doc-initializer', kind: 'module', implementation: IMPLEMENTATION, content, stacks: Object.keys(STACKS), sources, dependencies: Object.values(DEPENDENCIES), reason: '三栈文档选择、路径保护与公共工作项授权逻辑一致；模板和技术栈身份由各自适配器注入。' };
}
