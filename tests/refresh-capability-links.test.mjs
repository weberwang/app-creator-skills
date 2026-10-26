import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { refreshCapabilityLinks } from '../scripts/refresh-capability-links.mjs';

/** 在临时仓库写入最小测试文件，避免索引刷新触碰真实维护文档。 */
function writeFixture(root, relativePath, content) {
  const target = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

/** 用手册锚点和共享章节构造可验证的 ADAPTER 重定向目录。 */
function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'refresh-capability-links-'));
  const manual = 'skills/app-stack-flutter/references/native-contracts.md';
  const section = (sourceSkill, mode, body) => `<!-- native-source:${sourceSkill}:start -->\n<a id="${mode}"></a>\n\n${body}\n<!-- native-source:${sourceSkill}:end -->`;
  const manualText = [
    '# Flutter Native Contracts',
    section('adaptive-layout-implementation', 'mode-adaptive-layout-implementation', '<a id="mode-adaptive-layout-implementation--adaptive-layout"></a>\n### Adaptive Layout\n<a id="mode-adaptive-layout-implementation--limits"></a>\n#### Limits'),
    section('flutter-project-init', 'mode-flutter-project-init', '<a id="mode-flutter-project-init--project-init"></a>\n### Project Init'),
    section('flutter-feedback', 'mode-flutter-feedback', '<a id="mode-flutter-feedback--feedback"></a>\n### Feedback'),
  ].join('\n\n');
  writeFixture(root, manual, manualText);
  writeFixture(root, 'skills/app-domain-toolkit/references/ui-layout.md', '# UI Layout\n\n## Layout Workflow\n');
  writeFixture(root, 'skills/app-stack-flutter/references/domain-validation.md', [
    '[layout](../../adaptive-layout-implementation/ADAPTER.md)',
    '[project init](../../flutter-project-init/ADAPTER.md)',
  ].join('\n'));
  writeFixture(root, 'docs/shared-feedback-verification.md', [
    '[feedback](../skills/flutter-feedback/ADAPTER.md)',
    '[future skill reference](../skills/adaptive-layout-implementation/SKILL.md#Limits)',
    '[extracted heading](../skills/adaptive-layout-implementation/ADAPTER.md#Process)',
    '[local](#local-anchor)',
  ].join('\n'));
  writeFixture(root, 'skills/app-stack-flutter/references/source-provenance.md', [
    '来源：`flutter-project-init/ADAPTER.md`。',
    '项目指导：`.agents/skills/adaptive-layout-implementation/SKILL.md`。',
    '```bash',
    '[code sample](../skills/adaptive-layout-implementation/ADAPTER.md)',
    'load `.agents/skills/adaptive-layout-implementation/SKILL.md`',
    '```',
    '    [indented sample](../skills/adaptive-layout-implementation/ADAPTER.md)',
  ].join('\n'));
  writeFixture(root, 'migration/catalog.json', `${JSON.stringify({
    stacks: {
      flutter: {
        nativeAdapters: [
          { sourceSkill: 'adaptive-layout-implementation', path: manual, section: 'mode-adaptive-layout-implementation' },
          { sourceSkill: 'flutter-project-init', path: manual, section: 'mode-flutter-project-init' },
        ],
        authoredAdapters: [
          { sourceSkill: 'flutter-feedback', path: manual, section: 'mode-flutter-feedback' },
        ],
      },
    },
    sharedCapabilities: [{
      implementation: 'skills/app-domain-toolkit/references/ui-layout.md',
      sources: [{
        stack: 'flutter',
        sourcePath: 'skills/adaptive-layout-implementation/SKILL.md',
        sections: [{ sourceHeading: 'Process', heading: 'Layout Workflow' }],
      }],
    }],
    generatedFiles: [],
  }, null, 2)}\n`);
  return root;
}

/** 验证旧适配链接、来源片段及已抽取公共标题都能落到真实目标。 */
test('索引刷新将维护文档中的旧适配链接定位到手册或公共章节', (t) => {
  const root = createFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const changed = refreshCapabilityLinks({ root });
  assert.ok(changed.includes('skills/app-stack-flutter/references/domain-validation.md'));
  assert.ok(changed.includes('docs/shared-feedback-verification.md'));
  const domain = readFileSync(path.join(root, 'skills/app-stack-flutter/references/domain-validation.md'), 'utf8');
  assert.match(domain, /\[layout\]\(native-contracts\.md#mode-adaptive-layout-implementation\)/);
  assert.match(domain, /\[project init\]\(native-contracts\.md#mode-flutter-project-init\)/);
  const docs = readFileSync(path.join(root, 'docs/shared-feedback-verification.md'), 'utf8');
  assert.match(docs, /\[feedback\]\(\.\.\/skills\/app-stack-flutter\/references\/native-contracts\.md#mode-flutter-feedback\)/);
  assert.match(docs, /native-contracts\.md#mode-adaptive-layout-implementation--limits/);
  assert.match(docs, /\.\.\/skills\/app-domain-toolkit\/references\/ui-layout\.md#layout-workflow/);
  assert.match(docs, /\[local\]\(#local-anchor\)/);
  const provenance = readFileSync(path.join(root, 'skills/app-stack-flutter/references/source-provenance.md'), 'utf8');
  assert.ok(provenance.includes('来源：`skills/app-stack-flutter/references/native-contracts.md#mode-flutter-project-init`。'));
  assert.ok(provenance.includes('项目指导：`.agents/skills/app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation`。'));
  assert.match(provenance, /load `\.agents\/skills\/adaptive-layout-implementation\/SKILL\.md`/);
  assert.match(provenance, /\[code sample\]\(\.\.\/skills\/adaptive-layout-implementation\/ADAPTER\.md\)/);
  assert.match(provenance, /    \[indented sample\]\(\.\.\/skills\/adaptive-layout-implementation\/ADAPTER\.md\)/);
});
