import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { validateVersionFunctionCoverage } from '../../skills/app-workflow-control/scripts/runtime/production-coverage.mjs';

/** 生成绑定真实文件摘要的合成功能用例。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'version-function-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 写入当前测试的独立记录。 */
  function write(path, value) {
    const absolute = join(repo, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, typeof value === 'string' ? value : JSON.stringify(value));
    return { path, sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex') };
  }
  const batch = { batchId: 'batch', stepIds: ['open'], transitionIds: ['close'], pathIds: ['cycle'] };
  const definition = {
    batches: new Map([['batch', batch]]),
    states: new Map([['list', { objectId: 'page' }], ['detail', { objectId: 'page' }]]),
    steps: new Map([['open', { stepId: 'open', caseId: 'open-case', objectIds: ['page'], stateIds: ['list'] }]]),
    transitions: new Map([['close', { transitionId: 'close', caseId: 'close-case', fromStateId: 'detail', toStateId: 'list' }]]),
    paths: new Map([['cycle', { pathId: 'cycle', caseId: 'path-case', stepIds: ['open', 'open'] }]]),
  };
  const work = { productionBatchId: 'batch', visual: { objectId: 'page', functionDependencies: [] } };
  const source = { workItemId: 'module', evidenceRoot: 'evidence/module', evidenceRef: { path: 'evidence/module/manifest.json' } };
  write('work/module.json', source);
  const verified = [];
  const manifest = { items: [] };
  const records = {
    'open-case': { stepIds: ['open'], stateIds: ['list'], transitions: [], paths: [] },
    'close-case': { stepIds: [], stateIds: ['detail', 'list'], transitions: [{ transitionId: 'close', fromStateId: 'detail', toStateId: 'list' }], paths: [] },
    'path-case': { stepIds: ['open'], stateIds: ['list'], transitions: [], paths: [{ pathId: 'cycle', stepIds: ['open', 'open'] }] },
  };
  for (const [caseId, production] of Object.entries(records)) {
    const raw = write(`evidence/module/${caseId}.log`, '实际命令输出');
    production.evidenceRef = raw;
    manifest.items.push({ status: 'PASS', path: raw.path });
    const evidence = write(`evidence/module/${caseId}.json`, { production });
    work.visual.functionDependencies.push({ caseId, workItemRef: { path: 'work/module.json' }, evidenceRef: evidence });
    verified.push({ workItemId: 'module', caseId, evidenceRef: evidence, objectIds: ['page'] });
  }
  write('evidence/module/manifest.json', manifest);
  return { repo, work, definition, verified, write, records };
}

test('共享功能必须逐 case 覆盖当前对象的步骤、转移与有序路径', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => validateVersionFunctionCoverage(f.repo, f.work, f.definition, f.verified));
  assert.throws(() => validateVersionFunctionCoverage(f.repo, f.work, f.definition, f.verified.slice(0, 1)), /缺少必要行为/);
  const incomplete = { ...f.records['close-case'], transitions: [] };
  f.write('evidence/module/close-case.json', { production: incomplete });
  assert.throws(() => validateVersionFunctionCoverage(f.repo, f.work, f.definition, f.verified), /缺少实际状态转移/);
});

test('共享功能路径必须保留重复步骤顺序和真实原始输出', (t) => {
  const f = fixture(t);
  f.write('evidence/module/path-case.json', { production: { ...f.records['path-case'], paths: [{ pathId: 'cycle', stepIds: ['open'] }] } });
  assert.throws(() => validateVersionFunctionCoverage(f.repo, f.work, f.definition, f.verified), /路径步骤顺序/);
});
