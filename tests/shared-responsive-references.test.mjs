/** 逐源验证响应式公共规则、原生差异和合同示例说明。 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedResponsiveReferences, adaptResponsiveReference } from '../scripts/migration/shared-responsive-references.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';
import { validateContract as validateCocos } from '../skills/cocos-game-ui-layout/scripts/validate_ui_layout_contract.mjs';
import { validateContract as validatePhaser } from '../skills/phaser4-game-ui-layout/scripts/validate_ui_layout_contract.mjs';
import { validateContract as validateThree } from '../skills/threejs-game-ui-layout/scripts/validate_ui_layout_contract.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const SKILLS = Object.freeze({ cocos: 'cocos-game-qa-performance', phaser: 'phaser4-game-qa-performance', threejs: 'threejs-game-qa-performance' });
const DETAILS = Object.freeze({
  cocos: { strategy: 'Creator 固定宽/固定高/项目 `custom`', hook: '__COCOS_VISUAL_VALIDATION__', schema: '1.2.0', template: 'ordinary-ui-layout-contract-template.yaml' },
  phaser: { strategy: 'FIT/RESIZE/COVER', hook: '__PHASER_VISUAL_VALIDATION__', schema: '1.2.0', template: 'ui-layout-contract-template.yaml' },
  threejs: { strategy: '项目自定义 `custom`', hook: '__THREEJS_VISUAL_VALIDATION__', schema: '1.3.0', template: 'ui-layout-contract-template.yaml' },
});
const UI_SKILLS = Object.freeze({ cocos: 'cocos-game-ui-layout', phaser: 'phaser4-game-ui-layout', threejs: 'threejs-game-ui-layout' });

/** 判断三份只读源材料是否在同一父目录下可用。 */
function sourceFilesAvailable() {
  return Object.entries(SKILLS).every(([stack, skill]) => existsSync(resolve(SOURCE_ROOT, `${stack}-skills`, 'skills', skill, 'references/responsive-visual-validation.md')));
}

/** 读取一份原始正文；用于比较每个未抽出的实际源块。 */
function sourceText(stack) {
  return readFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, 'skills', SKILLS[stack], 'references/responsive-visual-validation.md'), 'utf8');
}

test('三栈完整共享测量、假通过和根因规则，并保留逐源摘要', (t) => {
  if (!sourceFilesAvailable()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedResponsiveReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.equal(plan.documents.length, 1);
  const document = plan.documents[0];
  assert.equal(document.path, 'skills/app-domain-toolkit/references/responsive-visual-validation.md');
  for (const token of ['viewportRect', 'canvasRect', 'rootCause.primary/secondary', 'matrix.status', 'DISPLAY_LAYER', 'DPR', 'unverified', '当前技术栈校验器接受的完整 UI 合同']) {
    assert.ok(document.content.includes(token), `公共正文缺少完整规则：${token}`);
  }
  assert.match(document.content, /用户对显示效果的人工验收/);
  assert.match(document.content, /脚本接受当前技术栈校验器认可的完整 UI 布局合同 JSON 文件或内联 JSON/);
  assert.match(document.content, /仅示意部分测量字段，缺少必需根字段，不是完整合同，不能直接用于正式校验/);
  assert.doesNotMatch(document.content, /原始 schema 1\.1\.0 UI 合同/);
  for (const stack of Object.keys(SKILLS)) {
    const source = document.sources.find((item) => item.stack === stack);
    assert.ok(source, `${stack} 必须保留逐源账本`);
    const original = sourceText(stack);
    const replacements = plan.replacements.filter((item) => item.stack === stack && item.sourcePath === source.sourcePath);
    const keys = new Set(replacements.map((item) => `${item.sourceRange.start}:${item.sourceRange.end}`));
    const intro = readWorkflowBlocks(original).find((block) => block.sourceHeading === '契约输入' && block.original.includes('建议使用下列最小结构'));
    assert.ok(intro && keys.has(`${intro.sourceRange.start}:${intro.sourceRange.end}`), `${stack} 合同引言没有共享`);
    const introReplacement = replacements.find((item) => item.sourceRange.start === intro.sourceRange.start);
    assert.ok(introReplacement.nativeSupplement.includes(DETAILS[stack].template), `${stack} 缺少原生模板补充`);
    for (const heading of ['每视口证据字段', '假通过禁令与证据要求', '根因分类']) {
      const blocks = readWorkflowBlocks(original).filter((block) => block.sourceHeading === heading);
      assert.ok(blocks.length > 0, `${stack} 缺少源章节 ${heading}`);
      for (const block of blocks) assert.ok(keys.has(`${block.sourceRange.start}:${block.sourceRange.end}`), `${stack}/${heading} 的完整块没有共享`);
    }
    const orientation = readWorkflowBlocks(original).find((block) => block.sourceHeading === '契约输入' && block.original.includes('示例声明双方向'));
    assert.ok(orientation, `${stack} 缺少方向策略源块`);
    assert.ok(keys.has(`${orientation.sourceRange.start}:${orientation.sourceRange.end}`), `${stack} 方向策略没有共享`);
    const orientationSection = source.sections.find((section) => section.sourceRange.start === orientation.sourceRange.start && section.sourceRange.end === orientation.sourceRange.end);
    assert.ok(orientationSection && document.content.includes(orientationSection.canonical), `${stack} 方向策略没有完整保留`);
    for (const section of source.sections) {
      assert.equal(referenceBlockHash(original.slice(section.sourceRange.start, section.sourceRange.end)), section.sourceHash);
      assert.ok(document.content.includes(section.canonical), `${stack} 公共正文缺少源块`);
      assert.equal(referenceBlockHash(section.canonical), section.canonicalHash);
    }
    const destination = `skills/${SKILLS[stack]}/references/responsive-visual-validation.md`;
    const applied = applySharedWorkflowSections(original, { stack, sourcePath: source.sourcePath, destination, repositoryRoot: ROOT, plan });
    for (const block of readWorkflowBlocks(original)) {
      if (!keys.has(`${block.sourceRange.start}:${block.sourceRange.end}`)) assert.ok(applied.text.includes(block.original), `${stack} 未抽取的原生块被改动：${block.sourceHeading}`);
    }
    assert.ok(applied.sharedReferences.length > 0);
    const corrected = adaptResponsiveReference(applied.text, { stack });
    assert.doesNotMatch(corrected, /示例声明双方向/);
    assert.ok(corrected.includes(DETAILS[stack].strategy));
    assert.ok(corrected.includes(DETAILS[stack].hook));
    assert.ok(corrected.includes(`"schema_version": "${DETAILS[stack].schema}"`));
    assert.ok(corrected.includes(DETAILS[stack].template));
    assert.doesNotMatch(corrected, /脚本接受当前技术栈校验器认可的完整 UI 布局合同|仅示意部分测量字段，缺少必需根字段/);
    assert.doesNotMatch(corrected, /原始 schema 1\.1\.0 UI 合同/);
    assert.doesNotMatch(corrected, /建议使用下列最小结构/);
    if (stack === 'cocos') {
      assert.match(corrected, /schema 2\.0\.0/);
      assert.match(corrected, /--project-root/);
      assert.match(corrected, /实际项目策略与场景引用文件/);
    }
    if (stack === 'threejs') for (const token of ['layoutRuntime', 'runtime_batch', 'component_snapshots']) assert.ok(corrected.includes(token));
  }
});

test('修正后的普通 UI 模板能被各栈真实合同校验器接受', () => {
  for (const [stack, validate] of Object.entries({ cocos: validateCocos, phaser: validatePhaser, threejs: validateThree })) {
    const path = resolve(ROOT, 'skills', UI_SKILLS[stack], 'assets', DETAILS[stack].template);
    const document = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(document.schema_version, DETAILS[stack].schema);
    const result = validate(document);
    assert.equal(result.status, 'passed', `${stack} 模板校验：${result.errors.join('；')}`);
  }
});

test('任一栈来源缺失、源字节漂移或示例锚点变化均拒绝', (t) => {
  if (!sourceFilesAvailable()) return t.skip('需要三个只读源仓库');
  const root = mkdtempSync(resolve(tmpdir(), 'responsive-reference-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [stack, skill] of Object.entries(SKILLS)) {
    const destination = resolve(root, `${stack}-skills`, 'skills', skill, 'references/responsive-visual-validation.md');
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, 'skills', skill, 'references/responsive-visual-validation.md'), destination);
  }
  buildSharedResponsiveReferences({ sourceRoot: root, repositoryRoot: ROOT });
  const changed = resolve(root, 'phaser-skills/skills/phaser4-game-qa-performance/references/responsive-visual-validation.md');
  writeFileSync(changed, `${readFileSync(changed, 'utf8')}\n漂移`);
  assert.throws(() => buildSharedResponsiveReferences({ sourceRoot: root, repositoryRoot: ROOT }), /已变化/);
  rmSync(changed);
  assert.throws(() => buildSharedResponsiveReferences({ sourceRoot: root, repositoryRoot: ROOT }), /不可读取/);
  assert.throws(() => adaptResponsiveReference('无原始示例', { stack: 'cocos' }), /示例说明/);
});
