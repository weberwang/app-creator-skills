/** 验证可复用渠道源码真正进入正式工程，并保护现有工程与安装目录。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { installChannelSdks, planChannelSdkInstallation } from '../skills/app-release/scripts/install-channel-sdks.mjs';
import { pathToFileURL } from 'node:url';

/** 每个用例仅清理经过绝对路径与独占前缀核验的临时工程。 */
function project(t) {
  const root = mkdtempSync(join(tmpdir(), 'channel-sdk-install-'));
  t.after(() => {
    assert.equal(dirname(realpathSync(root)), realpathSync(tmpdir()));
    assert.ok(basename(root).startsWith('channel-sdk-install-'));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

for (const engine of ['unity', 'cocos', 'phaser', 'threejs']) {
  test(`${engine} 单栈安装后可独立复制渠道源码，保留本引擎接口和共享实现`, async (t) => {
    const root = project(t);
    installSkills({ projectRoot: root, stacks: [engine] });
    const entry = join(root, '.agents/skills/app-release/scripts/install-channel-sdks.mjs');
    const installed = await import(pathToFileURL(entry).href);
    const dry = installed.installChannelSdks({ projectRoot: root, engine, dryRun: true });
    assert.equal(dry.changed, false);
    assert.equal(existsSync(dry.destination), false);
    const first = installed.installChannelSdks({ projectRoot: root, engine });
    assert.equal(first.changed, true);
    assert.ok(first.files.length >= 4, '必须分发接口、入口及两个渠道真实实现');
    for (const file of first.files) {
      assert.deepEqual(readFileSync(file.target), readFileSync(file.source));
      const name = relative(first.destination, file.target).replaceAll('\\', '/');
      assert.ok(!name.startsWith('engines/') || name.startsWith(`engines/${engine}/`), '不能把其他引擎接线混入正式工程');
    }
    assert.equal(installed.installChannelSdks({ projectRoot: root, engine }).changed, false);
  });
}

test('发现已有源码差异时在写入前拒绝，保留用户内容', (t) => {
  const root = project(t);
  const plan = planChannelSdkInstallation({ projectRoot: root, engine: 'threejs' });
  const conflict = plan.files.at(-1);
  mkdirSync(dirname(conflict.target), { recursive: true });
  writeFileSync(conflict.target, '用户实现');
  assert.throws(() => installChannelSdks({ projectRoot: root, engine: 'threejs' }), /已存在且不同/);
  assert.equal(readFileSync(conflict.target, 'utf8'), '用户实现');
  for (const file of plan.files.slice(0, -1)) assert.equal(existsSync(file.target), false);
});

test('拒绝越界、元数据目录和无效引擎，不为错误配置创建目录', (t) => {
  const root = project(t);
  for (const output of ['..', '../other-project', '.', '.agents/channel', '.git/channel']) {
    assert.throws(() => installChannelSdks({ projectRoot: root, engine: 'phaser', output }), /工程内部|元数据/);
  }
  assert.throws(() => installChannelSdks({ projectRoot: root, engine: 'google-play' }), /引擎必须/);
  assert.equal(existsSync(join(root, 'src')), false);
});

test('拒绝链接目录，不能通过输出重定向写入其他工程', (t) => {
  const root = project(t);
  const outside = project(t);
  symlinkSync(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => installChannelSdks({ projectRoot: root, engine: 'cocos', output: 'linked/channel' }), /符号链接/);
  assert.equal(existsSync(join(outside, 'channel')), false);
});

test('父路径被文件占用时完整预检失败，相同文件允许安全复用', (t) => {
  const root = project(t);
  writeFileSync(join(root, 'src'), '占用');
  assert.throws(() => installChannelSdks({ projectRoot: root, engine: 'phaser' }), /父路径/);
  assert.equal(readFileSync(join(root, 'src'), 'utf8'), '占用');
});
