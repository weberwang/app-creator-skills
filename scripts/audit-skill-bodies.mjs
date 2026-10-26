#!/usr/bin/env node
/** 扫描仍在专业技能中跨栈重复维护的完整正文，作为语义审查候选而非自动删除依据。 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNativeSection } from './capability-map.mjs';
import { canonicalWorkflowBlock, readWorkflowBlocks } from './migration/web-workflow-bodies.mjs';

/** 排除单点生成的公共导航，不能把调用共享规范误报为仍在维护规则副本。 */
function isRoutingBlock(text) {
  return /^\s*>/.test(text) || /通用工作流步骤见|公共执行协议|本栈配套资料|完整规范/.test(text)
    || /^\s*[-*]\s+\[[^\]]+\]\([^)]+\)\s*$/.test(text);
}

/** 区分单点生成的协议适配、必须保留的本栈命令与仍需语义判断的正文副本。 */
function classifyCandidate(content, sources, rows) {
  if (/^```|\bnode\s+scripts\/|--asset-dir/.test(content)) return { category: 'native-command-adapter' };
  if (/^在平台矩阵和发布清单登记候选包|^\*\*执行前复核\*\*|^用户要求清理时/.test(content)
    && sources.every((source) => rows.get(source.sourceKey)?.transforms?.some((item) => /^route-(?:cleanup|release)-skill-to-public-execution$/.test(item)))) {
    return { category: 'generated-public-protocol-adapter', maintainedAt: 'scripts/migration/professional-routing.mjs' };
  }
  return { category: 'review-needed' };
}

/** 只归一化链接表示，完整保留原生 API、参数与代码差异供维护者判断。 */
export function auditSkillBodies(root) {
  const catalog = JSON.parse(readFileSync(resolve(root, 'migration/catalog.json'), 'utf8'));
  const ledger = resolve(root, 'migration/files.json');
  const rows = new Map((existsSync(ledger) ? JSON.parse(readFileSync(ledger, 'utf8')).files : [])
    .filter((row) => row.nativeSection?.sourceSkill)
    .map((row) => [`${row.stack}:${row.nativeSection.sourceSkill}`, row]));
  const groups = new Map();
  let skills = 0;
  for (const [stack, record] of Object.entries(catalog.stacks)) for (const adapter of record.nativeAdapters) {
    skills += 1;
    const file = adapter.path;
    const fullText = readFileSync(resolve(root, file), 'utf8');
    const text = extractNativeSection(fullText, adapter.sourceSkill);
    const marker = `<!-- native-source:${adapter.sourceSkill}:start -->`;
    const lineOffset = fullText.slice(0, fullText.indexOf(marker)).split('\n').length;
    const sourceKey = `${stack}:${adapter.sourceSkill}`;
    for (const block of readWorkflowBlocks(text)) {
      if (isRoutingBlock(block.original)) continue;
      const { canonical } = canonicalWorkflowBlock(block.original, { routeScripts: false });
      if (canonical.length < 120) continue;
      if (!groups.has(canonical)) groups.set(canonical, []);
      groups.get(canonical).push({ stack, file, sourceKey, sourceSkill: adapter.sourceSkill, heading: block.sourceHeading, line: lineOffset + text.slice(0, block.sourceRange.start).split('\n').length });
    }
  }
  const candidates = [...groups].filter(([, sources]) => new Set(sources.map((source) => source.stack)).size >= 2)
    .map(([content, sources]) => ({ characters: content.length, content, sources, ...classifyCandidate(content, sources, rows) }))
    .sort((left, right) => right.characters * (right.sources.length - 1) - left.characters * (left.sources.length - 1));
  return { nativeAdapters: skills, sharedWorkflowDocuments: catalog.sharedCapabilities.filter((item) => item.kind === 'workflow').length, candidateBlocks: candidates.length,
    reviewNeeded: candidates.filter((item) => item.category === 'review-needed').length,
    repeatedCharacters: candidates.reduce((sum, item) => sum + item.characters * (item.sources.length - 1), 0),
    limitation: '仅报告仍存在的完整等价段落；不替代语义审查，也不表示技术栈相似接口可以互换。', candidates };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const output = auditSkillBodies(root);
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error('用法：node scripts/audit-skill-bodies.mjs [--output <报告路径>]');
  if (args.length) writeFileSync(resolve(args[1]), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ ...output, candidates: output.candidates.slice(0, 5).map((item) => ({ ...item, content: item.content.slice(0, 120) })) }, null, 2));
}
