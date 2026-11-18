import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { invalidateSingleDomainEvidence } from '../../skills/app-workflow-control/scripts/runtime/visual-domain-invalidation.mjs';
import { validateFigmaAppStage } from '../../skills/app-workflow-control/scripts/runtime/figma-app-contract.mjs';
import { attachFigmaAppFixture, figmaSnapshotFixture, writeFigmaFixture as write } from './figma-app-fixture.mjs';
import { attachFlutterDesignFixture } from './flutter-design-fixture.mjs';
import { encodePngRgba } from '../../skills/app-asset-workflow/scripts/png-raster.mjs';

/** 仅生成隔离的本地协议测试数据，不表示 Figma 执行或真实人工确认。 */
function fixture(t, stack) {
  const repo = mkdtempSync(join(tmpdir(), 'figma-return-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const work = { workItemId: 'work-a', projectId: 'project-a', stack, workItemType: 'PAGE',
    visual: { objectId: 'home', candidateId: 'candidate-a', stage: 'V5', reviews: {}, ...(stack === 'esp32' ? { designRoute: 'figma-app' } : {}) } };
  const referenceTarget = write(repo, 'design/target.png', encodePngRgba(2, 2, Buffer.alloc(16)));
  const doc = { referenceTarget, visualStage: 'V3', layoutSpecRef: write(repo, 'design/layout.json', { nodes: [
    { id: 'screen', parentId: null, x: 0, y: 0, width: 390, height: 844 },
    { id: 'title', parentId: 'screen', x: 16, y: 32, width: 240, height: 48 },
  ] }) };
  if (stack === 'esp32') {
    doc.boardProfileRef = write(repo, 'design/board.json', { screen: { width: 390, height: 844, colorFormat: 'RGB565' }, inputMethods: ['touch'], fonts: ['Noto Sans'], resourceBudget: { flashBytes: 100000, ramBytes: 32000 } });
  }
  if (stack === 'flutter') attachFlutterDesignFixture(repo, work, doc);
  attachFigmaAppFixture(repo, work, doc);
  work.visual.domainEvidenceRef = write(repo, 'domain/old.json', doc);
  return { repo, work, doc, referenceTarget };
}

/** 读取冻结 JSON 的当前内容，供测试核对已登记引用和保留的历史文件。 */
function content(repo, ref) {
  return JSON.parse(readFileSync(join(repo, ref.path), 'utf8'));
}

for (const stack of ['flutter', 'expo', 'esp32']) {
  test(`${stack} 的 V3 RETURN 阻止新封套重绑旧 Figma 交接并保留文件`, (t) => {
    const f = fixture(t, stack);
    assert.doesNotThrow(() => validateFigmaAppStage(f.repo, f.work, 'V3', f.doc));
    const invalidated = [];
    invalidateSingleDomainEvidence(f.repo, f.work, invalidated, 'V3');
    const paths = new Set(invalidated.map((item) => item.path));
    for (const ref of [f.doc.figmaHandoffRef, f.doc.layoutSpecRef, ...(f.doc.designReconstructionRef ? [f.doc.designReconstructionRef] : [])]) {
      assert.ok(paths.has(ref.path), `${ref.path} 应被作废`);
      assert.ok(readFileSync(join(f.repo, ref.path)).length > 0, `${ref.path} 历史文件应保留`);
    }
    const snapshot = content(f.repo, f.doc.figmaDesignRef);
    for (const ref of [f.doc.figmaDesignRef, snapshot.captureRef, f.referenceTarget]) assert.ok(!paths.has(ref.path), `${ref.path} 是不受影响的上游材料`);
    assert.equal(f.work.visual.domainEvidenceRef, undefined);
    f.work.invalidatedRefs = invalidated;
    f.work.visual.domainEvidenceRef = write(f.repo, 'domain/new.json', f.doc);
    const rebound = content(f.repo, f.work.visual.domainEvidenceRef);
    assert.throws(() => validateFigmaAppStage(f.repo, f.work, 'V3', rebound), /Figma 还原交接.*RETURN 已作废/);
  });
}

test('V2 RETURN 作废主目标和额外目标的节点及采集引用，保留全部历史目标图', (t) => {
  const f = fixture(t, 'expo');
  const extraPreview = write(f.repo, 'design/extra.png', encodePngRgba(2, 2, Buffer.alloc(16, 1)));
  const extra = figmaSnapshotFixture(f.repo, f.work, { prefix: 'design/extra', previewRef: extraPreview, stateId: 'expanded' });
  f.doc.additionalTargets = [{ referenceTarget: extraPreview, figmaDesignRef: extra.ref }];
  f.work.visual.domainEvidenceRef = write(f.repo, 'domain/with-extra.json', f.doc);
  const primary = content(f.repo, f.doc.figmaDesignRef);
  const invalidated = [];
  invalidateSingleDomainEvidence(f.repo, f.work, invalidated, 'V2');
  const paths = new Set(invalidated.map((item) => item.path));
  for (const ref of [f.doc.figmaDesignRef, primary.captureRef, extra.ref, extra.snapshot.captureRef, f.doc.figmaHandoffRef, f.doc.layoutSpecRef]) {
    assert.ok(paths.has(ref.path), `${ref.path} 应被作废`);
    assert.ok(readFileSync(join(f.repo, ref.path)).length > 0);
  }
  assert.ok(!paths.has(f.referenceTarget.path)); assert.ok(!paths.has(extraPreview.path));
});

test('V4/V5 RETURN 保留设计交接并按阶段撤销运行、构建与资源证据', (t) => {
  for (const stage of ['V4', 'V5']) {
    const f = fixture(t, 'expo');
    const source = write(f.repo, 'runtime/source.json', '合成源码快照');
    const assets = write(f.repo, 'runtime/assets.json', '合成资产清单');
    const run = write(f.repo, 'runtime/run.txt', '合成运行记录');
    const output = write(f.repo, 'runtime/build.log', '合成构建记录');
    const binary = write(f.repo, 'runtime/app.bin', '合成构建结果');
    const buildIdentityRef = write(f.repo, 'runtime/build.json', { artifactRef: binary, buildLogRef: output });
    const textReadbackRef = write(f.repo, 'runtime/text.json', { buildIdentityRef, runEvidenceRef: run });
    f.doc.layoutSourceRef = source; f.doc.assetManifestRef = assets;
    f.doc.runtimeContextRef = write(f.repo, 'runtime/context.json', { buildIdentityRef, runEvidenceRef: run, textReadbackRef });
    f.work.visual.domainEvidenceRef = write(f.repo, 'domain/runtime.json', f.doc);
    const invalidated = [];
    invalidateSingleDomainEvidence(f.repo, f.work, invalidated, stage);
    const paths = new Set(invalidated.map((item) => item.path));
    for (const ref of [f.doc.figmaDesignRef, f.doc.figmaHandoffRef, f.doc.layoutSpecRef, f.referenceTarget]) assert.ok(!paths.has(ref.path));
    for (const ref of [f.doc.runtimeContextRef, buildIdentityRef, textReadbackRef, run, output, binary]) {
      assert.ok(paths.has(ref.path), `${ref.path} 应被作废`);
      assert.ok(readFileSync(join(f.repo, ref.path)).length > 0);
    }
    assert.equal(paths.has(source.path), stage === 'V4'); assert.equal(paths.has(assets.path), stage === 'V4');
  }
});

test('领域封套或设计快照摘要损坏时不采信其内部路径，仍能执行 RETURN', (t) => {
  const f = fixture(t, 'expo');
  const primary = content(f.repo, f.doc.figmaDesignRef);
  write(f.repo, f.doc.figmaDesignRef.path, { captureRef: { path: 'untrusted.json', sha256: 'a'.repeat(64) } });
  let invalidated = [];
  assert.doesNotThrow(() => invalidateSingleDomainEvidence(f.repo, f.work, invalidated, 'V2'));
  assert.ok(invalidated.some((item) => item.path === f.doc.figmaDesignRef.path));
  assert.ok(!invalidated.some((item) => item.path === primary.captureRef.path || item.path === 'untrusted.json'));
  const g = fixture(t, 'expo');
  write(g.repo, g.work.visual.domainEvidenceRef.path, { figmaHandoffRef: { path: 'untrusted-handoff.json', sha256: 'a'.repeat(64) } });
  invalidated = [];
  assert.doesNotThrow(() => invalidateSingleDomainEvidence(g.repo, g.work, invalidated, 'V3'));
  assert.ok(!invalidated.some((item) => item.path === 'untrusted-handoff.json'));
});

test('游戏及未选择 Figma 的 ESP32 不扩展领域证据失效范围', (t) => {
  for (const stack of ['cocos', 'esp32']) {
    const f = fixture(t, stack === 'cocos' ? 'expo' : stack);
    f.work.stack = stack; if (stack === 'esp32') delete f.work.visual.designRoute;
    const invalidated = [];
    invalidateSingleDomainEvidence(f.repo, f.work, invalidated, 'V3');
    assert.deepEqual(invalidated.map((item) => item.path), ['domain/old.json']);
  }
});
