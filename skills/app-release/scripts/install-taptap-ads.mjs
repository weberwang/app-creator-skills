#!/usr/bin/env node
/** 只接入已选引擎的 Dirichlet 聚合代码，不引入 Firebase、AppsFlyer 或其他聚合。 */
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../app-skill-runtime/direct-entry.mjs';
import { unitySourceOutput } from '../../app-skill-runtime/unity-source-output.mjs';
import { applyCopies, planCopies, projectOutput } from './taptap-project-files.mjs';
import { planChannelSdkInstallation } from './install-channel-sdks.mjs';

/** 已安装技能也能从相邻公共资源定位实现，不依赖维护仓库的 cwd。 */
const MOBILE = fileURLToPath(new URL('../../app-domain-toolkit/assets/mobile-sdks/', import.meta.url));
/** 每个引擎的业务源码默认位置，原生插件另外接入宿主工程。 */
const OUTPUTS = { unity: 'Assets/Scripts/Platform/TapTapAds', cocos: 'assets/scripts/platform/taptap-ads', phaser: 'src/platform/taptap-ads', threejs: 'src/platform/taptap-ads' };

/** 递归收集指定资源树，链接与特殊文件必须拒绝而非跨目录复制。 */
function collect(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error('TapTap 资源不能包含符号链接');
    const source = join(directory, entry.name);
    if (entry.isDirectory()) return collect(source, root);
    if (!entry.isFile()) throw new Error('TapTap 资源必须为普通文件');
    return [{ source, name: relative(root, source) }];
  });
}

/** 在实际下载厂商包之前预检全部自有源码目标，缺失资源或冲突不产生部分安装。 */
export function planTapTapAdsInstallation({ projectRoot, engine, target, platform = 'android', output, nativeOutput }) {
  if (!Object.hasOwn(OUTPUTS, engine)) throw new Error('引擎必须为 unity/cocos/phaser/threejs');
  if (!['native', 'minigame'].includes(target)) throw new Error('必须明确 target=native|minigame');
  if (target === 'minigame') {
    if (engine === 'unity') throw new Error('已核实的 Unity 小游戏公开包缺少广告 C# 类型，当前不提供虚构适配');
    const plan = planChannelSdkInstallation({ projectRoot, engine, output });
    return { engine, target, platform: 'minigame', destination: plan.destination, files: plan.files, officialSdk: '使用本引擎已核实的小游戏适配与真实宿主 tap API' };
  }
  if (!['android', 'ios'].includes(platform) || (engine !== 'unity' && platform !== 'android')) throw new Error('该引擎尚未交付所选原生平台的真实桥接');
  const destination = output ?? OUTPUTS[engine];
  projectOutput(projectRoot, destination);
  const entries = [];
  /** 把明确依赖保持在相同相对目录，安装后不引用 .agents 或其他引擎代码。 */
  const add = (name) => entries.push({ source: join(MOBILE, name), output: join(destination, name) });
  if (engine === 'unity') {
    for (const name of ['MobileSdkContracts.cs', 'SdkInitialization.cs']) {
      const source = join(MOBILE, 'unity', name);
      entries.push({ source, output: unitySourceOutput({ projectRoot, source, name, output: join(destination, name) }) });
    }
    const implementation = collect(join(MOBILE, 'unity')).filter((entry) => /^Dirichlet.*\.cs$/.test(entry.name));
    if (!implementation.length) throw new Error('缺少 Unity 官方聚合封装');
    for (const entry of implementation) entries.push({ source: entry.source, output: unitySourceOutput({ projectRoot, source: entry.source, name: entry.name, output: join(destination, entry.name) }) });
  } else {
    for (const name of ['shared/managed-sdk.ts', 'capacitor/ad-types.ts', 'capacitor/ad-ports.ts',
      'dirichlet/typescript/contracts.ts', 'dirichlet/typescript/dirichlet-sdk.ts', `engines/${engine}/dirichlet-ads.ts`]) add(name);
    if (engine === 'cocos') {
      add('dirichlet/typescript/cocos-port.ts');
      add('cocos/typescript/bridge.ts');
    } else add('dirichlet/typescript/capacitor-port.ts');
    const nativeRoot = join(MOBILE, 'dirichlet/native/android');
    const nativeDestination = nativeOutput ?? 'native/taptap-ads/android';
    projectOutput(projectRoot, nativeDestination);
    const native = collect(nativeRoot).filter((entry) => {
      const name = entry.name.replaceAll('\\', '/');
      return name.startsWith('core/') || name.startsWith(engine === 'cocos' ? 'cocos/' : 'capacitor/');
    });
    if (!native.some((entry) => entry.name.replaceAll('\\', '/').startsWith('core/')) || !native.some((entry) => entry.name.replaceAll('\\', '/').startsWith(engine === 'cocos' ? 'cocos/' : 'capacitor/'))) throw new Error('缺少当前引擎的原生核心或宿主接线');
    for (const entry of native) entries.push({ source: entry.source, output: join(nativeDestination, entry.name) });
  }
  entries.push({ source: join(MOBILE, 'dirichlet/source-manifest.json'), output: join(destination, 'dirichlet-source-manifest.json') });
  const files = planCopies(projectRoot, entries);
  return { engine, target, platform, destination: resolve(projectRoot, destination), files, officialSdk: engine === 'unity' ? 'Unity 官方聚合包；APP_CREATOR_DIRICHLET_SDK' : 'Android 官方聚合 AAR 与当前宿主插件' };
}

/** 重复安装相同内容无副作用，已有自有修改需要先审查，不静默替换。 */
export function installTapTapAds(options) {
  const plan = planTapTapAdsInstallation(options);
  return { ...plan, changed: options.dryRun ? false : applyCopies(plan.files) };
}

/** 引擎和宿主必须显式提供，避免把普通网页自动当原生壳。 */
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--dry-run') { options.dryRun = true; continue; }
    if (!['--project', '--engine', '--target', '--platform', '--output', '--native-output'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('用法：--project <工程> --engine <unity|cocos|phaser|threejs> --target <native|minigame> [--platform android|ios] [--output <目录>] [--native-output <目录>] [--dry-run]');
    const name = key === '--project' ? 'projectRoot' : key === '--native-output' ? 'nativeOutput' : key.slice(2);
    if (Object.hasOwn(options, name)) throw new Error('安装参数重复');
    options[name] = args[++i];
  }
  if (!options.projectRoot || !options.engine || !options.target) throw new Error('必须明确工程、引擎和宿主');
  return options;
}

if (isDirectEntry(import.meta.url)) {
  try {
    const plan = installTapTapAds(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify({ engine: plan.engine, target: plan.target, platform: plan.platform, destination: plan.destination, changed: plan.changed, files: plan.files.length, officialSdk: plan.officialSdk, officialSdkInstallation: 'not-checked' }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
