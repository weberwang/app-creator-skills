#!/usr/bin/env node
/** 从锁定的官方声明提取渠道专属接口，并生成直接调用宿主方法的具名封装。 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../app-skill-runtime/direct-entry.mjs';

/** 固定声明版本；更新必须重新核对接口范围和签名差异。 */
const REVISION = '42c427aa8c3961b7a4f8ea5bd6112c2bcf058177';
/** 与固定提交对应的原始输入摘要，避免本地改写后仍标成官方快照。 */
const PINNED_HASHES = {
  'types/wx/index.d.ts': '99f5668b354fdabec56ef4e1dfe41cb8a2b4d53a254185545657dea46252d551',
  'types/wx/lib.wx.api.d.ts': '917ccb15aef4eb858d5d7e6f2f00033b6620aad29d5f4f254b31451d63a104dd',
};
const OUTPUT = fileURLToPath(new URL('../assets/channel-sdks/typescript/wechat/', import.meta.url));
const require = createRequire(import.meta.url);

/** 优先使用工程已有编译器，缺失时查找现有全局实例，不自动安装依赖。 */
function compiler() {
  try { return require('typescript'); } catch {}
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    const entry = join(directory, 'node_modules/typescript/lib/typescript.js');
    if (existsSync(entry)) return require(entry);
  }
  throw new Error('需要已安装的 TypeScript 编译器来更新渠道绑定');
}

/** 为来源或产物计算稳定摘要，供离线复验。 */
function hash(value) { return createHash('sha256').update(value).digest('hex'); }

/** 按官方命名空间收集声明，避免把网络、渲染等全局接口混入渠道类型。 */
function declarations(ts, paths) {
  const map = new Map();
  for (const path of paths) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if (!ts.isModuleDeclaration(node) || !['WechatMinigame', 'Wechat'].includes(node.name.text) || !node.body || !ts.isModuleBlock(node.body)) continue;
      for (const child of node.body.statements) {
        if (!child.name || !ts.isIdentifier(child.name)) continue;
        const name = child.name.text;
        map.set(name, [...(map.get(name) ?? []), child]);
      }
    }
  }
  return map;
}

/** 提取声明内的类型依赖，包含继承，防止只复制表面签名而缺少回调结构。 */
function references(ts, node) {
  const names = new Set();
  /** 只收集类型引用，不把参数名和成员名当作依赖。 */
  const visit = (child) => {
    if (ts.isTypeReferenceNode(child) && ts.isIdentifier(child.typeName)) names.add(child.typeName.text);
    if (ts.isExpressionWithTypeArguments(child) && ts.isIdentifier(child.expression)) names.add(child.expression.text);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return names;
}

/** 根据官方文档目录划分渠道能力，基础运行接口不进入适配层。 */
function channelGroup(text, name) {
  // 仅按本方法主文档分类；正文可能引用广告等渠道文档，不能因此纳入基础 API。
  if (['getSharedCanvas', 'getGameLogManager', 'getMiniReportManager', 'getScenePerformanceManager'].includes(name)) return undefined;
  const category = text.match(/https:\/\/developers\.weixin\.qq\.com\/minigame\/dev\/api\/([^/]+)\//)?.[1];
  if (['ad', 'open-api', 'share', 'chattool', 'data-analysis', 'midas-payment'].includes(category)) return category;
  if (['getLaunchOptionsSync', 'getEnterOptionsSync', 'onShow', 'offShow', 'onHide', 'offHide'].includes(name)) return 'lifecycle';
  return undefined;
}

/** 合并 SDK 返回对象的继承成员，保留不同广告对象的真实方法差异。 */
function members(ts, map, name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const result = [];
  for (const node of map.get(name) ?? []) {
    for (const clause of node.heritageClauses ?? []) for (const type of clause.types) {
      if (ts.isIdentifier(type.expression)) result.push(...members(ts, map, type.expression.text, seen));
    }
    result.push(...(node.members ?? []));
  }
  return result;
}

/** 生成持久化的渠道类型快照；不纳入 wx.cloud 的通用数据库、文件与网络服务。 */
function snapshot(ts, sourceRoot) {
  const paths = ['types/wx/index.d.ts', 'types/wx/lib.wx.api.d.ts'].map((name) => join(sourceRoot, name));
  for (const [name, digest] of Object.entries(PINNED_HASHES)) if (hash(readFileSync(join(sourceRoot, name))) !== digest) throw new Error(`官方声明摘要不匹配：${name}`);
  const map = declarations(ts, paths);
  const root = map.get('Wx')?.find((node) => ts.isInterfaceDeclaration(node));
  if (!root) throw new Error('官方声明缺少 WechatMinigame.Wx');
  const selected = root.members.filter((member) => member.name && channelGroup(member.getFullText(), member.name.getText()));
  const selectedNames = new Set(selected.map((member) => member.name.getText()));
  const needed = new Set();
  const pending = selected.flatMap((member) => [...references(ts, member)]);
  while (pending.length) {
    const name = pending.pop();
    if (needed.has(name) || name === 'Wx' || !map.has(name)) continue;
    needed.add(name);
    for (const node of map.get(name)) pending.push(...references(ts, node));
  }
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const print = (node) => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
  const chunks = [...needed].sort().flatMap((name) => map.get(name).map(print));
  const rootText = selected.map(print).join('\n');
  const licenses = [...new Set(paths.map((path) => readFileSync(path, 'utf8').match(/^\/\*![\s\S]*?\*\//)?.[0]).filter(Boolean))].join('\n');
  // 官方 TS 声明把已签名 signData 写成对象，但官方注释及 Unity 绑定均为原始 JSON 字符串。
  const types = ('// 自动生成：微信小游戏渠道专属类型，保留官方 MIT 许可。\n' + licenses + '\nexport declare namespace Wechat {\n' + chunks.join('\n') + '\nexport interface Runtime {\n' + rootText + '\n}\n}\n')
    .replace(/(signData:\s*)SignData1\b/g, '$1string')
    .replace(/[ \t]+$/gm, '');
  const entries = [...selectedNames].sort().map((name) => {
    const node = selected.find((member) => member.name.getText() === name);
    const url = node.getFullText().match(/https:\/\/developers\.weixin\.qq\.com\/[^\s)]+/)?.[0];
    return { name, group: channelGroup(node.getFullText(), name), url };
  });
  return { types, entries, sourceHashes: Object.fromEntries(paths.map((path) => [path.slice(sourceRoot.length + 1).replaceAll('\\', '/'), hash(readFileSync(path))])) };
}

/** 为每项方法生成精确重载签名和直接具名调用，不通过字符串分发或反射。 */
function bindings(ts, typesPath) {
  const map = declarations(ts, [typesPath]);
  const root = map.get('Runtime')?.[0];
  if (!root) throw new Error('渠道快照缺少 Runtime');
  const wrappers = new Map();
  const candidates = ['AdSkipCard', 'BannerAd', 'CustomAd', 'GridAd', 'InterstitialAd', 'RewardedVideoAd', 'UserInfoButton', 'FeedbackButton', 'GameClubButton', 'OpenSettingButton', 'StoreGift', 'RankManager', 'OpenDataContext', 'PageManager'];
  for (const name of candidates) if (map.has(name)) wrappers.set(name, `Wechat${name}Api`);
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  /** 在公开签名中使用独立渠道类型，只有直接返回的 SDK 对象换成其具体包装类。 */
  const typeText = (node, wrap = false) => {
    const transformed = ts.transform(node, [(context) => {
      /** 处理泛型与嵌套类型，不修改参数名称。 */
      const visit = (child) => {
        if (ts.isTypeReferenceNode(child) && ts.isIdentifier(child.typeName) && map.has(child.typeName.text)) {
          const name = child.typeName.text;
          const target = wrap && wrappers.has(name) ? ts.factory.createIdentifier(wrappers.get(name)) : ts.factory.createQualifiedName(ts.factory.createIdentifier('Wechat'), ts.factory.createIdentifier(name));
          return ts.factory.updateTypeReferenceNode(child, target, child.typeArguments?.map((argument) => ts.visitNode(argument, visit)));
        }
        return ts.visitEachChild(child, visit, context);
      };
      return (value) => ts.visitNode(value, visit);
    }]);
    const text = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], node.getSourceFile());
    transformed.dispose();
    return text;
  };
  const methodCounts = {};
  const methodNames = {};
  /** 输出单个实际 SDK 类型的独立具体包装类。 */
  const emitClass = (name, className) => {
    let all = members(ts, map, name);
    if (name === 'OpenDataContext') all = all.filter((node) => node.name?.getText() === 'postMessage');
    const grouped = new Map();
    for (const node of all) if (node.name) grouped.set(node.name.getText(), [...(grouped.get(node.name.getText()) ?? []), node]);
    const lines = [`/** 微信${name === 'Runtime' ? '渠道专属能力' : name + '平台对象'}的具体具名实现。 */`, `export class ${className} {`, `  /** 仅保存官方对象与生命周期检查，不触发业务操作。 */`, `  constructor(protected readonly runtime: Wechat.${name}, protected readonly assertReady: () => void) {}`];
    let count = 0;
    for (const [method, nodes] of grouped) {
      if (nodes.every((node) => ts.isMethodSignature(node))) {
        count++;
        for (const node of nodes) {
          const generic = node.typeParameters?.length ? '<' + node.typeParameters.map((parameter) => typeText(parameter)).join(', ') + '>' : '';
          const params = node.parameters.map((parameter) => typeText(parameter)).join(', ');
          lines.push(`  /** 调用微信平台 ${method}，保留官方参数与回调合同。 */`, `  ${method}${generic}(${params}): ${typeText(node.type, true)};`);
        }
        const returnName = nodes[0].type && ts.isTypeReferenceNode(nodes[0].type) && ts.isIdentifier(nodes[0].type.typeName) ? nodes[0].type.typeName.text : undefined;
        const wrapper = wrappers.get(returnName);
        lines.push(`  /** 直接调用当前官方对象的 ${method}，不使用通用 API 转发。 */`, `  ${method}(...args: unknown[]): unknown {`, '    this.assertReady();', `    if (typeof this.runtime.${method} !== 'function') throw new Error('微信渠道能力不可用：${method}');`);
        const call = `(this.runtime.${method} as unknown as (...args: unknown[]) => unknown)(...args)`;
        lines.push(wrapper ? `    return new ${wrapper}(${call} as Wechat.${returnName}, this.assertReady);` : `    return ${call};`, '  }');
      } else {
        const node = nodes[0];
        if (!ts.isPropertySignature(node) || !node.type) continue;
        const type = typeText(node.type) + (node.questionToken ? ' | undefined' : '');
        lines.push(`  /** 读取平台对象公开的 ${method} 属性。 */`, `  get ${method}(): ${type} { this.assertReady(); return this.runtime.${method}; }`);
        if (!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)) lines.push(`  /** 更新平台对象公开可写的 ${method} 属性。 */`, `  set ${method}(value: ${type}) { this.assertReady(); this.runtime.${method} = value; }`);
      }
    }
    methodCounts[name] = count;
    methodNames[name] = [...grouped].filter(([, nodes]) => nodes.every((node) => ts.isMethodSignature(node))).map(([method]) => method).sort();
    lines.push('}');
    return lines.join('\n');
  };
  const output = ['// 自动生成：由 generate-wechat-bindings.mjs 维护，基础引擎 API 不在此清单。', "import type { Wechat } from './types.generated';", emitClass('Runtime', 'WechatPlatformApi'), ...[...wrappers].map(([name, className]) => emitClass(name, className))].join('\n\n') + '\n';
  return { output, methodCounts, methodNames };
}

/** 默认从已提交类型快照重建；刷新来源时显式提供官方快照目录。 */
export function generateWechatBindings({ sourceRoot, check = false } = {}) {
  if (sourceRoot && check) throw new Error('检查模式不能同时刷新官方来源');
  const ts = compiler();
  if (!check) mkdirSync(OUTPUT, { recursive: true });
  if (sourceRoot) {
    const result = snapshot(ts, resolve(sourceRoot));
    writeFileSync(join(OUTPUT, 'types.generated.d.ts'), result.types);
    writeFileSync(join(OUTPUT, 'LICENSE.wechat'), readFileSync(join(sourceRoot, 'LICENSE')));
    writeFileSync(join(OUTPUT, 'surface.json'), JSON.stringify({ revision: REVISION, version: '3.8.22', license: 'MIT', source: `https://github.com/wechat-miniprogram/minigame-api-typings/tree/${REVISION}`, sourceHashes: result.sourceHashes, included: result.entries, excluded: ['network', 'file', 'audio', 'render', 'device', 'input', 'system', 'getSharedCanvas', 'getGameLogManager', 'getMiniReportManager', 'getScenePerformanceManager', 'wx.cloud 基础云数据库／文件／网络服务'], signatureCorrections: { 'RequestMidasPaymentGameItemOption.signData': '保留服务端签名的 JSON 字符串，禁止重新序列化' } }, null, 2) + '\n');
  }
  const result = bindings(ts, join(OUTPUT, 'types.generated.d.ts'));
  const target = join(OUTPUT, 'platform.generated.ts');
  const manifestPath = join(OUTPUT, 'surface.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const artifactHashes = { types: hash(readFileSync(join(OUTPUT, 'types.generated.d.ts'))), bindings: hash(result.output) };
  if (check) {
    if (readFileSync(target, 'utf8') !== result.output) throw new Error('微信具名封装与锁定类型快照不一致');
    if (JSON.stringify(manifest.artifactHashes) !== JSON.stringify(artifactHashes)) throw new Error('微信渠道产物摘要与清单不一致');
    if (JSON.stringify(manifest.objectMethods) !== JSON.stringify(result.methodNames) || JSON.stringify(manifest.bindingCounts) !== JSON.stringify(result.methodCounts)) throw new Error('微信渠道方法清单与实际具名实现不一致');
    if (JSON.stringify(manifest.included.map((entry) => entry.name).sort()) !== JSON.stringify(result.methodNames.Runtime)) throw new Error('微信渠道接口纳入清单发生漂移');
  } else {
    writeFileSync(target, result.output);
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, bindingCounts: result.methodCounts, objectMethods: result.methodNames, artifactHashes,
      additionalBindings: [{ name: 'requestVirtualPayment', implementation: 'api.ts', source: 'https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk/blob/915d4bf4f60ef0cd1c29316a8d67257185d609a7/Runtime/WXBase.cs', note: '小游戏 3.8.22 声明遗漏；独立具名封装，按真实宿主可用性检查，签名原串为 string' }],
    }, null, 2) + '\n');
  }
  return result.methodCounts;
}

if (isDirectEntry(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--check' && !options.check) { options.check = true; continue; }
      if (args[index] === '--source' && !options.sourceRoot && args[index + 1] && !args[index + 1].startsWith('--')) { options.sourceRoot = args[++index]; continue; }
      throw new Error('用法：[--source <官方声明快照目录>] [--check]');
    }
    console.log(JSON.stringify(generateWechatBindings(options)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
