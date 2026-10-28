/** 验证共享参考的迁移账本、原生资料和单栈安装交付。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { installSkills } from '../scripts/install-project-skills.mjs';
import { loadNativeMode } from '../skills/app-skill-runtime/read-native-mode.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const FRAME_NAMES = ['action-timing', 'animation-direction', 'character-animation', 'effect-animation', 'image-inbetween', 'intent-driven-design', 'object-animation', 'region-planning', 'ui-frame-animation', 'workflow-integration'];
const FRAME_IDS = FRAME_NAMES.map((name) => `frame-reference-${name}`);
const CAPABILITIES = {
  'app-animation': FRAME_IDS,
  'app-ui-layout': ['ui-game-copy', 'responsive-visual-validation'],
  'app-quality-review': ['responsive-visual-validation'],
  'app-asset-workflow': ['ui-game-copy'],
};
const STACKS = {
  cocos: { frameSkill: 'cocos-frame-animation', ui: 'cocos-game-ui-layout', qa: 'cocos-game-qa-performance', renderer: 'Creator `Label`/`RichText`', frameEvidence: '示例摘要仅用于展示可选追踪字段', hook: '__COCOS_VISUAL_VALIDATION__' },
  phaser: { frameSkill: 'phaser4-frame-animation', ui: 'phaser4-game-ui-layout', qa: 'phaser4-game-qa-performance', renderer: '`Phaser.Text`', frameEvidence: '以上摘要须替换为实际 64 位小写十六进制', hook: '__PHASER_VISUAL_VALIDATION__' },
  threejs: { frameSkill: 'threejs-frame-animation', ui: 'threejs-game-ui-layout', qa: 'threejs-game-qa-performance', renderer: 'DOM/CSS2D 文本或项目自建文字渲染', frameEvidence: 'runtime_binding', hook: '__THREEJS_VISUAL_VALIDATION__' },
};

/** 按迁移后的相对路径读取资源，断言缺失时给出明确目标。 */
function read(root, relativePath) {
  const file = join(root, ...relativePath.split('/'));
  assert.ok(existsSync(file), `缺失 ${relativePath}`);
  return readFileSync(file, 'utf8');
}

/** 匹配文档标题的实际锚点，避免验证只确认文件存在却忽略章节断链。 */
function anchor(heading) {
  return heading.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');
}

/** 检查迁移生成的公共链接在指定安装目录中仍指向存在的标题。 */
function checkPublicLinks(skillsRoot, nativePath) {
  const text = read(skillsRoot, nativePath);
  const references = [...text.matchAll(/通用工作流步骤见\[完整规范\]\(([^)]+)\)/g)];
  assert.ok(references.length, `${nativePath} 缺少公共参考链接`);
  for (const [, href] of references) {
    const [target, fragment] = href.split('#');
    const absolute = resolve(dirname(join(skillsRoot, nativePath)), target);
    assert.ok(existsSync(absolute), `${nativePath} 的公共参考不存在：${href}`);
    const headings = [...readFileSync(absolute, 'utf8').matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)].map((match) => anchor(match[1]));
    assert.ok(headings.includes(fragment), `${nativePath} 的公共章节不存在：${href}`);
  }
  return text;
}

test('所有参考来源进入迁移账本并由相应公共技能按需引用', () => {
  const catalog = JSON.parse(read(ROOT, 'migration/catalog.json'));
  const expected = [...FRAME_IDS, 'ui-game-copy', 'responsive-visual-validation'];
  const selected = catalog.sharedCapabilities.filter((item) => expected.includes(item.id));
  assert.equal(selected.length, expected.length);
  assert.equal(new Set(selected.map((item) => item.id)).size, expected.length);
  assert.equal(selected.reduce((count, item) => count + item.sources.length, 0), 36);
  for (const item of selected) {
    assert.equal(item.kind, 'workflow');
    assert.ok(read(ROOT, item.implementation).length > 100, `${item.id} 不应退化为简略概述`);
    assert.ok(item.sources.every((source) => source.sections.length > 0 && existsSync(join(ROOT, source.adapterDestination))));
    assert.equal(new Set(item.sources.map((source) => `${source.stack}:${source.sourcePath}`)).size, item.sources.length);
  }
  for (const [capability, ids] of Object.entries(CAPABILITIES)) {
    const manifest = JSON.parse(read(ROOT, `skills/${capability}/native-adapters.json`));
    for (const id of ids) {
      const declared = manifest.sharedWorkflows.filter((entry) => entry.id === id);
      const item = selected.find((entry) => entry.id === id);
      assert.equal(declared.length, 1, `${capability}/${id} 未唯一声明`);
      assert.equal(declared[0].onDemand, true);
      assert.deepEqual(declared[0].stacks, item.stacks);
      assert.equal(resolve(ROOT, 'skills', capability, declared[0].path), resolve(ROOT, item.implementation));
    }
  }
  assert.ok(selected.find((item) => item.id === 'ui-game-copy').stacks.includes('unity'));
});

for (const [stack, details] of Object.entries(STACKS)) {
  test(`${stack} 单栈安装保留公共章节、原生差异和按需读取边界`, (t) => {
    const project = mkdtempSync(join(tmpdir(), `reference-delivery-${stack}-`));
    // 只删除本用例独占创建的临时项目，不能清理调用者的其他目录。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const skillsRoot = join(project, '.agents/skills');
    for (const other of Object.keys(STACKS).filter((name) => name !== stack)) {
      assert.ok(!existsSync(join(skillsRoot, `app-stack-${other}`)), `不应安装 ${other} 手册`);
    }
    const frameRoot = `${stack}-domain-contracts/resources/frame-animation/references`;
    for (const name of FRAME_NAMES.filter((name) => stack !== 'threejs' || name !== 'animation-direction')) {
      checkPublicLinks(skillsRoot, `${frameRoot}/${name}.md`);
    }
    const specificFrame = stack === 'threejs' ? 'workflow-integration' : 'image-inbetween';
    assert.ok(read(skillsRoot, `${frameRoot}/${specificFrame}.md`).includes(details.frameEvidence));
    const inbetween = read(skillsRoot, `${frameRoot}/image-inbetween.md`);
    const commonInbetween = read(skillsRoot, 'app-domain-toolkit/references/frame-reference-image-inbetween.md');
    assert.match(commonInbetween, /node <skill-dir>\/scripts\/image-inbetween-plan\.mjs/);
    assert.doesNotMatch(inbetween, /node <skill-dir>\/scripts\/image-inbetween-plan\.mjs/);
    assert.match(commonInbetween, /^1\. 按内部推导的游戏时长和 FPS/m);
    assert.match(commonInbetween, /^2\. 从真实美术基线制作首帧/m);
    const copy = checkPublicLinks(skillsRoot, `${details.ui}/references/game-copy.md`);
    for (const heading of ['表达选择', '工作流接入', '效果图生成', '资源拆解与界面实现', '检查与返修']) {
      assert.match(copy, new RegExp(`^#{2,3} ${heading}$`, 'm'));
    }
    assert.ok(copy.includes(details.renderer));
    assert.ok(read(skillsRoot, 'app-domain-toolkit/references/ui-game-copy.md').includes('text_decomposition'));
    assert.ok(!copy.includes('text_decomposition'), '共享文案规则不能仍在本栈重复维护');
    const responsive = checkPublicLinks(skillsRoot, `${details.qa}/references/responsive-visual-validation.md`);
    assert.ok(responsive.includes(details.hook));
    const sharedResponsive = read(skillsRoot, 'app-domain-toolkit/references/responsive-visual-validation.md');
    assert.match(sharedResponsive, /仅示意部分测量字段，缺少必需根字段，不是完整合同/);
    assert.doesNotMatch(responsive, /仅示意部分测量字段，缺少必需根字段，不是完整合同/);
    assert.match(sharedResponsive, /示例声明双方向/);
    assert.doesNotMatch(responsive, /示例声明双方向/);
    const templates = [...responsive.matchAll(/\[[^\]]+\]\(([^)]+ui-layout-contract-template\.yaml)\)/g)];
    assert.equal(templates.length, stack === 'cocos' ? 2 : 1);
    for (const [, href] of templates) {
      assert.ok(existsSync(resolve(skillsRoot, details.qa, 'references', href)), `${stack} 的完整合同模板不可达：${href}`);
    }
    const result = loadNativeMode({ skillsRoot, stack, capability: 'app-animation', sourceSkill: details.frameSkill });
    const onDemand = result.resources.filter((entry) => entry.path.includes('/frame-reference-') && entry.available);
    assert.equal(new Set(onDemand.map((entry) => entry.path)).size, stack === 'threejs' ? 9 : 10);
    assert.ok(!result.documents.some((entry) => entry.path.includes('/frame-reference-')), '动画分类参考不应全部自动展开');
  });
}
