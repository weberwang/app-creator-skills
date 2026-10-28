import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { adaptProjectLocales } from './project-locale-adapter.mjs';

/** 计算实际字节摘要，确保阶段改写严格绑定已审计来源和前置适配。 */
function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** 使用三段身份区分同名文件和不同技术栈的迁移结果。 */
function identity(stack, sourcePath, destination) {
  return `${stack}\0${sourcePath}\0${destination}`;
}

/** 加载受审计的阶段差异，拒绝重复身份、不合法路径和无效摘要。 */
export function loadUnifiedStagePatches(repositoryRoot) {
  const filename = resolve(repositoryRoot, 'scripts/migration/templates/unified-stage-patches.json');
  const plan = JSON.parse(readFileSync(filename, 'utf8'));
  if (plan.schemaVersion !== '1.0' || !Array.isArray(plan.patches)) throw new Error('统一阶段迁移差异清单无效');
  const index = new Map();
  for (const row of plan.patches) {
    for (const field of ['stack', 'sourcePath', 'destination']) {
      if (typeof row?.[field] !== 'string' || !row[field] || row[field].includes('\\') || row[field].split('/').some((segment) => segment === '..' || !segment)) throw new Error(`统一阶段迁移 ${field} 无效`);
    }
    for (const field of ['sourceSha256', 'inputSha256', 'outputSha256']) {
      if (!/^[a-f0-9]{64}$/.test(row[field] ?? '')) throw new Error(`统一阶段迁移 ${field} 无效：${row.sourcePath}`);
    }
    if (!Array.isArray(row.hunks) || !row.hunks.length) throw new Error(`统一阶段迁移缺少差异：${row.sourcePath}`);
    const key = identity(row.stack, row.sourcePath, row.destination);
    if (index.has(key)) throw new Error(`统一阶段迁移来源重复：${row.sourcePath}`);
    index.set(key, row);
  }
  return index;
}

/** 对保留换行的完整行集合应用有序差异，不做阶段编号的运行时换算。 */
function applyHunks(buffer, row) {
  const text = buffer.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buffer)) throw new Error(`统一阶段迁移输入不是 UTF-8：${row.sourcePath}`);
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const result = [];
  let cursor = 0;
  for (const hunk of row.hunks) {
    if (!Number.isInteger(hunk?.startLine) || hunk.startLine < cursor || hunk.startLine > lines.length ||
        !Array.isArray(hunk.remove) || !Array.isArray(hunk.insert) ||
        [...hunk.remove, ...hunk.insert].some((line) => typeof line !== 'string')) throw new Error(`统一阶段迁移差异无效：${row.sourcePath}`);
    result.push(...lines.slice(cursor, hunk.startLine));
    if (hunk.remove.some((line, offset) => lines[hunk.startLine + offset] !== line)) throw new Error(`统一阶段迁移差异上下文漂移：${row.sourcePath}`);
    result.push(...hunk.insert);
    cursor = hunk.startLine + hunk.remove.length;
    if (cursor > lines.length) throw new Error(`统一阶段迁移差异越界：${row.sourcePath}`);
  }
  result.push(...lines.slice(cursor));
  return Buffer.from(result.join(''), 'utf8');
}

/** 将已审计的逐文件改动应用于迁移输出，来源或适配顺序变化均拒绝。 */
export function adaptUnifiedStages(buffer, { stack, sourcePath, destination, sourceBuffer, patches }) {
  const row = patches.get(identity(stack, sourcePath, destination));
  if (!row) return { buffer, changed: false };
  if (sha256(sourceBuffer) !== row.sourceSha256) throw new Error(`统一阶段迁移源摘要漂移：${stack}:${sourcePath}`);
  if (sha256(buffer) !== row.inputSha256) throw new Error(`统一阶段迁移前置内容漂移：${stack}:${sourcePath}（${destination}），实际 ${sha256(buffer)}，预期 ${row.inputSha256}`);
  const result = applyHunks(buffer, row);
  if (sha256(result) !== row.outputSha256) throw new Error(`统一阶段迁移输出摘要不符：${stack}:${sourcePath}`);
  return { buffer: result, changed: true };
}

/** 在所有输出写入前验证全部阶段差异及其语言适配，确保缺失来源时整体停止。 */
export function assertUnifiedStageAdaptablePlans(plans, sharedWorkflowPlan, { readText, transformShared, transformText, repositoryRoot, patches }) {
  const matched = new Set();
  for (const plan of plans) {
    for (const item of plan.entries.values()) {
      if (!item.destination || item.referenceRedirect) continue;
      const key = identity(plan.stack, item.sourcePath, item.destination);
      if (!patches.has(key)) continue;
      matched.add(key);
      const sourceBuffer = plan.sourceBuffers.get(item.sourcePath);
      const text = readText(sourceBuffer, item.sourcePath);
      let buffer = sourceBuffer;
      if (text !== null) {
        const entry = { ...item, transforms: [...item.transforms] };
        const shared = transformShared(text, plan, entry, sharedWorkflowPlan);
        buffer = Buffer.from(transformText(shared.text, entry, plan.stack, plan.sourceFiles, plan.entries).text, 'utf8');
      }
      buffer = adaptProjectLocales(buffer, { stack: plan.stack, sourcePath: item.sourcePath, destination: item.destination, sourceBuffer, repositoryRoot }).buffer;
      adaptUnifiedStages(buffer, { stack: plan.stack, sourcePath: item.sourcePath, destination: item.destination, sourceBuffer, patches });
    }
  }
  for (const [key, row] of patches) if (row.stack !== 'shared' && row.stack !== 'shared-adapter' && !matched.has(key)) throw new Error(`统一阶段迁移来源未列入当前计划：${key.replaceAll('\0', ':')}`);
}

/** 锁定共享能力的全部来源及合并输入，写入之前一次性核验适配结果。 */
export function adaptUnifiedSharedCapabilities(capabilities, plans, patches, context = {}) {
  const matched = new Set();
  const plansByStack = new Map(plans.map((plan) => [plan.stack, plan]));
  for (const capability of capabilities) {
    const origins = capability.sources.map(({ stack, sourcePath, sourceSha256 }) => ({ stack, sourcePath, sourceSha256 }))
      .sort((a, b) => `${a.stack}:${a.sourcePath}`.localeCompare(`${b.stack}:${b.sourcePath}`, 'en'));
    const sourceBuffer = Buffer.from(JSON.stringify(origins), 'utf8');
    const key = identity('shared', capability.id, capability.implementation);
    if (patches.has(key)) {
      matched.add(key);
      const content = Buffer.isBuffer(capability.content) ? capability.content : Buffer.from(capability.content, 'utf8');
      capability.content = adaptUnifiedStages(content, { stack: 'shared', sourcePath: capability.id, destination: capability.implementation, sourceBuffer, patches }).buffer;
      delete capability.directShared;
      capability.sourceSha256 = null;
      capability.transforms = [...new Set([...(capability.transforms ?? []), 'unified-visual-stages'])];
    }
    for (const source of capability.sources) {
      const adapterKey = identity('shared-adapter', `${capability.id}/${source.stack}`, source.adapterDestination);
      if (!patches.has(adapterKey)) continue;
      const bytes = plansByStack.get(source.stack)?.sourceBuffers.get(source.sourcePath);
      if (!bytes) throw new Error(`共享阶段入口来源缺失：${source.sourcePath}`);
      matched.add(adapterKey);
      const args = { stack: 'shared-adapter', sourcePath: `${capability.id}/${source.stack}`, destination: source.adapterDestination, sourceBuffer: bytes, patches };
      if (source.adapterContent !== undefined) {
        source.adapterContent = adaptUnifiedStages(Buffer.from(source.adapterContent, 'utf8'), args).buffer.toString('utf8');
      } else if (typeof source.adapterTransform === 'function') {
        // 动态入口先按真实迁移顺序预检，再包装原变换，确保写入时仍验证相同输入。
        const plan = plansByStack.get(source.stack);
        const item = plan.entries.get(source.sourcePath);
        const entry = { ...item, transforms: [...item.transforms] };
        const text = context.readText(bytes, source.sourcePath);
        const shared = context.transformShared(text, plan, entry, context.sharedWorkflowPlan);
        let input = Buffer.from(context.transformText(shared.text, entry, plan.stack, plan.sourceFiles, plan.entries).text, 'utf8');
        input = adaptProjectLocales(input, { stack: plan.stack, sourcePath: source.sourcePath, destination: source.adapterDestination, sourceBuffer: bytes, repositoryRoot: context.repositoryRoot }).buffer;
        input = adaptUnifiedStages(input, { stack: plan.stack, sourcePath: source.sourcePath, destination: source.adapterDestination, sourceBuffer: bytes, patches }).buffer;
        const transform = source.adapterTransform;
        adaptUnifiedStages(Buffer.from(transform(input.toString('utf8')), 'utf8'), args);
        source.adapterTransform = (value) => adaptUnifiedStages(Buffer.from(transform(value), 'utf8'), args).buffer.toString('utf8');
      } else throw new Error(`共享阶段入口缺少可审计变换：${source.sourcePath}`);
      source.transforms = [...new Set([...(source.transforms ?? []), 'unified-visual-stages'])];
    }
  }
  for (const [key, row] of patches) if ((row.stack === 'shared' || row.stack === 'shared-adapter') && !matched.has(key)) throw new Error(`共享阶段迁移来源未列入当前计划：${key.replaceAll('\0', ':')}`);
}
