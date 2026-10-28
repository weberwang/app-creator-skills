import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, WorkflowError } from './io.mjs';

const SKILLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** 从受保护的用户决定记录加载可信确认，不接受清单内自填的权威对象。 */
export async function loadDomainConfirmationAuthority(repo, work, manifest, source) {
  const regions = manifest?.coverage_audit?.regions ?? [];
  if (!Array.isArray(regions) || !regions.some((region) => Number.isInteger(region?.annotation_number) && region.annotation_number > 0)) return undefined;
  const loader = await import(pathToFileURL(resolve(SKILLS_ROOT, `${work.stack}-domain-contracts/scripts/visual-confirmation-authority.mjs`)).href);
  const context = {
    workItemId: work.workItemId,
    visualConfirmationAuthorityRefs: source?.visualConfirmationAuthorityRefs,
    visualConfirmationPrerequisiteFiles: source?.visualConfirmationPrerequisiteFiles,
  };
  let implementationPackage = null;
  if (work.implementationPackageRef?.path) {
    const pack = readJson(repo, work.implementationPackageRef.path, '当前实施包');
    // 公共实施包用 paths 声明写入范围；原生 loader 用 ownedPaths 检查受保护材料。
    implementationPackage = { ...pack, executionUnits: (pack.executionUnits ?? []).map((unit) => ({ ...unit, ownedPaths: unit.paths })) };
  }
  const result = loader.loadVisualConfirmationAuthority(context, { projectRoot: repo, manifest, checkFiles: true, implementationPackage });
  if (result.errors.length) throw new WorkflowError(`视觉确认权威加载失败：${result.errors.join('；')}`);
  return result.authority;
}
