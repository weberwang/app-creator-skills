import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileIdentityKey } from '../../skills/app-workflow-control/scripts/runtime/io.mjs';
import { assertFinalVisualScope, assertVersionVisualSources } from '../../skills/app-workflow-control/scripts/runtime/integration-system-sources.mjs';

/** 建立同一对象跨两个批次的独立视觉来源。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'version-final-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const scopeRef = { path: 'scope.json', sha256: 'a'.repeat(64) };
  const work = { projectId: 'project', stack: 'flutter', productionScopeRef: scopeRef };
  const production = { scope: { versionVisual: { workItemPaths: ['work/first.json', 'work/second.json'] } } };
  const visited = new Map();
  /** 保留每个来源的真实内容摘要，模拟最终集成已遍历的记录。 */
  function add(path, state) {
    const absolute = join(repo, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify({
      projectId: 'project', stack: 'flutter', globalState: state,
      productionScopeRef: scopeRef, visual: { objectId: 'same-page', stage: 'V5' },
    }));
    visited.set(fileIdentityKey(repo, path), { path, sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex') });
  }
  add('work/first.json', 'COMPLETE');
  add('work/second.json', 'COMPLETE');
  return { repo, work, production, visited, add };
}

test('最终集成必须实际遍历每个已登记的视觉来源', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => assertVersionVisualSources(f.repo, f.work, f.production, f.visited));
  f.visited.delete(fileIdentityKey(f.repo, 'work/first.json'));
  assert.throws(() => assertVersionVisualSources(f.repo, f.work, f.production, f.visited), /缺少版本视觉来源/);
});

test('已遍历的视觉来源仍需完成 V5 且不能被并发改写', (t) => {
  const f = fixture(t);
  f.add('work/first.json', 'PASSED');
  assert.throws(() => assertVersionVisualSources(f.repo, f.work, f.production, f.visited), /尚未完成 V5/);
  f.add('work/first.json', 'COMPLETE');
  writeFileSync(join(f.repo, 'work/first.json'), '{}');
  assert.throws(() => assertVersionVisualSources(f.repo, f.work, f.production, f.visited), /内容已变化/);
});

test('最终集成不可省略或换绑视觉来源的版本范围', (t) => {
  const f = fixture(t);
  const source = { visual: { stage: 'V5' }, productionScopeRef: f.work.productionScopeRef };
  assert.doesNotThrow(() => assertFinalVisualScope(f.repo, f.work, source, f.production));
  assert.throws(() => assertFinalVisualScope(f.repo, { ...f.work, productionScopeRef: undefined }, source, f.production), /同一冻结版本范围/);
  assert.throws(() => assertFinalVisualScope(f.repo, { ...f.work, productionScopeRef: { ...f.work.productionScopeRef, sha256: 'b'.repeat(64) } }, source, f.production), /同一冻结版本范围/);
  assert.throws(() => assertFinalVisualScope(f.repo, { ...f.work, productionScopeRef: { ...f.work.productionScopeRef, path: 'other.json' } }, source, f.production), /同一冻结版本范围/);
});
