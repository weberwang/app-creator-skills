/** 验证单栈安装能获得既有建模和通用贴图入口，不运行引擎或生成资源。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

for (const stack of ['cocos', 'threejs']) {
  test(`${stack} 单栈安装包含建模与通用贴图交接`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `3d-production-${stack}-`));
    // 只回收测试独占的临时项目，不改变用户的技能安装。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents', 'skills');
    const catalog = JSON.parse(readFileSync(join(SOURCE_ROOT, 'packages', 'installer', 'catalog.json'), 'utf8'));
    const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}`, 'profile.json'), 'utf8'));
    assert.deepEqual(profile.capabilitySkills, catalog.stacks[stack].capabilitySkills);
    for (const capability of ['app-3d-modeling', 'app-3d-texturing']) {
      assert.ok(profile.capabilitySkills.includes(capability));
      for (const file of ['SKILL.md', 'native-adapters.json']) assert.ok(existsSync(join(root, capability, file)), `${capability}/${file} 未安装`);
    }
    const adapters = JSON.parse(readFileSync(join(root, 'app-3d-texturing', 'native-adapters.json'), 'utf8'));
    // 两栈使用公共贴图流程，不能冒用其他栈的原生模式。
    assert.equal(adapters.adapters[stack], undefined);
    assert.ok(adapters.adapters.unity?.length && adapters.adapters.roblox?.length);
    const reader = await import(pathToFileURL(join(root, 'app-skill-runtime', 'read-native-mode.mjs')).href);
    const route = reader.loadNativeMode({ stack, capability: 'app-3d-modeling', skillsRoot: root });
    assert.equal(route.sourceSkill, `${stack}-game-3d-modeling`);
    assert.ok(route.documents.some((item) => item.path === `app-stack-${stack}/references/native-contracts.md`));
    // 原生入口链接的工作流和 Blender 资料也必须在目标单栈安装中可读。
    for (const file of ['workflow-integration.md', 'mcp-modeling-workflow.md']) {
      const path = `${stack}-game-3d-modeling/references/${file}`;
      assert.ok(route.resources.some((item) => item.path === path && item.available), `${path} 未随单栈安装提供`);
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
    const execution = readFileSync(join(root, 'app-workflow-control/references/implementation-execution.md'), 'utf8');
    assert.ok(extractMarkdownSection(execution, 'sample-dependencies').trim());
  });
}
