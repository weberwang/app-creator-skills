import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractFlutterPlan } from '../../app-workflow-control/scripts/runtime/flutter-plan-extractor.mjs';

/** 本地可复跑入口：读取冻结快照及实施映射，拒绝覆盖历史计划。 */
function main() {
  const [snapshotPath, requestPath, planPath, mappingPath] = process.argv.slice(2);
  if (!snapshotPath || !requestPath || !planPath || !mappingPath) throw new Error('用法：node extract-figma-plan.mjs <快照JSON> <映射JSON> <计划输出> <交接映射输出>');
  if (existsSync(planPath) || existsSync(mappingPath) || resolve(planPath) === resolve(mappingPath)) throw new Error('输出已存在或互相重叠，请使用新版本路径');
  const bytes = readFileSync(snapshotPath);
  const request = JSON.parse(readFileSync(requestPath, 'utf8'));
  if (resolve(snapshotPath) !== resolve(request.figmaDesignRef?.path ?? '') || createHash('sha256').update(bytes).digest('hex') !== request.figmaDesignRef?.sha256) throw new Error('快照路径或摘要与实际冻结来源不一致');
  const result = extractFlutterPlan(JSON.parse(bytes), request);
  writeFileSync(planPath, JSON.stringify(result.plan, null, 2) + '\n', { flag: 'wx' });
  writeFileSync(mappingPath, JSON.stringify(result.mappings, null, 2) + '\n', { flag: 'wx' });
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
