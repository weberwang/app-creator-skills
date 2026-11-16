import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareGenerationPrompt, validateGenerationPromptProjection } from '../skills/app-domain-toolkit/scripts/visual/generation-prompt.mjs';
import { GLOBAL_VISUAL_CONSISTENCY_PROMPT, validateGlobalVisualGenerationRecord } from '../skills/app-domain-toolkit/scripts/visual/global-visual-consistency-contract.mjs';
import { readAppVisualSource } from '../skills/app-workflow-control/scripts/runtime/app-visual-source.mjs';
import { syntheticDesignPng } from './control/visual-image-fixture.mjs';
import { installSkills, STACKS } from '../packages/installer/install-project-skills.mjs';

/** 构建具有真实任务、视觉决定与可追溯依据的代表性输入。 */
function sample() {
  return {
    artifact: { kind: 'App 页面效果图', purpose: '帮助用户辨认当前任务' }, mode: 'explore',
    sections: [
      { id: 'context', origin: 'fact', text: '使用者需要快速识别待处理内容。', basis: 'private-product-path.json' },
      { id: 'hierarchy', origin: 'decision', text: '突出当前任务，次要信息通过字阶和分组区分。', basis: '任务优先级' },
    ],
    requiredVisibleText: ['准备材料'],
    references: [{ id: 'logo-ref', role: '身份', purpose: '保留品牌图标身份', ref: 'private/ref.png' }],
    preserve: ['品牌图标身份'], allowedChanges: ['页面布局'], avoid: ['虚构数据'],
    output: { format: 'PNG', transparentBackground: false },
  };
}

/** 写入合成引用并记录摘要，不代表实际生成或人工确认。 */
function writeRef(repo, path, content) {
  const data = Buffer.isBuffer(content) ? content : Buffer.from(JSON.stringify(content));
  writeFileSync(join(repo, path), data);
  return { path, sha256: createHash('sha256').update(data).digest('hex') };
}

test('投影保留实际内容与参考作用，内部来源不进入画面，不伪称已发送', () => {
  const result = prepareGenerationPrompt(sample());
  assert.deepEqual(result.issues, []);
  for (const fragment of ['待处理内容', '字阶和分组', '准确文字：准备材料', '参考图1（身份）：保留品牌图标身份', '输出格式：PNG']) assert.ok(result.prompt.includes(fragment));
  for (const hidden of ['private-product-path', 'private/ref.png', 'logo-ref']) assert.equal(result.prompt.includes(hidden), false);
  assert.deepEqual(Object.keys(result).sort(), ['issues', 'prompt']);
  assert.deepEqual(validateGenerationPromptProjection(sample(), result.prompt), []);
  assert.ok(validateGenerationPromptProjection(sample(), result.prompt.replace('准备材料', '其他内容')).some((issue) => issue.includes('准备材料')));
  assert.ok(validateGenerationPromptProjection(sample(), result.prompt.replace('保留品牌图标身份', '沿用参考')).some((issue) => issue.includes('参考作用')));
});

test('自然语序覆盖明确内容和输出即可，宽高写反或漏文字仍失败', () => {
  const value = {
    artifact: { kind: '图标', purpose: '背包医疗包' }, mode: 'explore',
    sections: [{ id: 'shape', origin: 'decision', text: '厚纸剪影，中央十字清晰。' }],
    requiredVisibleText: ['USE'], output: { format: 'PNG', transparentBackground: true, width: 640, height: 480, aspectRatio: '4:3' },
  };
  const natural = '为背包医疗包制作图标。厚纸剪影，中央十字清晰。保留文字USE。PNG格式，透明背景，尺寸640×480。';
  assert.deepEqual(validateGenerationPromptProjection(value, natural), []);
  assert.deepEqual(validateGenerationPromptProjection(value, natural.replace('640×480', '宽640像素、高480像素').replace('透明背景', 'transparent background')), []);
  assert.deepEqual(validateGenerationPromptProjection(value, natural.replace('640×480', 'width: 640, height: 480')), []);
  assert.deepEqual(validateGenerationPromptProjection(value, natural.replace('640×480', '640 pixels wide, 480 pixels high')), []);
  assert.ok(validateGenerationPromptProjection(value, natural.replace('640×480', '480×640')).some((issue) => issue.includes('width')));
  assert.ok(validateGenerationPromptProjection(value, natural.replace('640×480', 'width: 480, height: 640')).some((issue) => issue.includes('width')));
  assert.ok(validateGenerationPromptProjection(value, natural.replace('USE', 'OK')).some((issue) => issue.includes('USE')));
  assert.ok(validateGenerationPromptProjection(value, natural.replace('透明背景', '不透明背景')).some((issue) => issue.includes('透明背景')));
  assert.ok(validateGenerationPromptProjection(value, natural.replace('透明背景', 'non-transparent background')).some((issue) => issue.includes('透明背景')));
});

test('参考附件交换顺序时编号与用途同步，内部身份和路径不泄露', () => {
  const value = sample();
  value.mode = 'edit';
  value.references = [
    { id: 'internal-original-id', role: 'source-target', purpose: '保留原图人物身份', ref: 'private/original.png' },
    { id: 'internal-style-id', role: 'style', purpose: '借鉴纸艺材质', ref: 'private/style.png' },
  ];
  const first = prepareGenerationPrompt(value);
  assert.deepEqual(first.issues, []);
  assert.ok(first.prompt.includes('参考图1（source-target）：保留原图人物身份'));
  assert.ok(first.prompt.includes('参考图2（style）：借鉴纸艺材质'));
  value.references.reverse();
  const reversed = prepareGenerationPrompt(value);
  assert.deepEqual(reversed.issues, []);
  assert.ok(reversed.prompt.includes('参考图1（style）：借鉴纸艺材质'));
  assert.ok(reversed.prompt.includes('参考图2（source-target）：保留原图人物身份'));
  assert.deepEqual(validateGenerationPromptProjection(value, reversed.prompt), []);
  for (const prompt of [first.prompt, reversed.prompt]) for (const hidden of ['internal-original-id', 'internal-style-id', 'private/original.png', 'private/style.png']) assert.equal(prompt.includes(hidden), false);
});

test('拒绝占位、重复身份、互斥边界以及不可能的输出', () => {
  const value = sample();
  value.sections.push({ ...value.sections[0] }, { id: 'bad', origin: 'fact', text: '待填写' });
  value.references.push({ ...value.references[0] });
  value.avoid.push('品牌图标身份');
  value.output = { format: 'JPEG', transparentBackground: true, width: 0, height: -2 };
  const issues = prepareGenerationPrompt(value).issues.join('\n');
  for (const fragment of ['sections 存在重复 id', 'references 存在重复 id', 'sections[3]', '相反边界', 'JPEG', 'width', 'height']) assert.ok(issues.includes(fragment), fragment);
  value.output = { format: 'image/jpeg', transparentBackground: true, width: 100, height: 100, aspectRatio: '4:3' };
  const outputIssues = prepareGenerationPrompt(value).issues.join('\n');
  assert.match(outputIssues, /JPEG/);
  assert.match(outputIssues, /尺寸与比例相互矛盾/);
  value.output = { format: { trim: 1 }, transparentBackground: true };
  assert.ok(prepareGenerationPrompt(value).issues.some((issue) => issue.includes('output.format')));
});

test('准确文字与避免项逐字冲突时拒绝，近似文案不作语义推断', () => {
  const value = sample();
  value.requiredVisibleText = ['Retry'];
  value.avoid = ['Retry'];
  assert.ok(prepareGenerationPrompt(value).issues.some((issue) => issue.includes('准确文字与避免项冲突：Retry')));
  value.avoid = ['Retry later'];
  assert.deepEqual(prepareGenerationPrompt(value).issues, []);
});

test('编辑和还原有真实来源及保持边界，编辑还需要允许变化', () => {
  const value = sample(); value.mode = 'edit'; value.preserve = []; value.allowedChanges = [];
  let issues = prepareGenerationPrompt(value).issues.join('\n');
  for (const fragment of ['source-target', '保持边界', '允许变化']) assert.ok(issues.includes(fragment));
  value.references.push({ id: 'original', role: 'source-target', purpose: '编辑该原图', ref: '原图附件' });
  value.preserve = ['角色身份']; value.allowedChanges = ['衣服材质'];
  assert.deepEqual(prepareGenerationPrompt(value).issues, []);
  value.mode = 'reproduce'; value.allowedChanges = [];
  issues = prepareGenerationPrompt(value).issues.join('\n');
  assert.equal(issues, '');
});

test('CLI 读取现有任务并只输出准备结果', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'prompt-cli-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const path = join(repo, 'task.json');
  const initial = JSON.stringify({ generationInputs: sample(), prompt: '' });
  writeFileSync(path, initial);
  const result = spawnSync(process.execPath, ['skills/app-domain-toolkit/scripts/visual/generation-prompt.mjs', '--task', path], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).prompt, /准备材料/);
  assert.equal(readFileSync(path, 'utf8'), initial);
  const conflict = sample();
  conflict.output = { format: 'JPEG', transparentBackground: true };
  const conflictTask = JSON.stringify({ generationInputs: conflict, prompt: '' });
  writeFileSync(path, conflictTask);
  const rejected = spawnSync(process.execPath, ['skills/app-domain-toolkit/scripts/visual/generation-prompt.mjs', '--task', path], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(rejected.status, 0);
  assert.ok(JSON.parse(rejected.stdout).issues.some((issue) => issue.includes('JPEG')));
  assert.equal(readFileSync(path, 'utf8'), conflictTask);
});

test('各栈安装计划包含制作输入依赖，Node.js 最小安装可独立加载控制器及准备提示词', (t) => {
  const temporaryRoot = realpathSync(tmpdir());
  const repo = mkdtempSync(join(temporaryRoot, 'installed-prompt-'));
  t.after(() => {
    const actual = realpathSync(repo);
    assert.equal(dirname(actual), temporaryRoot);
    assert.ok(basename(actual).startsWith('installed-prompt-'));
    rmSync(actual, { recursive: true, force: true });
  });
  for (const stack of STACKS) {
    const plan = installSkills({ projectRoot: repo, stacks: [stack], dryRun: true });
    assert.ok(plan.entries.some((entry) => entry.name === 'app-domain-toolkit'), `${stack} 缺少共享制作资源`);
  }
  installSkills({ projectRoot: repo, stacks: ['nodejs'] });
  const skills = join(repo, '.agents', 'skills');
  const task = join(repo, 'task.json');
  writeFileSync(task, JSON.stringify({ generationInputs: sample() }));
  // 独立进程只从安装副本和临时项目读取，防止源仓库掩盖相对引用缺失。
  const cli = join(skills, 'app-domain-toolkit', 'scripts', 'visual', 'generation-prompt.mjs');
  const prepared = spawnSync(process.execPath, [cli, '--task', task], { cwd: repo, encoding: 'utf8', windowsHide: true });
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.deepEqual(JSON.parse(prepared.stdout), prepareGenerationPrompt(sample()));
  const controller = join(skills, 'app-workflow-control', 'scripts', 'workflow-control.mjs');
  const script = "import { pathToFileURL } from 'node:url'; const controller = await import(pathToFileURL(process.argv[2]).href); if (typeof controller.main !== 'function') process.exit(1);";
  const loaded = spawnSync(process.execPath, ['--input-type=module', '-e', script, 'installed-import', controller], { cwd: repo, encoding: 'utf8', windowsHide: true });
  assert.equal(loaded.status, 0, loaded.stderr);
});

test('App 实际来源校验已声明的制作片段，未声明时不增加生成门槛', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'prompt-app-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const input = sample();
  const imageRef = writeRef(repo, 'image.png', syntheticDesignPng('local', 2, 2));
  const briefRef = writeRef(repo, 'brief.json', { purpose: '仅测试来源合同' });
  const source = { schemaVersion: '1.0', projectId: 'project', stack: 'flutter', candidateId: 'first', version: 'v1', origin: 'generated', imageRef, briefRef,
    generationMethod: 'imagegen', generator: 'test-generator', generatorVersion: 'test-version', prompt: prepareGenerationPrompt(input).prompt, generationInputs: input };
  const file = (base, ref) => {
    const bytes = readFileSync(join(base, ref.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.sha256);
    return ref.path;
  };
  const read = (value) => readAppVisualSource(repo, writeRef(repo, 'source.json', value), { projectId: 'project', stack: 'flutter' }, { file, validateBrief() {} });
  assert.doesNotThrow(() => read(source));
  source.prompt = '为帮助用户辨认当前任务生成App 页面效果图。使用者需要快速识别待处理内容。突出当前任务，次要信息通过字阶和分组区分。保留品牌图标身份，文字“准备材料”，允许探索页面布局，避免虚构数据。PNG格式，不透明背景。';
  assert.doesNotThrow(() => read(source));
  source.prompt = source.prompt.replace('突出当前任务', '展示内容');
  assert.throws(() => read(source), /遗漏制作内容/);
  const twoReferences = structuredClone(input);
  twoReferences.mode = 'edit';
  twoReferences.references = [
    { id: 'original', role: 'source-target', purpose: '忠实保留布局', ref: 'original.png' },
    { id: 'style', role: 'style', purpose: '采用纸张材质', ref: 'style.png' },
  ];
  source.generationInputs = twoReferences;
  const correct = prepareGenerationPrompt(twoReferences).prompt;
  source.prompt = correct;
  assert.doesNotThrow(() => read(source));
  source.prompt = correct.replace('参考图1（source-target）：忠实保留布局', '参考图1（source-target）：采用纸张材质')
    .replace('参考图2（style）：采用纸张材质', '参考图2（style）：忠实保留布局');
  assert.throws(() => read(source), /用途对调/);
  source.prompt = source.prompt.replace('参考图1（source-target）：', '参考图1用于')
    .replace('参考图2（style）：', '参考图2用于');
  assert.throws(() => read(source), /用途对调/);
  // 无编号的自然表述不强制补充标签，实际附件关系仍需真实调用记录确认。
  source.prompt = correct.replace(/参考图\d+（[^）]+）：/g, '');
  assert.doesNotThrow(() => read(source));
  // 编号存在但附近只有笼统图名时，不能凭位置猜测已经对调。
  source.prompt = correct.replace('参考图1（source-target）：忠实保留布局', '忠实保留布局。参考图1：原图')
    .replace('参考图2（style）：采用纸张材质', '采用纸张材质。参考图2：风格图');
  assert.doesNotThrow(() => read(source));
  delete source.generationInputs;
  assert.doesNotThrow(() => read(source));
});

test('游戏生成记录同时校验实际投影与现有不可变全局约束', () => {
  const input = sample();
  input.artifact = { kind: '游戏场景', purpose: '表现当前交互位置' };
  input.references = [{ id: 'style', role: 'style', purpose: '沿用锚点材质', ref: 'anchor.png' }];
  const baseline = { id: 'baseline', version: 'v1', document: 'docs/visual-baseline.md', status: 'global-static-baseline-frozen', anchor_evidence: ['anchor.png'] };
  const record = { origin: 'generated', visual_baseline_id: baseline.id, visual_baseline_version: baseline.version, baseline_document: baseline.document,
    style_reference_inputs: ['anchor.png'], global_visual_consistency_prompt: GLOBAL_VISUAL_CONSISTENCY_PROMPT, style_drift_policy: 'forbid',
    full_prompt: `${prepareGenerationPrompt(input).prompt}\n${GLOBAL_VISUAL_CONSISTENCY_PROMPT}`, prompt_sent: true, consistency_status: 'passed', consistency_evidence: 'evidence.png', generationInputs: input };
  assert.deepEqual(validateGlobalVisualGenerationRecord(record, { baseline }), []);
  record.full_prompt = record.full_prompt.replace('准确文字：准备材料', '准确文字：其他');
  assert.ok(validateGlobalVisualGenerationRecord(record, { baseline }).some((issue) => issue.includes('准备材料')));
  delete record.generationInputs;
  assert.deepEqual(validateGlobalVisualGenerationRecord(record, { baseline }), []);
});

test('游戏真实消费者分别核对原图与风格组的身份和组内顺序', () => {
  const input = sample();
  input.mode = 'edit';
  input.references = [
    { id: 'original', role: 'source-target', purpose: '保留原图角色', ref: 'target.png' },
    { id: 'detail', role: 'source-detail', purpose: '参考局部细节', ref: 'detail.png' },
    { id: 'style-a', role: 'style', purpose: '使用材质语言', ref: 'style-a.png' },
    { id: 'style-b', role: 'style', purpose: '保留图形语言', ref: 'style-b.png' },
  ];
  const baseline = { id: 'baseline', version: 'v1', document: 'docs/visual-baseline.md', status: 'global-static-baseline-frozen', anchor_evidence: ['style-a.png', 'style-b.png'] };
  const record = { origin: 'generated', visual_baseline_id: baseline.id, visual_baseline_version: baseline.version, baseline_document: baseline.document,
    reference_inputs: [{ original_file: 'target.png' }, 'detail.png'], actual_reference_inputs: ['target.png', 'detail.png'],
    style_reference_inputs: ['style-a.png', 'style-b.png'], actual_style_reference_inputs: ['style-a.png', 'style-b.png'],
    global_visual_consistency_prompt: GLOBAL_VISUAL_CONSISTENCY_PROMPT, style_drift_policy: 'forbid',
    full_prompt: `${prepareGenerationPrompt(input).prompt}\n${GLOBAL_VISUAL_CONSISTENCY_PROMPT}`, prompt_sent: true, consistency_status: 'passed', consistency_evidence: 'evidence.png', generationInputs: input };
  const check = (value) => validateGlobalVisualGenerationRecord(value, { baseline });
  assert.deepEqual(check(record), []);
  const swapped = structuredClone(record);
  swapped.full_prompt = record.full_prompt.replace('参考图1（source-target）：保留原图角色', '参考图1（source-target）：使用材质语言')
    .replace('参考图3（style）：使用材质语言', '参考图3（style）：保留原图角色');
  assert.ok(check(swapped).some((issue) => issue.includes('用途对调')));
  for (const [index, wrong] of [[0, 'other-target.png'], [2, 'other-style.png']]) {
    const changed = structuredClone(record); changed.generationInputs.references[index].ref = wrong;
    assert.ok(check(changed).some((issue) => issue.includes('参考')));
  }
  for (const pair of [[0, 1], [2, 3]]) {
    const changed = structuredClone(record); const refs = changed.generationInputs.references;
    [refs[pair[0]], refs[pair[1]]] = [refs[pair[1]], refs[pair[0]]];
    // 重写合成提示词使失败只来自真实附件组内顺序，而非文本覆盖。
    changed.full_prompt = `${prepareGenerationPrompt(changed.generationInputs).prompt}\n${GLOBAL_VISUAL_CONSISTENCY_PROMPT}`;
    assert.ok(check(changed).some((issue) => issue.includes('组内顺序')));
  }
  const inconsistent = structuredClone(record); inconsistent.actual_reference_inputs.reverse();
  assert.ok(check(inconsistent).some((issue) => issue.includes('actual_reference_inputs')));
  const shared = structuredClone(record);
  shared.reference_inputs = ['style-a.png']; shared.actual_reference_inputs = ['style-a.png'];
  shared.style_reference_inputs = ['style-a.png']; shared.actual_style_reference_inputs = ['style-a.png'];
  shared.generationInputs.references = [{ id: 'shared', role: 'source-target', purpose: '保持参考图身份', ref: 'style-a.png' }];
  shared.full_prompt = `${prepareGenerationPrompt(shared.generationInputs).prompt}\n${GLOBAL_VISUAL_CONSISTENCY_PROMPT}`;
  const sharedBaseline = { ...baseline, anchor_evidence: ['style-a.png'] };
  assert.deepEqual(validateGlobalVisualGenerationRecord(shared, { baseline: sharedBaseline }), []);
  const withoutMetadata = structuredClone(record); delete withoutMetadata.generationInputs;
  assert.deepEqual(check(withoutMetadata), []);
});
