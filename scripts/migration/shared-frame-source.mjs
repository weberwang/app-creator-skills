/** 提取三栈图片帧来源校验器的共同算法，并明确注入栈专属 schema 与延迟图片加载器。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';

const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/animation/image-frame-source.mjs';
const STACKS = Object.freeze({
  cocos: { skill: 'cocos-frame-animation', schema: 'cocos-image-frame-source/1', sourceSharp: '../../cocos-game-workflow-control/scripts/runtime/image-runtime.mjs', runtimeSharp: 'skills/cocos-domain-contracts/scripts/runtime/image-runtime.mjs' },
  phaser: { skill: 'phaser4-frame-animation', schema: 'phaser4-image-frame-source/1', sourceSharp: 'sharp', runtimeSharp: 'skills/app-skill-runtime/sharp.mjs' },
  threejs: { skill: 'threejs-frame-animation', schema: 'threejs-image-frame-source/1', sourceSharp: 'sharp', runtimeSharp: 'skills/app-skill-runtime/sharp.mjs' },
});
const EXPORTS = Object.freeze(['IMAGE_FRAME_SOURCE_SCHEMA', 'imageFrameTimeMatches', 'validateImageFrameSource', 'ImageFrameSourceError', 'readImageFrameSource']);

/** 精确匹配唯一变体，避免新增的源差异被当作技术栈名称自动抹去。 */
function replaceOnce(text, before, after, label) {
  const index = text.indexOf(before);
  if (index < 0 || text.indexOf(before, index + before.length) >= 0) throw new Error(`${label} 必须恰好出现一次`);
  return `${text.slice(0, index)}${after}${text.slice(index + before.length)}`;
}

/** 把栈名称和 Sharp 来源作为唯一差异；算法、消息及所有安全约束必须逐字一致。 */
function normalizeSource(buffer, stack, spec) {
  let text = buffer.toString('utf8').replace(/\r\n?/g, '\n');
  text = replaceOnce(text, `export const IMAGE_FRAME_SOURCE_SCHEMA = "${spec.schema}";`, 'export const IMAGE_FRAME_SOURCE_SCHEMA = "[[SCHEMA]]";', `${stack} schema`);
  text = replaceOnce(text, `import("${spec.sourceSharp}")`, '[[SHARP_IMPORT]]', `${stack} Sharp 导入`);
  // 两源额外空行只位于 node:path 导入之后，不忽略其他正文空白差异。
  const marker = 'import { isAbsolute, relative, resolve, sep } from "node:path";\n';
  text = replaceOnce(text, marker, marker, `${stack} 路径导入`);
  text = text.replace(`${marker}\n`, marker);
  return text;
}

/** 计算专业目标到公共实现或依赖桥的 ESM 相对路径。 */
function moduleSpecifier(from, to) {
  const relative = posix.relative(posix.dirname(from), to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 从源计划构建一次公共工厂及三栈适配；迁移器负责安全写入和账本绑定。 */
export function buildSharedFrameSourceCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('帧来源共享计划必须提供技术栈迁移计划数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('技术栈迁移计划存在重复');
  let reference;
  const sources = [];
  for (const [stack, spec] of Object.entries(STACKS)) {
    const plan = byStack.get(stack);
    const sourcePath = `skills/${spec.skill}/scripts/image-frame-source.mjs`;
    const bytes = plan?.sourceBuffers?.get(sourcePath);
    const entry = plan?.entries?.get(sourcePath);
    if (!Buffer.isBuffer(bytes) || !entry?.destination) throw new Error(`${stack} 图片帧来源缺少已登记的源文件或专业目标：${sourcePath}`);
    if (!/^skills\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\:]+$/.test(entry.destination)) throw new Error(`${stack} 图片帧来源专业目标无效`);
    const normalized = normalizeSource(bytes, stack, spec);
    if (reference !== undefined && normalized !== reference) throw new Error(`image-frame-source 三栈源码存在 schema、Sharp 来源以外的差异：${stack}`);
    reference ??= normalized;
    const specifier = moduleSpecifier(entry.destination, IMPLEMENTATION);
    const sharpSpecifier = moduleSpecifier(entry.destination, spec.runtimeSharp);
    // 延迟加载回调保留每栈原有的解析位置；缺少 Sharp 时仍允许静态合同导入。
    const adapter = [
      `import { createImageFrameSourceTools } from ${JSON.stringify(specifier)};`,
      '',
      `const tools = createImageFrameSourceTools({ schema: ${JSON.stringify(spec.schema)}, loadSharpModule: () => import(${JSON.stringify(sharpSpecifier)}) });`,
      `export const { ${EXPORTS.join(', ')} } = tools;`,
      '',
    ].join('\n');
    sources.push({ stack, sourcePath, sourceSha256: createHash('sha256').update(bytes).digest('hex'), adapterDestination: entry.destination, adapterContent: adapter, transforms: ['share-image-frame-source', 'inject-stack-frame-schema-and-sharp-loader'] });
  }

  const names = [...reference.matchAll(/^export (?:async function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
  if (JSON.stringify(names) !== JSON.stringify(EXPORTS)) throw new Error('图片帧来源导出 API 已变化，拒绝共享');
  const anchor = '/** 图片帧来源清单的稳定 schema 标识。 */';
  const index = reference.indexOf(anchor);
  if (index < 0 || reference.indexOf(anchor, index + anchor.length) >= 0) throw new Error('图片帧来源正文锚点无效');
  const imports = reference.slice(0, index).trimEnd();
  let body = reference.slice(index).replace(/^export /gm, '').trimEnd();
  body = replaceOnce(body, 'const IMAGE_FRAME_SOURCE_SCHEMA = "[[SCHEMA]]";', 'const IMAGE_FRAME_SOURCE_SCHEMA = schema;', '共享 schema');
  body = replaceOnce(body, '[[SHARP_IMPORT]]', 'loadSharpModule()', '共享 Sharp 延迟加载');
  const content = [imports, '', '/** 创建保留技术栈 schema 和延迟图片加载行为的来源校验器。 */', 'export function createImageFrameSourceTools({ schema, loadSharpModule } = {}) {', '  if (typeof schema !== "string" || !schema.trim() || typeof loadSharpModule !== "function") throw new TypeError("图片帧来源需要有效 schema 和图片加载器");', ...body.split('\n').map((line) => `  ${line}`), `  return { ${EXPORTS.join(', ')} };`, '}', ''].join('\n');
  return { id: 'web-image-frame-source', kind: 'module', implementation: IMPLEMENTATION, content, stacks: Object.keys(STACKS), sources, dependencies: ['skills/app-skill-runtime/sharp.mjs'], reason: '三栈图片来源结构、依赖图、路径和实际图像校验算法一致，按技术栈注入来源 schema 与延迟加载桥。' };
}
