import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { GAME_STACKS, STAGES, VERSION } from './constants.mjs';
import { atomicWriteJson, fileIdentityKey, readJson, repoPath, requireFile, stackProfileLocation, WorkflowError } from './io.mjs';
import { response } from './responses.mjs';
import { withWorkLock } from './work-lock.mjs';
import { bindWorkSource } from './work-source.mjs';

const PROJECT_STAGES = STAGES.slice(0, 3);
const LAYERS = ['content', 'hud', 'popups', 'toasts', 'loading'];
const SCREEN_NODES = { hud: 'HudLayer', popups: 'PopupLayer', toasts: 'ToastLayer', loading: 'LoadingLayer' };
const WORK_ITEMS = '.workflow-control/work-items';

/** 判断工作项是否由从零游戏的三段产品与技术门推进。 */
export function isGameProject(work) {
  return work?.workItemType === 'PROJECT' && GAME_STACKS.includes(work.stack);
}

/** 为进度查询提供当前游戏阶段的下一步，无需探测或构建工程。 */
function gameStageNext(work) {
  if (work.globalState === 'COMPLETE') return '按技术方案进入阶段 4';
  if (work.stageId === PROJECT_STAGES[0]) return '人工确认玩法题材构想后完成一次 Grilling，再提交 game-stage';
  if (work.stageId === PROJECT_STAGES[1]) return '取得当前 Game Loop 的人工确认后提交 game-stage';
  return '登记本栈固定模板并提交技术方案';
}

/** 只检查已提交的上游事实，游戏 PROJECT 不使用生产工作项的工程门。 */
export function inspectGameProject(repo, work) {
  const blocking = [];
  const completed = work.globalState === 'COMPLETE';
  try { checkCompletedStages(repo, work, completed ? 3 : PROJECT_STAGES.indexOf(work.stageId)); }
  catch (error) { blocking.push(error.message); }
  if (work.globalState === 'BLOCKED' && work.blockedRecord?.reason) blocking.push(work.blockedRecord.reason);
  return { status: blocking.length ? 'BLOCKED' : 'PASS', blocking, next: [gameStageNext(work)], activeBatch: null };
}

/** 载入本栈唯一交付模板及其摘要，防止同名模板实际内容漂移。 */
export function gameArchitectureTemplate(repo, stack) {
  const { absolute } = stackProfileLocation(repo, stack);
  const source = readFileSync(join(dirname(absolute), 'templates', 'game-architecture.json'));
  const template = JSON.parse(source);
  if (template.schemaVersion !== VERSION || template.stack !== stack || !template.templateVersion?.trim() ||
      !Array.isArray(template.project?.entryPoints) || !template.project.entryPoints.length ||
      template.project.entryPoints.some((entry) => typeof entry !== 'string' || !entry.trim()) ||
      !template.display?.host?.trim() || !template.display?.screenHost?.trim() || !template.display?.contentRoot?.trim() ||
      template.display.layers?.map((layer) => layer.id).join(',') !== LAYERS.join(',') ||
      template.display.layers.some((layer) => !['mount', 'owner', 'input', 'cleanup'].every((key) => Boolean(layer[key]?.trim())) || typeof layer.optional !== 'boolean') ||
      template.display.layers.find((layer) => layer.id === 'popups').optional) {
    throw new WorkflowError(`${stack} 游戏架构模板缺少固定入口或显示层`, 'PACKAGE_INVALID');
  }
  return { template, sha256: digest(source) };
}

/** 计算实际文件内容身份，后续的确认与挂载均绑定该版本。 */
function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

/** 校验本阶段引用的真实、非空工件，并返回规范化身份。 */
function checkRef(repo, ref, label) {
  if (!ref?.path || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new WorkflowError(`${label} 必须提供路径及 SHA-256`);
  requireFile(repo, ref.path, label);
  const file = repoPath(repo, ref.path, label);
  const content = readFileSync(file.absolute);
  if (!content.length || digest(content) !== ref.sha256) throw new WorkflowError(`${label} 内容为空或与已记录 SHA-256 不符`);
  return { path: file.relative, sha256: ref.sha256, content };
}

/** 解码被校验过的同一份字节，避免提交阶段时发生读写竞态。 */
function decode(content, label) {
  try { return JSON.parse(content); }
  catch { throw new WorkflowError(`${label}不是有效 JSON`); }
}

/** 人工确认必须绑定当前实际目标，并保留真实用户消息和原文。 */
function checkApproval(repo, approval, target, label) {
  const reviewed = checkRef(repo, approval?.targetRef, label);
  if (approval.decision !== 'APPROVED' || !approval.userMessageRef?.trim() || !approval.userText?.trim() ||
      reviewed.path !== target.path || reviewed.sha256 !== target.sha256) {
    throw new WorkflowError(`${label} 缺少对当前目标的明确人工通过`);
  }
}

/** 分阶段核实立项、核心循环和技术方案交接证据。 */
function checkStageSpec(repo, work, phase, spec) {
  if (spec?.schemaVersion !== VERSION || spec.workItemId !== work.workItemId || spec.projectId !== work.projectId ||
      spec.stack !== work.stack || spec.stage !== phase) throw new WorkflowError('游戏阶段记录与当前工作项、技术栈或阶段不匹配');
  if (phase === 1) {
    const concept = checkRef(repo, spec.conceptRef, '已确定的玩法题材构想');
    const initial = checkRef(repo, spec.approval?.targetRef, '初次人工确认的立项构想');
    checkApproval(repo, spec.approval, initial, '立项人工确认');
    if (initial.path !== concept.path || initial.sha256 !== concept.sha256) checkApproval(repo, spec.finalApproval, concept, '立项变更复核');
    const round = checkRef(repo, spec.grillingRef, '阶段 1 Grilling');
    const grilling = decode(round.content, '阶段 1 Grilling');
    if (spec.grillingAfterUserMessageRef !== spec.approval.userMessageRef || grilling?.schemaVersion !== VERSION ||
        grilling.workItemId !== work.workItemId || grilling.status !== 'CLOSED' || !grilling.userMessageRef?.trim() ||
        grilling.userMessageRef === spec.approval.userMessageRef ||
        !Array.isArray(grilling.decisions) || !grilling.decisions.length ||
        grilling.decisions.some((item) => !item?.question?.trim() || !item.answer?.trim() ||
          !item.userMessageRef?.trim() || item.userMessageRef === spec.approval.userMessageRef)) {
      throw new WorkflowError('阶段 1 必须在人工确认后完成一次 Grilling，并保存真实答复');
    }
  } else if (phase === 2) {
    checkRef(repo, spec.productRef, '产品定义');
    const prototype = checkRef(repo, spec.prototypeRef, '核心循环原型');
    if (!['start', 'action', 'resolution', 'feedback', 'result'].every((key) => typeof spec.gameLoop?.[key] === 'string' && spec.gameLoop[key].trim())) {
      throw new WorkflowError('Game Loop 须记录开始、动作、判定、反馈和结果');
    }
    checkApproval(repo, spec.approval, prototype, 'Game Loop 人工验收');
  } else {
    checkRef(repo, spec.architectureRef, '项目架构方案');
    const { template, sha256 } = gameArchitectureTemplate(repo, work.stack);
    if (spec.templateVersion !== template.templateVersion || spec.templateSha256 !== sha256) {
      throw new WorkflowError('阶段 3 必须绑定当前技术栈的固定架构模板版本及 SHA-256');
    }
  }
}

/** 复验保存过的阶段记录及其来源，失效时要求退回受影响阶段。 */
function checkCompletedStages(repo, work, count) {
  for (let phase = 1; phase <= count; phase += 1) {
    const ref = checkRef(repo, work.gameStageRefs?.[phase], `第 ${phase} 阶段记录`);
    checkStageSpec(repo, work, phase, decode(ref.content, `第 ${phase} 阶段记录`));
  }
}

/** 逐段推进从零游戏，或有明确理由地撤销最早受影响阶段及其下游记录。 */
export async function advanceGameStage({ repo, workItem, specPath, returnTo, reason, loadWork }) {
  return withWorkLock(repo, workItem, async () => {
    const work = loadWork(repo, workItem);
    if (!isGameProject(work)) throw new WorkflowError('game-stage 只适用于游戏 PROJECT');
    const phase = PROJECT_STAGES.indexOf(work.stageId) + 1;
    const completed = work.globalState === 'COMPLETE';
    if (returnTo !== undefined) {
      if (!Number.isInteger(returnTo) || returnTo < 1 || returnTo > phase || !reason?.trim()) throw new WorkflowError('回退须指定当前或更早的游戏阶段和真实原因');
      for (let id = returnTo; id <= PROJECT_STAGES.length; id += 1) delete work.gameStageRefs[id];
      work.stageId = PROJECT_STAGES[returnTo - 1];
      work.globalState = 'RETURN';
    } else {
      if (completed) throw new WorkflowError('游戏技术方案已完成，变更前请先回退');
      checkCompletedStages(repo, work, phase - 1);
      requireFile(repo, specPath, '阶段记录');
      const file = repoPath(repo, specPath, '阶段记录');
      const bytes = readFileSync(file.absolute);
      checkStageSpec(repo, work, phase, decode(bytes, '阶段记录'));
      work.gameStageRefs[phase] = { path: file.relative, sha256: digest(bytes) };
      work.stageId = PROJECT_STAGES[phase] ?? work.stageId;
      work.globalState = phase === PROJECT_STAGES.length ? 'COMPLETE' : 'INTAKE';
    }
    delete work.blockedRecord;
    work.revision += 1;
    const metadata = returnTo !== undefined ? { reason } : {};
    if (returnTo !== undefined) work.gameReturnReason = reason;
    else delete work.gameReturnReason;
    await atomicWriteJson(repo, workItem, work);
    return response({ status: 'PASS', work, changed: true, metadata });
  });
}

/** 在工作流的工作项目录查找同项目记录，标准命令无需重复提供来源路径。 */
function findWork(repo, match) {
  const directory = resolve(repo, WORK_ITEMS);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .flatMap(({ name }) => {
      const path = `${WORK_ITEMS}/${name}`;
      // 自动发现隔离损坏的旁支，显式绑定来源继续执行严格读取。
      try {
        const work = readJson(repo, path, '工作项');
        return match(work) ? [{ path, work }] : [];
      } catch (error) {
        if (!(error instanceof WorkflowError) || !['INVALID_INPUT', 'NOT_FOUND'].includes(error.code)) throw error;
        return [];
      }
    });
}

/** 确认用途不同的工作项仍引用同一份项目阶段基线。 */
export function assertSameGameProject(repo, work, source, label) {
  const expected = work.gameProjectRef;
  const actual = source.gameProjectRef;
  if (expected && (!actual || actual.sha256 !== expected.sha256 ||
      fileIdentityKey(repo, actual.path) !== fileIdentityKey(repo, expected.path))) {
    throw new WorkflowError(`${label}未绑定当前游戏阶段 1–3 的同一基线`);
  }
}

/** 产品重新确认也能使旧任务失效，即使技术方案没有改动。 */
function gameProjectDigest(project) {
  return digest(JSON.stringify([1, 2, 3].map((phase) => project.gameStageRefs?.[phase]?.sha256)));
}

/** 判断标准目录中的项目是否管理此后续工作项。 */
function matchesGameProject(work, item) {
  return isGameProject(item) && item.stack === work.stack && item.projectId === work.projectId;
}

/** 新建后续任务时固定游戏方案来源和适用挂载点。 */
export function bindGameArchitecture(repo, work, { source, mount }) {
  if (!GAME_STACKS.includes(work.stack) || work.workItemType === 'PROJECT' || work.workItemType === 'RELEASE') {
    if (source !== undefined || mount !== undefined) throw new WorkflowError('游戏架构来源和挂载点仅适用于游戏研发的后续工作项');
    return;
  }
  const sameGame = (item) => matchesGameProject(work, item);
  const matches = source === undefined ? findWork(repo, sameGame) : [{ path: source, work: readJson(repo, source, '游戏项目方案') }];
  if (!matches.length && mount === undefined) return;
  if (matches.length !== 1 || !sameGame(matches[0].work)) throw new WorkflowError('请提供唯一且同项目、同技术栈的 --game-project');
  const project = matches[0].work;
  if (project.stageId !== PROJECT_STAGES.at(-1) || project.globalState !== 'COMPLETE') throw new WorkflowError('阶段 3 技术方案完成后才能绑定游戏工程');
  checkCompletedStages(repo, project, PROJECT_STAGES.length);
  work.gameProjectRef = { path: repoPath(repo, matches[0].path, '游戏项目方案').relative, sha256: gameProjectDigest(project) };
  if (work.workItemType === 'FOUNDATION' && work.workflowMode === 'light') throw new WorkflowError('从零游戏的阶段 4 基础工程使用标准模式');
  if (work.workItemType === 'SCENE') {
    work.gameMount = mount ?? 'content';
    if (!['content', 'hud'].includes(work.gameMount)) throw new WorkflowError('SCENE 须挂到游戏内容或 HUD');
  } else if (work.workItemType === 'DISPLAY_LAYER') {
    work.gameMount = work.visual.layerType === 'toast' ? 'toasts' : 'popups';
    if (mount !== undefined && mount !== work.gameMount) throw new WorkflowError('瞬态显示层挂载点须匹配类型');
  } else if (mount !== undefined) throw new WorkflowError('只有可见模块需要指定 --mount-layer');
}

/** 生产前核对项目上游未失效，并要求当前架构的基础工程已实际完成。 */
export function assertGameProjectReady(repo, work, verifyFoundation) {
  if (!work.gameProjectRef) {
    // 保留独立增量任务，但同项目开始使用阶段门后，旧任务不能以缺字段绕过。
    if (GAME_STACKS.includes(work.stack) && !['PROJECT', 'RELEASE'].includes(work.workItemType) &&
        findWork(repo, (item) => matchesGameProject(work, item)).length) throw new WorkflowError('当前游戏已有 PROJECT，后续工作项必须绑定游戏阶段基线');
    return;
  }
  const project = readJson(repo, work.gameProjectRef.path, '游戏项目方案');
  if (!matchesGameProject(work, project) ||
      project.stageId !== PROJECT_STAGES.at(-1) || project.globalState !== 'COMPLETE' ||
      gameProjectDigest(project) !== work.gameProjectRef.sha256) {
    throw new WorkflowError('当前工作项的阶段 3 方案尚未完成或阶段 1–3 基线已变更');
  }
  checkCompletedStages(repo, project, PROJECT_STAGES.length);
  if (work.workItemType === 'FOUNDATION') return;
  const foundations = findWork(repo, (item) => item.workItemType === 'FOUNDATION' && item.stack === work.stack && item.projectId === work.projectId &&
    item.gameProjectRef?.path === work.gameProjectRef.path && item.gameProjectRef.sha256 === work.gameProjectRef.sha256 && item.globalState === 'COMPLETE');
  if (!foundations.length) throw new WorkflowError('先完成同一技术方案的阶段 4 基础工程');
  for (const { work: foundation, path } of foundations) {
    try {
      verifyFoundation(repo, bindWorkSource(foundation, path));
      return;
    } catch (error) {
      if (foundations.length === 1) throw error;
    }
  }
  throw new WorkflowError('同一架构的阶段 4 工程证据已失效');
}

/** 检查阶段 4 原生回读是否覆盖固定入口、必需挂载点和空弹窗层。 */
export function assertGameArchitectureStructure(repo, work, manifest) {
  if (!work.gameProjectRef) return;
  const { template } = gameArchitectureTemplate(repo, work.stack);
  for (const item of manifest.items.filter((entry) => entry?.category === 'architecture-structure' && entry.status === 'PASS')) {
    const report = readJson(repo, item.path, '游戏架构结构回读');
    const rows = report.layers;
    if (report.schemaVersion !== VERSION || report.workItemId !== work.workItemId || report.stack !== work.stack ||
        report.templateVersion !== template.templateVersion || JSON.stringify(report.entryPoints) !== JSON.stringify(template.project.entryPoints) ||
        !Array.isArray(rows) || new Set(rows.map((layer) => layer?.id)).size !== rows.length) continue;
    const ids = rows.map((layer) => layer?.id);
    const actual = template.display.layers.filter((layer) => !layer.optional || ids.includes(layer.id));
    if (actual.length !== rows.length || !actual.every((layer, index) => rows[index]?.id === layer.id && rows[index].mount === layer.mount &&
        typeof rows[index].nativePath === 'string' && rows[index].nativePath.trim()) ||
        rows[0].nativePath.split('/').at(-1) !== template.display.contentRoot ||
        rows.find((layer) => layer?.id === 'popups')?.childCount !== 0) continue;
    const screen = rows.filter(({ id }) => id !== 'content').map(({ id, nativePath }) => ({ id, segments: nativePath.split('/') }));
    const parents = screen.map(({ segments }) => segments.slice(0, -1).join('/'));
    if (screen.some(({ id, segments }) => segments.length < 2 || segments.at(-1) !== SCREEN_NODES[id]) ||
        new Set(parents).size !== 1 || (parents[0] !== template.display.screenHost && !parents[0].endsWith(`/${template.display.screenHost}`))) continue;
    const source = checkRef(repo, report.nativeSourceRef, '已回读的正式场景或显示宿主来源');
    if (source.path === repoPath(repo, item.path).relative) throw new WorkflowError('架构回读不能把报告自身作为工程来源');
    // Studio 的入口由 Place 的原生路径表达，其余引擎还可以检查落盘源码。
    if (work.stack !== 'roblox') for (const entry of report.entryPoints) requireFile(repo, entry, '正式启动源码');
    return;
  }
  throw new WorkflowError('阶段 4 缺少与模板匹配的入口、显示层顺序、挂载点或空弹窗层回读');
}

/** 在 V5 通过原生对象路径核对实际挂载，防止只登记模板名称。 */
export function assertGameMount(repo, work, evidence) {
  if (!work.gameMount) return;
  const { template } = gameArchitectureTemplate(repo, work.stack);
  const host = work.stack === 'roblox' ? 'PlayerGui/GameUI' : template.display.screenHost;
  const node = SCREEN_NODES[work.gameMount];
  for (const item of evidence.filter(({ category }) => category === 'architecture-mount')) {
    const report = readJson(repo, item.path, '模块挂载回读');
    if (report.schemaVersion !== VERSION || report.workItemId !== work.workItemId || report.stack !== work.stack ||
        report.hostId !== (work.visual.hostId ?? work.visual.objectId) || report.layer !== work.gameMount ||
        typeof report.nativePath !== 'string' || !report.nativePath.trim()) continue;
    const path = `/${report.nativePath.replace(/^\/+|\/+$/g, '')}`;
    if (node ? !path.includes(`/${host}/${node}/`) : !`${path}/`.includes(`/${template.display.contentRoot}/`) ||
        Object.values(SCREEN_NODES).some((name) => `${path}/`.includes(`/${host}/${name}/`))) continue;
    const source = checkRef(repo, report.nativeSourceRef, '模块原生挂载来源');
    if (source.path === repoPath(repo, item.path).relative) throw new WorkflowError('挂载回读不能把报告自身作为来源');
    return;
  }
  throw new WorkflowError('V5 缺少当前模块在固定挂载点的 architecture-mount 回读');
}

/** V1 退出时冻结同一轮的唯一 Grilling，未发起也记录这一决定。 */
export function freezeGameGrilling(repo, work) {
  if (GAME_STACKS.includes(work.stack) && work.gameGrillingRef === undefined) {
    const path = work.grillingRef?.path ? requireFile(repo, work.grillingRef.path, 'V1 Grilling') : null;
    work.gameGrillingRef = path ? { path, sha256: digest(readFileSync(repoPath(repo, path).absolute)) } : null;
  }
}

/** 防止 V2–V5 或回退到 V1 后把新问答登记成同一轮 Grilling。 */
export function assertGameGrilling(repo, work) {
  const frozen = work.gameGrillingRef;
  if (frozen === undefined && (!work.gameProjectRef || !work.visual || work.visual.stage === 'V1')) return;
  if (frozen === null && !work.grillingRef?.path) return;
  if (frozen && work.grillingRef?.path) {
    const current = repoPath(repo, work.grillingRef.path, 'Grilling 路径');
    if (current.relative === frozen.path) {
      checkRef(repo, frozen, 'V1 已冻结的 Grilling');
      return;
    }
  }
  throw new WorkflowError('阶段 5 的 Grilling 仅在 V1 启动时进行，后续单项变化按变更流程记录');
}
