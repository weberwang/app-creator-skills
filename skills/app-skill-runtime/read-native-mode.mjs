#!/usr/bin/env node
/** 按已选技术栈与能力读取单个原生模式及直接公共依赖，不执行专业工具。 */
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractMarkdownSection, extractNativeSection, markdownProse } from './native-contracts.mjs';
import { isDirectEntry } from './direct-entry.mjs';

const DEFAULT_SKILLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'flutter']);
const COMMON_ROOTS = ['app-creator-workflow', 'app-workflow-control', 'app-asset-workflow', 'grilling', 'app-domain-toolkit', 'app-skill-runtime'];
const SAFE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** 逐级拒绝链接和目录越界，防止资料路径借 Junction 读入技能安装范围外的文件。 */
function safePath(root, value) {
  const target = resolve(root, value);
  const local = relative(root, target);
  if (!local || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) throw new Error(`资料路径越出技能目录：${value}`);
  let current = resolve(root);
  for (const part of ['', ...local.split(sep)]) {
    if (part) current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`资料路径不能包含链接：${value}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      break;
    }
  }
  return { absolute: target, path: local.split(sep).join('/') };
}

/** 读取明确声明的资料；缺失或非普通文件不降级成空白规范。 */
function readRequired(root, value) {
  const target = safePath(root, value);
  if (!existsSync(target.absolute) || !lstatSync(target.absolute).isFile()) throw new Error(`必需资料不存在：${target.path}`);
  return { ...target, content: readFileSync(target.absolute, 'utf8') };
}

/** 提取直接本地引用和行内资源提示，不追踪依赖文档的递归加载链。 */
function referencesIn(content) {
  const prose = markdownProse(content);
  const references = [];
  const linkedProse = prose.replace(/(`+)([^`\r\n]*)\1/g, '');
  for (const match of linkedProse.matchAll(/\]\(\s*(<[^>]+>|[^\s)]+)(?:[^)]*)\)|^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm)) {
    references.push({ target: (match[1] ?? match[2]).replace(/^<|>$/g, ''), inline: false });
  }
  for (const match of prose.matchAll(/(`+)([^`\r\n]+)\1/g)) {
    if (/^(?:\.agents\/skills\/|skills\/|references\/|scripts\/|assets\/|tools\/)/.test(match[2]) && !/[<>\s]/.test(match[2])) {
      references.push({ target: match[2], inline: true });
    }
  }
  return references;
}

/** 将资料引用归到安装根；行内工具相对原资源目录，Markdown链接相对实际文档。 */
function locateReference(root, reference, document, sourceSkill) {
  const value = reference.target;
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value) || /[<>$]|\{\{/.test(value)) return null;
  const split = value.indexOf('#');
  const rawPath = (split < 0 ? value : value.slice(0, split)).split('?')[0];
  const fragment = split < 0 ? '' : decodeURIComponent(value.slice(split + 1));
  let path = decodeURIComponent(rawPath);
  if (!path) path = document.path;
  else if (path.startsWith('.agents/skills/')) path = path.slice('.agents/skills/'.length);
  else if (path.startsWith('skills/')) path = path.slice('skills/'.length);
  else if (reference.inline && /^(?:references|scripts|assets|tools)\//.test(path) && document.kind === 'native') path = `${sourceSkill}/${path}`;
  else path = relative(root, resolve(root, dirname(document.path), path));
  // 项目产物路径只是工作输入，不把它当成技能目录内的文件读取。
  const local = relative(root, resolve(root, path));
  if (!local || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) return { path: value, fragment, kind: 'project-reference', available: false };
  return { ...safePath(root, path), fragment, inline: reference.inline };
}

/** 校验选择并读取当前栈清单，多模式能力必须明确选中来源，避免猜测专业路线。 */
function selectRoute({ stack, capability, sourceSkill, skillsRoot }) {
  if (!STACKS.has(stack)) throw new Error(`无效技术栈：${stack}`);
  if (typeof capability !== 'string' || !SAFE_NAME.test(capability)) throw new Error('必须指定有效公共能力名称');
  if (sourceSkill !== undefined && (typeof sourceSkill !== 'string' || !SAFE_NAME.test(sourceSkill))) throw new Error('原生模式名称无效');
  const profile = JSON.parse(readRequired(skillsRoot, `app-stack-${stack}/profile.json`).content);
  if (profile.id !== stack || !Array.isArray(profile.capabilitySkills) || !profile.capabilitySkills.includes(capability)) throw new Error(`当前技术栈未声明该能力：${stack}/${capability}`);
  const manifestFile = readRequired(skillsRoot, `${capability}/native-adapters.json`);
  const manifest = JSON.parse(manifestFile.content);
  if (manifest.capability !== capability) throw new Error('能力清单身份不匹配');
  const routes = manifest.adapters?.[stack];
  if (!Array.isArray(routes) || !routes.length) throw new Error(`该能力未声明当前栈的原生模式：${stack}/${capability}`);
  const candidates = sourceSkill === undefined ? routes : routes.filter((route) => route.sourceSkill === sourceSkill);
  if (candidates.length !== 1) throw new Error(`请明确选择一个原生模式：${routes.map((route) => route.sourceSkill).join(', ')}`);
  const route = candidates[0];
  if (!SAFE_NAME.test(route.sourceSkill) || route.section !== `mode-${route.sourceSkill}`) throw new Error('原生模式身份或章节不匹配');
  const manualTarget = safePath(skillsRoot, relative(skillsRoot, resolve(dirname(manifestFile.absolute), route.path)));
  // 先核对归属，再读取正文；即使错误清单指向已安装的其他栈，也不读取其手册。
  if (manualTarget.path !== `app-stack-${stack}/references/native-contracts.md`) throw new Error('原生模式必须使用当前技术栈的唯一手册');
  const manual = readRequired(skillsRoot, manualTarget.path);
  return { profile, manifest, manifestFile, route, manual };
}

/** 读取单个模式与直接公共资料，其他章节和资源仅提供路径供实际任务按需选择。 */
export function loadNativeMode({ stack, capability, sourceSkill, skillsRoot = DEFAULT_SKILLS_ROOT }) {
  const root = resolve(skillsRoot);
  const { profile, manifest, manifestFile, route, manual } = selectRoute({ stack, capability, sourceSkill, skillsRoot: root });
  const content = extractNativeSection(manual.content, route.sourceSkill);
  extractMarkdownSection(content, route.section);
  const native = { kind: 'native', path: manual.path, section: route.section, sourceSkill: route.sourceSkill, content };
  const allowedRoots = new Set([...COMMON_ROOTS, ...profile.capabilitySkills, ...(profile.resourceDirectories ?? []), `app-stack-${stack}`]);
  const publicRoots = new Set([...COMMON_ROOTS, ...profile.capabilitySkills]);
  const requests = new Map();
  const resources = new Map();

  /** 按文件合并全文或片段请求，全文已选时不重复输出同一文档的子章节。 */
  const requestPublic = (path, fragment = '') => {
    if (!requests.has(path)) requests.set(path, new Set());
    const fragments = requests.get(path);
    if (!fragment) { fragments.clear(); fragments.add(''); }
    else if (!fragments.has('')) fragments.add(fragment);
  };

  /** 登记原生资料引用；只把直接公共参考纳入正文，不递归加载引用树。 */
  const collectReferences = (document, loadPublic) => {
    for (const reference of referencesIn(document.content)) {
      const located = locateReference(root, reference, document, route.sourceSkill);
      if (!located) continue;
      const key = `${located.path}#${located.fragment}`;
      if (!located.absolute) { resources.set(key, located); continue; }
      const folder = located.path.split('/')[0];
      if (!allowedRoots.has(folder)) {
        resources.set(key, { path: located.path, fragment: located.fragment, kind: 'outside-selected-stack', available: false });
        continue;
      }
      const available = existsSync(located.absolute);
      const publicReference = publicRoots.has(folder) && located.path.includes('/references/') && located.path.endsWith('.md');
      if (loadPublic && publicReference && !reference.inline) requestPublic(located.path, located.fragment);
      if (!reference.inline && !available) throw new Error(`所选模式引用的资料不存在：${located.path}`);
      resources.set(key, { path: located.path, fragment: located.fragment, kind: located.path.endsWith('/native-contracts.md') ? 'native-mode' : publicReference ? 'public-reference' : 'resource', available });
    }
  };

  collectReferences(native, true);
  for (const workflow of manifest.sharedWorkflows ?? []) {
    if (!Array.isArray(workflow.stacks) || !workflow.stacks.includes(stack)) continue;
    const target = safePath(root, relative(root, resolve(dirname(manifestFile.absolute), workflow.path)));
    if (!publicRoots.has(target.path.split('/')[0]) || !target.path.includes('/references/') || !target.path.endsWith('.md')) throw new Error(`公共工作流路径无效：${workflow.path}`);
    const file = readRequired(root, target.path);
    requestPublic(file.path);
  }
  const shared = [];
  for (const [path, fragments] of requests) {
    const file = readRequired(root, path);
    for (const section of fragments) {
      const document = { kind: 'shared', path, section, content: extractMarkdownSection(file.content, section) };
      shared.push(document);
      collectReferences(document, false);
    }
  }
  const resourceRoot = safePath(root, route.sourceSkill);
  return {
    stack, capability, sourceSkill: route.sourceSkill, mode: route.mode, when: route.when,
    capabilityPath: `${capability}/SKILL.md`,
    resourceRoot: existsSync(resourceRoot.absolute) ? resourceRoot.path : null,
    documents: [native, ...shared],
    resources: [...resources.values()].sort((left, right) => `${left.path}#${left.fragment}`.localeCompare(`${right.path}#${right.fragment}`)),
    stats: { manualCharacters: manual.content.length, nativeCharacters: content.length, sharedCharacters: shared.reduce((total, document) => total + document.content.length, 0), omittedNativeCharacters: manual.content.length - content.length },
  };
}

/** 将结构化结果展示为可直接阅读的规范；路径明确相对技能安装根。 */
export function formatNativeMode(result) {
  const lines = [`# ${result.stack} · ${result.capability} · ${result.sourceSkill}`, '', '以下路径相对技能安装根；只展开当前模式及直接公共依赖，附属资源按任务需要读取。', `公共能力入口：\`${result.capabilityPath}\``, ''];
  if (result.resourceRoot) lines.push(`原生资源目录：\`${result.resourceRoot}/\``, '');
  for (const document of result.documents) {
    lines.push(`## ${document.kind === 'native' ? '原生模式' : '直接公共依赖'}：${document.path}${document.section ? `#${document.section}` : ''}`, '', document.content.trim(), '');
  }
  if (result.resources.length) {
    lines.push('## 按需引用与资源', '');
    for (const resource of result.resources) lines.push(`- \`${resource.path}${resource.fragment ? `#${resource.fragment}` : ''}\`（${resource.available ? '存在' : resource.kind === 'outside-selected-stack' ? '其他技术栈，未加载' : '项目引用或未提供的行内示例'}）`);
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** 解析最少位置参数，多模式时通过来源ID选择，JSON便于校验和集成。 */
export function parseNativeModeArgs(argv) {
  const positional = [];
  let json = false;
  let help = false;
  for (const argument of argv) {
    if (argument === '--json') json = true;
    else if (argument === '--help' || argument === '-h') help = true;
    else if (argument.startsWith('-')) throw new Error(`未知参数：${argument}`);
    else positional.push(argument);
  }
  if (!help && (positional.length < 2 || positional.length > 3)) throw new Error('用法：read-native-mode.mjs <技术栈> <能力> [来源模式] [--json]');
  return { stack: positional[0], capability: positional[1], sourceSkill: positional[2], json, help };
}

/** CLI仅输出资料，不运行项目、生成文件或执行所列脚本。 */
export function runNativeModeCli(argv = process.argv.slice(2)) {
  const options = parseNativeModeArgs(argv);
  if (options.help) {
    process.stdout.write('用法：node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <公共能力> [来源模式] [--json]\n例如：flutter app-feedback；unity app-animation unity-game-3d-animation\n多模式时必须明确来源模式；仅展开直接公共依赖，不执行工具。\n');
    return;
  }
  const result = loadNativeMode(options);
  process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : formatNativeMode(result));
}

if (isDirectEntry(import.meta.url)) {
  try { runNativeModeCli(); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
