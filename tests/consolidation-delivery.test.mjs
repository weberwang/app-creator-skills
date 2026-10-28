/** 独立检查公共参考、原生资料和五栈单独安装的最终交付。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { installSkills, STACKS } from '../scripts/install-project-skills.mjs';
import { SPECIALIST_REFERENCE_FAMILIES } from '../scripts/migration/specialist-reference-specs.mjs';
import { ORCHESTRATION_REFERENCE_FAMILIES } from '../scripts/migration/orchestration-reference-specs.mjs';
import { DOMAIN_REFERENCE_FAMILIES } from '../scripts/migration/domain-reference-specs.mjs';
import { isReferenceRedirect } from '../scripts/migration/reference-redirects.mjs';
import { readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { extractMarkdownSection, extractNativeSection, markdownProse } from '../skills/app-skill-runtime/native-contracts.mjs';
import { loadNativeMode } from '../skills/app-skill-runtime/read-native-mode.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const ROUTES = Object.freeze({
  unity: { capability: 'app-feedback', sourceSkill: 'unity-game-juice' },
  cocos: { capability: 'app-ad-integration', sourceSkill: 'cocos-game-ad-integration' },
  phaser: { capability: 'app-ad-integration', sourceSkill: 'phaser4-game-ad-integration' },
  threejs: { capability: 'app-ad-integration', sourceSkill: 'threejs-game-ad-integration' },
  flutter: { capability: 'app-feedback', sourceSkill: 'flutter-feedback' },
});

/** 统一换行和首尾空白后计算规则摘要，不改变规则正文。 */
function ruleHash(text) {
  return createHash('sha256').update(text.trim().replaceAll('\r\n', '\n')).digest('hex');
}

/** 围栏里的标题只是示例内容，不能作为可跳转的真实章节。 */
function headingAnchors(text) {
  let fence = null;
  const anchors = new Set();
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (marker && !fence) { fence = marker[1]; continue; }
    if (marker && fence && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) { fence = null; continue; }
    if (fence) continue;
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (heading) anchors.add(heading.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-'));
  }
  return anchors;
}

/** 列举目录内容，检查旧入口元数据是否意外进入安装包。 */
function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

/** 从实际原生参考找到公共文档链接，并检查其章节在安装后的目标中可达。 */
function checkLinks(root, source, implementation, stack) {
  const file = resolve(root, source.adapterDestination);
  let native = readFileSync(file, 'utf8');
  const sourceSkill = source.sourcePath.match(/(?:^|\/)([^/]+)\/SKILL\.md$/)?.[1];
  if (/app-stack-[^/]+\/references\/native-contracts\.md$/.test(source.adapterDestination) && sourceSkill) {
    native = extractNativeSection(native, sourceSkill);
  }
  const target = resolve(root, implementation);
  const links = [...native.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
  const matching = links.filter((href) => {
    const [path] = href.split('#');
    return path && resolve(dirname(file), path) === target;
  });
  assert.ok(matching.length, `${stack}/${source.sourcePath} 缺少公共目标 ${implementation}`);
  const anchors = headingAnchors(readFileSync(target, 'utf8'));
  for (const href of matching) {
    const fragment = href.split('#')[1];
    if (fragment) assert.ok(anchors.has(decodeURIComponent(fragment)), `${stack}/${source.sourcePath} 的公共章节不可达：${href}`);
  }
}

/** 执行安装后的本地 CLI，所有目标都位于本测试独占的临时目录。 */
function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${script}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

/** 公共入口只引用实际安装可达的文档和真实章节，不能因为按需使用就留下断链。 */
function checkCoreLinks(skillsRoot, capability) {
  const file = join(skillsRoot, capability, 'SKILL.md');
  for (const match of markdownProse(readFileSync(file, 'utf8')).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].replace(/^<|>$/g, '');
    const [target, fragment] = href.split('#');
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(target) || /[<$]|\{\{/.test(target)) continue;
    const path = resolve(dirname(file), decodeURIComponent(target.split('?')[0]));
    assert.ok(existsSync(path), `${capability} 的按需引用未安装：${href}`);
    if (fragment && path.endsWith('.md')) assert.doesNotThrow(() => extractMarkdownSection(readFileSync(path, 'utf8'), decodeURIComponent(fragment)), `${capability} 的章节不可达：${href}`);
  }
}

test('专业参考由唯一公共真源交付，来源规则和实际章节可追溯', (t) => {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'migration/catalog.json'), 'utf8'));
  const ledger = JSON.parse(readFileSync(join(ROOT, 'migration/files.json'), 'utf8'));
  const capabilityById = new Map(catalog.sharedCapabilities.map((item) => [item.id, item]));
  const rows = new Map(ledger.files.map((row) => [`${row.stack}:${row.sourcePath}`, row]));
  const ids = [...SPECIALIST_REFERENCE_FAMILIES.map((family) => family.id),
    ...ORCHESTRATION_REFERENCE_FAMILIES.map((family) => family.id), ...DOMAIN_REFERENCE_FAMILIES.map((family) => family.id),
    'git-minimal-submission', 'art-quality-principles', 'ui-game-copy'];
  const haveSources = STACKS.every((stack) => existsSync(join(SOURCE_ROOT, `${stack}-skills`)));
  if (!haveSources) t.diagnostic('未提供完整源仓库；本次只验证交付账本、目标和引用，不验证源文件原始字符区间。');
  for (const id of ids) {
    const capability = capabilityById.get(id);
    assert.ok(capability && capability.kind === 'workflow', `${id} 缺少公共正文`);
    const publicText = readFileSync(join(ROOT, capability.implementation), 'utf8');
    const publicBlocks = new Set([...readWorkflowBlocks(publicText).map((block) => ruleHash(block.original)),
      ...publicText.split(/\r?\n\s*\r?\n/).map(ruleHash)]);
    for (const source of capability.sources) {
      const row = rows.get(`${source.stack}:${source.sourcePath}`);
      assert.ok(row && row.destination === source.adapterDestination, `${id} 来源没有绑定原生资料`);
      assert.ok(row.sharedReferences.includes(capability.implementation));
      assert.equal(row.sourceSha256, source.sourceSha256);
      if (row.referenceRedirect) {
        assert.ok(isReferenceRedirect(row, capability.implementation), `${id} 导航合并来源或目标不匹配`);
        assert.equal(row.destinationSha256, createHash('sha256').update(publicText).digest('hex'));
      } else checkLinks(ROOT, source, capability.implementation, source.stack);
      const sourcePath = join(SOURCE_ROOT, `${source.stack}-skills`, source.sourcePath);
      if (haveSources) assert.ok(existsSync(sourcePath), `${source.stack} 实际来源缺失：${source.sourcePath}`);
      const original = haveSources ? readFileSync(sourcePath, 'utf8') : null;
      assert.ok(source.sections.length > 0, `${id} 没有可追溯的完整来源块`);
      for (const section of source.sections) {
        assert.ok(publicBlocks.has(section.canonicalHash), `${id}/${section.heading} 公共规则不是完整正文`);
        if (original && section.sourceRange) assert.equal(ruleHash(original.slice(section.sourceRange.start, section.sourceRange.end)), section.sourceHash);
      }
    }
  }
  for (const family of [...SPECIALIST_REFERENCE_FAMILIES, ...DOMAIN_REFERENCE_FAMILIES]) {
    const capability = capabilityById.get(family.id);
    const manifest = JSON.parse(readFileSync(join(ROOT, 'skills', family.capability, 'native-adapters.json'), 'utf8'));
    const matches = manifest.sharedWorkflows.filter((entry) => entry.id === family.id);
    assert.equal(matches.length, 1, `${family.id} 未唯一登记到 ${family.capability}`);
    assert.equal(matches[0].onDemand, true);
    assert.deepEqual(matches[0].stacks, capability.stacks);
    assert.equal(resolve(ROOT, 'skills', family.capability, matches[0].path), resolve(ROOT, capability.implementation));
  }
  for (const family of ORCHESTRATION_REFERENCE_FAMILIES) {
    const entry = readFileSync(join(ROOT, 'skills', family.capability, 'SKILL.md'), 'utf8');
    assert.ok(entry.includes(`${family.id}.md`), `${family.capability} 缺少按需入口：${family.id}`);
  }
  for (const name of ['app-creator-workflow', 'app-release', 'app-artifact-cleanup']) {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'skills', name, 'native-adapters.json'), 'utf8'));
    const target = manifest.sharedWorkflows.find((item) => item.id === 'git-minimal-submission');
    assert.ok(target?.onDemand, `${name} 缺少按需 Git 公共规则`);
    assert.deepEqual(target.stacks, capabilityById.get('git-minimal-submission').stacks);
  }
});

for (const stack of STACKS) {
  test(`${stack} 单栈安装保持资源闭包、正确路由和旧入口清理`, (t) => {
    const project = mkdtempSync(join(tmpdir(), `consolidation-delivery-${stack}-`));
    // 只回收本用例独占创建的临时项目，不接触调用者目录。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const skillsRoot = join(project, '.agents/skills');
    for (const capability of ['app-creator-workflow', 'grilling']) checkCoreLinks(skillsRoot, capability);
    for (const other of STACKS.filter((name) => name !== stack)) assert.ok(!existsSync(join(skillsRoot, `app-stack-${other}`)));
    for (const file of files(skillsRoot).filter((item) => item.endsWith(`${sep}agents${sep}openai.yaml`))) {
      assert.ok(existsSync(join(dirname(dirname(file)), 'SKILL.md')), `旧入口元数据不应随安装分发：${relative(skillsRoot, file)}`);
    }
    const ledger = JSON.parse(readFileSync(join(ROOT, 'migration/files.json'), 'utf8'));
    for (const row of ledger.files.filter((item) => item.stack === stack && (['copied', 'adapted'].includes(item.disposition) || item.referenceRedirect)
      && item.destination?.startsWith('skills/'))) {
      const installed = join(skillsRoot, ...row.destination.slice('skills/'.length).split('/'));
      assert.ok(existsSync(installed), `${stack} 安装遗漏源资源：${row.destination}`);
      const actual = createHash('sha256').update(readFileSync(installed)).digest('hex');
      assert.equal(actual, row.destinationSha256, `${stack} 安装资源内容与账本不符：${row.destination}`);
    }
    const route = ROUTES[stack];
    const mode = loadNativeMode({ skillsRoot, stack, ...route });
    assert.equal(mode.documents.filter((document) => document.kind === 'native').length, 1);
    for (const document of mode.documents) {
      const documentStack = /^app-stack-([^/]+)\//.exec(document.path)?.[1];
      if (documentStack) assert.equal(documentStack, stack);
    }
    const manifest = JSON.parse(readFileSync(join(skillsRoot, route.capability, 'native-adapters.json'), 'utf8'));
    for (const item of manifest.sharedWorkflows.filter((entry) => entry.onDemand && entry.stacks.includes(stack))) {
      const path = resolve(skillsRoot, route.capability, item.path);
      assert.ok(existsSync(path), `${stack}/${item.id} 的按需参考未安装`);
      assert.ok(mode.resources.some((resource) => resolve(skillsRoot, resource.path) === path && resource.available));
      assert.ok(!mode.documents.some((document) => resolve(skillsRoot, document.path) === path), `${item.id} 不应被无差别自动加载`);
    }
    if (['cocos', 'phaser', 'threejs'].includes(stack)) {
      const prefix = stack === 'phaser' ? 'phaser4' : stack;
      const layout = readFileSync(join(skillsRoot, `${prefix}-game-ui-layout/references/layout-contract.md`), 'utf8');
      const versions = stack === 'cocos' ? ['schema 1.2.0', 'schema 2.0.0'] : [stack === 'phaser' ? 'schema 1.2.0' : 'schema 1.3.0'];
      for (const version of versions) assert.ok(layout.includes(version), `${stack} 布局合同版本缺失：${version}`);
      const ad = readFileSync(join(skillsRoot, `${prefix}-game-ad-integration/references/applovin-max-contract.md`), 'utf8');
      if (stack === 'cocos') assert.ok(ad.includes('Cocos 原生插件与 JSB 适配层'));
      if (stack === 'phaser') assert.ok(ad.includes('Capacitor 使用其 Cordova 兼容层'));
      const gates = readFileSync(join(skillsRoot, 'app-domain-toolkit/references/reference-orchestration-quality-gates.md'), 'utf8');
      assert.doesNotMatch(gates, /G0-G3 是领域 `stageId`/, `${stack} 不能把游戏里程碑误当作控制器 stageId`);
      const removed = ['quality-gates', 'worktree-integration'];
      if (stack !== 'cocos') removed.push('local-service-validation');
      if (stack !== 'threejs') removed.push('grilling-integration');
      for (const name of removed) assert.ok(!existsSync(join(skillsRoot, `${prefix}-game-orchestrator/references/${name}.md`)), `${stack}/${name} 纯导航应指向公共正文`);
      if (stack === 'cocos') assert.ok(existsSync(join(skillsRoot, `${prefix}-game-orchestrator/references/local-service-validation.md`)), 'Cocos 预览服务补充必须保留');
      if (stack === 'threejs') assert.ok(existsSync(join(skillsRoot, `${prefix}-game-orchestrator/references/grilling-integration.md`)), 'Three.js 确认差异必须保留');
      const funnel = readFileSync(join(skillsRoot, `${prefix}-game-orchestrator/references/review-funnel.md`), 'utf8');
      assert.doesNotMatch(funnel, /调用控制面的 `repair`、`revalidate` 或 `return`/, `${stack} 不能调用已不存在的控制命令`);
      const grilling = readFileSync(join(skillsRoot, `${stack}-domain-contracts/references/technical-grilling.md`), 'utf8');
      assert.doesNotMatch(grilling, /\.workflow-control\/approvals\/ledger\.json/, `${stack} 拷问不能引入旧审批账本`);
      if (stack === 'threejs') {
        const guide = readFileSync(join(skillsRoot, 'threejs-game-juice/references/design-guide.md'), 'utf8');
        assert.match(guide, /THREE\.AudioListener/);
        assert.doesNotMatch(guide, /Sound Manager 属于 Game|threejsjs|docs\.threejs\.io/);
      }
    }
    if (stack === 'unity') {
      assert.ok(!existsSync(join(skillsRoot, 'unity-game-visual-assets')), '旧 Unity 图片工具目录应收敛');
      assert.match(runNode(join(skillsRoot, 'app-asset-workflow/scripts/remove-background-local.mjs'), ['--help']), /(?:Usage|用法|--input)/i);
      const copy = readFileSync(join(skillsRoot, 'unity-development-workflow/references/game-copy.md'), 'utf8');
      for (const detail of ['uGUI/TextMeshPro', 'UI Toolkit', 'String Tables', '`zh-CN`', '英语 `en`', '其他语言', '无障碍', '`4.2s`', '当前余额']) assert.ok(copy.includes(detail), `Unity 文案差异缺失：${detail}`);
      const art = readFileSync(join(skillsRoot, 'unity-development-workflow/references/art-quality-contract.md'), 'utf8');
      for (const detail of ['gameplayReadability', 'viewingComfort', 'artCompletion', 'NOT_RUN']) assert.ok(art.includes(detail));
      const git = readFileSync(join(skillsRoot, 'unity-domain-contracts/references/minimal-git.md'), 'utf8');
      assert.match(git, /只有当前任务明确包含 Git 提交时/);
      assert.doesNotMatch(git, /阶段验收达到 `PASS` 后，由主代理自动创建本地阶段提交/);
      const unityFeedback = mode.documents.find((document) => document.kind === 'native').content;
      for (const detail of ['Time.timeScale', '对象池', '恢复被临时修改的视觉属性']) assert.ok(unityFeedback.includes(detail));
      assert.ok(mode.resources.some((resource) => resource.path === 'app-feedback/references/interaction-feedback.md' && resource.available));
    }
    if (stack === 'flutter') {
      const oldScopes = ['flutter-code-sketch', 'flutter-hifi-mockup', 'flutter-implementation-plan', 'flutter-product-spec', 'flutter-quality-review', 'flutter-release-readiness', 'flutter-subagent-delivery', 'flutter-tech-design', 'flutter-ux-ui-quality'];
      for (const name of oldScopes) assert.ok(!existsSync(join(skillsRoot, name, 'package.json')), `${name} 没有 CommonJS 脚本却生成了作用域`);
      const runtimeModules = join(skillsRoot, 'app-skill-runtime/node_modules');
      mkdirSync(runtimeModules, { recursive: true });
      cpSync(join(ROOT, 'node_modules/yaml'), join(runtimeModules, 'yaml'), { recursive: true });
      assert.match(runNode(join(skillsRoot, 'adaptive-layout-implementation/scripts/run-fixtures.js')), /\[PASS\]/);
      assert.ok(existsSync(join(skillsRoot, 'flutter-project-init/assets/flutter-dev/SKILL.md')));
      // 嵌套模板的界面元数据是可选文件；实际来源有时才要求安装保留。
      const nestedMetadata = ledger.files.find((row) => row.stack === 'flutter'
        && row.sourcePath === 'flutter-project-init/assets/flutter-dev/agents/openai.yaml');
      assert.equal(existsSync(join(skillsRoot, 'flutter-project-init/assets/flutter-dev/agents/openai.yaml')),
        Boolean(nestedMetadata?.destination));
    }
  });
}
