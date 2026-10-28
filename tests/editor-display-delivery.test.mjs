/** 验证新增显示元素的编辑器还原规则按技术栈分发并从实际能力入口加载。 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';

const REFERENCE = 'app-domain-toolkit/references/editor-display-authoring.md';
const EDITOR_STACKS = ['unity', 'cocos'];
const CAPABILITIES = ['app-ui-layout', 'app-asset-workflow', 'app-gameplay-development', 'app-feedback', 'app-animation'];

/** 只读取本次独立安装的文件，避免源仓库掩盖安装闭包中的缺失。 */
function read(root, path) {
  return readFileSync(join(root, path), 'utf8');
}

for (const stack of STACKS) {
  /** 编辑器规则实际展开正文，其他栈不能因共用能力而被要求创建编辑器场景。 */
  test(`${stack} 新增显示元素按实际编辑器能力加载还原规范`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `editor-display-${stack}-`));
    // 仅清理本用例的独占临时目录，不启动编辑器或修改真实项目。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const profile = JSON.parse(read(root, `app-stack-${stack}/profile.json`));
    const editorStack = EDITOR_STACKS.includes(stack);
    assert.equal(profile.sharedCapabilities.includes('editor-display-authoring'), editorStack);
    // 根编排是始终安装的公共入口，不为 Unity/Cocos 虚构其未声明的原生模式。
    if (editorStack) assert.ok(read(root, 'app-creator-workflow/SKILL.md').includes(`../${REFERENCE}`));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    for (const capability of CAPABILITIES) {
      if (editorStack) assert.ok(profile.capabilitySkills.includes(capability), `${stack} 必须保留 ${capability}`);
      // 未声明的能力不属于该栈安装闭包，不能先读取其文件再做适用判断。
      if (!profile.capabilitySkills.includes(capability)) continue;
      const manifest = JSON.parse(read(root, `${capability}/native-adapters.json`));
      if (editorStack) assert.ok(read(root, `${capability}/SKILL.md`).includes(`../${REFERENCE}`));
      for (const route of manifest.adapters[stack]) {
        const result = loadNativeMode({ skillsRoot: root, stack, capability, sourceSkill: route.sourceSkill });
        const documents = result.documents.filter((document) => document.path === REFERENCE);
        assert.equal(documents.length, editorStack ? 1 : 0, `${capability}/${route.sourceSkill} 的适用栈错误`);
        if (editorStack) {
          assert.equal(documents[0].section, '', '新增显示元素规则不能只作为按需路径列出');
          assert.equal(documents[0].content, read(join(SOURCE_ROOT, 'skills'), REFERENCE));
        }
      }
    }
  });
}
