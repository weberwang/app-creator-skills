#!/usr/bin/env node
import { lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDirectEntry } from '../../../app-skill-runtime/direct-entry.mjs';
import { checkedPath, inspectFile, parseFlags, readCheckedJson } from './file-identities.mjs';

/** 检查范围仅覆盖项目内的明确文件，真实消费和视觉质量仍需原生验证。 */
const LIMITATIONS = [
  '仅核对明确声明的文件身份与消费者文件存在，不证明消费者实际引用或运行加载。',
  '引擎注册身份、远程资源、许可证真实性和人工视觉验收未由本工具验证。',
];

/** 区分外部资源标识与非法本地路径，不把远程地址误报为本地缺失。 */
function isExternal(value) {
  return /^(?:[a-z][a-z0-9+.-]*:\/\/|data:)/i.test(value);
}

/** 读取单个明确文件的身份；未映射或远程文件保留为未验证。 */
function inspectDeclaredFile(repo, value, label, { requireNonempty = false } = {}) {
  if (value === undefined || value === null || value === '') return { status: 'NOT_RUN', reason: `${label}未提供本地映射` };
  if (typeof value !== 'string' || !value.trim()) return { status: 'FAIL', reason: `${label}必须为非空路径` };
  if (isExternal(value)) return { status: 'NOT_RUN', reason: `${label}是外部资源，未检查本地文件` };
  try {
    const identity = inspectFile(repo, value, label);
    if (requireNonempty && identity.bytes === 0) return { status: 'FAIL', reason: `${label}为空` };
    return { status: 'PASS', ...identity };
  } catch (error) {
    return { status: 'FAIL', reason: error.message };
  }
}

/** 汇总状态时先保留实际失败，再保留不能由本工具核实的缺口。 */
function combineStatus(statuses) {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('NOT_RUN')) return 'NOT_RUN';
  return 'PASS';
}

/** 解析并核对消费者绑定，不把业务描述猜成文件路径。 */
function parseConsumers(values, tasks) {
  const bindings = new Map();
  for (const value of values) {
    const delimiter = value.indexOf('=');
    if (delimiter <= 0 || delimiter === value.length - 1) throw new Error('--consumer 必须使用 assetId=项目相对文件路径');
    const id = value.slice(0, delimiter);
    const path = value.slice(delimiter + 1);
    if (!tasks.has(id)) throw new Error(`消费者绑定引用未知 assetId：${id}`);
    const paths = bindings.get(id) ?? [];
    if (paths.includes(path)) throw new Error(`消费者绑定重复：${id}=${path}`);
    paths.push(path);
    bindings.set(id, paths);
  }
  return bindings;
}

/** 读取原有单素材规格并核对显式文件和消费者，不变更任何输入文件。 */
export function inspectAssetFiles(repo, taskPaths, consumerValues = []) {
  if (!Array.isArray(taskPaths) || !taskPaths.length) throw new Error('至少提供一个 --task');
  const tasks = new Map();
  for (const taskPath of taskPaths) {
    const task = readCheckedJson(repo, taskPath, '素材规格');
    if (!task || typeof task !== 'object' || Array.isArray(task)) throw new Error('素材规格必须为对象');
    if (typeof task.assetId !== 'string' || !task.assetId.trim()) throw new Error('素材规格缺少 assetId');
    if (typeof task.route !== 'string' || !task.route.trim()) throw new Error(`素材 ${task.assetId} 缺少 route`);
    if (typeof task.consumer !== 'string' || !task.consumer.trim()) throw new Error(`素材 ${task.assetId} 缺少消费者声明`);
    if (tasks.has(task.assetId)) throw new Error(`素材 assetId 重复：${task.assetId}`);
    tasks.set(task.assetId, { task, taskPath });
  }
  const bindings = parseConsumers(consumerValues, tasks);
  const assets = [];
  for (const [assetId, { task, taskPath }] of tasks) {
    const consumers = (bindings.get(assetId) ?? []).map((path) => inspectDeclaredFile(repo, path, `素材 ${assetId} 的消费者文件`));
    const seenPaths = new Set();
    for (const consumer of consumers) {
      if (consumer.status !== 'PASS') continue;
      // 文件别名及硬链接可能指向同一消费者；保留大整数身份避免 Windows 精度误判。
      const identity = lstatSync(checkedPath(repo, consumer.path, '消费者文件').absolute, { bigint: true });
      const pathKey = process.platform === 'win32' ? consumer.path.toLowerCase() : consumer.path;
      const key = identity.ino === 0n ? `path:${pathKey}` : `inode:${identity.dev}:${identity.ino}`;
      if (seenPaths.has(key)) {
        consumer.status = 'FAIL';
        consumer.reason = `素材 ${assetId} 的消费者文件绑定重复`;
      }
      seenPaths.add(key);
    }
    const statuses = consumers.map((entry) => entry.status);
    const reasons = [];
    if (!consumers.length) {
      statuses.push('NOT_RUN');
      reasons.push('仅有语义消费者声明，未提供消费者文件绑定');
    }
    let source = null;
    let runtime = null;
    if (task.route === 'native') {
      statuses.push('NOT_RUN');
      reasons.push('原生素材不要求图片文件，原生对象及实际引用须通过引擎回读');
    } else if (['bitmap', 'vector', '3d'].includes(task.route)) {
      source = inspectDeclaredFile(repo, task.sourcePath, `素材 ${assetId} 的制作源`);
      runtime = inspectDeclaredFile(repo, task.runtimePath, `素材 ${assetId} 的正式资源`, { requireNonempty: true });
      statuses.push(source.status, runtime.status);
    } else {
      statuses.push('NOT_RUN');
      reasons.push('素材路线未知或仍为模板占位，未推断文件需求');
    }
    assets.push({ assetId, taskPath, route: task.route, consumer: task.consumer, source, runtime, consumers, reasons, status: combineStatus(statuses) });
  }
  return { schemaVersion: 'asset-files-v1', status: combineStatus(assets.map((asset) => asset.status)), assets, limitations: LIMITATIONS };
}

/** 接收显式规格和消费者路径；结构化结果输出到标准输出，不写入项目。 */
function main(tokens) {
  try {
    const flags = parseFlags(tokens, { single: ['repo'], repeat: ['task', 'consumer'] });
    if (typeof flags.repo !== 'string' || !flags.repo.trim()) throw new Error('必须提供 --repo');
    const report = inspectAssetFiles(resolve(flags.repo), flags.task ?? [], flags.consumer ?? []);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.status === 'PASS' ? 0 : report.status === 'FAIL' ? 1 : 2;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 'asset-files-v1', status: 'FAIL', error: error.message, limitations: LIMITATIONS }, null, 2)}\n`);
    return 1;
  }
}

// 仅作为独立 CLI 调用时读取项目；其他模块导入本文件不访问磁盘。
if (isDirectEntry(import.meta.url)) process.exitCode = main(process.argv.slice(2));
