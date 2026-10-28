/** 按精确源摘要合并三栈视频抽帧，并通过参数保留原生输出合同。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { adaptAnimationPreviewGeneration } from './animation-preview-generation.mjs';

const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/animation/video-to-atlas.mjs';
const SPECS = Object.freeze({
  cocos: { skill: 'cocos-frame-animation', schema: 'cocos-video-atlas/2', method: 'createCocosAtlasContract', exposed: 'createCocosVideoAtlasContract', key: 'cc', tool: 'cocos-video-to-atlas', sharp: 'skills/cocos-domain-contracts/scripts/runtime/image-runtime.mjs', hash: '2ca28da79a14b1355043bc86ea436c4bf6710536b3b8d99166d6fba263663bc4', doc: '生成与帧动画工作流一致的 Creator 资源接入清单。' },
  phaser: { skill: 'phaser4-frame-animation', schema: 'phaser4-video-atlas/1', method: 'createPhaserAtlasContract', exposed: 'createPhaserVideoAtlasContract', key: 'phaser', tool: 'phaser4-video-to-atlas', sharp: 'skills/app-skill-runtime/sharp.mjs', hash: '42905355a82a886aa427522e412598c69e9b247c6d665615e203ca103c1ba0e0', doc: '生成与现有动画工作流结构一致的 Phaser preload、播放和锚点配置。' },
  threejs: { skill: 'threejs-frame-animation', schema: 'threejs-video-atlas/1', method: 'createThreeJSAtlasContract', exposed: 'createThreeJSVideoAtlasContract', key: 'threejs', tool: 'threejs-video-to-atlas', sharp: 'skills/app-skill-runtime/sharp.mjs', hash: 'baa0a765ff4be3483be541d24cd6f21f97098a284b0fadef0a65bed8ade3e2b2', doc: '生成可供 TextureLoader、水平 UV 与 Sprite 动画直接消费的报告合同。' },
});
const CORE = Object.freeze(['VideoAtlasError', 'composeHorizontalAtlas', 'isObject', 'normalizeCommonAtlasOptions', 'nonEmptyString', 'preflightAtlasOutputs', 'processAtlasFrame', 'relativeUrl', 'renderAtlasPreview', 'requireStableContentRect', 'samePath', 'sha256Bytes', 'writeAtlasOutputs']);
const OUTPUTS = Object.freeze(['normalizeVideoAtlasOptions', 'runExternalCommand', 'createVideoAtlasContract', 'renderVideoAtlasPreview', 'videoToAtlas']);

/** 仅接受唯一精确锚点，避免删去相邻代码或未审核的栈差异。 */
function replaceOnce(text, from, to, label) {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + from.length) >= 0) throw new Error(`${label} 锚点不唯一`);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

/** 目标必须保留在技能树，防止注入越界的模块路径。 */
function moduleSpecifier(from, to) {
  for (const path of [from, to]) if (typeof path !== 'string' || !path.startsWith('skills/') || /[\\:]/.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('视频图集模块路径无效');
  const relative = posix.relative(posix.dirname(from), to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 只标准化逐项核准的栈字段，其余执行代码必须完全相同。 */
function executionBody(text, stack, spec) {
  const first = text.indexOf('async function sha256File(');
  const last = text.indexOf('/** 返回参数说明，列明抽帧');
  if (first < 0 || last <= first || text.indexOf('async function sha256File(', first + 1) >= 0) throw new Error(`${stack} 视频执行锚点无效`);
  let body = text.slice(first, last).trimEnd();
  const projectInput = '  const projectRootValue = input.projectRoot ?? input.project_root ?? input["project-root"];\n  const projectRoot = nonEmptyString(projectRootValue) ? resolve(projectRootValue) : undefined;\n';
  if (stack === 'threejs') body = replaceOnce(body, projectInput, '', `${stack} 项目根`);
  body = replaceOnce(body, '  const outputSheet = resolve(sheetValue);\n', '  const outputSheet = resolve(sheetValue);\n  const projectRootValue = includeRuntimeBinding ? (input.projectRoot ?? input.project_root ?? input["project-root"]) : undefined;\n  const projectRoot = nonEmptyString(projectRootValue) ? resolve(projectRootValue) : undefined;\n', `${stack} 项目根注入`);
  if (stack === 'threejs') {
    body = replaceOnce(body, '{ outputSheet, projectRoot, defaultFps: 12, defaultLoop: true }', '{ outputSheet, ...(includeRuntimeBinding ? { projectRoot } : {}), defaultFps: 12, defaultLoop: true }', `${stack} 选项项目根`);
    body = replaceOnce(body, '    outputSheet,\n    projectRoot,\n', '    outputSheet,\n    ...(includeRuntimeBinding ? { projectRoot } : {}),\n', `${stack} 返回项目根`);
  } else {
    body = replaceOnce(body, '{ outputSheet, defaultFps: 12, defaultLoop: true }', '{ outputSheet, ...(includeRuntimeBinding ? { projectRoot } : {}), defaultFps: 12, defaultLoop: true }', `${stack} 选项项目根`);
    body = replaceOnce(body, '    outputSheet,\n    outputReport,\n', '    outputSheet,\n    ...(includeRuntimeBinding ? { projectRoot } : {}),\n    outputReport,\n', `${stack} 返回项目根`);
  }
  body = replaceOnce(body, `/** ${spec.doc} */`, '/** 构造当前栈的视频图集合同。 */', `${stack} 原生合同说明`);
  body = replaceOnce(body, `export function ${spec.exposed}(`, 'function createVideoAtlasContract(', `${stack} 原生合同`);
  body = replaceOnce(body, `return ${spec.method}(options, cell, frameCount);`, 'return createAtlasContract(options, cell, frameCount);', `${stack} 原生合同依赖`);
  body = replaceOnce(body, `"${stack}-video-atlas-"`, 'temporaryPrefix', `${stack} 临时目录`);
  body = replaceOnce(body, `const ${spec.key} = ${spec.exposed}(`, 'const stackContract = createVideoAtlasContract(', `${stack} 图集报告`);
  body = replaceOnce(body, `tool: { name: "${spec.tool}", version: "1" }`, 'tool: { name: toolName, version: "1" }', `${stack} 报告名称`);
  body = replaceOnce(body, `      ${spec.key},\n`, '      [contractKey]: stackContract,\n', `${stack} 报告字段`);
  if (stack === 'threejs') {
    body = replaceOnce(body, '      runtime_binding: options.runtimeBinding,\n      runtime_url: options.runtimeUrl,\n', '      ...(includeRuntimeBinding ? { runtime_binding: options.runtimeBinding, runtime_url: options.runtimeUrl } : {}),\n', `${stack} 运行绑定`);
    body = replaceOnce(body, 'file: options.runtimeBinding?.file ?? options.outputSheet', 'file: includeRuntimeBinding ? (options.runtimeBinding?.file ?? options.outputSheet) : options.outputSheet', `${stack} 输出绑定`);
  } else {
    body = replaceOnce(body, '      [contractKey]: stackContract,\n', '      [contractKey]: stackContract,\n      ...(includeRuntimeBinding ? { runtime_binding: options.runtimeBinding, runtime_url: options.runtimeUrl } : {}),\n', `${stack} 运行绑定`);
    body = replaceOnce(body, 'file: options.outputSheet, width:', 'file: includeRuntimeBinding ? (options.runtimeBinding?.file ?? options.outputSheet) : options.outputSheet, width:', `${stack} 输出绑定`);
  }
  return body.replace(/^export /gm, '');
}

/** 读取已登记源文件和依赖，构造单一公共执行工厂与原生 CLI 适配器。 */
export function buildSharedVideoAtlasCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('视频图集共享计划需要技术栈数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('视频图集技术栈重复');
  let canonical;
  const sources = [];
  for (const [stack, spec] of Object.entries(SPECS)) {
    const plan = byStack.get(stack);
    const prefix = `skills/${spec.skill}/scripts/`;
    const sourcePath = `${prefix}video-to-atlas.mjs`;
    const bytes = plan?.sourceBuffers?.get(sourcePath);
    const destination = plan?.entries?.get(sourcePath)?.destination;
    const core = plan?.entries?.get(`${prefix}frame-atlas-core.mjs`)?.destination;
    const coreBytes = plan?.sourceBuffers?.get(`${prefix}frame-atlas-core.mjs`);
    if (!Buffer.isBuffer(bytes) || !destination || !core) throw new Error(`${stack} 视频图集源或依赖缺失`);
    if (![destination, core].every((path) => path.startsWith(`skills/${stack}-domain-contracts/`))) throw new Error(`${stack} 视频图集不能绑定其他技术栈领域资源`);
    if (!Buffer.isBuffer(coreBytes)) throw new Error(`${stack} 图集合同源码缺失`);
    const coreText = coreBytes.toString('utf8');
    for (const name of [...CORE, spec.method]) if (!new RegExp(`\\bexport\\s+(?:async\\s+function|function|class|const)\\s+${name}\\b`).test(coreText)) throw new Error(`${stack} 图集合同不再导出 ${name}`);
    const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
    // 固定完整源摘要：任何导入、导出或尾部改动都要先重新审计，而非只比较高相似正文。
    if (sourceSha256 !== spec.hash) throw new Error(`${stack} 视频图集完整源摘要漂移`);
    const text = bytes.toString('utf8').replace(/\r\n?/g, '\n');
    const body = executionBody(text, stack, spec);
    if (canonical !== undefined && canonical !== body) throw new Error(`${stack} 视频图集执行算法存在未经审核差异`);
    canonical ??= body;
    const cliStart = text.indexOf('/** 返回参数说明，列明抽帧');
    const guard = text.indexOf('/** 仅在用户直接执行本文件时启动 CLI', cliStart);
    if (cliStart < 0 || guard <= cliStart) throw new Error(`${stack} 视频 CLI 锚点无效`);
    const cli = replaceOnce(text.slice(cliStart, guard).trimEnd(), '可播放网页（默认与图集同名）', '按需生成播放网页', `${stack} 视频预览帮助`);
    const adapter = [
      '#!/usr/bin/env node',
      'import { createHash } from "node:crypto";', 'import { spawn } from "node:child_process";',
      'import { createReadStream } from "node:fs";', 'import { mkdtemp, readdir, rm, stat } from "node:fs/promises";',
      'import { basename, dirname, extname, join, resolve } from "node:path";', 'import { tmpdir } from "node:os";', 'import { fileURLToPath } from "node:url";',
      `import { isDirectEntry } from ${JSON.stringify(moduleSpecifier(destination, 'skills/app-skill-runtime/direct-entry.mjs'))};`,
      `import sharp from ${JSON.stringify(moduleSpecifier(destination, spec.sharp))};`,
      `import * as core from ${JSON.stringify(moduleSpecifier(destination, core))};`,
      `import { createVideoAtlasTools } from ${JSON.stringify(moduleSpecifier(destination, IMPLEMENTATION))};`,
      `export const VIDEO_ATLAS_SCHEMA = ${JSON.stringify(spec.schema)};`,
      `const { ${[...CORE, spec.method].join(', ')} } = core;`,
      `const tools = createVideoAtlasTools({ core, sharp, schema: VIDEO_ATLAS_SCHEMA, contractMethod: ${JSON.stringify(spec.method)}, contractKey: ${JSON.stringify(spec.key)}, toolName: ${JSON.stringify(spec.tool)}, temporaryPrefix: ${JSON.stringify(`${stack}-video-atlas-`)}, includeRuntimeBinding: ${stack === 'threejs'} });`,
      'export { VideoAtlasError };',
      `export const { normalizeVideoAtlasOptions, runExternalCommand, renderVideoAtlasPreview, videoToAtlas } = tools;`,
      '/** 维持技术栈公开合同函数的名称与参数签名。 */',
      `export function ${spec.exposed}(options, cell, frameCount) { return tools.createVideoAtlasContract(options, cell, frameCount); }`, '', cli, '',
      '// 保留原守卫的文件身份，模块导入不触发命令行。',
      'const currentFile = resolve(fileURLToPath(import.meta.url));',
      'const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;',
      'if (isDirectEntry(import.meta.url)) process.exitCode = await runVideoAtlasCli();', '',
    ].join('\n');
    sources.push({ stack, sourcePath, sourceSha256, adapterDestination: destination, adapterContent: adapter, transforms: ['share-video-atlas-execution', 'inject-stack-video-contract-and-cli'] });
  }
  const content = [
    'import { createHash } from "node:crypto";', 'import { spawn } from "node:child_process";', 'import { createReadStream } from "node:fs";',
    'import { mkdtemp, readdir, rm, stat } from "node:fs/promises";', 'import { basename, dirname, extname, join, resolve } from "node:path";', 'import { tmpdir } from "node:os";', '',
    '/** 将视频提取和写入步骤绑定到技术栈独立的资源合同与图像处理器。 */',
    'export function createVideoAtlasTools({ core, sharp, schema, contractMethod, contractKey, toolName, temporaryPrefix, includeRuntimeBinding } = {}) {',
    `  const { ${CORE.join(', ')} } = core ?? {};`,
    `  if ([${CORE.join(', ')}, sharp, core?.[contractMethod]].some((item) => typeof item !== "function")) throw new TypeError("视频图集缺少必要的栈合同或图像依赖");`,
    '  if (![schema, contractMethod, contractKey, toolName, temporaryPrefix].every((value) => typeof value === "string" && value)) throw new TypeError("视频图集缺少技术栈配置");',
    '  const VIDEO_ATLAS_SCHEMA = schema;', '  const createAtlasContract = core[contractMethod];',
    ...adaptAnimationPreviewGeneration(canonical, 'video').split('\n').map((line) => `  ${line}`), `  return { ${OUTPUTS.join(', ')} };`, '}', '',
  ].join('\n');
  return { id: 'web-video-to-atlas', kind: 'module', implementation: IMPLEMENTATION, content, sources, stacks: Object.keys(SPECS), dependencies: [], reason: '严格核对三栈完整源及导出后，共用视频抽帧与写入算法并注入各栈资源合同。' };
}
