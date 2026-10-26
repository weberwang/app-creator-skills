/** 将源专业入口归入能力，物理目录保留全部原生资源而不继续暴露别名技能。 */
import { CAPABILITY_GROUPS, capabilityAdapters, capabilityForSourceSkill, nativeAdapterPath } from '../capability-map.mjs';

/** 给源计划增加公共入口与原生适配的对应关系，77 仍是来源能力保留基线。 */
export function routeCapabilityPlan(plan) {
  const resources = new Set(plan.resourceDirectories);
  resources.add('app-domain-toolkit');
  for (const group of CAPABILITY_GROUPS) for (const adapter of group.authoredAdapters ?? []) if (adapter.stack === plan.stack) resources.add(adapter.sourceSkill);
  for (const skill of plan.rootSkillEntries.filter((entry) => entry.kind === 'specialist')) {
    const capability = capabilityForSourceSkill(plan.stack, skill.name);
    if (!capability) throw new Error(`源专业能力没有公共入口：${plan.stack}/${skill.name}`);
    skill.disposition = 'merged';
    skill.capability = capability.name;
    skill.adapterDestination = nativeAdapterPath(skill.name);
    skill.destination = `skills/${capability.name}/SKILL.md`;
    skill.reason = '同职责入口合并为公共能力；专业差异集中维护在本栈原生手册对应章节，脚本、模板与校验器仍随本栈分发。';
    resources.add(skill.name);
  }
  return { ...plan, resourceDirectories: [...resources].sort() };
}

/** 改写调用名称与明确文件引用，既不改运行时目录名，也不伪造旧入口兼容层。 */
export function routeCapabilityText(text, { stack, sourcePath }) {
  let output = text;
  for (const group of CAPABILITY_GROUPS) for (const adapter of capabilityAdapters(group).filter((item) => !item.reused && !item.authored)) {
    const escaped = adapter.sourceSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`\\$${escaped}(?![\\w-])`, 'g'), `$${group.name}`);
    output = output.replace(new RegExp(`(${escaped}/)SKILL\\.md`, 'g'), '$1ADAPTER.md');
  }
  const local = sourcePath.replace(/^skills\//, '');
  const sourceSkill = local.split('/')[0];
  const capability = capabilityForSourceSkill(stack, sourceSkill);
  if (capability && local === `${sourceSkill}/SKILL.md`) {
    const notice = `> 原生适配规范：主要由 [$${capability.name}](../${capability.name}/SKILL.md) 调用，也可由能力清单显式复用；本文保留 ${stack} 的完整专业规则与工具，不作为独立 skill 入口。\n\n`;
    const metadata = output.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    output = metadata ? `${metadata[0]}\n${notice}${output.slice(metadata[0].length).replace(/^\s*\n/, '')}` : notice + output;
  }
  return output;
}
