/** 将已无原生正文的编排参考映射到完整公共真源，保留来源追溯。 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { ORCHESTRATION_REFERENCE_FAMILIES } from './orchestration-reference-specs.mjs';

const TRANSFORM = 'merge-navigation-into-shared-reference';
const NAMES = Object.freeze({
  cocos: ['quality-gates', 'worktree-integration', 'grilling-integration'],
  phaser: ['quality-gates', 'worktree-integration', 'local-service-validation', 'grilling-integration'],
  threejs: ['quality-gates', 'worktree-integration', 'local-service-validation'],
});

/** 只允许经过逐项审查的来源文件指向对应的公共参考。 */
export function referenceRedirectSpec(stack, sourcePath) {
  for (const name of NAMES[stack] ?? []) {
    const family = ORCHESTRATION_REFERENCE_FAMILIES.find((item) => item.id === `reference-orchestration-${name}`);
    const source = family?.sources.find((item) => item.stack === stack && item.sourcePath === sourcePath);
    if (source) return { ...source, id: family.id, destination: `skills/app-domain-toolkit/references/${family.id}.md` };
  }
  return null;
}

/** 必须同时绑定来源、摘要、合并方式及目标，不能借单一标志跳过审计。 */
export function isReferenceRedirect(row, destination = row?.destination) {
  const spec = referenceRedirectSpec(row?.stack, row?.sourcePath);
  return Boolean(spec && row.referenceRedirect === true && row.disposition === 'merged'
    && row.destination === spec.destination && destination === spec.destination && row.sourceSha256 === spec.sourceSha256
    && Array.isArray(row.transforms) && row.transforms.includes(TRANSFORM)
    && Array.isArray(row.sharedReferences) && row.sharedReferences.includes(spec.destination));
}

/** 确保预览只剩章节标题、公共正文链接和已登记的控制协议链接。 */
function assertNavigationOnly(text, spec, previousDestination) {
  let links = 0;
  const parent = posix.dirname(previousDestination);
  for (const raw of text.replaceAll('\r\n', '\n').split('\n')) {
    const line = raw.trim();
    if (!line || /^#{1,6}\s+\S/.test(line)) continue;
    const common = /^(?:>\s*|[-*+]\s+|\d+[.)]\s+)?通用工作流步骤见\[完整规范\]\(([^)]+)\)。$/.exec(line);
    if (common && posix.normalize(posix.join(parent, common[1].split('#')[0])) === spec.destination) { links += 1; continue; }
    const control = /^- \[控制面不可绕过约束\]\(([^)]+)\)$/.exec(line);
    if (spec.id === 'reference-orchestration-grilling-integration' && control
      && posix.normalize(posix.join(parent, control[1].split('#')[0])) === 'skills/app-workflow-control/SKILL.md'
      && control[1].endsWith('#不可绕过约束')) continue;
    throw new Error(`参考仍包含原生正文或未知链接，拒绝合并：${spec.stack}/${spec.sourcePath}: ${line}`);
  }
  if (!links) throw new Error(`参考没有指向公共正文：${spec.stack}/${spec.sourcePath}`);
}

/** 写入前对全部来源、完整共享段落和真实迁移预览验真，再一次性更新计划。 */
export function prepareReferenceRedirects(plans, sharedWorkflowPlan, { readText, transformShared, transformText }) {
  const updates = [];
  for (const [stack, names] of Object.entries(NAMES)) {
    const plan = plans.find((item) => item.stack === stack);
    if (!plan) throw new Error(`导航合并缺少技术栈计划：${stack}`);
    for (const name of names) {
      const prefix = stack === 'phaser' ? 'phaser4' : stack;
      const sourcePath = `skills/${prefix}-game-orchestrator/references/${name}.md`;
      const spec = referenceRedirectSpec(stack, sourcePath);
      const entry = plan.entries.get(sourcePath);
      const bytes = plan.sourceBuffers.get(sourcePath);
      const document = sharedWorkflowPlan.documents.find((item) => item.capabilityId === spec?.id);
      const source = document?.sources.find((item) => item.stack === stack && item.sourcePath === sourcePath);
      if (!spec || !entry?.destination || !Buffer.isBuffer(bytes) || createHash('sha256').update(bytes).digest('hex') !== spec.sourceSha256
        || document?.path !== spec.destination || !source?.sections?.length) throw new Error(`导航来源或公共段落缺失、摘要漂移：${stack}/${sourcePath}`);
      const candidate = { ...entry, transforms: [...entry.transforms] };
      const shared = transformShared(readText(bytes, sourcePath), plan, candidate, sharedWorkflowPlan);
      const preview = transformText(shared.text, candidate, stack, plan.sourceFiles, plan.entries).text;
      assertNavigationOnly(preview, spec, entry.destination);
      if (name === 'grilling-integration' && !document.content.includes('../..' + '/app-workflow-control/SKILL.md#不可绕过约束')) {
        throw new Error(`公共拷问参考遗漏控制面约束链接：${stack}/${sourcePath}`);
      }
      updates.push({ entry, spec });
    }
  }
  for (const { entry, spec } of updates) {
    entry.destination = spec.destination;
    entry.disposition = 'merged';
    entry.reason = '源参考的公共规则已逐段归并，本栈已无补充正文；直接引用公共真源并保留逐源摘要。';
    entry.transforms = [TRANSFORM];
    entry.sharedReferences = [spec.destination];
    entry.referenceRedirect = true;
  }
}

/** 从本次公共计划计算目标摘要，来源内容绝不用于写入目标。 */
export function referenceRedirectHash(entry, sharedWorkflowPlan) {
  if (!isReferenceRedirect(entry)) throw new Error(`导航归并账本无效：${entry.stack}/${entry.sourcePath}`);
  const spec = referenceRedirectSpec(entry.stack, entry.sourcePath);
  const document = sharedWorkflowPlan.documents.find((item) => item.capabilityId === spec.id && item.path === spec.destination);
  if (!document?.sources.some((item) => item.stack === entry.stack && item.sourcePath === entry.sourcePath && item.sections?.length)) {
    throw new Error(`导航归并缺少公共来源段落：${entry.stack}/${entry.sourcePath}`);
  }
  return createHash('sha256').update(document.content).digest('hex');
}
