import { readImageRoutePolicy } from './image-route-policy.mjs';
import { WorkflowError } from './io.mjs';

/** 读取原有合同的顶层或嵌套字段。 */
function field(value, name) {
  const camel = name.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
  const contract = value?.production_contract ?? value?.productionContract;
  return value?.[name] ?? value?.[camel] ?? contract?.[name] ?? contract?.[camel];
}

/** 提取文字专用资源，避免将字体图片或文字效果当作普通静态图片。 */
function textResourcePaths(manifest) {
  const contract = manifest?.scene_reconstruction_contract;
  const text = contract?.text_decomposition ?? contract?.textDecomposition;
  const nodes = text?.text_nodes ?? text?.textNodes ?? [];
  const paths = new Set();
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const resources = node?.required_resources ?? node?.requiredResources ?? node?.resources ?? [];
    for (const resource of Array.isArray(resources) ? resources : []) {
      const path = typeof resource === 'string' ? resource : resource?.path;
      if (typeof path === 'string') paths.add(path);
    }
  }
  return paths;
}

/** 既有素材和动画使用原有专业合同，避免将它们误认为新制静态单图。 */
function excluded(row, asset, textPaths) {
  const origin = asset?.origin ?? asset?.sourceKind;
  const mode = row?.implementation_plan?.mode ?? row?.implementationPlan?.mode;
  if ((['provided', 'licensed', 'existing', 'reuse'].includes(origin) && mode !== 'generate-now') || mode === 'reuse-existing'
    || field(row, 'production_method') === 'reuse' || asset?.route === 'frame-animation') return true;
  const paths = [asset?.source_file, asset?.sourceFile, asset?.output_file, asset?.outputFile,
    ...(Array.isArray(asset?.runtime_outputs) ? asset.runtime_outputs : [])];
  return paths.some((path) => textPaths.has(path));
}

/** V3 到 V5 的新制单图按初始化路线执行，详细文件和转换证据沿用原有 SVG 合同。 */
export function assertFormalImageManifestRoute(repo, work, manifest, stage) {
  if (!['V3', 'V4', 'V5'].includes(stage)) return;
  const policy = readImageRoutePolicy(repo, work);
  if (!policy) return;
  const assets = new Map((Array.isArray(manifest?.assets) ? manifest.assets : []).map((asset) => [asset?.id ?? asset?.asset_id, asset]));
  const contract = manifest?.scene_reconstruction_contract;
  const rows = [
    ...(Array.isArray(manifest?.coverage_audit?.regions) ? manifest.coverage_audit.regions : []),
    ...(Array.isArray(contract?.coverage_regions) ? contract.coverage_regions : []),
    ...(Array.isArray(manifest?.assets) ? manifest.assets : []),
  ];
  const textPaths = textResourcePaths(manifest);
  for (const row of rows) {
    const method = field(row, 'production_method');
    const origin = field(row, 'production_origin');
    const expected = field(row, 'expected_assets');
    const list = Array.isArray(expected) ? expected : [];
    const owner = field(row, 'owner_type');
    if (owner && owner !== 'fixed-production-visual') continue;
    if (method === 'image-generation' || field(row, 'image_generation_required') === true) {
      // 区域可能同时引用已提供资源，逐项排除后才对本批新制内容应用路线。
      const entries = list.length ? list : [row];
      if (policy.formalImageMethod === 'svg-to-png'
        && entries.some((item) => {
          const id = item.asset_id ?? item.assetId ?? item.id;
          const asset = assets.get(id);
          const isText = [item.source_file, item.sourceFile, item.runtime_file, item.runtimeFile].some((path) => textPaths.has(path));
          return !isText && !excluded(row, asset, textPaths);
        })) {
        throw new WorkflowError(`[${stage}] 正式单图已冻结 SVG 转 PNG，不能改用直接生图`);
      }
    }
    if (origin !== 'independent-production' || method !== 'authored-raster' || field(row, 'delivery_kind') !== 'raster-image') continue;
    for (const item of list) {
      const id = item.asset_id ?? item.assetId ?? item.id;
      const asset = assets.get(id);
      if (excluded(row, asset, textPaths) || [item.source_file, item.sourceFile, item.runtime_file, item.runtimeFile].some((path) => textPaths.has(path))) continue;
      const svg = item.svg_source_file;
      if (policy.formalImageMethod === 'svg-to-png' && (typeof svg !== 'string' || !svg.trim())) {
        throw new WorkflowError(`[${stage}] 正式单图 ${id ?? '(缺少资源 ID)'} 缺少冻结路线要求的 svg_source_file`);
      }
      if (policy.formalImageMethod === 'direct-image-generation') {
        throw new WorkflowError(`[${stage}] 正式单图 ${id ?? '(缺少资源 ID)'} 已冻结直接生图，须使用 image-generation 生产合同`);
      }
    }
  }
}

/** 素材评审可明确识别的 SVG 源必须与初始化路线一致。 */
export function assertFormalImageReviewRoute(repo, work, asset) {
  if (asset?.assetType !== 'image' || asset.sourceKind !== 'hand-authored' || !/\.svg$/i.test(asset.sourceRef ?? '')) return;
  const policy = readImageRoutePolicy(repo, work);
  if (policy?.formalImageMethod === 'direct-image-generation') {
    throw new WorkflowError(`正式单图 ${asset.assetId} 已冻结直接生图，不能改用 SVG`);
  }
}
