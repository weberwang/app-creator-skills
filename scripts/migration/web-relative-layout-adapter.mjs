/** 三栈迁移时保留原生模型，并把真实布局节点接到统一相对布局校验器。 */
import { FLOATING_RUNTIME_HELPER, RELATIVE_LAYOUT_HELPER, RELATIVE_LAYOUT_IMPORT } from './web-relative-layout-code.mjs';

const PREFIXES = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const PARENTS = Object.freeze({
  'safe-area': 'viewport',
  'ui-root': 'safe-area',
  title: 'ui-root',
  'content-panel': 'ui-root',
  'scroll-content': 'content-panel',
  'primary-action': 'ui-root',
});

/** 仅替换已审阅的唯一边界，上游结构变化时要求重新审查。 */
function replaceOnce(text, before, after, label) {
  const index = text.indexOf(before);
  if (index < 0 || text.indexOf(before, index + before.length) >= 0) throw new Error(`${label} 的迁移边界缺失或重复`);
  return text.slice(0, index) + after + text.slice(index + before.length);
}

/** 在现有六个真实区域中补齐父级身份；不把定位参照误当作功能父级。 */
function adaptTemplate(text, stack) {
  const document = JSON.parse(text);
  if (stack === 'cocos' && document.schema_version === '2.0.0') return text;
  if (!Array.isArray(document.regions) || document.regions.length !== Object.keys(PARENTS).length) throw new Error(`${stack} UI 模板区域发生变化`);
  const start = text.indexOf('  "regions": [');
  const end = text.indexOf('  "layout_nodes":', start);
  if (start < 0 || end < 0) throw new Error(`${stack} UI 模板区域边界缺失`);
  let section = text.slice(start, end);
  const newline = section.includes('\r\n') ? '\r\n' : '\n';
  for (const region of document.regions) {
    if (!Object.hasOwn(PARENTS, region.id) || region.positioning !== 'relative' || Object.hasOwn(region, 'parent_id')) throw new Error(`${stack} UI 模板父级或定位策略发生变化`);
    const marker = `      "id": "${region.id}",`;
    section = replaceOnce(section, marker, `${marker}${newline}      "parent_id": "${PARENTS[region.id]}",`, `${stack}/${region.id} 区域`);
  }
  let output = text.slice(0, start) + section + text.slice(end);
  if (stack !== 'cocos') {
    const example = output.indexOf('  "layout_node_example":');
    const layout = output.indexOf('"ui_layout": {', example);
    if (example < 0 || layout < 0) throw new Error(`${stack} 效果图节点示例缺少 ui_layout`);
    const marker = '"ui_layout": {';
    const after = layout + marker.length;
    output = output.slice(0, after) + `${newline}      "positioning": "relative",` + output.slice(after);
  }
  JSON.parse(output);
  return output;
}

/** 在原生 UI 职责字段白名单保留浮层类型；最终父子/参照必须由公共校验器核对。 */
function adaptOrganization(text, stack) {
  let output = replaceOnce(text, 'const FIELDS = new Set(["grouping_basis",', 'const FIELDS = new Set(["positioning", "floating_root_kind", "grouping_basis",', `${stack} ui_layout 字段表`);
  const marker = '  const bases = value.grouping_basis;';
  const checks = [
    '  // 这两个声明会进入节点身份投影；只能由实际浮层本体使用独立定位。',
    '  if (Object.hasOwn(value, "positioning") && !["relative", "absolute"].includes(value.positioning)) errors.push(label + ".positioning 只允许 relative 或 absolute");',
    '  if (Object.hasOwn(value, "floating_root_kind") && !["popup", "floating", "toast"].includes(value.floating_root_kind)) errors.push(label + ".floating_root_kind 必须为 popup/floating/toast");',
    marker,
  ].join('\n');
  output = replaceOnce(output, marker, checks, `${stack} ui_layout 策略校验`);
  return output;
}

/** 在确认拆解时复核原始元素树，避免错误事实生成布局图后才被发现。 */
function adaptDecomposition(text, stack) {
  let output = `${RELATIVE_LAYOUT_IMPORT}${text}`;
  const marker = '  validateUiInteractionTree(elements, errors, label);';
  output = replaceOnce(output, marker, `${marker}\n  validateRelativeWebNodes(elements, errors, label, "elements");`, `${stack} 拆解树`);
  const anchor = 'const CONTAINER_ROLES = ';
  output = replaceOnce(output, anchor, `${RELATIVE_LAYOUT_HELPER}\n${anchor}`, `${stack} 拆解校验器`);
  return output;
}

/** 三栈在普通区域和最终实际节点两条路径均运行公共相对布局门。 */
function adaptValidator(text, stack) {
  let output = text.replace(/^#![^\n]*\n/, (line) => `${line}\n${RELATIVE_LAYOUT_IMPORT}`);
  if (output === text) throw new Error(`${stack} UI 校验器缺少 CLI 入口`);
  const regions = 'function validateRegions(document, spaces, errors, specialized) {';
  output = replaceOnce(output, regions, `${RELATIVE_LAYOUT_HELPER}\n${regions}`, `${stack} UI 校验入口`);
  // 仅独立本体允许省略锚点和参照；保留显式提供的参照校验。
  const fields = 'for (const field of ["semantic_role", "parent_space", "reference_id", "positioning", "layout_group", "layout_participation", "scroll", "input", "clip", "origin", "layout_anchor"]) if (!isString(region[field]))';
  const independent = 'region.positioning === "absolute" && ["popup", "floating", "toast"].includes(region.floating_root_kind)';
  output = replaceOnce(output, fields, `${fields.replace('if (!isString(region[field]))', `if (!(field === "reference_id" && ${independent} && !Object.hasOwn(region, field)) && !isString(region[field]))`)}`, `${stack} 区域参照字段`);
  output = replaceOnce(output, 'validateAnchors(region.anchors, label, errors); validateSize(region.size, label, errors);', `if (!(${independent} && !Object.hasOwn(region, "anchors"))) validateAnchors(region.anchors, label, errors); validateSize(region.size, label, errors);`, `${stack} 浮层锚点`);
  const refGraph = 'if (!isObject(region) || !ids.has(region.id)) return; if (region.reference_id !== "viewport"';
  output = replaceOnce(output, refGraph, `if (!isObject(region) || !ids.has(region.id)) return; if (${independent} && !Object.hasOwn(region, "reference_id")) return; if (region.reference_id !== "viewport"`, `${stack} 区域参照图`);
  const regionCall = 'const ids = validateRegions(document, spaces, errors, specialized);';
  output = replaceOnce(output, regionCall, `${regionCall} validateRelativeWebNodes(document.regions, errors, "regions", "regions");`, `${stack} 普通区域校验`);
  if (stack === 'cocos') {
    const resolver = '      resolveSceneV2LayoutSource(scene, {';
    output = replaceOnce(output, resolver, '      const relativeLayoutSource = resolveSceneV2LayoutSource(scene, {', 'Cocos V2 布局来源');
    const end = '        forceLayoutSourceFiles: sourceOptions.forceLayoutSourceFiles,\n      });';
    output = replaceOnce(output, end, `${end}\n      validateRelativeWebNodes(relativeLayoutSource.nodes, errors, "scene_contract.layout_nodes", "nodes");`, 'Cocos V2 实际节点');
    const files = 'try { resolveSceneV2LayoutSource(scene, { projectRoot, layoutSourceDocuments: sources, forceLayoutSourceFiles: true }); }';
    output = replaceOnce(output, files, 'try { const relativeLayoutSource = resolveSceneV2LayoutSource(scene, { projectRoot, layoutSourceDocuments: sources, forceLayoutSourceFiles: true }); validateRelativeWebNodes(relativeLayoutSource.nodes, errors, "scene_contract.layout_nodes", "nodes"); }', 'Cocos 文件门实际节点');
  } else {
    const nodes = '  if (requiresLayoutNodes) validateUiInteractionTree(nodes.map((node) => ({ element_id: node?.layout_node_id, parent_element_id: node?.parent_layout_node_id, ui_layout: node?.ui_layout })), errors, "layout_nodes");';
    output = replaceOnce(output, nodes, `${nodes}\n  if (requiresLayoutNodes) validateRelativeWebNodes(nodes, errors, "layout_nodes", "nodes");`, `${stack} 效果图节点`);
  }
  return output;
}

/** 保留固定尺寸专项提示，同时将普通绝对定位测试改为明确拒绝。 */
function adaptLegacyTest(text, stack) {
  if (stack === 'cocos') return text;
  const old = 'test("绝对和固定布局触发专项审查", () => { const document = copy(); document.regions[2].positioning = "absolute"; document.regions[2].size.strategy = "fixed"; const result = validateContract(document); assert.equal(result.status, "passed", JSON.stringify(result)); assert(result.specialized_review.includes("title:absolute-positioning")); assert(result.specialized_review.includes("title:fixed-size")); });';
  const updated = 'test("普通 UI 绝对定位被拒绝且固定尺寸仍触发专项审查", () => { const document = copy(); document.regions[2].positioning = "absolute"; document.regions[2].size.strategy = "fixed"; const result = validateContract(document); assert.equal(result.status, "failed", JSON.stringify(result)); assert(result.errors.some((item) => item.includes("普通 UI 必须相对布局")), JSON.stringify(result)); assert(result.specialized_review.includes("title:fixed-size")); });';
  return replaceOnce(text, old, updated, `${stack} 绝对定位测试`);
}

/** 运行检查只豁免浮层本体对宿主的中心锚定，继续验证父子事实、完整快照和内部关系。 */
function adaptRuntime(text, stack, name) {
  const body = '(node?.ui_layout ?? node?.uiLayout)?.positioning === "absolute" && ["popup", "floating", "toast"].includes((node?.ui_layout ?? node?.uiLayout)?.floating_root_kind)';
  const neutral = `{ ...node, axis_alignment: { horizontal: "left", vertical: "top" }, center_alignment: undefined }`;
  if (stack === 'phaser' && name === 'layout-runtime-evidence.mjs') {
    const marker = '.filter((node) => !isSyntheticLayoutRoot(node));';
    return replaceOnce(text, marker, `.filter((node) => !isSyntheticLayoutRoot(node))\n      .map((node) => ${body} ? ${neutral} : node);`, 'Phaser 浮层本体运行居中');
  }
  let output = `${RELATIVE_LAYOUT_IMPORT}${text}`;
  const signature = stack === 'cocos'
    ? 'export function validateLayoutRuntimeSnapshots(nodes, measurements, errors = [], label = "layout_geometry.component_snapshots") {'
    : 'export function validateLayoutRuntimeSnapshots(nodes, geometry, errors = [], label = "layout_geometry", context = {}) {';
  output = replaceOnce(output, signature, `${signature}\n  validateRelativeWebNodes(nodes, errors, label + ".layout_nodes", "nodes");`, `${stack} 运行布局树`);
  if (stack === 'threejs') {
    const call = '  validateRuntimeCentering(businessNodes, snapshotsById, errors, label);';
    output = replaceOnce(output, call, `  validateFloatingRuntimeOffsets(businessNodes, snapshotsById, errors, label, (a, b) => Math.abs(a - b) <= BOUNDS_EPSILON, (snapshot) => snapshot);\n  validateRuntimeCentering(businessNodes.map((node) => ${body} ? ${neutral} : node), snapshotsById, errors, label);`, 'Three.js 浮层本体运行居中');
  } else if (stack === 'cocos') {
    const call = '    validateCenterAlignmentNodes(observedNodes, errors, `${label}.observed_center_alignment`);';
    output = replaceOnce(output, call, `    validateCenterAlignmentNodes(observedNodes.map((node) => ${body} ? ${neutral} : node), errors, \`${'${label}'}.observed_center_alignment\`);`, 'Cocos 浮层本体运行居中');
    const runtimeCall = '  validateObservedCenterAlignment(nodesById, snapshotsById, label, errors);';
    output = replaceOnce(output, runtimeCall, `  validateFloatingRuntimeOffsets([...nodesById.values()], snapshotsById, errors, label, sameNumber, (item) => item?.component_snapshot);\n${runtimeCall}`, 'Cocos 浮层内部运行锚点');
  } else {
    const finish = '  return errors.length === 0;\n}';
    output = replaceOnce(output, finish, '  validateFloatingRuntimeOffsets(businessNodes, snapshotsById, errors, label, (a, b) => Math.abs(a - b) <= 1e-6 || matchesFloat32Budget(a, b), (snapshot) => snapshot);\n  return errors.length === 0;\n}', 'Phaser 浮层内部运行锚点');
  }
  return `${output.trimEnd()}\n\n${RELATIVE_LAYOUT_HELPER}\n${FLOATING_RUNTIME_HELPER}\n`;
}

/** 仅按审核过的技术栈来源精确变换；公共 checker 和各栈原生工具均保持独立职责。 */
export function adaptWebRelativeLayout(text, { stack, sourcePath } = {}) {
  const prefix = PREFIXES[stack];
  if (!prefix || typeof text !== 'string' || typeof sourcePath !== 'string') return { text, transforms: [] };
  const layoutRoot = `skills/${prefix}-game-ui-layout/`;
  const assetRoot = `skills/${prefix}-game-asset-integration/`;
  const source = text.replaceAll('\r\n', '\n');
  let output = text;
  if (sourcePath === `${layoutRoot}scripts/validate_ui_layout_contract.mjs`) output = adaptValidator(source, stack);
  else if (sourcePath === `${layoutRoot}scripts/validate_ui_layout_contract.test.mjs` && stack !== 'cocos') output = adaptLegacyTest(source, stack);
  else if (stack === 'cocos' && sourcePath === `${layoutRoot}assets/ui-layout-contract-template.yaml`) return { text, transforms: [] };
  else if (sourcePath === `${layoutRoot}assets/ui-layout-contract-template.yaml` || (stack === 'cocos' && sourcePath === `${layoutRoot}assets/ordinary-ui-layout-contract-template.yaml`)) output = adaptTemplate(source, stack);
  else if (sourcePath === `${assetRoot}scripts/ui-layout-organization.mjs`) output = adaptOrganization(source, stack);
  else if (sourcePath === `${assetRoot}scripts/decomposition-elements.mjs`) output = adaptDecomposition(source, stack);
  else if ((stack === 'cocos' && sourcePath === `${layoutRoot}scripts/widget-runtime.mjs`)
    || (stack === 'phaser' && [ `${layoutRoot}scripts/layout-runtime.mjs`, `${layoutRoot}scripts/layout-runtime-evidence.mjs` ].includes(sourcePath))
    || (stack === 'threejs' && sourcePath === `${layoutRoot}scripts/layout-runtime.mjs`)) output = adaptRuntime(source, stack, sourcePath.split('/').at(-1));
  return output === text ? { text, transforms: [] } : { text: output, transforms: ['enforce-relative-ui-layout'] };
}
