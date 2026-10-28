/** 验证五栈单独安装后，文案原则由各入口加载同一公共来源。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT } from '../packages/installer/install-project-skills.mjs';

const STACKS = ['unity', 'cocos', 'phaser', 'threejs', 'flutter'];
const CAPABILITIES = ['app-product-planning', 'app-ui-layout', 'app-asset-workflow', 'app-feedback', 'app-ui-code-sketch'];
const PRINCIPLES = 'app-domain-toolkit/references/ui-copy-principles.md';

/** 读取安装目录中的真实文件，避免只检查维护仓库中的引用。 */
function read(skillsRoot, path) {
  return readFileSync(join(skillsRoot, path), 'utf8');
}

for (const stack of STACKS) {
  /** 各栈分别安装并从安装后的读取器执行全部相关原生模式。 */
  test(`${stack} 文案设计与实现入口加载唯一公共文案原则`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `ui-copy-delivery-${stack}-`));
    // 仅回收本测试独占创建的临时项目，不触及用户项目或全局技能。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const skillsRoot = join(project, '.agents/skills');
    const { loadNativeMode } = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/read-native-mode.mjs')).href);
    assert.equal(read(skillsRoot, PRINCIPLES), read(join(SOURCE_ROOT, 'skills'), PRINCIPLES));
    const profile = JSON.parse(read(skillsRoot, `app-stack-${stack}/profile.json`));
    assert.ok(profile.sharedCapabilities.includes('ui-copy-principles'));
    for (const other of STACKS.filter((name) => name !== stack)) {
      assert.ok(!existsSync(join(skillsRoot, `app-stack-${other}`)));
    }

    for (const capability of CAPABILITIES) {
      // 草图能力仅属于 Flutter，其他栈不因此获得未声明的原生模式。
      if (capability === 'app-ui-code-sketch' && stack !== 'flutter') continue;
      assert.ok(profile.capabilitySkills.includes(capability), `${stack} 必须保留 ${capability} 入口`);
      const manifest = JSON.parse(read(skillsRoot, `${capability}/native-adapters.json`));
      assert.ok(read(skillsRoot, `${capability}/SKILL.md`).includes(`../${PRINCIPLES}`));
      for (const route of manifest.adapters[stack]) {
        const result = loadNativeMode({ skillsRoot, stack, capability, sourceSkill: route.sourceSkill });
        const documents = result.documents.filter((document) => document.path === PRINCIPLES);
        assert.equal(documents.length, 1, `${capability}/${route.sourceSkill} 必须实际加载唯一原则正文`);
        assert.equal(documents[0].section, '', '应加载完整原则，不能只列出按需路径或局部片段');
        assert.equal(documents[0].content, read(skillsRoot, PRINCIPLES));
        // Flutter 仅共享表达原则，不引入游戏专用的阶段与运行绑定规范。
        if (stack === 'flutter') {
          assert.ok(!result.documents.some((document) => document.path.endsWith('/ui-game-copy.md')));
        }
      }
    }
  });
}
