import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { applyProfessionalRouting } from '../scripts/migration/professional-routing.mjs';

const OLD = /\b(?:preflight|diff-audit|evidence-check|prepare-approval|delegate-check|parallel-check)\b|`(?:route|advance|handoff|approve)`/i;

/** 生成与迁移计划相同职责的源路径，避免测试依赖用户机器上的五个源仓库。 */
function route(text, { stack = 'threejs', role = 'game-audio', destination } = {}) {
  const prefixes = { cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' };
  const prefix = prefixes[stack] ?? 'threejs';
  const sourcePath = role === 'control-entry' && stack === 'unity'
    ? 'unity-game-workflow-control/SKILL.md'
    : `skills/${prefix}-${({ 'control-entry': 'game-workflow-control', 'control-model': 'game-workflow-control/references/control-model', 'control-schemas': 'game-workflow-control/references/schemas' }[role] ?? role)}/SKILL.md`;
  return applyProfessionalRouting(text, {
    stack, sourcePath, destination: destination ?? `skills/${prefix}-${role}/SKILL.md`,
  });
}

test('音频与玩法入口改接公共执行规范并保留专业规则', () => {
  const audio = route([
    '## 全局控制接入',
    '',
    '控制面边界：本技能只负责音频，可在 Work Item 范围内修改。',
    '',
    '本领域可提议，所有动作先运行 workflow-control preflight，结果回总控。',
    '',
    '读取全局 Work Item 并提交音频证据。',
    '',
    'Creator AssetDB 必须按实时 MCP schema 查询 UUID，不手写 `.meta`。',
  ].join('\n'), { stack: 'cocos', role: 'game-audio' });
  assert.equal(OLD.test(audio.text), false);
  assert.match(audio.text, /Creator AssetDB/);
  assert.match(audio.text, /\[当前公共专业执行规范\]\(\.\.\/app-creator-workflow\/references\/professional-execution\.md\)/);
  assert.equal(audio.publicExecutionRef, 'skills/app-creator-workflow/references/professional-execution.md');

  const gameplay = route([
    '全局阶段、视觉硬门和场景前置以控制模型、状态门及 Schema 为准。本领域只负责玩法规则，场景沿 V1→V4。',
    '',
    '## 全局控制接入',
    '',
    '控制面边界：回到旧总控状态迁移。',
    '',
    '本领域实现前运行 workflow-control preflight，之后执行 diff-audit 与 evidence-check。',
    '',
    'Phaser input manager 按当前 Phaser 版本的场景生命周期清理监听。',
  ].join('\n'), { stack: 'phaser', role: 'gameplay-development' });
  assert.equal(OLD.test(gameplay.text), false);
  assert.match(gameplay.text, /V1→V2→V3→V4/);
  assert.match(gameplay.text, /Phaser input manager/);

  const threejs = route([
    '全局阶段、视觉硬门和场景前置以控制模型、状态门及 Schema 为准。本领域只负责玩法规则和运行验收。',
    '', '## 全局控制接入', '', '控制面边界：回到旧总控状态迁移。', '',
    '实现前执行 preflight，之后执行 diff-audit 与 evidence-check。', '',
    'THREE.Scene 的世界对象层级、world transform 和相机投影属于 Three.js 专项事实。',
  ].join('\n'), { stack: 'threejs', role: 'gameplay-development' });
  assert.equal(OLD.test(threejs.text), false);
  assert.match(threejs.text, /THREE\.Scene 的世界对象层级、world transform 和相机投影/);
});

test('清理技能替换旧 preflight/pending 语法且保留引擎资源约束', () => {
  const source = [
    '## 全局控制接入', '',
    '以 [`cocos-game-workflow-control`](../cocos-game-workflow-control/SKILL.md) 为唯一任务范围、风险门和状态权威。本 Skill 在 Work Item 范围内提交清理提议、执行结果和验证证据，再回到控制面审计与状态迁移；不建立第二套状态机。', '',
    '用户要求清理时，可在指定范围盘点处理本地产物，不重复请求普通本地操作批准。不可恢复的数据删除、外部删除等带副作用的 A4-A6 操作按控制面逐对象批准，授权只覆盖批准清单和对应内容身份。', '',
    '清理 Creator AssetDB 时按实时 MCP schema 操作，不手写 `.meta`、`.scene` 或 `.prefab`。', '',
    '## 清理流程', '',
    '1. 盘点范围。',
    '2. 建立保留集合。',
    '3. 列出候选。',
    '4. **执行前复核**：运行控制面 `check`，按实际动作执行 `preflight`，将需批准对象先提交精确 pending。删除前检查引用。',
    '5. 逐对象清理。',
    '6. **验证与收尾**：报告本任务差异。',
  ].join('\n');
  const result = route(source, { stack: 'cocos', role: 'game-artifact-cleanup' });
  assert.equal(OLD.test(result.text), false);
  assert.match(result.text, /Creator AssetDB/);
  assert.match(result.text, /\.meta/);
  assert.match(result.text, /Work Item 的明确用户批准/);
  assert.match(result.text, /运行公共控制 CLI `check`/);
  assert.match(result.text, /报告本任务差异/);
});

test('纯公共交付参考改为薄路由，保留专业产物目录内容', () => {
  const source = [
    '# 项目交付物规范', '',
    '全局机器事实由 ThreeJS 控制定义 Work Item、Approval Ledger、Implementation Package、Change Request、Delegation Package 和 Evidence Manifest。', '',
    '运行 init 后执行 A1 preflight。', '',
    '涉及外部操作时执行 prepare-approval、handoff 和 approve。', '',
    '总控 route 推导 A1-A6 风险通道。', '',
    '## 产物存放与确认归档', '',
    'Creator AssetDB 的 `.meta` 与 UUID 一起保留。', '',
    '## 留痕', '',
    '- 建立 Change Request 并经 Approval Ledger 审批。',
    '- 委派包和 diff 审计引用领域工件。',
  ].join('\n');
  const result = applyProfessionalRouting(source, {
    stack: 'threejs', sourcePath: 'skills/threejs-game-orchestrator/references/delivery-artifacts.md',
    destination: 'skills/threejs-game-orchestrator/references/delivery-artifacts.md',
  });
  assert.equal(OLD.test(result.text), false);
  assert.match(result.text, /Creator AssetDB/);
  assert.match(result.text, /\.meta/);
  assert.match(result.text, /产物存放与确认归档/);
  assert.match(result.text, /未经明确请求不提交或推送 Git/);
});

test('旧控制技能入口链接当前 CLI，并保留后续专业协作章节', () => {
  const source = [
    '# 旧控制入口', '',
    '- 需要 A3 委派、执行或证据：读取对应的 implementation-package、delegation、execution-state、evidence Schema。', '',
    '## 代理入口', '',
    'node workflow-control.mjs run', '',
    '## 高级诊断', '',
    '`route`、`preflight`、`diff-audit`、`evidence-check`、`prepare-approval`。', '',
    '## 领域协作', '',
    'Cocos AssetDB 与 UUID 继续执行技术合同。',
  ].join('\n');
  const result = applyProfessionalRouting(source, {
    stack: 'phaser', sourcePath: 'skills/phaser4-game-workflow-control/SKILL.md',
    destination: 'skills/phaser4-domain-contracts/references/technical-control.md',
  });
  assert.equal(OLD.test(result.text), false);
  assert.match(result.text, /\.\.\/\.\.\/app-creator-workflow\/references\/professional-execution\.md/);
  assert.match(result.text, /Cocos AssetDB 与 UUID/);
  assert.match(result.text, /当前公共 Schema 与 CLI/);

  const unitySource = [
    '# Unity 控制入口', '',
    'Unity `.meta` 与 GUID/importer 配对是引擎资源身份合同。', '',
    '- [Execution State schema](schemas/execution-state.schema.json)、[单元 Result schema](schemas/execution-unit-result.schema.json)：当前实施计划、执行批次和验收命令结果的文件合同。', '',
    '## 稳定 CLI', '',
    '旧的 workflow-control scene-stage 命令。', '',
    '## 参考资料', '',
    '- [Execution State schema](schemas/execution-state.schema.json)：Unity 执行扩展。',
  ].join('\n');
  const unity = applyProfessionalRouting(unitySource, {
    stack: 'unity', sourcePath: 'unity-game-workflow-control/SKILL.md',
    destination: 'skills/unity-domain-contracts/references/technical-control.md',
  });
  assert.doesNotMatch(unity.text, /当前实施计划、执行批次和验收命令结果的文件合同/);
  assert.match(unity.text, /Unity 专用执行扩展与单元 Result Schema/);
  assert.match(unity.text, /当前公共专业执行规范/);
  assert.match(unity.text, /Unity `\.meta` 与 GUID\/importer 配对/);
});

test('控制模型只改旧公共执行段，保留本栈事实并引用当前 RETURN 参数', () => {
  const source = [
    '默认闭环为：最小必要事实确认 → 执行/实施 → diff-audit → evidence-check → 完成。已确认事实不重复搜索。', '',
    '`route` 应优先给出动作；`advance` 迁移状态，控制面 fail closed。', '',
    '产品、视觉、架构、预算、合规和数据边界取舍属于 `USER_DECISION`。`handoff` 后用 `approve` 确认，A6 不自动执行高风险动作。', '',
    '`route` 依据确定性规则输出 A0-A6 风险通道，外部操作须审批。', '',
    '进入 A3 `IMPLEMENTING` 时创建 execution-state.json；执行状态绑定指纹，运行 delegate-check、parallel-check、evidence-check；V2/V3 后进入 V4。普通候选身份变化不触发 `RETURN`。', '',
    'Creator AssetDB、UUID 和 `.meta` 绑定必须按引擎事实核验。',
  ].join('\n');
  const result = applyProfessionalRouting(source, {
    stack: 'cocos', sourcePath: 'skills/cocos-game-workflow-control/references/control-model.md',
    destination: 'skills/cocos-domain-contracts/references/control-model.md',
  });
  assert.equal(OLD.test(result.text), false);
  assert.match(result.text, /Creator AssetDB、UUID 和 `\.meta`/);
  assert.match(result.text, /--affected-scope/);
  assert.match(result.text, /execution-state\.json/);
  assert.match(result.text, /unit-check/);
  assert.match(result.text, /并行组和依赖/);
  assert.match(result.text, /implementation-execution\.md/);
  assert.doesNotMatch(result.text, /只支持实施包声明的有序执行单元/);
});

test('schema 活动目录改指当前公共合同并留下领域视觉 Schema', () => {
  const source = [
    '# 结构化 Schema', '',
    '机器文件使用 UTF-8 JSON。权威 JSON Schema 位于本目录：', '',
    '- [Work Item](work-item.schema.json)',
    '- [Approval Ledger](approval-ledger.schema.json)',
    '- [Execution State](execution-state.schema.json)',
    '- [项目美术 brief](game-art-brief.schema.json)',
    '- [运行美术验收](art-experience-acceptance.schema.json)', '',
    '## 视觉阶段 Schema', '',
    '布局读取 Creator AssetDB UUID 与 `.meta` 的真实候选。', '',
    '方法变化必须由绑定区域、工作项、候选版本、用户原文和时间的 `ACCEPTED` Change Request 支持。', '',
    'Work Item 保存用户原始请求、目标、当前范围、实施计划、路径和时间。A0-A3 依据用户任务；任务变化时更新计划，普通任务内副作用仍须逐项批准。', '',
    '所有动作字段使用固定 stack 白名单并绑定唯一等级。Delegation Package 与 Approval Ledger 按 stack 的旧白名单校验。', '',
    '操作 pending 与 Approval Ledger 都必须包含非空 impactSummary。', '',
    'Work Item 与 Approval Ledger 使用排序后的非空 `moduleIds`。纯工程 foundation-only 按本栈运行约束分流。A0-A2 Delegation Package 禁止实施单元字段；串行 A3 使用 `delegate-check`，并行 A3 必须通过保存于 `delegations/batches/` 的完整不可变批次执行 `parallel-check`，单独委派不得放行。', '',
    'Execution Unit Result 绑定当前工作项、实施包、单元和命令。Evidence Manifest 的 completedUnitIds 必须覆盖全部实施单元并由结果复核；V3 后正式实施包即可激活。', '',
    '`execution-state.json` 是当前阶段实施顺序的可执行状态合同，只能在进入 IMPLEMENTING 时初始化，并由通过 unit-check 的当前 Result 原子更新；delegate-check、parallel-check 和 evidence-check 必须复核当前状态。', '',
    '任务内更新未完成单元后应重算摘要并复核历史批次。', '',
    '构造 Parallel Delegation Batch 后运行 parallel-check。',
  ].join('\n');
  const result = applyProfessionalRouting(source, {
    stack: 'threejs', sourcePath: 'skills/threejs-game-workflow-control/references/schemas.md',
    destination: 'skills/threejs-domain-contracts/references/schemas.md',
  });
  assert.equal(OLD.test(result.text), false);
  assert.match(result.text, /\[项目美术 brief\]\(game-art-brief\.schema\.json\)/);
  assert.match(result.text, /Creator AssetDB UUID 与 `\.meta`/);
  assert.match(result.text, /公共 Schema、CLI 与结果合同/);
  assert.match(result.text, /当前公共控制器只维护绑定 Work Item 与实施包的单元顺序状态/);
  assert.doesNotMatch(result.text, /Change Request/);
});

test('Flutter 自然语言工程 preflight 不被当成旧公共 CLI', () => {
  const source = '先完成工程与进程 preflight，确认现有验证命令。';
  const result = applyProfessionalRouting(source, {
    stack: 'flutter', sourcePath: 'flutter-code-sketch/SKILL.md',
    destination: 'flutter-code-sketch/SKILL.md',
  });
  assert.deepEqual(result, { text: source, transforms: [] });
});

test('共享占位链接跨编号与空行合并，保留后续原生步骤编号', () => {
  const source = [
    '## 执行',
    '控制面边界：本技能回到全局工作流。',
    '',
    '所有动作先运行公共 preflight 并返回总控。',
    '',
    '> 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '> 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '1. 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '',
    '2. 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '',
    '3. Creator AssetDB 保留本栈原生步骤。',
  ].join('\n');
  const result = route(source, { role: 'game-audio' });
  assert.equal((result.text.match(/通用工作流步骤见/g) ?? []).length, 1);
  assert.match(result.text, /> 通用工作流步骤/);
  assert.doesNotMatch(result.text, /[12]\. 通用工作流步骤/);
  assert.match(result.text, /3\. Creator AssetDB 保留本栈原生步骤/);
  assert.deepEqual(result.transforms, [
    'route-audio-skill-to-public-execution',
    'coalesce-shared-workflow-placeholders',
  ]);
  const href = result.text.match(/\[当前公共专业执行规范\]\(([^)]+)\)/)?.[1];
  assert.ok(href);
  const publicGuide = path.resolve(import.meta.dirname, '..', path.posix.dirname('skills/threejs-game-audio/SKILL.md'), href);
  assert.equal(existsSync(publicGuide), true);
});

test('所有 Markdown 角色均折叠抽取占位，区别链接和保留代码示例', () => {
  const source = [
    '# 任意专业参考',
    '1. 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '',
    '2. 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '',
    '3. 原生 Creator AssetDB 操作保持在此处。',
    '',
    '- 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#另一个主题)。',
    '- 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#另一个主题)。',
    '',
    '```md',
    '4. 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '5. 通用工作流步骤见[完整规范](../app-domain-toolkit/references/audio.md#音频需求)。',
    '```',
  ].join('\n');
  const result = applyProfessionalRouting(source, {
    stack: 'flutter', sourcePath: 'flutter-code-sketch/references/example.md',
    destination: 'flutter-code-sketch/references/example.md',
  });
  assert.deepEqual(result.transforms, ['coalesce-shared-workflow-placeholders']);
  assert.match(result.text, /1\. 通用工作流步骤/);
  assert.match(result.text, /3\. 原生 Creator AssetDB 操作保持在此处/);
  assert.match(result.text, /- 通用工作流步骤见\[完整规范\]\([^\n]+#另一个主题\)/);
  assert.match(result.text, /4\. 通用工作流步骤见\[完整规范\]/);
  assert.match(result.text, /5\. 通用工作流步骤见\[完整规范\]/);
  assert.equal((result.text.match(/#音频需求/g) ?? []).length, 3);
});

test('三栈发布技能改接 RELEASE、批准和真实证据，保留技术构建规范', () => {
  const entries = [
    { stack: 'cocos', prefix: 'cocos', filename: 'E:/Git/cocos-skills/skills/cocos-game-release/SKILL.md', native: /Creator 生产构建与发布检查/, fixtureNative: 'Creator 生产构建与发布检查保留锁定版本和候选包扫描。' },
    { stack: 'phaser', prefix: 'phaser4', filename: 'E:/Git/phaser-skills/skills/phaser4-game-release/SKILL.md', native: /Phaser Compressor/, fixtureNative: '登记 Phaser Compressor 的适用版本及裁剪结果。' },
    { stack: 'threejs', prefix: 'threejs', filename: 'E:/Git/threejs-skills/skills/threejs-game-release/SKILL.md', native: /实际 Terser 配置/, fixtureNative: '按实际 Terser 配置核对 Web 资源。' },
  ];
  const fixture = [
    '# 发布流程',
    '3. 从实际候选生成包，并完成技术栈原生构建检查。候选 SHA 可选。共享基础和关键玩法流证据只能证明各自范围；G3/release 必须执行完整渠道/平台矩阵，不得自动发起真机验收。',
    '5. 在平台矩阵和发布清单登记候选包、完成项、阻断项、风险与建议，向总控提交只读 F2 结论；只有总控可写任务 `review.md`。F3 不自动合并或发布，未获 G3 明确放行不得声称可以提交或已经上架。',
  ].join('\n\n');
  for (const entry of entries) {
    const sourcePath = `skills/${entry.prefix}-game-release/SKILL.md`;
    const source = existsSync(entry.filename)
      ? readFileSync(entry.filename, 'utf8')
      : `${fixture}\n\n${entry.fixtureNative}`;
    const result = applyProfessionalRouting(source, {
      stack: entry.stack, sourcePath,
      destination: sourcePath,
    });
    assert.doesNotMatch(result.text, /G3|只读 F2 结论|只有总控可写任务 `review\.md`/);
    assert.match(result.text, /当前 RELEASE Work Item 的 Evidence Manifest/);
    assert.match(result.text, /action\.approval/);
    assert.match(result.text, /F4/);
    assert.match(result.text, entry.native);
  }
});

test('公共专业规范示例从已安装路径运行，领域 schema 与执行参考链接存在', () => {
  const guidePath = path.resolve(import.meta.dirname, '../skills/app-creator-workflow/references/professional-execution.md');
  const guide = readFileSync(guidePath, 'utf8');
  assert.match(guide, /node \.agents\/skills\/app-workflow-control\/scripts\/workflow-control\.mjs/);
  assert.doesNotMatch(guide, /node skills\/app-workflow-control\/scripts\/workflow-control\.mjs/);
  assert.match(guide, /维护 `app-creator-skills` 仓库源码时/);
  assert.match(guide, /app-stack-<stack>\/references\/domain-validation\.md/);
  assert.equal(existsSync(path.resolve(import.meta.dirname, '../skills/app-workflow-control/references/implementation-execution.md')), true);
  for (const [, href] of guide.matchAll(/\]\(([^)]+)\)/g)) {
    const [target] = href.split('#');
    if (target) assert.equal(existsSync(path.resolve(path.dirname(guidePath), target)), true, `规范中的相对链接失效：${href}`);
  }
});

test('已知源角色缺少预期旧协议时 fail closed', () => {
  assert.throws(() => route('没有旧控制段落', { role: 'game-audio' }), /缺少预期公共协议段落/u);
});
/** 通用权限规则由公共协议维护；同段含原生接口的专业限制不能被一并删除。 */
test('公共权限复述下沉且保留混合原生边界', () => {
  const generic = '控制面边界：可提议、可审查，动作必须回到当前 Work Item 审计和状态迁移。';
  const native = '本领域可提议资源变更，但 Creator AssetDB 必须通过 UUID 回读真实导入状态。';
  const output = applyProfessionalRouting(`# 专业技能\n\n${generic}\n\n${native}\n`, {
    stack: 'cocos', sourcePath: 'skills/cocos-game-ui-layout/SKILL.md', destination: 'skills/cocos-game-ui-layout/SKILL.md',
  });
  assert.ok(!output.text.includes(generic));
  assert.ok(output.text.includes(native));
  assert.equal(output.publicExecutionRef, 'skills/app-creator-workflow/references/professional-execution.md');
});
