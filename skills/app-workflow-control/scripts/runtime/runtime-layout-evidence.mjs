import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 选择当前 V5 对象的唯一布局采集，沿用已有公共 Evidence Manifest。 */
export function readTargetRuntimeLayoutRef(repo, work, targetId) {
  if (!work.evidenceRef?.path) return null;
  const manifest = readJson(repo, work.evidenceRef.path, 'V5 当前运行证据');
  if (manifest.workItemId !== work.workItemId || manifest.stack !== work.stack || manifest.visualStage !== 'V5') return null;
  const matches = manifest.items?.filter((item) => item.category === 'runtime-layout' && item.status === 'PASS'
    && (item.targetId === targetId || (work.workItemType === 'DISPLAY_LAYER' && item.targetId === undefined)));
  if (matches?.length !== 1) return null;
  const path = requireFile(repo, matches[0].path, 'V5 当前布局采集');
  const key = fileIdentityKey(repo, path);
  const root = fileIdentityKey(repo, work.evidenceRoot);
  if (!key.startsWith(`${root}/`) || work.invalidatedRefs?.some((ref) => ref.path && fileIdentityKey(repo, ref.path) === key)) {
    throw new WorkflowError('V5 布局采集不属于当前有效证据目录');
  }
  return { path, sha256: createHash('sha256').update(readFileSync(repoPath(repo, path).absolute)).digest('hex') };
}
