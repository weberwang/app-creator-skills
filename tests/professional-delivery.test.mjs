/** 验证实际安装器完整分发专业子树，并运行不依赖引擎的代表性专业工具。 */
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../scripts/install-project-skills.mjs';
import { readSkillCatalog } from '../scripts/skill-catalog.mjs';
import { initializeWork, transitionWork } from '../skills/app-workflow-control/scripts/runtime/workflow.mjs';

const INITIALIZERS = Object.freeze({
  cocos: 'cocos-game-orchestrator',
  phaser: 'phaser4-game-orchestrator',
  threejs: 'threejs-game-orchestrator',
});

/** 建立独占项目目录，并在测试完成后回收所有安装副作用。 */
function temporaryProject(t) {
  const project = mkdtempSync(join(tmpdir(), 'app-creator-professional-delivery-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  return project;
}

/** 枚举目录下的相对文件名，递归比较整套专业技能和资源是否原样分发。 */
function listFiles(root, current = root) {
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(root, path));
    else files.push(relative(root, path).split(sep).join('/'));
  }
  return files.sort();
}

/** 执行实际已安装脚本，保留 stdout/stderr 供失败诊断显示。 */
function runNode(script, args = [], env = { NODE_PATH: '' }) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', windowsHide: true, timeout: 30000, env: { ...process.env, ...env } });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${script}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

/** 通过统一控制器建立真实新 Work Item，并模拟已通过 F0 的人工授权记录。 */
async function createAuthorizedWork(project, { id, stack, grillingRef = null, f0 = 'PASS', action = null, state = 'INTAKE' }) {
  const created = await initializeWork({ repo: project, args: { id, stack, type: 'FOUNDATION', objective: `为 ${stack} 初始化项目技术文档` } });
  const workPath = created.metadata.workItemPath;
  const workFile = join(project, ...workPath.split('/'));
  const work = JSON.parse(readFileSync(workFile, 'utf8'));
  work.gateStatus.F0 = f0;
  if (action) work.action = action;
  if (grillingRef) work.grillingRef = grillingRef;
  if (state === 'RETURN') work.gateStatus.F1 = 'PASS';
  writeFileSync(workFile, `${JSON.stringify(work, null, 2)}\n`, 'utf8');
  if (state === 'BLOCKED') await transitionWork({ repo: project, workItem: workPath, to: 'BLOCKED', args: { reason: '验证阻断状态不允许执行模板初始化' } });
  if (state === 'RETURN') {
    await transitionWork({ repo: project, workItem: workPath, to: 'BASELINE', args: {} });
    await transitionWork({ repo: project, workItem: workPath, to: 'PROPOSAL', args: {} });
    await transitionWork({ repo: project, workItem: workPath, to: 'RETURN', args: { reason: '验证RETURN状态不允许执行模板初始化', 'affected-scope': 'requirements' } });
  }
  return { workPath, work };
}

/** 加载目标技术栈的项目文档初始化器并执行与 CLI 相同的预检和写入顺序。 */
async function initializeStackDocuments(stack, project, workPath, approvalObject = `批准为 ${stack} 创建当前 Work Item 的技术模板`) {
  const skill = INITIALIZERS[stack];
  const modulePath = join(SOURCE_ROOT, 'skills', skill, 'scripts', 'initialize_project_docs.mjs');
  const initializer = await import(pathToFileURL(modulePath).href);
  const templates = initializer.selectTemplates(undefined);
  initializer.runPreflight(project, workPath, null, approvalObject, templates);
  const written = initializer.initializeDocuments(project, templates, false);
  return { templates, written };
}

/** 确认失败预检没有在项目文档目录中留下部分模板。 */
function assertNoDocumentTemplates(project, templates) {
  for (const filename of Object.keys(templates)) {
    const target = filename.startsWith('.workflow-control/') ? filename : join('docs', filename);
    assert.equal(existsSync(join(project, ...target.split('/'))), false, `拒绝初始化后不应留下 ${target}`);
  }
}

/** 构造含一个三角形 POSITION accessor 的 glTF 2.0 静态模型。 */
function baseGltf() {
  return {
    asset: { version: '2.0', generator: 'professional-delivery-fixture' }, scene: 0,
    scenes: [{ name: 'delivery-fixture', nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }],
  };
}

/** 将小型 glTF 场景编码为 validator 接收的自包含 GLB v2 文件。 */
function encodeGlb(gltf) {
  const rawJson = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPadding = (4 - rawJson.length % 4) % 4;
  const json = Buffer.concat([rawJson, Buffer.alloc(jsonPadding, 0x20)]);
  const bin = Buffer.alloc(36);
  const bytes = Buffer.alloc(12 + 8 + json.length + 8 + bin.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(json.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  json.copy(bytes, 20);
  const binOffset = 20 + json.length;
  bytes.writeUInt32LE(bin.length, binOffset);
  bytes.writeUInt32LE(0x004e4942, binOffset + 4);
  bin.copy(bytes, binOffset + 8);
  return bytes;
}

/** 生成模型技能 CLI 的本地项目和清单输入，避免联网或引擎运行。 */
function createModelFixture(project) {
  const model = encodeGlb(baseGltf());
  const modelPath = join(project, 'public', 'models', 'fixture.glb');
  const manifestPath = join(project, 'references', 'model-manifest.json');
  mkdirSync(join(project, 'public', 'models'), { recursive: true });
  mkdirSync(join(project, 'references'), { recursive: true });
  writeFileSync(modelPath, model);
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 1, asset: {
    assetId: 'delivery-fixture', file: 'public/models/fixture.glb', source: '本地分发测试夹具', license: 'CC0-1.0', sceneId: 'delivery-fixture',
    coordinateSystem: { units: 'meters', upAxis: 'Y' }, budgets: { maxBytes: 4096, maxTriangles: 1, maxMaterials: 0, maxTexturePixels: 0 },
    allowAnimations: false, allowSkins: false, externalUriPolicy: 'reject',
  } }, null, 2));
  return manifestPath;
}

test('安装器分发全部专业目录，并运行 Flutter、帧规划和 Three 模型专业工具', (t) => {
  const project = temporaryProject(t);
  const installedSkills = join(project, '.agents', 'skills');
  const catalog = readSkillCatalog(SOURCE_ROOT);
  installSkills({ projectRoot: project, stacks: STACKS });

  for (const stack of STACKS) {
    const record = catalog.stacks[stack];
    assert.ok(record, `迁移清单缺少 ${stack}`);
    for (const name of record.capabilitySkills) {
      const source = join(SOURCE_ROOT, 'skills', name);
      const installed = join(installedSkills, name);
      assert.ok(listFiles(source).includes('SKILL.md'), `${stack}/${name} 缺少公共能力入口`);
      assert.deepEqual(listFiles(installed), listFiles(source), `${stack}/${name} 安装时遗漏文件`);
      for (const file of listFiles(source)) assert.deepEqual(readFileSync(join(installed, ...file.split('/'))), readFileSync(join(source, ...file.split('/'))), `${stack}/${name}/${file} 安装内容不一致`);
    }
    for (const name of record.resourceDirectories) {
      const source = join(SOURCE_ROOT, 'skills', name);
      const installed = join(installedSkills, name);
      assert.ok(listFiles(source).length > 0, `${stack}/${name} 资源目录为空`);
      assert.deepEqual(listFiles(installed), listFiles(source), `${stack}/${name} 安装时遗漏资源`);
      for (const file of listFiles(source)) assert.deepEqual(readFileSync(join(installed, ...file.split('/'))), readFileSync(join(source, ...file.split('/'))), `${stack}/${name}/${file} 安装内容不一致`);
    }
  }

  const runtimeModules = join(installedSkills, 'app-skill-runtime', 'node_modules');
  cpSync(join(SOURCE_ROOT, 'node_modules'), runtimeModules, { recursive: true, force: false, errorOnExist: true });
  const flutterWorkflowValidator = join(installedSkills, 'flutter-domain-contracts', 'tools', 'scripts', 'validate-workflow.js');
  const workflowValidationOutput = runNode(flutterWorkflowValidator, [], { NODE_PATH: '' });
  const workflowValidation = JSON.parse(workflowValidationOutput);
  assert.equal(workflowValidation.ok, true, `Flutter 全工作流校验失败：${(workflowValidation.errors ?? []).join('；')}`);
  assert.ok(workflowValidation.checks?.skills >= 12, 'Flutter validator 应输出真实公共入口与嵌套模板检查数');
  assert.ok(workflowValidation.checks?.markdownLinks > 0, 'Flutter validator 应输出 Markdown 链接检查摘要');
  assert.ok(Array.isArray(workflowValidation.scenarios) && workflowValidation.scenarios.length > 0, 'Flutter validator 应返回场景路由校验结果');

  const flutterFixtures = join(installedSkills, 'adaptive-layout-implementation', 'scripts', 'run-fixtures.js');
  const flutterOutput = runNode(flutterFixtures, [], { NODE_PATH: '' });
  assert.match(flutterOutput, /\[PASS\]/, 'Flutter 布局夹具工具必须产生逐项通过输出');

  for (const stack of ['cocos', 'phaser', 'threejs']) {
    const planner = join(installedSkills, `${stack}-domain-contracts`, 'resources', 'frame-animation', 'scripts', 'image-inbetween-plan.mjs');
    const outputPlan = join(project, `${stack}-frame-plan.json`);
    const output = runNode(planner, ['--duration-ms', '1000', '--fps', '12', '--keyframes', '3,6,9', '--loop', '--output-plan', outputPlan]);
    assert.match(output, /已写入计划/);
    const plan = JSON.parse(readFileSync(outputPlan, 'utf8'));
    assert.ok(plan.steps.length > 0, `${stack} 动画规划应生成中间帧步骤`);
  }

  const threeRepo = join(project, 'three-model-fixture');
  mkdirSync(threeRepo, { recursive: true });
  const manifestPath = createModelFixture(threeRepo);
  const validator = join(installedSkills, 'threejs-game-model-pipeline', 'scripts', 'validate-model.mjs');
  const threeOutput = runNode(validator, ['--repo', threeRepo, '--manifest', manifestPath]);
  const validation = JSON.parse(threeOutput);
  assert.equal(validation.status, 'passed');
  assert.equal(validation.metrics.triangles, 1);
});

test('Cocos、Phaser、ThreeJS 用各自真实 Work Item 写入技术模板', async (t) => {
  for (const stack of Object.keys(INITIALIZERS)) {
    const project = temporaryProject(t);
    const { workPath } = await createAuthorizedWork(project, { id: `${stack}-docs`, stack });
    const { templates, written } = await initializeStackDocuments(stack, project, workPath);
    assert.deepEqual(written.map((path) => relative(project, path).split(sep).join('/')).sort(), Object.keys(templates).map((name) => `docs/${name}`).sort());
    for (const [filename, content] of Object.entries(templates)) {
      assert.equal(readFileSync(join(project, 'docs', filename), 'utf8'), content, `${stack} 必须写入原技术栈模板 ${filename}`);
    }
  }
});

test('显式 local-write 动作可以初始化技术模板', async (t) => {
  const project = temporaryProject(t);
  const { workPath } = await createAuthorizedWork(project, {
    id: 'explicit-local-docs', stack: 'threejs',
    action: { actionId: 'initialize-threejs-documents', effects: ['local-write'] },
  });
  const { written } = await initializeStackDocuments('threejs', project, workPath);
  assert.ok(written.length > 0);
});

test('F0 未通过、没有对象授权、错栈和未决拷问都会在写入前拒绝', async (t) => {
  const cases = [
    { name: 'f0-unapproved', workStack: 'cocos', initializerStack: 'cocos', f0: 'NOT_RUN', approval: '批准创建技术模板', expectedError: /F0=PASS/u },
    { name: 'missing-object-approval', workStack: 'cocos', initializerStack: 'cocos', f0: 'PASS', approval: '', expectedError: /初始化对象说明/u },
    { name: 'wrong-stack', workStack: 'unity', initializerStack: 'threejs', f0: 'PASS', approval: '批准创建技术模板', expectedError: /技术栈必须为 threejs/u },
    { name: 'open-grilling', workStack: 'phaser', initializerStack: 'phaser', f0: 'PASS', approval: '批准创建技术模板', openGrilling: true, expectedError: /未决拷问/u },
    { name: 'external-write-action', workStack: 'cocos', initializerStack: 'cocos', f0: 'PASS', approval: '批准创建技术模板', action: { actionId: 'publish-docs', effects: ['external-write'], target: 'production' }, expectedError: /不能夹带/u },
    { name: 'local-delete-action', workStack: 'threejs', initializerStack: 'threejs', f0: 'PASS', approval: '批准创建技术模板', action: { actionId: 'delete-docs', effects: ['local-delete'] }, expectedError: /不能夹带/u },
    { name: 'blocked-state', workStack: 'cocos', initializerStack: 'cocos', f0: 'PASS', approval: '批准创建技术模板', state: 'BLOCKED', expectedError: /BLOCKED\/RETURN/u },
    { name: 'return-state', workStack: 'threejs', initializerStack: 'threejs', f0: 'PASS', approval: '批准创建技术模板', state: 'RETURN', expectedError: /BLOCKED\/RETURN/u },
  ];
  for (const scenario of cases) {
    const project = temporaryProject(t);
    const grillingPath = '.workflow-control/grilling/open.json';
    if (scenario.openGrilling) {
      mkdirSync(join(project, '.workflow-control', 'grilling'), { recursive: true });
      writeFileSync(join(project, ...grillingPath.split('/')), JSON.stringify({
        schemaVersion: '1.0', workItemId: `${scenario.workStack}-${scenario.name}`, status: 'OPEN',
        decisions: [{ question: '首发能力范围是什么？', impact: '错误实现会返工', options: ['保留当前范围', '增加联网功能'], recommendation: '保留当前范围' }],
      }), 'utf8');
    }
    const { workPath } = await createAuthorizedWork(project, {
      id: `${scenario.workStack}-${scenario.name}`, stack: scenario.workStack,
      f0: scenario.f0, grillingRef: scenario.openGrilling ? { path: grillingPath } : null,
      action: scenario.action ?? null, state: scenario.state ?? 'INTAKE',
    });
    const initializerModule = await import(pathToFileURL(join(SOURCE_ROOT, 'skills', INITIALIZERS[scenario.initializerStack], 'scripts', 'initialize_project_docs.mjs')).href);
    const templates = initializerModule.selectTemplates(undefined);
    assert.throws(
      () => {
        initializerModule.runPreflight(project, workPath, null, scenario.approval, templates);
        initializerModule.initializeDocuments(project, templates, false);
      },
      scenario.expectedError,
      scenario.name,
    );
    assertNoDocumentTemplates(project, templates);
  }
});

test('项目 docs junction 指向项目外时初始化器拒绝且外部目录无写入', async (t) => {
  const sandbox = mkdtempSync(join(tmpdir(), 'app-creator-docs-junction-'));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const project = join(sandbox, 'project');
  const outside = join(sandbox, 'outside');
  mkdirSync(project, { recursive: true });
  mkdirSync(outside, { recursive: true });
  const { workPath } = await createAuthorizedWork(project, { id: 'junction-docs', stack: 'threejs' });
  await symlink(outside, join(project, 'docs'), 'junction');
  const initializer = await import(pathToFileURL(join(SOURCE_ROOT, 'skills', INITIALIZERS.threejs, 'scripts', 'initialize_project_docs.mjs')).href);
  const templates = initializer.selectTemplates(undefined);
  assert.throws(() => {
    initializer.runPreflight(project, workPath, null, '批准创建技术模板', templates);
    initializer.initializeDocuments(project, templates, false);
  }, /符号链接|项目外|越界/u, '项目外 junction 必须在任何模板写入前阻断');
  assert.deepEqual(await readdir(outside), []);
  assertNoDocumentTemplates(project, templates);
});
