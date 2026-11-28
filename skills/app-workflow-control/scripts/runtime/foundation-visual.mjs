import { fileIdentityKey, readJson, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { getWorkSource } from './work-source.mjs';
import { isFigmaApp } from './figma-app-contract.mjs';
import { assertSameGameProject } from './game-project.mjs';

/** 比较冻结来源的项目内文件身份和内容摘要。 */
function sameRef(repo, left, right) {
  return Boolean(left?.path && right?.path && left.sha256 === right.sha256
    && fileIdentityKey(repo, left.path) === fileIdentityKey(repo, right.path));
}

/** 选择模块实际使用的基线路线，二维场景复用图片视觉基线。 */
function visualRoute(work) {
  if (work.visual?.designRoute === 'world-3d') return 'world-3d';
  return isFigmaApp(work) ? 'figma-app' : 'image';
}

/** 为基础工程的基线复核构造与基线路线相符的工作项上下文。 */
function baselineWork(foundation, baseline) {
  return {
    projectId: foundation.projectId,
    stack: foundation.stack,
    workItemType: baseline.route === 'figma-app' ? 'PAGE' : 'SCENE',
    globalVisualBaselineRef: baseline.ref,
    visual: {
      stage: 'V1',
      designRoute: baseline.route === 'image' ? 'image' : baseline.route,
      ...(baseline.designSource ? { designSource: baseline.designSource } : {}),
    },
  };
}

/** 核对基础工程冻结清单、用户确认及模块实际采用的视觉基线。 */
export function assertFoundationVisual(repo, work, { loadWork, validateGlobalBaseline }) {
  const isFoundation = work.workItemType === 'FOUNDATION';
  if (isFoundation && !work.foundationVisualRef) return null;
  if (!isFoundation && !work.visual) return null;
  if (typeof loadWork !== 'function' || typeof validateGlobalBaseline !== 'function') {
    throw new WorkflowError('基础视觉检查缺少工作项或基线检查器');
  }

  const manifestPath = productionIdentity(repo, work.foundationVisualRef, '基础视觉冻结清单');
  const manifest = readJson(repo, manifestPath, '基础视觉冻结清单');
  if (manifest?.schemaVersion !== '1.0' || manifest.projectId !== work.projectId || manifest.stack !== work.stack
    || !Array.isArray(manifest.baselines) || !manifest.baselines.length) {
    throw new WorkflowError('基础视觉冻结清单缺少当前项目、技术栈或视觉基线');
  }

  const sourcePath = getWorkSource(work);
  const foundation = isFoundation ? work : loadWork(repo, manifest.foundationWorkItemPath);
  const foundationPath = isFoundation ? sourcePath : getWorkSource(foundation);
  if (!foundation || !foundationPath || fileIdentityKey(repo, foundationPath) !== fileIdentityKey(repo, manifest.foundationWorkItemPath)
    || foundation.workItemType !== 'FOUNDATION' || foundation.stageId !== 'foundation-engineering'
    || foundation.projectId !== work.projectId || foundation.stack !== work.stack
    || !sameRef(repo, foundation.foundationVisualRef, work.foundationVisualRef)) {
    throw new WorkflowError('基础视觉来源与当前项目的基础工程冻结清单不一致');
  }
  if (!isFoundation && foundation.globalState !== 'COMPLETE') {
    throw new WorkflowError('基础视觉来源尚未完成基础工程');
  }
  assertSameGameProject(repo, work, foundation, '基础视觉来源');

  const routes = new Map();
  for (const entry of manifest.baselines) {
    if (!entry || !['image', 'figma-app', 'world-3d'].includes(entry.route) || routes.has(entry.route)) {
      throw new WorkflowError('基础视觉冻结清单的路线无效或重复');
    }
    const path = productionIdentity(repo, entry.ref, '基础视觉基线');
    const record = readJson(repo, path, '基础视觉基线');
    const context = baselineWork(foundation, entry);
    if ((entry.route === 'figma-app' && (!isFigmaApp(context) || record.designRoute !== 'figma-app'))
      || (entry.route === 'world-3d' && record.designRoute !== 'world-3d')
      || (entry.route === 'image' && ['world-3d', 'figma-app'].includes(record.designRoute))) {
      throw new WorkflowError('基础视觉基线登记路线与实际路线不一致');
    }
    // 使用现有基线校验器核对真实用户确认，摘要只能证明文件身份。
    validateGlobalBaseline(repo, context, { required: true });
    routes.set(entry.route, entry);
  }

  if (!isFoundation) {
    const entry = routes.get(visualRoute(work));
    if (!entry || !sameRef(repo, entry.ref, work.globalVisualBaselineRef)) {
      throw new WorkflowError('模块视觉基线与基础工程冻结来源不一致');
    }
    // 三维场景的 HUD 依然消费第 4 阶段独立确认的界面方向。
    if (work.visual.hud?.globalVisualBaselineRef
      && !sameRef(repo, routes.get('image')?.ref, work.visual.hud.globalVisualBaselineRef)) {
      throw new WorkflowError('HUD 视觉基线与基础工程冻结来源不一致');
    }
    validateGlobalBaseline(repo, work, { required: true });
  }
  return { manifest, foundation, routes };
}
