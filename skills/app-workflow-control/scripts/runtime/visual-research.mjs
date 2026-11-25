import { existsSync } from 'node:fs';
import { fileIdentityKey, readJson, repoPath, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { requireText } from './validation.mjs';

const PRODUCT_TOPICS = ['market', 'competitor', 'audience'];
const RESEARCH_LABEL = '全局视觉产品调研与美术参考';
const SUPPLEMENT_LABEL = '全局视觉调研补充';

/** 核对基线引用的实际内容，并在有基线上下文时拒绝绑定到其他路径或版本。 */
function assertBaselineBinding(repo, ref, baselineRef, label) {
  const path = productionIdentity(repo, ref, label);
  if (baselineRef && (ref.sha256 !== baselineRef.sha256
    || fileIdentityKey(repo, path) !== fileIdentityKey(repo, baselineRef.path))) {
    throw new WorkflowError(`${label}未绑定当前冻结基线`);
  }
}

/** 仅为缺少调研引用的冻结基线读取同目录补充记录，保留原基线文件身份。 */
function readResearchSupplement(repo, baseline, baselineRef) {
  if (baseline?.visualResearchRef != null || typeof baselineRef?.path !== 'string' || !/\.json$/i.test(baselineRef.path)) {
    return null;
  }
  const path = baselineRef.path.replace(/\.json$/i, '.research-supplement.json');
  const file = repoPath(repo, path, SUPPLEMENT_LABEL);
  if (!existsSync(file.absolute)) return null;
  return { path: file.relative, record: readJson(repo, file.relative, SUPPLEMENT_LABEL) };
}

/** 核对每条来源是公开链接或可复核的项目文件，避免空路径冒充调研。 */
function readSource(repo, source, label) {
  if (source?.fileRef && source.url === undefined) return productionIdentity(repo, source.fileRef, label);
  if (typeof source?.url === 'string' && source.fileRef === undefined) {
    const url = URL.parse(source.url);
    if (url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return null;
  }
  throw new WorkflowError(`${label}必须引用公开来源链接或冻结文件`);
}

/** 视觉基线绑定当前项目、技术栈和有效的研究工件，方向更新时可以共用原冻结引用。 */
export function validateVisualResearch(repo, baseline, baselineRef) {
  const supplement = readResearchSupplement(repo, baseline, baselineRef);
  let ref = baseline.visualResearchRef;
  if (supplement) {
    if (supplement.record?.schemaVersion !== '1.0') throw new WorkflowError(`${SUPPLEMENT_LABEL} schemaVersion 必须为 1.0`);
    assertBaselineBinding(repo, supplement.record.baselineRef, baselineRef, `${SUPPLEMENT_LABEL} baselineRef`);
    ref = supplement.record.visualResearchRef;
  }
  const path = productionIdentity(repo, ref, supplement ? `${SUPPLEMENT_LABEL}的调研清单` : RESEARCH_LABEL);
  const research = readJson(repo, path, RESEARCH_LABEL);
  if (research?.schemaVersion !== '1.0' || research.projectId !== baseline.projectId || research.stack !== baseline.stack) {
    throw new WorkflowError('全局视觉调研的项目、技术栈或版本与当前基线不一致');
  }
  // 直接使用调研的 Figma 提案也须核对所声明的 basisRef，但此时没有当前基线可比对。
  if (research.basisRef !== undefined) assertBaselineBinding(repo, research.basisRef, baselineRef, '全局视觉调研清单 basisRef');
  for (const topic of PRODUCT_TOPICS) {
    const item = research.productResearch?.[topic];
    requireText(item?.finding, `全局视觉产品调研 ${topic} 结论`);
    readSource(repo, item.source, `全局视觉产品调研 ${topic} 来源`);
  }
  if (!Array.isArray(research.artReferences) || !research.artReferences.length) {
    throw new WorkflowError('全局视觉缺少美术设定参考');
  }
  for (const [index, item] of research.artReferences.entries()) {
    const label = `美术设定参考第 ${index + 1} 项`;
    requireText(item?.observation, `${label}的设计观察`);
    requireText(item.applicability, `${label}的当前适用依据`);
    readSource(repo, item.source, `${label}来源`);
  }
}

/** 收集只读设计输入，覆盖补充记录、调研清单及本地来源。 */
export function collectVisualResearchPaths(repo, baselineRef) {
  if (!baselineRef?.path) return [];
  const baseline = readJson(repo, baselineRef.path, '全局视觉基线');
  const supplement = readResearchSupplement(repo, baseline, baselineRef);
  if (supplement) return [supplement.path, ...collectVisualResearchInputPaths(repo, supplement.record?.visualResearchRef)];
  return collectVisualResearchInputPaths(repo, baseline?.visualResearchRef);
}

/** 选稿前的设计提案可以直接冻结调研，其输入也需要写入保护。 */
export function collectVisualResearchInputPaths(repo, ref) {
  if (!ref?.path) return [];
  const research = readJson(repo, ref.path, RESEARCH_LABEL);
  const items = [
    ...PRODUCT_TOPICS.map((topic) => research?.productResearch?.[topic]),
    ...(Array.isArray(research?.artReferences) ? research.artReferences : []),
  ];
  return [ref.path, ...items.map((item) => item?.source?.fileRef?.path).filter((source) => typeof source === 'string' && source.trim())];
}
