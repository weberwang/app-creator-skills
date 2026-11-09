/** Roblox 工程证据校验；只读已采集记录，不启动 Studio、不执行 Luau。 */
import { bindSourceBundle, captureRef, evidenceJson, instancePath, object, observedInCapture, sameRef, sourceRefs, studioIdentity, text, workIdentity } from './common.mjs';
import { WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';

/** 按工作类型确定是否必须有实际客户端或服务器运行检查。 */
function requiresRuntime(work) {
  return ['MODULE', 'INTEGRATION'].includes(work.workItemType) || ['V1', 'V5'].includes(work.visual?.stage);
}

/** 验证工程检查、实际结果和其对应的 Studio MCP 原始响应。 */
function validateChecks(repo, work, doc) {
  if (!Array.isArray(doc.checks) || !doc.checks.length) throw new WorkflowError('Roblox 工程证据缺少实际执行的检查');
  if (!Array.isArray(doc.requiredContexts) || new Set(doc.requiredContexts).size !== doc.requiredContexts.length || doc.requiredContexts.some((item) => !['Edit', 'Client', 'Server'].includes(item))) throw new WorkflowError('Roblox 工程证据 requiredContexts 无效');
  const runtimeRequired = requiresRuntime(work);
  if (runtimeRequired && !doc.requiredContexts.some((context) => ['Client', 'Server'].includes(context))) throw new WorkflowError('当前工作项必须声明实际 Client 或 Server 运行上下文');
  const ids = new Set();
  const covered = new Set();
  const executed = new Set();
  for (const check of doc.checks) {
    object(check, 'Roblox 工程检查');
    text(check.id, '工程检查.id');
    if (ids.has(check.id)) throw new WorkflowError('Roblox 工程检查 ID 重复');
    ids.add(check.id);
    text(check.expected, '工程检查预期');
    text(check.actual, '工程检查实际');
    if (check.expected !== check.actual) throw new WorkflowError('工程检查预期和实际不一致，不能仅凭自填 PASS 通过');
    if (!['Edit', 'Client', 'Server'].includes(check.context)) throw new WorkflowError('工程检查必须明确实际上下文');
    if (check.status !== 'PASS') throw new WorkflowError('未通过或未运行的检查不能当作工程通过');
    const capture = captureRef(repo, check.captureRef, work, doc.studio, { context: check.context, tools: ['execute_luau', 'inspect_instance', 'script_read', 'get_console_output', 'get_studio_state', 'character_navigation', 'user_keyboard_input', 'user_mouse_input'] });
    if (['Client', 'Server'].includes(capture.context)) bindSourceBundle(repo, capture, doc.sources);
    // 观测值必须出现在原始工具响应中，防止只填写一段独立的成功摘要。
    observedInCapture(capture, check.actual, '工程检查实际');
    covered.add(capture.context);
    if (capture.toolName === 'execute_luau') executed.add(capture.context);
    if (check.inputCaptureRef) {
      // 单纯查看 Studio 状态或实例存在不能冒充一条已执行的交互用例。
      if (!['inspect_instance', 'get_console_output', 'execute_luau'].includes(capture.toolName)) throw new WorkflowError('输入用例缺少实际结果观察');
      const input = captureRef(repo, check.inputCaptureRef, work, doc.studio, { context: check.context, tools: ['character_navigation', 'user_keyboard_input', 'user_mouse_input'] });
      if (input.context === 'Client' && input.clientId !== capture.clientId) throw new WorkflowError('输入与结果观察必须绑定同一客户端');
      if (['Client', 'Server'].includes(input.context)) bindSourceBundle(repo, input, doc.sources);
      if (Date.parse(input.observedAt) > Date.parse(capture.observedAt)) throw new WorkflowError('结果观察不能早于实际输入');
      executed.add(check.context);
    }
  }
  for (const context of doc.requiredContexts) if (!covered.has(context)) throw new WorkflowError(`Roblox 工程检查缺少 ${context} 实际运行记录`);
  if (runtimeRequired) for (const context of doc.requiredContexts.filter((item) => ['Client', 'Server'].includes(item))) {
    if (!executed.has(context)) throw new WorkflowError(`${context} 需要实际 Luau 执行或输入后的结果观察，状态查询不能替代功能测试`);
  }
  return covered;
}

/** 验证工作项的源文件、Edit 回读和实际运行证据，绝不执行 Studio 操作。 */
export function validateRobloxEngineering(repo, work, manifest, pack) {
  const items = Array.isArray(manifest?.items) ? manifest.items.filter((item) => item?.category === 'roblox-engineering' && item.status === 'PASS') : [];
  if (items.length !== 1) throw new WorkflowError('必须绑定唯一 PASS 的 roblox-engineering 证据');
  const doc = evidenceJson(repo, items[0].path, work, 'Roblox 工程证据');
  if (doc.schemaVersion !== 'roblox-engineering/1.0') throw new WorkflowError('Roblox 工程证据版本无效');
  workIdentity(doc, work);
  if (pack?.workItemId !== work.workItemId || pack?.stack !== 'roblox' || pack?.workItemType !== work.workItemType) throw new WorkflowError('Roblox 工程证据的实施包身份错绑');
  if (manifest?.workItemId !== work.workItemId || manifest?.stack !== 'roblox' || manifest?.implementationPackageRef !== work.implementationPackageRef?.path) throw new WorkflowError('Roblox 工程证据清单身份错绑');
  studioIdentity(repo, doc.studio);
  sourceRefs(repo, work, pack, doc.sources, doc.studio.place.snapshotRef, doc.studio);
  const root = object(doc.root, 'Roblox 正式对象根');
  text(root.objectId, 'Roblox 正式对象根 objectId');
  instancePath(root.instancePath, 'Roblox 正式对象根路径');
  if (work.visual && root.objectId !== work.visual.objectId) throw new WorkflowError('Roblox 工程证据未绑定当前视觉对象');
  const readback = captureRef(repo, doc.editReadbackRef, work, doc.studio, { context: 'Edit', tools: ['inspect_instance', 'execute_luau'], targetPath: root.instancePath, savedReadback: true });
  sameRef(repo, readback.placeSnapshotRef, doc.studio.place.snapshotRef, 'Edit 回读来源');
  const contexts = validateChecks(repo, work, doc);
  return { status: 'PASS', scope: 'record-consistency', contexts: [...contexts] };
}
