import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readV4TextRestoration } from '../../skills/app-workflow-control/scripts/runtime/v4-text-restoration.mjs';

/** 写入隔离证据及正式产物并返回实际文件身份。 */
function put(repo, path, value) {
  const file = join(repo, path);
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

test('V4 正式入口和图片消费者必须与文字报告在同一批，V5 保留冻结证据', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'formal-v4-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const work = { workItemId: 'scene-work', stack: 'cocos', evidenceRoot: 'records/v4' };
  const review = { schemaVersion: '1.0', visualStage: 'V4', workItemId: work.workItemId, stack: work.stack, candidateId: 'scene-v4',
    assets: [{ assetId: 'button', assetType: 'image', output: 'assets/ui/button.png' }] };
  const entryRef = put(repo, 'assets/scenes/Shop.scene', '正式入口');
  const outputRef = put(repo, review.assets[0].output, '正式图片');
  const formalIntegration = { entryRef, images: [{ assetId: 'button', componentPath: 'Canvas/Button', outputRef }] };

  /** 变更同批回读的图文绑定时重冻报告及其评审。 */
  function check(integration, stage = 'V4') {
    const textRestorationRef = put(repo, 'records/v4/text.json', { runId: 'shop-v4', formalIntegration: integration });
    const assetReviewRef = put(repo, 'records/v4/review.json', { ...review, textRestorationRef });
    return readV4TextRestoration(repo, work, review.candidateId, { stage, assetReviewRef, entryPaths: [entryRef.path] });
  }

  assert.throws(() => check(undefined), /缺少 formalIntegration/);
  assert.throws(() => check({ ...formalIntegration, entryRef: put(repo, 'records/v4/Shop.scene', '试装场景') }), /正式源文件/);
  assert.throws(() => check({ ...formalIntegration, entryRef: put(repo, 'assets/scenes/Other.scene', '其他正式场景') }), /正式源文件/);
  assert.throws(() => check({ ...formalIntegration, images: [] }), /图片覆盖/);
  const [image] = formalIntegration.images;
  assert.throws(() => check({ ...formalIntegration, images: [{ ...image, componentPath: ' ' }] }), /正式组件消费者/);
  assert.throws(() => check({ ...formalIntegration, images: [{ ...image, outputRef: put(repo, 'assets/ui/preview.png', '另一张图片') }] }), /本批评审产物/);
  assert.deepEqual(check(formalIntegration).report.formalIntegration, formalIntegration);
  put(repo, entryRef.path, 'V5 实现继续演进');
  assert.throws(() => check(formalIntegration), /正式接入入口.*冻结摘要不符/);
  assert.deepEqual(check(formalIntegration, 'V5').report.formalIntegration, formalIntegration);
});

for (const stack of ['phaser4', 'threejs']) {
  test(`${stack} 独立素材检查必须将含文字的 V4 交给工作流`, async (t) => {
    const repo = mkdtempSync(join(tmpdir(), `${stack}-v4-`));
    t.after(() => rmSync(repo, { recursive: true, force: true }));
    const root = new URL(`../../skills/${stack}-game-asset-integration/scripts/`, import.meta.url);
    const { validOrdinaryManifest, createFixtureFiles } = await import(new URL('visual-manifest-test-fixtures.mjs', root));
    const manifest = validOrdinaryManifest();
    Object.assign(manifest, { visualStage: 'V4', visualStageState: 'v4-formal-acceptance-complete' });
    delete manifest.scene_reconstruction_contract;
    await createFixtureFiles(repo, false, manifest);
    const cli = fileURLToPath(new URL('validate_visual_manifest.mjs', root));

    /** 通过真实命令验证同一批独立素材，V4 有文字时更换门禁。 */
    function validate(stage) {
      const { path } = put(repo, 'visual-assets.json', manifest);
      return spawnSync(process.execPath, [cli, join(repo, path), '--stage', stage, '--check-files', '--project-root', repo], { encoding: 'utf8', windowsHide: true });
    }

    const materialsOnly = validate('V4');
    assert.equal(materialsOnly.status, 0, materialsOnly.stderr);
    manifest.scene_reconstruction_contract = { layoutDecomposition: { layoutNodes: [{ renderKind: 'TEXT' }] } };
    for (const stage of ['V4', 'V3']) {
      const withText = validate(stage);
      assert.equal(withText.status, 1, withText.stderr);
      assert.match(withText.stderr, /V4 文字正式接入须通过 app-workflow/);
      assert.doesNotMatch(withText.stdout, /验证通过/);
    }
  });
}
