/** 创建帧动画容器，调用方提供已按页顺序加载的 Phaser 纹理键。 */
export function createFrameAtlasPlayer(scene, manifest, textureKeys, namespace) {
  if (manifest?.schema !== "frame-atlas/1" || !manifest.frames?.length
    || textureKeys.length !== manifest.pages.length || !namespace) throw new Error("帧动画清单、纹理或命名空间无效");
  const duration = manifest.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (!Number.isFinite(duration) || duration <= 0 || manifest.frames.some((frame) =>
    !Number.isFinite(frame.durationMs) || frame.durationMs <= 0 || frame.packingRotation !== 0
    || !textureKeys[frame.page])) throw new Error("帧时长、页号或排版旋转无效");
  const names = manifest.frames.map((frame, index) => namespace + ":" + index + ":" + frame.id);
  // 事先检查全部帧名，避免注册冲突后留下半组帧。
  for (const [index, frame] of manifest.frames.entries()) {
    const texture = scene.textures.get(textureKeys[frame.page]);
    const source = texture?.source?.[0];
    if (!source || source.width !== manifest.pages[frame.page].width || source.height !== manifest.pages[frame.page].height
      || texture.has(names[index])) throw new Error("图集纹理尺寸不符或帧名已存在");
  }
  const registered = [];
  try {
    for (const [index, frame] of manifest.frames.entries()) {
      const texture = scene.textures.get(textureKeys[frame.page]);
      const rect = frame.rect;
      if (!texture.add(names[index], 0, rect.x, rect.y, rect.width, rect.height)) throw new Error("无法注册图集帧");
      registered.push({ texture, name: names[index] });
    }
  } catch (error) {
    for (const entry of registered) entry.texture.remove(entry.name);
    throw error;
  }
  const container = scene.add.container(0, 0);
  const image = scene.add.image(0, 0, textureKeys[manifest.frames[0].page], names[0]).setOrigin(0, 0);
  container.add(image);
  let elapsed = 0;
  let current = -1;

  /** 子图使用左上原点，容器原点始终是动画公共锚点。 */
  function show(index) {
    if (current === index) return;
    current = index;
    const frame = manifest.frames[index];
    image.setTexture(textureKeys[frame.page], names[index]);
    image.setOrigin(0, 0);
    image.setPosition(frame.trimRect.x + frame.offset.x - manifest.anchor.x,
      frame.trimRect.y + frame.offset.y - manifest.anchor.y);
    image.setVisible(!frame.empty);
  }

  /** 按每帧独立时长推进，非循环动画停在末帧。 */
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

  /** 清理本播放器登记的帧，纹理资源由调用方管理。 */
  function dispose() {
    container.destroy(true);
    for (const entry of registered) entry.texture.remove(entry.name);
  }

  /** 重置播放位置。 */
  function reset() {
    elapsed = 0;
    show(0);
  }

  show(0);
  return { container, update, reset, dispose };
}
