/** 公共参考只移动完整可追溯规则，原生差异和资料依赖仍在本栈。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReferenceWorkflow, referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';

/** 构造带共享规则、原生差异与栈内链接的独立来源。 */
function fixture() {
  return ['cocos', 'phaser', 'threejs'].map((stack) => ({ stack, sourcePath: `skills/${stack}-fixture/references/rules.md`,
    text: `# 参考规则\n\n## 共同要求\n\n规则必须保留完整业务语义。\n\n按[本栈资料](../${stack}/details.md)完成资源交接。\n\n本栈专有约束：${stack}，不得覆盖。\n\n## 收尾\n\n保存真实结果并人工确认视觉效果。\n` }));
}

test('完整源块入账，公共参考不反向依赖任何技术栈目录', () => {
  const sources = fixture();
  const plan = buildReferenceWorkflow({ id: 'reference-test', title: '公共规则', sources });
  const document = plan.documents[0];
  assert.equal(plan.replacements.length, 9);
  assert.ok(!document.content.includes('../cocos/') && !document.content.includes('../phaser/'));
  assert.ok(document.content.includes('规则必须保留完整业务语义。'));
  for (const source of sources) {
    const rows = plan.replacements.filter((item) => item.stack === source.stack);
    for (const row of rows) {
      assert.equal(referenceBlockHash(source.text.slice(row.sourceRange.start, row.sourceRange.end)), row.sourceHash);
      assert.equal(referenceBlockHash(row.canonical), row.canonicalHash);
    }
    const result = applySharedWorkflowSections(source.text, { ...source, destination: source.sourcePath, repositoryRoot: process.cwd(), plan });
    assert.ok(result.text.includes(`本栈专有约束：${source.stack}，不得覆盖。`));
    assert.ok(result.text.includes(`../${source.stack}/details.md`));
    assert.equal((result.text.match(/reference-test.md#共同要求/g) ?? []).length, 1, '相同章节的连续导航只保留一次');
    assert.ok(result.text.includes('## 收尾'));
  }
});

test('相似原生规则不会被归一化或混入公共要求', () => {
  const sources = fixture();
  sources[0].text += '\nCreator 必须保留源 SHA 可选追踪。\n';
  sources[1].text += '\nPhaser 必须保留源 SHA 必填追踪。\n';
  const plan = buildReferenceWorkflow({ id: 'native-boundary', title: '公共规则', sources });
  assert.ok(!plan.documents[0].content.includes('SHA'));
  const onlyOne = fixture().slice(0, 1);
  assert.throws(() => buildReferenceWorkflow({ id: 'single', title: '错误范围', sources: onlyOne }), /至少两栈/);
  const drift = sources[0].text.replace('规则必须保留完整业务语义。', '已改变原规则。');
  assert.throws(() => applySharedWorkflowSections(drift, { ...sources[0], destination: sources[0].sourcePath, plan }), /源块漂移/);
});

test('含空行和嵌入标题的完整围栏不改写链接，也不污染后续章节归属', () => {
  const example = '```markdown\n# 示例标题\n\n[示例标签](./not-a-resource.md)\n\n完成示例。\n```';
  const sources = fixture().slice(0, 2).map((source) => ({ ...source,
    text: `# 参考规则\n\n## 真实章节\n\n${example}\n\n示例之后仍须保留同一真实章节。\n` }));
  const plan = buildReferenceWorkflow({ id: 'complete-example', title: '完整示例', sources });
  assert.ok(plan.documents[0].content.includes(example));
  for (const source of sources) {
    const result = applySharedWorkflowSections(source.text, { ...source, destination: source.sourcePath, plan });
    assert.match(result.text, /complete-example\.md#真实章节/);
    assert.doesNotMatch(result.text, /not-a-resource|本栈配套资料/);
  }
});
