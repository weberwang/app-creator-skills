import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import test from 'node:test';
import { createFixture, readWork, bindImplementation, put, putJson } from './controller-fixture.mjs';
import { validateEvidence } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { engineeringEvidence } from '../../skills/app-workflow-control/scripts/runtime/function-evidence.mjs';

test('游戏基础工程冻结结构证据，缺少结构记录时阻断', async (t) => {
  for (const [stack, path] of [['unity', 'Assets/Scripts/Example.cs'], ['cocos', 'assets/sample.ts'], ['phaser', 'src/game/sample.ts'], ['threejs', 'src/game/sample.ts'], ['roblox', 'src/sample.luau']]) {
    const { repo, workPath } = await createFixture({ id: `foundation-${stack}`, stack });
    t.after(() => rm(repo, { recursive: true, force: true }));
    const work = await readWork(repo, workPath);
    const { packPath } = await bindImplementation({ repo, work, workPath, stage: 'foundation', unitPaths: [path] });
    const evidencePath = `${work.evidenceRoot}/structure.txt`;
    const manifestPath = `${work.evidenceRoot}/manifest.json`;
    await put(repo, evidencePath, '结构回读结果');
    work.evidenceRef = { path: manifestPath };
    const manifest = { schemaVersion: '1.0', workItemId: work.workItemId, stack, implementationPackageRef: packPath, items: [{ category: 'architecture-structure', status: 'PASS', path: evidencePath }] };
    await putJson(repo, manifestPath, manifest);
    assert.doesNotThrow(() => validateEvidence(repo, work));
    assert.deepEqual(engineeringEvidence(repo, work).items.map((item) => item.category), ['architecture-structure']);
    manifest.items[0].category = 'compile';
    await putJson(repo, manifestPath, manifest);
    assert.throws(() => validateEvidence(repo, work), /architecture-structure/);
  }
});
