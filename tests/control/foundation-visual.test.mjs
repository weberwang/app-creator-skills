import assert from 'node:assert/strict';
import { visualResearchFixture } from './visual-research-fixture.mjs';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { assertFoundationVisual } from '../../skills/app-workflow-control/scripts/runtime/foundation-visual.mjs';
import { validateGlobalBaseline } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { bindWorkSource } from '../../skills/app-workflow-control/scripts/runtime/work-source.mjs';

const repositories = [];

/** 为每个用例准备实际文件和绑定摘要，保证校验覆盖真实文件读取。 */
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'foundation-visual-'));
  repositories.push(repo);
  const put = (path, value) => {
    const absolute = join(repo, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, typeof value === 'string' ? value : JSON.stringify(value));
    return { path, sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex') };
  };
  const directionRef = put('visual/direction.txt', '场景视觉方向');
  const foundation = bindWorkSource({
    workItemType: 'FOUNDATION', stageId: 'foundation-engineering', globalState: 'COMPLETE',
    projectId: 'project-a', stack: 'unity',
  }, 'work/foundation.json');
  const work = {
    workItemType: 'SCENE', projectId: 'project-a', stack: 'unity',
    visual: { designRoute: 'world-3d', stage: 'V1' },
  };
  const manifest = {
    schemaVersion: '1.0', foundationWorkItemPath: 'work/foundation.json',
    projectId: 'project-a', stack: 'unity', baselines: [],
  };
  const configure = (decision = 'APPROVED') => {
    const selectionReviewRef = put('visual/review.json', {
      schemaVersion: '1.0', projectId: 'project-a', stack: 'unity', objectId: 'baseline-a',
      stage: 'BASELINE', purpose: 'visual-baseline', decision, userMessageRef: 'user://confirmed',
      subjectRef: directionRef,
    });
    const baseline = put('visual/baseline.json', {
      schemaVersion: '1.0', baselineId: 'baseline-a', projectId: 'project-a', stack: 'unity',
      designRoute: 'world-3d', directionRef, selectionReviewRef, visualResearchRef: visualResearchFixture(repo, 'project-a', 'unity'),
    });
    manifest.baselines = [{ route: 'world-3d', ref: baseline }];
    work.globalVisualBaselineRef = baseline;
    const ref = put('visual/foundation.json', manifest);
    work.foundationVisualRef = ref;
    foundation.foundationVisualRef = ref;
    put('work/foundation.json', foundation);
  };
  const options = {
    loadWork: (root, path) => bindWorkSource(JSON.parse(readFileSync(join(root, path), 'utf8')), path),
    validateGlobalBaseline,
  };
  configure();
  return { repo, put, work, foundation, manifest, configure, options };
}

afterEach(() => {
  for (const repo of repositories.splice(0)) rmSync(repo, { recursive: true, force: true });
});

test('已完成基础工程与真实用户确认允许模块复用全局方向', () => {
  const f = fixture();
  assert.doesNotThrow(() => assertFoundationVisual(f.repo, f.foundation, f.options));
  assert.doesNotThrow(() => assertFoundationVisual(f.repo, f.work, f.options));
});

test('未规划视觉的基础工程可完成，正式模块必须提供冻结来源', () => {
  const f = fixture();
  delete f.foundation.foundationVisualRef;
  assert.equal(assertFoundationVisual(f.repo, f.foundation, f.options), null);
  delete f.work.foundationVisualRef;
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /基础视觉冻结清单/);
});

test('模块不能使用其他项目或技术栈的冻结清单', () => {
  const f = fixture();
  f.work.projectId = 'project-b';
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /当前项目/);
  f.work.projectId = 'project-a';
  f.work.stack = 'threejs';
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /技术栈/);
});

test('模块不能使用内容已改变的冻结清单或基线', () => {
  const f = fixture();
  f.put('visual/foundation.json', { ...f.manifest, changed: true });
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /内容已变化/);
  f.configure();
  f.put('visual/baseline.json', { changed: true });
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /内容已变化/);
});

test('模块不能使用未完成的基础工程和不一致的视觉基线', () => {
  const f = fixture();
  f.foundation.globalState = 'REVIEW';
  f.put('work/foundation.json', f.foundation);
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /尚未完成/);
  f.foundation.globalState = 'COMPLETE';
  f.put('work/foundation.json', f.foundation);
  f.work.globalVisualBaselineRef = f.put('visual/other.json', { test: true });
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /视觉基线.*不一致/);
});

test('未获人工确认的基线不能作为基础工程或模块来源', () => {
  const f = fixture();
  f.configure('REJECTED');
  assert.throws(() => assertFoundationVisual(f.repo, f.foundation, f.options), /尚未获得人工确认/);
  assert.throws(() => assertFoundationVisual(f.repo, f.work, f.options), /尚未获得人工确认/);
});

test('基础工程工作项必须和冻结清单指向同一份工作项', () => {
  const f = fixture();
  bindWorkSource(f.foundation, 'work/other.json');
  assert.throws(() => assertFoundationVisual(f.repo, f.foundation, f.options), /基础视觉来源/);
});
