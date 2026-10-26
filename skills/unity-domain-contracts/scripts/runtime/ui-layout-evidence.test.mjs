import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectUiLayoutEvidence, validateUiLayoutPackage } from './ui-layout-evidence.mjs';

test('屏幕 UI 从 V2 起绑定领域布局计划，其他工程工作不被扩围', () => {
  const repo = mkdtempSync(join(tmpdir(), 'unity-domain-ui-layout-'));
  try {
    const screenWork = {
      workItemType: 'SCENE',
      scene: { sceneId: 'MainScene', stage: 'V2' },
      responsiveContract: { uiSystem: 'UGUI' },
    };
    const missingPlan = validateUiLayoutPackage({}, screenWork, repo);
    assert.match(missingPlan.join('\n'), /必须.*uiLayoutPlanRef/);

    const brokenPackage = { uiLayoutPlanRef: { path: 'Contracts/missing-layout.json' } };
    const invalidPlan = validateUiLayoutPackage(brokenPackage, screenWork, repo);
    assert.match(invalidPlan.join('\n'), /UI布局计划无效/);
    const evidenceBlockers = inspectUiLayoutEvidence({
      work: screenWork, pkg: brokenPackage, evidence: { verdict: 'NOT_RUN' }, repo,
    });
    assert.equal(evidenceBlockers[0].code, 'UI_LAYOUT_EVIDENCE_INVALID');

    assert.deepEqual(validateUiLayoutPackage({}, { workItemType: 'FOUNDATION' }, repo), []);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
