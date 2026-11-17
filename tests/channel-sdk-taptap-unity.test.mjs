/** 编译 Unity 渠道源码与离线 SDK 替身，验证 TapTap 可复用能力。 */
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = fileURLToPath(new URL('..', import.meta.url));

/** 编译全部可选模块并执行生命周期和接口行为验证。 */
test('TapTap Unity 具名 SDK 独立编译与离线行为', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-taptap-unity-'));
  t.after(() => {
    const actual = realpathSync(root);
    assert.equal(dirname(actual), realpathSync(tmpdir()));
    assert.ok(basename(actual).startsWith('app-creator-taptap-unity-'));
    rmSync(actual, { recursive: true, force: true });
  });
  cpSync(join(repo, 'tests/fixtures/taptap-unity'), root, { recursive: true });
  const source = join(repo, 'skills/app-release/assets/channel-sdks/unity');
  for (const name of ['ChannelBase.cs', 'ChannelSelector.cs', 'IChannelCapabilities.cs', 'WechatMinigameChannel.cs', 'CrazyGamesChannel.cs', 'TapTap'])
    cpSync(join(source, name), join(root, 'sdk', name), { recursive: true });
  const result = spawnSync('dotnet', ['run', '--project', 'TapTapFixture.csproj', '--configuration', 'Release'], {
    cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true,
    env: { ...process.env, DOTNET_CLI_HOME: join(root, '.dotnet'), DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', NUGET_PACKAGES: join(root, '.nuget') },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /TapTap Unity 离线验证通过/);
});

/** 只保留所选官方模块的替身，确保其他官方包不是隐藏的编译依赖。 */
for (const login of [false, true]) {
  test(`TapTap Unity 仅安装 Core${login ? ' 与 Login' : ''} 时可独立编译`, (t) => {
    const root = mkdtempSync(join(tmpdir(), 'app-creator-taptap-unity-'));
    t.after(() => {
      const actual = realpathSync(root);
      assert.equal(dirname(actual), realpathSync(tmpdir()));
      assert.ok(basename(actual).startsWith('app-creator-taptap-unity-'));
      rmSync(actual, { recursive: true, force: true });
    });
    cpSync(join(repo, 'tests/fixtures/taptap-unity'), root, { recursive: true });
    const source = join(repo, 'skills/app-release/assets/channel-sdks/unity');
    for (const name of ['ChannelBase.cs', 'ChannelSelector.cs', 'IChannelCapabilities.cs', 'WechatMinigameChannel.cs', 'CrazyGamesChannel.cs', 'TapTap'])
      cpSync(join(source, name), join(root, 'sdk', name), { recursive: true });
    const project = join(root, 'TapTapFixture.csproj');
    writeFileSync(project, readFileSync(project, 'utf8').replace(/<DefineConstants>[^<]*<\/DefineConstants>/,
      `<DefineConstants>APP_CREATOR_TAPTAP_CORE${login ? ';APP_CREATOR_TAPTAP_LOGIN' : ''}</DefineConstants>`));
    const stubs = join(root, 'TapSdkStubs.cs');
    const contents = readFileSync(stubs, 'utf8');
    writeFileSync(stubs, contents.slice(0, contents.indexOf(login ? 'namespace TapSDK.Compliance' : 'namespace TapSDK.Login')));
    writeFileSync(join(root, 'Program.cs'), '/// <summary>验证单模块编译。</summary>\npublic static class Program { /// <summary>运行编译结果。</summary>\npublic static void Main() { } }');
    const result = spawnSync('dotnet', ['build', 'TapTapFixture.csproj', '--configuration', 'Release'], {
      cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true,
      env: { ...process.env, DOTNET_CLI_HOME: join(root, '.dotnet'), DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', NUGET_PACKAGES: join(root, '.nuget') },
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });
}
