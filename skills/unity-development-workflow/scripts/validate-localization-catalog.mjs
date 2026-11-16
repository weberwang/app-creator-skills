#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 对象必须只包含约定字段；单独报告缺失和多余字段，便于定位配置错误。 */
function checkFields(value, fields, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} 必须是对象`);
    return false;
  }
  for (const field of fields) if (!Object.hasOwn(value, field)) errors.push(`${label} 缺少 ${field}`);
  for (const field of Object.keys(value)) if (!fields.includes(field)) errors.push(`${label} 不允许字段 ${field}`);
  return true;
}

/** 检查非空名称，避免首尾空格造成看似相同但无法命中的键。 */
function checkName(value, label, errors) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    errors.push(`${label} 必须是无首尾空格的非空字符串`);
    return false;
  }
  return true;
}

/** 构建大小写不敏感的语言集合，与现有项目语言合同保持一致。 */
function languageSet(values, label, errors) {
  const result = new Set();
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${label} 必须是非空语言数组`);
    return result;
  }
  values.forEach((value, index) => {
    if (!checkName(value, `${label}[${index}]`, errors)) return;
    const normalized = value.toLowerCase();
    if (result.has(normalized)) errors.push(`${label} 包含重复语言：${value}`);
    result.add(normalized);
  });
  return result;
}

/** 检查声明和实际使用的参数集合，拒绝无法安全解析的花括号。 */
function checkText(text, parameters, label, errors) {
  if (typeof text !== 'string' || !text.trim()) {
    errors.push(`${label} 必须是非空文案`);
    return;
  }
  const tokens = [...text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)];
  if (/[{}]/.test(text.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, ''))) errors.push(`${label} 含无效占位符`);
  const actual = new Set(tokens.map((match) => match[1]));
  for (const parameter of parameters) if (!actual.has(parameter)) errors.push(`${label} 缺少占位符：${parameter}`);
  for (const parameter of actual) if (!parameters.has(parameter)) errors.push(`${label} 包含未声明占位符：${parameter}`);
}

/** 校验 JSON 文案配置与项目语言清单，不执行文案或参数内容。 */
export function validateLocalizationCatalog(catalog, project) {
  const errors = [];
  const projectValid = project && typeof project === 'object' && !Array.isArray(project);
  if (!projectValid) errors.push('项目语言清单必须是对象');
  const projectLanguages = languageSet(projectValid ? project.languages : null, '项目 languages', errors);
  if (!checkName(projectValid ? project.defaultLanguage : null, '项目 defaultLanguage', errors) ||
      !projectLanguages.has(project.defaultLanguage.toLowerCase())) errors.push('项目 defaultLanguage 必须属于 languages');

  if (!checkFields(catalog, ['schemaVersion', 'languages', 'defaultLanguage', 'entries'], '文案配置', errors)) return errors;
  if (catalog.schemaVersion !== '1.0') errors.push('文案配置 schemaVersion 必须是 1.0');
  const languages = languageSet(catalog.languages, '文案配置 languages', errors);
  for (const language of projectLanguages) if (!languages.has(language)) errors.push(`文案配置缺少项目语言：${language}`);
  for (const language of languages) if (!projectLanguages.has(language)) errors.push(`文案配置包含项目未选择语言：${language}`);
  const catalogDefaultValid = checkName(catalog.defaultLanguage, '文案配置 defaultLanguage', errors);
  if (!catalogDefaultValid || !languages.has(catalog.defaultLanguage.toLowerCase())) errors.push('文案配置 defaultLanguage 必须属于 languages');
  if (catalogDefaultValid && projectValid && typeof project.defaultLanguage === 'string' &&
      catalog.defaultLanguage.toLowerCase() !== project.defaultLanguage.toLowerCase()) errors.push('文案配置默认语言与项目 defaultLanguage 不一致');

  if (!Array.isArray(catalog.entries) || !catalog.entries.length) {
    errors.push('文案配置 entries 必须是非空数组');
    return errors;
  }
  const keys = new Set();
  catalog.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;
    if (!checkFields(entry, ['key', 'parameters', 'values'], label, errors)) return;
    if (checkName(entry.key, `${label}.key`, errors)) {
      if (keys.has(entry.key)) errors.push(`${label}.key 重复：${entry.key}`);
      keys.add(entry.key);
    }
    const parameters = new Set();
    if (!Array.isArray(entry.parameters)) errors.push(`${label}.parameters 必须是数组`);
    else entry.parameters.forEach((parameter) => {
      if (typeof parameter !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter)) errors.push(`${label}.parameters 含无效参数`);
      else if (parameters.has(parameter)) errors.push(`${label}.parameters 含重复参数：${parameter}`);
      else parameters.add(parameter);
    });
    if (!Array.isArray(entry.values) || !entry.values.length) {
      errors.push(`${label}.values 必须是非空数组`);
      return;
    }
    const present = new Set();
    entry.values.forEach((value, valueIndex) => {
      const valueLabel = `${label}.values[${valueIndex}]`;
      if (!checkFields(value, ['locale', 'text'], valueLabel, errors)) return;
      if (checkName(value.locale, `${valueLabel}.locale`, errors)) {
        const normalized = value.locale.toLowerCase();
        if (present.has(normalized)) errors.push(`${label} 存在重复语言：${value.locale}`);
        if (!languages.has(normalized)) errors.push(`${label} 包含未选择语言：${value.locale}`);
        present.add(normalized);
      }
      checkText(value.text, parameters, `${valueLabel}.text`, errors);
    });
    for (const language of languages) if (!present.has(language)) errors.push(`${label} 缺少语言：${language}`);
  });
  return errors;
}

/** 从真实 JSON 文件读取配置；参数、读取或解析失败时返回非零状态。 */
export async function main(argv = process.argv.slice(2)) {
  try {
    if (argv.length !== 2) throw new Error('用法：node validate-localization-catalog.mjs <项目语言清单.json> <文案配置.json>');
    const [project, catalog] = await Promise.all(argv.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
    const errors = validateLocalizationCatalog(catalog, project);
    if (errors.length) {
      process.stderr.write(`${errors.join('\n')}\n`);
      return 1;
    }
    process.stdout.write('国际化文案配置与项目语言清单一致\n');
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = await main();
