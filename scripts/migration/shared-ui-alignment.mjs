/** 将可证明一致的居中算法集中维护，根边界解析仍由各技术栈独立提供。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';

const IMPLEMENTATION = 'skills/app-domain-toolkit/scripts/layout/center-alignment.mjs';
const CENTER_HASH = '25af584ae9095fe1ad2ce4daa3bb5171d0ea4bbff09ca11631ee742d50fd0cb4';
const STACKS = Object.freeze({
  cocos: { skill: 'cocos-game-ui-layout', rootHash: '74243024f9562c65351a381dc2f11445942c3486c4405413bf1c8b01f2de28f6' },
  threejs: { skill: 'threejs-game-ui-layout', rootHash: '8d508d44034961540c0a179d27e94a06044723fc25836cd4012bd82380bee6a0' },
});
const EXPORTS = Object.freeze(['normalizeCenterAlignment', 'resolveCenteredLayoutNodes', 'validateCenterAlignmentNodes']);
const IMPORT = 'import { resolveLayoutRootBounds } from "./layout-root-bounds.mjs";';

/** 计算原始文件摘要；不统一换行，确保任何源变化都需要重新审查。 */
function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** 计算适配入口到目标模块的安全相对导入路径。 */
function moduleSpecifier(from, to) {
  const value = posix.relative(posix.dirname(from), to);
  return value.startsWith('.') ? value : `./${value}`;
}

/** 获取栈内已登记文件，避免把缺失源或越界目标当作共享依据。 */
function recordFor(plan, stack, skill, name, expectedHash) {
  const sourcePath = `skills/${skill}/scripts/${name}.mjs`;
  const entry = plan?.entries?.get(sourcePath);
  const bytes = plan?.sourceBuffers?.get(sourcePath);
  if (!entry || !Buffer.isBuffer(bytes)) throw new Error(`${stack} 居中来源或根边界依赖缺失：${sourcePath}`);
  if (!/^skills\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\:]+$/.test(entry.destination ?? '')) throw new Error(`${stack} 居中目标路径无效：${sourcePath}`);
  if (digest(bytes) !== expectedHash) throw new Error(`${stack} 居中来源或根边界依赖发生漂移：${sourcePath}`);
  return { sourcePath, destination: entry.destination, bytes };
}

/** 生成单一共享工厂及各栈边界解析绑定，不合并 Phaser 专有实现。 */
export function buildSharedUiAlignmentCapability(plans) {
  if (!Array.isArray(plans)) throw new TypeError('居中共享计划需要技术栈迁移计划数组');
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  if (byStack.size !== plans.length) throw new Error('技术栈迁移计划存在重复');
  const sources = [];
  let canonical;
  for (const [stack, spec] of Object.entries(STACKS)) {
    const plan = byStack.get(stack);
    const center = recordFor(plan, stack, spec.skill, 'center-alignment', CENTER_HASH);
    const root = recordFor(plan, stack, spec.skill, 'layout-root-bounds', spec.rootHash);
    const rootText = root.bytes.toString('utf8');
    if (!/^export function resolveLayoutRootBounds\(nodes, canvas, label = "layout_nodes"\) \{/m.test(rootText)) throw new Error(`${stack} 根边界依赖 API 已变化`);
    if (root.destination === center.destination || root.destination === IMPLEMENTATION || center.destination === IMPLEMENTATION) throw new Error(`${stack} 居中共享目标存在冲突`);
    if (canonical && !canonical.equals(center.bytes)) throw new Error('居中算法源字节不一致');
    canonical ??= center.bytes;
    const adapter = [
      `import { resolveLayoutRootBounds } from ${JSON.stringify(moduleSpecifier(center.destination, root.destination))};`,
      `import { createCenterAlignmentTools } from ${JSON.stringify(moduleSpecifier(center.destination, IMPLEMENTATION))};`,
      '',
      'const tools = createCenterAlignmentTools(resolveLayoutRootBounds);',
      `export const { ${EXPORTS.join(', ')} } = tools;`,
      '',
    ].join('\n');
    sources.push({ stack, sourcePath: center.sourcePath, sourceSha256: digest(center.bytes), adapterDestination: center.destination, adapterContent: adapter, transforms: ['share-center-alignment', 'inject-stack-layout-root-bounds'] });
  }

  const source = canonical.toString('utf8').replace(/\r\n/g, '\n');
  if (!source.startsWith(`${IMPORT}\n`) || source.indexOf(IMPORT, IMPORT.length) !== -1) throw new Error('居中算法根边界导入已变化');
  const body = source.slice(IMPORT.length).replace(/^\s*\n/, '');
  const names = [...body.matchAll(/^export (?:async function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
  if (JSON.stringify(names) !== JSON.stringify(EXPORTS)) throw new Error('居中算法公开 API 已变化');
  // 每个适配入口拥有独立闭包，避免跨栈共享注入的根边界解析器。
  const content = [
    '/** 创建按技术栈解析根边界的居中算法。 */',
    'export function createCenterAlignmentTools(resolveLayoutRootBounds) {',
    ...body.replace(/^export /gm, '').trimEnd().split('\n').map((line) => `  ${line}`),
    `  return { ${EXPORTS.join(', ')} };`,
    '}', '',
  ].join('\n');
  return {
    id: 'web-ui-center-alignment', kind: 'module', implementation: IMPLEMENTATION, content,
    stacks: Object.keys(STACKS), sources, dependencies: [],
    reason: 'Cocos 与 Three.js 的居中算法逐字节一致；根边界合同由各栈适配入口注入并独立验证。',
  };
}
