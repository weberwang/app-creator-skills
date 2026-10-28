/** 验证能力合并后的调用归属和单栈安装原生路由，防止可复用适配抢占主职责。 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import test from 'node:test';
import { CAPABILITY_GROUPS, capabilityAdapters, capabilityForSourceSkill, extractNativeSection } from '../scripts/capability-map.mjs';
import { routeCapabilityText } from '../scripts/migration/capability-entry-routing.mjs';
import { planInstallation, SOURCE_ROOT, STACKS } from '../scripts/install-project-skills.mjs';
import YAML from '../skills/app-skill-runtime/yaml.mjs';

/** 只扫描技能自身维护的Markdown，生成项目中的示例不作为安装依赖。 */
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}

/** 同一个原生文档可以供多个能力使用，但旧源调用只进入其主能力。 */
test('Unity UI 与动作生产的复用不会改写源能力的主入口', () => {
  const output = routeCapabilityText('$unity-game-visual-assets / $unity-game-2d-rigging', { stack: 'unity', sourcePath: 'docs/native-handoff.md' });
  assert.equal(output, '$app-asset-workflow / $app-character-rigging');
  assert.equal(capabilityForSourceSkill('unity', 'unity-game-visual-assets').name, 'app-asset-workflow');
  assert.equal(capabilityForSourceSkill('unity', 'unity-game-2d-rigging').name, 'app-character-rigging');
  for (const name of ['app-ui-layout', 'app-animation']) {
    assert.equal(capabilityAdapters(CAPABILITY_GROUPS.find((group) => group.name === name)).filter((adapter) => adapter.reused).length, 1);
  }
});

/** 只更换实际已合并的入口引用，原生脚本目录与嵌套生成模板保持原有语义。 */
test('明确技能引用改为原生文档而专业工具路径保持稳定', () => {
  const text = '[布局](../cocos-game-ui-layout/SKILL.md)\nnode ../cocos-game-ui-layout/scripts/check.mjs\nflutter-project-init/assets/flutter-dev/SKILL.md';
  const output = routeCapabilityText(text, { stack: 'cocos', sourcePath: 'docs/implementation.md' });
  assert.ok(output.includes('../cocos-game-ui-layout/ADAPTER.md'));
  assert.ok(output.includes('../cocos-game-ui-layout/scripts/check.mjs'));
  assert.ok(output.includes('flutter-project-init/assets/flutter-dev/SKILL.md'));
});

/** 每个单栈安装计划必须提供其所有选中模式，同时不带入其他栈的原生目录。 */
test('五栈分别安装时路由到已安装技术栈手册的正确章节', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'capability-plan-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  for (const stack of STACKS) {
    const plan = planInstallation({ projectRoot: project, stacks: [stack] });
    const entries = new Map(plan.entries.map((entry) => [entry.name, entry]));
    const stackEntry = entries.get(`app-stack-${stack}`);
    assert.equal(stackEntry?.kind, 'skill', `${stack} 技术规范入口必须已安装`);
    for (const group of CAPABILITY_GROUPS) {
      const adapters = capabilityAdapters(group).filter((adapter) => adapter.stack === stack);
      if (!adapters.length) continue;
      assert.equal(entries.get(group.name)?.kind, 'skill', `${stack}/${group.name} 必须可发现`);
      const file = join(SOURCE_ROOT, 'skills', group.name, 'native-adapters.json');
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      assert.equal(manifest.adapters[stack].length, adapters.length);
      for (const adapter of manifest.adapters[stack]) {
        const manual = resolve(SOURCE_ROOT, 'skills', group.name, adapter.path);
        assert.ok(manual === stackEntry.source || manual.startsWith(`${stackEntry.source}${sep}`), `${stack}/${adapter.sourceSkill} 路由必须落在已安装技术手册内`);
        assert.equal(adapter.section, capabilityAdapters(group).find((item) => item.sourceSkill === adapter.sourceSkill).section);
        assert.ok(extractNativeSection(readFileSync(manual, 'utf8'), adapter.sourceSkill).trim(), `${stack}/${adapter.sourceSkill} 章节必须存在`);
      }
      for (const workflow of manifest.sharedWorkflows.filter((item) => item.stacks.includes(stack))) {
        assert.ok(entries.has(workflow.path.split('/')[1]), `${stack} 缺少公共正文依赖 ${workflow.path}`);
      }
    }
    for (const group of CAPABILITY_GROUPS) for (const adapter of capabilityAdapters(group)) {
      if (adapter.stack !== stack) assert.ok(!entries.has(`app-stack-${adapter.stack}`), `单栈安装不应隐含 ${adapter.stack} 原生手册`);
    }
  }
});

/** 防止公共编排直接链接全部栈规范，从而让每种单栈安装都产生隐藏断链。 */
test('单栈安装中的能力说明不会引用未安装栈的文件', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'capability-markdown-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  for (const stack of STACKS) {
    const plan = planInstallation({ projectRoot: project, stacks: [stack] });
    const roots = plan.entries.map((entry) => entry.source);
    for (const entry of plan.entries.filter((item) => item.kind === 'skill')) for (const file of markdownFiles(entry.source)) {
      const prose = readFileSync(file, 'utf8').replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
      for (const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].replace(/^<|>$/g, '').split(/[?#]/)[0];
        if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(target) || /[<$]|\{\{/.test(target)) continue;
        const absolute = resolve(dirname(file), decodeURIComponent(target));
        assert.ok(roots.some((root) => absolute === root || absolute.startsWith(`${root}${sep}`)), `${stack} 单栈说明断链：${file} -> ${target}`);
      }
    }
  }
});

/** 入口合并不能把三源原有的手动图片优化任务升级成自动执行的项目阶段。 */
test('图片优化继承原有显式调用策略', () => {
  const group = CAPABILITY_GROUPS.find((item) => item.name === 'app-image-optimization');
  for (const adapter of capabilityAdapters(group)) {
    const source = YAML.parse(readFileSync(join(SOURCE_ROOT, 'migration/source-metadata', `${adapter.stack}-${adapter.sourceSkill}.yaml`), 'utf8'));
    assert.equal(source.policy.allow_implicit_invocation, false);
  }
  const merged = YAML.parse(readFileSync(join(SOURCE_ROOT, 'skills', group.name, 'agents/openai.yaml'), 'utf8'));
  assert.equal(merged.policy.allow_implicit_invocation, false);
});
