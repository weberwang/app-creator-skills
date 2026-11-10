import { existsSync } from 'node:fs';
import { GATES, VERSION } from './constants.mjs';
import { atomicWriteJson, repoPath, WorkflowError } from './io.mjs';
import { loadProfile, requireOneOf, requireText, validateWork } from './validation.mjs';
import { withWorkLock } from './work-lock.mjs';
import { response } from './responses.mjs';
import { bindProductionScope } from './production-scope.mjs';

/** 创建不覆盖已有文件的最小 Work Item 与固定目录布局。 */
export async function initializeWork({ repo, args }) {
  requireText(args?.id, '--id');
  const workPath = args['work-item'] ?? `.workflow-control/work-items/${args.id}.json`;
  return withWorkLock(repo, workPath, () => initializeWorkLocked({ repo, args }));
}

/** 在已取得 Work Item 排他锁后执行初始化，避免同名并发创建竞争。 */
async function initializeWorkLocked({ repo, args }) {
  const id = args.id;
  const stack = args.stack;
  const type = args.type ?? 'FOUNDATION';
  const mode = args.mode ?? 'standard';
  const objective = args.objective;
  requireText(id, '--id');
  requireText(objective, '--objective');
  requireOneOf(type, ['PROJECT', 'FOUNDATION', 'MODULE', 'SCENE', 'PAGE', 'DISPLAY_LAYER', 'INTEGRATION', 'RELEASE'], '--type');
  const profile = loadProfile(repo, stack);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id)) throw new WorkflowError('--id 只能包含字母、数字、点、下划线和短横线');
  const workPath = args['work-item'] ?? `.workflow-control/work-items/${id}.json`;
  const workTarget = repoPath(repo, workPath, 'Work Item 输出路径');
  if (existsSync(workTarget.absolute)) throw new WorkflowError(`拒绝覆盖现有 Work Item：${workPath}`, 'ALREADY_EXISTS');
  const visualType = ['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(type);
  const integrationPurpose = type === 'INTEGRATION' ? (args['integration-purpose'] ?? 'feature') : undefined;
  if (integrationPurpose !== undefined) requireOneOf(integrationPurpose, ['feature', 'final'], '--integration-purpose');
  if (type !== 'INTEGRATION' && args['integration-purpose'] !== undefined) throw new WorkflowError('只有 INTEGRATION 可以使用 --integration-purpose');
  if (visualType && type === 'DISPLAY_LAYER') {
    requireText(args['host-id'], '--host-id');
    requireOneOf(args['layer-type'], ['modal', 'popup', 'drawer', 'toast'], '--layer-type');
  }
  const work = {
    schemaVersion: VERSION,
    workItemId: id,
    projectId: args['project-id'] ?? 'default-project',
    stack,
    workItemType: type,
    stageId: type === 'PROJECT' ? 'requirements-scope' : type === 'INTEGRATION' && integrationPurpose === 'final' ? 'global-integration-validation' : type === 'RELEASE' ? 'release' : visualType ? 'scene-production' : 'foundation-engineering',
    globalState: mode === 'light' ? 'REVIEW' : 'INTAKE',
    workflowMode: mode,
    ...(type === 'RELEASE' ? { releaseIntent: args['release-intent'] ?? 'prepare' } : {}),
    ...(type === 'INTEGRATION' ? { integrationPurpose } : {}),
    objective,
    allowedPaths: [...profile.runtimeRoots],
    forbiddenPaths: ['node_modules/**', '**/.git/**', '**/Library/**', '**/Temp/**'],
    gateStatus: Object.fromEntries(GATES.map((gate) => [gate, 'NOT_RUN'])),
    revision: 0,
    implementationPackageRef: null,
    planningRef: null,
    evidenceRef: null,
    globalVisualBaselineRef: null,
    assetReviewRef: null,
    grillingRef: null,
    visualBaselineRequired: visualType,
    evidenceRoot: `.workflow-control/evidence/${id}`,
    ...(visualType ? { visual: {
      objectId: args['object-id'] ?? id,
      stageModel: 'function-first-v1',
      stage: 'V0',
      ...(type === 'DISPLAY_LAYER' ? { hostId: args['host-id'], layerType: args['layer-type'] } : {}),
      ...(type === 'SCENE' ? { targets: [] } : { reviews: {} }),
    } } : {}),
  };
  if (type !== 'RELEASE' && args['release-intent'] !== undefined) throw new WorkflowError('只有 RELEASE 可以使用 --release-intent');
  for (const key of ['production-scope', 'production-batch', 'production-dependencies']) if (args[key] !== undefined) requireText(args[key], `--${key}`);
  bindProductionScope(repo, work, { scopePath: args['production-scope'], batchId: args['production-batch'], dependenciesPath: args['production-dependencies'] });
  validateWork(work, { repo });
  await atomicWriteJson(repo, workPath, work);
  return response({ status: 'PASS', work, changed: true, metadata: { workItemPath: workPath, stackProfile: profile.displayName } });
}
