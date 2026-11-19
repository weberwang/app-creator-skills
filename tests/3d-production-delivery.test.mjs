/** 验证单栈安装能获得既有建模和通用贴图入口，不运行引擎或生成资源。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

for (const stack of ['cocos', 'unity', 'threejs']) {
  test(`${stack} 单栈安装包含建模与通用贴图交接`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `3d-production-${stack}-`));
    // 只回收测试独占的临时项目，不改变用户的技能安装。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents', 'skills');
    const catalog = JSON.parse(readFileSync(join(SOURCE_ROOT, 'packages', 'installer', 'catalog.json'), 'utf8'));
    const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}`, 'profile.json'), 'utf8'));
    assert.deepEqual(profile.capabilitySkills, catalog.stacks[stack].capabilitySkills);
    assert.deepEqual(profile.resourceDirectories, catalog.stacks[stack].resourceDirectories);
    for (const capability of ['app-3d-modeling', 'app-3d-texturing']) {
      assert.ok(profile.capabilitySkills.includes(capability));
      for (const file of ['SKILL.md', 'native-adapters.json']) assert.ok(existsSync(join(root, capability, file)), `${capability}/${file} 未安装`);
    }
    const adapters = JSON.parse(readFileSync(join(root, 'app-3d-texturing', 'native-adapters.json'), 'utf8'));
    // Cocos 和 Three.js 使用公共贴图流程，Unity 读取自己的原生模式。
    if (stack === 'unity') assert.ok(adapters.adapters.unity?.length);
    else assert.equal(adapters.adapters[stack], undefined);
    assert.ok(adapters.adapters.unity?.length && adapters.adapters.roblox?.length);
    const reader = await import(pathToFileURL(join(root, 'app-skill-runtime', 'read-native-mode.mjs')).href);
    const route = reader.loadNativeMode({ stack, capability: 'app-3d-modeling', skillsRoot: root });
    assert.equal(route.sourceSkill, `${stack}-game-3d-modeling`);
    assert.ok(route.documents.some((item) => item.path === `app-stack-${stack}/references/native-contracts.md`));
    const productionPath = 'app-domain-toolkit/references/blender-scene-production.md';
    assert.ok(route.resources.some((item) => item.path === productionPath && item.available));
    assert.ok(!route.documents.some((item) => item.path === productionPath), 'Blender 制作资料应在选中 Blender 路线后读取');
    if (stack === 'unity') {
      const texture = reader.loadNativeMode({ stack, capability: 'app-3d-texturing', skillsRoot: root });
      assert.ok(texture.resources.some((item) => item.path === productionPath && item.available));
    }

    const upstreamRoot = join(root, 'blender-production-reference');
    const upstream = JSON.parse(readFileSync(join(upstreamRoot, 'upstream.json'), 'utf8'));
    assert.equal(upstream.repo, 'https://github.com/arjun988/blender-skills');
    assert.equal(upstream.commit, '904f095d8f36a6e72adaebb08d07f884a074743d');
    // 对照完整清单核验安装树和原文摘要，防止分发漏掉专项技能或参考文件。
    const filePaths = upstream.files.map((item) => item.destination);
    const installedFiles = readdirSync(upstreamRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(upstreamRoot, join(entry.parentPath, entry.name)).split(sep).join('/'));
    assert.deepEqual(installedFiles.sort(), [...filePaths, 'upstream.json'].sort());
    assert.equal(new Set(upstream.skills).size, 94);
    assert.deepEqual(filePaths.filter((path) => path.endsWith('/UPSTREAM.md')).sort(), upstream.skills.map((skill) => `${skill}/UPSTREAM.md`).sort());
    assert.equal(filePaths.filter((path) => /(?:^|\/)references\//.test(path)).length, 175);
    assert.ok(filePaths.includes('LICENSE'));
    assert.ok(!installedFiles.some((path) => /(?:^|\/)SKILL\.md$/i.test(path)), '上游资料应由本地入口按需加载');
    for (const { destination, sha256 } of upstream.files) {
      const file = join(upstreamRoot, destination);
      const contents = readFileSync(file);
      assert.equal(createHash('sha256').update(contents).digest('hex'), sha256, `${destination} 与固定上游原文不一致`);
      if (!destination.endsWith('.md')) continue;
      // 跨技能引用保持原相对目录，沿用宿主的入口文件改名约定。
      for (const [, directory] of contents.toString('utf8').matchAll(/`(\.\.\/[^`\r\n]+\/)SKILL\.md`/g)) {
        assert.ok(existsSync(join(dirname(file), directory, 'UPSTREAM.md')), `${destination} 引用的 ${directory} 未安装`);
      }
    }
    // 原生入口引用的建模资料归入对应栈，并从实际单栈安装路径解析。
    const files = stack === 'unity' ? ['mcp-modeling-workflow.md'] : ['workflow-integration.md', 'mcp-modeling-workflow.md'];
    for (const file of files) {
      const path = `app-stack-${stack}/references/${file}`;
      assert.ok(route.resources.some((item) => item.path === path && item.available), `${path} 未随单栈安装提供`);
    }
    for (const old of ['cocos-game-3d-modeling', 'unity-game-3d-modeling', 'threejs-game-3d-modeling', 'threejs-game-model-pipeline', 'threejs-game-orchestrator']) {
      assert.equal(existsSync(join(root, old)), false, `${old} 不应继续作为独立资源目录安装`);
    }
    assert.ok(existsSync(join(root, 'app-asset-workflow', 'SKILL.md')));
    assert.ok(existsSync(join(root, 'app-domain-toolkit', 'references', 'game-design-exploration.md')));
    // 原生入口按章节读取时也必须保留路线适用性，不能仅靠未加载的文档前言限定图片门。
    const admission = readFileSync(join(root, 'app-domain-toolkit/references/reference-domain-visual-admission.md'), 'utf8');
    const stageGate = extractMarkdownSection(admission, '实施顺序状态硬门');
    assert.match(stageGate, /图片目标、候选图及拆解布局条款适用于图片／UI/);
    assert.match(stageGate, /highFidelityPrerequisite/);
    const world = readFileSync(join(root, 'app-workflow-control/references/world3d-scenes.md'), 'utf8');
    assert.ok(extractMarkdownSection(world, 'persistent-hud').trim());
    assert.ok(extractMarkdownSection(world, 'model-sample-reuse').trim());
    // 从实际安装目录加载新增运行时，避免源码可用但交付缺失辅助模块。
    for (const [file, symbol] of [['world3d-file-snapshots.mjs', 'captureWorld3DFileSnapshots'], ['world3d-model-reuse.mjs', 'world3DModelReuse']]) {
      const runtime = await import(pathToFileURL(join(root, 'app-workflow-control/scripts/runtime', file)).href);
      assert.equal(typeof runtime[symbol], 'function');
    }
    const execution = readFileSync(join(root, 'app-workflow-control/references/implementation-execution.md'), 'utf8');
    assert.ok(extractMarkdownSection(execution, 'sample-dependencies').trim());
  });
}
