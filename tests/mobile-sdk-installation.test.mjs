/** 验证移动 SDK 的单栈交付、广告选择与安装安全边界。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';
import { installMobileSdks, planMobileSdkInstallation } from '../skills/app-domain-toolkit/scripts/sdk/install-mobile-sdks.mjs';

/** 创建独占临时项目并校验清理目标，防止误删其他目录。 */
function projectFor(t) {
  const project = mkdtempSync(join(tmpdir(), 'mobile-sdk-install-'));
  t.after(() => {
    assert.equal(dirname(realpathSync(project)), realpathSync(tmpdir()));
    assert.ok(basename(project).startsWith('mobile-sdk-install-'));
    rmSync(project, { recursive: true, force: true });
  });
  return project;
}

for (const engine of ['unity', 'cocos', 'phaser', 'threejs']) {
  for (const adProvider of ['admob', 'max']) {
    test(`${engine} 安装 ${adProvider} 并重复执行`, (t) => {
      const projectRoot = projectFor(t);
      const options = { projectRoot, engine, adProvider };
      const preview = installMobileSdks({ ...options, dryRun: true });
      assert.equal(preview.changed, false);
      assert.deepEqual(readdirSync(projectRoot), []);
      const result = installMobileSdks(options);
      assert.equal(result.changed, true);
      assert.ok(result.files.length > 2);
      for (const file of result.files) assert.deepEqual(readFileSync(file.target), file.contents);
      const selection = JSON.parse(readFileSync(join(result.destination, 'installed-sdk-selection.json'), 'utf8'));
      assert.equal(selection.engine, engine);
      assert.equal(selection.adProvider, adProvider);
      if (engine === 'cocos') {
        const provider = adProvider === 'max' ? 'app-lovin-max' : 'admob';
        const rejected = adProvider === 'max' ? 'admob' : 'app-lovin-max';
        for (const platform of ['android', 'ios']) {
          assert.ok(existsSync(join(result.nativeDestination, 'cocos/native', platform, 'providers', provider)));
          assert.ok(!existsSync(join(result.nativeDestination, 'cocos/native', platform, 'providers', rejected)));
        }
      }
      if (['phaser', 'threejs'].includes(engine)) {
        const entry = readFileSync(join(result.destination, 'installed-mobile-sdks.ts'), 'utf8');
        const chosen = adProvider === 'admob' ? '@capacitor-community/admob' : 'cordova-plugin-applovin-max';
        const rejected = adProvider === 'admob' ? 'cordova-plugin-applovin-max' : '@capacitor-community/admob';
        assert.ok(selection.dependencies[chosen]);
        assert.equal(selection.dependencies[rejected], undefined);
        assert.ok(!entry.includes(rejected));
        assert.match(entry, adProvider === 'admob' ? /import\('@capacitor-community\/admob'\)/ : /globalThis.*applovin/s);
      }
      const again = installMobileSdks(options);
      assert.equal(again.changed, false);
      assert.ok(again.files.every((file) => file.action === 'skip'));
      assert.throws(() => installMobileSdks({ ...options, adProvider: adProvider === 'admob' ? 'max' : 'admob' }), /已存在且不同/);
    });
  }
}

test('目标冲突在写入前整体拒绝，敏感目录与越界路径被拒绝', (t) => {
  const projectRoot = projectFor(t);
  const options = { projectRoot, engine: 'phaser', adProvider: 'admob' };
  const plan = planMobileSdkInstallation(options);
  const conflict = plan.files.at(-1).target;
  mkdirSync(dirname(conflict), { recursive: true });
  writeFileSync(conflict, '已有工程内容');
  assert.throws(() => installMobileSdks(options), /已存在且不同/);
  assert.ok(plan.files.filter((file) => file.target !== conflict).every((file) => !existsSync(file.target)));
  assert.equal(readFileSync(conflict, 'utf8'), '已有工程内容');
  for (const output of ['../outside', '.git/sdk', '.agents/sdk']) {
    assert.throws(() => planMobileSdkInstallation({ ...options, output }), /工程业务子目录/);
  }
  assert.throws(() => planMobileSdkInstallation({ ...options, engine: 'unknown' }), /引擎必须/);
  assert.throws(() => planMobileSdkInstallation({ ...options, adProvider: 'both' }), /二选一/);
});

for (const engine of ['unity', 'cocos', 'phaser', 'threejs']) {
  test(`${engine} 的已安装技能可独立复制 SDK`, async (t) => {
    const projectRoot = projectFor(t);
    installSkills({ projectRoot, stacks: [engine] });
    const installedScript = join(projectRoot, '.agents/skills/app-domain-toolkit/scripts/sdk/install-mobile-sdks.mjs');
    assert.ok(existsSync(installedScript));
    const guide = join(projectRoot, '.agents/skills/app-domain-toolkit/references/mobile-sdk-integration.md');
    assert.match(readFileSync(guide, 'utf8'), /AdMob 与 AppLovin MAX/);
    assert.match(readFileSync(join(projectRoot, '.agents/skills/app-architecture/SKILL.md'), 'utf8'), /mobile-sdk-integration\.md/);
    const installed = await import(pathToFileURL(installedScript).href);
    const result = installed.installMobileSdks({ projectRoot, engine, adProvider: 'admob' });
    assert.ok(result.changed);
    assert.ok(result.files.filter((file) => file.source).every((file) => file.source.startsWith(join(projectRoot, '.agents/skills'))));
    for (const file of result.files) assert.deepEqual(readFileSync(file.target), file.contents);
  });
}
