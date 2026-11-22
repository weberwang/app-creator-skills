/** 使用合成资料验证同一宿主下场景和弹窗的独立阶段推进。 */
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { advanceVisual, initializeWork, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { prepareFormalVisualFixture, putJson, readWork } from './controller-fixture.mjs';

/** 在同一项目建立宿主场景及其独立弹窗，并准备各自的 V1 方案。 */
async function fixture(t) {
  const repo = await mkdtemp(resolve(tmpdir(), 'scene-popup-independence-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const scene = await initializeWork({ repo, args: {
    id: 'game-scene', stack: 'cocos', type: 'SCENE', objective: '验证场景独立推进',
    'project-id': 'project-a', 'object-id': 'game', 'design-route': 'game-ui',
  } });
  const popup = await initializeWork({ repo, args: {
    id: 'result-popup', stack: 'cocos', type: 'DISPLAY_LAYER', objective: '验证弹窗独立推进',
    'project-id': 'project-a', 'object-id': 'result', 'host-id': 'game', 'layer-type': 'modal',
  } });
  const paths = { scene: scene.metadata.workItemPath, popup: popup.metadata.workItemPath };
  for (const workPath of Object.values(paths)) {
    const work = await readWork(repo, workPath);
    work.globalState = 'REVIEW';
    work.gateStatus.F0 = work.gateStatus.F1 = 'PASS';
    await putJson(repo, workPath, work);
    await prepareFormalVisualFixture({ repo, workPath });
  }
  return { repo, ...paths };
}

for (const [advancing, blocked, name, blockedName] of [
  ['scene', 'popup', '场景', '弹窗'],
  ['popup', 'scene', '弹窗', '场景'],
]) {
  test(`${name} 在${blockedName}阻断且仍处于 V1 时独立进入 V2`, async (t) => {
    const f = await fixture(t);
    const scene = await readWork(f.repo, f.scene);
    const popup = await readWork(f.repo, f.popup);
    assert.equal(scene.projectId, popup.projectId);
    assert.equal(popup.visual.hostId, scene.visual.objectId);

    await transitionWork({ repo: f.repo, workItem: f[blocked], to: 'BLOCKED', args: { reason: '等待当前工作项材料' } });
    const blockedBefore = await readWork(f.repo, f[blocked]);
    const advancingBefore = await readWork(f.repo, f[advancing]);
    assert.equal(blockedBefore.visual.stage, 'V1');
    await assert.rejects(advanceVisual({ repo: f.repo, workItem: f[blocked], to: 'V2' }), /BLOCKED/);

    await advanceVisual({ repo: f.repo, workItem: f[advancing], to: 'V2' });
    const advanced = await readWork(f.repo, f[advancing]);
    assert.equal(advanced.visual.stage, 'V2');
    assert.equal(advanced.revision, advancingBefore.revision + 1);
    assert.deepEqual(await readWork(f.repo, f[blocked]), blockedBefore);
  });
}
