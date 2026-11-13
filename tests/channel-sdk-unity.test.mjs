/** 在独占临时目录编译与执行 Unity 渠道适配层，避免修改真实工程。 */
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = fileURLToPath(new URL('..', import.meta.url));

/** 在临时工程生成 SDK 测试替身，只实现测试所需状态，不包含厂商运行时代码。 */
function createSdkStubs(root) {
  const base = join(root, 'sdk', 'Generated');
  const known = new Set(['Action', 'Dictionary', 'System', 'Threading', 'Tasks', 'Task', 'Texture']);
  const wxObjects = {
    WechatBannerAd: 'WXBannerAd', WechatCustomAd: 'WXCustomAd', WechatInterstitialAd: 'WXInterstitialAd',
    WechatRewardedVideoAd: 'WXRewardedVideoAd', WechatOpenDataContext: 'WXOpenDataContext',
    WechatRankManager: 'WXRankManager', WechatUserInfoButton: 'WXUserInfoButton',
    WechatFeedbackButton: 'WXFeedbackButton', WechatGameClubButton: 'WXGameClubButton',
    WechatPageManager: 'WXPageManager', WechatLaunchOpera: 'WXLaunchOpera', WechatMiniReportManager: 'WXMiniReportManager',
  };
  const manuallyDefined = new Set([...Object.values(wxObjects), 'LoginOption', 'RequestVirtualPaymentOption', 'WXRewardedVideoAdOnCloseResponse']);
  const types = { wechat: new Set(), crazy: new Set() };
  /** 从具名包装签名构造可编译替身；特定业务行为在下面显式模拟。 */
  function declarations(file, category) {
    const source = readFileSync(join(base, file), 'utf8');
    const methods = [];
    for (const match of source.matchAll(/^\s*public\s+(.+?)\s+(\w+)\((.*?)\)\s*\{\s*ensureReady\(\);/gm)) {
      let [, returnType, name, parameters] = match;
      returnType = wxObjects[returnType] ?? returnType;
      for (const token of `${returnType} ${parameters}`.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)) {
        if (!known.has(token[0]) && !manuallyDefined.has(token[0])) types[category].add(token[0]);
      }
      let body = returnType === 'void' ? '' : 'return default;';
      if (category === 'wechat' && name === 'Login') body = 'LastLogin = callback;';
      if (category === 'wechat' && name === 'RequestVirtualPayment') body = 'LastPayment = option;';
      if (category === 'wechat' && name === 'CreateRewardedVideoAd') body = 'return LastRewarded = new WXRewardedVideoAd();';
      if (category === 'wechat' && name === 'OnShow') body = 'ShowListener = result;';
      if (category === 'wechat' && name === 'OffShow') body = 'if (ShowListener == result) ShowListener = null;';
      if (category === 'crazy' && name === 'GameplayStart') body = 'Count++;';
      if (category === 'crazy' && name === 'RequestAd') body = 'Started = adStarted; Failed = adError; Finished = adFinished;';
      if (category === 'crazy' && name === 'BuyItem') body = 'LastItemId = itemId; PurchaseCallback = callback;';
      methods.push(`/// <summary>模拟官方 ${name}，仅用于本地验证。</summary>\npublic ${category === 'wechat' ? 'static ' : ''}${returnType} ${name}(${parameters}) { ${body} }`);
    }
    return methods.join('\n');
  }
  const wxMethods = declarations('WechatMinigameSdk.g.cs', 'wechat');
  const modules = ['Ad', 'Analytics', 'Banner', 'Data', 'Game', 'Store', 'User'];
  const moduleSources = modules.map((module) => {
    const methods = declarations(`CrazyGames${module}Sdk.g.cs`, 'crazy');
    let extra = '';
    if (module === 'Ad') extra = 'public AdblockStatus AdblockStatus { get; set; } public Action Started, Finished; public Action<SdkError> Failed;';
    if (module === 'Game') extra = 'public int Count; public bool IsInstantJoin, IsInstantMultiplayer, IsOfflineMode; public GameSettings Settings; public GameQuality Quality; public Dictionary<string, string> InviteParams;';
    if (module === 'Banner') extra = 'public List<CrazyBanner> Banners = new List<CrazyBanner>();';
    if (module === 'User') extra = 'public bool IsUserAccountAvailable; public SystemInfo SystemInfo;';
    if (module === 'Store') extra = 'public const int MaxCatalogLimit = 50; public string LastItemId; public Action<SdkError, PurchaseResult> PurchaseCallback;';
    return `/// <summary>模拟 ${module} 模块。</summary>\npublic class ${module}Module { ${extra} ${methods} }`;
  }).join('\n');
  const wxTypes = [...types.wechat].filter((type) => !type.startsWith('Wechat')).map((type) => `/// <summary>模拟官方 ${type} 类型。</summary>\npublic class ${type} { }`).join('\n');
  const crazyTypes = [...types.crazy].filter((type) => !['AdblockStatus', 'CrazyAdType'].includes(type)).map((type) => `/// <summary>模拟官方 ${type} 类型。</summary>\npublic class ${type} { }`).join('\n');
  const mock = `using System; using System.Collections.Generic; using System.Threading.Tasks; using UnityEngine;
namespace UnityEngine { public class Texture {} }
#if APP_CREATOR_WECHAT_SDK
namespace WeChatWASM {
${wxTypes}
public class LoginOption {} public class RequestVirtualPaymentOption { public string signData; }
public class WXRewardedVideoAdOnCloseResponse { public bool isEnded; }
public class WXTextResponse {} public class WXADErrorResponse {} public class WXADLoadResponse {} public class WXADResizeResponse {}
public class RequestAdReportShareBehaviorParam {} public class WXRewardedVideoAdReportShareBehaviorResponse {}
public class WXUserInfoResponse {} public class RankOption {} public class RankManagerStartEventResult {}
public class OptionStyle {} public class GameClubButtonIcon {} public class GameClubButtonType {} public class WXGameClubButtonStyle {} public class WXAdBaseStyle {} public class WXAdCustomStyle {}
public class LoadOption {} public class ShowOption {} public class PageManagerEventResult {}
public class WXBaseAd { public string instanceId; public void Show(Action<WXTextResponse> success = null, Action<WXTextResponse> failed = null) {} public void Show(string branchId, string branchDim, Action<WXTextResponse> success = null, Action<WXTextResponse> failed = null) {} public void OnError(Action<WXADErrorResponse> action) {} public void OffError(Action<WXADErrorResponse> action) {} public void OnLoad(Action<WXADLoadResponse> action) {} public void OffLoad(Action<WXADLoadResponse> action) {} public void Destroy() {} }
public class WXBannerAd : WXBaseAd { public WXAdBaseStyle style; public void Hide() {} public void OnResize(Action<WXADResizeResponse> action) {} public void OffResize(Action<WXADResizeResponse> action) {} }
public class WXCustomAd : WXBaseAd { public WXAdCustomStyle style; public void Hide(Action<WXTextResponse> success = null, Action<WXTextResponse> failed = null) {} public void OnClose(Action action) {} public void OffClose(Action action) {} public void OnHide(Action action) {} public void OffHide(Action action) {} }
public class WXInterstitialAd : WXBaseAd { public void Load(Action<WXTextResponse> success = null, Action<WXADErrorResponse> failed = null) {} public void OnClose(Action action) {} public void OffClose(Action action) {} }
public class WXRewardedVideoAd : WXBaseAd { public Action<WXRewardedVideoAdOnCloseResponse> Closed; public void Load(Action<WXTextResponse> success = null, Action<WXADErrorResponse> failed = null) {} public void OnClose(Action<WXRewardedVideoAdOnCloseResponse> action) { Closed += action; } public void OffClose(Action<WXRewardedVideoAdOnCloseResponse> action) { Closed -= action; } public WXRewardedVideoAdReportShareBehaviorResponse ReportShareBehavior(RequestAdReportShareBehaviorParam param) => null; }
public class WXOpenDataContext { public void PostMessage(string value) {} }
public class WXRankManager { public void MiddleUpdate(RankOption value) {} public void Update(RankOption value) {} public void CreateChallenge(RankOption value) {} public void Abort(RankOption value) {} public void OnChallengeStart(Action<RankManagerStartEventResult> value) {} public void OffChallengeStart(Action<RankManagerStartEventResult> value) {} }
public class WXUserInfoButton { public void OnTap(Action<WXUserInfoResponse> action) {} public void OffTap() {} public void Show() {} public void Hide() {} public void Destroy() {} }
public class WXFeedbackButton { public OptionStyle style; public string type, image, text; public void Show() {} public void Hide() {} public void Destroy() {} public void OnTap(Action<GeneralCallbackResult> action) {} public void OffTap() {} }
public class WXGameClubButton { public GameClubButtonIcon icon; public GameClubButtonType type; public WXGameClubButtonStyle styleObj,style; public string text,image,instanceId; public void Show() {} public void Hide() {} public void Destroy() {} public void OnTap(Action action) {} public void OffTap(Action action) {} }
public class WXPageManager { public void Load(LoadOption option) {} public void Show(ShowOption option) {} public void On(string name, Action<PageManagerEventResult> callback) {} public void Off(string name) {} public void Destroy() {} }
public class WXLaunchOpera { public void SetPercentage(double value) {} public bool GetRunning()=>false; public void End() {} public void onEnd(Action<bool> action) {} public void offEnd(Action<bool> action) {} public void SetGlobalVar(string key, string value) {} public string GetGlobalVar(string key)=>null; public bool IsPlayStoryLine(string key)=>false; }
public class WXMiniReportManager { public void Report(string value) {} }
public class WX { public static Action<int> Callback; public static int InitializeCount; public static LoginOption LastLogin; public static RequestVirtualPaymentOption LastPayment; public static WXRewardedVideoAd LastRewarded; public static Action<OnShowListenerResult> ShowListener; public static void InitSDK(Action<int> callback) { InitializeCount++; Callback = callback; } ${wxMethods} }
}
#endif
#if APP_CREATOR_CRAZYGAMES_SDK
namespace CrazyGames {
public enum CrazyAdType { Midgame, Rewarded } public enum AdblockStatus { Detecting, Present, Missing }
${crazyTypes}
public class SystemInfo {} public static class CrazySDK { public const string Version = "5.38.0"; public static bool IsAvailable {get;set;} = true; public static bool IsInitialized {get;set;} public static bool IsShutDown {get;set;} public static string Environment {get;set;} public static Action Callback; public static void Init(Action callback) { Callback = callback; } ${modules.map((module) => `public static ${module}Module ${module} {get;} = new ${module}Module();`).join('\n')} }
${moduleSources}
}
#endif`;
  writeFileSync(join(root, 'OfficialSdkStubs.cs'), mock);
}

/** 编译不依赖真实官方 SDK，通过模拟验证生命周期与完整调用句柄。 */
test('Unity 具名渠道能力直接调用、隔离和保留规则', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-channel-unity-'));
  t.after(() => {
    const actual = realpathSync(root);
    assert.equal(dirname(actual), realpathSync(tmpdir()));
    assert.ok(basename(actual).startsWith('app-creator-channel-unity-'));
    rmSync(actual, { recursive: true, force: true });
  });
  cpSync(join(repo, 'tests/fixtures/channel-sdk-unity'), root, { recursive: true });
  cpSync(join(repo, 'skills/app-release/assets/channel-sdks/unity'), join(root, 'sdk'), { recursive: true });
  createSdkStubs(root);
  const result = spawnSync('dotnet', ['run', '--project', 'ChannelSdkFixture.csproj', '--configuration', 'Release'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
    env: { ...process.env, DOTNET_CLI_HOME: join(root, '.dotnet'), DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', NUGET_PACKAGES: join(root, '.nuget') },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Unity 渠道 SDK 模拟验证通过/);
});

/** 同一渠道单独编译时，生成代码不能要求另一渠道的官方 SDK。 */
for (const channel of ['APP_CREATOR_WECHAT_SDK', 'APP_CREATOR_CRAZYGAMES_SDK']) {
  test(`Unity ${channel} 单渠道无需另一官方 SDK`, (t) => {
    const root = mkdtempSync(join(tmpdir(), 'app-creator-channel-unity-'));
    t.after(() => {
      const actual = realpathSync(root);
      assert.equal(dirname(actual), realpathSync(tmpdir()));
      assert.ok(basename(actual).startsWith('app-creator-channel-unity-'));
      rmSync(actual, { recursive: true, force: true });
    });
    cpSync(join(repo, 'tests/fixtures/channel-sdk-unity'), root, { recursive: true });
    cpSync(join(repo, 'skills/app-release/assets/channel-sdks/unity'), join(root, 'sdk'), { recursive: true });
    createSdkStubs(root);
    const project = join(root, 'ChannelSdkFixture.csproj');
    writeFileSync(project, readFileSync(project, 'utf8').replace('UNITY_EDITOR;APP_CREATOR_WECHAT_SDK;APP_CREATOR_CRAZYGAMES_SDK', `UNITY_EDITOR;${channel}`));
    writeFileSync(join(root, 'Program.cs'), 'using System; namespace UnityEditor { public class MenuItem : Attribute { public MenuItem(string value) {} } public static class AssetDatabase { public static void Refresh() {} } } public static class Program { public static void Main() {} }');
    const result = spawnSync('dotnet', ['build', 'ChannelSdkFixture.csproj', '--configuration', 'Release', '--nologo'], {
      cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true,
      env: { ...process.env, DOTNET_CLI_HOME: join(root, '.dotnet'), DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', NUGET_PACKAGES: join(root, '.nuget') },
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });
}

/** 核对官方方法清单与生成代码一一对应，防止新增具名接口时退回字符串转发。 */
test('Unity 渠道清单逐项具有具名强类型方法并排除基础 API', () => {
  const root = join(repo, 'skills/app-release/assets/channel-sdks/unity/Generated');
  const manifest = JSON.parse(readFileSync(join(root, 'sdk-bindings-manifest.json'), 'utf8'));
  assert.ok(manifest.sources.some((item) => item.name === 'wx-runtime.dll' && /^[0-9a-f]{64}$/.test(item.sha256)));
  const fileFor = (entry) => entry.channel === 'wechat' ? 'WechatMinigameSdk.g.cs' :
    entry.sourceType === 'CrazyGames.CrazySDK' ? 'CrazyGamesSdk.g.cs' : `CrazyGames${entry.sourceType.split('.').at(-1).replace('Module', '')}Sdk.g.cs`;
  for (const entry of manifest.generated) {
    const source = readFileSync(join(root, fileFor(entry)), 'utf8');
    const available = new Set([...source.matchAll(/^\s*public\s+.+?\s+(\w+)\((.*?)\)\s*\{\s*ensureReady\(\);/gm)]
      .map((match) => `${match[1]}(${match[2]})`.replace(/\s/g, '')));
    assert.equal(available.size, entry.methods.length, `${entry.sourceType} 的实现数量与快照不一致`);
    for (const method of entry.methods) {
      assert.ok(available.has(method.replace(/\s/g, '')), `${entry.sourceType} 缺少 ${method}`);
      assert.ok(source.includes(`.${method.slice(0, method.indexOf('('))}(`), `${entry.sourceType} 未直接调用 ${method}`);
    }
    assert.doesNotMatch(source, /\bSdkApi\b|\.Call\s*</);
  }
  const wechat = manifest.generated.find((entry) => entry.channel === 'wechat');
  assert.ok(wechat.methods.some((method) => method.startsWith('RequestVirtualPayment(')));
  assert.ok(wechat.methods.some((method) => method.startsWith('CreateRewardedVideoAd(')));
  assert.ok(!wechat.methods.some((method) => /^(DownloadFile|CreateInnerAudioContext|GetSystemInfo|ShowOpenData|HideOpenData|GetSharedCanvas|GetMiniReportManager|GetGameLogManager|GetScenePerformanceManager)\(/.test(method)));
  assert.ok(!manifest.generated.find((entry) => entry.sourceType === 'CrazyGames.UserModule').properties.includes('SystemInfo'));
  assert.doesNotMatch(readFileSync(join(root, 'CrazyGamesUserSdk.g.cs'), 'utf8'), /public\s+SystemInfo\s+SystemInfo\b/);
  assert.ok(!manifest.generated.find((entry) => entry.sourceType === 'CrazyGames.GameModule').methods.some((method) => method.startsWith('CopyToClipboard(')));
  assert.doesNotMatch(readFileSync(join(root, 'CrazyGamesGameSdk.g.cs'), 'utf8'), /\bCopyToClipboard\b/);
  assert.ok(manifest.unityRootDifferences.methods.includes('GetFriendCloudStorage'));
  assert.equal(manifest.objects.length, 12, '官方广告、授权、开放数据和生命周期返回对象必须完成具名包装');
  for (const name of ['WXBaseAd', 'WXRewardedVideoAd', 'WXInterstitialAd', 'WXBannerAd', 'WXCustomAd', 'WXOpenDataContext', 'WXRankManager']) {
    assert.ok(manifest.objects.some((item) => item.sourceType === `WeChatWASM.${name}` && item.methods.length > 0), `返回对象未登记：${name}`);
  }
});
