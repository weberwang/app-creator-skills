/** 集中维护源模板与 Flutter 工具的模块作用域，避免迁移主流程继续膨胀。 */
/** starter/assets 是被使用者复制进入工程的运行时代码，不改写它们的第三方依赖语义。 */
export function isStarterRuntime(sourcePath) {
  return sourcePath.split('/').some((part) => ['starter', 'starters', 'assets'].includes(part));
}


/** 计算当前文件中的 CommonJS 作用域目录，供 Flutter .js 工具继续使用 require。 */
function commonJsPackageRoot(destination, stack) {
  if (stack !== 'flutter') return null;
  const parts = destination.split('/');
  const skillIndex = parts.indexOf('skills');
  if (skillIndex >= 0 && parts[skillIndex + 1] === 'app-skill-runtime') return null;
  if (destination.startsWith('migration/source-tests/flutter/')) return 'migration/source-tests/flutter/package.json';
  if (parts[0] === 'skills' && parts[1] && !['app-creator-workflow', 'app-workflow-control', 'grilling', 'app-asset-workflow'].includes(parts[1])) return `skills/${parts[1]}/package.json`;
  return null;
}


/** 为 Flutter 源工具及嵌套生成模板维持 CommonJS 局部模块语义。 */
export function planCommonJsScopes(stack, entries, sourceBuffers) {
  const files = new Map();
  if (stack !== 'flutter') return files;
  // 仅为实际保留的 CommonJS 文件生成作用域，避免为空资源根创建 package.json。
  const requiredScopes = new Set();
  for (const entry of entries.values()) {
    if (!entry.destination || !entry.sourcePath.endsWith('.js') || isStarterRuntime(entry.sourcePath)) continue;
    const original = sourceBuffers.get(entry.sourcePath)?.toString('utf8') ?? '';
    if (!/\brequire\s*\(|\bmodule\.exports\b|\bexports\.[\w$]+\s*=/.test(original)) continue;
    const packagePath = commonJsPackageRoot(entry.destination, stack);
    if (packagePath) requiredScopes.add(packagePath);
  }
  for (const packagePath of requiredScopes) {
    const sourcePackage = [...entries.values()].find((candidate) => candidate.destination === packagePath);
    if (sourcePackage) {
      sourcePackage.commonJsScope = true;
      continue;
    }
    files.set(packagePath, { destination: packagePath, content: JSON.stringify({ private: true, type: 'commonjs' }, null, 2) + '\n', reason: '保留源 Flutter .js 工具的 CommonJS 语义，隔离根 ESM package。' });
  }
  return files;
}

