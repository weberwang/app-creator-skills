/** 验证 Flutter 正式布局合同的基准字号、有界适配及测试绑定。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from '../skills/app-skill-runtime/yaml.mjs';
import validator from '../skills/adaptive-layout-implementation/scripts/validate-layout-spec.js';

/** 从实际模板构造独立规格，避免一个用例的变更污染其他测试。 */
function template(name = 'layout-spec-template.yaml') {
  return YAML.parse(readFileSync(new URL(`../skills/adaptive-layout-implementation/assets/${name}`, import.meta.url), 'utf8'));
}

/** 验证定向变更产生预期错误，而不是依赖其他无关字段失败。 */
function rejects(change, expected) {
  const spec = template();
  change(spec);
  const errors = validator.validate(spec)[0];
  assert.ok(errors.some((error) => error.includes(expected)), errors.join('\n'));
}

test('两阶段模板允许已确认标题换行和单行按钮有界缩放', () => {
  for (const name of ['layout-spec-template.yaml', 'layout-spec-fidelity-template.yaml']) {
    const spec = template(name);
    assert.deepEqual(validator.validate(spec)[0], []);
    const heading = spec.text_behavior.font_sizing.styles[0];
    // 已确认标题也可保持单行和固定字号，不能被语义换行策略强迫换行。
    heading.mode = 'single-line';
    assert.deepEqual(validator.validate(spec)[0], []);
  }
});

test('未声明或无界的字号缩放不能冒充有效样式', () => {
  rejects((spec) => { delete spec.text_behavior.font_sizing; }, 'font_sizing.baseline');
  rejects((spec) => { spec.text_behavior.line_break.anti_hacks.font_shrink = 'allowed'; }, 'font_shrink must be unbounded-or-undeclared-forbidden');
  rejects((spec) => { delete spec.text_behavior.font_sizing.styles[2].min_font_size; }, 'min_font_size must be finite and positive');
  for (const value of [NaN, Infinity, -Infinity, 0, -1]) {
    rejects((spec) => { spec.text_behavior.font_sizing.styles[2].min_font_size = value; }, 'min_font_size must be finite and positive');
  }
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].min_font_size = 17; }, 'min_font_size must not exceed design_font_size');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].trigger = 'always'; }, 'trigger must be content-or-width-change');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].failure = 'truncate'; }, 'failure must be revise-layout-or-copy');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[0].trigger = 'content-or-width-change'; }, 'fixed cannot declare shrink trigger or failure');
});

test('正文和按钮的语义边界与正式字号单位不可被绕过', () => {
  rejects((spec) => { spec.text_behavior.font_sizing.styles[1].strategy = 'bounded-shrink'; }, 'body must use wrap and fixed');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].mode = 'wrap'; }, 'control and atomic text must be single-line');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].unit = 'physical-px'; }, 'unit must be logical-px');
  rejects((spec) => { spec.text_behavior.font_sizing.respect_text_scaler = false; }, 'respect_text_scaler must be true');
  rejects((spec) => { spec.text_behavior.font_sizing.baseline = 'fit-first'; }, 'baseline must preserve-confirmed');
  rejects((spec) => { spec.text_behavior.line_break.anti_hacks.manual_line_breaks = 'allowed'; }, 'manual_line_breaks must be undeclared-forbidden');
});

test('样式须绑定唯一身份、真实区域和实际声明的测试', () => {
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].region_id = 'unknown'; }, 'region_id must bind an existing region');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].style_id = 'header-title'; }, 'style_id must be unique');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].test_ids = []; }, 'test_ids must be a non-empty string list');
  rejects((spec) => { spec.text_behavior.font_sizing.styles[2].test_ids = ['unknown_test']; }, 'every text sizing test_id must be declared by invariants');
  rejects((spec) => {
    spec.text_behavior.font_sizing.styles[2].test_ids = ['sizing_only'];
    spec.invariants.push({ id: 'sizing', relation: '按钮保持可读', test_ids: ['sizing_only'] });
  }, 'every text sizing test_id must execute in evidence_matrix');
});

test('字号适配测试必须覆盖最长文案和系统放大组合', () => {
  const spec = template();
  spec.text_behavior.font_sizing.styles[2].test_ids = ['sizing_only'];
  spec.invariants.push({ id: 'sizing', relation: '按钮在系统放大时保持可读', test_ids: ['sizing_only'] });
  // 普通条件下已运行不代表适配能承受最长文案和大字号组合。
  spec.evidence_matrix.cases[0].test_ids.push('sizing_only');
  assert.ok(validator.validate(spec)[0].some((error) => error.includes('every text sizing test_id must execute with longest_copy and large text scale')));
  const stress = spec.evidence_matrix.cases.find((item) => item.locale === 'longest_copy' && item.text_scale === spec.text_behavior.text_scale.large);
  stress.test_ids.push('sizing_only');
  assert.deepEqual(validator.validate(spec)[0], []);
});
