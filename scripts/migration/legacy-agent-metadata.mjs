/** 将失去独立技能入口的路由元数据收拢到迁移审计目录。 */

/** 判断源文件是否位于指定正式技能根目录内。 */
function isSkillFile(sourcePath, prefix, skillName) {
  const root = `${prefix}${skillName}/`;
  return sourcePath.startsWith(root);
}

/**
 * 归档已合并入口的旧路由元数据，并保留仍有专业载荷的安装资源目录。
 * @param {object} plan 已完成公共能力路由的技术栈迁移计划
 * @returns {object} 更新后的迁移计划
 */
export function archiveLegacyAgentMetadata(plan) {
  const { stack, policy, entries, rootSkillEntries } = plan;
  if (typeof stack !== 'string' || !policy || !(entries instanceof Map) || !Array.isArray(rootSkillEntries)) {
    throw new TypeError('迁移计划缺少技术栈、策略、文件条目或正式技能清单');
  }

  const prefix = policy.skillPrefix ?? '';
  const nextEntries = new Map([...entries].map(([path, entry]) => [path, { ...entry }]));
  const archivedRoots = new Set();
  const candidates = new Set([
    ...rootSkillEntries.filter((skill) => skill.kind === 'specialist').map((skill) => skill.name),
    policy.grilling,
    policy.orchestrator,
  ].filter(Boolean));

  for (const skillName of candidates) {
    const metadataPath = `${prefix}${skillName}/agents/openai.yaml`;
    const metadata = nextEntries.get(metadataPath);
    if (!metadata?.destination) continue;

    const related = [...nextEntries.values()].filter((entry) => isSkillFile(entry.sourcePath, prefix, skillName));
    const hasPayload = related.some((entry) => {
      if (entry.sourcePath === metadataPath || !entry.destination?.startsWith(`skills/${skillName}/`)) return false;
      // 合并后的原生正文稍后归入技术手册；临时 ADAPTER 路径不算技能目录载荷。
      if (entry.sourcePath === `${prefix}${skillName}/SKILL.md`
        && (skillName === policy.grilling || entry.destination.endsWith('/ADAPTER.md'))) return false;
      return true;
    });
    metadata.destination = `migration/source-metadata/${stack}-${skillName}.yaml`;
    metadata.disposition = 'copied';
    metadata.reason = '原技能入口已合并；归档旧路由配置供迁移审计，专业资源仍由本栈目录提供。';
    metadata.transforms = [...new Set([...(metadata.transforms ?? []), 'archive-legacy-agent-metadata'])];
    if (!hasPayload) archivedRoots.add(skillName);
  }

  // 仅在旧目录没有实际载荷时移除安装项，嵌套模板和独立脚本仍保留。
  const resourceDirectories = (plan.resourceDirectories ?? []).filter((name) => !archivedRoots.has(name));
  return { ...plan, entries: nextEntries, resourceDirectories };
}
