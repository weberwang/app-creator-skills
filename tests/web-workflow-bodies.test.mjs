/** 验证公共正文抽取保留完整规则、真实资料入口与原生约束，拒绝靠引擎名替换制造等价。 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { buildWebWorkflowBodies, readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { auditSkillBodies } from '../scripts/audit-skill-bodies.mjs';

const STACKS = { cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' };
const COMMON = 'V3 按已确认范围汇总独立静态部件与状态，一次编排生成各自独立位图，保留真实来源、透明度与资源身份，不用加载成功替代场景体验。批次完成后提供独立预览和失败项，资源必须在正式运行路径消费。';

/** 创建包含同领域规则、不同资料路径和不同原生要求的隔离源集合。 */
function fixture(t, buildBody) {
  const root = mkdtempSync(join(tmpdir(), 'workflow-body-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const originals = new Map();
  for (const [stack, prefix] of Object.entries(STACKS)) {
    const sourcePath = `skills/${prefix}-game-asset-integration/SKILL.md`;
    const text = `---\nname: ${prefix}-game-asset-integration\n---\n\n# 素材生产\n\n## 完整工作流\n\n${buildBody(stack, prefix)}\n\n## 原生导入\n\n${prefix} 自己的资源导入、回读及生命周期要求必须保持独立。\n`;
    const file = join(root, `${stack}-skills`, sourcePath);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    originals.set(stack, { text, sourcePath });
  }
  return { sourceRoot: root, repositoryRoot: join(root, 'target'), originals };
}

/** 相同完整规则只保留一份，每个栈继续拥有自己的可导航资料与导入要求。 */
test('正文和资料路由共用，专业 API 与原始附件导航保留', (t) => {
  const f = fixture(t, (_stack, prefix) => `${COMMON}详见[批量生产](./references/${prefix}-pipeline.md)。`);
  const plan = buildWebWorkflowBodies(f);
  const doc = plan.documents.find((item) => item.capabilityId === 'asset-production');
  assert.ok(doc.content.includes(COMMON));
  assert.equal(doc.content.split(COMMON).length, 2);
  assert.doesNotMatch(doc.content, /cocos-pipeline|phaser4-pipeline|threejs-pipeline/);
  for (const [stack, original] of f.originals) {
    const applied = applySharedWorkflowSections(original.text, { ...original, stack, destination: original.sourcePath, plan });
    assert.ok(!applied.text.includes(COMMON));
    assert.ok(applied.text.includes(`./references/${STACKS[stack]}-pipeline.md`));
    assert.ok(applied.text.includes(`${STACKS[stack]} 自己的资源导入、回读及生命周期要求必须保持独立。`));
    const section = doc.sources.find((item) => item.stack === stack).sections[0];
    assert.equal(original.text.slice(section.sourceRange.start, section.sourceRange.end).trim(), section.original);
  }
});

/** 两栈相同的规则不能隐含施加给第三栈，公共正文明确列出适用范围。 */
test('部分技术栈共用时明确标注适用范围', (t) => {
  const f = fixture(t, (stack) => stack === 'cocos' ? '短的原生步骤。' : COMMON);
  const plan = buildWebWorkflowBodies(f);
  const doc = plan.documents.find((item) => item.capabilityId === 'asset-production');
  assert.deepEqual(doc.sources.map((item) => item.stack), ['phaser', 'threejs']);
  assert.ok(doc.content.includes('phaser、threejs'));
  const original = f.originals.get('cocos');
  assert.equal(applySharedWorkflowSections(original.text, { ...original, stack: 'cocos', destination: original.sourcePath, plan }).text, original.text);
});

/** 相同业务词不能抹去平台 API，连已复制为相同 API 的旧段落也应保留专业归属。 */
test('原生语义不同或含原生 API 的段落不强合并', (t) => {
  const f = fixture(t, (_stack, prefix) => `${COMMON} 本栈 ${prefix} 生命周期必须独立。\n\n${COMMON} Creator AssetDB 负责具体导入。`);
  assert.equal(buildWebWorkflowBodies(f).documents.length, 0);
});

/** 源文件在计划创建后漂移时，应拒绝使用旧段落摘要删除正文。 */
test('源规则漂移会拒绝应用', (t) => {
  const f = fixture(t, () => COMMON);
  const plan = buildWebWorkflowBodies(f);
  const original = f.originals.get('cocos');
  assert.throws(() => applySharedWorkflowSections(original.text.replace(COMMON, `${COMMON} 已变化。`), { ...original, stack: 'cocos', destination: original.sourcePath, plan }), /源块漂移/);
});

/** 嵌套技术说明不能因为列表前缀或空白差异被割裂而丢失。 */
test('列表项保留嵌套说明、原始范围及换行', () => {
  const text = '# 步骤\r\n\r\n1. 共有规则。\r\n   原生边界说明不能拆走。\r\n2. 另一步。\r\n';
  const blocks = readWorkflowBlocks(text);
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].original.includes('原生边界说明不能拆走。'));
  for (const block of blocks) assert.equal(text.slice(block.sourceRange.start, block.sourceRange.end), block.original);
});

/** 维护扫描要能发现重新引入的完整规则副本，而不把共享入口导航算成规则副本。 */
test('重复正文审计识别规则回流并排除公共路由', (t) => {
  const f = fixture(t, () => COMMON);
  const catalog = { stacks: {}, sharedCapabilities: [] };
  for (const [stack, { text, sourcePath }] of f.originals) {
    const name = `${STACKS[stack]}-game-asset-integration`;
    const destination = join(f.repositoryRoot, `skills/app-stack-${stack}/references/native-contracts.md`);
    const section = `mode-${name}`;
    const body = text.replace(COMMON, `${COMMON}${COMMON}\n\n> ${COMMON}${COMMON}`);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, `# ${stack}\n\n<!-- native-source:${name}:start -->\n${body}\n<!-- native-source:${name}:end -->\n`);
    catalog.stacks[stack] = { nativeAdapters: [{ sourceSkill: name, path: `skills/app-stack-${stack}/references/native-contracts.md`, section }] };
  }
  mkdirSync(join(f.repositoryRoot, 'migration'));
  writeFileSync(join(f.repositoryRoot, 'migration/catalog.json'), JSON.stringify(catalog));
  const report = auditSkillBodies(f.repositoryRoot);
  assert.equal(report.nativeAdapters, 3);
  assert.equal(report.candidateBlocks, 1);
  assert.equal(report.candidates[0].sources.length, 3);
  assert.equal(report.repeatedCharacters, COMMON.length * 4);
});
