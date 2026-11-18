/** Roblox 正式资源与编辑态实例回读合同。 */
import { WorkflowError } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { captureRef, fileIdentity, instancePath, jsonIdentity, object, observedNode, responseObjects, samePlace, sameRef, studioIdentity, text, workIdentity } from './common.mjs';

/** 复用正式位图解码器核对上传源文件，不能从 ImageRectSize 推断整图大小。 */
function validateSliceSource(repo, item, node) {
  const source = fileIdentity(repo, item.sourceImageRef, '九宫格上传图片源');
  const decoder = fileURLToPath(new URL('../../app-workflow-control/scripts/runtime/flutter-image-inspection.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [decoder, source.absolute], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0 || result.error) throw new WorkflowError(`九宫格上传图片源解码失败：${result.error?.message ?? result.stderr}`);
  let info;
  try { info = JSON.parse(result.stdout); } catch { throw new WorkflowError('九宫格图片解码结果无效'); }
  const { sourceSize, imageRectSize, imageRectOffset } = node.nineSlice;
  const cropped = imageRectSize.x !== 0 && imageRectSize.y !== 0;
  if (cropped) {
    if (imageRectOffset.x + imageRectSize.x > info.width || imageRectOffset.y + imageRectSize.y > info.height) throw new WorkflowError('九宫格源帧超出实际上传图片尺寸');
  } else if (sourceSize.width !== info.width || sourceSize.height !== info.height) throw new WorkflowError('九宫格整图源帧与实际上传图片尺寸不一致');
}

/** 读取 V4 素材清单，要求实例、引用和工具读取可追溯到当前已确认布局。 */
export function validateRobloxAssets(repo, work, doc, nodes) {
  const { doc: assets } = jsonIdentity(repo, doc.assetManifestRef, 'Roblox 资源清单', work.evidenceRoot);
  if (assets.schemaVersion !== 'roblox-assets/1.0' || assets.visualStage !== 'V4') throw new WorkflowError('Roblox 资源清单版本或阶段无效');
  workIdentity(assets, work, { visualStage: null, implementation: false });
  if (assets.objectId !== doc.objectId || assets.targetId !== doc.targetId || assets.candidateId !== doc.candidateId) throw new WorkflowError('Roblox 资源清单对象或候选错绑');
  studioIdentity(repo, assets.studio, '资源读取 Studio');
  samePlace(assets.studio.place, doc.studio.place);
  sameRef(repo, assets.layoutSpecRef, doc.layoutSpecRef, '资源所消费的 V3 布局');
  if (!['none', 'present'].includes(assets.externalAssets)) throw new WorkflowError('资源清单必须明确外部资产是否存在');
  if (!Array.isArray(assets.items) || !assets.items.length) throw new WorkflowError('资源清单至少需要一个有回读的正式实例');
  const ids = new Set();
  let externalCount = 0;
  for (const item of assets.items) {
    object(item, 'Roblox 资源项'); text(item.id, '资源项 ID');
    if (ids.has(item.id)) throw new WorkflowError('Roblox 资源项 ID 重复');
    ids.add(item.id);
    if (!['native-instance', 'roblox-asset'].includes(item.kind)) throw new WorkflowError('Roblox 资源项类型无效');
    const node = nodes.get(item.nodeId);
    if (!node || JSON.stringify(instancePath(item.instancePath, '资源实例路径')) !== JSON.stringify(node.instancePath)) throw new WorkflowError('资源实例未绑定当前 V3 节点');
    const capture = captureRef(repo, item.inspectionRef, work, assets.studio, { context: 'Edit', tools: ['inspect_instance', 'execute_luau'], targetPath: item.instancePath, savedReadback: true });
    const observation = observedNode(capture, item.instancePath, '资源实例实际回读');
    if (observation.className !== node.className) throw new WorkflowError('资源实例实际类型与 V3 节点不一致');
    // 实例已暴露资源 ID 时，不能通过声明纯原生内容隐藏外部资产。
    const visibleIds = [...JSON.stringify(observation.properties).matchAll(/rbxassetid:\/\/([1-9]\d*)/gi)].map((match) => match[1]);
    if (item.kind === 'native-instance') {
      if (node.nineSlice) throw new WorkflowError('九宫格必须绑定图片资源及实际上传源');
      if (item.assetId !== undefined || visibleIds.length) throw new WorkflowError('纯原生实例回读含外部资源 ID');
      continue;
    }
    externalCount += 1;
    if (!/^[1-9]\d*$/.test(item.assetId ?? '')) throw new WorkflowError('外部资源缺少实际数字 ID');
    text(item.assetProperty, '外部资源属性名');
    if (observation.properties[item.assetProperty] !== `rbxassetid://${item.assetId}` || !visibleIds.includes(item.assetId)) throw new WorkflowError('外部资源 ID 未绑定到当前节点的实际属性');
    if (node.nineSlice && item.assetProperty === 'Image') {
      if (item.assetId !== node.nineSlice.assetId) throw new WorkflowError('九宫格上传源必须绑定同一 Image 资源');
      validateSliceSource(repo, item, node);
    }
    if (item.availability !== 'available') throw new WorkflowError('外部资源未确认可用');
    const availability = captureRef(repo, item.availabilityRef, work, assets.studio, { context: 'Edit', tools: ['search_asset', 'execute_luau', 'open_cloud_invoke'] });
    const statuses = responseObjects(availability.response).filter((entry) => String(entry.assetId ?? '') === item.assetId);
    if (statuses.length !== 1 || statuses[0].status !== 'available' || statuses[0].usable !== true || statuses[0].moderation !== 'approved') throw new WorkflowError('资源原始响应缺少唯一、明确可用且审核通过的状态');
  }
  for (const node of nodes.values()) if (node.nineSlice && !assets.items.some((item) => item.kind === 'roblox-asset' && item.nodeId === node.id && item.assetProperty === 'Image' && item.assetId === node.nineSlice.assetId)) throw new WorkflowError('九宫格缺少绑定当前节点的 Image 资源');
  if ((assets.externalAssets === 'none' && externalCount) || (assets.externalAssets === 'present' && !externalCount)) throw new WorkflowError('外部资产声明与实际资源项不一致');
  return assets;
}
