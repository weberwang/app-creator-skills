import assert from 'node:assert/strict';
import test from 'node:test';
import { checkNativeBackgroundSize } from '../skills/app-domain-toolkit/scripts/visual/native-background-contract.mjs';
import { evaluateViewport as cocos } from '../skills/cocos-game-qa-performance/scripts/responsive-visual-validation.mjs';
import { evaluateViewport as phaser } from '../skills/phaser4-game-qa-performance/scripts/responsive-visual-validation.mjs';
import { evaluateViewport as threejs } from '../skills/threejs-game-qa-performance/scripts/responsive-visual-validation.mjs';

/** 构造逻辑画布与 CSS 映射不同的实际采样，避免把 DPR 当作图片缩放。 */
function sample(dpr = 1) {
  return { viewportRect: { x: 0, y: 0, width: 360, height: 800 }, canvasRect: { x: 0, y: 0, width: 360, height: 800 }, backingSize: { width: 360 * dpr, height: 800 * dpr }, devicePixelRatio: dpr,
    hookSnapshot: { version: 1, logicalSize: { width: 720, height: 1600 }, background: { fitMode: 'cover-v1', sourceLogicalSize: { width: 720, height: 800 }, rect: { x: -180, y: 0, width: 720, height: 800 } } },
    contract: { viewport: { backgroundCoverageTarget: 1, backgroundFit: { mode: 'cover-v1', sourceFocalPoint: { x: 0.5, y: 0.5 }, targetPoint: { x: 0.5, y: 0.5 } } } } };
}

test('背景允许 cover，错误比例与缺失来源分别失败和未验证', () => {
  const basis = { sourceLogicalSize: { width: 720, height: 1600 }, logicalSize: { width: 720, height: 1600 }, canvasRect: { x: 0, y: 0, width: 360, height: 800 }, backgroundRect: { x: 0, y: 0, width: 360, height: 800 }, sourceFocus: { x: 0.5, y: 0.5 }, targetPoint: { x: 0.5, y: 0.5 } };
  assert.equal(checkNativeBackgroundSize(basis).status, 'pass');
  assert.equal(checkNativeBackgroundSize({ ...basis, backgroundRect: { x: 0, y: 0, width: 400, height: 800 } }).status, 'fail');
  assert.equal(checkNativeBackgroundSize({ ...basis, sourceLogicalSize: null }).status, 'unverified');
});

for (const [name, evaluate] of [['cocos', cocos], ['phaser', phaser], ['threejs', threejs]]) {
  test(`${name} 背景按 cover 等比铺满，DPR 变化不改变 CSS 尺寸`, () => {
    for (const dpr of [1, 2]) assert.equal(evaluate(sample(dpr)).backgroundFit.status, 'pass');
    const scaled = sample(); scaled.hookSnapshot.background.rect.width = 400;
    assert.ok(evaluate(scaled).failures.some((message) => message.includes('源帧逻辑尺寸')));
    const missing = sample(); delete missing.hookSnapshot.background.sourceLogicalSize;
    assert.ok(evaluate(missing).unverified.some((message) => message.includes('源帧逻辑')));
  });
}
