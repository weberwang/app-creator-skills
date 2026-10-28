/** 验证纯导航合并不会丢失正文、来源或跨栈差异。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedOrchestrationReferences } from '../scripts/migration/shared-orchestration-references.mjs';
import { isReferenceRedirect, prepareReferenceRedirects, referenceRedirectHash, referenceRedirectSpec } from '../scripts/migration/reference-redirects.mjs';
import { applySharedWorkflowDocument } from '../scripts/migration/shared-workflows.mjs';
import { applyProfessionalRouting } from '../scripts/migration/professional-routing.mjs';
import { validateSharedCapabilities } from '../scripts/validate-shared-capabilities.mjs';
import { isReferenceRedirectDestination } from '../scripts/verify-migration.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const SOURCES = {
  cocos: ['quality-gates', 'worktree-integration', 'grilling-integration'],
  phaser: ['quality-gates', 'worktree-integration', 'local-service-validation', 'grilling-integration'],
  threejs: ['quality-gates', 'worktree-integration', 'local-service-validation'],
};

/** 按真实源字节和生成预览建立独立计划，避免修改迁移输出。 */
function fixture(t) {
  if (!existsSync(resolve(SOURCE_ROOT, 'cocos-skills'))) { t.skip('需要只读的五个来源仓库'); return null; }
  const workflow = buildSharedOrchestrationReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const plans = Object.entries(SOURCES).map(([stack, names]) => {
    const prefix = stack === 'phaser' ? 'phaser4' : stack;
    const entries = new Map();
    const sourceBuffers = new Map();
    for (const name of names) {
      const sourcePath = `skills/${prefix}-game-orchestrator/references/${name}.md`;
      entries.set(sourcePath, { stack, sourcePath, destination: sourcePath, disposition: 'adapted', transforms: [] });
      sourceBuffers.set(sourcePath, readFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, sourcePath)));
    }
    return { stack, entries, sourceBuffers, sourceFiles: new Set(entries.keys()) };
  });
  const options = {
    readText: (buffer) => buffer.toString('utf8'),
    transformShared: (text, plan, entry, sharedPlan) => applySharedWorkflowDocument(text, {
      stack: plan.stack, sourcePath: entry.sourcePath, destination: entry.destination, repositoryRoot: ROOT, plan: sharedPlan,
    }),
    transformText: (text, entry, stack) => ({ text: applyProfessionalRouting(text, { stack, sourcePath: entry.sourcePath, destination: entry.destination }).text
      // 控制入口在正式迁移中会通过来源路径重定位到公共技能。
      .replace(/\.\.\/\.\.\/(?:cocos|phaser4|threejs)-game-workflow-control\/SKILL\.md/g, '../../app-workflow-control/SKILL.md') }),
  };
  return { workflow, plans, options };
}

test('仅将十份已核对导航映射公共正文，其他技术差异仍保留', (t) => {
  const input = fixture(t); if (!input) return;
  prepareReferenceRedirects(input.plans, input.workflow, input.options);
  const entries = input.plans.flatMap((plan) => [...plan.entries.values()]);
  assert.equal(entries.length, 10);
  for (const entry of entries) {
    entry.sourceSha256 = createHash('sha256').update(input.plans.find((plan) => plan.stack === entry.stack).sourceBuffers.get(entry.sourcePath)).digest('hex');
    assert.ok(isReferenceRedirect(entry));
    assert.match(referenceRedirectHash(entry, input.workflow), /^[a-f0-9]{64}$/);
  }
  assert.equal(referenceRedirectSpec('cocos', 'skills/cocos-game-orchestrator/references/local-service-validation.md'), null);
  assert.equal(referenceRedirectSpec('threejs', 'skills/threejs-game-orchestrator/references/grilling-integration.md'), null);
});

test('来源变化、缺失公共段落或残留原生正文时不更改任何计划', (t) => {
  const input = fixture(t); if (!input) return;
  const first = [...input.plans[0].entries.values()][0];
  const oldDestination = first.destination;
  const malformed = { ...input.options, transformText: (...args) => ({ text: `${input.options.transformText(...args).text}\n\n本栈独有的接口要求。\n` }) };
  assert.throws(() => prepareReferenceRedirects(input.plans, input.workflow, malformed), /原生正文或未知链接/);
  assert.equal(first.destination, oldDestination);
  const original = input.plans[0].sourceBuffers.get(first.sourcePath);
  input.plans[0].sourceBuffers.set(first.sourcePath, Buffer.concat([original, Buffer.from('变化')]));
  assert.throws(() => prepareReferenceRedirects(input.plans, input.workflow, input.options), /摘要漂移/);
  input.plans[0].sourceBuffers.set(first.sourcePath, original);
  input.workflow.documents.find((document) => document.path.endsWith('/reference-orchestration-quality-gates.md')).sources = [];
  assert.throws(() => prepareReferenceRedirects(input.plans, input.workflow, input.options), /公共段落缺失/);
});

test('公共规范审计只放行来源、目标和段落均匹配的白名单导航合并', (t) => {
  const input = fixture(t); if (!input) return;
  prepareReferenceRedirects(input.plans, input.workflow, input.options);
  const document = input.workflow.documents.find((item) => item.capabilityId === 'reference-orchestration-worktree-integration');
  const directory = mkdtempSync(join(tmpdir(), 'reference-redirects-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const target = resolve(directory, document.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, document.content);
  const targetHash = createHash('sha256').update(document.content).digest('hex');
  const sources = document.sources.map((source) => {
    const entry = input.plans.find((plan) => plan.stack === source.stack).entries.get(source.sourcePath);
    const spec = referenceRedirectSpec(source.stack, source.sourcePath);
    Object.assign(entry, { sourceSha256: spec.sourceSha256, destinationSha256: targetHash });
    return { ...source, sourceSha256: spec.sourceSha256, adapterDestination: spec.destination };
  });
  const fileRows = sources.map((source) => input.plans.find((plan) => plan.stack === source.stack).entries.get(source.sourcePath));
  const catalog = { generatedFiles: [{ path: document.path }], sharedCapabilities: [{ id: document.capabilityId, kind: 'workflow', implementation: document.path, sources, stacks: sources.map((item) => item.stack) }] };
  const inspect = () => { const errors = []; validateSharedCapabilities({ root: directory, sourceRoot: SOURCE_ROOT, catalog, fileRows, errors, resolveFile: (path) => resolve(directory, path) }); return errors; };
  assert.deepEqual(inspect(), []);
  const group = () => isReferenceRedirectDestination({ catalog, destination: document.path, rows: fileRows, actualSha256: targetHash });
  assert.equal(group(), true);
  fileRows[0].referenceRedirect = false;
  assert.equal(group(), false, '不得用普通来源绕过生成目标冲突');
  fileRows[0].referenceRedirect = true;
  const sections = sources[0].sections;
  sources[0].sections = [];
  assert.equal(group(), false, '缺少公共规则段落不能冒充合并');
  sources[0].sections = sections;
  assert.equal(isReferenceRedirectDestination({ catalog, destination: document.path, rows: fileRows, actualSha256: '0'.repeat(64) }), false);
  fileRows[0].sourceSha256 = '0'.repeat(64);
  assert.ok(inspect().some((error) => /导航合并来源或目标摘要不符/.test(error)));
  fileRows[0].sourceSha256 = sources[0].sourceSha256;
  fileRows[0].destinationSha256 = '0'.repeat(64);
  assert.ok(inspect().some((error) => /导航合并来源或目标摘要不符/.test(error)));
});
