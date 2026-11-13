import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const provider of ['AdMob', 'Max']) {
 for (const platform of ['Android', 'iOS']) {
  test(`Unity ${platform} ${provider} 离线编译和行为`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'app-creator-unity-'));
    try {
      cpSync(resolve('tests/fixtures/mobile-sdk-unity'), dir, { recursive: true });
      cpSync(resolve('skills/app-domain-toolkit/assets/mobile-sdks/unity'), join(dir, 'sdk'), { recursive: true });
      const result = spawnSync('dotnet', ['run', '--project', join(dir, 'Fixture.csproj'), `-p:SdkProvider=${provider}`, `-p:SdkPlatform=${platform}`], { encoding: 'utf8', timeout: 120000 });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
      assert.match(result.stdout, /PASS/);
    } finally {
      if (dirname(dir) === resolve(tmpdir()) && basename(dir).startsWith('app-creator-unity-')) rmSync(dir, { recursive: true, force: true });
    }
  });
 }
}
