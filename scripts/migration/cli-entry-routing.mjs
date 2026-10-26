import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RUNTIME_HELPER = 'skills/app-skill-runtime/direct-entry.mjs';
const UNCONDITIONAL_CLI_SOURCE = 'scripts/verify-game-build.mjs';
const UNCONDITIONAL_CLI_DESTINATION = 'skills/threejs-domain-contracts/tools/scripts/verify-game-build.mjs';
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ENTRY_GUARDS = Object.freeze([
  /process\.argv\[1\]\s*&&\s*resolve\(process\.argv\[1\]\)\s*===\s*fileURLToPath\(import\.meta\.url\)/,
  /process\.argv\[1\]\s*&&\s*pathToFileURL\(resolve\(process\.argv\[1\]\)\)\.href\s*===\s*import\.meta\.url/,
  /import\.meta\.url\s*===\s*pathToFileURL\(process\.argv\[1\]\s*\?\?\s*['"]{2}\)\.href/,
  /process\.argv\[1\]\s*&&\s*realpathSync\(process\.argv\[1\]\)\s*===\s*fileURLToPath\(import\.meta\.url\)/,
  /process\.argv\[1\]\s*&&\s*await\s+realpath\(process\.argv\[1\]\)\s*===\s*fileURLToPath\(import\.meta\.url\)/,
  /process\.argv\[1\]\s*&&\s*import\.meta\.url\s*===\s*pathToFileURL\(process\.argv\[1\]\)\.href/,
  /invokedFile\s*&&\s*currentFile\s*===\s*invokedFile/,
]);

/** 跳过字符串和注释后，定位尾部 CLI 条件块的闭合括号。 */
function findClosingBlock(text, openIndex) {
  let depth = 0;
  let state = 'code';
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') { state = 'code'; index += 1; }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if ((state === 'single' && character === "'") || (state === 'double' && character === '"') || (state === 'template' && character === '`')) state = 'code';
      continue;
    }
    if (character === '/' && next === '/') { state = 'line-comment'; index += 1; continue; }
    if (character === '/' && next === '*') { state = 'block-comment'; index += 1; continue; }
    if (character === "'") { state = 'single'; continue; }
    if (character === '"') { state = 'double'; continue; }
    if (character === '`') { state = 'template'; continue; }
    if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return index;
  }
  return -1;
}

/** 确认识别出的 if 语句确实是文件尾部 CLI 入口。 */
function isTailGuard(text, conditionEnd) {
  let cursor = conditionEnd;
  while (text[cursor] === ' ' || text[cursor] === '\t') cursor += 1;
  if (text[cursor] === '{') {
    const closing = findClosingBlock(text, cursor);
    return closing >= 0 && text.slice(closing + 1).trim() === '';
  }
  const lineEnd = text.indexOf('\n', cursor);
  const end = lineEnd < 0 ? text.length : lineEnd;
  const statement = text.slice(cursor, end).trim();
  if (!statement || statement.startsWith('//') || text.slice(end).trim() !== '') return null;
  return true;
}

/** 计算仓库内目标文件到公共运行时 direct-entry helper 的相对模块路径。 */
function helperSpecifier(destination) {
  if (typeof destination !== 'string' || destination.trim() === '') throw new TypeError('destination 必须是仓库内非空路径');
  const normalizedDestination = destination.replaceAll('\\', '/');
  const absoluteDestination = path.isAbsolute(normalizedDestination)
    ? path.resolve(normalizedDestination)
    : path.resolve(REPOSITORY_ROOT, ...normalizedDestination.split('/'));
  const repositoryRelativePath = path.relative(REPOSITORY_ROOT, absoluteDestination);
  if (repositoryRelativePath === '..' || repositoryRelativePath.startsWith(`..${path.sep}`) || path.isAbsolute(repositoryRelativePath)) {
    throw new TypeError('destination 必须位于当前仓库内');
  }
  const absoluteHelper = path.resolve(REPOSITORY_ROOT, ...RUNTIME_HELPER.split('/'));
  let specifier = path.relative(path.dirname(absoluteDestination), absoluteHelper).split(path.sep).join('/');
  if (!specifier.startsWith('.')) specifier = `./${specifier}`;
  return specifier;
}

/** 为已登记的专业 ESM CLI 接入真实路径判断，不改动 CLI 主体。 */
export function routeCliEntry(text, { sourcePath, destination, enabled } = {}) {
  if (typeof text !== 'string') throw new TypeError('text 必须是字符串');
  if (enabled !== true) return { text, transforms: [] };

  const normalizedSourcePath = String(sourcePath ?? '').replaceAll('\\', '/');
  const normalizedDestination = typeof destination === 'string' ? destination.replaceAll('\\', '/') : '';
  if (normalizedSourcePath === UNCONDITIONAL_CLI_SOURCE && normalizedDestination === UNCONDITIONAL_CLI_DESTINATION) {
    return { text, transforms: ['preserve-unconditional-cli-entry'] };
  }

  const candidates = [];
  for (const guardPattern of ENTRY_GUARDS) {
    const pattern = new RegExp(`^([\\t ]*if\\s*\\()\\s*(${guardPattern.source})\\s*(\\))`, 'gm');
    for (const match of text.matchAll(pattern)) {
      const conditionStart = match.index + match[1].length;
      const conditionEnd = match.index + match[0].length;
      const tail = isTailGuard(text, conditionEnd);
      if (tail) candidates.push({ conditionStart, conditionEnd: conditionStart + match[2].length });
    }
  }
  if (candidates.length !== 1) {
    throw new Error(`${normalizedSourcePath || '(unknown source)'} 的专业 CLI 尾部入口必须恰好匹配一个已知 ESM guard；找到 ${candidates.length} 个`);
  }

  const candidate = candidates[0];
  const specifier = helperSpecifier(destination);
  const nextText = `${text.slice(0, candidate.conditionStart)}isDirectEntry(import.meta.url)${text.slice(candidate.conditionEnd)}`;
  const importLine = `import { isDirectEntry } from "${specifier}";`;
  const shebangEnd = nextText.startsWith('#!') ? (nextText.indexOf('\n') < 0 ? nextText.length : nextText.indexOf('\n') + 1) : 0;
  const routedText = `${nextText.slice(0, shebangEnd)}${importLine}\n${nextText.slice(shebangEnd)}`;
  return { text: routedText, transforms: ['route-cli-entry-through-direct-entry-helper'] };
}
