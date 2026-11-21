import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateUiLayoutPlan } from '../../../unity-development-workflow/scripts/layout-plan-validation.mjs';
import { readVerifiedUiLayoutMeasurement } from '../../../unity-domain-contracts/scripts/runtime/ui-layout-evidence.mjs';
import { fileIdentityKey, readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { readTargetRuntimeLayoutRef } from './runtime-layout-evidence.mjs';

/** 阶段回退已经废弃的路线和测量不得在新记录中重新引用。 */
function requireCurrentPath(repo, work, path, label) {
  const key = fileIdentityKey(repo, path);
  if (work.invalidatedRefs?.some((ref) => ref.path && fileIdentityKey(repo, ref.path) === key)) {
    throw new WorkflowError(`${label} 使用已作废证据：${path}`);
  }
  return key;
}

/** 读取冻结文件的实际字节，解析与摘要使用同一内容。 */
function readFrozenJson(repo, work, reference, label) {
  const { path, sha256 } = reference ?? {};
  if (!path || !/^[a-f0-9]{64}$/.test(sha256 ?? '')) throw new WorkflowError(`${label} 缺少路径或摘要`);
  requireCurrentPath(repo, work, path, label);
  const file = requireFile(repo, path, label);
  const bytes = readFileSync(repoPath(repo, file, label).absolute);
  if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new WorkflowError(`${label} 内容与冻结摘要不符`);
  return JSON.parse(bytes.toString('utf8'));
}

/** 当前状态的拆解文字必须被布局计划覆盖，换成装饰节点也算缺项。 */
function requireTextCoverage(plan, split, visibleText) {
  if (!Array.isArray(split.items) || !split.items.length) throw new WorkflowError('Unity V3 拆解缺少可见节点范围');
  const active = new Map(split.items.filter((item) => Array.isArray(item?.stateVariants)
    && item.stateVariants.some((state) => state?.id === plan.stateId)).map((item) => [item.id, item]));
  if (!active.size) throw new WorkflowError(`Unity V3 拆解未声明状态 ${plan.stateId}`);
  const planNodes = new Map(plan.nodes.map((node) => [node.id, node]));
  const visibleIds = new Set(visibleText.map((node) => node.id));
  for (const item of active.values()) {
    if (item.visualRouteAnalysis?.elementType !== 'text') continue;
    const targets = item.targetPrefabNodeIds;
    if (!Array.isArray(targets) || !targets.length || targets.some((id) => planNodes.get(id)?.decompositionElementId !== item.id)
      || !targets.some((id) => visibleIds.has(id))) {
      throw new WorkflowError(`Unity V3 文字拆解项 ${item.id} 的当前布局缺少文字节点或样式：${targets?.join?.('、') ?? '未声明节点'}`);
    }
  }
  for (const node of visibleText) {
    const targets = active.get(node.decompositionElementId)?.targetPrefabNodeIds;
    if (!Array.isArray(targets) || !targets.includes(node.id) || node.textStyle.source !== split.sourceImage.path) {
      throw new WorkflowError(`Unity 文字节点 ${node.id} 的样式来源未绑定当前确认稿和拆解项`);
    }
  }
}

/** 从同一份 V3 确认记录读取原生布局计划，V5 沿用其身份和公开运行证据。 */
export function validateUnityTextStage(repo, work, target, stage, native, evidence) {
  if (stage === 'V2') return;
  const review = readJson(repo, target.reviews?.V3Layout?.path, 'Unity V3 布局确认');
  const ref = review.layoutSpecRef;
  const plan = readFrozenJson(repo, work, ref, 'Unity V3 布局确认 layoutSpecRef');
  const errors = validateUiLayoutPlan(plan, { requireDerived: true });
  if (errors.length) throw new WorkflowError(`Unity V3 布局计划未通过：${errors.join('；')}`);
  const uiSystem = native.responsiveContract.uiSystem === 'UI Toolkit' ? 'UI_TOOLKIT' : 'UGUI';
  if (plan.sceneId !== target.sceneId || !plan.scenePath || plan.uiSystem !== uiSystem
    || plan.stateId !== target.stateId
    || plan.displayLayerId !== native.displayLayer?.displayLayerId) {
    throw new WorkflowError('Unity V3 布局计划与当前场景、状态、界面系统或显示层错绑');
  }
  const split = readFrozenJson(repo, work, { path: plan.splitPlanRef?.path, sha256: plan.splitPlanSha256 }, 'Unity 设计拆解来源');
  if (split.sourceImage?.path !== target.referenceTarget.path) throw new WorkflowError('Unity 设计拆解未绑定 V2 确认目标');
  const visibleText = plan.nodes.filter((node) => node.renderKind === 'TEXT' && node.expectedActive !== false);
  requireTextCoverage(plan, split, visibleText);
  if (stage !== 'V5' || !visibleText.length) return;

  const refMeasurement = evidence?.uiLayoutMeasurementRef;
  const nodes = visibleText.map((node) => node.id).join('、');
  if (!refMeasurement?.path) throw new WorkflowError(`Unity V5 文字节点 ${nodes} 缺少 uiLayoutMeasurementRef，实际组件和材质属性未回读`);
  if (evidence.candidateId !== target.candidateId) throw new WorkflowError('Unity V5 文字测量未绑定当前候选');
  const measurementKey = requireCurrentPath(repo, work, refMeasurement.path, 'Unity V5 布局测量');
  if (refMeasurement.textEvidencePath) requireCurrentPath(repo, work, refMeasurement.textEvidencePath, 'Unity V5 补充文字测量');
  const currentLayout = readTargetRuntimeLayoutRef(repo, work, target.targetId);
  // 同一个布局采集文件既是工作流运行证据也是原生文字读数，避免通过两份无关联的 PASS。
  if (!currentLayout || fileIdentityKey(repo, currentLayout.path) !== measurementKey) {
    throw new WorkflowError(`Unity V5 文字节点 ${nodes} 的布局测量须与当前目标的 runtime-layout 证据指向同次运行文件`);
  }
  readVerifiedUiLayoutMeasurement(repo, work, evidence, plan, {
    taskId: work.workItemId, layoutPlanSha256: ref.sha256,
    textOnly: native.responsiveContract.uiSystem === 'World Space Canvas',
  });
}
