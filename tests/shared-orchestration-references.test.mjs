/** 验证编排资料共享、原生差异及来源完整性。 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedOrchestrationReferences, ORCHESTRATION_REFERENCE_FAMILIES } from '../scripts/migration/shared-orchestration-references.mjs';
import { ORCHESTRATION_TRACKED_REFERENCES } from '../scripts/migration/orchestration-reference-specs.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { readWorkflowBlocks } from '../scripts/migration/web-workflow-bodies.mjs';
import { referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';
import { applyProfessionalRouting } from '../scripts/migration/professional-routing.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const LEGACY = /\b(?:preflight|diff-audit|handoff|approve)\b|Approval Ledger|ledger\.json|\.workflow-control\/approvals/i;

/** 真实源仓库不是分发安装所必需，缺失时只跳过源对照。 */
function hasSources() {
  return ORCHESTRATION_REFERENCE_FAMILIES.every((family) => family.sources.every((source) =>
    existsSync(resolve(SOURCE_ROOT, `${source.stack}-skills`, ...source.sourcePath.split('/')))));
}

/** 读取审计清单指明的唯一来源。 */
function readSource(source) {
  return readFileSync(resolve(SOURCE_ROOT, `${source.stack}-skills`, ...source.sourcePath.split('/')), 'utf8');
}

/** 根据真实迁移去向计算本栈文档，以便验证生成的公共引用。 */
function destination(source) {
  return source.sourcePath === 'skills/grilling/SKILL.md'
    ? `skills/${source.stack}-domain-contracts/references/technical-grilling.md`
    : source.sourcePath.endsWith('-game-orchestrator/SKILL.md')
      ? source.sourcePath.replace('/SKILL.md', '/references/technical-orchestration.md') : source.sourcePath;
}

test('编排参考逐源保留完整规则、原生内容与来源范围', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedOrchestrationReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  assert.equal(plan.documents.length, 12);
  assert.equal(plan.documents.reduce((total, document) => total + document.sources.length, 0), 35);
  for (const family of ORCHESTRATION_REFERENCE_FAMILIES) {
    const document = plan.documents.find((item) => item.capabilityId === family.id);
    assert.ok(document && document.sources.length >= 2, `${family.id} 公共正文缺失`);
    if (family.id === 'reference-orchestration-game-implementation') {
      // 场景与显示层独立推进，不把上下文关系误写成相邻执行要求。
      assert.match(document.content, /DISPLAY_LAYER.*绑定实际宿主上下文并独立安排/);
      assert.doesNotMatch(document.content, /DISPLAY_LAYER.*必须紧邻宿主/);
    }
    if (family.id !== 'reference-orchestration-quality-gates') assert.doesNotMatch(document.content, LEGACY, `${family.id} 不能复活旧控制协议`);
    for (const source of family.sources) {
      const original = readSource(source);
      const selected = plan.replacements.filter((item) => item.stack === source.stack && item.sourcePath === source.sourcePath);
      assert.ok(selected.length > 0, `${family.id}/${source.stack} 缺少来源映射`);
      for (const item of selected) {
        assert.equal(referenceBlockHash(original.slice(item.sourceRange.start, item.sourceRange.end)), item.sourceHash);
        assert.equal(referenceBlockHash(item.canonical), item.canonicalHash);
        assert.ok(document.content.includes(item.canonical));
      }
      const applied = applySharedWorkflowSections(original, { stack: source.stack, sourcePath: source.sourcePath,
        destination: destination(source), repositoryRoot: ROOT, plan });
      const ranges = new Set(selected.map((item) => `${item.sourceRange.start}:${item.sourceRange.end}`));
      for (const block of readWorkflowBlocks(original)) {
        if (!ranges.has(`${block.sourceRange.start}:${block.sourceRange.end}`)) {
          assert.ok(applied.text.includes(block.original.trim()), `${family.id}/${source.stack} 丢失原生内容：${block.sourceHeading}`);
        }
      }
      assert.ok(applied.sharedReferences.length > 0);
    }
  }
});

test('工作区授权、本地服务、拷问和 Spine 差异保持明确', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedOrchestrationReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const find = (name) => plan.documents.find((item) => item.capabilityId === `reference-orchestration-${name}`).content;
  const worktree = find('worktree-integration');
  assert.match(worktree, /只有人工明确要求/);
  assert.match(worktree, /仅在用户明确要求提交或集成时/);
  const service = find('local-service-validation');
  assert.match(service, /不属于当前任务的进程/);
  assert.match(service, /同一项目/);
  const grilling = find('technical-grilling');
  assert.match(grilling, /一次只问一个问题/);
  assert.match(grilling, /适用技术栈：cocos、phaser、threejs/);
  assert.doesNotMatch(grilling, /适用技术栈：[^\n]*(?:unity|flutter)/i);
  assert.match(grilling, /action\.approval/);
  assert.doesNotMatch(grilling, /\.workflow-control\/approvals\/ledger\.json/);
  const milestones = find('quality-gates');
  assert.match(milestones, /G0–G3 是游戏生产里程碑，不是控制器的 `stageId`/);
  for (const term of ['全场景集成', '响应式', '性能', '存档/恢复', '正式资源完整性', '全功能回归', '逐渠道候选', '风险', '回滚']) assert.ok(milestones.includes(term));
  assert.doesNotMatch(milestones, /A5\/A6|RELEASE_APPROVAL_REQUIRED/);
  const funnel = find('review-funnel');
  assert.match(funnel, /`repair`、`revalidate`、`return` 是处置分类/);
  assert.match(funnel, /控制器的 `transition`/);
  assert.doesNotMatch(funnel, /调用控制面的 `repair`、`revalidate` 或 `return`/);
  assert.match(funnel, /`approvedRequirements`/);
  const visual = find('visual-quality-gate');
  assert.match(visual, /公共对象阶段为 V0–V5，Work Item 使用 `visual\.stage` 记录/);
  assert.doesNotMatch(visual, /V0、V1、V2、V3、V4 是 `stageId`/);
  const integration = find('grilling-integration');
  const spine = integration.match(/> 适用技术栈：([^\n]+)\n\n[^\n]*Spine/);
  assert.ok(spine, 'Cocos/Phaser 的 Spine 人工确认必须保留');
  assert.match(spine[1], /cocos、phaser/);
  assert.doesNotMatch(spine[1], /threejs/i);
  assert.match(grilling, /发布决定按当前发布 Work Item/);
  assert.doesNotMatch(grilling, /A5\/A6/);
  const game = find('game-implementation');
  for (const field of ['functional_status', 'resource_status', 'integration_status', 'lifecycle_cleanup_status', 'verification_status']) assert.ok(game.includes(field));
  assert.match(game, /公共 V1 可直接实现并验证功能，白盒按需选择/);
  assert.doesNotMatch(game, /正式场景功能代码不得在 V1\/V2 前写入|场景 V2 前仅允许隔离灰盒|V1 灰盒只用于隔离/);
  assert.match(game, /各技术栈统一使用 V0–V5/);
  assert.doesNotMatch(game, /原生视觉阶段[\s\S]*对应公共 V2–V5/);
  assert.match(find('module-decomposition'), /公共 V1 可直接实现并验证场景功能，白盒按需选择/);
  assert.match(game, /reference-asset-effect-image-splitting\.md/);
  const technical = find('technical-orchestration');
  assert.match(technical, /文件所有权、执行单元、验收命令和停止条件/);
  assert.match(technical, /仅当用户明确要求 Git 提交时/);
  assert.match(technical, /\[游戏生产里程碑\]\(\.\/reference-orchestration-quality-gates\.md\)/);
  assert.match(technical, /\[本地服务验证规则\]\(\.\/reference-orchestration-local-service-validation\.md\)/);
  assert.doesNotMatch(technical, /“(?:quality-gates|local-service-validation)\.md”（见本栈配套资料）/);
  assert.match(integration, /app-workflow-control\/SKILL\.md#不可绕过约束/);
  const core = readFileSync(resolve(ROOT, 'skills/app-creator-workflow/SKILL.md'), 'utf8');
  const entry = readFileSync(resolve(ROOT, 'skills/grilling/SKILL.md'), 'utf8');
  for (const family of ORCHESTRATION_REFERENCE_FAMILIES) {
    assert.ok((family.capability === 'grilling' ? entry : core).includes(`${family.id}.md`), `${family.id} 缺少按需入口`);
  }
  assert.match(core, /任务明确包含 Git 提交时/);
  assert.match(entry, /Unity 与 Flutter 使用各自原生规范/);
});

test('真实编排路由复用唯一职责与拆分规范，保留其他执行步骤', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedOrchestrationReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const family = ORCHESTRATION_REFERENCE_FAMILIES.find((item) => item.id === 'reference-orchestration-game-implementation');
  for (const source of family.sources) {
    const original = readSource(source);
    const options = { stack: source.stack, sourcePath: source.sourcePath, destination: destination(source), repositoryRoot: ROOT, plan };
    const extracted = applySharedWorkflowSections(original, options);
    const routed = applyProfessionalRouting(extracted.text, options);
    assert.ok(routed.transforms.includes('route-orchestration-ownership-and-atomic-rules'));
    assert.match(routed.text, /gameplay-implementation\.md/);
    const shared = plan.documents.find((item) => item.capabilityId === family.id).content;
    assert.match(shared, /reference-asset-effect-image-splitting\.md/);
    assert.doesNotMatch(routed.text, /玩法独占规则、状态、碰撞和交互代码/);
    assert.doesNotMatch(routed.text, /`component_count` 只计唯一 `atomic_visual_key`/);
    assert.match(shared, /右侧栏包含该图的原子图片要求/);
    assert.match(shared, /7\. 公共 V1 可直接实现并验证功能，白盒按需选择/);
    assert.throws(() => applyProfessionalRouting(extracted.text.replace('玩法独占规则', '玩法规则已变化'), options), /原文缺失或重复/);
  }
});

test('两栈交付正文共享后依然经过原有目录路由，不丢原生资源约束', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const plan = buildSharedOrchestrationReferences({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const family = ORCHESTRATION_REFERENCE_FAMILIES.find((item) => item.id === 'reference-orchestration-delivery-artifacts');
  for (const source of family.sources) {
    const options = { stack: source.stack, sourcePath: source.sourcePath, destination: destination(source), repositoryRoot: ROOT, plan };
    const extracted = applySharedWorkflowSections(readSource(source), options);
    const routed = applyProfessionalRouting(extracted.text, options);
    assert.match(routed.text, /## 产物落盘/);
    assert.match(routed.text, /reference-orchestration-delivery-artifacts\.md/);
    assert.match(routed.text, /assets-source/);
    assert.doesNotMatch(routed.text, /待确认文件先完成保留目录落盘和引用更新再展示/);
  }
});

test('源缺失、源字节变化和 Git 跟踪清单新增时均拒绝迁移', (t) => {
  if (!hasSources()) return t.skip('需要三个只读源仓库');
  const root = mkdtempSync(resolve(tmpdir(), 'orchestration-reference-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const trackedFilesByStack = Object.fromEntries(Object.entries(ORCHESTRATION_TRACKED_REFERENCES).map(([stack, files]) => [stack, [...files]]));
  for (const [stack, paths] of Object.entries(trackedFilesByStack)) for (const path of paths) {
    const target = resolve(root, `${stack}-skills`, ...path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, ...path.split('/')), target);
  }
  const build = () => buildSharedOrchestrationReferences({ sourceRoot: root, repositoryRoot: ROOT, trackedFilesByStack });
  const selected = ORCHESTRATION_REFERENCE_FAMILIES[0].sources[0];
  const file = resolve(root, `${selected.stack}-skills`, ...selected.sourcePath.split('/'));
  const original = readFileSync(file);
  writeFileSync(file, Buffer.concat([original, Buffer.from('\n变更')]));
  assert.throws(build, /源摘要漂移/);
  writeFileSync(file, original);
  rmSync(file);
  assert.throws(build, /来源不可读取/);
  writeFileSync(file, original);
  trackedFilesByStack[selected.stack].push(`${selected.sourcePath.slice(0, selected.sourcePath.lastIndexOf('/') + 1)}extra.md`);
  assert.throws(build, /Git 清单变化/);
});
