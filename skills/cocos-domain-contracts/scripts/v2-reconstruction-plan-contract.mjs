/** V2 工件协议名保持稳定；该协议在统一工作流中承载 V3 冻结方案。 */
export const V2_PLAN_FIELDS = Object.freeze([
  'schemaVersion', 'visualStageModel', 'workItemId', 'status', 'stage', 'frozen', 'sceneId',
  'sceneMaster', 'sceneReconstructionContract', 'decompositionAnnotation', 'technicalDecomposition',
  'visualDecompositionConfirmation', 'visualProductionContract', 'visualProductionUnits', 'displayLayerContexts',
]);
