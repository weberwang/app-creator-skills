/** 直接检查交付仓库的公共能力入口和原生适配路由，防止 fixture 漏掉真实产物。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CAPABILITY_GROUPS, CORE_SKILLS, capabilityAdapters, extractNativeSection, nativeContractPath } from '../scripts/capability-map.mjs';
import { readSkillCatalog } from '../scripts/skill-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = readSkillCatalog(ROOT);

/** 按唯一能力映射生成各技术栈应公开的入口集合。 */
function expectedPublicSkills(stack) {
  return CAPABILITY_GROUPS.filter((group) => capabilityAdapters(group).some((adapter) => adapter.stack === stack)).map((group) => group.name);
}

/** 读取适配文档 frontmatter 中的技能身份，避免只验证路径存在。 */
function frontmatterName(path) {
  const content = readFileSync(path, 'utf8');
  return content.match(/^---\r?\n[\s\S]*?^name:\s*([^\s#]+)\s*$/m)?.[1] ?? null;
}

test('公共能力入口数量及 catalog 映射与唯一能力表一致', () => {
  const expected = CAPABILITY_GROUPS.map((group) => ({
    name: group.name, core: group.core === true, stacks: [...new Set(capabilityAdapters(group).map((adapter) => adapter.stack))], nativeAdapters: capabilityAdapters(group),
  }));
  assert.deepEqual(catalog.capabilities, expected);
  const expectedNames = [...CORE_SKILLS, ...CAPABILITY_GROUPS.filter((group) => !group.core).map((group) => group.name), ...['unity', 'cocos', 'phaser', 'threejs', 'flutter'].map((stack) => `app-stack-${stack}`)];
  const actualNames = readdirSync(join(ROOT, 'skills')).filter((name) => existsSync(join(ROOT, 'skills', name, 'SKILL.md'))).sort();
  assert.deepEqual(actualNames, [...expectedNames].sort());
  for (const item of expected) assert.equal(frontmatterName(join(ROOT, 'skills', item.name, 'SKILL.md')), item.name);
});

test('全部原生模式都可定位到五栈手册章节且旧入口已清除', () => {
  let primaryCount = 0;
  let reuseCount = 0;
  let authoredCount = 0;
  let routeCount = 0;
  for (const group of CAPABILITY_GROUPS) {
    const manifestPath = join(ROOT, 'skills', group.name, 'native-adapters.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.capability, group.name);
    for (const adapter of capabilityAdapters(group)) {
      const { stack, sourceSkill, path } = adapter;
      const manualPath = join(ROOT, ...path.split('/'));
      const manifestPath = relative(join(ROOT, 'skills', group.name), manualPath).split(sep).join('/');
      const manifestEntry = manifest.adapters?.[stack]?.find((entry) => entry.sourceSkill === sourceSkill);
      assert.ok(existsSync(manualPath), `${stack} 缺少原生手册`);
      assert.equal(manifestEntry?.path, manifestPath);
      assert.equal(manifestEntry?.section, adapter.section);
      const body = extractNativeSection(readFileSync(manualPath, 'utf8'), sourceSkill);
      assert.ok(body.trim(), `${sourceSkill} 原生章节不得为空`);
      assert.equal(typeof manifestEntry?.mode, 'string');
      assert.ok(manifestEntry.when?.trim());
      if (adapter.reused) {
        assert.equal(manifestEntry.reused, true);
        assert.notEqual(manifestEntry.authored, true);
        assert.equal(manifestEntry.mode, adapter.mode);
        assert.equal(manifestEntry.when, adapter.when);
        reuseCount += 1;
      } else if (adapter.authored) {
        assert.equal(manifestEntry.authored, true);
        assert.notEqual(manifestEntry.reused, true);
        assert.equal(manifestEntry.mode, adapter.mode);
        assert.equal(manifestEntry.when, adapter.when);
        const generated = catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack);
        const section = generated?.sections.find((entry) => entry.sourceSkill === sourceSkill);
        assert.equal(generated?.path, path);
        assert.equal(typeof section?.template, 'string', `${sourceSkill} authored 章节必须登记模板路径`);
        assert.equal(section?.origin, 'repository-authored');
        assert.equal(section?.section, adapter.section);
        const templateHash = createHash('sha256').update(readFileSync(join(ROOT, ...section.template.split('/')))).digest('hex');
        const sectionHash = createHash('sha256').update(body).digest('hex');
        assert.equal(section?.sourceSha256, templateHash);
        assert.equal(section?.sha256, sectionHash);
        authoredCount += 1;
      } else {
        assert.notEqual(manifestEntry.authored, true);
        primaryCount += 1;
      }
      assert.equal(existsSync(join(ROOT, 'skills', sourceSkill, 'SKILL.md')), false, `${sourceSkill} 不应残留发现入口`);
      assert.equal(existsSync(join(ROOT, 'skills', sourceSkill, 'ADAPTER.md')), false, `${sourceSkill} 不应残留旧适配文件`);
      routeCount += 1;
    }
  }
  assert.equal(primaryCount, 77);
  assert.equal(reuseCount, 2);
  assert.equal(authoredCount, 3);
  assert.equal(routeCount, 82);
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'flutter']) {
    const stackRecord = catalog.stacks[stack];
    const generated = catalog.generatedFiles.find((entry) => entry.kind === 'native-manual' && entry.stack === stack);
    const expectedSections = [...new Set(CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group)
      .filter((adapter) => adapter.stack === stack && !adapter.reused).map((adapter) => adapter.sourceSkill)))].sort();
    assert.equal(stackRecord.nativeManual, generated?.path);
    assert.deepEqual(generated?.sections.map((section) => section.sourceSkill).sort(), expectedSections);
    const manualHash = generated?.path ? createHash('sha256').update(readFileSync(join(ROOT, ...generated.path.split('/')))).digest('hex') : null;
    assert.equal(generated?.destinationSha256, manualHash);
  }
});

test('各技术栈只路由到适用公共能力并保留完整适配清单', () => {
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'flutter']) {
    const record = catalog.stacks[stack];
    assert.equal(record.nativeManual, nativeContractPath(stack));
    assert.deepEqual([...record.capabilitySkills].sort(), [...expectedPublicSkills(stack)].sort());
    const expectedAdapters = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group)
      .filter((adapter) => adapter.stack === stack && !adapter.reused && !adapter.authored)
      .map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section })));
    assert.deepEqual([...record.nativeAdapters].sort((left, right) => left.sourceSkill.localeCompare(right.sourceSkill)), expectedAdapters.sort((left, right) => left.sourceSkill.localeCompare(right.sourceSkill)));
    const expectedAuthoredAdapters = CAPABILITY_GROUPS.flatMap((group) => capabilityAdapters(group)
      .filter((adapter) => adapter.stack === stack && adapter.authored)
      .map((adapter) => ({ sourceSkill: adapter.sourceSkill, capability: group.name, path: adapter.path, section: adapter.section })));
    assert.deepEqual(record.authoredAdapters, expectedAuthoredAdapters);
    assert.equal(Object.hasOwn(record, 'specialistSkills'), false);
  }
});
