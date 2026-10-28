/** 将素材管线与玩法中的同一职责边界汇入玩法真源，不维护两份近义规则。 */
import { referenceBlockHash } from './reference-workflow-common.mjs';

const PRIMARY = 'gameplay-implementation';
const SECONDARY = 'reference-asset-visual-production-pipeline';
const ROLE = '2. 玩法独占规则、状态、碰撞和交互代码；美术可以调整不改变玩法的布局与表现集成。视觉接入只改变表现，不得改变玩法规则、碰撞语义或状态所有权；跨边界改动停止并交回所有者。';
const HEADING = '玩法与美术职责';

/** 在完整来源计划内重定位一项经逐句核对的职责规则，保留所有原始源区间。 */
export function consolidateRoleOwnership(plan) {
  const primary = plan.documents.find((item) => item.capabilityId === PRIMARY);
  const secondary = plan.documents.find((item) => item.capabilityId === SECONDARY);
  const owners = plan.replacements.filter((item) => item.capabilityId === PRIMARY && item.canonical.startsWith('玩法独占玩法规则、状态、碰撞、交互代码'));
  const moved = plan.replacements.filter((item) => item.capabilityId === SECONDARY && item.canonical === ROLE);
  if (!primary || !secondary || owners.length !== 3 || moved.length !== 3) throw new Error('玩法与美术职责来源发生变化，须重新逐句审查');
  const original = owners[0].canonical;
  if (!owners.every((item) => item.canonical === original) || primary.content.split(original).length !== 2
    || secondary.content.split(ROLE).length !== 2) throw new Error('公共职责规则不唯一，拒绝猜测归并');
  const canonical = original.replace('停止受影响实现，返回模块审计', '停止受影响实现并交回所有者，返回模块审计');
  const canonicalHash = referenceBlockHash(canonical);
  primary.content = primary.content.replace(original, `完整边界见[${HEADING}](#玩法与美术职责)。`)
    + `\n## ${HEADING}\n\n> 适用技术栈：cocos、phaser、threejs。\n\n${canonical}\n`;
  secondary.content = secondary.content.replace(ROLE, `2. 玩法、美术边界与跨边界处理见[${HEADING}](./gameplay-implementation.md#玩法与美术职责)。`);
  const previousHash = owners[0].canonicalHash;
  for (const source of primary.sources) for (const section of source.sections) {
    if (section.canonicalHash === previousHash) Object.assign(section, { canonical, canonicalHash, heading: HEADING });
  }
  for (const item of [...owners, ...moved]) {
    if (moved.includes(item)) {
      const record = secondary.sources.find((source) => source.stack === item.stack && source.sourcePath === item.sourcePath);
      const index = record?.sections.findIndex((section) => section.sourceHash === item.sourceHash
        && section.sourceRange.start === item.sourceRange.start) ?? -1;
      if (index < 0) throw new Error('素材职责缺少原始来源记录');
      const [section] = record.sections.splice(index, 1);
      let target = primary.sources.find((source) => source.stack === item.stack && source.sourcePath === item.sourcePath);
      if (!target) { target = { stack: item.stack, sourcePath: item.sourcePath, sections: [] }; primary.sources.push(target); }
      target.sections.push({ ...section, canonical, canonicalHash, heading: HEADING });
    }
    Object.assign(item, { capabilityId: PRIMARY, commonPath: primary.path, canonical, canonicalHash, heading: HEADING });
  }
  secondary.sources = secondary.sources.filter((source) => source.sections.length);
  return plan;
}
