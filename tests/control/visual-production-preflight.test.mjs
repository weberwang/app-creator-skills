import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

const stacks = [
  { name: "cocos", asset: "cocos-game-asset-integration" },
  { name: "phaser", asset: "phaser4-game-asset-integration" },
  { name: "threejs", asset: "threejs-game-asset-integration" },
];

/** 按既有有效清单构造未制作的 V3 资源，仅保留计划路径和冻结规格。 */
function plannedManifest(fixtures) {
  const manifest = fixtures.validAiManifest();
  manifest.visualStage = "V3";
  manifest.visualStageState = "v3-production-planning-complete";
  manifest.effect_image_reconstruction.lifecycle = "v3-ready";
  manifest.fidelity_cases = [];
  delete manifest.production_contract_audit;
  const asset = manifest.assets[0];
  asset.status = "planned";
  for (const field of [
    "generation_record", "runtime_consumption", "output_file", "width", "height", "alpha", "sha256",
    "output_sha256", "file_sha256", "normalization_record", "output", "output_metadata",
  ]) delete asset[field];
  return manifest;
}

/** 构造与冻结区域一致的实施单元，覆盖真实的实施包校验入口。 */
function implementationPackage(manifest) {
  const region = manifest.coverage_audit.regions.find((item) => item.image_generation_required === true);
  return {
    visualProductionUnits: [{
      ...structuredClone(region), region_id: region.id, unitId: "planned-unit", owner: "fixture",
      ownedPaths: ["art"], outputPaths: ["public"], format: "png",
    }],
  };
}

/** 检测针对实际生成记录的报错，避免混入计划中 generation_record_required 字段的校验。 */
function generationErrors(errors) {
  return errors.filter((message) => /缺少 generation_record，无法证明|generation_record\.record_id/.test(message));
}

for (const stack of stacks) {
  const fixtures = await import(`../../skills/${stack.asset}/scripts/visual-manifest-test-fixtures.mjs`);
  const { validateManifest, checkManifestFiles } = await import(`../../skills/${stack.asset}/scripts/validate_visual_manifest.mjs`);
  const production = await import(`../../skills/${stack.name}-domain-contracts/scripts/visual-production-contract.mjs`);
  const layoutOptions = stack.name === "cocos"
    ? (await import("../../skills/cocos-domain-contracts/scripts/v2-layout-source-test-fixtures.mjs")).fixtureLayoutSourceOptions
    : (options) => options;

  test(`${stack.name} V3 图片计划可在没有真实产物时预检，V4 严格核验`, async (t) => {
    const manifest = plannedManifest(fixtures);
    const pkg = implementationPackage(manifest);
    const asset = manifest.assets[0];
    const root = mkdtempSync(join(tmpdir(), "visual-preflight-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const structural = () => validateManifest(manifest, layoutOptions({ ...fixtures.STRUCTURAL_FILE_GATE_OPTIONS, stage: "V3" }));
    const coverage = (stage) => production.validateVisualProductionCoverage(manifest, { stage, requireManualConfirmation: false });
    const units = (stage) => production.validateVisualProductionUnits(pkg, manifest, { stage });
    assert.equal(asset.source_file, "art/hero-cutout.png");
    assert.deepEqual(asset.runtime_outputs, ["public/assets/hero.png"]);
    assert.deepEqual(structural(), []);
    assert.deepEqual(generationErrors(coverage("V3")), []);
    assert.deepEqual(generationErrors(units("V3")), []);
    // 计划可以先登记路径，但不可脱离当前冻结的原子资源目标。
    for (const [field, invalid] of [["source_file", "art/other.png"], ["runtime_outputs", ["public/other.png"]]]) {
      const original = asset[field];
      asset[field] = invalid;
      for (const errors of [structural(), coverage("V3"), units("V3")]) {
        assert(errors.some((message) => message.includes(`计划 ${field}`)), errors.join("\n"));
      }
      asset[field] = original;
    }

    // V3 文件门应把源与运行路径当成计划，不要求尚未生产的 PNG。
    const missingOutput = (errors) => errors.filter((message) =>
      /(?:art\/hero-cutout\.png|public\/assets\/hero\.png)/.test(message)
      && /不存在|无法读取|ENOENT/.test(message));
    assert.deepEqual(missingOutput(await checkManifestFiles(manifest, root, { stage: "V3" })), []);

    manifest.visualStage = "V4";
    manifest.visualStageState = "v4-formal-acceptance-complete";
    assert(generationErrors(validateManifest(manifest, layoutOptions({ ...fixtures.STRUCTURAL_FILE_GATE_OPTIONS, stage: "V4" }))).length);
    assert(generationErrors(coverage("V4")).length);
    assert(generationErrors(units("V4")).length);
    assert(missingOutput(await checkManifestFiles(manifest, root, { stage: "V4" })).length);
    const completed = fixtures.validAiManifest();
    completed.visualStage = "V4";
    completed.visualStageState = "v4-formal-acceptance-complete";
    completed.effect_image_reconstruction.lifecycle = "v3-ready";
    completed.fidelity_cases = [];
    assert.deepEqual(validateManifest(completed, layoutOptions({ ...fixtures.STRUCTURAL_FILE_GATE_OPTIONS, stage: "V4" })), []);

    manifest.visualStage = "V3";
    manifest.visualStageState = "v3-production-planning-complete";
    asset.generation_record = {};
    assert(generationErrors(structural()).some((message) => message.includes("record_id")));
    assert(generationErrors(coverage("V3")).some((message) => message.includes("record_id")));
    assert(generationErrors(units("V3")).some((message) => message.includes("record_id")));
    delete asset.generation_record;
    asset.output_file = "public/assets/hero.png";
    assert(generationErrors(structural()).length, "已声明实际产物时不得仍按空计划处理");
    assert(generationErrors(coverage("V3")).length, "区域预检必须处理已声明的实际产物");
    assert(generationErrors(units("V3")).length, "实施单元必须处理已声明的实际产物");
    delete asset.output_file;
    asset.runtime_consumption = {};
    assert(generationErrors(structural()).length, "已提交运行记录时不得仍按空计划处理");
    assert(generationErrors(coverage("V3")).length);
    assert(generationErrors(units("V3")).length);
    delete asset.runtime_consumption;
    for (const [field, value] of [["width", 64], ["height", 96], ["sha256", "a".repeat(64)]]) {
      asset[field] = value;
      assert(generationErrors(structural()).length, `已提供实际 ${field} 时必须核验生成记录`);
      assert(generationErrors(coverage("V3")).length);
      assert(generationErrors(units("V3")).length);
      delete asset[field];
    }
  });

  test(`${stack.name} 生图合同支持禁止替换和经用户变更，禁止替换时仍阻断替换结果`, () => {
    const manifest = fixtures.validAiManifest();
    const region = manifest.coverage_audit.regions.find((item) => item.image_generation_required === true);
    const schema = JSON.parse(readFileSync(new URL(`../../skills/${stack.name}-domain-contracts/references/implementation-package.schema.json`, import.meta.url), "utf8"));
    const validateUnit = new Ajv2020({ strict: false, allErrors: true, validateFormats: false }).compile({
      $schema: schema.$schema, $defs: schema.$defs, $ref: "#/$defs/visualProductionUnit",
    });
    for (const policy of ["forbid", "user-change-request-only"]) {
      const errors = production.validateProductionContract({ ...region, substitution_policy: policy }, { stage: "V3" });
      assert(!errors.some((message) => message.includes("substitution_policy")), errors.join("\n"));
      const unit = { ...implementationPackage(manifest).visualProductionUnits[0], substitution_policy: policy };
      validateUnit(unit);
      assert(!validateUnit.errors?.some((error) => error.instancePath === "/substitution_policy"), JSON.stringify(validateUnit.errors));
    }
    region.substitution_policy = "forbid";
    const audit = manifest.production_contract_audit.units.find((item) => item.region_id === region.id);
    audit.substitution = { status: "substituted" };
    const errors = production.validateProductionAuditShape(manifest, { stage: "V4" });
    assert(errors.some((message) => message.includes("substitution_policy=forbid 不允许 substituted")), errors.join("\n"));
  });

  test(`${stack.name} 计划期生成资源 Schema 允许尚未产生生成记录`, () => {
    const manifest = fixtures.validAiManifest();
    const region = manifest.coverage_audit.regions.find((item) => item.image_generation_required === true);
    const schema = JSON.parse(readFileSync(new URL(`../../skills/${stack.name}-domain-contracts/references/implementation-package.schema.json`, import.meta.url), "utf8"));
    const validateExpected = new Ajv2020({ strict: false, allErrors: true, validateFormats: false }).compile({
      $schema: schema.$schema, $defs: schema.$defs, $ref: "#/$defs/imageGenerationExpectedAsset",
    });
    const expected = { ...region.expected_assets[0], origin: "generated" };
    assert.equal(validateExpected(expected), true, JSON.stringify(validateExpected.errors));
    const provided = { ...expected, origin: "provided", generation_record: {} };
    assert.equal(validateExpected(provided), false);
    assert(validateExpected.errors.some((error) => error.keyword === "not" && error.instancePath === ""), JSON.stringify(validateExpected.errors));
  });
}
