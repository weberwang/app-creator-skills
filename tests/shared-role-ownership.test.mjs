/** 玩法与美术边界必须只有一处完整正文，六份来源仍可逐一核验。 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildCompleteSharedWorkflowPlan } from '../scripts/migration/shared-workflows.mjs';

const ROOT = resolve(import.meta.dirname, '..');

test('素材管线和玩法引用同一职责章节，保留来源和顺序', (t) => {
  if (!existsSync(resolve(ROOT, '../cocos-skills'))) return t.skip('需要只读源仓库');
  const plan = buildCompleteSharedWorkflowPlan({ repositoryRoot: ROOT, sourceRoot: resolve(ROOT, '..') });
  const primary = plan.documents.find((item) => item.capabilityId === 'gameplay-implementation');
  const secondary = plan.documents.find((item) => item.capabilityId === 'reference-asset-visual-production-pipeline');
  const rows = plan.replacements.filter((item) => item.capabilityId === 'gameplay-implementation' && item.heading === '玩法与美术职责');
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map((row) => `${row.stack}:${row.sourcePath}`)).size, 6);
  assert.match(primary.content, /停止受影响实现并交回所有者/);
  assert.match(secondary.content, /2\. 玩法、美术边界.*gameplay-implementation\.md#玩法与美术职责/);
  assert.doesNotMatch(secondary.content, /2\. 玩法独占规则、状态、碰撞和交互代码/);
  for (const row of rows) {
    const source = primary.sources.find((item) => item.stack === row.stack && item.sourcePath === row.sourcePath);
    assert.ok(source.sections.some((section) => section.sourceHash === row.sourceHash));
  }
});
