import * as THREE from "three";
import { createFrameAtlasPlayer } from "./frame-atlas.mjs";

/** 在现有场景中加载动画并返回需要逐帧更新的播放器。 */
export async function addExample(scene, manifestUrl) {
  const url = new URL(manifestUrl, window.location.href);
  const response = await fetch(url);
  if (!response.ok) throw new Error("无法加载清单：" + response.status);
  const manifest = await response.json();
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(manifest.pages.map((page) => loader.loadAsync(new URL(page.file, url).href)));
  const player = createFrameAtlasPlayer(manifest, textures);
  scene.add(player.mesh);
  return { player, textures };
}
