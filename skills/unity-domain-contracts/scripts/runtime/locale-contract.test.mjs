import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from '../../../app-skill-runtime/ajv2020.mjs';
import { validateUnityResponsiveContract } from './visible-contract.mjs';

const policy = { singleLine: false, wrap: true, truncation: 'forbidden' };
const schema = JSON.parse(readFileSync(new URL('../../schemas/work-item.schema.json', import.meta.url), 'utf8'));
const validateSchema = new Ajv2020({ strict: false }).compile({ $defs: schema.$defs, $ref: '#/$defs/textLocalization' });

/** 只提取待验证语言合同的错误，其他合同字段不属于本测试范围。 */
function localeErrors(textLocalization) {
  return validateUnityResponsiveContract({ textLocalization }).filter((error) => /locales|localePolicies|程序化文本|fr-CA|de-DE|\*\.en\]/.test(error));
}

test('默认简体中文和额外语言按任意顺序声明且逐语言配置策略', () => {
  const chinese = { programmatic: true, locales: ['zh-CN'], localePolicies: { 'zh-CN': policy } };
  const bilingual = { programmatic: true, locales: ['zh-CN', 'en'], localePolicies: { en: policy, 'zh-CN': policy } };
  const additional = { programmatic: true, locales: ['fr-CA', 'en', 'zh-CN', 'de-DE'], localePolicies: { en: policy, 'zh-CN': policy, 'fr-CA': policy, 'de-DE': policy } };
  for (const contract of [chinese, bilingual, additional]) {
    assert.equal(validateSchema(contract), true, JSON.stringify(validateSchema.errors));
    assert.deepEqual(localeErrors(contract), []);
  }
  const englishOnly = { programmatic: true, locales: ['en'], localePolicies: { en: policy } };
  assert.equal(validateSchema(englishOnly), true, JSON.stringify(validateSchema.errors));
  assert.deepEqual(localeErrors(englishOnly), []);
  const emptyLocales = { programmatic: true, locales: [], localePolicies: {} };
  assert.equal(validateSchema(emptyLocales), false);
  assert.match(localeErrors(emptyLocales).join('\n'), /必须非空/);
  const missingEnglishPolicy = { ...bilingual, localePolicies: chinese.localePolicies };
  assert.match(localeErrors(missingEnglishPolicy).join('\n'), /en/);
  const missingExtraPolicy = { ...additional, localePolicies: { en: policy, 'zh-CN': policy, 'de-DE': policy } };
  assert.match(localeErrors(missingExtraPolicy).join('\n'), /fr-CA/);
  const undeclaredPolicy = { ...bilingual, localePolicies: { ...bilingual.localePolicies, 'fr-CA': policy } };
  assert.match(localeErrors(undeclaredPolicy).join('\n'), /fr-CA/);
  const duplicated = { ...additional, locales: [...additional.locales, 'FR-ca'] };
  assert.match(localeErrors(duplicated).join('\n'), /不重复/);
});
