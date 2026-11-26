import { readFileSync } from 'node:fs';
import { repoPath, WorkflowError } from './io.mjs';
import { assertRunnableCommand } from './runnable-command.mjs';

/** 读取可识别的结构化采集，普通非空日志返回空值。 */
export function readCommandCapture(repo, path) {
  const text = readFileSync(repoPath(repo, path).absolute, 'utf8');
  if (!text.trim()) throw new WorkflowError('验收命令输出为空，必须提供真实非空日志或命令采集记录');
  let capture;
  try { capture = JSON.parse(text); } catch { return null; }
  if (!capture || typeof capture !== 'object' || Array.isArray(capture)) return null;
  if (!String(capture.schemaVersion ?? '').startsWith('command-capture') && !('stdout' in capture && 'stderr' in capture && 'command' in capture && 'exitCode' in capture)) return null;
  return capture;
}

/** 校验结构化命令采集，普通非空文本日志仍可作为输出。 */
export function validateCommandCapture(repo, path, entry) {
  assertRunnableCommand(entry.command, '结果命令');
  const capture = readCommandCapture(repo, path);
  if (!capture) return;
  assertRunnableCommand(capture.command, '采集命令');
  if (capture.schemaVersion !== 'command-capture-v1' || capture.command !== entry.command || capture.exitCode !== entry.exitCode ||
      typeof capture.stdout !== 'string' || typeof capture.stderr !== 'string') {
    throw new WorkflowError('命令采集记录与实际验收命令或退出码不一致');
  }
}
