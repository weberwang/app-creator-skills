export const PROJECT_SCHEMA = "frame-atlas-project/1";
export const ATLAS_SCHEMA = "frame-atlas/1";
export const TARGETS = Object.freeze(["cocos", "phaser", "threejs", "unity"]);
const ROTATING_TARGETS = new Set(["cocos", "threejs"]);
const MAX_PIXELS = 64 * 1024 * 1024;

/** 校验配置字段，错误可直接显示在编辑器中。 */
function requireValue(condition, label) {
  if (!condition) throw new Error(`无效的帧动画数据：${label}`);
}

/** 检查整像素尺寸或页索引。 */
const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
/** 检查能安全参与坐标运算的数值。 */
const coordinate = (value) => Number.isFinite(value) && Math.abs(value) <= 1e7;
/** 检查画布尺寸及一次解码的内存上限。 */
const size = (value) => integer(value?.width, 1) && integer(value?.height, 1)
  && value.width * value.height <= MAX_PIXELS;
/** 检查画布坐标。 */
const point = (value) => coordinate(value?.x) && coordinate(value?.y);

/** 校验编辑工程，并约束引擎未启用的排版旋转。 */
export function validateProject(project) {
  requireValue(project?.schema === PROJECT_SCHEMA && typeof project.name === "string" && project.name.trim(), "工程版本或名称");
  requireValue(size(project.canvas) && point(project.anchor), "画布或公共锚点");
  requireValue(project.fps > 0 && project.fps <= 24 && typeof project.fps === "number"
    && typeof project.loop === "boolean", "帧率或循环设置");
  const settings = project.settings;
  requireValue(TARGETS.includes(settings?.target) && integer(settings.maxSize, 1)
    && settings.maxSize <= 8192 && integer(settings.padding) && settings.padding <= 16, "图集设置");
  requireValue(Array.isArray(project.frames) && project.frames.length > 0, "帧列表");
  const ids = new Set();
  let elapsedSamples = 0;
  for (const frame of project.frames) {
    requireValue(typeof frame?.id === "string" && frame.id.length > 0 && !ids.has(frame.id), "帧标识应唯一");
    requireValue(typeof frame.source === "string" && frame.source.length > 0 && size(frame) && point(frame.offset)
      && Number.isFinite(frame.durationMs) && frame.durationMs >= 1, `帧 ${frame.id}`);
    // Unity 的原生 Clip 交接要求每个关键帧在同一采样网格上。
    if (settings.target === "unity") {
      elapsedSamples += frame.durationMs * project.fps / 1000;
      requireValue(Math.abs(elapsedSamples - Math.round(elapsedSamples)) < 1e-5, `Unity 帧 ${frame.id} 的时长未对齐 FPS 网格`);
    }
    ids.add(frame.id);
  }
  return project;
}

/** 按稳定帧 ID 核对来源，允许排序变更而不允许替换、增加或删除素材。 */
export function validateFrameSources(frames, originalFrames, { lockDuration = false } = {}) {
  const sourceById = new Map(originalFrames.map((frame) => [frame.id, frame]));
  requireValue(frames.length === sourceById.size, "帧来源数量不匹配");
  for (const frame of frames) {
    const source = sourceById.get(frame.id);
    requireValue(source && source.source === frame.source && source.width === frame.width && source.height === frame.height
      && source.sourceSha256 === frame.sourceSha256, `帧来源不匹配：${frame.id}`);
    requireValue(!lockDuration || source.durationMs === frame.durationMs, `帧时长与原时间轴不一致：${frame.id}`);
    sourceById.delete(frame.id);
  }
}

/** 求透明裁剪范围，完全透明的帧以一个透明像素表示。 */
function alphaBounds(width, height, rgba) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return { x: 0, y: 0, width: 1, height: 1, empty: true };
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1, empty: false };
}

/** 自动裁剪透明边，保留像素姿态及裁剪矩形在原始画布中的位置。 */
export function prepareFrame(frame, rgba) {
  requireValue(size(frame) && ArrayBuffer.isView(rgba) && rgba.BYTES_PER_ELEMENT === 1
    && rgba.length === frame.width * frame.height * 4, `帧像素 ${frame?.id}`);
  const { empty, ...bounds } = alphaBounds(frame.width, frame.height, rgba);
  const data = new Uint8Array(bounds.width * bounds.height * 4);
  if (empty) return { bounds, data, empty };
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const from = ((bounds.y + y) * frame.width + bounds.x + x) * 4;
      const to = (y * bounds.width + x) * 4;
      // 透明像素的 RGB 不参与渲染，统一清零保证重复导出一致。
      if (rgba[from + 3] !== 0) data.set(rgba.subarray(from, from + 4), to);
    }
  }
  return { bounds, data, empty };
}

/** 为当页选择浪费最小的空矩形，方向相同时优先保留原朝向。 */
function findSlot(free, bounds, padding, allowRotation) {
  let best = null;
  for (let index = 0; index < free.length; index += 1) {
    const area = free[index];
    for (const rotation of allowRotation ? [0, 90] : [0]) {
      const width = (rotation ? bounds.height : bounds.width) + 2 * padding;
      const height = (rotation ? bounds.width : bounds.height) + 2 * padding;
      if (width > area.width || height > area.height) continue;
      const score = area.width * area.height - width * height;
      const shortSide = Math.min(area.width - width, area.height - height);
      if (!best || score < best.score || (score === best.score && shortSide < best.shortSide)) {
        best = { index, x: area.x, y: area.y, width, height, rotation, score, shortSide };
      }
    }
  }
  return best;
}

/** 将已用空间切成不重叠的两个余区，确保不同帧的扩边也不重叠。 */
function occupy(page, slot) {
  const [area] = page.free.splice(slot.index, 1);
  const horizontal = area.width - slot.width > area.height - slot.height;
  const right = { x: slot.x + slot.width, y: slot.y, width: area.width - slot.width, height: horizontal ? area.height : slot.height };
  const bottom = { x: slot.x, y: slot.y + slot.height, width: horizontal ? slot.width : area.width, height: area.height - slot.height };
  if (right.width > 0 && right.height > 0) page.free.push(right);
  if (bottom.width > 0 && bottom.height > 0) page.free.push(bottom);
  page.width = Math.max(page.width, slot.x + slot.width);
  page.height = Math.max(page.height, slot.y + slot.height);
}

/** 按尺寸排序以减少空隙，输出帧顺序仍保持原时间轴。 */
function packFrames(frames, { maxSize, padding, target }) {
  const pages = [];
  const allowRotation = ROTATING_TARGETS.has(target);
  // 使用固定 ID 消解尺寸并列，仅修改播放顺序时图集布局可以复用。
  const ordered = [...frames].sort((a, b) =>
    Math.max(b.bounds.width, b.bounds.height) - Math.max(a.bounds.width, a.bounds.height)
    || b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height
    || (a.frame.id < b.frame.id ? -1 : 1));
  for (const item of ordered) {
    let slot = null;
    let pageIndex = 0;
    for (; pageIndex < pages.length; pageIndex += 1) {
      slot = findSlot(pages[pageIndex].free, item.bounds, padding, allowRotation);
      if (slot) break;
    }
    if (!slot) {
      const page = { width: 0, height: 0, free: [{ x: 0, y: 0, width: maxSize, height: maxSize }] };
      slot = findSlot(page.free, item.bounds, padding, allowRotation);
      requireValue(slot, `帧 ${item.frame.id} 超过单页尺寸（含扩边）`);
      pages.push(page);
    }
    occupy(pages[pageIndex], slot);
    item.page = pageIndex;
    item.packingRotation = slot.rotation;
    item.rect = { x: slot.x + padding, y: slot.y + padding, width: slot.width - padding * 2, height: slot.height - padding * 2 };
  }
  return pages;
}

/** 写入图集页，矩形外围复制最近的边缘像素以隔离线性采样。 */
function paintFrame(page, { data, bounds, rect, packingRotation }, padding) {
  for (let y = -padding; y < rect.height + padding; y += 1) {
    for (let x = -padding; x < rect.width + padding; x += 1) {
      const u = Math.max(0, Math.min(x, rect.width - 1));
      const v = Math.max(0, Math.min(y, rect.height - 1));
      const source = (packingRotation ? (bounds.height - 1 - u) * bounds.width + v : v * bounds.width + u) * 4;
      const output = ((rect.y + y) * page.width + rect.x + x) * 4;
      page.data.set(data.subarray(source, source + 4), output);
    }
  }
}

/** 将已解码帧打包成 RGBA 页面和可由各引擎读取的配置。 */
export function compileAtlas(project, images) {
  validateProject(project);
  const frames = project.frames.map((frame) => ({
    frame,
    ...prepareFrame(frame, images.get(frame.id)),
  }));
  const layout = packFrames(frames, project.settings);
  requireValue(layout.reduce((total, page) => total + page.width * page.height, 0) <= MAX_PIXELS, "图集总像素超出内存上限");
  const pages = layout.map(({ width, height }) => ({ width, height, data: new Uint8Array(width * height * 4) }));
  for (const frame of frames) paintFrame(pages[frame.page], frame, project.settings.padding);
  const { name, canvas, anchor, loop, fps, origin } = project;
  const manifest = {
    schema: ATLAS_SCHEMA, name, canvas, anchor, loop, fps, target: project.settings.target,
    ...(origin ? { origin } : {}),
    pages: pages.map(({ width, height }, index) => ({ file: `atlas-${index + 1}.png`, width, height })),
    frames: frames.map(({ frame, page, rect, bounds, packingRotation, empty }) => ({
      id: frame.id, page, rect, trimRect: bounds, sourceSize: { width: frame.width, height: frame.height },
      offset: frame.offset, packingRotation, durationMs: frame.durationMs, empty,
    })),
  };
  return { manifest, pages };
}

/** 检查运行时清单，拒绝越界坐标、重复标识及不受支持的压图旋转。 */
export function validateAtlasManifest(manifest) {
  requireValue(manifest?.schema === ATLAS_SCHEMA && typeof manifest.name === "string" && manifest.name.trim()
    && TARGETS.includes(manifest.target) && point(manifest.anchor) && size(manifest.canvas)
    && typeof manifest.loop === "boolean" && typeof manifest.fps === "number"
    && manifest.fps > 0 && manifest.fps <= 24, "运行时清单头");
  requireValue(Array.isArray(manifest.pages) && manifest.pages.length > 0, "图集页");
  requireValue(Array.isArray(manifest.frames) && manifest.frames.length > 0, "运行时帧");
  const ids = new Set();
  for (const [index, page] of manifest.pages.entries()) {
    requireValue(size(page) && page.file === `atlas-${index + 1}.png`, `图集页 ${index}`);
  }
  for (const frame of manifest.frames) {
    const page = manifest.pages[frame?.page];
    const rect = frame?.rect;
    const trimRect = frame?.trimRect;
    const rotated = frame?.packingRotation === 90;
    requireValue(typeof frame?.id === "string" && frame.id.length > 0 && !ids.has(frame.id)
      && integer(frame.page) && page && size(rect) && integer(rect.x) && integer(rect.y)
      && rect.x + rect.width <= page.width && rect.y + rect.height <= page.height
      && size(trimRect) && point(trimRect) && size(frame.sourceSize) && point(frame.offset)
      && (frame.packingRotation === 0 || (rotated && ROTATING_TARGETS.has(manifest.target)))
      && rect.width === (rotated ? trimRect.height : trimRect.width)
      && rect.height === (rotated ? trimRect.width : trimRect.height)
      && typeof frame.empty === "boolean" && (!frame.empty || (trimRect.width === 1 && trimRect.height === 1))
      && Number.isFinite(frame.durationMs) && frame.durationMs >= 1, `运行时帧 ${frame?.id}`);
    ids.add(frame.id);
  }
  return manifest;
}

/** 恢复已打包页面中的当前帧，像素顺序与打包前一致。 */
export function readAtlasFrame(manifest, pages, index) {
  const frame = manifest.frames[index];
  requireValue(frame, `找不到帧 ${index}`);
  const page = pages[frame.page];
  const expected = manifest.pages[frame.page];
  requireValue(page?.width === expected.width && page.height === expected.height
    && page.data?.length === page.width * page.height * 4, `图集页 ${expected.file} 像素或尺寸`);
  const { rect, trimRect: bounds, packingRotation, empty } = frame;
  const data = new Uint8Array(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const u = packingRotation ? bounds.height - 1 - y : x;
      const v = packingRotation ? x : y;
      const from = ((rect.y + v) * page.width + rect.x + u) * 4;
      data.set(page.data.subarray(from, from + 4), (y * bounds.width + x) * 4);
    }
  }
  return { bounds, data, empty };
}

/** 计算相对于公共锚点的显示矩形，裁剪与手动位移各应用一次。 */
export function getFramePlacement(frame, anchor) {
  const { x, y, width, height } = frame.trimRect;
  return { x: x + frame.offset.x - anchor.x, y: y + frame.offset.y - anchor.y, width, height };
}
