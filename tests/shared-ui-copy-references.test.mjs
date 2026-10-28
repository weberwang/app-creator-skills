/** 验证三栈游戏文案逐段汇合，且原生组件、锚点和人工验收边界不丢失。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedUiCopyReferences } from '../scripts/migration/shared-ui-copy-references.mjs';
import { readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const STACKS = Object.freeze({
  cocos: { name: 'cocos-game-ui-layout', renderer: 'Creator `Label`/`RichText`' },
  phaser: { name: 'phaser4-game-ui-layout', renderer: '`Phaser.Text`' },
  threejs: { name: 'threejs-game-ui-layout', renderer: 'DOM/CSS2D 文本或项目自建文字渲染' },
});

/** 源仓库是只读测试输入；缺失时显式跳过，不伪造三栈来源。 */
function requireSources(t) {
  if (!existsSync(join(SOURCE_ROOT, 'unity-skills/unity-development-workflow/references/game-copy.md'))
    || Object.entries(STACKS).some(([stack, spec]) => !existsSync(join(SOURCE_ROOT, `${stack}-skills`, 'skills', spec.name, 'references', 'game-copy.md')))) {
    t.skip('需要 Unity、Cocos、Phaser 和 Three.js 四个只读源仓库');
    return false;
  }
  return true;
}

/** 验证源正文每个规则块都有对应账本和公共全文，而不是仅保留摘要或概述。 */
test('四栈共享已审阅文案，Unity 与 Web 专业差异完整交付', (t) => {
  if (!requireSources(t)) return;
  const plan = buildSharedUiCopyReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.equal(plan.documents.length, 1);
  const document = plan.documents[0];
  assert.equal(document.capabilityId, 'ui-game-copy');
  for (const keyword of ['内部规格', '玩家可见表达', 'text_decomposition', 'node_presentations', 'longest_copy', '不得自动分析截图', '只绘制本次明确列出的可见文字和示例数值']) {
    assert.ok(document.content.includes(keyword), `公共正文缺少 ${keyword}`);
  }
  for (const [stack, spec] of Object.entries(STACKS)) {
    const sourcePath = `skills/${spec.name}/references/game-copy.md`;
    const source = readFileSync(join(SOURCE_ROOT, `${stack}-skills`, ...sourcePath.split('/')), 'utf8');
    const blocks = readWorkflowBlocks(source);
    const replacements = plan.replacements.filter((item) => item.stack === stack && item.sourcePath === sourcePath);
    assert.equal(replacements.length, blocks.length, `${stack} 必须逐段登记完整来源`);
    for (const block of blocks) {
      const matching = replacements.filter((item) => item.sourceRange.start === block.sourceRange.start && item.sourceRange.end === block.sourceRange.end);
      assert.equal(matching.length, 1, `${stack}/${block.sourceHeading} 源字符必须恰好登记一次`);
      assert.equal(matching[0].original, block.original);
      assert.ok(document.content.includes(matching[0].canonical), `${stack}/${block.sourceHeading} 公共规则缺失`);
    }
    const result = applySharedWorkflowSections(source, { stack, sourcePath, destination: sourcePath, repositoryRoot: ROOT, plan });
    for (const heading of ['表达选择', '工作流接入', '效果图生成', '资源拆解与界面实现', '检查与返修']) {
      assert.match(result.text, new RegExp(`^#{2,3} ${heading}$`, 'm'), `${stack} 必须保留原锚点`);
      assert.ok(document.content.includes(`## ${heading}`), `${stack} 公共标题缺失`);
    }
    assert.ok(result.text.includes(`本栈运行时文字组件：${spec.renderer}。`), `${stack} 组件差异缺失`);
    assert.equal((result.text.match(/本栈运行时文字组件：/g) ?? []).length, 1);
    assert.ok(result.text.includes('app-domain-toolkit/references/ui-game-copy.md#资源拆解与界面实现'));
  }
  const unityPath = 'unity-development-workflow/references/game-copy.md';
  const unity = readFileSync(join(SOURCE_ROOT, 'unity-skills', unityPath), 'utf8');
  const migrated = applySharedWorkflowSections(unity, { stack: 'unity', sourcePath: unityPath, destination: `skills/${unityPath}`, repositoryRoot: ROOT, plan });
  assert.ok(document.sources.some((source) => source.stack === 'unity'));
  for (const phrase of ['uGUI/TextMeshPro', 'UI Toolkit', 'String Tables', '`zh-CN`', '英语 `en`', '其他语言', '无障碍', '`4.2s`', '当前余额', '**V3 组合**', '**V4 运行**']) {
    assert.ok(migrated.text.includes(phrase), `Unity 专业差异缺失：${phrase}`);
  }
  for (const source of document.sources.find((entry) => entry.stack === 'unity').sections) {
    assert.ok(document.content.includes(source.canonical), 'Unity 公共规则必须包含完整段落');
    assert.ok(!migrated.text.includes(source.original), '共同规则不能继续在 Unity 内重复维护');
  }
  assert.match(document.content, /适用技术栈：cocos、phaser、threejs、unity/);
  assert.match(document.content, /适用技术栈：cocos、phaser、threejs。\n\nV5 正式界面消费 V3/);
});

/** 同一字面改动即触发重新审查，避免未来把技术栈差异静默归一化。 */
test('源正文缺失、任一来源漂移或渲染组件变化都拒绝合并', (t) => {
  if (!requireSources(t)) return;
  const sandbox = mkdtempSync(join(tmpdir(), 'shared-ui-copy-'));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const roots = {};
  for (const [stack, spec] of Object.entries(STACKS)) {
    roots[stack] = join(sandbox, `${stack}-skills`);
    const relative = `skills/${spec.name}/references/game-copy.md`;
    const target = join(roots[stack], ...relative.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(SOURCE_ROOT, `${stack}-skills`, ...relative.split('/'))));
  }
  roots.unity = join(sandbox, 'unity-skills');
  const unityPath = 'unity-development-workflow/references/game-copy.md';
  mkdirSync(dirname(join(roots.unity, unityPath)), { recursive: true });
  writeFileSync(join(roots.unity, unityPath), readFileSync(join(SOURCE_ROOT, 'unity-skills', unityPath)));
  assert.equal(buildSharedUiCopyReferences({ sourceRoot: roots, repositoryRoot: ROOT }).documents.length, 1);
  const target = join(roots.phaser, 'skills', STACKS.phaser.name, 'references/game-copy.md');
  const original = readFileSync(target, 'utf8');
  writeFileSync(target, original.replace('Phaser.Text', 'Phaser.Image'));
  assert.throws(() => buildSharedUiCopyReferences({ sourceRoot: roots, repositoryRoot: ROOT }), /正文已变化/);
  writeFileSync(target, original.replace('不得自动分析截图', '自动分析截图'));
  assert.throws(() => buildSharedUiCopyReferences({ sourceRoot: roots, repositoryRoot: ROOT }), /正文已变化/);
  writeFileSync(target, original);
  const unityTarget = join(roots.unity, unityPath);
  const unityOriginal = readFileSync(unityTarget, 'utf8');
  writeFileSync(unityTarget, unityOriginal.replace('不得自动分析截图', '自动分析截图'));
  assert.throws(() => buildSharedUiCopyReferences({ sourceRoot: roots, repositoryRoot: ROOT }), /unity 文案源正文已变化/);
  writeFileSync(unityTarget, unityOriginal);
  rmSync(target);
  assert.throws(() => buildSharedUiCopyReferences({ sourceRoot: roots, repositoryRoot: ROOT }), /ENOENT/);
  assert.throws(() => buildSharedUiCopyReferences({ sourceRoot: { cocos: roots.cocos } }), /缺少 phaser/);
});
