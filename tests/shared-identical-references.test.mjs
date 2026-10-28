/** 检验公共参考计划的来源完整性与相对链接边界。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { buildSharedIdenticalReferencesPlan } from '../scripts/migration/shared-identical-references.mjs';

/** 构造不依赖源仓库、可独立篡改的三栈来源。 */
function fixture() {
  const plans = ['cocos', 'phaser', 'threejs'].map((stack) => ({ stack, entries: new Map(), sourceBuffers: new Map() }));
  const sources = [
    ['cocos', 'cocos-spine-generative-reskin', 'batch-review.md', '批次审阅规则'],
    ['phaser', 'phaser4-spine-generative-reskin', 'batch-review.md', '批次审阅规则'],
    ['cocos', 'cocos-game-asset-integration', 'effect-image-font.md', '[许可](https://example.com/license)'],
    ['phaser', 'phaser4-game-asset-integration', 'effect-image-font.md', '[许可](https://example.com/license)'],
    ['threejs', 'threejs-game-asset-integration', 'effect-image-font.md', '[许可](https://example.com/license)'],
  ];
  for (const [stack, skill, file, text] of sources) {
    const plan = plans.find((item) => item.stack === stack);
    const sourcePath = `skills/${skill}/references/${file}`;
    plan.entries.set(sourcePath, { stack, sourcePath, destination: sourcePath });
    plan.sourceBuffers.set(sourcePath, Buffer.from(text, 'utf8'));
  }
  return plans;
}

test('无相对链接的资料保留完整内容和所有来源摘要', () => {
  const { ready } = buildSharedIdenticalReferencesPlan(fixture());
  assert.deepEqual(ready.map((entry) => entry.id), ['spine-batch-review', 'effect-image-font']);
  assert.deepEqual(ready.map((entry) => entry.sources.length), [2, 3]);
  assert.equal(ready[0].content, '批次审阅规则');
  assert.equal(ready[0].sources[0].sourceSha256, createHash('sha256').update('批次审阅规则').digest('hex'));
  assert.ok(ready.every((entry) => entry.implementation.startsWith('skills/app-domain-toolkit/references/')));
  assert.ok(ready.every((entry) => entry.relativeLinks.length === 0));
});

test('任一来源缺失或字节漂移时拒绝合并', () => {
  const missing = fixture();
  missing[2].sourceBuffers.delete('skills/threejs-game-asset-integration/references/effect-image-font.md');
  assert.throws(() => buildSharedIdenticalReferencesPlan(missing), /来源缺失/);
  const changed = fixture();
  changed[1].sourceBuffers.set('skills/phaser4-spine-generative-reskin/references/batch-review.md', Buffer.from('不同内容'));
  assert.throws(() => buildSharedIdenticalReferencesPlan(changed), /源内容不一致/);
});

test('公共目标冲突、无效字节与新增相对链接均不能静默放行', () => {
  const collision = fixture();
  collision[0].entries.set('skills/unrelated/reference.md', { sourcePath: 'skills/unrelated/reference.md', destination: 'skills/app-domain-toolkit/references/visual-assets/effect-image-font.md' });
  assert.throws(() => buildSharedIdenticalReferencesPlan(collision), /目标已被其他来源占用/);
  const invalid = fixture();
  for (const plan of invalid.slice(0, 2)) {
    const skill = plan.stack === 'cocos' ? 'cocos-spine-generative-reskin' : 'phaser4-spine-generative-reskin';
    plan.sourceBuffers.set(`skills/${skill}/references/batch-review.md`, Buffer.from([0xff]));
  }
  assert.throws(() => buildSharedIdenticalReferencesPlan(invalid), /不是有效 UTF-8/);
  const relative = fixture();
  for (const plan of relative.slice(0, 2)) {
    const skill = plan.stack === 'cocos' ? 'cocos-spine-generative-reskin' : 'phaser4-spine-generative-reskin';
    plan.sourceBuffers.set(`skills/${skill}/references/batch-review.md`, Buffer.from('[相关](other.md)'));
  }
  assert.throws(() => buildSharedIdenticalReferencesPlan(relative), /新增相对链接/);
});
