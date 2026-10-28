import assert from 'node:assert/strict';
import test from 'node:test';
import { checkNativeBackgroundSize } from './native-background-contract.mjs';
import { resolveOrientationCoverage } from './orientation-validation-scope.mjs';

/** 不同方向均只能声明一个方向，非法与重复值均拒绝。 */
test('游戏方向只能单选横屏或竖屏', () => {
  for (const value of ['portrait', 'landscape']) assert.deepEqual(resolveOrientationCoverage({allowed:[value]}).errors, []);
  for (const allowed of [[], ['portrait','landscape'], ['portrait','portrait'], ['auto']]) assert.ok(resolveOrientationCoverage({allowed}).errors.length);
});

/** 覆盖缩放可放大或缩小，错误尺寸、错位与缺少实测分别处理。 */
test('背景覆盖校验尺寸、裁切焦点及缺证', () => {
  /** 使用固定画布构造背景测量，检验等比覆盖与缺证。 */
  const run = (sourceLogicalSize, backgroundRect) => checkNativeBackgroundSize({sourceLogicalSize, logicalSize:{width:100,height:200}, canvasRect:{x:0,y:0,width:100,height:200}, backgroundRect, sourceFocus:{x:.5,y:.5}, targetPoint:{x:.5,y:.5}});
  assert.equal(run({width:100,height:100},{x:-50,y:0,width:200,height:200}).status,'pass');
  assert.equal(run({width:400,height:400},{x:-50,y:0,width:200,height:200}).status,'pass');
  assert.equal(run({width:100,height:100},{x:-50,y:0,width:201,height:200}).status,'fail');
  assert.equal(run({width:100,height:100},{x:-40,y:0,width:200,height:200}).status,'fail');
  assert.equal(run(null,{x:0,y:0,width:100,height:200}).status,'unverified');
});

/** 逻辑画布与 CSS 画布比例不一致时，也不得将正方形背景拉伸为长方形。 */
test('非等比画布映射不能掩盖背景拉伸', () => {
  const input = { sourceLogicalSize:{width:100,height:100}, logicalSize:{width:100,height:100}, canvasRect:{x:0,y:0,width:200,height:100}, sourceFocus:{x:.5,y:.5}, targetPoint:{x:.5,y:.5} };
  assert.equal(checkNativeBackgroundSize({...input, backgroundRect:{x:0,y:0,width:200,height:100}}).status, 'fail');
  assert.equal(checkNativeBackgroundSize({...input, backgroundRect:{x:0,y:-50,width:200,height:200}}).status, 'pass');
});
