import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { expectedNativePromotions, promoteNativeRules } from '../scripts/migration/native-rule-promotions.mjs';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_PATH = 'skills/app-creator-workflow/references/professional-conventions.md';
const STACK_BY_SOURCE = Object.freeze({
  'unity-game-production': 'unity',
  'cocos-game-production': 'cocos',
  'phaser4-game-production': 'phaser',
  'threejs-game-production': 'threejs',
  'cocos-game-architecture': 'cocos',
  'phaser4-game-architecture': 'phaser',
  'threejs-game-architecture': 'threejs',
  'flutter-tech-design': 'flutter',
  'cocos-game-qa-performance': 'cocos',
  'phaser4-game-qa-performance': 'phaser',
  'threejs-game-qa-performance': 'threejs',
  'unity-game-qa-performance': 'unity',
  'flutter-quality-review': 'flutter',
  'flutter-subagent-delivery': 'flutter',
  'cocos-game-release': 'cocos',
  'phaser4-game-release': 'phaser',
  'threejs-game-release': 'threejs',
});

const NATIVE_BOUNDARIES = Object.freeze({
  'unity-game-production': 'Unity 仍执行六阶段与 V0-V4/DISPLAY_LAYER 规划。',
  'cocos-game-production': '保留原生输入边界：`resources.load/loadDir` 动态资源与 AssetDB。',
  'phaser4-game-production': '保留原生行为：Phaser 场景与 Vite 目标矩阵。',
  'threejs-game-production': '保留原生行为：three.js Object3D 场景与 WebGL 运行入口。',
  'cocos-game-architecture': '保留 Cocos Scene、Node、Component、Prefab、AssetDB 和 Creator MCP 协议。',
  'phaser4-game-architecture': '保留 Phaser Canvas、Camera、Vite 与 `DISPLAY_LAYER` 原生合同。',
  'threejs-game-architecture': '保留 three.js Object3D、WebGL2、Scene 和固定步长渲染合同。',
  'flutter-tech-design': '保留 Flutter state、routing、平台验证矩阵与技术设计工件。',
  'cocos-game-qa-performance': '保留 Creator MCP 运行结果判据、V1/V2 条件门与 AssetDB 检查。',
  'phaser4-game-qa-performance': '保留 Phaser/Vite 启动、Canvas resize、输入映射和游戏循环烟测。',
  'threejs-game-qa-performance': '保留 WebGL2 Renderer、资源生命周期与目标浏览器检查。',
  'unity-game-qa-performance': '保留 G2/G3 门、`Screen.safeArea` 和平台设备矩阵。',
  'flutter-quality-review': '保留 F1/F2/F3 顺序、snapshot 输入和“低保真截图只证明结构”。',
  'flutter-subagent-delivery': '保留 Flutter 风险分级、八字段任务契约与普通审核 snapshot 绑定。',
  'cocos-game-release': '保留 Creator 生产构建、最终解包检查与 Feature Cropping。',
  'phaser4-game-release': '保留 Vite `build.sourcemap: false` 与 Phaser Compressor 检查。',
  'threejs-game-release': '保留 WebGL 部署响应头、Source Map 产物检查与实际运行证据。',
});

const NATIVE_PREFIXES = Object.freeze({
  'unity-game-production': '读取当前 Work Item、`docs/project-profile.yaml`、`docs/GDD.md` 与已有验收证据。',
});

/** 按与生产代码相同的 UTF-8 字节序列计算 SHA-256。 */
function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** 从显式锚点提取二级章节，用来确认追溯哈希对应实际公共内容。 */
function publicSection(markdown, anchor) {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const markerIndex = normalized.indexOf(`<a id="${anchor}"></a>`);
  const headingStart = normalized.indexOf('\n## ', markerIndex);
  const headingEnd = normalized.indexOf('\n', headingStart + 1);
  const nextHeading = normalized.indexOf('\n## ', headingEnd);
  return normalized.slice(headingStart + 1, nextHeading < 0 ? normalized.length : nextHeading).trimEnd();
}

/** 组合规则登记片段与少量栈专有断言材料，避免依赖会被迁移删除的 ADAPTER 文件。 */
function sourceFixture(sourceSkill) {
  const rules = expectedNativePromotions(sourceSkill);
  assert.ok(rules.length > 0, `${sourceSkill} 应注册精确提升规则`);
  return [NATIVE_PREFIXES[sourceSkill], ...rules.map((rule) => rule.sourceText), NATIVE_BOUNDARIES[sourceSkill]]
    .filter(Boolean)
    .join('\n');
}

test('注册来源的规则集合与实际提升记录严格一致，且公共锚点和哈希可追溯', () => {
  const publicMarkdown = readFileSync(path.join(REPOSITORY_ROOT, PUBLIC_PATH), 'utf8');

  for (const [sourceSkill, stack] of Object.entries(STACK_BY_SOURCE)) {
    const original = sourceFixture(sourceSkill);
    const expected = expectedNativePromotions(sourceSkill);
    const result = promoteNativeRules(original, { stack, sourceSkill, repositoryRoot: REPOSITORY_ROOT });
    assert.equal(result.promotions.length, expected.length, `${sourceSkill} 不得漏记已登记规则`);
    assert.deepEqual(result.promotions.map(({ id }) => id), expected.map(({ id }) => id));
    assert.ok(result.text.includes(NATIVE_BOUNDARIES[sourceSkill]), `${sourceSkill} 专业条件必须原样保留`);

    for (const promotion of result.promotions) {
      assert.equal(promotion.sourceSkill, sourceSkill);
      assert.equal(promotion.stack, stack);
      assert.equal(promotion.publicPath, PUBLIC_PATH);
      assert.match(promotion.sourceHash, /^[a-f0-9]{64}$/);
      assert.match(promotion.publicHash, /^[a-f0-9]{64}$/);
      assert.equal(promotion.sourceHash, sha256(promotion.sourceText));
      assert.equal(promotion.publicHash, sha256(publicSection(publicMarkdown, promotion.anchor)));
      assert.ok(result.text.includes(`#${promotion.anchor})`), `${sourceSkill} 必须链接到 ${promotion.anchor}`);
      assert.ok(!result.text.includes(promotion.sourceText), `${sourceSkill} 不得残留已提升片段`);
    }

    if (sourceSkill === 'cocos-game-release') {
      const candidateRule = expected.find((rule) => rule.id.includes('candidate-identity'));
      const matrixRule = expected.find((rule) => rule.id.includes('candidate-matrix'));
      const evidenceRule = expected.find((rule) => rule.id.includes('evidence-binding'));
      const adjacentStep = promoteNativeRules([
        candidateRule.sourceText,
        'Creator 生产构建规则仍按本栈适配核对。',
        matrixRule.sourceText + evidenceRule.sourceText,
        '候选 SHA 摘要核对仍按本栈候选政策处理。',
      ].join('\n'), { stack, sourceSkill, repositoryRoot: REPOSITORY_ROOT });
      const lines = adjacentStep.text.split('\n');
      assert.equal(lines[2], adjacentStep.promotions.find((rule) => rule.id.includes('candidate-matrix')).replacementText);
      assert.match(lines[1], /Creator 生产构建规则/);
      assert.match(lines[3], /候选 SHA 摘要核对/);
      assert.doesNotMatch(lines[2], /action\.approval|Evidence Manifest|F4 只按/);
    }
  }
});

test('未注册 skill 原样返回，且预期规则查询是纯空结果', () => {
  const original = '本句含 F0、审核与授权等词，但没有登记迁移规则。';
  assert.deepEqual(expectedNativePromotions('cocos-unregistered-skill'), []);
  assert.deepEqual(
    promoteNativeRules(original, { stack: 'cocos', sourceSkill: 'cocos-unregistered-skill', repositoryRoot: REPOSITORY_ROOT }),
    { text: original, promotions: [] },
  );
});

test('源片段缺失或重复时拒绝静默漏迁', () => {
  const sourceSkill = 'cocos-game-production';
  const original = sourceFixture(sourceSkill);
  const firstRule = expectedNativePromotions(sourceSkill)[0].sourceText;
  const drifted = original.replace(firstRule, firstRule.replace('F0-F4', 'F0-F3'));
  assert.throws(
    () => promoteNativeRules(drifted, { stack: 'cocos', sourceSkill, repositoryRoot: REPOSITORY_ROOT }),
    /原生规则源片段漂移.*planning-work-item-facts-cocos-game-production/,
  );
  assert.throws(
    () => promoteNativeRules(`${original}\n${firstRule}`, { stack: 'cocos', sourceSkill, repositoryRoot: REPOSITORY_ROOT }),
    /原生规则源片段漂移.*planning-work-item-facts-cocos-game-production/,
  );
});

test('唯一公共章节保留完整公共语义和 Unity 原生项目路径', () => {
  const publicMarkdown = readFileSync(path.join(REPOSITORY_ROOT, PUBLIC_PATH), 'utf8');
  assert.match(publicMarkdown, /同一项目身份、服务类型、运行模式、端口和健康状态检查可复用实例/);
  assert.match(publicMarkdown, /确认没有可复用实例后才启动新服务/);
  assert.match(publicMarkdown, /不得终止项目身份不明或归属不明的进程/);
  assert.match(publicMarkdown, /Flutter 原生 Controller\/reviewer 流程中，审核者只读并返回统一结论，Controller 是持久 review 记录的唯一写入者/);
  assert.match(publicMarkdown, /复用已覆盖同一目标和动作的真实用户消息引用/);
  assert.match(publicMarkdown, /工作项完成不等于已提交或已上架，未执行或缺少证据时不得声称完成/);

  const unityFixture = sourceFixture('unity-game-production');
  const unity = promoteNativeRules(unityFixture, {
    stack: 'unity', sourceSkill: 'unity-game-production', repositoryRoot: REPOSITORY_ROOT,
  });
  assert.match(unity.text, /`docs\/project-profile\.yaml`/);
  assert.match(unity.text, /`docs\/GDD\.md`/);
  assert.match(unity.text, /Unity 仍执行六阶段与 V0-V4\/DISPLAY_LAYER 规划/);
});

test('技术栈不匹配时拒绝应用另一个技术栈的源规则', () => {
  assert.throws(
    () => promoteNativeRules(sourceFixture('unity-game-production'), {
      stack: 'cocos', sourceSkill: 'unity-game-production', repositoryRoot: REPOSITORY_ROOT,
    }),
    /原生规则来源与技术栈不匹配/,
  );
});

