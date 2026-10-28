/** 验证五栈独立安装后的 SDK 文件职责规范可由实际能力入口直接读取。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

const REFERENCE = 'app-domain-toolkit/references/reference-architecture-sdk-initialization.md';
const CAPABILITIES = {
  'app-architecture': STACKS,
  'app-project-foundation': ['threejs', 'flutter'],
  'app-ad-integration': ['cocos', 'phaser', 'threejs'],
};
const NATIVE_REFERENCES = {
  unity: 'unity-development-workflow/references/sdk-initialization.md',
  cocos: 'cocos-game-architecture/references/sdk-initialization.md',
  phaser: 'phaser4-game-architecture/references/sdk-initialization.md',
  threejs: 'threejs-game-architecture/references/sdk-initialization.md',
};
const PROJECT_TEMPLATES = {
  cocos: ['cocos-game-orchestrator', 'assets/scripts/platform/sdks/<sdk>-sdk.ts'],
  phaser: ['phaser4-game-orchestrator', 'src/platform/sdks/<sdk>-sdk.ts'],
  threejs: ['threejs-game-orchestrator', 'src/platform/sdks/<sdk>-sdk.ts'],
};

/** 直接读取所选安装目录中的文件，不借用维护目录中的分发资源。 */
function read(root, path) {
  return readFileSync(join(root, path), 'utf8');
}

for (const stack of STACKS) {
  /** 单栈安装必须同时交付公共规则、原生映射和可解析的章节链接。 */
  test(`${stack} SDK 接入入口加载公共文件职责且保留原生映射`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `sdk-management-${stack}-`));
    // 仅回收当前用例创建的独占目录，不触及真实 SDK 或用户项目。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const reference = read(root, REFERENCE);
    assert.equal(reference, read(join(SOURCE_ROOT, 'skills'), REFERENCE));
    extractMarkdownSection(reference, '文件职责');
    const profile = JSON.parse(read(root, `app-stack-${stack}/profile.json`));
    assert.ok(profile.sharedCapabilities.includes('reference-architecture-sdk-initialization'));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    for (const [capability, supportedStacks] of Object.entries(CAPABILITIES)) {
      // 基础运行时与广告能力只覆盖清单声明的原生栈，不虚构其他栈模式。
      if (!supportedStacks.includes(stack)) continue;
      assert.ok(profile.capabilitySkills.includes(capability), `${stack} 必须声明 ${capability}`);
      const manifest = JSON.parse(read(root, `${capability}/native-adapters.json`));
      assert.ok(read(root, `${capability}/SKILL.md`).includes(`../${REFERENCE}`));
      for (const route of manifest.adapters[stack]) {
        const result = loadNativeMode({ skillsRoot: root, stack, capability, sourceSkill: route.sourceSkill });
        const documents = result.documents.filter((document) => document.path === REFERENCE);
        assert.equal(documents.length, 1, `${capability} 必须实际展开唯一公共来源`);
        assert.equal(documents[0].content, reference);
      }
    }
    const native = NATIVE_REFERENCES[stack];
    if (native) {
      const links = [...read(root, native).matchAll(/\]\(([^)]+reference-architecture-sdk-initialization\.md)(?:#([^)]*))?\)/g)];
      assert.ok(links.length, '原生 SDK 规范必须引用公共文件职责');
      for (const [, path, section] of links) {
        const target = resolve(root, dirname(native), path);
        assert.ok(existsSync(target));
        if (section) extractMarkdownSection(readFileSync(target, 'utf8'), section);
      }
    }
    if (PROJECT_TEMPLATES[stack]) {
      const [owner, managerPath] = PROJECT_TEMPLATES[stack];
      const { CORE_TEMPLATES } = await import(pathToFileURL(join(root, owner, 'scripts/project_doc_templates.mjs')).href);
      const tdd = CORE_TEMPLATES['TDD.md'];
      assert.ok(tdd.includes(managerPath), '真实项目模板必须交接各 SDK 独立实现路径');
      assert.ok(tdd.includes('独立管理文件'), 'SDK 清单必须登记独立文件所有权');
      assert.ok(!tdd.includes('SDK 单文件独立初始化'), '生成的 TDD 不能继续要求多 SDK 单文件实现');
      // 模板输出到项目 docs/ 后，公共规范链接仍必须指向已安装的唯一来源。
      const href = `../.agents/skills/${REFERENCE}#文件职责`;
      assert.ok(tdd.includes(href));
      assert.equal(resolve(project, 'docs', href.split('#')[0]), join(root, REFERENCE));
    }
  });
}
