import { readFileSync } from 'node:fs';
import { repoPath, WorkflowError } from './io.mjs';

/** 校验结构化命令采集，普通非空文本日志仍可作为输出。 */
export function validateCommandCapture(repo, path, entry) {
  const text = readFileSync(repoPath(repo, path).absolute, 'utf8');
  if (!text.trim()) throw new WorkflowError('验收命令输出为空，必须提供真实非空日志或命令采集记录');
  let capture;
  try { capture = JSON.parse(text); } catch { return; }
  if (!capture || typeof capture !== 'object' || Array.isArray(capture)) return;
  if (!String(capture.schemaVersion ?? '').startsWith('command-capture') && !('stdout' in capture && 'stderr' in capture && 'command' in capture && 'exitCode' in capture)) return;
  if (capture.schemaVersion !== 'command-capture-v1' || capture.command !== entry.command || capture.exitCode !== entry.exitCode ||
      typeof capture.stdout !== 'string' || typeof capture.stderr !== 'string') {
    throw new WorkflowError('命令采集记录与实际验收命令或退出码不一致');
  }
}
