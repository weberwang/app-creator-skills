import { validateArtExperienceAcceptance } from './art-experience-acceptance-contract.mjs';
import { validateGlobalVisualBaselineSelectionReferenceShape } from './global-visual-baseline-contract.mjs';
import { V2_PLAN_FIELDS } from './v2-reconstruction-plan-contract.mjs';
import { canonicalJson, deriveVisualDisposition, earliestVisualReturnStage as earliestReturnStage, isPlainObject as isObject, nonEmptyString as nonEmpty, VISUAL_REMEDIATION, VISUAL_REMEDIATION_LABEL, VISUAL_REMEDIATION_NEXT_ACTION } from './visual-contract-core.mjs';
import { createVisualStagePrerequisites } from '../../app-domain-toolkit/scripts/visual/visual-stage-prerequisites.mjs';

/** 沿用本栈公开入口并注入实际合同，避免跨栈架构互相依赖。 */
const gates = createVisualStagePrerequisites({
  validateArtExperienceAcceptance, validateGlobalVisualBaselineSelectionReferenceShape, V2_PLAN_FIELDS,
  canonicalJson, deriveVisualDisposition, earliestReturnStage, isObject, nonEmpty, VISUAL_REMEDIATION,
  VISUAL_REMEDIATION_LABEL, VISUAL_REMEDIATION_NEXT_ACTION,
  reconstructionSchema: 'threejs-scene-v2-reconstruction-plan/1.0',
  layoutSchema: 'threejs-layout-nodes/1.0',
  graphicsMethod: 'threejs-graphics',
});

export { VISUAL_REMEDIATION };
export const {
  VISUAL_STAGE_IDS, VISUAL_STAGE_STATES, VISUAL_STAGE_STATE_FOR, VISIBLE_VISUAL_BEHAVIORS,
  normalizeVisualStage, readVisualStage, validateVisualStageDeclaration, classifyVisibleVisualProductionIntegration,
  loadImmutableVisualStageReference, visualPrerequisiteSnapshot, validateStandardV3ProductionPlan,
  validateVisualStagePrerequisites, VisualStagePrerequisiteError, assertVisualStagePrerequisites,
  structuredVisualStageFailure, enforceVisualStageGate,
} = gates;
