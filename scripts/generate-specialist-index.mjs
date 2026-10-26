#!/usr/bin/env node
/** 根据迁移清单生成专业技能索引，避免手工索引与实际分发目录脱节。 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillCatalog } from './skill-catalog.mjs';
import { CAPABILITY_GROUPS, CORE_SKILLS } from './capability-map.mjs';
import { generateCapabilitySkills } from './generate-capability-skills.mjs';
import { refreshCapabilityLinks } from './refresh-capability-links.mjs';

/** 当前维护仓库的根路径，不在源仓库中写入索引。 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 从技能原文提取中文标题，仅用于导航，不替代技能本身。 */
function titleFor(name) {
  const file = join(ROOT, 'skills', name, 'SKILL.md');
  if (!existsSync(file)) throw new Error(`索引目标缺失：${name}`);
  return readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)?.[1] ?? name;
}

/** 查出某个原技能所依赖的公共正文和实现，入口数量不等于独立实现份数。 */
function sharedForSkill(capabilities, stack, skill) {
  const directory = skill.sourcePath.replace(/\/SKILL\.md$/, '');
  return capabilities.filter((capability) => capability.sources?.some((source) => source.stack === stack
    && (source.sourcePath === skill.sourcePath || source.sourcePath.startsWith(`${directory}/`))));
}

/** 生成共用实现的逐项对照，公开原生差异边界并提供实际文件入口。 */
function writeSharedIndex(capabilities) {
  const lines = ['# 公共能力与技术栈适配', '', '本表列出实际抽出的公共真源。原专业入口继续表达技术栈边界；共用规则和算法只维护一份，适配层负责具体标识、资源导入及调用。完整源映射仍见迁移文件清单。', '', '| 公共能力 | 类型 | 适用栈 | 实际真源 |', '| --- | --- | --- | --- |'];
  const kinds = { module: '公共算法', asset: '公共资源', workflow: '公共生产规范', template: '公共项目模板' };
  for (const capability of capabilities) {
    lines.push(`| ${capability.id} | ${kinds[capability.kind] ?? capability.kind} | ${capability.stacks.join('、')} | [${capability.implementation}](../${capability.implementation}) |`);
  }
  for (const capability of capabilities) {
    lines.push('', `## ${capability.id}`, '', '| 原技术栈 | 源文件 | 当前专业适配入口 |', '| --- | --- | --- |');
    for (const source of capability.sources) lines.push(`| ${source.stack} | ${source.sourcePath} | [${source.adapterDestination}](../${source.adapterDestination}${source.adapterSection ? `#${source.adapterSection}` : ''}) |`);
    if (capability.reason) lines.push('', capability.reason);
  }
  lines.push('', '## 保持独立的规则', '', 'Unity 序列化、`.meta/GUID` 和 Editor 单写者，Creator AssetDB/UUID，Phaser Scale/Scene/Input，Three.js 世界投影/renderer，以及 Flutter Widget/SafeArea/文字缩放继续按各栈规范维护。浏览器游戏 DPR 合同的适用范围仅为其表中所列技术栈，不推给 Unity 或 Flutter。', '', '具体源段落、文件摘要、配置差异和依赖见 migration/catalog.json 的 sharedCapabilities、generatedFiles 及 migration/files.json 的 sharedImplementationRef/sharedReferences。');
  writeFileSync(join(ROOT, 'docs', 'shared-capabilities.md'), `${lines.join('\n')}\n`);
}

/** 给维护者列出所有原入口的明确去向以及额外保留的模板。 */
export function generateSpecialistIndex() {
  const catalog = readSkillCatalog(ROOT);
  generateCapabilitySkills({ root: ROOT });
  const sharedCapabilities = catalog.sharedCapabilities ?? [];
  writeSharedIndex(sharedCapabilities);
  const report = ['# 技能逐项迁移清单', '', '技能入口按能力组织，各技术栈在一份原生手册内分能力和模式维护专业差异，工具载荷独立保留。源正式入口仍全部登记，原名称不再作为别名 skill 分发。仓库新增模式单独统计，不计入源迁入数量。文件级去向、来源章节及摘要见[迁移目录](../migration/catalog.json)。', '', '| 技术栈 | 源正式入口 | 源专业模式 | 仓库新增模式 | 可用能力入口 |', '| --- | ---: | ---: | ---: | ---: |'];
  for (const [stack, record] of Object.entries(catalog.stacks)) {
    const roots = record.skills.filter((item) => item.skillKind !== 'nested-template');
    report.push(`| ${stack} | ${roots.length} | ${record.nativeAdapters.length} | ${record.authoredAdapters.length} | ${record.capabilitySkills.length} |`);
  }
  for (const [stack, record] of Object.entries(catalog.stacks)) {
    const profileFile = join(ROOT, 'skills', `app-stack-${stack}`, 'profile.json');
    const profile = JSON.parse(readFileSync(profileFile, 'utf8'));
    delete profile.specialistSkills;
    profile.capabilitySkills = record.capabilitySkills;
    profile.nativeAdapters = record.nativeAdapters;
    profile.authoredAdapters = record.authoredAdapters;
    profile.nativeManual = record.nativeManual;
    profile.resourceDirectories = record.resourceDirectories;
    profile.sharedCapabilities = sharedCapabilities.filter((capability) => capability.stacks.includes(stack)).map((capability) => capability.id);
    writeFileSync(profileFile, `${JSON.stringify(profile, null, 2)}\n`);
    const index = [`# ${profile.displayName} 能力与原生适配`, '', '从公共能力入口进入任务，再按模式定位本栈[原生技术手册](native-contracts.md)的对应章节。专业差异集中维护，脚本、模板与校验器仍在各资源目录；旧专业目录不保留 SKILL.md 或 ADAPTER.md 入口。', '', '领域输入与公共证据接线见[领域校验接入](domain-validation.md)。', '', '| 公共能力 | 唯一入口 |', '| --- | --- |'];
    for (const name of record.capabilitySkills) index.push(`| ${titleFor(name)} | [${name}](../../${name}/SKILL.md) |`);
    index.push('', '## 原生适配模式', '', '| 原专业能力 | 公共入口 | 完整原生规范 |', '| --- | --- | --- |');
    for (const adapter of record.nativeAdapters) index.push(`| ${adapter.sourceSkill} | $${adapter.capability} | [原生章节](../../${adapter.path.replace(/^skills\//, '')}#${adapter.section}) |`);
    for (const adapter of record.authoredAdapters) index.push(`| ${adapter.sourceSkill}（本仓库新增） | $${adapter.capability} | [原生章节](../../${adapter.path.replace(/^skills\//, '')}#${adapter.section}) |`);
    const shared = sharedCapabilities.filter((capability) => capability.stacks.includes(stack));
    if (shared.length) {
      index.push('', '## 共用实现与正文', '', '这些规则与算法由公共能力调用，执行时只采用本栈适用部分。', '', '| 能力 | 公共真源 |', '| --- | --- |');
      for (const capability of shared) index.push(`| ${capability.id} | [${capability.implementation}](../../${capability.implementation.replace(/^skills\//, '')}) |`);
    }
    index.push('', '## 支持资源', '', ...record.resourceDirectories.map((name) => `- [${name}](../../${name})：领域资料、模板和工具依赖；不含独立全局流程入口。`));
    const tools = (record.tools ?? []).filter((tool) => typeof tool.path === 'string' && tool.path);
    if (tools.length) {
      index.push('', '## 原工具入口', '', '运行 Node 专业工具前按安装说明准备统一依赖。视频、DCC 和引擎工具仍需对应外部程序，不因脚本存在而认定已经运行。', '');
      for (const tool of tools) index.push('- `' + tool.name + '`：[实现](../../' + (tool.path.startsWith('skills/') ? tool.path.slice(7) : tool.path) + ')' + (tool.kind === 'module' ? '，通过 ESM 导入的校验接口，不作为命令执行。' : '，按专业技能中给出的 CLI 参数调用。'));
    }
    writeFileSync(join(ROOT, 'skills', `app-stack-${stack}`, 'references', 'specialist-skills.md'), `${index.join('\n')}\n`);
    const skillFile = join(ROOT, 'skills', `app-stack-${stack}`, 'SKILL.md');
    let skill = readFileSync(skillFile, 'utf8');
    const route = '\n完整专业入口和原工具见[专业技能与工具索引](references/specialist-skills.md)，不要用本技术栈概览替代专业技能。\n';
    if (!skill.includes('references/specialist-skills.md')) skill = skill.replace(/(^# .+$)/m, `$1\n${route}`);
    writeFileSync(skillFile, skill);
    report.push('', `## ${profile.displayName}`, '', '| 源技能 | 处理 | 唯一公共入口 | 保留的原生规范 | 共用实现 |', '| --- | --- | --- | --- | --- |');
    for (const item of record.skills.filter((entry) => entry.skillKind !== 'nested-template')) {
      const shared = sharedForSkill(sharedCapabilities, stack, item);
      report.push('| `' + item.name + '` | ' + (item.adapterDestination ? '公共入口与本栈手册章节' : '公共流程合并') + ' | [' + item.destination + '](../' + item.destination + ') | ' + (item.adapterDestination ? `[原生章节](../${item.adapterDestination}#${item.adapterSection})` : '领域资料与工具按文件清单保留') + ' | ' + (shared.map((capability) => `[${capability.id}](shared-capabilities.md#${capability.id})`).join('、') || '原生规范') + ' |');
    }
  }
  report.push('', '## 共用实现', '', '专业技能入口数量不代表实现复制份数。抽出的规则、算法、字库和薄适配逐项见[公共能力清单](shared-capabilities.md)，文件账本记录共享目标及源来源。', '', '## 嵌套生成模板', '', 'Flutter 的 `flutter-project-init/assets/flutter-dev/SKILL.md` 是生成到实际项目的完整技能模板，连同生成脚本一起保留；不计作仓库中的正式根入口。', '', '## 核对方式', '', '`npm run check:migration` 离线核对目标完整性；`npm run check:migration -- --source-root E:/Git` 对照五个源仓库逐文件检查。清单中的完整性摘要用于迁移审计，不是产品确认或运行验收门禁。');
  writeFileSync(join(ROOT, 'docs', 'skill-migration.md'), `${report.join('\n')}\n`);
  // 保留专业命令名；旧总控与旧安装器不再创建第二套命令入口。
  const packageFile = join(ROOT, 'package.json');
  const packageData = JSON.parse(readFileSync(packageFile, 'utf8'));
  packageData.bin ??= {};
  packageData.bin['app-workflow'] = './skills/app-workflow-control/scripts/workflow-control.mjs';
  for (const record of Object.values(catalog.stacks)) {
    for (const tool of record.tools ?? []) {
      if (!tool.path || tool.path.includes('/app-workflow-control/') || tool.disposition === 'source-only') continue;
      const target = './' + tool.path;
      // 只读库接口没有 main/参数解析，不能注册为运行后静默成功的伪 CLI。
      if (tool.kind === 'module') {
        if (packageData.bin[tool.name] === target) delete packageData.bin[tool.name];
        continue;
      }
      if (packageData.bin[tool.name] && packageData.bin[tool.name] !== target) throw new Error(`专业命令名发生冲突：${tool.name}`);
      packageData.bin[tool.name] = target;
    }
  }
  writeFileSync(packageFile, `${JSON.stringify(packageData, null, 2)}\n`);
  refreshCapabilityLinks({ root: ROOT });
  return { stacks: Object.keys(catalog.stacks).length, capabilitySkills: CAPABILITY_GROUPS.filter((group) => !group.core).length, nativeAdapters: Object.values(catalog.stacks).reduce((count, item) => count + item.nativeAdapters.length, 0), discoverableSkills: CORE_SKILLS.length + 5 + CAPABILITY_GROUPS.filter((group) => !group.core).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(generateSpecialistIndex()));
