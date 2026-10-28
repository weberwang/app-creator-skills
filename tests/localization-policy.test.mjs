/** 项目语言与多份真实合同的跨栈一致性检查。 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { checkProjectLocales } from '../skills/app-domain-toolkit/scripts/localization/check-project-locales.mjs';
import { installSkills } from '../scripts/install-project-skills.mjs';

/** 构造 Web 布局合同中的语言声明。 */
function web(languages) { return { dynamic_content: { localization: { default_language: languages[0], required_languages: languages } } }; }
/** 构造 Unity 响应式合同中的语言声明。 */
function unity(languages) { return { textLocalization: { locales: languages } }; }

test('中文默认、中英及既有英语单语均按项目选择比较', () => {
  for (const languages of [['zh-CN'], ['zh-CN', 'en'], ['en']]) {
    assert.deepEqual(checkProjectLocales({ languages, defaultLanguage: languages[0] }, [{ path: 'web', document: web(languages) }, { path: 'unity', document: unity([...languages].reverse()) }]), []);
  }
});

test('多合同逐项报告缺失、额外、损坏与项目清单错误', () => {
  const project = { languages: ['zh-CN', 'en'], defaultLanguage: 'zh-CN' };
  const errors = checkProjectLocales(project, [{ path: '缺失', document: web(['zh-CN']) }, { path: '多余', document: unity(['zh-CN', 'en', 'ja']) }, { path: '无字段', document: {} }]);
  assert.match(errors.join('\n'), /缺失.*en/);
  assert.match(errors.join('\n'), /多余.*ja/);
  assert.match(errors.join('\n'), /无字段.*唯一/);
  const wrongDefault = web(['zh-CN', 'en']);
  wrongDefault.dynamic_content.localization.default_language = 'en';
  assert.match(checkProjectLocales(project, [{ path: '默认语言', document: wrongDefault }]).join('\n'), /默认语言.*不一致/);
  assert.throws(() => checkProjectLocales({ languages: ['en', 'EN'], defaultLanguage: 'en' }, []), /重复/);
  assert.throws(() => checkProjectLocales({ languages: ['en'], defaultLanguage: 'zh-CN' }, []), /defaultLanguage/);
});

test('CLI 读取 JSON 和 YAML 合同，损坏或缺失文件必须失败', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'project-locales-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const project = join(dir, 'languages.json');
  const first = join(dir, 'web.yaml');
  const second = join(dir, 'unity.json');
  await writeFile(project, JSON.stringify({ languages: ['zh-CN', 'en'], defaultLanguage: 'zh-CN' }));
  await writeFile(first, 'dynamic_content:\n  localization:\n    default_language: zh-CN\n    required_languages: [zh-CN, en]\n');
  await writeFile(second, JSON.stringify(unity(['zh-CN', 'en'])));
  const script = resolve('skills/app-domain-toolkit/scripts/localization/check-project-locales.mjs');
  const run = (...paths) => spawnSync(process.execPath, [script, '--project-root', dir, 'languages.json', ...paths], { encoding: 'utf8' });
  assert.equal(run('web.yaml', 'unity.json').status, 0);
  await writeFile(second, JSON.stringify(unity(['zh-CN'])));
  const missing = run('web.yaml', 'unity.json');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /缺少项目语言：en/);
  assert.equal(run('web.yaml', 'missing.json').status, 1);
  await writeFile(second, '{broken');
  assert.equal(run('web.yaml', 'unity.json').status, 1);
});

test('安装后的公共工具可以从项目目录执行语言检查', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'installed-project-locales-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  installSkills({ projectRoot: dir, stacks: ['unity'] });
  const project = join(dir, 'languages.json');
  const contract = join(dir, 'contract.json');
  await writeFile(project, JSON.stringify({ languages: ['en'], defaultLanguage: 'en' }));
  await writeFile(contract, JSON.stringify(unity(['en'])));
  const script = join(dir, '.agents/skills/app-domain-toolkit/scripts/localization/check-project-locales.mjs');
  const result = spawnSync(process.execPath, [script, 'languages.json', 'contract.json'], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('Cocos 引用式布局必须明确关联真实本地化合同并核对其项目内引用', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'referenced-project-locales-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'config'));
  const project = join(dir, 'languages.json');
  const ref = join(dir, 'layout.json');
  const localization = join(dir, 'localization.json');
  await writeFile(project, JSON.stringify({ languages: ['zh-CN', 'en'], defaultLanguage: 'zh-CN' }));
  await writeFile(ref, JSON.stringify({ schema_version: '2.0.0', project_policy_file: 'config/policy.json', scene_contract_file: 'config/scene.json', localization_contract_file: 'localization.json' }));
  await writeFile(join(dir, 'config/policy.json'), '{}');
  await writeFile(join(dir, 'config/scene.json'), JSON.stringify({ target_conditions: { locale: 'zh-CN' } }));
  await writeFile(localization, JSON.stringify(web(['zh-CN', 'en'])));
  const script = resolve('skills/app-domain-toolkit/scripts/localization/check-project-locales.mjs');
  const run = (...args) => spawnSync(process.execPath, [script, '--project-root', dir, 'languages.json', ...args], { encoding: 'utf8' });
  assert.equal(run('--bind', 'layout.json', 'localization.json').status, 0);
  await writeFile(join(dir, 'unrelated.json'), JSON.stringify(web(['zh-CN', 'en'])));
  assert.match(run('--bind', 'layout.json', 'unrelated.json').stderr, /与绑定文件不一致/);
  await writeFile(localization, JSON.stringify(web(['zh-CN'])));
  assert.match(run('--bind', 'layout.json', 'localization.json').stderr, /缺少项目语言：en/);
  assert.equal(run('--bind', 'layout.json', '../outside.json').status, 1);
  await rm(join(dir, 'config/scene.json'));
  assert.equal(run('--bind', 'layout.json', 'localization.json').status, 1);
  assert.equal(run(ref).status, 1);
});

test('Unity 语言命令显式引用提供启动观察类型的运行时程序集', async () => {
  const base = 'skills/unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit';
  const assembly = JSON.parse(await readFile(resolve(base, 'Editor/PipelineCommands/Project.UnityWorkflow.PipelineCommands.asmdef'), 'utf8'));
  const runtime = JSON.parse(await readFile(resolve(base, 'Runtime/Project.UnityWorkflow.Runtime.asmdef'), 'utf8'));
  assert.ok(assembly.references.includes(runtime.name));
  assert.ok(runtime.references.includes('Unity.Localization'));
  assert.ok(runtime.references.includes('Unity.ResourceManager'));
});
