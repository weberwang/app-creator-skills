import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';

const managed = process.env.UNITY_ENGINE_MANAGED;
const cases = [
  { platform: 'Android', version: '5.3.3.0', source: process.env.DIRICHLET_UNITY_SOURCE, sdk: '15b65a1711c9d42f3817b1994160df18', types: '3cf364ea939d34ea9ad134ba33172355' },
  { platform: 'iOS', version: '5.3.0.1', source: process.env.DIRICHLET_UNITY_SOURCE_IOS, sdk: '1f60540488d384f8ba1acd0f7e160d00', types: '01f550c1ee55f4bb69fb1110c49b53d8' },
];

for (const item of cases) {
/** 将真实官方源码和 Unity 程序集放进临时编译工程，验证适配器没有依赖臆造的 SDK 接口。 */
test(`真实 TapADN Unity ${item.platform} ${item.version} 官方源码编译适配器`, { skip: item.source && managed && existsSync(item.source) && existsSync(managed) ? false : '未提供官方源码和 Unity 程序集路径' }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'dirichlet-unity-real-'));
  try {
    const unity = resolve('skills/app-domain-toolkit/assets/mobile-sdks/unity');
    for (const file of ['MobileSdkContracts.cs', 'SdkInitialization.cs', 'DirichletManager.cs', 'DirichletAds.cs']) {
      cpSync(join(unity, file), join(directory, file));
    }
    cpSync(join(item.source, item.sdk, 'asset'), join(directory, 'OfficialSdk.cs'));
    cpSync(join(item.source, item.types, 'asset'), join(directory, 'OfficialAdTypes.cs'));
    /** 文件系统路径进入 XML 属性前必须转义，避免特殊字符破坏临时项目。 */
    const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    const references = ['Unity.Scripting', 'UnityEngine.CoreModule', 'UnityEngine.AndroidJNIModule', 'UnityEngine.JSONSerializeModule']
      .map((name) => `<Reference Include="${name}"><HintPath>${escapeXml(join(managed, `${name}.dll`))}</HintPath></Reference>`).join('');
    writeFileSync(join(directory, 'Fixture.csproj'), `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework><DefineConstants>APP_CREATOR_DIRICHLET_SDK;UNITY_${item.platform === 'iOS' ? 'IOS' : 'ANDROID'}</DefineConstants></PropertyGroup><ItemGroup>${references}</ItemGroup></Project>`);
    const result = spawnSync('dotnet', ['build', join(directory, 'Fixture.csproj'), '--nologo', '-v:q'], { encoding: 'utf8', timeout: 120000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
  } finally {
    // 仅清理本次创建的临时工程，不触碰官方 SDK 或 Unity 安装。
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.ok(basename(realpathSync(directory)).startsWith('dirichlet-unity-real-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
}
