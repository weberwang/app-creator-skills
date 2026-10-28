/** 核对五栈布局读取链及原生适配范围，防止浮层许可扩大为所有后代的固定定位。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { CAPABILITY_GROUPS, capabilityAdapters } from '../scripts/capability-map.mjs';
import { routeRelativeLayout } from '../scripts/migration/relative-layout-routing.mjs';
import { loadNativeMode } from '../skills/app-skill-runtime/read-native-mode.mjs';

const ROOT = resolve(import.meta.dirname, '..');

test('五栈布局模式及 Flutter 草图均引用唯一公共规则且保留原生正文', () => {
  for (const name of ['app-ui-layout', 'app-ui-code-sketch']) {
    const group = CAPABILITY_GROUPS.find((item) => item.name === name);
    for (const adapter of capabilityAdapters(group)) {
      const prefix = ['cocos', 'phaser', 'threejs'].includes(adapter.stack) ? 'skills/' : '';
      const sourcePath = `${prefix}${adapter.sourceSkill}/SKILL.md`;
      const original = '# 原生布局\n\n原生节点、坐标空间、生命周期与资源引用必须保留。\n';
      const result = routeRelativeLayout(original, { stack: adapter.stack, sourcePath,
        destination: `skills/app-stack-${adapter.stack}/references/native-contracts.md` });
      assert.ok(result.startsWith(original.trimEnd()));
      assert.match(result, /\(\.\.\/\.\.\/app-ui-layout\/references\/relative-layout\.md\)/);
    }
  }
});

test('Flutter 收窄叠层许可并保留 Positioned 相对父级实现与其余原生要求', () => {
  const sourcePath = 'adaptive-layout-implementation/references/flutter-adapter.md';
  // 自含旧条款夹具，使独立克隆和分发环境也能验证收窄逻辑，不依赖相邻源仓库。
  const original = [
    '# Flutter Adapter',
    '- 使用 LayoutBuilder 与 SafeArea 传递父级约束。',
    '- `Stack/Positioned` 仅用于真实叠层；登记 boundary、viewport scope、occlusion、fallback 和 test id。不得从目标图绝对坐标直接生成实现。',
    '- 保留稳定 key，读取真实 RenderBox 几何。',
  ].join('\n');
  const options = { stack: 'flutter', sourcePath, destination: `skills/${sourcePath}` };
  const result = routeRelativeLayout(original, options);
  assert.match(result, /`Stack\/Positioned` 可实现有明确父级或参照的相对关系/);
  assert.match(result, /叠层本身不构成内部控件使用屏幕固定坐标的理由/);
  for (const line of original.split(/\r?\n/).filter((item) => item && !item.startsWith('- `Stack/Positioned`'))) {
    assert.ok(result.includes(line), `丢失原生条款：${line}`);
  }
  assert.throws(() => routeRelativeLayout(original.replace('仅用于真实叠层', '上游叠层条款已修改'), options), /须重新审查/);
  assert.equal(routeRelativeLayout(original, { ...options, stack: 'unity' }), original);
});

test('世界对象和其他原生能力不被 UI 路由改写', () => {
  const text = '# 三维世界\n\nposition = [10, 20, 30];\n';
  assert.equal(routeRelativeLayout(text, { stack: 'threejs', sourcePath: 'skills/threejs-game-model-pipeline/SKILL.md',
    destination: 'skills/app-stack-threejs/references/native-contracts.md' }), text);
});

test('五栈实际模式读取器能直接读取完整公共布局规则', () => {
  const policyPath = 'app-ui-layout/references/relative-layout.md';
  const skillsRoot = resolve(ROOT, 'skills');
  const expected = readFileSync(resolve(skillsRoot, policyPath), 'utf8').trim();
  for (const name of ['app-ui-layout', 'app-ui-code-sketch']) {
    const group = CAPABILITY_GROUPS.find((item) => item.name === name);
    for (const adapter of capabilityAdapters(group)) {
      const result = loadNativeMode({ skillsRoot, stack: adapter.stack, capability: name, sourceSkill: adapter.sourceSkill });
      const policy = result.documents.find((item) => item.path === policyPath);
      assert.ok(policy, `${adapter.stack}/${adapter.sourceSkill} 遗漏公共规则`);
      assert.equal(policy.content.trim(), expected);
    }
  }
});
