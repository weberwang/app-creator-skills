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
  validateDesignOptions(args);
  const workPath = args['work-item'] ?? `.workflow-control/work-items/${args.id}.json`;
  return withWorkLock(repo, workPath, () => initializeWorkLocked({ repo, args }));
}

/** 在创建锁和目录前拒绝不适用于当前对象的设计路线及用途。 */
function validateDesignOptions(args) {
  const stack = args.stack;
  const type = args.type ?? 'FOUNDATION';
  const route = args['design-route'];
  const intent = args['design-intent'];
  const appVisual = ['flutter', 'expo', 'esp32'].includes(stack) && ['PAGE', 'DISPLAY_LAYER'].includes(type);
  const gameScene = ['unity', 'cocos', 'phaser', 'threejs', 'roblox'].includes(stack) && type === 'SCENE';
  if (route !== undefined) {
    requireOneOf(route, ['figma-app', 'world-2d', 'world-3d', 'game-ui'], '--design-route');
    if (['world-2d', 'world-3d', 'game-ui'].includes(route) && !gameScene) throw new WorkflowError(`${route} 设计路线仅适用于游戏 SCENE`);
    if (route === 'figma-app' && !appVisual) throw new WorkflowError('设计路线和用途仅适用于非游戏 App 页面与显示层');
  }
  if (intent !== undefined) {
    if (gameScene) {
      if (intent !== 'implementation') throw new WorkflowError('游戏场景设计路线只支持 implementation，不支持仅设计提案');
    } else if (!appVisual) throw new WorkflowError('设计路线和用途仅适用于非游戏 App 页面与显示层');
    else requireOneOf(intent, ['implementation', 'proposal'], '--design-intent');
  }
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
      // 游戏场景默认按二维世界处理；纯 UI 必须显式分类，避免靠遗漏声明绕过空间前置。
      ...(type === 'SCENE'
        ? { designRoute: args['design-route'] ?? 'world-2d', ...(args['design-intent'] !== undefined ? { designIntent: args['design-intent'] } : {}) }
        : ['flutter', 'expo'].includes(stack) || args['design-route'] || args['design-intent']
          ? { designRoute: args['design-route'] ?? 'figma-app', designIntent: args['design-intent'] ?? 'implementation' } : {}),
      ...(type === 'DISPLAY_LAYER' ? { hostId: args['host-id'], layerType: args['layer-type'] } : {}),
      ...(type === 'SCENE' ? (args['design-route'] === 'world-3d' ? {} : { targets: [] }) : { reviews: {} }),
    } } : {}),
  };
  if (type !== 'RELEASE' && args['release-intent'] !== undefined) throw new WorkflowError('只有 RELEASE 可以使用 --release-intent');
  for (const key of ['production-scope', 'production-batch', 'production-dependencies']) if (args[key] !== undefined) requireText(args[key], `--${key}`);
  bindProductionScope(repo, work, { scopePath: args['production-scope'], batchId: args['production-batch'], dependenciesPath: args['production-dependencies'] });
  validateWork(work, { repo });
  await atomicWriteJson(repo, workPath, work);
  return response({ status: 'PASS', work, changed: true, metadata: { workItemPath: workPath, stackProfile: profile.displayName } });
}
