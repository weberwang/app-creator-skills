#!/usr/bin/env node
/** 将移动 SDK 具体实现接入正式工程；不安装供应商包或修改原生宿主配置。 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../../app-skill-runtime/direct-entry.mjs';

/** 资源随 app-domain-toolkit 安装，脱离维护仓库也可执行。 */
const SOURCE = fileURLToPath(new URL('../../assets/mobile-sdks/', import.meta.url));
/** 保持引擎原有平台职责目录；Cocos 原生源另放 native 目录，不混入游戏资源。 */
const OUTPUTS = { unity: 'Assets/Scripts/Foundation/Sdks', cocos: 'assets/scripts/platform/mobile-sdks', phaser: 'src/platform/mobile-sdks', threejs: 'src/platform/mobile-sdks' };

/** 拒绝 Junction、符号链接和断开的链接，避免目标被重定向到工程外。 */
function noLinks(path) {
  let current = resolve(path);
  while (true) {
    try { if (lstatSync(current).isSymbolicLink()) throw new Error('SDK 接入路径不能含符号链接'); }
    catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** 只有工程内部的普通业务目录可写，元数据和技能安装目录始终保护。 */
function destination(project, path) {
  const target = resolve(project, path);
  const local = relative(project, target);
  if (!local || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`) || ['.git', '.agents'].includes(local.split(sep)[0].toLowerCase())) throw new Error('SDK 输出必须在工程业务子目录内');
  noLinks(target);
  return target;
}

/** 只选择当前引擎和一个原生广告 provider，保留所需相对引用。 */
function selected(name, engine, adProvider) {
  if (engine === 'unity') return name === 'unity' || name.startsWith('unity/');
  if (engine === 'cocos') {
    if (name !== 'cocos' && !name.startsWith('cocos/')) return false;
    const provider = name.match(/\/providers\/([^/]+)/)?.[1];
    return !provider || provider === (adProvider === 'max' ? 'app-lovin-max' : 'admob');
  }
  return name === 'shared' || name.startsWith('shared/') || name === 'capacitor' || name.startsWith('capacitor/') || name === 'engines' || name === `engines/${engine}` || name.startsWith(`engines/${engine}/`);
}

/** 遍历自有源码；供应商二进制不属于工作流载荷。 */
function collect(engine, adProvider, current = SOURCE) {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const path = join(current, entry.name);
    const name = relative(SOURCE, path).split(sep).join('/');
    if (!selected(name, engine, adProvider)) return [];
    if (entry.isSymbolicLink()) throw new Error('SDK 来源不能包含符号链接');
    if (entry.isDirectory()) return collect(engine, adProvider, path);
    if (!entry.isFile()) throw new Error('SDK 来源只能是普通文件');
    return [{ name, source: path, contents: readFileSync(path) }];
  });
}

/** 记录本次宿主插件依赖；这里只生成清单，不修改项目 package.json 或访问网络。 */
function dependencies(adProvider) {
  return { '@capacitor/core': '^8.5.0', '@capacitor/android': '^8.5.0', '@capacitor/ios': '^8.5.0', '@capacitor-firebase/analytics': '^8.0.0', '@capacitor-firebase/crashlytics': '^8.0.0', 'appsflyer-capacitor-plugin': '7.0.4', '@appsflyer-sdk/js-core-plugin': '7.1.0', [adProvider === 'admob' ? '@capacitor-community/admob' : 'cordova-plugin-applovin-max']: adProvider === 'admob' ? '8.3.0' : '2.1.0' };
}

/** 生成只导入已选广告 SDK 的入口，项目不需重新手写插件加载与选择逻辑。 */
function entry(engine, adProvider) {
  if (engine === 'cocos') return `import { CocosMobileSdks, type CocosJsbEvents, type CocosMobileSdkConfig } from './cocos/index';
let instance: CocosMobileSdks | undefined;
let owner: CocosJsbEvents | undefined;
let settings: CocosMobileSdkConfig | undefined;
/** 应用唯一入口复用配置对象，原生 SDK 不随场景重建。 */
export function createInstalledMobileSdks(port: CocosJsbEvents, config: CocosMobileSdkConfig): CocosMobileSdks {
  if (config.adProvider !== '${adProvider}') throw new Error('广告聚合与已安装原生源不一致');
  if (instance) { if (port !== owner || config !== settings) throw new Error('SDK 组合根不得重复装配不同配置'); return instance; }
  owner = port; settings = config; instance = new CocosMobileSdks(port, config); return instance;
}
`;
  const create = engine === 'phaser' ? 'createPhaserMobileSdkScope' : 'createThreejsMobileSdkScope';
  return `import { Capacitor } from '@capacitor/core';
import { ${create} } from './engines/${engine}/sdk-services';
import type { MobileSdkConfig, MobileSdkLoaders } from './capacitor/composition-root';
import type { AdMobPort, MaxCordovaPort } from './capacitor/ad-ports';
import type { FirebaseAnalyticsPlugin, FirebaseCrashlyticsPlugin } from './capacitor/firebase-ports';
import type { AppsFlyerPlugin } from './capacitor/appsflyer-ports';
const scope = ${create}();
const loaders: MobileSdkLoaders = {
  analytics: async () => (await import('@capacitor-firebase/analytics')).FirebaseAnalytics as unknown as FirebaseAnalyticsPlugin,
  crashlytics: async () => (await import('@capacitor-firebase/crashlytics')).FirebaseCrashlytics as unknown as FirebaseCrashlyticsPlugin,
  appsflyer: async () => (await import('appsflyer-capacitor-plugin')).AppsFlyer as unknown as AppsFlyerPlugin,
${adProvider === 'admob' ? "  admob: async () => (await import('@capacitor-community/admob')).AdMob as unknown as AdMobPort," : `  max: async () => { const sdk = (globalThis as unknown as { applovin?: MaxCordovaPort }).applovin; if (!sdk) throw new Error('官方 MAX Cordova 插件尚未就绪'); return sdk; },
  maxEvents: globalThis as unknown as Window,`}
};
/** 从真实 Capacitor 宿主识别平台，仅加载项目所选 SDK。 */
export function createInstalledMobileSdks(config: Omit<MobileSdkConfig, 'platform' | 'verifiedNative'>) {
  if (config.advertising.provider !== '${adProvider}') throw new Error('广告聚合与安装配置不一致');
  const platform = Capacitor.getPlatform();
  if (!Capacitor.isNativePlatform() || (platform !== 'android' && platform !== 'ios')) throw new Error('仅支持 Android/iOS 原生宿主');
  return scope.create({ ...config, platform, verifiedNative: true }, loaders);
}
`;
}

/** 写入前检查全部目标；不同内容拒绝覆盖，避免半更新工程。 */
export function planMobileSdkInstallation({ projectRoot, engine, adProvider, output, nativeOutput = 'native/mobile-sdks' }) {
  if (!Object.hasOwn(OUTPUTS, engine)) throw new Error('引擎必须为 unity/cocos/phaser/threejs');
  if (!['admob', 'max'].includes(adProvider)) throw new Error('广告聚合必须显式二选一：admob|max');
  const project = resolve(projectRoot);
  noLinks(project);
  if (!existsSync(project) || !lstatSync(project).isDirectory()) throw new Error('项目必须为已有普通目录');
  const targetRoot = destination(project, output ?? OUTPUTS[engine]);
  const nativeRoot = engine === 'cocos' ? destination(project, nativeOutput) : undefined;
  const entries = collect(engine, adProvider).map((file) => {
    let target;
    if (engine === 'unity') target = join(targetRoot, file.name.slice('unity/'.length));
    else if (engine === 'cocos' && file.name.startsWith('cocos/typescript/')) target = join(targetRoot, 'cocos', file.name.slice('cocos/typescript/'.length));
    else if (engine === 'cocos') target = join(nativeRoot, file.name);
    else target = join(targetRoot, file.name);
    return { ...file, target };
  });
  if (!entries.length) throw new Error('缺少当前引擎 SDK 实现');
  entries.push({ source: null, name: 'installed-sdk-selection.json', target: join(targetRoot, 'installed-sdk-selection.json'), contents: Buffer.from(JSON.stringify({ engine, adProvider, nativeOutput: nativeRoot ? relative(project, nativeRoot).split(sep).join('/') : undefined, dependencies: ['phaser', 'threejs'].includes(engine) ? dependencies(adProvider) : undefined }, null, 2) + '\n') });
  if (engine !== 'unity') entries.push({ source: null, name: 'installed-mobile-sdks.ts', target: join(targetRoot, 'installed-mobile-sdks.ts'), contents: Buffer.from(entry(engine, adProvider)) });
  const seen = new Set();
  for (const file of entries) {
    if (seen.has(file.target.toLowerCase())) throw new Error('SDK 目标路径重复');
    seen.add(file.target.toLowerCase());
    destination(project, file.target);
    let parent = dirname(file.target);
    while (parent !== project) {
      if (existsSync(parent) && !lstatSync(parent).isDirectory()) throw new Error('SDK 父路径被普通文件占用');
      parent = dirname(parent);
    }
    if (existsSync(file.target) && (!lstatSync(file.target).isFile() || !readFileSync(file.target).equals(file.contents))) throw new Error(`SDK 文件已存在且不同：${relative(project, file.target)}`);
    file.action = existsSync(file.target) ? 'skip' : 'install';
  }
  return { project, engine, adProvider, destination: targetRoot, nativeDestination: nativeRoot, files: entries };
}

/** 只创建预检通过的新文件，失败时仅回收本次写入的文件。 */
export function installMobileSdks(options) {
  const plan = planMobileSdkInstallation(options);
  if (options.dryRun) return { ...plan, changed: false };
  const created = [];
  try {
    for (const file of plan.files) if (file.action === 'install') {
      noLinks(file.target); mkdirSync(dirname(file.target), { recursive: true });
      writeFileSync(file.target, file.contents, { flag: 'wx' }); created.push(file.target);
    }
  } catch (error) { for (const path of created.reverse()) unlinkSync(path); throw error; }
  return { ...plan, changed: created.length > 0 };
}

/** 明确工程、引擎和广告聚合，不从操作系统或目录名猜选供应商。 */
function argumentsFrom(args) {
  const options = {};
  const fields = { '--project': 'projectRoot', '--engine': 'engine', '--ad-provider': 'adProvider', '--output': 'output', '--native-output': 'nativeOutput' };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--dry-run') { options.dryRun = true; continue; }
    const field = fields[args[index]];
    if (!field || !args[index + 1] || args[index + 1].startsWith('--') || Object.hasOwn(options, field)) throw new Error('用法：--project <项目> --engine <unity|cocos|phaser|threejs> --ad-provider <admob|max> [--output <目录>] [--native-output <目录>] [--dry-run]');
    options[field] = args[++index];
  }
  if (!options.projectRoot || !options.engine || !options.adProvider) throw new Error('必须明确项目、引擎和唯一广告聚合');
  return options;
}

if (isDirectEntry(import.meta.url)) {
  try {
    const plan = installMobileSdks(argumentsFrom(process.argv.slice(2)));
    console.log(JSON.stringify({ engine: plan.engine, adProvider: plan.adProvider, destination: plan.destination, nativeDestination: plan.nativeDestination, changed: plan.changed, files: plan.files.length }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
