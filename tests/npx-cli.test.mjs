import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parseNpxArgs, runNpxInstaller } from '../packages/cli/cli.mjs';

const CONFIG = Object.freeze({ repository: 'fixture/app-creator-skills', ref: 'stable' });

/** 未生成引导器时也能查看帮助，保证干净源码检出的测试不依赖残留构建产物。 */
test('帮助入口不依赖 generated 引导器', (t) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'app-creator-npx-help-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const entry = resolve(directory, 'cli.mjs');
  copyFileSync(new URL('../packages/cli/cli.mjs', import.meta.url), entry);
  const result = spawnSync(process.execPath, [entry, '--help'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npx app-creator-skills/);
});

/** 建立假安装器和可检查终端，确保这些用例不会访问 GitHub 或修改项目。 */
function createHarness({ isTTY = false, answer = '' } = {}) {
  const calls = [];
  const output = [];
  const prompts = [];
  const io = {
    isTTY,
    write(message) { output.push(message); },
    error(message) { output.push(message); },
    async prompt(message) { prompts.push(message); return answer; },
  };
  const bootstrap = async (args) => {
    calls.push(args);
    return {
      changed: true,
      destination: '/fixture/project/.agents/skills',
      entries: [{ action: 'install' }, { action: 'skip' }],
      remote: { dryRun: args.includes('--dry-run'), stacks: args[args.indexOf('--stack') + 1].split(',') },
    };
  };
  return { calls, io, output, prompts, bootstrap };
}

test('位置技术栈使用当前目录、配置仓库和配置 ref', async () => {
  const cwd = 'C:\\fixture\\project';
  const harness = createHarness();
  await runNpxInstaller(['flutter'], {
    cwd, config: CONFIG, env: {}, io: harness.io, bootstrap: harness.bootstrap,
  });
  assert.deepEqual(harness.calls, [[
    resolve(cwd), '--repo', CONFIG.repository, '--stack', 'flutter', '--ref', 'stable',
  ]]);
  assert.match(harness.output[0], /flutter/);
});

test('逗号多栈会去重，--dir、--dry-run 和 --replace 映射到共享安装器', async () => {
  const cwd = 'C:\\fixture\\launcher';
  const harness = createHarness();
  await runNpxInstaller(['unity,cocos,unity', '--dir', '..\\game', '--dry-run', '--replace'], {
    cwd, config: CONFIG, env: {}, io: harness.io, bootstrap: harness.bootstrap,
  });
  assert.deepEqual(harness.calls, [[
    resolve(cwd, '..\\game'), '--repo', CONFIG.repository, '--stack', 'unity,cocos', '--ref', 'stable', '--dry-run', '--replace',
  ]]);
  assert.match(harness.output[0], /预览完成/);
});

test('--stack/-s 与 --dir/-d 可显式使用高级同义参数', async () => {
  const harness = createHarness();
  await runNpxInstaller(['-s', 'threejs,phaser', '-d', 'game'], {
    cwd: '/fixture', config: CONFIG, env: {}, io: harness.io, bootstrap: harness.bootstrap,
  });
  assert.deepEqual(harness.calls[0], [
    resolve('/fixture/game'), '--repo', CONFIG.repository, '--stack', 'threejs,phaser', '--ref', 'stable',
  ]);
});

test('帮助不读取配置也不调用安装器', async () => {
  const harness = createHarness();
  const result = await runNpxInstaller(['--help'], {
    config: { invalid: true }, env: {}, io: harness.io, bootstrap: harness.bootstrap,
  });
  assert.deepEqual(result, { help: true });
  assert.equal(harness.calls.length, 0);
  assert.match(harness.output[0], /用法/);
});

test('空仓库配置在调用安装器前报错，--repo 可以临时覆盖', async () => {
  const emptyHarness = createHarness();
  await assert.rejects(runNpxInstaller(['flutter'], {
    config: { repository: '', ref: '' }, env: {}, io: emptyHarness.io, bootstrap: emptyHarness.bootstrap,
  }), /远程地址待配置/);
  assert.equal(emptyHarness.calls.length, 0);

  const overrideHarness = createHarness();
  await runNpxInstaller(['flutter', '--repo', 'temporary/repository'], {
    config: { repository: '', ref: '' }, env: {}, io: overrideHarness.io, bootstrap: overrideHarness.bootstrap,
  });
  assert.equal(overrideHarness.calls[0][2], 'temporary/repository');
});

test('命令行仓库覆盖环境变量和包配置', () => {
  const parsed = parseNpxArgs(['flutter', '--repo', 'temporary/repository'], {
    config: CONFIG, env: { APP_CREATOR_SKILLS_REPO: 'environment/repository' },
  });
  assert.equal(parsed.repo, 'temporary/repository');
  const envParsed = parseNpxArgs(['flutter'], {
    config: CONFIG, env: { APP_CREATOR_SKILLS_REPO: 'environment/repository' },
  });
  assert.equal(envParsed.repo, 'environment/repository');
});

test('拒绝未知、重复、冲突和不完整参数，不把目录误认成技术栈', () => {
  const options = { config: CONFIG, env: {} };
  assert.throws(() => parseNpxArgs(['unreal'], options), /无法识别技术栈/);
  assert.throws(() => parseNpxArgs(['flutter', 'unity'], options), /只接受一个位置参数/);
  assert.throws(() => parseNpxArgs(['flutter', '--stack', 'unity'], options), /不能同时使用/);
  assert.throws(() => parseNpxArgs(['--stack', 'flutter', '-s', 'unity'], options), /只能指定一次/);
  assert.throws(() => parseNpxArgs(['--unknown'], options), /未知安装选项/);
  assert.throws(() => parseNpxArgs(['--dir'], options), /需要一个值/);
  assert.throws(() => parseNpxArgs(['unity,all'], options), /all 必须单独指定/);
});

test('交互终端根据实际输入安装选中的栈', async () => {
  const harness = createHarness({ isTTY: true, answer: '2,5' });
  await runNpxInstaller([], {
    cwd: '/fixture/project', config: CONFIG, env: {}, io: harness.io, bootstrap: harness.bootstrap,
  });
  assert.equal(harness.prompts.length, 1);
  assert.equal(harness.calls[0][harness.calls[0].indexOf('--stack') + 1], 'cocos,flutter');
});

test('非交互终端缺少技术栈时输出帮助并立即失败，不默认安装全部', async () => {
  const harness = createHarness();
  await assert.rejects(runNpxInstaller([], {
    config: CONFIG, env: {}, io: harness.io, bootstrap: harness.bootstrap,
  }), /非交互终端必须/);
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.prompts.length, 0);
  assert.match(harness.output[0], /用法/);
  assert.deepEqual(parseNpxArgs([], { config: CONFIG, env: {} }).stacks, []);
});

test('all 只在明确指定时展开为全部技术栈', () => {
  const parsed = parseNpxArgs(['all'], { config: CONFIG, env: {} });
  assert.deepEqual(parsed.stacks, ['unity', 'cocos', 'phaser', 'threejs', 'flutter']);
});
