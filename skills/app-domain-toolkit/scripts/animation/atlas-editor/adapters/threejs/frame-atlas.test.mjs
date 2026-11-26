import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("旋转图集的 UV、偏移和切页独立于共享纹理", async () => {
  // 隔离 Three.js 运行时依赖，仅核对适配器写入的顶点和 UV。
  const fake = `
    export class BufferAttribute { constructor(array) { this.array = array; } }
    export class BufferGeometry {
      attributes = {};
      setIndex(index) { this.index = index; }
      setAttribute(name, value) { this.attributes[name] = value; }
      dispose() {}
    }
    export class MeshBasicMaterial { constructor(options) { Object.assign(this, options); } dispose() {} }
    export class Mesh { constructor(geometry, material) { this.geometry = geometry; this.material = material; } }
    export const DoubleSide = 2;
  `;
  const fakeUrl = "data:text/javascript;base64," + Buffer.from(fake).toString("base64");
  const source = (await readFile(new URL("./frame-atlas.mjs", import.meta.url), "utf8"))
    .replace('"three"', JSON.stringify(fakeUrl));
  const { createFrameAtlasPlayer } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
  const textures = [0, 1].map(() => ({ image: { width: 16, height: 8 }, flipY: true }));
  const manifest = { schema: "frame-atlas/1", anchor: { x: 4, y: 5 }, loop: false,
    pages: [{ width: 16, height: 8 }, { width: 16, height: 8 }],
    frames: [
      { page: 0, rect: { x: 4, y: 2, width: 2, height: 4 }, trimRect: { x: 1, y: 2, width: 4, height: 2 },
        offset: { x: 2, y: -1 }, durationMs: 100, packingRotation: 90, empty: false },
      { page: 1, rect: { x: 0, y: 0, width: 1, height: 1 }, trimRect: { x: 0, y: 0, width: 1, height: 1 },
        offset: { x: 0, y: 0 }, durationMs: 100, packingRotation: 0, empty: true },
    ],
  };
  const player = createFrameAtlasPlayer(manifest, textures);
  assert.deepEqual(Array.from(player.mesh.geometry.attributes.position.array), [-1, 2, 0, 3, 2, 0, 3, 4, 0, -1, 4, 0]);
  assert.deepEqual(Array.from(player.mesh.geometry.attributes.uv.array), [0.25, 0.75, 0.25, 0.25, 0.375, 0.25, 0.375, 0.75]);
  player.update(0.1);
  assert.equal(player.mesh.visible, false);
  assert.equal(player.mesh.material.map, textures[1]);
  player.reset();
  assert.equal(player.mesh.material.map, textures[0]);
  player.dispose();
});
