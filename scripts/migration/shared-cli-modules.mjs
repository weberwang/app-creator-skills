/** 将三栈可证明等价的图片工具与补帧规划实现抽成公共 CLI 模块。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { frameResourceTarget } from './source-policy.mjs';

const STACKS = Object.freeze({
  cocos: Object.freeze({
    directory: 'cocos-skills',
    technologyName: 'Cocos',
    schema: 'cocos-image-inbetween-plan/1',
    assetSkill: 'cocos-game-asset-integration',
    frameSkill: 'cocos-frame-animation',
  }),
  phaser: Object.freeze({
    directory: 'phaser-skills',
    technologyName: 'Phaser',
    schema: 'phaser4-image-inbetween-plan/1',
    assetSkill: 'phaser4-game-asset-integration',
    frameSkill: 'phaser4-frame-animation',
  }),
  threejs: Object.freeze({
    directory: 'threejs-skills',
    technologyName: 'ThreeJS',
    schema: 'threejs-image-inbetween-plan/1',
    assetSkill: 'threejs-game-asset-integration',
    frameSkill: 'threejs-frame-animation',
  }),
});

const STACK_NAMES = Object.freeze(Object.keys(STACKS));
const PNG_IMPORT = 'import { decodePngRgba, encodePngRgba } from "./effect_image_raster.mjs";';
const SHARED_PNG_IMPORT = 'import { decodePngRgba, encodePngRgba } from "../../../app-asset-workflow/scripts/png-raster.mjs";';
const SHARED_BACKGROUND_IMPORT = [
  'import {',
  '  BackgroundRemovalError as SharedBackgroundRemovalError,',
  '  sha256Bytes as sharedSha256Bytes,',
  '  parseBackgroundColor as sharedParseBackgroundColor,',
  '  removeConnectedBackground as sharedRemoveConnectedBackground,',
  '  countAlphaPixels as sharedCountAlphaPixels,',
  '} from "../../../app-asset-workflow/scripts/remove-background-local.mjs";',
].join('\n');
const BACKGROUND_EQUIVALENT_DECLARATIONS = Object.freeze([
  'BackgroundRemovalError',
  'sha256Bytes',
  'parseBackgroundColor',
  'removeConnectedBackground',
  'countAlphaPixels',
  'isObject',
  'nonNegativeInteger',
  'validateRgbaImage',
  'matchesBackground',
  'isTraversableBackground',
]);
const SOURCE_GUARDS = Object.freeze({
  background: /^if \(process\.argv\[1\] && resolve\(process\.argv\[1\]\) === fileURLToPath\(import\.meta\.url\)\) await main\(\);\s*$/gm,
  planner: /^if \(process\.argv\[1\] && pathToFileURL\(resolve\(process\.argv\[1\]\)\)\.href === import\.meta\.url\) \{\r?\n  await runCli\(process\.argv\.slice\(2\)\);\r?\n\}\s*$/gm,
});

/** 将父目录或按栈映射的根目录统一解析成源仓库根。 */
function resolveSourceRoot(sourceRoot, stack) {
  if (typeof sourceRoot === 'string') return path.resolve(sourceRoot, STACKS[stack].directory);
  if (sourceRoot && typeof sourceRoot === 'object' && typeof sourceRoot[stack] === 'string') {
    return path.resolve(sourceRoot[stack]);
  }
  throw new TypeError('sourceRoot 必须是 Git 父目录或包含 cocos、phaser、threejs 根路径的对象');
}

/** 读取源文件原始字节，既保留换行差异证据，也生成真实 SHA-256。 */
function readSource(sourceRoot, stack, sourcePath) {
  const absolutePath = path.join(resolveSourceRoot(sourceRoot, stack), ...sourcePath.split('/'));
  let bytes;
  try {
    bytes = readFileSync(absolutePath);
  } catch (error) {
    throw new Error(`无法读取 ${stack} 源文件 ${absolutePath}：${error.message}`);
  }
  return {
    bytes,
    text: bytes.toString('utf8'),
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

/** 对允许的单一差异做唯一替换，源漂移时立即失败。 */
function replaceExactlyOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + from.length) >= 0) {
    throw new Error(`${label} 必须恰好出现一次`);
  }
  return `${text.slice(0, first)}${to}${text.slice(first + from.length)}`;
}

/** 提取一个唯一的直接执行入口，避免共享工厂误吸收栈私有启动代码。 */
function removeDirectGuard(text, guardPattern, label) {
  const matches = [...text.matchAll(guardPattern)];
  if (matches.length !== 1) throw new Error(`${label} 的直接执行入口应恰好出现一次`);
  return `${text.slice(0, matches[0].index)}${text.slice(matches[0].index + matches[0][0].length)}`.trimEnd();
}

/** 规范化换行，仅用于比较；输出仍由源内容构造并统一写成 LF。 */
function normalizeNewlines(text) {
  return text.replace(/\r\n?/g, '\n');
}

/** 验证去背报告中唯一的引擎名称差异，并返回栈名占位文本。 */
function normalizeBackgroundTechnology(text, technologyName, stack) {
  const lines = [...text.matchAll(/^(\s*limitation: ")([^"\r\n]*)(",\s*)$/gm)];
  if (lines.length !== 1) throw new Error(`${stack} 去背记录必须只包含一条 limitation 字段`);
  const sentence = lines[0][2];
  const nameCount = sentence.split(technologyName).length - 1;
  if (nameCount !== 1 || !sentence.includes(`${technologyName} 特效路线`)) {
    throw new Error(`${stack} 去背 limitation 未保持预期技术名：${technologyName}`);
  }
  const replacedSentence = replaceExactlyOnce(sentence, `${technologyName} 特效路线`, '[[TECHNOLOGY]] 特效路线', `${stack} limitation 技术名`);
  const oldLine = lines[0][0];
  const newLine = `${lines[0][1]}${replacedSentence}${lines[0][3]}`;
  return replaceExactlyOnce(text, oldLine, newLine, `${stack} limitation 行`);
}

/** 校验透明度工具三份源码仅依赖了可替换的本地 PNG codec。 */
function normalizeTransparentSource(text, stack) {
  return normalizeNewlines(replaceExactlyOnce(text, PNG_IMPORT, '[[PNG_CODEC_IMPORT]]', `${stack} transparent-raster codec import`));
}

/** 校验去背工具差异严格限于本地 codec 引用与报告技术名。 */
function normalizeBackgroundSource(text, stack) {
  const codecNormalized = replaceExactlyOnce(text, PNG_IMPORT, '[[PNG_CODEC_IMPORT]]', `${stack} remove-background codec import`);
  return normalizeNewlines(normalizeBackgroundTechnology(codecNormalized, STACKS[stack].technologyName, stack));
}

/** 校验补帧规划三份源码差异严格限于各栈输出 schema。 */
function normalizePlannerSource(text, stack) {
  const schemaLine = `const PLAN_SCHEMA = "${STACKS[stack].schema}";`;
  const normalized = replaceExactlyOnce(text, schemaLine, 'const PLAN_SCHEMA = "[[PLAN_SCHEMA]]";', `${stack} PLAN_SCHEMA`);
  return normalizeNewlines(normalized);
}

/** 将源模块导出改为工厂局部声明，并从导出声明提取既有 API 名。 */
function localizeExports(sourceText, label) {
  const names = [...sourceText.matchAll(/^export (?:async function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm)]
    .map((match) => match[1]);
  if (!names.length || new Set(names).size !== names.length) throw new Error(`${label} 的导出声明为空或存在重复`);
  return { sourceText: sourceText.replace(/^export /gm, ''), names };
}

/** 仅解析约定的顶层函数/类边界，拒绝缺失、重名或无法确定的声明。 */
function extractTopLevelDeclaration(sourceText, name, label) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declarationPattern = new RegExp(`^(?:export\\s+)?(?:(?:async\\s+)?function|class)\\s+${escapedName}\\b`, 'gm');
  const matches = [...sourceText.matchAll(declarationPattern)];
  if (matches.length !== 1) throw new Error(`${label} 中 ${name} 顶层声明应恰好出现一次`);
  const start = matches[0].index;
  const tail = sourceText.slice(start);
  const closingMatches = [...tail.matchAll(/^}\s*$/gm)];
  if (!closingMatches.length) throw new Error(`${label} 中 ${name} 缺少独立顶层结束行`);
  const closing = closingMatches[0];
  const end = start + closing.index + closing[0].length;
  return { start, end, declaration: sourceText.slice(start, end) };
}

/** 取出声明代码并忽略 export 关键字，以源码实现本身进行严格比对。 */
function normalizedDeclaration(sourceText, name, label) {
  return extractTopLevelDeclaration(sourceText, name, label).declaration.replace(/^export /, '');
}

/** 移除唯一声明和其紧邻文档注释，避免工厂重复携带公共纯算法正文。 */
function removeTopLevelDeclaration(sourceText, name, label) {
  const span = extractTopLevelDeclaration(sourceText, name, label);
  let start = span.start;
  const commentStart = sourceText.lastIndexOf('/**', start);
  if (commentStart >= 0) {
    const commentEnd = sourceText.indexOf('*/', commentStart);
    if (commentEnd >= 0 && commentEnd < start && sourceText.slice(commentEnd + 2, start).trim() === '') start = commentStart;
  }
  let end = span.end;
  while (sourceText[end] === '\n') end += 1;
  return `${sourceText.slice(0, start)}${sourceText.slice(end)}`;
}

/** 对照公共 PNG 去背真源验证共享 API 与闭包辅助函数，保留 Web 的 64 容差政策。 */
function assertWebBackgroundApisMatchPublic(webSource, publicSource, stack) {
  const webText = normalizeNewlines(webSource);
  const publicText = normalizeNewlines(publicSource);
  for (const name of BACKGROUND_EQUIVALENT_DECLARATIONS) {
    const webDeclaration = normalizedDeclaration(webText, name, `${stack} Web 去背源`);
    const publicDeclaration = normalizedDeclaration(publicText, name, 'app-asset-workflow 去背公共源');
    if (webDeclaration !== publicDeclaration) throw new Error(`${stack} 的 ${name} 与公共去背真源不等价，拒绝生成共享导入`);
  }

  const webTolerance = normalizedDeclaration(webText, 'parseColorTolerance', `${stack} Web 去背源`);
  let publicTolerance = normalizedDeclaration(publicText, 'parseColorTolerance', 'app-asset-workflow 去背公共源');
  publicTolerance = replaceExactlyOnce(publicTolerance, 'value > Math.sqrt(3 * 255 ** 2)', 'value > 64', '公共容差上限');
  publicTolerance = replaceExactlyOnce(publicTolerance, '0 到 441.67', '0 到 64', '公共容差错误信息');
  if (webTolerance !== publicTolerance) throw new Error(`${stack} 的 parseColorTolerance 已超出已知 Web 64 容差差异，拒绝生成`);
}

/** 为适配器计算指向共享实现的稳定相对 ESM 路径。 */
function relativeModuleSpecifier(adapterDestination, implementation) {
  let result = path.posix.relative(path.posix.dirname(adapterDestination), implementation);
  if (!result.startsWith('.')) result = `./${result}`;
  return result;
}

/** 生成透明度工具公共实现，保留完整像素与预览路径算法。 */
function buildTransparentRasterCapability(sourceRoot) {
  const implementation = 'skills/app-domain-toolkit/scripts/image/transparent-raster.mjs';
  const sources = [];
  let normalizedReference;
  let canonicalContent;

  for (const stack of STACK_NAMES) {
    const sourcePath = `skills/${STACKS[stack].assetSkill}/scripts/transparent-raster.mjs`;
    const source = readSource(sourceRoot, stack, sourcePath);
    const normalized = normalizeTransparentSource(source.text, stack);
    if (normalizedReference !== undefined && normalized !== normalizedReference) {
      throw new Error(`transparent-raster 三栈源码存在未批准差异：${stack}`);
    }
    normalizedReference ??= normalized;
    const normalizedText = replaceExactlyOnce(source.text, PNG_IMPORT, SHARED_PNG_IMPORT, `${stack} transparent-raster codec import`);
    canonicalContent ??= `${normalizeNewlines(normalizedText).trimEnd()}\n`;
    const adapterDestination = `skills/${STACKS[stack].assetSkill}/scripts/transparent-raster.mjs`;
    const specifier = relativeModuleSpecifier(adapterDestination, implementation);
    sources.push({
      stack,
      sourcePath,
      sourceSha256: source.sourceSha256,
      adapterDestination,
      adapterContent: `export * from "${specifier}";\n`,
      transforms: ['share-transparent-raster', 'replace-stack-local-png-codec-with-public-codec'],
    });
  }

  return {
    id: 'web-transparent-raster',
    kind: 'module',
    implementation,
    content: canonicalContent,
    stacks: [...STACK_NAMES],
    sources,
    dependencies: ['skills/app-asset-workflow/scripts/png-raster.mjs'],
    reason: '三栈透明像素统计、预览路径保护与深浅底合成实现逐字一致；只把依赖接到现有公共 PNG codec，保留所有导出和像素算法。',
  };
}

/** 生成 Web 专业去背工厂，保留硬边、色彩分离、证据与 CLI 全部门禁。 */
function buildBackgroundRemovalCapability(sourceRoot, repositoryRoot) {
  const implementation = 'skills/app-domain-toolkit/scripts/image/remove-background-local.mjs';
  const publicBackgroundPath = 'skills/app-asset-workflow/scripts/remove-background-local.mjs';
  let publicBackgroundSource;
  try {
    publicBackgroundSource = readFileSync(path.join(repositoryRoot, ...publicBackgroundPath.split('/')), 'utf8');
  } catch (error) {
    throw new Error(`无法读取公共去背真源 ${publicBackgroundPath}：${error.message}`);
  }
  const sources = [];
  let normalizedReference;
  let canonicalTemplate;

  for (const stack of STACK_NAMES) {
    const sourcePath = `skills/${STACKS[stack].assetSkill}/scripts/remove-background-local.mjs`;
    const source = readSource(sourceRoot, stack, sourcePath);
    const normalized = normalizeBackgroundSource(source.text, stack);
    if (normalizedReference !== undefined && normalized !== normalizedReference) {
      throw new Error(`remove-background-local 三栈源码存在超出 limitation 技术名的差异：${stack}`);
    }
    normalizedReference ??= normalized;
    assertWebBackgroundApisMatchPublic(source.text, publicBackgroundSource, stack);

    const sourceText = normalizeNewlines(source.text);
    const firstDeclaration = sourceText.indexOf('/** 本工具输出记录的稳定 schema。 */');
    if (firstDeclaration < 0) throw new Error(`${stack} 去背源缺少稳定 schema 声明锚点`);
    const withoutGuard = removeDirectGuard(sourceText, SOURCE_GUARDS.background, `${stack} remove-background CLI`);
    const sourceBody = withoutGuard.slice(firstDeclaration).trimEnd();
    const localized = localizeExports(sourceBody, `${stack} remove-background-local`);
    const limitationMatch = [...localized.sourceText.matchAll(/^(\s*)limitation: "([^"\r\n]*)",$/gm)];
    if (limitationMatch.length !== 1) throw new Error(`${stack} 去背共享体无法定位唯一 limitation 字段`);
    const limitationLine = limitationMatch[0][0];
    const limitationSentence = limitationMatch[0][2];
    const techPhrase = `${STACKS[stack].technologyName} 特效路线`;
    if (!limitationSentence.includes(techPhrase)) throw new Error(`${stack} 去背共享体缺少 ${techPhrase}`);
    const techOffset = limitationSentence.indexOf(STACKS[stack].technologyName);
    const dynamicLimitation = `${limitationMatch[0][1]}limitation: ${JSON.stringify(limitationSentence.slice(0, techOffset))} + technologyName + ${JSON.stringify(limitationSentence.slice(techOffset + STACKS[stack].technologyName.length))},`;
    let transformedBody = replaceExactlyOnce(localized.sourceText, limitationLine, dynamicLimitation, `${stack} limitation 技术名注入`);
    for (const name of [
      'BackgroundRemovalError',
      'sha256Bytes',
      'parseBackgroundColor',
      'removeConnectedBackground',
      'countAlphaPixels',
      'isTraversableBackground',
    ]) {
      transformedBody = removeTopLevelDeclaration(transformedBody, name, `${stack} Web 去背共享体`);
    }
    const importsEnd = sourceText.indexOf('export const LOCAL_BACKGROUND_REMOVAL_SCHEMA');
    const importPrefix = sourceText.slice(0, importsEnd)
      .replace(PNG_IMPORT, SHARED_PNG_IMPORT)
      .replace('import { createHash } from "node:crypto";\n', '')
      .replace('import { fileURLToPath } from "node:url";\n', '');
    replaceExactlyOnce(importPrefix, `import { assertTransparencyPreviewPathsAvailable, writeTransparencyPreviews } from "./transparent-raster.mjs";`, `import { assertTransparencyPreviewPathsAvailable, writeTransparencyPreviews } from "./transparent-raster.mjs";`, `${stack} shared transparent import`);
    const prefix = `${importPrefix.trimEnd()}\n${SHARED_BACKGROUND_IMPORT}`;
    const exportedNames = localized.names;
    const returnedNames = [...exportedNames, 'main'];
    const candidate = [
      prefix.trimEnd(),
      '',
      '/** 创建保留 Web 专业去背门禁与机器记录结构的栈配置工具集。 */',
      'export function createBackgroundRemovalTools({ technologyName } = {}) {',
      '  if (typeof technologyName !== "string" || technologyName.trim() === "") throw new TypeError("technologyName 必须是非空字符串");',
      '  const BackgroundRemovalError = SharedBackgroundRemovalError;',
      '  const sha256Bytes = sharedSha256Bytes;',
      '  const parseBackgroundColor = sharedParseBackgroundColor;',
      '  const countAlphaPixels = sharedCountAlphaPixels;',
      '  /** Web 栈保留 0..64 的容差门禁，像素遍历本身复用公共实现。 */',
      '  function removeConnectedBackground(image, options = {}) {',
      '    validateRgbaImage(image);',
      '    const backgroundColor = parseBackgroundColor(options.backgroundColor ?? options.background_color);',
      '    const tolerance = parseColorTolerance(options.tolerance);',
      '    return sharedRemoveConnectedBackground(image, { backgroundColor, tolerance });',
      '  }',
      '',
      ...transformedBody.split('\n').map((line) => `  ${line}`),
      `  return { ${returnedNames.join(', ')} };`,
      '}',
      '',
    ].join('\n');
    if (canonicalTemplate === undefined) canonicalTemplate = candidate;
    else if (candidate !== canonicalTemplate) throw new Error(`remove-background-local 规范化后仍存在差异：${stack}`);

    const adapterDestination = sourcePath;
    const specifier = relativeModuleSpecifier(adapterDestination, implementation);
    const entrySpecifier = relativeModuleSpecifier(adapterDestination, 'skills/app-skill-runtime/direct-entry.mjs');
    const adapter = buildBackgroundAdapter(specifier, entrySpecifier, STACKS[stack].technologyName, exportedNames);
    sources.push({
      stack,
      sourcePath,
      sourceSha256: source.sourceSha256,
      adapterDestination,
      adapterContent: adapter,
      transforms: ['share-web-background-removal-pipeline', 'inject-stack-technology-name', 'reuse-app-asset-background-pure-apis', 'retain-web-64-tolerance-policy', 'use-shared-transparent-raster-and-public-png-codec'],
    });
  }

  return {
    id: 'web-background-removal',
    kind: 'module',
    implementation,
    content: canonicalTemplate,
    stacks: [...STACK_NAMES],
    sources,
    dependencies: [
      'skills/app-asset-workflow/scripts/png-raster.mjs',
      publicBackgroundPath,
      'skills/app-domain-toolkit/scripts/image/transparent-raster.mjs',
      'skills/app-skill-runtime/direct-entry.mjs',
    ],
    reason: '共享像素填充算法与完全等价的公共纯 API；保留 Web 自有 0..64 容差及 hard-edge/color-separation-verified 门禁、edge_profile、transparency_preview、背景检查、SHA 证据、错误结构与原 CLI。',
  };
}

/** 为各专业去背入口生成完整薄适配器，并在直接执行时继续启动原 CLI。 */
function buildBackgroundAdapter(specifier, entrySpecifier, technologyName, exportedNames) {
  const exportsText = exportedNames.join(',\n  ');
  return [
    '#!/usr/bin/env node',
    `import { isDirectEntry } from "${entrySpecifier}";`,
    `import { createBackgroundRemovalTools } from "${specifier}";`,
    '',
    `const tools = createBackgroundRemovalTools({ technologyName: ${JSON.stringify(technologyName)} });`,
    `export const {\n  ${exportsText},\n} = tools;`,
    '',
    '/** 仅在直接执行专业入口时启动 CLI；模块导入保持无副作用。 */',
    'if (isDirectEntry(import.meta.url)) await tools.main();',
    '',
  ].join('\n');
}

/** 生成补帧规划工厂，保留帧量化、循环闭合、关键帧与独占写入算法。 */
function buildImageInbetweenCapability(sourceRoot) {
  const implementation = 'skills/app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs';
  const sources = [];
  let normalizedReference;
  let canonicalTemplate;

  for (const stack of STACK_NAMES) {
    const sourcePath = `skills/${STACKS[stack].frameSkill}/scripts/image-inbetween-plan.mjs`;
    const source = readSource(sourceRoot, stack, sourcePath);
    const normalized = normalizePlannerSource(source.text, stack);
    if (normalizedReference !== undefined && normalized !== normalizedReference) {
      throw new Error(`image-inbetween-plan 三栈源码存在 PLAN_SCHEMA 以外的差异：${stack}`);
    }
    normalizedReference ??= normalized;

    const sourceText = normalizeNewlines(source.text);
    const bodyStart = sourceText.indexOf('/** 图片递归补帧规划的稳定输出 schema。 */');
    if (bodyStart < 0) throw new Error(`${stack} 补帧规划源缺少 PLAN_SCHEMA 注释锚点`);
    const withoutGuard = removeDirectGuard(sourceText, SOURCE_GUARDS.planner, `${stack} image-inbetween CLI`);
    let sourceBody = withoutGuard.slice(bodyStart).trimEnd();
    sourceBody = replaceExactlyOnce(sourceBody, `const PLAN_SCHEMA = "${STACKS[stack].schema}";`, 'const PLAN_SCHEMA = planSchema;', `${stack} PLAN_SCHEMA 工厂化`);
    const localized = localizeExports(sourceBody, `${stack} image-inbetween-plan`);
    const imports = sourceText.slice(0, bodyStart)
      .replace('import { pathToFileURL } from "node:url";\n', '');
    const candidate = [
      imports.trimEnd(),
      '',
      '/** 创建使用指定栈 schema 的共享图片补帧规划 API 与 CLI。 */',
      'export function createImageInbetweenTools({ planSchema } = {}) {',
      '  if (typeof planSchema !== "string" || planSchema.trim() === "") throw new TypeError("planSchema 必须是非空字符串");',
      ...localized.sourceText.split('\n').map((line) => `  ${line}`),
      `  return { ${[...localized.names, 'runCli'].join(', ')} };`,
      '}',
      '',
    ].join('\n');
    if (canonicalTemplate === undefined) canonicalTemplate = candidate;
    else if (candidate !== canonicalTemplate) throw new Error(`image-inbetween-plan 规范化后仍存在差异：${stack}`);

    const adapterDestination = frameResourceTarget(stack, sourcePath);
    const specifier = relativeModuleSpecifier(adapterDestination, implementation);
    const entrySpecifier = relativeModuleSpecifier(adapterDestination, 'skills/app-skill-runtime/direct-entry.mjs');
    const adapter = buildPlannerAdapter(specifier, entrySpecifier, STACKS[stack].schema, localized.names);
    sources.push({
      stack,
      sourcePath,
      sourceSha256: source.sourceSha256,
      adapterDestination,
      adapterContent: adapter,
      transforms: ['share-image-inbetween-planner', 'inject-stack-plan-schema'],
    });
  }

  return {
    id: 'web-image-inbetween-plan',
    kind: 'module',
    implementation,
    content: canonicalTemplate,
    stacks: [...STACK_NAMES],
    sources,
    dependencies: ['skills/app-skill-runtime/direct-entry.mjs'],
    reason: '三栈帧量化、循环闭合、关键帧验证、分层补帧顺序、CLI 与独占写入实现相同；只通过 planSchema 保留各专业输出身份。',
  };
}

/** 为各专业帧动画入口保留既有导出名、stack schema 与直接运行 CLI。 */
function buildPlannerAdapter(specifier, entrySpecifier, planSchema, exportedNames) {
  return [
    '#!/usr/bin/env node',
    `import { isDirectEntry } from "${entrySpecifier}";`,
    `import { createImageInbetweenTools } from "${specifier}";`,
    '',
    `const tools = createImageInbetweenTools({ planSchema: ${JSON.stringify(planSchema)} });`,
    `export const {\n  ${exportedNames.join(',\n  ')},\n} = tools;`,
    '',
    '/** 仅在直接执行专业入口时运行原 CLI；导入工具 API 不触发文件写入。 */',
    'if (isDirectEntry(import.meta.url)) {',
    '  await tools.runCli(process.argv.slice(2));',
    '}',
    '',
  ].join('\n');
}

/** 生成三个 Web 共用工具模块与九个保持专业路径的适配器计划。 */
export function buildSharedCliPlan({ sourceRoot, repositoryRoot }) {
  if (typeof repositoryRoot !== 'string' || repositoryRoot.trim() === '') {
    throw new TypeError('repositoryRoot 必须是非空路径');
  }
  // 确认根路径可解析，防止调用端传入无效值后计划静默落到当前目录。
  path.resolve(repositoryRoot);
  const capabilities = [
    buildTransparentRasterCapability(sourceRoot),
    buildBackgroundRemovalCapability(sourceRoot, repositoryRoot),
    buildImageInbetweenCapability(sourceRoot),
  ];
  return { capabilities };
}
