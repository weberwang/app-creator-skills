import { closeSync, openSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { repoPath, WorkflowError } from './io.mjs';

/** 按单个 Work Item 串行化控制器写入，防止同批结果提交互相覆盖。 */
export async function withWorkLock(repo, workItem, operation) {
  const work = repoPath(repo, workItem, 'Work Item 锁定路径');
  const lockRelative = `${work.relative}.lock`;
  const lock = repoPath(repo, lockRelative, 'Work Item 锁文件');
  mkdirSync(dirname(lock.absolute), { recursive: true });
  // 再检查一次父级，确保建目录后锁路径仍在仓库内且无符号链接逃逸。
  const safeLock = repoPath(repo, lockRelative, 'Work Item 锁文件');
  let descriptor;
  try {
    descriptor = openSync(safeLock.absolute, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new WorkflowError(`Work Item 正被其他控制器修改，请重试：${work.relative}`, 'BUSY');
    throw new WorkflowError(`无法取得 Work Item 锁：${error.message}`, 'LOCK_FAILED');
  }

  try {
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, workItem: work.relative })}\n`);
    return await operation();
  } finally {
    closeSync(descriptor);
    // 不回收遗留锁；只由成功创建该锁的调用在 finally 中释放。
    unlinkSync(safeLock.absolute);
  }
}
