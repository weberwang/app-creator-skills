import { matchesFrozenTextValue } from '../../app-domain-toolkit/scripts/visual/text-fidelity-contract.mjs';

/** 核对已确认文字属性与实际组件序列化属性，缺失值保留为未验证。 */
export function validateTextStyle(node, observations) {
  const errors = [];
  const contract = node.textStyle;
  if (!contract || typeof contract !== 'object' || typeof contract.source !== 'string' || !contract.source.trim()
    || !Array.isArray(contract.attributes) || contract.attributes.length === 0) {
    return [`文字节点 ${node.id} 缺少绑定确认稿的 textStyle 与可核实属性，文字还原未验证。`];
  }
  if (!Array.isArray(observations)) return [`文字节点 ${node.id} 缺少真实组件文字属性快照，文字还原未验证。`];
  const names = new Set();
  for (const attribute of contract.attributes) {
    if (!attribute || typeof attribute !== 'object'
      || !['name', 'componentType', 'propertyPath', 'expectedValue'].every((key) => typeof attribute[key] === 'string' && attribute[key].trim())) {
      errors.push(`文字节点 ${node.id} 的属性必须声明名称、组件类型、实际属性路径和目标值。`);
      continue;
    }
    if (names.has(attribute.name)) errors.push(`文字节点 ${node.id} 重复声明属性 ${attribute.name}。`);
    names.add(attribute.name);
    const matched = observations.filter((entry) => entry?.name === attribute.name);
    if (matched.length !== 1 || matched[0].componentType !== attribute.componentType
      || matched[0].propertyPath !== attribute.propertyPath || matched[0].status !== 'MEASURED'
      || typeof matched[0].actualValue !== 'string') {
      errors.push(`文字节点 ${node.id} 的 ${attribute.name} 缺少绑定实际组件的属性回读，未验证。`);
    } else if (!matchesFrozenTextValue(attribute.expectedValue, matched[0].actualValue)) {
      errors.push(`文字节点 ${node.id} 的 ${attribute.name} 实际值与确认稿目标不一致。`);
    }
  }
  for (const required of ['font', 'fontSize', 'fill']) {
    if (!names.has(required)) errors.push(`文字节点 ${node.id} 缺少 ${required} 目标及组件回读。`);
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
        if (observation.status !== 'MEASURED' || !matchesFrozenTextValue(combined[index].actualValue, observation.actualValue)) {
          errors.push(`补充文字证据节点 ${entry.id} 的 ${observation.name} 与已有实测冲突。`);
        }
      } else combined[index] = observation;
    }
    byId.set(entry.id, combined);
  }
  return byId;
}
