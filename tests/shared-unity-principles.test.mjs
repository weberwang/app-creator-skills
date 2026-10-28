/** 校验四栈美术共同判断与各自合同字段、具体检查和来源追溯。 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { buildSharedUnityPrinciples } from '../scripts/migration/shared-unity-principles.mjs';
import { referenceBlockHash } from '../scripts/migration/reference-workflow-common.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { applyProfessionalRouting } from '../scripts/migration/professional-routing.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_ROOT = resolve(ROOT, '..');
const SOURCES = Object.freeze({
  unity: 'unity-development-workflow/references/art-quality-contract.md',
  cocos: 'skills/cocos-game-asset-integration/references/art-quality-contract.md',
  phaser: 'skills/phaser4-game-asset-integration/references/art-quality-contract.md',
  threejs: 'skills/threejs-game-asset-integration/references/art-quality-contract.md',
});

/** 真实源仓库缺席时说明限定条件，不以合成资料声称覆盖全部原生细节。 */
function sourcesAvailable(t) {
  if (Object.entries(SOURCES).every(([stack, path]) => existsSync(resolve(SOURCE_ROOT, `${stack}-skills`, path)))) return true;
  t.skip('需要 Unity、Cocos、Phaser 和 Three.js 四个只读源仓库');
  return false;
}

test('四栈审查共享五项原则和 brief，同时保留各自证据与完整检查', (t) => {
  if (!sourcesAvailable(t)) return;
  const plan = buildSharedUnityPrinciples({ sourceRoot: SOURCE_ROOT, repositoryRoot: ROOT });
  const document = plan.documents[0];
  assert.equal(document.capabilityId, 'art-quality-principles');
  assert.deepEqual(document.sources.map((source) => source.stack), ['unity', 'cocos', 'phaser', 'threejs']);
  for (const term of ['主题贴合', '受众适配', '玩法可读', '观看舒适', '美术完成度', '核心循环', '视觉层级', '刺激预算', '用户对显示效果的人工验收']) {
    assert.ok(document.content.includes(term), `公共美术判断缺少 ${term}`);
  }
  for (const [stack, path] of Object.entries(SOURCES)) {
    const original = readFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, path), 'utf8');
    const rows = plan.replacements.filter((item) => item.stack === stack);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(referenceBlockHash(original.slice(row.sourceRange.start, row.sourceRange.end)), row.sourceHash);
      assert.ok(document.content.includes(row.canonical));
    }
    const destination = stack === 'unity' ? `skills/${path}` : path;
    const native = applySharedWorkflowSections(original, { stack, sourcePath: path, destination, repositoryRoot: ROOT, plan }).text;
    for (const row of rows) assert.ok(!native.includes(row.original), `${stack} 不应继续保存整份共同检查表`);
    if (stack === 'unity') {
      for (const phrase of ['gameplayReadability', 'viewingComfort', 'artCompletion', '`PASS`', '`FAIL`', '`NOT_RUN`']) {
        assert.ok(native.includes(phrase), `Unity 合同缺少 ${phrase}`);
      }
      for (const phrase of ['所需时间', '内部规格说明', '镜头运动', '已确认 V1 的显著视觉特征', 'artExperienceAcceptanceRef', 'unity-game-juice']) assert.ok(native.includes(phrase));
      assert.ok(!native.includes('#web-五项检查表'), 'Unity 不应接入 Web 专属检查表');
    } else {
      assert.match(native, /#web-brief-检查表/);
      assert.match(native, /#web-五项检查表/);
      assert.ok(document.content.includes('| 目标受众 | 玩家偏好、游戏经验'));
      assert.ok(document.content.includes('| 观看舒适 | 常态高光、饱和色'));
      assert.match(native, /通过、失败或未验证/);
    }
  }
});

test('任一来源缺失或字节漂移都停止语义合并', (t) => {
  if (!sourcesAvailable(t)) return;
  const sandbox = mkdtempSync(resolve(tmpdir(), 'shared-unity-principles-'));
  // 该测试只删除自己创建的临时目录。
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  for (const [stack, path] of Object.entries(SOURCES)) {
    const target = resolve(sandbox, `${stack}-skills`, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(SOURCE_ROOT, `${stack}-skills`, path), target);
  }
  assert.equal(buildSharedUnityPrinciples({ sourceRoot: sandbox, repositoryRoot: ROOT }).documents.length, 1);
  const unity = resolve(sandbox, 'unity-skills', SOURCES.unity);
  writeFileSync(unity, `${readFileSync(unity, 'utf8')}\n漂移`);
  assert.throws(() => buildSharedUnityPrinciples({ sourceRoot: sandbox, repositoryRoot: ROOT }), /已变化/);
  rmSync(unity);
  assert.throws(() => buildSharedUnityPrinciples({ sourceRoot: sandbox, repositoryRoot: ROOT }), /ENOENT/);
});

test('Unity 汁水直接复用公共反馈，保留时间源、对象池与视觉属性恢复', () => {
  const original = [
    '## 必须明确的运行行为', '',
    '- **重复**：同一事件再次触发时，声明重播、重置、合并、限频或忽略等策略，并说明选择理由。',
    '- **叠加**：声明并行、合并、限量或优先级规则，避免多个反馈争用同一属性或遮蔽玩法信息。',
    '- **中断与收尾**：声明被更高优先级事件打断、对象禁用、关闭显示层或离开场景时如何结束；结束后恢复被临时修改的视觉属性。',
    '- **时间与暂停**：缩放/非缩放时间和 `Time.timeScale` 由 Unity 玩法角色持有。',
    '- **对象生命周期**：对象池复用时清理动画、计时器、协程、订阅并验证真实轨迹。',
  ].join('\n');
  const options = { stack: 'unity', sourcePath: 'unity-game-juice/SKILL.md', destination: 'skills/app-stack-unity/references/native-contracts.md' };
  const result = applyProfessionalRouting(original, options);
  assert.ok(result.transforms.includes('route-unity-feedback-to-public-lifecycle'));
  assert.match(result.text, /\.\.\/\.\.\/app-feedback\/references\/interaction-feedback\.md#3-处理重复并发和打断/);
  assert.match(result.text, /\.\.\/\.\.\/app-feedback\/references\/interaction-feedback\.md#5-尊重生命周期与可访问性/);
  for (const term of ['重播或重置', '限制并发数量', '争用同一属性', '恢复被临时修改的视觉属性', 'Time.timeScale', '对象池', '协程', '订阅', '真实轨迹']) assert.ok(result.text.includes(term));
  assert.ok(!result.text.includes('同一事件再次触发时，声明重播'));
  assert.ok(!result.text.includes('声明并行、合并、限量或优先级规则'));
  assert.throws(() => applyProfessionalRouting(original.replace('同一事件再次触发时', '新事件到达时'), options), /公共条款缺失或重复/);
  assert.throws(() => applyProfessionalRouting(`${original}\n${original}`, options), /公共条款缺失或重复/);
  assert.equal(applyProfessionalRouting(original, { ...options, stack: 'cocos' }).text, original);
});
