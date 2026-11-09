/** 通过公共入口校验 Roblox 视觉材料分派；合成数据不构成实际运行或人工验收。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/domain-target-check.mjs';
import { validateSingleDomainTarget } from '../../skills/app-workflow-control/scripts/runtime/single-domain-check.mjs';
import { createRobloxVisualFixture, writeRobloxFixture } from '../helpers/roblox-fixture.mjs';

/** 为 V5 公共门提供明确标注的合成美术记录，测试身份绑定而不判断画面。 */
function addArtFixture(fixture) {
  const { repo, work, manifest, envelope, target } = fixture;
  const prefix = work.evidenceRoot;
  const identity = target ?? { targetId: work.visual.objectId, candidateId: work.visual.candidateId, stateId: envelope.stateId, viewport: envelope.viewport, referenceTarget: envelope.referenceTarget };
  const budget = { brightnessContrast: '合成预算', screenCoverage: '合成预算', duration: '合成预算', triggerFrequency: '合成预算', maxConcurrent: 1, recovery: '合成预算', blendPolicy: '合成预算' };
  const brief = writeRobloxFixture(repo, `${prefix}/art-brief.json`, { schemaVersion: '1.0', projectId: work.projectId, theme: '合成主题', audience: { facts: ['合成事实'], assumptions: [] }, coreLoop: '合成循环', experienceGoals: ['合成目标'], viewingContext: '合成环境', visualHierarchy: ['合成层级'], intensityBudget: { normal: budget, operation: budget, peak: budget, measurementMethod: '合成方法' } });
  const recording = writeRobloxFixture(repo, `${prefix}/synthetic.mp4`, '合成录屏占位，仅供记录结构校验。');
  const acceptance = writeRobloxFixture(repo, `${prefix}/art-acceptance.json`, {
    schemaVersion: '1.0', workItemId: work.workItemId, candidateId: identity.candidateId, candidateVersion: 'synthetic-version',
    sceneId: target ? target.sceneId : work.visual.hostId, ...(target ? {} : { displayLayerId: work.visual.objectId }), artBriefRef: brief.path,
    qualityResults: Object.fromEntries(['themeFit', 'audienceFit', 'gameplayReadability', 'viewingComfort', 'artCompletion'].map((key) => [key, { status: 'PASS', reason: '合成人工记录' }])),
    scenarios: [
      { id: 'normal-play', required: true, reason: '合成情境', status: 'PASS', recordingPath: recording.path, durationSeconds: 10, startSeconds: 0, endSeconds: 10, eventCount: 1, peakConcurrency: 1, viewport: identity.viewport, targetId: identity.targetId, stateId: identity.stateId, referenceTarget: identity.referenceTarget, observations: '合成观察' },
      ...['repeated-feedback', 'event-peak', 'overlap-peak'].map((id) => ({ id, required: false, reason: '合成不适用', status: 'NOT_APPLICABLE' })),
    ], confirmedBy: 'synthetic-user', confirmedAt: '2026-11-09T00:00:00Z', userMessageRef: 'synthetic-message', userText: '合成确认，不能用于实际验收',
  });
  manifest.items.push({ category: 'art-experience-acceptance', status: 'PASS', path: acceptance.path, ...(target ? { targetId: target.targetId } : {}) });
  writeRobloxFixture(repo, work.evidenceRef.path, manifest);
}

/** 调用真实公共子进程入口，确保安装后的相对路径与领域加载也得到覆盖。 */
function validate(fixture, stage, layer) {
  return layer ? validateSingleDomainTarget(fixture.repo, fixture.work, stage) : validateDomainTarget(fixture.repo, fixture.work, fixture.target, stage);
}

for (const layer of [false, true]) {
  for (const stage of ['V2', 'V3', 'V4', 'V5']) {
    test(`Roblox ${layer ? '显示层' : '场景'} ${stage} 公共入口分派并拒绝原生身份错绑`, (t) => {
      const fixture = createRobloxVisualFixture(t, { stage, layer });
      if (stage === 'V5') {
        assert.throws(() => validate(fixture, stage, layer), /美术验收/);
        addArtFixture(fixture);
      }
      assert.equal(validate(fixture, stage, layer), true);
      fixture.visual.studio.studioId = 'other-studio';
      fixture.saveVisual();
      if (stage === 'V5') addArtFixture(fixture);
      assert.throws(() => validate(fixture, stage, layer), /Studio|studio|身份/);
    });
  }
}

test('Roblox 视觉公共入口拒绝跨宿主、阶段与原生摘要变化', (t) => {
  const scene = createRobloxVisualFixture(t, { stage: 'V2' });
  scene.envelope.visualStage = 'V3';
  scene.saveVisual();
  assert.throws(() => validate(scene, 'V2', false), /阶段/);
  const layer = createRobloxVisualFixture(t, { stage: 'V2', layer: true });
  layer.envelope.hostId = 'other-host';
  layer.saveVisual();
  assert.throws(() => validate(layer, 'V2', true), /宿主/);
  layer.envelope.hostId = layer.work.visual.hostId;
  layer.saveVisual();
  writeRobloxFixture(layer.repo, layer.envelope.robloxEvidenceRef.path, '被替换的原生证据');
  assert.throws(() => validate(layer, 'V2', true), /SHA-256|摘要/);
});
