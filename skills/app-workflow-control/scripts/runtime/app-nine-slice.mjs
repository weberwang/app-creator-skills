import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { repoPath, WorkflowError } from './io.mjs';

const require = createRequire(import.meta.url);

/** 仅在真实界面任务使用九宫格时加载 UI 能力，服务端独立安装不包含该目录。 */
function validateNineSliceRuntime(...args) {
  return require('../../../app-ui-layout/scripts/nine-slice-runtime.cjs').validateNineSliceRuntime(...args);
}

/** 核对确认源帧、边界和要求覆盖的最小显示尺寸。 */
export function validateAppNineSlicePlan(slice, sourcePath, label) {
  if (!slice || typeof slice !== 'object' || slice.sourcePath !== sourcePath) throw new WorkflowError(`${label} 九宫格未绑定当前正式图片`);
  const issues = validateNineSliceRuntime({ sourceSize: slice.sourceSize, border: slice.border, displaySize: slice.minimumSize }, label);
  if (issues.length) throw new WorkflowError(issues.join('；'));
}

/** 实际读取图片尺寸，防止九宫规格与已登记资源是两份不同尺寸。 */
export function validateAppNineSliceAsset(repo, slice, label) {
  const executable = fileURLToPath(new URL('./flutter-image-inspection.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [executable, repoPath(repo, slice.sourcePath).absolute], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.error || result.status !== 0) throw new WorkflowError(`${label} 九宫格图片解码失败`);
  const image = JSON.parse(result.stdout);
  if (image.width !== slice.sourceSize.width || image.height !== slice.sourceSize.height) throw new WorkflowError(`${label} 九宫格源帧尺寸与实际图片不一致`);
}

/** 从同次运行读数核对每个正式消费者的源帧、切片、实际倍率和显示框。 */
export function validateAppNineSliceMeasurements(expected, actual, label) {
  if (!Array.isArray(actual)) throw new WorkflowError(`${label} 缺少九宫格实际运行读数`);
  const seen = new Set();
  for (const observation of actual) {
    if (!observation || typeof observation.nodeId !== 'string' || !observation.nodeId.trim() || typeof observation.conditionId !== 'string' || !observation.conditionId.trim()) throw new WorkflowError(`${label} 九宫格读数缺少节点或条件身份`);
    const key = `${observation.nodeId}\u0000${observation.conditionId}`;
    if (seen.has(key)) throw new WorkflowError(`${label} 九宫格读数重复`);
    seen.add(key);
    const item = expected.find((entry) => entry.nodeId === observation.nodeId && entry.conditionId === observation.conditionId);
    if (!item || observation.sourcePath !== item.slice.sourcePath) throw new WorkflowError(`${label} 九宫格读数未绑定当前消费者或正式图片`);
    if (typeof observation.runtimeNodeId !== 'string' || !observation.runtimeNodeId.trim()) throw new WorkflowError(`${label} 九宫格缺少实际组件身份`);
    if (!isDeepStrictEqual(observation.sourceSize, item.slice.sourceSize) || !isDeepStrictEqual(observation.border, item.slice.border)) throw new WorkflowError(`${label} 九宫格源帧或切片与已确认规格不一致`);
    const issues = validateNineSliceRuntime({ scale: observation.scale, sourceSize: observation.sourceSize, border: observation.border, displaySize: observation.displaySize }, label);
    if (issues.length) throw new WorkflowError(issues.join('；'));
    if (observation.displaySize.width < item.slice.minimumSize.width || observation.displaySize.height < item.slice.minimumSize.height) {
      throw new WorkflowError(`${label} 九宫格实际显示框小于冻结的最小尺寸`);
    }
    // 整体变换会连同固定角边一起缩放，必须回读节点及祖先的合成倍率。
    if (observation.transformScaleX !== 1 || observation.transformScaleY !== 1) throw new WorkflowError(`${label} 九宫格整体变换倍率必须严格为 1`);
  }
  for (const item of expected) if (!seen.has(`${item.nodeId}\u0000${item.conditionId}`)) throw new WorkflowError(`${label} 九宫格缺少当前节点与条件的实测`);
}

/** 校验当前布局中显式使用的九宫图，图片文件由对应资源清单再作身份绑定。 */
export function collectAppNineSliceNodes(layout, label) {
  const entries = [];
  for (const node of layout.nodes) {
    if (node.nineSlice === undefined) continue;
    if (typeof node.nineSlice?.sourcePath !== 'string' || !node.nineSlice.sourcePath.trim()) throw new WorkflowError(`${label} 节点 ${node.id} 的九宫格缺少正式图片路径`);
    validateAppNineSlicePlan(node.nineSlice, node.nineSlice.sourcePath, `${label} 节点 ${node.id}`);
    if (typeof node.nineSlice.implementation !== 'string' || !node.nineSlice.implementation.trim()) throw new WorkflowError(`${label} 节点 ${node.id} 缺少项目实际九宫格实现`);
    entries.push({ nodeId: node.id, slice: node.nineSlice });
  }
  return entries;
}

/** 布局可以有多个实际视口，每个消费者必须覆盖最小宽度与高度。 */
export function validateAppLayoutNineSlices(entries, observations, label) {
  if (!Array.isArray(observations)) throw new WorkflowError(`${label} 缺少九宫格实际运行读数`);
  const expected = observations.map((item) => {
    const entry = entries.find((candidate) => candidate.nodeId === item?.nodeId);
    return { ...entry, nodeId: item?.nodeId, conditionId: item?.conditionId };
  });
  if (expected.some((item) => !item.slice)) throw new WorkflowError(`${label} 九宫格读数未绑定已确认布局`);
  validateAppNineSliceMeasurements(expected, observations, label);
  for (const entry of entries) if (!observations.some((item) => item.nodeId === entry.nodeId)) throw new WorkflowError(`${label} 九宫格节点 ${entry.nodeId} 缺少实际运行读数`);
  validateAppNineSliceMinimums(entries, observations, label);
}

/** 各条件中分别覆盖最小宽和最小高，避免只验证较大的常规视口。 */
export function validateAppNineSliceMinimums(expected, actual, label) {
  for (const item of expected) {
    const samples = actual.filter((entry) => entry.nodeId === item.nodeId);
    if (!samples.some((entry) => entry.displaySize.width === item.slice.minimumSize.width)
      || !samples.some((entry) => entry.displaySize.height === item.slice.minimumSize.height)) {
      throw new WorkflowError(`${label} 九宫格缺少最小显示框的宽高实测`);
    }
  }
}
