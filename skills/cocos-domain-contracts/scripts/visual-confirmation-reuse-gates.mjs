#!/usr/bin/env node

/**
 * 视觉确认与既有资源复用的跨阶段硬门。
 *
 * 该模块保持 confirmation/reuse 规则与生产合同主流程解耦，避免主合同文件
 * 继续堆叠跨阶段身份检查。复用资源永远需要不可变快照，不能由方法字段自证。
 */
import { validateVisualDecompositionConfirmations, buildVisualConfirmationAuthorityByRegion } from "./visual-decomposition-confirmation.mjs";
import { nonEmptyString, VISUAL_PRODUCTION_METHODS as PRODUCTION_METHODS } from "./visual-contract-core.mjs";

export { REUSE_SCHEMA, validateReuseProductionGate } from "../../app-domain-toolkit/scripts/visual/asset-reuse-contract.mjs";

/** 统一生成门禁错误，保证每条失败都能定位编号和区域。 */
function gateError(context = {}, message, details = {}) {
  const stage = context.stage ?? "V4";
  const annotation = context.annotation_number ?? context.annotationNumber ?? "?";
  const region = context.region_id ?? context.regionId ?? "?";
  const expected = details.expectedMethod ?? context.expectedMethod ?? "production-contract";
  const observed = details.observedMethod ?? context.observedMethod ?? "missing";
  const missing = details.missing ? ` 缺失=${details.missing}` : "";
  return `[${stage}] annotation_number=${annotation} region_id=${region} expected_method=${expected} observed_method=${observed}${missing} ${message}`;
}
/** 统一 Change Request 的上下文，避免生产主文件重复拼接错误。 */
function changeContext(region, expectedMethod, observedMethod) {
  return { stage: "CHANGE_REQUEST", annotation_number: region?.annotation_number ?? "*", region_id: region?.id ?? region?.region_id ?? "*", expectedMethod, observedMethod };
}

/**
 * 将确认门固定为一个入口；调用方必须把 workflow authority 原样传入。
 * 缺少 check-files/authority 时由下层返回 decision gap，而不是浅层放行。
 */
export function validateVisualConfirmationGate(manifest, options = {}) {
  const authority = options.authority ?? options;
  const authorityByRegion = options.authorityByRegion ?? buildVisualConfirmationAuthorityByRegion(manifest, { ...options, authority });
  return validateVisualDecompositionConfirmations(manifest, { ...options, authorityByRegion, authority });
}

/** 校验方法变更只能由完整 ACCEPTED 用户 Change Request 授权。 */
export function validateProductionMethodChangeRequest(change, context = {}) {
  const errors = [];
  const changes = Array.isArray(change?.production_method_changes) ? change.production_method_changes : (Array.isArray(change?.productionMethodChanges) ? change.productionMethodChanges : []);
  if (!changes.length) {
    const prefix = changeContext(context, context.proposedMethod ?? "production-method", "missing");
    if (change?.status !== "ACCEPTED" && context.workItemId) errors.push(gateError(prefix, `Change Request ${change?.changeRequestId ?? change?.change_request_id ?? change?.id ?? "?"} 必须为 ACCEPTED 用户决定`, { missing: "status=ACCEPTED" }));
    if (context.annotation_number !== undefined || context.region_id !== undefined || context.previousMethod !== undefined || context.proposedMethod !== undefined) errors.push(gateError(prefix, "Change Request 缺少逐区域 production_method_changes", { missing: "production_method_changes" }));
    return errors;
  }
  const requestWorkItem = change.workItemId; const requestCandidateVersion = change.candidateVersion;
  const requestContext = changeContext({ annotation_number: context.annotation_number, id: context.region_id }, context.proposedMethod ?? "production-method", context.previousMethod ?? "missing");
  const requestError = (message) => errors.push(gateError(requestContext, message));
  if (context.workItemId && requestWorkItem !== context.workItemId) requestError("workItemId 与当前工作项不一致");
  if (context.candidateVersion && requestCandidateVersion !== context.candidateVersion) requestError("candidateVersion 与当前候选版本不一致");
  for (const [index, item] of changes.entries()) {
    const local = changeContext({ annotation_number: item?.annotation_number, id: item?.region_id }, item?.proposed_method ?? "proposed-method", item?.previous_method ?? "previous-method");
    const error = (message, missing = "") => errors.push(gateError(local, `production method 变更[${index}] ${message}`, { missing }));
    if (change.status !== "ACCEPTED") error("只有 ACCEPTED Change Request 才能变更 production_method");
    if (!nonEmptyString(change.changeRequestId ?? change.change_request_id ?? change.id)) error("缺少 changeRequestId", "changeRequestId");
    if (!nonEmptyString(requestWorkItem)) error("缺少 workItemId", "workItemId");
    if (Object.hasOwn(change, "work_item_id")) error("禁止使用旧 work_item_id，必须使用 workItemId", "workItemId");
    if (Object.hasOwn(change, "candidate_version")) error("禁止使用旧 candidate_version，必须使用 candidateVersion", "candidateVersion");
    if (!nonEmptyString(requestCandidateVersion)) error("缺少候选版本绑定", "candidateVersion");
    if (!nonEmptyString(change.user_original_text ?? change.userOriginalText ?? change.user_original_request ?? change.userOriginalRequest ?? change.original_user_text ?? change.originalUserText)) error("缺少用户原文绑定", "user_original_text");
    const decidedAt = change.accepted_at ?? change.acceptedAt ?? change.decided_at ?? change.decidedAt;
    if (!nonEmptyString(decidedAt) || Number.isNaN(Date.parse(decidedAt))) error("缺少有效决定时间", "accepted_at");
    for (const field of ["region_id", "previous_method", "proposed_method"]) if (!nonEmptyString(item?.[field])) error(`缺少 ${field}`, field);
    if (!Number.isInteger(item?.annotation_number) || item.annotation_number <= 0) error("缺少合法 annotation_number", "annotation_number");
    if (context.annotation_number !== undefined && item.annotation_number !== context.annotation_number) error("annotation_number 与当前区域不一致", "annotation_number");
    if (context.region_id !== undefined && (item.region_id ?? item.regionId) !== context.region_id) error("region_id 与当前区域不一致", "region_id");
    if (context.previousMethod !== undefined && item.previous_method !== context.previousMethod) error("previous_method 与当前区域旧方法不一致", "previous_method");
    if (context.proposedMethod !== undefined && item.proposed_method !== context.proposedMethod) error("proposed_method 与当前区域新方法不一致", "proposed_method");
    if (item?.previous_method === item?.proposed_method) error("previous_method 与 proposed_method 不得相同");
    if (nonEmptyString(item?.proposed_method) && !PRODUCTION_METHODS.has(item.proposed_method)) error(`proposed_method 无效：${item.proposed_method}`);
  }
  return errors;
}
