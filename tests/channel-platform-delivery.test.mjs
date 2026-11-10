/** 验证渠道规范在单栈安装中的真实交付、链接与原生模式边界。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection, markdownProse } from '../skills/app-skill-runtime/native-contracts.mjs';

const COMMON = 'app-release/references/channel-platform-integration.md';
const PLATFORMS = ['crazygames', 'wechat-minigame', 'douyin-minigame', 'google-play', 'app-store']
  .map((name) => `app-release/references/channel-platforms/${name}.md`);
const MAX = 'app-domain-toolkit/references/reference-ad-applovin-max-contract.md';
const MAX_STACKS = new Set(['cocos', 'phaser', 'threejs']);
const ENTRIES = [
  'app-creator-workflow/SKILL.md', 'app-product-planning/SKILL.md',
  'app-architecture/SKILL.md', 'app-project-foundation/SKILL.md',
  'app-quality-review/SKILL.md', 'app-release/SKILL.md',
];

/** 检查已安装资料中的相对链接和目标章节，绝不借用源仓库补齐缺失文件。 */
function checkLocalLinks(root, source) {
  const file = join(root, source);
  const prose = markdownProse(readFileSync(file, 'utf8'));
  for (const [, href] of prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|mailto:|#)/i.test(href)) continue;
    const [relativePath, fragment = ''] = href.split('#');
    const target = resolve(dirname(file), decodeURIComponent(relativePath));
    assert.ok(existsSync(target), `${source} 引用了不存在的 ${href}`);
    if (fragment) assert.ok(extractMarkdownSection(readFileSync(target, 'utf8'), decodeURIComponent(fragment)).trim(), `${source} 的锚点无效：${href}`);
  }
}

/** 核对入口能直接找到渠道总规范，避免资料已安装却无法按任务发现。 */
function checkEntry(root, source) {
  const file = join(root, source);
  const links = [...readFileSync(file, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
  assert.ok(links.some(([, href]) => resolve(dirname(file), href.split('#')[0]) === resolve(root, COMMON)), `${source} 没有连接渠道总规范`);
}

for (const stack of STACKS) {
  /** 单栈安装、真实读取器和专项资料必须共同成立，才算分发接线可用。 */
  test(`${stack} 渠道专项安装及读取`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `channel-platform-${stack}-`));
    t.after(() => {
      // 检查真实父目录和独占前缀后才递归清理，避免触碰其他项目。
      assert.equal(dirname(realpathSync(project)), realpathSync(tmpdir()));
      assert.ok(basename(realpathSync(project)).startsWith(`channel-platform-${stack}-`));
      rmSync(project, { recursive: true, force: true });
    });
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const source = join(SOURCE_ROOT, 'skills');
    for (const file of [COMMON, ...PLATFORMS]) {
      assert.deepEqual(readFileSync(join(root, file)), readFileSync(join(source, file)), `${stack} 未分发完整资料：${file}`);
      checkLocalLinks(root, file);
    }
    for (const entry of ENTRIES) if (existsSync(join(root, entry))) checkEntry(root, entry);

    const manifest = JSON.parse(readFileSync(join(root, 'app-release/native-adapters.json'), 'utf8'));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    const routes = manifest.adapters[stack];
    assert.ok(routes?.length, `${stack} 缺少发布原生模式`);
    for (const route of routes) {
      const loaded = loadNativeMode({ skillsRoot: root, stack, capability: 'app-release', sourceSkill: route.sourceSkill });
      const reference = loaded.resources.find((entry) => entry.path === COMMON && !entry.fragment);
      assert.equal(reference?.available, true, `${stack} 的渠道参考不可发现`);
      assert.equal(reference.kind, 'public-reference');
      assert.ok(!loaded.documents.some((entry) => PLATFORMS.includes(entry.path)), '未选渠道不应自动展开所有平台正文');
      assert.ok(!loaded.documents.some((entry) => /^app-stack-/.test(entry.path) && !entry.path.startsWith(`app-stack-${stack}/`)), '单栈模式不应加载其他栈原生手册');
      if (!['cocos', 'phaser'].includes(stack)) assert.ok(!loaded.documents.some((entry) => entry.path === COMMON), '非直接引用的总规范应按需读取');
    }

    if (MAX_STACKS.has(stack)) {
      const ad = JSON.parse(readFileSync(join(root, 'app-ad-integration/native-adapters.json'), 'utf8'));
      for (const route of ad.adapters[stack]) {
        const loaded = loadNativeMode({ skillsRoot: root, stack, capability: 'app-ad-integration', sourceSkill: route.sourceSkill });
        assert.match(loaded.when, /MAX/);
        assert.match(loaded.when, /Android\/iOS/);
        assert.match(loaded.when, /不使用此模式/);
        assert.ok(loaded.resources.some((entry) => entry.path === COMMON && entry.available), '渠道广告规则必须可按需找到');
        assert.ok(loaded.resources.some((entry) => entry.path === MAX && entry.available), '保留实际采用 MAX 时的原有合同');
        assert.ok(extractMarkdownSection(readFileSync(join(root, MAX), 'utf8'), '非个性化广告请求').trim());
      }
    }

    // 缺少已声明的资料必须被原生读取器拒绝，而非静默回退到维护仓库。
    const current = join(root, COMMON);
    const hidden = `${current}.temporarily-unavailable`;
    renameSync(current, hidden);
    try {
      assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability: 'app-release', sourceSkill: routes[0].sourceSkill }), /不存在/);
    } finally { renameSync(hidden, current); }
  });
}
