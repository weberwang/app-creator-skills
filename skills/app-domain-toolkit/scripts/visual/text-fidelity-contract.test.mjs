/** 通过三栈真实 V5 场景入口验证文本事实、素材和容差绑定。 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

for (const stack of ["cocos", "phaser", "threejs"]) {
  const root = new URL(`../../../${stack}-domain-contracts/`, import.meta.url);
  const { textEffectImageContract, effectImageManifest, textNode } = await import(new URL("scripts/scene-reconstruction-test-fixtures.mjs", root));
  const { validateSceneReconstructionContract } = await import(new URL("scripts/scene-reconstruction-contract.mjs", root));
  const sourceOptions = stack === "cocos"
    ? (await import(new URL("scripts/v2-layout-source-test-fixtures.mjs", root))).fixtureLayoutSourceOptions
    : (options) => options;
  const validators = ["evidence-manifest", "work-item", "implementation-package"].map((name) => {
    const schema = JSON.parse(readFileSync(new URL(`references/${name}.schema.json`, root), "utf8"));
    return new Ajv2020({ strict: false }).compile({ $schema: schema.$schema, $defs: schema.$defs, $ref: "#/$defs/sceneTextNode" });
  });
  const validateSchema = validators[0];

  /** 构造有效文本，并通过真实场景合同的 V5 门检查。 */
  function scenario() {
    const contract = textEffectImageContract();
    const node = contract.text_decomposition.text_nodes[0];
    const validate = () => validateSceneReconstructionContract(contract, { ...effectImageManifest(contract), visualStage: "V5" }, sourceOptions({ stage: "V5" }));
    return { contract, node, runtime: node.runtime_verification, validate };
  }

  /** 检查机器合同应拒绝给定变异，且保留具体错误定位。 */
  function rejects(value, message) {
    const errors = value.validate();
    assert.ok(errors.some((error) => error.includes(message)), errors.join("\n"));
  }

  test(`${stack} V5 只比较冻结目标和实际测量，禁止覆盖镜像或注入空比较`, () => {
    const value = scenario();
    assert.deepEqual(value.validate(), []);
    value.runtime.glyph_bounds.x += 100;
    rejects(value, "超出预声明 tolerance");
    value.runtime.target_glyph_bounds = { ...value.runtime.glyph_bounds };
    rejects(value, "target_glyph_bounds 未绑定");
    delete value.runtime.target_glyph_bounds;
    value.runtime.target_measurement = {};
    value.runtime.candidate_measurement = {};
    rejects(value, "不得替换验证器构造的比较事实");
    delete value.runtime.target_measurement;
    delete value.runtime.candidate_measurement;
    value.runtime.candidate_glyph_bounds = { ...value.runtime.glyph_bounds, x: 1 };
    rejects(value, "candidate_glyph_bounds 未绑定");
    delete value.runtime.candidate_glyph_bounds;
    value.runtime.target_baseline = 999;
    rejects(value, "target_baseline 未绑定");
  });

  test(`${stack} V5 必须核对真实文案、字体及完整排版事实`, () => {
    for (const [field, bad] of Object.entries({ font_family: "Wrong Sans", font_size: 12, font_weight: 100, fill: "#000000", line_count: 3, letter_spacing: 4, font_style: "italic", line_height: 44, alignment: "left", font_size_unit: "physical-px", stroke: { enabled: false }, shadow: { enabled: true }, wrap: { mode: "wrap", width: 390 } })) {
      const value = scenario();
      delete value.runtime.actual_typography[field];
      rejects(value, field === "font_family" ? "字体身份" : `actual_typography.${field}`);
      value.runtime.actual_typography[field] = bad;
      rejects(value, field === "font_family" ? "font_family" : field);
    }
    const value = scenario();
    delete value.runtime.actual_content;
    rejects(value, "actual_content");
    value.runtime.actual_content = "退出游戏";
    rejects(value, "actual_content");
    value.runtime.actual_typography = {};
    value.node.approved_exception_ids = ["accepted-difference"];
    value.runtime.exception_ids = ["accepted-difference"];
    rejects(value, "actual_typography.font_size");
    value.runtime.actual_typography = textNode().runtime_verification.actual_typography;
    value.runtime.actual_content = "开始游戏";
    value.runtime.baseline = false;
    rejects(value, "baseline 必须具有与冻结目标相同的有效类型和结构");
  });

  test(`${stack} 几何和字重容差不得混用、改单位或替换引用`, () => {
    const value = scenario();
    const rules = value.contract.predeclared_tolerances[0].rules;
    value.runtime.glyph_bounds.x += 50;
    rules.typography = { font_weight: { unit: "weight", value: 100 } };
    rejects(value, "glyph_bounds.x");
    value.contract.predeclared_tolerances.push({ id: "loose", rules: { geometry: { unit: "logical-px", value: 100 } } });
    value.runtime.tolerance_reference = "loose";
    rejects(value, "tolerance_reference 必须与冻结引用一致");
    value.runtime.tolerance_reference = "layout-tolerance";
    value.runtime.glyph_bounds.x -= 50;
    rules.geometry.unit = "physical-px";
    rejects(value, "geometry 容差必须包含非负 value 和匹配单位");
    rules.geometry.unit = "logical-px";
    value.runtime.actual_typography.font_weight = 650;
    assert.deepEqual(value.validate(), []);
    rules.typography.font_weight.unit = "logical-px";
    rejects(value, "typography.font_weight 容差");
  });

  test(`${stack} 批准差异也不得豁免单位及对象字号和行高有效性`, () => {
    const value = scenario();
    value.node.approved_exception_ids = ["visual-difference"];
    value.runtime.exception_ids = ["visual-difference"];
    value.runtime.actual_typography.font_size_unit = "physical-px";
    rejects(value, "actual_typography.font_size_unit 缺失或无效");
    assert.equal(validateSchema(value.node), false);
    value.runtime.actual_typography.font_size_unit = "logical-px";
    value.node.typography_target.font_size = { value: 32, unit: "logical-px" };
    value.runtime.actual_typography.font_size = { value: 32, unit: "logical-px" };
    assert.deepEqual(value.validate(), []);
    assert.equal(validateSchema(value.node), true, JSON.stringify(validateSchema.errors));
    value.runtime.actual_typography.font_size.value = -1;
    rejects(value, "actual_typography.font_size 缺失或无效");
    assert.equal(validateSchema(value.node), false);
    value.runtime.actual_typography.font_size = { value: 32, unit: "game-px" };
    rejects(value, "actual_typography.font_size 缺失或无效");
    value.runtime.actual_typography.font_size.unit = "logical-px";
    value.node.typography_target.line_height = { value: 38, unit: "logical-px" };
    value.runtime.actual_typography.line_height = { value: 0, unit: "logical-px" };
    rejects(value, "actual_typography.line_height 缺失或无效");
    assert.equal(validateSchema(value.node), false);
    value.runtime.actual_typography.line_height.value = 38;
    assert.deepEqual(value.validate(), []);
    assert.equal(validateSchema(value.node), true, JSON.stringify(validateSchema.errors));
    value.runtime.actual_typography.stroke.enabled = "no";
    rejects(value, "actual_typography.stroke 缺失或无效");
    value.runtime.actual_typography.stroke.enabled = true;
    value.node.typography_target.stroke.unit = "logical-px";
    value.runtime.actual_typography.stroke.unit = "physical-px";
    rejects(value, "actual_typography.stroke 缺失或无效");
  });

  test(`${stack} 字体身份未知时绑定冻结替代字体`, () => {
    const value = scenario();
    value.node.typography_target.font_identity = { status: "unresolved", confidence: "low", observable_facts: { silhouette: "bold" } };
    value.node.font_resolution = { strategy: "substitute", family: "Replacement Sans" };
    value.runtime.actual_typography.font_family = "Replacement Sans";
    assert.deepEqual(value.validate(), []);
    value.runtime.actual_typography.font_family = "Other Sans";
    rejects(value, "font_family");
    delete value.node.font_resolution.family;
    rejects(value, "替代方案必须冻结实际使用的 family");
  });

  test(`${stack} 动态和本地化内容绑定冻结语言、输入、来源及预期`, () => {
    const value = scenario();
    value.node.dynamic = true;
    value.node.localizable = true;
    value.node.content_source = "reward.label";
    value.node.content_cases = [{ case_id: "zh-3", locale: "zh-CN", inputs: { count: 3 }, content_source: "reward.label", expected_content: "领取 3 个" }];
    Object.assign(value.runtime, { content_case_id: "zh-3", actual_locale: "zh-CN", actual_inputs: { count: 3 }, actual_content_source: "reward.label", actual_content: "领取 3 个" });
    assert.deepEqual(value.validate(), []);
    value.runtime.actual_inputs.count = 4;
    rejects(value, "实际语言、输入及内容来源");
    value.runtime.actual_inputs.count = 3;
    value.runtime.actual_content = "领取 4 个";
    rejects(value, "actual_content");
    value.runtime.actual_content = "领取 3 个";
    value.runtime.content_case_id = "other";
    rejects(value, "content_case_id 必须绑定唯一冻结用例");
    value.node.content_cases = "invalid";
    rejects(value, "非空 content_cases");
  });

  test(`${stack} 原生、位图、图片与混合路线各自绑定对应运行事实`, () => {
    const value = scenario();
    assert.deepEqual(value.validate(), []);
    value.node.implementation_route = "bitmap-text";
    value.node.required_resources = [{ kind: "bitmap-font-descriptor", path: "assets/font.fnt" }, { kind: "bitmap-font-texture", path: "assets/font.png" }];
    // Cocos 位图字体仍由 Label 渲染，路线身份由字体描述和纹理共同证明。
    value.runtime.renderer = stack === "cocos" ? "cc.Label" : "bitmap-text";
    value.runtime.actual_font_resources = ["assets/font.fnt", "assets/font.png"];
    assert.deepEqual(value.validate(), []);
    value.runtime.actual_font_resources.pop();
    rejects(value, "actual_font_resources");
    value.runtime.actual_font_resources.push("assets/font.png");
    value.node.implementation_route = "hybrid";
    value.node.ownership = { runtime_text: "runtime", visual_effects: "asset" };
    value.node.required_resources.push({ kind: "visual-effect", path: "assets/effect.png" });
    value.node.required_resources.push({ kind: "texture", path: "assets/decoration.png" });
    value.runtime.renderer = ["bitmap-text", "sprite"];
    value.runtime.actual_image_path = "assets/effect.png";
    assert.deepEqual(value.validate(), []);
    value.runtime.actual_image_path = "assets/wrong.png";
    rejects(value, "绑定冻结视觉资源");
    value.node.implementation_route = "image-text";
    value.node.ownership = "asset";
    value.node.required_resources = [{ kind: "image", path: "assets/brand.png" }];
    value.node.accessible_semantic = { text: "开始游戏", role: "button" };
    value.node.runtime_verification = { renderer: "image-text", actual_bounds: { ...value.node.target_bounds }, actual_geometry_unit: "logical-px", actual_coordinate_space: "viewport-logical", actual_test_id: value.node.planned_test_id, evidence: ["evidence/image.json"], passed: true, asset_consumed: true, actual_image_path: "assets/brand.png", actual_semantic: { role: "button", text: "开始游戏" }, semantic_evidence: ["evidence/semantic.json"] };
    assert.deepEqual(value.validate(), []);
    value.node.runtime_verification.actual_semantic.text = "退出游戏";
    rejects(value, "actual_semantic 必须绑定");
  });

  test(`${stack} 文本 schema 与路线、实际排版和动态案例约束一致`, () => {
    const node = textNode();
    assert.equal(validateSchema(node), true, JSON.stringify(validateSchema.errors));
    delete node.runtime_verification.actual_typography.font_size;
    assert.equal(validateSchema(node), false);
    node.runtime_verification.actual_typography.font_size = 32;
    node.dynamic = true;
    assert.equal(validateSchema(node), false);
    node.content_source = "game.title";
    node.content_cases = [{ case_id: "default", locale: "zh-CN", inputs: {}, content_source: "game.title", expected_content: "开始游戏" }];
    Object.assign(node.runtime_verification, { content_case_id: "default", actual_locale: "zh-CN", actual_inputs: {}, actual_content_source: "game.title" });
    assert.equal(validateSchema(node), true, JSON.stringify(validateSchema.errors));
    node.runtime_verification.target_measurement = {};
    assert.equal(validateSchema(node), false);
    delete node.runtime_verification.target_measurement;
    node.runtime_verification.comparison = { target_measurement: {} };
    assert.equal(validateSchema(node), false);
    const imageNode = textNode({ implementation_route: "image-text", ownership: "visual", required_resources: [{ kind: "image", path: "assets/brand.png" }], accessible_semantic: { text: "开始游戏" } });
    imageNode.runtime_verification = { renderer: "image-text", actual_bounds: imageNode.target_bounds, actual_geometry_unit: "logical-px", actual_coordinate_space: "viewport-logical", actual_test_id: imageNode.planned_test_id, evidence: ["image.json"], passed: true, asset_consumed: true, actual_image_path: "assets/brand.png", actual_semantic: { text: "开始游戏" }, semantic_evidence: ["semantic.json"] };
    assert.equal(validateSchema(imageNode), true, JSON.stringify(validateSchema.errors));
  });

  test(`${stack} 三类 schema 入口一致约束真实字体和有效几何`, () => {
    for (const validate of validators) {
      const node = textNode();
      assert.equal(validate(node), true, JSON.stringify(validate.errors));
      delete node.typography_target.geometry_unit;
      assert.equal(validate(node), false);
      node.typography_target.geometry_unit = "logical-px";
      delete node.runtime_verification.actual_font_resources;
      assert.equal(validate(node), false);
      node.runtime_verification.actual_font_resources = ["assets/fonts/game-sans.woff2"];
      node.runtime_verification.actual_typography.font_size_unit = "physical-px";
      assert.equal(validate(node), false);
      node.runtime_verification.actual_typography.font_size_unit = "logical-px";
      node.runtime_verification.actual_typography.font_size = { value: -1, unit: "logical-px" };
      assert.equal(validate(node), false);
    }
  });

  test(`${stack} 实际渲染器和坐标单位遵循各栈路线`, () => {
    const value = scenario();
    if (stack === "cocos") value.runtime.renderer = "cc.Label";
    if (stack === "phaser") value.runtime.renderer = "Phaser.GameObjects.Text";
    if (stack === "threejs") {
      value.runtime.renderer = "CSS2DObject";
      value.node.typography_target.font_size_unit = "css-px";
      value.runtime.actual_typography.font_size_unit = "css-px";
      rejects(value, "跨单位或未预定义坐标空间必须提供匹配的 geometry_mapping");
      assert.equal(validateSchema(value.node), false);
      value.node.typography_target.geometry_mapping = { coordinate_space: "viewport-logical", unit: "logical-px", basis: "CSS 到视口逻辑坐标的映射", evidence: "evidence/css-mapping.json" };
    }
    assert.deepEqual(value.validate(), []);
    if (stack === "threejs") {
      value.runtime.renderer = "world";
      value.node.typography_target.font_size_unit = "world-unit";
      value.runtime.actual_typography.font_size_unit = "world-unit";
      value.node.typography_target.geometry_mapping = { coordinate_space: "viewport-logical", unit: "logical-px", basis: "相机投影及视口变换", evidence: "evidence/world-projection.json" };
      assert.deepEqual(value.validate(), []);
      assert.equal(validateSchema(value.node), true, JSON.stringify(validateSchema.errors));
      delete value.node.typography_target.geometry_mapping.evidence;
      rejects(value, "跨单位或未预定义坐标空间必须提供匹配的 geometry_mapping");
      assert.equal(validateSchema(value.node), false);
      value.node.typography_target.geometry_mapping.evidence = "evidence/world-projection.json";
      value.runtime.actual_geometry_unit = "world-unit";
      rejects(value, "实际几何单位和坐标空间必须绑定");
      value.runtime.actual_geometry_unit = "logical-px";
      value.contract.predeclared_tolerances[0].rules.geometry.unit = "world-unit";
      rejects(value, "geometry 容差必须包含非负 value 和匹配单位 logical-px");
      value.node.typography_target.geometry_unit = "world-unit";
      value.runtime.actual_geometry_unit = "world-unit";
      rejects(value, "viewport-logical 的 geometry_unit 必须为 logical-px");
      assert.equal(validateSchema(value.node), false);
    }
  });
}
