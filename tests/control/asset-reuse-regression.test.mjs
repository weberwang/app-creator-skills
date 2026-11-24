import assert from "node:assert/strict";
import { readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";

const stacks = [
  { name: "cocos", asset: "cocos-game-asset-integration" },
  { name: "phaser", asset: "phaser4-game-asset-integration" },
  { name: "threejs", asset: "threejs-game-asset-integration" },
];

/** 为三栈建立相同的项目、目标区域及已验收图片证据。 */
async function makeFixture(t, stack) {
  const fixtures = await import(`../../skills/${stack.asset}/scripts/visual-manifest-test-fixtures.mjs`);
  const gate = await import(`../../skills/${stack.name}-domain-contracts/scripts/visual-confirmation-reuse-gates.mjs`);
  const production = await import(`../../skills/${stack.name}-domain-contracts/scripts/visual-production-contract.mjs`);
  const routes = await import(`../../skills/${stack.name}-domain-contracts/scripts/scene-visual-route-contract.mjs`);
  const tempRoot = realpathSync(tmpdir());
  const root = mkdtempSync(join(tempRoot, "asset-reuse-regression-"));
  t.after(() => {
    const actual = realpathSync(root);
    assert.equal(dirname(actual), tempRoot);
    assert.ok(basename(actual).startsWith("asset-reuse-regression-"));
    rmSync(actual, { recursive: true, force: true });
  });
  const manifest = fixtures.validManifest();
  const region = manifest.coverage_audit.regions[1];
  region.production_method = "reuse";
  region.delivery_kind = "existing-asset";
  region.implementation_plan = { mode: "reuse-existing", summary: "复用图片" };
  await fixtures.createFixtureFiles(root);
  const sourceBytes = fixtures.minimalPng(64, 96);
  const evidence = await fixtures.prepareReuseFixture(root, manifest, region, sourceBytes);
  const sceneRegion = manifest.scene_reconstruction_contract.coverage_regions.find((item) => item.region_id === region.id);
  const options = { projectRoot: root, checkFiles: true, reuseManifest: manifest };
  return { ...fixtures, ...gate, ...routes, ...production, root, manifest, region, sceneRegion, options, sourceBytes, ...evidence };
}

/** 用新的冻结摘要重写证据，以便独立验证字段语义而不是只触发文件摘要错误。 */
function rewriteEvidence(fixture, record) {
  const bytes = Buffer.from(JSON.stringify(record));
  writeFileSync(join(fixture.root, fixture.snapshot.compatibility_evidence_file), bytes);
  fixture.snapshot.compatibility_evidence_sha256 = fixture.sha256Bytes(bytes);
  fixture.sceneRegion.visual_route_analysis.reuse_suitability.evidence.sha256 = fixture.snapshot.compatibility_evidence_sha256;
}

/** 对当前区域执行正式生产文件门。 */
function check(fixture) {
  return fixture.validateReuseProductionGate(fixture.region, { stage: "V4" }, fixture.options);
}

for (const stack of stacks) {
  test(`${stack.name} 图片复用绑定来源版本、目标位置和结构化适配结果`, async (t) => {
    await t.test("有效证据允许复用，说明中的相似字样不会触发误拒", async (st) => {
      const f = await makeFixture(st, stack);
      f.compatibility.notes = "相似度不作为依据，已逐项检查当前状态及外观";
      rewriteEvidence(f, f.compatibility);
      assert.deepEqual(check(f), []);
      const errors = f.validateSceneVisualRouteAnalysis(
        f.sceneRegion, f.manifest.scene_reconstruction_contract,
        { stage: "V3", reuseRegion: f.region }
      );
      assert.deepEqual(errors, []);
    });

    await t.test("占位证据或任意资产 ID 不能代表当前来源", async (st) => {
      const f = await makeFixture(st, stack);
      const analysis = f.sceneRegion.visual_route_analysis;
      analysis.reuse_suitability.exact_asset_identity.asset_id = "unrelated-asset";
      assert(f.validateSceneVisualRouteAnalysis(f.sceneRegion, f.manifest.scene_reconstruction_contract, { stage: "V3", reuseRegion: f.region })
        .some((message) => message.includes("exact_asset_identity")));
      rewriteEvidence(f, { status: "passed" });
      assert(check(f).some((message) => message.includes("compatibility") || message.includes("兼容")));
      writeFileSync(join(f.root, f.snapshot.source_manifest_file), JSON.stringify({ status: "accepted" }));
      f.snapshot.source_manifest_sha256 = f.sha256Bytes(readFileSync(join(f.root, f.snapshot.source_manifest_file)));
      assert(check(f).some((message) => message.includes("source manifest")));
    });

    await t.test("原路径图片替换后拒绝旧版本", async (st) => {
      const f = await makeFixture(st, stack);
      writeFileSync(join(f.root, f.snapshot.source_file), f.minimalPng(128, 192));
      assert(check(f).some((message) => message.includes("source_file") && message.includes("SHA-256")));
    });

    await t.test("不同使用状态、区域或显示位置不能共享旧证据", async (st) => {
      const f = await makeFixture(st, stack);
      for (const [field, value] of [["state_id", "disabled"], ["region_id", "other-region"], ["bounds", { ...f.region.bounds, x: f.region.bounds.x + 1 }]]) {
        const record = structuredClone(f.compatibility);
        record.target[field] = value;
        rewriteEvidence(f, record);
        assert(check(f).some((message) => message.includes(`target.${field}`)), field);
      }
    });

    await t.test("功能一致但样式差异明显时拒绝复用", async (st) => {
      const f = await makeFixture(st, stack);
      f.compatibility.checks.purpose = "match";
      f.compatibility.checks.style.material = "material-difference";
      rewriteEvidence(f, f.compatibility);
      assert(check(f).some((message) => message.includes("style.material")), "样式差异必须阻断复用");
    });

    await t.test("正式运行文件须保持已验收版本", async (st) => {
      const f = await makeFixture(st, stack);
      writeFileSync(join(f.root, f.region.expected_assets[0].runtime_file), f.minimalPng(128, 192));
      assert(check(f).some((message) => message.includes("runtime_file") && message.includes("SHA-256")));
      assert.deepEqual(f.validateReuseProductionGate(f.region, { stage: "V3" }, f.options), []);
    });

    await t.test("字段别名与嵌套合同同样校验 V4/V5 运行图片", async (st) => {
      for (const variant of ["expectedAssets", "production_contract.expected_assets"]) {
        await st.test(variant, async (child) => {
          const f = await makeFixture(child, stack);
          const assets = f.region.expected_assets;
          delete f.region.expected_assets;
          if (variant === "expectedAssets") f.region.expectedAssets = assets;
          else f.region.production_contract = { expected_assets: assets };
          const runtimePath = join(f.root, assets[0].runtime_file);
          writeFileSync(runtimePath, f.minimalPng(128, 192));
          for (const stage of ["V4", "V5"]) {
            const errors = f.validateReuseProductionGate(f.region, { stage }, f.options);
            assert(errors.some((message) => message.includes("runtime_file") && message.includes("SHA-256")), variant + " " + stage);
          }
          delete assets[0].runtime_file;
          for (const stage of ["V4", "V5"]) {
            const errors = f.validateReuseProductionGate(f.region, { stage }, f.options);
            assert(errors.some((message) => message.includes("runtime_file")), variant + " " + stage + " 缺少运行路径");
          }
        });
      }
    });

    await t.test("实施单元在 V3 允许未装配图片，V4 核查运行文件", async (st) => {
      const f = await makeFixture(st, stack);
      const runtimeFile = f.region.expected_assets[0].runtime_file;
      unlinkSync(join(f.root, runtimeFile));
      // 使用当前 coverage 区域构建实施单元，使阶段差异只来自真实入口的复用文件检查。
      const unit = { ...structuredClone(f.region), region_id: f.region.id, unitId: "reuse-unit",
        owner: "art", ownedPaths: ["art"], outputPaths: ["public"], format: "png" };
      const pkg = { visualProductionUnits: [unit] };
      const v3 = f.validateVisualProductionUnits(pkg, f.manifest, { ...f.options, stage: "V3" });
      const v4 = f.validateVisualProductionUnits(pkg, f.manifest, { ...f.options, stage: "V4" });
      assert(!v3.some((message) => message.includes("runtime_file") && message.includes("无法读取")), v3.join("\n"));
      assert(v4.some((message) => message.includes("runtime_file") && message.includes("无法读取")), v4.join("\n"));
    });
  });
}
