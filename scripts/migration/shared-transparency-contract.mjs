/** 将三栈相同的透明生产合同集中维护，显式绑定各栈自己的路线校验器。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';

const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/visual/visual-transparent-background-contract.mjs';
const SOURCE_HASH = 'acda95f093850af60c4011b3d971b47c668b5b9ffceb8a62db7cfdfa981a6b00';
const STACKS = Object.freeze({
  cocos: { skill: 'cocos-game-workflow-control', dependencyHash: '4244c5bbb7595d798e154924457405169254991fd5e74a30ccfb0eb7b30a339a' },
  phaser: { skill: 'phaser4-game-workflow-control', dependencyHash: '0df931e5f79259bbe22ffca71de9873794ec342487976bed5ebe4995d8b89b6a' },
  threejs: { skill: 'threejs-game-workflow-control', dependencyHash: '5b90089c1049cc880944998ab89194bf007d4ba89e4e1048ed72ef4522b81249' },
});
const DEPS = Object.freeze(['TRANSPARENT_EDGE_PROFILES', 'TRANSPARENT_ROUTES', 'validateTransparencyPreview', 'validateTransparencyRoute']);
const EXPORTS = Object.freeze([
  'TRANSPARENT_SOURCE_BACKGROUND_MODES', 'TRANSPARENT_FINAL_BACKGROUND_MODE', 'TRANSPARENT_BACKGROUND_STRATEGY',
  'TRANSPARENT_BACKGROUND_STRATEGIES', 'BACKGROUND_REMOVAL_OPERATION', 'MAX_BACKGROUND_REMOVAL_ATTEMPTS',
  'DEFAULT_SOURCE_BACKGROUND_COLOR', 'normalizeSourceBackgroundColor', 'buildSolidBackgroundPrompt',
  'TRANSPARENT_BACKGROUND_REMOVAL_PROMPT', 'requiresTransparentBackgroundProduction', 'isBackgroundRemovalProduction',
  'expressesSolidBackgroundProduction', 'expressesBackgroundRemovalProduction', 'expressesDirectAlphaProduction',
  'validateTransparentExpectedAssetContract', 'validateTransparentBackgroundProductionRecord',
  'validateTransparentOutputMetadata', 'validateTransparentBackgroundContract',
]);
const IMPORT = `import { ${DEPS.join(', ')} } from "./transparent-route-contract.mjs";`;

/** 摘要同时约束内容和已审计的依赖，源规则变更必须重新检查。 */
function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** 技术栈适配和其路线依赖均必须留在该栈自己的领域目录。 */
function assertTarget(stack, target) {
  if (typeof target !== 'string' || !target.startsWith(`skills/${stack}-domain-contracts/`)
    || /[\\:]/.test(target) || target.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`${stack} 透明合同目标路径无效`);
  }
}

/** 将技能内的两个目标转为可复现的相对模块导入。 */
function specifier(from, to) {
  const relative = posix.relative(posix.dirname(from), to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** 逐栈验证源文件、路线依赖及目标，构造公共工厂和原生适配计划。 */
export function buildSharedTransparencyContractCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('透明合同共享计划必须提供技术栈迁移计划数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('技术栈迁移计划包含重复栈');
  const sources = [];
  let canonical;
  const destinations = new Set();
  for (const [stack, spec] of Object.entries(STACKS)) {
    const plan = byStack.get(stack);
    const prefix = `skills/${spec.skill}/scripts/`;
    const sourcePath = `${prefix}visual-transparent-background-contract.mjs`;
    const dependencyPath = `${prefix}transparent-route-contract.mjs`;
    const bytes = plan?.sourceBuffers?.get(sourcePath);
    const dependency = plan?.sourceBuffers?.get(dependencyPath);
    const target = plan?.entries?.get(sourcePath)?.destination;
    const dependencyTarget = plan?.entries?.get(dependencyPath)?.destination;
    if (!Buffer.isBuffer(bytes) || !Buffer.isBuffer(dependency) || !target || !dependencyTarget) throw new Error(`${stack} 透明合同或路线依赖缺失`);
    assertTarget(stack, target);
    assertTarget(stack, dependencyTarget);
    if (destinations.has(target) || target === dependencyTarget) throw new Error(`${stack} 透明合同目标冲突`);
    destinations.add(target);
    if (digest(bytes) !== SOURCE_HASH) throw new Error(`${stack} 透明合同源字节漂移，需要重新审查`);
    if (digest(dependency) !== spec.dependencyHash) throw new Error(`${stack} 透明路线依赖漂移，需要重新审查`);
    canonical ??= bytes;
    // 路线约束属于技术栈合同，依赖由各自适配器注入而非公共工厂反向导入。
    const adapterContent = [
      `import { createTransparencyProductionContract } from ${JSON.stringify(specifier(target, IMPLEMENTATION))};`,
      `import { ${DEPS.join(', ')} } from ${JSON.stringify(specifier(target, dependencyTarget))};`,
      '',
      `const contract = createTransparencyProductionContract({ ${DEPS.join(', ')} });`,
      `export const { ${EXPORTS.join(', ')} } = contract;`, '',
    ].join('\n');
    sources.push({ stack, sourcePath, sourceSha256: digest(bytes), adapterDestination: target, adapterContent, transforms: ['share-transparency-production-contract', 'inject-stack-transparency-route'] });
  }
  let body;
  try { body = new TextDecoder('utf-8', { fatal: true }).decode(canonical).replace(/\r\n?/g, '\n'); }
  catch { throw new Error('透明生产合同不是有效 UTF-8'); }
  const importIndex = body.indexOf(IMPORT);
  if (importIndex < 0 || body.indexOf(IMPORT, importIndex + IMPORT.length) !== -1) throw new Error('透明路线导入缺失或不唯一');
  body = body.slice(0, importIndex) + body.slice(importIndex + IMPORT.length);
  if (/^\s*(?:import|export\s*\{|export\s+default)\b/m.test(body) || /\bimport\s*\(|\bimport\.meta\b|\brequire\s*\(|\bprocess\./.test(body)) throw new Error('透明合同含未审核的模块上下文或导出');
  const names = [...body.matchAll(/^export (?:async function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
  if (JSON.stringify(names) !== JSON.stringify(EXPORTS)) throw new Error('透明合同导出 API 已变化');
  body = body.replace(/^export /gm, '').trim();
  const content = [
    '/** 创建绑定当前技术栈透明路线合同的生产校验器。 */',
    `export function createTransparencyProductionContract({ ${DEPS.join(', ')} } = {}) {`,
    '  if (!Array.isArray(TRANSPARENT_EDGE_PROFILES) || !Array.isArray(TRANSPARENT_ROUTES) || typeof validateTransparencyPreview !== "function" || typeof validateTransparencyRoute !== "function") throw new TypeError("必须提供技术栈的完整透明路线合同");',
    ...body.split('\n').map((line) => `  ${line}`),
    `  return { ${EXPORTS.join(', ')} };`, '}', '',
  ].join('\n');
  return { id: 'web-transparency-production-contract', kind: 'module', implementation: IMPLEMENTATION, content, stacks: Object.keys(STACKS), sources, dependencies: [], reason: '三栈透明生产合同源字节一致，公共算法显式注入各栈路线与预览合同。' };
}
