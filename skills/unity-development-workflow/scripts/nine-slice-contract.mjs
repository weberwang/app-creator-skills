const EPSILON = 1e-4;

/** 校验九宫格专用像素倍率；坐标单位换算不属于此倍率。 */
export function validateNineSlicePixelMultiplier(value, label) {
  return value === 1 ? [] : [`${label} 必须严格等于数字 1`];
}

/** 校验九宫格源图尺寸不大于显示框，禁止大图缩小，坚持小图拉伸放大。 */
export function validateNineSliceNoDownscale(sourceSize, displaySize, label, ratio = 1) {
  if (!sourceSize || !displaySize || !Number.isFinite(ratio) || ratio <= 0) return [];
  if (![sourceSize.width, sourceSize.height, displaySize.width, displaySize.height].every((value) => Number.isFinite(value) && value > 0)) {
    return [];
  }
  if (sourceSize.width * ratio > displaySize.width + EPSILON || sourceSize.height * ratio > displaySize.height + EPSILON) {
    return [`${label} 源图尺寸大于显示框，禁止大图缩小，请改用紧凑小图通过九宫格拉伸放大`];
  }
  return [];
}

/** 校验九宫格节点及其祖先累计缩放严格为 (1, 1)，禁止通过变换缩放掩盖尺寸问题。 */
export function validateNineSliceUnitScale(scale, label) {
  if (!scale || typeof scale !== 'object' || Array.isArray(scale)
    || !Number.isFinite(scale.x) || !Number.isFinite(scale.y)
    || Math.abs(scale.x - 1) > EPSILON || Math.abs(scale.y - 1) > EPSILON) {
    return [`${label} 必须为 (1, 1)，禁止通过节点或祖先缩放掩盖九宫格源图过大或改变固定角边`];
  }
  return [];
}

/** 校验同一九宫格声明的源尺寸、边框与目标显示空间。 */
export function validateNineSliceDecision(decision, targetSize = null) {
  const errors = [];
  if (!decision || !['stretch', 'not-applicable'].includes(decision.mode) || typeof decision.reason !== 'string' || !decision.reason.trim()) return ['nineSlice 必须明确适用性与理由'];
  const allowed = decision.mode === 'stretch' ? ['mode', 'reason', 'sourceSize', 'border'] : ['mode', 'reason'];
  if (Object.keys(decision).some((key) => !allowed.includes(key))) errors.push('nineSlice 含未声明字段');
  if (decision.mode === 'not-applicable') return errors;
  const border = decision.border;
  const size = decision.sourceSize;
  const validSize = Boolean(size && ['width', 'height'].every((key) => Number.isInteger(size[key]) && size[key] > 0) && !Object.keys(size).some((key) => !['width', 'height'].includes(key)));
  if (!validSize) errors.push('nineSlice.sourceSize 必须是实际生产源像素尺寸');
  if (!Array.isArray(border) || border.length !== 4 || border.some((value) => !Number.isInteger(value) || value < 0) || !border.some((value) => value > 0)) return [...errors, 'nineSlice.border 必须为有固定边的四个非负整数'];
  // Unity 使用 left,bottom,right,top；源纹理与显示框均须保留正尺寸的中心。
  for (const [name, value] of [['源图', size], ['显示框', targetSize]]) {
    if (!value) continue;
    if (!Number.isFinite(value.width) || !Number.isFinite(value.height) || border[0] + border[2] >= value.width || border[1] + border[3] >= value.height) errors.push(`九宫格${name}没有正尺寸中心`);
  }
  // 禁止以大于目标框的源图缩小充当九宫格，坚持用紧凑小图拉伸放大。
  if (validSize && targetSize && Number.isFinite(targetSize.width) && targetSize.width > 0 && Number.isFinite(targetSize.height) && targetSize.height > 0) {
    errors.push(...validateNineSliceNoDownscale(size, targetSize, '九宫格目标显示框'));
  }
  return errors;
}

/** 核对 V3、图片任务、实际导入登记和组合绑定使用同一份切片事实。 */
export function validateNineSliceProduction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['九宫格验证材料必须是对象'];
  const { item, task, registration, binding, placements } = input;
  const errors = validateNineSliceDecision(item?.nineSlice);
  if (errors.length) return errors;
  if (!task || !registration || !binding) return ['九宫格生产缺少任务、导入登记或组合绑定'];
  for (const [name, object, keys] of [['V3', item, ['id', 'resourceId']], ['任务', task, ['id', 'resourceId', 'sourceVersion']], ['登记', registration, ['taskId', 'resourceId', 'sourceVersion', 'assetGuid', 'assetPath']], ['组合', binding, ['itemId', 'resourceId', 'assetGuid', 'assetPath']]]) {
    if (typeof object !== 'object' || Array.isArray(object) || keys.some((key) => typeof object[key] !== 'string' || !object[key].trim())) errors.push(`${name}缺少非空资源身份或路径`);
  }
  if (errors.length) return errors;
  if (typeof item.resourceId !== 'string' || !item.resourceId.trim() || task.resourceId !== item.resourceId || registration.taskId !== task.id || registration.resourceId !== task.resourceId || binding.resourceId !== task.resourceId || binding.itemId !== item.id || registration.sourceVersion !== task.sourceVersion) errors.push('九宫格工作项与正式资源身份不一致');
  if (!registration.assetGuid || binding.assetGuid !== registration.assetGuid || binding.assetPath !== registration.assetPath || registration.unityValidation !== 'PASS') errors.push('九宫格组合必须绑定已回读的实际 GUID 和路径');
  for (const [name, decision] of [['图片任务', task.nineSlice], ['组合', binding.nineSlice]]) {
    errors.push(...validateNineSliceDecision(decision));
    if (decision?.mode !== item.nineSlice.mode || (decision?.mode === 'stretch' && (JSON.stringify(decision.border) !== JSON.stringify(item.nineSlice.border) || decision.sourceSize?.width !== item.nineSlice.sourceSize.width || decision.sourceSize?.height !== item.nineSlice.sourceSize.height))) errors.push(`${name}切片事实与 V3 不一致`);
  }
  const expected = item.nineSlice.mode === 'stretch' ? item.nineSlice.border : [0, 0, 0, 0];
  for (const [name, importer] of [['任务', task.unityImport], ['导入登记', registration.importer]]) {
    if (item.nineSlice.mode === 'stretch') {
      if (importer?.textureType !== 'Sprite' || importer.spriteMode !== 'Single' || JSON.stringify(importer.border) !== JSON.stringify(expected)) errors.push(`${name} Sprite Border 与冻结切片不一致`);
    } else if (!importer || (importer.border !== undefined && JSON.stringify(importer.border) !== JSON.stringify(expected))) errors.push(`${name}不适用九宫格却声明了非零边框`);
  }
  // 实际切片呈现不能通过把计划改为不适用来跳过切片倍率和边框检查。
  if (item.nineSlice.mode === 'not-applicable' && Array.isArray(placements)
    && placements.some((placement) => ['UGUI_SLICED', 'UITOOLKIT_SLICED'].includes(placement?.presentation))) {
    errors.push('不适用九宫格的声明与消费者实际切片呈现冲突');
  }
  if (item.nineSlice.mode === 'stretch') {
    if (task.output && typeof task.output === 'object' && !Array.isArray(task.output)
      && (Object.hasOwn(task.output, 'runtimeWidth') || Object.hasOwn(task.output, 'runtimeHeight'))
      && (task.output.runtimeWidth !== item.nineSlice.sourceSize.width || task.output.runtimeHeight !== item.nineSlice.sourceSize.height)) {
      errors.push('图片任务 output.runtimeWidth/runtimeHeight 必须与冻结 nineSlice.sourceSize 一致');
    }
    if (!Array.isArray(placements) || placements.length === 0) errors.push('九宫格缺少实际消费者呈现检查');
    const seen = new Set();
    for (const placement of Array.isArray(placements) ? placements : []) {
      if (!placement || typeof placement !== 'object') { errors.push('九宫格消费者必须是实测对象'); continue; }
      if (seen.has(placement.nodeId)) errors.push('九宫格消费者不能重复');
      seen.add(placement.nodeId);
      if (!placement.size || !['width', 'height'].every((key) => Number.isFinite(placement.size[key]) && placement.size[key] > 0)) errors.push('九宫格消费者必须提供正尺寸显示框');
      const ratio = placement.borderPixelsToUnits;
      if (!['SCREEN_PIXELS', 'UNITY_LOGICAL_UNITS'].includes(placement.coordinateSpace) || !Number.isFinite(ratio) || ratio <= 0) errors.push('九宫格消费者必须声明实测坐标空间和源像素转换比例');
      // 逻辑单位下禁止通过提高 Sprite PPU（ratio < 1）或以大图源帧缩小来适配显示框。
      if (placement.coordinateSpace === 'UNITY_LOGICAL_UNITS' && Number.isFinite(ratio) && ratio > 0) {
        if (ratio < 1 - EPSILON) errors.push('九宫格在 UNITY_LOGICAL_UNITS 下 borderPixelsToUnits 不能小于 1（禁止通过提高 Sprite PPU 缩小大图）');
        if (placement.size) errors.push(...validateNineSliceNoDownscale(item.nineSlice.sourceSize, placement.size, '九宫格消费者（源图像素）', 1));
      }
      if (placement.size && Number.isFinite(ratio) && ratio > 0) {
        errors.push(...validateNineSliceNoDownscale(item.nineSlice.sourceSize, placement.size, '九宫格消费者', ratio));
      }
      // Border 是源像素；用实际 PPU/Canvas 或 Panel 切片比例转换后才能与显示框比较。
      if (placement.size && Number.isFinite(ratio) && ratio > 0 && (expected[0] * ratio + expected[2] * ratio >= placement.size.width || expected[1] * ratio + expected[3] * ratio >= placement.size.height)) errors.push('九宫格显示框没有正尺寸中心');
      // 只约束切片倍率本身；Sprite PPU 与屏幕坐标之间仍可能有合法换算。
      if (placement.presentation === 'UGUI_SLICED') errors.push(...validateNineSlicePixelMultiplier(placement.pixelsPerUnitMultiplier, '消费者 pixelsPerUnitMultiplier'));
      if (placement.presentation === 'UITOOLKIT_SLICED') errors.push(...validateNineSlicePixelMultiplier(placement.sliceScale, '消费者 sliceScale'));
      // 这里只核对来自 Unity 的几何/组件回读，接缝和角部画质仍需人工检查。
      if (placement.measured !== true || !Array.isArray(binding.consumerNodeIds) || !binding.consumerNodeIds.includes(placement.nodeId) || !['UGUI_SLICED', 'UITOOLKIT_SLICED'].includes(placement.presentation) || JSON.stringify(placement.border) !== JSON.stringify(expected)) errors.push('消费者缺少实际切片呈现或边框回读');
    }
    if (!Array.isArray(binding.consumerNodeIds) || binding.consumerNodeIds.length === 0 || binding.consumerNodeIds.some((nodeId) => !seen.has(nodeId))) errors.push('九宫格消费者检查覆盖不完整');
  }
  return [...new Set(errors)];
}
