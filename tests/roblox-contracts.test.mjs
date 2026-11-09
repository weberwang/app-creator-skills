/** 验证 Roblox 领域证据的身份、来源、路径及真实运行记录约束。 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateRobloxEngineering } from '../skills/roblox-domain-contracts/scripts/validate-evidence.mjs';
import { validateRobloxVisual } from '../skills/roblox-domain-contracts/scripts/validate-visual.mjs';
import { captureRef } from '../skills/roblox-domain-contracts/scripts/common.mjs';
import { validateScreenPlan, validateScreenReadback } from '../skills/roblox-domain-contracts/scripts/screen-layout.mjs';
import { createRobloxFixture, createRobloxVisualFixture, writeRobloxFixture } from './helpers/roblox-fixture.mjs';

/** 将当前夹具写入并调用同一正式工程校验入口。 */
function verify(fixture) {
  fixture.save();
  return validateRobloxEngineering(fixture.repo, fixture.work, fixture.manifest, fixture.pack);
}

test('工程合同接受绑定真实文件的本地及已发布 Place 合成记录', (t) => {
  for (const published of [false, true]) {
    const fixture = createRobloxFixture(t, { published });
    assert.equal(verify(fixture).scope, 'record-consistency');
  }
});

test('工程合同拒绝错项、错栈、阶段及实施包身份', (t) => {
  const fixture = createRobloxFixture(t);
  for (const [field, value] of [['workItemId', 'other'], ['projectId', 'other'], ['stack', 'unity'], ['workItemType', 'SCENE'], ['implementationPackageRef', 'other']]) {
    const saved = fixture.doc[field]; fixture.doc[field] = value;
    assert.throws(() => verify(fixture), /绑定|错绑|技术栈/);
    fixture.doc[field] = saved;
  }
  fixture.doc.visualStage = 'V1';
  assert.throws(() => verify(fixture), /非视觉/);
});

test('工程合同拒绝缺失真实运行、未绑定记录或未执行的检查', (t) => {
  const fixture = createRobloxFixture(t);
  fixture.doc.requiredContexts = ['Edit'];
  assert.throws(() => verify(fixture), /Client 或 Server/);
  fixture.doc.requiredContexts = ['Server', 'Client'];
  assert.throws(() => verify(fixture), /Client 实际运行/);
  fixture.doc.requiredContexts = ['Server'];
  fixture.doc.checks[0].expected = '错误预期';
  assert.throws(() => verify(fixture), /预期和实际不一致/);
  fixture.doc.checks[0].expected = '虚构结果'; fixture.doc.checks[0].actual = '虚构结果';
  assert.throws(() => verify(fixture), /未出现在/);
  fixture.doc.checks[0].expected = 'fixture-observation'; fixture.doc.checks[0].actual = 'fixture-observation';
  fixture.doc.checks[0].status = 'NOT_RUN';
  assert.throws(() => verify(fixture), /未通过或未运行/);
});

test('单纯状态查询不能冒充 V1 功能运行检查', (t) => {
  const fixture = createRobloxFixture(t);
  const query = fixture.capture({ context: 'Server', toolName: 'get_studio_state' });
  fixture.doc.checks[0].captureRef = query.ref;
  assert.throws(() => verify(fixture), /状态查询不能替代/);
});

test('工程合同拒绝离线或合成标记、上下文错绑与缺失原始响应', (t) => {
  const fixture = createRobloxFixture(t);
  for (const overrides of [
    { synthetic: true }, { execution: 'fixture' }, { origin: 'offline' },
    { context: 'Client' }, { studioId: 'other' }, { response: { content: [] } },
    { request: { studio_id: fixture.studio.studioId, datamodel_type: 'Edit' } },
  ]) {
    const record = fixture.capture({ context: 'Server', toolName: 'execute_luau', ...overrides });
    fixture.doc.checks[0].captureRef = record.ref;
    assert.throws(() => verify(fixture));
  }
});

test('工程合同拒绝源文件越权、扩展名伪装、路径越界及内容被篡改', (t) => {
  const fixture = createRobloxFixture(t);
  const original = fixture.doc.sources[1];
  fixture.doc.sources[1] = { ...original, unitId: 'other' };
  assert.throws(() => verify(fixture), /实施单元/);
  const picture = writeRobloxFixture(fixture.repo, 'src/fake.png', '非正式源');
  fixture.doc.sources[1] = { ...original, ref: picture };
  assert.throws(() => verify(fixture), /正式源只能/);
  fixture.doc.sources[1] = { ...original, ref: { path: '../escape.luau', sha256: original.ref.sha256 } };
  assert.throws(() => verify(fixture), /\.\.|项目/);
  fixture.doc.sources[1] = original;
  writeFileSync(join(fixture.repo, 'src', 'main.server.luau'), '篡改内容');
  assert.throws(() => verify(fixture), /SHA-256/);
});

test('磁盘脚本变化即使更新摘要，也不能复用旧 Studio 回读和运行', (t) => {
  const fixture = createRobloxFixture(t);
  const changed = writeRobloxFixture(fixture.repo, 'src/main.server.luau', '-- 未同步到 Studio 的新脚本\n');
  fixture.doc.sources[1].ref = changed;
  assert.throws(() => verify(fixture), /磁盘源码与 Studio/);
  const readback = fixture.capture({ toolName: 'script_read', targetPath: fixture.doc.sources[1].instancePath, actual: JSON.stringify({ source: '-- 未同步到 Studio 的新脚本\n' }) });
  fixture.doc.sources[1].readbackRef = readback.ref;
  assert.throws(() => verify(fixture), /运行记录的正式源路径或摘要错绑/);
});

test('工程合同拒绝未声明或未批准的 Open Cloud 写入', (t) => {
  const fixture = createRobloxFixture(t);
  const record = fixture.capture({ context: 'Server', toolName: 'open_cloud_invoke', request: { studio_id: 'studio-a', method: 'POST' }, effectsBasis: '测试写入', effects: [] });
  fixture.doc.editReadbackRef = record.ref;
  assert.throws(() => verify(fixture), /external-write/);
  record.record.effects = ['external-write'];
  fixture.doc.editReadbackRef = writeRobloxFixture(fixture.repo, record.ref.path, record.record);
  assert.throws(() => verify(fixture), /未在当前工作项声明/);
  fixture.work.action.effects.push('external-write'); fixture.work.action.target = 'test-place';
  assert.throws(() => verify(fixture), /精确批准/);
});

test('批准的云端动作只能使用对应目标、允许端点和有效上下文', (t) => {
  const fixture = createRobloxFixture(t, { published: true });
  const action = { actionId: 'approved-write', effects: ['external-write'], target: 'universe:456' };
  action.approval = { workItemId: fixture.work.workItemId, stack: fixture.work.stack, stageId: fixture.work.stageId, actionId: action.actionId, target: action.target, effects: ['external-write'], userMessageRef: 'synthetic-approval' };
  fixture.work.action = action;
  const endpoint = '/cloud/v2/universes/456/items';
  const cloud = fixture.capture({ context: 'Server', toolName: 'open_cloud_invoke', request: { studio_id: 'studio-a', method: 'POST', endpoint }, effects: ['external-write'], effectsBasis: '合成测试调用', actionId: action.actionId, actionTarget: action.target, targetScope: { kind: 'universe', id: '456', allowedOperations: [`POST ${endpoint}`] } });
  /** 每次重写捕获后都执行正式校验，保证变化命中批准之后的分支。 */
  function check() {
    const ref = writeRobloxFixture(fixture.repo, cloud.ref.path, cloud.record);
    return captureRef(fixture.repo, ref, fixture.work, fixture.studio);
  }
  assert.equal(check().toolName, 'open_cloud_invoke');
  cloud.record.actionTarget = 'universe:999';
  assert.throws(check, /actionId 或目标/);
  cloud.record.actionTarget = action.target;
  cloud.record.targetScope.id = '999';
  assert.throws(check, /目标范围与批准对象/);
  cloud.record.targetScope.id = '456';
  cloud.record.request.endpoint = '/cloud/v2/universes/999/items';
  assert.throws(check, /目标 ID 与批准对象/);
  cloud.record.request.endpoint = '/cloud/v2/universes/456/../999/items';
  assert.throws(check, /路径跳转/);
  cloud.record.request.endpoint = '/cloud/v2/operations';
  cloud.record.targetScope.allowedOperations = ['POST /cloud/v2/operations'];
  assert.throws(check, /受保护目标上下文/);
  const proof = fixture.capture({ toolName: 'get_studio_state', actual: JSON.stringify({ universeId: '999' }) });
  cloud.record.scopeEvidenceRef = proof.ref;
  assert.throws(check, /不能唯一证明/);
  proof.record.response.content[0].text = JSON.stringify({ universeId: '456' });
  cloud.record.scopeEvidenceRef = writeRobloxFixture(fixture.repo, proof.ref.path, proof.record);
  assert.equal(check().toolName, 'open_cloud_invoke');
  cloud.record.targetScope.allowedOperations = [];
  assert.throws(check, /未明确允许/);
});

test('已批准资源 ID 不能替换为另一个资源', (t) => {
  const fixture = createRobloxFixture(t, { published: true });
  const action = { actionId: 'asset-write', effects: ['external-write'], target: 'asset:42' };
  action.approval = { workItemId: fixture.work.workItemId, stack: fixture.work.stack, stageId: fixture.work.stageId, actionId: action.actionId, target: action.target, effects: ['external-write'], userMessageRef: 'synthetic-approval' };
  fixture.work.action = action;
  const capture = fixture.capture({ context: 'Server', toolName: 'open_cloud_invoke', request: { studio_id: 'studio-a', method: 'POST', endpoint: '/assets/42' }, effects: ['external-write'], effectsBasis: '合成测试调用', actionId: action.actionId, actionTarget: action.target, targetScope: { kind: 'asset', id: '42', allowedOperations: ['POST /assets/42'] } });
  assert.equal(captureRef(fixture.repo, capture.ref, fixture.work, fixture.studio).toolName, 'open_cloud_invoke');
  capture.record.request.endpoint = '/assets/43';
  const ref = writeRobloxFixture(fixture.repo, capture.ref.path, capture.record);
  assert.throws(() => captureRef(fixture.repo, ref, fixture.work, fixture.studio), /目标 ID 与批准对象/);
});

test('Roblox SCENE 与 DISPLAY_LAYER 按 V2–V5 验证合成原生记录', (t) => {
  for (const stage of ['V2', 'V3', 'V4', 'V5']) for (const layer of [false, true]) {
    const fixture = createRobloxVisualFixture(t, { stage, layer });
    assert.equal(validateRobloxVisual(fixture.repo, fixture.work, { stage, target: fixture.target, envelope: fixture.envelope }).scope, 'record-consistency');
  }
});

test('视觉合同拒绝错对象、错场景、错宿主及不同的冻结目标', (t) => {
  const scene = createRobloxVisualFixture(t, { stage: 'V2' });
  scene.visual.object.id = 'other'; scene.saveVisual();
  assert.throws(() => validateRobloxVisual(scene.repo, scene.work, { stage: 'V2', target: scene.target, envelope: scene.envelope }), /正式对象身份/);
  const layer = createRobloxVisualFixture(t, { stage: 'V2', layer: true });
  layer.visual.hostId = 'other'; layer.saveVisual();
  assert.throws(() => validateRobloxVisual(layer.repo, layer.work, { stage: 'V2', envelope: layer.envelope }), /宿主/);
  const target = createRobloxVisualFixture(t, { stage: 'V2' });
  target.visual.referenceTarget = writeRobloxFixture(target.repo, `${target.work.evidenceRoot}/other.png`, '另一个合成目标'); target.saveVisual();
  assert.throws(() => validateRobloxVisual(target.repo, target.work, { stage: 'V2', target: target.target, envelope: target.envelope }), /冻结视觉目标/);
});

test('V3 拒绝节点身份、父子路径、坐标空间及定位参照冲突', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V3' });
  for (const mutate of [
    () => { fixture.layout.nodes[1].id = fixture.layout.nodes[0].id; },
    () => { fixture.layout.nodes[1].instancePath = ['game', 'Workspace', 'Elsewhere']; },
    () => { fixture.layout.nodes[1].space = 'unknown'; },
    () => { fixture.layout.nodes[1].positionReferenceId = 'missing'; },
  ]) {
    const baseline = structuredClone(fixture.layout.nodes); mutate(); fixture.saveVisual();
    assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V3', target: fixture.target, envelope: fixture.envelope }));
    fixture.layout.nodes = baseline;
  }
});

test('V4 资源项与公共清单必须绑定实际布局及原始节点结果', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V4' });
  fixture.assets.items[0].nodeId = 'missing'; fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V4', target: fixture.target, envelope: fixture.envelope }), /V3 节点/);
  fixture.assets.items[0].nodeId = fixture.work.visual.objectId; fixture.saveVisual();
  fixture.manifest.items[1].path = `${fixture.work.evidenceRoot}/target.png`;
  writeRobloxFixture(fixture.repo, fixture.work.evidenceRef.path, fixture.manifest);
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V4', target: fixture.target, envelope: fixture.envelope }), /asset-import/);
});

test('V5 不能用其他客户端、错误类或无实际输入的报告充当运行证据', (t) => {
  const fixture = createRobloxVisualFixture(t);
  fixture.runtime.clientId = 'other'; fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V5', target: fixture.target, envelope: fixture.envelope }), /客户端/);
  fixture.runtime.clientId = 'player-a'; fixture.runtime.bindings[1].className = 'Wrong'; fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V5', target: fixture.target, envelope: fixture.envelope }), /实际类型/);
  fixture.runtime.bindings[1].className = 'Part'; fixture.runtime.interactions = []; fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V5', target: fixture.target, envelope: fixture.envelope }), /缺少实际输入/);
});

test('输入只能记录在客户端，同一用例不能混用不同客户端', (t) => {
  const fixture = createRobloxVisualFixture(t);
  fixture.input.record.clientId = 'player-b';
  fixture.runtime.interactions[0].inputRef = writeRobloxFixture(fixture.repo, fixture.input.ref.path, fixture.input.record);
  fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V5', target: fixture.target, envelope: fixture.envelope }), /客户端/);
  fixture.input.record.context = 'Server';
  fixture.runtime.interactions[0].inputRef = writeRobloxFixture(fixture.repo, fixture.input.ref.path, fixture.input.record);
  fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V5', target: fixture.target, envelope: fixture.envelope }), /只能用于 Client/);
});

test('资源状态不能用否定文本或 false 冒充可用，资源必须属于实际节点', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V4' });
  const path = fixture.layout.nodes[0].instancePath;
  const read = fixture.capture({ context: 'Edit', toolName: 'execute_luau', targetPath: path, actual: JSON.stringify({ nodes: [{ instancePath: path, className: 'Model', properties: { Image: 'rbxassetid://42' } }] }) });
  const available = fixture.capture({ toolName: 'search_asset', actual: JSON.stringify({ assetId: '42', status: 'not available', usable: false, moderation: 'approved' }) });
  fixture.assets.externalAssets = 'present';
  fixture.assets.items[0] = { id: 'asset', kind: 'roblox-asset', nodeId: fixture.work.visual.objectId, instancePath: path, inspectionRef: read.ref, assetId: '42', assetProperty: 'Image', availability: 'available', availabilityRef: available.ref };
  fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V4', target: fixture.target, envelope: fixture.envelope }), /明确可用/);
  available.record.response.content[0].text = JSON.stringify({ assetId: '42', status: 'available', usable: true, moderation: 'approved' });
  fixture.assets.items[0].availabilityRef = writeRobloxFixture(fixture.repo, available.ref.path, available.record);
  read.record.response.content[0].text = JSON.stringify({ nodes: [{ instancePath: path, className: 'Model', properties: {} }, { instancePath: ['game', 'Workspace', 'Other'], className: 'Part', properties: { Image: 'rbxassetid://42' } }] });
  fixture.assets.items[0].inspectionRef = writeRobloxFixture(fixture.repo, read.ref.path, read.record);
  fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V4', target: fixture.target, envelope: fixture.envelope }), /当前节点/);
});

test('显示层 V5 运行状态与视口必须和公共包装相符', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  fixture.visual.stateId = 'different'; fixture.saveVisual();
  assert.throws(() => validateRobloxVisual(fixture.repo, fixture.work, { stage: 'V5', envelope: fixture.envelope }), /运行状态或视口/);
});

/** 重写某次合成 MCP 响应及其摘要，专门检查实际结构而非修改证据引用。 */
function updateScreenCapture(fixture, which, mutate) {
  const capture = which === 'edit' ? fixture.editObservation : fixture.observation;
  const raw = JSON.parse(capture.record.response.content[0].text);
  mutate(raw.nodes);
  capture.record.response.content[0].text = JSON.stringify(raw);
  capture.ref = writeRobloxFixture(fixture.repo, capture.ref.path, capture.record);
  if (which === 'edit') fixture.layout.editObservationRef = capture.ref;
  else fixture.runtime.observationRef = capture.ref;
}

/** 使用真实视觉入口消费合成的当前阶段材料。 */
function verifyVisual(fixture, stage) {
  fixture.saveVisual();
  return validateRobloxVisual(fixture.repo, fixture.work, { stage, target: fixture.target, envelope: fixture.envelope });
}

test('V3 普通 GUI 必须声明 AnchorPoint、双轴尺寸控制和唯一位置控制者', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V3', layer: true });
  assert.equal(verifyVisual(fixture, 'V3').scope, 'record-consistency');
  const child = fixture.layout.nodes[1];
  const baseline = structuredClone(child);
  for (const mutate of [
    () => { delete child.anchorPoint; },
    () => { child.positionWriters = []; },
    () => { child.positionWriters = ['UDIM2', 'UIListLayout']; },
    () => { delete child.sizeWriters.vertical; },
    () => { child.positionWriters = ['SHARED']; child.sharedReason = '直接父级'; },
    () => { child.positionReferenceId = 'viewport'; },
  ]) {
    mutate();
    assert.throws(() => verifyVisual(fixture, 'V3'));
    Object.keys(child).forEach((key) => delete child[key]); Object.assign(child, structuredClone(baseline));
  }
});

test('屏幕 GUI 不能改标世界坐标以绕过停靠合同', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V3', layer: true });
  const [root, child] = fixture.layout.nodes;
  root.space = 'world-studs'; root.position = { x: 0, y: 0, z: 0 }; root.size = { x: 1, y: 1, z: 1 }; root.positionReferenceId = 'world';
  child.space = 'world-studs'; child.position = { x: 0, y: 0, z: 0 }; child.size = { x: 1, y: 1, z: 1 };
  assert.throws(() => verifyVisual(fixture, 'V3'), /GUI 必须使用/);
});

test('基础 schema 对屏幕容器与普通 GUI 分别要求原生停靠字段', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V3', layer: true });
  const schema = JSON.parse(readFileSync(new URL('../skills/roblox-domain-contracts/schemas/evidence.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(validate(fixture.layout), true);
  delete fixture.layout.nodes[0].screenInsets;
  assert.equal(validate(fixture.layout), false);
  fixture.layout.nodes[0].screenInsets = 'CoreUISafeInsets';
  delete fixture.layout.nodes[1].anchorPoint;
  assert.equal(validate(fixture.layout), false);
});

test('原生单精度对齐值与设计十进制等价，不放宽 offset 精确比较', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  fixture.layout.nodes[1].position.xScale = 0.2;
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => { nodes[1].properties.Position.xScale = Math.fround(0.2); });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.Position.xOffset += 1; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /Position/);
});

test('V4 与 V5 必须读取同一个实际 GUI 的原生停靠和屏幕安全区', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  updateScreenCapture(fixture, 'edit', (nodes) => { nodes[1].properties.AnchorPoint.x = 0; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /AnchorPoint/);
  updateScreenCapture(fixture, 'edit', (nodes) => { nodes[1].properties.AnchorPoint.x = 0.5; });
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.Position.xOffset = 999; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /Position/);
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.Position.xOffset = 10; nodes[0].properties.ScreenInsets = 'None'; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /ScreenInsets/);
});

test('布局来源必须与当前 Studio 及正式 Place 快照一致', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V3', layer: true });
  fixture.layout.studio.studioId = 'other-studio';
  assert.throws(() => verifyVisual(fixture, 'V3'), /Studio/);
});

test('尺寸轴映射按原生属性回读，未验证的尺寸修饰器不能冒充空配置', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  fixture.layout.nodes[1].sizeConstraint = 'RelativeXX';
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => { nodes[1].properties.SizeConstraint = 'RelativeXX'; });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.SizeConstraint = 'RelativeXY'; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /SizeConstraint/);
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.SizeConstraint = 'RelativeXX'; nodes[1].properties.SizeModifiers = [{ className: 'UISizeConstraint', instancePath: [...nodes[1].instancePath, 'SizeLimit'] }]; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /尺寸修饰器/);
  fixture.layout.nodes[1].sizeModifiers = [{ className: 'UIScale', instancePath: [...fixture.layout.nodes[1].instancePath, 'Scale'] }];
  assert.throws(() => verifyVisual(fixture, 'V5'), /未验证/);
});

test('临时位置行为必须明确触发、恢复和独占控制，静止状态仍须符合原生停靠', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  fixture.layout.nodes[1].behavior = { reason: '拖拽调整位置', trigger: '指针按下', recovery: '松开后恢复原生停靠', properties: ['Position'], ownership: 'EXCLUSIVE' };
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  fixture.layout.nodes[1].behavior.ownership = 'SHARED';
  assert.throws(() => verifyVisual(fixture, 'V5'), /独占控制权/);
});

test('原生网格负责子项排布时可通过，但父布局与 UDim2 或动画争写必须拒绝', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  const root = fixture.layout.nodes[0];
  const child = fixture.layout.nodes[1];
  const cellSize = { xScale: 0, xOffset: 100, yScale: 0, yOffset: 50 };
  const cellPadding = { xScale: 0, xOffset: 8, yScale: 0, yOffset: 8 };
  const controller = { instancePath: [...root.instancePath, 'Grid'], className: 'UIGridLayout', fillDirection: 'Horizontal', horizontalAlignment: 'Left', verticalAlignment: 'Top', sortOrder: 'LayoutOrder', cellSize, cellPadding, fillDirectionMaxCells: 2, startCorner: 'TopLeft' };
  root.layoutController = controller;
  child.positionWriters = ['UIGridLayout'];
  child.sizeWriters = { horizontal: 'LAYOUT', vertical: 'LAYOUT' };
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => {
    const path = [...nodes[0].instancePath, 'Grid'];
    nodes[0].properties.LayoutControllers = [{ className: 'UIGridLayout', instancePath: path }];
    nodes.push({ className: 'UIGridLayout', instancePath: path, properties: { FillDirection: 'Horizontal', HorizontalAlignment: 'Left', VerticalAlignment: 'Top', SortOrder: 'LayoutOrder', CellSize: cellSize, CellPadding: cellPadding, FillDirectionMaxCells: 2, StartCorner: 'TopLeft' } });
  });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  child.positionWriters = ['UDIM2'];
  assert.throws(() => verifyVisual(fixture, 'V5'), /父布局/);
  child.positionWriters = ['UIGridLayout'];
  child.behavior = { reason: '拖拽', trigger: '按下', recovery: '松开恢复', properties: ['Position'] };
  assert.throws(() => verifyVisual(fixture, 'V5'), /争写/);
  delete child.behavior;
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[2].properties.CellPadding.xOffset = 9; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /CellPadding/);
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[2].properties.CellPadding.xOffset = 8; });
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[0].properties.LayoutControllers = []; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /布局组件/);
});

test('原生列表使用实际间距和双轴对齐，子项可由列表排布并保留独立尺寸', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  const root = fixture.layout.nodes[0];
  const child = fixture.layout.nodes[1];
  root.layoutController = { instancePath: [...root.instancePath, 'List'], className: 'UIListLayout', fillDirection: 'Horizontal', horizontalAlignment: 'Left', verticalAlignment: 'Center', sortOrder: 'LayoutOrder', padding: { scale: 0, offset: 12 }, wraps: false, horizontalFlex: 'None', verticalFlex: 'None', itemLineAlignment: 'Automatic' };
  child.positionWriters = ['UIListLayout'];
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => {
    const path = [...nodes[0].instancePath, 'List'];
    nodes[0].properties.LayoutControllers = [{ className: 'UIListLayout', instancePath: path }];
    nodes.push({ className: 'UIListLayout', instancePath: path, properties: { FillDirection: 'Horizontal', HorizontalAlignment: 'Left', VerticalAlignment: 'Center', SortOrder: 'LayoutOrder', Padding: { scale: 0, offset: 12 }, Wraps: false, HorizontalFlex: 'None', VerticalFlex: 'None', ItemLineAlignment: 'Automatic' } });
  });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[2].properties.Padding.offset = 13; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /Padding/);
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[2].properties.Padding.offset = 12; });
  root.layoutController.horizontalFlex = 'Fill';
  child.sizeWriters.horizontal = 'LAYOUT';
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => { nodes[2].properties.HorizontalFlex = 'Fill'; });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  child.sizeWriters.horizontal = 'UDIM2';
  assert.throws(() => verifyVisual(fixture, 'V5'), /Flex 控制主轴/);
  root.layoutController.horizontalFlex = 'None';
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => { nodes[2].properties.HorizontalFlex = 'None'; });
  root.layoutController.itemLineAlignment = 'Stretch';
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => { nodes[2].properties.ItemLineAlignment = 'Stretch'; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /Stretch 控制交叉轴/);
});

test('UIFlexItem 必须在实际子节点上回读并声明主轴尺寸控制', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  const root = fixture.layout.nodes[0];
  const child = fixture.layout.nodes[1];
  root.layoutController = { instancePath: [...root.instancePath, 'List'], className: 'UIListLayout', fillDirection: 'Horizontal', horizontalAlignment: 'Left', verticalAlignment: 'Center', sortOrder: 'LayoutOrder', padding: { scale: 0, offset: 12 }, wraps: false, horizontalFlex: 'None', verticalFlex: 'None', itemLineAlignment: 'Automatic' };
  child.positionWriters = ['UIListLayout'];
  child.sizeWriters.horizontal = 'LAYOUT';
  child.flexItem = { instancePath: [...child.instancePath, 'Flex'], flexMode: 'Grow', growRatio: 1, shrinkRatio: 1, itemLineAlignment: 'Automatic' };
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => {
    const listPath = [...nodes[0].instancePath, 'List'];
    const flexPath = [...nodes[1].instancePath, 'Flex'];
    nodes[0].properties.LayoutControllers = [{ className: 'UIListLayout', instancePath: listPath }];
    nodes[1].properties.FlexItems = [{ className: 'UIFlexItem', instancePath: flexPath }];
    nodes.push({ className: 'UIListLayout', instancePath: listPath, properties: { FillDirection: 'Horizontal', HorizontalAlignment: 'Left', VerticalAlignment: 'Center', SortOrder: 'LayoutOrder', Padding: { scale: 0, offset: 12 }, Wraps: false, HorizontalFlex: 'None', VerticalFlex: 'None', ItemLineAlignment: 'Automatic' } });
    nodes.push({ className: 'UIFlexItem', instancePath: flexPath, properties: { FlexMode: 'Grow', GrowRatio: 1, ShrinkRatio: 1, ItemLineAlignment: 'Automatic' } });
  });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  child.sizeWriters.horizontal = 'UDIM2';
  assert.throws(() => verifyVisual(fixture, 'V5'), /Flex 控制主轴/);
  child.sizeWriters.horizontal = 'LAYOUT';
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[3].properties.FlexMode = 'Fill'; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /UIFlexItem FlexMode/);
});

test('兄弟参照可用绑定正式脚本的共享布局，运行结果必须满足实际双轴关系', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V5', layer: true });
  const root = fixture.layout.nodes[0];
  const child = fixture.layout.nodes[1];
  const sibling = structuredClone(child);
  sibling.id = 'child-b'; sibling.className = 'TextLabel'; sibling.instancePath = [...root.instancePath, 'Sibling'];
  fixture.layout.nodes.push(sibling);
  child.positionReferenceId = sibling.id; child.positionWriters = ['SHARED'];
  child.sharedReason = 'UDim2 只能引用实际父级，当前需要跟随同级标签';
  child.sharedSourceRef = fixture.luauRef;
  child.sharedDocking = { horizontal: { self: 0, reference: 1, offset: 10, tolerance: 0.2, toleranceReason: '测试场景逻辑尺寸的舍入预算' }, vertical: { self: 0, reference: 0, offset: 0, tolerance: 0.2, toleranceReason: '测试场景逻辑尺寸的舍入预算' } };
  const runtimeSibling = [...fixture.runtime.rootInstancePath, 'Sibling'];
  fixture.runtime.bindings.push({ nodeId: sibling.id, sourceInstancePath: sibling.instancePath, runtimeInstancePath: runtimeSibling, className: sibling.className });
  for (const which of ['edit', 'runtime']) updateScreenCapture(fixture, which, (nodes) => {
    const first = nodes[1];
    Object.assign(first.properties, { AbsolutePosition: { x: 110, y: 50 }, AbsoluteSize: { x: 10, y: 10 }, AbsoluteRotation: 0 });
    const properties = { ...structuredClone(first.properties), AbsolutePosition: { x: 60, y: 50 }, AbsoluteSize: { x: 40, y: 10 } };
    nodes.push({ instancePath: which === 'edit' ? sibling.instancePath : runtimeSibling, className: sibling.className, properties });
  });
  assert.equal(verifyVisual(fixture, 'V5').scope, 'record-consistency');
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.AbsolutePosition.x += 1; });
  assert.throws(() => verifyVisual(fixture, 'V5'), /双轴关系/);
  updateScreenCapture(fixture, 'runtime', (nodes) => { nodes[1].properties.AbsolutePosition.x -= 1; });
  child.sharedSourceRef = fixture.snapshotRef;
  assert.throws(() => verifyVisual(fixture, 'V5'), /共享定位脚本/);
});

test('独立 Frame 的父级必须绑定真实外部容器和原生回读', (t) => {
  const fixture = createRobloxVisualFixture(t, { stage: 'V4', layer: true });
  const parentPath = ['game', 'StarterGui', 'Overlay'];
  const path = [...parentPath, 'Frame'];
  const screen = { xScale: 0.5, xOffset: 0, yScale: 0.5, yOffset: 0 };
  const size = { xScale: 0, xOffset: 200, yScale: 0, yOffset: 100 };
  const anchorPoint = { x: 0.5, y: 0.5 };
  const root = { id: 'frame', className: 'Frame', instancePath: path, parentId: null, positionReferenceId: 'host', space: 'screen-scale-offset', position: screen, size, anchorPoint, positionWriters: ['UDIM2'], sizeWriters: { horizontal: 'UDIM2', vertical: 'UDIM2' }, sizeConstraint: 'RelativeXY', sizeModifiers: [] };
  const layout = { rootId: 'frame', externalParent: { id: 'host', className: 'ScreenGui', instancePath: parentPath, screenInsets: 'CoreUISafeInsets', clipToDeviceSafeArea: true, sizeModifiers: [] } };
  const nodes = new Map([[root.id, root]]);
  validateScreenPlan(layout, nodes);
  const capture = fixture.capture({ context: 'Edit', toolName: 'execute_luau', targetPath: path, actual: JSON.stringify({ nodes: [
    { instancePath: parentPath, className: 'ScreenGui', properties: { IsGuiBase2d: true, LayoutControllers: [], SizeModifiers: [], ScreenInsets: 'CoreUISafeInsets', ClipToDeviceSafeArea: true } },
    { instancePath: path, className: 'Frame', properties: { IsGuiObject: true, Position: screen, Size: size, AnchorPoint: anchorPoint, AutomaticSize: 'None', SizeConstraint: 'RelativeXY', LayoutControllers: [], FlexItems: [], SizeModifiers: [] } },
  ] }) });
  assert.doesNotThrow(() => validateScreenReadback(fixture.repo, layout, nodes, capture.record, { sources: [] }));
  layout.externalParent.instancePath = ['game', 'StarterGui', 'Other'];
  assert.throws(() => validateScreenPlan(layout, nodes), /真实外部父级/);
});
