import * as THREE from "three";

/** 创建独立网格，按帧数据还原裁剪、偏移与顺时针打包旋转。 */
export function createFrameAtlasPlayer(manifest, textures) {
  if (manifest?.schema !== "frame-atlas/1" || !manifest.frames?.length
    || textures.length !== manifest.pages.length) throw new Error("帧动画清单或图集页无效");
  if (textures.some((texture, index) => !texture || texture.image?.width !== manifest.pages[index].width
    || texture.image?.height !== manifest.pages[index].height || texture.flipY !== true)) {
    throw new Error("图集贴图尺寸不匹配或 flipY 未开启");
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(8), 2));
  const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  let elapsed = 0;
  let current = -1;
  const duration = manifest.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (!Number.isFinite(duration) || duration <= 0 || manifest.frames.some((frame) => !Number.isFinite(frame.durationMs) || frame.durationMs <= 0
    || !textures[frame.page] || ![0, 90].includes(frame.packingRotation))) {
    throw new Error("帧时长、页号或排版旋转无效");
  }

  /** 按实际裁剪矩形生成顶点，UV 只写入本实例的几何体。 */
  function show(index) {
    if (current === index) return;
    current = index;
    const frame = manifest.frames[index];
    mesh.visible = !frame.empty;
    const { x, y, width, height } = frame.trimRect;
    const left = x + frame.offset.x - manifest.anchor.x;
    const top = -(y + frame.offset.y - manifest.anchor.y);
    const right = left + width;
    const bottom = top - height;
    geometry.attributes.position.array.set([left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0]);
    const rect = frame.rect;
    const page = manifest.pages[frame.page];
    const u0 = rect.x / page.width;
    const u1 = (rect.x + rect.width) / page.width;
    const v0 = 1 - (rect.y + rect.height) / page.height;
    const v1 = 1 - rect.y / page.height;
    // 顶点顺序为左下、右下、右上、左上；旋转页需要重排四角。
    geometry.attributes.uv.array.set(frame.packingRotation === 90
      ? [u0, v1, u0, v0, u1, v0, u1, v1]
      : [u0, v0, u1, v0, u1, v1, u0, v1]);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.uv.needsUpdate = true;
    material.map = textures[frame.page];
    material.needsUpdate = true;
  }

  /** 按总耗时定位帧，非循环动画在最后一帧停留。 */
  function update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("播放增量必须是非负秒数");
    elapsed += deltaSeconds * 1000;
    let time = manifest.loop ? elapsed % duration : Math.min(elapsed, duration);
    let index = 0;
    while (index < manifest.frames.length - 1 && time >= manifest.frames[index].durationMs) {
      time -= manifest.frames[index].durationMs;
      index += 1;
    }
    show(index);
  }

  /** 释放此实例持有的几何和材质，图集纹理由调用方管理。 */
  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  /** 重置播放位置。 */
  function reset() {
    elapsed = 0;
    show(0);
  }

  show(0);
  return { mesh, update, reset, dispose };
}
