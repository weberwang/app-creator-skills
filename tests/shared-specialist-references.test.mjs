/** 核对专业参考完整共享、原生差异、来源防漂移及配套链接。 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedSpecialistReferences, SPECIALIST_REFERENCE_FAMILIES } from '../scripts/migration/shared-specialist-references.mjs';
import { SPECIALIST_TRACKED_REFERENCES } from '../scripts/migration/specialist-reference-specs.mjs';
import { referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { unifySourceVisualStages } from '../scripts/migration/unified-stage-text.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const SOURCE_FILES = SPECIALIST_REFERENCE_FAMILIES.flatMap((family) => family.sources);

/** 源仓库不可用时不能把测试夹具当作实际迁移来源。 */
function hasSources() {
  return SOURCE_FILES.every((source) => existsSync(resolve(SOURCE_ROOT, `${source.stack}-skills`, ...source.sourcePath.split('/'))));
}

/** 将结果应用在原有专业路径上；真实迁移随后会统一重定位引用。 */
function apply(plan, source, text) {
  return applySharedWorkflowSections(text, { stack: source.stack, sourcePath: source.sourcePath,
    destination: source.sourcePath, repositoryRoot: ROOT, plan }).text;
}

/** 精确读取源文件，测试仅将结果保存在内存。 */
function readSource(source, root = SOURCE_ROOT) {
  return readFileSync(resolve(root, `${source.stack}-skills`, ...source.sourcePath.split('/')), 'utf8');
}

/** 示例代码内的 Markdown 标题不是可跳转章节，不作为原生锚点。 */
function headingsOutsideFences(text) {
  let fence = null;
  const headings = [];
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (marker && !fence) { fence = marker[0]; continue; }
    if (marker && fence === marker[0]) { fence = null; continue; }
    if (!fence && /^#{1,6}\s+/.test(line)) headings.push(line);
  }
  return headings;
}

test('三栈专业参考完整共享共同规则，未抽取正文、标题和本栈链接逐项保留', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedSpecialistReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.equal(SPECIALIST_REFERENCE_FAMILIES.length, 30);
  assert.equal(SOURCE_FILES.length, 86);
  assert.equal(plan.documents.length, 30);
  const layout = plan.documents.find((document) => document.capabilityId === 'reference-ui-layout-contract');
  assert.doesNotMatch(layout.content, /绝对定位和悬浮元素是可审查模式，不是格式错误/);
  assert.match(layout.content, /普通 UI 使用独立定位时均拒绝/);
  assert.ok(plan.replacements.length >= 2400, '公共规范必须保留完整规则，不能简化成概述');
  for (const family of SPECIALIST_REFERENCE_FAMILIES) {
    const document = plan.documents.find((item) => item.capabilityId === family.id);
    assert.ok(document && document.content.length > 100, `缺少公共参考：${family.id}`);
    assert.ok(document.sources.length >= 2);
    for (const source of family.sources) {
      const text = readSource(source);
      const matches = plan.replacements.filter((item) => item.stack === source.stack && item.sourcePath === source.sourcePath);
      const transformed = apply(plan, source, text);
      for (const item of matches) {
        assert.equal(text.slice(item.sourceRange.start, item.sourceRange.end), item.original);
        assert.equal(referenceBlockHash(item.original), item.sourceHash);
        assert.equal(referenceBlockHash(item.canonical), item.canonicalHash);
        assert.ok(document.content.includes(item.canonical), `${family.id} 公共正文缺失完整源块`);
        if (/^\d+[.)]\s+/.test(item.original)) assert.ok(item.canonical.startsWith(item.original.match(/^\d+[.)]\s+/)[0]), '不能丢失步骤编号');
        if (/^\s*(?:```|~~~)/.test(item.original)) assert.equal(item.canonical, unifySourceVisualStages(item.original.trim().replaceAll('\r\n', '\n')), '代码围栏仅更新阶段语义，其他代码按原文共享');
        for (const link of item.referenceLinks ?? []) assert.ok(transformed.includes(`[${link.label}](${link.target})`), `${source.stack} 丢失本栈资料链接`);
      }
      const covered = new Set(matches.map((item) => `${item.sourceRange.start}:${item.sourceRange.end}`));
      for (const block of readWorkflowBlocks(text)) {
        if (!covered.has(`${block.sourceRange.start}:${block.sourceRange.end}`)) assert.ok(transformed.includes(block.original.trim()), `${source.stack}/${source.sourcePath} 未抽取的原生正文丢失`);
      }
      for (const heading of headingsOutsideFences(text)) assert.ok(transformed.includes(heading), `${source.stack}/${source.sourcePath} 原有章节锚点丢失：${heading}`);
    }
  }
});

test('共享包含空行的完整代码示例，保持广告桥接接口和原始换行', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedSpecialistReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const blocks = plan.replacements.filter((item) => item.capabilityId === 'reference-ad-applovin-max-contract'
    && item.sourceHeading === '公开桥接接口与结构化结果' && /^```ts/.test(item.original.trim()) && /\n\s*\n/.test(item.original));
  assert.deepEqual(blocks.map((item) => item.stack).sort(), ['cocos', 'phaser', 'threejs']);
  const doc = plan.documents.find((item) => item.capabilityId === 'reference-ad-applovin-max-contract');
  assert.ok(doc.content.includes('interface NativeAdEvent'));
  assert.ok(doc.content.includes(blocks[0].canonical));
});

test('原生广告接入、布局合同及 Three.js 动画路线不被错误归一化', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedSpecialistReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  for (const [familyId, stack, evidence] of [
    ['reference-ad-applovin-max-contract', 'cocos', 'Cocos 原生插件与 JSB 适配层'],
    ['reference-ad-applovin-max-contract', 'phaser', 'Capacitor 使用其 Cordova 兼容层'],
    ['reference-ui-layout-contract', 'cocos', 'schema 2.0.0'],
    ['reference-ui-layout-contract', 'phaser', 'schema 1.2.0'],
    ['reference-ui-layout-contract', 'threejs', 'schema 1.3.0'],
    ['reference-asset-asset-production-routes', 'threejs', 'AnimationMixer'],
  ]) {
    const source = SPECIALIST_REFERENCE_FAMILIES.find((family) => family.id === familyId).sources.find((item) => item.stack === stack);
    assert.ok(apply(plan, source, readSource(source)).includes(evidence), `${familyId}/${stack} 丢失原生规则：${evidence}`);
  }
});

test('同名资料目标不同不会制造等价，先前已接管的源区间不会再次抽取', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const initial = buildSharedSpecialistReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const feedback = initial.documents.find((item) => item.capabilityId === 'reference-feedback-design-guide');
  assert.ok(!feedback.content.includes('Sound Manager 属于 Game'), '不应共享相同标签但 URL 不同的原生声音规则');
  for (const stack of ['phaser', 'threejs']) {
    const source = SPECIALIST_REFERENCE_FAMILIES.find((family) => family.id === feedback.capabilityId).sources.find((item) => item.stack === stack);
    assert.ok(apply(initial, source, readSource(source)).includes('Sound Manager 属于 Game'));
  }
  const spine = initial.documents.find((item) => item.capabilityId === 'reference-spine-progress-state');
  assert.ok(spine.content.includes('或 Cocos 容器来源'), 'Spine 公共输入须保留可读取的 Cocos 导出容器格式');
  const phaserSpine = SPECIALIST_REFERENCE_FAMILIES.find((family) => family.id === spine.capabilityId).sources.find((item) => item.stack === 'phaser');
  assert.ok(!apply(initial, phaserSpine, readSource(phaserSpine)).includes('或 Cocos 容器来源'));
  assert.deepEqual(initial.replacements.filter((item) => item.capabilityId === spine.capabilityId
    && item.original.includes('或 Cocos 容器来源')).map((item) => item.stack).sort(), ['cocos', 'phaser']);
  const selected = initial.replacements.find((item) => item.capabilityId === 'reference-asset-art-quality-contract');
  const taken = initial.replacements.filter((item) => item.capabilityId === selected.capabilityId
    && item.sourceHeading === selected.sourceHeading && item.canonical === selected.canonical);
  const plan = buildSharedSpecialistReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT, excludedReplacements: taken });
  for (const item of taken) {
    assert.ok(!plan.replacements.some((candidate) => candidate.stack === item.stack && candidate.sourcePath === item.sourcePath
      && candidate.sourceRange.start < item.sourceRange.end && candidate.sourceRange.end > item.sourceRange.start));
  }
});

test('已审计来源缺失、摘要漂移或 Git 参考清单新增时拒绝迁移', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const tempRoot = mkdtempSync(join(tmpdir(), 'specialist-reference-source-'));
  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));
  const trackedFilesByStack = Object.fromEntries(Object.entries(SPECIALIST_TRACKED_REFERENCES).map(([stack, folders]) => [stack, Object.values(folders).flat()]));
  for (const [stack, paths] of Object.entries(trackedFilesByStack)) for (const path of paths) {
    const target = resolve(tempRoot, `${stack}-skills`, ...path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, ...path.split('/')), target);
  }
  const build = () => buildSharedSpecialistReferences({ sourceRoot: tempRoot, repositoryRoot: ROOT, trackedFilesByStack });
  const source = SOURCE_FILES[0];
  const target = resolve(tempRoot, `${source.stack}-skills`, ...source.sourcePath.split('/'));
  const original = readFileSync(target);
  writeFileSync(target, Buffer.concat([original, Buffer.from('\n未审核变更')]));
  assert.throws(build, /摘要漂移/);
  writeFileSync(target, original);
  rmSync(target);
  assert.throws(build, /不可读取/);
  writeFileSync(target, original);
  const untracked = join(dirname(target), 'untracked-reference.md');
  writeFileSync(untracked, '用户个人参考');
  assert.doesNotThrow(build, '未跟踪的用户文件不能阻塞迁移');
  trackedFilesByStack[source.stack].push(`${source.sourcePath.slice(0, source.sourcePath.lastIndexOf('/') + 1)}untracked-reference.md`);
  assert.throws(build, /Git 清单变化/);
});
