import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { checkSvgRasterManifestFiles, validateSvgRasterManifest } from '../skills/app-domain-toolkit/scripts/visual/svg-raster-contract.mjs';
import { rasterizeSvg } from '../skills/app-domain-toolkit/scripts/visual/svg-rasterization.mjs';

const svgPath = 'art/hero-reconstruction.svg';
const svgSource = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96"><path d="M8 7H55V89H8Z" fill="#da7e44"/></svg>';
const converter = fileURLToPath(new URL('../skills/app-domain-toolkit/scripts/visual/svg-rasterization.mjs', import.meta.url));

/** 写入真实冻结资料并返回可核对路径和摘要。 */
async function writeRef(root, path, value) {
  const bytes = JSON.stringify(value);
  await writeFile(join(root, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** 构建测试用户确认并绑定本次实际 SVG 字节和素材身份。 */
async function svgReview(root, sourcePath, source, { assetId, workItemId, candidateId }) {
  return writeRef(root, 'svg-review.json', {
    schemaVersion: '1.0', stage: 'V4', purpose: 'svg-source', decision: 'APPROVED',
    objectId: assetId, workItemId, candidateId, targetRef: sourcePath,
    targetSha256: createHash('sha256').update(source).digest('hex'), userMessageRef: 'test://svg-approved',
  });
}

/** 将新路线冻结在实际预期资产项，沿用独立位图合同的路径、尺寸和状态。 */
function selectSvg(container, expected) {
  Object.assign(container, { production_origin: 'independent-production', production_method: 'authored-raster', delivery_kind: 'raster-image',
    image_generation_required: false, generation_record_required: false });
  Object.assign(expected, { svg_source_file: svgPath, mime_type: 'image/png', width: 64, height: 96, alpha: true });
}

test('V3 可冻结 SVG 路线与正式 PNG 规格，V4 缺正式资产或漂移时阻断', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'svg-route-plan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const expected = { asset_id: 'icon', source_file: 'art/icon.png', runtime_file: 'assets/icon.png' };
  const region = { owner_type: 'fixed-production-visual', expected_assets: [expected] };
  selectSvg(region, expected);
  const manifest = { assets: [], coverage_audit: { regions: [region] } };
  assert.deepEqual(validateSvgRasterManifest(manifest, 'V3'), []);
  assert.deepEqual(await checkSvgRasterManifestFiles(manifest, root, 'v3'), []);
  expected.width = 4096;
  assert.deepEqual(validateSvgRasterManifest(manifest, 'V3'), []);
  expected.width = 4097;
  assert.match(validateSvgRasterManifest(manifest, 'V3').join('\n'), /4096 像素/);
  expected.width = 64;
  assert.match(validateSvgRasterManifest(manifest, 'V4').join('\n'), /缺少正式 PNG 资源记录/);
  const copy = structuredClone(region);
  manifest.scene_reconstruction_contract = { coverage_regions: [copy] };
  copy.expected_assets[0].svg_source_file = 'art/drift.svg';
  assert.match(validateSvgRasterManifest(manifest, 'V3').join('\n'), /交接中的 SVG 来源或 PNG 规格不一致/);
  delete copy.expected_assets[0].svg_source_file;
  assert.match(validateSvgRasterManifest(manifest, 'V3').join('\n'), /交接缺少冻结的 svg_source_file/);
  delete manifest.scene_reconstruction_contract;
  region.image_generation_required = true;
  assert.match(validateSvgRasterManifest(manifest, 'V3').join('\n'), /生成标记均为 false/);
});

for (const stack of ['cocos', 'phaser4', 'threejs']) {
  test(`${stack} 的 SVG 和直接生图共用场景尺寸、留白与九宫格规则`, async () => {
    const base = new URL(`../skills/${stack}-game-asset-integration/scripts/`, import.meta.url);
    const { validateImageGenerationSizeManifest: validateSizes } = await import(new URL('validate_visual_manifest.mjs', base));
    for (const method of ['image-generation', 'authored-raster']) {
      const expected = { asset_id: 'icon', component_id: 'icon', state_id: 'default', width: 64, height: 96,
        source_file: 'art/icon.png', runtime_file: 'assets/icon.png' };
      const component = { component_id: 'icon', placements: [{ placement_id: 'main', bounds: { x: 0, y: 0, width: 32, height: 48 } }] };
      const usage = { target_display_size: { width: 32, height: 48 }, intended_scale_range: { min: 1, max: 2 }, max_dpr: 1, padding_policy: 'none' };
      const region = { id: 'region-icon', annotation_number: 1, owner_type: 'fixed-production-visual', production_origin: 'independent-production',
        production_method: method, delivery_kind: 'raster-image', image_generation_required: method === 'image-generation',
        component_inventory: { components: [component] }, expected_assets: [expected], scene_asset_usage: usage };
      if (method === 'authored-raster') selectSvg(region, expected);
      const asset = { id: 'icon', status: 'planned' };
      const manifest = { assets: [asset], coverage_audit: { regions: [region] } };
      assert.deepEqual(validateSizes(manifest, { stage: 'V3' }), [], method);
      expected.width = 128;
      assert.match(validateSizes(manifest, { stage: 'V3' }).join('\n'), /精确使用机器计算的最小尺寸/, method);
      expected.width = 64;
      usage.padding_policy = 'bleed';
      assert.match(validateSizes(manifest, { stage: 'V3' }).join('\n'), /padding_policy=none/, method);
      usage.padding_policy = 'none';
      Object.assign(asset, { status: 'accepted', width: 64, height: 96 });
      assert.deepEqual(validateSizes(manifest, { stage: 'V4' }), [], method);
      if (method === 'authored-raster') {
        // 正式尺寸可从已登记的 SVG 转换中读取，不能忽略另一份显式冲突的数据。
        const conversion = { id: 'icon', status: 'accepted', svg_rasterization: { width: 64, height: 96 } };
        manifest.assets = [conversion];
        assert.deepEqual(validateSizes(manifest, { stage: 'V4' }), []);
        conversion.output_metadata = { width: 65, height: 96 };
        assert.match(validateSizes(manifest, { stage: 'V4' }).join('\n'), /output_metadata 实际输出尺寸与冻结规格不一致/);
        manifest.assets = [asset];
      }
      asset.width = 65;
      assert.match(validateSizes(manifest, { stage: 'V5' }).join('\n'), /实际输出尺寸/, method);

      // 九宫格以确认的源帧为准，弹窗业务缩放不改变角边原始尺寸。
      const nineSlice = { mode: 'stretch', reason: '保留角边', source_size: { width: 24, height: 32 },
        borders: { left: 4, right: 4, top: 4, bottom: 4 } };
      component.nine_slice = nineSlice;
      Object.assign(expected, { ...nineSlice.source_size, nine_slice: nineSlice });
      Object.assign(asset, nineSlice.source_size);
      assert.deepEqual(validateSizes(manifest, { stage: 'V4' }), [], method);
    }
  });

  test(`${stack} 正式素材入口从 SVG 复算独立 PNG，拒绝只替换哈希的错图`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), `${stack}-svg-production-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const base = new URL(`../skills/${stack}-game-asset-integration/scripts/`, import.meta.url);
    const { validOrdinaryManifest, createFixtureFiles } = await import(new URL('visual-manifest-test-fixtures.mjs', base));
    const { validateManifest, checkManifestFiles } = await import(new URL('validate_visual_manifest.mjs', base));
    const manifest = validOrdinaryManifest();
    manifest.visualStage = 'V4';
    manifest.visualStageState = 'v4-formal-acceptance-complete';
    delete manifest.scene_reconstruction_contract;
    const [asset] = manifest.assets;
    const contract = asset.production_contract ?? asset;
    const expected = (contract.expected_assets ?? asset.expected_assets)[0];
    selectSvg(contract, expected);
    await createFixtureFiles(root, false, manifest);
    await mkdir(join(root, dirname(svgPath)), { recursive: true });
    await writeFile(join(root, svgPath), svgSource);
    const reviewRef = await svgReview(root, svgPath, svgSource, {
      assetId: asset.id, workItemId: manifest.workItemId, candidateId: manifest.candidateVersion,
    });
    // 该位图由本测试夹具创建，移除占位文件后验证首次独立导出。
    await unlink(join(root, expected.runtime_file));
    const production = spawnSync(process.execPath, [converter, '--source', svgPath, '--output', expected.runtime_file,
      '--width', '64', '--height', '96', '--alpha', 'transparent', '--source-review', reviewRef.path], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(production.status, 0, production.stderr);
    const receipt = JSON.parse(production.stdout);
    const png = await rasterizeSvg(Buffer.from(svgSource), { width: 64, height: 96, alpha: 'transparent' });
    await writeFile(join(root, expected.source_file), png);
    asset.sha256 = receipt.output_sha256;
    const options = { stage: 'V4', projectRoot: root, checkFiles: true };
    assert.match(validateManifest(manifest, options).join('\n'), /缺少.*svg_rasterization/);
    asset.svg_rasterization = receipt;
    assert.deepEqual(receipt.source_review_ref, reviewRef);
    assert.match(validateManifest(manifest, { stage: 'V4' }).join('\n'), /必须提供 checkFiles=true 和 projectRoot/);
    assert.deepEqual(validateManifest(manifest, options), []);
    assert.deepEqual(await checkManifestFiles(manifest, root, options), []);
    const noReview = structuredClone(manifest);
    delete noReview.assets[0].svg_rasterization.source_review_ref;
    assert.match(validateManifest(noReview, options).join('\n'), /SVG 人工确认引用/);
    const otherAsset = structuredClone(manifest);
    otherAsset.assets[0].id = 'other-asset';
    (otherAsset.assets[0].production_contract ?? otherAsset.assets[0]).expected_assets[0].asset_id = 'other-asset';
    assert.match((await checkManifestFiles(otherAsset, root, options)).join('\n'), /未绑定当前资产、工作项或候选/);
    const wrongCandidate = { ...manifest, candidateVersion: 'another-candidate' };
    assert.match((await checkManifestFiles(wrongCandidate, root, options)).join('\n'), /未绑定当前资产、工作项或候选/);
    const missingWork = { ...manifest, workItemId: undefined };
    assert.match((await checkManifestFiles(missingWork, root, options)).join('\n'), /缺少当前工作项或候选身份/);
    const tamperedReview = await readFile(join(root, reviewRef.path), 'utf8');
    await writeFile(join(root, reviewRef.path), tamperedReview.replace('test://svg-approved', 'test://other-message'));
    assert.match((await checkManifestFiles(manifest, root, options)).join('\n'), /确认/);
    await writeFile(join(root, reviewRef.path), tamperedReview);

    const v3 = structuredClone(manifest);
    v3.visualStage = 'V3';
    v3.assets[0].status = 'planned';
    delete v3.assets[0].svg_rasterization;
    const layoutReview = { workItemId: manifest.workItemId, candidateId: manifest.candidateVersion, stage: 'V3', purpose: 'layout', decision: 'APPROVED' };
    const layoutSpecRef = await writeRef(root, 'confirmed-layout.json', v3);
    const layoutReviewRef = await writeRef(root, 'layout-review.json', { ...layoutReview, layoutSpecRef });
    const workflowOptions = { ...options, svgPlanContext: { layoutReviewRef, workItemId: layoutReview.workItemId, candidateId: layoutReview.candidateId } };
    const v3Options = { ...workflowOptions, stage: 'V3' };
    const unconfirmed = { ...v3Options, svgPlanContext: { ...v3Options.svgPlanContext, layoutReviewRef: undefined } };
    assert.match((await checkManifestFiles(v3, root, unconfirmed)).join('\n'), /缺少 V3 布局确认/);
    assert.deepEqual(await checkManifestFiles(v3, root, v3Options), []);
    assert.deepEqual(await checkManifestFiles(manifest, root, workflowOptions), []);
    const reused = { ...workflowOptions, svgPlanContext: { ...workflowOptions.svgPlanContext, workItemId: 'next-work-item' } };
    assert.match((await checkManifestFiles(manifest, root, reused)).join('\n'), /拥有者未获授权复用/);
    reused.svgPlanContext.resolveLayoutOwner = () => layoutReview.workItemId;
    assert.deepEqual(await checkManifestFiles(manifest, root, reused), []);
    const changed = structuredClone(manifest);
    const changedAsset = changed.assets[0];
    delete changedAsset.svg_rasterization;
    delete (changedAsset.production_contract ?? changedAsset).expected_assets[0].svg_source_file;
    assert.match((await checkManifestFiles(changed, root, workflowOptions)).join('\n'), /资产范围偏离 V3 冻结计划/);

    manifest.visualStage = 'V5';
    manifest.visualStageState = 'v5-runtime-integration-candidate';
    const finalOptions = { ...workflowOptions, stage: 'V5' };
    assert.deepEqual(await checkManifestFiles(manifest, root, finalOptions), []);

    const otherPng = await rasterizeSvg(Buffer.from(svgSource.replace('#da7e44', '#32a7a3')), { width: 64, height: 96, alpha: 'transparent' });
    await writeFile(join(root, expected.runtime_file), otherPng);
    await writeFile(join(root, expected.source_file), otherPng);
    receipt.output_sha256 = createHash('sha256').update(otherPng).digest('hex');
    assert.match((await checkManifestFiles(manifest, root, finalOptions)).join('\n'), /正式 PNG 与冻结 SVG 的转换结果不一致/);
  });
}

test('单栈安装使用已安装的统一工具依赖执行 SVG 转换', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'installed-svg-production-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await installSkills({ projectRoot: root, stacks: ['cocos'] });
  const base = join(root, '.agents', 'skills');
  // 单栈安装器不联网，本用例复用仓库已锁定的依赖模拟工具的正常安装状态。
  const dependencies = fileURLToPath(new URL('../node_modules', import.meta.url));
  await symlink(dependencies, join(base, 'app-skill-runtime', 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const spec = await readFile(join(base, 'app-domain-toolkit', 'references', 'svg-single-image-reconstruction.md'), 'utf8');
  assert.match(spec, /viewBox/);
  await writeFile(join(root, 'icon.svg'), svgSource);
  const reviewRef = await svgReview(root, 'icon.svg', svgSource, { assetId: 'icon', workItemId: 'work', candidateId: 'candidate' });
  const script = join(base, 'app-domain-toolkit', 'scripts', 'visual', 'svg-rasterization.mjs');
  const result = spawnSync(process.execPath, [script, '--source', 'icon.svg', '--output', 'icon.png',
    '--width', '64', '--height', '96', '--alpha', 'transparent', '--source-review', reviewRef.path], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).output_file, 'icon.png');
});
