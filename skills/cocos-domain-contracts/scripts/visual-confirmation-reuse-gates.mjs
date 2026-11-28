import { validateVisualDecompositionConfirmations, buildVisualConfirmationAuthorityByRegion } from './visual-decomposition-confirmation.mjs';
import { nonEmptyString, VISUAL_PRODUCTION_METHODS as PRODUCTION_METHODS } from './visual-contract-core.mjs';
import { createVisualConfirmationReuseGates } from '../../app-domain-toolkit/scripts/visual/visual-confirmation-reuse-gates.mjs';

/** 同一门禁注入当前栈的确认合同和生产方法表。 */
const gates = createVisualConfirmationReuseGates({
  validateVisualDecompositionConfirmations, buildVisualConfirmationAuthorityByRegion, nonEmptyString, PRODUCTION_METHODS,
});
export const { validateVisualConfirmationGate, validateProductionMethodChangeRequest } = gates;
export { REUSE_SCHEMA, validateReuseProductionGate } from '../../app-domain-toolkit/scripts/visual/asset-reuse-contract.mjs';
