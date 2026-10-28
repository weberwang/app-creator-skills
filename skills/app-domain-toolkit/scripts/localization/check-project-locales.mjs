#!/usr/bin/env node

import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 校验语言集合并保留原始拼写，以便输出可理解的差异。 */
function readLanguages(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} 必须是非空语言数组`);
  const result = new Map();
  for (const language of value) {
    if (typeof language !== 'string' || !language.trim() || language !== language.trim()) throw new Error(`${label} 包含无效语言`);
    const key = language.toLowerCase();
    if (result.has(key)) throw new Error(`${label} 包含重复语言：${language}`);
    result.set(key, language);
  }
  return result;
}

/** 检查项目语言清单及所有实际合同的语言集合。 */
export function checkProjectLocales(project, contracts) {
  const languages = readLanguages(project?.languages, '项目 languages');
  if (typeof project?.defaultLanguage !== 'string' || !languages.has(project.defaultLanguage.toLowerCase())) throw new Error('项目 defaultLanguage 必须属于 languages');
  if (!Array.isArray(contracts) || !contracts.length) throw new Error('必须提供至少一个实际合同');
  const errors = [];
  for (const { path, document } of contracts) {
    const web = document?.dynamic_content?.localization;
    const unity = document?.textLocalization;
    if (Boolean(web) === Boolean(unity)) { errors.push(`${path} 必须包含唯一的 Web 或 Unity 语言合同`); continue; }
    try {
      const declared = readLanguages(web ? web.required_languages : unity.locales, `${path} 语言`);
      const missing = [...languages].filter(([key]) => !declared.has(key)).map(([, value]) => value);
      const extra = [...declared].filter(([key]) => !languages.has(key)).map(([, value]) => value);
      if (missing.length) errors.push(`${path} 缺少项目语言：${missing.join(', ')}`);
      if (extra.length) errors.push(`${path} 包含项目未选择的语言：${extra.join(', ')}`);
      if (web && (typeof web.default_language !== 'string' || web.default_language.toLowerCase() !== project.defaultLanguage.toLowerCase())) {
        errors.push(`${path} 默认语言与项目 defaultLanguage 不一致`);
      }
    } catch (error) { errors.push(error.message); }
  }
  return errors;
}

/** 限制绑定及其引用文件只能读取项目内的真实文件，防止链接或路径跳转越界。 */
async function projectFile(root, value) {
  if (typeof value !== 'string' || !value.trim() || isAbsolute(value) || win32.isAbsolute(value) || value.replaceAll('\\', '/').split('/').includes('..')) throw new Error(`项目相对路径无效：${value}`);
  const actualRoot = await realpath(root);
  const candidate = await realpath(resolve(root, value));
  const child = relative(actualRoot, candidate);
  if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child) || !(await stat(candidate)).isFile()) throw new Error(`项目文件越界或不是文件：${value}`);
  return candidate;
}

/** 读取 JSON 或 YAML 实际文件，不以占位数据代替解析失败。 */
async function readContract(path) {
  const source = await readFile(path, 'utf8');
  try { return JSON.parse(source); }
  catch { const { parse } = await import('../../../app-skill-runtime/yaml.mjs'); return parse(source); }
}

/** 校验引用式布局所依赖的两个真实文件，并绑定显式本地化合同。 */
async function readBoundContract(root, referencePath, languagePath) {
  const reference = await readContract(await projectFile(root, referencePath));
  if (reference?.schema_version !== '2.0.0') throw new Error(`${referencePath} 不是 Cocos 2.0 引用式布局合同`);
  // 引用文件只提供场景单一 target locale，不能冒充完整项目语言清单。
  for (const field of ['scene_contract_file', 'project_policy_file']) {
    const path = await projectFile(root, reference[field]);
    const document = await readContract(path);
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error(`${referencePath} 的 ${field} 内容无效`);
  }
  // CLI 绑定参数必须与布局合同冻结的实际引用一致，不能用无关的合规文件代替。
  const declared = await projectFile(root, reference.localization_contract_file);
  const actual = await projectFile(root, languagePath);
  if (declared !== actual) throw new Error(`${referencePath} 的 localization_contract_file 与绑定文件不一致`);
  return { path: `${referencePath} → ${languagePath}`, document: await readContract(actual) };
}

/** 读取用户提供的项目清单和合同文件；解析错误不能当作不适用跳过。 */
export async function main(argv = process.argv.slice(2)) {
  try {
    let root = process.cwd();
    let projectPath;
    const entries = [];
    for (let index = 0; index < argv.length; index++) {
      const value = argv[index];
      if (value === '--project-root') {
        if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error('--project-root 必须指定目录');
        root = resolve(argv[++index]);
      } else if (value === '--bind') {
        const reference = argv[++index]; const language = argv[++index];
        if (!reference || !language || reference.startsWith('--') || language.startsWith('--')) throw new Error('--bind 必须指定引用式布局合同和实际本地化合同');
        entries.push({ reference, language });
      } else if (value.startsWith('--')) throw new Error(`未知参数：${value}`);
      else if (!projectPath) projectPath = value;
      else entries.push({ path: value });
    }
    if (!projectPath || !entries.length) throw new Error('用法：node check-project-locales.mjs [--project-root 项目目录] <项目语言清单.json> <合同文件> [--bind 引用式布局合同 实际本地化合同]');
    // 所有路径均相对同一项目根解析，避免从其他工作目录调用时误读同名文件。
    const project = JSON.parse(await readFile(await projectFile(root, projectPath), 'utf8'));
    const contracts = [];
    for (const entry of entries) {
      try {
        if (entry.reference) contracts.push(await readBoundContract(root, entry.reference, entry.language));
        else contracts.push({ path: entry.path, document: await readContract(await projectFile(root, entry.path)) });
      }
      catch (error) { throw new Error(`无法读取合同 ${entry.reference ?? entry.path}：${error.message}`); }
    }
    const errors = checkProjectLocales(project, contracts);
    if (errors.length) { process.stderr.write(`${errors.join('\n')}\n`); return 1; }
    process.stdout.write(`项目语言与 ${contracts.length} 个合同一致\n`);
    return 0;
  } catch (error) { process.stderr.write(`${error.message}\n`); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = await main();
