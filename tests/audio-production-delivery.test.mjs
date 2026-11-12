/** 验证音效能力在单栈安装后的读取、真实生产与非游戏边界。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

const REFERENCE = 'app-audio/references/sfx-production.md';
const GAME_STACKS = new Set(['unity', 'cocos', 'phaser', 'threejs', 'roblox']);
const CAPABILITIES = ['app-audio', 'app-product-planning', 'app-feedback', 'app-quality-review'];

/** App 栈复用公共参考及现有能力，不安装或加载游戏音效专项。 */
const APP_REFERENCE = 'app-domain-toolkit/references/app-audio.md';
const APP_STACKS = new Set(['flutter', 'expo', 'esp32']);
const APP_CAPABILITIES = ['app-creator-workflow', 'app-product-planning', 'app-feedback', 'app-quality-review'];

/** 从安装后的文档解析链接，核对真实目标与章节，而非匹配预期文字。 */
function checkReference(root, source, fragment, reference = REFERENCE) {
  const document = join(root, source);
  const links = [...readFileSync(document, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
  assert.ok(links.some(([, href]) => {
    const [path, section = ''] = href.split('#');
    return resolve(dirname(document), path) === resolve(root, reference) && section === fragment;
  }), `${source} 缺少音效规范入口 ${fragment}`);
  assert.ok(extractMarkdownSection(readFileSync(join(root, reference), 'utf8'), fragment).trim());
}

/** 在安装项目中执行实际 CLI，避免开发目录补足遗漏模块。 */
function runTool(project, args) {
  const result = spawnSync(process.execPath, [join(project, '.agents/skills/app-audio/scripts/sfx.mjs'), ...args], {
    cwd: project, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

for (const stack of STACKS) {
  /** 单栈安装既要可读取规范，也要在该安装中实际产出可回读音频。 */
  test(`${stack} 音效生产交付与读取边界`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), 'audio-production-'));
    t.after(() => {
      // 仅清理由当前用例在系统临时目录创建的独占项目。
      assert.equal(dirname(resolve(project)), resolve(tmpdir()));
      assert.ok(basename(project).startsWith('audio-production-'));
      rmSync(project, { recursive: true, force: true });
    });
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}/profile.json`), 'utf8'));
    const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
    const isGame = GAME_STACKS.has(stack);

    for (const capability of CAPABILITIES) {
      if (!profile.capabilitySkills.includes(capability)) {
        assert.equal(isGame, false, `${stack} 未声明所需能力 ${capability}`);
        assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability }), /当前技术栈未声明该能力/);
        continue;
      }
      const manifest = JSON.parse(readFileSync(join(root, capability, 'native-adapters.json'), 'utf8'));
      for (const route of manifest.adapters[stack]) {
        const result = loadNativeMode({ skillsRoot: root, stack, capability, sourceSkill: route.sourceSkill });
        const resources = result.resources.filter((entry) => entry.path === REFERENCE && !entry.fragment);
        assert.equal(resources.length, isGame ? 1 : 0, `${stack}/${capability} 音效适用范围错误`);
        assert.ok(!result.documents.some((entry) => entry.path === REFERENCE), '音效制作仅按当前任务展开');
        if (isGame) assert.equal(resources[0].available, true);
        assert.ok(!result.documents.some((entry) => /^app-stack-/.test(entry.path) && !entry.path.startsWith(`app-stack-${stack}/`)));
      }
    }
    if (!isGame) {
      assert.equal(existsSync(join(root, 'app-audio')), false);
      // 应用栈只通过已有原生模式发现可选参考，服务端不得自动进入音频流程。
      for (const capability of APP_CAPABILITIES.filter((name) => profile.capabilitySkills.includes(name))) {
        const manifest = JSON.parse(readFileSync(join(root, capability, 'native-adapters.json'), 'utf8'));
        for (const route of manifest.adapters[stack]) {
          const result = loadNativeMode({ skillsRoot: root, stack, capability, sourceSkill: route.sourceSkill });
          const references = result.resources.filter((entry) => entry.path === APP_REFERENCE && !entry.fragment);
          assert.equal(references.length, APP_STACKS.has(stack) ? 1 : 0, `${stack}/${capability} App 音频范围错误`);
          assert.ok(!result.documents.some((entry) => entry.path === APP_REFERENCE), 'App 音频参考仅按需读取');
          if (APP_STACKS.has(stack)) assert.equal(references[0].available, true);
          assert.ok(!result.documents.some((entry) => /^app-stack-/.test(entry.path) && !entry.path.startsWith(`app-stack-${stack}/`)));
        }
      }
      if (APP_STACKS.has(stack)) {
        assert.equal(readFileSync(join(root, APP_REFERENCE), 'utf8'), readFileSync(join(SOURCE_ROOT, 'skills', APP_REFERENCE), 'utf8'));
        for (const source of [
          'app-creator-workflow/SKILL.md', 'app-product-planning/SKILL.md', 'app-feedback/SKILL.md',
          'app-quality-review/SKILL.md', 'app-creator-workflow/references/domain-production.md',
          'app-creator-workflow/references/handoffs.md',
        ]) checkReference(root, source, '', APP_REFERENCE);
      }
      return;
    }
    assert.equal(readFileSync(join(root, REFERENCE), 'utf8'), readFileSync(join(SOURCE_ROOT, 'skills', REFERENCE), 'utf8'));
    for (const source of [
      'app-audio/SKILL.md', 'app-product-planning/SKILL.md', 'app-feedback/SKILL.md',
      'app-creator-workflow/SKILL.md', 'app-creator-workflow/references/handoffs.md',
      'app-creator-workflow/references/domain-production.md', 'app-domain-toolkit/references/audio.md',
    ]) checkReference(root, source, 'design');
    checkReference(root, 'app-quality-review/SKILL.md', 'audition');
    for (const section of ['production', 'audition']) {
      assert.ok(extractMarkdownSection(readFileSync(join(root, REFERENCE), 'utf8'), section).trim());
    }

    const wav = join(project, 'victory.wav');
    const recipe = join(project, 'victory-recipe.json');
    runTool(project, ['render', '--preset', 'victory', '--seed', '42', '--variant', '1', '--out', wav, '--recipe-out', recipe]);
    const bytes = readFileSync(wav);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length);
    assert.ok(bytes.length > 44);
    runTool(project, ['check', '--file', wav]);
    const reproduced = join(project, 'reproduced.wav');
    runTool(project, ['render', '--recipe', recipe, '--out', reproduced]);
    assert.deepEqual(readFileSync(reproduced), bytes, '安装后的配方必须可独立复现');

    if (stack === 'unity') {
      const { initializeDocs } = await import(pathToFileURL(join(root, 'unity-development-workflow/scripts/workflow-files.mjs')).href);
      const written = initializeDocs({ projectRoot: project, projectId: 'audio-production-test', include: 'audio' });
      assert.deepEqual(written.map((file) => basename(file)), ['audio-plan.md']);
      const document = readFileSync(written[0], 'utf8');
      assert.throws(() => initializeDocs({ projectRoot: project, projectId: 'audio-production-test', include: 'audio' }), /拒绝覆盖已有文档/);
      assert.equal(readFileSync(written[0], 'utf8'), document);
      for (const section of ['design', 'production', 'audition']) {
        checkReference(root, 'unity-development-workflow/templates/project-docs/audio-plan.md', section);
        // 项目文档与制作源处于不同目录，转换后的链接应仍指向同一份安装规范。
        checkReference(root, '../../docs/audio-plan.md', section);
      }
    }

    const referencePath = join(root, REFERENCE);
    const content = readFileSync(referencePath);
    rmSync(referencePath);
    try {
      for (const capability of CAPABILITIES) {
        assert.throws(() => loadNativeMode({ skillsRoot: root, stack, capability }), /按需公共参考不存在|所选模式引用的资料不存在/);
      }
    } finally {
      writeFileSync(referencePath, content);
    }
  });
}
