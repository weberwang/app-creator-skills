import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { checkedPath, inspectFile } from '../verification/file-identities.mjs';
import { isSvgRasterDimension, SVG_RASTER_MAX_DIMENSION, SVG_RASTER_MAX_SOURCE_BYTES } from './svg-raster-limits.mjs';
import { isSvgSourceReviewRef, readSvgSourceReview, SVG_RASTERIZATION_VERSION } from './svg-source-review.mjs';

/** 兼容既有生产合同的字段位置，SVG 源路径只使用 svg_source_file。 */
function productionField(value, name) {
  const camel = name.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
  const nested = value?.production_contract ?? value?.productionContract;
  return value?.[name] ?? value?.[camel] ?? nested?.[name] ?? nested?.[camel];
}

/** 生产清单中的可选数组缺省为空，基本结构由各栈既有合同检查。 */
function list(value) {
  return Array.isArray(value) ? value : [];
}

/** 冻结的路径使用项目相对路径，拒绝绝对路径、别名与路径逃逸。 */
function assetPath(value, extension) {
  return typeof value === 'string' && value === value.trim() && value.toLowerCase().endsWith(extension)
    && !/[\\:\u0000-\u001f]/.test(value) && value.split('/').every((part) => part && part !== '.' && part !== '..');
}

/** 从场景拆解和素材清单提取实际选择的单图路线，并比较重复交接。 */
function collectPlans(manifest, stage, errors) {
  const regions = list(manifest?.coverage_audit?.regions);
  const layoutRegions = list(manifest?.scene_reconstruction_contract?.coverage_regions);
  const rows = [...regions, ...layoutRegions, ...list(manifest?.assets)];
  const plans = new Map();
  const ordinary = new Set();
  for (const row of rows) for (const entry of list(productionField(row, 'expected_assets'))) {
    if (!entry || typeof entry !== 'object') continue;
    const id = entry.asset_id ?? entry.assetId ?? entry.id;
    if (!Object.hasOwn(entry, 'svg_source_file')) {
      if (typeof id === 'string' && id) ordinary.add(id);
      continue;
    }
    const label = `[${stage}] SVG 单图 ${id ?? '(缺少 asset_id)'}`;
    const source = entry.source_file ?? entry.sourceFile ?? entry.file;
    const output = entry.runtime_file ?? entry.runtimeFile ?? entry.runtime_output_file ?? entry.runtimeOutputFile;
    const owner = productionField(row, 'owner_type');
    const inventory = productionField(row, 'component_inventory');
    if (productionField(row, 'production_origin') !== 'independent-production' || (owner && owner !== 'fixed-production-visual')
      || productionField(row, 'production_method') !== 'authored-raster' || productionField(row, 'delivery_kind') !== 'raster-image'
      || productionField(row, 'image_generation_required') !== false || productionField(row, 'generation_record_required') !== false) {
      errors.push(`${label}须冻结为独立制作的 authored-raster/raster-image，生成标记均为 false`);
    }
    if (entry.atlas_slice || entry.atlasSlice || (inventory && (inventory.delivery_mode !== 'individual' || inventory.atlas_allowed !== false))) {
      errors.push(`${label}须按部件和状态交付独立 PNG`);
    }
    if (typeof id !== 'string' || !id.trim() || !assetPath(entry.svg_source_file, '.svg') || !assetPath(source, '.png') || !assetPath(output, '.png')
      || (entry.mime_type ?? entry.mimeType) !== 'image/png' || !isSvgRasterDimension(entry.width)
      || !isSvgRasterDimension(entry.height) || typeof entry.alpha !== 'boolean') {
      errors.push(`${label}须声明有效的 svg_source_file、PNG 路径、1–${SVG_RASTER_MAX_DIMENSION} 像素宽高及 Alpha 合同`);
      continue;
    }
    const plan = { svg: entry.svg_source_file, source, output, width: entry.width, height: entry.height, alpha: entry.alpha ? 'transparent' : 'opaque' };
    if (plans.has(id) && !isDeepStrictEqual(plans.get(id), plan)) errors.push(`${label}在各层交接中的 SVG 来源或 PNG 规格不一致`);
    else plans.set(id, plan);
  }
  for (const id of plans.keys()) if (ordinary.has(id)) errors.push(`[${stage}] SVG 单图 ${id} 的交接缺少冻结的 svg_source_file`);
  return plans;
}

/** 读取已登记的运行时 PNG 路径，定位成品身份而非引擎导入元数据。 */
function runtimePaths(asset) {
  const metadata = asset.output ?? asset.output_metadata ?? asset.outputMetadata;
  const result = [asset.output_file, asset.outputFile, asset.runtime_file, asset.runtimeFile, asset.runtime_output_file, asset.runtimeOutputFile,
    typeof metadata === 'string' ? metadata : metadata?.file ?? metadata?.path, ...list(asset.runtime_outputs ?? asset.runtimeOutputs)];
  return result.filter((value) => value !== undefined);
}

/** 将转换输出与同一素材计划核对，V3 允许只冻结计划。 */
function collectConversions(manifest, stage) {
  const errors = [];
  const plans = collectPlans(manifest, stage, errors);
  const converted = [];
  const observed = new Set();
  for (const asset of list(manifest?.assets)) {
    if (!asset || typeof asset !== 'object') continue;
    const id = asset.id ?? asset.asset_id;
    const plan = plans.get(id);
    const record = asset.svg_rasterization;
    const label = `[${stage}] SVG 单图 ${id ?? '(缺少资源 ID)'}`;
    if (!plan) {
      if (record !== undefined) errors.push(`${label}的 svg_rasterization 缺少 V3 冻结的 svg_source_file`);
      continue;
    }
    if (observed.has(id)) errors.push(`${label}重复声明正式资源身份`);
    observed.add(id);
    const runtime = runtimePaths(asset);
    const source = asset.source_file ?? asset.sourceFile;
    if (stage === 'V3' && asset.status === 'planned' && record === undefined) {
      if ((source !== undefined && source !== plan.source) || runtime.some((path) => path !== plan.output)) {
        errors.push(`${label}的计划 PNG 路径与冻结的制作件或运行输出不一致`);
      }
      continue;
    }
    const explicitMethod = productionField(asset, 'production_method');
    if (source !== plan.source || !runtime.length || runtime.some((path) => path !== plan.output) || asset.generation_record !== undefined
      || asset.generationRecord !== undefined || (explicitMethod && explicitMethod !== 'authored-raster')) {
      errors.push(`${label}的独立 PNG 源、运行输出或制作方式错绑`);
    }
    if (record?.schema_version !== SVG_RASTERIZATION_VERSION || record.renderer !== 'sharp' || typeof record.renderer_version !== 'string'
      || !record.renderer_version.trim() || record.source_file !== plan.svg || record.output_file !== plan.output
      || record.width !== plan.width || record.height !== plan.height || record.alpha !== plan.alpha
      || !isSvgSourceReviewRef(record.source_review_ref)
      || ![record.source_sha256, record.output_sha256].every((sha) => typeof sha === 'string' && /^[a-f0-9]{64}$/.test(sha))) {
      errors.push(`${label}缺少与已确认 SVG、PNG、尺寸和 Alpha 一致的 svg_rasterization 或 SVG 人工确认引用`);
      continue;
    }
    converted.push({ id, label, plan, record });
  }
  if (stage !== 'V3') for (const id of plans.keys()) if (!observed.has(id)) errors.push(`[${stage}] SVG 单图 ${id}缺少正式 PNG 资源记录`);
  return { plans, converted, errors };
}

/** 检查 SVG 单图路线与阶段绑定，并由现有清单门汇总诊断。 */
export function validateSvgRasterManifest(manifest, stage, { checkFiles, projectRoot } = {}) {
  const phase = String(stage ?? 'V3').toUpperCase();
  const { errors, plans, converted } = collectConversions(manifest, phase);
  if ((plans.size > 0 && (phase === 'V4' || phase === 'V5')) || converted.length > 0) {
    if (checkFiles !== true || typeof projectRoot !== 'string' || !projectRoot.trim()) {
      errors.push(`[${phase}] SVG 单图验收必须提供 checkFiles=true 和 projectRoot，以复验实际源文件和 PNG`);
    }
  }
  return errors;
}

/** 读取经过项目路径和文件身份检查的完整文件，并拒绝校验期间变化的字节。 */
async function frozenBytes(projectRoot, path, expectedSha, label, maxBytes) {
  const absolute = checkedPath(projectRoot, path, label).absolute;
  const metadata = await lstat(absolute);
  if (!metadata.isFile() || !metadata.size || metadata.size > maxBytes) throw new Error(`${label}必须是非空普通文件且在尺寸预算内`);
  const identity = inspectFile(projectRoot, path, label);
  const file = await readFile(absolute);
  if (identity.sha256 !== expectedSha || createHash('sha256').update(file).digest('hex') !== expectedSha) throw new Error(`${label}与转换记录的 SHA-256 不一致`);
  return file;
}

/** 受工作流管理的正式阶段以 V3 已确认布局清单为准，防止同时改写当期各份副本。 */
async function verifyFrozenPlans(projectRoot, phase, plans, context, errors) {
  if (!context || !['V3', 'V4', 'V5'].includes(phase) || (phase === 'V3' && !plans.size)) return;
  let previousUsesSvg = false;
  try {
    const reviewRef = context.layoutReviewRef;
    if (!reviewRef?.path) throw new Error('缺少 V3 布局确认');
    const reviewFile = checkedPath(projectRoot, reviewRef.path, 'V3 布局确认').absolute;
    const reviewBytes = await readFile(reviewFile);
    const review = JSON.parse(reviewBytes.toString('utf8'));
    const specRef = review?.layoutSpecRef;
    if (!specRef?.path) throw new Error('V3 布局确认缺少 layoutSpecRef');
    const specFile = checkedPath(projectRoot, specRef.path, 'V3 SVG 生产清单').absolute;
    const bytes = await readFile(specFile);
    const manifest = JSON.parse(bytes.toString('utf8'));
    const upstreamErrors = [];
    const previousPlans = collectPlans(manifest, 'V3', upstreamErrors);
    previousUsesSvg = previousPlans.size > 0 || upstreamErrors.length > 0;
    if (!plans.size && !previousUsesSvg) return;
    if (createHash('sha256').update(reviewBytes).digest('hex') !== reviewRef.sha256
      || createHash('sha256').update(bytes).digest('hex') !== specRef.sha256 || review.stage !== 'V3' || review.purpose !== 'layout'
      || review.decision !== 'APPROVED' || review.candidateId !== context.candidateId || (manifest.visualStage ?? manifest.visual_stage) !== 'V3'
      || typeof review.workItemId !== 'string' || !review.workItemId || manifest.workItemId !== review.workItemId
      || manifest.candidateVersion !== context.candidateId || upstreamErrors.length) {
      throw new Error('V3 SVG 生产清单未绑定已确认的工作项、候选和文件摘要');
    }
    // 跨工作项布局只能沿工作流认可的复用链继承，不能只凭记录自报来源。
    if (review.workItemId !== context.workItemId && context.resolveLayoutOwner?.(reviewRef, review) !== review.workItemId) {
      throw new Error('V3 SVG 布局确认的拥有者未获授权复用');
    }
    if (!isDeepStrictEqual(plans, previousPlans)) throw new Error('当前 SVG 来源、PNG 规格或资产范围偏离 V3 冻结计划');
  } catch (error) {
    // 无 SVG 的旧素材仍由原阶段门处理布局文件；声明了 SVG 才增加这条路线的证据要求。
    if (plans.size || previousUsesSvg) errors.push(`[${phase}] SVG 单图 ${error.message}`);
  }
}

/** 从实际 SVG 复算最终 PNG，避免只把两份无关联文件的摘要写进转换记录。 */
export async function checkSvgRasterManifestFiles(manifest, projectRoot, stage, { svgPlanContext } = {}) {
  const phase = String(stage ?? 'V3').toUpperCase();
  const { plans, converted, errors } = collectConversions(manifest, phase);
  await verifyFrozenPlans(projectRoot, phase, plans, svgPlanContext, errors);
  if (phase === 'V3') for (const [id, plan] of plans) {
    try {
      // V3 只冻结路径，允许源与成品尚未制作；现有父级仍须处于项目边界。
      for (const path of new Set([plan.svg, plan.source, plan.output])) checkedPath(projectRoot, path, '计划 SVG/PNG 路径');
    } catch (error) {
      errors.push(`[${phase}] SVG 单图 ${id} ${error.message}`);
    }
  }
  for (const { id, label, plan, record } of converted) {
    try {
      // 验收时重新核对用户确认，防止替换确认记录或将其他素材的授权挪用到本图。
      if (typeof manifest.workItemId !== 'string' || !manifest.workItemId.trim()
        || typeof manifest.candidateVersion !== 'string' || !manifest.candidateVersion.trim()) {
        throw new Error('SVG 人工确认缺少当前工作项或候选身份');
      }
      readSvgSourceReview(projectRoot, record.source_review_ref.path, {
        sourcePath: plan.svg, sourceSha256: record.source_sha256, reviewSha256: record.source_review_ref.sha256,
        assetId: id, workItemId: manifest.workItemId, candidateId: manifest.candidateVersion,
      });
      const { rasterizeSvg, svgRasterizerVersion } = await import('./svg-rasterization.mjs');
      if (record.renderer_version !== svgRasterizerVersion()) throw new Error('转换工具版本与当前复验版本不一致');
      const pngBudget = plan.width * plan.height * 5 + 1024 * 1024;
      const [svg, output] = await Promise.all([
        frozenBytes(projectRoot, plan.svg, record.source_sha256, 'SVG 制作源', SVG_RASTER_MAX_SOURCE_BYTES),
        frozenBytes(projectRoot, plan.output, record.output_sha256, '正式 PNG', pngBudget),
      ]);
      if (plan.source !== plan.output) await frozenBytes(projectRoot, plan.source, record.output_sha256, 'PNG 制作件', pngBudget);
      if (!(await rasterizeSvg(svg, plan)).equals(output)) throw new Error('正式 PNG 与冻结 SVG 的转换结果不一致');
    } catch (error) {
      errors.push(`${label} ${error.message}`);
    }
  }
  return errors;
}
