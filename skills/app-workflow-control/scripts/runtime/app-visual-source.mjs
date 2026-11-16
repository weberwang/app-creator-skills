import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { readJson, repoPath, WorkflowError } from './io.mjs';
import { validateGenerationPromptProjection } from '../../../app-domain-toolkit/scripts/visual/generation-prompt.mjs';

const decodedImages = new Set();
let validateSource;

/** 模板占位不能充当真实生成事实；未提供版本的明确记法可保留。 */
function actualText(value) {
  return typeof value === 'string' && Boolean(value.trim()) && !/^(?:todo|tbd|replace(?:[-_ ].*)?|待填写.*|<[^>]+>)$/i.test(value.trim());
}

/** 检查实际图片可完整解码；这只确认文件与尺寸，不判断图片内容或视觉质量。 */
function inspectImage(repo, ref) {
  const path = repoPath(repo, ref.path).absolute;
  const key = `${path}:${ref.sha256}`;
  if (decodedImages.has(key)) return;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./flutter-image-inspection.mjs', import.meta.url)), path], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0 || result.error) throw new WorkflowError(`App 视觉目标图片解码失败：${result.error?.message ?? result.stderr}`);
  let info;
  try { info = JSON.parse(result.stdout); } catch { throw new WorkflowError('App 视觉目标图片解码结果无效'); }
  if (!['png', 'jpeg', 'webp'].includes(info.format) || !Number.isFinite(info.width) || info.width <= 0 || !Number.isFinite(info.height) || info.height <= 0) throw new WorkflowError('App 视觉目标必须是可解码的 PNG、JPEG 或 WebP 图片');
  decodedImages.add(key);
}

/** 核验来源、完整生成输入与修订链；引用始终绑定真实文件及其摘要。 */
export function readAppVisualSource(repo, ref, work, { file, validateBrief }, visited = new Set()) {
  const path = file(repo, ref, 'App 视觉目标来源', work);
  if (visited.has(path) || visited.size >= 64) throw new WorkflowError('App 视觉目标修订链成环或过深');
  visited.add(path);
  const source = readJson(repo, path, 'App 视觉目标来源');
  if (!validateSource) {
    const dependency = createRequire(import.meta.url)('../../../app-skill-runtime/dependencies.cjs');
    const Ajv2020 = dependency('ajv/dist/2020.js');
    validateSource = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(readFileSync(new URL('../../schemas/app-visual-source.schema.json', import.meta.url), 'utf8')));
  }
  if (!validateSource(source)) throw new WorkflowError(`App 视觉目标来源 Schema 无效：${JSON.stringify(validateSource.errors)}`);
  if (source.schemaVersion !== '1.0' || source.projectId !== work.projectId || source.stack !== work.stack || !['generated', 'provided'].includes(source.origin)) throw new WorkflowError('App 视觉目标来源的项目、技术栈或类型无效');
  for (const key of ['candidateId', 'version']) if (!actualText(source[key])) throw new WorkflowError(`App 视觉目标来源缺少 ${key}`);
  file(repo, source.briefRef, 'App 设计任务书', work);
  validateBrief(repo, source.briefRef, work);
  file(repo, source.imageRef, 'App 视觉目标图片', work);
  inspectImage(repo, source.imageRef);
  if (source.origin === 'generated') {
    for (const key of ['prompt', 'generator', 'generatorVersion']) if (!actualText(source[key])) throw new WorkflowError(`实际生成记录缺少 ${key}`);
    if (source.generationInputs != null) {
      const issues = validateGenerationPromptProjection(source.generationInputs, source.prompt);
      if (issues.length) throw new WorkflowError(`App 生图输入与实际提示词不一致：${issues.join('；')}`);
    }
  } else if (typeof source.sourceMessageRef !== 'string' || !source.sourceMessageRef.trim()) throw new WorkflowError('用户提供的效果图缺少来源消息');
  if (source.revisionOf) {
    if (typeof source.feedbackMessageRef !== 'string' || !source.feedbackMessageRef.trim()) throw new WorkflowError('效果图修订缺少真实反馈消息');
    const previous = readAppVisualSource(repo, source.revisionOf, work, { file, validateBrief }, visited);
    if (previous.imageRef.path === source.imageRef.path || previous.imageRef.sha256 === source.imageRef.sha256) throw new WorkflowError('效果图修订必须保留不同的历史产物及内容');
  } else if (source.feedbackMessageRef !== undefined) throw new WorkflowError('效果图反馈必须绑定修订前的来源');
  return source;
}
