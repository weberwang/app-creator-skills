/** 生成工具的文件读写只对 Windows 打开文件时的短暂占用进行有限重试。 */
import { readFileSync as readNative, writeFileSync as writeNative } from 'node:fs';

/** 同步 CLI 在失败退避时让出 CPU；单次等待和总重试均有上限。 */
function pause(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

/** 注入底层操作便于复现占用；权限拒绝、路径错误和已开始的写入都不能重试。 */
export function createMigrationFileIo({ platform = process.platform, read = readNative, write = writeNative, wait = pause } = {}) {
  /** open 失败时还没有写入数据，因此可安全重做；其余错误保留原始诊断。 */
  function invoke(operation, args) {
    for (let attempt = 0; ; attempt += 1) {
      try { return operation(...args); }
      catch (error) {
        if (platform !== 'win32' || error?.syscall !== 'open'
          || !['UNKNOWN', 'EBUSY'].includes(error.code) || attempt >= 5) throw error;
        wait(Math.min(20 * 2 ** attempt, 200));
      }
    }
  }
  return {
    readFileSync: (...args) => invoke(read, args),
    writeFileSync: (...args) => invoke(write, args),
  };
}

/** 只供迁移和索引生成使用，不改变项目运行时或安装器的文件行为。 */
export const { readFileSync, writeFileSync } = createMigrationFileIo();
