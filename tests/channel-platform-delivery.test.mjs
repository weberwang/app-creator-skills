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
/** 选择规范必须在已安装项目独立可用，不能只在维护仓库中可见。 */
const SDK_SELECTION = 'app-release/references/channel-sdk-selection.md';
const PLATFORMS = ['crazygames', 'wechat-minigame', 'douyin-minigame', 'taptap', 'google-play', 'app-store']
  .map((name) => `app-release/references/channel-platforms/${name}.md`);
/** TapTap 运行时与材料规范必须随单栈分发，链接不能只在维护仓库成立。 */
const TAPTAP_REFERENCES = ['taptap-runtime-integration.md', 'taptap-materials-policy.md', 'channel-sdk-reuse.md', 'taptap-ad-integration.md', 'taptap-ads-usage.md']
  .map((name) => `app-release/references/${name}`);
/** 广告适配只面向真实客户端栈，不向服务端或设备端声明可运行能力。 */
const TAPTAP_AD_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'flutter', 'expo']);
/** 发布和广告入口共同发现同一份按引擎接入规范。 */
const TAPTAP_AD = 'app-release/references/taptap-ad-integration.md';
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
    for (const file of [COMMON, SDK_SELECTION, ...PLATFORMS, ...TAPTAP_REFERENCES]) {
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
      const selection = loaded.resources.find((entry) => entry.path === SDK_SELECTION && !entry.fragment);
      assert.equal(selection?.available, true, `${stack} 无法发现 SDK 多选确认规范`);
      assert.equal(selection.kind, 'public-reference');
      assert.ok(!loaded.documents.some((entry) => entry.path === SDK_SELECTION), '未进入 SDK 选择时不自动展开完整规范');
      // 管理端资料跨栈分发不代表这些栈都具备 TapTap 客户端发布能力。
      const taptap = loaded.resources.find((entry) => entry.path === 'app-release/references/channel-platforms/taptap.md');
      assert.equal(taptap?.available, true, `${stack} 的 TapTap CLI 专项不可发现`);
      assert.equal(taptap.kind, 'public-reference');
      if (!['esp32', 'roblox'].includes(stack)) {
        for (const path of TAPTAP_REFERENCES.slice(0, 2)) {
          assert.ok(loaded.resources.some((entry) => entry.path === path && entry.available), `${stack} 无法按需发现 ${path}`);
          assert.ok(!loaded.documents.some((entry) => entry.path === path), '未选 TapTap 时不自动展开运行时手册');
        }
      }
      const tapAd = loaded.resources.find((entry) => entry.path === TAPTAP_AD);
      assert.equal(Boolean(tapAd?.available), TAPTAP_AD_STACKS.has(stack), `${stack} 的 TapTap 广告路由必须符合客户端范围`);
      assert.ok(!loaded.documents.some((entry) => entry.path === TAPTAP_AD), '未选择 TapTap 广告时只发现路径，不自动展开正文');
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
        assert.ok(loaded.resources.some((entry) => entry.path === TAPTAP_AD && entry.available), '广告入口必须能按需发现本引擎的 TapTap 路线');
        assert.ok(!loaded.documents.some((entry) => entry.path === TAPTAP_AD), 'MAX 原生模式不得自动加载 TapTap 广告规范');
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

    if (TAPTAP_AD_STACKS.has(stack)) {
      // 已声明的广告资料缺失时必须暴露安装损坏，不能借用维护仓库兜底。
      const adCurrent = join(root, TAPTAP_AD);
      const adHidden = `${adCurrent}.temporarily-unavailable`;
      renameSync(adCurrent, adHidden);
      try {
        assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability: 'app-release', sourceSkill: routes[0].sourceSkill }), /不存在/);
      } finally { renameSync(adHidden, adCurrent); }
    }
  });
}
