import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

const legacyHash = 'sha256:3347ae013f4b70c7d6e5a4d14584fc5d8c68df40dd23347e48402336b84563e8';

/** 使用同一冻结部件检查三栈候选的语义身份。 */
function region() {
  return { id: 'button', annotation_number: 1, scene_id: 'main', state_id: 'default',
    owner_type: 'fixed-production-visual', production_origin: 'independent-production',
    production_method: 'authored-raster', delivery_kind: 'raster-image',
    image_generation_required: false, generation_record_required: false, substitution_policy: 'forbid',
    expected_assets: [{ asset_id: 'button', component_id: 'button', state_id: 'default',
      asset_scope: 'atomic-component', atomic_visual_key: 'button',
      source_file: 'art/button.png', runtime_file: 'assets/button.png' }] };
}

for (const [stack, adapter] of [['cocos', 'cocos'], ['phaser', 'phaser4'], ['threejs', 'threejs']]) {
  test(`${stack} 的 SVG 制作源绑定区域确认和实施包`, async () => {
    const base = new URL(`../../${adapter}-game-asset-integration/scripts/effect_image_annotation_core.mjs`, import.meta.url);
    const contract = new URL(`../../${stack}-domain-contracts/scripts/visual-component-contract.mjs`, import.meta.url);
    const schemaUrl = new URL(`../../${stack}-domain-contracts/references/implementation-package.schema.json`, import.meta.url);
    const { computeRegionDefinitionSha256 } = await import(base);
    const { visualComponentContractDifferences, normalizeComponentExpectedAsset } = await import(contract);
    const original = region();
    assert.equal(computeRegionDefinitionSha256(original), legacyHash);
    assert.equal(Object.hasOwn(normalizeComponentExpectedAsset(original.expected_assets[0]), 'svg_source_file'), false);
    const withSvg = structuredClone(original);
    withSvg.expected_assets[0].svg_source_file = 'art/source/button.svg';
    assert.notEqual(computeRegionDefinitionSha256(withSvg), legacyHash);
    assert.deepEqual(visualComponentContractDifferences(original, withSvg), ['expected_assets']);
    const changed = structuredClone(withSvg);
    changed.expected_assets[0].svg_source_file = 'art/source/other.svg';
    assert.notEqual(computeRegionDefinitionSha256(changed), computeRegionDefinitionSha256(withSvg));
    assert.deepEqual(visualComponentContractDifferences(withSvg, changed), ['expected_assets']);
    const schema = JSON.parse(readFileSync(schemaUrl, 'utf8'));
    const validator = new Ajv2020({ strict: false }).compile({ $schema: schema.$schema, $defs: schema.$defs, $ref: '#/$defs/visualExpectedAsset' });
    assert.equal(validator(withSvg.expected_assets[0]), true, JSON.stringify(validator.errors));
    const invalid = { ...withSvg.expected_assets[0], svg_source_file: 17 };
    assert.equal(validator(invalid), false);
  });
}
