import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareGenerationPrompt, validateGenerationPromptProjection } from '../../../app-domain-toolkit/scripts/visual/generation-prompt.mjs';
import { fileIdentityKey, repoPath, WorkflowError } from './io.mjs';

/** 读取实际位图尺寸，解码失败时不能依靠文件名或导入配置放行。 */
function bitmapSize(path, label) {
  const decoder = fileURLToPath(new URL('./flutter-image-inspection.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [decoder, path], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0 || result.error) throw new WorkflowError(`${label} 无法解码：${result.error?.message ?? result.stderr}`);
  const { width, height } = JSON.parse(result.stdout);
  return { width, height };
}

/** 仅对 V4 正式 AI 位图检查冻结目标、真实发送记录、区域和最终尺寸。 */
export function validateGeneratedImageReview(repo, record, asset, { candidateId, approvedSources, verifyFile, historicalPromptSha256 }) {
  const label = `正式生图 ${asset.assetId}`;
  /** 把缺失事实留在本条资产的错误中，便于只返修受影响的素材。 */
  function insist(condition, message) {
    if (!condition) throw new WorkflowError(`${label} ${message}`);
  }
  insist(record?.assetId === asset.assetId && record.candidateId === candidateId, '未绑定当前资产和冻结候选');
  const sourceKey = fileIdentityKey(repo, record.referenceTarget);
  const target = approvedSources.find((ref) => ref?.path && fileIdentityKey(repo, ref.path) === sourceKey);
  insist(target, '参考原图必须是当前 V2 已确认的目标');
  const targetFile = repoPath(repo, verifyFile(target, `${label} V2 原图`)).absolute;

  const { region, generationInputs, actualReferenceInputs, runtimeSize } = record;
  insist(typeof region?.id === 'string' && region.id.trim(), '缺少 V3 部件区域编号');
  insist(typeof region.requiresDetail === 'boolean', '部件区域必须声明是否需要局部细节参考');
  insist(Array.isArray(asset.designItemIds) && asset.designItemIds.includes(region.id), '部件区域未绑定当前资产的设计项');
  const { x, y, width, height } = region.bounds ?? {};
  insist([x, y, width, height].every(Number.isSafeInteger) && x >= 0 && y >= 0 && width > 0 && height > 0, '部件边界须为有效的原图像素框');
  insist(['reproduce', 'edit'].includes(generationInputs?.mode), '必须声明已确认目标的还原或局部编辑模式');
  if (historicalPromptSha256 === undefined) {
    const issues = validateGenerationPromptProjection(generationInputs, record.prompt);
    insist(issues.length === 0, issues.join('；'));
  } else {
    // 授权仅替代提示词模板比对，仍核对实际原文、附件角色和正式运行尺寸。
    const { issues } = prepareGenerationPrompt(generationInputs);
    insist(issues.length === 0, issues.join('；'));
    insist(typeof record.prompt === 'string' && createHash('sha256').update(record.prompt).digest('hex') === historicalPromptSha256,
      '提示词原文已偏离已批准的真实收据');
  }
  const references = generationInputs.references;
  insist(Array.isArray(references) && references.length > 0, '缺少已声明的实际生成附件角色');
  const originals = references.filter((ref) => ref.role === 'source-target');
  insist(originals.length === 1 && fileIdentityKey(repo, originals[0].ref) === sourceKey, 'source-target 必须唯一且绑定 V2 原图');
  const details = references.filter((ref) => ref.role === 'source-detail');
  if (region.requiresDetail) insist(details.length > 0, '当前部件缺少局部细节参考');
  insist(details.every((ref) => fileIdentityKey(repo, ref.ref) !== sourceKey), '局部细节参考须是独立附件');
  insist(Array.isArray(actualReferenceInputs) && actualReferenceInputs.length === references.length, '缺少实际发送的完整附件清单');
  const outputKey = fileIdentityKey(repo, asset.output);
  for (const [index, reference] of references.entries()) {
    const actual = actualReferenceInputs[index];
    insist(typeof actual?.path === 'string' && fileIdentityKey(repo, actual.path) === fileIdentityKey(repo, reference.ref), `实际附件第 ${index + 1} 项的文件或顺序不符`);
    verifyFile(actual, `实际附件第 ${index + 1} 项`);
    insist(fileIdentityKey(repo, actual.path) !== outputKey, '正式输出不得直接使用参考附件');
  }

  insist(fileIdentityKey(repo, record.runtimePath) === outputKey, '生成记录未绑定实际正式输出');
  insist(Number.isSafeInteger(runtimeSize?.width) && runtimeSize.width > 0 && Number.isSafeInteger(runtimeSize?.height) && runtimeSize.height > 0, '缺少由消费者规格推导的正式像素尺寸');
  const sourceSize = bitmapSize(targetFile, `${label} V2 原图`);
  insist(x + width <= sourceSize.width && y + height <= sourceSize.height, '部件区域超出 V2 原图');
  const actual = bitmapSize(repoPath(repo, asset.output).absolute, `${label} 运行位图`);
  insist(actual.width === runtimeSize.width && actual.height === runtimeSize.height, `实际尺寸 ${actual.width}×${actual.height} 与正式规格 ${runtimeSize.width}×${runtimeSize.height} 不符`);
}
