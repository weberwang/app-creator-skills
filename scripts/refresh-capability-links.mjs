/** 更新仓库自有说明中的能力调用，迁移载荷只能通过源变换更新其摘要。 */
import { existsSync, readdirSync } from 'node:fs';
import { readFileSync, writeFileSync } from './migration/file-io.mjs';
import { join, relative } from 'node:path';
import { nativeAdapterPath } from './capability-map.mjs';
import { buildNativeTargets as createNativeTargets, extractNativeSection } from '../skills/app-skill-runtime/native-contracts.mjs';
import { routeCapabilityText } from './migration/capability-entry-routing.mjs';
import { rebaseNativeCodePathReferences, rebaseNativeMarkdownLinks } from './migration/native-manual-renderer.mjs';

/** 只路由说明正文，暂存 fenced 与缩进代码，避免改写示例里的源路径。 */
function routeMaintenanceText(text, context) {
  const blocks = [];
  const visible = [];
  let fence = null;
  let fencedLines = [];
  const preserve = (content) => {
    const index = blocks.push(content) - 1;
    visible.push(`\u0000CAPABILITY_CODE_${index}\u0000`);
  };
  for (const line of text.split(/(?<=\n)/)) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      fencedLines.push(line);
      const closing = /^\s{0,3}(`+|~+)\s*$/.exec(line);
      if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) {
        preserve(fencedLines.join(''));
        fence = null;
        fencedLines = [];
      }
      continue;
    }
    if (marker) {
      fence = { marker: marker[1][0], length: marker[1].length };
      fencedLines = [line];
    } else if (/^(?: {4}|\t)/.test(line)) preserve(line);
    else visible.push(line);
  }
  if (fencedLines.length) preserve(fencedLines.join(''));
  const routed = routeCapabilityText(visible.join(''), context);
  return routed.replace(/\u0000CAPABILITY_CODE_(\d+)\u0000/g, (_token, index) => blocks[Number(index)]);
}

/** 从迁移目录规范化来源章节，再交给运行时共用解析器构建路由。 */
function targetsFromCatalog(root, catalog) {
  const sections = [];
  const manualTexts = new Map();
  for (const stack of Object.values(catalog.stacks ?? {})) {
    for (const adapter of [...(stack.nativeAdapters ?? []), ...(stack.authoredAdapters ?? [])]) {
      if (!adapter.sourceSkill || !adapter.path || !adapter.section) {
        throw new Error(`原生章节链接映射无效或重复：${adapter.sourceSkill ?? '<unknown>'}`);
      }
      if (!manualTexts.has(adapter.path)) manualTexts.set(adapter.path, readFileSync(join(root, ...adapter.path.split('/')), 'utf8'));
      sections.push({
        sourceSkill: adapter.sourceSkill,
        stagePath: nativeAdapterPath(adapter.sourceSkill),
        manualPath: adapter.path,
        section: adapter.section,
        body: extractNativeSection(manualTexts.get(adapter.path), adapter.sourceSkill),
      });
    }
  }
  return createNativeTargets(sections, catalog.sharedCapabilities ?? []);
}

/** 忽略逐文件账本拥有的产物，防止维护索引时暗中改坏专业载荷哈希。 */
export function refreshCapabilityLinks({ root }) {
  const ledger = join(root, 'migration/files.json');
  const catalog = join(root, 'migration/catalog.json');
  const owned = new Set(existsSync(ledger) ? JSON.parse(readFileSync(ledger, 'utf8')).files.map((row) => row.destination).filter(Boolean) : []);
  const catalogData = existsSync(catalog) ? JSON.parse(readFileSync(catalog, 'utf8')) : {};
  if (existsSync(catalog)) for (const row of catalogData.generatedFiles ?? []) owned.add(row.path);
  const nativeTargets = targetsFromCatalog(root, catalogData);
  const changed = [];
  // 递归仅访问维护目录；缓存、外部工程与来源归档不参与说明改写。
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (['node_modules', 'Artifacts', 'migration', '.git', '.agents'].includes(entry.name)) continue;
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      const path = relative(root, file).replaceAll('\\', '/');
      if (owned.has(path) || (!path.endsWith('.md') && !/^skills\/app-stack-[^/]+\/profile\.json$/.test(path))) continue;
      const original = readFileSync(file, 'utf8');
      const routed = routeMaintenanceText(original, { stack: '', sourcePath: path });
      const linked = rebaseNativeMarkdownLinks(routed, { stagePath: path, manualPath: path, sourceSkill: '', targets: nativeTargets, nativeOnly: true });
      const next = rebaseNativeCodePathReferences(linked, { targets: nativeTargets });
      if (next !== original) {
        if (path.endsWith('.json')) JSON.parse(next);
        writeFileSync(file, next);
        changed.push(path);
      }
    }
  };
  visit(root);
  return changed;
}
