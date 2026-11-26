/** 验证原生模式按需展开公共资料，同时保留必读章节和技术栈边界。 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { formatNativeMode, loadNativeMode, parseNativeModeArgs } from '../skills/app-skill-runtime/read-native-mode.mjs';

const EXECUTION = 'app-creator-workflow/references/professional-execution.md';
const FEEDBACK = 'app-feedback/references/interaction-feedback.md';
const COPY = 'app-domain-toolkit/references/ui-copy-principles.md';
const AUDIO = 'app-domain-toolkit/references/app-audio.md';

test('默认展开直接章节和清单必读内容，保留其他直接参考路径', () => {
  const result = loadNativeMode({ stack: 'flutter', capability: 'app-feedback' });
  assert.ok(result.documents.some((document) => document.path === FEEDBACK && document.section === '资源与视觉流程分流'));
  assert.ok(result.documents.some((document) => document.path === COPY && document.section === ''));
  assert.ok(!result.documents.some((document) => document.path === EXECUTION));
  assert.ok(result.resources.some((resource) => resource.path === EXECUTION && resource.available));
  assert.ok(result.resources.some((resource) => resource.path === AUDIO && resource.available));
  const output = formatNativeMode(result);
  assert.ok(output.includes(EXECUTION));
  assert.ok(!output.includes(`- \`${FEEDBACK}#资源与视觉流程分流\``), '已展开的章节不在资源清单重复列出');
});

test('可按需选择直接参考及清单条目，合并全文和章节请求', () => {
  const result = loadNativeMode({
    stack: 'flutter', capability: 'app-feedback',
    references: [`${EXECUTION}#当前控制记录`, EXECUTION, AUDIO, `${EXECUTION}#当前控制记录`],
  });
  const execution = result.documents.filter((document) => document.path === EXECUTION);
  assert.equal(execution.length, 1);
  assert.equal(execution[0].section, '');
  assert.ok(execution[0].content.includes('## 当前控制记录'));
  assert.ok(result.documents.some((document) => document.path === AUDIO));
  assert.throws(() => loadNativeMode({ stack: 'flutter', capability: 'app-feedback', references: ['app-stack-nodejs/references/api.md'] }), /未声明公共参考/);
  assert.throws(() => loadNativeMode({ stack: 'flutter', capability: 'app-feedback', references: ['../README.md'] }), /越出技能目录/);
  assert.throws(() => loadNativeMode({ stack: 'flutter', capability: 'app-feedback', references: [`${EXECUTION}#不存在的章节`] }), /不存在|未找到/);
  assert.throws(() => loadNativeMode({ stack: 'flutter', capability: 'app-feedback', references: [`${COPY}#不存在的章节`] }), /不存在|未找到/);
});

test('命令行可多次指定参考并拒绝缺失参数', () => {
  const parsed = parseNativeModeArgs(['flutter', 'app-feedback', '--reference', `${EXECUTION}#当前控制记录`, '--reference', AUDIO, '--json']);
  assert.deepEqual(parsed.references, [`${EXECUTION}#当前控制记录`, AUDIO]);
  assert.equal(parsed.json, true);
  assert.throws(() => parseNativeModeArgs(['flutter', 'app-feedback', '--reference', '--json']), /需要公共参考路径/);
});

test('延迟加载的直接公共参考必须是文件，普通资源允许目录', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'native-mode-reference-'));
  // 测试只移除本用例新建的独立临时目录。
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'app-stack-flutter/references'), { recursive: true });
  mkdirSync(join(root, 'app-feedback/references/guide.md'), { recursive: true });
  mkdirSync(join(root, 'app-feedback/assets'), { recursive: true });
  writeFileSync(join(root, 'app-stack-flutter/profile.json'), JSON.stringify({ id: 'flutter', capabilitySkills: ['app-feedback'] }));
  writeFileSync(join(root, 'app-feedback/native-adapters.json'), JSON.stringify({
    capability: 'app-feedback',
    adapters: { flutter: [{ sourceSkill: 'flutter-feedback', section: 'mode-flutter-feedback', path: '../app-stack-flutter/references/native-contracts.md' }] },
  }));
  writeFileSync(join(root, 'app-stack-flutter/references/native-contracts.md'), [
    '<!-- native-source:flutter-feedback:start -->',
    '<a id="mode-flutter-feedback"></a>',
    '## 反馈',
    '[公共参考](../../app-feedback/references/guide.md)',
    '[素材目录](../../app-feedback/assets)',
    '<!-- native-source:flutter-feedback:end -->',
  ].join('\n'));
  const options = { stack: 'flutter', capability: 'app-feedback', skillsRoot: root };
  assert.throws(() => loadNativeMode(options), /所选模式引用的资料不存在：app-feedback\/references\/guide\.md/);
  rmdirSync(join(root, 'app-feedback/references/guide.md'));
  writeFileSync(join(root, 'app-feedback/references/guide.md'), '# 公共参考\n');
  const result = loadNativeMode(options);
  assert.ok(result.resources.some((resource) => resource.path === 'app-feedback/assets' && resource.available));
  assert.ok(!result.documents.some((document) => document.path === 'app-feedback/references/guide.md'));
});
