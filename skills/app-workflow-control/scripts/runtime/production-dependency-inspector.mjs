import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { repoPath, WorkflowError } from './io.mjs';
import { inspectProductionDependencyHistory } from './workflow.mjs';

// 仅复用同一次同步检查链中的结果，返回后销毁，避免下一次操作沿用过期 PASS。
let activeInspection = null;

/** 复核实际历史完成材料，并限制依赖递归的重复检查和循环。 */
export function inspectProductionDependencySource(repo, source, sourcePath) {
  const rootCall = activeInspection === null;
  if (rootCall) activeInspection = { checked: new Map(), visiting: new Set() };
  try {
    const absolute = repoPath(repo, sourcePath, '生产依赖来源').absolute;
    const key = realpathSync.native(absolute) + ':' + createHash('sha256').update(readFileSync(absolute)).digest('hex');
    if (activeInspection.visiting.has(key)) throw new WorkflowError('生产依赖来源检查存在循环');
    if (activeInspection.checked.has(key)) return activeInspection.checked.get(key);
    activeInspection.visiting.add(key);
    try {
      const result = inspectProductionDependencyHistory(repo, source, sourcePath);
      if (result.status === 'PASS') activeInspection.checked.set(key, result);
      return result;
    } finally { activeInspection.visiting.delete(key); }
  } finally { if (rootCall) activeInspection = null; }
}
