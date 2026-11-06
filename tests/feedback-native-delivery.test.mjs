/** 验证声明反馈能力的技术栈可在独立安装后读取对应分流规则。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

const REFERENCE = 'app-feedback/references/interaction-feedback.md';
const SECTION = '资源与视觉流程分流';

for (const stack of STACKS) {
  /** 从实际安装的读取器验证直接依赖闭包，避免源仓库掩盖遗漏或锚点断链。 */
  test(`${stack} 按能力声明加载反馈模式并保持安装边界`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `feedback-native-${stack}-`));
    // 仅回收测试独占临时目录，不触碰真实项目或启动引擎与服务。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const skillsRoot = join(project, '.agents/skills');
    const profile = JSON.parse(readFileSync(join(skillsRoot, `app-stack-${stack}/profile.json`), 'utf8'));
    if (!profile.capabilitySkills.includes('app-feedback')) {
      // 无视觉能力的服务端不安装无关反馈或布局技能；其他栈按各自声明判断。
      assert.equal(existsSync(join(skillsRoot, 'app-feedback')), false);
      if (!profile.capabilitySkills.includes('app-ui-layout')) assert.equal(existsSync(join(skillsRoot, 'app-ui-layout')), false);
      return;
    }
    const { loadNativeMode } = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/read-native-mode.mjs')).href);
    const result = loadNativeMode({ skillsRoot, stack, capability: 'app-feedback' });
    const native = result.documents.filter((document) => document.kind === 'native');
    assert.equal(native.length, 1);
    assert.equal(native[0].path, `app-stack-${stack}/references/native-contracts.md`);

    // Unity 还直接读取同文件的竞争与生命周期片段，只选分流片段或包含它的全文。
    const references = result.documents.filter((document) => document.path === REFERENCE && (!document.section || document.section === SECTION));
    const expected = extractMarkdownSection(readFileSync(join(SOURCE_ROOT, 'skills', REFERENCE), 'utf8'), SECTION);
    assert.equal(references.length, 1, '原生入口必须直接加载公共分流正文，不能只列按需路径');
    assert.equal(extractMarkdownSection(references[0].content, SECTION), expected);
    for (const other of STACKS.filter((name) => name !== stack)) {
      assert.ok(!result.documents.some((document) => document.path.startsWith(`app-stack-${other}/`)), '不能串读其他栈手册');
    }
  });
}
