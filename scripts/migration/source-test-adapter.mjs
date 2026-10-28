import { posix } from 'node:path';
import { CAPABILITY_GROUPS } from '../capability-map.mjs';

/** 保留帧来源无 Sharp 静态导入测试，同时在隔离目录复制实际依赖闭包。 */
export function adaptImageFrameSourceTest(text) {
  if (typeof text !== 'string') throw new TypeError('图片帧来源测试必须是文本');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const oldImport = 'import { dirname, join } from "node:path";';
  const oldBlock = [
    '  const isolatedModule = join(isolatedDirectory, "image-frame-source.mjs");',
    '  await copyFile(new URL("./image-frame-source.mjs", import.meta.url), isolatedModule);',
  ].join(newline);
  for (const [needle, label] of [[oldImport, '路径导入'], [oldBlock, '隔离导入测试']]) {
    const position = text.indexOf(needle);
    if (position < 0 || text.indexOf(needle, position + needle.length) >= 0) throw new Error(`图片帧来源测试的${label}必须恰好出现一次`);
  }
  const newBlock = [
    '  // 在隔离目录保留适配器对公共工厂的相对路径，但不复制 Sharp 或安装第三方依赖。',
    '  const adapterUrl = new URL("./image-frame-source.mjs", import.meta.url);',
    '  const adapterText = await readFile(adapterUrl, "utf8");',
    '  const factoryImport = adapterText.match(/^import \\{ createImageFrameSourceTools \\} from "((?:\\.\\.\\/)+app-domain-toolkit\\/scripts\\/animation\\/image-frame-source\\.mjs)";$/m);',
    '  assert.ok(factoryImport, "帧来源适配器必须引用公共工厂");',
    '  const specifier = factoryImport[1];',
    '  const depth = specifier.split("/").filter((part) => part === "..").length;',
    '  const isolatedModule = join(isolatedDirectory, ...Array(depth).fill("scope"), "image-frame-source.mjs");',
    '  const isolatedFactory = resolve(dirname(isolatedModule), specifier);',
    '  await mkdir(dirname(isolatedModule), { recursive: true });',
    '  await mkdir(dirname(isolatedFactory), { recursive: true });',
    '  await copyFile(adapterUrl, isolatedModule);',
    '  await copyFile(new URL(specifier, adapterUrl), isolatedFactory);',
  ].join(newline);
  return text.replace(oldImport, 'import { dirname, join, resolve } from "node:path";').replace(oldBlock, newBlock);
}

/** 将 Unity 的安装冒烟测试改为显式选栈的公共安装器调用。 */
export function adaptUnityInstallerTest(text) {
  return text.replace('[INSTALLER_PATH, projectRoot],', '[INSTALLER_PATH, projectRoot, "--stack", "unity"],');
}

/** 将旧总控命令示例映射到公共 CLI 文档路径。 */
export function routeControlCommands(text) {
  return text
    .replace(/(?:skills\/)?(?:unity-game-workflow-control|cocos-game-workflow-control|phaser4-game-workflow-control|threejs-game-workflow-control)\/scripts\/workflow-control\.mjs/g, '.agents/skills/app-workflow-control/scripts/workflow-control.mjs')
    .replace(/\bnode\s+scripts\/workflow-control\.mjs\b/g, 'node .agents/skills/app-workflow-control/scripts/workflow-control.mjs');
}

/** 旧领域测试中的全局 CLI 状态用例由公共控制器回归替代，领域用例继续执行。 */
export function skipLegacyControllerCliTests(text) {
  return text
    .replace("test('CLI：普通集成不需批准，破坏性集成的 stale pending 不写 Ledger'", "test.skip('旧全局控制器普通集成与 stale pending（由 tests/control/controller.test.mjs 覆盖）'")
    .replace("test('CLI：RETURN 必须声明必要分类并持久化最小影响范围'", "test.skip('旧全局控制器 RETURN 状态（由 tests/control/controller.test.mjs 覆盖）'");
}

/** 将 Unity 3D 回归中的目录路径与 SKILL 元数据标识分开断言。 */
export function adaptUnity3dSkillTest(text) {
  const entries = Object.fromEntries(CAPABILITY_GROUPS.flatMap((group) => (group.members.unity ?? []).map((name) => [name, group.name])));
  return text
    .replace(/\r\n/g, '\n')
    .replace('import { resolve } from "node:path";', 'import { basename, resolve } from "node:path";\nimport { extractNativeSection } from "../../../../../scripts/capability-map.mjs";')
    .replace('const MODELING_DIR =', '/** 读取对应模式的独立贡献，不能用同手册其他章节满足专业断言。 */\nfunction readNativeMode(sourceSkill) { return extractNativeSection(readText(resolve(ROOT, "skills/app-stack-unity/references/native-contracts.md")), sourceSkill); }\n\nconst MODELING_DIR =')
    .replace(/"skills\/(unity-game-3d-[a-z]+)":/g, '"$1":')
    .replace('const skillDir = resolve(ROOT, skillName);', 'const skillDir = resolve(ROOT, "skills", skillName);')
    .replaceAll('"SKILL.md"', '"ADAPTER.md"')
    .replaceAll('readText(resolve(skillDir, "ADAPTER.md"))', 'readNativeMode(basename(skillDir))')
    .replaceAll('readText(resolve(MODELING_DIR, "ADAPTER.md"))', 'readNativeMode("unity-game-3d-modeling")')
    .replaceAll('readText(resolve(TEXTURING_DIR, "ADAPTER.md"))', 'readNativeMode("unity-game-3d-texturing")')
    .replace('const frontmatter = parseFrontmatter(skillText);\n    assert.deepEqual(Object.keys(frontmatter).sort(), ["description", "name"]);\n    assert.equal(frontmatter.name, skillName);', 'assert.ok(skillText.includes(`id="mode-${skillName}"`), "专业模式的稳定章节身份必须存在");')
    .replace('const agent = YAML.parse(readText(resolve(skillDir, "agents/openai.yaml")));', `const capabilityName = ${JSON.stringify(entries)}[skillName];\n    const agent = YAML.parse(readText(resolve(ROOT, "skills", capabilityName, "agents/openai.yaml")));`)
    .replace('new RegExp(`\\\\$${skillName}`)', () => 'new RegExp(`\\\\$${capabilityName}`)');
}

/** 将 Spine 分发断言改为读取真实安装目录清单，避免把 CLI 实现细节当作安装内容。 */
export function adaptUnitySpineReskinTest(text) {
  const old = 'assert.match(readFileSync(resolve(ROOT, "scripts/install-project-skills.mjs"), "utf8"), /"skills/unity-game-spine-reskin"/);';
  const replacement = 'assert.ok(JSON.parse(readFileSync(resolve(ROOT, "migration/catalog.json"), "utf8")).stacks.unity.nativeAdapters.some((adapter) => adapter.sourceSkill === "unity-game-spine-reskin"));';
  return text
    .replace(/\r\n/g, '\n')
    .replace('import { readFileSync, readdirSync } from "node:fs";', 'import { existsSync, readFileSync } from "node:fs";')
    .replace('import test from "node:test";', 'import test from "node:test";\nimport { extractNativeSection } from "../../../../../scripts/capability-map.mjs";')
    .replaceAll('"SKILL.md"', '"ADAPTER.md"')
    .replace('const SKILL_TEXT = readFileSync(resolve(SKILL_ROOT, "ADAPTER.md"), "utf8");', 'const SKILL_TEXT = extractNativeSection(readFileSync(resolve(ROOT, "skills/app-stack-unity/references/native-contracts.md"), "utf8"), "unity-game-spine-reskin");')
    .replaceAll('readFileSync(resolve(ROOT, "skills/unity-game-visual-assets/ADAPTER.md"), "utf8")', 'extractNativeSection(readFileSync(resolve(ROOT, "skills/app-stack-unity/references/native-contracts.md"), "utf8"), "unity-game-visual-assets")')
    .replace('assert.deepEqual(frontmatterKeys(SKILL_TEXT), ["name", "description"]);', 'assert.ok(SKILL_TEXT.includes(\'id="mode-unity-game-spine-reskin"\'));')
    .replace('assert.deepEqual(readdirSync(SKILL_ROOT).sort(), ["ADAPTER.md", "agents"]);', 'assert.equal(existsSync(SKILL_ROOT), false);')
    .replace('assert.equal(readdirSync(SKILL_ROOT, { recursive: true }).filter((path) => String(path).endsWith(".py")).length, 0);', 'assert.ok(existsSync(resolve(ROOT, "skills/app-spine-reskin/SKILL.md")));')
    // 提示入口应检查实际分发的公共技能；原始元数据归档由来源字节测试单独核对。
    .replace('resolve(SKILL_ROOT, "agents/openai.yaml")', 'resolve(ROOT, "skills/app-spine-reskin/agents/openai.yaml")')
    .replace(/assert\.match\(openai, \/default_prompt:[^\n]*\);/, 'assert.match(openai, /default_prompt: "使用 [$]app-spine-reskin[， ]/);')
    .replace('assert.ok(packageJson.files.includes("skills/unity-game-spine-reskin"));', 'assert.ok(packageJson.files.includes("skills"));')
    .replace('assert.match(readFileSync(resolve(ROOT, "README.md"), "utf8"), /\\$unity-game-spine-reskin/);', 'assert.match(readFileSync(resolve(ROOT, "skills/app-stack-unity/references/specialist-skills.md"), "utf8"), /unity-game-spine-reskin/);')
    .replace(old, replacement);
}

/** 精确重定位 Unity 源测试与宿主夹具，避免误改实际工程的 tests 路径。 */
export function adaptUnitySourceTest(text, sourcePath) {
  if (sourcePath === 'tests/node/3d-skills.test.mjs') return { text: adaptUnity3dSkillTest(text), transform: 'adapt-3d-skill-path-and-metadata-assertions' };
  if (sourcePath === 'tests/node/spine-reskin-skill.test.mjs') return { text: adaptUnitySpineReskinTest(text), transform: 'adapt-spine-install-catalog-assertion' };
  const hostManifest = 'migration/source-tests/unity/tests/UnityHost/Packages/manifest.json';
  if (sourcePath === 'tests/node/toolkit-structure.test.mjs') {
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    const replacements = [
      ['const corpus = listFiles(resolve(PACKAGE_ROOT, "Editor/PipelineCommands")).filter((item) => item.endsWith(".cs")).map(readText).join("\\n");', 'const sources = listFiles(resolve(PACKAGE_ROOT, "Editor/PipelineCommands")).filter((item) => item.endsWith(".cs")).map(readText);\n  const corpus = sources.join("\\n");'],
      ['"uwt_validate_2d_rigging", "uwt_validate_project"', '"uwt_validate_2d_rigging", "uwt_validate_font_locales", "uwt_validate_project"'],
      ['assert.equal((corpus.match(/\\[CliArg\\(\\s*"job_path"/g) ?? []).length, expectedNames.length);', 'assert.equal((corpus.match(/\\[CliArg\\(\\s*"job_path"/g) ?? []).length, expectedNames.length - 1);'],
      ['assert.equal((corpus.match(/public static PipelineCommandResult Execute\\(/g) ?? []).length, expectedNames.length);', `assert.equal((corpus.match(/public static PipelineCommandResult Execute\\(/g) ?? []).length, expectedNames.length);
  // 字体语言命令使用三个独立参数；其他命令仍各自要求 job_path。
  for (const source of sources) {
    const commands = [...source.matchAll(/\\[CliCommand\\(\\s*"([^"]+)"/g)];
    if (!commands.length) continue;
    assert.equal(commands.length, 1, "一个命令实现文件只能声明一个 Pipeline 命令");
    assert.match(source, /\\[CliCommand\\([\\s\\S]*?MainThreadRequired\\s*=\\s*true\\s*\\)\\]/);
    const args = [...source.matchAll(/\\[CliArg\\(\\s*"([^"]+)"[^\\]]*?Required\\s*=\\s*true\\s*\\)\\]/g)].map((match) => match[1]).sort();
    if (commands[0][1] === "uwt_validate_font_locales") {
      assert.deepEqual(args, ["evidence_path", "language_path", "plan_path"]);
    } else {
      assert.deepEqual(args, ["job_path"], commands[0][1]);
    }
  }`],
    ];
    let adapted = text;
    for (const [oldText, newText] of replacements) {
      // 源测试发生变化时要求重新审计，不能静默遗漏命令或参数约束。
      if (adapted.split(oldText).length !== 2) throw new Error('Unity Toolkit 源测试命令断言缺失或重复');
      adapted = adapted.replace(oldText, newText.replaceAll('\n', newline));
    }
    return {
      text: adapted.replace('resolve(ROOT, "tests/UnityHost/Packages/manifest.json")', `resolve(ROOT, "${hostManifest}")`)
        .replace('assert.match(dependencies["com.project.unity-workflow-toolkit"], /^file:/);', 'assert.match(dependencies["com.project.unity-workflow-toolkit"], /^file:/);\n  assert.equal(resolve(UNITY_HOST_MANIFEST, "..", dependencies["com.project.unity-workflow-toolkit"].slice(5)), PACKAGE_ROOT, "测试宿主必须引用本仓库迁移后的真实 Toolkit");'),
      transform: 'rebase-unity-host-fixture-test',
    };
  }
  if (sourcePath === 'tests/UnityHost/Packages/manifest.json') {
    const manifest = JSON.parse(text);
    // UPM 本地 file 依赖相对 Packages 目录，不能继续指向迁移前的根技能目录。
    const target = 'skills/unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit';
    manifest.dependencies['com.project.unity-workflow-toolkit'] = `file:${posix.relative(posix.dirname(hostManifest), target)}`;
    return { text: `${JSON.stringify(manifest, null, 2)}\n`, transform: 'rebase-unity-host-local-toolkit-dependency' };
  }
  return { text, transform: null };
}
