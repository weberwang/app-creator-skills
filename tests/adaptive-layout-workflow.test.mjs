/** 验证布局工作流区分可选草图、精确还原和用户视觉确认。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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
