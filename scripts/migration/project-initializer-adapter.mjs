/** 将三栈初始化器接入公共 Work Item 预检，集中维护生成代码模板。 */
export function adaptProjectInitializer(text, stack) {
  let output = text
    .replace('import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";', 'import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";')
    .replace('import { isAbsolute, parse, resolve } from "node:path";', 'import { isAbsolute, parse, resolve } from "node:path";')
    .replace('import { spawnSync } from "node:child_process";\n', '')
    .replace('import { CORE_TEMPLATES, OPTIONAL_TEMPLATES } from "./project_doc_templates.mjs";', `import { CORE_TEMPLATES, OPTIONAL_TEMPLATES } from "./project_doc_templates.mjs";
import { repoPath } from "../../app-workflow-control/scripts/runtime/io.mjs";
import { loadWork } from "../../app-workflow-control/scripts/runtime/workflow.mjs";
import { assertOwnedPath, loadProfile } from "../../app-workflow-control/scripts/runtime/validation.mjs";
import { assertNoOpenGrilling } from "../../app-workflow-control/scripts/runtime/artifacts.mjs";
const EXPECTED_STACK = ${JSON.stringify(stack)};`);
  const preflight = `/** 复用公共 Work Item、风险边界和路径所有权合同，只预检初始化将写入的目标。 */
export function runPreflight(projectRoot, workItem, ledger, approvalObject, templates) {
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
`;
  // 源初始化器可能有旧 preflight 定义，整段替换以防遗留旧 CLI 调用。
  output = output.replace(/\/\*\* 调用唯一控制 CLI 验证 A1 Work Item 范围[\s\S]*?\n\}\n/, preflight);
  return output;
}
