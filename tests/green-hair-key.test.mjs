import test from "node:test";
import assert from "node:assert/strict";
import { keyGreenHair } from "../skills/app-domain-toolkit/scripts/image/green-hair-key.mjs";

/** 用单行像素构造可重复的图像和遮罩样本。 */
function image(...pixels) {
  return { width: pixels.length, height: 1, pixels: Buffer.from(pixels.flat()) };
}

test("绿底和前景分离，混色发丝保留渐变透明度并恢复前景色", () => {
  const source = image([0, 255, 0, 255], [255, 255, 255, 255], [128, 255, 128, 255], [0, 128, 0, 255]);
  const result = keyGreenHair(source);
  assert.deepEqual([...result.pixels], [0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 128, 0, 0, 0, 127]);
  assert.deepEqual([...source.pixels.slice(0, 4)], [0, 255, 0, 255]);
});

test("暖色前景保留原色，保护遮罩允许保留绿色衣服", () => {
  const source = image([220, 150, 45, 255], [0, 200, 0, 255], [0, 255, 0, 255]);
  const protectMask = image([0, 0, 0, 255], [255, 255, 255, 255], [128, 128, 128, 255]);
  const result = keyGreenHair(source, { protectMask });
  assert.deepEqual([...result.pixels.slice(0, 8)], [220, 150, 45, 255, 0, 200, 0, 255]);
  assert.equal(result.pixels[11], 128);
});

test("外部 Alpha 遮罩控制透明度，保护遮罩覆盖更低的不透明度", () => {
  const source = image([128, 255, 128, 255], [0, 255, 0, 255], [10, 60, 10, 255]);
  const alphaMask = image([128, 128, 128, 255], [0, 0, 0, 255], [30, 30, 30, 255]);
  const protectMask = image([0, 0, 0, 255], [255, 255, 255, 255], [100, 100, 100, 255]);
  const result = keyGreenHair(source, { alphaMask, protectMask });
  assert.deepEqual([...result.pixels.slice(0, 8)], [255, 255, 255, 128, 0, 255, 0, 255]);
  assert.equal(result.pixels[11], 100);
});

test("拒绝无效阈值、非绿底、半透明输入和异常遮罩", () => {
  const source = image([0, 255, 0, 255]);
  assert.throws(() => keyGreenHair(source, { backgroundTolerance: 50, foregroundTolerance: 50 }), /阈值/);
  assert.throws(() => keyGreenHair(source, { foregroundTolerance: 256 }), /阈值/);
  assert.throws(() => keyGreenHair(source, { backgroundColor: "#FF0000" }), /背景色/);
  assert.throws(() => keyGreenHair(image([0, 255, 0, 128])), /不透明/);
  assert.throws(() => keyGreenHair(source, { alphaMask: image([0, 0, 0, 0]) }), /不透明的灰度/);
  assert.throws(() => keyGreenHair(source, { protectMask: image([0, 1, 0, 255]) }), /灰度图/);
  assert.throws(() => keyGreenHair(source, { alphaMask: image([0, 0, 0, 255], [0, 0, 0, 255]) }), /尺寸/);
});
