import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readJson, repoPath, WorkflowError } from './io.mjs';
import { assertOwnedPath, pathMatch } from './validation.mjs';

/** 读取路径状态；不存在与悬空链接必须区分。 */
function statOrNull(path) {
  try { return lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

/** 禁止删除路径经过符号链接、Junction 或其他文件别名。 */
function assertNoLinks(repo, path) {
  let cursor = resolve(repo);
  for (const part of path.split('/')) {
    cursor = resolve(cursor, part);
    const stat = statOrNull(cursor);
    if (!stat) continue;
    if (stat.isSymbolicLink()) throw new WorkflowError(`删除路径包含链接：${path}`);
  }
}

/** 识别项目根级本地技能目录，不排除业务子目录内的同名文件。 */
function isLocalAgentsPath(relativePath) {
  const value = process.platform === 'win32' ? relativePath.toLowerCase() : relativePath;
  return value === '.agents' || value.startsWith('.agents/');
}

/** 遍历声明范围的现存普通文件，记录稳定的内容和文件身份。 */
function snapshotFiles(repo, patterns, { hashContent = true } = {}) {
  const files = new Map();
  const visit = (relative) => {
    // 在读取元数据前剪枝，避免本地技能变动污染删除基线。
    if (isLocalAgentsPath(relative)) return;
    const absolute = relative ? resolve(repo, ...relative.split('/')) : resolve(repo);
    const before = statOrNull(absolute);
    if (!before || before.isSymbolicLink()) return;
    if (before.isDirectory()) {
      for (const name of readdirSync(absolute)) visit(relative ? `${relative}/${name}` : name);
    } else if (before.isFile() && patterns.some((pattern) => pathMatch(relative, pattern))) {
      // 基线才读取内容；删除后只需检查文件身份，避免逐项重复读取大资源。
      const content = hashContent ? readFileSync(absolute) : null;
      const after = statOrNull(absolute);
      if (!after || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
        throw new WorkflowError(`冻结删除基线时文件发生变化：${relative}`, 'CONCURRENT_MODIFICATION');
      }
      files.set(relative, { path: relative, ...(hashContent ? { sha256: createHash('sha256').update(content).digest('hex') } : {}), dev: String(after.dev), ino: String(after.ino), links: after.nlink });
    }
  };
  for (const pattern of patterns) {
    const wildcard = pattern.indexOf('*');
    const prefix = wildcard < 0 ? pattern : pattern.slice(0, wildcard);
    const root = wildcard < 0 ? prefix : prefix.endsWith('/') ? prefix.slice(0, -1) : dirname(prefix).replaceAll('\\', '/').replace(/^\.$/, '');
    if (isLocalAgentsPath(root)) continue;
    if (root) assertNoLinks(repo, root);
    visit(root);
  }
  return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** 仅在批次首次激活时冻结，禁止根据后来的文件重算既有单元基线。 */
export function freezeDeletionBaseline(repo, pack, state) {
  state.deletionBaselines ??= {};
  for (const unitId of state.activeBatch) {
    if (Object.hasOwn(state.deletionBaselines, unitId)) continue;
    const unit = pack.executionUnits.find((item) => item.unitId === unitId);
    state.deletionBaselines[unitId] = snapshotFiles(repo, unit.paths);
  }
}

/** 拒绝提前注入未来批次的删除基线；旧状态不得因校验而重新采集。 */
export function validateDeletionBaselineState(state, batches) {
  if (state.deletionBaselines === undefined) return;
  if (!state.deletionBaselines || typeof state.deletionBaselines !== 'object' || Array.isArray(state.deletionBaselines)) throw new WorkflowError('删除基线状态无效');
  const activeIndex = Array.isArray(state.activeBatch) ? batches.findIndex((batch) => batch.unitIds.some((id) => state.activeBatch.includes(id))) : -1;
  const maxIndex = activeIndex < 0 ? batches.length - 1 : activeIndex;
  const allowed = new Set(batches.slice(0, maxIndex + 1).flatMap((batch) => batch.unitIds));
  for (const [unitId, entries] of Object.entries(state.deletionBaselines)) {
    if (!allowed.has(unitId) || !Array.isArray(entries)) throw new WorkflowError(`删除基线不属于已激活批次：${unitId}`);
  }
}

/** 验证删除目标原先真实存在、已消失，且不越权或借由并发硬链接冒用。 */
export function validateDeletedFiles(repo, work, pack, unit, deleted, profile, protectedPaths, { historical = false, deliveredFiles = [] } = {}) {
  if (!Array.isArray(deleted)) throw new WorkflowError('deletedFiles 必须为数组');
  if (!deleted.length) return;
  const state = readJson(repo, `${work.evidenceRoot}/execution-state.json`, 'Execution State');
  const baseline = state.deletionBaselines?.[unit.unitId];
  if (!Array.isArray(baseline)) throw new WorkflowError('删除操作缺少实施前冻结的文件基线');
  const key = (value) => process.platform === 'win32' ? value.toLowerCase() : value;
  const protectedSet = new Set(protectedPaths.map((path) => key(repoPath(repo, path).relative)));
  const deliveredSet = new Set(deliveredFiles.map((path) => key(repoPath(repo, path).relative)));
  const unique = new Set();
  const batch = state.executionPlan?.batches?.find((item) => item.unitIds.includes(unit.unitId));
  const aliases = new Map();
  // 每次核验只扫描同批所有权一次，成本不随删除条目数重复放大。
  for (const unitId of historical ? [] : new Set([unit.unitId, ...(batch?.unitIds ?? [])])) {
    const owner = pack.executionUnits.find((item) => item.unitId === unitId);
    if (owner) aliases.set(unitId, snapshotFiles(repo, owner.paths, { hashContent: false }));
  }
  for (const path of deleted) {
    const normalized = assertOwnedPath(repo, work, profile, path);
    // 历史执行状态即使含有旧基线，也不能将本地技能文件当作删除交付。
    if (isLocalAgentsPath(normalized)) throw new WorkflowError(`本地技能目录不能作为删除交付：${normalized}`);
    const pathKey = key(normalized);
    if (unique.has(pathKey)) throw new WorkflowError(`deletedFiles 不能重复：${normalized}`);
    unique.add(pathKey);
    if (!unit.paths.some((owned) => pathMatch(normalized, owned))) throw new WorkflowError(`删除文件越过单元所有权：${normalized}`);
    if (protectedSet.has(pathKey) || pathMatch(normalized, `${work.evidenceRoot}/**`)) throw new WorkflowError(`不能删除工作流保留记录：${normalized}`);
    const old = baseline.find((item) => key(item.path) === pathKey);
    if (!old || !/^[a-f0-9]{64}$/.test(old.sha256 ?? '') || !old.dev || !old.ino || old.links !== 1) throw new WorkflowError(`删除文件缺少安全的实施前存在性及内容基线：${normalized}`);
    // 历史删除只核对冻结基线，后批可以重新创建该业务路径。
    if (historical) continue;
    assertNoLinks(repo, normalized);
    if (statOrNull(repoPath(repo, normalized).absolute)) throw new WorkflowError(`删除文件仍然存在或已重建：${normalized}`);
    // 同批其他所有权内即使后来新增硬链接，也不能把该文件冒充为独立删除。
    const identity = `${old.dev}:${old.ino}`;
    const ownedAliases = (aliases.get(unit.unitId) ?? []).filter((item) => `${item.dev}:${item.ino}` === identity);
    if (ownedAliases.length) {
      // 仅接受同一单元明确交付、单链接且未经过链接路径的真实更名。
      const renamed = ownedAliases.length === 1 && ownedAliases[0].links === 1 && deliveredSet.has(key(ownedAliases[0].path));
      if (!renamed) throw new WorkflowError(`删除文件仍存在硬链接别名：${normalized}`);
      assertNoLinks(repo, ownedAliases[0].path);
    }
    for (const otherId of batch?.unitIds ?? []) {
      if (otherId === unit.unitId) continue;
      if (aliases.get(otherId)?.some((item) => `${item.dev}:${item.ino}` === identity)) {
        throw new WorkflowError(`删除文件与并行单元存在硬链接别名：${normalized}`);
      }
    }
  }
}
