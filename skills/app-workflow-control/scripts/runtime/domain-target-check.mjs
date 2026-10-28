import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, repoPath, requireFile, WorkflowError } from './io.mjs';
import { loadDomainConfirmationAuthority } from './visual-confirmation-domain.mjs';

const STACKS = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });
const SKILLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
// V1 用于功能验证；视觉领域门直接接收统一的 V2–V5 阶段。
const VISUAL_STAGES = Object.freeze(['V2', 'V3', 'V4', 'V5']);

/** 校验目标引用与当前项目内实际文件的一致性，防止路径或文件内容漂移。 */
function validateTargetFile(repo, reference, expected, label) {
  if (!reference || typeof reference !== 'object' || typeof reference.path !== 'string' || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) throw new WorkflowError(`${label} 缺少路径或 SHA-256`);
  const path = requireFile(repo, reference.path, label);
  const bytes = readFileSync(repoPath(repo, path, label).absolute);
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== reference.sha256) throw new WorkflowError(`${label} 实际文件与冻结身份不一致`);
  if (expected && (repoPath(repo, expected.path, label).relative !== path || expected.sha256 !== reference.sha256)) throw new WorkflowError(`${label} 未绑定当前目标文件`);
  return path;
}

/** 按对象身份验证领域记录绑定，不接受候选或状态错位的清单。 */
function validateWebIdentity(repo, manifest, work, target, stage) {
  const ref = manifest?.reference_target;
  const conditions = manifest?.scene_reconstruction_contract?.target_conditions;
  // V2 目标阶段不会调用完整资源清单门，必须在身份入口同样拒绝旧阶段语义。
  if (manifest?.visualStageModel !== 'function-first-v1') throw new WorkflowError('领域清单缺少统一视觉阶段语义标记');
  if (manifest?.visualStage !== stage) throw new WorkflowError('领域清单视觉阶段与当前目标阶段不匹配');
  if (manifest?.workItemId !== work.workItemId || manifest?.candidateVersion !== target.candidateId) throw new WorkflowError('领域清单的工作项或候选版本错绑');
  if (!ref || typeof ref.original_file !== 'string' || !conditions) throw new WorkflowError('领域清单缺少冻结目标或场景目标条件');
  const sha = String(ref.target_sha256 ?? '').replace(/^sha256:/, '');
  validateTargetFile(repo, { path: ref.original_file, sha256: sha }, target.referenceTarget, '领域目标');
  if (!Array.isArray(ref.scene_ids) || !ref.scene_ids.includes(target.sceneId) || !Array.isArray(ref.state_ids) || !ref.state_ids.includes(target.stateId)) throw new WorkflowError('领域目标的场景或状态范围错绑');
  if (conditions.scene_id !== target.sceneId || conditions.state_id !== target.stateId || conditions.viewport?.width !== target.viewport?.width || conditions.viewport?.height !== target.viewport?.height) throw new WorkflowError('领域合同的场景、状态或 viewport 错绑');
  if (String(conditions.target_sha256 ?? '').replace(/^sha256:/, '') !== target.referenceTarget.sha256) throw new WorkflowError('领域目标条件未绑定冻结目标内容');
}

/** 读取 Unity 领域记录并对照显式包装；原生合同不提供的视图身份由包装冻结。 */
function validateUnityIdentity(repo, envelope, work, target, stage) {
  for (const [key, expected] of Object.entries({ workItemId: work.workItemId, targetId: target.targetId, candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId })) {
    if (envelope?.[key] !== expected) throw new WorkflowError(`Unity 领域包装 ${key} 未绑定当前目标`);
  }
  if (envelope.viewport?.width !== target.viewport?.width || envelope.viewport?.height !== target.viewport?.height) throw new WorkflowError('Unity 领域包装 viewport 错绑');
  validateTargetFile(repo, envelope.referenceTarget, target.referenceTarget, 'Unity 领域目标');
  const native = readJson(repo, envelope.nativeWorkItemRef?.path, 'Unity 原生 Work Item');
  if (native.workItemId !== work.workItemId || native.projectId !== work.projectId || native.workItemType !== 'SCENE' || native.scene?.sceneId !== target.sceneId || native.scene?.stage !== stage) throw new WorkflowError('Unity 原生 Work Item 项目、场景、工作项或阶段错绑');
  let evidence = null;
  if (stage !== 'V2') {
    evidence = readJson(repo, envelope.nativeEvidenceRef?.path, 'Unity 原生 Evidence Manifest');
    if (evidence.workItemId !== work.workItemId || evidence.workItemType !== 'SCENE' || evidence.visualStage !== stage || evidence.verdict !== 'PASS') throw new WorkflowError('Unity 原生证据工作项、阶段或验收状态错绑');
    if (evidence.candidateId !== undefined && evidence.candidateId !== target.candidateId) throw new WorkflowError('Unity 原生证据候选身份错绑');
    if (stage === 'V5' && evidence.candidateId !== target.candidateId) throw new WorkflowError('Unity V5 领域证据必须绑定当前候选');
    if (stage === 'V5') {
      // 目标范围必须来自人工验收的实际情境，而不是只从可独立填写的包装字段复制。
      const acceptance = readJson(repo, evidence.artExperienceAcceptanceRef, 'Unity 人工美术验收');
      if (acceptance.workItemId !== work.workItemId || acceptance.sceneId !== target.sceneId || acceptance.candidateId !== target.candidateId) throw new WorkflowError('Unity 人工验收未绑定当前工作项、场景及候选');
      const matches = Array.isArray(acceptance.scenarios) ? acceptance.scenarios.filter((item) => item?.required === true && item.status === 'PASS' && item.targetId === target.targetId && item.stateId === target.stateId && item.viewport?.width === target.viewport?.width && item.viewport?.height === target.viewport?.height) : [];
      if (matches.length !== 1) throw new WorkflowError('Unity 人工验收必须唯一绑定当前目标、状态及运行视口');
      validateTargetFile(repo, matches[0].referenceTarget, target.referenceTarget, 'Unity 人工验收目标');
    }
  }
  return { native, evidence };
}

/** 在独立执行上下文等待异步文件门，禁止未完成的 Promise 被当作通过。 */
async function runDomainChecks({ repo, work, target, stage }) {
  if (!VISUAL_STAGES.includes(stage)) throw new WorkflowError(`不支持的领域校验阶段：${stage}`);
  const document = readJson(repo, target.domainEvidenceRef?.path, '目标领域证据');
  if (work.stack === 'unity') {
    const path = resolve(SKILLS_ROOT, 'unity-domain-contracts/scripts/runtime/visible-contract.mjs');
    const fullPath = resolve(SKILLS_ROOT, 'unity-domain-contracts/scripts/unity-contract-validation.mjs');
    if (!existsSync(path) || !existsSync(fullPath)) throw new WorkflowError('当前安装缺少 Unity 可见对象领域校验器');
    const { native, evidence } = validateUnityIdentity(repo, document, work, target, stage);
    const validator = await import(pathToFileURL(path).href);
    const nativeValidator = await import(pathToFileURL(fullPath).href);
    // V2/V3 同样通过完整领域记录校验，不能凭自填 PASS 和阶段字段通过。
    nativeValidator.validateWorkItem(native);
    if (evidence) nativeValidator.validateEvidence(evidence, native, null, repo);
    const errors = validator.validateVisibleWorkItemContract(native);
    if (evidence) errors.push(...validator.validateVisibleEvidenceContract(evidence, native, repo));
    if (errors.length) throw new WorkflowError(`Unity 领域合同失败：${errors.join('；')}`);
    return;
  }
  const prefix = STACKS[work.stack];
  if (!prefix) throw new WorkflowError(`场景多目标不支持技术栈：${work.stack}`);
  validateWebIdentity(repo, document, work, target, stage);
  const domainPath = resolve(SKILLS_ROOT, `${work.stack}-domain-contracts/scripts/scene-reconstruction-contract.mjs`);
  const manifestPath = resolve(SKILLS_ROOT, `${prefix}-game-asset-integration/scripts/validate_visual_manifest.mjs`);
  if (!existsSync(domainPath) || !existsSync(manifestPath)) throw new WorkflowError(`当前安装缺少 ${work.stack} 场景领域校验器`);
  if (stage === 'V2') {
    const validator = await import(pathToFileURL(domainPath).href);
    const errors = validator.validateSceneReconstructionContract(document.scene_reconstruction_contract, document, { stage, projectRoot: repo });
    if (errors.length) throw new WorkflowError(`V2 场景还原合同失败：${errors.join('；')}`);
    return;
  }
  const validator = await import(pathToFileURL(manifestPath).href);
  const authority = await loadDomainConfirmationAuthority(repo, work, document, document);
  const options = { stage, authority, workItemId: work.workItemId, candidateVersion: target.candidateId };
  const errors = validator.validateManifest(document, { ...options, checkFiles: true, forceLayoutSourceFiles: true, projectRoot: repo, workItemType: 'SCENE' });
  errors.push(...await validator.checkManifestFiles(document, repo, options));
  if (errors.length) throw new WorkflowError(`${stage} 视觉资源清单失败：${[...new Set(errors)].join('；')}`);
}

/** 同步执行目标领域门并返回实际结果；调用方不能跳过或伪造未安装的校验器。 */
export function validateDomainTarget(repo, work, target, stage) {
  const input = JSON.stringify({ repo: resolve(repo), work, target, stage });
  const execution = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--domain-target-worker'], {
    cwd: resolve(repo), input, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024,
  });
  if (execution.error) throw new WorkflowError(`目标领域校验未完成：${execution.error.message}`);
  if (execution.status !== 0) throw new WorkflowError(`目标领域校验未通过：${(execution.stderr || execution.stdout || `退出码 ${execution.status}`).trim()}`);
  return true;
}

/** 专用子进程只读取校验输入和项目文件，不执行编辑器、服务或外部动作。 */
async function runWorker() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  await runDomainChecks(input);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === '--domain-target-worker') {
  runWorker().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
