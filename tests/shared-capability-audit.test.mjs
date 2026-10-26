/** 用真实文件验证公共真源与专业入口、源规则之间的追溯关系。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { validateSharedCapabilities } from '../scripts/validate-shared-capabilities.mjs';

/** 生成完整字节摘要，与实际账本和规则块摘要使用相同数据边界。 */
function hash(value) { return createHash('sha256').update(value).digest('hex'); }

/** 在测试隔离目录中写入普通文件。 */
function put(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** 构造两个专业入口引用同一公共实现的最小完整交付。 */
function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), 'shared-capability-audit-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'package');
  const sourceRoot = join(temporary, 'sources');
  const implementation = 'skills/app-domain-toolkit/scripts/visual/rules.mjs';
  put(join(root, implementation), 'export const rules = Object.freeze({ minimum: 2 });\n');
  const fileRows = [];
  const sources = ['cocos', 'phaser'].map((stack) => {
    const sourcePath = `skills/${stack}-domain/scripts/rules.mjs`;
    const adapterDestination = sourcePath;
    const original = 'export const rules = Object.freeze({ minimum: 2 });\n';
    put(join(sourceRoot, `${stack}-skills`, sourcePath), original);
    put(join(root, adapterDestination), 'export * from "../../app-domain-toolkit/scripts/visual/rules.mjs";\n');
    const sourceSha256 = hash(original);
    fileRows.push({ stack, sourcePath, destination: adapterDestination, sourceSha256, sharedImplementationRef: implementation });
    return { stack, sourcePath, sourceSha256, adapterDestination };
  });
  const catalog = { generatedFiles: [{ path: implementation }], sharedCapabilities: [{ id: 'visual-rules', kind: 'module', implementation, stacks: ['cocos', 'phaser'], sources, dependencies: [] }] };
  return { root, sourceRoot, fileRows, catalog, implementation };
}

/** 收集新审计器的实际错误，基础路径安全由主迁移校验器先行负责。 */
function inspect(input) {
  const errors = [];
  const summary = validateSharedCapabilities({ ...input, errors, resolveFile: (path) => join(input.root, path) });
  return { errors, summary };
}

test('两个专业入口实际导入同一公共真源且账本可追溯', (t) => {
  const input = fixture(t);
  const result = inspect(input);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.modules, 1);
  assert.equal(result.summary.adapters, 2);
});

test('只补共享登记却未接线的专业副本不能通过', (t) => {
  const input = fixture(t);
  put(join(input.root, input.fileRows[0].destination), 'export const rules = Object.freeze({ minimum: 2 });\n');
  assert.ok(inspect(input).errors.some((message) => message.includes('没有导入公共真源')));
});

test('遗漏公共实现、来源摘要错绑和反向私有依赖均会失败', (t) => {
  const input = fixture(t);
  const capability = input.catalog.sharedCapabilities[0];
  capability.sources[0].sourceSha256 = '0'.repeat(64);
  capability.dependencies = ['skills/cocos-domain/scripts/rules.mjs'];
  const errors = inspect(input).errors;
  assert.ok(errors.some((message) => message.includes('来源摘要与文件账本不符')));
  assert.ok(errors.some((message) => message.includes('反向依赖单栈')));
  rmSync(join(input.root, input.implementation));
  assert.ok(inspect(input).errors.some((message) => message.includes('公共真源不存在')));
});

test('公共规范必须保留实际源规则，概述不能替代抽取的具体段落', (t) => {
  const input = fixture(t);
  const commonRule = '先记录每项资产的原始尺寸、透明通道、来源和消费者，再在独立候选目录处理；失败时保留原文件和完整诊断。';
  const implementation = 'skills/app-domain-toolkit/references/image-processing.md';
  put(join(input.root, implementation), `# 图片处理\n\n## 生产步骤\n\n${commonRule}\n`);
  const sources = input.fileRows.map((row) => {
    row.sourcePath = `skills/${row.stack}-image/SKILL.md`;
    row.destination = row.sourcePath;
    delete row.sharedImplementationRef;
    row.sharedReferences = [implementation];
    const original = `# ${row.stack}\n\n${commonRule}\n\n本栈原生导入规则保持独立。\n`;
    row.sourceSha256 = hash(original);
    put(join(input.sourceRoot, `${row.stack}-skills`, row.sourcePath), original);
    put(join(input.root, row.destination), '# 专业入口\n\n读取[完整公共图片处理规范](../app-domain-toolkit/references/image-processing.md)，再按本栈原生导入规则执行。\n');
    return { stack: row.stack, sourcePath: row.sourcePath, sourceSha256: row.sourceSha256, adapterDestination: row.destination, sections: [{ sourceHash: hash(commonRule), canonicalHash: hash(commonRule), heading: '生产步骤' }] };
  });
  input.catalog.generatedFiles = [{ path: implementation }];
  input.catalog.sharedCapabilities = [{ id: 'image-processing', kind: 'workflow', implementation, stacks: ['cocos', 'phaser'], sources, dependencies: [] }];
  assert.deepEqual(inspect(input).errors, []);
  put(join(input.root, implementation), '# 图片处理\n\n做好图片质量检查。\n');
  assert.ok(inspect(input).errors.some((message) => message.includes('公共规范遗漏具体规则段落')));
  // 源块摘要也必须绑定真实原文，不能凭维护者手填一个公共能力标签取得通过。
  put(join(input.root, implementation), `# 图片处理\n\n${commonRule}\n`);
  put(join(input.sourceRoot, 'cocos-skills', input.fileRows[0].sourcePath), '# 源已变更\n\n真实源规则不再相同。\n');
  assert.ok(inspect(input).errors.some((message) => message.includes('抽取段落不属于实际源技能')));
});

test('公共规范引用必须位于对应来源章节，不能由同手册其他模式代替', (t) => {
  const input = fixture(t);
  const commonRule = '先记录来源、目标与失败条件，再在独立候选目录处理；失败时保留原文件和完整诊断。';
  const implementation = 'skills/app-domain-toolkit/references/image-processing.md';
  put(join(input.root, implementation), `# 图片处理\n\n${commonRule}\n`);
  const sources = input.fileRows.map((row) => {
    const sourceSkill = `${row.stack}-image`;
    const section = `mode-${sourceSkill}`;
    const sourcePath = `skills/${sourceSkill}/SKILL.md`;
    const destination = `skills/app-stack-${row.stack}/references/native-contracts.md`;
    const original = `# ${sourceSkill}\n\n${commonRule}\n`;
    const otherMode = row.stack === 'cocos' ? `\n\n<!-- native-source:cocos-other-mode:start -->\n[公共规范](../../app-domain-toolkit/references/image-processing.md)\n<!-- native-source:cocos-other-mode:end -->` : '';
    const body = row.stack === 'cocos' ? '本模式保留独立技术约束。' : '[完整公共规范](../../app-domain-toolkit/references/image-processing.md)\n\n本栈技术约束保持独立。';
    put(join(input.sourceRoot, `${row.stack}-skills`, sourcePath), original);
    put(join(input.root, destination), `# ${row.stack}\n\n<!-- native-source:${sourceSkill}:start -->\n${body}\n<!-- native-source:${sourceSkill}:end -->${otherMode}\n`);
    row.sourcePath = sourcePath;
    row.destination = destination;
    row.sourceSha256 = hash(original);
    row.nativeSection = { sourceSkill, section, sha256: hash(body) };
    row.sharedReferences = [implementation];
    delete row.sharedImplementationRef;
    return {
      stack: row.stack, sourcePath, sourceSha256: row.sourceSha256, adapterDestination: destination, adapterSection: section,
      sections: [{ sourceHash: hash(commonRule), canonicalHash: hash(commonRule), heading: '生产步骤' }],
    };
  });
  input.catalog.generatedFiles = [{ path: implementation }];
  input.catalog.sharedCapabilities = [{ id: 'image-processing', kind: 'workflow', implementation, stacks: ['cocos', 'phaser'], sources, dependencies: [] }];
  const errors = inspect(input).errors;
  assert.ok(errors.some((message) => message.includes('没有链接到完整公共规范：skills/app-stack-cocos/references/native-contracts.md')));
  assert.ok(!errors.some((message) => message.includes('没有链接到完整公共规范：skills/app-stack-phaser/references/native-contracts.md')));
});
