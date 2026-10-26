#!/usr/bin/env node
/** 按能力映射生成统一入口和栈内原生适配索引，不复制或改写专业适配正文。 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_GROUPS, capabilityAdapters } from './capability-map.mjs';
import { CAPABILITY_ADAPTER_MODES, CAPABILITY_CONTENT, getCapabilityContent } from './capability-content.mjs';

/** 默认指向此脚本所在仓库，测试和维护工具可传入隔离的根目录。 */
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTE_START = '<!-- capability-route:start -->';
const ROUTE_END = '<!-- capability-route:end -->';
const STACK_LABELS = Object.freeze({ unity: 'Unity', cocos: 'Cocos Creator', phaser: 'Phaser', threejs: 'Three.js', flutter: 'Flutter' });

/** 对技能正文和代理元数据共用同一套安全的 YAML 双引号转义。 */
function yamlString(value) {
  return JSON.stringify(value);
}

/** 避免全量重生成时触碰内容未变化的公共文件。 */
function writeIfChanged(file, content) {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return;
  writeFileSync(file, content, 'utf8');
}

/** 校验能力正文与技术栈映射完全对应，避免生成缺失或重复入口。 */
function validateGroups(groups) {
  const names = new Set();
  const nativeNames = new Set();
  for (const group of groups) {
    if (names.has(group.name)) throw new Error(`能力入口重复：${group.name}`);
    names.add(group.name);
    const adapters = capabilityAdapters(group);
    if (!adapters.length) throw new Error(`能力未映射原生适配：${group.name}`);
    for (const adapter of adapters) {
      // reuse 引用另一入口的同一份原生适配，不是第二份primary映射。
      if (!adapter.reused && !adapter.authored) {
        if (nativeNames.has(adapter.sourceSkill)) throw new Error(`原生能力重复映射：${adapter.sourceSkill}`);
        nativeNames.add(adapter.sourceSkill);
      }
    }
    if (!group.core && !getCapabilityContent(group.name)) throw new Error(`能力正文缺失：${group.name}`);
  }
  const configured = Object.keys(CAPABILITY_CONTENT).sort();
  const expected = groups.filter((group) => !group.core).map((group) => group.name).sort();
  if (JSON.stringify(configured) !== JSON.stringify(expected)) throw new Error('能力正文配置与非core映射不一致。');
}

/** 依据当前能力记录生成栈分组适配表，多个源技能模式分别保留。 */
function buildAdapters(group) {
  const adapters = {};
  for (const adapter of capabilityAdapters(group)) {
    const modeInfo = CAPABILITY_ADAPTER_MODES[adapter.sourceSkill];
    const mode = adapter.mode ?? modeInfo?.mode ?? adapter.sourceSkill;
    const when = adapter.when ?? modeInfo?.when ?? `仅当项目技术栈为 ${STACK_LABELS[adapter.stack] ?? adapter.stack}，且任务属于“${group.title}”时使用此原生专项能力。`;
    const path = adapter.path;
    const manifestAdapter = {
      sourceSkill: adapter.sourceSkill,
      path: path.startsWith('skills/') ? `../${path.slice('skills/'.length)}` : path,
      section: adapter.section,
      mode,
      when
    };
    if (adapter.reused) manifestAdapter.reused = true;
    if (adapter.authored) manifestAdapter.authored = true;
    (adapters[adapter.stack] ??= []).push(manifestAdapter);
  }
  return adapters;
}

/** 将目录内公共工作流转成当前能力可按技术栈渐进读取的相对路径。 */
function buildSharedWorkflows(group, catalog) {
  const ids = new Set(group.workflows ?? []);
  return (catalog.sharedCapabilities ?? [])
    .filter((item) => item.kind === 'workflow' && ids.has(item.id))
    .map((item) => ({
      id: item.id,
      path: `../${item.implementation.replace(/^skills\//, '')}`,
      stacks: [...item.stacks]
    }));
}

/** 生成携带完整公共操作步骤及按栈路由规则的唯一能力技能正文。 */
function renderSkill(group, content) {
  const body = [
    '---',
    `name: ${group.name}`,
    `description: ${yamlString(content.description)}`,
    '---',
    '',
    `# ${group.title}`,
    '',
    content.purpose,
    '',
    '执行前阅读[公共执行协议](../app-creator-workflow/references/professional-execution.md)。以下共用步骤不能跳过所选原生适配规定的操作顺序、资源格式与平台边界；必要的用户确认按协议执行。',
    '',
    '## 输入',
    '',
    ...content.inputs.map((item) => `- ${item}`),
    '',
    '## 共用操作步骤',
    '',
    ...content.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## 关键边界',
    '',
    ...content.boundaries.map((item) => `- ${item}`),
    '',
    '## 交付',
    '',
    ...content.deliverables.map((item) => `- ${item}`),
    '',
    '## 当前技术栈的原生流程',
    '',
    '先根据仓库实际依赖与项目配置确认当前 `app-stack-*`，再打开同目录的 [native-adapters.json](native-adapters.json)。按 `when` 选择 `mode`，从 `path` 指向的本栈原生手册中定位 `section` 章节，只读取该模式及其明确需要的脚本、模板和校验器；同栈同能力的多个模式在同一本手册内维护。',
    '使用共用读取工具：`node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> ' + group.name + ' [sourceSkill]`。单模式可省略来源，多模式必须指定清单中的 `sourceSkill`；输出所选章节、直接公共依赖及按需资源路径，不递归加载其他模式。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。',
    '若 manifest 未列当前栈，继续使用该栈 `app-stack-*` 中的原生规范/索引及适用公共流程；这本身不代表能力缺失。仅当已声明并选中的原生手册或模式章节未随安装提供时才报告阻断。公共工作流只在 `sharedWorkflows[].stacks` 包含当前栈时读取。不要加载其他栈模式或臆造接口；栈未确认且会影响实现时先澄清。',
    ''
  ];
  return `${body.join('\n')}\n`;
}

/** 生成每个入口的UI元数据，并保留隐式触发能力。 */
function renderOpenAi(group, content) {
  const shortDescription = content.description;
  const length = [...shortDescription].length;
  if (length < 25 || length > 64) throw new Error(`${group.name} 的中文 short_description 长度 ${length} 不在 25-64 字之间。`);
  const allowImplicitInvocation = content.explicitOnly !== true;
  return [
    'interface:',
    `  display_name: ${yamlString(group.title)}`,
    `  short_description: ${yamlString(shortDescription)}`,
    `  default_prompt: ${yamlString(`使用 $${group.name}，按已确认的技术栈完成当前${group.title}任务并交付可验证结果。`)}`,
    'policy:',
    `  allow_implicit_invocation: ${allowImplicitInvocation}`,
    ''
  ].join('\n');
}

/** 将 core 技能的公共工作流映射追加为稳定路由，不触碰其既有执行正文。 */
function renderCoreRoute() {
  return [
    ROUTE_START,
    '## 技术栈原生能力路由',
    '',
    '当前公共流程继续由本技能负责。需要处理目标栈专有的资源结构或实现步骤时，先确认项目的 `app-stack-*`，再读取同目录 [native-adapters.json](native-adapters.json)。manifest列出当前栈时，按 `when` 选择 `mode`，使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs <技术栈> <当前能力名> [sourceSkill]` 读取对应章节、直接公共依赖及按需资源路径；多模式必须指定 `sourceSkill`，维护本仓库时将 `.agents/skills/` 换为 `skills/`。',
    'manifest未列当前栈时，继续使用该栈的 `app-stack-*` 规范/索引和适用公共流程，不视为能力缺失；只有已声明且选中的专项文件缺失才报告阻断。不得改读其他栈适配或虚构原生API。公共工作流仅在 manifest 的适用栈包含当前栈时读取。',
    ROUTE_END
  ].join('\n');
}

/** 以标记段替换或首次追加core路由块，反复生成不会重复写入。 */
function upsertCoreRoute(file, group) {
  if (!existsSync(file)) throw new Error(`core技能文件缺失，拒绝重建或覆盖：${file}`);
  const oldText = readFileSync(file, 'utf8');
  const block = renderCoreRoute();
  const marker = new RegExp(`${ROUTE_START}[\\s\\S]*?${ROUTE_END}`, 'g');
  let nextText;
  if (marker.test(oldText)) nextText = oldText.replace(marker, block);
  else nextText = `${oldText.trimEnd()}\n\n${block}\n`;
  if (nextText !== oldText) writeFileSync(file, nextText, 'utf8');
}

/** 从能力映射和既有共享能力目录生成技能、manifest 和core原生路由。 */
export function generateCapabilitySkills({ root = DEFAULT_ROOT } = {}) {
  const repositoryRoot = resolve(root);
  const catalogPath = join(repositoryRoot, 'migration', 'catalog.json');
  if (!existsSync(catalogPath)) throw new Error(`迁移目录缺失：${catalogPath}`);
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const groups = CAPABILITY_GROUPS;
  validateGroups(groups);
  const files = [];

  for (const group of groups) {
    const adapters = buildAdapters(group);
    const sharedWorkflows = buildSharedWorkflows(group, catalog);
    const manifest = `${JSON.stringify({ capability: group.name, adapters, sharedWorkflows }, null, 2)}\n`;
    const folder = join(repositoryRoot, 'skills', group.name);
    mkdirSync(folder, { recursive: true });
    writeIfChanged(join(folder, 'native-adapters.json'), manifest);
    files.push(`skills/${group.name}/native-adapters.json`);

    if (group.core) {
      upsertCoreRoute(join(folder, 'SKILL.md'), group);
      files.push(`skills/${group.name}/SKILL.md`);
    } else {
      const content = getCapabilityContent(group.name);
      writeIfChanged(join(folder, 'SKILL.md'), renderSkill(group, content));
      files.push(`skills/${group.name}/SKILL.md`);
      const openAi = join(folder, 'agents', 'openai.yaml');
      mkdirSync(dirname(openAi), { recursive: true });
      writeIfChanged(openAi, renderOpenAi(group, content));
      files.push(`skills/${group.name}/agents/openai.yaml`);
    }
  }
  return { capabilities: groups.length, generatedSkills: groups.filter((group) => !group.core).length, files };
}

/** 作为CLI执行时仅输出生成清单，供上层迁移工具登记文件哈希。 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(generateCapabilitySkills(), null, 2));
}
