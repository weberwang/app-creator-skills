import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { assertModuleDraftUnchanged, assertModuleVisualDesign } from '../../skills/app-workflow-control/scripts/runtime/module-visual-design.mjs';

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
  const plan = { entries: [
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

test('已确认模块稿允许多个条目共用画面，覆盖全部状态和进度', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => assertModuleVisualDesign(f.repo, f.work, f.plan));
  f.design.entries.pop();
  f.confirm();
  assert.throws(() => assertModuleVisualDesign(f.repo, f.work, f.plan), /未覆盖全部状态、步骤、转换及进度/);
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
  const domain = f.write('world.json', { directionRef: f.main, spatialSpecRef: f.extra });
  f.work.visual.designRoute = 'world-3d';
  f.work.visual.domainEvidenceRef = domain;
  delete f.work.visual.targets;
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
