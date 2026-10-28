/** 从逐项安装清单选择专业技能与领域资源，安装和验证共用同一入口。 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_SKILLS } from './capability-map.mjs';

/** 加载清单，缺失时阻断安装，防止退化成只分发九个公共底座技能。 */
export function readSkillCatalog(sourceRoot) {
  const file = join(sourceRoot, 'packages', 'installer', 'catalog.json');
  if (!existsSync(file)) throw new Error('完整安装清单缺失：不能仅安装公共底座');
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  if (catalog.schemaVersion !== '1.0' || !catalog.stacks || Array.isArray(catalog.stacks)) throw new Error('技能安装清单格式无效');
  return catalog;
}

/** 验证目录名称，清单不得通过目录名扩大安装写入范围。 */
function safeName(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(value)) throw new Error(`清单目录名无效：${value}`);
  return value;
}

/** 为所选技术栈展开完整专业入口与非入口支持目录。 */
export function stackPayloads(sourceRoot, stacks) {
  const catalog = readSkillCatalog(sourceRoot);
  const entries = [];
  for (const stack of new Set(stacks)) {
    const record = catalog.stacks[stack];
    if (!record || !Array.isArray(record.capabilitySkills) || !record.capabilitySkills.length || !Array.isArray(record.nativeAdapters) || !record.nativeAdapters.length || !Array.isArray(record.resourceDirectories)) throw new Error(`技术栈完整安装清单无效：${stack}`);
    entries.push(...record.capabilitySkills.filter((name) => !CORE_SKILLS.includes(name)).map((name) => ({ name: safeName(name), kind: 'skill', stack })));
    entries.push(...record.resourceDirectories.map((name) => ({ name: safeName(name), kind: 'resource', stack })));
  }
  entries.push({ name: 'app-skill-runtime', kind: 'resource', stack: 'shared' });
  const names = new Set();
  return entries.filter((entry) => { if (names.has(entry.name)) return false; names.add(entry.name); return true; });
}
