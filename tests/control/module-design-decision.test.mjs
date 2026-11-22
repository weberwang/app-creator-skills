import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import Ajv2020 from '../../skills/app-skill-runtime/ajv2020.mjs';
import { advanceVisual, completeUnit, transitionWork } from '../../skills/app-workflow-control/scripts/runtime/workflow.mjs';
import { createFixture, frozenReview, put, putJson, readWork } from './controller-fixture.mjs';

/** 创建可通过正常状态迁移验证的合成模块设计决策。 */
async function fixture(t, approach) {
  const context = await createFixture({ id: `design-${approach}`, stack: 'flutter', type: 'PAGE' });
  t.after(() => rm(context.repo, { recursive: true, force: true }));
  const work = await readWork(context.repo, context.workPath);
  work.globalState = 'PROPOSAL';
  work.gateStatus.F1 = 'PASS';
  work.gateStatus.F2 = 'PASS';
  work.grillingRef = { path: '.workflow-control/grilling/module-design.json' };
  await putJson(context.repo, context.workPath, work);
  const proposalPath = await put(context.repo, 'design/confirmed.txt', '方案和适用状态');
  const referencePath = await put(context.repo, 'design/research.txt', '参考产品来源和适用观察');
  const proposalRef = await frozenReview(context.repo, proposalPath);
  const referenceRef = await frozenReview(context.repo, referencePath);
  const decision = {
    kind: 'module-design', question: '胜利界面如何呈现', impact: '影响设计稿',
    options: ['调研参考', '人工调整'], recommendation: '调研参考',
    answer: approach,
    userMessageRef: 'chat://choice',
    resolution: {
      approach, choiceUserMessageRef: 'chat://choice', confirmationUserMessageRef: 'chat://approval',
      proposalRef, ...(approach === 'research' ? { referenceRefs: [referenceRef] } : {}),
    },
  };
  const record = { schemaVersion: '1.0', workItemId: work.workItemId, status: 'CLOSED', userMessageRef: 'chat://choice', decisions: [decision] };
  /** 通过公共状态迁移执行门禁。 */
  const advance = () => transitionWork({ repo: context.repo, workItem: context.workPath, to: 'REVIEW', args: {} });
  /** 开放记录允许编辑，关闭后冻结用户决定和方案之间的绑定。 */
  const save = async ({ freeze = record.status === 'CLOSED' } = {}) => {
    const path = await putJson(context.repo, work.grillingRef.path, record);
    work.grillingRef = freeze ? await frozenReview(context.repo, path) : { path };
    await putJson(context.repo, context.workPath, work);
  };
  return { ...context, work, decision, record, proposalPath, referencePath, advance, save };
}

for (const approach of ['research', 'manual']) {
  test(`模块设计按 ${approach} 路线须先选择，再确认方案才能推进`, async (t) => {
    const f = await fixture(t, approach);
    f.record.status = 'OPEN';
    await f.save();
    await assert.rejects(f.advance(), /未决拷问/);
    await assert.rejects(advanceVisual({ repo: f.repo, workItem: f.workPath, to: 'V2' }), /未决拷问/);
    f.record.status = 'NOT_REQUIRED';
    await f.save();
    await assert.rejects(f.advance(), /模块设计未决项/);
    f.record.status = 'CLOSED';
    await f.save({ freeze: false });
    await assert.rejects(f.advance(), /冻结 grillingRef/);
    delete f.decision.kind;
    await f.save();
    await assert.rejects(f.advance(), /明确登记模块设计决策类型/);
    f.decision.kind = 'module-desgin';
    await f.save();
    await assert.rejects(f.advance(), /决策类型无效/);
    f.decision.kind = 'module-design';
    const confirmed = f.decision.resolution.confirmationUserMessageRef;
    delete f.decision.resolution.confirmationUserMessageRef;
    await f.save();
    await assert.rejects(f.advance(), /confirmationUserMessageRef/);
    f.decision.resolution.confirmationUserMessageRef = confirmed;
    f.decision.resolution.choiceUserMessageRef = 'chat://other-choice';
    await f.save();
    await assert.rejects(f.advance(), /路线选择须绑定/);
    f.decision.resolution.choiceUserMessageRef = f.decision.userMessageRef;
    f.decision.answer = approach === 'research' ? 'manual' : 'research';
    await f.save();
    await assert.rejects(f.advance(), /路线须与用户选择一致/);
    f.decision.answer = approach;
    if (approach === 'research') {
      const refs = f.decision.resolution.referenceRefs;
      f.decision.resolution.referenceRefs = [];
      await f.save();
      await assert.rejects(f.advance(), /缺少参考依据/);
      f.decision.resolution.referenceRefs = refs;
      await put(f.repo, f.referencePath, '参考内容发生变化');
      await f.save();
      await assert.rejects(f.advance(), /调研参考.*重新冻结/);
      await put(f.repo, f.referencePath, '参考产品来源和适用观察');
    }
    await put(f.repo, f.proposalPath, '方案内容发生变化');
    await f.save();
    const before = await readFile(resolve(f.repo, f.workPath));
    await assert.rejects(f.advance(), /已确认方案.*重新冻结/);
    assert.deepEqual(await readFile(resolve(f.repo, f.workPath)), before);
    const previousRef = f.decision.resolution.proposalRef;
    f.decision.resolution.proposalRef = await frozenReview(f.repo, f.proposalPath);
    await putJson(f.repo, f.work.grillingRef.path, f.record);
    await assert.rejects(f.advance(), /已冻结的模块设计决策.*重新确认/);
    f.decision.resolution.proposalRef = previousRef;
    await put(f.repo, f.proposalPath, '方案和适用状态');
    // 用户在同一条消息中选择人工调整并确认最终方案时，两项可绑定同一消息。
    if (approach === 'manual') f.decision.resolution.confirmationUserMessageRef = f.decision.userMessageRef;
    await f.save();
    await f.advance();
    assert.equal((await readWork(f.repo, f.workPath)).globalState, 'REVIEW');
  });
}

test('实施中出现未决模块设计时不能登记执行单元通过', async (t) => {
  const f = await fixture(t, 'research');
  f.record.status = 'OPEN';
  await f.save();
  f.work.globalState = 'IMPLEMENTING';
  await putJson(f.repo, f.workPath, f.work);
  const before = await readFile(resolve(f.repo, f.workPath));
  await assert.rejects(
    completeUnit({ repo: f.repo, workItem: f.workPath, resultPath: 'missing-result.json' }),
    /未决拷问/,
  );
  assert.deepEqual(await readFile(resolve(f.repo, f.workPath)), before);
});

test('模块设计决策 Schema 接受开放问题和两条已确认路线', async (t) => {
  const f = await fixture(t, 'research');
  const schema = JSON.parse(await readFile(new URL('../../skills/app-workflow-control/schemas/grilling-record.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020().compile(schema);
  assert.equal(validate(f.record), true, JSON.stringify(validate.errors));
  const untyped = structuredClone(f.record);
  delete untyped.decisions[0].kind;
  assert.equal(validate(untyped), false);
  f.record.status = 'OPEN';
  delete f.record.decisions[0].resolution;
  delete f.record.decisions[0].answer;
  delete f.record.decisions[0].userMessageRef;
  assert.equal(validate(f.record), true, JSON.stringify(validate.errors));
  f.record.status = 'CLOSED';
  assert.equal(validate(f.record), false);
});
