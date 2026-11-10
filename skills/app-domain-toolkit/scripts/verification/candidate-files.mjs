#!/usr/bin/env node
import { resolve } from 'node:path';
import { isDirectEntry } from '../../../app-skill-runtime/direct-entry.mjs';
import { checkedPath, inspectPath, parseFlags, readCheckedJson } from './file-identities.mjs';

/** 快照只记录显式文件身份，不将静态一致性冒称构建或运行结果。 */
const SCHEMA = 'candidate-files-v1';
const SCOPE = '显式候选与输入的文件身份';
const LIMITATIONS = Object.freeze([
  '不证明构建实际执行、选定输出的来源或构建因果',
  '不证明运行、视觉效果、用户确认或渠道审核',
]);

/** 在 Windows 上以文件系统的大小写语义比较项目路径。 */
function pathKey(path) {
  return process.platform === 'win32' ? path.toLowerCase() : path;
}

/** 判定快照节点是否为普通对象，避免数组和空值误入合同。 */
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** 拒绝未定义字段，避免无效或伪装的冻结材料被静默接受。 */
function assertFields(value, names, label) {
  if (!isObject(value) || Object.keys(value).some((name) => !names.includes(name))) throw new Error(`${label}格式无效`);
}

/** 验证摘要和路径身份，并拒绝目录外、重复或格式异常的记录。 */
function validateEntry(repo, value, label) {
  assertFields(value, ['path', 'kind', 'files'], label);
  const root = checkedPath(repo, value.path, `${label}路径`).relative;
  if (root !== value.path || !['file', 'directory'].includes(value.kind) || !Array.isArray(value.files)) throw new Error(`${label}路径或类型无效`);
  const seen = new Set();
  for (const file of value.files) {
    assertFields(file, ['path', 'bytes', 'sha256'], `${label}文件`);
    const path = checkedPath(repo, file.path, `${label}文件路径`).relative;
    const key = pathKey(path);
    if (path !== file.path || seen.has(key) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) throw new Error(`${label}文件身份无效`);
    if (value.kind === 'file' ? key !== pathKey(root) : !key.startsWith(`${pathKey(root)}/`)) throw new Error(`${label}文件越出声明路径`);
    seen.add(key);
  }
  if (value.kind === 'file' && value.files.length !== 1) throw new Error(`${label}单文件记录无效`);
  return root;
}

/** 将候选内必需文件解析为项目相对路径，拒绝穿越及空路径段。 */
function requiredPath(repo, artifact, value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.split('/').some((part) => !part || part === '.' || part === '..') || /^[a-zA-Z]:/.test(value) || value.startsWith('/')) throw new Error('必需文件必须是候选目录内的相对路径');
  if (artifact.kind !== 'directory') throw new Error('单文件候选不能声明候选目录内的必需文件');
  const target = checkedPath(repo, `${artifact.path}/${value}`, '必需文件').relative;
  if (!pathKey(target).startsWith(`${pathKey(artifact.path)}/`)) throw new Error('必需文件越出候选目录');
  return target;
}

/** 必需入口只能来自真实候选文件，并且不能用空文件代替有效入口。 */
function assertArtifact(repo, artifact, requiredFiles) {
  if (!artifact.files.length || !artifact.files.some((item) => item.bytes > 0)) throw new Error('候选为空，不能建立文件快照');
  if (!Array.isArray(requiredFiles)) throw new Error('候选必需文件列表无效');
  const seen = new Set();
  for (const item of requiredFiles) {
    const target = requiredPath(repo, artifact, item);
    const key = pathKey(target);
    if (seen.has(key)) throw new Error('候选必需文件不得重复');
    seen.add(key);
    if (!artifact.files.some((file) => pathKey(file.path) === key && file.bytes > 0)) throw new Error(`候选缺少非空必需文件：${item}`);
  }
}

/** 输出显式候选与至少一个输入的确定性文件身份，不挑选构建目录。 */
export function snapshotCandidate(repo, { artifact, inputs, requiredFiles = [] }) {
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('至少指定一个实际输入路径');
  if (!Array.isArray(requiredFiles)) throw new Error('必需文件必须为数组');
  const actualArtifact = inspectPath(repo, artifact, '候选');
  assertArtifact(repo, actualArtifact, requiredFiles);
  const seen = new Set();
  const actualInputs = inputs.map((input) => {
    const item = inspectPath(repo, input, '输入');
    const key = pathKey(item.path);
    if (seen.has(key)) throw new Error('输入路径不得重复');
    seen.add(key);
    return item;
  });
  return { schemaVersion: SCHEMA, operation: 'snapshot', ok: true, artifact: actualArtifact, inputs: actualInputs, requiredFiles, verificationScope: SCOPE, limitations: [...LIMITATIONS] };
}

/** 仅解开真实命令采集的成功输出；错误命令和无效 JSON 不得成为基线。 */
function unwrapSnapshot(value) {
  if (!isObject(value)) throw new Error('候选快照必须是 JSON 对象');
  if (value.schemaVersion !== 'command-capture-v1') return value;
  if (value.exitCode !== 0 || typeof value.command !== 'string' || !value.command.trim() || typeof value.stdout !== 'string' || typeof value.stderr !== 'string') throw new Error('候选快照的命令采集记录无效或未成功');
  try { return JSON.parse(value.stdout); } catch { throw new Error('候选快照采集输出不是有效 JSON'); }
}

/** 比较实际文件集合及字节摘要；目录枚举顺序不影响结果。 */
function sameEntry(actual, expected) {
  if (pathKey(actual.path) !== pathKey(expected.path) || actual.kind !== expected.kind || actual.files.length !== expected.files.length) return false;
  const normalize = (files) => files.map((file) => ({ path: pathKey(file.path), bytes: file.bytes, sha256: file.sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  return JSON.stringify(normalize(actual.files)) === JSON.stringify(normalize(expected.files));
}

/** 逐项复核冻结的显式输入、候选和必需入口；结果不证明构建因果。 */
export function checkCandidateSnapshot(repo, record) {
  const snapshot = unwrapSnapshot(record);
  assertFields(snapshot, ['schemaVersion', 'operation', 'ok', 'artifact', 'inputs', 'requiredFiles', 'verificationScope', 'limitations'], '候选快照');
  if (snapshot.schemaVersion !== SCHEMA || snapshot.operation !== 'snapshot' || snapshot.ok !== true || snapshot.verificationScope !== SCOPE || !Array.isArray(snapshot.limitations) || JSON.stringify(snapshot.limitations) !== JSON.stringify(LIMITATIONS)) throw new Error('候选快照版本、状态或验证范围无效');
  validateEntry(repo, snapshot.artifact, '候选');
  if (!Array.isArray(snapshot.inputs) || !snapshot.inputs.length) throw new Error('候选快照缺少输入');
  assertArtifact(repo, snapshot.artifact, snapshot.requiredFiles);
  const seen = new Set();
  for (const input of snapshot.inputs) {
    const key = pathKey(validateEntry(repo, input, '输入'));
    if (seen.has(key)) throw new Error('候选快照输入路径不得重复');
    seen.add(key);
    if (!sameEntry(inspectPath(repo, input.path, '输入'), input)) throw new Error(`输入文件身份或集合已变化：${input.path}`);
  }
  const artifact = inspectPath(repo, snapshot.artifact.path, '候选');
  assertArtifact(repo, artifact, snapshot.requiredFiles);
  if (!sameEntry(artifact, snapshot.artifact)) throw new Error(`候选文件身份或集合已变化：${artifact.path}`);
  return { schemaVersion: SCHEMA, operation: 'check', ok: true, artifact: artifact.path, inputs: snapshot.inputs.map((input) => input.path), requiredFiles: snapshot.requiredFiles, verificationScope: SCOPE, limitations: [...LIMITATIONS] };
}

/** 命令行严格要求显式产物与输入；结果仅输出 stdout，不写项目文件。 */
function main(args) {
  const [operation, ...tokens] = args;
  if (!['snapshot', 'check'].includes(operation)) throw new Error('用法：candidate-files.mjs <snapshot|check> --repo <目录> ...');
  const flags = parseFlags(tokens, operation === 'snapshot'
    ? { single: ['repo', 'artifact'], repeat: ['input', 'require'] }
    : { single: ['repo', 'snapshot'], repeat: [] });
  if (!flags.repo || typeof flags.repo !== 'string') throw new Error('必须提供 --repo 项目目录');
  const repo = resolve(flags.repo);
  if (operation === 'snapshot') {
    if (typeof flags.artifact !== 'string' || !flags.artifact) throw new Error('必须显式提供 --artifact 候选路径');
    return snapshotCandidate(repo, { artifact: flags.artifact, inputs: flags.input ?? [], requiredFiles: flags.require ?? [] });
  }
  if (typeof flags.snapshot !== 'string' || !flags.snapshot) throw new Error('必须提供 --snapshot 快照路径');
  return checkCandidateSnapshot(repo, readCheckedJson(repo, flags.snapshot, '候选快照'));
}

if (isDirectEntry(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) {
    process.stdout.write(`${JSON.stringify({ schemaVersion: SCHEMA, operation: process.argv[2] ?? null, ok: false, error: error.message, verificationScope: SCOPE, limitations: LIMITATIONS }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
