import { createHash } from 'node:crypto';

/** 仅登记已逐项核对完全一致、允许进入公共参考计划的源文件。 */
const REFERENCES = Object.freeze([
  { id: 'spine-batch-review', capability: 'app-spine-reskin', file: 'batch-review.md', group: 'spine-reskin', members: [['cocos', 'cocos-spine-generative-reskin'], ['phaser', 'phaser4-spine-generative-reskin']] },
  { id: 'effect-image-font', capability: 'app-asset-workflow', file: 'effect-image-font.md', group: 'visual-assets', members: [['cocos', 'cocos-game-asset-integration'], ['phaser', 'phaser4-game-asset-integration'], ['threejs', 'threejs-game-asset-integration']] },
]);

/** 只将无栈内相对链接的来源映射到公共参考目标。 */
export function sharedReferenceTarget(stack, sourcePath) {
  const spec = REFERENCES.find((item) => item.members.some(([memberStack, name]) =>
    memberStack === stack && sourcePath === `skills/${name}/references/${item.file}`));
  return spec ? `skills/app-domain-toolkit/references/${spec.group}/${spec.file}` : null;
}

/** 给合并报告列出需由迁移方重定位的普通相对 Markdown 链接。 */
function relativeLinks(content) {
  const links = new Set();
  for (const match of content.matchAll(/\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g)) {
    const target = match[1] ?? match[2];
    if (!target.startsWith('#') && !target.startsWith('/') && !/^[a-z][a-z\d+.-]*:/i.test(target)) links.add(target);
  }
  return [...links].sort();
}

/** 从迁移计划取得原始字节和已有目的地，防止将缺失文件误当作空内容。 */
function sourceRecord(plansByStack, stack, skillName, filename) {
  const plan = plansByStack.get(stack);
  const sourcePath = `skills/${skillName}/references/${filename}`;
  const entry = plan?.entries?.get(sourcePath);
  const bytes = plan?.sourceBuffers?.get(sourcePath);
  if (!entry || typeof entry.destination !== 'string' || !entry.destination || !Buffer.isBuffer(bytes)) {
    throw new Error(`公共参考来源缺失或无目标：${stack}:${sourcePath}`);
  }
  return { stack, sourcePath, previousDestination: entry.destination, sourceSha256: createHash('sha256').update(bytes).digest('hex'), bytes };
}

/** 只产生完整字节一致且无原生依赖的参考计划；有差异的参考由正文迁移器处理。 */
export function buildSharedIdenticalReferencesPlan(plans) {
  if (!Array.isArray(plans)) throw new TypeError('公共参考计划需要技术栈迁移计划数组');
  const plansByStack = new Map();
  for (const plan of plans) {
    if (!plan || typeof plan.stack !== 'string' || plansByStack.has(plan.stack) || !(plan.entries instanceof Map) || !(plan.sourceBuffers instanceof Map)) {
      throw new Error('技术栈迁移计划缺失字段或存在重复栈');
    }
    plansByStack.set(plan.stack, plan);
  }
  const targets = new Set();
  const usedSources = new Set();
  const ready = [];
  for (const spec of REFERENCES) {
    const implementation = `skills/app-domain-toolkit/references/${spec.group}/${spec.file}`;
    if (targets.has(implementation)) throw new Error(`公共参考目标冲突：${implementation}`);
    targets.add(implementation);
    const records = spec.members.map(([stack, name]) => sourceRecord(plansByStack, stack, name, spec.file));
    const canonical = records[0].bytes;
    for (const record of records) {
      const key = `${record.stack}:${record.sourcePath}`;
      if (usedSources.has(key)) throw new Error(`公共参考来源重复：${key}`);
      usedSources.add(key);
      if (!canonical.equals(record.bytes)) throw new Error(`公共参考源内容不一致：${spec.id} ${key}`);
    }
    for (const plan of plans) {
      for (const entry of plan.entries.values()) {
        if (entry.destination === implementation && !records.some((record) => record.stack === plan.stack && record.sourcePath === entry.sourcePath)) {
          throw new Error(`公共参考目标已被其他来源占用：${implementation}`);
        }
      }
    }
    // 严格 UTF-8 防止非法字节在文本生成时被替换而失去来源真实性。
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(canonical); }
    catch { throw new Error(`公共参考内容不是有效 UTF-8：${spec.id}`); }
    const links = relativeLinks(content);
    const sources = records.map(({ bytes, ...record }) => record);
    if (links.length) throw new Error(`公共参考新增相对链接，必须先核对依赖：${spec.id}`);
    ready.push({
      id: spec.id,
      capability: spec.capability,
      implementation,
      content,
      relativeLinks: links,
      sources,
    });
  }
  return { ready };
}
