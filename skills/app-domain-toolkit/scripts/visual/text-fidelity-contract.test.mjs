/** 通过三栈真实 V5 场景入口验证文本事实、素材和容差绑定。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { validateTextFidelity } from './text-fidelity-contract.mjs';

test('已确认试装逐项对比实际用例，不能借此放行缺失或改变的测量', () => {
  const actual = { renderer: 'bitmap-text', font_loaded: true, fallback_detected: false, actual_visible: true,
    actual_bounds: { x: 1 }, glyph_bounds: { x: 2 }, baseline: { y: 3 }, actual_geometry_unit: 'logical-px',
    actual_coordinate_space: 'viewport-logical', actual_test_id: 'label-test', actual_content: '10',
    actual_font_resources: ['font.fnt'], content_case_id: 'ten', actual_locale: 'zh-CN', actual_inputs: { value: 10 },
    actual_content_source: { key: 'coins' }, actual_typography: { font_family: 'font' } };
  const node = { text_node_id: 'label', dynamic: true, content_cases: [{ case_id: 'ten', expected_content: '10', locale: 'zh-CN',
    inputs: { value: 10 }, content_source: { key: 'coins' } }] };
  const run = () => validateTextFidelity({ node, raw: actual, read: (key) => actual[key], route: 'bitmap-text',
    approvedTextTrial: new Map([['label', { cases: [structuredClone(actual)] }]]) });
  assert.deepEqual(run(), []);
  const approved = new Map([['label', { cases: [structuredClone(actual)] }]]);
  actual.glyph_bounds.x = 20;
  const errors = validateTextFidelity({ node, raw: actual, read: (key) => actual[key], route: 'bitmap-text', approvedTextTrial: approved });
  assert.match(errors.join('\n'), /glyph_bounds/);
  delete actual.actual_typography;
  assert.match(validateTextFidelity({ node, raw: actual, read: (key) => actual[key], route: 'bitmap-text', approvedTextTrial: approved }).join('\n'), /actual_typography/);
});

for (const stack of ["cocos", "phaser", "threejs"]) {
  const root = new URL(`../../../${stack}-domain-contracts/`, import.meta.url);
  const { textEffectImageContract, effectImageManifest, textNode } = await import(new URL("scripts/scene-reconstruction-test-fixtures.mjs", root));
  const { validateSceneReconstructionContract } = await import(new URL("scripts/scene-reconstruction-contract.mjs", root));
  const { validateSceneTextDecomposition } = await import(new URL("scripts/scene-text-decomposition-contract.mjs", root));
  const prefix = stack === 'phaser' ? 'phaser4' : stack;
  const { validateManifest } = await import(new URL(`../../../${prefix}-game-asset-integration/scripts/validate_visual_manifest.mjs`, import.meta.url));
  const sourceOptions = stack === "cocos"
    ? (await import(new URL("scripts/v2-layout-source-test-fixtures.mjs", root))).fixtureLayoutSourceOptions
    : (options) => options;
  const validators = ["evidence-manifest", "work-item", "implementation-package"].map((name) => {
    const schema = JSON.parse(readFileSync(new URL(`references/${name}.schema.json`, root), "utf8"));
    return new Ajv2020({ strict: false }).compile({ $schema: schema.$schema, $defs: schema.$defs, $ref: "#/$defs/sceneTextNode" });
  });
  const validateSchema = validators[0];

  test(`${stack} V4 资源验收要求实际文字试装，V5 拒绝沿用试装批次`, (t) => {
    const { contract, node, runtime, validate } = scenario();
    const projectRoot = mkdtempSync(join(tmpdir(), 'v4-text-trial-'));
    t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
    const identity = { stack, workItemId: 'work-a', sceneId: 'main', stateId: 'default', candidateId: 'candidate-a',
      referenceTarget: { path: 'target.png', sha256: 'a'.repeat(64) } };
    const trialIdentity = { ...identity, visualStage: 'V4' };
    const measurement = structuredClone(runtime);
    const report = { ...trialIdentity, schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', runId: 'trial-a',
      nodes: [{ textNodeId: node.text_node_id, layoutNodeId: node.layout_node_id, componentPath: 'Canvas/title', measurement }] };
    const options = sourceOptions({ projectRoot, requireNativeTextReadback: true, textReadbackIdentity: trialIdentity, stage: 'V4' });
    const manifest = { schema_version: '1.5', assets: [], scene_reconstruction_contract: contract };
    /** 保存同一试装批次的当前读数与资源评审引用。 */
    function saveTrial() {
      const bytes = JSON.stringify(report);
      writeFileSync(join(projectRoot, 'v4-text.json'), bytes);
      trialIdentity.runtimeEvidenceRef = { path: 'v4-text.json', sha256: createHash('sha256').update(bytes).digest('hex') };
      runtime.evidence = [trialIdentity.runtimeEvidenceRef];
    }
    saveTrial();
    const v4 = () => validateManifest(manifest, options).join('\n');
    assert.doesNotMatch(v4(), /原生文字|runtime_verification|实际字体/);
    delete node.runtime_verification;
    assert.match(v4(), /缺少 runtime_verification/);
    node.runtime_verification = runtime;
    const actualContent = runtime.actual_content;
    report.nodes[0].measurement.actual_content = runtime.actual_content = '';
    saveTrial();
    assert.match(v4(), /actual_content/);
    report.nodes[0].measurement.actual_content = runtime.actual_content = actualContent;
    report.nodes[0].measurement.actual_visible = runtime.actual_visible = false;
    saveTrial();
    assert.match(v4(), /actual_visible 必须为 true/);
    report.nodes[0].measurement.actual_visible = runtime.actual_visible = true;
    delete report.visualStage;
    saveTrial();
    assert.match(v4(), /visualStage 未绑定当前目标/);
    assert.match(validate({ ...options, stage: 'V5', textReadbackIdentity: { ...identity, runtimeEvidenceRef: trialIdentity.runtimeEvidenceRef }, textTrialRunId: report.runId }).join('\n'), /V4 试装读数不能作为 V5/);
  });

  /** 构造有效文本，并通过真实场景合同的 V5 门检查。 */
  function scenario() {
    const contract = textEffectImageContract();
    const node = contract.text_decomposition.text_nodes[0];
    const validate = (options = {}) => validateSceneReconstructionContract(contract, { ...effectImageManifest(contract), visualStage: "V5" }, sourceOptions({ stage: "V5", ...options }));
    return { contract, node, runtime: node.runtime_verification, validate };
  }

  if (stack === 'cocos') test('Cocos V5 清单的重复复核保留已批准试装与独立运行读数', (t) => {
    const { contract, node, runtime } = scenario();
    const projectRoot = mkdtempSync(join(tmpdir(), 'cocos-approved-v5-'));
    t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
    node.typography_target.font_identity = { status: 'unresolved', confidence: 'unknown', observable_facts: { text: '可见' } };
    node.font_resolution = { strategy: 'project-font', family: 'Game Sans' };
    Object.assign(runtime, { content_case_id: 'default', actual_locale: 'zh-CN', actual_inputs: {}, actual_content_source: 'fixture' });
    const approvedTextTrial = new Map([[node.text_node_id, { cases: [structuredClone(runtime)] }]]);
    const identity = { stack: 'cocos', workItemId: 'work-a', sceneId: 'main', stateId: 'default', candidateId: 'candidate-a',
      referenceTarget: { path: 'target.png', sha256: 'a'.repeat(64) } };
    const report = { ...identity, schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', visualStage: 'V5',
      runId: 'formal-run', nodes: [{ textNodeId: node.text_node_id, layoutNodeId: node.layout_node_id, componentPath: 'Canvas/Title',
        measurement: structuredClone(runtime) }] };
    const bytes = JSON.stringify(report);
    writeFileSync(join(projectRoot, 'runtime-text.json'), bytes);
    identity.runtimeEvidenceRef = { path: 'runtime-text.json', sha256: createHash('sha256').update(bytes).digest('hex') };
    runtime.evidence = [identity.runtimeEvidenceRef];
    const manifest = { ...effectImageManifest(contract), schema_version: '1.5', assets: [], visualStage: 'V5',
      visualStageState: 'v5-runtime-integration-candidate', visual_production_gate: {} };
    const options = sourceOptions({ projectRoot, stage: 'V5', requireNativeTextReadback: true,
      textReadbackIdentity: identity, textTrialRunId: 'v4-trial', approvedTextTrial });
    assert.doesNotMatch(validateManifest(manifest, options).join('\n'), /字体目标仍待人工确认|原生文字运行证据无效|文字试装对比不一致/);
    assert.match(validateManifest(manifest, { ...options, approvedTextTrial: undefined }).join('\n'), /字体目标仍待人工确认/);
  });

  /** 检查机器合同应拒绝给定变异，且保留具体错误定位。 */
  function rejects(value, message) {
    const errors = value.validate();
    assert.ok(errors.some((error) => error.includes(message)), errors.join("\n"));
  }

  test(`${stack} 普通路线对明确分类的文字执行样式门，无文字可跳过`, () => {
    const source = textEffectImageContract();
    const node = source.text_decomposition.text_nodes[0];
    const layoutNode = { layout_node_id: node.layout_node_id, region_id: node.region_id, element_type: 'text', target_bounds: node.target_bounds };
    const region = { region_id: node.region_id, layout_node_ids: [node.layout_node_id] };
    const contract = { target_conditions: source.target_conditions, predeclared_tolerances: source.predeclared_tolerances };
    const options = { stage: 'V3', regions: [region], layoutInfo: { nodes: [layoutNode], nodeById: new Map([[node.layout_node_id, layoutNode]]) } };
    assert.match(validateSceneTextDecomposition(contract, options).join('\n'), /缺少 text_node/);
    contract.text_decomposition = { applicability: 'has-text', text_nodes: [node] };
    assert.deepEqual(validateSceneTextDecomposition(contract, options), []);
    delete node.typography_target.fill;
    assert.match(validateSceneTextDecomposition(contract, options).join('\n'), /fill/);
    node.typography_target.fill = '#ffffffff';
    options.stage = 'V5';
    node.runtime_verification.actual_typography.font_size = 12;
    assert.match(validateSceneTextDecomposition(contract, options).join('\n'), /font_size/);
    node.runtime_verification.actual_typography.font_size = node.typography_target.font_size;
    assert.deepEqual(validateSceneTextDecomposition(contract, options), []);
    assert.deepEqual(validateSceneTextDecomposition({}, { stage: 'V5', layoutInfo: { nodes: [] } }), []);
  });

  test(`${stack} 正式 V5 从原生运行文件核对当前文字和目标`, (t) => {
    const value = scenario();
    const projectRoot = mkdtempSync(join(tmpdir(), 'text-readback-test-'));
    t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
    const identity = { stack, workItemId: 'work-a', sceneId: 'main', stateId: 'default', candidateId: 'candidate-a', referenceTarget: { path: 'target.png', sha256: 'a'.repeat(64) } };
    const measurement = structuredClone(value.runtime);
    const report = { schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', runId: 'run-a', ...identity,
      nodes: [{ textNodeId: value.node.text_node_id, layoutNodeId: value.node.layout_node_id, componentPath: 'Canvas/title', measurement }] };
    const options = { projectRoot, requireNativeTextReadback: true, textReadbackIdentity: identity };
    /** 保存合成原生报告并更新本节点已有运行证据引用。 */
    function saveReport() {
      const bytes = Buffer.from(JSON.stringify(report));
      writeFileSync(join(projectRoot, 'readback.json'), bytes);
      value.runtime.evidence = [{ path: 'readback.json', sha256: createHash('sha256').update(bytes).digest('hex') }];
      identity.runtimeEvidenceRef = { ...value.runtime.evidence[0] };
    }
    saveReport();
    assert.doesNotMatch(value.validate(options).join('\n'), /原生文字/);
    const [observed] = report.nodes.splice(0, 1);
    saveReport();
    assert.match(value.validate(options).join('\n'), /缺少唯一的实际组件读数/);
    report.nodes.push(observed);
    // 样式读数相同也无法代表已显示，必须核对同次运行的有效可见状态。
    observed.measurement.actual_visible = false;
    saveReport();
    assert.match(value.validate(options).join('\n'), /actual_visible.*原生运行读数/);
    value.runtime.actual_visible = false;
    assert.match(value.validate(options).join('\n'), /actual_visible 必须为 true/);
    observed.measurement.actual_visible = true;
    value.runtime.actual_visible = true;
    saveReport();
    // 实际视觉清单入口也必须把原生读数选项传到同一文本校验器。
    delete value.contract.effect_image_reconstruction;
    const manifest = { schema_version: '1.5', assets: [], scene_reconstruction_contract: value.contract };
    const manifestOptions = sourceOptions({ ...options, stage: 'V5' });
    assert.doesNotMatch(validateManifest(manifest, manifestOptions).join('\n'), /原生文字/);
    value.runtime.evidence = ['screenshot.png'];
    assert.match(validateManifest(manifest, manifestOptions).join('\n'), /运行 JSON/);
    saveReport();
    value.contract.effect_image_reconstruction = { applicability: 'effect-image' };
    report.nodes[0].measurement.actual_typography.font_size = 20;
    saveReport();
    assert.match(value.validate(options).join('\n'), /actual_typography.*原生运行读数/);
    report.nodes[0].measurement.actual_typography.font_size = value.runtime.actual_typography.font_size;
    report.candidateId = 'old-candidate';
    saveReport();
    assert.match(value.validate(options).join('\n'), /candidateId/);
    report.candidateId = identity.candidateId;
    report.workItemId = 'old-work';
    saveReport();
    assert.match(value.validate(options).join('\n'), /workItemId/);
    report.workItemId = identity.workItemId;
    saveReport();
    writeFileSync(join(projectRoot, 'readback.json'), '{}');
    assert.match(value.validate(options).join('\n'), /摘要不一致/);
    value.runtime.evidence = ['截图.png'];
    assert.match(value.validate(options).join('\n'), /运行 JSON/);
  });

  test(`${stack} 图片文字的实际资源、颜色和透明度必须与运行证据一致`, (t) => {
    const value = scenario();
    const projectRoot = mkdtempSync(join(tmpdir(), 'image-text-readback-test-'));
    t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
    const imageBytes = Buffer.from('合成图片字标资源');
    writeFileSync(join(projectRoot, 'title.png'), imageBytes);
    const imageSha = createHash('sha256').update(imageBytes).digest('hex');
    const identity = { stack, workItemId: 'work-a', sceneId: 'main', stateId: 'default', candidateId: 'candidate-a', referenceTarget: { path: 'target.png', sha256: 'a'.repeat(64) } };
    value.node.implementation_route = 'image-text';
    value.node.ownership = 'visual';
    value.node.required_resources = [{ kind: 'image', path: 'title.png', sha256: imageSha }];
    value.node.accessible_semantic = { text: '开始游戏' };
    value.node.typography_target.image_tint = { r: 1, g: 1, b: 1 };
    value.node.typography_target.image_opacity = 1;
    value.node.runtime_verification = { actual_visible: true, renderer: 'image-text', actual_bounds: value.node.target_bounds, actual_geometry_unit: 'logical-px', actual_coordinate_space: 'viewport-logical', actual_test_id: value.node.planned_test_id, passed: true, asset_consumed: true, actual_image_path: 'title.png', actual_image_sha256: imageSha, actual_image_tint: { r: 1, g: 1, b: 1 }, actual_image_opacity: 1, actual_semantic: { text: '开始游戏' }, semantic_evidence: ['semantic.json'] };
    const runtime = value.node.runtime_verification;
    const report = { schemaVersion: 'web-native-text-readback/1.0', measurementSource: 'runtime-component', runId: 'run-a', ...identity, nodes: [{ textNodeId: value.node.text_node_id, layoutNodeId: value.node.layout_node_id, componentPath: 'Canvas/title', measurement: structuredClone(runtime) }] };
    const options = { projectRoot, requireNativeTextReadback: true, textReadbackIdentity: identity };
    /** 更新同批原生回读及公共布局证据引用。 */
    function saveReport() {
      const bytes = Buffer.from(JSON.stringify(report));
      writeFileSync(join(projectRoot, 'readback.json'), bytes);
      runtime.evidence = [{ path: 'readback.json', sha256: createHash('sha256').update(bytes).digest('hex') }];
      identity.runtimeEvidenceRef = { ...runtime.evidence[0] };
    }
    saveReport();
    assert.doesNotMatch(value.validate(options).join('\n'), /原生文字/);
    value.node.typography_target.image_opacity = 0;
    runtime.actual_image_opacity = 0;
    report.nodes[0].measurement.actual_image_opacity = 0;
    saveReport();
    assert.match(value.validate(options).join('\n'), /文字图片全透明/);
    value.node.typography_target.image_opacity = 1;
    runtime.actual_image_opacity = 1;
    report.nodes[0].measurement.actual_image_opacity = 1;
    saveReport();
    runtime.actual_image_opacity = 0.5;
    assert.match(value.validate(options).join('\n'), /opacity 与目标不一致/);
    runtime.actual_image_opacity = 1;
    report.nodes[0].measurement.actual_image_tint.r = 0.5;
    saveReport();
    assert.match(value.validate(options).join('\n'), /actual_image_tint/);
    report.nodes[0].measurement.actual_image_tint.r = 1;
    saveReport();
    writeFileSync(join(projectRoot, 'title.png'), '已变化的资源');
    assert.match(value.validate(options).join('\n'), /图片内容摘要不一致/);
  });

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

  test(`${stack} 批准其他差异不能代替文字样式一致性及字体确认`, () => {
    const value = scenario();
    value.node.approved_exception_ids = ['other'];
    value.runtime.exception_ids = ['other'];
    value.runtime.actual_typography.font_size = 11;
    rejects(value, 'font_size');
    value.runtime.actual_typography.font_size = value.node.typography_target.font_size;
    value.node.typography_target.font_identity = { status: 'unresolved', confidence: 'unknown', observable_facts: { shape: '窄体' } };
    value.node.font_resolution = { strategy: 'replace', family: value.runtime.actual_typography.font_family };
    rejects(value, '字体目标仍待人工确认');
  });

  test(`${stack} V3 交接位图中未确认样式，V5 报告属性与原因`, () => {
    const value = scenario();
    delete value.node.typography_target.shadow;
    value.node.typography_target.pending_attributes = [{ property: 'shadow', reason: '位图无法区分阴影与材质' }];
    const v3 = validateSceneReconstructionContract(value.contract, effectImageManifest(value.contract), sourceOptions({ stage: 'V3' }));
    assert.doesNotMatch(v3.join('\n'), /typography 缺少或无效 shadow/);
    assert.ok(validators.every((validate) => validate(value.node)), '待确认样式须通过各类 V3 合同');
    rejects(value, 'shadow 待人工确认：位图无法区分阴影与材质');
    value.node.approved_exception_ids = ['other'];
    value.runtime.exception_ids = ['other'];
    rejects(value, 'shadow 待人工确认');
    value.node.typography_target.shadow = { enabled: false };
    rejects(value, '不能同时填写未经确认的目标值');
    delete value.node.typography_target.pending_attributes;
    assert.deepEqual(value.validate(), []);
    delete value.node.typography_target.shadow;
    assert.ok(validators.every((validate) => !validate(value.node)), '无目标且无待确认原因不能通过');
  });

  test(`${stack} 文字颜色及透明度缺失或不一致时拒绝`, () => {
    const value = scenario();
    delete value.node.typography_target.fill;
    rejects(value, "fill");
    assert.equal(validateSchema(value.node), false);
    value.node.typography_target.fill = "#ffffff";
    rejects(value, "颜色及透明度");
    assert.equal(validateSchema(value.node), false);
    value.node.typography_target.fill = "#ffffffff";
    value.runtime.actual_typography.fill = "#ffffff";
    rejects(value, "actual_typography.fill");
    assert.equal(validateSchema(value.node), false);
    value.runtime.actual_typography.fill = "#ffffff80";
    value.node.approved_exception_ids = ["other-difference"];
    value.runtime.exception_ids = ["other-difference"];
    rejects(value, "字体颜色或透明度与目标不一致");
    value.runtime.actual_typography.fill = "#000000ff";
    rejects(value, "字体颜色或透明度与目标不一致");
    value.node.typography_target.fill = { color: "#ffffff", opacity: 0.5 };
    value.runtime.actual_typography.fill = { color: "#ffffff", opacity: 0.5 };
    assert.deepEqual(value.validate(), []);
    assert.ok(validators.every((validate) => validate(value.node)));
    value.runtime.actual_typography.fill.opacity = 0.8;
    rejects(value, "字体颜色或透明度与目标不一致");
    value.runtime.actual_typography.fill.opacity = 2;
    rejects(value, "actual_typography.fill");
    assert.ok(validators.every((validate) => !validate(value.node)));
    value.node.typography_target.fill = { stops: [{ color: "#ffffff", opacity: 0.5 }, { color: "#000000", opacity: 1 }] };
    value.runtime.actual_typography.fill = structuredClone(value.node.typography_target.fill);
    assert.deepEqual(value.validate(), []);
    assert.ok(validators.every((validate) => validate(value.node)));
    delete value.runtime.actual_typography.fill.stops[1].opacity;
    rejects(value, "actual_typography.fill");
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
    rejects(value, "font_weight");
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

  test(`${stack} 字体身份未知时保留人工确认并绑定替代字体`, () => {
    const value = scenario();
    value.node.typography_target.font_identity = { status: "unresolved", confidence: "low", observable_facts: { silhouette: "bold" } };
    value.node.font_resolution = { strategy: "substitute", family: "Replacement Sans" };
    value.runtime.actual_typography.font_family = "Replacement Sans";
    rejects(value, '字体目标仍待人工确认');
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
    value.node.runtime_verification = { actual_visible: true, renderer: "image-text", actual_bounds: { ...value.node.target_bounds }, actual_geometry_unit: "logical-px", actual_coordinate_space: "viewport-logical", actual_test_id: value.node.planned_test_id, evidence: ["evidence/image.json"], passed: true, asset_consumed: true, actual_image_path: "assets/brand.png", actual_semantic: { role: "button", text: "开始游戏" }, semantic_evidence: ["evidence/semantic.json"] };
    assert.deepEqual(value.validate(), []);
    value.node.typography_target.fill = "#ffffff";
    rejects(value, "颜色及透明度");
    value.node.typography_target.fill = "#ffffffff";
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
    imageNode.runtime_verification = { actual_visible: true, renderer: "image-text", actual_bounds: imageNode.target_bounds, actual_geometry_unit: "logical-px", actual_coordinate_space: "viewport-logical", actual_test_id: imageNode.planned_test_id, evidence: ["image.json"], passed: true, asset_consumed: true, actual_image_path: "assets/brand.png", actual_semantic: { text: "开始游戏" }, semantic_evidence: ["semantic.json"] };
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
