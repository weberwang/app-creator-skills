/** 为共享工作流抽取器建立隔离源仓库，验证逐段对齐与技术约束保留。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applySharedWorkflowSections, buildSharedWorkflowPlan } from '../scripts/migration/shared-workflows.mjs';

const STACKS = {
  cocos: { directory: 'cocos-skills', label: 'Cocos', skills: ['cocos-game-artifact-cleanup', 'cocos-game-image-optimization', 'cocos-game-audio', 'cocos-game-juice', 'cocos-game-balance', 'cocos-frame-animation', 'cocos-game-release', 'cocos-game-ad-integration'] },
  phaser: { directory: 'phaser-skills', label: 'Phaser', skills: ['phaser4-game-artifact-cleanup', 'phaser4-game-image-optimization', 'phaser4-game-audio', 'phaser4-game-juice', 'phaser4-game-balance', 'phaser4-frame-animation', 'phaser4-game-release', 'phaser4-game-ad-integration'] },
  threejs: { directory: 'threejs-skills', label: 'Three.js', skills: ['threejs-game-artifact-cleanup', 'threejs-game-image-optimization', 'threejs-game-audio', 'threejs-game-juice', 'threejs-game-balance', 'threejs-frame-animation', 'threejs-game-release', 'threejs-game-ad-integration'] },
};
const FAMILIES = ['artifact-cleanup', 'image-optimization', 'audio', 'juice', 'balance', 'frame-animation', 'release', 'ad-integration'];

/** 创建仅用于测试的三栈 Skill 集合，不依赖开发机上的源仓库。 */
function createFixture() {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'shared-workflows-'));
  const sourceRoot = {};
  const sourceTexts = new Map();
  for (const [stack, config] of Object.entries(STACKS)) {
    const stackRoot = path.join(temporaryRoot, config.directory);
    sourceRoot[stack] = stackRoot;
    for (let index = 0; index < FAMILIES.length; index += 1) {
      const family = FAMILIES[index];
      const skill = config.skills[index];
      const skillRoot = path.join(stackRoot, 'skills', skill);
      mkdirSync(skillRoot, { recursive: true });
      const sharedText = family === 'release' || family === 'ad-integration'
        ? stack === 'cocos'
          ? 'Cocos Creator Build 配置负责发布资源归档。'
          : stack === 'phaser'
            ? 'Phaser 使用 Vite 构建配置负责发布资源归档。'
            : 'Three.js 使用 renderer 管线负责发布资源归档。'
        : config.label + ' 资源候选必须放入独立目录，不覆盖生产源文件；逐项记录格式、来源、处理参数、结构变化、验证证据和失败原因，并保留原始输入与可回退路径。完成后比较实际收益，只在适用结构与运行验证通过时交付候选。';
      const nativeText = stack === 'cocos'
        ? 'Creator AssetDB 通过 UUID 与 .meta 绑定资源。'
        : stack === 'phaser'
          ? 'Phaser.Scene、Scale 和 Input 生命周期由本栈规则约束。'
          : 'Three.js WebGLRenderer 与 world projection 保留独立约束。';
      const content = [
        '---',
        'name: ' + skill,
        '---',
        '',
        '# ' + family,
        '',
        '## 共用流程',
        '',
        '1. ' + sharedText,
        '',
        (family === 'release' || family === 'ad-integration')
          ? nativeText
          : '2. 优化前建立逐文件基线，优化后记录差异和适用验证结果。',
        '',
        '## 本栈技术约束',
        '',
        nativeText,
        '',
        '## 全局控制接入',
        '',
        'F0-F4 和 A4-A6 只属于被替换的旧状态门。',
        '',
      ].join('\n');
      const sourcePath = 'skills/' + skill + '/SKILL.md';
      writeFileSync(path.join(skillRoot, 'SKILL.md'), content, 'utf8');
      sourceTexts.set(stack + ':' + family, { content, sourcePath, skill });
    }
  }
  return { temporaryRoot, sourceRoot, repositoryRoot: path.join(temporaryRoot, 'target'), sourceTexts };
}

/** 清理每个测试单独创建的临时仓库。 */
function removeFixture(fixture) {
  rmSync(fixture.temporaryRoot, { recursive: true, force: true });
}

/** 验证三栈同规则汇入一份完整正文并且入口只留下章节引用。 */
test('三栈可抽取共用规则，原入口保留专业约束', () => {
  const fixture = createFixture();
  try {
    const plan = buildSharedWorkflowPlan(fixture);
    const document = plan.documents.find((item) => item.capabilityId === 'image-optimization');
    assert.ok(document);
    assert.match(document.content, /资源候选必须放入独立目录，不覆盖生产源文件/);
    assert.match(document.content, /优化前建立逐文件基线，优化后记录差异和适用验证结果/);
    assert.doesNotMatch(document.content, /F0-F4|A4-A6|AssetDB|Phaser\.Scene|WebGLRenderer/);

    for (const stack of Object.keys(STACKS)) {
      const source = fixture.sourceTexts.get(stack + ':image-optimization');
      const transformed = applySharedWorkflowSections(source.content, {
        stack,
        sourcePath: source.sourcePath,
        destination: 'skills/' + source.skill + '/SKILL.md',
        plan,
      });
      assert.match(transformed.text, /Creator AssetDB|Phaser\.Scene|Three\.js WebGLRenderer/);
      assert.doesNotMatch(transformed.text, /资源候选必须放入独立目录/);
      assert.match(transformed.text, /1\. 通用工作流步骤见\[完整规范\]/);
      assert.ok(transformed.sharedReferences.every((reference) => typeof reference === 'string'));
      assert.ok(transformed.sharedReferences.some((reference) => reference.includes('../app-domain-toolkit/references/image-optimization.md#共用流程')));
    }
  } finally {
    removeFixture(fixture);
  }
});

/** 验证迁移账本摘要采用可复算的规范化语义。 */
test('计划保留原块和公共块正文，摘要可独立复算', () => {
  const fixture = createFixture();
  try {
    const plan = buildSharedWorkflowPlan(fixture);
    const document = plan.documents.find((item) => item.capabilityId === 'image-optimization');
    const cocosSource = document.sources.find((item) => item.stack === 'cocos');
    const section = cocosSource.sections.find((item) => item.original.includes('Cocos 资源候选'));
    assert.ok(section);
    assert.equal(section.sourceHash, createHash('sha256').update(section.original.trim().replace(/\r\n/g, '\n')).digest('hex'));
    assert.equal(section.canonicalHash, createHash('sha256').update(section.canonical.trim().replace(/\r\n/g, '\n')).digest('hex'));
    assert.ok(document.content.includes(section.canonical));
  } finally {
    removeFixture(fixture);
  }
});

/** 技术栈词相似但实现约束不同的发布和广告段落不能被强行归一。 */
test('独有的发布与广告规则不会生成公共工作流', () => {
  const fixture = createFixture();
  try {
    const plan = buildSharedWorkflowPlan(fixture);
    assert.equal(plan.documents.some((item) => item.capabilityId === 'release'), false);
    assert.equal(plan.documents.some((item) => item.capabilityId === 'ad-integration'), false);
  } finally {
    removeFixture(fixture);
  }
});

/** 源段落在建计划后发生编辑时必须停止，不以旧哈希继续替换。 */
test('源块漂移会使替换失败', () => {
  const fixture = createFixture();
  try {
    const plan = buildSharedWorkflowPlan(fixture);
    const source = fixture.sourceTexts.get('cocos:image-optimization');
    const drifted = source.content.replace('资源候选必须放入独立目录', '候选资源直接写回原目录');
    assert.throws(() => applySharedWorkflowSections(drifted, {
      stack: 'cocos',
      sourcePath: source.sourcePath,
      destination: 'skills/' + source.skill + '/SKILL.md',
      plan,
    }), /源块漂移/);
  } finally {
    removeFixture(fixture);
  }
});

