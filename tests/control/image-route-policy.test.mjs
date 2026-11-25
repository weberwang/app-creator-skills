import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { collectWorkReferencePaths } from '../../skills/app-workflow-control/scripts/runtime/artifacts.mjs';
import { initializeWork, inspect, loadWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';

const cli = fileURLToPath(new URL('../../skills/app-workflow-control/scripts/workflow-control.mjs', import.meta.url));

/** 搭建隔离项目并注入可控预检，测试不需要真实 Codex 登录。 */
async function fixture(t) {
  const repo = await mkdtemp(join(tmpdir(), 'image-route-policy-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const first = { id: 'root', stack: 'cocos', type: 'PROJECT', objective: '冻结图片路线' };
  const next = { id: 'scene', stack: 'cocos', type: 'SCENE', objective: '使用冻结路线' };
  return { repo, first, next };
}

test('首次初始化预检通过时默认冻结 Codex 和 SVG，后续只继承且不重新预检', async (t) => {
  const { repo, first, next } = await fixture(t);
  let probeCount = 0;
  const created = await initializeWork({ repo, args: first, probeCodex: () => { probeCount++; return true; } });
  const firstWork = loadWork(repo, created.metadata.workItemPath);
  assert.equal(probeCount, 1);
  assert.equal(created.metadata.imageRoutes.designImageMethod, 'codex');
  assert.equal(created.metadata.imageRoutes.formalImageMethod, 'svg-to-png');
  const inherited = await initializeWork({ repo, args: next, workflowEntry: true, probeCodex: () => assert.fail('继承不再预检') });
  const nextWork = loadWork(repo, inherited.metadata.workItemPath);
  assert.deepEqual(nextWork.imageRoutesRef, firstWork.imageRoutesRef);
  assert.deepEqual(inspect({ repo, workItem: inherited.metadata.workItemPath }).metadata.imageRoutes, created.metadata.imageRoutes);
  assert(collectWorkReferencePaths(nextWork, repo).includes(firstWork.imageRoutesRef.path));
  await assert.rejects(initializeWork({ repo, args: { ...next, id: 'override', 'formal-image-method': 'direct-image-generation' } }), { code: 'IMAGE_ROUTES_FROZEN' });
});

test('预检失败先停止初始化，用户可在首次初始化明确替代方法', async (t) => {
  const { repo, first } = await fixture(t);
  await assert.rejects(initializeWork({ repo, args: first, probeCodex: () => false }), {
    code: 'DESIGN_IMAGE_METHOD_REQUIRED', message: /host-tool.*prompt-handoff/,
  });
  await assert.rejects(access(join(repo, '.workflow-control/work-items/root.json')), { code: 'ENOENT' });
  const initialized = await initializeWork({ repo, args: {
    ...first, 'design-image-method': 'host-tool', 'formal-image-method': 'direct-image-generation',
  }, probeCodex: () => assert.fail('选定其他方法时不需要 Codex') });
  assert.equal(initialized.metadata.imageRoutes.designImageMethod, 'host-tool');
  assert.equal(initialized.metadata.imageRoutes.formalImageMethod, 'direct-image-generation');
});

test('修改冻结记录会阻断已有工作项和继承初始化', async (t) => {
  const { repo, first, next } = await fixture(t);
  const initialized = await initializeWork({ repo, args: { ...first, 'design-image-method': 'prompt-handoff' } });
  const work = loadWork(repo, initialized.metadata.workItemPath);
  const policyFile = join(repo, work.imageRoutesRef.path);
  const policy = JSON.parse(await readFile(policyFile, 'utf8'));
  policy.formalImageMethod = 'direct-image-generation';
  await writeFile(policyFile, JSON.stringify(policy));
  assert.throws(() => loadWork(repo, initialized.metadata.workItemPath), { code: 'INVALID_IMAGE_ROUTES' });
  await assert.rejects(initializeWork({ repo, args: next, workflowEntry: true }), { code: 'INVALID_IMAGE_ROUTES' });
});

test('CLI 允许首次明确路线，视觉推进命令不接收重选参数', async (t) => {
  const { repo } = await fixture(t);
  const first = spawnSync(process.execPath, [cli, 'init', '--repo', repo, '--id', 'scene', '--type', 'SCENE', '--stack', 'cocos',
    '--objective', '验证独立图片工作项', '--design-image-method', 'prompt-handoff'], { encoding: 'utf8', windowsHide: true });
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const result = JSON.parse(first.stdout);
  assert.equal(result.metadata.imageRoutes.formalImageMethod, 'svg-to-png');
  const next = spawnSync(process.execPath, [cli, 'visual-stage', '--repo', repo, '--work-item', result.metadata.workItemPath,
    '--to', 'V2', '--design-image-method', 'host-tool'], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(next.status, 0);
  assert.match(next.stderr + next.stdout, /不接受 --design-image-method/);
});

test('纯 3D、直接 Figma 设计和服务端不会为无图工作发起预检', async (t) => {
  const { repo, next } = await fixture(t);
  for (const args of [
    { ...next, id: 'world', 'design-route': 'world-3d' },
    { ...next, id: 'figma', stack: 'flutter', type: 'PAGE', 'design-source': 'figma-direct',
      'design-source-message': 'test://figma', 'design-source-scope': '单页' },
    { ...next, id: 'service', stack: 'nodejs', type: 'PROJECT' },
  ]) {
    const result = await initializeWork({ repo, args, workflowEntry: true, probeCodex: () => assert.fail('无图任务无需预检') });
    assert.equal(result.metadata.imageRoutes, undefined);
  }
});
