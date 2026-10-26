#!/usr/bin/env node
/** 校验技能发现、跨文件引用、JSON、代码规模与脚本语法。 */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SOURCE_ROOT, STACKS } from './install-project-skills.mjs';
import YAML from '../skills/app-skill-runtime/yaml.mjs';
import { readSkillCatalog } from './skill-catalog.mjs';
import { CAPABILITY_GROUPS, CORE_SKILLS, capabilityAdapters } from './capability-map.mjs';
import { validateNativeManuals } from './validate-native-manuals.mjs';

/** 枚举维护范围，避免把缓存、生成报告与其他仓库纳入校验。 */
function walk(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'Artifacts', '.agents'].includes(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`分发文件不能是符号链接：${path}`);
    if (entry.isDirectory()) result.push(...walk(path));
    else result.push(path);
  }
  return result;
}

/** 检查 JSON Schema 的本地文件引用，远程标识符不做联网读取。 */
function checkJsonRefs(value, file, errors) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string' && !/^(https?:|#)/.test(value.$ref)) {
    const target = value.$ref.split('#')[0];
    if (!existsSync(resolve(dirname(file), target))) errors.push(`Schema 引用不存在：${file} → ${target}`);
  }
  for (const child of Object.values(value)) checkJsonRefs(child, file, errors);
}

/** 验证每个技能的最小元数据与自动发现身份，不只检查文件数量。 */
function checkSkill(root, name, errors) {
  const file = join(root, 'skills', name, 'SKILL.md');
  if (!existsSync(file)) { errors.push(`缺少技能：${name}`); return; }
  const content = readFileSync(file, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) { errors.push(`缺少 frontmatter：${name}`); return; }
  let metadata;
  try { metadata = YAML.parse(frontmatter[1]); }
  catch (error) { errors.push(`技能元数据无法解析：${name} ${error.message}`); return; }
  const actual = metadata?.name;
  if (actual !== name || !/^[a-z0-9-]{1,63}$/.test(actual ?? '')) errors.push(`技能身份与目录不一致：${name}`);
  if (typeof metadata.description !== 'string' || !metadata.description.trim()) errors.push(`技能触发说明为空：${name}`);
  const ui = join(dirname(file), 'agents', 'openai.yaml');
  if (!existsSync(ui)) errors.push(`缺少 UI 元数据：${name}`);
  else {
    try {
      const yaml = YAML.parse(readFileSync(ui, 'utf8'));
      if (!yaml?.interface?.default_prompt?.includes(`$${name}`)) errors.push(`默认提示未引用本技能：${name}`);
      if (!yaml?.interface?.display_name) errors.push(`缺少显示名：${name}`);
    } catch (error) { errors.push(`UI 元数据无法解析：${name} ${error.message}`); }
  }
}

/** 核对公共入口、技术栈路由和保留的原生适配是否完整对应映射真源。 */
function checkCapabilityEntries(root, catalog, errors) {
  const expected = CAPABILITY_GROUPS.map((group) => ({
    name: group.name,
    core: group.core === true,
    stacks: [...new Set(capabilityAdapters(group).map((adapter) => adapter.stack))],
    nativeAdapters: capabilityAdapters(group),
    authoredAdapters: capabilityAdapters(group).filter((adapter) => adapter.authored),
  }));
  const actual = Array.isArray(catalog.capabilities) ? catalog.capabilities : [];
  if (!Array.isArray(catalog.capabilities)) errors.push('catalog.capabilities 必须是数组');
  const byName = new Map();
  for (const entry of actual) {
    if (!entry || typeof entry.name !== 'string' || byName.has(entry.name)) errors.push(`能力目录存在无效或重复记录：${entry?.name ?? '未命名'}`);
    else byName.set(entry.name, entry);
  }
  for (const item of expected) {
    const record = byName.get(item.name);
    if (!record) errors.push(`能力目录缺少公共入口：${item.name}`);
    else {
      if (record.core !== item.core || JSON.stringify(record.stacks) !== JSON.stringify(item.stacks) || JSON.stringify(record.nativeAdapters) !== JSON.stringify(item.nativeAdapters)) errors.push(`能力目录与 capability-map 不一致：${item.name}`);
    }
    const manifestPath = join(root, 'skills', item.name, 'native-adapters.json');
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (manifest.capability !== item.name || !manifest.adapters || Array.isArray(manifest.adapters)) errors.push(`原生适配 manifest 格式无效：${item.name}`);
      const expectedByStack = new Map();
      for (const adapter of item.nativeAdapters) {
        if (!expectedByStack.has(adapter.stack)) expectedByStack.set(adapter.stack, []);
        const manifestPath = relative(resolve(root, 'skills', item.name), resolve(root, ...adapter.path.split('/'))).split(sep).join('/');
        expectedByStack.get(adapter.stack).push({ ...adapter, path: manifestPath });
      }
      const adaptersByStack = manifest.adapters && typeof manifest.adapters === 'object' ? manifest.adapters : {};
      if (JSON.stringify(Object.keys(adaptersByStack).sort()) !== JSON.stringify([...expectedByStack.keys()].sort())) errors.push(`原生适配 manifest 栈路由不完整：${item.name}`);
      for (const [stack, expectedAdapters] of expectedByStack) {
        const adapters = adaptersByStack[stack];
        if (!Array.isArray(adapters) || adapters.length !== expectedAdapters.length) { errors.push(`原生适配 manifest 缺少 ${stack} 路由：${item.name}`); continue; }
        const actualBySource = new Map(adapters.map((adapter) => [adapter?.sourceSkill, adapter]));
        for (const expectedAdapter of expectedAdapters) {
          const adapter = actualBySource.get(expectedAdapter.sourceSkill);
          if (!adapter || adapter.path !== expectedAdapter.path || adapter.section !== expectedAdapter.section) errors.push(`原生适配 manifest 路由错误：${item.name}/${stack}/${expectedAdapter.sourceSkill}`);
          else if (expectedAdapter.reused) {
            if (adapter.reused !== true || adapter.authored === true || adapter.mode !== expectedAdapter.mode || adapter.when !== expectedAdapter.when) errors.push(`原生适配 manifest 复用边界错误：${item.name}/${stack}/${expectedAdapter.sourceSkill}`);
          } else if (expectedAdapter.authored) {
            if (adapter.authored !== true || adapter.reused === true || adapter.mode !== expectedAdapter.mode || adapter.when !== expectedAdapter.when) errors.push(`原生适配 manifest authored 边界错误：${item.name}/${stack}/${expectedAdapter.sourceSkill}`);
          } else if (adapter.reused === true || adapter.authored === true || typeof adapter.mode !== 'string' || !adapter.mode.trim() || typeof adapter.when !== 'string' || !adapter.when.trim()) {
            errors.push(`原生适配 manifest 缺少有效 mode/when 或误标复用：${item.name}/${stack}/${expectedAdapter.sourceSkill}`);
          }
        }
      }
      for (const adapters of Object.values(adaptersByStack)) for (const adapter of Array.isArray(adapters) ? adapters : []) {
        if (typeof adapter?.path !== 'string' || !existsSync(resolve(manifestPath, '..', adapter.path))) errors.push(`原生适配 manifest 引用文件不存在：${item.name}/${adapter?.path ?? '缺少 path'}`);
      }
    } catch (error) { errors.push(`原生适配 manifest 不可读：${item.name} ${error.message}`); }
  }
  for (const name of byName.keys()) if (!expected.some((entry) => entry.name === name)) errors.push(`能力目录含未映射入口：${name}`);

  for (const stack of STACKS) {
    const record = catalog.stacks?.[stack];
    if (!record) continue;
    const expectedSkills = CAPABILITY_GROUPS.filter((group) => capabilityAdapters(group).some((adapter) => adapter.stack === stack)).map((group) => group.name);
    if (!Array.isArray(record.capabilitySkills) || new Set(record.capabilitySkills).size !== record.capabilitySkills.length || JSON.stringify([...record.capabilitySkills].sort()) !== JSON.stringify([...expectedSkills].sort())) errors.push(`${stack}.capabilitySkills 与公共能力路由不一致`);
    const expectedAdapters = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.stack === stack && !adapter.reused && !adapter.authored).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section })));
    // catalog 数组顺序不承担路由语义，按源技能名稳定比较完整对象。
    const sortAdapters = (items) => [...items].sort((left, right) => String(left?.sourceSkill).localeCompare(String(right?.sourceSkill)));
    if (!Array.isArray(record.nativeAdapters) || JSON.stringify(sortAdapters(record.nativeAdapters)) !== JSON.stringify(sortAdapters(expectedAdapters))) errors.push(`${stack}.nativeAdapters 与原生映射不一致`);
    const expectedAuthoredAdapters = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.stack === stack && adapter.authored).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section })));
    if (!Array.isArray(record.authoredAdapters) || JSON.stringify(sortAdapters(record.authoredAdapters)) !== JSON.stringify(sortAdapters(expectedAuthoredAdapters))) errors.push(`${stack}.authoredAdapters 与 authored 原生映射不一致`);
    if (Object.hasOwn(record, 'specialistSkills')) errors.push(`${stack}.specialistSkills 已过期，应由 capabilitySkills/nativeAdapters 取代`);
  }
}

/** 对当前交付包执行可重复的静态与语法验证。 */
export function validateRepository(root = SOURCE_ROOT) {
  const errors = [];
  const files = walk(root);
  for (const file of files) {
    const ext = extname(file);
    const content = ['.json', '.md', '.mjs', '.js', '.cjs', '.py'].includes(ext) ? readFileSync(file, 'utf8') : '';
    if (ext === '.json') {
      try { checkJsonRefs(JSON.parse(content), file, errors); } catch (error) { errors.push(`${file} JSON 无效：${error.message}`); }
    }
    if (ext === '.md') {
      // 代码围栏里的示例路径不是分发资源引用，避免把项目产物示例误判成缺失文件。
      const prose = content.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
      for (const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const url = match[1].trim().replace(/^<|>$/g, '');
        if (/^(?:[a-z]+:|#|\/)/i.test(url) || /[<$]|\{\{/.test(url)) continue;
        const target = url.split('#')[0];
        if (target && !existsSync(resolve(dirname(file), decodeURIComponent(target)))) errors.push(`文档引用不存在：${relative(root, file)} → ${url}`);
      }
    }
    if (['.mjs', '.js', '.cjs'].includes(ext)) {
      if (content.split(/\r?\n/).length > 1000) errors.push(`代码文件超过 1000 行：${file}`);
      const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
      if (checked.status !== 0) errors.push(`脚本语法失败：${file} ${checked.stderr || checked.error?.message}`);
    }
  }
  const catalog = readSkillCatalog(root);
  checkCapabilityEntries(root, catalog, errors);
  let fileRows = [];
  const ledgerPath = join(root, 'migration', 'files.json');
  if (catalog.filesRef !== 'migration/files.json' || !existsSync(ledgerPath)) errors.push('catalog.filesRef 或 migration/files.json 无效');
  else {
    try {
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
      fileRows = Array.isArray(ledger) ? ledger : Array.isArray(ledger.files) ? ledger.files : [];
      if (!fileRows.length) errors.push('migration/files.json 必须包含逐项文件记录');
    } catch (error) { errors.push(`migration/files.json 无效：${error.message}`); }
  }
  validateNativeManuals({ root, catalog, fileRows, errors });
  const expectedSkills = [...CORE_SKILLS, ...CAPABILITY_GROUPS.filter((group) => !group.core).map((group) => group.name), ...STACKS.map((stack) => `app-stack-${stack}`)];
  for (const name of expectedSkills) checkSkill(root, name, errors);
  const actualSkills = readdirSync(join(root, 'skills')).filter((name) => existsSync(join(root, 'skills', name, 'SKILL.md')));
  for (const name of actualSkills) if (!expectedSkills.includes(name)) errors.push(`未纳入清单的技能入口：${name}`);
  for (const stack of STACKS) {
    const file = join(root, 'skills', `app-stack-${stack}`, 'profile.json');
    try {
      const profile = JSON.parse(readFileSync(file, 'utf8'));
      if (profile.id !== stack || !profile.displayName) errors.push(`技术 profile 身份错误：${stack}`);
      for (const key of ['detectAny', 'frameworkPolicy', 'nativeRules', 'runtimeRoots']) if (!Array.isArray(profile[key]) || !profile[key].length || profile[key].some((item) => typeof item !== 'string' || !item.trim())) errors.push(`技术 profile.${key} 无效：${stack}`);
      for (const key of ['engineering', 'assetImport', 'visual']) if (!Array.isArray(profile.evidenceRequirements?.[key]) || !profile.evidenceRequirements[key].length) errors.push(`技术证据类别为空：${stack}/${key}`);
    } catch (error) { errors.push(`技术 profile 不可读：${stack} ${error.message}`); }
  }
  return { status: errors.length ? 'FAIL' : 'PASS', skills: actualSkills.length, files: files.length, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRepository();
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
