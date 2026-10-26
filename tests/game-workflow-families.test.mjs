/** 验证跨引擎音频与数值规则进入公共正文，并保留原生例外。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';
import { buildGameWorkflowFamilies } from '../scripts/migration/game-workflow-families.mjs';

const STACKS = Object.freeze({
  unity: { directory: 'unity-skills', prefix: '', audio: 'unity-game-audio', balance: 'unity-game-balance' },
  cocos: { directory: 'cocos-skills', prefix: 'skills/', audio: 'cocos-game-audio', balance: 'cocos-game-balance' },
  phaser: { directory: 'phaser-skills', prefix: 'skills/', audio: 'phaser4-game-audio', balance: 'phaser4-game-balance' },
  threejs: { directory: 'threejs-skills', prefix: 'skills/', audio: 'threejs-game-audio', balance: 'threejs-game-balance' },
});
const WEB_AUDIO = [
  '1. 按核心反馈、UI、环境、音乐和可访问性定义需求。',
  '2. 向美术接入角色提交音频资源登记包，包含来源、授权或生成记录、循环点、格式、时长、响度、用途和发布资格；由美术接入角色串行写入资源登记，避免共享文件并发写入。',
  '3. 设计静音、分组、首次交互播放、暂停恢复和后台切换；基础模块阶段必须实现下述后台暂停与恢复约束，在目标容器和浏览器验证。',
  '4. 依据运行时内存、解码与加载预算，以及渠道真实音频规格选择策略；标记未授权、不可循环、解码或加载峰值过高、或不符合渠道硬限制的资源。',
  '向玩法提供触发时机、分组和资源标识，向测试提供功能与预算项，向发布同步授权状态。',
  '- 在基础模块阶段建立统一音频服务与平台生命周期适配，覆盖浏览器页面隐藏/恢复和已采用原生宿主的后台/前台切换；进入后台立即暂停全部正在播放的音乐、音效和语音，后台期间禁止新音频开始播放，不延后到具体场景实现。',
  '- 暂停时保存播放位置及本次由后台切换暂停的实例集合；返回前台后，仅恢复仍有效且没有其他暂停原因的实例，从原位置继续播放，保留循环、音量和静音设置，不从头重播、不重复创建播放实例。原本已手动暂停、已停止、已销毁或所属场景已退出的实例不得自动恢复。',
  '- 页面可见性、原生生命周期和音频中断可能重复或交错通知，统一服务必须合并暂停原因，暂停/恢复保持幂等；只有后台及其他暂停原因全部解除才恢复。后台产生的新播放请求不排队补播，避免返回前台后集中播放过期反馈。',
  '- 浏览器或宿主限制自动恢复时保留待恢复状态，在允许的用户交互或音频恢复事件后继续；不得绕过播放限制，也不得将恢复失败标记为成功。监听器随服务销毁清理，异步恢复完成前再次进入后台时不得产生后台播放。',
];
const WEB_BALANCE = [
  '将体验目标转为可解释、可调整、可验证的模型，不以未记录的主观调参替代证据。',
  '1. 定义玩家节奏、成功率、资源来源与消耗、失败成本和保底机制。',
  '2. 在 balance.md 记录参数、单位、默认值、来源、影响、公式和验证方式；运行时集中读取配置。',
  '3. 为高风险曲线保留可复现计算与试玩记录；涉及合规或商业能力时同步发布合规角色。',
  '交给玩法的是参数表、边界行为和验收样例；交给测试的是关键场景与预期结果。',
];

/** 计算迁移清单的规则段落摘要。 */
function digest(text) { return createHash('sha256').update(text.trim().replace(/\r\n/g, '\n')).digest('hex'); }

/** 建立独立的四栈源夹具，模拟相关技能正文和本栈专属要求。 */
function createFixture(t) {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'game-workflows-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const sourceRoot = {};
  const texts = {};
  for (const [stack, config] of Object.entries(STACKS)) {
    const root = path.join(temporaryRoot, config.directory);
    sourceRoot[stack] = root;
    const prefix = config.prefix;
    texts[`${stack}:audio`] = stack === 'unity'
      ? `---\nname: ${config.audio}\n---\n\n# Unity 音频\n\n## 执行与交接\n\n1. 按核心反馈、UI、环境、音乐、语音和可访问性定义事件、优先级与静默降级行为。\n\n2. 在资源登记记录来源、授权/生成、格式、采样率、声道、时长、循环点、响度、压缩、加载方式、大小、用途和发布资格。\n\n3. 用 AudioMixer 规划 Master/Music/SFX/Voice/UI 分组、音量、Duck、并发限制和持久设置；避免每次播放产生不必要分配。\n\n4. 音频服务统一处理应用后台、窗口失焦和系统音频中断：用暂停原因集合合并系统、手动和玩法暂停，重复通知必须幂等；只有所有暂停原因都解除且播放实例此前仍应播放时，才从原播放位置恢复。Stop、销毁、场景卸载或用户主动停止会使旧播放请求失效，后续恢复不能复活它；后台期间的新播放请求直接丢弃，不排队补播。平台不支持精确定位的资源需在 TDD 记录可验证的恢复精度与降级行为。\n\n5. 验证首次播放、暂停恢复、窗口失焦、设备切换、静音、循环、场景切换、重复生命周期通知、停止/销毁后的恢复边界、后台新请求和资源缺失；在 Windows 候选环境检查实际输出。目标含 Android 时，在获准的设备验证中复核系统中断和前后台恢复。\n\n6. 向玩法提供事件/资源标识、触发时机与生命周期，向 QA 提供功能、响度和预算检查，向发布同步授权状态。\n`
      : `---\nname: ${config.audio}\n---\n\n# ${stack} 音频\n\n## 共同规则\n\n${WEB_AUDIO.map((line) => `${line}\n`).join('\n')}\n## 后台暂停与恢复约束\n\n${stack === 'cocos' ? 'Creator AssetDB UUID 导入由本栈处理。\n\n' : stack === 'phaser' ? 'Phaser.Scene 和 Scale 生命周期由本栈处理。\n\n' : 'Three.js renderer 与空间音频由本栈处理。\n\n'}${WEB_AUDIO.slice(5).map((line) => `${line}\n`).join('\n')}`;
    texts[`${stack}:balance`] = stack === 'unity'
      ? `---\nname: ${config.balance}\n---\n\n# Unity 数值\n\n把体验目标转为可解释、可调整、可验证的模型，不以未记录的主观调参替代证据。\n\n## 输入与决策\n\n读取 GDD、游戏配置与存档设计。\n\n## 执行与交接\n\n1. 定义玩家节奏、成功率、资源来源/消耗、失败成本、保底、上下限与异常行为。\n\n2. 在 balance.md 记录参数、单位、默认值、来源、公式、敏感度、影响和验证方式；运行时通过集中、可版本化配置读取。\n\n3. 为关键曲线保存可复现计算、模拟种子、样本规模与试玩记录；不要把表格结果当作游戏内验证。\n\n4. 向玩法提供配置、边界和验收样例，向 QA 提供统计口径、容差与高风险场景。\n\n5. 变更参数时标记受影响场景、存档、测试和性能结论，并触发必要复验。\n`
      : `---\nname: ${config.balance}\n---\n\n# ${stack} 数值\n\n## 全局控制接入\n\n${WEB_BALANCE.map((line) => `${line}\n`).join('\n')}\n## 本栈执行\n\n${stack === 'cocos' ? 'Creator AssetDB 中的数值资源需单独回读。' : stack === 'phaser' ? 'Phaser Scene 状态必须继续遵守领域规则。' : 'Three.js 世界空间摄像机不参与本数值流程。'}`;
    if (stack === 'unity') texts['unity:audio'] = texts['unity:audio'].replace(/## 执行与交接\s*/, '## 执行与交接\n\nAudioSource 到 AudioMixer 分组扫描交给 unity:audio-setup-mixers；Importer 优化交给 unity:optimize-audio。\n\n');
    for (const family of ['audio', 'balance']) {
      const skill = config[family];
      const sourcePath = `${prefix}${skill}/SKILL.md`;
      const absolute = path.join(root, ...sourcePath.split('/'));
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, texts[`${stack}:${family}`], 'utf8');
    }
  }
  return { sourceRoot, texts, repositoryRoot: path.join(temporaryRoot, 'target') };
}

/** 生成可由融合器消费的旧版三栈正文与源区间计划。 */
function createBasePlan(fixture) {
  const documents = [];
  const replacements = [];
  for (const [family, lines] of [['audio', WEB_AUDIO], ['balance', WEB_BALANCE]]) {
    const title = family === 'audio' ? '音频工作流' : '数值平衡';
    const heading = family === 'audio' ? '音频需求与资产交接' : '数值模型与参数交付';
    const commonPath = `skills/app-domain-toolkit/references/${family}.md`;
    const scope = '本规范只承接三栈内容一致且不依赖引擎接口的完整规则块；专业入口继续维护各自的资源路径、API、版本与运行时约束。';
    const doc = { path: commonPath, capabilityId: family, content: `# ${title} 通用工作流\n\n${scope}\n\n## ${heading}\n\n${lines.join('\n\n')}`, sources: [] };
    const digestByLine = new Map(lines.map((line) => [line, line.startsWith('1. ') ? line : line]));
    for (const [stack, config] of Object.entries(STACKS)) {
      if (stack === 'unity') continue;
      const sourcePath = `${config.prefix}${config[family]}/SKILL.md`;
      const text = fixture.texts[`${stack}:${family}`];
      const sections = [];
      for (const original of lines) {
        const start = text.indexOf(original);
        assert.notEqual(start, -1, `fixture 缺少旧公共源块：${stack}/${family}/${original}`);
        const sourceRange = { start, end: start + original.length };
        const section = { sourceHash: digest(original), canonicalHash: digest(digestByLine.get(original)), heading, sourceHeading: family === 'audio' ? '共同规则' : '全局控制接入', sourceRange, original, canonical: digestByLine.get(original) };
        sections.push(section);
        replacements.push({ stack, sourcePath, original, capabilityId: family, commonPath, heading, sourceHeading: section.sourceHeading, sourceRange, sourceHash: section.sourceHash, canonicalHash: section.canonicalHash, canonical: section.canonical });
      }
      doc.sources.push({ stack, sourcePath, sections });
    }
    if (family === 'audio') {
      for (let index = 5; index < lines.length; index += 1) {
        const original = WEB_AUDIO[index];
        const canonical = original;
        const sourceHeading = '后台暂停与恢复约束';
        for (const [stack, config] of Object.entries(STACKS)) if (stack !== 'unity') {
          const sourcePath = `${config.prefix}${config.audio}/SKILL.md`;
          const sourceText = fixture.texts[`${stack}:audio`];
          const start = sourceText.indexOf(original);
          const sourceRange = { start, end: start + original.length };
          const section = { sourceHash: digest(original), canonicalHash: digest(canonical), heading: '后台暂停与恢复约束', sourceHeading, sourceRange, original, canonical };
          doc.sources.find((entry) => entry.stack === stack).sections.push(section);
          replacements.push({ stack, sourcePath, original, capabilityId: family, commonPath, heading: '后台暂停与恢复约束', sourceHeading, sourceRange, sourceHash: section.sourceHash, canonicalHash: section.canonicalHash, canonical });
        }
      }
    }
    documents.push(doc);
  }
  return { documents, replacements };
}

/** 验证四栈正文归一、源区间摘要和原生职责边界。 */
test('音频和数值规范形成四栈共享正文与精确来源映射', (t) => {
  const fixture = createFixture(t);
  const plan = buildGameWorkflowFamilies({ ...fixture, basePlan: createBasePlan(fixture) });
  assert.deepEqual(plan.documents.map((document) => document.capabilityId), ['audio', 'balance']);
  for (const document of plan.documents) {
    assert.equal(new Set(document.sources.map((source) => source.stack)).size, 4);
    for (const source of document.sources) {
      const sourceText = fixture.texts[`${source.stack}:${document.capabilityId}`];
      for (const section of source.sections) {
        assert.equal(digest(sourceText.slice(section.sourceRange.start, section.sourceRange.end)), section.sourceHash);
        assert.equal(digest(section.canonical), section.canonicalHash);
        assert.ok(document.content.includes(section.canonical));
      }
    }
  }
  const audio = plan.documents.find((document) => document.capabilityId === 'audio').content;
  assert.match(audio, /语音与可访问性/);
  assert.match(audio, /系统音频中断/);
  assert.match(audio, /仅当桌面目标规定失焦会中断音频时/);
  assert.doesNotMatch(audio, /页面隐藏、应用后台、窗口失焦或系统音频中断时/);
  assert.match(audio, /获准的用户交互/);
  assert.match(audio, /恢复误差与降级行为/);
  const unityAudio = plan.documents.find((document) => document.capabilityId === 'audio').sources.find((source) => source.stack === 'unity');
  const lifecycleSource = fixture.texts['unity:audio'].match(/4\. 音频服务统一处理[^\n]*/)?.[0];
  assert.ok(lifecycleSource);
  const lifecycleMappings = unityAudio.sections.filter((section) => section.sourceHash === digest(lifecycleSource));
  assert.equal(lifecycleMappings.length, 4);
  assert.equal(new Set(lifecycleMappings.map((section) => section.canonicalHash)).size, 4);
  assert.equal(plan.replacements.filter((replacement) => replacement.stack === 'unity'
    && replacement.capabilityId === 'audio' && replacement.original.includes('4. 音频服务统一处理')).length, 1);
  const unityLifecycleReplacement = plan.replacements.find((replacement) => replacement.stack === 'unity'
    && replacement.capabilityId === 'audio' && replacement.original.includes('4. 音频服务统一处理'));
  assert.match(unityLifecycleReplacement.nativeSupplement, /Unity 工程必须将窗口失焦加入暂停原因/);
  assert.equal(plan.replacements.some((replacement) => replacement.stack !== 'unity' && replacement.nativeSupplement), false);
  const balance = plan.documents.find((document) => document.capabilityId === 'balance').content;
  for (const phrase of ['模拟种子、样本规模', '可版本化的配置', '存档、测试和性能结论']) assert.ok(balance.includes(phrase));
});

/** 验证应用后 Unity 混音/平台验收和 Web 引擎条款仍留在专业正文。 */
test('替换正文公共步骤时保留各栈原生段落', (t) => {
  const fixture = createFixture(t);
  const basePlan = createBasePlan(fixture);
  const plan = buildGameWorkflowFamilies({ ...fixture, basePlan });
  for (const [stack, config] of Object.entries(STACKS)) {
    for (const family of ['audio', 'balance']) {
      const sourcePath = `${config.prefix}${config[family]}/SKILL.md`;
      const transformed = applySharedWorkflowSections(fixture.texts[`${stack}:${family}`], {
        stack, sourcePath, destination: `skills/${config[family]}/SKILL.md`, repositoryRoot: fixture.repositoryRoot, plan,
      });
      assert.ok(transformed.sharedReferences.some((reference) => reference.includes(`/references/${family}.md#`)));
      if (stack === 'unity' && family === 'audio') {
        assert.match(transformed.text, /AudioMixer.*Master\/Music\/SFX\/Voice\/UI.*Duck/);
        assert.match(transformed.text, /Windows 候选环境/);
        assert.match(transformed.text, /unity:optimize-audio/);
      }
      if (stack !== 'unity' && family === 'audio') assert.match(transformed.text, /\bCreator AssetDB\b|\bPhaser\.Scene\b|\bThree\.js renderer\b/);
      if (stack === 'unity' && family === 'balance') assert.match(transformed.text, /存档设计/);
      if (stack !== 'unity' && family === 'balance') assert.match(transformed.text, /AssetDB|Phaser Scene|Three\.js 世界空间摄像机/);
    }
  }
});

/** 源规则删掉关键验收字段时拒绝生成不完整的共享计划。 */
test('Unity 数值源缺少模拟证据后拒绝静默迁移', (t) => {
  const fixture = createFixture(t);
  const config = STACKS.unity;
  const sourcePath = `${config.balance}/SKILL.md`;
  const file = path.join(fixture.sourceRoot.unity, sourcePath);
  const original = fixture.texts['unity:balance'];
  fixture.texts['unity:balance'] = original.replace('模拟种子', '随机种子');
  writeFileSync(file, fixture.texts['unity:balance'], 'utf8');
  assert.throws(() => buildGameWorkflowFamilies({ ...fixture, basePlan: createBasePlan(fixture) }), /缺少 模拟种子/);
});

/** 没有 Unity 源时让源盲的旧迁移夹具继续只用原三栈计划。 */
test('缺少 Unity 源时不伪造跨栈扩展', (t) => {
  const fixture = createFixture(t);
  const roots = { ...fixture.sourceRoot };
  delete roots.unity;
  const unityRoot = path.join(fixture.repositoryRoot, 'absent-unity-source');
  assert.equal(existsSync(unityRoot), false);
  const plan = buildGameWorkflowFamilies({ sourceRoot: roots, repositoryRoot: fixture.repositoryRoot, basePlan: createBasePlan(fixture) });
  assert.deepEqual(plan, { documents: [], replacements: [] });
});
