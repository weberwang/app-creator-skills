import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { extractNativeSection } from "../../../../../scripts/capability-map.mjs";
import test from "node:test";
import YAML from "../../../../../skills/app-skill-runtime/yaml.mjs";

const ROOT = resolve(import.meta.dirname, "../../../../..");
/** 读取对应模式的独立贡献，不能用同手册其他章节满足专业断言。 */
function readNativeMode(sourceSkill) { return extractNativeSection(readText(resolve(ROOT, "skills/app-stack-unity/references/native-contracts.md")), sourceSkill); }

const MODELING_DIR = resolve(ROOT, "skills/unity-game-3d-modeling");
const TEXTURING_DIR = resolve(ROOT, "skills/unity-game-3d-texturing");

/** 以 UTF-8 读取单个 3D Skill 文档，保证断言使用稳定文本。 */
function readText(path) {
  return readFileSync(path, "utf8");
}

/** 解析 Skill 顶部 YAML frontmatter，供入口元数据测试复用。 */
function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  assert.ok(match, "3D SKILL.md 必须以完整 YAML frontmatter 开头");
  return YAML.parse(match[1]);
}

test("四个 3D Skill 具备有效入口和代理界面", () => {
  const expectations = {
    "unity-game-3d-modeling": "references/mcp-modeling-workflow.md",
    "unity-game-3d-texturing": "references/pbr-texture-workflow.md",
    "unity-game-3d-rigging": "references/rigging-workflow.md",
    "unity-game-3d-animation": "references/animation-workflow.md",
  };
  for (const [skillName, reference] of Object.entries(expectations)) {
    const skillDir = resolve(ROOT, "skills", skillName);
    const skillText = readNativeMode(basename(skillDir));
    assert.ok(skillText.includes(`id="mode-${skillName}"`), "专业模式的稳定章节身份必须存在");
    assert.match(skillText, new RegExp(reference.replaceAll("/", "\\/")));
    assert.ok(readText(resolve(skillDir, reference)));
    const capabilityName = {"unity-game-production":"app-product-planning","unity-game-architecture":"app-architecture","unity-gameplay-development":"app-gameplay-development","unity-game-audio":"app-audio","unity-game-balance":"app-game-balance","unity-game-juice":"app-feedback","unity-game-release":"app-release","unity-game-qa-performance":"app-quality-review","unity-game-2d-animation-ta":"app-animation","unity-game-3d-animation":"app-animation","unity-game-2d-rigging":"app-character-rigging","unity-game-3d-rigging":"app-character-rigging","unity-game-3d-modeling":"app-3d-modeling","unity-game-3d-texturing":"app-3d-texturing","unity-game-spine-reskin":"app-spine-reskin","unity-game-visual-assets":"app-asset-workflow"}[skillName];
    const agent = YAML.parse(readText(resolve(ROOT, "skills", capabilityName, "agents/openai.yaml")));
    assert.ok(agent.interface.display_name);
    assert.match(agent.interface.default_prompt, new RegExp(`\\$${capabilityName}`));
  }
});

test("建模 Skill 定义几何交付和验证", () => {
  const text = readNativeMode("unity-game-3d-modeling");
  for (const term of ["Visual Bible", "DCC MCP", "拓扑", "UV", "LOD", "Collider", "ModelImporter", "实际源文件位置", "实际 UV 位置与报告", "BLOCKED", "$app-3d-texturing", "$app-quality-review"]) assert.match(text, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `建模 Skill 缺少职责或证据约束：${term}`);
  assert.match(text, /不负责 PBR 纹理/);
  assert.match(text, /不自批/);
});

test("贴图 Skill 定义 PBR 交付和验证", () => {
  const text = readNativeMode("unity-game-3d-texturing");
  for (const term of ["Visual Bible", "DCC MCP", "实际模型/UV 来源", "实际输出位置", "PBR", "BaseColor", "Normal", "Metallic", "AO", "Smoothness", "sRGB", "URP", "TextureImporter", "Material", "BLOCKED", "$app-3d-modeling"]) assert.match(text, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `贴图 Skill 缺少职责或证据约束：${term}`);
  assert.match(text, /不静默修改/);
  assert.match(text, /独立/);
  assert.match(text, /QA/);
});

test("3D Skill 限制高风险 MCP 写入", () => {
  for (const skillDir of [MODELING_DIR, TEXTURING_DIR]) {
    const text = readNativeMode(basename(skillDir));
    for (const term of ["用户确认", "任意代码执行", "操作系统命令", "网络", "环境变量", "版本化派生文件"]) assert.match(text, new RegExp(term), `${skillDir} 缺少 MCP 安全约束：${term}`);
    assert.match(text, /同时只允许一个写代理/);
  }
});

test("3D Unity 写入使用 @Unity，DCC MCP 仅保留专用边界", () => {
  const text = [
    readNativeMode("unity-game-3d-modeling"),
    readText(resolve(MODELING_DIR, "references/mcp-modeling-workflow.md")),
    readNativeMode("unity-game-3d-texturing"),
    readText(resolve(TEXTURING_DIR, "references/pbr-texture-workflow.md")),
  ].join("\n");
  assert.match(text, /@Unity/);
  assert.match(text, /unity:unity-cli/);
  assert.doesNotMatch(text, /unity (?:status|list|run|test|build|open|install)\b/);
  assert.match(text, /本地 DCC MCP/);
  assert.doesNotMatch(text, /CoplayDev|unity-mcp|mcpforunity:\/\/|manage_texture|manage_material|asset_gen|import_model_file/i);
});
