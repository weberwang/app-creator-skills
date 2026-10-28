#!/usr/bin/env node
/** 检查已安装领域参考中的实际重复正文，补齐仅审计原生手册的盲区。 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWorkflowBlocks } from './migration/web-workflow-bodies.mjs';

/** 去掉技术栈目录名的表示差异，仅在同一职责及参考主题内比较原文。 */
function referenceTopic(sourcePath) {
  return sourcePath.replace(/^skills\//, '').replace(/^(?:unity|cocos|phaser4|threejs|flutter)-/, '');
}

/** 导航和保留的来源元数据不构成重复执行规则。 */
function isNavigation(block) {
  const text = block.original.trim();
  return ['目录', '本栈配套资料'].includes(block.sourceHeading)
    || /^(?:>\s*|[-*+]\s+|\d+[.)]\s+)?通用工作流步骤见\[完整规范\]\([^)]+\)。$/.test(text)
    || /^> 迁移说明：/.test(text)
    || /^(?:[-*+]\s+)?\[[^\]]+\]\([^)]+\)[。.]?$/.test(text)
    || (/(?:^|\n)name:\s*\S+/.test(text) && /(?:^|\n)description:/.test(text));
}

/** 保留原生合同及待审正文的区分，不能把字面重复自动解释为可删除。 */
function category(sources) {
  if (sources.every((source) => /(?:^|\/)[^/]*game-workflow-control\//.test(source.sourcePath))) return 'native-domain-contract';
  return 'review-needed';
}

/** 无长度阈值扫描参考全文；有序编号、API、字段、外链和完整代码围栏均按原文比较。 */
export function auditReferenceBodies(root) {
  const ledger = JSON.parse(readFileSync(resolve(root, 'migration/files.json'), 'utf8'));
  const groups = new Map();
  const visited = new Set();
  let documents = 0;
  for (const row of ledger.files) {
    if (!row.destination?.startsWith('skills/') || row.destination.startsWith('skills/app-')
      || !row.destination.endsWith('.md') || row.nativeSection) continue;
    const identity = `${row.stack}:${row.destination}`;
    if (visited.has(identity)) continue;
    visited.add(identity);
    documents += 1;
    const text = readFileSync(resolve(root, row.destination), 'utf8');
    for (const block of readWorkflowBlocks(text)) {
      if (isNavigation(block)) continue;
      const content = block.original.trim().replaceAll('\r\n', '\n');
      const key = `${referenceTopic(row.sourcePath)}\n${block.sourceHeading}\n${content}`;
      if (!groups.has(key)) groups.set(key, { content, sources: [] });
      groups.get(key).sources.push({ stack: row.stack, sourcePath: row.sourcePath, file: row.destination,
        heading: block.sourceHeading, line: text.slice(0, block.sourceRange.start).split('\n').length });
    }
  }
  const candidates = [...groups.values()].filter((group) => new Set(group.sources.map((source) => source.stack)).size >= 2)
    .map((group) => ({ ...group, characters: group.content.length, category: category(group.sources) }))
    .sort((a, b) => b.characters * (b.sources.length - 1) - a.characters * (a.sources.length - 1));
  return { documents, candidateBlocks: candidates.length,
    reviewNeeded: candidates.filter((item) => item.category === 'review-needed').length,
    repeatedCharacters: candidates.reduce((sum, item) => sum + item.characters * (item.sources.length - 1), 0),
    limitation: '全文原文重复扫描仅提供审查候选；不证明字段、原生接口或措辞不同的规则可互换。', candidates };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditReferenceBodies(resolve(import.meta.dirname, '..'));
  console.log(JSON.stringify({ ...report, candidates: report.candidates.slice(0, 12) }, null, 2));
}
