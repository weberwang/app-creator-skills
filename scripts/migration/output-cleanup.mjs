import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/** 领域回归与新增原生规范共用受保护生成流程，明确记录仓库自有模板来源。 */
export const GENERATED_DOMAIN_RESOURCES = Object.freeze([
  { stack: 'unity', path: 'skills/unity-domain-contracts/scripts/runtime/resource-handoff-evidence.test.mjs', template: 'scripts/migration/templates/unity-resource-handoff-evidence.source', reason: '验证 Unity 资源登记与实际读回报告的领域证据合同。' },
  { stack: 'unity', path: 'skills/unity-domain-contracts/scripts/runtime/ui-layout-evidence.test.mjs', template: 'scripts/migration/templates/unity-ui-layout-evidence.source', reason: '验证 Unity 屏幕布局计划绑定及领域证据合同。' },
  { stack: 'unity', path: 'skills/unity-domain-contracts/scripts/runtime/rigging-delivery-contract.test.mjs', template: 'scripts/migration/templates/unity-rigging-delivery-contract.source', reason: '验证 Unity 2D 骨骼交付责任、角色范围和证据合同。' },
]);

/** 验证迁移写入路径的每个现存目录都留在仓库内且不是链接或 Junction。 */
export function assertNoDestinationLinks(repositoryRoot, destination) {
  const absolute = resolve(repositoryRoot, ...destination.split('/'));
  const lexicalRelative = relative(repositoryRoot, absolute);
  if (lexicalRelative === '..' || lexicalRelative.startsWith(`..${sep}`) || isAbsolute(lexicalRelative)) {
    throw new Error(`迁移目标越出仓库：${destination}`);
  }
  const rootMetadata = lstatSync(repositoryRoot);
  if (rootMetadata.isSymbolicLink()) throw new Error('迁移仓库根目录不能是链接或 Junction');
  const rootReal = realpathSync(repositoryRoot);
  let current = rootReal;
  for (const segment of lexicalRelative.split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    let metadata;
    try { metadata = lstatSync(current); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (metadata.isSymbolicLink()) throw new Error(`迁移目标路径含链接或 Junction：${destination}`);
    const realRelative = relative(rootReal, realpathSync(current));
    if (realRelative === '..' || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative)) {
      throw new Error(`迁移目标 realpath 越出仓库：${destination}`);
    }
  }
  return absolute;
}

/** 按哈希所有权写入领域资源，新增规范也必须可追溯且不覆盖人工改动。 */
export function applyGeneratedDomainResources({ repositoryRoot, previousHashes, resolveDestination, hashDestination, sha256 }) {
  const records = [];
  for (const entry of GENERATED_DOMAIN_RESOURCES) {
    const content = readFileSync(resolve(repositoryRoot, ...entry.template.split('/')));
    const target = resolveDestination(entry.path);
    if (existsSync(target)) {
      const metadata = lstatSync(target);
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`领域测试目标不是普通文件，拒绝覆盖：${entry.path}`);
      if (previousHashes.has(entry.path)) {
        if (hashDestination(entry.path) !== previousHashes.get(entry.path)) throw new Error(`领域测试已被手动修改，拒绝覆盖：${entry.path}`);
      } else if (sha256(readFileSync(target)) !== sha256(content)) {
        throw new Error(`领域测试目标已存在且内容不属于本次预期，拒绝覆盖：${entry.path}`);
      }
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    records.push({ stack: entry.stack, path: entry.path, reason: entry.reason, ...(entry.origin ? { origin: entry.origin, template: entry.template } : {}), sourceSha256: sha256(content), destinationSha256: sha256(content) });
  }
  return records;
}

/** 仅清除上一轮登记且哈希未变化、当前计划已不再使用的迁移生成文件。 */
export function removeStaleGeneratedFiles(previousHashes, currentDestinations, resolveDestination, hashDestination) {
  const removed = [];
  for (const [destination, expectedHash] of previousHashes) {
    if (currentDestinations.has(destination)) continue;
    const absolute = resolveDestination(destination);
    if (!existsSync(absolute)) continue;
    const metadata = lstatSync(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`旧迁移目标不是普通文件，拒绝自动删除：${destination}`);
    }
    // 失去当前映射的旧文件仍可能被人工调整；哈希变化时必须停下交由所有者处理。
    if (hashDestination(destination) !== expectedHash) {
      throw new Error(`旧迁移生成文件已被修改，拒绝自动删除：${destination}`);
    }
    unlinkSync(absolute);
    removed.push(destination);
  }
  return removed;
}
