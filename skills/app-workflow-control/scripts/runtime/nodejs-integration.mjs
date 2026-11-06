import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { readJson, repoPath, WorkflowError } from './io.mjs';
import { pathMatch } from './validation.mjs';

/** 统一比较工作区路径；Windows 上保持与控制器一致的大小写语义。 */
function pathKey(repo, value) {
  const path = repoPath(repo, value, 'Node.js 集成文件').relative;
  return process.platform === 'win32' ? path.toLowerCase() : path;
}

/** 以文件系统实际身份排除硬链接别名，避免控制记录换名后自证。 */
function fileKey(repo, path) {
  const info = statSync(repoPath(repo, path, 'Node.js 实际文件身份').absolute, { bigint: true });
  return `${info.dev}:${info.ino}`;
}

/** 从具体目录递归读取实际普通文件，不穿越符号链接或系统产物。 */
function collectDirectory(repo, directory, output) {
  const absolute = repoPath(repo, directory, 'Node.js 交付目录').absolute;
  if (!existsSync(absolute)) return;
  const info = lstatSync(absolute);
  if (info.isSymbolicLink()) throw new WorkflowError(`Node.js 交付目录不能使用符号链接：${directory}`);
  if (info.isFile()) { output.push(directory); return; }
  if (!info.isDirectory()) throw new WorkflowError(`Node.js 交付路径不是普通文件或目录：${directory}`);
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    // 所有权范围不包括控制数据或依赖缓存，避免把运行输出误当源文件。
    if (['.git', '.workflow-control', '.agents', 'node_modules'].includes(entry.name)) continue;
    collectDirectory(repo, `${directory}/${entry.name}`, output);
  }
}

/** 展开实施包的所有权目录和星号路径，避免只冻结调用方挑选的少数源文件。 */
function ownedFiles(repo, pack) {
  if (!Array.isArray(pack.executionUnits) || !pack.executionUnits.length) throw new WorkflowError('Node.js 来源实施包缺少执行单元');
  const collected = new Map();
  for (const unit of pack.executionUnits) {
    if (!Array.isArray(unit?.paths) || !unit.paths.length) throw new WorkflowError('Node.js 来源实施包缺少所有权路径');
    for (const value of unit.paths) {
      const pattern = repoPath(repo, value, 'Node.js 所有权路径').relative;
      const index = pattern.indexOf('*');
      // 无固定前缀的全仓库遍历无法合理限定成本和排除控制记录。
      const prefix = index < 0 ? pattern : pattern.slice(0, index);
      const base = index < 0 ? pattern : prefix.endsWith('/') ? prefix.slice(0, -1) : posix.dirname(prefix);
      if (!base || base === '.') throw new WorkflowError('Node.js 集成的所有权通配路径必须包含固定目录');
      const candidates = [];
      collectDirectory(repo, base, candidates);
      for (const path of candidates) {
        if (pathMatch(path, pattern)) collected.set(pathKey(repo, path), path);
      }
    }
  }
  if (!collected.size) throw new WorkflowError('Node.js 来源实施包没有可冻结的实际交付文件');
  return collected;
}

/** 校验服务端模块身份、实施包/清单及所有实际交付文件。 */
export function validateNodeScopeObject(repo, work, object, source, { verifyIdentity }) {
  if (source.workItemId === work.workItemId || source.workItemId !== object.objectId || source.projectId !== work.projectId || source.stack !== work.stack || source.workItemType !== 'MODULE' || source.visual !== undefined || source.globalState !== 'COMPLETE') {
    throw new WorkflowError(`Node.js 范围对象 ${object.objectId} 必须是当前项目已完成的无视觉 MODULE`);
  }
  for (const field of ['implementationPackageRef', 'evidenceRef']) {
    const expected = object[field];
    if (!source[field]?.path || !expected?.path || pathKey(repo, source[field].path) !== pathKey(repo, expected.path)) throw new WorkflowError(`Node.js 来源 ${field} 未绑定当前工作项`);
    verifyIdentity(repo, expected, `Node.js 来源 ${field}`);
  }
  const pack = readJson(repo, object.implementationPackageRef.path, 'Node.js 来源实施包');
  if (pack.schemaVersion !== '1.0' || pack.workItemId !== source.workItemId || pack.stack !== work.stack || pack.workItemType !== 'MODULE') throw new WorkflowError('Node.js 来源实施包身份不匹配');
  const manifest = readJson(repo, object.evidenceRef.path, 'Node.js 来源证据清单');
  if (manifest.schemaVersion !== '1.0' || manifest.workItemId !== source.workItemId || manifest.stack !== work.stack || typeof manifest.implementationPackageRef !== 'string' || !Array.isArray(manifest.items) || pathKey(repo, manifest.implementationPackageRef) !== pathKey(repo, object.implementationPackageRef.path)) throw new WorkflowError('Node.js 来源证据清单身份不匹配');
  if (!Array.isArray(object.deliverableRefs) || !object.deliverableRefs.length) throw new WorkflowError('Node.js 集成必须冻结全部交付文件');
  const expected = ownedFiles(repo, pack);
  const reservedPaths = [object.workItemRef.path, object.implementationPackageRef.path, object.evidenceRef.path, work.integrationScopeRef.path, work.evidenceRef?.path, work.integrationEvidenceRef?.path].filter(Boolean);
  const reserved = new Set(reservedPaths.map((path) => pathKey(repo, path)));
  const reservedFiles = new Set(reservedPaths.filter((path) => existsSync(repoPath(repo, path).absolute)).map((path) => fileKey(repo, path)));
  const actual = new Set();
  for (const ref of object.deliverableRefs) {
    const path = verifyIdentity(repo, ref, 'Node.js 交付文件', { allowEmpty: true });
    const key = pathKey(repo, path);
    if (key.startsWith('.workflow-control/') || reserved.has(key) || reservedFiles.has(fileKey(repo, path))) throw new WorkflowError('Node.js 交付文件不能使用控制记录或证据自证');
    if (!expected.has(key) || actual.has(key)) throw new WorkflowError('Node.js 交付文件不在来源所有权内或重复');
    actual.add(key);
  }
  if (actual.size !== expected.size || [...expected.keys()].some((key) => !actual.has(key))) throw new WorkflowError('Node.js 交付文件未覆盖实施包的全部实际文件');
  return source;
}

/** 对照实施前范围，阻止用新工作项、证据或交付文件替代已冻结版本。 */
export function assertNodeResultObject(repo, actual, expected, { sameIdentity }) {
  for (const field of ['workItemRef', 'implementationPackageRef', 'evidenceRef']) {
    if (!sameIdentity(repo, actual?.[field], expected[field])) throw new WorkflowError(`Node.js 集成对象 ${expected.objectId} 的 ${field} 与冻结范围不一致`);
  }
  if (!Array.isArray(actual.deliverableRefs) || actual.deliverableRefs.length !== expected.deliverableRefs.length) throw new WorkflowError('Node.js 集成交付文件与冻结范围不一致');
  const ordered = (refs) => refs.map((ref) => `${pathKey(repo, ref.path)}:${ref.sha256}`).sort();
  if (JSON.stringify(ordered(actual.deliverableRefs)) !== JSON.stringify(ordered(expected.deliverableRefs))) throw new WorkflowError('Node.js 集成交付文件与冻结范围不一致');
}

/** 汇集实施包中的实际单元结果路径，名称不要求遵循固定模式。 */
function unitResultRefs(repo, packRef) {
  if (!packRef?.path) return [];
  const pack = readJson(repo, packRef.path, 'Node.js 实施包');
  if (!Array.isArray(pack.executionUnits)) throw new WorkflowError('Node.js 实施包缺少执行单元');
  return pack.executionUnits.filter((unit) => typeof unit?.resultPath === 'string').map((unit) => ({ path: unit.resultPath }));
}

/** 收集工作项当前和已失效的控制记录，避免它们充当原始运行日志。 */
function workControlRefs(work) {
  const names = ['implementationPackageRef', 'evidenceRef', 'globalVisualBaselineRef', 'assetReviewRef', 'grillingRef', 'planningRef', 'integrationScopeRef', 'integrationEvidenceRef'];
  return [...names.map((name) => work?.[name]), ...(work?.invalidatedRefs ?? []), ...(work?.returnRecord?.invalidatedRefs ?? [])]
    .filter((ref) => typeof ref?.path === 'string');
}

/** 确认执行记录引用独立原始输出，控制记录或其他行为记录不可冒充日志。 */
export function validateNodeCase(repo, work, actual, evidence, scope, { verifyIdentity }) {
  if (typeof actual.command !== 'string' || !actual.command.trim() || actual.exitCode !== 0) throw new WorkflowError('Node.js 最终行为必须记录真实命令和零退出码');
  const output = verifyIdentity(repo, actual.outputRef, 'Node.js 最终行为原始输出');
  const evidenceRoot = pathKey(repo, work.evidenceRoot);
  if (!pathKey(repo, output).startsWith(`${evidenceRoot}/`)) throw new WorkflowError('Node.js 最终行为原始输出必须位于当前工作项的 evidenceRoot');
  const sourceEvidence = scope.objects.flatMap((object) => {
    const manifest = readJson(repo, object.evidenceRef.path, 'Node.js 来源证据清单');
    return (manifest.items ?? []).filter((item) => typeof item?.path === 'string').map((item) => ({ path: item.path }));
  });
  const sourceControl = scope.objects.flatMap((object) => {
    const source = readJson(repo, object.workItemRef.path, 'Node.js 来源工作项');
    return [
      ...unitResultRefs(repo, object.implementationPackageRef),
      ...workControlRefs(source),
      ...(typeof source.evidenceRoot === 'string' ? [{ path: `${source.evidenceRoot}/execution-state.json` }] : []),
    ];
  });
  const reservedRefs = [...workControlRefs(work),
    { path: `${work.evidenceRoot}/execution-state.json` }, ...unitResultRefs(repo, work.implementationPackageRef),
    ...evidence.cases.map((entry) => entry.evidenceRef),
    ...scope.objects.flatMap((object) => [object.workItemRef, object.implementationPackageRef, object.evidenceRef, ...object.deliverableRefs]), ...sourceEvidence, ...sourceControl]
    .filter((ref) => typeof ref?.path === 'string');
  const reserved = reservedRefs.map((ref) => pathKey(repo, ref.path));
  const reservedFiles = new Set(reservedRefs.filter((ref) => existsSync(repoPath(repo, ref.path).absolute)).map((ref) => fileKey(repo, ref.path)));
  const key = pathKey(repo, output);
  if (reserved.includes(key) || reservedFiles.has(fileKey(repo, output)) || key.startsWith('.workflow-control/work-items/') || /(?:^|\/)execution-state\.json$/i.test(key) || /(?:^|\/)unit-[^/]+\.json$/i.test(key)) throw new WorkflowError('Node.js 原始输出不能使用控制记录或其他证据自证');
}
