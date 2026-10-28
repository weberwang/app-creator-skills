import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadNativeMode, formatNativeMode, parseNativeModeArgs } from '../skills/app-skill-runtime/read-native-mode.mjs';
import { installSkills, SOURCE_ROOT } from '../scripts/install-project-skills.mjs';
import { CAPABILITY_GROUPS, capabilityAdapters } from '../scripts/capability-map.mjs';

/** 只向当前用例的独占临时目录写入技能夹具。 */
function write(root, path, value) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  return file;
}

/** 用两个模式、两个公共章节和一个递归引用测试最小加载边界。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'native-mode-reader-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skillsRoot = join(root, 'skills');
  const manualPath = 'app-stack-flutter/references/native-contracts.md';
  const body = (name, text) => `<!-- native-source:${name}:start -->\n<a id="mode-${name}"></a>\n### ${name}\n\n${text}\n<!-- native-source:${name}:end -->`;
  const manual = [
    '# Flutter',
    body('flutter-feedback', 'SELECTED_NATIVE_RULE\n\n[共用规则](../../app-creator-workflow/references/common.md#selected)\n[原生资源](../../flutter-unit/references/native.md)\n[其他模式](#mode-flutter-second)\n[外部插件](plugin://fixture)\n'),
    body('flutter-second', 'UNSELECTED_NATIVE_RULE'),
  ].join('\n\n');
  const manifest = {
    capability: 'app-feedback', adapters: { flutter: [{ sourceSkill: 'flutter-feedback', mode: 'Flutter反馈', section: 'mode-flutter-feedback', path: '../app-stack-flutter/references/native-contracts.md' }] },
    sharedWorkflows: [{ id: 'foreign', path: '../app-stack-unity/references/absent.md', stacks: ['unity'] }],
  };
  write(skillsRoot, manualPath, manual);
  write(skillsRoot, 'app-stack-flutter/profile.json', { id: 'flutter', capabilitySkills: ['app-feedback'], resourceDirectories: ['flutter-unit'] });
  write(skillsRoot, 'app-feedback/native-adapters.json', manifest);
  write(skillsRoot, 'app-creator-workflow/references/common.md', '# Common\n\n## Selected\n\nSELECTED_PUBLIC_RULE\n\n[下级参考](next.md)\n\n## Unselected\n\nUNSELECTED_PUBLIC_RULE\n');
  write(skillsRoot, 'app-creator-workflow/references/next.md', '# Next\nTRANSITIVE_RULE_MUST_NOT_LOAD\n');
  write(skillsRoot, 'flutter-unit/references/native.md', '# Native Resource\nNATIVE_RESOURCE_MUST_NOT_LOAD\n');
  return { root, skillsRoot, manualPath, manifest, options: { skillsRoot, stack: 'flutter', capability: 'app-feedback' } };
}

test('只返回所选模式与直接公共片段，资源和其他模式按需列出', (t) => {
  const context = fixture(t);
  const result = loadNativeMode(context.options);
  const rendered = formatNativeMode(result);
  assert.equal(result.documents.length, 2);
  assert.equal(result.documents[0].sourceSkill, 'flutter-feedback');
  assert.match(rendered, /SELECTED_NATIVE_RULE/);
  assert.match(rendered, /SELECTED_PUBLIC_RULE/);
  assert.doesNotMatch(rendered, /UNSELECTED_NATIVE_RULE|UNSELECTED_PUBLIC_RULE|TRANSITIVE_RULE_MUST_NOT_LOAD|NATIVE_RESOURCE_MUST_NOT_LOAD/);
  assert.ok(result.resources.some((resource) => resource.path === 'flutter-unit/references/native.md' && resource.available));
  assert.ok(result.resources.some((resource) => resource.path.endsWith('next.md') && resource.available));
  assert.ok(result.resources.some((resource) => resource.kind === 'native-mode' && resource.fragment === 'mode-flutter-second'));
  assert.ok(result.stats.nativeCharacters < result.stats.manualCharacters);
  assert.equal(result.stats.omittedNativeCharacters, result.stats.manualCharacters - result.stats.nativeCharacters);
});

test('按需公共参考保留可达路径，不自动展开整类资料', (t) => {
  const context = fixture(t);
  context.manifest.sharedWorkflows.push({ id: 'large-reference', path: '../app-domain-toolkit/references/large.md', stacks: ['flutter'], onDemand: true });
  write(context.skillsRoot, 'app-domain-toolkit/references/large.md', '# 分类参考\nON_DEMAND_MUST_NOT_LOAD\n');
  write(context.skillsRoot, 'app-feedback/native-adapters.json', context.manifest);
  const result = loadNativeMode(context.options);
  assert.doesNotMatch(formatNativeMode(result), /ON_DEMAND_MUST_NOT_LOAD/);
  assert.ok(result.resources.some((entry) => entry.path === 'app-domain-toolkit/references/large.md' && entry.available));
  context.manifest.sharedWorkflows[1].path = '../app-domain-toolkit/references/absent.md';
  write(context.skillsRoot, 'app-feedback/native-adapters.json', context.manifest);
  assert.throws(() => loadNativeMode(context.options), /按需公共参考不存在/);
});

test('多模式必须明确选择，未知栈、能力和模式不自动回退', (t) => {
  const context = fixture(t);
  context.manifest.adapters.flutter.push({ ...context.manifest.adapters.flutter[0], sourceSkill: 'flutter-second', section: 'mode-flutter-second' });
  write(context.skillsRoot, 'app-feedback/native-adapters.json', context.manifest);
  assert.throws(() => loadNativeMode(context.options), /请明确选择.*flutter-feedback, flutter-second/);
  const result = loadNativeMode({ ...context.options, sourceSkill: 'flutter-second' });
  assert.equal(result.documents.length, 1);
  assert.match(result.documents[0].content, /UNSELECTED_NATIVE_RULE/);
  assert.throws(() => loadNativeMode({ ...context.options, sourceSkill: 'missing' }), /请明确选择/);
  assert.throws(() => loadNativeMode({ ...context.options, stack: '../unity' }), /无效技术栈/);
  assert.throws(() => loadNativeMode({ ...context.options, capability: '../secrets' }), /有效公共能力/);
  assert.throws(() => loadNativeMode({ ...context.options, capability: 'app-audio' }), /未声明该能力/);
});

test('公共依赖缺失片段或文件时明确失败，不以空白规范替代', (t) => {
  const context = fixture(t);
  write(context.skillsRoot, 'app-creator-workflow/references/common.md', '# Common\n\n## Other\nNOT_SELECTED\n');
  assert.throws(() => loadNativeMode(context.options), /片段|章节|锚点/);
  rmSync(join(context.skillsRoot, 'flutter-unit/references/native.md'));
  assert.throws(() => loadNativeMode(context.options), /资料不存在/);
});

test('清单不能越界或读取其他技术栈手册', (t) => {
  const context = fixture(t);
  context.manifest.adapters.flutter[0].path = '../../secret.md';
  write(context.root, 'secret.md', 'PRIVATE_SECRET');
  write(context.skillsRoot, 'app-feedback/native-adapters.json', context.manifest);
  assert.throws(() => loadNativeMode(context.options), /越出技能目录/);
  context.manifest.adapters.flutter[0].path = '../app-stack-unity/references/native-contracts.md';
  write(context.skillsRoot, 'app-feedback/native-adapters.json', context.manifest);
  // 其他栈手册即便不存在，也应在尝试读取前被归属检查拒绝。
  assert.throws(() => loadNativeMode(context.options), /当前技术栈/);
});

test('公共工作流先校验适用栈与目录，正文样例和注释不制造依赖', (t) => {
  const context = fixture(t);
  const file = join(context.skillsRoot, context.manualPath);
  const manual = '<!-- native-source:flutter-feedback:start -->\n<a id="mode-flutter-feedback"></a>\n### Feedback\n\n<!-- [comment](../../flutter-unit/missing.md) -->\n`[inline example](../../flutter-unit/missing.md)`\n```md\n[code example](../../flutter-unit/missing.md)\n```\n<!-- native-source:flutter-feedback:end -->';
  writeFileSync(file, manual);
  assert.equal(loadNativeMode(context.options).documents.length, 1);
  context.manifest.sharedWorkflows[0].stacks = ['flutter'];
  write(context.skillsRoot, 'app-feedback/native-adapters.json', context.manifest);
  assert.throws(() => loadNativeMode(context.options), /公共工作流路径无效/);
});

test('围栏中的语言标记不能提前结束代码块或吞掉后面的真实依赖', (t) => {
  const context = fixture(t);
  write(context.skillsRoot, context.manualPath, [
    '<!-- native-source:flutter-feedback:start -->',
    '<a id="mode-flutter-feedback"></a>',
    '### Feedback',
    '~~~text',
    '~~~html',
    '[fake](../../flutter-unit/missing.md)',
    '~~~',
    '[real](../../app-creator-workflow/references/common.md#selected)',
    '<!-- native-source:flutter-feedback:end -->',
  ].join('\n'));
  const result = loadNativeMode(context.options);
  assert.equal(result.documents.length, 2);
  assert.match(result.documents[1].content, /SELECTED_PUBLIC_RULE/);
  assert.ok(!result.resources.some((resource) => resource.path.endsWith('missing.md')));
});

test('Junction不能把所选原生资源指向技能目录之外', (t) => {
  const context = fixture(t);
  const directory = join(context.skillsRoot, 'flutter-unit/references');
  const external = join(context.root, 'external');
  mkdirSync(external);
  write(external, 'native.md', 'PRIVATE_EXTERNAL');
  rmSync(directory, { recursive: true, force: true });
  symlinkSync(external, directory, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => loadNativeMode(context.options), /不能包含链接/);
});

test('所有82条实际路由均能单模式读取，复用不引入额外原生正文', () => {
  const skillsRoot = join(SOURCE_ROOT, 'skills');
  let count = 0;
  for (const group of CAPABILITY_GROUPS) for (const route of capabilityAdapters(group)) {
    const result = loadNativeMode({ skillsRoot, stack: route.stack, capability: group.name, sourceSkill: route.sourceSkill });
    assert.equal(result.documents.filter((document) => document.kind === 'native').length, 1);
    assert.equal(result.sourceSkill, route.sourceSkill);
    assert.equal(result.documents[0].path, `app-stack-${route.stack}/references/native-contracts.md`);
    assert.ok(result.stats.omittedNativeCharacters > 0);
    for (const resource of result.resources.filter((item) => item.available)) {
      const nativeStack = /^app-stack-([^/]+)\//.exec(resource.path)?.[1];
      if (nativeStack) assert.equal(nativeStack, route.stack);
    }
    count += 1;
  }
  assert.equal(count, 82);
});

test('实际安装后的读取CLI不依赖仓库scripts、迁移账本或第三方npm包', (t) => {
  const project = mkdtempSync(join(tmpdir(), 'native-mode-installed-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  installSkills({ projectRoot: project, stacks: ['flutter'] });
  const entry = join(project, '.agents/skills/app-skill-runtime/read-native-mode.mjs');
  const cli = spawnSync(process.execPath, [entry, 'flutter', 'app-feedback', '--json'], { cwd: tmpdir(), encoding: 'utf8', windowsHide: true });
  assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(result.sourceSkill, 'flutter-feedback');
  assert.ok(result.documents.some((document) => document.path === 'app-feedback/references/interaction-feedback.md'));
  assert.ok(!existsSync(join(project, 'scripts')));
  assert.ok(!existsSync(join(project, '.agents/skills/app-skill-runtime/node_modules')));
  const ambiguous = spawnSync(process.execPath, [entry, 'flutter', 'app-quality-review'], { cwd: project, encoding: 'utf8', windowsHide: true });
  assert.notEqual(ambiguous.status, 0);
  assert.match(ambiguous.stderr, /flutter-quality-review, flutter-ux-ui-quality/);
});

test('CLI位置参数保持简短，拒绝多余位置参数和未知选项', () => {
  assert.deepEqual(parseNativeModeArgs(['unity', 'app-animation', 'unity-game-3d-animation', '--json']), { stack: 'unity', capability: 'app-animation', sourceSkill: 'unity-game-3d-animation', json: true, help: false });
  assert.equal(parseNativeModeArgs(['--help']).help, true);
  assert.throws(() => parseNativeModeArgs(['flutter']), /用法/);
  assert.throws(() => parseNativeModeArgs(['flutter', 'app-feedback', '--execute']), /未知参数/);
});
