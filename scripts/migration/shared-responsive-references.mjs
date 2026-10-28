/** 集中三栈逐段一致的响应式验证规则，同时保留各栈合同、工具和运行证据差异。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReferenceWorkflow } from './reference-workflow-common.mjs';

const STACKS = Object.freeze({
  cocos: { skill: 'cocos-game-qa-performance', hash: 'ea6ca32e14c65c409da3fa9122404b0663b4c4c37be31ce516f809985e16fb5a', schema: '1.2.0', oldSchema: '1.1.0' },
  phaser: { skill: 'phaser4-game-qa-performance', hash: '475c6685ea6d3aa96fec19eef314e17389b3412974977ec8a9849addcf698c6f', schema: '1.2.0', oldSchema: '1.1.0' },
  threejs: { skill: 'threejs-game-qa-performance', hash: '590072d53282bbb02faae869b16b8870308b1049ce388f2cd35eb11b868441c2', schema: '1.3.0', oldSchema: '1.3.0' },
});
const INTRO = '脚本接受原始 UI 布局合同 JSON 文件或内联 JSON，并从同一工件读取响应式测量配置。建议使用下列最小结构；额外字段由项目自行扩展：';
const COMMON_INTRO = '脚本接受当前技术栈校验器认可的完整 UI 布局合同 JSON 文件或内联 JSON，并从同一工件读取响应式测量配置。下方 JSON 仅示意部分测量字段，缺少必需根字段，不是完整合同，不能直接用于正式校验。';
const OBSOLETE_IDENTITY = '身份只从原始 schema 1.1.0 UI 合同的上述权威字段派生';
const CURRENT_IDENTITY = '身份只从当前技术栈校验器接受的完整 UI 合同的上述权威字段派生';

/** 来源目录只按显式技术栈解析；不得用其他栈的内容补齐缺失。 */
function sourceDirectory(sourceRoot, stack) {
  const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${stack}-skills`) : sourceRoot?.[stack];
  if (typeof root !== 'string' || !root) throw new Error(`响应式参考缺少 ${stack} 源仓库`);
  return resolve(root);
}

/** 仅替换唯一且已审阅的原文，源结构变化时不猜测新意图。 */
function replaceOnce(text, oldValue, nextValue, label) {
  const first = text.indexOf(oldValue);
  if (first < 0 || text.indexOf(oldValue, first + oldValue.length) >= 0) throw new Error(`${label} 必须恰好出现一次`);
  return text.slice(0, first) + nextValue + text.slice(first + oldValue.length);
}

/** 完整模板及引用式输入依各栈分别维护，不能归一化成公共路径。 */
function templateSupplement(stack) {
  return stack === 'cocos'
    ? '正式使用 [Cocos 普通 UI 完整模板](../../cocos-game-ui-layout/assets/ordinary-ui-layout-contract-template.yaml)（schema 1.2.0）或 [效果图还原引用式模板](../../cocos-game-ui-layout/assets/ui-layout-contract-template.yaml)（schema 2.0.0）；引用式合同需要实际项目策略与场景引用文件，并传入项目根 `--project-root` 后解析。'
    : stack === 'phaser'
      ? '正式使用 [Phaser UI 完整模板](../../phaser4-game-ui-layout/assets/ui-layout-contract-template.yaml)（schema 1.2.0）。'
      : '正式使用 [Three.js UI 完整模板](../../threejs-game-ui-layout/assets/ui-layout-contract-template.yaml)（schema 1.3.0）。';
}

/** 读取真实三栈来源并构造可追溯的公共规则计划。 */
export function buildSharedResponsiveReferences({ sourceRoot, repositoryRoot } = {}) {
  const sources = Object.entries(STACKS).map(([stack, spec]) => {
    const sourcePath = `skills/${spec.skill}/references/responsive-visual-validation.md`;
    let bytes;
    try { bytes = readFileSync(resolve(sourceDirectory(sourceRoot, stack), ...sourcePath.split('/'))); }
    catch (error) { throw new Error(`响应式参考来源不可读取：${stack}/${sourcePath} (${error.message})`); }
    if (createHash('sha256').update(bytes).digest('hex') !== spec.hash) throw new Error(`响应式参考来源已变化，需要重新逐段审查：${stack}/${sourcePath}`);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new Error(`响应式参考来源不是有效 UTF-8：${stack}/${sourcePath}`); }
    if (text.split(INTRO).length !== 2 || text.split(OBSOLETE_IDENTITY).length !== 2) throw new Error(`${stack} 合同说明锚点已变化`);
    return { stack, sourcePath, text };
  });
  const plan = buildReferenceWorkflow({
    id: 'responsive-visual-validation', title: '响应式视觉验证公共规则', sources,
    reason: '逐源核对完整测量、假通过、根因和动态视口规则；原生策略、Hook、合同模板与工具保留在各栈。',
    canonicalize: (block) => {
      // JSON 字段是各栈示例；说明则统一修正后共享，模板补充保留原栈。
      if (block.sourceHeading === '目录' || (block.sourceHeading === '契约输入' && /^```json\s/.test(block.original))) return null;
      if (block.original.includes(INTRO)) return { canonical: COMMON_INTRO, nativeSupplement: templateSupplement(block.stack), referenceLinks: block.referenceLinks };
      let canonical = block.canonical;
      if (block.original.includes(OBSOLETE_IDENTITY)) canonical = replaceOnce(canonical, OBSOLETE_IDENTITY, CURRENT_IDENTITY, '响应式合同身份说明');
      // 根因分类的数字表达优先级，不能在公共正文中丢失编号。
      const numbered = block.original.match(/^(\d+[.)]\s+)/);
      if (numbered) canonical = numbered[1] + canonical;
      return { canonical, referenceLinks: block.referenceLinks };
    },
  });
  return { ...plan, repositoryRoot };
}

/** 验证抽取后的原生模板补充，并修正各栈样例版本及 Cocos 项目根。 */
export function adaptResponsiveReference(text, { stack } = {}) {
  const spec = STACKS[stack];
  if (!spec || typeof text !== 'string') throw new TypeError('响应式参考修正需要有效技术栈和正文');
  const templates = templateSupplement(stack);
  if (text.includes(INTRO) || text.includes(OBSOLETE_IDENTITY) || text.split(templates).length !== 2) throw new Error(`${stack} 响应式合同示例说明或模板补充未正确抽取`);
  let output = text;
  const oldSchema = `"schema_version": "${spec.oldSchema}"`;
  output = replaceOnce(output, oldSchema, `"schema_version": "${spec.schema}"`, `${stack} 示例 schema`);
  if (stack === 'cocos') {
    // 引用式合同读取源策略和场景文件；示例命令显式绑定项目根，避免依赖调用目录。
    const newline = output.includes('\r\n') ? '\r\n' : '\n';
    const contractArgument = `  --contract .\\ui-layout-contract.json \`${newline}`;
    output = replaceOnce(output, contractArgument, `${contractArgument}  --project-root . \`${newline}`, 'Cocos 响应式命令项目根');
  }
  return output;
}
