/** 覆盖领域正文追溯、原生差异及旧控制协议的精确路由。 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildSharedDomainReferences, DOMAIN_REFERENCE_FAMILIES, routeNativeControlReferences } from '../scripts/migration/shared-domain-references.mjs';
import { DOMAIN_ENTRY_HASHES, DOMAIN_SOURCE_HASHES } from '../scripts/migration/domain-reference-specs.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { applyProfessionalRouting } from '../scripts/migration/professional-routing.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const PREFIX = { cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' };
/** 按来源审计合同保留原文，只统一换行和外围空白。 */
const HASH = (text) => createHash('sha256').update(text.trim().replaceAll('\r\n', '\n')).digest('hex');

/** 读取指定技术栈的真实来源，以源区间独立复算共享正文摘要。 */
function sourceFile(stack, name, root = SOURCE_ROOT) {
  if (name === 'entry') return resolve(root, `${stack}-skills`, `skills/${PREFIX[stack]}-game-workflow-control/SKILL.md`);
  return resolve(root, `${stack}-skills`, `skills/${PREFIX[stack]}-game-workflow-control/references/${name}.md`);
}

/** 缺任一源仓库时跳过跨栈追加核对，离线安装验证不依赖本机源目录。 */
function hasSources() {
  return Object.keys(PREFIX).every((stack) => [...Object.keys(DOMAIN_SOURCE_HASHES[stack]), 'entry'].every((name) => existsSync(sourceFile(stack, name))));
}

/** 沿真实顺序先抽取，再执行旧公共路由，最后处理剩余领域文档。 */
function applyPlan(plan, stack, name) {
  const sourcePath = name === 'entry' ? `skills/${PREFIX[stack]}-game-workflow-control/SKILL.md` : `skills/${PREFIX[stack]}-game-workflow-control/references/${name}.md`;
  const destination = `skills/${stack}-domain-contracts/references/${name === 'entry' ? 'technical-control' : name}.md`;
  const original = readFileSync(sourceFile(stack, name), 'utf8');
  const extracted = applySharedWorkflowSections(original, { stack, sourcePath, destination, repositoryRoot: ROOT, plan });
  return applyProfessionalRouting(extracted.text, { stack, sourcePath, destination });
}

test('领域公共正文保留来源摘要、完整字段和真实适用范围', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedDomainReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.deepEqual(plan.documents.map((document) => document.capabilityId), DOMAIN_REFERENCE_FAMILIES.map((item) => item.id));
  const schema = plan.documents.find((document) => document.capabilityId === 'reference-domain-visual-schema').content;
  for (const token of ['edge_evidence', 'raw_source_has_alpha', 'supports_true_alpha', 'aspect-ratio-correction/1', 'crop_rect']) assert.ok(schema.includes(token), `视觉合同缺少 ${token}`);
  assert.match(schema, /本栈领域 Evidence Manifest/);
  assert.match(schema, /公共控制器的工作项、实施包和结果 Schema 以公共控制规范为准/);
  const ownership = plan.documents.find((document) => document.capabilityId === 'reference-domain-display-ownership').content;
  for (const token of ['DISPLAY_LAYER', 'host_scene_id', 'display_layer_planning.inventory', '不得出现在同一个 Implementation Package']) assert.ok(ownership.includes(token));
  const gate = plan.documents.find((document) => document.capabilityId === 'reference-domain-visual-gates').content;
  for (const token of ['atomic_visual_key', 'placements', 'atlas_allowed=false', 'production_contract_audit']) assert.ok(gate.includes(token));
  assert.match(gate, /用户人工检查/);
  const sequence = plan.documents.find((document) => document.capabilityId === 'reference-domain-visual-sequence').content;
  for (const token of ['SINGLE_HUMAN/CONFIRMED', 'global-static-baseline-frozen', 'SCENE', 'DISPLAY_LAYER', 'action.approval']) assert.ok(sequence.includes(token));
  assert.match(sequence, /纯工程基础包可先/);
  assert.doesNotMatch(sequence, /A4 正式入口/);
  const admission = plan.documents.find((document) => document.capabilityId === 'reference-domain-visual-admission').content;
  for (const token of ['正式消费已确认的视觉资产', 'globalVisualBaselineSelectionRef', 'globalStaticBaselineState', 'foundation-only', 'revalidate', 'visual_validation.mode']) assert.ok(admission.includes(token));
  assert.match(admission, /V1 先验证功能，白盒可选/);
  assert.match(admission, /原生视觉资源|正式视觉资源装配前置/);
  assert.doesNotMatch(admission, /正式 Scene\/UI 注册、Boot→可见 Scene 入口修改/);
  const scene = plan.documents.find((document) => document.capabilityId === 'reference-domain-scene-contract').content;
  for (const token of ['reference_technical_conflicts', 'fidelity_cases', 'combination_preacceptance', 'visualDecompositionConfirmations', 'reference-orchestration-visual-quality-gate']) assert.ok(scene.includes(token));
  assert.doesNotMatch(scene, /delegate-check|parallel-check/);
  assert.match(applyPlan(plan, 'cocos', 'schemas').text, /layout-nodes\.json/);
  for (const document of plan.documents) for (const source of document.sources) {
    const original = readFileSync(resolve(SOURCE_ROOT, `${source.stack}-skills`, ...source.sourcePath.split('/')), 'utf8');
    for (const section of source.sections) {
      assert.equal(HASH(original.slice(section.sourceRange.start, section.sourceRange.end)), section.sourceHash);
      assert.ok(document.content.includes(section.canonical));
      assert.equal(HASH(section.canonical), section.canonicalHash);
    }
  }
});

test('真实迁移顺序保留领域条款并只使用当前公共状态、RETURN 和视觉 CLI', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedDomainReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  for (const stack of Object.keys(PREFIX)) {
    const gates = applyPlan(plan, stack, 'state-gates');
    assert.match(gates.text, /repair.*revalidate.*return/s);
    assert.match(gates.text, /领域 disposition，而不是控制器命令/);
    assert.match(gates.text, /G0–G3 是.*游戏生产里程碑/);
    assert.match(gates.text, /工作项统一使用 V0–V5/);
    assert.doesNotMatch(gates.text, /`route` 默认|`advance` 只执行|`stage:`\/`scene:`\/`artifact:`|USER_INPUT_REQUIRED/);
    assert.match(gates.text, /reference-domain-visual-gates/);
    const control = applyPlan(plan, stack, 'control-model');
    assert.match(control.text, /当前公共控制协议/);
    assert.match(control.text, /弹窗工作项与场景解耦/);
    assert.match(control.text, /reference-domain-display-ownership/);
    assert.match(control.text, /reference-domain-completion/);
    assert.match(control.text, /reference-domain-visual-admission/);
    assert.doesNotMatch(control.text, /substantiveTradeoffRequired.*显式决定门/);
    const schemas = applyPlan(plan, stack, 'schemas');
    assert.match(schemas.text, /V1 可先直接实施并验证功能，白盒可选，不依赖视觉目标/);
    assert.doesNotMatch(schemas.text, /混入 `SCENE`\/`DISPLAY_LAYER`\/`INTEGRATION` 的包在 V2/);
    assert.doesNotMatch(gates.text, /原生视觉 V1–V4[\s\S]*对应公共/);
    const simple = applyPlan(plan, stack, 'simplified-workflow');
    assert.match(simple.text, /V1 可直接实现和验证功能，白盒可选/);
    assert.match(simple.text, /帧动画阶段与统一工作流一致/);
    assert.match(schemas.text, /本技术栈的视觉\/领域合同/);
    assert.match(schemas.text, /reference-domain-visual-schema/);
    assert.match(schemas.text, /visualStage/);
    const simplified = applyPlan(plan, stack, 'simplified-workflow');
    assert.match(simplified.text, /命令和状态见.*当前公共控制协议/);
    assert.doesNotMatch(simplified.text, /底层 `advance`|--visual-stage-state|sceneStepId|sceneStepLabel/);
    assert.match(simplified.text, /公共工作流/);
    assert.match(simplified.text, /公共工作流/);
    assert.doesNotMatch(simplified.text, /\| 阶段 ID \| 用户阶段/);
    const entry = applyPlan(plan, stack, 'entry');
    assert.doesNotMatch(entry.text, /必须创建精确 pending|本 Skill 是.*唯一状态|A3 实施前冻结实施包/);
    assert.match(entry.text, /当前公共控制协议/);
    assert.match(entry.text, /reference-domain-visual-review/);
  }
});

test('源字节漂移、跟踪项缺失与已审查章节变更均拒绝', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const root = mkdtempSync(resolve(tmpdir(), 'domain-references-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const trackedFilesByStack = {};
  for (const stack of Object.keys(PREFIX)) {
    trackedFilesByStack[stack] = [];
    for (const name of [...Object.keys(DOMAIN_SOURCE_HASHES[stack]), 'entry']) {
      const target = sourceFile(stack, name, root);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(sourceFile(stack, name), target);
      trackedFilesByStack[stack].push(name === 'entry' ? `skills/${PREFIX[stack]}-game-workflow-control/SKILL.md` : `skills/${PREFIX[stack]}-game-workflow-control/references/${name}.md`);
    }
  }
  const options = { sourceRoot: root, repositoryRoot: ROOT, trackedFilesByStack };
  assert.equal(buildSharedDomainReferences(options).documents.length, DOMAIN_REFERENCE_FAMILIES.length);
  assert.match(DOMAIN_ENTRY_HASHES.cocos, /^[a-f0-9]{64}$/);
  const changed = sourceFile('phaser', 'schemas', root);
  writeFileSync(changed, `${readFileSync(changed, 'utf8')}\n未审核变更`);
  assert.throws(() => buildSharedDomainReferences(options), /摘要漂移/);
  trackedFilesByStack.cocos.pop();
  assert.throws(() => buildSharedDomainReferences(options), /不在 Git 跟踪清单/);
  assert.throws(() => routeNativeControlReferences('# 丢失章节', { stack: 'cocos', sourcePath: 'skills/cocos-game-workflow-control/references/state-gates.md', destination: 'skills/cocos-domain-contracts/references/state-gates.md' }), /缺少唯一章节/);
});

test('入口路由只移除已识别公共步骤，不丢弃原生编号条款', () => {
  const text = '# 本栈技术说明\n\n1. 读取当前 Work Item，确认范围。\n2. 校验 Creator 的 AssetDB UUID 与 .meta。\n';
  const result = routeNativeControlReferences(text, { stack: 'cocos', sourcePath: 'skills/cocos-game-workflow-control/SKILL.md', destination: 'skills/cocos-domain-contracts/references/technical-control.md' });
  assert.doesNotMatch(result.text, /读取当前 Work Item/);
  assert.match(result.text, /2\. 校验 Creator 的 AssetDB UUID 与 \.meta/);
});
