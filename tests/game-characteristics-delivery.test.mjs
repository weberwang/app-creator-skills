/** 验证游戏专项规范的独立安装、按需读取及非游戏技术栈边界。 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

const RULE = 'app-domain-toolkit/references/game-characteristics.md';
const CONTENT = 'app-domain-toolkit/references/game-content-playtesting.md';
const EXPLORATION = 'app-domain-toolkit/references/game-design-exploration.md';
const GAME_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'roblox']);
const ENTRIES = {
  'app-product-planning': 'identify',
  'app-gameplay-development': 'v1',
  'app-quality-review': 'qa',
};
/** 按专业入口声明实际需要的参考，数值只接入与本次相关的试玩调参规范。 */
const RULES = [
  { path: RULE, entries: ENTRIES },
  { path: CONTENT, entries: {
    'app-product-planning': 'levels',
    'app-gameplay-development': 'levels',
    'app-game-balance': 'playtest',
    'app-quality-review': 'playtest',
  } },
  { path: EXPLORATION, entries: {
    'app-product-planning': 'explore',
    'app-gameplay-development': 'handoff',
    'app-asset-workflow': 'handoff',
  } },
];

/** 核对安装后入口的实际链接与目标章节，避免规范虽分发却无法从任务进入。 */
function checkLink(root, source, section = '', target = RULE) {
  const file = join(root, source);
  const links = [...readFileSync(file, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
  assert.ok(links.some(([, href]) => {
    const [path, fragment = ''] = href.split('#');
    return resolve(dirname(file), path) === resolve(root, target) && fragment === section;
  }), `${source} 缺少专项链接或锚点错误`);
  assert.ok(extractMarkdownSection(readFileSync(join(root, target), 'utf8'), section).trim());
}

for (const stack of STACKS) {
  /** 在单栈安装结果中使用实际读取器，源仓库不能替安装结果补全遗漏。 */
  test(`${stack} 游戏专项的安装、路由与适用边界`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), 'game-characteristics-'));
    t.after(() => {
      // 只递归清理位于系统临时目录内、由本用例创建的独占项目。
      assert.equal(dirname(resolve(project)), resolve(tmpdir()));
      assert.ok(basename(project).startsWith('game-characteristics-'));
      rmSync(project, { recursive: true, force: true });
    });
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}/profile.json`), 'utf8'));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    const isGame = GAME_STACKS.has(stack);

    const capabilities = [...new Set(RULES.flatMap((rule) => Object.keys(rule.entries)))];
    for (const capability of capabilities) {
      if (!profile.capabilitySkills.includes(capability)) {
        assert.equal(isGame, false, `${stack} 缺少游戏所需能力 ${capability}`);
        // 公共素材目录可能随安装交付，是否允许使用应以读取器的能力边界为准。
        assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability }), /当前技术栈未声明该能力/);
        continue;
      }
      const manifest = JSON.parse(readFileSync(join(root, capability, 'native-adapters.json'), 'utf8'));
      // 同栈能力可能有多个原生模式，逐条显式选择，避免默认选择掩盖某条路由越界。
      for (const route of manifest.adapters[stack]) {
        const result = loadNativeMode({ skillsRoot: root, stack, capability, sourceSkill: route.sourceSkill });
        for (const rule of RULES.filter((entry) => capability in entry.entries)) {
          // 按需清单声明全文路径；正文的其他章节引用不应被误算成重复声明。
          const resources = result.resources.filter((entry) => entry.path === rule.path && !entry.fragment);
          assert.equal(resources.length, isGame ? 1 : 0, `${stack}/${route.sourceSkill} 专项适用范围错误：${rule.path}`);
          assert.ok(!result.documents.some((entry) => entry.path === rule.path), '专项只按当前机制选读，不自动全文加载');
          if (!isGame) continue;
          assert.equal(resources[0].available, true);
          assert.equal(resources[0].kind, 'public-reference');
          checkLink(root, `${capability}/SKILL.md`, rule.entries[capability], rule.path);
        }
        assert.ok(!result.documents.some((entry) => /^app-stack-/.test(entry.path) && !entry.path.startsWith(`app-stack-${stack}/`)));
      }
    }

    if (!isGame) return;
    for (const rule of RULES) {
      assert.equal(readFileSync(join(root, rule.path), 'utf8'), readFileSync(join(SOURCE_ROOT, 'skills', rule.path), 'utf8'));
    }
    for (const source of ['app-creator-workflow/SKILL.md', 'app-creator-workflow/references/workflow.md', 'app-creator-workflow/references/domain-production.md']) {
      checkLink(root, source);
    }
    // 设计职责、原型验证和正式多视图制作都必须能接回同一份探索规范。
    for (const [source, section] of [
      ['app-creator-workflow/SKILL.md', 'explore'],
      ['app-creator-workflow/references/workflow.md', 'explore'],
      ['app-creator-workflow/references/professional-execution.md', 'explore'],
      ['app-creator-workflow/references/handoffs.md', 'roles'],
      ['app-creator-workflow/references/readable-functional-prototype.md', 'handoff'],
      ['app-asset-workflow/references/multi-image-scene-design.md', 'explore'],
    ]) checkLink(root, source, section, EXPLORATION);
    // 声明的按需参考丢失必须报错，不能悄悄退回源仓库或当作可选检查跳过。
    for (const rule of RULES) {
      const missing = resolve(root, rule.path);
      assert.ok(!relative(project, missing).startsWith('..'));
      const bytes = readFileSync(missing);
      rmSync(missing);
      try {
        for (const capability of Object.keys(rule.entries)) {
          assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability }), /按需公共参考不存在/);
        }
      } finally {
        // 每次只移除一个参考，防止前一个缺失掩盖后一个清单的错误。
        writeFileSync(missing, bytes);
      }
    }
  });
}
