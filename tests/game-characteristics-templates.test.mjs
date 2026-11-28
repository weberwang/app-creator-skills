/** 验证五栈实际生成的项目文档接入游戏特点、V1 与 QA 回归。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

const STACKS = {
  unity: 'unity-development-workflow',
  cocos: 'cocos-game-orchestrator',
  phaser: 'phaser4-game-orchestrator',
  threejs: 'app-stack-threejs',
  roblox: 'app-stack-roblox',
};

/** 校验从生成的项目文档出发能定位规范中的真实章节。 */
function verifyReference(project, docPath, fragment, reference = 'game-characteristics.md') {
  const document = readFileSync(docPath, 'utf8');
  const references = [...document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
  const match = references.find(([, href]) => href.endsWith(`/${reference}#${fragment}`));
  assert.ok(match, `${docPath} 缺少 ${reference}#${fragment} 引用`);
  const [path, anchor] = match[1].split('#');
  const target = resolve(dirname(docPath), path);
  assert.ok(!relative(project, target).startsWith('..'), '规范应来自当前安装项目');
  assert.ok(extractMarkdownSection(readFileSync(target, 'utf8'), anchor).trim());
}

for (const [stack, skill] of Object.entries(STACKS)) {
  /** 安装后调用该栈真实初始化器，分别验证核心模板、可选 QA 与防覆盖。 */
  test(`${stack} 初始化文档保留游戏专项映射及原选择边界`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `game-docs-${stack}-`));
    t.after(() => {
      // 仅清理本用例在系统临时目录创建的独立项目。
      assert.equal(dirname(resolve(project)), resolve(tmpdir()));
      assert.ok(basename(project).startsWith(`game-docs-${stack}-`));
      rmSync(project, { recursive: true, force: true });
    });
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const common = await import(pathToFileURL(join(root, 'app-domain-toolkit/templates/game-characteristics-templates.mjs')).href);
    const docsRoot = join(project, 'docs');
    let createCore;
    let createQa;
    let checkUnknown;
    if (stack === 'unity' || stack === 'roblox') {
      const script = stack === 'roblox' ? 'initialize-project-docs.mjs' : 'workflow-files.mjs';
      const initializer = await import(pathToFileURL(join(root, skill, 'scripts', script)).href);
      createCore = () => initializer.initializeDocs({ projectRoot: project, projectId: 'game-docs-test' });
      createQa = () => initializer.initializeDocs({ projectRoot: project, projectId: 'game-docs-test', include: 'qa' });
      checkUnknown = () => initializer.initializeDocs({ projectRoot: project, projectId: 'game-docs-test', include: 'unknown' });
    } else {
      const initializer = await import(pathToFileURL(join(root, skill, 'scripts/initialize_project_docs.mjs')).href);
      createCore = () => initializer.initializeDocuments(project, initializer.selectTemplates(), false);
      createQa = () => initializer.initializeDocuments(project, initializer.selectTemplates(['qa']), false);
      checkUnknown = () => initializer.parseIncludeList('unknown');
    }
    createCore();
    assert.ok(existsSync(join(docsRoot, 'GDD.md')));
    assert.ok(existsSync(join(docsRoot, 'TDD.md')));
    assert.equal(existsSync(join(docsRoot, 'qa-plan.md')), false);
    assert.throws(checkUnknown, /不支持的交付物/);
    const before = readFileSync(join(docsRoot, 'GDD.md'), 'utf8');
    assert.throws(createCore, /拒绝覆盖已有文档/);
    assert.equal(readFileSync(join(docsRoot, 'GDD.md'), 'utf8'), before);
    assert.deepEqual(createQa().map((path) => basename(path)), ['qa-plan.md'], '仅选择 QA 时不得生成其他模板');
    assert.throws(createQa, /拒绝覆盖已有文档/);

    if (['cocos', 'phaser', 'threejs'].includes(stack)) {
      // 验证已安装初始化器的真实输出，防止旧阶段门通过生成文档重新出现。
      const initializer = await import(pathToFileURL(join(root, skill, 'scripts/initialize_project_docs.mjs')).href);
      initializer.initializeDocuments(project, initializer.selectTemplates(['platform', 'assets']), false);
      const tdd = readFileSync(join(docsRoot, 'TDD.md'), 'utf8');
      const visual = readFileSync(join(docsRoot, 'visual-design.md'), 'utf8');
      const platform = readFileSync(join(docsRoot, 'platform-matrix.md'), 'utf8');
      const licenses = readFileSync(join(docsRoot, 'asset-license-register.md'), 'utf8');
      assert.doesNotMatch([tdd, visual, licenses].join('\n'), /\bV0\b/);
      assert.match(tdd, /阶段 5 在 V1 启动时按需集中做一次 grilling/);
      assert.match(tdd, /V2–V5 的新增取舍按现有变更或人工确认处理/);
      assert.match(tdd, /阶段 4 回读固定工程入口、显示宿主、配置与接口/);
      assert.match(tdd, /编译、打包及运行检查由后续适用工作承担/);
      assert.doesNotMatch(tdd, /仅有实质用户取舍时停止受影响实现并进入 grilling/);
      assert.doesNotMatch(tdd, /foundation-only 仅由 SHARED\/MODULE 组成，且必须绑定完成候选人工选择/);
      assert.match(visual, /V1 明确模块规则、状态、依赖及验收条件/);
      assert.match(platform, /阶段 4 只回读基础结构、配置与接口/);
      assert.doesNotMatch(platform, /共享基础只做代表性.*(?:启动|构建)/);
    }

    for (const [name, fragment, contentFragments] of [
      ['GDD.md', 'identify', ['levels']],
      ['TDD.md', 'v1', ['levels', 'tools', 'playtest']],
      ['qa-plan.md', 'qa', ['playtest']],
    ]) {
      const path = join(docsRoot, name);
      // 静态 Markdown 可能保留 Windows 换行，统一换行后严格比较模板内容。
      const actual = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
      assert.ok(actual.endsWith(common.GAME_CHARACTERISTICS_TEMPLATE_SECTIONS[name]), `${stack}/${name} 公共表格不一致`);
      verifyReference(project, path, fragment);
      if (name !== 'GDD.md') verifyReference(project, path, 'regression');
      for (const contentFragment of contentFragments) verifyReference(project, path, contentFragment, 'game-content-playtesting.md');
      // 从实际生成文档可发现对应分流、替换交接及单次审查，不能仅检查源模板存在。
      for (const fragment of ({ 'GDD.md': ['implementation-routes'], 'TDD.md': ['production-handoff', 'tooling-boundary'], 'qa-plan.md': ['review'] })[name]) {
        verifyReference(project, path, fragment, 'game-design-exploration.md');
      }
      if (stack === 'unity') {
        // 源模板相对路径与生成文档路径不同，两者都必须可解析到已安装规范。
        const source = join(root, skill, 'templates/project-docs', name);
        verifyReference(project, source, fragment);
        if (name !== 'GDD.md') verifyReference(project, source, 'regression');
        for (const contentFragment of contentFragments) verifyReference(project, source, contentFragment, 'game-content-playtesting.md');
      }
    }
  });
}
