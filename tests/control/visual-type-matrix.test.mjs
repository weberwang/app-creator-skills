import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { initializeWork, loadWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { validateWork } from '../../skills/app-workflow-control/scripts/runtime/validation.mjs';

const stacks = ['unity', 'cocos', 'phaser', 'threejs', 'flutter'];
const types = ['PROJECT', 'FOUNDATION', 'MODULE', 'SCENE', 'PAGE', 'DISPLAY_LAYER', 'INTEGRATION', 'RELEASE'];
const schema = JSON.parse(readFileSync(new URL('../../skills/app-workflow-control/schemas/work-item.schema.json', import.meta.url), 'utf8'));
const validateSchema = new Ajv2020({ strict: false }).compile(schema);

/** 按领域入口矩阵判断对象是否可实际推进。 */
function supported(stack, type) {
  return !(type === 'PAGE' && stack !== 'flutter') && !(type === 'SCENE' && stack === 'flutter');
}

test('五栈初始化遵循真实视觉对象矩阵，失败不写工作项', async (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'visual-type-matrix-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  for (const stack of stacks) for (const type of types) {
    const id = `${stack}-${type.toLowerCase()}`;
    const args = { id, stack, type, objective: '验证对象类型', ...(type === 'DISPLAY_LAYER' ? { 'host-id': 'home', 'layer-type': 'modal' } : {}) };
    const path = `.workflow-control/work-items/${id}.json`;
    if (!supported(stack, type)) {
      await assert.rejects(initializeWork({ repo, args }), /领域合同.*(?:Flutter|SCENE|PAGE)/);
      assert.equal(existsSync(join(repo, path)), false, `${stack}/${type} 不得写入工作项`);
      continue;
    }
    const result = await initializeWork({ repo, args });
    const work = loadWork(repo, result.metadata.workItemPath);
    assert.equal(work.stack, stack);
    assert.equal(work.workItemType, type);
    assert.equal(validateSchema(work), true, JSON.stringify(validateSchema.errors));
    if (type === 'DISPLAY_LAYER') {
      assert.equal(work.visual.hostId, 'home');
      assert.throws(() => validateWork({ ...work, visual: { ...work.visual, hostId: ['home', 'shop'] } }, { repo }), /hostId/);
    }
    if (['SCENE', 'PAGE', 'DISPLAY_LAYER'].includes(type)) {
      // V1 只定义功能阶段，不要求已有白盒、选图或视觉合同。
      work.visual.stage = 'V1';
      assert.doesNotThrow(() => validateWork(work, { repo }));
      assert.equal(validateSchema(work), true, JSON.stringify(validateSchema.errors));
      assert.equal(work.globalVisualBaselineRef, null);
    }
  }
});

test('读取现有工作项和 schema 与初始化使用相同对象矩阵', async (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'visual-type-read-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const page = await initializeWork({ repo, args: { id: 'page', stack: 'flutter', type: 'PAGE', objective: '验证页面' } });
  const scene = await initializeWork({ repo, args: { id: 'scene', stack: 'cocos', type: 'SCENE', objective: '验证场景' } });
  const originals = new Map([page, scene].map((result) => [result, loadWork(repo, result.metadata.workItemPath)]));
  for (const [result, stack] of [[page, 'unity'], [page, 'cocos'], [page, 'phaser'], [page, 'threejs'], [scene, 'flutter']]) {
    const path = join(repo, result.metadata.workItemPath);
    const valid = originals.get(result);
    const invalid = { ...valid, stack };
    writeFileSync(path, JSON.stringify(invalid));
    assert.equal(validateSchema(invalid), false, `${stack}/${invalid.workItemType} 必须被 schema 拒绝`);
    assert.throws(() => loadWork(repo, result.metadata.workItemPath), /领域合同/);
  }
});
