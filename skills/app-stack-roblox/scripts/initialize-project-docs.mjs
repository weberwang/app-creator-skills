#!/usr/bin/env node
/** 使用公共模板与现有初始化职责创建 Roblox 项目文档，不操作 Studio。 */
import { lstatSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createProjectDocInitializer } from '../../app-domain-toolkit/scripts/project/initialize-project-docs.mjs';
import { GAME_CHARACTERISTICS_TEMPLATE_SECTIONS } from '../../app-domain-toolkit/templates/game-characteristics-templates.mjs';
import { repoPath } from '../../app-workflow-control/scripts/runtime/io.mjs';
import { loadWork } from '../../app-workflow-control/scripts/runtime/workflow.mjs';
import { assertOwnedPath, loadProfile } from '../../app-workflow-control/scripts/runtime/validation.mjs';
import { assertNoOpenGrilling } from '../../app-workflow-control/scripts/runtime/artifacts.mjs';

/** 核心文档保留具体游戏决策入口，特点与关卡共用公共模板唯一来源。 */
export const CORE_TEMPLATES = Object.freeze({
  'GDD.md': `# Roblox 游戏设计\n\n## 目标与核心循环\n\n记录目标玩家、核心操作、成功/失败、重试和范围。Place 是平台宿主，不按关卡数量机械拆分。\n\n## 范围与验收\n\n| 功能/内容 | 玩家行为 | 可观察结果 | 依赖 | 排除项 |\n| --- | --- | --- | --- | --- |\n${GAME_CHARACTERISTICS_TEMPLATE_SECTIONS['GDD.md']}`,
  'TDD.md': `# Roblox 技术设计\n\n## Studio 与正式源\n\n记录 Studio 版本、目标实例、Experience/Place 或实际本地文件、Script Sync 映射、单一 Place 快照、保存及重新读取方式。未知能力保持未验证。\n\n## 平台与运行上下文\n\n| 模块 | Edit 正式源 | Client/Server 职责 | 实际数据/服务边界 | 生命周期与验证入口 |\n| --- | --- | --- | --- | --- |\n\n记录服务端权威、Remote 验证、资源权限、目标输入/视口和云副作用；测试使用隔离数据，按实际任务执行外部操作。\n${GAME_CHARACTERISTICS_TEMPLATE_SECTIONS['TDD.md']}`,
});

/** QA 文档保持按需生成，不为没有试玩范围的任务预建文件。 */
export const OPTIONAL_TEMPLATES = Object.freeze({
  qa: Object.freeze({
    'qa-plan.md': `# Roblox 质量与试玩计划\n\n## Studio 运行与交付\n\n记录实际 Studio/Place、Edit/Client/Server、目标输入、测试数据环境、资源与运行证据。模拟、真实设备、线上及用户人工视觉结论分别记录。\n${GAME_CHARACTERISTICS_TEMPLATE_SECTIONS['qa-plan.md']}`,
  }),
});

const tools = createProjectDocInitializer({
  stack: 'roblox', CORE_TEMPLATES, OPTIONAL_TEMPLATES,
  repoPath, loadWork, assertOwnedPath: assertSafeOwnedPath, loadProfile, assertNoOpenGrilling,
});

/** 逐级拒绝链接，避免项目根或 docs 目录借 Junction 改写其他位置。 */
function rejectLink(path) {
  try {
    if (lstatSync(path).isSymbolicLink()) throw new Error(`项目文档路径不能为符号链接：${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/** CLI 的公共预检逐文件调用此包装，避免项目内链接指向禁止写入的其他文件。 */
function assertSafeOwnedPath(repo, work, profile, value) {
  const root = resolve(repo);
  rejectLink(root);
  rejectLink(resolve(root, 'docs'));
  rejectLink(resolve(root, ...value.split('/')));
  return assertOwnedPath(repo, work, profile, value);
}

/** 初始化核心文档或明确选择的可选文档，调用方负责已有工作项权限检查。 */
export function initializeDocs({ projectRoot, include, force = false } = {}) {
  if (typeof projectRoot !== 'string' || !projectRoot.trim()) throw new TypeError('必须提供项目根目录');
  if (typeof force !== 'boolean') throw new TypeError('force 必须为布尔值');
  if (include !== undefined && (typeof include !== 'string' || !include.trim())) throw new TypeError('include 必须为非空逗号分隔名称');
  const root = tools.validateProjectRoot(projectRoot);
  rejectLink(root);
  const names = include === undefined ? undefined : tools.parseIncludeList(include);
  const templates = tools.selectTemplates(names);
  const docs = resolve(root, 'docs');
  rejectLink(docs);
  for (const filename of Object.keys(templates)) {
    const target = repoPath(root, `docs/${filename}`, '项目文档').absolute;
    const local = relative(root, target);
    if (!local || local === '..' || local.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(local)) throw new Error('项目文档越出项目根目录');
    rejectLink(target);
    if (dirname(target) !== docs) throw new Error('项目文档必须位于 docs 目录');
  }
  return tools.initializeDocuments(root, templates, force);
}

// CLI 路线复用现有 Work Item、路径所有权与批准边界，不用模板预填结果。
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = tools.main();
