/** 通过真实 tracked Git 夹具验证迁移清单能发现逐项遗漏和内容损坏。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { FORMAL_SKILL_COUNTS, MERGED_SKILLS, validateMigration } from '../scripts/verify-migration.mjs';
import { CAPABILITY_GROUPS, capabilityAdapters, capabilityForSourceSkill, extractNativeSection, nativeContractPath } from '../scripts/capability-map.mjs';
import { expectedNativePromotions, promoteNativeRules } from '../scripts/migration/native-rule-promotions.mjs';

const STACKS = Object.keys(MERGED_SKILLS);
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROMOTION_PUBLIC_PATH = 'skills/app-creator-workflow/references/professional-conventions.md';
const PROFESSIONAL_SKILLS = Object.freeze({
  unity: 'unity-game-2d-animation-ta',
  cocos: 'cocos-frame-animation',
  phaser: 'phaser4-frame-animation',
  threejs: 'threejs-frame-animation',
  flutter: 'flutter-project-init',
});
const MERGED_SOURCE_SKILLS = Object.freeze({
  unity: 'unity-game-workflow-control', cocos: 'cocos-game-workflow-control',
  phaser: 'phaser4-game-workflow-control', threejs: 'threejs-game-workflow-control',
  flutter: 'flutter-app-orchestrator',
});

/** 计算 fixture 清单使用的真实摘要。 */
function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** 计算章节文本摘要，与原生手册 marker 边界剥离后的字节保持一致。 */
function digestText(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** 为夹具写出一份多来源原生手册，保留稳定 marker 供章节级校验。 */
function composeManual(stack, sections) {
  return `# ${stack} 原生技术规范\n\n${sections.map(({ sourceSkill, body }) => `<!-- native-source:${sourceSkill}:start -->\n${body}\n<!-- native-source:${sourceSkill}:end -->`).join('\n\n')}\n`;
}

/** 以字节内容写入文件，并自动建立父目录。 */
function put(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** 取得源路径对应的本地工作流技能名。 */
function sourceSkillPath(stack, name) {
  const underSkills = ['cocos', 'phaser', 'threejs'].includes(stack);
  return `${underSkills ? 'skills/' : ''}${name}/SKILL.md`;
}

/** 构建含五栈、Flutter nested 模板、专业工具与可追踪 Git 索引的最小完整迁移。 */
function migrationFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-migration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceRoot = join(root, 'sources');
  const packageRoot = join(root, 'package');
  put(join(packageRoot, ...PROMOTION_PUBLIC_PATH.split('/')), readFileSync(join(REPOSITORY_ROOT, ...PROMOTION_PUBLIC_PATH.split('/'))));
  const stacks = {};
  const fileRows = [];
  const nativeSections = new Map(STACKS.map((stack) => [stack, []]));
  const expectedSkillCounts = { ...FORMAL_SKILL_COUNTS };

  for (const stack of STACKS) {
    const sourceRepo = join(sourceRoot, `${stack}-skills`);
    const preserved = PROFESSIONAL_SKILLS[stack];
    const mergedEntries = Object.entries(MERGED_SKILLS[stack]);
    const skills = [];
    const paths = [];

    for (const [index, [name, commonName]] of mergedEntries.entries()) {
      const sourcePath = sourceSkillPath(stack, name);
      const content = `---\nname: ${name}\ndescription: fixture ${name}\n---\n源公共流程${index}\n`;
      put(join(sourceRepo, ...sourcePath.split('/')), content);
      const destination = `skills/${commonName}`;
      skills.push({ name, sourcePath, disposition: 'merged', destination, reason: `将 ${name} 的公共流程合并进 ${commonName}，保留源约束并统一控制入口。` });
      paths.push({
        stack, sourcePath, content,
        destination: `skills/${commonName}/references/source-${stack}-${name}.md`,
        replacement: `${destination}/SKILL.md`, disposition: 'adapted',
        reason: `将 ${name} 原正文归档到技术 references，并链接统一公共入口。`,
        transforms: [{ type: 'archive', description: '保留完整源正文并重写相对链接' }],
      });
    }

    const nativeNames = CAPABILITY_GROUPS.flatMap((group) => group.members[stack] ?? []);
    for (const name of nativeNames) {
      const capability = capabilityForSourceSkill(stack, name);
      const sourcePath = sourceSkillPath(stack, name);
      const sourceRules = expectedNativePromotions(name);
      const content = `---\nname: ${name}\ndescription: fixture ${name}\n---\n保留 ${name} 的技术栈专属步骤、约束和专业资源路由。${sourceRules.length ? `\n\n${sourceRules.map((rule) => rule.sourceText).join('\n\n')}` : ''}\n`;
      put(join(sourceRepo, ...sourcePath.split('/')), content);
      const promoted = promoteNativeRules(content, { stack, sourceSkill: name, repositoryRoot: packageRoot });
      const nativeAdapter = capabilityAdapters(capability).find((adapter) => adapter.sourceSkill === name);
      const manualBody = `<a id="${nativeAdapter.section}"></a>\n${promoted.text.replaceAll('../app-creator-workflow/references/', '../../app-creator-workflow/references/')}`;
      skills.push({
        name, sourcePath, disposition: 'merged', skillKind: 'capability-adapter', capability: capability.name,
        destination: `skills/${capability.name}/SKILL.md`, adapterDestination: nativeContractPath(stack), adapterSection: nativeAdapter.section,
        reason: `将 ${name} 的技术栈差异保留在 ${nativeContractPath(stack)} 对应章节，并接入 ${capability.name} 公共能力入口。`,
      });
      nativeSections.get(stack).push({ sourceSkill: name, sourcePath, content: manualBody, promotions: promoted.promotions, capability: capability.name, section: nativeAdapter.section });
    }

    const specialistPath = sourceSkillPath(stack, preserved);
    const toolContent = `import { result } from './lib/result.mjs';\nconsole.log('professional-tool:${stack}:' + result);\n`;
    const helperContent = `export const result = 'PASS';\n`;
    const sourceTool = `${dirname(specialistPath)}/scripts/run-fixture.mjs`;
    const sourceHelper = `${dirname(specialistPath)}/scripts/lib/result.mjs`;
    put(join(sourceRepo, ...sourceTool.split('/')), toolContent);
    put(join(sourceRepo, ...sourceHelper.split('/')), helperContent);
    paths.push(
      { stack, sourcePath: sourceTool, content: toolContent, destination: `skills/${preserved}/scripts/run-fixture.mjs`, disposition: 'copied', reason: '逐文件复制可运行专业工具。', transforms: [] },
      { stack, sourcePath: sourceHelper, content: helperContent, destination: `skills/${preserved}/scripts/lib/result.mjs`, disposition: 'copied', reason: '逐文件复制工具的本地依赖。', transforms: [] },
    );

    if (stack === 'flutter') {
      const templateContent = '---\nname: flutter-dev\ndescription: nested fixture template\n---\n模板正文\n';
      const templatePath = 'flutter-project-init/assets/flutter-dev/SKILL.md';
      const templateDestination = 'skills/flutter-project-init/assets/flutter-dev/SKILL.md';
      put(join(sourceRepo, ...templatePath.split('/')), templateContent);
      skills.push({ name: 'flutter-dev', sourcePath: templatePath, skillKind: 'nested-template', disposition: 'preserved', destination: templateDestination, reason: '作为项目初始化技能的嵌套模板保留。' });
      paths.push({ stack, sourcePath: templatePath, content: templateContent, destination: templateDestination, disposition: 'copied', reason: '保留专业目录中的 nested Flutter 模板。', transforms: [] });
    }

    stacks[stack] = {
      sourceRepository: `${stack}-skills`, sourceRevision: 'fixture-revision', sourceSkillCount: expectedSkillCounts[stack],
      skills,
      capabilitySkills: CAPABILITY_GROUPS.filter((group) => capabilityAdapters(group).some((adapter) => adapter.stack === stack)).map((group) => group.name),
      nativeManual: nativeContractPath(stack),
      nativeAdapters: CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.stack === stack && !adapter.reused && !adapter.authored).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section }))),
      authoredAdapters: CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group).filter((adapter) => adapter.stack === stack && adapter.authored).map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section }))),
      resourceDirectories: [preserved],
      tools: [{ name: '实际输出夹具工具', path: `skills/${preserved}/scripts/run-fixture.mjs` }],
    };
    for (const item of paths) {
      const sourceFile = join(sourceRepo, ...item.sourcePath.split('/'));
      const destinationFile = join(packageRoot, ...item.destination.split('/'));
      put(destinationFile, item.content);
      fileRows.push({
        stack: item.stack, sourcePath: item.sourcePath, destination: item.destination, disposition: item.disposition,
        replacement: item.replacement, capabilityRef: item.capabilityRef, reason: item.reason, sourceSha256: digest(sourceFile), destinationSha256: digest(destinationFile), transforms: item.transforms,
      });
    }
    for (const section of nativeSections.get(stack)) {
      const sourceFile = join(sourceRepo, ...section.sourcePath.split('/'));
      fileRows.push({
        stack, sourcePath: section.sourcePath, destination: nativeContractPath(stack), disposition: 'adapted',
        capabilityRef: `skills/${section.capability}/SKILL.md`, reason: `保留 ${section.sourceSkill} 专属内容并归入对应原生章节。`,
        sourceSha256: digest(sourceFile), nativeSection: { sourceSkill: section.sourceSkill, section: section.section, sha256: digestText(section.content) },
        transforms: [{ type: 'consolidate-native-section', description: '保留源规范并追加公共能力路由说明' }],
      });
    }
    const initialized = spawnSync('git', ['-C', sourceRepo, 'init', '--quiet'], { encoding: 'utf8', windowsHide: true });
    assert.equal(initialized.status, 0, initialized.stderr);
    const added = spawnSync('git', ['-C', sourceRepo, 'add', '--all'], { encoding: 'utf8', windowsHide: true });
    assert.equal(added.status, 0, added.stderr);
  }

  for (const name of new Set([...Object.values(MERGED_SKILLS).flatMap((map) => Object.values(map)), ...CAPABILITY_GROUPS.map((group) => group.name)])) {
    put(join(packageRoot, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: shared fixture\n---\n公共入口\n`);
  }
  for (const group of CAPABILITY_GROUPS) {
    const manifestPath = `skills/${group.name}/native-adapters.json`;
    const capabilityEntries = capabilityAdapters(group);
    const adapterStacks = [...new Set(capabilityEntries.map((adapter) => adapter.stack))];
    const adapters = Object.fromEntries(adapterStacks.map((stack) => [stack, capabilityEntries.filter((adapter) => adapter.stack === stack).map((adapter) => ({
      sourceSkill: adapter.sourceSkill,
      path: relative(join(packageRoot, 'skills', group.name), join(packageRoot, ...adapter.path.split('/'))).split(sep).join('/'),
      section: adapter.section,
      mode: adapter.mode ?? `fixture-${adapter.sourceSkill}`,
      when: adapter.when ?? `仅测试 ${adapter.sourceSkill} 的公共路由。`,
      ...(adapter.reused ? { reused: true } : {}),
      ...(adapter.authored ? { authored: true } : {}),
    }))]));
    put(join(packageRoot, ...manifestPath.split('/')), JSON.stringify({ capability: group.name, adapters, sharedWorkflows: [] }, null, 2));
  }
  const generatedFiles = [];
  for (const group of CAPABILITY_GROUPS) {
    for (const adapter of capabilityAdapters(group).filter((entry) => entry.authored)) {
      const template = `scripts/migration/templates/${adapter.sourceSkill}.source`;
      const content = `---\nname: ${adapter.sourceSkill}\ndescription: fixture authored adapter\n---\nFlutter authored feedback adapter fixture.\n`;
      put(join(packageRoot, ...template.split('/')), content);
      const hash = createHash('sha256').update(content).digest('hex');
      nativeSections.get(adapter.stack).push({ sourceSkill: adapter.sourceSkill, body: `<a id="${adapter.section}"></a>\n${content}`, capability: group.name, section: adapter.section, origin: 'repository-authored', template, sourceSha256: hash });
    }
  }
  for (const stack of STACKS) {
    const sections = nativeSections.get(stack).map((item) => ({
      sourceSkill: item.sourceSkill, capability: item.capability, section: item.section,
      sha256: digestText(item.content ?? item.body), origin: item.origin ?? 'source',
      sourceSha256: item.sourceSha256 ?? fileRows.find((row) => row.stack === stack && row.nativeSection?.sourceSkill === item.sourceSkill)?.sourceSha256,
      ...(item.template ? { template: item.template } : {}),
      ...(item.promotions?.length ? { rulePromotions: item.promotions } : {}),
    }));
    const content = composeManual(stack, nativeSections.get(stack).map((item) => ({ sourceSkill: item.sourceSkill, body: item.content ?? item.body })));
    const path = nativeContractPath(stack);
    put(join(packageRoot, ...path.split('/')), content);
    generatedFiles.push({
      kind: 'native-manual', origin: 'consolidated-native', stack, path,
      reason: `测试夹具将 ${stack} 全部原生规范合并到单栈手册。`,
      destinationSha256: digestText(content), sections,
    });
  }
  for (const row of fileRows) row.destinationSha256 = digest(join(packageRoot, ...row.destination.split('/')));
  mkdirSync(join(packageRoot, 'migration'), { recursive: true });
  const capabilities = CAPABILITY_GROUPS.map((group) => ({ name: group.name, core: group.core === true, stacks: [...new Set(capabilityAdapters(group).map((adapter) => adapter.stack))], nativeAdapters: capabilityAdapters(group) }));
  put(join(packageRoot, 'migration', 'catalog.json'), JSON.stringify({ schemaVersion: '1.0', stacks, capabilities, filesRef: 'migration/files.json', generatedFiles }, null, 2));
  put(join(packageRoot, 'migration', 'files.json'), JSON.stringify(fileRows, null, 2));
  const catalogPath = join(packageRoot, 'migration', 'catalog.json');
  return {
    root, sourceRoot, packageRoot, expectedSkillCounts,
    readRows: () => JSON.parse(readFileSync(join(packageRoot, 'migration', 'files.json'), 'utf8')),
    writeRows: (rows) => put(join(packageRoot, 'migration', 'files.json'), JSON.stringify(rows, null, 2)),
    readCatalog: () => JSON.parse(readFileSync(catalogPath, 'utf8')),
    writeCatalog: (catalog) => put(catalogPath, JSON.stringify(catalog, null, 2)),
  };
}

/** 将 fixture 清单通过仓库校验器，附上真实源仓库 Git 索引。 */
function check(fixture) {
  return validateMigration({ root: fixture.packageRoot, sourceRoot: fixture.sourceRoot, expectedSkillCounts: fixture.expectedSkillCounts });
}

/** 模拟迁移产物整本重摘要，确认章节证明仍能发现正文漂移。 */
function refreshManualHashes(fixture, stack) {
  const path = nativeContractPath(stack);
  const hash = digest(join(fixture.packageRoot, ...path.split('/')));
  const rows = fixture.readRows();
  for (const row of rows) if (row.destination === path) row.destinationSha256 = hash;
  fixture.writeRows(rows);
  const catalog = fixture.readCatalog();
  const generated = catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack);
  generated.destinationSha256 = hash;
  fixture.writeCatalog(catalog);
}

/** 重写一个模式章节及其全部校验摘要，便于验证共享引用不能被整本重哈希掩盖。 */
function replaceNativeSection(fixture, stack, sourceSkill, body) {
  const path = join(fixture.packageRoot, ...nativeContractPath(stack).split('/'));
  const text = readFileSync(path, 'utf8');
  const startMarker = `<!-- native-source:${sourceSkill}:start -->`;
  const endMarker = `<!-- native-source:${sourceSkill}:end -->`;
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start);
  put(path, `${text.slice(0, start)}${startMarker}\n${body.trimEnd()}\n${text.slice(end)}`);
  const sectionHash = digestText(body.trimEnd());
  const rows = fixture.readRows();
  rows.find((row) => row.stack === stack && row.nativeSection?.sourceSkill === sourceSkill).nativeSection.sha256 = sectionHash;
  fixture.writeRows(rows);
  const catalog = fixture.readCatalog();
  catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack)
    .sections.find((section) => section.sourceSkill === sourceSkill).sha256 = sectionHash;
  fixture.writeCatalog(catalog);
  refreshManualHashes(fixture, stack);
}

test('完整逐项清单通过源 tracked、摘要和本地工具依赖验证', (t) => {
  const fixture = migrationFixture(t);
  const result = check(fixture);
  assert.equal(result.status, 'PASS', result.errors.join('\n'));
  assert.equal(result.summary.sourceInventoryVerified, true);
  assert.equal(result.summary.skills, Object.values(fixture.expectedSkillCounts).reduce((sum, count) => sum + count, 0));
});

test('缺章节、重复章节或章节绑定错误即使整本手册重摘要也会失败', (t) => {
  const missing = migrationFixture(t);
  const missingPath = join(missing.packageRoot, ...nativeContractPath('unity').split('/'));
  const sourceSkill = 'unity-game-2d-animation-ta';
  const content = readFileSync(missingPath, 'utf8');
  const start = content.indexOf(`<!-- native-source:${sourceSkill}:start -->`);
  const end = content.indexOf(`<!-- native-source:${sourceSkill}:end -->`, start) + `<!-- native-source:${sourceSkill}:end -->`.length;
  put(missingPath, content.slice(0, start) + content.slice(end));
  refreshManualHashes(missing, 'unity');
  assert.ok(check(missing).errors.some((error) => error.includes(`原生手册缺少或重复来源章节：${sourceSkill}`)));

  const duplicated = migrationFixture(t);
  const catalog = duplicated.readCatalog();
  const record = catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === 'unity');
  record.sections.push({ ...record.sections[0] });
  duplicated.writeCatalog(catalog);
  assert.ok(check(duplicated).errors.some((error) => error.includes('原生手册重复登记章节')));

  const wrongBinding = migrationFixture(t);
  const rows = wrongBinding.readRows();
  rows.find((row) => row.nativeSection?.sourceSkill === sourceSkill).nativeSection.section = 'mode-unity-game-balance';
  wrongBinding.writeRows(rows);
  assert.ok(check(wrongBinding).errors.some((error) => error.includes('nativeSection 绑定错误')));
});

test('每个模式锚点必须唯一且位于自身来源章节', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'unity';
  const sourceSkill = 'unity-game-2d-animation-ta';
  const anchor = `<a id="mode-${sourceSkill}"></a>`;
  const path = join(fixture.packageRoot, ...nativeContractPath(stack).split('/'));
  let body = extractNativeSection(readFileSync(path, 'utf8'), sourceSkill);

  replaceNativeSection(fixture, stack, sourceSkill, body.replace(`${anchor}\n`, ''));
  assert.ok(check(fixture).errors.some((error) => error.includes(`${sourceSkill} 原生章节必须包含且仅包含自身的实际模式锚点`)));

  body = extractNativeSection(readFileSync(path, 'utf8'), sourceSkill);
  replaceNativeSection(fixture, stack, sourceSkill, `${body}\n${anchor}\n${anchor}`);
  assert.ok(check(fixture).errors.some((error) => error.includes(`${sourceSkill} 原生章节必须包含且仅包含自身的实际模式锚点`)));

  body = extractNativeSection(readFileSync(path, 'utf8'), sourceSkill);
  replaceNativeSection(fixture, stack, sourceSkill, body.replaceAll(anchor, ''));
  const otherSkill = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group))
    .find((adapter) => adapter.stack === stack && !adapter.reused && adapter.sourceSkill !== sourceSkill).sourceSkill;
  const otherBody = extractNativeSection(readFileSync(path, 'utf8'), otherSkill);
  replaceNativeSection(fixture, stack, otherSkill, `${otherBody}\n${anchor}`);
  assert.ok(check(fixture).errors.some((error) => error.includes(`${sourceSkill} 原生章节必须包含且仅包含自身的实际模式锚点`)));
});

test('章节内容漂移、作者身份混淆和旧 ADAPTER 残留均会失败', (t) => {
  const tampered = migrationFixture(t);
  const path = join(tampered.packageRoot, ...nativeContractPath('unity').split('/'));
  put(path, readFileSync(path, 'utf8').replace('保留 unity-game-2d-animation-ta 的技术栈专属步骤', '篡改 unity-game-2d-animation-ta 的技术栈专属步骤'));
  refreshManualHashes(tampered, 'unity');
  assert.ok(check(tampered).errors.some((error) => error.includes('章节摘要与实际章节不符')));

  const confused = migrationFixture(t);
  const catalog = confused.readCatalog();
  const flutter = catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === 'flutter');
  flutter.sections.find((section) => section.sourceSkill === 'flutter-feedback').origin = 'source';
  confused.writeCatalog(catalog);
  assert.ok(check(confused).errors.some((error) => error.includes('原生手册章节身份、能力或来源类别错误')));

  const legacy = migrationFixture(t);
  put(join(legacy.packageRoot, 'skills', 'unity-game-2d-animation-ta', 'ADAPTER.md'), '# 旧适配残留\n');
  assert.ok(check(legacy).errors.some((error) => error.includes('仍残留旧 ADAPTER.md')));
});

test('公共规则提升登记集合完整，源片段与实际锚点和章节引用一致', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'unity';
  const sourceSkill = 'unity-game-production';
  const path = nativeContractPath(stack);
  const expectedRules = expectedNativePromotions(sourceSkill);
  assert.ok(expectedRules.length > 0);
  const catalog = fixture.readCatalog();
  const manualRecord = catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack);
  const manualSection = manualRecord.sections.find((section) => section.sourceSkill === sourceSkill);
  assert.deepEqual(manualSection.rulePromotions.map(({ id, sourceSkill: skill, anchor, sourceText }) => ({ id, sourceSkill: skill, anchor, sourceText })), expectedRules);
  let body = extractNativeSection(readFileSync(join(fixture.packageRoot, ...path.split('/')), 'utf8'), sourceSkill);
  for (const promotion of manualSection.rulePromotions) {
    assert.ok(!body.includes(promotion.sourceText));
    assert.ok(body.includes(`#${promotion.anchor})`));
    assert.equal(promotion.sourceHash, digestText(promotion.sourceText));
  }
  assert.equal(check(fixture).status, 'PASS');

  const missingAll = migrationFixture(t);
  const missingAllCatalog = missingAll.readCatalog();
  delete missingAllCatalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack)
    .sections.find((section) => section.sourceSkill === sourceSkill).rulePromotions;
  missingAll.writeCatalog(missingAllCatalog);
  assert.ok(check(missingAll).errors.some((error) => error.includes('rulePromotions 必须是数组')));

  const missingOne = migrationFixture(t);
  const missingOneCatalog = missingOne.readCatalog();
  const multiRule = 'cocos-game-production';
  const multiSection = missingOneCatalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === 'cocos')
    .sections.find((section) => section.sourceSkill === multiRule);
  assert.ok(multiSection.rulePromotions.length > 1);
  multiSection.rulePromotions.pop();
  missingOne.writeCatalog(missingOneCatalog);
  assert.ok(check(missingOne).errors.some((error) => error.includes('rulePromotions 与注册规则集合不完整')));

  const badSourceHash = migrationFixture(t);
  const badSourceCatalog = badSourceHash.readCatalog();
  badSourceCatalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack)
    .sections.find((section) => section.sourceSkill === sourceSkill).rulePromotions[0].sourceHash = '0'.repeat(64);
  badSourceHash.writeCatalog(badSourceCatalog);
  assert.ok(check(badSourceHash).errors.some((error) => error.includes('sourceText 与 sourceHash 不符')));

  const driftedPublicAnchor = migrationFixture(t);
  const publicFile = join(driftedPublicAnchor.packageRoot, ...PROMOTION_PUBLIC_PATH.split('/'));
  put(publicFile, readFileSync(publicFile, 'utf8').replace('推荐不得冒充用户确认', '建议不得冒充用户确认'));
  assert.ok(check(driftedPublicAnchor).errors.some((error) => error.includes('publicHash 与实际公共锚点章节不符')));

  const missingReference = migrationFixture(t);
  const record = missingReference.readCatalog().generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack);
  const promotion = record.sections.find((section) => section.sourceSkill === sourceSkill).rulePromotions[0];
  body = extractNativeSection(readFileSync(join(missingReference.packageRoot, ...path.split('/')), 'utf8'), sourceSkill);
  const wrongAnchorLink = new RegExp(`(\\]\\([^)]*professional-conventions\\.md#)${promotion.anchor}(\\))`, 'g');
  replaceNativeSection(missingReference, stack, sourceSkill, body.replace(wrongAnchorLink, '$1wrong-anchor$2'));
  assert.ok(check(missingReference).errors.some((error) => error.includes('原生章节缺少正确公共规范引用')));
});

test('迁移文件清单必须使用仓库相对 migration/files.json 路径', (t) => {
  const fixture = migrationFixture(t);
  const catalogPath = join(fixture.packageRoot, 'migration', 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  catalog.filesRef = 'files.json';
  put(catalogPath, JSON.stringify(catalog, null, 2));
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('catalog.filesRef 必须指向仓库相对路径 migration/files.json')));
});

test('遗漏专业源文件会失败，不靠文件数量掩盖', (t) => {
  const fixture = migrationFixture(t);
  const rows = fixture.readRows();
  fixture.writeRows(rows.filter((row) => !row.sourcePath.endsWith('/scripts/lib/result.mjs')));
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('未迁移登记') || error.includes('专业文件未逐项交付')));
});

test('删除目标专业脚本会失败', (t) => {
  const fixture = migrationFixture(t);
  rmSync(join(fixture.packageRoot, 'skills', PROFESSIONAL_SKILLS.unity, 'scripts', 'run-fixture.mjs'));
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('目标文件不存在')));
});

test('原生手册章节缺失或错误绑定能力会失败', (t) => {
  const fixture = migrationFixture(t);
  rmSync(join(fixture.packageRoot, ...nativeContractPath('unity').split('/')));
  let result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('unity 原生手册缺失')));

  const second = migrationFixture(t);
  const catalog = second.readCatalog();
  const adapter = catalog.stacks.unity.skills.find((skill) => skill.name === 'unity-game-2d-animation-ta');
  adapter.capability = 'app-game-balance';
  second.writeCatalog(catalog);
  result = check(second);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('unity-game-2d-animation-ta capability 与 capability-map 不符')));
});

test('遗漏公共入口、manifest 路由或残留旧 SKILL 别名会失败', (t) => {
  const missingEntry = migrationFixture(t);
  rmSync(join(missingEntry.packageRoot, 'skills', 'app-animation', 'SKILL.md'));
  let result = check(missingEntry);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('公共能力入口缺失或身份错误') && error.includes('app-animation')));

  const wrongManifest = migrationFixture(t);
  const manifestPath = join(wrongManifest.packageRoot, 'skills', 'app-animation', 'native-adapters.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.adapters.unity[0].path = '../app-stack-unity/SKILL.md';
  put(manifestPath, JSON.stringify(manifest, null, 2));
  result = check(wrongManifest);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('unity-game-2d-animation-ta 路由与 capability-map 不符')));

  const legacyAlias = migrationFixture(t);
  put(join(legacyAlias.packageRoot, 'skills', 'unity-game-2d-animation-ta', 'SKILL.md'), '---\nname: unity-game-2d-animation-ta\ndescription: obsolete alias\n---\n');
  result = check(legacyAlias);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('重复的顶层 SKILL.md 入口')));
});

test('Flutter authored 规范不能冒充源 primary，也不能恢复旧 SKILL 别名', (t) => {
  const fixture = migrationFixture(t);
  const catalog = fixture.readCatalog();
  const flutter = catalog.stacks.flutter;
  flutter.nativeAdapters.push({ sourceSkill: 'flutter-feedback', capability: 'app-feedback', path: nativeContractPath('flutter'), section: 'mode-flutter-feedback' });
  flutter.skills.push({
    name: 'flutter-feedback', sourcePath: 'flutter-feedback/SKILL.md', disposition: 'merged', skillKind: 'capability-adapter',
    capability: 'app-feedback', destination: 'skills/app-feedback/SKILL.md', adapterDestination: nativeContractPath('flutter'), adapterSection: 'mode-flutter-feedback',
    reason: '错误地把仓库新增 Flutter 规范登记成五源 primary 技能。',
  });
  fixture.writeCatalog(catalog);
  let result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('flutter-feedback 不在 capability-map 原生适配映射中')));
  assert.ok(result.errors.some((error) => error.includes('flutter.nativeAdapters 与 capability-map 不符')));

  const legacyAlias = migrationFixture(t);
  put(join(legacyAlias.packageRoot, 'skills', 'flutter-feedback', 'SKILL.md'), '---\nname: flutter-feedback\ndescription: obsolete alias\n---\n');
  result = check(legacyAlias);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('仍残留旧 SKILL.md 别名')));
});

test('Flutter authored manifest 必须显式标 authored，且不得标为 reused', (t) => {
  const missingFlag = migrationFixture(t);
  const manifestPath = join(missingFlag.packageRoot, 'skills', 'app-feedback', 'native-adapters.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  delete manifest.adapters.flutter[0].authored;
  put(manifestPath, JSON.stringify(manifest, null, 2));
  let result = check(missingFlag);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('flutter-feedback authored 边界')));

  const masqueradingReuse = migrationFixture(t);
  const reuseManifestPath = join(masqueradingReuse.packageRoot, 'skills', 'app-feedback', 'native-adapters.json');
  const reuseManifest = JSON.parse(readFileSync(reuseManifestPath, 'utf8'));
  reuseManifest.adapters.flutter[0].reused = true;
  put(reuseManifestPath, JSON.stringify(reuseManifest, null, 2));
  result = check(masqueradingReuse);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('flutter-feedback authored 边界')));
});

test('Flutter authored 路由必须独立登记，不能并入 nativeAdapters', (t) => {
  const missingRoute = migrationFixture(t);
  const catalog = missingRoute.readCatalog();
  delete catalog.stacks.flutter.authoredAdapters;
  missingRoute.writeCatalog(catalog);
  let result = check(missingRoute);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('flutter.authoredAdapters 与 capability-map 不符')));

  const mixedIntoNative = migrationFixture(t);
  const mixedCatalog = mixedIntoNative.readCatalog();
  mixedCatalog.stacks.flutter.nativeAdapters.push({ sourceSkill: 'flutter-feedback', capability: 'app-feedback', path: nativeContractPath('flutter'), section: 'mode-flutter-feedback' });
  mixedIntoNative.writeCatalog(mixedCatalog);
  result = check(mixedIntoNative);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('flutter.nativeAdapters 与 capability-map 不符')));
});

test('Flutter authored 章节必须能追溯到生成模板的原始摘要', (t) => {
  const missingTemplate = migrationFixture(t);
  rmSync(join(missingTemplate.packageRoot, 'scripts', 'migration', 'templates', 'flutter-feedback.source'));
  let result = check(missingTemplate);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('authored 章节生成模板缺失') && error.includes('flutter-feedback.source')));

  const changedTemplate = migrationFixture(t);
  put(join(changedTemplate.packageRoot, 'scripts', 'migration', 'templates', 'flutter-feedback.source'), '---\nname: flutter-feedback\ndescription: changed fixture\n---\nTampered.\n');
  result = check(changedTemplate);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('authored sourceSha256 与原始模板不符')));
});

test('Flutter nested 模板缺少清单或目标时会失败', (t) => {
  const fixture = migrationFixture(t);
  const rows = fixture.readRows();
  fixture.writeRows(rows.filter((row) => row.sourcePath !== 'flutter-project-init/assets/flutter-dev/SKILL.md'));
  rmSync(join(fixture.packageRoot, 'skills', 'flutter-project-init', 'assets', 'flutter-dev', 'SKILL.md'));
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('nested flutter-dev 模板')));
});

test('专业工具引用缺失的相对依赖会失败', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'threejs';
  const sourcePath = 'skills/threejs-frame-animation/scripts/run-fixture.mjs';
  const destination = 'skills/threejs-frame-animation/scripts/run-fixture.mjs';
  const content = "import './missing-dependency.mjs';\nconsole.log('never');\n";
  put(join(fixture.sourceRoot, `${stack}-skills`, ...sourcePath.split('/')), content);
  put(join(fixture.packageRoot, ...destination.split('/')), content);
  const rows = fixture.readRows();
  const row = rows.find((entry) => entry.stack === stack && entry.sourcePath === sourcePath);
  row.sourceSha256 = digest(join(fixture.sourceRoot, `${stack}-skills`, ...sourcePath.split('/')));
  row.destinationSha256 = digest(join(fixture.packageRoot, ...destination.split('/')));
  fixture.writeRows(rows);
  const added = spawnSync('git', ['-C', join(fixture.sourceRoot, `${stack}-skills`), 'add', '--all'], { encoding: 'utf8', windowsHide: true });
  assert.equal(added.status, 0, added.stderr);
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('本地引用不存在') && error.includes('missing-dependency')));
});

test('专业领域支持模块也会递归检查依赖闭包', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'threejs';
  const sourceRepo = join(fixture.sourceRoot, `${stack}-skills`);
  const toolSourcePath = 'skills/threejs-frame-animation/scripts/run-fixture.mjs';
  const toolDestination = 'skills/threejs-frame-animation/scripts/run-fixture.mjs';
  const supportSourcePath = 'skills/threejs-domain-contracts/support.mjs';
  const supportDestination = 'skills/threejs-domain-contracts/support.mjs';
  const toolContent = "import { result } from './lib/result.mjs';\nimport '../../threejs-domain-contracts/support.mjs';\nconsole.log(result);\n";
  const supportContent = "import './missing-nested.mjs';\nexport const supported = true;\n";
  put(join(sourceRepo, ...toolSourcePath.split('/')), toolContent);
  put(join(fixture.packageRoot, ...toolDestination.split('/')), toolContent);
  put(join(sourceRepo, ...supportSourcePath.split('/')), supportContent);
  put(join(fixture.packageRoot, ...supportDestination.split('/')), supportContent);
  const rows = fixture.readRows();
  const toolRow = rows.find((entry) => entry.stack === stack && entry.sourcePath === toolSourcePath);
  toolRow.sourceSha256 = digest(join(sourceRepo, ...toolSourcePath.split('/')));
  toolRow.destinationSha256 = digest(join(fixture.packageRoot, ...toolDestination.split('/')));
  rows.push({
    stack, sourcePath: supportSourcePath, destination: supportDestination, disposition: 'copied',
    reason: '保留专业工具导入的领域校验支持模块。', sourceSha256: digest(join(sourceRepo, ...supportSourcePath.split('/'))),
    destinationSha256: digest(join(fixture.packageRoot, ...supportDestination.split('/'))), transforms: [],
  });
  fixture.writeRows(rows);
  assert.equal(spawnSync('git', ['-C', sourceRepo, 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('missing-nested.mjs')));
});

test('resourceDirectories 内的脚本也会独立纳入依赖闭包', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'unity';
  const sourceRepo = join(fixture.sourceRoot, `${stack}-skills`);
  const sourcePath = 'fixture-domain-resource/scripts/orphan.mjs';
  const destination = 'skills/fixture-domain-resource/scripts/orphan.mjs';
  const content = "import './missing-resource-dependency.mjs';\nexport const fixture = true;\n";
  put(join(sourceRepo, ...sourcePath.split('/')), content);
  put(join(fixture.packageRoot, ...destination.split('/')), content);
  const catalog = fixture.readCatalog();
  catalog.stacks[stack].resourceDirectories.push('fixture-domain-resource');
  fixture.writeCatalog(catalog);
  const rows = fixture.readRows();
  rows.push({
    stack, sourcePath, destination, disposition: 'copied', reason: '保留资源目录内未被入口直接引用的独立领域脚本。',
    sourceSha256: digest(join(sourceRepo, ...sourcePath.split('/'))), destinationSha256: digest(join(fixture.packageRoot, ...destination.split('/'))), transforms: [],
  });
  fixture.writeRows(rows);
  assert.equal(spawnSync('git', ['-C', sourceRepo, 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('missing-resource-dependency.mjs')));
});

test('JSON Schema 会解析不带 ./ 的本地 $ref', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'threejs';
  const sourceRepo = join(fixture.sourceRoot, `${stack}-skills`);
  const sourcePath = 'skills/threejs-frame-animation/schemas/root.schema.json';
  const destination = 'skills/threejs-frame-animation/schemas/root.schema.json';
  const content = JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', $ref: 'schemas/shared.schema.json' });
  put(join(sourceRepo, ...sourcePath.split('/')), content);
  put(join(fixture.packageRoot, ...destination.split('/')), content);
  const rows = fixture.readRows();
  rows.push({
    stack, sourcePath, destination, disposition: 'copied', reason: '保留专业输入结构的 JSON Schema。',
    sourceSha256: digest(join(sourceRepo, ...sourcePath.split('/'))), destinationSha256: digest(join(fixture.packageRoot, ...destination.split('/'))), transforms: [],
  });
  fixture.writeRows(rows);
  assert.equal(spawnSync('git', ['-C', sourceRepo, 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('schemas/shared.schema.json')));
});

test('源仓库坏引用只能按精确引用和缺失目标豁免', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'threejs';
  const sourcePath = 'skills/threejs-frame-animation/scripts/run-fixture.mjs';
  const destination = 'skills/threejs-frame-animation/scripts/run-fixture.mjs';
  const sourceFile = join(fixture.sourceRoot, `${stack}-skills`, ...sourcePath.split('/'));
  const installedFile = join(fixture.packageRoot, ...destination.split('/'));
  const sourceIssue = {
    kind: 'module', reference: './missing-dependency.mjs',
    target: 'skills/threejs-frame-animation/scripts/missing-dependency.mjs',
    reason: '源仓库原始工具引用了不存在的相邻模块，已保留该问题作为迁移审计项。',
  };
  const rows = fixture.readRows();
  const row = rows.find((entry) => entry.stack === stack && entry.sourcePath === sourcePath);
  const original = "import './missing-dependency.mjs';\nconsole.log('known source issue');\n";
  put(sourceFile, original); put(installedFile, original);
  row.sourceSha256 = digest(sourceFile); row.destinationSha256 = digest(installedFile); row.sourceIssues = [sourceIssue];
  fixture.writeRows(rows);
  assert.equal(spawnSync('git', ['-C', join(fixture.sourceRoot, `${stack}-skills`), 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const accepted = check(fixture);
  assert.equal(accepted.status, 'PASS', accepted.errors.join('\n'));
  assert.ok(accepted.warnings.some((warning) => warning.includes(sourceIssue.target)));

  const changed = `${original}import './new-missing.mjs';\n`;
  put(sourceFile, changed); put(installedFile, changed);
  row.sourceSha256 = digest(sourceFile); row.destinationSha256 = digest(installedFile);
  fixture.writeRows(rows);
  assert.equal(spawnSync('git', ['-C', join(fixture.sourceRoot, `${stack}-skills`), 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const rejected = check(fixture);
  assert.equal(rejected.status, 'FAIL');
  assert.ok(rejected.errors.some((error) => error.includes('new-missing.mjs')));
});

test('source 与 destination 错摘要都会失败', (t) => {
  const fixture = migrationFixture(t);
  const rows = fixture.readRows();
  rows[0].sourceSha256 = '0'.repeat(64);
  rows[1].destinationSha256 = 'f'.repeat(64);
  fixture.writeRows(rows);
  const result = check(fixture);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.includes('sourceSha256 与源文件不符')));
  assert.ok(result.errors.some((error) => error.includes('destinationSha256 与实际文件不符')));
});

test('旧控制器测试可用具体统一测试替代，但替代文件必须存在', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'unity';
  const sourceRepo = join(fixture.sourceRoot, `${stack}-skills`);
  const sourcePath = 'unity-game-workflow-control/scripts/legacy-global.test.mjs';
  const sourceFile = join(sourceRepo, ...sourcePath.split('/'));
  const replacement = 'tests/controller.test.mjs';
  const additionalReplacement = 'tests/shared-controller-contract.test.mjs';
  const replacementFile = join(fixture.packageRoot, ...replacement.split('/'));
  const additionalReplacementFile = join(fixture.packageRoot, ...additionalReplacement.split('/'));
  const content = "test('legacy controller regression', () => {});\n";
  put(sourceFile, content);
  put(replacementFile, "test('unified controller regression', () => {});\n");
  put(additionalReplacementFile, "test('shared controller contract', () => {});\n");
  const row = {
    stack, sourcePath, destination: null, disposition: 'test-replaced', replacement, replacements: [replacement, additionalReplacement],
    reason: `旧全局控制器回归由 ${replacement} 的统一控制面测试替代。`, sourceSha256: digest(sourceFile), destinationSha256: null,
    transforms: [{ type: 'test-replacement', description: `覆盖责任迁入 ${replacement}` }],
  };
  const rows = fixture.readRows(); rows.push(row); fixture.writeRows(rows);
  assert.equal(spawnSync('git', ['-C', sourceRepo, 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const accepted = check(fixture);
  assert.equal(accepted.status, 'PASS', accepted.errors.join('\n'));

  rmSync(additionalReplacementFile);
  const missingSecondary = check(fixture);
  assert.equal(missingSecondary.status, 'FAIL');
  assert.ok(missingSecondary.errors.some((error) => error.includes(`替代目标不存在：${additionalReplacement}`)));

  rmSync(replacementFile);
  const rejected = check(fixture);
  assert.equal(rejected.status, 'FAIL');
  assert.ok(rejected.errors.some((error) => error.includes('替代目标不存在')));
});

test('Unity 原生只读校验可从混合控制脚本提取为领域工具并保留全局 CLI 路由', (t) => {
  const fixture = migrationFixture(t);
  const stack = 'unity';
  const sourceRepo = join(fixture.sourceRoot, `${stack}-skills`);
  const sourcePath = 'unity-game-workflow-control/scripts/workflow-control.mjs';
  const destination = 'skills/unity-domain-contracts/scripts/unity-contract-validation.mjs';
  const replacement = 'skills/app-workflow-control/scripts/workflow-control.mjs';
  const sourceContent = 'export function validateUnityEvidence(value) { return Boolean(value); }\n';
  const destinationContent = `${sourceContent}// 提取只读领域校验，CLI 交由公共控制器。\n`;
  const cliContent = 'export function initializeWork() {}\n';
  put(join(sourceRepo, ...sourcePath.split('/')), sourceContent);
  put(join(fixture.packageRoot, ...destination.split('/')), destinationContent);
  put(join(fixture.packageRoot, ...replacement.split('/')), cliContent);
  const rows = fixture.readRows();
  rows.push({
    stack, sourcePath, destination, replacement, disposition: 'adapted',
    reason: '从混合模块提取 Unity 只读领域验证；全局状态控制改由唯一公共 CLI 执行。',
    sourceSha256: digest(join(sourceRepo, ...sourcePath.split('/'))),
    destinationSha256: digest(join(fixture.packageRoot, ...destination.split('/'))),
    transforms: [{ type: 'extract-readonly-domain-validator', description: '保留领域验证函数，移除运行状态控制' }],
  });
  fixture.writeRows(rows);
  const unityTools = JSON.parse(readFileSync(join(fixture.packageRoot, 'migration', 'catalog.json'), 'utf8')).stacks.unity.tools;
  unityTools.push({ name: 'unity-contract-validation', path: destination, disposition: 'copied' });
  const catalogPath = join(fixture.packageRoot, 'migration', 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  catalog.stacks.unity.tools = unityTools;
  put(catalogPath, JSON.stringify(catalog, null, 2));
  assert.equal(spawnSync('git', ['-C', sourceRepo, 'add', '--all'], { encoding: 'utf8', windowsHide: true }).status, 0);
  const result = check(fixture);
  assert.equal(result.status, 'PASS', result.errors.join('\n'));
});
