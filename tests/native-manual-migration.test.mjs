import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CAPABILITY_GROUPS, extractNativeSection, nativeAdapterPath } from '../scripts/capability-map.mjs';
import { applyNativeManualResources } from '../scripts/migration/native-manuals.mjs';
import { GENERATED_DOMAIN_RESOURCES } from '../scripts/migration/output-cleanup.mjs';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STACKS = ['unity', 'cocos', 'phaser', 'threejs', 'flutter'];

/** 计算夹具文档使用的独立哈希。 */
function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** 机械聚合夹具只验证边界与哈希，不把占位正文伪装成可提升公共规则。 */
function keepNativeText(text) {
  return { text, promotions: [] };
}

/** 用临时目标目录构造 77 个来源入口和 3 个作者模板，不触碰实际迁移产物。 */
function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'native-manual-migration-'));
  const plans = STACKS.map((stack) => ({
    stack,
    rootSkillEntries: [],
    resourceDirectories: [],
  }));
  const files = [];
  const stagedDocs = new Map();
  for (const group of CAPABILITY_GROUPS) {
    for (const [stack, names] of Object.entries(group.members)) {
      const plan = plans.find((item) => item.stack === stack);
      for (const sourceSkill of names) {
        const sourcePath = `skills/${sourceSkill}/SKILL.md`;
        const stagePath = nativeAdapterPath(sourceSkill);
        const sibling = names.find((name) => name !== sourceSkill);
        const reference = sibling ? `\n\n[另一个模式](../${sibling}/ADAPTER.md#details)` : '';
        const raw = `# ${sourceSkill}\n\n原始规则 ${sourceSkill}\n`;
        const staged = `---\nname: ${sourceSkill}\ndescription: fixture\n---\n\n> 原生适配规范：由公共入口调用。\n\n# ${sourceSkill}\n\n## Details\n\n专业规则 ${sourceSkill}${reference}\n`;
        const bytes = Buffer.from(staged, 'utf8');
        const destination = path.join(root, ...stagePath.split('/'));
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, bytes);
        files.push({ stack, sourcePath, destination: stagePath, sourceSha256: hash(raw), destinationSha256: hash(bytes), transforms: [] });
        stagedDocs.set(`${stack}:${sourceSkill}`, { stagePath, bytes, sourceSha256: hash(raw) });
        plan.rootSkillEntries.push({ name: sourceSkill, sourcePath, kind: 'specialist', capability: group.name, adapterDestination: stagePath });
        plan.resourceDirectories.push(sourceSkill);
      }
    }
  }
  for (const plan of plans) {
    if (plan.rootSkillEntries.length < 2) continue;
    const first = plan.rootSkillEntries[0];
    const second = plan.rootSkillEntries[1];
    const staged = stagedDocs.get(`${plan.stack}:${first.name}`);
    const text = staged.bytes.toString('utf8').replace(`专业规则 ${first.name}`, `专业规则 ${first.name}\n\n[另一个模式](../${second.name}/ADAPTER.md#details)`);
    staged.bytes = Buffer.from(text, 'utf8');
    const row = files.find((item) => item.stack === plan.stack && item.sourcePath === first.sourcePath);
    row.destinationSha256 = hash(staged.bytes);
    writeFileSync(path.join(root, ...staged.stagePath.split('/')), staged.bytes);
  }
  for (const group of CAPABILITY_GROUPS) for (const author of group.authoredAdapters ?? []) {
    const template = `scripts/migration/templates/${author.sourceSkill}.source`;
    const source = readFileSync(path.join(REPOSITORY_ROOT, ...template.split('/')));
    const destination = path.join(root, ...template.split('/'));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  }
  // 夹具沿用真实生成清单，新增专业模板时不能遗漏其作者源文件。
  for (const entry of GENERATED_DOMAIN_RESOURCES.map((resource) => resource.template)) {
    const source = readFileSync(path.join(REPOSITORY_ROOT, ...entry.split('/')));
    const destination = path.join(root, ...entry.split('/'));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  }
  const conventions = 'skills/app-creator-workflow/references/professional-conventions.md';
  const conventionsBytes = readFileSync(path.join(REPOSITORY_ROOT, ...conventions.split('/')));
  const conventionsTarget = path.join(root, ...conventions.split('/'));
  mkdirSync(path.dirname(conventionsTarget), { recursive: true });
  writeFileSync(conventionsTarget, conventionsBytes);

  const externalReferencePath = 'skills/cocos-game-juice/references/design-guide.md';
  const externalReference = '# Cocos Design Guide\n\n[已提升规则](../../cocos-game-audio/ADAPTER.md#Removed%20audio%20heading)\n\n[保留模式](../../cocos-game-audio/ADAPTER.md#details)\n\n[本地锚点](#local-anchor)\n\n## Local Anchor\n';
  const externalBytes = Buffer.from(externalReference, 'utf8');
  const externalTarget = path.join(root, ...externalReferencePath.split('/'));
  mkdirSync(path.dirname(externalTarget), { recursive: true });
  writeFileSync(externalTarget, externalBytes);
  files.push({ stack: 'cocos', sourcePath: externalReferencePath, destination: externalReferencePath, sourceSha256: hash(externalBytes), destinationSha256: hash(externalBytes), transforms: [] });

  const sharedDocumentPath = 'skills/app-domain-toolkit/references/audio.md';
  const sharedDocument = '# Audio Workflow\n\n## Audio Lifecycle\n\nFixture shared contract.\n';
  const sharedDocumentBytes = Buffer.from(sharedDocument, 'utf8');
  const sharedDocumentTarget = path.join(root, ...sharedDocumentPath.split('/'));
  mkdirSync(path.dirname(sharedDocumentTarget), { recursive: true });
  writeFileSync(sharedDocumentTarget, sharedDocumentBytes);
  const generatedReferencePath = 'skills/app-feedback/generated-reference.md';
  const generatedReferenceBytes = Buffer.from('[模式](../cocos-game-audio/ADAPTER.md#details)\n', 'utf8');
  const generatedReferenceTarget = path.join(root, ...generatedReferencePath.split('/'));
  mkdirSync(path.dirname(generatedReferenceTarget), { recursive: true });
  writeFileSync(generatedReferenceTarget, generatedReferenceBytes);
  const sharedGenerated = [
    { path: sharedDocumentPath, destinationSha256: hash(sharedDocumentBytes) },
    { path: generatedReferencePath, destinationSha256: hash(generatedReferenceBytes) },
  ];
  const sharedCapabilities = [{
    id: 'fixture-audio',
    implementation: sharedDocumentPath,
    sources: [{
      stack: 'cocos',
      sourcePath: 'skills/cocos-game-audio/SKILL.md',
      adapterDestination: nativeAdapterPath('cocos-game-audio'),
      sections: [{ sourceHeading: 'Removed audio heading', heading: 'Audio Lifecycle' }],
    }],
  }];
  const repositoryAuthored = CAPABILITY_GROUPS.flatMap((group) => group.authoredAdapters ?? []);
  for (const author of repositoryAuthored) plans.find((item) => item.stack === author.stack).resourceDirectories.push(author.sourceSkill);
  return { root, plans, files, stagedDocs, repositoryAuthored, sharedOutputs: { generatedFiles: sharedGenerated, sharedCapabilities } };
}

/** 为每次测试调用配置临时写入器与共享引用集合。 */
function applyFixture(fixture, previousHashes = new Map(), sharedOutputs = { generatedFiles: [], sharedCapabilities: [] }) {
  const { root } = fixture;
  const resolveDestination = (relativePath) => path.join(root, ...relativePath.split('/'));
  const hashDestination = (relativePath) => hash(readFileSync(resolveDestination(relativePath)));
  return applyNativeManualResources({
    repositoryRoot: root,
    previousHashes,
    resolveDestination,
    hashDestination,
    sha256: hash,
    files: fixture.files,
    plans: fixture.plans,
    sharedOutputs,
    promoteRules: keepNativeText,
  });
}

/** 重建真实迁移下一轮会重新写出的暂存文档并恢复入口定位。 */
function restoreStageFiles(fixture) {
  for (const plan of fixture.plans) for (const skill of plan.rootSkillEntries) {
    const staged = fixture.stagedDocs.get(`${plan.stack}:${skill.name}`);
    const target = path.join(fixture.root, ...staged.stagePath.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, staged.bytes);
    const row = fixture.files.find((item) => item.stack === plan.stack && item.sourcePath === skill.sourcePath);
    row.destination = staged.stagePath;
    row.destinationSha256 = hash(staged.bytes);
    delete row.nativeSection;
    skill.adapterDestination = staged.stagePath;
    delete skill.adapterSection;
  }
  for (const plan of fixture.plans) plan.resourceDirectories = [...new Set([...plan.rootSkillEntries.map((skill) => skill.name), ...fixture.repositoryAuthored.filter((item) => item.stack === plan.stack).map((item) => item.sourceSkill)])];
}

test('五份栈手册逐来源保留章节边界、原始哈希和模式链接', (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const unitySource = fixture.plans.find((plan) => plan.stack === 'unity').rootSkillEntries[0];
  const sharedSource = { stack: 'unity', sourcePath: unitySource.sourcePath, adapterDestination: unitySource.adapterDestination };
  fixture.sharedOutputs.sharedCapabilities.push({ sources: [sharedSource] });
  const generated = applyFixture(fixture, new Map(), fixture.sharedOutputs);
  const manuals = generated.filter((item) => item.kind === 'native-manual');
  assert.equal(manuals.length, 5);
  assert.equal(manuals.reduce((count, item) => count + item.sections.filter((section) => section.origin === 'source').length, 0), 77);
  assert.equal(manuals.reduce((count, item) => count + item.sections.filter((section) => section.origin === 'repository-authored').length, 0), 3);
  for (const manual of manuals) {
    assert.ok(manual.reason);
    const contents = readFileSync(path.join(fixture.root, ...manual.path.split('/')), 'utf8');
    assert.equal(contents.startsWith('---'), false);
    assert.equal(hash(contents), manual.destinationSha256);
    for (const section of manual.sections) {
      const contribution = extractNativeSection(contents, section.sourceSkill);
      assert.equal(hash(contribution), section.sha256);
      if (section.origin === 'source') {
        const ledgerRow = fixture.files.find((row) => row.stack === manual.stack && row.nativeSection?.sourceSkill === section.sourceSkill);
        assert.equal(ledgerRow.nativeSection.section, section.section);
        assert.equal(ledgerRow.nativeSection.sha256, section.sha256);
        assert.equal(ledgerRow.sourceSha256, section.sourceSha256);
        assert.equal(ledgerRow.destination, manual.path);
        assert.equal(ledgerRow.destinationSha256, manual.destinationSha256);
        assert.equal(existsSync(path.join(fixture.root, ...nativeAdapterPath(section.sourceSkill).split('/'))), false);
      } else {
        assert.ok(section.template);
        assert.equal(section.sourceSha256, hash(readFileSync(path.join(REPOSITORY_ROOT, ...section.template.split('/')))));
      }
    }
  }
  const firstStack = manuals.find((item) => item.stack === 'unity');
  const linkedPlan = fixture.plans.find((plan) => plan.stack === 'unity');
  const contents = readFileSync(path.join(fixture.root, ...firstStack.path.split('/')), 'utf8');
  assert.match(contents, new RegExp(`#mode-${linkedPlan.rootSkillEntries[1].name}--details`));
  assert.doesNotMatch(contents, new RegExp(`原生适配规范：由公共入口调用`));
  assert.equal(sharedSource.adapterDestination, firstStack.path);
  assert.equal(sharedSource.adapterSection, `mode-${unitySource.name}`);
  for (const author of fixture.repositoryAuthored) assert.equal(existsSync(path.join(fixture.root, ...nativeAdapterPath(author.sourceSkill).split('/'))), false);
  const externalPath = 'skills/cocos-game-juice/references/design-guide.md';
  const externalText = readFileSync(path.join(fixture.root, ...externalPath.split('/')), 'utf8');
  assert.match(externalText, /\.\.\/\.\.\/app-domain-toolkit\/references\/audio\.md#audio-lifecycle/);
  assert.match(externalText, /\.\.\/\.\.\/app-stack-cocos\/references\/native-contracts\.md#mode-cocos-game-audio--details/);
  assert.match(externalText, /\[本地锚点\]\(#local-anchor\)/);
  const externalRow = fixture.files.find((row) => row.destination === externalPath);
  assert.equal(externalRow.destinationSha256, hash(Buffer.from(externalText, 'utf8')));
  assert.ok(externalRow.transforms.includes('rebase-native-manual-links'));
  const generatedReference = readFileSync(path.join(fixture.root, 'skills', 'app-feedback', 'generated-reference.md'), 'utf8');
  assert.match(generatedReference, /\.\.\/app-stack-cocos\/references\/native-contracts\.md#mode-cocos-game-audio--details/);
  const generatedReferenceRecord = fixture.sharedOutputs.generatedFiles.find((row) => row.path.endsWith('generated-reference.md'));
  assert.equal(generatedReferenceRecord.destinationSha256, hash(Buffer.from(generatedReference, 'utf8')));
  assert.ok(generatedReferenceRecord.transforms.includes('rebase-native-manual-links'));
});

test('账本归档 Markdown 的旧适配链接重基，逐字源归档保持不变', (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const destination = 'migration/source-docs/threejs/docs/dpr-responsive.md';
  const original = Buffer.from('详见 [运行模块](../../../../skills/threejs-game-runtime/ADAPTER.md)。\n', 'utf8');
  const target = path.join(fixture.root, ...destination.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, original);
  const ledgerRow = { stack: 'threejs', sourcePath: 'docs/dpr-responsive.md', destination, sourceSha256: hash(original), destinationSha256: hash(original), transforms: [] };
  fixture.files.push(ledgerRow);

  const archivePath = 'migration/source-tests/threejs/replaced/docs/dpr-responsive.md.source';
  const archiveText = '[原始文档](../../../../skills/threejs-game-runtime/ADAPTER.md)\n';
  const archiveTarget = path.join(fixture.root, ...archivePath.split('/'));
  mkdirSync(path.dirname(archiveTarget), { recursive: true });
  writeFileSync(archiveTarget, archiveText);

  applyFixture(fixture, new Map(), fixture.sharedOutputs);
  const updated = readFileSync(target, 'utf8');
  assert.match(updated, /\.\.\/\.\.\/\.\.\/\.\.\/skills\/app-stack-threejs\/references\/native-contracts\.md#mode-threejs-game-runtime/);
  assert.equal(ledgerRow.destinationSha256, hash(Buffer.from(updated, 'utf8')));
  assert.ok(ledgerRow.transforms.includes('rebase-native-manual-links'));
  assert.equal(readFileSync(archiveTarget, 'utf8'), archiveText);
});

test('Flutter 嵌套项目模板的旧适配路径重基到可安装手册模式', (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const destination = 'skills/flutter-project-init/assets/flutter-dev/SKILL.md';
  const originalText = [
    '- Before implementing or refactoring a page, load `.agents/skills/adaptive-layout-implementation/ADAPTER.md` and its `references/flutter-adapter.md`.',
    '同一来源简写：`adaptive-layout-implementation/ADAPTER.md`。',
    '双反引号：``adaptive-layout-implementation/ADAPTER.md``。',
    '```text',
    '此代码示例保持为 `.agents/skills/adaptive-layout-implementation/ADAPTER.md`。',
    '```',
  ].join('\n');
  const original = Buffer.from(originalText, 'utf8');
  const target = path.join(fixture.root, ...destination.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, original);
  const ledgerRow = { stack: 'flutter', sourcePath: 'flutter-project-init/assets/flutter-dev/SKILL.md', destination, sourceSha256: hash(original), destinationSha256: hash(original), transforms: [] };
  fixture.files.push(ledgerRow);

  applyFixture(fixture, new Map(), fixture.sharedOutputs);
  const updated = readFileSync(target, 'utf8');
  assert.ok(updated.includes('- Before implementing or refactoring a page, load `.agents/skills/app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation` and `.agents/skills/adaptive-layout-implementation/references/flutter-adapter.md`.'));
  assert.ok(!updated.includes('and its `references/flutter-adapter.md`'));
  assert.ok(updated.includes('同一来源简写：`skills/app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation`。'));
  assert.ok(updated.includes('双反引号：``skills/app-stack-flutter/references/native-contracts.md#mode-adaptive-layout-implementation``。'));
  assert.match(updated, /此代码示例保持为 `\.agents\/skills\/adaptive-layout-implementation\/ADAPTER\.md`/);
  assert.equal(ledgerRow.destinationSha256, hash(Buffer.from(updated, 'utf8')));
  assert.ok(ledgerRow.transforms.includes('rebase-native-manual-links'));
});

test('手册重跑保持字节稳定，并拒绝覆盖人工修改', (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const firstRun = applyFixture(fixture, new Map(), fixture.sharedOutputs);
  const previousHashes = new Map([...firstRun, ...fixture.sharedOutputs.generatedFiles].map((item) => [item.path, item.destinationSha256]));
  const firstManual = firstRun.find((item) => item.kind === 'native-manual' && item.stack === 'flutter');
  const firstBytes = readFileSync(path.join(fixture.root, ...firstManual.path.split('/')));
  restoreStageFiles(fixture);
  const secondRun = applyFixture(fixture, previousHashes, fixture.sharedOutputs);
  assert.equal(secondRun.find((item) => item.kind === 'native-manual' && item.stack === 'flutter').destinationSha256, firstManual.destinationSha256);
  assert.deepEqual(readFileSync(path.join(fixture.root, ...firstManual.path.split('/'))), firstBytes);

  const target = path.join(fixture.root, ...firstManual.path.split('/'));
  writeFileSync(target, Buffer.concat([firstBytes, Buffer.from('\nmanual edit\n')]));
  restoreStageFiles(fixture);
  assert.throws(() => applyFixture(fixture, previousHashes, fixture.sharedOutputs), /原生手册已被手动修改/);
});

test('旧仓库作者适配只在旧清单哈希吻合时移除', (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const author = fixture.repositoryAuthored[0];
  const template = `scripts/migration/templates/${author.sourceSkill}.source`;
  const oldPath = nativeAdapterPath(author.sourceSkill);
  const source = readFileSync(path.join(fixture.root, ...template.split('/')));
  const target = path.join(fixture.root, ...oldPath.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, source);
  const previousHashes = new Map([[oldPath, hash(source)]]);
  applyFixture(fixture, previousHashes, fixture.sharedOutputs);
  assert.equal(existsSync(target), false);
  assert.equal(fixture.plans.find((plan) => plan.stack === author.stack).resourceDirectories.includes(author.sourceSkill), false);

  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, Buffer.concat([source, Buffer.from('\nmanual edit\n')]));
  assert.throws(() => applyFixture(fixture, previousHashes, fixture.sharedOutputs), /旧作者模式已被手动修改/);
});

test('账本未更新的完整本轮手册可恢复，但不同字节的人工改动仍拒绝', (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const generated = applyFixture(fixture, new Map(), fixture.sharedOutputs);
  const manual = generated.find((item) => item.kind === 'native-manual' && item.stack === 'cocos');
  const target = path.join(fixture.root, ...manual.path.split('/'));
  const bytes = readFileSync(target);
  const staleHashes = new Map([[manual.path, hash(Buffer.from('上一轮手册'))]]);
  restoreStageFiles(fixture);
  const restored = applyFixture(fixture, staleHashes, fixture.sharedOutputs);
  assert.equal(restored.find((item) => item.path === manual.path).destinationSha256, hash(bytes));
  assert.deepEqual(readFileSync(target), bytes);
  writeFileSync(target, Buffer.concat([bytes, Buffer.from('\n人工补充\n')]));
  restoreStageFiles(fixture);
  assert.throws(() => applyFixture(fixture, staleHashes, fixture.sharedOutputs), /原生手册已被手动修改/);
});
