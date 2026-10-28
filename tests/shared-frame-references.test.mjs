/** 验证帧动画公共正文可追溯，未合并的本栈规则和链接仍完整保留。 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedFrameReferences } from '../scripts/migration/shared-frame-references.mjs';
import { referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { canonicalWorkflowBlock, readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { adaptOptionalReviewDocument } from '../scripts/migration/optional-review-documents.mjs';
import { unifySourceVisualStages } from '../scripts/migration/unified-stage-text.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const SKILLS = Object.freeze({ cocos: 'cocos-frame-animation', phaser: 'phaser4-frame-animation', threejs: 'threejs-frame-animation' });

/** 源仓库不可用时明确跳过真实来源测试，避免伪造迁移证据。 */
function hasSources() {
  return Object.entries(SKILLS).every(([stack, skill]) => existsSync(resolve(SOURCE_ROOT, `${stack}-skills`, 'skills', skill, 'references')));
}

/** 在已迁移的栈目录上应用共享计划，结果仅存在测试内存。 */
function applyReference(plan, stack, sourcePath, text) {
  const file = sourcePath.split('/').at(-1);
  return applySharedWorkflowSections(text, { stack, sourcePath, destination: `skills/${stack}-domain-contracts/resources/frame-animation/references/${file}`, repositoryRoot: ROOT, plan }).text;
}

test('十类帧动画参考逐源抽取完整规则，保留未抽取正文、原锚点与本栈链接', (t) => {
  if (!hasSources()) return t.skip('需要三个只读帧动画源仓库');
  const plan = buildSharedFrameReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.equal(plan.documents.length, 10);
  assert.ok(plan.replacements.length >= 600, '公共正文不能退化为概述或少量示例');
  for (const name of ['character-animation', 'object-animation', 'ui-frame-animation']) {
    const document = plan.documents.find((item) => item.capabilityId === `frame-reference-${name}`);
    assert.ok(document?.sources.some((source) => source.stack === 'cocos'));
    assert.ok(document?.sources.some((source) => source.stack === 'phaser'));
  }
  const checked = new Set();
  for (const document of plan.documents) for (const source of document.sources) {
    const sourceFile = resolve(SOURCE_ROOT, `${source.stack}-skills`, ...source.sourcePath.split('/'));
    const text = readFileSync(sourceFile, 'utf8');
    const transformed = applyReference(plan, source.stack, source.sourcePath, text);
    const matches = plan.replacements.filter((item) => item.stack === source.stack && item.sourcePath === source.sourcePath);
    checked.add(`${source.stack}:${source.sourcePath}`);
    for (const item of matches) {
      assert.equal(text.slice(item.sourceRange.start, item.sourceRange.end), item.original, `${source.stack}/${item.sourcePath} 源区间`);
      assert.equal(referenceBlockHash(item.original), item.sourceHash);
      assert.equal(referenceBlockHash(item.canonical), item.canonicalHash);
      const normalized = canonicalWorkflowBlock(item.original, { routeScripts: false }).canonical.trim().replaceAll('\r\n', '\n');
      const number = item.original.match(/^(\d+[.)]\s+)/)?.[1] ?? '';
      // 仅允许经审计的按需预览文案变更，其余内容与有序步骤仍需严格保持。
      const expected = unifySourceVisualStages(adaptOptionalReviewDocument(number + normalized, { sourcePath: source.sourcePath, destination: document.path }).text);
      assert.equal(expected, item.canonical, '不能通过抹去步骤编号或技术栈语义制造等价');
      assert.ok(document.content.includes(item.canonical), '公共正文不能遗漏已抽取规则');
      for (const link of item.referenceLinks ?? []) assert.ok(transformed.includes(`[${link.label}](${link.target})`), `保留本栈资料链接 ${link.target}`);
    }
    for (const block of readWorkflowBlocks(text)) {
      if (!matches.some((item) => item.sourceRange.start === block.sourceRange.start && item.sourceRange.end === block.sourceRange.end)) {
        assert.ok(transformed.includes(block.original.trim()), `${source.stack}/${source.sourcePath} 未抽取的原生正文丢失`);
      }
    }
    for (const heading of text.match(/^#{1,6}\s+[^\r\n]+/gm) ?? []) assert.ok(transformed.includes(heading), `${source.sourcePath} 的原有锚点应保留`);
  }
  assert.equal(checked.size, 29, '三个技术栈的 29 份参考均须逐项进入审查');
});

test('补帧命令在三栈共享且保留有序步骤编号', (t) => {
  if (!hasSources()) return t.skip('需要三个只读帧动画源仓库');
  const plan = buildSharedFrameReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const document = plan.documents.find((item) => item.capabilityId === 'frame-reference-image-inbetween');
  const example = plan.replacements.filter((item) => item.capabilityId === document.capabilityId
    && item.sourceHeading === '首尾、关键帧与递归' && item.original.trim().startsWith('```powershell'));
  assert.deepEqual(example.map((item) => item.stack).sort(), ['cocos', 'phaser', 'threejs']);
  assert.ok(document.content.includes('`skills/<stack>-domain-contracts/resources/frame-animation`'));
  assert.ok(document.content.includes(example[0].canonical));
  for (const item of plan.replacements.filter((entry) => /^\d+[.)]\s+/.test(entry.original))) {
    assert.ok(item.canonical.startsWith(item.original.match(/^\d+[.)]\s+/)[0]), '有序步骤必须保留原编号');
  }
  const steps = plan.replacements.filter((item) => item.capabilityId === 'frame-reference-action-timing'
    && item.sourceHeading === '视频节奏整理' && item.stack === 'cocos');
  assert.ok(steps.some((item) => /^1[.)]\s+/.test(item.canonical)));
  assert.ok(steps.some((item) => /^2[.)]\s+/.test(item.canonical)));
});

test('保留 Cocos 可选摘要、Phaser 必填摘要及 Three.js 原生资源绑定', (t) => {
  if (!hasSources()) return t.skip('需要三个只读帧动画源仓库');
  const plan = buildSharedFrameReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  for (const [stack, evidence] of [
    ['cocos', '示例摘要仅用于展示可选追踪字段'],
    ['phaser', '以上摘要须替换为实际 64 位小写十六进制'],
    ['threejs', 'runtime_binding'],
  ]) {
    const name = stack === 'threejs' ? 'workflow-integration.md' : 'image-inbetween.md';
    const sourcePath = `skills/${SKILLS[stack]}/references/${name}`;
    const text = readFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, ...sourcePath.split('/')), 'utf8');
    assert.ok(applyReference(plan, stack, sourcePath, text).includes(evidence), `${stack} 原生合同不能被公共段落覆盖`);
  }
});

test('参考来源内容、目录清单缺失或新增时停止生成', (t) => {
  if (!hasSources()) return t.skip('需要三个只读帧动画源仓库');
  const tempRoot = mkdtempSync(join(tmpdir(), 'frame-reference-source-'));
  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));
  for (const [stack, skill] of Object.entries(SKILLS)) {
    const source = resolve(SOURCE_ROOT, `${stack}-skills`, 'skills', skill, 'references');
    const target = resolve(tempRoot, `${stack}-skills`, 'skills', skill, 'references');
    cpSync(source, target, { recursive: true });
  }
  const trackedFilesByStack = Object.fromEntries(Object.entries(SKILLS).map(([stack, skill]) => [stack,
    execFileSync('git', ['-C', resolve(SOURCE_ROOT, `${stack}-skills`), 'ls-files', '-z', '--', `skills/${skill}/references/`], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean),
  ]));
  const build = () => buildSharedFrameReferences({ sourceRoot: tempRoot, repositoryRoot: ROOT, trackedFilesByStack });
  const target = resolve(tempRoot, 'cocos-skills', 'skills', SKILLS.cocos, 'references', 'action-timing.md');
  const original = readFileSync(target);
  writeFileSync(target, Buffer.concat([original, Buffer.from('\n未经审查的变化')]));
  assert.throws(build, /摘要漂移/);
  writeFileSync(target, original);
  const missing = resolve(tempRoot, 'phaser-skills', 'skills', SKILLS.phaser, 'references', 'animation-direction.md');
  rmSync(missing);
  assert.throws(build, /ENOENT|no such file/i);
  cpSync(resolve(SOURCE_ROOT, 'phaser-skills', 'skills', SKILLS.phaser, 'references', 'animation-direction.md'), missing);
  writeFileSync(join(dirname(missing), 'unexpected.md'), '需要审查的新增参考');
  assert.doesNotThrow(build, '未跟踪的用户文件不能阻塞源迁移');
  trackedFilesByStack.phaser.push(`skills/${SKILLS.phaser}/references/unexpected.md`);
  assert.throws(build, /参考清单变化/);
});
