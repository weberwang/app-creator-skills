/** 复现 Windows 打开文件短暂失败，确认不会扩大为权限绕过或重复部分写入。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMigrationFileIo } from '../scripts/migration/file-io.mjs';

test('Windows open 短暂占用可恢复，读写参数与返回值不变', () => {
  let attempts = 0;
  const delays = [];
  const io = createMigrationFileIo({ platform: 'win32', wait: (ms) => delays.push(ms),
    write: (...args) => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error('短暂占用'), { syscall: 'open', code: 'UNKNOWN' });
      assert.deepEqual(args, ['target.md', '内容', 'utf8']);
      return 'written';
    }, read: (...args) => args.join(':') });
  assert.equal(io.writeFileSync('target.md', '内容', 'utf8'), 'written');
  assert.equal(io.readFileSync('target.md', 'utf8'), 'target.md:utf8');
  assert.deepEqual(delays, [20, 40]);
});

test('持久占用有界退出，权限错误和部分写入不重做', () => {
  for (const [platform, syscall, code, expected] of [
    ['win32', 'open', 'EBUSY', 6], ['win32', 'write', 'UNKNOWN', 1],
    ['win32', 'open', 'EACCES', 1], ['linux', 'open', 'UNKNOWN', 1],
  ]) {
    let attempts = 0;
    const failure = Object.assign(new Error('保留诊断'), { syscall, code });
    const io = createMigrationFileIo({ platform, wait: () => {}, write: () => { attempts += 1; throw failure; } });
    assert.throws(() => io.writeFileSync('target.md', '内容'), (error) => error === failure);
    assert.equal(attempts, expected);
  }
});
