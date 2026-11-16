/** 按 JSON 结构复制实际采集值，避免后续修改静默污染冻结的源属性。 */
function copy(value) {
  return value === undefined ? null : structuredClone(value);
}

/** 读取明确的 Figma 数值；源属性异常应返回具体节点以便定向修复。 */
function number(value, label, minimum = 0) {
  if (!Number.isFinite(value) || value < minimum) throw new Error(`${label} 必须为不小于 ${minimum} 的有限数字`);
  return value;
}

/** 将四角分别交接给 Flutter，不能将混合圆角压缩为一个统一值。 */
function corners(node) {
  const shape = node.properties?.shape ?? {};
  const direct = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
  const hasDirect = direct.some((key) => Object.hasOwn(node, key));
  if (hasDirect && !direct.every((key) => Object.hasOwn(node, key))) throw new Error(`节点 ${node.id} 的逐角圆角采集不完整`);
  const source = shape.corners ?? node.rectangleCornerRadii ?? node.cornerRadii ?? (hasDirect ? direct.map((key) => node[key]) : undefined);
  let values;
  if (Array.isArray(source)) {
    if (source.length !== 4) throw new Error(`节点 ${node.id} 逐角圆角必须有四个值`);
    values = { topLeft: source[0], topRight: source[1], bottomRight: source[2], bottomLeft: source[3] };
  } else if (source && typeof source === 'object') {
    values = Object.fromEntries(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map((key) => [key, source[key]]));
  } else {
    const radius = node.cornerRadius ?? node.properties?.radius ?? shape.radius ?? 0;
    values = Object.fromEntries(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map((key) => [key, radius]));
  }
  for (const [key, value] of Object.entries(values)) number(value, `节点 ${node.id} 圆角 ${key}`);
  return values;
}

/** 依据真实节点类型决定原生轮廓，不能把椭圆或矢量路径归为矩形。 */
function shapeFor(node) {
  if (node.type === 'ELLIPSE') return { kind: 'ellipse', flutter: { constructor: 'ClipOval' } };
  if (node.type === 'LINE') {
    // LineNode 不提供 vectorPaths，端点由真实长度定义；旋转继续保存在局部几何中。
    return { kind: 'line', flutter: { constructor: 'CustomPaint', geometry: { start: { x: 0, y: 0 }, end: { x: node.width, y: 0 }, rotation: { value: node.rotation, unit: 'degrees', direction: 'counterclockwise' }, unit: 'logical-px', basis: 'derived-from-figma-line' } } };
  }
  if (['VECTOR', 'BOOLEAN_OPERATION'].includes(node.type)) {
    const paths = node.vectorPaths ?? node.properties?.vectorPaths;
    const network = node.vectorNetwork ?? node.properties?.vectorNetwork;
    const validPaths = Array.isArray(paths) && paths.length > 0 && paths.every((path) => typeof path.data === 'string' && path.data.trim());
    const validNetwork = network && Array.isArray(network.vertices) && network.vertices.length > 0 && Array.isArray(network.segments) && network.segments.length > 0;
    if (!validPaths && !validNetwork) throw new Error(`节点 ${node.id} (${node.name ?? node.type}) 缺少可编辑矢量路径，请定向修复并重新采集`);
    return { kind: 'path', flutter: { constructor: 'CustomPaint', geometry: copy(validPaths ? { vectorPaths: paths } : { vectorNetwork: network }) } };
  }
  if (node.type === 'TEXT' && !node.properties?.shape) return { kind: 'text', flutter: { constructor: 'Text' } };
  const allowed = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'RECTANGLE', 'TEXT', 'GROUP'];
  if (!allowed.includes(node.type)) throw new Error(`节点 ${node.id} 的轮廓类型 ${node.type} 尚未支持`);
  const kind = node.properties?.shape?.kind ?? 'rectangle';
  if (!['rectangle', 'roundedRectangle', 'roundRectangle', 'rounded-rectangle', 'capsule'].includes(kind)) throw new Error(`节点 ${node.id} 的矩形轮廓类型无效`);
  const values = corners(node);
  return { kind, corners: { ...values, unit: 'logical-px' }, flutter: { constructor: 'BorderRadius.only', ...values } };
}

/** 将 Figma 排版单位换算为 Flutter 逻辑像素和行高倍率，并保留 AUTO。 */
function typography(font, id) {
  if (!font) return null;
  const size = number(font.size, `节点 ${id} 字号`, Number.EPSILON);
  const line = font.lineHeight;
  const letter = font.letterSpacing;
  if (!line || !['PIXELS', 'PERCENT', 'AUTO'].includes(line.unit)) throw new Error(`节点 ${id} 行高必须提供 PIXELS、PERCENT 或 AUTO 单位`);
  if (!letter || !['PIXELS', 'PERCENT'].includes(letter.unit)) throw new Error(`节点 ${id} 字间距必须提供 PIXELS 或 PERCENT 单位`);
  const lineValue = line.unit === 'AUTO' ? null : number(line.value, `节点 ${id} 行高`, Number.EPSILON);
  const letterValue = number(letter.value, `节点 ${id} 字间距`, -Number.MAX_VALUE);
  return {
    family: font.platformFamily,
    weight: font.weight,
    size: { value: size, unit: 'logical-px' },
    lineHeight: { sourceUnit: line.unit, sourceValue: lineValue, flutterHeight: line.unit === 'AUTO' ? null : line.unit === 'PIXELS' ? lineValue / size : lineValue / 100 },
    letterSpacing: { sourceUnit: letter.unit, sourceValue: letterValue, value: letter.unit === 'PIXELS' ? letterValue : size * letterValue / 100, unit: 'logical-px' },
  };
}

/** 渐变停靠点和变换使用 Figma 的比例坐标；完整属性仍保留在原始采集值。 */
function normalizePaint(value, id) {
  if (Array.isArray(value)) return value.map((item) => normalizePaint(item, id));
  if (!value || typeof value !== 'object') return copy(value);
  const result = copy(value);
  if (Array.isArray(value.gradientStops)) result.gradientStops = value.gradientStops.map((stop) => {
    const position = number(stop.position, `节点 ${id} 渐变位置`);
    if (position > 1) throw new Error(`节点 ${id} 渐变位置超出 0 到 1`);
    return { ...copy(stop), position: { value: position, unit: 'ratio' } };
  });
  if (value.gradientTransform !== undefined) result.gradientTransformUnit = 'normalized';
  if (value.imageTransform !== undefined) result.imageTransformUnit = 'normalized';
  return result;
}

/** 核对二维纹理矩阵，防止截断图片和渐变的定位变换。 */
function validateMatrix(value, label) {
  if (!Array.isArray(value) || value.length !== 2 || value.some((row) => !Array.isArray(row) || row.length !== 3 || row.some((item) => !Number.isFinite(item)))) throw new Error(`${label} 必须为 2×3 有限数字矩阵`);
}

/** 校验可支持的 Figma 填充与边框绘制事实，未知类型须明确处理而非丢弃。 */
function validatePaint(value, id, label) {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && value.trim()) return;
  if (Array.isArray(value)) { for (const item of value) validatePaint(item, id, label); return; }
  if (!value || typeof value !== 'object' || !['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE'].includes(value.type)) throw new Error(`节点 ${id} ${label} 类型不受支持`);
  if (value.opacity !== undefined && (!Number.isFinite(value.opacity) || value.opacity < 0 || value.opacity > 1)) throw new Error(`节点 ${id} ${label} 的透明度无效`);
  if (value.type === 'SOLID' && (!value.color || !['r', 'g', 'b'].every((key) => Number.isFinite(value.color[key]) && value.color[key] >= 0 && value.color[key] <= 1))) throw new Error(`节点 ${id} 纯色填充缺少有效颜色`);
  if (value.type.startsWith('GRADIENT_')) {
    if (!Array.isArray(value.gradientStops) || value.gradientStops.length < 2) throw new Error(`节点 ${id} 渐变至少需要两个停靠点`);
    for (const stop of value.gradientStops) {
      if (!Number.isFinite(stop.position) || stop.position < 0 || stop.position > 1 || !stop.color || !['r', 'g', 'b'].every((key) => Number.isFinite(stop.color[key]) && stop.color[key] >= 0 && stop.color[key] <= 1) || (stop.color.a !== undefined && (!Number.isFinite(stop.color.a) || stop.color.a < 0 || stop.color.a > 1))) throw new Error(`节点 ${id} 渐变停靠点无效`);
    }
    if (value.gradientTransform !== undefined) validateMatrix(value.gradientTransform, `节点 ${id} 渐变变换`);
  }
  if (value.type === 'IMAGE') validateImageFill(value, id);
}

/** 图片填充必须保留缩放方式及实际变换，不能只保留图片身份。 */
function validateImageFill(value, id) {
  if (!value || typeof value !== 'object' || !['FILL', 'FIT', 'CROP', 'TILE'].includes(value.scaleMode)) throw new Error(`节点 ${id} 图片填充缺少有效 scaleMode`);
  if (!(typeof value.assetId === 'string' && value.assetId.trim()) && !(typeof value.imageHash === 'string' && value.imageHash.trim())) throw new Error(`节点 ${id} 图片填充缺少图片身份`);
  if (value.imageTransform !== undefined) validateMatrix(value.imageTransform, `节点 ${id} 图片变换`);
  if (value.scaleMode === 'CROP' && value.imageTransform === undefined) throw new Error(`节点 ${id} 裁切图片缺少变换`);
}

/** 检查真实节点几何和不透明度；坏路径返回节点身份，不重建整页。 */
export function validateFigmaNodeProperties(node) {
  if (!node || typeof node.id !== 'string' || !node.id.trim()) throw new Error('Figma 节点缺少身份');
  if (!Number.isFinite(node.width) || node.width <= 0) throw new Error(`节点 ${node.id} (${node.name ?? node.type}) 的 width 为零或无效，请定向修复并重新采集`);
  // Figma 直线使用本地零高度，其他节点的零高度仍是坏几何。
  if (!Number.isFinite(node.height) || (node.type === 'LINE' ? node.height !== 0 : node.height <= 0)) throw new Error(`节点 ${node.id} (${node.name ?? node.type}) 的 height 为零或无效，请定向修复并重新采集`);
  if ((node.type === 'LINE' || node.rotation !== undefined) && !Number.isFinite(node.rotation)) throw new Error(`节点 ${node.id} 的旋转角度无效`);
  const opacity = node.opacity ?? node.properties?.opacity;
  if (opacity !== undefined && (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)) throw new Error(`节点 ${node.id} 透明度必须在 0 到 1 之间`);
  validatePaint(node.fills ?? node.properties?.fill, node.id, '填充');
  validatePaint(node.strokes, node.id, '描边');
  if (node.imageFills !== undefined) {
    if (!Array.isArray(node.imageFills)) throw new Error(`节点 ${node.id} 图片填充必须为数组`);
    for (const image of node.imageFills) validateImageFill(image, node.id);
  }
  shapeFor(node);
  if (node.type === 'TEXT') typography(node.font, node.id);
}

/** 基于直线端点和描边计算可见区域，不把描边宽度改写为节点本地高度。 */
function linePaintedBounds(node, x, y) {
  const stroke = node.strokeWeight ?? node.properties?.border?.width;
  const paint = node.strokes ?? node.properties?.border;
  // 只排除属性明确隐藏或完全透明的描边，不据此作画面质量判断。
  const visible = (item) => item && item.visible !== false && item.opacity !== 0 && (typeof item !== 'object' || item.type !== 'SOLID' || item.color?.a !== 0);
  const hasVisibleStroke = Array.isArray(paint) ? paint.some(visible) : visible(paint);
  if (!Number.isFinite(stroke) || stroke <= 0 || !hasVisibleStroke || (node.strokeAlign !== undefined && node.strokeAlign !== 'CENTER')) throw new Error(`节点 ${node.id} 的直线缺少可核验的中心描边`);
  const cap = node.strokeCap ?? 'NONE';
  if (!['NONE', 'ROUND', 'SQUARE'].includes(cap)) throw new Error(`节点 ${node.id} 的线帽 ${cap} 需要实际渲染边界`);
  if (node.effects !== undefined && (!Array.isArray(node.effects) || node.effects.some((effect) => effect?.visible !== false))) throw new Error(`节点 ${node.id} 的可见效果需要实际渲染边界`);
  // Figma 的正角度为逆时针，屏幕 y 轴向下，故末端 y 使用负正弦。
  const angle = -node.rotation * Math.PI / 180;
  // 清除三角函数尾差，避免正交直线产生虚假的轴向尺寸。
  const snap = (value) => Math.abs(value) < 1e-12 ? 0 : value;
  const cos = snap(Math.cos(angle)); const sin = snap(Math.sin(angle));
  const dx = node.width * cos; const dy = node.width * sin; const half = stroke / 2;
  const extensionX = cap === 'ROUND' ? half : half * (Math.abs(sin) + (cap === 'SQUARE' ? Math.abs(cos) : 0));
  const extensionY = cap === 'ROUND' ? half : half * (Math.abs(cos) + (cap === 'SQUARE' ? Math.abs(sin) : 0));
  return { x: x + Math.min(0, dx) - extensionX, y: y + Math.min(0, dy) - extensionY,
    width: Math.abs(dx) + 2 * extensionX, height: Math.abs(dy) + 2 * extensionY, unit: 'px' };
}

/** 将父级坐标累加到设计根；不支持的旋转祖先继续阻断，避免伪造目标区域。 */
export function figmaNodeBounds(nodes, node) {
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const seen = new Set(); let current = node; let x = 0; let y = 0;
  while (current) {
    if (seen.has(current.id)) throw new Error(`节点 ${node.id} 的父链成环`);
    seen.add(current.id);
    if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) throw new Error(`节点 ${current.id} 缺少实际位置`);
    if (current.rotation !== undefined && current.rotation !== 0 && !(current === node && node.type === 'LINE')) throw new Error(`节点 ${current.id} 含旋转，须先提供可核验的变换测量`);
    x += current.x; y += current.y;
    if (current.parentId === null) {
      const targetX = x - current.x; const targetY = y - current.y;
      // 可见特效或特殊线帽不能从普通描边推测；有真实渲染边界时按页面根换算。
      if (node.type === 'LINE' && node.absoluteRenderBounds && current.absoluteBoundingBox) {
        const bounds = node.absoluteRenderBounds; const root = current.absoluteBoundingBox;
        if (['x', 'y', 'width', 'height'].every((key) => Number.isFinite(bounds[key])) && Number.isFinite(root.x) && Number.isFinite(root.y) && bounds.width > 0 && bounds.height > 0) {
          return { x: bounds.x - root.x, y: bounds.y - root.y, width: bounds.width, height: bounds.height, unit: 'px' };
        }
        throw new Error(`节点 ${node.id} 的实际渲染边界无效`);
      }
      return node.type === 'LINE' ? linePaintedBounds(node, targetX, targetY) : { x: targetX, y: targetY, width: node.width, height: node.height, unit: 'px' };
    }
    current = byId.get(current.parentId);
    if (!current) throw new Error(`节点 ${node.id} 的父链缺失`);
  }
  throw new Error(`节点 ${node.id} 的父链缺失`);
}

/** 从已采集节点提取源属性及可执行样式；完整渐变、图片变换与边框原样保留。 */
export function extractFigmaNodeStyle(node, textNode = node.type === 'TEXT' ? node : null) {
  validateFigmaNodeProperties(node);
  if (textNode && textNode !== node) validateFigmaNodeProperties(textNode);
  // 未显式规范化的视觉属性仍需保留；结构身份由冻结快照及交接映射单独追溯。
  const structural = new Set(['id', 'name', 'type', 'parentId', 'designItemId', 'x', 'y', 'width', 'height', 'characters', 'layoutMode', 'bindings', 'visible',
    'properties', 'font', 'fills', 'imageFills', 'opacity', 'strokes', 'strokeWeight', 'cornerRadius', 'rectangleCornerRadii', 'cornerRadii']);
  const other = Object.fromEntries(Object.entries(node).filter(([key]) => !structural.has(key)).map(([key, value]) => [key, copy(value)]));
  const textVisual = textNode ? { properties: copy(textNode.properties) ?? {}, fills: copy(textNode.fills), imageFills: copy(textNode.imageFills) ?? [], opacity: copy(textNode.opacity),
    strokes: copy(textNode.strokes), strokeWeight: copy(textNode.strokeWeight), other: Object.fromEntries(Object.entries(textNode).filter(([key]) => !structural.has(key)).map(([key, value]) => [key, copy(value)])) } : null;
  const raw = {
    nodeType: node.type, properties: copy(node.properties) ?? {}, font: copy(textNode?.font),
    fills: copy(node.fills), imageFills: copy(node.imageFills) ?? [], opacity: copy(node.opacity),
    strokes: copy(node.strokes), strokeWeight: copy(node.strokeWeight),
    cornerRadius: copy(node.cornerRadius), rectangleCornerRadii: copy(node.rectangleCornerRadii), cornerRadii: copy(node.cornerRadii),
    other, textVisual,
  };
  const shape = shapeFor(node);
  const normalized = {
    shape,
    typography: typography(textNode?.font, textNode?.id ?? node.id),
    textFill: normalizePaint(textNode?.fills ?? textNode?.properties?.fill, textNode?.id ?? node.id),
    textOpacity: textNode ? { value: textNode.opacity ?? textNode.properties?.opacity ?? 1, unit: 'ratio' } : null,
    fill: normalizePaint(node.fills ?? node.properties?.fill, node.id),
    opacity: { value: node.opacity ?? node.properties?.opacity ?? 1, unit: 'ratio' },
    imageFills: normalizePaint(node.imageFills ?? [], node.id),
    border: { value: normalizePaint(node.strokes ?? node.properties?.border, node.id), width: { value: number(node.strokeWeight ?? node.properties?.border?.width ?? 0, `节点 ${node.id} 边框宽度`), unit: 'logical-px' } },
  };
  // 通用原生计划仍需原有直接属性，完整事实通过 designFacts 同时交接。
  const result = {};
  for (const key of ['fill', 'spacing', 'radius', 'insets', 'colors', 'border', 'shape']) if (node.properties && Object.hasOwn(node.properties, key)) result[key] = copy(node.properties[key]);
  if (textNode) result.typography = copy(textNode.font);
  result.designFacts = { raw, normalized };
  return result;
}

/** 从独立源节点生成 Flutter 逐项需求值，供 V3 生成器和控制器同源核对。 */
export function extractFlutterNodeFacts(node, textNode = node.type === 'TEXT' ? node : null) {
  const style = extractFigmaNodeStyle(node, textNode);
  const missing = (reason) => ({ applicable: false, reason });
  return {
    size: { width: node.width, height: node.height },
    spacing: copy(node.properties?.insets) ?? missing('源节点无内间距属性'),
    typography: style.designFacts.normalized.typography ?? missing('源节点不包含文字'),
    color: copy(node.properties?.colors) ?? missing('源节点未提供文本前景和背景色对'),
    border: copy(node.properties?.border) ?? missing('源节点无边框属性'),
    shape: style.designFacts.normalized.shape,
    appearance: style.designFacts,
  };
}
