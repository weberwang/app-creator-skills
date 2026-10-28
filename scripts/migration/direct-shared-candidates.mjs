/** 精确相同的跨栈资源只保留一份，清单中的每个来源仍独立接受摘要校验。 */
import { createHash } from 'node:crypto';
import { buildSharedIdenticalReferencesPlan, sharedReferenceTarget } from './shared-identical-references.mjs';

const STACK_SKILLS = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const DIRECT_GROUPS = Object.freeze([
  { id: 'production-build-validator', kind: 'module', stacks: ['cocos', 'phaser', 'threejs'], skill: 'game-architecture', file: 'scripts/validate-production-build.mjs', target: 'scripts/build/validate-production-build.mjs' },
  { id: 'production-build-validator-tests', kind: 'module', stacks: ['cocos', 'phaser', 'threejs'], skill: 'game-architecture', file: 'scripts/validate-production-build.test.mjs', target: 'scripts/build/validate-production-build.test.mjs', dependencies: ['skills/app-domain-toolkit/scripts/build/validate-production-build.mjs'] },
  ...['alpha', 'assets', 'atlas', 'control'].map((name) => ({ id: `spine-${name}`, kind: 'module', stacks: ['cocos', 'phaser'], skill: 'spine-generative-reskin', file: `scripts/spine_${name}.mjs`, target: `scripts/spine/spine_${name}.mjs`, ...(name === 'atlas' ? {} : { dependencies: ['skills/app-domain-toolkit/scripts/spine/spine_atlas.mjs'] }) })),
]);

/** 根据源身份定位公共目标；未列入清单的专业资源继续遵循原迁移策略。 */
export function directSharedTarget(stack, sourcePath) {
  const reference = sharedReferenceTarget(stack, sourcePath);
  if (reference) return reference;
  for (const group of DIRECT_GROUPS) {
    if (!group.stacks.includes(stack)) continue;
    if (sourcePath === `skills/${STACK_SKILLS[stack]}-${group.skill}/${group.file}`) return `skills/app-domain-toolkit/${group.target}`;
  }
  return null;
}

/** 用源字节证据构建直接共享计划，任一来源漂移都阻止写入和清理。 */
export function buildDirectSharedCapabilities(plans) {
  const byStack = new Map(plans.map((plan) => [plan.stack, plan]));
  const modules = DIRECT_GROUPS.map((group) => {
    const implementation = `skills/app-domain-toolkit/${group.target}`;
    const records = group.stacks.map((stack) => {
      const sourcePath = `skills/${STACK_SKILLS[stack]}-${group.skill}/${group.file}`;
      const plan = byStack.get(stack);
      const entry = plan?.entries.get(sourcePath);
      const content = plan?.sourceBuffers.get(sourcePath);
      if (!entry || entry.destination !== implementation || !Buffer.isBuffer(content)) throw new Error(`共享来源或目标缺失：${stack}/${sourcePath}`);
      const sourceSha256 = createHash('sha256').update(content).digest('hex');
      return { stack, sourcePath, sourceSha256, adapterDestination: implementation, content };
    });
    const canonical = records[0].content;
    if (records.some((record) => !record.content.equals(canonical))) throw new Error(`${group.id} 源文件内容不一致，拒绝合并`);
    return {
      id: group.id, kind: group.kind, directShared: true, implementation, content: canonical,
      sourceSha256: records[0].sourceSha256, stacks: group.stacks,
      sources: records.map(({ content, ...source }) => source),
      dependencies: group.dependencies ?? [],
      reason: '多个技术栈的源文件逐字节一致；集中维护公共真源并保留逐项来源摘要。',
    };
  });
  const references = buildSharedIdenticalReferencesPlan(plans).ready.map((item) => ({
    id: `reference-${item.id}`, kind: 'asset', directShared: true, implementation: item.implementation,
    content: item.content, sourceSha256: item.sources[0].sourceSha256,
    sources: item.sources.map(({ previousDestination, ...source }) => ({ ...source, adapterDestination: item.implementation })),
    dependencies: [], reason: '多个技术栈的参考资料字节一致；集中保存完整正文和逐项来源摘要。',
  }));
  return [...modules, ...references];
}
