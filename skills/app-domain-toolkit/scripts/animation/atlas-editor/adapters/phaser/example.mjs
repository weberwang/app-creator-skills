import { createFrameAtlasPlayer } from "./frame-atlas.mjs";

/** 在 Phaser 场景的 preload 阶段登记清单和图集页。 */
export function preloadExample(scene, assetPrefix, pageCount, baseUrl) {
  scene.load.json(assetPrefix + ":json", baseUrl + "/animation.json");
  for (let index = 0; index < pageCount; index += 1) {
    scene.load.image(assetPrefix + ":page:" + index, baseUrl + "/atlas-" + (index + 1) + ".png");
  }
}

/** 在 create 阶段创建实例，并在 update 中以秒为单位推进。 */
export function createExample(scene, assetPrefix, instanceId) {
  const manifest = scene.cache.json.get(assetPrefix + ":json");
  const keys = manifest.pages.map((_, index) => assetPrefix + ":page:" + index);
  return createFrameAtlasPlayer(scene, manifest, keys, instanceId);
}
