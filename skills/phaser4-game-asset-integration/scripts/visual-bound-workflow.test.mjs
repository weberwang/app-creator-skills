import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main as phaserMain } from './validate_visual_manifest.mjs';
import { main as threejsMain } from '../../threejs-game-asset-integration/scripts/validate_visual_manifest.mjs';

for (const [stack, main] of [['phaser', phaserMain], ['threejs', threejsMain]]) {
  test(`${stack} 绑定清单进入工作项检查并保留独立 V4 文字门`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'visual-bound-workflow-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const manifest = {
      visualStage: 'V4',
      scene_reconstruction_contract: { text_decomposition: { applicability: 'has-text', text_nodes: [{ text_node_id: 'title' }] } },
    };
    const path = join(root, 'visual-assets.json');
    /** 捕获独立命令的真实诊断，确认请求到达预期的验证入口。 */
    async function run(extra = []) {
      await writeFile(path, JSON.stringify(manifest));
      const messages = [];
      const previous = console.error;
      console.error = (...args) => messages.push(args.join(' '));
      try { return { code: await main([path, '--project-root', root, ...extra]), message: messages.join('\n') }; }
      finally { console.error = previous; }
    }
    const unbound = await run(['--check-files']);
    assert.equal(unbound.code, 1);
    assert.match(unbound.message, /V4 文字正式接入/);
    manifest.workflow_binding = { schemaVersion: '1.0', workItemPath: 'missing-work.json', targetId: 'scene' };
    const noFiles = await run();
    assert.equal(noFiles.code, 1);
    assert.match(noFiles.message, /必须运行 --check-files/);
    const bound = await run(['--check-files']);
    assert.equal(bound.code, 1);
    assert.match(bound.message, /missing-work\.json|工作项/);
    assert.doesNotMatch(bound.message, /V4 文字正式接入须通过/);
  });
}
