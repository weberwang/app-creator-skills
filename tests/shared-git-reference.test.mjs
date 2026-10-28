/** 最小提交集共享不能丢失各栈工程文件与资源元数据的不同要求。 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildSharedGitReference } from '../scripts/migration/shared-git-reference.mjs';
import { applySharedWorkflowDocument, applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');

test('逐源共享相同提交规则并保留全部未提取的原生资源要求', (t) => {
  if (!existsSync(resolve(SOURCE_ROOT, 'unity-skills'))) return t.skip('需要四个只读源仓库');
  const plan = buildSharedGitReference({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.equal(plan.documents.length, 1);
  assert.deepEqual(plan.documents[0].sources.map((source) => source.stack), ['cocos', 'phaser', 'threejs']);
  assert.match(plan.documents[0].content, /不自动授予提交、分支、worktree 或推送权限/);
  assert.match(plan.documents[0].content, /git check-ignore/);
  for (const source of plan.documents[0].sources) {
    const original = readFileSync(resolve(SOURCE_ROOT, `${source.stack}-skills`, source.sourcePath), 'utf8');
    const replacements = plan.replacements.filter((item) => item.stack === source.stack);
    const result = applySharedWorkflowSections(original, { ...source, destination: `skills/${source.stack}-domain-contracts/references/minimal-git.md`, plan, repositoryRoot: ROOT });
    assert.ok(result.text.includes('git-minimal-submission.md'));
    for (const block of readWorkflowBlocks(original)) {
      if (!replacements.some((item) => item.sourceRange.start === block.sourceRange.start)) assert.ok(result.text.includes(block.original));
    }
    if (source.stack === 'cocos') assert.match(result.text, /Creator.*\.meta/);
  }
});

test('Unity 正式迁移结果不能把阶段 PASS 当成自动提交授权', (t) => {
  const sourcePath = 'unity-game-workflow-control/references/minimal-git.md';
  const file = resolve(SOURCE_ROOT, 'unity-skills', sourcePath);
  if (!existsSync(file)) return t.skip('需要只读 Unity 源仓库');
  const plan = buildSharedGitReference({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const result = applySharedWorkflowDocument(readFileSync(file, 'utf8'), { stack: 'unity', sourcePath,
    destination: 'skills/unity-domain-contracts/references/minimal-git.md', plan, repositoryRoot: ROOT });
  assert.doesNotMatch(result.text, /由主代理自动创建本地阶段提交/);
  assert.match(result.text, /只有当前任务明确包含 Git 提交时/);
  assert.match(result.text, /Unity `\.meta`/);
  assert.ok(result.transforms.includes('correct-git-commit-authorization'));
});
