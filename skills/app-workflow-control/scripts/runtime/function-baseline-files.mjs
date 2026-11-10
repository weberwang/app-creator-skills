import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadPackage } from './artifacts.mjs';
import { engineeringEvidence } from './function-evidence.mjs';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';

/** 区分历史业务交付与不可变验收材料，只允许前者被后续增量修改。 */
export function assertFunctionSnapshotFiles(repo, source, identities, { historical = false, label = '功能基线' } = {}) {
  if (!Array.isArray(identities) || !identities.length) throw new WorkflowError(`${label}缺少冻结文件`);
  const key = (path) => {
    const relative = repoPath(repo, path, `${label}文件`).relative;
    return process.platform === 'win32' ? relative.toLowerCase() : relative;
  };
  const deliveries = new Set();
  const records = new Set();
  if (historical) {
    const pack = loadPackage(repo, source);
    for (const path of [source.implementationPackageRef.path, source.evidenceRef.path, `${source.evidenceRoot}/execution-state.json`]) records.add(key(path));
    for (const unit of pack.executionUnits) {
      records.add(key(unit.resultPath));
      const result = readJson(repo, unit.resultPath, `${label}执行结果`);
      if (!Array.isArray(result.files)) throw new WorkflowError(`${label}执行结果缺少交付清单`);
      result.files.forEach((path) => deliveries.add(key(path)));
      for (const output of result.commandOutputs ?? []) records.add(key(output.outputFile));
    }
    for (const item of engineeringEvidence(repo, source).items) records.add(key(item.path));
  }
  for (const identity of identities) {
    if (!identity || !/^[a-f0-9]{64}$/.test(identity.sha256 ?? '')) throw new WorkflowError(`${label}冻结文件摘要无效`);
    const pathKey = key(identity.path);
    // 同时被列为交付和验收输出的文件仍是记录，不能借交付身份跳过校验。
    if (historical && deliveries.has(pathKey) && !records.has(pathKey)) continue;
    const path = requireFile(repo, identity.path, `${label}文件`);
    const actual = createHash('sha256').update(readFileSync(repoPath(repo, path).absolute)).digest('hex');
    if (actual !== identity.sha256) throw new WorkflowError(`${label}已变化：${identity.path}`);
  }
}
