import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectWorkReferencePaths, loadPackage } from './runtime/artifacts.mjs';
import { repoPath, WorkflowError } from './runtime/io.mjs';
import { pathMatch } from './runtime/validation.mjs';
import { inspectWork, loadWork } from './runtime/workflow.mjs';

/** 显式运行当前批次冻结命令，并将原始输出与退出码写入不可覆盖的采集文件。 */
function captureCommand(args) {
  if (args.length !== 10 || args.filter((_, index) => index % 2 === 0).join(' ') !== '--repo --work-item --unit --index --output') {
    throw new WorkflowError('用法：--repo <目录> --work-item <路径> --unit <ID> --index <从 1 开始的序号> --output <路径>');
  }
  const repo = resolve(args[1]);
  const work = loadWork(repo, args[3]);
  if (work.globalState !== 'IMPLEMENTING') throw new WorkflowError('只能采集 IMPLEMENTING 阶段的命令');
  const inspection = inspectWork(repo, work);
  if (inspection.blocking.length || !inspection.activeBatch?.includes(args[5])) throw new WorkflowError('执行单元不在有效的活动批次');
  const pack = loadPackage(repo, work);
  const unit = pack.executionUnits.find((item) => item.unitId === args[5]);
  const index = Number(args[7]);
  if (!unit || !Number.isSafeInteger(index) || index < 1 || index > unit.acceptanceCommands.length) throw new WorkflowError('无效的命令序号');
  const output = repoPath(repo, args[9], '命令输出路径');
  if (!pathMatch(output.relative, `${repoPath(repo, work.evidenceRoot).relative}/**`)) throw new WorkflowError('命令输出必须位于 evidenceRoot');
  const key = (path) => process.platform === 'win32' ? path.toLowerCase() : path;
  const reserved = new Set([args[3], `${work.evidenceRoot}/execution-state.json`, `${work.evidenceRoot}/manifest.json`, ...collectWorkReferencePaths(work, repo), ...pack.executionUnits.map((item) => item.resultPath)].map((path) => key(repoPath(repo, path).relative)));
  if (reserved.has(key(output.relative))) throw new WorkflowError('命令输出不能占用工作流记录路径');
  mkdirSync(dirname(output.absolute), { recursive: true });
  // 先独占创建输出，确保不会执行命令后才发现已有记录被覆盖。
  const descriptor = openSync(output.absolute, 'wx', 0o600);
  const command = unit.acceptanceCommands[index - 1];
  let result;
  try {
    const options = { cwd: repo, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 };
    // PowerShell 默认把原生命令的非零退出码压成 1，这里保留真实退出码。
    const powershellCommand = `& {\n${command}\n}\n$__workflowSuccess = $?\nif ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\nif (-not $__workflowSuccess) { exit 1 }`;
    result = process.platform === 'win32'
      ? spawnSync('pwsh.exe', ['-NoProfile', '-Command', powershellCommand], options)
      : spawnSync(command, { ...options, shell: true });
    const exitCode = Number.isSafeInteger(result.status) ? result.status : 1;
    writeFileSync(descriptor, `${JSON.stringify({ schemaVersion: 'command-capture-v1', command, exitCode, stdout: result.stdout ?? '', stderr: `${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}` }, null, 2)}\n`);
    return result.error ? 1 : exitCode;
  } finally { closeSync(descriptor); }
}

try { process.exitCode = captureCommand(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
