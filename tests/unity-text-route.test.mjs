/** 使用真实 Unity 合同和拆解模板验证显著文字的原生路线。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from '../skills/app-skill-runtime/yaml.mjs';

const common = JSON.parse(readFileSync(new URL('../skills/unity-development-workflow/schemas/common.schema.json', import.meta.url), 'utf8'));
const splitSchema = JSON.parse(readFileSync(new URL('../skills/unity-development-workflow/schemas/split-plan.schema.json', import.meta.url), 'utf8'));
const reuseSchema = JSON.parse(readFileSync(new URL('../skills/unity-development-workflow/schemas/reuse-resource-plan.schema.json', import.meta.url), 'utf8'));
const template = YAML.parse(readFileSync(new URL('../skills/unity-development-workflow/templates/split-plan.yaml', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(common);
ajv.addSchema(reuseSchema);
const validateRoute = ajv.compile({ $ref: `${common.$id}#/$defs/visualRouteAnalysis` });
const validateSplit = ajv.compile(splitSchema);
const native = template.items.find((item) => item.visualRouteAnalysis.selectedRoute === 'UNITY_NATIVE').visualRouteAnalysis;

/** 构造基于真实原生模板的显著文字方案；仅改变文本路线相关字段。 */
function distinctiveText() {
  const route = structuredClone(native);
  route.elementType = 'text';
  route.distinctiveVisual.isDistinctive = true;
  route.distinctiveVisual.observedFeatures = ['金属字形、渐变和描边'];
  route.nativeSuitability.primitiveBasis = ['TEXT'];
  return route;
}

/** 构造无法通过原生效果资格的显著文字图片路线。 */
function imageText() {
  const route = distinctiveText();
  route.distinctiveVisual.assetFirstDecision = 'ASSET_FIRST';
  route.selectedRoute = 'IMAGE_ASSET';
  route.routeReason = '当前文字渲染器无法完整还原已确认的字形效果。';
  route.nativeSuitability.eligible = false;
  route.nativeSuitability.reason = '当前文字渲染器缺少目标所需的金属纹理和跨字效果。';
  route.nativeSuitability.evidence.path = 'Artifacts/Visual/Routes/victory-title-capability.yaml';
  route.productionMethod = 'GENERATED_RASTER';
  route.deliveryKind = 'IMAGE_ASSET';
  route.finalOwner = 'FIXED_PRODUCTION_VISUAL';
  return route;
}

/** 校验真实公共 Schema 并在断言失败时显示具体的合同错误。 */
function expectRoute(route, expected) {
  assert.equal(validateRoute(route), expected, JSON.stringify(validateRoute.errors));
}

test('显著文字只在具备原生资格与文字原语时通过', () => {
  expectRoute(native, true);
  expectRoute(distinctiveText(), true);
  const notEligible = distinctiveText();
  notEligible.nativeSuitability.eligible = false;
  expectRoute(notEligible, false);
  const missingEvidence = distinctiveText();
  delete missingEvidence.nativeSuitability.evidence;
  expectRoute(missingEvidence, false);
  const noNativeDecision = distinctiveText();
  noNativeDecision.distinctiveVisual.assetFirstDecision = 'ASSET_FIRST';
  expectRoute(noNativeDecision, false);
});

test('显著非文字或混合原语不能借文字例外通过', () => {
  const shape = structuredClone(native);
  shape.distinctiveVisual.isDistinctive = true;
  expectRoute(shape, false);
  const nonText = distinctiveText();
  nonText.elementType = 'background';
  expectRoute(nonText, false);
  const mixed = distinctiveText();
  mixed.nativeSuitability.primitiveBasis = ['TEXT', 'SHADER'];
  expectRoute(mixed, false);
  const missingType = distinctiveText();
  delete missingType.elementType;
  expectRoute(missingType, false);
  const missingBasis = distinctiveText();
  delete missingBasis.nativeSuitability.primitiveBasis;
  expectRoute(missingBasis, false);
});

test('原有独立图片和可复用资源路线仍有效并保留资格约束', () => {
  const image = template.items.find((item) => item.visualRouteAnalysis.selectedRoute === 'IMAGE_ASSET').visualRouteAnalysis;
  const reuse = template.items.find((item) => item.visualRouteAnalysis.selectedRoute === 'REUSE').visualRouteAnalysis;
  expectRoute(image, true);
  expectRoute(reuse, true);
  const invalidReuse = structuredClone(reuse);
  invalidReuse.reuseSuitability.eligible = false;
  expectRoute(invalidReuse, false);
  const invalidImage = structuredClone(image);
  invalidImage.deliveryKind = 'UNITY_COMPONENT';
  expectRoute(invalidImage, false);
});

test('显著文字缺少原生效果资格时，图片路线通过且错误路线被拒绝', () => {
  const image = imageText();
  expectRoute(image, true);
  const authored = structuredClone(image);
  authored.productionMethod = 'AUTHORED_RASTER';
  expectRoute(authored, true);

  // 合格的现有文字图片可以复用，但仍须保留真实资源绑定。
  const reuse = structuredClone(template.items.find((item) => item.visualRouteAnalysis.selectedRoute === 'REUSE').visualRouteAnalysis);
  reuse.elementType = 'text';
  reuse.nativeSuitability.reason = image.nativeSuitability.reason;
  expectRoute(reuse, true);
  delete reuse.reuseBinding;
  expectRoute(reuse, false);

  // 仅改回原生路线不能绕过实际渲染器不具备目标效果的资格限制。
  const unavailableNative = structuredClone(image);
  unavailableNative.selectedRoute = 'UNITY_NATIVE';
  unavailableNative.distinctiveVisual.assetFirstDecision = 'NATIVE_ALLOWED';
  unavailableNative.productionMethod = 'UNITY_NATIVE';
  unavailableNative.deliveryKind = 'UNITY_COMPONENT';
  unavailableNative.finalOwner = 'RUNTIME_RENDERED';
  expectRoute(unavailableNative, false);

  for (const [field, value] of [
    ['productionMethod', 'UNITY_NATIVE'],
    ['deliveryKind', 'UNITY_COMPONENT'],
    ['finalOwner', 'RUNTIME_RENDERED'],
  ]) {
    const invalid = structuredClone(image);
    invalid[field] = value;
    expectRoute(invalid, false);
  }
});

test('完整拆解合同允许显著文字按图片生产并保持路线字段一致', () => {
  const split = structuredClone(template);
  const annotation = split.annotatedPreview.annotations.find((entry) => entry.visualRouteAnalysis.selectedRoute === 'UNITY_NATIVE');
  const item = split.items.find((entry) => entry.visualRouteAnalysis.selectedRoute === 'UNITY_NATIVE');

  // 标注与正式清单引用同一文本项目，且从程序视觉改为实际图片交付。
  annotation.itemId = 'asset.arena-intro.victory-title';
  annotation.label = '[03][GENERATE] 胜利标题';
  annotation.brief = '生产具有目标金属效果的本地化标题图片。';
  annotation.productionRoute = 'GENERATE';
  annotation.bounds = { x: 128, y: 128, width: 512, height: 128 };
  annotation.semanticGrouping.rationale = '标题是竞技场根节点下的独立文字部件。';
  annotation.layoutBinding.constraints = ['title-safe-margin'];
  annotation.layoutBinding.resizePolicy = 'SCALE_WITH_PARENT';
  annotation.visualRouteAnalysis = imageText();
  annotation.assemblyAnalysis.nodeId = 'node.arena-victory-title';
  annotation.assemblyAnalysis.evidence.path = 'Artifacts/Visual/Assembly/victory-title.yaml';
  item.id = annotation.itemId;
  item.resourceId = 'asset.arena-victory-title';
  item.assetType = 'localized-title-image';
  item.purpose = '胜利标题';
  item.generationBrief = '生产具有目标金属效果的本地化标题图片。';
  item.splitRationale = '当前原生文字渲染器无法完整还原目标效果。';
  item.targetPrefabNodeIds = ['node.arena-victory-title'];
  item.targetPath = 'Assets/Art/Runtime/Scenes/ArenaIntro/victory-title.png';
  item.stateVariants = [{ id: 'default', description: '胜利标题默认状态' }];
  item.bounds = { ...annotation.bounds };
  item.semanticGrouping.rationale = annotation.semanticGrouping.rationale;
  item.layoutBinding.constraints = [...annotation.layoutBinding.constraints];
  item.layoutBinding.resizePolicy = annotation.layoutBinding.resizePolicy;
  item.action = 'GENERATE';
  item.delivery = 'SINGLE_SPRITE';
  item.targetSize = { width: 512, height: 128 };
  item.alphaRequired = true;
  item.pivot = { x: 0.5, y: 0.5 };
  item.pixelsPerUnit = 100;
  item.visualRouteAnalysis = imageText();
  item.assemblyAnalysis.nodeId = 'node.arena-victory-title';
  item.assemblyAnalysis.evidence.path = annotation.assemblyAnalysis.evidence.path;
  assert.equal(validateSplit(split), true, JSON.stringify(validateSplit.errors));

  item.visualRouteAnalysis.productionMethod = 'UNITY_NATIVE';
  assert.equal(validateSplit(split), false);
});

test('完整拆解合同接受显著文字并拒绝非文字借例外进入', () => {
  const split = structuredClone(template);
  assert.equal(validateSplit(split), true, JSON.stringify(validateSplit.errors));
  // 原始模板在图内标注和正式清单分别保存路线，两处均需接受同一文字方案。
  const annotation = split.annotatedPreview.annotations.find((item) => item.visualRouteAnalysis.selectedRoute === 'UNITY_NATIVE');
  const item = split.items.find((entry) => entry.visualRouteAnalysis.selectedRoute === 'UNITY_NATIVE');
  annotation.visualRouteAnalysis = distinctiveText();
  item.visualRouteAnalysis = distinctiveText();
  assert.equal(validateSplit(split), true, JSON.stringify(validateSplit.errors));
  annotation.visualRouteAnalysis.elementType = 'background';
  assert.equal(validateSplit(split), false);
  annotation.visualRouteAnalysis = distinctiveText();
  item.visualRouteAnalysis.nativeSuitability.primitiveBasis.push('SHADER');
  assert.equal(validateSplit(split), false);
});
