import assert from "node:assert/strict";
import test from "node:test";
import { createFrameAtlasPlayer } from "./frame-atlas.mjs";

/** 构造可观察帧注册与画面定位的 Phaser 场景替身。 */
function makeScene() {
  const textures = [0, 1].map(() => ({
    source: [{ width: 20, height: 10 }], frames: new Set(),
    has(name) { return this.frames.has(name); },
    add(name) { this.frames.add(name); return {}; },
    remove(name) { this.frames.delete(name); },
  }));
  const image = {
    setOrigin(x, y) { this.origin = [x, y]; return this; },
    setTexture(key, name) { this.key = key; this.name = name; this.origin = [0.5, 0.5]; return this; },
    setPosition(x, y) { this.position = [x, y]; return this; },
    setVisible(value) { this.visible = value; return this; },
  };
  const container = { add() {}, destroy() {} };
  return { scene: { textures: { get(key) { return textures[Number(key)]; } },
    add: { container() { return container; }, image() { return image; } } }, image, textures };
}

test("跨页播放恢复位置、保持左上原点并停在透明末帧", () => {
  const { scene, image, textures } = makeScene();
  const manifest = {
    schema: "frame-atlas/1", anchor: { x: 4, y: 5 }, loop: false,
    pages: [{ width: 20, height: 10 }, { width: 20, height: 10 }],
    frames: [
      { id: "a", page: 0, rect: { x: 0, y: 0, width: 2, height: 3 },
        trimRect: { x: 1, y: 2, width: 2, height: 3 }, offset: { x: 2, y: -1 }, durationMs: 100, packingRotation: 0, empty: false },
      { id: "b", page: 1, rect: { x: 0, y: 0, width: 1, height: 1 },
        trimRect: { x: 0, y: 0, width: 1, height: 1 }, offset: { x: -2, y: 3 }, durationMs: 200, packingRotation: 0, empty: true },
    ],
  };
  const player = createFrameAtlasPlayer(scene, manifest, ["0", "1"], "actor");
  assert.deepEqual(image.position, [-1, -4]);
  assert.deepEqual(image.origin, [0, 0]);
  player.update(0.1);
  assert.equal(image.key, "1");
  assert.equal(image.visible, false);
  assert.deepEqual(image.position, [-6, -2]);
  player.update(100);
  assert.equal(image.visible, false);
  player.reset();
  assert.equal(image.visible, true);
  player.dispose();
  assert.equal(textures[0].frames.size + textures[1].frames.size, 0);
});
