/** 在实际安装闭包中验证 Expo 页面公共阶段门与平台证据连接。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../../packages/installer/install-project-skills.mjs';

/** 写入隔离项目的合成工件，并返回其字节摘要。 */
function write(repo, path, content) {
  const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}

test('Expo 独立安装后可初始化页面并执行公共 V2 阶段门', async (t) => {
  const temporaryRoot = realpathSync(tmpdir());
  const repo = mkdtempSync(join(temporaryRoot, 'expo-installed-domain-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), temporaryRoot);
    assert.ok(basename(actual).startsWith('expo-installed-domain-'));
    rmSync(actual, { recursive: true, force: true });
  });

  installSkills({ projectRoot: repo, stacks: ['expo'] });
  const skills = join(repo, '.agents', 'skills');
  const runtime = join(skills, 'app-workflow-control', 'scripts', 'runtime');
  const { initializeWork, loadWork } = await import(pathToFileURL(join(runtime, 'workflow.mjs')).href);
  const { loadProfile } = await import(pathToFileURL(join(runtime, 'validation.mjs')).href);
  const { assertVisualReview } = await import(pathToFileURL(join(runtime, 'artifacts.mjs')).href);
  const initialized = await initializeWork({ repo, args: { id: 'home', stack: 'expo', type: 'PAGE', objective: '测试页面接线' } });
  const work = loadWork(repo, initialized.metadata.workItemPath);
  const profile = loadProfile(repo, 'expo');
  assert.equal(profile.id, 'expo');
  assert.deepEqual(work.allowedPaths, profile.runtimeRoots);
  assert.equal(work.stack, 'expo');
  assert.equal(work.workItemType, 'PAGE');

  // 此处用户确认与截图均为隔离测试材料，不代表真实项目的视觉验收。
  const referenceTarget = write(repo, 'fixture/target.png', '合成目标图');
  const platform = { schemaVersion: '1.0', platform: 'android', viewport: { width: 390, height: 844 }, safeArea: { top: 24, right: 0, bottom: 16, left: 0 }, fontScale: 1, expoSdkVersion: 'fixture', reactNativeVersion: 'fixture' };
  const platformProfileRef = write(repo, 'fixture/platform.json', platform);
  const qualityChecks = ['themeFit', 'audienceFit', 'taskReadability', 'viewingComfort', 'artCompletion'].map((dimension, index) => ({
    dimension, status: 'PASS', evidenceRef: write(repo, `fixture/quality/${index}.txt`, '合成人工检查').path,
  }));
  work.visual.stage = 'V2';
  work.visual.candidateId = 'fixture-candidate';
  const review = { schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, targetId: work.visual.objectId, candidateId: work.visual.candidateId, stage: 'V2', purpose: 'target', decision: 'APPROVED', userMessageRef: '合成用户消息', referenceTarget, targetRef: referenceTarget.path, targetSha256: referenceTarget.sha256, platformProfileRef, qualityChecks };
  work.visual.reviews.V2 = write(repo, 'fixture/review-v2.json', review);
  const domain = { schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: 'expo', workItemType: 'PAGE', visualStageModel: 'function-first-v1', visualStage: 'V2', objectId: work.visual.objectId, candidateId: work.visual.candidateId, referenceTarget, platformProfileRef };
  work.visual.domainEvidenceRef = write(repo, 'fixture/domain-v2.json', domain);
  assert.doesNotThrow(() => assertVisualReview(repo, work, 'V2'));

  domain.platformProfileRef = write(repo, 'fixture/other-platform.json', { ...platform, fontScale: 1.5 });
  work.visual.domainEvidenceRef = write(repo, 'fixture/domain-v2-wrong.json', domain);
  assert.throws(() => assertVisualReview(repo, work, 'V2'), /V2 确认 platformProfileRef.*当前文件/);
  assert.equal(JSON.parse(readFileSync(join(skills, 'app-stack-expo', 'profile.json'), 'utf8')).id, 'expo');
});
