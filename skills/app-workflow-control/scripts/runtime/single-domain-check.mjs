import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { assertVisualReuse, resolveReuseOwner } from './visual-reuse-binding.mjs';
import { loadDomainConfirmationAuthority } from './visual-confirmation-domain.mjs';

const SKILLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const WEB_PREFIX = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const require = createRequire(import.meta.url);

/** 按项目内真实文件和摘要核对领域输入，避免引用在确认后被替换。 */
function identity(repo, ref, label) {
  if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label} 缺少路径或 SHA-256`);
  const path = requireFile(repo, ref.path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new WorkflowError(`${label} 内容与引用不一致`);
  return path;
}

/** 将单目标领域证据绑定到工作项、候选和 V2 已确认目标。 */
function readEnvelope(repo, work, stage) {
  const path = identity(repo, work.visual.domainEvidenceRef, '单目标领域证据');
  const doc = readJson(repo, path, '单目标领域证据');
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack, workItemType: work.workItemType, visualStageModel: 'function-first-v1', visualStage: stage, objectId: work.visual.objectId, candidateId: work.visual.candidateId })) {
    if (doc?.[key] !== expected) throw new WorkflowError(`单目标领域证据 ${key} 未绑定当前对象或阶段`);
  }
  const review = readJson(repo, work.visual.reviews?.V2?.path, 'V2 目标确认');
  if (identity(repo, doc.referenceTarget, '领域目标') !== identity(repo, review.referenceTarget, 'V2 目标') || doc.referenceTarget.sha256 !== review.referenceTarget.sha256) throw new WorkflowError('领域证据未绑定 V2 已确认目标');
  if (work.workItemType === 'DISPLAY_LAYER' && (doc.hostId !== work.visual.hostId || doc.layerType !== work.visual.layerType)) throw new WorkflowError('领域证据显示层宿主或类型错绑');
  return doc;
}

/** 校验 Unity 独立显示层的原生工作项和阶段证据。 */
async function validateUnity(repo, work, stage, doc) {
  if (work.workItemType !== 'DISPLAY_LAYER') throw new WorkflowError('Unity 单目标领域合同仅适用于 DISPLAY_LAYER');
  const native = readJson(repo, identity(repo, doc.nativeWorkItemRef, 'Unity 原生工作项'), 'Unity 原生工作项');
  if (native.workItemId !== work.workItemId || native.projectId !== work.projectId || native.workItemType !== 'DISPLAY_LAYER' || native.displayLayer?.displayLayerId !== work.visual.objectId || native.displayLayer?.hostSceneId !== work.visual.hostId || native.displayLayer?.type !== work.visual.layerType || native.displayLayer?.stage !== stage) throw new WorkflowError('Unity 显示层原生身份、宿主或阶段错绑');
  const full = await import(pathToFileURL(resolve(SKILLS_ROOT, 'unity-domain-contracts/scripts/unity-contract-validation.mjs')).href);
  full.validateWorkItem(native);
  if (stage !== 'V2') {
    const evidence = readJson(repo, identity(repo, doc.nativeEvidenceRef, 'Unity 原生证据'), 'Unity 原生证据');
    if (evidence.workItemId !== work.workItemId || evidence.workItemType !== 'DISPLAY_LAYER' || evidence.visualStage !== stage || evidence.verdict !== 'PASS' || (stage === 'V5' && evidence.candidateId !== work.visual.candidateId)) throw new WorkflowError('Unity 显示层原生证据身份或阶段错绑');
    full.validateEvidence(evidence, native, null, repo);
    if (stage === 'V5') {
      // 运行条件和目标必须出自实际人工验收情境，不能只信外层包装。
      const acceptance = readJson(repo, evidence.artExperienceAcceptanceRef, 'Unity 显示层人工验收');
      if (acceptance.workItemId !== work.workItemId || acceptance.displayLayerId !== work.visual.objectId || acceptance.candidateId !== work.visual.candidateId || typeof doc.stateId !== 'string' || !doc.stateId.trim() || !Number.isInteger(doc.viewport?.width) || !Number.isInteger(doc.viewport?.height) || doc.viewport.width < 1 || doc.viewport.height < 1) throw new WorkflowError('Unity 显示层验收缺少当前对象、候选、状态或视口');
      const matches = (acceptance.scenarios ?? []).filter((item) => item?.required === true && item.status === 'PASS' && item.targetId === work.visual.objectId && item.stateId === doc.stateId && item.viewport?.width === doc.viewport.width && item.viewport?.height === doc.viewport.height);
      if (matches.length !== 1 || identity(repo, matches[0].referenceTarget, 'Unity 显示层验收目标') !== identity(repo, doc.referenceTarget, '领域目标') || matches[0].referenceTarget.sha256 !== doc.referenceTarget.sha256) throw new WorkflowError('Unity 显示层人工验收未绑定当前目标、状态和视口');
    }
  }
}

/** 校验 Web 显示层清单、当前宿主和独立显示层的结构及实际文件。 */
async function validateWeb(repo, work, stage, doc) {
  if (work.workItemType !== 'DISPLAY_LAYER') throw new WorkflowError('游戏技术栈单目标领域合同仅适用于 DISPLAY_LAYER');
  const manifest = readJson(repo, identity(repo, doc.manifestRef, '显示层视觉清单'), '显示层视觉清单');
  if (manifest.visualStageModel !== 'function-first-v1' || manifest.visualStage !== stage || manifest.workItemId !== work.workItemId || manifest.candidateVersion !== work.visual.candidateId) throw new WorkflowError('显示层清单的阶段、工作项或候选错绑');
  const target = manifest.reference_target;
  const sha = String(target?.target_sha256 ?? '').replace(/^sha256:/, '');
  if (identity(repo, { path: target?.original_file, sha256: sha }, '清单视觉目标') !== identity(repo, doc.referenceTarget, '领域目标') || sha !== doc.referenceTarget.sha256) throw new WorkflowError('显示层清单未绑定当前视觉目标');
  const planning = manifest.scene_reconstruction_contract?.display_layer_planning;
  const layers = planning?.inventory;
  if (!Array.isArray(layers) || layers.length !== 1 || layers[0]?.layer_id !== work.visual.objectId || layers[0]?.host_scene_id !== work.visual.hostId || layers[0]?.type !== work.visual.layerType) throw new WorkflowError('显示层清单未绑定唯一对象、宿主和层类型');
  const contract = await import(pathToFileURL(resolve(SKILLS_ROOT, `${work.stack}-domain-contracts/scripts/scene-reconstruction-contract.mjs`)).href);
  const options = { stage, projectRoot: repo, displayLayerScope: 'display-layer' };
  let errors;
  if (stage === 'V2') errors = contract.validateSceneReconstructionContract(manifest.scene_reconstruction_contract, manifest, options);
  else {
    const validator = await import(pathToFileURL(resolve(SKILLS_ROOT, `${WEB_PREFIX[work.stack]}-game-asset-integration/scripts/validate_visual_manifest.mjs`)).href);
    const authority = await loadDomainConfirmationAuthority(repo, work, manifest, doc);
    const verifiedOptions = { ...options, authority, workItemId: work.workItemId, candidateVersion: work.visual.candidateId };
    errors = validator.validateManifest(manifest, { ...verifiedOptions, checkFiles: true, forceLayoutSourceFiles: true, workItemType: 'DISPLAY_LAYER' });
    errors.push(...await validator.checkManifestFiles(manifest, repo, verifiedOptions));
  }
  if (errors.length) throw new WorkflowError(`显示层领域合同失败：${[...new Set(errors)].join('；')}`);
}

/** Flutter 页面和独立显示层从 V3 起校验真实布局规格；V2 不预造未来布局。 */
function validateFlutter(repo, work, stage, doc) {
  if (!['PAGE', 'DISPLAY_LAYER'].includes(work.workItemType)) throw new WorkflowError('Flutter 单目标领域合同仅适用于 PAGE 或 DISPLAY_LAYER');
  if (work.workItemType === 'DISPLAY_LAYER') validateFlutterLayerContext(repo, work, stage, doc);
  if (stage === 'V2') return;
  const path = identity(repo, doc.layoutSpecRef, 'Flutter 页面布局规格');
  const yaml = require(resolve(SKILLS_ROOT, 'app-skill-runtime/dependencies.cjs'))('yaml');
  const spec = yaml.parse(readFileSync(repoPath(repo, path).absolute, 'utf8'));
  if (spec?.page?.id !== work.visual.objectId) throw new WorkflowError('Flutter 布局规格未绑定当前页面');
  const mode = doc.visualValidationMode ?? 'usability';
  if (!['usability', 'exact'].includes(mode)) throw new WorkflowError('Flutter 视觉验收模式必须是 usability 或 exact');
  // 只有显式精确还原才要求完整 fidelity 矩阵，普通可用性验收不强制像素对齐。
  if (stage === 'V5' && mode === 'exact' && spec.phase !== 'fidelity') throw new WorkflowError('Flutter exact 模式需要真实 fidelity 布局规格');
  const validator = require(resolve(SKILLS_ROOT, 'adaptive-layout-implementation/scripts/validate-layout-spec.js'));
  const [errors] = validator.validate(spec);
  if (errors.length) throw new WorkflowError(`Flutter 布局合同失败：${errors.join('；')}`);
  if (spec.phase === 'fidelity') {
    const approved = new Map([[identity(repo, doc.referenceTarget, 'Flutter 已确认目标'), doc.referenceTarget.sha256]]);
    // 其他视口的目标必须有各自真实确认，不能把一张主目标冒充全部状态。
    for (const extra of doc.additionalTargets ?? []) {
      const path = identity(repo, extra.referenceTarget, 'Flutter 额外视觉目标');
      const review = readJson(repo, identity(repo, extra.reviewRef, 'Flutter 额外目标确认'), 'Flutter 额外目标确认');
      if (work.workItemType === 'DISPLAY_LAYER' && (review.hostId !== work.visual.hostId || review.layerType !== work.visual.layerType)) throw new WorkflowError('Flutter 额外目标确认未绑定显示层当前宿主或层类型');
      if (review.workItemId !== work.workItemId) {
        // 继承必须沿已验证的 V2 复用链追到真实所有者，且该目标确实列入来源领域证据。
        assertVisualReuse(repo, work);
        resolveReuseOwner(repo, work, review.workItemId, 'V2');
        let owner = work;
        while (owner.workItemId !== review.workItemId) owner = readJson(repo, owner.visual.reuse.sourceWorkItemRef.path, '额外目标复用来源');
        const sourceDoc = readJson(repo, identity(repo, owner.visual.domainEvidenceRef, '来源领域证据'), '来源领域证据');
        const matches = (sourceDoc.additionalTargets ?? []).filter((entry) => entry?.referenceTarget?.path === extra.referenceTarget.path && entry.referenceTarget.sha256 === extra.referenceTarget.sha256 && entry.reviewRef?.path === extra.reviewRef.path && entry.reviewRef.sha256 === extra.reviewRef.sha256);
        if (matches.length !== 1) throw new WorkflowError('Flutter 额外目标未绑定复用来源的确认');
      }
      if (review.objectId !== work.visual.objectId || review.candidateId !== work.visual.candidateId || review.stage !== 'V2' || review.purpose !== 'target' || review.decision !== 'APPROVED' || typeof review.userMessageRef !== 'string' || !review.userMessageRef.trim() || identity(repo, review.referenceTarget, 'Flutter 额外目标确认文件') !== path || review.referenceTarget.sha256 !== extra.referenceTarget.sha256 || identity(repo, { path: review.targetRef, sha256: review.targetSha256 }, 'Flutter 额外确认图') !== path) throw new WorkflowError('Flutter 额外视口目标缺少当前对象的真实确认');
      if (approved.has(path) && approved.get(path) !== extra.referenceTarget.sha256) throw new WorkflowError('Flutter 视觉目标内容身份冲突');
      approved.set(path, extra.referenceTarget.sha256);
    }
    /** 确保对照目标对应主目标或已独立确认的视口目标。 */
    const verifyTarget = (path, sha256) => {
      const target = identity(repo, { path, sha256 }, 'Flutter 对照目标');
      if (approved.get(target) !== sha256) throw new WorkflowError('Flutter 对照用例未绑定已确认目标');
    };
    for (const item of spec.parity_cases) {
      verifyTarget(item.target_screenshot, item.target_sha256);
      // 文件存在性是技术事实；画面效果仍由用户检查，不自动读取或判断截图。
      const runtime = requireFile(repo, item.flutter_screenshot, 'Flutter 实际运行证据');
      if (!statSync(repoPath(repo, runtime).absolute).size) throw new WorkflowError('Flutter 实际运行证据不能为空');
    }
    for (const alignment of spec.critical_alignments) {
      const evidence = alignment.evidence;
      const targetPath = repoPath(repo, evidence.target_screenshot, 'Flutter 对齐目标').relative;
      if (!approved.has(targetPath)) throw new WorkflowError('Flutter 对齐证据未绑定已确认目标');
      verifyTarget(targetPath, approved.get(targetPath));
      for (const field of ['flutter_screenshot', 'actual_measurement_output']) {
        const path = requireFile(repo, evidence[field], `Flutter 对齐证据 ${field}`);
        if (!statSync(repoPath(repo, path).absolute).size) throw new WorkflowError(`Flutter 对齐证据 ${field} 不能为空`);
      }
    }
  }
}

/** 把显示层的人工确认和运行证据冻结到实际宿主，防止迁移后沿用旧验收。 */
function validateFlutterLayerContext(repo, work, stage, doc) {
  const names = ['V2', ...(stage !== 'V2' ? ['V3Decomposition', 'V3Layout'] : []), ...(['V4', 'V5'].includes(stage) ? ['V4'] : []), ...(stage === 'V5' ? ['V5'] : [])];
  let runtimeReview;
  for (const name of names) {
    const path = identity(repo, work.visual.reviews?.[name], `${name} 显示层确认`);
    const review = readJson(repo, path, `${name} 显示层确认`);
    if (review.hostId !== work.visual.hostId || review.layerType !== work.visual.layerType) throw new WorkflowError(`${name} 显示层确认未绑定当前宿主或层类型`);
    if (name === 'V5') runtimeReview = review;
  }
  if (stage !== 'V5') return;
  const path = identity(repo, doc.runtimeContextRef, 'Flutter 显示层运行上下文');
  const context = readJson(repo, path, 'Flutter 显示层运行上下文');
  if (identity(repo, runtimeReview.runtimeContextRef, 'V5 运行上下文确认') !== path || runtimeReview.runtimeContextRef.sha256 !== doc.runtimeContextRef.sha256) throw new WorkflowError('V5 显示层确认未绑定当前运行上下文');
  for (const [key, expected] of Object.entries({ schemaVersion: '1.0', workItemId: work.workItemId, objectId: work.visual.objectId, candidateId: work.visual.candidateId, hostId: work.visual.hostId, layerType: work.visual.layerType })) {
    if (context?.[key] !== expected) throw new WorkflowError(`Flutter 显示层运行上下文 ${key} 未绑定当前对象或宿主`);
  }
  // 不同显示层不一定具有关闭或焦点行为，但每项都须明确说明其适用性。
  for (const action of ['open', 'close', 'focus-restore']) {
    const items = Array.isArray(context.interactions) ? context.interactions.filter((item) => item?.action === action) : [];
    if (items.length !== 1) throw new WorkflowError(`Flutter 显示层运行上下文缺少唯一的 ${action} 记录`);
    const item = items[0];
    if (item.status === 'PASS') identity(repo, item.evidenceRef, `Flutter 显示层 ${action} 运行证据`);
    else if (item.status !== 'NOT_APPLICABLE' || typeof item.reason !== 'string' || !item.reason.trim()) throw new WorkflowError(`Flutter 显示层 ${action} 须提供通过证据或不适用原因`);
  }
}

/** 在独立进程中运行异步领域合同，调用方同步等待结果。 */
async function run(repo, work, stage) {
  if (!['V2', 'V3', 'V4', 'V5'].includes(stage)) throw new WorkflowError('单目标领域检查只适用于 V2–V5');
  const doc = readEnvelope(repo, work, stage);
  if (work.stack === 'unity') return validateUnity(repo, work, stage, doc);
  if (WEB_PREFIX[work.stack]) return validateWeb(repo, work, stage, doc);
  if (work.stack === 'flutter') return validateFlutter(repo, work, stage, doc);
  throw new WorkflowError('单目标领域合同不支持当前技术栈');
}

/** 在阶段门内同步等待真实领域校验，拒绝缺失或失败的输入。 */
export function validateSingleDomainTarget(repo, work, stage) {
  const input = JSON.stringify({ repo: resolve(repo), work, stage });
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--single-domain-worker'], { cwd: resolve(repo), input, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw new WorkflowError(`单目标领域校验未完成：${result.error.message}`);
  if (result.status !== 0) throw new WorkflowError(`单目标领域校验未通过：${(result.stderr || result.stdout || `退出码 ${result.status}`).trim()}`);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === '--single-domain-worker') {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try { const { repo, work, stage } = JSON.parse(Buffer.concat(chunks).toString('utf8')); await run(repo, work, stage); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
