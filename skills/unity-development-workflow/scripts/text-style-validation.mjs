import { matchesFrozenTextValue } from '../../app-domain-toolkit/scripts/visual/text-fidelity-contract.mjs';

const REQUIRED_TEXT_ATTRIBUTES = ['font', 'fontSize', 'fill', 'content', 'visible'];

/** 同一计划可共享属性目标，文字节点仍各自记录设计来源与运行身份。 */
function textAttributes(node, styles) {
  const { styleId, attributes } = node.textStyle ?? {};
  if (styleId === undefined) return attributes;
  return typeof styleId === 'string' && attributes === undefined && styles && Object.hasOwn(styles, styleId) ? styles[styleId] : undefined;
}

/** 确认稿无法核实的属性必须显式待确认；RGBA 的 Alpha 属于必检填色。 */
export function validateTextStyleTarget(node, styles = {}) {
  const label = `文字节点 ${node.id}`;
  const contract = node.textStyle;
  const attributes = textAttributes(node, styles);
  if (!contract || typeof contract.source !== 'string' || !contract.source.trim() || !Array.isArray(attributes)) {
    return [`${label} 缺少绑定确认稿的 textStyle、可核实属性或有效样式引用，文字还原未验证。`];
  }
  const errors = [];
  const names = new Set();
  for (const item of attributes) {
    const name = item?.name;
    if (typeof name !== 'string' || !name.trim() || names.has(name)) {
      errors.push(`${label} 的文字属性名称缺失或重复：${name ?? '未知'}。`);
      continue;
    }
    names.add(name);
    if (item.status === 'PENDING_HUMAN') {
      if (typeof item.reason !== 'string' || !item.reason.trim() || item.expectedValue !== undefined) {
        errors.push(`${label} 的 ${name} 待人工确认时必须提供原因，不得填入推测目标。`);
      }
      continue;
    }
    if (item.status !== undefined || !['componentType', 'propertyPath', 'expectedValue'].every((key) => typeof item[key] === 'string' && item[key].trim())) {
      errors.push(`${label} 的 ${name} 必须声明组件类型、实际属性路径和目标值。`);
    } else if (name === 'fill' && !/^#[0-9a-f]{8}$/i.test(item.expectedValue)) {
      errors.push(`${label} 的 fill.expectedValue 必须含 RGBA 颜色和透明度。`);
    } else if (name === 'fontSize' && !(Number.isFinite(Number(item.expectedValue)) && Number(item.expectedValue) > 0)) {
      errors.push(`${label} 的 fontSize.expectedValue 必须是正数。`);
    } else if (name === 'visible' && (item.propertyPath !== 'visible' || item.expectedValue !== 'true')) {
      errors.push(`${label} 的 visible 必须绑定有效可见性探针，并以 true 为目标。`);
    }
  }
  for (const name of REQUIRED_TEXT_ATTRIBUTES) {
    if (!names.has(name)) errors.push(`${label} 缺少 ${name} 目标或明确的待确认原因。`);
  }
  // 文字内容和可见性必须来自同一真实绘制组件，避免读到其他组件的显示状态。
  const content = attributes.find((item) => item?.name === 'content');
  const visible = attributes.find((item) => item?.name === 'visible');
  if (content?.componentType && visible?.componentType && content.componentType !== visible.componentType) {
    errors.push(`${label} 的 content 和 visible 必须绑定同一文字组件。`);
  }
  return errors;
}

/** 文字按原样核对，填色允许十六进制字母大小写差异。 */
function matchesTextAttribute(name, expected, actual) {
  if (name === 'content' || name === 'visible') return expected === actual;
  if (name === 'fill') return expected.toUpperCase() === actual.toUpperCase();
  return matchesFrozenTextValue(expected, actual);
}

/** 核对已确认文字属性与实际组件序列化属性，缺失值保留为未验证。 */
export function validateTextStyle(node, observations, styles = {}) {
  const errors = validateTextStyleTarget(node, styles);
  if (errors.length) return errors;
  if (!Array.isArray(observations)) errors.push(`文字节点 ${node.id} 缺少真实组件文字属性快照，文字还原未验证。`);
  for (const attribute of textAttributes(node, styles)) {
    if (attribute.status === 'PENDING_HUMAN') {
      errors.push(`文字节点 ${node.id} 的 ${attribute.name} 待人工确认：${attribute.reason}。`);
      continue;
    }
    const matched = Array.isArray(observations) ? observations.filter((entry) => entry?.name === attribute.name) : [];
    if (matched.length !== 1 || matched[0].componentType !== attribute.componentType
      || matched[0].propertyPath !== attribute.propertyPath || matched[0].status !== 'MEASURED'
      || typeof matched[0].actualValue !== 'string') {
      errors.push(`文字节点 ${node.id} 的 ${attribute.name} 缺少绑定实际组件的属性回读，未验证。`);
    } else if (!matchesTextAttribute(attribute.name, attribute.expectedValue, matched[0].actualValue)) {
      errors.push(`文字节点 ${node.id} 的 ${attribute.name} 实际值与确认稿目标不一致。`);
    }
  }
  return errors;
}

/** 将同一场景及采集批次的附加实测合入快照，已测值冲突时拒绝覆盖。 */
export function mergeTextStyleEvidence(report, evidence, errors) {
  const byId = new Map();
  if (evidence === undefined) return byId;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)
    || evidence.measurementSource !== 'UNITY_EDITOR_LOADED_SCENE'
    || ['runId', 'frameCount', 'scenePath', 'stateId', 'uiSystem'].some((key) => evidence[key] !== report[key])
    || !Array.isArray(evidence.measurements)) {
    errors.push('补充文字证据必须绑定同一 Unity 场景、状态、界面系统、runId 与帧数。');
    return byId;
  }
  const measurements = new Map((Array.isArray(report.measurements) ? report.measurements : []).map((item) => [item.id, item]));
  for (const entry of evidence.measurements) {
    const actual = measurements.get(entry?.id);
    const pathKey = report.uiSystem === 'UGUI' ? 'objectPath' : 'elementName';
    if (!actual || byId.has(entry.id) || !entry[pathKey] || entry[pathKey] !== actual[pathKey]
      || (report.uiSystem === 'UI_TOOLKIT' && (!entry.objectPath || entry.objectPath !== actual.objectPath))
      || !Array.isArray(entry.textStyle)) {
      errors.push(`补充文字证据节点 ${entry?.id ?? '未知'} 必须唯一绑定同批实际对象路径与属性。`);
      continue;
    }
    const combined = [...(Array.isArray(actual.componentSnapshot?.textStyle) ? actual.componentSnapshot.textStyle : [])];
    for (const observation of entry.textStyle) {
      if (!observation || typeof observation !== 'object' || typeof observation.name !== 'string' || !observation.name.trim()) {
        errors.push(`补充文字证据节点 ${entry.id} 包含无效属性。`);
        continue;
      }
      const index = combined.findIndex((item) => item?.name === observation.name);
      if (index < 0) combined.push(observation);
      else if (combined[index].componentType !== observation.componentType || combined[index].propertyPath !== observation.propertyPath) {
        errors.push(`补充文字证据节点 ${entry.id} 的 ${observation.name} 属性来源不一致。`);
      } else if (combined[index].status === 'MEASURED') {
        if (observation.status !== 'MEASURED' || typeof observation.actualValue !== 'string'
          || typeof combined[index].actualValue !== 'string'
          || !matchesTextAttribute(observation.name, combined[index].actualValue, observation.actualValue)) {
          errors.push(`补充文字证据节点 ${entry.id} 的 ${observation.name} 与已有实测冲突。`);
        }
      } else combined[index] = observation;
    }
    byId.set(entry.id, combined);
  }
  return byId;
}

/** 世界空间走同一报告身份和文字属性校验，框体由原有世界运行证据覆盖。 */
export function validateWorldTextReadback(plan, report, extraEvidence) {
  const errors = [];
  if (!Array.isArray(report.measurements)) return ['世界空间文字缺少测量记录。'];
  const additions = mergeTextStyleEvidence(report, extraEvidence, errors);
  const items = new Map();
  const paths = new Set();
  for (const item of report.measurements) {
    if (typeof item?.id !== 'string' || items.has(item.id) || typeof item.objectPath !== 'string' || !item.objectPath.trim() || paths.has(item.objectPath)) {
      errors.push('世界空间文字读数缺少唯一节点及实际对象路径。');
      continue;
    }
    items.set(item.id, item);
    paths.add(item.objectPath);
  }
  for (const node of plan.nodes) {
    if (node.renderKind !== 'TEXT' || node.expectedActive === false) continue;
    const item = items.get(node.id);
    if (item?.status === 'FAIL' || item?.componentSnapshot?.active !== true) errors.push(`世界空间文字节点 ${node.id} 缺少活动的实际组件回读。`);
    else errors.push(...validateTextStyle(node, additions.get(node.id) ?? item.componentSnapshot.textStyle, plan.textStyles));
    items.delete(node.id);
  }
  if (items.size) errors.push(`世界空间文字读数包含未绑定设计的节点：${[...items.keys()].join('、')}。`);
  return errors;
}
