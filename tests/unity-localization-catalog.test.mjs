import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import YAML from '../skills/app-skill-runtime/yaml.mjs';
import { validateLocalizationCatalog } from '../skills/unity-development-workflow/scripts/validate-localization-catalog.mjs';

const root = resolve('skills/unity-development-workflow');
const template = JSON.parse(await readFile(join(root, 'assets/localization-catalog-template.json'), 'utf8'));
const schema = JSON.parse(await readFile(join(root, 'references/localization-catalog.schema.json'), 'utf8'));
const project = { languages: ['zh-CN', 'en'], defaultLanguage: 'zh-CN' };

test('固定模板符合 JSON Schema，并支持任意已确认的项目语言', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  assert.equal(validate(template), true, JSON.stringify(validate.errors));
  assert.deepEqual(validateLocalizationCatalog(template, project), []);
  const single = structuredClone(template);
  single.languages = ['en'];
  single.defaultLanguage = 'en';
  for (const entry of single.entries) entry.values = entry.values.filter((value) => value.locale === 'en');
  assert.deepEqual(validateLocalizationCatalog(single, { languages: ['en'], defaultLanguage: 'en' }), []);
  single.unexpected = true;
  assert.equal(validate(single), false);
  assert.match(validateLocalizationCatalog(single, { languages: ['en'], defaultLanguage: 'en' }).join('\n'), /不允许字段/);
});

test('拒绝项目与文案配置语言不一致、缺失或重复的翻译', () => {
  const missing = structuredClone(template);
  missing.languages = ['zh-CN'];
  assert.match(validateLocalizationCatalog(missing, project).join('\n'), /缺少项目语言/);
  const extra = structuredClone(template);
  extra.languages.push('ja');
  assert.match(validateLocalizationCatalog(extra, project).join('\n'), /项目未选择语言/);
  const wrongDefault = structuredClone(template);
  wrongDefault.defaultLanguage = 'en';
  assert.match(validateLocalizationCatalog(wrongDefault, project).join('\n'), /默认语言与项目/);
  wrongDefault.defaultLanguage = 'ja';
  assert.ok(validateLocalizationCatalog(wrongDefault, project).length > 0);
  assert.ok(validateLocalizationCatalog(template, { ...project, defaultLanguage: 'ja' }).length > 0);
  assert.ok(validateLocalizationCatalog(template, { ...project, defaultLanguage: null }).length > 0);
  const badValues = structuredClone(template);
  badValues.entries[0].values[1].locale = 'zh-CN';
  assert.match(validateLocalizationCatalog(badValues, project).join('\n'), /重复语言/);
  assert.match(validateLocalizationCatalog(badValues, project).join('\n'), /缺少语言/);
  const duplicateLanguage = structuredClone(template);
  duplicateLanguage.languages.push('EN');
  assert.match(validateLocalizationCatalog(duplicateLanguage, project).join('\n'), /重复语言/);
});

test('拒绝重复或无效键及不一致、不安全的参数模板', () => {
  const duplicate = structuredClone(template);
  duplicate.entries[1].key = duplicate.entries[0].key;
  assert.match(validateLocalizationCatalog(duplicate, project).join('\n'), /key 重复/);
  const padded = structuredClone(template);
  padded.entries[0].key = ' hud.score';
  assert.match(validateLocalizationCatalog(padded, project).join('\n'), /首尾空格/);
  const badParameters = structuredClone(template);
  badParameters.entries[0].values[0].text = '分数：{other}';
  const errors = validateLocalizationCatalog(badParameters, project).join('\n');
  assert.match(errors, /缺少占位符：value/);
  assert.match(errors, /未声明占位符：other/);
  const duplicateParameters = structuredClone(template);
  duplicateParameters.entries[0].parameters.push('value');
  assert.ok(validateLocalizationCatalog(duplicateParameters, project).length > 0);
  assert.equal(new Ajv2020().compile(schema)(duplicateParameters), false);
  for (const invalid of ['{value', '{value + 1}', '{{value}}']) {
    badParameters.entries[0].values[0].text = invalid;
    assert.match(validateLocalizationCatalog(badParameters, project).join('\n'), /无效占位符/);
  }
  assert.ok(validateLocalizationCatalog(null, null).length > 0);
  assert.ok(validateLocalizationCatalog({ ...template, entries: [null] }, project).length > 0);
  for (const invalid of [[], 1, 'invalid', { ...template, entries: {} }, { ...template, languages: null }]) {
    assert.ok(validateLocalizationCatalog(invalid, project).length > 0);
  }
  const badValues = structuredClone(template);
  badValues.entries[0].values = [null, { locale: 'en', text: 3 }];
  assert.ok(validateLocalizationCatalog(badValues, project).length > 0);
});

test('菜单、弹窗及其他显示对象的文案键统一校验翻译和参数', () => {
  const catalog = structuredClone(template);
  catalog.entries = [
    'menu.title', 'dialog.confirm', 'toast.failed', 'loading.message',
    'dialogue.npc', 'list.empty', 'world.item', 'accessibility.button',
  ].map((key) => ({
    key,
    parameters: ['value'],
    values: [
      { locale: 'zh-CN', text: '内容：{value}' },
      { locale: 'en', text: 'Content: {value}' },
    ],
  }));
  assert.deepEqual(validateLocalizationCatalog(catalog, project), []);

  // 每个非 HUD 键单独构造缺失翻译和参数不一致，避免校验器遗漏任意条目。
  for (let index = 0; index < catalog.entries.length; index++) {
    const missingTranslation = structuredClone(catalog);
    missingTranslation.entries[index].values.pop();
    assert.ok(validateLocalizationCatalog(missingTranslation, project).length > 0, catalog.entries[index].key);
    const wrongParameter = structuredClone(catalog);
    wrongParameter.entries[index].values[1].text = 'Content: {other}';
    assert.ok(validateLocalizationCatalog(wrongParameter, project).length > 0, catalog.entries[index].key);
  }
});

test('S00 报告允许单场景基础能力，同时保留共享消费者和质量证据约束', async () => {
  const report = YAML.parse(await readFile(join(root, 'templates/s00-report.yaml'), 'utf8'));
  const s00Schema = JSON.parse(await readFile(join(root, 'schemas/s00-report.schema.json'), 'utf8'));
  const commonSchema = JSON.parse(await readFile(join(root, 'schemas/common.schema.json'), 'utf8'));
  const reuseSchema = JSON.parse(await readFile(join(root, 'schemas/reuse-resource-plan.schema.json'), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(commonSchema);
  ajv.addSchema(reuseSchema);
  const validate = ajv.compile(s00Schema);
  assert.equal(validate(report), true, JSON.stringify(validate.errors));

  // 项目级启动能力记录在范围和质量报告中，不需虚构共享场景或标记运行通过。
  const singleScene = structuredClone(report);
  singleScene.sharedCapabilities = [];
  assert.equal(singleScene.status, 'NOT_RUN');
  assert.equal(validate(singleScene), true, JSON.stringify(validate.errors));

  const incompleteShared = structuredClone(report);
  incompleteShared.sharedCapabilities[0].usedByScenes = ['scene.arena-intro'];
  assert.equal(validate(incompleteShared), false);
  assert.ok(validate.errors.some((error) => error.instancePath.endsWith('/usedByScenes')));

  for (const reports of [[], [{ type: 'quality-report' }]]) {
    const invalid = structuredClone(singleScene);
    invalid.qualityReports = reports;
    assert.equal(validate(invalid), false);
    assert.ok(validate.errors.some((error) => error.instancePath.startsWith('/qualityReports')));
  }
  const missingReports = structuredClone(singleScene);
  delete missingReports.qualityReports;
  assert.equal(validate(missingReports), false);
  assert.ok(validate.errors.some((error) => error.params.missingProperty === 'qualityReports'));
});

test('CLI 使用真实文件、报告损坏 JSON，且安装后无需项目依赖即可运行', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'unity-localization-catalog-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  installSkills({ projectRoot: dir, stacks: ['unity'] });
  const skillsRoot = join(dir, '.agents/skills');
  const installedWorkflow = join(skillsRoot, 'unity-development-workflow');
  const script = join(installedWorkflow, 'scripts/validate-localization-catalog.mjs');
  for (const path of ['references/text-and-localization.md', 'references/foundation-workflow.md', 'references/visual-decomposition-routes.md', 'references/localization-catalog.schema.json', 'assets/localization-catalog-template.json', 'templates/s00-report.yaml']) {
    assert.equal(await readFile(join(installedWorkflow, path), 'utf8'), await readFile(join(root, path), 'utf8'));
  }
  // 从真实安装目录加载入口，防止源码目录中存在资料掩盖安装或模式路由遗漏。
  const { loadNativeMode } = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/read-native-mode.mjs')).href);
  const { extractMarkdownSection } = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/native-contracts.mjs')).href);
  for (const [capability, sourceSkill] of [
    ['app-architecture', 'unity-game-architecture'],
    ['app-gameplay-development', 'unity-gameplay-development'],
    ['app-asset-workflow', 'unity-game-visual-assets'],
    ['app-ui-layout', 'unity-game-visual-assets'],
    ['app-quality-review', 'unity-game-qa-performance'],
    ['app-feedback', 'unity-game-juice'],
  ]) {
    const mode = loadNativeMode({ skillsRoot, stack: 'unity', capability, sourceSkill });
    const reference = mode.resources.find((resource) => resource.path === 'unity-development-workflow/references/text-and-localization.md');
    assert.equal(reference?.available, true, `${capability}/${sourceSkill} 缺少可读取的 Unity 文本国际化资料`);
    if (['app-asset-workflow', 'app-ui-layout', 'app-quality-review'].includes(capability)) {
      // 实际模式必须暴露已安装的判据章节，避免只在源码或间接引用中存在。
      const criteria = mode.resources.find((resource) => resource.path === 'unity-development-workflow/references/visual-decomposition-routes.md' && resource.fragment === '完整还原的判断标准');
      assert.equal(criteria?.available, true, `${capability}/${sourceSkill} 缺少可读取的文字路线判据`);
      const installedCriteria = await readFile(join(installedWorkflow, 'references/visual-decomposition-routes.md'), 'utf8');
      assert.ok(extractMarkdownSection(installedCriteria, criteria.fragment).trim());
    }
    if (capability === 'app-architecture') {
      const foundation = mode.resources.find((resource) => resource.path === 'unity-development-workflow/references/foundation-workflow.md' && resource.fragment === '国际化基础能力验收');
      assert.equal(foundation?.available, true, 'Unity 架构模式缺少 S00 国际化验收章节');
      const installedFoundation = await readFile(join(installedWorkflow, 'references/foundation-workflow.md'), 'utf8');
      assert.ok(extractMarkdownSection(installedFoundation, foundation.fragment).trim());
    }
  }
  await writeFile(join(dir, 'project.json'), JSON.stringify(project));
  await writeFile(join(dir, 'catalog.json'), JSON.stringify(template));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8' });
  const valid = run('project.json', 'catalog.json');
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /一致/);
  assert.equal(run('project.json').status, 1);
  await writeFile(join(dir, 'catalog.json'), '{broken');
  assert.equal(run('project.json', 'catalog.json').status, 1);
  assert.equal(run('project.json', 'missing.json').status, 1);
  const missing = structuredClone(template);
  missing.entries[0].values.pop();
  await writeFile(join(dir, 'catalog.json'), JSON.stringify(missing));
  const failed = run('project.json', 'catalog.json');
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /缺少语言/);
});
