import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { validateMultiVisualStage } from '../../skills/app-workflow-control/scripts/runtime/multi-visual-contract.mjs';

/** 创建本测试独占的场景文件，保留真实路径和内容身份。 */
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'multi-visual-contract-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const put = (path, data) => {
    const full = join(repo, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, data);
    return { path, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') };
  };
  const json = (path, data) => put(path, JSON.stringify(data));
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion']
    .map((dimension) => ({ dimension, status: 'PASS', evidenceRef: 'quality.txt' }));
  put('quality.txt', '真实测试证据');
  const work = { workItemId: 'scene-task', stack: 'cocos', workItemType: 'SCENE', visual: { objectId: 'scene', stageModel: 'function-first-v1', targets: [] } };
  const manifest = { workItemId: 'scene-task', stack: 'cocos', visualStage: 'V5', items: [] };
  const visualCategories = ['runtime-layout', 'runtime-interaction'];
  for (const targetId of ['left', 'right']) {
    const referenceTarget = put(`targets/${targetId}.png`, `目标画面-${targetId}`);
    const target = { targetId, candidateId: `candidate-${targetId}`, sceneId: 'scene', stateId: 'default', viewport: { width: 1080, height: 1920 }, scope: targetId, referenceTarget,
      domainEvidenceRef: { path: json(`domain/${targetId}.json`, { identity: targetId }).path }, reviews: {}, assetReviewRef: json(`assets/${targetId}.json`, { userMessageRef: `user-${targetId}` }) };
    for (const [name, stage, purpose] of [['V2', 'V2', 'target'], ['V3Decomposition', 'V3', 'decomposition'], ['V3Layout', 'V3', 'layout'], ['V4', 'V4', 'imported-assets'], ['V5', 'V5', 'runtime-acceptance']]) {
      const image = name === 'V2' ? referenceTarget : put(`reviews/${targetId}-${name}.png`, `审阅画面-${targetId}-${name}`);
      const review = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: 'scene', targetId, candidateId: target.candidateId, stage, purpose, decision: 'APPROVED', userMessageRef: `user-${targetId}`, referenceTarget, targetRef: image.path, targetSha256: image.sha256, ...(name === 'V2' ? { qualityChecks } : {}) };
      if (name === 'V3Layout') {
        const path = target.reviews.V3Decomposition.path;
        review.decompositionReviewRef = { path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') };
      }
      target.reviews[name] = json(`reviews/${targetId}-${name}.json`, review);
    }
    work.visual.targets.push(target);
    for (const category of visualCategories) manifest.items.push({ category, status: 'PASS', targetId, path: put(`evidence/${targetId}-${category}.json`, '实际运行记录').path });
  }
  const coverage = { workItemId: work.workItemId, sceneId: 'scene', status: 'CONFIRMED', userMessageRef: 'actual-user', targetIds: ['left', 'right'], targets: work.visual.targets.map(({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget }) => ({ targetId, candidateId, sceneId, stateId, viewport, scope, referenceTarget })) };
  work.visual.coverageRef = json('coverage.json', coverage);
  work.visual.integrationEvidenceRef = json('integration.json', { workItemId: work.workItemId, sceneId: 'scene', status: 'APPROVED', userMessageRef: 'actual-user', targetIds: ['left', 'right'] });
  const options = { manifest, visualCategories, validateDomainTarget() {}, validateAssetReview(_repo, _work, target) { return JSON.parse(readFileSync(join(repo, target.assetReviewRef.path), 'utf8')); } };
  return { repo, work, manifest, options, put, json };
}

test('两个目标依次绑定用户确认、素材和运行证据并完成场景衔接', (t) => {
  const f = fixture(t);
  const workSchema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/work-item.schema.json', import.meta.url), 'utf8'));
  const checkVisual = new Ajv2020({ strict: false }).compile({ $defs: workSchema.$defs, $ref: '#/$defs/visual' });
  assert.equal(checkVisual({ ...f.work.visual, stage: 'V2' }), true, JSON.stringify(checkVisual.errors));
  for (const stage of ['V2', 'V3', 'V4', 'V5']) assert.equal(validateMultiVisualStage(f.repo, f.work, stage, f.options).length, 2);
});

test('丢失目标、错用目标确认或遗漏目标运行证据都不能完成', (t) => {
  const f = fixture(t);
  f.work.visual.targets.pop();
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V5', f.options), /覆盖清单/);
  const g = fixture(t);
  g.work.visual.targets[1].reviews.V3Layout = g.work.visual.targets[0].reviews.V3Layout;
  assert.throws(() => validateMultiVisualStage(g.repo, g.work, 'V3', g.options), /错绑/);
  const h = fixture(t);
  h.manifest.items = h.manifest.items.filter((item) => !(item.targetId === 'right' && item.category === 'runtime-interaction'));
  assert.throws(() => validateMultiVisualStage(h.repo, h.work, 'V5', h.options), /right 缺少 V5 运行证据/);
});

test('原地改写目标或确认图、替换已确认拆解记录都必须重新确认', (t) => {
  const f = fixture(t);
  f.put('targets/left.png', '新目标');
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', f.options), /内容已变化/);
  const g = fixture(t);
  g.put('reviews/right-V3Layout.png', '新布局图');
  assert.throws(() => validateMultiVisualStage(g.repo, g.work, 'V3', g.options), /内容已变化/);
  const h = fixture(t);
  const old = JSON.parse(readFileSync(join(h.repo, 'reviews/right-V3Decomposition.json'), 'utf8'));
  h.json('reviews/right-V3Decomposition.json', { ...old, userMessageRef: 'other-user' });
  assert.throws(() => validateMultiVisualStage(h.repo, h.work, 'V3', h.options), /确认记录.*内容已变化/);
});

test('只改确认记录或同时改图及确认记录时，冻结工作项引用阻断复用', (t) => {
  const f = fixture(t);
  const reviewPath = 'reviews/left-V2.json';
  const review = JSON.parse(readFileSync(join(f.repo, reviewPath), 'utf8'));
  f.json(reviewPath, { ...review, userMessageRef: 'altered-user' });
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', f.options), /确认记录.*内容已变化/);
  const g = fixture(t);
  const changed = g.put('reviews/left-V3Layout.png', '更换后的布局图');
  const layout = JSON.parse(readFileSync(join(g.repo, 'reviews/left-V3Layout.json'), 'utf8'));
  g.json('reviews/left-V3Layout.json', { ...layout, targetSha256: changed.sha256 });
  assert.throws(() => validateMultiVisualStage(g.repo, g.work, 'V3', g.options), /确认记录.*内容已变化/);
});

test('素材评审或场景衔接确认被替换时不能继续通过', (t) => {
  const f = fixture(t);
  f.json('assets/left.json', { userMessageRef: 'altered' });
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V4', f.options), /素材评审记录.*内容已变化/);
  const g = fixture(t);
  g.json('integration.json', { workItemId: g.work.workItemId, sceneId: 'scene', status: 'APPROVED', userMessageRef: 'altered', targetIds: ['left', 'right'] });
  assert.throws(() => validateMultiVisualStage(g.repo, g.work, 'V5', g.options), /场景目标衔接审阅.*内容已变化/);
});

test('旧 V2/V3 只允许通过显式来源链复用，V4 确认不可跨工作项', (t) => {
  const f = fixture(t);
  const reviewPath = 'reviews/left-V2.json';
  const review = JSON.parse(readFileSync(join(f.repo, reviewPath), 'utf8'));
  f.work.visual.targets[0].reviews.V2 = f.json(reviewPath, { ...review, workItemId: 'source-task' });
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', f.options), /不允许跨工作项复用/);
  f.options.validateReuseReview = (_repo, _work, target, name, ref) => target.targetId === 'left' && name === 'V2' && ref.path === reviewPath ? 'source-task' : null;
  assert.equal(validateMultiVisualStage(f.repo, f.work, 'V2', f.options).length, 2);
  const v3Path = 'reviews/right-V4.json';
  const v3 = JSON.parse(readFileSync(join(f.repo, v3Path), 'utf8'));
  f.work.visual.targets[1].reviews.V4 = f.json(v3Path, { ...v3, workItemId: 'source-task' });
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V4', f.options), /不允许跨工作项复用/);
});

test('场景覆盖清单跨工作项引用必须通过来源链确认', (t) => {
  const f = fixture(t);
  const coverage = JSON.parse(readFileSync(join(f.repo, 'coverage.json'), 'utf8'));
  f.work.visual.coverageRef = f.json('coverage.json', { ...coverage, workItemId: 'source-task' });
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', f.options), /覆盖清单不允许跨工作项复用/);
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', { ...f.options, validateReuseCoverage: () => 'wrong-task' }), /复用来源身份无效/);
  f.options.validateReuseCoverage = (_repo, _work, record) => record.workItemId === 'source-task' ? 'source-task' : null;
  assert.equal(validateMultiVisualStage(f.repo, f.work, 'V2', f.options).length, 2);
});

test('未执行栈领域校验或传入未等待的异步结果不得声称通过', (t) => {
  const f = fixture(t);
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', { ...f.options, validateDomainTarget: undefined }), /必须执行当前技术栈领域合同校验/);
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', { ...f.options, validateDomainTarget: () => Promise.resolve() }), /未等待的异步结果/);
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', { ...f.options, validateDomainTarget: () => false }), /领域合同校验失败/);
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', { ...f.options, validateDomainTarget: () => ['缺少目标'] }), /缺少目标/);
  f.work.visual.targets[0].referenceTarget.path = '../outside.png';
  assert.throws(() => validateMultiVisualStage(f.repo, f.work, 'V2', f.options), /不能包含/);
});
