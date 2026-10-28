import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { adaptUnifiedStages, adaptUnifiedSharedCapabilities, assertUnifiedStageAdaptablePlans, loadUnifiedStagePatches } from '../scripts/migration/unified-stage-adapter.mjs';
import { unifySourceVisualStages } from '../scripts/migration/unified-stage-text.mjs';
import { isUnifiedSharedDestination } from '../scripts/validate-shared-capabilities.mjs';
import { applySharedCapabilities } from '../scripts/migration/shared-modules.mjs';
import { AUTHORED_CONTROL_RESOURCES, removeStaleGeneratedFiles } from '../scripts/migration/output-cleanup.mjs';
import { existsSync, readFileSync } from 'node:fs';

/** 固定测试字节的真实身份，避免用占位摘要掩盖漂移。 */
function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('共享能力及入口的来源和输出漂移均在写入前阻断', (t) => {
  const f = fixture(t);
  const origins = [{ stack: 'cocos', sourcePath: 'source.mjs', sourceSha256: hash(f.source) }];
  const shared = { stack: 'shared', sourcePath: 'example', destination: 'shared.mjs', sourceSha256: hash(Buffer.from(JSON.stringify(origins))), inputSha256: hash(f.input), outputSha256: hash(f.output), hunks: f.row.hunks };
  const adapter = { ...shared, stack: 'shared-adapter', sourcePath: 'example/cocos', destination: 'adapter.mjs', sourceSha256: hash(f.source) };
  const make = () => [{ id: 'example', implementation: 'shared.mjs', directShared: true, sourceSha256: hash(f.input), content: f.input, sources: [{ ...origins[0], adapterDestination: 'adapter.mjs', adapterContent: f.input.toString() }] }];
  const plans = [{ stack: 'cocos', sourceBuffers: new Map([['source.mjs', f.source]]) }];
  const capabilities = make();
  adaptUnifiedSharedCapabilities(capabilities, plans, f.save([shared, adapter]));
  assert.deepEqual(capabilities[0].content, f.output);
  assert.equal(capabilities[0].directShared, undefined);
  assert.equal(capabilities[0].sourceSha256, null);
  assert.equal(capabilities[0].sources[0].adapterContent, f.output.toString());
  const drifted = make(); drifted[0].sources[0].sourceSha256 = hash('changed');
  assert.throws(() => adaptUnifiedSharedCapabilities(drifted, plans, f.save([shared, adapter])), /源摘要漂移/);
  assert.throws(() => adaptUnifiedSharedCapabilities(make(), plans, f.save([{ ...shared, outputSha256: hash('changed') }])), /输出摘要不符/);
});

test('多来源共享适配必须逐项绑定真实源和阶段差异目标', (t) => {
  const f = fixture(t);
  const sources = ['cocos', 'phaser'].map((stack) => ({ stack, sourcePath: `${stack}/source`, sourceSha256: hash(stack), adapterDestination: 'skills/app-domain-toolkit/shared.mjs' }));
  const origins = sources.map(({ stack, sourcePath, sourceSha256 }) => ({ stack, sourcePath, sourceSha256 }));
  const destination = sources[0].adapterDestination;
  const patch = { stack: 'shared', sourcePath: 'example', destination, sourceSha256: hash(JSON.stringify(origins)), inputSha256: hash(f.input), outputSha256: hash(f.output), hunks: f.row.hunks };
  f.save([patch]);
  const catalog = { sharedCapabilities: [{ id: 'example', implementation: destination, transforms: ['unified-visual-stages'], sources }], generatedFiles: [{ path: destination, sourceSha256: null, destinationSha256: hash(f.output), sourceOrigins: origins }] };
  const rows = sources.map((source) => ({ ...source, destination, destinationSha256: hash(f.output), disposition: 'adapted', sharedImplementationRef: destination, transforms: ['unified-visual-stages'] }));
  const args = { root: f.root, catalog, destination, rows, actualSha256: hash(f.output) };
  assert.equal(isUnifiedSharedDestination(args), true);
  assert.equal(isUnifiedSharedDestination({ ...args, actualSha256: hash('drift') }), false);
  assert.equal(isUnifiedSharedDestination({ ...args, rows: [{ ...rows[0], sourceSha256: hash('drift') }, rows[1]] }), false);
  assert.equal(isUnifiedSharedDestination({ ...args, rows: [{ ...rows[0], transforms: [] }, rows[1]] }), false);
});

test('首次共享阶段适配只替换本轮核验基础输出，重跑可复用且拒绝用户内容', (t) => {
  const f = fixture(t);
  const destination = 'skills/app-domain-toolkit/shared.mjs';
  const target = join(f.root, destination);
  mkdirSync(join(f.root, 'skills/app-domain-toolkit'), { recursive: true });
  const sources = ['cocos', 'phaser'].map((stack) => ({ stack, sourcePath: `${stack}/source`, sourceSha256: hash(f.source), adapterDestination: destination }));
  const capability = { id: 'example', kind: 'module', implementation: destination, content: f.output, sources, transforms: ['unified-visual-stages'], reason: '按实际来源审计后的统一阶段共享实现。' };
  const rows = () => sources.map((source) => ({ ...source, destination, destinationSha256: hash(f.input), disposition: 'adapted', transforms: [] }));
  const run = (files, previousHashes = new Map()) => applySharedCapabilities({ capabilities: [capability], files, previousHashes, resolveDestination: (path) => join(f.root, path), destinationHash: (path) => existsSync(join(f.root, path)) ? hash(readFileSync(join(f.root, path))) : null, sha256: hash });
  writeFileSync(target, f.input);
  const first = rows(); const generated = run(first);
  assert.deepEqual(readFileSync(target), f.output);
  assert.equal(first[0].destinationSha256, hash(f.output));
  assert.deepEqual(generated.sharedCapabilities[0].transforms, ['unified-visual-stages']);
  run(first, new Map([[destination, hash(f.output)]]));
  writeFileSync(target, '用户内容');
  assert.throws(() => run(rows(), new Map([[destination, hash(f.output)]])), /拒绝覆盖/);
  assert.equal(readFileSync(target, 'utf8'), '用户内容');
});

/** 创建独占临时仓库和可重复读取的阶段差异清单。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'unified-stage-migration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts/migration/templates'), { recursive: true });
  const source = Buffer.from('原始来源\r\n');
  const input = Buffer.from('导入语句\r\nvisualStage: V2\r\n后续校验\r\n');
  const output = Buffer.from('导入语句\r\nvisualStage: V3\r\n后续校验\r\n');
  const row = {
    stack: 'cocos', sourcePath: 'skills/source.mjs', destination: 'skills/target.mjs',
    sourceSha256: hash(source), inputSha256: hash(input), outputSha256: hash(output),
    hunks: [{ startLine: 1, remove: ['visualStage: V2\r\n'], insert: ['visualStage: V3\r\n'] }],
  };
  /** 模拟真实作者清单，保留路径、来源和目标之间的绑定。 */
  function save(patches = [row]) {
    writeFileSync(join(root, 'scripts/migration/templates/unified-stage-patches.json'), JSON.stringify({ schemaVersion: '1.0', patches }));
    return loadUnifiedStagePatches(root);
  }
  return { root, source, input, output, row, save };
}

test('统一阶段差异在语言适配后应用并保留原始换行', (t) => {
  const f = fixture(t);
  const args = { ...f.row, sourceBuffer: f.source, patches: f.save() };
  const result = adaptUnifiedStages(f.input, args);
  assert.equal(result.changed, true);
  assert.deepEqual(result.buffer, f.output);
  assert.equal(adaptUnifiedStages(f.input, { ...args, destination: 'skills/other.mjs' }).changed, false);
});

test('Flutter 布局工作流从真实源审计重建并拒绝源漂移', (t) => {
  const root = join(import.meta.dirname, '..');
  const sourcePath = 'adaptive-layout-implementation/references/implementation-workflow.md';
  const sourceFile = join(root, '..', 'flutter-skills', sourcePath);
  if (!existsSync(sourceFile)) return t.skip('需要只读 Flutter 源仓库');
  const sourceBuffer = readFileSync(sourceFile);
  const destination = 'skills/adaptive-layout-implementation/references/implementation-workflow.md';
  const args = { stack: 'flutter', sourcePath, destination, sourceBuffer, patches: loadUnifiedStagePatches(root) };
  assert.deepEqual(adaptUnifiedStages(sourceBuffer, args).buffer, readFileSync(join(root, destination)));
  assert.throws(() => adaptUnifiedStages(sourceBuffer, { ...args, sourceBuffer: Buffer.concat([sourceBuffer, Buffer.from('\n变更')]) }), /源摘要漂移/);
});

test('源文档阶段可重建，已统一公共阶段与协议版本不重复改写', () => {
  const actual = unifySourceVisualStages('V1 目标、V2 拆解、V3 素材、V4 运行；公共 V1 功能、公共 V2 目标；v2-ready、v4-complete；layout-v2/1.0、schema 2.0。');
  assert.equal(actual, 'V2 目标、V3 拆解、V4 素材、V5 运行；公共 V1 功能、公共 V2 目标；v3-ready、v5-complete；layout-v2/1.0、schema 2.0。');
  assert.equal(unifySourceVisualStages('V0→V1→V2→V3→V4'), 'V0→V1→V2→V3→V4→V5');
  assert.equal(unifySourceVisualStages('公共 V1→V2→V3→V4→V5'), '公共 V1→V2→V3→V4→V5');
});

test('全局基线只在 V1 功能验证后于 V2 完成选图', () => {
  const source = '全局规则在 G0/V0 的 brief 与三候选人工选择门中建立，并在确认后正式冻结；之后每个场景的 V1/V2 只冻结该场景的目标和方案，不得把场景 V2 当作全局基线选择。每项写明不变量、量化范围、允许变量、禁止项和证据：';
  const actual = unifySourceVisualStages(source);
  assert.match(actual, /V1 先实现并验证相关功能，白盒按需使用；V2 建立或复用视觉 brief/);
  assert.doesNotMatch(actual, /G0\/V0 的 brief 与三候选/);
});

test('公共控制器自有资源即使出现在旧账本也不会被过期清理', (t) => {
  const f = fixture(t);
  const previous = new Map();
  for (const relative of AUTHORED_CONTROL_RESOURCES) {
    const path = join(f.root, ...relative.split('/'));
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '作者维护的公共资源');
    previous.set(relative, hash(readFileSync(path)));
  }
  const removed = removeStaleGeneratedFiles(previous, new Set(AUTHORED_CONTROL_RESOURCES), (relative) => join(f.root, ...relative.split('/')), (relative) => hash(readFileSync(join(f.root, ...relative.split('/')))));
  assert.deepEqual(removed, []);
  for (const relative of AUTHORED_CONTROL_RESOURCES) assert.ok(existsSync(join(f.root, ...relative.split('/'))));
});

test('源、前置结果、差异上下文和目标结果漂移均拒绝', (t) => {
  const f = fixture(t);
  const args = { ...f.row, sourceBuffer: f.source, patches: f.save() };
  assert.throws(() => adaptUnifiedStages(f.input, { ...args, sourceBuffer: Buffer.from('来源被修改') }), /源摘要漂移/);
  assert.throws(() => adaptUnifiedStages(Buffer.from('前置内容被修改'), args), /前置内容漂移/);
  const wrongContext = { ...f.row, hunks: [{ ...f.row.hunks[0], remove: ['错误行\r\n'] }] };
  assert.throws(() => adaptUnifiedStages(f.input, { ...args, patches: f.save([wrongContext]) }), /上下文漂移/);
  const wrongOutput = { ...f.row, outputSha256: '0'.repeat(64) };
  assert.throws(() => adaptUnifiedStages(f.input, { ...args, patches: f.save([wrongOutput]) }), /输出摘要不符/);
});

test('重复或缺失计划来源在预检时拒绝，且不执行输出写入', (t) => {
  const f = fixture(t);
  assert.throws(() => f.save([f.row, f.row]), /来源重复/);
  const patches = f.save();
  const options = {
    readText: () => f.input.toString('utf8'),
    transformShared: (text) => ({ text }),
    transformText: (text) => ({ text }),
    repositoryRoot: f.root, patches,
  };
  const plan = { stack: 'cocos', entries: new Map([[f.row.sourcePath, { sourcePath: f.row.sourcePath, destination: f.row.destination, transforms: [] }]]), sourceBuffers: new Map([[f.row.sourcePath, f.source]]) };
  assert.doesNotThrow(() => assertUnifiedStageAdaptablePlans([plan], {}, options));
  assert.throws(() => assertUnifiedStageAdaptablePlans([], {}, options), /来源未列入当前计划/);
  plan.sourceBuffers.set(f.row.sourcePath, Buffer.from('来源漂移'));
  assert.throws(() => assertUnifiedStageAdaptablePlans([plan], {}, options), /源摘要漂移/);
});
