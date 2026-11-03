/** 验证共享参考、原生资料和单栈安装交付。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';
import { loadNativeMode } from '../skills/app-skill-runtime/read-native-mode.mjs';

const FRAME_NAMES = ['action-timing', 'animation-direction', 'character-animation', 'effect-animation', 'image-inbetween', 'intent-driven-design', 'object-animation', 'region-planning', 'ui-frame-animation', 'workflow-integration'];
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
    // 分别检查单栈分发的原生入口与共享章节，避免规则存在但不可达。
    const timingReference = read(skillsRoot, `${frameRoot}/action-timing.md`);
    assert.ok(timingReference.includes('frame-reference-action-timing.md#多段攻击的输入窗口与分岔'));
    assert.ok(timingReference.includes('frame-reference-action-timing.md#视频节奏整理'));
    const characterReference = read(skillsRoot, `${frameRoot}/character-animation.md`);
    assert.ok(characterReference.includes('frame-reference-character-animation.md#收势视频的参考与验收'));
    const commonTiming = read(skillsRoot, 'app-domain-toolkit/references/frame-reference-action-timing.md');
    const comboBranch = extractMarkdownSection(commonTiming, '多段攻击的输入窗口与分岔');
    const videoTiming = extractMarkdownSection(commonTiming, '视频节奏整理');
    const commonCharacter = read(skillsRoot, 'app-domain-toolkit/references/frame-reference-character-animation.md');
    const recoveryVideo = extractMarkdownSection(commonCharacter, '收势视频的参考与验收');
    assert.match(comboBranch, /输入窗口.{0,100}切换点/);
    assert.match(comboBranch, /未接招去向/);
    assert.match(comboBranch, /固定切换[\s\S]*缓存[\s\S]*分岔点/);
    assert.match(comboBranch, /窗口内立即切换[\s\S]*窗口早、中、晚/);
    assert.match(recoveryVideo, /真实角色基线/);
    assert.match(recoveryVideo, /实际分岔帧/);
    assert.match(recoveryVideo, /短视频或相邻帧/);
    assert.match(recoveryVideo, /运动方向、速度趋势/);
    assert.match(recoveryVideo, /接回母片[\s\S]*审阅/);
    assert.match(videoTiming, /原视频与派生视频路径[\s\S]*源时间到游戏时间的映射/);
    assert.match(videoTiming, /母片确认不能替代派生视频验收/);
    assert.match(videoTiming, /人工验收通过后[\s\S]*抽帧/);
    // 覆盖安装后的两处阶段说明，防止原生参考落后于公共阶段合同。
    const intent = read(skillsRoot, `${frameRoot}/intent-driven-design.md`);
    assert.match(intent, /\| V3 动作分析与时间轴记录 \|/);
    assert.match(intent, /\| V4 提示词与真实素材制作 \|/);
    assert.match(intent, /\| V4 真实素材人工验收 \|/);
    assert.match(intent, /\| V5 [^|]*接入与验证 \|/);
    const workflow = read(skillsRoot, `${frameRoot}/workflow-integration.md`);
    assert.match(workflow, /运行态在全局 V5 验证/);
    const commonFrame = read(skillsRoot, 'app-domain-toolkit/references/frame-reference-workflow-integration.md');
    assert.match(commonFrame, /V3[^\n]*动作[^\n]*V4[^\n]*素材/);
    const result = loadNativeMode({ skillsRoot, stack, capability: 'app-animation', sourceSkill: details.frameSkill });
    // 游戏交付规则须随原生模式直接加载，避免制作只读取素材说明而漏掉正式场景验收。
    const execution = result.documents.find((document) => document.path === 'app-domain-toolkit/references/frame-animation-execution.md');
    assert.ok(execution, '缺少帧动画共享执行规则');
    const gameDelivery = extractMarkdownSection(execution.content, '游戏时间轴与交付追溯');
    assert.match(gameDelivery, /V3 动作方案.*V4 视频与素材.*V5 正式游戏验收/s);
    // 检查正常入口对冲突澄清、视频交接和正式验收记录的要求。
    const animationSkill = read(skillsRoot, result.capabilityPath);
    const animationInputs = extractMarkdownSection(animationSkill, '输入');
    assert.match(animationInputs, /冲突.*版本.*受影响动作.*用户确认.*消息引用/s);
    assert.match(gameDelivery, /同一次方案确认.*关键时点.*玩法分支.*待决项/s);
    assert.match(execution.content, /视频提供方.*参考输入.*待提供/s);
    assert.match(gameDelivery, /V5 正式游戏验收.*复现输入.*预期与实际.*运行证据.*视觉结论.*动作版本.*未验证/s);
    const nativeGuide = result.documents.find((document) => document.kind === 'native').content;
    assert.match(nativeGuide, /V3[^\n]*动作[^\n]*V4[^\n]*(?:素材|真实视频)[^\n]*V5[^\n]*(?:接入|消费)/);
    if (stack === 'threejs') {
      assert.match(workflow, /V3[^\n]*动作方案[^\n]*V4[^\n]*素材/);
      assert.match(workflow, /全局视觉阶段为 V0、V1、V2、V3、V4、V5/);
    } else {
      assert.match(workflow, /V3[^\n]*设计决定[^\n]*V4[^\n]*素材[^\n]*V5[^\n]*触发/);
      assert.match(intent, /V4[^\n]*真实候选[^\n]*V5[^\n]*触发/);
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
    assert.match(sharedResponsive, /游戏初始化仅选择一个方向/);
    assert.doesNotMatch(responsive, /游戏初始化仅选择一个方向/);
    const templates = [...responsive.matchAll(/\[[^\]]+\]\(([^)]+ui-layout-contract-template\.yaml)\)/g)];
    assert.equal(templates.length, stack === 'cocos' ? 2 : 1);
    for (const [, href] of templates) {
      assert.ok(existsSync(resolve(skillsRoot, details.qa, 'references', href)), `${stack} 的完整合同模板不可达：${href}`);
    }
    const onDemand = result.resources.filter((entry) => entry.path.includes('/frame-reference-') && entry.available);
    assert.equal(new Set(onDemand.map((entry) => entry.path)).size, stack === 'threejs' ? 9 : 10);
    assert.ok(!result.documents.some((entry) => entry.path.includes('/frame-reference-')), '动画分类参考不应全部自动展开');
  });
}
