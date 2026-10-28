import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { buildSharedProjectTemplatePlan } from '../scripts/migration/shared-project-templates.mjs';
import { createPublicProjectTemplates } from '../skills/app-domain-toolkit/templates/project-control-templates.mjs';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');
const STACK_LAYOUT = Object.freeze({
  cocos: { directory: 'cocos-skills', orchestrator: 'cocos-game-orchestrator' },
  phaser: { directory: 'phaser-skills', orchestrator: 'phaser4-game-orchestrator' },
  threejs: { directory: 'threejs-skills', orchestrator: 'threejs-game-orchestrator' },
});
const SHARED_KEYS = Object.freeze(['project-profile.yaml', 'control-plane.md']);
const CORE_NATIVE_KEYS = Object.freeze(['GDD.md', 'visual-design.md', 'TDD.md', 'visual-baseline.md']);
const OPTIONAL_KEYS = Object.freeze(['balance', 'assets', 'qa', 'platform', 'release']);

/** 创建并在安全临时目录内清理测试用隔离根目录。 */
async function withTempRoot(callback) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'shared-project-templates-'));
  try {
    return await callback(tempRoot);
  } finally {
    const safeParent = `${path.resolve(os.tmpdir())}${path.sep}`;
    const absoluteTarget = path.resolve(tempRoot);
    if (!absoluteTarget.startsWith(safeParent)) throw new Error(`测试临时目录越出系统临时目录：${absoluteTarget}`);
    rmSync(absoluteTarget, { recursive: true, force: true });
  }
}

/** 按来源实际支持的两种静态导出形态生成小型源模块夹具。 */
function makeSourceModule(stack) {
  const core = Object.fromEntries([
    ...SHARED_KEYS.map((key) => [key, `legacy ${key}: Approval Ledger / Delegation Package (${stack})`]),
    ...CORE_NATIVE_KEYS.map((key) => [key, `native ${stack} ${key}`]),
  ]);
  const optional = Object.fromEntries(OPTIONAL_KEYS.map((key) => [key, `native ${stack} optional ${key}`]));
  const properties = (entries, indent) => Object.entries(entries)
    .map(([key, value]) => `${' '.repeat(indent)}${JSON.stringify(key)}: ${JSON.stringify(value)},`)
    .join('\n');
  if (stack === 'phaser') {
    return `const templates = {\n  "core": {\n${properties(core, 4)}\n  },\n  "optional": {\n${properties(optional, 4)}\n  },\n};\nexport const CORE_TEMPLATES = templates.core;\nexport const OPTIONAL_TEMPLATES = templates.optional;\n`;
  }
  return `export const CORE_TEMPLATES = {\n${properties(core, 2)}\n};\nexport const OPTIONAL_TEMPLATES = {\n${properties(optional, 2)}\n};\n`;
}

/** 生成独立源仓库的只读迁移输入，并返回原始字节用于摘要核对。 */
function writeSourceFixture(sourceRoot, stack) {
  const layout = STACK_LAYOUT[stack];
  const sourcePath = `skills/${layout.orchestrator}/scripts/project_doc_templates.mjs`;
  const absolutePath = path.join(sourceRoot, layout.directory, ...sourcePath.split('/'));
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const bytes = Buffer.from(makeSourceModule(stack), 'utf8');
  writeFileSync(absolutePath, bytes);
  return { sourcePath, absolutePath, bytes };
}

/** 只取原生模板键并排除两个已被共享工厂接管的键。 */
function withoutSharedKeys(templates) {
  return Object.fromEntries(Object.entries(templates).filter(([key]) => !SHARED_KEYS.includes(key)));
}

test('公共项目模板直接可用且链接指向真实控制合同', () => {
  const controlSkillRoot = path.join(REPOSITORY_ROOT, 'skills', 'app-workflow-control');
  for (const stack of Object.keys(STACK_LAYOUT)) {
    const templates = createPublicProjectTemplates({ stack });
    const profile = parseYaml(templates['project-profile.yaml']);
    assert.deepEqual(Object.keys(templates), [...SHARED_KEYS]);
    assert.equal(profile.stack, stack);
    assert.equal(profile['技术栈配置'], `../.agents/skills/app-stack-${stack}/profile.json`);
    assert.equal(profile.workflow['素材工作流'], '../.agents/skills/app-asset-workflow/SKILL.md');
    assert.match(profile.workflow['原子资源条件'], /V3.*V4.*V5/);
    assert.match(templates['project-profile.yaml'], new RegExp(`^stack: ${stack}$`, 'm'));
    assert.match(templates['project-profile.yaml'], new RegExp(`app-stack-${stack}/profile\\.json`));
    assert.doesNotMatch(templates['project-profile.yaml'], /Approval Ledger|Delegation Package/);
    assert.doesNotMatch(templates['control-plane.md'], /Approval Ledger|Delegation Package/);
    assert.match(templates['control-plane.md'], /Implementation Package/);
    assert.match(templates['control-plane.md'], /Evidence Manifest/);
    assert.match(templates['control-plane.md'], /Execution Result/);
    assert.match(templates['control-plane.md'], /Human Review/);
    assert.match(templates['control-plane.md'], /Grilling Record/);
    assert.match(templates['control-plane.md'], /Work Item 的 action/);
    assert.match(templates['control-plane.md'], /普通单素材任务.*完整项目记录链/);
    assert.match(templates['control-plane.md'], /<V1\|V2\|V3\|V4\|V5>/);

    for (const match of templates['control-plane.md'].matchAll(/\]\((\.\.\/\.agents\/skills\/app-workflow-control\/[^)]+)\)/g)) {
      const installedPath = match[1].replace('../.agents/skills/app-workflow-control/', '');
      assert.equal(readFileSync(path.join(controlSkillRoot, ...installedPath.split('/')), 'utf8').length > 0, true, match[1]);
    }
    assert.equal(
      readFileSync(path.join(REPOSITORY_ROOT, 'skills', `app-stack-${stack}`, 'profile.json'), 'utf8').length > 0,
      true,
    );
  }
  assert.ok(readFileSync(path.join(REPOSITORY_ROOT, 'skills/app-asset-workflow/SKILL.md'), 'utf8').length > 0);
  assert.throws(() => createPublicProjectTemplates({ stack: 'unity' }), /stack 必须是/);
});

test('迁移计划逐栈替换且保留所有专业模板值与路径重基', async () => {
  await withTempRoot(async (root) => {
    const sourceRoot = path.join(root, 'sources');
    const targetRoot = path.join(root, 'target');
    const sourceFixtures = Object.fromEntries(Object.keys(STACK_LAYOUT).map((stack) => [stack, writeSourceFixture(sourceRoot, stack)]));
    const publicPath = path.join(targetRoot, ...'skills/app-domain-toolkit/templates/project-control-templates.mjs'.split('/'));
    mkdirSync(path.dirname(publicPath), { recursive: true });
    writeFileSync(publicPath, readFileSync(path.join(REPOSITORY_ROOT, 'skills/app-domain-toolkit/templates/project-control-templates.mjs')));

    const plan = buildSharedProjectTemplatePlan({ sourceRoot, repositoryRoot: REPOSITORY_ROOT });
    assert.equal(plan.capabilities.length, 1);
    const [capability] = plan.capabilities;
    assert.equal(capability.kind, 'template');
    assert.equal(capability.implementation, 'skills/app-domain-toolkit/templates/project-control-templates.mjs');
    assert.deepEqual(capability.stacks, Object.keys(STACK_LAYOUT));

    for (const source of capability.sources) {
      const fixture = sourceFixtures[source.stack];
      assert.equal(source.sourcePath, fixture.sourcePath);
      assert.equal(source.adapterDestination, fixture.sourcePath);
      assert.equal(source.sourceSha256, createHash('sha256').update(fixture.bytes).digest('hex'));
      assert.deepEqual(source.sharedTemplateKeys, [...SHARED_KEYS]);
      assert.deepEqual(source.nativeTemplateKeys, [...CORE_NATIVE_KEYS, ...OPTIONAL_KEYS]);

      const sourceUrl = pathToFileURL(fixture.absolutePath).href;
      const sourceModule = await import(`${sourceUrl}?original=${source.stack}`);
      const rawSourceText = fixture.bytes.toString('utf8');
      const nativeSourceValue = JSON.stringify(`native ${source.stack} GDD.md`);
      const migratedNativeValue = JSON.stringify(`base-migrated ${source.stack} GDD.md`);
      assert.ok(rawSourceText.includes(nativeSourceValue));
      const baseMigratedText = `// 已由公共路由适配保留：${source.stack}\n${rawSourceText.replace(nativeSourceValue, migratedNativeValue)}`;
      const basePath = path.join(root, `base-${source.stack}.mjs`);
      writeFileSync(basePath, baseMigratedText);
      const baseModule = await import(`${pathToFileURL(basePath).href}?base=${source.stack}`);
      const adaptedText = source.adapterTransform(baseMigratedText);
      assert.match(adaptedText, new RegExp(`已由公共路由适配保留：${source.stack}`));
      assert.doesNotMatch(adaptedText, /Approval Ledger|Delegation Package/);
      assert.equal((adaptedText.match(/PUBLIC_PROJECT_TEMPLATES\["project-profile\.yaml"\]/g) ?? []).length, 1);
      assert.equal((adaptedText.match(/PUBLIC_PROJECT_TEMPLATES\["control-plane\.md"\]/g) ?? []).length, 1);

      const adapterPath = path.join(targetRoot, ...source.adapterDestination.split('/'));
      mkdirSync(path.dirname(adapterPath), { recursive: true });
      writeFileSync(adapterPath, adaptedText);
      const adaptedModule = await import(`${pathToFileURL(adapterPath).href}?adapted=${source.stack}`);
      assert.notEqual(sourceModule.CORE_TEMPLATES['GDD.md'], baseModule.CORE_TEMPLATES['GDD.md']);
      assert.deepEqual(withoutSharedKeys(adaptedModule.CORE_TEMPLATES), withoutSharedKeys(baseModule.CORE_TEMPLATES));
      assert.deepEqual(adaptedModule.OPTIONAL_TEMPLATES, baseModule.OPTIONAL_TEMPLATES);
      const generated = createPublicProjectTemplates({ stack: source.stack });
      assert.equal(adaptedModule.CORE_TEMPLATES['project-profile.yaml'], generated['project-profile.yaml']);
      assert.equal(adaptedModule.CORE_TEMPLATES['control-plane.md'], generated['control-plane.md']);
    }
  });
});

const ACTUAL_SOURCE_ROOT = path.resolve(REPOSITORY_ROOT, '..');
const HAS_ALL_SOURCE_TEMPLATES = Object.entries(STACK_LAYOUT).every(([stack, layout]) => existsSync(path.join(
  ACTUAL_SOURCE_ROOT,
  layout.directory,
  'skills',
  layout.orchestrator,
  'scripts',
  'project_doc_templates.mjs',
)));

test('可用时核对三份真实源模板及所有栈原生键', { skip: !HAS_ALL_SOURCE_TEMPLATES }, async () => {
  await withTempRoot(async (root) => {
    const targetRoot = path.join(root, 'target');
    const publicPath = path.join(targetRoot, ...'skills/app-domain-toolkit/templates/project-control-templates.mjs'.split('/'));
    mkdirSync(path.dirname(publicPath), { recursive: true });
    writeFileSync(publicPath, readFileSync(path.join(REPOSITORY_ROOT, 'skills/app-domain-toolkit/templates/project-control-templates.mjs')));
    const plan = buildSharedProjectTemplatePlan({ sourceRoot: ACTUAL_SOURCE_ROOT, repositoryRoot: REPOSITORY_ROOT });

    for (const source of plan.capabilities[0].sources) {
      const layout = STACK_LAYOUT[source.stack];
      const sourcePath = path.join(ACTUAL_SOURCE_ROOT, layout.directory, ...source.sourcePath.split('/'));
      const sourceBytes = readFileSync(sourcePath);
      const originalModule = await import(`${pathToFileURL(sourcePath).href}?source-audit=${source.stack}`);
      const adapterPath = path.join(targetRoot, ...source.adapterDestination.split('/'));
      mkdirSync(path.dirname(adapterPath), { recursive: true });
      writeFileSync(adapterPath, source.adapterTransform(sourceBytes.toString('utf8')));
      const migratedModule = await import(`${pathToFileURL(adapterPath).href}?target-audit=${source.stack}`);
      const originalNativeKeys = [...Object.keys(originalModule.CORE_TEMPLATES), ...Object.keys(originalModule.OPTIONAL_TEMPLATES)]
        .filter((key) => !SHARED_KEYS.includes(key)).sort();
      assert.deepEqual([...source.nativeTemplateKeys].sort(), originalNativeKeys);
      assert.deepEqual(withoutSharedKeys(migratedModule.CORE_TEMPLATES), withoutSharedKeys(originalModule.CORE_TEMPLATES));
      assert.deepEqual(migratedModule.OPTIONAL_TEMPLATES, originalModule.OPTIONAL_TEMPLATES);
      assert.equal(source.sourceSha256, createHash('sha256').update(sourceBytes).digest('hex'));
      assert.equal(migratedModule.CORE_TEMPLATES['project-profile.yaml'], createPublicProjectTemplates({ stack: source.stack })['project-profile.yaml']);
      assert.equal(migratedModule.CORE_TEMPLATES['control-plane.md'], createPublicProjectTemplates({ stack: source.stack })['control-plane.md']);
    }
  });
});

test('模板 key 或值形态漂移会停止适配', async () => {
  await withTempRoot((root) => {
    for (const stack of Object.keys(STACK_LAYOUT)) writeSourceFixture(root, stack);
    const plan = buildSharedProjectTemplatePlan({ sourceRoot: root, repositoryRoot: REPOSITORY_ROOT });
    const transform = plan.capabilities[0].sources[0].adapterTransform;
    const sourceText = readFileSync(path.join(root, STACK_LAYOUT.cocos.directory, ...plan.capabilities[0].sources[0].sourcePath.split('/')), 'utf8');
    assert.throws(() => transform(sourceText.replace('"project-profile.yaml"', '"renamed-profile.yaml"')), /公共 key|属性必须恰好出现一次/);
    const duplicateControlKey = sourceText.replace(/(\s*"control-plane\.md"\s*:\s*"[^"]*")/, '$1,\n  "control-plane.md": "duplicate"');
    assert.throws(() => transform(duplicateControlKey), /必须恰好出现一次/);
    assert.throws(() => transform(sourceText.replace('"project-profile.yaml": "', '"project-profile.yaml": buildProfile("')), /必须是静态双引号字符串/);
  });
});

test('三栈新建视觉清单直接声明统一阶段语义', async () => {
  for (const { orchestrator } of Object.values(STACK_LAYOUT)) {
    const entry = path.join(REPOSITORY_ROOT, 'skills', orchestrator, 'scripts', 'project_doc_templates.mjs');
    const { OPTIONAL_TEMPLATES } = await import(pathToFileURL(entry).href);
    const manifest = JSON.parse(OPTIONAL_TEMPLATES.assets['visual-assets.json']);
    assert.equal(manifest.visualStageModel, 'function-first-v1', orchestrator);
    assert.equal(manifest.visualStage, 'V0', orchestrator);
    assert.deepEqual(Object.keys(manifest.visualStageEvidenceRefs).sort(), ['V3', 'V4', 'V5']);
  }
});
