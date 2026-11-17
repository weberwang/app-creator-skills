import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';

/** 在独立临时目录编译真实适配器，以替身驱动官方 SDK 的成功与异常回调。 */
for (const platform of ['Android', 'iOS']) {
  test(`Unity ${platform} TapADN 聚合授权和广告生命周期`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'dirichlet-unity-'));
    try {
      cpSync(resolve('tests/fixtures/dirichlet-unity'), directory, { recursive: true });
      const unity = resolve('skills/app-domain-toolkit/assets/mobile-sdks/unity');
      for (const file of ['MobileSdkContracts.cs', 'SdkInitialization.cs', 'DirichletManager.cs', 'DirichletAds.cs']) {
        cpSync(join(unity, file), join(directory, file));
      }
      const result = spawnSync('dotnet', ['run', '--project', join(directory, 'Fixture.csproj'), `-p:SdkPlatform=${platform}`], { encoding: 'utf8', timeout: 120000 });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
      assert.match(result.stdout, /PASS/);
    } finally {
      // Windows 上仅递归清理本用例独占且仍位于系统临时目录的真实路径。
      assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
      assert.ok(basename(realpathSync(directory)).startsWith('dirichlet-unity-'));
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
