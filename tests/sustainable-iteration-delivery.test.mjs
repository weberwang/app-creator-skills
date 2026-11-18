/** 验证持续迭代与样本试接规则随九栈安装交付；不将规范检查冒充实际应用或视觉验收。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { CORE_SKILLS } from '../packages/installer/capability-map.mjs';
import { readSkillCatalog } from '../packages/installer/skill-catalog.mjs';
import { extractMarkdownSection, markdownProse } from '../skills/app-skill-runtime/native-contracts.mjs';

/** 本轮规则的正式交付范围，检查真实安装内容而不借用源仓库补齐引用。 */
const DOCUMENTS = [
  'app-creator-workflow/SKILL.md',
  'app-creator-workflow/references/workflow.md',
  'app-creator-workflow/references/professional-conventions.md',
  'app-creator-workflow/references/verification.md',
  'app-creator-workflow/references/handoffs.md',
  'app-creator-workflow/references/output-files.md',
  'app-project-foundation/SKILL.md',
  'app-architecture/SKILL.md',
  'app-quality-review/SKILL.md',
  'app-asset-workflow/SKILL.md',
  'app-asset-workflow/references/art-review.md',
  'app-asset-workflow/references/interface-intent.md',
  'app-asset-workflow/references/multi-image-scene-design.md',
  'app-domain-toolkit/references/incremental-production.md',
  'app-workflow-control/references/implementation-execution.md',
];

/** 需要通过真实原生读取器验证的执行入口，未声明的模式不凭测试补造。 */
const CAPABILITIES = ['app-creator-workflow', 'app-project-foundation', 'app-architecture', 'app-quality-review', 'app-asset-workflow'];

/** 读取安装目录内的正式规则。 */
function read(root, path) {
  return readFileSync(join(root, path), 'utf8');
}

/** 仅核对本轮公共交付之间的链接，避免把其他栈的条件参考误当成本栈必需资料。 */
function checkChangedReferences(root, path) {
  const source = join(root, path);
  const links = [...markdownProse(read(root, path)).matchAll(/\]\(([^)]+)\)/g)];
  let checked = 0;
  for (const [, href] of links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    const [file, fragment = ''] = href.split('#');
    const target = file ? resolve(dirname(source), decodeURIComponent(file)) : source;
    const local = relative(root, target).split(sep).join('/');
    if (!DOCUMENTS.includes(local)) continue;
    assert.ok(existsSync(target), `${path} 的持续迭代引用未交付：${href}`);
    extractMarkdownSection(readFileSync(target, 'utf8'), decodeURIComponent(fragment));
    checked += 1;
  }
  assert.ok(checked > 0, `${path} 未连接公共持续迭代或样本试接规则`);
}

/** 核对正式阶段顺序、试接边界与规则入口；这些断言只证明说明合同，不证明真实项目效果。 */
function checkIterationRules(root) {
  const conventions = read(root, 'app-creator-workflow/references/professional-conventions.md');
  for (const fragment of ['incremental-change-impact', 'architecture-module-contracts', 'quality-evidence-and-retests', 'current-project-knowledge']) {
    const section = extractMarkdownSection(conventions, fragment);
    assert.ok(section.length > 100, `${fragment} 不能只有空标题`);
  }
  const impact = extractMarkdownSection(conventions, 'incremental-change-impact');
  assert.match(impact, /消费者[\s\S]*状态所有权[\s\S]*资源生命周期/);
  assert.match(impact, /不新建分析报告或完整矩阵/);
  const regression = extractMarkdownSection(conventions, 'quality-evidence-and-retests');
  assert.match(regression, /永久回归测试/);
  assert.match(regression, /已有有效覆盖直接复用/);
  assert.match(regression, /公开行为[\s\S]*私有实现/);
  assert.match(regression, /难以自动化时保留可复现步骤及限制/);
  const knowledge = extractMarkdownSection(conventions, 'current-project-knowledge');
  assert.match(knowledge, /安装、启动、构建和测试入口/);
  assert.match(knowledge, /历史冻结日志和证据不覆盖/);
  const workflow = read(root, 'app-creator-workflow/references/workflow.md');
  const slice = extractMarkdownSection(workflow, '功能切片与跨对象依赖');
  assert.match(slice, /正式入口[\s\S]*状态所有者[\s\S]*测试入口/);
  assert.match(slice, /不在 V5 另写一套/);
  const stages = extractMarkdownSection(workflow, '对象闭环');
  assert.deepEqual([...stages.matchAll(/^\| (V\d) \|/gm)].map((match) => match[1]), ['V0', 'V1', 'V2', 'V3', 'V4', 'V5']);
  const assets = read(root, 'app-asset-workflow/SKILL.md');
  const production = extractMarkdownSection(assets, '生产闭环');
  const assetRoles = production.match(/^\d+\. \*\*明确资产角色\*\*：(.+)$/m)?.[1];
  assert.ok(assetRoles, '生产闭环缺少资产角色与交接说明');
  // 游戏 UI 与图片目标保留原合同；3D 世界模型交接不等同于逐物件切图。
  assert.match(assetRoles, /图片视觉目标.*\[多张场景设计稿\]\(references\/multi-image-scene-design\.md\).*拆解／布局确认/);
  assert.match(assetRoles, /3D 世界模型按已确认场景.*生产交接.*替换规格/);
  assert.match(assetRoles, /游戏 UI 保持原有设计、拆解与布局规则/);
  assert.match(assetRoles, /非游戏 App 从 V2 已选 Figma 节点提取/);
  assert.match(assetRoles, /不再机械绘图或重复确认/);
  const gameStages = extractMarkdownSection(read(root, 'app-asset-workflow/references/multi-image-scene-design.md'), '拆解、实现与验收');
  assert.match(gameStages, /V2 目标、V3 拆解和布局确认、V4 资源验收与 V5 正式场景验证/);
  const sampleStep = production.match(/^\d+\. \*\*代表样本与真实组件试接\*\*：(.+)$/m)?.[1];
  assert.ok(sampleStep, '生产闭环缺少代表样本试接步骤');
  assert.match(sampleStep, /V3 交接完成后，在 V4 前段/);
  const sample = extractMarkdownSection(assets, '代表性接入与分批协作');
  assert.match(sample, /真实原生组件、父子关系和代表性数据/);
  assert.match(sample, /不新增阶段、控制器字段或逐素材审批/);
  assert.match(sample, /3D 世界在本批整体白模场景与正式视觉方向经人工确认.*试接代表模块/);
  assert.match(sample, /游戏图片路线及 UI 沿用原 V3 拆解与布局确认/);
  assert.match(sample, /非游戏 App 以已选 Figma 稿和必要交接为依据.*不重复画图和批准/);
  // 未决结果只阻断依赖它的扩展；技术检查不能自动形成用户批准或视觉通过。
  assert.match(sample, /必要人工确认待定时，暂停依赖该结果的批量扩展，继续不受影响的工作/);
  assert.match(assets, /真实用户消息只记录来源，不能由代理伪造批准/);
  assert.match(sample, /样本及单批通过不替代 V5/);
  assert.match(sample, /单写者/);
  assert.match(sample, /用户人工视觉验收/);
  extractMarkdownSection(workflow, '持续迭代与可接手收尾');
}

for (const stack of STACKS) {
  /** 每个栈在独占项目中安装并读取，既检查规则闭包，也保留原生平台与授权边界。 */
  test(`${stack} 持续迭代与样本试接规则独立交付`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `sustainable-iteration-${stack}-`));
    // 只回收本用例创建的临时安装副本，不运行用户工程或清理其证据。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const payload = readSkillCatalog(SOURCE_ROOT).stacks[stack];
    const installedRoots = new Set([...CORE_SKILLS, ...payload.capabilitySkills, ...payload.resourceDirectories]);
    for (const path of DOCUMENTS) {
      // 部分游戏栈由原生架构承担基础工程，不为覆盖新增规则而扩充其安装能力。
      if (!installedRoots.has(path.split('/')[0])) {
        assert.equal(existsSync(join(root, path)), false, `${stack} 不应额外安装 ${path}`);
        continue;
      }
      assert.equal(read(root, path), read(join(SOURCE_ROOT, 'skills'), path), `${stack}/${path} 安装内容失真`);
      checkChangedReferences(root, path);
    }
    checkIterationRules(root);
    const profile = JSON.parse(read(root, `app-stack-${stack}/profile.json`));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    for (const capability of CAPABILITIES) {
      if (!profile.capabilitySkills.includes(capability)) {
        assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability }), /当前技术栈未声明该能力/);
        continue;
      }
      const manifest = JSON.parse(read(root, `${capability}/native-adapters.json`));
      for (const route of manifest.adapters[stack] ?? []) {
        const loaded = loadNativeMode({ skillsRoot: root, stack, capability, sourceSkill: route.sourceSkill });
        assert.equal(loaded.capabilityPath, `${capability}/SKILL.md`);
        assert.ok(loaded.documents.some((document) => document.kind === 'native' && document.path === `app-stack-${stack}/references/native-contracts.md`));
        assert.ok(!loaded.documents.some((document) => document.path.startsWith('app-stack-') && !document.path.startsWith(`app-stack-${stack}/`)));
      }
    }
    if (stack === 'nodejs') {
      assert.match(read(root, 'app-creator-workflow/SKILL.md'), /不要求视觉基线、V0–V5/);
      assert.equal(JSON.parse(read(root, 'app-asset-workflow/native-adapters.json')).adapters.nodejs, undefined, '无界面服务不能新增视觉模式');
    }
    if (stack === 'flutter') {
      // 破坏安装副本的真实锚点，确认断链不会被源仓库或相邻章节静默补齐。
      for (const [path, marker, replacement, entry] of [
        ['app-domain-toolkit/references/incremental-production.md', '<a id="rolling-delivery-plan"></a>', '', 'app-creator-workflow/SKILL.md'],
        ['app-creator-workflow/references/professional-conventions.md', '<a id="incremental-change-impact"></a>', '', 'app-creator-workflow/SKILL.md'],
        ['app-asset-workflow/SKILL.md', '## 代表性接入与分批协作', '## 已移除样本章节', 'app-creator-workflow/references/workflow.md'],
      ]) {
        const original = read(root, path);
        assert.ok(original.includes(marker));
        try {
          writeFileSync(join(root, path), original.replace(marker, replacement));
          assert.throws(() => checkChangedReferences(root, entry), /锚点不存在/);
        } finally {
          writeFileSync(join(root, path), original);
        }
      }
    }
  });
}
