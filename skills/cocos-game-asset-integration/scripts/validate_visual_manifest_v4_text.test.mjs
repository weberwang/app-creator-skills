import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main } from './validate_visual_manifest.mjs';
import { createFixtureFiles, validManifest, validOrdinaryManifest } from './visual-manifest-test-fixtures.mjs';
import { fixtureLayoutNodes, writeFixtureV2Layout } from '../../cocos-domain-contracts/scripts/v2-layout-source-test-fixtures.mjs';

/** 准备正式图片已存在的独立资源清单，保留测试目录隔离。 */
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'v4-text-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = validOrdinaryManifest();
  manifest.visualStage = 'V4';
  manifest.visualStageState = 'v4-formal-acceptance-complete';
  manifest.scene_reconstruction_contract = {};
  await createFixtureFiles(root, false, manifest);
  assert.ok((await stat(join(root, 'public/assets/hero.png'))).size > 0);
  const path = join(root, 'visual-assets.json');
  /** 以当前清单运行 CLI，并返回退出码及诊断。 */
  async function run(extra = []) {
    await writeFile(path, JSON.stringify(manifest));
    const previous = console.error;
    const messages = [];
    console.error = (...args) => messages.push(args.join(' '));
    try {
      const code = await main([path, '--check-files', '--project-root', root, ...extra]);
      return { code, message: messages.join('\n') };
    } finally {
      console.error = previous;
    }
  }
  return { root, manifest, run };
}

test('V4 正式图片存在而文字未接入时独立清单不应报告通过', async (t) => {
  const { manifest, run } = await fixture(t);
  const contract = manifest.scene_reconstruction_contract;
  contract.text_decomposition = { applicability: 'has-text', text_nodes: [{ text_node_id: 'title' }] };
  for (const args of [[], ['--stage', 'V4']]) {
    const result = await run(args);
    assert.equal(result.code, 1);
    assert.match(result.message, /app-workflow/);
  }
  delete contract.text_decomposition;
  contract.textDecomposition = { textNodes: [{ textNodeId: 'title' }] };
  delete manifest.visualStage;
  manifest.visual_stage = 'V4';
  assert.match((await run()).message, /app-workflow/);
  delete contract.textDecomposition;
  contract.coverage_regions = [{ region_id: 'title', render_kind: 'text' }];
  assert.match((await run()).message, /app-workflow/);
});

test('V4 无文字的独立清单仍可完成素材检查', async (t) => {
  const { run } = await fixture(t);
  assert.equal((await run(['--stage', 'V4'])).code, 0);
});

test('V4 声明不可用 V3 参数降级', async (t) => {
  const { manifest, run } = await fixture(t);
  manifest.scene_reconstruction_contract.text_decomposition = { applicability: 'has-text', text_nodes: [{ text_node_id: 'title' }] };
  const downgrade = await run(['--stage', 'V3']);
  assert.equal(downgrade.code, 1);
  assert.match(downgrade.message, /app-workflow|visualStage=V4.*V3|阶段.*不一致/);

});

test('V3 无文字的独立清单可继续检查', async (t) => {
  const { manifest, run } = await fixture(t);
  manifest.visualStage = 'V3';
  manifest.visualStageState = 'v3-production-planning-complete';
  assert.equal((await run(['--stage', 'V3'])).code, 0);
});

test('V4 加载实际布局源中的文字节点后要求工作流验收', async (t) => {
  const { root, manifest, run } = await fixture(t);
  const contract = validManifest().scene_reconstruction_contract;
  const nodes = structuredClone(fixtureLayoutNodes(contract));
  nodes[0].node_type = 'text';
  writeFixtureV2Layout(root, contract, nodes);
  manifest.scene_reconstruction_contract = contract;
  const result = await run();
  assert.equal(result.code, 1);
  assert.match(result.message, /app-workflow/);
});
