/** 将旧 Flutter 校验器接到新 profile，并让其路径根指向已安装的 skills 目录。 */
export function adaptFlutterValidator(text) {
  let output = text.replace('const ROOT = path.resolve(__dirname, "..");', 'const ROOT = path.resolve(__dirname, "../../..");');
  output = output.replace('"flutter-app-orchestrator/SKILL.md"', '"app-creator-workflow/SKILL.md"');
  output = output.replace(/function checkPackageSkills\(errors\) \{[\s\S]*?\n\}/, `function checkPackageSkills(errors) {
  const profilePath = path.join(ROOT, "app-stack-flutter", "profile.json");
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch (error) {
    addError(errors, "app-stack-flutter/profile.json 无法解析：" + error.message);
    return;
  }
  const expected = profile.capabilitySkills;
  if (!Array.isArray(expected) || expected.length === 0 || new Set(expected).size !== expected.length) {
    addError(errors, "app-stack-flutter/profile.json 必须包含不重复的 capabilitySkills 清单");
    return;
  }
  const actual = [];
  for (const name of expected) {
    if (typeof name !== "string" || !fs.existsSync(path.join(ROOT, name, "SKILL.md"))) {
      addError(errors, "公共能力缺少 SKILL.md：" + name);
    } else {
      actual.push(name);
    }
  }
  actual.sort();
  const listed = [...expected].sort();
  if (JSON.stringify(listed) !== JSON.stringify(actual)) {
    addError(errors, "Flutter profile 公共能力清单与实际入口不一致");
  }
  for (const adapter of [...(profile.nativeAdapters || []), ...(profile.authoredAdapters || [])]) {
    const relative = adapter.path.replace(/^skills\\//, "");
    const manualPath = path.join(ROOT, relative);
    if (!fs.existsSync(manualPath)) addError(errors, "Flutter 原生手册缺失：" + adapter.path);
    else {
      const manual = fs.readFileSync(manualPath, "utf8");
      const marker = "<!-- native-source:" + adapter.sourceSkill + ":start -->";
      if (adapter.section !== "mode-" + adapter.sourceSkill || !manual.includes(marker)) addError(errors, "Flutter 原生模式章节缺失：" + adapter.sourceSkill);
    }
    if (fs.existsSync(path.join(ROOT, adapter.sourceSkill, "SKILL.md"))) addError(errors, "旧原生技能入口不得继续存在：" + adapter.sourceSkill);
  }
}`);
  return output.replace('/^(?:https?:|mailto:|data:)/i.test(target)', '/^[a-z][a-z0-9+.-]*:/i.test(target)');
}
