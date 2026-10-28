/** 将 Flutter 布局源合同接入共同相对布局校验，保持来源仓库只读。 */
import { readFileSync } from 'node:fs';

const ROOT = 'adaptive-layout-implementation/';
const CHECKS = readFileSync(new URL('./templates/flutter-relative-layout-checks.source', import.meta.url), 'utf8');
const POLICY_IMPORT = 'const { validateRelativeLayoutNodes } = require("../../app-ui-layout/scripts/relative-layout-policy.cjs");';

/** 按唯一锚点修改已审阅的源内容，上游变化必须重新核对。 */
function replaceOnce(text, before, after, label) {
  const start = text.indexOf(before);
  if (start < 0 || text.indexOf(before, start + before.length) >= 0) throw new Error(`Flutter 相对布局的${label}已变化，须重新审查`);
  return text.slice(0, start) + after + text.slice(start + before.length);
}

/** 给既有区域补充实际父级与稳定 Widget key，并显式声明相对定位。 */
function enrichRegion(text, id, role, key) {
  return replaceOnce(text, `  - id: ${id}\n    role: ${role}\n`,
    `  - id: ${id}\n    role: ${role}\n    parent_id: safe_area\n    flutter_key: ${key}\n    positioning: relative\n`, `${id} 区域`);
}

const SHARED_REGIONS = `
  - id: content_column
    role: layout-container
    parent_id: safe_area
    flutter_key: contentColumnKey
    positioning: relative
    anchors:
      horizontal: {center: {relation: centered, reference: viewport.center}}
      vertical: {top: {relation: inset, reference: safe_area.top}}
    size:
      min: {width: 0, height: 0}
      preferred: {width: content_max, height: content}
      max: {width: content_max, height: content}
  - id: primary-action
    role: action
    parent_id: safe_area
    flutter_key: primaryActionKey
    positioning: relative
    anchors:
      horizontal: {center: {relation: centered, reference: safe_area.center}}
      vertical: {bottom: {relation: inset, reference: safe_area.bottom}}
    size:
      min: {width: 48, height: 48}
      preferred: {width: content, height: 48}
      max: {width: content, height: 96}
  - id: dock_avoidance
    role: layout-boundary
    parent_id: safe_area
    flutter_key: dockAvoidanceKey
    positioning: relative
    anchors:
      horizontal: {center: {relation: centered, reference: safe_area.center}}
      vertical: {bottom: {relation: before, reference: primary-action.top}}
    size:
      min: {width: 0, height: 0}
      preferred: {width: content, height: content}
      max: {width: content, height: content}
`;

const FIDELITY_REGIONS = `
  - id: frame
    role: layout-container
    parent_id: safe_area
    flutter_key: pageFrameKey
    positioning: relative
    anchors:
      horizontal: {center: {relation: centered, reference: safe_area.center}}
      vertical: {top: {relation: aligned, reference: safe_area.top}}
    size:
      min: {width: 0, height: 0}
      preferred: {width: content, height: content}
      max: {width: content, height: content}
  - id: brand
    role: branding
    parent_id: frame
    flutter_key: brandKey
    positioning: relative
    anchors:
      horizontal: {center: {relation: centered, reference: frame.center}}
      vertical: {top: {relation: inset, reference: frame.top}}
    size:
      min: {width: 0, height: 0}
      preferred: {width: content, height: content}
      max: {width: content, height: content}
`;

/** 浮层不是所有页面都需要，因此模板保留完整注释示例，不虚构运行时节点。 */
const FLOATING_EXAMPLE = `
  # 需要弹窗时，将下例作为实际 region，并在 overlays 里以相同 id/body_kind 配对。
  # - id: dialog
  #   role: popup
  #   parent_id: safe_area
  #   flutter_key: dialogKey
  #   positioning: absolute
  #   floating_root_kind: popup
  #   size: {min: {width: 100, height: 80}, preferred: {width: 320, height: 240}, max: {width: 640, height: 480}}
  # - id: dialog-action
  #   role: action
  #   parent_id: dialog
  #   flutter_key: dialogActionKey
  #   positioning: relative
  #   anchors:
  #     horizontal: {center: {relation: centered, reference: dialog.center}}
  #     vertical: {top: {relation: inset, reference: dialog.top}}
  #   size: {min: {width: 48, height: 48}, preferred: {width: 80, height: 48}, max: {width: 160, height: 64}}
  # overlay 还需填写 behavior、occlusion、hit_target 和键盘/窄高度回退；内部节点不声明 floating_root_kind。
`;

/** 两阶段模板使用同一父级关系；高保真样例另绑定实际测量 Widget。 */
function adaptTemplate(text, fidelity) {
  let output = enrichRegion(text, 'header', 'navigation', 'headerKey');
  output = enrichRegion(output, 'content', 'primary-content', 'contentKey');
  output = replaceOnce(output, '\nbreakpoints:\n', `${SHARED_REGIONS}${fidelity ? FIDELITY_REGIONS : ''}${FLOATING_EXAMPLE}\nbreakpoints:\n`, '区域结束位置');
  if (fidelity) output = replaceOnce(output, '    reference: page frame semantic bounds\n',
    '    reference: page frame semantic bounds\n    reference_id: frame\n', '高保真参照');
  return output;
}

/** 将统一检查接到原始校验入口，不改变原先的阶段、文本和证据检查。 */
function adaptValidator(text) {
  let output = replaceOnce(text, 'const fs = require("node:fs");', `const fs = require("node:fs");\n${POLICY_IMPORT}`, '校验器导入');
  // 本体独立落位时无需伪造相对锚点；共享检查仍会拒绝无本体身份的 absolute。
  output = replaceOnce(output, '      errors.require(Object.keys(axisAnchors).length > 0, `${path}.anchors.${axis} is required`);',
    '      if (region.positioning !== "absolute") errors.require(Object.keys(axisAnchors).length > 0, `${path}.anchors.${axis} is required`);', '区域锚点');
  output = replaceOnce(output, '    validateAnchor(overlay.anchor, `${path}.anchor`, errors);',
    '    const owner = sequence(spec.regions).map(mapping).find((region) => region.id === overlay.id);\n    if (owner?.positioning !== "absolute" || overlay.anchor !== undefined) validateAnchor(overlay.anchor, `${path}.anchor`, errors);', '浮层本体锚点');
  output = replaceOnce(output, '/** 验证 sketch 与 fidelity 共用的结构合同。 */',
    `${CHECKS.trimEnd()}\n\n/** 验证 sketch 与 fidelity 共用的结构合同。 */`, '校验器结构入口');
  return replaceOnce(output, '  validateRegions(spec, errors);',
    '  validateRegions(spec, errors);\n  validateRelativeLayoutBindings(spec, errors);', '区域校验调用');
}

const POSITIONED_REGIONS = `
  - op: append
    path: regions
    value:
      id: avatar
      role: avatar
      parent_id: header
      flutter_key: avatarKey
      positioning: relative
      anchors:
        horizontal: {center: {relation: centered, reference: header.center}}
        vertical: {top: {relation: aligned, reference: header.top}}
      size:
        min: {width: 32, height: 32}
        preferred: {width: 40, height: 40}
        max: {width: 48, height: 48}
  - op: append
    path: regions
    value:
      id: badge
      role: badge
      parent_id: avatar
      flutter_key: badgeKey
      positioning: relative
      anchors:
        horizontal: {end: {relation: aligned, reference: avatar.end}}
        vertical: {top: {relation: aligned, reference: avatar.top}}
      size:
        min: {width: 8, height: 8}
        preferred: {width: 12, height: 12}
        max: {width: 16, height: 16}
`;

/** 合法 Positioned 是相对头像的实现，必须绑定真实节点而非仅填写理由。 */
function adaptPositionedFixture(text) {
  let output = replaceOnce(text, 'mutations:\n', `mutations:${POSITIONED_REGIONS}`, 'Positioned 夹具区域');
  output = replaceOnce(output, '      signal: Positioned\n',
    '      signal: Positioned\n      element_id: badge\n      flutter_key: badgeKey\n      parent_id: avatar\n      reference_id: avatar\n', 'Positioned 夹具身份');
  return output;
}

/** 根据已跟踪源身份适配 Flutter 工件；未命中的文件完全保持原内容。 */
export function adaptFlutterRelativeLayout(text, { stack, sourcePath } = {}) {
  if (stack !== 'flutter' || typeof sourcePath !== 'string' || !sourcePath.startsWith(ROOT)) return { text, transforms: [] };
  if (typeof text !== 'string') throw new TypeError('Flutter 相对布局适配需要文本');
  const file = sourcePath.slice(ROOT.length);
  const input = text.replaceAll('\r\n', '\n');
  let result;
  if (file === 'scripts/validate-layout-spec.js') result = adaptValidator(input);
  else if (file === 'assets/layout-spec-template.yaml') result = adaptTemplate(input, false);
  else if (file === 'assets/layout-spec-fidelity-template.yaml') result = adaptTemplate(input, true);
  else if (file === 'scripts/fixtures/absolute-positioned-justified.yaml') result = adaptPositionedFixture(input);
  else if (file === 'references/layout-spec.md') {
    result = `${input.trimEnd()}\n\n## 相对布局节点\n\n每个 region 必须声明真实 \`parent_id\`、唯一 \`flutter_key\` 和 \`positioning: relative|absolute\`，锚点必须引用已声明的 region 或固定根 \`viewport\`/\`safe_area\`。仅弹窗、浮窗、Toast 本体可声明对应的 \`floating_root_kind\` 并使用 absolute；本体须绑定同 ID、同 \`body_kind\` 的 overlay，内部节点保持相对并引用本体子树内的节点。实现信号和高保真测量须绑定相同的节点、父级、参照及 Widget key；详见[公共相对布局规范](../../app-ui-layout/references/relative-layout.md)。\n`;
  } else return { text, transforms: [] };
  return { text: result, transforms: ['enforce-flutter-relative-layout'] };
}
