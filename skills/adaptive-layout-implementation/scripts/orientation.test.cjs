/** 验证方向声明与实际视口一致，并限制证据范围。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const YAML = require('../../app-skill-runtime/dependencies.cjs')('yaml');
const { validate } = require('./validate-layout-spec.js');
const base = YAML.parse(fs.readFileSync(require('node:path').join(__dirname, '../assets/layout-spec-template.yaml'), 'utf8'));

/** 将所有矩阵视口转换到同一方向，同时保留宽度断点和同宽不同高。 */
function oneDirection(orientation) {
  const spec = structuredClone(base);
  spec.page.orientations = [orientation];
  for (const item of spec.evidence_matrix.cases) {
    item.orientation = orientation;
    item.height = orientation === 'portrait' ? item.width + item.height + 1 : Math.max(1, Math.min(item.height, item.width - 1));
  }
  return spec;
}

test('单方向与双方向按照声明和真实视口检查', () => {
  for (const orientation of ['portrait', 'landscape']) assert.deepEqual(validate(oneDirection(orientation))[0], []);
  assert.deepEqual(validate(base)[0], []);
});

test('非法、重复、未声明及视口方向不一致均拒绝', () => {
  for (const orientations of [[], ['diagonal'], ['portrait', 'portrait'], ['portrait', 'landscape', 'diagonal']]) {
    const spec = structuredClone(base); spec.page.orientations = orientations;
    assert.ok(validate(spec)[0].some((error) => error.includes('page.orientations must contain')));
  }
  const spec = oneDirection('portrait');
  spec.evidence_matrix.cases[0].orientation = 'landscape';
  const errors = validate(spec)[0];
  assert.ok(errors.some((error) => error.includes('must be declared')));
  assert.ok(errors.some((error) => error.includes('must match positive width and height')));
});

test('视觉目标方向必须属于声明且匹配目标视口', () => {
  const spec = YAML.parse(fs.readFileSync(require('node:path').join(__dirname, '../assets/layout-spec-fidelity-template.yaml'), 'utf8'));
  spec.parity_cases[0].orientation = 'landscape';
  const errors = validate(spec)[0];
  assert.ok(errors.some((error) => error.includes('parity_cases[0].orientation must match viewport')));
  spec.page.orientations = ['portrait'];
  assert.ok(validate(spec)[0].some((error) => error.includes('parity_cases[0].orientation must be declared')));
});
