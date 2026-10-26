/** 控制面唯一数据版本。 */
export const VERSION = '1.0';
/** 项目级统一阶段及名称。 */
export const STAGES = Object.freeze([
  'requirements-scope', 'global-baseline', 'foundation-engineering',
  'scene-production', 'global-integration-validation', 'release',
]);
/** 工作项类型覆盖游戏场景、应用页面及瞬态显示层。 */
export const WORK_ITEM_TYPES = Object.freeze([
  'PROJECT', 'FOUNDATION', 'MODULE', 'SCENE', 'PAGE', 'DISPLAY_LAYER',
  'INTEGRATION', 'RELEASE',
]);
/** 共享状态迁移图；BLOCKED 与 RETURN 只能通过显式 transition 恢复。 */
export const TRANSITIONS = Object.freeze({
  INTAKE: ['BASELINE', 'BLOCKED'], BASELINE: ['PROPOSAL', 'BLOCKED'],
  PROPOSAL: ['REVIEW', 'BLOCKED', 'RETURN'],
  REVIEW: ['IMPLEMENTING', 'VALIDATING', 'BLOCKED', 'RETURN'],
  IMPLEMENTING: ['VALIDATING', 'BLOCKED', 'RETURN'],
  VALIDATING: ['PASSED', 'BLOCKED', 'RETURN'],
  PASSED: ['INTEGRATING', 'RELEASE_APPROVAL_REQUIRED', 'COMPLETE', 'BLOCKED', 'RETURN'],
  INTEGRATING: ['COMPLETE', 'RELEASE_APPROVAL_REQUIRED', 'BLOCKED', 'RETURN'],
  RELEASE_APPROVAL_REQUIRED: ['RELEASING', 'BLOCKED', 'RETURN'],
  RELEASING: ['COMPLETE', 'BLOCKED'],
  RETURN: ['BASELINE', 'PROPOSAL', 'REVIEW', 'IMPLEMENTING'],
  BLOCKED: ['INTAKE', 'BASELINE', 'PROPOSAL', 'REVIEW', 'IMPLEMENTING', 'VALIDATING', 'PASSED', 'INTEGRATING', 'RELEASE_APPROVAL_REQUIRED', 'RELEASING', 'RETURN'], COMPLETE: [],
});
/** 技术栈名称保持稳定，项目配置不得自行创建新栈分支。 */
export const STACKS = Object.freeze(['unity', 'cocos', 'phaser', 'threejs', 'flutter']);
/** 执行中副作用较高的动作必须显式停止等待人工决定。 */
export const PROTECTED_ACTIONS = new Set([
  'external-write', 'device', 'sign', 'upload', 'publish', 'payment', 'destructive',
]);
/** 单次工作项中可记录的工程质量门。 */
export const GATES = Object.freeze(['F0', 'F1', 'F2', 'F3', 'F4']);
/** 全局阶段标签仅供稳定诊断输出。 */
export const STAGE_LABELS = Object.freeze({
  'requirements-scope': '需求与范围', 'global-baseline': '全局基线',
  'foundation-engineering': '基础工程', 'scene-production': '场景与页面生产',
  'global-integration-validation': '全局集成验证', release: '发布',
});
/** 视觉阶段按用户可见交付顺序推进。 */
export const VISUAL_STAGES = Object.freeze(['V0', 'V1', 'V2', 'V3', 'V4']);
/** 类型到领域类别映射，供技术报告区分游戏与应用验收。 */
export function workCategory(type) {
  return type === 'PAGE' ? 'app' : ['SCENE', 'DISPLAY_LAYER'].includes(type) ? 'game' : 'project';
}
