import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WorkflowError } from './io.mjs';
import { validatePublicArtExperience } from './art-experience.mjs';

const SKILLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** 仅在 Roblox 工作项进入领域门时加载其安装目录，其他单栈安装不依赖本栈资源。 */
async function loadValidator(name) {
  const file = resolve(SKILLS_ROOT, 'roblox-domain-contracts/scripts', name);
  if (!existsSync(file)) throw new WorkflowError(`当前安装缺少 Roblox 原生校验器：${name}`);
  return import(pathToFileURL(file).href);
}

/** 公共证据入口保持同步，独立进程只读采集物，不启动 Studio 或执行 Luau。 */
export function validateRobloxEngineeringEvidence(repo, work, manifest, pack) {
  const execution = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--roblox-engineering-worker'], {
    cwd: resolve(repo), input: JSON.stringify({ repo: resolve(repo), work, manifest, pack }),
    encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024,
  });
  if (execution.error) throw new WorkflowError(`Roblox 工程领域校验未完成：${execution.error.message}`);
  if (execution.status !== 0) throw new WorkflowError(`Roblox 工程领域校验未通过：${(execution.stderr || execution.stdout || `退出码 ${execution.status}`).trim()}`);
  return true;
}

/** 场景多目标先绑定公共冻结身份，再核对 Roblox 对象、来源与实际阶段材料。 */
export async function validateRobloxScene(repo, work, target, stage, envelope, identity) {
  // 公共场景领域入口沿用 path 引用；原生证据内容通过包装内的摘要引用单独绑定。
  const expected = {
    schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId,
    stack: 'roblox', workItemType: 'SCENE', visualStageModel: 'function-first-v1',
    visualStage: stage, objectId: work.visual?.objectId, targetId: target.targetId,
    candidateId: target.candidateId, sceneId: target.sceneId, stateId: target.stateId,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (envelope?.[key] !== value) throw new WorkflowError(`Roblox 场景领域记录 ${key} 未绑定当前目标或阶段`);
  }
  if (envelope.viewport?.width !== target.viewport?.width || envelope.viewport?.height !== target.viewport?.height) throw new WorkflowError('Roblox 场景领域记录 viewport 错绑');
  identity(repo, envelope.referenceTarget, target.referenceTarget, 'Roblox 冻结目标');
  const { validateRobloxVisual } = await loadValidator('validate-visual.mjs');
  validateRobloxVisual(repo, work, { stage, target, envelope });
  if (stage === 'V5') validatePublicArtExperience(repo, work, target);
  return true;
}

/** 显示层的公共确认及宿主身份已由单目标入口核对，原生门补充真实 Studio 合同。 */
export async function validateRobloxLayer(repo, work, stage, envelope) {
  if (work.workItemType !== 'DISPLAY_LAYER') throw new WorkflowError('Roblox 单目标领域合同仅支持 DISPLAY_LAYER');
  const { validateRobloxVisual } = await loadValidator('validate-visual.mjs');
  validateRobloxVisual(repo, work, { stage, envelope });
  if (stage === 'V5') {
    // 运行结构通过不能替代人工美术验收，显示层同样绑定当前宿主和动态情境。
    validatePublicArtExperience(repo, work, {
      targetId: work.visual.objectId, candidateId: work.visual.candidateId,
      stateId: envelope.stateId, viewport: envelope.viewport, referenceTarget: envelope.referenceTarget,
    });
  }
  return true;
}

/** 从标准输入接收当前工作项的只读验证请求，失败原样传播给公共门。 */
async function runEngineeringWorker() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const { repo, work, manifest, pack } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const { validateRobloxEngineering } = await loadValidator('validate-evidence.mjs');
  validateRobloxEngineering(repo, work, manifest, pack);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === '--roblox-engineering-worker') {
  runEngineeringWorker().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
