import { isDeepStrictEqual } from 'node:util';
import { mergeTextStyleEvidence } from '../../../unity-development-workflow/scripts/text-style-validation.mjs';
import { readJson, WorkflowError } from './io.mjs';
import { readV4AcceptanceDecision } from './visual-acceptance-evidence.mjs';
import { verifyUnityTrialCapture } from './unity-trial-capture-evidence.mjs';

/** 核对 Unity 资源评审、原生试装报告与用户确认的同一截图。 */
export function readApprovedUnityTextTrial(repo, work, target, restoration) {
  const ref = restoration.review.textAcceptanceRef;
  if (ref === undefined) return false;
  const { decision, screenshot } = readV4AcceptanceDecision(repo, work, target, restoration.review, ref, 'visual-text-acceptance/1.0');
  if (!isDeepStrictEqual(decision.textRestorationRef, restoration.ref)) throw new WorkflowError('Unity 文字试装决议未绑定同一份原生报告');
  verifyUnityTrialCapture(repo, work, target, screenshot, restoration.ref, restoration.report, decision.gameViewCaptureRef);
  return true;
}

/** 按名称唯一索引实测属性，同时保留真实组件、属性路径与实际值。 */
function observationIndex(observations, nodeId) {
  if (!Array.isArray(observations) || !observations.length) throw new WorkflowError(`Unity 文字节点 ${nodeId} 缺少实际属性读数`);
  const values = new Map();
  for (const item of observations) {
    if (typeof item?.name !== 'string' || !item.name.trim() || values.has(item.name)
      || typeof item.componentType !== 'string' || !item.componentType.trim()
      || typeof item.propertyPath !== 'string' || !item.propertyPath.trim()
      || item.status !== 'MEASURED' || typeof item.actualValue !== 'string') {
      throw new WorkflowError(`Unity 文字节点 ${nodeId} 的实际组件属性缺失或重复`);
    }
    values.set(item.name, { componentType: item.componentType, propertyPath: item.propertyPath, actualValue: item.actualValue });
  }
  return values;
}

/** 将原生附加证据按同一采集批次合并，沿用 Unity 现有冲突检查。 */
function textEvidence(repo, report, supplementalPath) {
  if (!supplementalPath) return new Map();
  const extra = readJson(repo, supplementalPath, 'Unity V5 补充文字测量');
  const errors = [];
  const merged = mergeTextStyleEvidence(report, extra, errors);
  if (errors.length) throw new WorkflowError(`Unity 补充文字测量无效：${errors.join('；')}`);
  return merged;
}

/** 逐节点复验同一实际文字组件与全部已确认属性，不比较随视口变化的布局坐标。 */
export function verifyApprovedUnityTextTrial(repo, plan, trial, current, supplementalPath) {
  const extras = textEvidence(repo, current, supplementalPath);
  for (const node of plan.nodes.filter((item) => item.renderKind === 'TEXT' && item.expectedActive !== false)) {
    const previous = trial.measurements.filter((item) => item?.id === node.id);
    const latest = current.measurements.filter((item) => item?.id === node.id);
    if (previous.length !== 1 || latest.length !== 1 || previous[0].componentSnapshot?.active !== true
      || latest[0].componentSnapshot?.active !== true || !previous[0].objectPath
      || previous[0].objectPath !== latest[0].objectPath
      || (plan.uiSystem === 'UI_TOOLKIT' && (!previous[0].elementName || previous[0].elementName !== latest[0].elementName))) {
      throw new WorkflowError(`Unity 文字节点 ${node.id} 未复验同一活动组件`);
    }
    const expected = observationIndex(previous[0].componentSnapshot.textStyle, node.id);
    const actual = observationIndex(extras.get(node.id) ?? latest[0].componentSnapshot.textStyle, node.id);
    if (expected.size !== actual.size || [...expected].some(([name, value]) => !isDeepStrictEqual(actual.get(name), value))) {
      throw new WorkflowError(`Unity 文字节点 ${node.id} 的组件属性未复验已确认试装`);
    }
  }
}
