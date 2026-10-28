/** 按源文件逐段核对三栈图片图集的共同算法并生成显式注入的公共工厂。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { adaptAnimationPreviewGeneration } from './animation-preview-generation.mjs';

const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/animation/images-to-atlas.mjs';
const STACKS = Object.freeze({
  cocos: { skill: 'cocos-frame-animation', schema: 'cocos-image-atlas/2', contract: 'createCocosAtlasContract', key: 'cc', tool: 'cocos-images-to-atlas' },
  phaser: { skill: 'phaser4-frame-animation', schema: 'phaser4-image-atlas/1', contract: 'createPhaserAtlasContract', key: 'phaser', tool: 'phaser4-images-to-atlas' },
  threejs: { skill: 'threejs-frame-animation', schema: 'threejs-image-atlas/1', contract: 'createThreeJSAtlasContract', key: 'threejs', tool: 'threejs-images-to-atlas' },
});
const CORE_NAMES = ['VideoAtlasError', 'composeHorizontalAtlas', 'isObject', 'normalizeCommonAtlasOptions', 'nonEmptyString', 'preflightAtlasOutputs', 'processAtlasFrame', 'relativeUrl', 'renderAtlasPreview', 'requireStableContentRect', 'samePath', 'sha256Bytes', 'writeAtlasOutputs'];
const EXPORT_NAMES = ['IMAGE_ATLAS_SCHEMA', 'imagesToAtlas', 'imagesAtlasHelp', 'parseImagesAtlasArgs', 'runImagesAtlasCli'];
const SOURCE_GUARD = [
  '/** 仅在用户直接执行本文件时启动 CLI，测试导入时不产生进程副作用。 */',
  'const currentFile = resolve(fileURLToPath(import.meta.url));',
  'const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;',
  'if (invokedFile && currentFile === invokedFile) process.exitCode = await runImagesAtlasCli();',
].join('\n');

/** 核对完整公开接口及文件末尾，避免公共适配器丢失未来新增导出或执行行为。 */
function validateSourceExportsAndGuard(text, stack, guardIndex) {
  const declarations = [...text.matchAll(/^\s*export\b([^\n]*)/gm)].map((match) => match[1].trim());
  const names = declarations.map((declaration) => /^(?:async\s+function|function|class|const)\s+([A-Za-z_$][\w$]*)\b/.exec(declaration)?.[1]);
  if (JSON.stringify(names) !== JSON.stringify(EXPORT_NAMES)) throw new Error(`${stack} 图片图集公开导出发生未经审核变化`);
  if (guardIndex < 0 || text.slice(guardIndex).trimEnd() !== SOURCE_GUARD) throw new Error(`${stack} 图片图集 CLI 尾部发生未经审核变化`);
}

/** 丢弃源导入前验证完整声明，避免三源同步新增依赖后工厂缺少绑定。 */
function validatePrefix(text, stack, spec) {
  const anchor = 'function normalizeImageAtlasPaths(';
  const index = text.indexOf(anchor);
  if (index < 0) throw new Error(`${stack} 图集模块缺少执行入口`);
  let prefix = text.slice(0, index).replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/^#![^\n]*\n/, '');
  prefix = replaceOnce(prefix, spec.contract, 'STACK_ATLAS_CONTRACT', `${stack} 原生合同导入`);
  prefix = replaceOnce(prefix, `export const IMAGE_ATLAS_SCHEMA = "${spec.schema}";`, 'export const IMAGE_ATLAS_SCHEMA = "[[SCHEMA]]";', `${stack} 图集 schema`);
  const expected = [
    'import { mkdtemp, rm } from "node:fs/promises";',
    'import { basename, dirname, extname, join, resolve } from "node:path";',
    'import { tmpdir } from "node:os";',
    'import { fileURLToPath } from "node:url";',
    'import {',
    'VideoAtlasError,', 'composeHorizontalAtlas,', 'STACK_ATLAS_CONTRACT,', 'isObject,', 'normalizeCommonAtlasOptions,', 'nonEmptyString,',
    'preflightAtlasOutputs,', 'processAtlasFrame,', 'relativeUrl,', 'renderAtlasPreview,', 'requireStableContentRect,',
    'samePath,', 'sha256Bytes,', 'writeAtlasOutputs,',
    '} from "./frame-atlas-core.mjs";',
    'import { readImageFrameSource } from "./image-frame-source.mjs";',
    'export const IMAGE_ATLAS_SCHEMA = "[[SCHEMA]]";',
  ].join('\n');
  const normalized = prefix.split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
  if (normalized !== expected) throw new Error(`${stack} 图集导入或前缀声明发生未经审核变化`);
}

/** 唯一锚点避免吞掉源码新增或重排的安全分支。 */
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  if (first < 0 || text.indexOf(before, first + before.length) >= 0) throw new Error(`${label} 必须恰好出现一次`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}

/** 计算适配器相对引用，避免将公共工厂反向绑定到单一技术栈。 */
function specifier(from, to) {
  if (typeof from !== 'string' || typeof to !== 'string' || !from.startsWith('skills/') || !to.startsWith('skills/') || [from, to].some((path) => /[\\:]/.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..'))) throw new Error('图集迁移目标路径无效');
  const relative = posix.relative(posix.dirname(from), to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 标准化经审计的唯一差异；其余源码必须逐字相同。 */
function normalizeExecution(text, stack, spec) {
  validatePrefix(text, stack, spec);
  const begin = text.indexOf('function normalizeImageAtlasPaths(');
  const end = text.indexOf('/** 返回图片来源打包 CLI 帮助');
  if (begin < 0 || end <= begin || text.indexOf('function normalizeImageAtlasPaths(', begin + 1) >= 0) throw new Error(`${stack} 图集算法锚点无效`);
  let body = text.slice(begin, end).trimEnd();
  body = replaceOnce(body, 'export async function imagesToAtlas(', 'async function imagesToAtlas(', `${stack} 图集导出`);
  if (/^\s*(?:import|export)\b/m.test(body)) throw new Error(`${stack} 图集执行新增模块声明`);
  // 公共工厂与栈入口处于不同文件；依赖模块位置的引用不能直接迁移。
  if (/\b(?:fileURLToPath|__dirname|__filename|currentFile|invokedFile)\b|\bimport\s*(?:\.\s*meta|\()/.test(body)) throw new Error(`${stack} 图集执行引用模块上下文，必须重新审核`);
  if (stack === 'threejs') body = replaceOnce(body, '    projectRoot,\n', '    ...(includeRuntimeBinding ? { projectRoot } : {}),\n', `${stack} 项目根`);
  else body = replaceOnce(body, '    outputSheet: paths.outputSheet,\n    defaultFps:', '    outputSheet: paths.outputSheet,\n    ...(includeRuntimeBinding ? { projectRoot } : {}),\n    defaultFps:', `${stack} 项目根`);
  body = replaceOnce(body, `"${stack}-image-atlas-"`, 'temporaryPrefix', `${stack} 临时目录`);
  body = replaceOnce(body, `const ${spec.key} = ${spec.contract}(`, 'const stackContract = createAtlasContract(', `${stack} 图集合约`);
  body = replaceOnce(body, `tool: { name: "${spec.tool}", version: "1" }`, 'tool: { name: toolName, version: "1" }', `${stack} 报告工具`);
  body = replaceOnce(body, `      ${spec.key},\n`, '      [contractKey]: stackContract,\n', `${stack} 合同报告字段`);
  if (stack === 'threejs') {
    body = replaceOnce(body, '      runtime_binding: sharedOptions.runtimeBinding,\n      runtime_url: sharedOptions.runtimeUrl,\n', '      ...(includeRuntimeBinding ? { runtime_binding: sharedOptions.runtimeBinding, runtime_url: sharedOptions.runtimeUrl } : {}),\n', `${stack} 运行绑定`);
    body = replaceOnce(body, 'file: sharedOptions.runtimeBinding?.file ?? paths.outputSheet', 'file: includeRuntimeBinding ? (sharedOptions.runtimeBinding?.file ?? paths.outputSheet) : paths.outputSheet', `${stack} 图集路径`);
  } else {
    body = replaceOnce(body, '      [contractKey]: stackContract,\n', '      [contractKey]: stackContract,\n      ...(includeRuntimeBinding ? { runtime_binding: sharedOptions.runtimeBinding, runtime_url: sharedOptions.runtimeUrl } : {}),\n', `${stack} 运行绑定`);
    body = replaceOnce(body, 'file: paths.outputSheet, width:', 'file: includeRuntimeBinding ? (sharedOptions.runtimeBinding?.file ?? paths.outputSheet) : paths.outputSheet, width:', `${stack} 图集路径`);
  }
  return body;
}

/** 验证三源并生成唯一执行算法及保留原生 CLI 的各栈适配器。 */
export function buildSharedFrameAtlasCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('图片图集共享计划必须提供迁移计划数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('图片图集迁移计划包含重复技术栈');
  let canonical;
  const sources = [];
  for (const [stack, spec] of Object.entries(STACKS)) {
    const plan = byStack.get(stack);
    const prefix = `skills/${spec.skill}/scripts/`;
    const sourcePath = `${prefix}images-to-atlas.mjs`;
    const bytes = plan?.sourceBuffers?.get(sourcePath);
    const destination = plan?.entries?.get(sourcePath)?.destination;
    const core = plan?.entries?.get(`${prefix}frame-atlas-core.mjs`)?.destination;
    const source = plan?.entries?.get(`${prefix}image-frame-source.mjs`)?.destination;
    if (!Buffer.isBuffer(bytes) || !destination || !core || !source) throw new Error(`${stack} 图片图集来源或依赖缺失`);
    const text = bytes.toString('utf8').replace(/\r\n?/g, '\n');
    const normalized = normalizeExecution(text, stack, spec);
    if (canonical !== undefined && canonical !== normalized) throw new Error(`${stack} 图片图集执行逻辑存在未经审核差异`);
    canonical ??= normalized;
    const marker = '/** 返回图片来源打包 CLI 帮助';
    const first = text.indexOf(marker);
    const guard = '/** 仅在用户直接执行本文件时启动 CLI';
    const end = text.indexOf(guard, first);
    if (first < 0 || end <= first || text.indexOf(marker, first + marker.length) >= 0 || text.indexOf(guard, end + guard.length) >= 0) throw new Error(`${stack} 图片图集 CLI 锚点无效`);
    validateSourceExportsAndGuard(text, stack, end);
    const cli = replaceOnce(text.slice(first, end).trimEnd(), '可播放网页（相对路径基于 project-root；默认与图集同名）', '按需生成播放网页（相对路径基于 project-root）', `${stack} 图片预览帮助`);
    const adapter = [
      '#!/usr/bin/env node',
      'import { mkdtemp, rm } from "node:fs/promises";',
      'import { basename, dirname, extname, join, resolve } from "node:path";',
      'import { tmpdir } from "node:os";',
      'import { fileURLToPath } from "node:url";',
      `import { isDirectEntry } from ${JSON.stringify(specifier(destination, 'skills/app-skill-runtime/direct-entry.mjs'))};`,
      `import * as core from ${JSON.stringify(specifier(destination, core))};`,
      `import { readImageFrameSource } from ${JSON.stringify(specifier(destination, source))};`,
      `import { createImageAtlasTools } from ${JSON.stringify(specifier(destination, IMPLEMENTATION))};`,
      '',
      `export const IMAGE_ATLAS_SCHEMA = ${JSON.stringify(spec.schema)};`,
      // CLI 原文可使用任意原导入，完整保留绑定以支持未来同步的合法修改。
      `const { ${[...CORE_NAMES, spec.contract].join(', ')} } = core;`,
      `const { imagesToAtlas } = createImageAtlasTools({ core, readImageFrameSource, schema: IMAGE_ATLAS_SCHEMA, contractMethod: ${JSON.stringify(spec.contract)}, contractKey: ${JSON.stringify(spec.key)}, toolName: ${JSON.stringify(spec.tool)}, temporaryPrefix: ${JSON.stringify(`${stack}-image-atlas-`)}, includeRuntimeBinding: ${stack === 'threejs'} });`,
      'export { imagesToAtlas };', '', cli, '',
      '// 保留源模块的守卫变量，供栈专属 CLI 读取当前入口信息。',
      'const currentFile = resolve(fileURLToPath(import.meta.url));',
      'const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;',
      '// 只有直接执行时启动 CLI，导入时保持无副作用。',
      'if (isDirectEntry(import.meta.url)) process.exitCode = await runImagesAtlasCli();', '',
    ].join('\n');
    sources.push({ stack, sourcePath, sourceSha256: createHash('sha256').update(bytes).digest('hex'), adapterDestination: destination, adapterContent: adapter, transforms: ['share-image-atlas-execution', 'inject-stack-atlas-contract-and-cli'] });
  }
  const content = [
    'import { mkdtemp, rm } from "node:fs/promises";',
    'import { basename, dirname, extname, join, resolve } from "node:path";',
    'import { tmpdir } from "node:os";', '',
    '/** 将图片图集公共算法绑定到技术栈自己的合同、依赖和报告字段。 */',
    'export function createImageAtlasTools({ core, readImageFrameSource, schema, contractMethod, contractKey, toolName, temporaryPrefix, includeRuntimeBinding } = {}) {',
    `  const { ${CORE_NAMES.join(', ')} } = core ?? {};`,
    `  if ([${CORE_NAMES.join(', ')}, readImageFrameSource, core?.[contractMethod]].some((item) => typeof item !== "function")) throw new TypeError("图片图集缺少必要的栈合同和来源依赖");`,
    '  if (![schema, contractMethod, contractKey, toolName, temporaryPrefix].every((item) => typeof item === "string" && item)) throw new TypeError("图片图集缺少栈配置");',
    '  const IMAGE_ATLAS_SCHEMA = schema;',
    '  const createAtlasContract = core[contractMethod];',
    ...adaptAnimationPreviewGeneration(canonical, 'image').split('\n').map((line) => `  ${line}`),
    '  return { imagesToAtlas };', '}', '',
  ].join('\n');
  return { id: 'web-images-to-atlas', kind: 'module', implementation: IMPLEMENTATION, content, sources, stacks: Object.keys(STACKS), dependencies: [], reason: '三栈图片图集共享经过逐源校验的执行算法，报告和运行绑定由技术栈显式注入。' };
}
