#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
// 工作流常量集中声明契约、权威文件和可复算场景输入，路由只消费结构化事实。
const TASK_FIELDS = ["目标", "验收条件", "写入范围", "禁止改动", "确认事实", "风险等级", "验证命令", "授权边界"];
const RETURN_FIELDS = ["状态", "变更文件", "验证结果", "阻塞项", "剩余风险"];
const REQUIRED_AUTHORITY = [
  "app-creator-workflow/SKILL.md",
  "flutter-subagent-delivery/references/task-risk-tiers.md",
  "flutter-quality-review/references/review-funnel.md",
  "flutter-app-orchestrator/references/artifacts.md",
  "flutter-subagent-delivery/references/collaboration-protocol.md",
  "flutter-implementation-plan/references/task-brief-template.md",
];
const SCENARIOS = [
  {
    name: "文案修改",
    facts: { behaviorChanged: false, acceptanceChanged: false, visualChanged: false, technicalChanged: false, highRisk: false, releaseScope: false },
    expected: { risk: "light", lanes: [] },
  },
  {
    name: "普通 Bug",
    facts: { behaviorChanged: true, acceptanceChanged: true, visualChanged: false, technicalChanged: false, highRisk: false, releaseScope: false },
    expected: { risk: "standard", lanes: ["QA"] },
  },
  {
    name: "页面功能",
    facts: { behaviorChanged: true, acceptanceChanged: true, visualChanged: true, technicalChanged: false, highRisk: false, releaseScope: false },
    expected: { risk: "standard", lanes: ["QA", "visual"] },
  },
  {
    name: "认证迁移",
    facts: { behaviorChanged: true, acceptanceChanged: true, visualChanged: false, technicalChanged: true, highRisk: true, releaseScope: false },
    expected: { risk: "high", lanes: ["QA", "technical"] },
  },
  {
    name: "发布准备",
    facts: { behaviorChanged: false, acceptanceChanged: false, visualChanged: false, technicalChanged: true, highRisk: false, releaseScope: true },
    expected: { risk: "release", lanes: ["QA", "technical", "Release"] },
  },
];

/**
 * 递归收集仓库内的指定文件，同时跳过 Git 和依赖目录。
 * @param {string} directory 当前目录
 * @param {string[]} suffixes 需要收集的后缀
 * @returns {string[]} 绝对路径列表
 */
function walkFiles(directory, suffixes) {
  const result = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(absolutePath, suffixes));
      continue;
    }
    for (const suffix of suffixes) {
      if (entry.name.endsWith(suffix)) {
        result.push(absolutePath);
        break;
      }
    }
  }
  result.sort();
  return result;
}

/**
 * 将简单 YAML 标量去除包裹引号，供 frontmatter 结构检查使用。
 * @param {string} value 原始值
 * @returns {string} 规范化值
 */
function normalizeScalar(value) {
  const trimmed = value.trim();
  const quoted = trimmed.length >= 2
    && ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'")));
  return quoted ? trimmed.slice(1, -1) : trimmed;
}

/**
 * 解析 SKILL.md 顶部 frontmatter，并检查字段是否唯一且可用。
 * @param {string} filePath SKILL.md 路径
 * @returns {{name:string,description:string,errors:string[]}} 解析结果
 */
function parseSkillFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const errors = [];
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) {
    return { name: "", description: "", errors: [filePath + ": 缺少完整 frontmatter"] };
  }

  const values = { name: [], description: [] };
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^(name|description):\s*(.*)$/.exec(line);
    if (field) {
      values[field[1]].push(normalizeScalar(field[2]));
    }
  }
  if (values.name.length !== 1 || !values.name[0]) {
    errors.push(filePath + ": name 必须恰好出现一次且非空");
  }
  if (values.description.length !== 1 || values.description[0].length < 20 || values.description[0].length > 260) {
    errors.push(filePath + ": description 必须恰好出现一次，长度需在 20–260 字符");
  }
  return {
    name: values.name[0] || "",
    description: values.description[0] || "",
    errors,
  };
}

/**
 * 记录一条结构校验错误，统一错误格式便于 CLI 和 CI 消费。
 * @param {string[]} errors 错误列表
 * @param {string} message 错误内容
 * @returns {void}
 */
function addError(errors, message) {
  errors.push(message);
}

/**
 * 检查所有 SKILL.md 的 frontmatter、目录名和全局 name 唯一性。
 * @param {string[]} errors 错误列表
 * @returns {{skills:string[],metadata:Map<string,object>}} skill 元数据
 */
function checkSkills(errors) {
  const skillFiles = walkFiles(ROOT, ["SKILL.md"]);
  const names = new Map();
  const metadata = new Map();
  const skills = [];
  for (const filePath of skillFiles) {
    const directoryName = path.basename(path.dirname(filePath));
    const parsed = parseSkillFrontmatter(filePath);
    for (const error of parsed.errors) {
      addError(errors, error);
    }
    if (parsed.name && parsed.name !== directoryName) {
      addError(errors, filePath + ": name=" + parsed.name + " 与目录=" + directoryName + " 不一致");
    }
    if (parsed.name && names.has(parsed.name)) {
      addError(errors, filePath + ": skill name 重复，已存在于 " + names.get(parsed.name));
    }
    if (parsed.name) {
      names.set(parsed.name, filePath);
      metadata.set(parsed.name, { filePath, directoryName, description: parsed.description });
      skills.push(parsed.name);
    }
  }
  skills.sort();
  return { skills, metadata };
}

/**
 * 解析 Markdown 链接并验证其相对目标存在，跳过外部 URL 和纯锚点。
 * @param {string} filePath Markdown 文件
 * @param {string[]} errors 错误列表
 * @returns {number} 检查的链接数量
 */
function checkMarkdownLinks(filePath, errors) {
  const text = fs.readFileSync(filePath, "utf8");
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let matches = 0;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
      continue;
    }
    matches += 1;
    const targetWithoutQuery = target.split("#", 1)[0].split("?", 1)[0];
    let decodedTarget = targetWithoutQuery;
    try {
      decodedTarget = decodeURIComponent(targetWithoutQuery);
    } catch (_error) {
      addError(errors, filePath + ": 链接编码无效：" + target);
      continue;
    }
    const resolved = path.resolve(path.dirname(filePath), decodedTarget);
    if (!fs.existsSync(resolved)) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      addError(errors, filePath + ":" + line + ": 相对链接不存在：" + target);
    }
  }
  return matches;
}

/**
 * 检查所有 Markdown 的链接，确保渐进披露引用不会指向断链。
 * @param {string[]} errors 错误列表
 * @returns {number} 检查的链接总数
 */
function checkAllMarkdownLinks(errors) {
  const markdownFiles = walkFiles(ROOT, [".md"]);
  let count = 0;
  for (const filePath of markdownFiles) {
    count += checkMarkdownLinks(filePath, errors);
  }
  return count;
}

/**
 * 比较 package.json 的顶层 skill 清单和实际含 SKILL.md 的目录。
 * @param {string[]} errors 错误列表
 * @returns {void}
 */
function checkPackageSkills(errors) {
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
    const relative = adapter.path.replace(/^skills\//, "");
    const manualPath = path.join(ROOT, relative);
    if (!fs.existsSync(manualPath)) addError(errors, "Flutter 原生手册缺失：" + adapter.path);
    else {
      const manual = fs.readFileSync(manualPath, "utf8");
      const marker = "<!-- native-source:" + adapter.sourceSkill + ":start -->";
      if (adapter.section !== "mode-" + adapter.sourceSkill || !manual.includes(marker)) addError(errors, "Flutter 原生模式章节缺失：" + adapter.sourceSkill);
    }
    if (fs.existsSync(path.join(ROOT, adapter.sourceSkill, "SKILL.md"))) addError(errors, "旧原生技能入口不得继续存在：" + adapter.sourceSkill);
  }
}

/**
 * 检查每个 skill 的 OpenAI 入口提示短小且显式引用自身 $skill-name。
 * @param {{skills:string[],metadata:Map<string,object>}} skillData skill 元数据
 * @param {string[]} errors 错误列表
 * @returns {number} 检查的入口数量
 */
function checkOpenAiPrompts(skillData, errors) {
  let count = 0;
  for (const skillName of skillData.skills) {
    const metadata = skillData.metadata.get(skillName);
    const agentPath = path.join(path.dirname(metadata.filePath), "agents", "openai.yaml");
    if (!fs.existsSync(agentPath)) {
      continue;
    }
    count += 1;
    const text = fs.readFileSync(agentPath, "utf8");
    const shortMatch = /^\s*short_description:\s*["']?([^"'\r\n]*)/m.exec(text);
    const promptMatch = /^\s*default_prompt:\s*["']?([^"'\r\n]*)/m.exec(text);
    const expectedToken = "$" + skillName;
    if (!shortMatch || shortMatch[1].trim().length < 8 || shortMatch[1].trim().length > 64) {
      addError(errors, agentPath + ": short_description 缺失或过长");
    }
    if (!promptMatch || !promptMatch[1].includes(expectedToken) || promptMatch[1].trim().length > 260) {
      addError(errors, agentPath + ": default_prompt 必须短且包含 " + expectedToken);
    }
  }
  return count;
}

/**
 * 判断一行是否明确处于用户授权的例外语境。
 * @param {string} line 文档行
 * @returns {boolean} 是否为授权语境
 */
function isAuthorizationContext(line) {
  return /(明确授权|获授权|单独授权|explicit(?:ly)?\s+authori[sz]ed|user\s+authori[sz]ation|require\s+explicit)/i.test(line);
}

/**
 * 判断一行是否在否定或条件语境中提及拓扑动作。
 * @param {string} line 文档行
 * @returns {boolean} 是否为否定/条件语境
 */
function isNegativeContext(line) {
  return /(不自动|不得|不要|不要求|不创建|仅在|只有|除非|未授权|不驱动|never|without|unless|only\s+when|not\s+required|do\s+not)/i.test(line);
}

/**
 * 识别“当前分支 checkout”这一允许的默认基线，不把它误判为创建分支。
 * @param {string} line 文档行
 * @returns {boolean} 是否是当前 checkout 声明
 */
function isCurrentCheckoutDeclaration(line) {
  return /当前(?:分支)?(?:的)?\s*checkout/i.test(line)
    && !/(其他|新建|创建|普通|候选)分支/i.test(line);
}

/**
 * 过滤 Markdown 的 YAML frontmatter 和代码围栏，只保留可执行正文及其原始行号。
 * @param {string} text Markdown 文本
 * @returns {Array<{line:string,lineNumber:number}>} 正文行及文件内行号
 */
function getPolicyLines(text) {
  const lines = text.split(/\r?\n/);
  const policyLines = [];
  let inFrontmatter = lines.length > 0 && lines[0].replace(/^\uFEFF/, "").trim() === "---";
  let inFence = false;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (inFrontmatter) {
      if (lineIndex > 0 && line.trim() === "---") {
        inFrontmatter = false;
      }
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      policyLines.push({ line, lineNumber: lineIndex + 1 });
    }
  }
  return policyLines;
}

/**
 * 检查权威文档没有把分支、提交或并行写入设为默认必需动作。
 * @param {string[]} errors 错误列表
 * @returns {{files:number,lines:number}} 检查统计
 */
function checkDefaultTopology(errors) {
  const authorityFiles = [];
  for (const relativePath of REQUIRED_AUTHORITY) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
      addError(errors, "缺少权威工作流文件：" + relativePath);
      continue;
    }
    authorityFiles.push(filePath);
  }

  let lineCount = 0;
  let hasSingleWriter = false;
  let hasCurrentCheckout = false;
  let hasAuthorizationRule = false;
  for (const filePath of authorityFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    const policyLines = getPolicyLines(text);
    lineCount += text.split(/\r?\n/).length;
    for (const policyLine of policyLines) {
      const line = policyLine.line;
      // 过滤后的行仍保留原文件位置，便于输出可复核错误。
      if (/单写者|single\s+writer/i.test(line)) {
        hasSingleWriter = true;
      }
      if (/当前(?:分支)?(?:的)?\s*checkout|current checkout/i.test(line)) {
        hasCurrentCheckout = true;
      }
      if (/明确授权|explicit(?:ly)?\s+authori[sz]ed/i.test(line)) {
        hasAuthorizationRule = true;
      }
      const explicitTopologyMention = /(分支|worktree|工作树|提交|commit|并行写入|parallel\s+writer)/i.test(line)
        || /\bPR\b/i.test(line);
      const requiresAction = /(默认|default|必须|required|必需|shall|\buse\b|\bcreate\b|\bfreeze\b)/i.test(line);
      if (explicitTopologyMention && requiresAction && !isCurrentCheckoutDeclaration(line) && !isAuthorizationContext(line) && !isNegativeContext(line)) {
        // 总量统计使用 lineCount，定位信息则使用过滤后保留的文件内真实行号。
        addError(errors, filePath + ":" + policyLine.lineNumber + ": 默认拓扑疑似强制未授权动作：" + line.trim());
      }
    }
  }
  if (!hasSingleWriter || !hasCurrentCheckout || !hasAuthorizationRule) {
    addError(errors, "权威规则必须同时声明当前 checkout 单写者默认拓扑和明确授权例外");
  }
  return { files: authorityFiles.length, lines: lineCount };
}

/**
 * 按结构化变更事实返回最小审核路由，避免结果依赖场景名称或文案。
 * @param {{behaviorChanged:boolean,acceptanceChanged:boolean,visualChanged:boolean,technicalChanged:boolean,highRisk:boolean,releaseScope:boolean}} facts 变更事实
 * @returns {{risk:string,lanes:string[]}} 路由结果
 */
function routeScenario(facts) {
  // 风险由结构化事实升级，审核通道按受影响事实加入，避免仅依赖场景名称。
  let risk = "light";
  if (facts.releaseScope) {
    risk = "release";
  } else if (facts.highRisk) {
    risk = "high";
  } else if (facts.behaviorChanged || facts.acceptanceChanged || facts.visualChanged || facts.technicalChanged) {
    risk = "standard";
  }

  const lanes = [];
  if (facts.behaviorChanged || facts.acceptanceChanged || facts.highRisk || facts.releaseScope) {
    lanes.push("QA");
  }
  if (facts.technicalChanged || facts.releaseScope) {
    lanes.push("technical");
  }
  if (facts.visualChanged) {
    lanes.push("visual");
  }
  if (facts.releaseScope) {
    lanes.push("Release");
  }
  return { risk, lanes };
}

/**
 * 检查审核漏斗中的五类场景、风险和通道声明与确定性路由一致。
 * @param {string[]} errors 错误列表
 * @returns {object[]} 稳定的场景输出
 */
function checkScenarioRoutes(errors) {
  const funnelPath = path.join(ROOT, "flutter-quality-review", "references", "review-funnel.md");
  const text = fs.readFileSync(funnelPath, "utf8");
  const lines = text.split(/\r?\n/);
  const output = [];
  for (const scenario of SCENARIOS) {
    const firstRun = routeScenario(scenario.facts);
    const secondRun = routeScenario(scenario.facts);
    if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
      addError(errors, scenario.name + ": 路由结果不稳定");
    }
    if (JSON.stringify(firstRun) !== JSON.stringify(scenario.expected)) {
      addError(errors, scenario.name + ": 实际路由与独立 expected 不一致");
    }
    let line = "";
    for (const candidate of lines) {
      if (candidate.includes(scenario.name)) {
        line = candidate;
        break;
      }
    }
    const tick = String.fromCharCode(96);
    if (!line || !line.includes(tick + firstRun.risk + tick)) {
      addError(errors, scenario.name + ": 审核漏斗缺少匹配的风险路由");
    }
    for (const lane of firstRun.lanes) {
      const laneText = lane === "technical" ? "技术" : lane === "visual" ? "视觉" : lane;
      if (!line || !line.includes(laneText)) {
        addError(errors, scenario.name + ": 审核漏斗缺少 " + lane + " 通道");
      }
    }
    if (firstRun.lanes.length === 0 && (!line || !/无 F2|自检/.test(line))) {
      addError(errors, scenario.name + ": light 路由必须声明自检且无 F2");
    }
    output.push({ name: scenario.name, risk: firstRun.risk, lanes: firstRun.lanes.slice() });
  }
  return output;
}

/**
 * 检查八字段任务契约、公共返回契约和四类提示模板的结构。
 * @param {string[]} errors 错误列表
 * @returns {{taskFields:number,returnFields:number,templates:number}} 检查统计
 */
function checkPromptContract(errors) {
  const taskPath = path.join(ROOT, "flutter-implementation-plan", "references", "task-brief-template.md");
  const rolePath = path.join(ROOT, "flutter-subagent-delivery", "references", "app-team-role-prompts.md");
  const specialistPath = path.join(ROOT, "flutter-subagent-delivery", "references", "subagent-prompts.md");
  const taskText = fs.readFileSync(taskPath, "utf8");
  const roleText = fs.readFileSync(rolePath, "utf8");
  const specialistText = fs.readFileSync(specialistPath, "utf8");

  let taskFieldCount = 0;
  for (const field of TASK_FIELDS) {
    if (taskText.includes(field + "：")) {
      taskFieldCount += 1;
    } else {
      addError(errors, "任务契约缺少字段：" + field);
    }
  }
  let returnFieldCount = 0;
  for (const field of RETURN_FIELDS) {
    if (taskText.includes(field + "：") && roleText.includes(field + "：")) {
      returnFieldCount += 1;
    } else {
      addError(errors, "公共返回契约缺少字段：" + field);
    }
  }
  if (!roleText.includes("## 公共返回契约") || !roleText.includes("## 角色卡输入")) {
    addError(errors, "角色提示必须包含公共输入和唯一公共返回契约");
  }
  const templates = ["## 实现模板", "## 审阅模板", "## 设计模板", "## 发布模板"];
  let templateCount = 0;
  for (const heading of templates) {
    if (specialistText.includes(heading)) {
      templateCount += 1;
    } else {
      addError(errors, "专项提示缺少模板：" + heading);
    }
  }
  // 允许 Snapshot ID 与 snapshot-id 两种规范写法，语义相同但不重复塞关键词。
  const hasSnapshotId = /snapshot[\s-]+id/i.test(specialistText);
  if (!hasSnapshotId || !specialistText.includes("NEEDS_CONTEXT")) {
    addError(errors, "专项提示必须声明 snapshot-id 和缺失上下文返回规则");
  }
  return { taskFields: taskFieldCount, returnFields: returnFieldCount, templates: templateCount };
}

/**
 * 执行全部结构检查并输出稳定 JSON，失败只返回错误不修改仓库。
 * @returns {void}
 */
function main() {
  const errors = [];
  const skillData = checkSkills(errors);
  const linkCount = checkAllMarkdownLinks(errors);
  checkPackageSkills(errors);
  const promptCount = checkOpenAiPrompts(skillData, errors);
  const topology = checkDefaultTopology(errors);
  const promptContract = checkPromptContract(errors);
  const scenarios = checkScenarioRoutes(errors);
  const result = {
    ok: errors.length === 0,
    checks: {
      skills: skillData.skills.length,
      markdownLinks: linkCount,
      openAiPrompts: promptCount,
      authorityFiles: topology.files,
      authorityLines: topology.lines,
      taskFields: promptContract.taskFields,
      returnFields: promptContract.returnFields,
      templates: promptContract.templates,
    },
    scenarios,
    errors,
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write("validate-workflow: " + error.message + "\n");
  process.exitCode = 1;
}
