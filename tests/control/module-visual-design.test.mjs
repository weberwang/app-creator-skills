import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { assertVisualReview, collectWorkReferencePaths, validateHumanReview } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { assertModuleDraftUnchanged, assertModuleVisualDesign, assertSupplementalDecompositionReviews } from '../../skills/app-workflow-control/scripts/runtime/module-visual-design.mjs';
import { invalidateSingleDomainEvidence } from '../../skills/app-workflow-control/scripts/runtime/visual-domain-invalidation.mjs';
import { worldViewFixture } from './world3d-completed-fixture.mjs';

/** 使用实际文件和摘要构建可重复的模块设计检查数据。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'module-visual-design-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  /** 写入项目文件并返回对应的冻结引用。 */
  function write(path, value) {
    const target = join(repo, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
    return { path, sha256: createHash('sha256').update(readFileSync(target)).digest('hex') };
  }
  const plan = { rules: { flows: [{ id: 'save-flow' }] }, entries: [
    { kind: 'function', id: 'save' }, { kind: 'state', id: 'ready' },
    { kind: 'step', id: 'submit' }, { kind: 'transition', id: 'saving' },
    { kind: 'progress', id: 'halfway' },
  ] };
  const planRef = write('plan.json', plan);
  const baseline = write('baseline.json', { id: 'global' });
  const main = write('main.png', '已确认主稿');
  const extra = write('extra.png', '已确认进度稿');
  const spatialSpec = write('spatial.json', { regions: ['one'] });
  const layout = write('layout.json', { path: 'scene' });
  const spaceReview = write('space-review.json', { type: 'review' });
  const spaceApproval = write('space-approval.json', { decision: 'APPROVED' });
  const work = {
    workItemId: 'module', projectId: 'project', stack: 'cocos', workItemType: 'SCENE',
    globalVisualBaselineRef: baseline,
    visual: { objectId: 'module', stage: 'V2', designRoute: 'world-2d', modulePlanRef: planRef,
      sceneDesignRef: write('scene-design.json', { scopeIds: ['one'], spatialSpecRef: spatialSpec,
        layoutRef: layout, reviewRef: spaceReview, spaceApprovalRef: spaceApproval }),
      targets: [
        { targetId: 'main', referenceTarget: main, reviews: { V2: write('review-main.json', {}) } },
        { targetId: 'extra', referenceTarget: extra, reviews: { V2: write('review-extra.json', {}) } },
      ] },
  };
  const design = {
    schemaVersion: '1.0', workItemId: 'module', modulePlanRef: planRef, baselineRef: baseline,
    entries: [
      { kind: 'state', id: 'ready', targetRef: main }, { kind: 'step', id: 'submit', targetRef: main },
      { kind: 'transition', id: 'saving', targetRef: main }, { kind: 'progress', id: 'halfway', targetRef: extra },
      { kind: 'function', id: 'save', targetRef: main }, { kind: 'flow', id: 'save-flow', targetRef: main },
    ],
  };
  /** 绑定清单与人工确认，模拟用户确认证据。 */
  function confirm() {
    work.visual.moduleDesignRef = write('module-design.json', design);
    work.visual.moduleDesignReviewRef = write('module-confirm.json', {
      schemaVersion: '1.0', workItemId: 'module', stage: 'V2', decision: 'approved',
      userMessageRef: 'message-1', subjectRef: work.visual.moduleDesignRef,
    });
  }
  confirm();
  return { repo, plan, work, design, write, confirm, main, extra };
}

/** 以真实校验格式写入合成拆解确认，供不同视觉路线共用。 */
function decomposition(f, path, referenceTarget, artifact, changes = {}) {
  const { work } = f;
  return f.write(path, {
    schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, targetId: work.visual.objectId,
    candidateId: work.visual.candidateId, hostId: work.visual.hostId, layerType: work.visual.layerType,
    stage: 'V3', purpose: 'decomposition', decision: 'APPROVED', userMessageRef: 'test://decomposition',
    referenceTarget, targetRef: artifact.path, targetSha256: artifact.sha256, ...changes,
  });
}

test('弹窗存在未确认的状态稿时阻断 V3，逐稿检查宿主、重复确认、材料摘要与返修', (t) => {
  const f = fixture(t);
  const retry = f.write('retry.png', '合成重试状态');
  const artifact = f.write('decomposition.json', { state: 'retry' });
  const { work } = f;
  work.workItemType = 'DISPLAY_LAYER';
  work.visual = {
    objectId: 'result-popup', hostId: 'level', layerType: 'modal', stage: 'V3', candidateId: 'selected',
    reviews: { V2: f.write('popup-review.json', { referenceTarget: f.main, approvedTargetRefs: [f.extra, retry] }) },
  };
  const extra = decomposition(f, 'extra-confirmation.json', f.extra, artifact);
  const retryReview = decomposition(f, 'retry-confirmation.json', retry, artifact);
  work.visual.supplementalDecompositionReviews = [extra];
  assert.throws(() => assertVisualReview(f.repo, work, 'V3'), /缺少 V3 拆解确认：retry.png/);
  /** 局部校验使用生产代码的用户确认规则，独立于主稿的原生清单夹具。 */
  const check = () => assertSupplementalDecompositionReviews(f.repo, work, validateHumanReview);
  work.visual.supplementalDecompositionReviews.push(extra);
  assert.throws(check, /重复登记/);
  work.visual.supplementalDecompositionReviews[1] = decomposition(f, 'wrong-host.json', retry, artifact, { hostId: 'other' });
  assert.throws(check, /未绑定当前工作项、对象及宿主/);
  const designCopy = f.write('copied-design.png', '已确认进度稿');
  work.visual.supplementalDecompositionReviews[1] = decomposition(f, 'copied-design-review.json', retry, designCopy);
  assert.throws(check, /拆解材料必须与 V2 原稿及确认记录独立/);
  work.visual.supplementalDecompositionReviews[1] = retryReview;
  assert.doesNotThrow(check);
  assert(collectWorkReferencePaths(work, f.repo).includes(artifact.path));
  f.write(artifact.path, '材料发生变化');
  assert.throws(check, /拆解材料.*重新冻结/);
  const invalidated = [];
  invalidateSingleDomainEvidence(f.repo, work, invalidated, 'V3');
  assert.equal(work.visual.supplementalDecompositionReviews, undefined);
  assert.deepEqual(invalidated.map(({ path }) => path), [extra.path, retryReview.path]);
});

test('Figma 共用效果图的两个状态稿仍分别确认当前拆解交接', (t) => {
  const f = fixture(t);
  const { work } = f;
  const main = f.write('frame-main.json', { state: 'main' });
  const extra = f.write('frame-extra.json', { state: 'extra' });
  const handoff = f.write('handoff.json', { mappings: ['main', 'extra'] });
  work.workItemType = 'PAGE';
  work.stack = 'expo';
  work.visual = { objectId: 'page', candidateId: 'selected', stage: 'V3',
    reviews: { V2: f.write('v2.json', { referenceTarget: f.main }) },
    domainEvidenceRef: f.write('figma-domain.json', { referenceTarget: f.main, figmaDesignRef: main, figmaHandoffRef: handoff,
      additionalTargets: [{ referenceTarget: f.main, figmaDesignRef: extra }] }),
  };
  work.visual.supplementalDecompositionReviews = [decomposition(f, 'main-review.json', f.main, handoff, { figmaDesignRef: main })];
  /** 原生拆解交接可以共用，但确认必须指明实际节点稿。 */
  const check = () => assertSupplementalDecompositionReviews(f.repo, work, validateHumanReview);
  assert.throws(check, /缺少 V3 拆解确认：frame-extra.json/);
  const stale = f.write('old-handoff.json', { mappings: ['main'] });
  work.visual.supplementalDecompositionReviews.push(decomposition(f, 'old-extra-review.json', f.main, stale, { figmaDesignRef: extra }));
  assert.throws(check, /未绑定当前 Figma 拆解交接/);
  work.visual.supplementalDecompositionReviews[1] = decomposition(f, 'extra-review.json', f.main, handoff, { figmaDesignRef: extra });
  assert.doesNotThrow(check);
});

test('三维场景独立二维稿需要拆解确认，共用 HUD 稿和机位预览沿各自的合同', (t) => {
  const f = fixture(t);
  f.work.visual.designRoute = 'world-3d';
  f.work.visual.candidateId = 'selected';
  f.work.visual.hud = { targets: [{ referenceTarget: f.main }] };
  f.design.scene2dDesignRefs = [f.main, f.extra];
  f.design.worldViews = [{ designRef: f.write('camera.png', '机位预览') }];
  f.confirm();
  /** 只核对本次引入的独立二维内容确认，不重复校验 HUD 或空间原生封套。 */
  const check = () => assertSupplementalDecompositionReviews(f.repo, f.work, validateHumanReview);
  assert.throws(check, /缺少 V3 拆解确认：extra\.png$/);
  const breakdown = f.write('sprites.json', { elements: ['sprite'] });
  f.work.visual.supplementalDecompositionReviews = [decomposition(f, 'sprite-review.json', f.extra, breakdown)];
  assert.doesNotThrow(check);
});

test('同一张确认稿可覆盖多个条目，每条冻结流程仍须单独绑定', (t) => {
  const f = fixture(t);
  f.plan.rules.flows.push({ id: 'retry-flow' });
  f.design.modulePlanRef = f.work.visual.modulePlanRef = f.write('plan.json', f.plan);
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /遗漏 V1 条目：flow:retry-flow/);
  f.design.entries.push({ kind: 'flow', id: 'retry-flow', targetRef: f.main });
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.entries.at(-1).id = 'other-module-flow';
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /超出 V1 模块方案.*other-module-flow/);
});

test('拒绝重复或超出方案的状态，并要求每份已确认稿都绑定用途', (t) => {
  const f = fixture(t);
  f.design.entries.push({ ...f.design.entries[0] });
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /重复或超出/);
  f.design.entries.pop();
  f.design.entries[0].id = 'other';
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /重复或超出/);
  f.design.entries[0].id = 'ready';
  f.design.entries[3].targetRef = f.main;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /已确认的设计稿未登记/);
});

test('用户确认必须绑定当前稿件摘要，目标稿也必须是已确认稿', (t) => {
  const f = fixture(t);
  f.work.visual.moduleDesignReviewRef = f.write('module-confirm.json', {
    schemaVersion: '1.0', workItemId: 'module', stage: 'V2', decision: 'approved',
    userMessageRef: 'message-1', subjectRef: { ...f.work.visual.moduleDesignRef, sha256: '0'.repeat(64) },
  });
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /缺少绑定当前清单/);
  f.design.entries[0].targetRef = f.write('unapproved.png', '未经确认');
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /未绑定 V2 已确认/);
});

test('V3 起维持 V2 目标和确认，不允许更换状态稿', (t) => {
  const f = fixture(t);
  const snapshot = structuredClone(f.work);
  assert.doesNotThrow(() => assertModuleDraftUnchanged(f.repo, snapshot, f.work));
  f.work.visual.targets[0].referenceTarget = f.extra;
  assert.throws(() => assertModuleDraftUnchanged(f.repo, snapshot, f.work), /场景设计目标已变化/);
});

test('二维空间布局与人工确认在后续阶段保持冻结，可省略布局运行', (t) => {
  const f = fixture(t);
  const snapshot = structuredClone(f.work);
  const original = JSON.parse(readFileSync(join(f.repo, snapshot.visual.sceneDesignRef.path), 'utf8'));
  f.work.visual.sceneDesignRef = f.write('scene-design-v3.json', { ...original, spaceApprovalRef: f.write('other-approval.json', { decision: 'APPROVED' }) });
  assert.throws(() => assertModuleDraftUnchanged(f.repo, snapshot, f.work), /二维空间依据 spaceApprovalRef 已变化/);
  f.work.visual.sceneDesignRef = f.write('scene-design-v3.json', { ...original, layoutRunRef: f.write('run.json', { id: 'run' }) });
  assert.throws(() => assertModuleDraftUnchanged(f.repo, snapshot, f.work), /二维空间依据 layoutRunRef 已变化/);
});

test('Figma 图像目标必须绑定对应可编辑稿，额外状态稿不能遗漏', (t) => {
  const f = fixture(t);
  const editable = f.write('main-figma.json', { id: 'main' });
  const editableExtra = f.write('extra-figma.json', { id: 'extra' });
  f.work.workItemType = 'PAGE';
  f.work.stack = 'flutter';
  f.work.visual.designRoute = 'figma-app';
  f.work.visual.reviews = { V2: f.write('page-review.json', { referenceTarget: f.main }) };
  delete f.work.visual.targets;
  f.work.visual.domainEvidenceRef = f.write('domain.json', { referenceTarget: f.main, figmaDesignRef: editable,
    additionalTargets: [{ referenceTarget: f.extra, figmaDesignRef: editableExtra }] });
  for (const entry of f.design.entries) entry.designRef = entry.targetRef === f.main ? editable : editableExtra;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  // 附加稿及可编辑节点也属于只读设计依据，不能成为实施输出。
  f.design.entries[3].targetRef = f.main;
  f.design.entries[3].designRef = editable;
  f.design.entries[0].additionalTargets = [{ targetRef: f.extra, designRef: editableExtra }];
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  const protectedPaths = collectWorkReferencePaths(f.work, f.repo);
  assert.ok(protectedPaths.includes(f.extra.path));
  assert.ok(protectedPaths.includes(editableExtra.path));
  f.design.entries[0].designRef = editableExtra;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /未绑定 V2 已确认/);
  f.design.entries[0].designRef = editable;
  f.confirm();
  const snapshot = structuredClone(f.work);
  f.work.visual.domainEvidenceRef = f.write('domain-v3.json', { referenceTarget: f.main, figmaDesignRef: editable,
    additionalTargets: [{ referenceTarget: f.extra, figmaDesignRef: editable }] });
  assert.throws(() => assertModuleDraftUnchanged(f.repo, snapshot, f.work), /Figma 状态稿/);
});

test('三维空间与方向必须关联独立状态设计，不能借确认记录冒充规格', (t) => {
  const f = fixture(t);
  const state = f.write('state-spec.json', { description: '运行阶段的对象、反馈与时序' });
  const domain = f.write('world.json', { directionRef: f.main, spatialSpecRef: f.extra, scopeIds: ['one'] });
  f.work.visual.designRoute = 'world-3d';
  f.work.visual.domainEvidenceRef = domain;
  delete f.work.visual.targets;
  Object.assign(f.design, worldViewFixture(f, ['one']));
  for (const entry of f.design.entries) entry.designRef = state;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.entries[0].designRef = f.main;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /不能引用控制记录/);
  f.design.entries[0].designRef = state;
  f.confirm();
  const snapshot = structuredClone(f.work);
  f.work.visual.domainEvidenceRef = f.write('world-v3.json', { directionRef: f.extra, spatialSpecRef: f.extra });
  assert.throws(() => assertModuleDraftUnchanged(f.repo, snapshot, f.work), /三维空间依据 directionRef 已变化/);
});

/** 在独立场景中生成多机位和可选 HUD，所有图片均为测试用合成材料。 */
function worldFixture(t, withHud = false) {
  const f = fixture(t);
  const stateDesign = f.write('world-state.json', { description: '合成状态设计' });
  f.work.visual.designRoute = 'world-3d';
  f.work.visual.domainEvidenceRef = f.write('world-domain.json', {
    directionRef: f.main, spatialSpecRef: f.extra, scopeIds: ['one'],
  });
  delete f.work.visual.targets;
  for (const entry of f.design.entries) entry.designRef = stateDesign;
  if (withHud) {
    const referenceTarget = f.write('hud-target.txt', '合成 HUD 来源');
    const target = { targetId: 'hud-main', stateId: 'ready', viewport: { width: 1280, height: 720 },
      referenceTarget, reviews: { V2: f.write('hud-review.json', { decision: 'APPROVED' }) } };
    f.work.visual.hud = { scopeIds: ['hud-scope'], targets: [target] };
    f.design.entries[2].targetRef = f.extra;
    f.design.entries[3].targetRef = referenceTarget;
    delete f.design.entries[3].designRef;
  }
  Object.assign(f.design, worldViewFixture(f, ['one'], f.work.visual.hud));
  f.confirm();
  return f;
}

test('三维场景的非 HUD 二维内容可独立出稿，无需机位预览', (t) => {
  const f = worldFixture(t, true);
  delete f.design.worldViews;
  delete f.design.hudSourceRef;
  f.design.scene2dDesignRefs = [f.work.visual.hud.targets[0].referenceTarget];
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  const sprites = f.write('scene-sprites.txt', '合成二维精灵稿');
  const feedback = f.write('scene-feedback.txt', '合成二维反馈稿');
  f.plan.entries.push({ kind: 'element', id: 'sprite' }, { kind: 'element', id: 'feedback' });
  f.design.modulePlanRef = f.work.visual.modulePlanRef = f.write('plan.json', f.plan);
  f.design.scene2dDesignRefs = [sprites];
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /element:sprite、element:feedback/);
  const sprite = { kind: 'element', id: 'sprite', targetRef: f.main, designRef: f.design.entries[0].designRef };
  f.design.entries.push(sprite);
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /二维要素 sprite 须绑定已确认的 HUD 或场景二维稿/);
  delete sprite.designRef;
  sprite.targetRef = sprites;
  f.design.scene2dDesignRefs.push(feedback);
  const feedbackEntry = { kind: 'element', id: 'feedback', targetRef: f.work.visual.hud.targets[0].referenceTarget };
  f.design.entries.push(feedbackEntry);
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /未登记模块方案用途.*scene-feedback/);
  feedbackEntry.targetRef = feedback;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  const spriteStates = f.write('scene-sprite-states.txt', '同一精灵的其他状态稿');
  f.design.scene2dDesignRefs.push(spriteStates);
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /未登记模块方案用途.*sprite-states/);
  sprite.additionalTargets = [{ targetRef: f.write('unknown-sheet.txt', '未经确认的稿件') }];
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /未绑定 V2 已确认.*element:sprite/);
  sprite.additionalTargets = [{ targetRef: spriteStates }, { targetRef: sprites }];
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /element:sprite.*重复引用/);
  sprite.additionalTargets.pop();
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.write(spriteStates.path, '改写已确认的合成二维稿');
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /二维内容设计稿.*变化/);
});

test('三维上下文预览按需提供，引用后核验身份、范围、独立文件与摘要', (t) => {
  const f = worldFixture(t);
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  const views = structuredClone(f.design.worldViews);
  delete f.design.worldViews;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews = structuredClone(views);
  f.design.worldViews.pop();
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews = structuredClone(views);
  f.design.worldViews[1].camera.position = views[0].camera.position;
  f.design.worldViews[1].stateId = 'other-state';
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews[1].viewId = views[0].viewId;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /viewId|重复|唯一/);
  f.design.worldViews = structuredClone(views);
  f.design.worldViews[1].scopeIds = ['other'];
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /范围/);
  f.design.worldViews = structuredClone(views);
  f.design.worldViews[1].designRef = views[0].designRef;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /设计稿|重复|视图/i);
  f.design.worldViews = structuredClone(views);
  f.confirm();
  f.write(views[0].designRef.path, '替换后的合成机位稿');
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /变化|摘要|SHA/i);
});

test('同状态同视口的三维机位引用同一个 HUD 目标和来源', (t) => {
  const f = worldFixture(t, true);
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews[1].hudTargetId = 'unknown-hud';
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /HUD/i);
  f.design.worldViews[1].hudTargetId = 'hud-main';
  f.design.worldViews[1].viewport = { width: 720, height: 1280 };
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /HUD|视口/i);
  f.design.worldViews[1].viewport = { width: 1280, height: 720 };
  delete f.design.hudSourceRef;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /HUD/i);
  f.design.hudSourceRef = f.work.visual.hud.targets[0].referenceTarget;
  const otherTarget = { ...f.work.visual.hud.targets[0], targetId: 'hud-other',
    referenceTarget: f.write('other-hud-target.txt', '另一个合成 HUD 目标') };
  f.work.visual.hud.targets.push(otherTarget);
  f.design.entries[1].targetRef = f.extra;
  f.design.entries[2].targetRef = f.work.visual.hud.targets[0].referenceTarget;
  delete f.design.entries[2].designRef;
  f.design.entries[3].targetRef = otherTarget.referenceTarget;
  f.design.worldViews[1].hudTargetId = otherTarget.targetId;
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /同状态同视口.*共用同一 HUD/);
});

test('HUD 有正式目标时可不提供三维上下文预览及共同界面源', (t) => {
  const f = worldFixture(t, true);
  delete f.design.worldViews;
  delete f.design.hudSourceRef;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
});

test('已有模型生产归档时 HUD V2 返修可调整上下文预览', (t) => {
  const f = worldFixture(t, true);
  const previousDesign = f.write('original-world-design.json', structuredClone(f.design));
  f.work.visual.modelProductionBasisRef = f.write('model-production-basis.json', {
    visualStage: 'V3',
    world3dModelProductionBasis: { moduleDesignRef: previousDesign },
  });
  f.work.returnRecord = { affectedScope: 'hud:V2' };
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  const worldViews = structuredClone(f.design.worldViews);
  f.design.worldViews[0].camera.position[0] += 1;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews = structuredClone(worldViews);
  f.design.worldViews[0].designRef = f.write('replacement-world-view.txt', '重新生成的合成机位稿');
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews = worldViews;
  f.design.hudSourceRef = f.write('revised-hud-source.txt', 'HUD 返修后的合成界面源');
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  delete f.design.worldViews;
  delete f.design.hudSourceRef;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.worldViews = structuredClone(worldViews);
  f.design.hudSourceRef = f.work.visual.hud.targets[0].referenceTarget;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
});

test('三维机位设计稿不能引用空间规格或确认记录的硬链接别名', (t) => {
  const f = worldFixture(t);
  const domain = JSON.parse(readFileSync(join(f.repo, f.work.visual.domainEvidenceRef.path), 'utf8'));
  domain.spaceApprovalRef = f.write('world-space-approval.json', { decision: 'APPROVED' });
  f.work.visual.domainEvidenceRef = f.write('world-domain-with-approval.json', domain);
  const original = f.design.worldViews[0].designRef;
  for (const [index, control] of [domain.spatialSpecRef, domain.spaceApprovalRef].entries()) {
    const path = `control-hardlink-${index}.txt`;
    // 同一文件的硬链接名称也不能作为独立设计稿。
    linkSync(join(f.repo, control.path), join(f.repo, path));
    f.design.worldViews[0].designRef = { path, sha256: control.sha256 };
    f.confirm();
    assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /独立|硬链接|控制|来源/);
  }
  f.design.worldViews[0].designRef = original;
  f.confirm();
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
});
