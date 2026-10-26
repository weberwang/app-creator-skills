/** 将三栈一致的项目控制模板收敛到 app-domain-toolkit 的单一真源。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SHARED_TEMPLATE_KEYS = Object.freeze(['project-profile.yaml', 'control-plane.md']);
const STACKS = Object.freeze({
  cocos: Object.freeze({ directory: 'cocos-skills', orchestrator: 'cocos-game-orchestrator' }),
  phaser: Object.freeze({ directory: 'phaser-skills', orchestrator: 'phaser4-game-orchestrator' }),
  threejs: Object.freeze({ directory: 'threejs-skills', orchestrator: 'threejs-game-orchestrator' }),
});
const IMPLEMENTATION = 'skills/app-domain-toolkit/templates/project-control-templates.mjs';

/** 将父目录或按栈映射的根目录解析为源仓库根。 */
function resolveSourceRoot(sourceRoot, stack) {
  if (typeof sourceRoot === 'string') return path.resolve(sourceRoot, STACKS[stack].directory);
  if (sourceRoot && typeof sourceRoot === 'object' && typeof sourceRoot[stack] === 'string') {
    return path.resolve(sourceRoot[stack]);
  }
  throw new TypeError('sourceRoot 必须是 Git 父目录或包含 cocos、phaser、threejs 根路径的对象');
}

/** 从真实源字节计算 SHA-256，迁移账本据此验证这次绑定的输入。 */
function readSource(sourceRoot, stack) {
  const sourcePath = `skills/${STACKS[stack].orchestrator}/scripts/project_doc_templates.mjs`;
  const absolutePath = path.join(resolveSourceRoot(sourceRoot, stack), ...sourcePath.split('/'));
  let bytes;
  try {
    bytes = readFileSync(absolutePath);
  } catch (error) {
    throw new Error(`无法读取 ${stack} 项目文档模板 ${absolutePath}：${error.message}`);
  }
  return {
    sourcePath,
    adapterDestination: sourcePath,
    bytes,
    text: bytes.toString('utf8'),
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

/** 从静态模板对象声明提取键名；结构或目标键变化时拒绝生成适配器。 */
function extractTemplateKeys(sourceText, stack) {
  const phaserShape = /export\s+const\s+CORE_TEMPLATES\s*=\s*templates\.core\s*;/.test(sourceText);
  const expectedIndent = phaserShape ? 4 : 2;
  const keys = [];
  const propertyPattern = /^([ \t]+)"((?:\\.|[^"\\])*)"\s*:/gm;
  for (const match of sourceText.matchAll(propertyPattern)) {
    if (match[1].length !== expectedIndent) continue;
    keys.push(JSON.parse(`"${match[2]}"`));
  }
  // Phaser 会在对象声明后补充视觉模板；这些栈原生增量仍属于同一模板出口。
  if (phaserShape) {
    const assignmentPattern = /templates\.(?:core|optional)\["((?:\\.|[^"\\])*)"\]\s*(?:\+=|=)/g;
    for (const match of sourceText.matchAll(assignmentPattern)) {
      const key = JSON.parse(`"${match[1]}"`);
      if (!keys.includes(key)) keys.push(key);
    }
  }
  if (!keys.length || new Set(keys).size !== keys.length) {
    throw new Error(`${stack} 项目文档模板的静态 key 结构为空或重复，拒绝推断原生模板清单。`);
  }
  for (const key of SHARED_TEMPLATE_KEYS) {
    if (keys.filter((entry) => entry === key).length !== 1) {
      throw new Error(`${stack} 模板必须恰好定义一次公共 key：${key}`);
    }
  }
  return keys;
}

/** 匹配一个静态对象属性的字符串值，不触碰相邻模板或已有路由变换。 */
function findStringPropertyValue(text, key, stack) {
  const keyLiteral = JSON.stringify(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyPattern = new RegExp(`^([\\t ]*${keyLiteral}[\\t ]*:[\\t ]*)`, 'gm');
  const matches = [...text.matchAll(propertyPattern)];
  if (matches.length !== 1) throw new Error(`${stack} 适配文本中的 ${key} 属性必须恰好出现一次`);

  const property = matches[0];
  const start = property.index + property[0].length;
  if (text[start] !== '"') throw new Error(`${stack} ${key} 必须是静态双引号字符串，拒绝覆盖未知表达式`);
  let end = start + 1;
  for (; end < text.length; end += 1) {
    if (text[end] === '\\') {
      end += 1;
    } else if (text[end] === '"') {
      break;
    }
  }
  if (end >= text.length) throw new Error(`${stack} ${key} 字符串没有闭合`);
  try {
    JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    throw new Error(`${stack} ${key} 不是可验证的 JSON 字符串：${error.message}`);
  }
  let trailing = end + 1;
  while (/\s/.test(text[trailing] ?? '')) trailing += 1;
  if (!['}', ','].includes(text[trailing])) throw new Error(`${stack} ${key} 字符串后不是对象属性边界`);
  return { start, end: end + 1 };
}

/** 在迁移器已重基的文本上替换两项公共模板，并保留其余原生声明。 */
function createAdapterTransform(stack) {
  return (baseMigratedText) => {
    if (typeof baseMigratedText !== 'string') throw new TypeError('baseMigratedText 必须是字符串');
    if (baseMigratedText.includes('createPublicProjectTemplates') || baseMigratedText.includes('PUBLIC_PROJECT_TEMPLATES')) {
      throw new Error(`${stack} 项目文档模板已经接入公共工厂，拒绝重复改写`);
    }

    let output = baseMigratedText;
    for (const key of SHARED_TEMPLATE_KEYS) {
      const { start, end } = findStringPropertyValue(output, key, stack);
      const expression = `PUBLIC_PROJECT_TEMPLATES[${JSON.stringify(key)}]`;
      output = `${output.slice(0, start)}${expression}${output.slice(end)}`;
    }
    if (/Approval Ledger|Delegation Package/i.test(output)) {
      throw new Error(`${stack} 项目文档模板仍保留已退役的公共控制文本`);
    }

    const importBlock = `import { createPublicProjectTemplates } from "../../app-domain-toolkit/templates/project-control-templates.mjs";\nconst PUBLIC_PROJECT_TEMPLATES = createPublicProjectTemplates({ stack: ${JSON.stringify(stack)} });\n`;
    const insertionPoint = output.startsWith('#!') ? output.indexOf('\n') + 1 : 0;
    return `${output.slice(0, insertionPoint)}${importBlock}${output.slice(insertionPoint)}`;
  };
}

/** 构造三栈模板合并能力和只替换公共模板值的源入口变换。 */
export function buildSharedProjectTemplatePlan({ sourceRoot, repositoryRoot }) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot.trim()) {
    throw new TypeError('repositoryRoot 必须是 app-creator-skills 仓库路径');
  }
  const records = Object.entries(STACKS).map(([stack]) => ({ stack, ...readSource(sourceRoot, stack) }));
  const implementationPath = path.resolve(repositoryRoot, ...IMPLEMENTATION.split('/'));
  let content;
  try {
    content = readFileSync(implementationPath, 'utf8');
  } catch (error) {
    throw new Error(`公共项目控制模板真源缺失 ${implementationPath}：${error.message}`);
  }
  if (!content.includes('export function createPublicProjectTemplates')) {
    throw new Error(`公共项目控制模板真源没有导出工厂：${IMPLEMENTATION}`);
  }

  const sources = records.map((record) => {
    const allTemplateKeys = extractTemplateKeys(record.text, record.stack);
    return {
      stack: record.stack,
      sourcePath: record.sourcePath,
      sourceSha256: record.sourceSha256,
      adapterDestination: record.adapterDestination,
      adapterTransform: createAdapterTransform(record.stack),
      sharedTemplateKeys: [...SHARED_TEMPLATE_KEYS],
      nativeTemplateKeys: allTemplateKeys.filter((key) => !SHARED_TEMPLATE_KEYS.includes(key)),
    };
  });

  return {
    capabilities: [{
      id: 'browser-game-project-control-templates',
      kind: 'template',
      implementation: IMPLEMENTATION,
      content,
      stacks: Object.keys(STACKS),
      sources,
      dependencies: [],
      reason: '三栈共用 Work Item 控制面模板；专业 GDD、TDD、视觉和可选模板仍由各栈原生声明维护。',
    }],
  };
}
