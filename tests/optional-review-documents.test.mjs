/** 核对审阅方式同步进入共享规则及原生文档，并保留来源和视觉确认。 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { adaptOptionalReviewDocument } from '../scripts/migration/optional-review-documents.mjs';
import { buildCompleteSharedWorkflowPlan } from '../scripts/migration/shared-workflows.mjs';
import { referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, '..');

test('静态布局默认输出 PNG，实际网页保持条件绑定', () => {
  const input = 'V2 布局候选的机器引用必须覆盖同一候选目录的 `layout.png`、`layout-nodes.json`、`layout-decision.json`、`review.html` 和 `generation-result.json`。布局/确认/decision/receipt 统一使用 `layout_review_file`、`layout_nodes_file`。';
  const result = adaptOptionalReviewDocument(input, { sourcePath: 'skills/threejs-game-workflow-control/references/schemas.md' });
  assert.match(result.text, /需要交互对照时通过 `--interactive-review`/);
  assert.match(result.text, /仅提供交互审阅页时还须统一绑定并核验 `layout_review_file`/);
  assert.match(result.text, /`layout-nodes.json`、`layout-decision.json` 和 `generation-result.json`/);
  assert.deepEqual(result.transforms, ['optional-review-artifacts']);
});

test('动画播放仅显式请求时生成 HTML，不修改无关网页资料', () => {
  const text = '视频按固定区域抽帧，保留图集、报告和 HTML 预览。';
  const sourcePath = 'skills/cocos-frame-animation/SKILL.md';
  assert.match(adaptOptionalReviewDocument(text, { sourcePath }).text, /需要动画播放时通过 `--output-preview`/);
  assert.equal(adaptOptionalReviewDocument(text, { sourcePath: 'skills/project-runtime/references/browser.md' }).text, text);
  const code = '  "preview": { "file": "evidence/animation.preview.html", "sha256": "sha256:<实际摘要>" },\n  "sheet": "file.png"';
  assert.equal(adaptOptionalReviewDocument(code, { sourcePath: 'skills/cocos-frame-animation/references/image-inbetween.md' }).text, '  "sheet": "file.png"');
});

test('公共正文保留两次图像确认与实际文件证据，来源摘要不变', (t) => {
  if (!['unity', 'cocos', 'phaser', 'threejs', 'flutter'].every((stack) => existsSync(resolve(sourceRoot, `${stack}-skills`)))) return t.skip('需要五个只读来源仓库');
  const plan = buildCompleteSharedWorkflowPlan({ sourceRoot, repositoryRoot: root });
  const doc = (id) => plan.documents.find((document) => document.capabilityId === id);
  const pipeline = doc('reference-asset-visual-production-pipeline');
  assert.match(pipeline.content, /两次确认仍分别是人工确认，且不得合并或跳过/);
  assert.match(pipeline.content, /需要交互对照时使用 `--interactive-review`/);
  const review = doc('reference-ui-layout-review-artifacts');
  assert.match(review.content, /如提供审阅页，校验器还须核对页面实际文件、业务绑定/);
  assert.match(review.content, /节点 JSON、决策 JSON、布局 PNG 和冻结参考图都必须存在/);
  assert.doesNotMatch(review.content, /在同一批同步写入以下五份产物/);
  assert.match(review.content, /仅需要交互对照时生成同批审阅页/);
  assert.match(review.content, /layout_review_sha256.*可作为可选摘要记录/);
  for (const document of [pipeline, review]) for (const source of document.sources) for (const section of source.sections) {
    assert.equal(referenceBlockHash(section.original), section.sourceHash);
    assert.equal(referenceBlockHash(section.canonical), section.canonicalHash);
    assert.ok(document.content.includes(section.canonical));
  }
});

test('原生手册不把离线审阅页列入默认同步产物', () => {
  const source = '再由同一入口同步生成布局 PNG、`layout-nodes.json`、`layout-decision.json`、离线 `review.html` 和 `generation-result.json`。';
  for (const stack of ['phaser4', 'threejs']) {
    const result = adaptOptionalReviewDocument(source, { sourcePath: `skills/${stack}-game-ui-layout/SKILL.md` });
    assert.match(result.text, /需要交互对照时通过 `--interactive-review`/);
    assert.doesNotMatch(result.text, /同步生成布局 PNG、`layout-nodes.json`、`layout-decision.json`、离线 `review.html`/);
  }
});
