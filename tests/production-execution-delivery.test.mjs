/** 验证第一批生产执行规范能随单栈安装交付，并由实际入口按需发现。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection, markdownProse } from '../skills/app-skill-runtime/native-contracts.mjs';

/** 以各能力的唯一参考为交付对象，不用标题关键词代替安装和读取验证。 */
const RULES = [
  { capability: 'app-release', path: 'app-domain-toolkit/references/tool-capability-verification.md', entry: 'app-creator-workflow/SKILL.md' },
  { capability: 'app-quality-review', path: 'app-quality-review/references/runtime-validation.md' },
  { capability: 'app-asset-workflow', path: 'app-asset-workflow/references/asset-provenance.md' },
  { capability: 'app-release', path: 'app-release/references/release-readiness.md', section: '实际构建输出与候选绑定' },
];

/** 在安装副本内核对真实引用，避免源仓库补全安装遗漏。 */
function checkReferences(root, relativePath, section = '') {
  const source = join(root, relativePath);
  const text = extractMarkdownSection(readFileSync(source, 'utf8'), section);
  const links = [...markdownProse(text).matchAll(/\]\(([^)]+)\)/g)];
  for (const [, href] of links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    const [file, section = ''] = href.split('#');
    const target = file ? resolve(dirname(source), decodeURIComponent(file)) : source;
    assert.ok(existsSync(target), `${relativePath} 的引用未分发：${href}`);
    if (section && target.endsWith('.md')) extractMarkdownSection(readFileSync(target, 'utf8'), decodeURIComponent(section));
  }
  return links;
}

/** 从安装副本运行共享 CLI，确保依赖闭包可用且结果来自实际进程。 */
function runInstalledTool(root, name, args) {
  const tool = join(root, 'app-domain-toolkit/scripts/verification', name);
  const result = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return { text: result.stdout, result: JSON.parse(result.stdout) };
}

/** 使用独占项目的真实文件核对候选复核及声明引用，不模拟引擎或视觉通过。 */
function checkInstalledTools(root, project, stack) {
  for (const directory of ['src', 'assets', 'build', 'evidence']) mkdirSync(join(project, directory));
  writeFileSync(join(project, 'src/item.ts'), 'export const item = "fixture";\n');
  writeFileSync(join(project, 'assets/item.bin'), 'fixture asset bytes');
  writeFileSync(join(project, 'build/index.html'), '<main>installation fixture</main>');
  const snapshot = runInstalledTool(root, 'candidate-files.mjs', [
    'snapshot', '--repo', project, '--artifact', 'build', '--input', 'src', '--input', 'assets', '--require', 'index.html',
  ]);
  assert.equal(snapshot.result.artifact.path, 'build');
  writeFileSync(join(project, 'evidence/candidate.json'), snapshot.text);
  const checked = runInstalledTool(root, 'candidate-files.mjs', ['check', '--repo', project, '--snapshot', 'evidence/candidate.json']);
  assert.equal(checked.result.ok, true);
  if (stack === 'nodejs') return;
  const task = { assetId: 'item', route: 'bitmap', consumer: 'fixture component', sourcePath: 'assets/item.bin', runtimePath: 'assets/item.bin' };
  writeFileSync(join(project, 'evidence/item-task.json'), JSON.stringify(task));
  const asset = runInstalledTool(root, 'asset-files.mjs', ['--repo', project, '--task', 'evidence/item-task.json', '--consumer', 'item=src/item.ts']);
  assert.equal(asset.result.status, 'PASS');
  assert.deepEqual(JSON.parse(readFileSync(join(project, 'evidence/item-task.json'), 'utf8')), task);
}

for (const stack of STACKS) {
  /** 同一安装同时覆盖任务入口、原生按需路由及未提供参考的失败边界。 */
  test(`${stack} 生产执行规范的交付与读取`, async (t) => {
    const prefix = `production-execution-${stack}-`;
    const project = mkdtempSync(join(tmpdir(), prefix));
    t.after(() => {
      // 只清理当前测试创建且真实位于系统临时根下的独占目录。
      const actual = realpathSync(project);
      assert.equal(dirname(actual), realpathSync(tmpdir()));
      assert.ok(basename(actual).startsWith(prefix));
      rmSync(actual, { recursive: true, force: true });
    });
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}/profile.json`), 'utf8'));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    const installed = new Set(profile.capabilitySkills);

    for (const rule of RULES) {
      const relativePath = rule.path;
      if (!installed.has(rule.capability)) {
        assert.equal(rule.capability, 'app-asset-workflow', `${stack} 缺少必要执行能力`);
        assert.equal(stack, 'nodejs', '只有无视觉服务栈可以不安装素材能力');
        const manifest = JSON.parse(readFileSync(join(root, rule.capability, 'native-adapters.json'), 'utf8'));
        assert.equal(manifest.adapters[stack], undefined, '服务栈不能虚构视觉原生模式');
        continue;
      }
      assert.deepEqual(readFileSync(join(root, relativePath)), readFileSync(join(SOURCE_ROOT, 'skills', relativePath)));
      checkReferences(root, relativePath, rule.section);
      if (rule.section) extractMarkdownSection(readFileSync(join(root, relativePath), 'utf8'), rule.section);
      const entry = rule.entry ?? `${rule.capability}/SKILL.md`;
      // 公共入口也含其他平台的条件链接，仅核对本次实际分发的专项入口。
      const entryLinks = [...markdownProse(readFileSync(join(root, entry), 'utf8')).matchAll(/\]\(([^)]+)\)/g)];
      assert.ok(entryLinks.some(([, href]) => resolve(dirname(join(root, entry)), href.split('#')[0]) === resolve(root, relativePath)), `${entry} 未连接自己的执行规范`);

      const manifest = JSON.parse(readFileSync(join(root, rule.capability, 'native-adapters.json'), 'utf8'));
      const routes = manifest.adapters[stack] ?? [];
      // 无原生模式时继续采用该栈公共入口，不能伪造一个原生 route。
      for (const route of routes) {
        const loaded = loadNativeMode({ skillsRoot: root, stack, capability: rule.capability, sourceSkill: route.sourceSkill });
        assert.ok(loaded.resources.some((resource) => resource.path === relativePath && !resource.fragment && resource.available && resource.kind === 'public-reference'), `${stack}/${rule.capability} 无法发现参考`);
        assert.ok(!loaded.documents.some((document) => document.path.startsWith('app-stack-') && !document.path.startsWith(`app-stack-${stack}/`)), '不能加载其他栈的原生手册');
        if (!rule.section) assert.ok(!loaded.documents.some((document) => document.path === relativePath), '新专项应按需读取');
      }

      if (routes.length && !rule.section) {
        const target = join(root, relativePath);
        const hidden = `${target}.test-missing`;
        renameSync(target, hidden);
        try {
          assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability: rule.capability, sourceSkill: routes[0].sourceSkill }), /不存在/);
        } finally { renameSync(hidden, target); }
      }
    }
    checkInstalledTools(root, project, stack);
  });
}
