/** Roblox 正式运行、实例绑定和实际输入轨迹的只读验证。 */
import { WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { bindSourceBundle, captureRef, instancePath, jsonIdentity, object, observedInCapture, observedNode, samePlace, sameRef, studioIdentity, text, workIdentity } from './common.mjs';
import { validateScreenReadback } from './screen-layout.mjs';

/** 检查 V5 Client 中的真实实例映射及输入反馈，不读取或分析截图。 */
export function validateRobloxRuntime(repo, work, doc, nodes, assets, sources, layout) {
  const { doc: runtime } = jsonIdentity(repo, doc.runtimeContextRef, 'Roblox 运行上下文', work.evidenceRoot);
  if (runtime.schemaVersion !== 'roblox-runtime/1.0' || runtime.visualStage !== 'V5') throw new WorkflowError('Roblox 运行上下文版本或阶段无效');
  workIdentity(runtime, work, { implementation: false });
  if (runtime.objectId !== doc.objectId || runtime.targetId !== doc.targetId || runtime.candidateId !== doc.candidateId) throw new WorkflowError('Roblox 运行上下文对象或候选错绑');
  studioIdentity(repo, runtime.studio, '运行 Studio');
  samePlace(runtime.studio.place, doc.studio.place);
  sameRef(repo, runtime.studio.place.snapshotRef, doc.studio.place.snapshotRef, 'V5 正式源');
  if (runtime.studio.studioId !== doc.studio.studioId) throw new WorkflowError('运行上下文的 Studio 实例错绑');
  sameRef(repo, runtime.layoutSpecRef, doc.layoutSpecRef, 'V5 布局规格');
  sameRef(repo, runtime.assetManifestRef, doc.assetManifestRef, 'V5 资源清单');
  text(runtime.clientId, 'V5 客户端身份');
  const root = instancePath(runtime.rootInstancePath, 'V5 运行对象根路径');
  const observation = captureRef(repo, runtime.observationRef, work, runtime.studio, { context: 'Client', tools: ['execute_luau'], targetPath: root });
  bindSourceBundle(repo, observation, sources);
  if (observation.clientId !== runtime.clientId) throw new WorkflowError('V5 运行结果未绑定当前客户端');
  if (!Array.isArray(runtime.bindings) || runtime.bindings.length !== nodes.size) throw new WorkflowError('V5 必须逐节点绑定正式源与运行实例');
  const byId = new Map();
  const paths = new Set();
  for (const binding of runtime.bindings) {
    object(binding, 'V5 实例绑定');
    const node = nodes.get(binding.nodeId);
    if (!node || byId.has(binding.nodeId)) throw new WorkflowError('V5 实例绑定节点缺失或重复');
    if (JSON.stringify(instancePath(binding.sourceInstancePath, 'V5 正式实例路径')) !== JSON.stringify(node.instancePath)) throw new WorkflowError('V5 正式实例路径与 V3 布局不一致');
    const path = instancePath(binding.runtimeInstancePath, 'V5 运行实例路径');
    const key = JSON.stringify(path);
    if (paths.has(key)) throw new WorkflowError('V5 运行实例路径不唯一');
    paths.add(key); byId.set(binding.nodeId, binding);
    // 路径、类和属性必须来自同一条实际节点记录，不能跨节点拼接全局字符串。
    const actual = observedNode(observation, path, 'V5 运行实例');
    text(binding.className, 'V5 运行实例类型');
    if (binding.className !== node.className || actual.className !== node.className) throw new WorkflowError('V5 运行实例实际类型与 V3 规格不一致');
    for (const asset of assets.items.filter((item) => item.kind === 'roblox-asset' && item.nodeId === node.id)) {
      if (actual.properties[asset.assetProperty] !== `rbxassetid://${asset.assetId}`) throw new WorkflowError('V5 正式资源未绑定到对应运行节点属性');
    }
  }
  const rootBinding = byId.get(doc.objectId);
  if (!rootBinding || JSON.stringify(rootBinding.runtimeInstancePath) !== JSON.stringify(root)) throw new WorkflowError('V5 运行对象根与绑定不一致');
  for (const node of nodes.values()) {
    if (node.parentId === null) continue;
    const parent = byId.get(node.parentId)?.runtimeInstancePath;
    const path = byId.get(node.id)?.runtimeInstancePath;
    if (!parent || path.length !== parent.length + 1 || !parent.every((part, index) => part === path[index])) throw new WorkflowError('V5 运行实例父子关系与 V3 规格不一致');
  }
  // 同一运行观察必须绑定实际 GUI 属性，布局计划本身不证明客户端实例状态。
  validateScreenReadback(repo, layout, nodes, observation, { runtime: true, runtimePaths: new Map([...byId].map(([id, binding]) => [id, binding.runtimeInstancePath])), sources });
  if (!Array.isArray(runtime.interactions) || !runtime.interactions.length) throw new WorkflowError('V5 缺少实际输入轨迹');
  for (const interaction of runtime.interactions) {
    object(interaction, 'V5 输入轨迹');
    const binding = byId.get(interaction.nodeId);
    if (!binding) throw new WorkflowError('V5 输入轨迹未绑定已登记运行节点');
    const expected = text(interaction.expected, 'V5 输入预期');
    const actual = text(interaction.actual, 'V5 输入实际');
    if (interaction.status !== 'PASS' || expected !== actual) throw new WorkflowError('V5 输入结果与预期不一致或尚未通过');
    const input = captureRef(repo, interaction.inputRef, work, runtime.studio, { context: 'Client', tools: ['character_navigation', 'user_keyboard_input', 'user_mouse_input'], targetPath: binding.runtimeInstancePath });
    const result = captureRef(repo, interaction.resultRef, work, runtime.studio, { context: 'Client', tools: ['inspect_instance', 'execute_luau', 'get_console_output'], targetPath: binding.runtimeInstancePath });
    bindSourceBundle(repo, input, sources); bindSourceBundle(repo, result, sources);
    if (input.clientId !== runtime.clientId || result.clientId !== runtime.clientId) throw new WorkflowError('V5 输入与结果未绑定同一客户端');
    if (Date.parse(input.observedAt) > Date.parse(result.observedAt)) throw new WorkflowError('V5 结果不能早于实际输入');
    observedInCapture(result, actual, 'V5 输入实际结果');
  }
  return runtime;
}
