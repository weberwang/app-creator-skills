/** 验证迁移时归档旧路由元数据，同时保留专业载荷与真实嵌套技能。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { archiveLegacyAgentMetadata } from '../scripts/migration/legacy-agent-metadata.mjs';

/** 创建一个最小迁移计划，避免测试依赖真实源仓库。 */
function makePlan({ stack = 'unity', prefix = '', skill = 'unity-game-audio', payload = false } = {}) {
  const metadataPath = `${prefix}${skill}/agents/openai.yaml`;
  const entries = new Map([
    [metadataPath, { sourcePath: metadataPath, destination: `skills/${skill}/agents/openai.yaml`, disposition: 'copied', transforms: [] }],
    [`${prefix}${skill}/SKILL.md`, { sourcePath: `${prefix}${skill}/SKILL.md`, destination: `skills/${skill}/ADAPTER.md`, disposition: 'adapted' }],
  ]);
  if (payload) {
    const sourcePath = `${prefix}${skill}/scripts/tool.mjs`;
    entries.set(sourcePath, { sourcePath, destination: `skills/${skill}/scripts/tool.mjs`, disposition: 'copied' });
  }
  return {
    stack,
    policy: { skillPrefix: prefix, grilling: stack === 'unity' ? 'unity-game-grilling' : 'grilling' },
    entries,
    rootSkillEntries: [{ name: skill, kind: 'specialist' }],
    resourceDirectories: [skill, 'app-domain-toolkit'],
  };
}

test('将无其他载荷的旧技能元数据归入扁平来源审计目录', () => {
  const plan = makePlan();
  const result = archiveLegacyAgentMetadata(plan);
  const metadata = result.entries.get('unity-game-audio/agents/openai.yaml');

  assert.equal(metadata.destination, 'migration/source-metadata/unity-unity-game-audio.yaml');
  assert.equal(metadata.disposition, 'copied');
  assert.ok(metadata.transforms.includes('archive-legacy-agent-metadata'));
  assert.deepEqual(result.resourceDirectories, ['app-domain-toolkit']);
  assert.equal(plan.entries.get('unity-game-audio/agents/openai.yaml').destination, 'skills/unity-game-audio/agents/openai.yaml');
});

test('归档旧元数据时保留带脚本载荷的技能资源目录', () => {
  const result = archiveLegacyAgentMetadata(makePlan({ payload: true }));
  assert.equal(result.entries.get('unity-game-audio/agents/openai.yaml').destination, 'migration/source-metadata/unity-unity-game-audio.yaml');
  assert.equal(result.entries.get('unity-game-audio/scripts/tool.mjs').destination, 'skills/unity-game-audio/scripts/tool.mjs');
  assert.deepEqual(result.resourceDirectories, ['unity-game-audio', 'app-domain-toolkit']);
});

test('编排入口的旧元数据归档后保留本栈编排参考和脚本', () => {
  const plan = makePlan({ stack: 'cocos', prefix: 'skills/', skill: 'cocos-game-orchestrator', payload: true });
  plan.policy.orchestrator = 'cocos-game-orchestrator';
  plan.rootSkillEntries[0].kind = 'merged-orchestrator';
  const result = archiveLegacyAgentMetadata(plan);
  assert.equal(result.entries.get('skills/cocos-game-orchestrator/agents/openai.yaml').destination, 'migration/source-metadata/cocos-cocos-game-orchestrator.yaml');
  assert.equal(result.entries.get('skills/cocos-game-orchestrator/scripts/tool.mjs').destination, 'skills/cocos-game-orchestrator/scripts/tool.mjs');
  assert.ok(result.resourceDirectories.includes('cocos-game-orchestrator'));
});

test('帧动画迁入领域目录后只保留领域资源，不因旧根入口创建安装目录', () => {
  const plan = makePlan({ stack: 'phaser', prefix: 'skills/', skill: 'phaser4-frame-animation', payload: true });
  plan.entries.get('skills/phaser4-frame-animation/agents/openai.yaml').destination = 'skills/phaser-domain-contracts/resources/frame-animation/agents/openai.yaml';
  plan.entries.get('skills/phaser4-frame-animation/scripts/tool.mjs').destination = 'skills/phaser-domain-contracts/resources/frame-animation/scripts/tool.mjs';
  plan.resourceDirectories.push('phaser-domain-contracts');
  const result = archiveLegacyAgentMetadata(plan);
  assert.equal(result.entries.get('skills/phaser4-frame-animation/agents/openai.yaml').destination, 'migration/source-metadata/phaser-phaser4-frame-animation.yaml');
  assert.equal(result.entries.get('skills/phaser4-frame-animation/scripts/tool.mjs').destination, 'skills/phaser-domain-contracts/resources/frame-animation/scripts/tool.mjs');
  assert.ok(!result.resourceDirectories.includes('phaser4-frame-animation'));
  assert.ok(result.resourceDirectories.includes('phaser-domain-contracts'));
});

test('Flutter 项目模板是真实嵌套技能，保留其入口和自身元数据', () => {
  const plan = makePlan({ stack: 'flutter', skill: 'flutter-project-init' });
  const nestedRoot = 'flutter-project-init/assets/flutter-dev';
  for (const name of ['SKILL.md', 'agents/openai.yaml']) {
    const sourcePath = `${nestedRoot}/${name}`;
    plan.entries.set(sourcePath, { sourcePath, destination: `skills/${sourcePath}`, disposition: 'copied' });
  }
  plan.rootSkillEntries.push({ name: 'flutter-dev', kind: 'nested-template' });
  const result = archiveLegacyAgentMetadata(plan);
  assert.equal(result.entries.get('flutter-project-init/agents/openai.yaml').destination, 'migration/source-metadata/flutter-flutter-project-init.yaml');
  for (const name of ['SKILL.md', 'agents/openai.yaml']) assert.equal(result.entries.get(`${nestedRoot}/${name}`).destination, `skills/${nestedRoot}/${name}`);
  assert.ok(result.resourceDirectories.includes('flutter-project-init'));
});

test('归档源拷问技能元数据但不把它当作专业资源根目录', () => {
  const prefix = 'skills/';
  const skill = 'unity-game-grilling';
  const metadataPath = `${prefix}${skill}/agents/openai.yaml`;
  const plan = {
    stack: 'unity',
    policy: { skillPrefix: prefix, grilling: skill },
    entries: new Map([
      [metadataPath, { sourcePath: metadataPath, destination: 'skills/unity-domain-contracts/technical-grilling/agents/openai.yaml', disposition: 'copied' }],
      [`${prefix}${skill}/SKILL.md`, { sourcePath: `${prefix}${skill}/SKILL.md`, destination: 'skills/unity-domain-contracts/references/technical-grilling.md', disposition: 'adapted' }],
    ]),
    rootSkillEntries: [],
    resourceDirectories: ['unity-domain-contracts'],
  };
  const result = archiveLegacyAgentMetadata(plan);

  assert.equal(result.entries.get(metadataPath).destination, 'migration/source-metadata/unity-unity-game-grilling.yaml');
  assert.deepEqual(result.resourceDirectories, ['unity-domain-contracts']);
});

test('不会将其他技术栈同名元数据路径纳入当前计划', () => {
  const result = archiveLegacyAgentMetadata(makePlan({ stack: 'cocos', prefix: 'skills/', skill: 'cocos-game-audio' }));
  assert.equal(result.entries.get('skills/cocos-game-audio/agents/openai.yaml').destination, 'migration/source-metadata/cocos-cocos-game-audio.yaml');
  assert.equal(result.entries.has('unity-game-audio/agents/openai.yaml'), false);
});

test('真实迁移归档保留每份来源元数据的原始字节和摘要', () => {
  const root = resolve(import.meta.dirname, '..');
  const ledger = JSON.parse(readFileSync(resolve(root, 'migration/files.json'), 'utf8'));
  const rows = ledger.files.filter((row) => row.destination?.startsWith('migration/source-metadata/'));
  // 四份旧公共控制器元数据没有分发目标，其余 87 份来源应完整归档。
  assert.equal(rows.length, 87);
  for (const row of rows) {
    const digest = createHash('sha256').update(readFileSync(resolve(root, row.destination))).digest('hex');
    assert.equal(row.destinationSha256, row.sourceSha256, `${row.stack}/${row.sourcePath} 的归档内容被改写`);
    assert.equal(digest, row.sourceSha256, `${row.stack}/${row.sourcePath} 的归档字节与来源摘要不符`);
  }
});
