import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateFullBleedCoverTransform } from './full-bleed-background-adapter.mjs';

/** 横竖视口均保持等比覆盖，允许放大和缩小。 */
test('背景按实际视口等比覆盖', () => {
  for (const [sw,sh,w,h] of [[100,100,100,200],[400,400,100,200],[1920,1080,390,844],[1080,1920,844,390]]) {
    const r = calculateFullBleedCoverTransform({sourceWidth:sw,sourceHeight:sh,viewportWidth:w,viewportHeight:h});
    assert.equal(r.scale, Math.max(w/sw,h/sh));
    assert.equal(r.displayWidth,sw*r.scale); assert.equal(r.displayHeight,sh*r.scale);
    assert.ok(r.x <= 0 && r.x+r.displayWidth >= w && r.y <= 0 && r.y+r.displayHeight >= h);
  }
});

/** 焦点偏移限制在裁切范围，非法尺寸不能进入布局。 */
test('焦点约束和非法输入', () => {
  const r=calculateFullBleedCoverTransform({sourceWidth:200,sourceHeight:100,viewportWidth:100,viewportHeight:100,sourceFocus:{x:1,y:0},targetPoint:{x:0,y:1}});
  assert.equal(r.x,-100); assert.equal(r.crop.right,0);
  assert.throws(()=>calculateFullBleedCoverTransform({sourceWidth:0,sourceHeight:1,viewportWidth:1,viewportHeight:1}));
});
