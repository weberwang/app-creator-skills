/** 将逐字节一致的图像归一化合同提炼为注入栈专属路径规则的公共实现。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';

const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/visual/visual-image-normalization-contract.mjs';
const STACKS = Object.freeze({ cocos: 'cocos-game-workflow-control', phaser: 'phaser4-game-workflow-control', threejs: 'threejs-game-workflow-control' });
const EXPORTS = Object.freeze([
  'IMAGE_NORMALIZATION_STATUS', 'IMAGE_NORMALIZATION_OPERATIONS', 'IMAGE_NORMALIZATION_SCHEMA',
  'IMAGE_ASPECT_RATIO_CORRECTION_SCHEMA', 'IMAGE_ASPECT_RATIO_CORRECTION_TRIGGER',
  'IMAGE_ASPECT_RATIO_CORRECTION_STRATEGY', 'IMAGE_NORMALIZATION_OUTPUT_FORMATS',
  'getImageNormalizationRecords', 'getImageNormalizationRecord', 'sameImageAspectRatio', 'validateImageNormalizationContract',
]);
const IMPORTS = Object.freeze([
  'import { readFileSync } from "node:fs";',
  'import { resolve } from "node:path";',
  'import { normalizeProjectRelativePath } from "./visual-component-contract.mjs";',
]);

/** 目标路径只能落在技能目录下，避免生成跨仓库或反向依赖的适配器。 */
function checkDestination(path) {
  if (typeof path !== 'string' || !path.startsWith('skills/') || /[\\:]/.test(path)
    || path.split('/').some((segment) => !segment || segment === '.' || segment === '..')) throw new Error(`共享合同目标路径无效：${path}`);
}

/** 按适配器目标路径生成 ESM 相对引用。 */
function specifier(from, to) {
  const relative = posix.relative(posix.dirname(from), to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 唯一替换合同导入，源结构变化时拒绝猜测。 */
function replaceOnce(text, before, after) {
  const first = text.indexOf(before);
  if (first < 0 || text.indexOf(before, first + before.length) >= 0) throw new Error(`归一化合同导入不唯一：${before}`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}

/** 校验真实三源字节与依赖入口后，生成公共工厂和各栈独立适配计划。 */
export function buildSharedVisualNormalizationCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('视觉归一化共享计划必须提供技术栈迁移计划数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('技术栈迁移计划存在重复');
  let canonical;
  const sources = [];
  for (const [stack, skill] of Object.entries(STACKS)) {
    const plan = byStack.get(stack);
    const sourcePath = `skills/${skill}/scripts/visual-image-normalization-contract.mjs`;
    const componentPath = `skills/${skill}/scripts/visual-component-contract.mjs`;
    const bytes = plan?.sourceBuffers?.get(sourcePath);
    const componentBytes = plan?.sourceBuffers?.get(componentPath);
    const target = plan?.entries?.get(sourcePath)?.destination;
    const componentTarget = plan?.entries?.get(componentPath)?.destination;
    if (!Buffer.isBuffer(bytes) || !Buffer.isBuffer(componentBytes) || !target || !componentTarget) throw new Error(`${stack} 图像归一化合同或组件路径依赖缺失`);
    checkDestination(target);
    checkDestination(componentTarget);
    if (!/export\s*\{[^}]*\bnormalizeProjectRelativePath\b[^}]*\}/s.test(componentBytes.toString('utf8'))
      && !/export\s+(?:function|const)\s+normalizeProjectRelativePath\b/.test(componentBytes.toString('utf8'))) throw new Error(`${stack} 组件合同不再导出路径归一化函数`);
    if (canonical && !bytes.equals(canonical)) throw new Error(`图像归一化合同源字节不一致：${stack}`);
    canonical ??= bytes;
    // 各栈适配器仍显式绑定自己的组件合同，公共工厂不会反向依赖任何技术栈。
    const adapter = [
      `import { createVisualNormalizationContract } from ${JSON.stringify(specifier(target, IMPLEMENTATION))};`,
      `import { normalizeProjectRelativePath } from ${JSON.stringify(specifier(target, componentTarget))};`,
      '', 'const contract = createVisualNormalizationContract({ normalizeProjectRelativePath });',
      `export const { ${EXPORTS.join(', ')} } = contract;`, '',
    ].join('\n');
    sources.push({ stack, sourcePath, sourceSha256: createHash('sha256').update(bytes).digest('hex'), adapterDestination: target, adapterContent: adapter, transforms: ['share-visual-normalization-contract', 'inject-stack-path-contract'] });
  }
  let body;
  try { body = new TextDecoder('utf-8', { fatal: true }).decode(canonical).replace(/\r\n?/g, '\n'); }
  catch { throw new Error('视觉归一化合同源文件不是有效 UTF-8'); }
  for (const line of IMPORTS) body = replaceOnce(body, line, '');
  if (/^\s*import\s/m.test(body) || /\bimport\s*\(|\bimport\.meta\b|\brequire\s*\(/.test(body)) throw new Error('视觉归一化合同新增导入或动态加载，需要重新审查依赖闭包');
  const names = [...body.matchAll(/^export (?:async function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
  if (JSON.stringify(names) !== JSON.stringify(EXPORTS)) throw new Error('视觉归一化合同导出 API 已变化，拒绝共享');
  body = body.replace(/^export /gm, '').trim();
  const content = [IMPORTS[0], IMPORTS[1], '', '/** 创建绑定当前技术栈项目路径规则的视觉归一化合同。 */',
    'export function createVisualNormalizationContract({ normalizeProjectRelativePath } = {}) {',
    '  if (typeof normalizeProjectRelativePath !== "function") throw new TypeError("必须提供技术栈的项目路径归一化函数");',
    ...body.split('\n').map((line) => `  ${line}`), `  return { ${EXPORTS.join(', ')} };`, '}', ''].join('\n');
  return { id: 'web-visual-image-normalization-contract', kind: 'module', implementation: IMPLEMENTATION, content, stacks: Object.keys(STACKS), sources, dependencies: [], reason: '三栈归一化合同源字节一致；统一校验逻辑并显式注入各栈项目路径合同。' };
}
