import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, parse, resolve } from "node:path";

/** 为指定技术栈创建项目文档初始化器，显式传入其模板和公共授权合同。 */
export function createProjectDocInitializer({ stack, CORE_TEMPLATES, OPTIONAL_TEMPLATES, repoPath, loadWork, assertOwnedPath, loadProfile, assertNoOpenGrilling } = {}) {
  if (typeof stack !== "string" || !stack || !CORE_TEMPLATES || !OPTIONAL_TEMPLATES || [repoPath, loadWork, assertOwnedPath, loadProfile, assertNoOpenGrilling].some((value) => typeof value !== "function")) throw new TypeError("初始化器缺少技术栈、模板或授权依赖");
  const EXPECTED_STACK = stack;
  /** 表示命令行输入或授权不满足初始化约束。 */
  class InitializationError extends Error {}
  
  /** 解析可选交付物名称，并拒绝未知名称。 */
  function parseIncludeList(value) {
    const names = [...new Set(value.split(",").map((name) => name.trim()).filter(Boolean))]; const unknown = names.filter((name) => !(name in OPTIONAL_TEMPLATES)).sort();
    if (unknown.length) throw new InitializationError(`不支持的交付物：${unknown.join("、")}。可选值：${Object.keys(OPTIONAL_TEMPLATES).join("、")}。`); return names;
  }
  
  /** 解析项目目录、可选交付物和覆盖授权。 */
  function parseArgs(argv) {
    const args = { force: false }; const flags = new Set(["--project-root", "--work-item", "--ledger", "--object", "--include"]);
    for (let index = 0; index < argv.length; index += 1) { const token = argv[index]; if (token === "--force") { args.force = true; continue; } if (!flags.has(token) || index + 1 >= argv.length) throw new InitializationError(`不支持或缺少值的参数：${token}`); const value = argv[++index]; args[{ "--project-root": "projectRoot", "--work-item": "workItem", "--ledger": "ledger", "--object": "object", "--include": "include" }[token]] = value; }
    const requiredArguments = {
      projectRoot: "--project-root",
      workItem: "--work-item",
      object: "--object",
    };
    for (const [key, flag] of Object.entries(requiredArguments)) {
      if (!args[key]) throw new InitializationError(`缺少必需参数：${flag}`);
    }
    if (args.include) args.include = parseIncludeList(args.include); return args;
  }
  
  /** 拒绝文件系统根目录和不存在的项目目录。 */
  function validateProjectRoot(projectRoot) {
    const resolved = resolve(projectRoot); if (resolved === parse(resolved).root) throw new InitializationError("项目目录不能是文件系统根目录。"); if (!existsSync(resolved) || !statSync(resolved).isDirectory()) throw new InitializationError(`项目目录不存在或不是目录：${resolved}`); return resolved;
  }
  
  /** 选择核心模板，或合并 include 对应的多个文件。 */
  function selectTemplates(include) {
    if (include == null) return { ...CORE_TEMPLATES }; const selected = {}; for (const name of include) Object.assign(selected, OPTIONAL_TEMPLATES[name]); return selected;
  }
  
  /** 在统一检查覆盖冲突后写入已批准文档。 */
  function initializeDocuments(projectRoot, templates, force) {
    const targets = Object.keys(templates).map((filename) => filename.startsWith(".workflow-control/") ? resolve(projectRoot, filename) : resolve(projectRoot, "docs", filename)); const existing = targets.filter(existsSync); if (existing.length && !force) throw new InitializationError(`拒绝覆盖已有文档：${existing.map((path) => path.split(/[\\/]/).at(-1)).join("、")}。如确需覆盖，请显式传入 --force。`);
    for (let index = 0; index < targets.length; index += 1) { mkdirSync(resolve(targets[index], ".."), { recursive: true }); writeFileSync(targets[index], templates[Object.keys(templates)[index]], "utf8"); } return targets;
  }
  
  /** 复用公共 Work Item、风险边界和路径所有权合同，只预检初始化将写入的目标。 */
  function runPreflight(projectRoot, workItem, ledger, approvalObject, templates) {
    const workItemPath = repoPath(projectRoot, workItem, "Work Item").relative;
    const work = loadWork(projectRoot, workItemPath);
    if (work.stack !== EXPECTED_STACK) throw new InitializationError("Work Item 技术栈必须为 " + EXPECTED_STACK);
    if (["BLOCKED", "RETURN"].includes(work.globalState)) throw new InitializationError("BLOCKED/RETURN 未解决前不能初始化领域文档");
    if (work.gateStatus.F0 !== "PASS") throw new InitializationError("初始化前必须由公共控制面确认 F0=PASS");
    if (work.action && work.action.effects.some((effect) => effect !== "local-write")) {
      throw new InitializationError("Work Item.action 不能夹带本地文档初始化不执行的风险动作");
    }
    if (ledger) repoPath(projectRoot, ledger, "Ledger");
    if (!approvalObject || !String(approvalObject).trim()) throw new InitializationError("必须提供初始化对象说明");
    const profile = loadProfile(projectRoot, work.stack);
    assertNoOpenGrilling(projectRoot, work);
    for (const filename of Object.keys(templates)) {
      const target = filename.startsWith(".workflow-control/") ? filename : "docs/" + filename;
      assertOwnedPath(projectRoot, work, profile, target);
    }
  }
  
  /** 执行初始化并输出可审计的写入结果。 */
  function main(argv = process.argv.slice(2)) {
    try { const args = parseArgs(argv); const root = validateProjectRoot(args.projectRoot); const templates = selectTemplates(args.include); runPreflight(root, args.workItem, args.ledger, args.object, templates); const written = initializeDocuments(root, templates, args.force); console.log("已初始化项目交付物："); for (const path of written) console.log(path); return 0; }
    catch (error) { console.error(`初始化失败：${error instanceof Error ? error.message : String(error)}`); return 1; }
  }
  return { parseIncludeList, validateProjectRoot, selectTemplates, initializeDocuments, runPreflight, main };
}
