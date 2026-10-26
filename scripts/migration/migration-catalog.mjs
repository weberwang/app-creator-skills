/** 统一写入正式入口、公共能力和逐文件迁移账本，不参与专业内容变换。 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { CAPABILITY_GROUPS, capabilityAdapters, nativeContractPath } from '../capability-map.mjs';

/** 从已完成的文件结果生成来源清单，并复用调用者的链接与路径保护。 */
export function writeMigrationCatalog({ plans, files, domainGeneratedFiles, sourceRoot, repositoryRoot, sharedOutputs, sha256, resolveDestination }) {
  const stacks = {};
  for (const plan of plans) {
    stacks[plan.stack] = {
      sourceRepository: plan.policy.repository,
      sourceRevision: plan.revision,
      sourceSkillCount: plan.discovery.rootSkills.length,
      skills: plan.rootSkillEntries.map(({ kind, ...skill }) => {
        const file = files.find((entry) => entry.stack === plan.stack && entry.sourcePath === skill.sourcePath);
        return { ...skill, skillKind: kind === 'specialist' ? 'capability-adapter' : kind, ...(file?.sharedReferences?.length ? { sharedReferences: file.sharedReferences } : {}) };
      }),
      resourceDirectories: plan.resourceDirectories,
      capabilitySkills: CAPABILITY_GROUPS.filter((group) => capabilityAdapters(group).some((adapter) => adapter.stack === plan.stack)).map((group) => group.name),
      nativeManual: nativeContractPath(plan.stack),
      nativeAdapters: plan.rootSkillEntries.filter((skill) => skill.kind === 'specialist').map((skill) => ({ sourceSkill: skill.name, capability: skill.capability, path: skill.adapterDestination, section: skill.adapterSection })),
      authoredAdapters: CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.authored && adapter.stack === plan.stack).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section }))),
      tools: plan.tools,
    };
  }
  const generatedFiles = [
    ...plans.flatMap((plan) => [...plan.commonJsScopes.entries()].map(([path, item]) => ({ stack: plan.stack, path, reason: item.reason, sourceSha256: null, destinationSha256: sha256(Buffer.from(item.content, 'utf8')) }))),
    ...domainGeneratedFiles,
    ...sharedOutputs.generatedFiles,
  ];
  const capabilities = CAPABILITY_GROUPS.map((group) => ({ name: group.name, core: Boolean(group.core), stacks: [...new Set(capabilityAdapters(group).map((adapter) => adapter.stack))], nativeAdapters: capabilityAdapters(group) }));
  const catalog = { schemaVersion: '1.0', sourceRoot: relative(repositoryRoot, resolve(sourceRoot)).split(sep).join('/'), stacks, capabilities, filesRef: 'migration/files.json', generatedFiles, sharedCapabilities: sharedOutputs.sharedCapabilities };
  mkdirSync(join(repositoryRoot, 'migration'), { recursive: true });
  writeFileSync(resolveDestination('migration/catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  writeFileSync(resolveDestination('migration/files.json'), `${JSON.stringify({ schemaVersion: '1.0', files }, null, 2)}\n`, 'utf8');
  return catalog;
}
