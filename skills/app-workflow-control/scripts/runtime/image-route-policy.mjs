import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { atomicWriteJson, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { withWorkLock } from './work-lock.mjs';

/** 初始化界面和控制器共用的路线取值。 */
export const DESIGN_IMAGE_METHODS = Object.freeze(['codex', 'host-tool', 'prompt-handoff']);
/** 正式静态单图采用的生产路线。 */
export const FORMAL_IMAGE_METHODS = Object.freeze(['svg-to-png', 'direct-image-generation']);

/** 使用项目和技术栈定位唯一策略，不把用户输入拼成文件路径。 */
function policyPath(projectId, stack) {
  const key = createHash('sha256').update(JSON.stringify([projectId, stack])).digest('hex');
  return `.workflow-control/image-routes/${key}.json`;
}

/** 无图提案与纯 3D 场景可沿各自路线初始化，已有策略仍会随视觉工作项继承。 */
function needsImageChoice(work) {
  return work.workItemType === 'PROJECT'
    || (work.visual && work.visual.designRoute !== 'world-3d' && work.visual.designSource?.kind !== 'figma-direct');
}

/** 全局方向和视觉工作项共用项目策略，非视觉工作项不登记图片输入。 */
function canBind(work) {
  return work.stack !== 'nodejs' && (['PROJECT', 'FOUNDATION'].includes(work.workItemType) || Boolean(work.visual));
}

/** 只执行现有只读登录及版本预检，不发起生图。 */
export function probeDesignCodex(repo) {
  if (process.platform !== 'win32') return false;
  const script = fileURLToPath(new URL('../../../app-asset-workflow/scripts/invoke-codex-imagegen.ps1', import.meta.url));
  const result = spawnSync('pwsh.exe', ['-NoProfile', '-File', script, '-CheckOnly'], {
    cwd: repo, encoding: 'utf8', windowsHide: true, timeout: 45000, maxBuffer: 64 * 1024,
  });
  if (result.error || result.status !== 0) return false;
  try {
    const report = JSON.parse(result.stdout);
    return report.authMode === 'ChatGPT' && typeof report.codexVersion === 'string' && Boolean(report.codexVersion.trim());
  } catch {
    return false;
  }
}

/** 校验项目身份和选择枚举，防止错误项目或无效文件被继承。 */
function validatePolicy(policy, work) {
  if (policy?.schemaVersion !== '1.0' || policy.projectId !== work.projectId || policy.stack !== work.stack
    || typeof policy.frozenByWorkItemPath !== 'string' || typeof policy.frozenByWorkItemId !== 'string'
    || !DESIGN_IMAGE_METHODS.includes(policy.designImageMethod) || !FORMAL_IMAGE_METHODS.includes(policy.formalImageMethod)) {
    throw new WorkflowError('图片路线记录与项目、技术栈或初始化选项不一致', 'INVALID_IMAGE_ROUTES');
  }
  return policy;
}

/** 继承时也复核首次 Work Item 的摘要，避免篡改后由新工作项重新固定。 */
function readFrozenPolicy(repo, work, path, ref) {
  const file = requireFile(repo, path, '初始化冻结的图片路线');
  const bytes = readFileSync(repoPath(repo, file).absolute);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (ref && ref.sha256 !== sha256) throw new WorkflowError('初始化冻结的图片路线已变化，请恢复原记录', 'INVALID_IMAGE_ROUTES');
  let record;
  try { record = JSON.parse(bytes.toString('utf8')); }
  catch { throw new WorkflowError('初始化冻结的图片路线不是有效 JSON，请恢复原记录', 'INVALID_IMAGE_ROUTES'); }
  const policy = validatePolicy(record, work);
  const owner = readJson(repo, policy.frozenByWorkItemPath, '首次冻结图片路线的工作项');
  if (owner.workItemId !== policy.frozenByWorkItemId || owner.projectId !== work.projectId || owner.stack !== work.stack
    || owner.imageRoutesRef?.path !== file || owner.imageRoutesRef.sha256 !== sha256) {
    throw new WorkflowError('图片路线不再匹配首次初始化的冻结记录，请恢复原记录', 'INVALID_IMAGE_ROUTES');
  }
  return { policy, ref: { path: file, sha256 } };
}

/** 所有后续阶段只读取初始化冻结的策略，并核对身份和内容摘要。 */
export function readImageRoutePolicy(repo, work) {
  const path = policyPath(work.projectId, work.stack);
  const ref = work.imageRoutesRef;
  if (!ref) {
    if (canBind(work) && needsImageChoice(work) && existsSync(repoPath(repo, path).absolute)) {
      throw new WorkflowError('当前工作项缺少项目初始化冻结的图片路线引用', 'INVALID_IMAGE_ROUTES');
    }
    return null;
  }
  if (!canBind(work) || ref.path !== path) throw new WorkflowError('工作项的图片路线引用与本项目不一致', 'INVALID_IMAGE_ROUTES');
  return readFrozenPolicy(repo, work, path, ref).policy;
}

/** 保存同一项目的首个选择，后续初始化只继承。两个文件写入失败时撤回本次新策略。 */
export async function withInitializedImageRoutes(repo, work, args, { workflowEntry, workPath, probeCodex }, saveWork) {
  const design = args['design-image-method'];
  const formal = args['formal-image-method'];
  const choosing = design !== undefined || formal !== undefined;
  if (!canBind(work)) {
    if (choosing) throw new WorkflowError('图片路线选项仅适用于有视觉范围的项目及工作项');
    return saveWork();
  }
  if (design !== undefined && !DESIGN_IMAGE_METHODS.includes(design)) throw new WorkflowError('--design-image-method 只接受 codex、host-tool 或 prompt-handoff');
  if (formal !== undefined && !FORMAL_IMAGE_METHODS.includes(formal)) throw new WorkflowError('--formal-image-method 只接受 svg-to-png 或 direct-image-generation');
  const path = policyPath(work.projectId, work.stack);
  const target = repoPath(repo, path, '图片路线记录');
  const initialize = choosing || ((workflowEntry || work.workItemType === 'PROJECT') && needsImageChoice(work));
  if (!initialize && !existsSync(target.absolute)) return saveWork();
  return withWorkLock(repo, path, async () => {
    const exists = existsSync(target.absolute);
    if (exists && choosing) throw new WorkflowError('项目图片路线已冻结，后续工作项必须继承初始化选择', 'IMAGE_ROUTES_FROZEN');
    if (exists) {
      const { policy, ref } = readFrozenPolicy(repo, work, path);
      work.imageRoutesRef = ref;
      return saveWork(policy);
    }
    if ((design === undefined || design === 'codex') && !probeCodex(repo)) {
      throw new WorkflowError('当前没有通过预检的 Codex。请在初始化时选择 --design-image-method host-tool 或 prompt-handoff', 'DESIGN_IMAGE_METHOD_REQUIRED');
    }
    const policy = {
      schemaVersion: '1.0', projectId: work.projectId, stack: work.stack,
      frozenByWorkItemId: work.workItemId, frozenByWorkItemPath: repoPath(repo, workPath).relative,
      designImageMethod: design ?? 'codex', formalImageMethod: formal ?? 'svg-to-png',
    };
    await atomicWriteJson(repo, path, policy);
    try {
      work.imageRoutesRef = { path, sha256: createHash('sha256').update(readFileSync(target.absolute)).digest('hex') };
      return await saveWork(policy);
    } catch (error) {
      unlinkSync(target.absolute);
      throw error;
    }
  });
}
