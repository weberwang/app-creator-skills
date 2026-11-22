import { readJson, WorkflowError } from './io.mjs';
import { productionIdentity } from './production-scope.mjs';
import { requireText } from './validation.mjs';

const PRODUCT_TOPICS = ['market', 'competitor', 'audience'];

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
export function validateVisualResearch(repo, baseline) {
  const path = productionIdentity(repo, baseline.visualResearchRef, '全局视觉产品调研与美术参考');
  const research = readJson(repo, path, '全局视觉产品调研与美术参考');
  if (research?.schemaVersion !== '1.0' || research.projectId !== baseline.projectId || research.stack !== baseline.stack) {
    throw new WorkflowError('全局视觉调研的项目、技术栈或版本与当前基线不一致');
  }
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

/** 调研清单和本地来源属于只读设计输入，不能成为实现写入目标或运行证据。 */
export function collectVisualResearchPaths(repo, baselineRef) {
  if (!baselineRef?.path) return [];
  const baseline = readJson(repo, baselineRef.path, '全局视觉基线');
  return collectVisualResearchInputPaths(repo, baseline?.visualResearchRef);
}

/** 选稿前的设计提案可以直接冻结调研，其输入也需要写入保护。 */
export function collectVisualResearchInputPaths(repo, ref) {
  if (!ref?.path) return [];
  const path = ref.path;
  const research = readJson(repo, path, '全局视觉产品调研与美术参考');
  const items = [
    ...PRODUCT_TOPICS.map((topic) => research?.productResearch?.[topic]),
    ...(Array.isArray(research?.artReferences) ? research.artReferences : []),
  ];
  return [path, ...items.map((item) => item?.source?.fileRef?.path).filter((source) => typeof source === 'string' && source.trim())];
}
