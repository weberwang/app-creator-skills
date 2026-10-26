/** 验证公共清理入口在Unity与Flutter安装后接通共用规则和各自原生约束。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { CAPABILITY_GROUPS, capabilityAdapters, extractNativeSection, nativeContractPath } from '../scripts/capability-map.mjs';
import { installSkills, SOURCE_ROOT } from '../scripts/install-project-skills.mjs';

/** 每个新栈单独安装，确保共用流程可达且不会把别栈原生适配当依赖分发。 */
test('Unity与Flutter从唯一清理入口安装公共规则及所选原生适配', (t) => {
  const group = CAPABILITY_GROUPS.find((item) => item.name === 'app-artifact-cleanup');
  const adapters = capabilityAdapters(group);

  for (const stack of ['unity', 'flutter']) {
    const nativeName = `${stack}-artifact-cleanup`;
    const project = mkdtempSync(join(tmpdir(), `shared-cleanup-${stack}-`));
    t.after(() => rmSync(project, { recursive: true, force: true }));
    const installed = installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const publicSkill = join(root, 'app-artifact-cleanup');
    const authored = adapters.find((item) => item.stack === stack);
    const catalog = JSON.parse(readFileSync(join(SOURCE_ROOT, 'migration/catalog.json'), 'utf8'));
    const generatedRecord = catalog.generatedFiles.find((item) => item.kind === 'native-manual' && item.stack === stack);
    const authoredRecord = generatedRecord?.sections.find((item) => item.sourceSkill === authored.sourceSkill);
    const manifest = JSON.parse(readFileSync(join(publicSkill, 'native-adapters.json'), 'utf8'));
    const selected = manifest.adapters[stack].find((item) => item.sourceSkill === nativeName);
    const manual = join(root, `app-stack-${stack}`, 'references', 'native-contracts.md');

    assert.ok(existsSync(join(publicSkill, 'SKILL.md')));
    assert.ok(existsSync(join(publicSkill, 'references/project-cleanup.md')));
    assert.ok(existsSync(join(root, 'app-release/references/release-readiness.md')));
    assert.ok(existsSync(manual));
    assert.ok(extractNativeSection(readFileSync(manual, 'utf8'), nativeName).trim());
    assert.equal(existsSync(join(root, nativeName, 'ADAPTER.md')), false);
    assert.equal(existsSync(join(root, nativeName, 'SKILL.md')), false);
    assert.equal(existsSync(join(root, `${stack === 'unity' ? 'flutter' : 'unity'}-artifact-cleanup`)), false);
    assert.equal(selected?.authored, true);
    assert.equal(selected?.reused, undefined);
    assert.equal(selected?.section, authored.section);
    assert.equal(resolve(join(publicSkill), selected.path), manual);
    assert.equal(authoredRecord?.origin, 'repository-authored');
    assert.equal(generatedRecord?.path, nativeContractPath(stack));
    assert.equal(authoredRecord?.template, `scripts/migration/templates/${authored.sourceSkill}.source`);
    assert.equal(authoredRecord?.sourceSha256, createHash('sha256').update(readFileSync(join(SOURCE_ROOT, authoredRecord.template))).digest('hex'));
    const sectionBody = extractNativeSection(readFileSync(manual, 'utf8'), nativeName);
    assert.equal(authoredRecord?.sha256, createHash('sha256').update(sectionBody).digest('hex'));
    assert.ok(installed.entries.some((entry) => entry.kind === 'skill' && entry.name === 'app-artifact-cleanup'));
    assert.equal(installed.entries.some((entry) => entry.kind === 'skill' && entry.name === nativeName), false);
    assert.equal(installed.entries.some((entry) => entry.name === `${stack === 'unity' ? 'flutter' : 'unity'}-artifact-cleanup`), false);
  }
});
