/** 生图输入的客观准备与覆盖校验；不调用工具、不登记发送或视觉验收。 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 明显占位内容不能作为制作输入。 */
function meaningful(value) {
  return typeof value === 'string' && Boolean(value.trim()) && !/^(?:todo|tbd|待填写.*|replace(?:[-_ ].*)?|<[^>]+>|\.\.\.)$/i.test(value.trim());
}

/** 普通对象与数组分开校验，避免将任意 JSON 当作制作输入。 */
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

/** 构建可直接发送的提示词，并返回仅涉及输入事实的结构问题。 */
export function prepareGenerationPrompt(inputs) {
  const issues = [];
  const lines = [];
  if (!object(inputs)) return { prompt: '', issues: ['generationInputs 必须是对象'] };
  const artifact = inputs.artifact;
  if (!object(artifact) || !meaningful(artifact.kind) || !meaningful(artifact.purpose)) issues.push('artifact 必须包含有效 kind 和 purpose');
  else lines.push(`产物：${artifact.kind}；用途：${artifact.purpose}`);
  if (!['explore', 'edit', 'reproduce'].includes(inputs.mode)) issues.push('mode 必须为 explore、edit 或 reproduce');
  if (!Array.isArray(inputs.sections) || inputs.sections.length === 0) issues.push('sections 至少包含一项实际制作内容');
  const sectionIds = new Set();
  for (const [index, section] of (Array.isArray(inputs.sections) ? inputs.sections : []).entries()) {
    if (!object(section) || !meaningful(section.id) || !meaningful(section.text) || !['fact', 'decision'].includes(section.origin)) {
      issues.push(`sections[${index}] 需要有效 id、text 和 fact/decision 来源`);
      continue;
    }
    const sectionId = section.id.trim();
    if (sectionIds.has(sectionId)) issues.push(`sections 存在重复 id：${sectionId}`);
    sectionIds.add(sectionId);
    // 依据与内部身份只供追溯；只有可见表现进入发送文本。
    lines.push(section.text.trim());
  }
  const references = inputs.references ?? [];
  if (!Array.isArray(references)) issues.push('references 必须是数组');
  const referenceIds = new Set();
  for (const [index, ref] of (Array.isArray(references) ? references : []).entries()) {
    if (!object(ref) || !meaningful(ref.id) || !meaningful(ref.role) || !meaningful(ref.purpose) || !meaningful(ref.ref)) {
      issues.push(`references[${index}] 需要有效 id、role、purpose 和来源标识 ref`);
      continue;
    }
    const referenceId = ref.id.trim();
    if (referenceIds.has(referenceId)) issues.push(`references 存在重复 id：${referenceId}`);
    referenceIds.add(referenceId);
    // 编号对应本次工具附件顺序，内部引用身份和路径不进入画面提示。
    lines.push(`参考图${index + 1}（${ref.role.trim()}）：${ref.purpose.trim()}`);
  }
  /** 列表只投影可见约束；空数组不凭空制造禁令。 */
  function appendList(key, label) {
    if (inputs[key] === undefined) return [];
    if (!Array.isArray(inputs[key])) { issues.push(`${key} 必须是数组`); return []; }
    const values = inputs[key].filter((value, index) => {
      if (meaningful(value)) return true;
      issues.push(`${key}[${index}] 不能为空或占位`);
      return false;
    }).map((value) => value.trim());
    for (const value of values) lines.push(`${label}：${value}`);
    return values;
  }
  const requiredVisibleText = appendList('requiredVisibleText', '准确文字');
  const preserve = appendList('preserve', '保持');
  const allowedChanges = appendList('allowedChanges', '允许变化');
  const avoid = appendList('avoid', '避免');
  if (['edit', 'reproduce'].includes(inputs.mode)) {
    if (!Array.isArray(references) || !references.some((ref) => object(ref) && ref.role === 'source-target' && meaningful(ref.ref) && meaningful(ref.purpose))) issues.push('编辑或还原必须声明实际 source-target 参考及其作用');
    if (preserve.length === 0) issues.push('编辑或还原必须声明保持边界');
    if (inputs.mode === 'edit' && allowedChanges.length === 0) issues.push('编辑必须声明允许变化的边界');
  }
  for (const value of preserve) if (avoid.includes(value) || allowedChanges.includes(value)) issues.push(`同一内容存在相反边界：${value}`);
  // 仅拦截逐字相同的明确冲突，不推断语义接近的文案。
  for (const value of requiredVisibleText) if (avoid.includes(value)) issues.push(`准确文字与避免项冲突：${value}`);
  if (inputs.output !== undefined) {
    if (!object(inputs.output)) issues.push('output 必须是对象');
    else {
      const output = inputs.output;
      if (output.format !== undefined) {
        if (!meaningful(output.format)) issues.push('output.format 不能为空或占位');
        else lines.push(`输出格式：${output.format.trim()}`);
      }
      if (output.transparentBackground !== undefined) {
        if (typeof output.transparentBackground !== 'boolean') issues.push('output.transparentBackground 必须是布尔值');
        else lines.push(output.transparentBackground ? '输出背景：透明' : '输出背景：不透明');
      }
      if (output.transparentBackground === true && /^(?:image\/)?jpe?g$/i.test(typeof output.format === 'string' ? output.format.trim() : '')) issues.push('JPEG 不支持透明背景');
      for (const key of ['width', 'height']) if (output[key] !== undefined && (!Number.isSafeInteger(output[key]) || output[key] <= 0)) issues.push(`output.${key} 必须是安全范围内的正整数`);
      if (Number.isSafeInteger(output.width) && output.width > 0) lines.push(`输出宽度：${output.width}`);
      if (Number.isSafeInteger(output.height) && output.height > 0) lines.push(`输出高度：${output.height}`);
      if (output.aspectRatio !== undefined) {
        if (!meaningful(output.aspectRatio) || !/^[1-9]\d*\s*:\s*[1-9]\d*$/.test(output.aspectRatio)) issues.push('output.aspectRatio 必须是正数比例，例如 4:3');
        else {
          lines.push(`输出比例：${output.aspectRatio.trim()}`);
          // 同时指定尺寸和比例时，明确相反的输出要求不能交给生成工具猜测。
          const [ratioWidth, ratioHeight] = output.aspectRatio.split(':').map((part) => BigInt(part.trim()));
          if (Number.isSafeInteger(output.width) && output.width > 0 && Number.isSafeInteger(output.height) && output.height > 0 && BigInt(output.width) * ratioHeight !== BigInt(output.height) * ratioWidth) issues.push('output 尺寸与比例相互矛盾');
        }
      }
    }
  }
  return { prompt: lines.join('\n'), issues: [...new Set(issues)] };
}

/** 转义输出值，只用明确数字和单位核对已记录的提示词。 */
function regexText(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** 仅识别明确逐项编号且用途交叉对调的冲突，不要求自然语序补标签。 */
function explicitReferenceSwaps(inputs, actualPrompt) {
  const references = Array.isArray(inputs?.references) ? inputs.references : [];
  if (references.length < 2) return [];
  const markers = [...actualPrompt.matchAll(/(?:参考图|reference\s+image)\s*(\d+)(?!\d)[ \t]*(?:[（(][^）)\r\n]*[）)])?[ \t]*[:：]?/gi)];
  const segments = markers.map((marker, index) => ({
    index: Number(marker[1]) - 1,
    // 限定编号之后的同一局部项，避免把后续普通说明误当作对应用途。
    text: actualPrompt.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? actualPrompt.length).split(/[\r\n；;]/, 1)[0],
  }));
  const issues = [];
  for (const segment of segments) {
    const own = references[segment.index]?.purpose;
    if (!meaningful(own) || segment.text.includes(own.trim())) continue;
    for (const other of segments) {
      const foreign = references[other.index]?.purpose;
      if (other === segment || !meaningful(foreign)) continue;
      const ownText = own.trim(); const foreignText = foreign.trim();
      // 用途包含关系或仅在一处出现不能证明对调，交由真实调用记录核对。
      if (ownText.includes(foreignText) || foreignText.includes(ownText)) continue;
      if (segment.text.includes(foreignText) && other.text.includes(ownText) && !other.text.includes(foreignText)) {
        issues.push(`实际发送提示词参考图${segment.index + 1}与参考图${other.index + 1}的用途对调`);
        break;
      }
    }
  }
  return issues;
}

/** 比对已记录的实际发送原文；准备器的包装标签不是发送合同。 */
export function validateGenerationPromptProjection(inputs, actualPrompt) {
  const prepared = prepareGenerationPrompt(inputs);
  const issues = [...prepared.issues];
  if (!meaningful(actualPrompt)) return [...new Set([...issues, '实际发送的完整提示词为空或占位'])];
  /** 只检查声明的原子内容，不能把提示词格式差异当作信息缺失。 */
  function requireText(value, label) {
    if (meaningful(value) && !actualPrompt.includes(value.trim())) issues.push(`实际发送提示词遗漏制作内容：${label} ${value.trim()}`);
  }
  requireText(inputs?.artifact?.kind, '产物');
  requireText(inputs?.artifact?.purpose, '用途');
  for (const section of Array.isArray(inputs?.sections) ? inputs.sections : []) requireText(section?.text, '内容');
  for (const ref of Array.isArray(inputs?.references) ? inputs.references : []) requireText(ref?.purpose, '参考作用');
  issues.push(...explicitReferenceSwaps(inputs, actualPrompt));
  for (const key of ['requiredVisibleText', 'preserve', 'allowedChanges', 'avoid']) for (const value of Array.isArray(inputs?.[key]) ? inputs[key] : []) requireText(value, key);
  const output = object(inputs?.output) ? inputs.output : {};
  if (meaningful(output.format)) {
    const format = output.format.trim().replace(/^image\//i, '');
    if (!new RegExp(`(?:^|[^a-z])${regexText(format)}(?:$|[^a-z])`, 'i').test(actualPrompt)) issues.push(`实际发送提示词遗漏制作内容：输出格式 ${format}`);
  }
  if (typeof output.transparentBackground === 'boolean') {
    // 不允许“透明背景”被“不透明背景”误判，同时接受常用自然语序。
    const transparent = /(?<![不非])透明\s*(?:背景|底色|底)|(?:背景|底色)\s*(?:为|是|[:：])?\s*透明|(?<!non-)(?<!not\s)transparent\s+background|background\s*(?:is|:)?\s*transparent/i;
    const opaque = /不透明\s*(?:背景|底色|底)|(?:背景|底色)\s*(?:为|是|[:：])?\s*不透明|opaque\s+background|background\s*(?:is|:)?\s*opaque/i;
    if (!(output.transparentBackground ? transparent : opaque).test(actualPrompt)) issues.push(`实际发送提示词遗漏制作内容：${output.transparentBackground ? '透明背景' : '不透明背景'}`);
  }
  const { width, height } = output;
  const hasWidth = Number.isSafeInteger(width) && width > 0;
  const hasHeight = Number.isSafeInteger(height) && height > 0;
  // 尺寸按宽×高配对，不能仅因两个数字均出现便放过宽高写反。
  const dimensions = hasWidth && hasHeight && new RegExp(`(?<!\\d)${width}\\s*[xX×]\\s*${height}(?!\\d)`).test(actualPrompt);
  let dimensionsCovered = Boolean(dimensions);
  let missingDimension = false;
  for (const [key, value, word] of [['width', width, '宽'], ['height', height, '高']]) {
    if (!Number.isSafeInteger(value) || value <= 0) continue;
    const english = key === 'width' ? 'wide' : 'high';
    const pattern = new RegExp(`${word}(?:度)?\\s*(?:为|是|[:：])?\\s*${value}(?!\\d)|(?<!\\d)${value}\\s*(?:px|像素)?\\s*${word}|\\b${key}\\b\\s*(?:is|[:：=])?\\s*${value}(?!\\d)|(?<!\\d)${value}\\s*(?:px|pixels?)?\\s*${english}\\b`, 'i');
    if (!dimensions && !pattern.test(actualPrompt)) { issues.push(`实际发送提示词遗漏制作内容：${key} ${value}`); missingDimension = true; }
  }
  if (hasWidth && hasHeight && !missingDimension) dimensionsCovered = true;
  if (meaningful(output.aspectRatio) && /^[1-9]\d*\s*:\s*[1-9]\d*$/.test(output.aspectRatio)) {
    const [w, h] = output.aspectRatio.split(':').map((part) => part.trim());
    if (!dimensionsCovered && !new RegExp(`(?<!\\d)${w}\\s*[:：]\\s*${h}(?!\\d)`).test(actualPrompt)) issues.push(`实际发送提示词遗漏制作内容：输出比例 ${w}:${h}`);
  }
  return [...new Set(issues)];
}

/** 从既有任务或来源 JSON 准备文本；只向标准输出返回结果，不写入记录。 */
function main(args) {
  if (args.length !== 2 || args[0] !== '--task') throw new Error('用法：node generation-prompt.mjs --task <已有任务或来源 JSON>');
  const record = JSON.parse(readFileSync(resolve(args[1]), 'utf8'));
  const result = prepareGenerationPrompt(record.generationInputs);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.issues.length) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
