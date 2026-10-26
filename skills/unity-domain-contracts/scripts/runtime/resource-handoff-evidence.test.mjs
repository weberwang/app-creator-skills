import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectResourceHandoffEvidence, validateResourceHandoffPackage } from './resource-handoff-evidence.mjs';

/** 写入领域合同读取器使用的项目相对 JSON 工件。 */
function writeProjectJson(root, path, value) {
  const target = join(root, ...path.split('/'));
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('资源交接先核对正式登记输入，再绑定当前 Work Item 的实际读回报告', () => {
  const repo = mkdtempSync(join(tmpdir(), 'unity-domain-resource-handoff-'));
  try {
    const guid = '0123456789abcdef0123456789abcdef';
    const pkg = { resourceHandoff: { assetRegisterRef: { path: 'Contracts/assets.json' } } };
    const register = { schemaVersion: '1.0', assets: [{ id: 'hero', status: 'IMPORTED', path: 'Assets/hero.png', guid, loading: { mode: 'SERIALIZED' } }] };
    writeProjectJson(repo, 'Contracts/assets.json', register);
    assert.deepEqual(validateResourceHandoffPackage(pkg, repo), []);

    const work = { workItemId: 'WI-RESOURCE', globalState: 'VALIDATING', evidenceRoot: '.workflow-control/evidence/WI-RESOURCE' };
    const reportPath = `${work.evidenceRoot}/resource-handoff.json`;
    const report = {
      schemaVersion: '1.0', taskId: work.workItemId, outputPath: reportPath,
      assets: [{ resourceId: 'hero', assetPath: 'Assets/hero.png', assetGuid: guid, resourcesKey: '', resourcesMatches: [], addressables: { configured: false, address: '', group: '' } }],
      animations: [], measurementSource: 'UNITY_EDITOR_ASSET_DATABASE', runId: 'run-1',
      generatedAtUtc: '2026-10-26T00:00:00Z', message: '', status: 'MEASURED',
    };
    writeProjectJson(repo, reportPath, report);
    const evidence = { verdict: 'PASS', resourceHandoffInspectionRef: { path: reportPath } };
    assert.deepEqual(inspectResourceHandoffEvidence({ work, pkg, evidence, repo }), []);
    assert.match(inspectResourceHandoffEvidence({ work, pkg, evidence: { ...evidence, resourceHandoffInspectionRef: { path: 'Contracts/assets.json' } }, repo })[0].message, /outputPath|evidenceRoot/);
    assert.match(inspectResourceHandoffEvidence({ work, pkg, evidence: { verdict: 'PASS' }, repo, forceRuntime: true })[0].message, /resourceHandoffInspectionRef/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
