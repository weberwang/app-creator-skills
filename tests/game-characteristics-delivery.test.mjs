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
    'app-asset-workflow': 'production-handoff',
    // QA 的设计后审查须能按游戏栈选读同一规范，并验证真实审查锚点。
    'app-quality-review': 'review',
  } },
];

/** 核对安装后入口的实际链接与目标章节，避免规范虽分发却无法从任务进入。 */
function checkLink(root, source, section = '', target = RULE) {
  const file = join(root, source);
  const links = [...readFileSync(file, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
  assert.ok(links.some(([, href]) => {
    const [path, fragment = ''] = href.split('#');
    // 仅含锚点的链接指向当前文件，而不是当前文件所在目录。
    const linkedFile = path ? resolve(dirname(file), path) : file;
    return resolve(linkedFile) === resolve(root, target) && fragment === section;
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
      ['app-creator-workflow/SKILL.md', 'implementation-routes'],
      ['app-creator-workflow/references/workflow.md', 'explore'],
      // V0 摘要与实施入口须接入同一人工确认约定，不能只保留方案展示入口。
      ['app-creator-workflow/references/workflow.md', 'sequence'],
      ['app-creator-workflow/references/professional-execution.md', 'explore'],
      ['app-creator-workflow/references/handoffs.md', 'roles'],
      ['app-creator-workflow/references/readable-functional-prototype.md', 'handoff'],
      ['app-asset-workflow/references/multi-image-scene-design.md', 'explore'],
      ['app-asset-workflow/references/multi-image-scene-design.md', 'implementation-routes'],
      ['app-asset-workflow/SKILL.md', 'production-handoff'],
      // 从实际规范入口可追踪到机器合同限制，不能只验证新锚点存在。
      [EXPLORATION, 'tooling-boundary'],
    ]) checkLink(root, source, section, EXPLORATION);
    const exploration = readFileSync(join(root, EXPLORATION), 'utf8');
    const routes = extractMarkdownSection(exploration, 'implementation-routes');
    const routeRows = [...routes.matchAll(/^\| (3D 世界场景|2D 世界场景|UI[^|]*) \|(.+)$/gm)];
    assert.equal(routeRows.length, 3, '3D、2D 与 UI 均须有独立的可安装分流');
    // 只检查各路线的关键区别，其他工作流约束继续由原有章节和合同承载。
    assert.match(routeRows[0][2], /V1.*搭建或复用有效白模.*按风险选择运行验证.*V2.*确认/);
    assert.match(routeRows[1][2], /平面布局.*正式工程.*不制作白模/);
    assert.match(routeRows[2][2], /不增加世界场景白模步骤/);
    const handoff = extractMarkdownSection(exploration, 'production-handoff');
    // 分开核对正式方向、首件验证和整批验收，首件只约束高风险批次。
    assert.match(handoff, /V1 确认模块方案.*V2 基于全局方向确认本批空间和状态设计/);
    const firstArticle = handoff.match(/^\| 首件验证 \|(.+)$/m)?.[1] ?? '';
    assert.match(firstArticle, /高风险批次.*目标镜头.*通过后再补齐依赖批次/);
    assert.match(handoff, /三维低风险批次正常生产和导入/);
    const batch = handoff.match(/^\| 分批制作与导入 \|(.+)$/m)?.[1] ?? '';
    assert.match(batch, /V4 完成时[\s\S]*本批模型[\s\S]*证据/);
    const tooling = extractMarkdownSection(exploration, 'tooling-boundary');
    assert.match(tooling, /world-3d 无图场景合同.*仅游戏世界 SCENE 可选择.*人工空间／方向确认.*替代图片目标/);
    assert.match(tooling, /缺少适用表达[\s\S]*受阻阶段/);
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
