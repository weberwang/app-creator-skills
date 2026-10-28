/** 验证帧动画资源按栈重定位，公共入口和来源身份保持可追溯。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { frameResourceTarget, mapSourceFile, STACK_POLICIES } from '../scripts/migration/source-policy.mjs';
import { routeCapabilityPlan } from '../scripts/migration/capability-entry-routing.mjs';

const STACKS = Object.freeze({ cocos: 'cocos-frame-animation', phaser: 'phaser4-frame-animation', threejs: 'threejs-frame-animation' });

test('三个技术栈的帧资料和脚本仅进入自身领域资源目录', () => {
  for (const [stack, skill] of Object.entries(STACKS)) {
    const roots = new Set([skill]);
    for (const relative of ['agents/openai.yaml', 'references/action-timing.md', 'scripts/video-to-atlas.mjs', 'scripts/image-frame-source.test.mjs', 'assets/template.json']) {
      const source = `skills/${skill}/${relative}`;
      const expected = `skills/${stack}-domain-contracts/resources/frame-animation/${relative}`;
      assert.equal(frameResourceTarget(stack, source), expected);
      const mapped = mapSourceFile(stack, source, roots);
      assert.equal(mapped.destination, expected);
      assert.equal(mapped.disposition, 'copied');
    }
    const entry = mapSourceFile(stack, `skills/${skill}/SKILL.md`, roots);
    assert.equal(entry.destination, `skills/${skill}/ADAPTER.md`);
    assert.equal(entry.capabilityRef, 'skills/app-animation/SKILL.md');
    for (const [otherStack, otherSkill] of Object.entries(STACKS)) if (otherStack !== stack) {
      assert.equal(frameResourceTarget(stack, `skills/${otherSkill}/scripts/video-to-atlas.mjs`), null);
    }
  }
});

test('非法或不相关源路径不能映射成栈资源', () => {
  assert.throws(() => frameResourceTarget('cocos', 'skills/cocos-frame-animation/../outside.mjs'), /路径无效/);
  assert.throws(() => frameResourceTarget('cocos', 'skills/cocos-frame-animation/scripts//outside.mjs'), /路径无效/);
  assert.throws(() => frameResourceTarget('cocos', 'skills/cocos-frame-animation/scripts/a\\outside.mjs'), /路径无效/);
  assert.equal(frameResourceTarget('unity', 'skills/cocos-frame-animation/scripts/video-to-atlas.mjs'), null);
  assert.equal(frameResourceTarget('cocos', 'skills/cocos-frame-animation/SKILL.md'), null);
});

test('安装计划只登记实际领域根，且原生能力仍路由至公共动画入口', () => {
  for (const [stack, skill] of Object.entries(STACKS)) {
    const policy = STACK_POLICIES[stack];
    const metadata = `skills/${skill}/agents/openai.yaml`;
    const body = `skills/${skill}/SKILL.md`;
    const entries = new Map([
      [metadata, { sourcePath: metadata, destination: frameResourceTarget(stack, metadata), transforms: [] }],
      [body, { sourcePath: body, destination: `skills/${skill}/ADAPTER.md`, transforms: [] }],
      [`skills/${skill}/scripts/video-to-atlas.mjs`, { sourcePath: `skills/${skill}/scripts/video-to-atlas.mjs`, destination: frameResourceTarget(stack, `skills/${skill}/scripts/video-to-atlas.mjs`), transforms: [] }],
    ]);
    const plan = routeCapabilityPlan({ stack, policy, entries, rootSkillEntries: [{ name: skill, kind: 'specialist' }], resourceDirectories: [skill] });
    assert.ok(plan.resourceDirectories.includes(`${stack}-domain-contracts`));
    assert.ok(!plan.resourceDirectories.includes(skill));
    assert.equal(plan.rootSkillEntries[0].destination, 'skills/app-animation/SKILL.md');
  }
});

test('九个帧动画命令指向所选栈的领域资源', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const stack of Object.keys(STACKS)) {
    for (const [suffix, file] of [['frame-animation', 'video-to-atlas.mjs'], ['frame-plan', 'image-inbetween-plan.mjs'], ['image-frame-animation', 'images-to-atlas.mjs']]) {
      assert.equal(packageJson.bin[`${stack}-${suffix}`], `./skills/${stack}-domain-contracts/resources/frame-animation/scripts/${file}`);
    }
  }
});
