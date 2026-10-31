/** 验证布局工作流区分可选草图、精确还原和用户视觉确认。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from '../skills/app-skill-runtime/yaml.mjs';
import validator from '../skills/adaptive-layout-implementation/scripts/validate-layout-spec.js';

const workflow = readFileSync(new URL('../skills/adaptive-layout-implementation/references/implementation-workflow.md', import.meta.url), 'utf8');

test('布局工作流允许先直接验证功能，草图仅按需审阅', () => {
  assert.match(workflow, /只表示布局数据规格，不要求白盒画面、Code Sketch 或截图/);
  assert.match(workflow, /V1 可直接在生产 Flutter 骨架中实现并验证真实功能，也可按需选择中性 Code Sketch/);
  assert.match(workflow, /仅选择 Code Sketch 路线时，由独立 Code Sketch Reviewer 审阅/);
  assert.match(workflow, /V2 基于已验证的功能和页面语义设计视觉目标/);
});

test('完整 fidelity 仅限 explicit exact，截图由用户检查', () => {
  assert.match(workflow, /仅明确选择 `exact` 时[\s\S]*fidelity validator[\s\S]*截图 parity/);
  assert.match(workflow, /默认按 usability 目标验证，不强制完整 fidelity\/parity/);
  assert.match(workflow, /截图由用户人工检查，代理不得自动分析/);
  assert.match(workflow, /保留用户视觉确认/);
  assert.match(workflow, /运行 analyze 与适用的参数化 Widget\/关系测试/);
});

/** 通过真实校验入口验证项目容差可变，同时保留依据和实际超差约束。 */
test('关键对齐容差按实际依据声明，并继续拦截无效值和超差', () => {
  const source = readFileSync(new URL('../skills/adaptive-layout-implementation/assets/layout-spec-fidelity-template.yaml', import.meta.url), 'utf8');
  const spec = YAML.parse(source);
  const alignment = spec.critical_alignments[0];

  // 一逻辑像素以上的容差可以有正当依据，不能因统一上限被拒绝。
  alignment.tolerance_logical_px = 1.5;
  assert.deepEqual(validator.validate(spec)[0], []);

  alignment.tolerance_basis = '';
  assert.ok(validator.validate(spec)[0].some((error) => error.includes('tolerance_basis is required')));
  alignment.tolerance_basis = '目标画布中相对中心偏移以逻辑像素测量，按目标及测量精度论证';
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    alignment.tolerance_logical_px = value;
    assert.ok(validator.validate(spec)[0].some((error) => error.includes('must be finite and non-negative')));
  }

  // 超过已声明容差仍须失败，即使该容差本身没有全局上限。
  alignment.tolerance_logical_px = 1.5;
  alignment.geometry.flutter.x += 2;
  alignment.geometry.flutter.center_x += 2;
  alignment.delta.horizontal = 2;
  assert.ok(validator.validate(spec)[0].some((error) => error.includes('delta.horizontal exceeds tolerance')));
});
