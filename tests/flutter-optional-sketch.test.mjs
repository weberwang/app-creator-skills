import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { adaptFlutterOptionalSketch } from '../scripts/migration/native-manual-renderer.mjs';
import { adaptFlutterVisualReview } from '../scripts/migration/flutter-visual-review-adapter.mjs';

/** 读取仓库中实际发布的 Flutter 规范，不依赖项目外部源是否安装。 */
function published(path) {
  return readFileSync(resolve('skills', path), 'utf8');
}

test('Flutter 页面目标以真实功能验证为前提，草图与精确还原按需选择', () => {
  const manual = published('app-stack-flutter/references/native-contracts.md');
  const routing = published('flutter-app-orchestrator/references/technical-orchestration.md');
  const profile = JSON.parse(published('app-stack-flutter/profile.json'));
  assert.match(manual, /V1 实际验证功能和页面语义后进入 V2 目标设计/);
  assert.match(manual, /仅选用草图路线时需要相应审阅/);
  assert.doesNotMatch(manual, /仅在 Code Sketch Review 通过后生成页面目标图|不得在 Code Sketch Review 前生成页面目标/);
  assert.match(manual, /仅明确要求 exact 时将同一 layout-spec 升级/);
  assert.match(routing, /仅选择草图路线时才执行相应草图审阅/);
  assert.match(routing, /截图由用户人工检查/);
  assert(profile.nativeRules.some((rule) => /草图按风险选择/.test(rule)));
});

test('源材料适配保持可选草图语义且不替代真实目标确认', () => {
  const source = '仅在 Code Sketch Review 通过后生成页面目标图。高保真目标是最终视觉来源，但不能静默改变已审语义合同、状态、导航、滚动、断点、无障碍或 ownership。\n不得在 Code Sketch Review 前生成页面目标；';
  const adapted = adaptFlutterOptionalSketch(source);
  assert.match(adapted, /V1 实际验证功能/);
  assert.match(adapted, /仅选用草图路线时需要相应审阅/);
  assert.match(adapted, /视觉目标须由用户确认/);
  assert.doesNotMatch(adapted, /仅在 Code Sketch Review 通过后生成页面目标图|不得在 Code Sketch Review 前生成页面目标/);
});

test('目标图材料区分用户视觉检查与可选草图审阅', () => {
  const rubric = published('flutter-hifi-mockup/references/mockup-review-rubric.md');
  const decisions = published('flutter-hifi-mockup/references/page-design-decision-template.md');
  const prompt = published('flutter-app-orchestrator/references/mockup-self-review-prompt-template.md');
  assert.match(rubric, /user checks image appearance/i);
  assert.match(rubric, /Code Sketch review if used: Pass \/ N\/A/);
  assert.match(decisions, /Code Sketch 按需使用/);
  assert.match(decisions, /仅 `exact` 强制/);
  assert.match(prompt, /未经用户明确授权不得自动分析截图或效果图/);
});

test('Flutter 普通专业审核允许直接实现，默认可用性而非精确还原', () => {
  const manual = published('app-stack-flutter/references/native-contracts.md');
  const rubric = published('flutter-quality-review/references/review-rubric.md');
  const orchestration = published('flutter-subagent-delivery/references/design-subagent-orchestration.md');
  const plan = published('flutter-implementation-plan/references/implementation-plan-template.md');
  assert.match(manual, /flutter-quality-review\/references\/review-rubric\.md/);
  assert.match(rubric, /V1 verifies real functionality and page semantics/);
  assert.match(rubric, /Code Sketch and its independent review are required only when the sketch route is selected/);
  assert.match(rubric, /Only explicitly selected `exact` mode requires a complete target↔Flutter parity contract/);
  assert.match(rubric, /Only `exact` mode requires critical axes within 1 logical px/);
  assert.match(rubric, /screenshots are checked by the user unless automatic visual verification is explicitly requested/);
  assert.doesNotMatch(rubric, /generated only after a validated sketch spec|^- Critical axes are within 1 logical px/m);
  assert.match(orchestration, /白盒、Code Sketch 按风险选择/);
  assert.match(orchestration, /仅明确选择 `exact` 时/);
  assert.match(plan, /Code Sketch is optional and selected by risk/);
  assert.match(plan, /full precision parity is required only for explicitly selected `exact`/);
});

test('迁移适配器保留可选草图及分级视觉验收规则', () => {
  const cases = [
    ['flutter-quality-review/references/review-rubric.md', '- Page-level high-fidelity target was generated only after a validated sketch spec, production Code Sketch/tests, and independent Code Sketch Review.', /Code Sketch and its independent review are required only when the sketch route is selected/],
    ['flutter-subagent-delivery/references/design-subagent-orchestration.md', '| Code Sketch | 生产骨架、稳定 key、关系测试 | 建重复页、自审放行 |', /Code Sketch（可选）/],
    ['flutter-implementation-plan/references/implementation-plan-template.md', '- Entry condition: all business-flow levels, module/page functionality, and required high-fidelity restoration are complete.', /only for explicitly selected `exact`/],
  ];
  for (const [path, source, expected] of cases) {
    const result = adaptFlutterVisualReview(source, path);
    assert.match(result, expected);
    assert.equal(adaptFlutterVisualReview(result, path), result);
  }
});
