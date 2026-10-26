/** 能力入口是唯一可发现技能；源栈目录只承载完整原生适配与工具载荷。 */
export const CORE_SKILLS = Object.freeze(['app-creator-workflow', 'app-workflow-control', 'grilling', 'app-asset-workflow']);

/** 按工作成果划分能力，维度或技术路线差异在原生适配模式中区分。 */
export const CAPABILITY_GROUPS = Object.freeze([
  { name: 'app-product-planning', title: '产品与游戏需求', members: { unity: ['unity-game-production'], cocos: ['cocos-game-production'], phaser: ['phaser4-game-production'], threejs: ['threejs-game-production'], flutter: ['flutter-product-spec'] }, workflows: ['game-production'] },
  { name: 'app-architecture', title: '技术架构与模块设计', members: { unity: ['unity-game-architecture'], cocos: ['cocos-game-architecture'], phaser: ['phaser4-game-architecture'], threejs: ['threejs-game-architecture'], flutter: ['flutter-tech-design'] }, workflows: ['architecture-handoff'] },
  { name: 'app-gameplay-development', title: '游戏玩法实现', members: { unity: ['unity-gameplay-development'], cocos: ['cocos-gameplay-development'], phaser: ['phaser4-gameplay-development'], threejs: ['threejs-gameplay-development'] }, workflows: ['gameplay-implementation'] },
  { name: 'app-audio', title: '游戏音频', members: { unity: ['unity-game-audio'], cocos: ['cocos-game-audio'], phaser: ['phaser4-game-audio'], threejs: ['threejs-game-audio'] }, workflows: ['audio', 'audio-implementation'] },
  { name: 'app-game-balance', title: '游戏数值与经济', members: { unity: ['unity-game-balance'], cocos: ['cocos-game-balance'], phaser: ['phaser4-game-balance'], threejs: ['threejs-game-balance'] }, workflows: ['balance'] },
  { name: 'app-feedback', title: '游戏与应用汁水设计', members: { unity: ['unity-game-juice'], cocos: ['cocos-game-juice'], phaser: ['phaser4-game-juice'], threejs: ['threejs-game-juice'] }, authoredAdapters: [{ stack: 'flutter', sourceSkill: 'flutter-feedback', mode: 'Flutter 应用交互反馈', when: '为 Flutter 应用设计或实现按钮、表单、导航、手势、异步操作、状态过渡或触觉反馈时使用；先采用公共设计，再按 Widget 与路由生命周期实现。' }], workflows: ['juice', 'feedback-lifecycle'] },
  { name: 'app-release', title: '候选交付与发布准备', members: { unity: ['unity-game-release'], cocos: ['cocos-game-release'], phaser: ['phaser4-game-release'], threejs: ['threejs-game-release'], flutter: ['flutter-release-readiness'] }, workflows: ['release'] },
  { name: 'app-quality-review', title: '质量审核与性能验证', members: { unity: ['unity-game-qa-performance'], cocos: ['cocos-game-qa-performance'], phaser: ['phaser4-game-qa-performance'], threejs: ['threejs-game-qa-performance'], flutter: ['flutter-quality-review', 'flutter-ux-ui-quality'] }, workflows: ['quality-verification'] },
  { name: 'app-animation', title: '动画制作与接入', members: { unity: ['unity-game-2d-animation-ta', 'unity-game-3d-animation'], cocos: ['cocos-frame-animation'], phaser: ['phaser4-frame-animation'], threejs: ['threejs-frame-animation'] }, reuses: [{ stack: 'unity', sourceSkill: 'unity-game-2d-rigging', mode: '2D 角色动作生产', when: '需要制作或修订 Unity 2D 角色的 AnimationClip、AnimatorController、动作变体及真实角色播放时读取；骨架绑定本身仍由角色绑定能力维护。' }], workflows: ['frame-animation', 'frame-animation-execution'] },
  { name: 'app-character-rigging', title: '角色骨架与绑定', members: { unity: ['unity-game-2d-rigging', 'unity-game-3d-rigging'] }, workflows: [] },
  { name: 'app-3d-modeling', title: '三维几何建模', members: { unity: ['unity-game-3d-modeling'], cocos: ['cocos-game-3d-modeling'], threejs: ['threejs-game-3d-modeling'] }, workflows: ['modeling-production'] },
  { name: 'app-3d-texturing', title: '三维材质与贴图生产', members: { unity: ['unity-game-3d-texturing'] }, workflows: [] },
  { name: 'app-spine-reskin', title: 'Spine 生成式换皮', members: { unity: ['unity-game-spine-reskin'], cocos: ['cocos-spine-generative-reskin'], phaser: ['phaser4-spine-generative-reskin'] }, workflows: ['spine-reskin-production'] },
  { name: 'app-ui-layout', title: '界面布局与自适应', members: { cocos: ['cocos-game-ui-layout'], phaser: ['phaser4-game-ui-layout'], threejs: ['threejs-game-ui-layout'], flutter: ['adaptive-layout-implementation'] }, reuses: [{ stack: 'unity', sourceSkill: 'unity-game-visual-assets', mode: 'Unity UI 结构与布局接入', when: '需要 Unity Canvas、Prefab、UXML、UI Toolkit/uGUI 的结构、锚点、安全区、布局和正式界面接入时读取，并按原生规范调用 unity:ui 路由。' }], workflows: ['ui-layout'] },
  { name: 'app-artifact-cleanup', title: '项目整理与产物清理', members: { cocos: ['cocos-game-artifact-cleanup'], phaser: ['phaser4-game-artifact-cleanup'], threejs: ['threejs-game-artifact-cleanup'] }, authoredAdapters: [
    { stack: 'unity', sourceSkill: 'unity-artifact-cleanup', mode: 'Unity 项目整理与清理', when: '整理 Unity 项目目录、移动或重命名资源、判定并清理中间产物时使用；遵循公共流程及 Unity 资源身份、导入器和序列化引用规则。' },
    { stack: 'flutter', sourceSkill: 'flutter-artifact-cleanup', mode: 'Flutter 项目整理与清理', when: '整理 Flutter 项目目录、移动或重命名资源、判定并清理中间产物时使用；遵循公共流程及 Dart 导入、pubspec、生成代码和资源清单规则。' },
  ], workflows: ['artifact-cleanup', 'artifact-cleanup-execution'] },
  { name: 'app-image-optimization', title: '图片优化', members: { cocos: ['cocos-game-image-optimization'], phaser: ['phaser4-game-image-optimization'], threejs: ['threejs-game-image-optimization'] }, workflows: ['image-optimization'] },
  { name: 'app-ad-integration', title: '游戏广告接入', members: { cocos: ['cocos-game-ad-integration'], phaser: ['phaser4-game-ad-integration'], threejs: ['threejs-game-ad-integration'] }, workflows: ['advertising-integration'] },
  { name: 'app-3d-asset-pipeline', title: '三维资源与运行管线', members: { threejs: ['threejs-game-model-pipeline'] }, workflows: [] },
  { name: 'app-runtime-plugins', title: '运行时插件与扩展', members: { threejs: ['threejs-game-plugins'] }, workflows: [] },
  { name: 'app-project-foundation', title: '项目初始化与基础运行时', members: { threejs: ['threejs-game-runtime'], flutter: ['flutter-project-init'] }, workflows: [] },
  { name: 'app-ui-code-sketch', title: '界面代码草图', members: { flutter: ['flutter-code-sketch'] }, workflows: [] },
  { name: 'app-asset-workflow', title: '视觉素材生产', core: true, members: { unity: ['unity-game-visual-assets'], cocos: ['cocos-game-asset-integration'], phaser: ['phaser4-game-asset-integration'], threejs: ['threejs-game-asset-integration'], flutter: ['flutter-asset-atlas', 'flutter-hifi-mockup'] }, workflows: ['asset-production'] },
  { name: 'app-creator-workflow', title: '开发编排与实施交接', core: true, members: { flutter: ['flutter-implementation-plan', 'flutter-subagent-delivery'] }, workflows: [] },
]);

/** 按实际源技能身份查找唯一能力入口，不保留同职责的技术栈别名。 */
export function capabilityForSourceSkill(stack, sourceSkill) {
  return CAPABILITY_GROUPS.find((group) => group.members[stack]?.includes(sourceSkill)) ?? null;
}

/** 迁移时逐源暂存的路径；最终发布只保留五栈手册，不分发这些中间适配文件。 */
export function nativeAdapterPath(sourceSkill) {
  return `skills/${sourceSkill}/ADAPTER.md`;
}

/** 一个技术栈只维护一份原生手册，能力与模式在手册内定位。 */
export function nativeContractPath(stack) {
  if (!['unity', 'cocos', 'phaser', 'threejs', 'flutter'].includes(stack)) throw new Error(`原生手册技术栈无效：${stack}`);
  return `skills/app-stack-${stack}/references/native-contracts.md`;
}

/** 来源身份作为稳定章节键，合并文件不会混淆2D/3D或其他专业模式。 */
export function nativeSectionId(sourceSkill) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(sourceSkill)) throw new Error(`原生模式身份无效：${sourceSkill}`);
  return `mode-${sourceSkill}`;
}

export { extractNativeSection } from '../skills/app-skill-runtime/native-contracts.mjs';

/** 展开一个能力的所有原生模式，多个模式不能因入口合并而丢失。 */
export function capabilityAdapters(group) {
  return [...Object.entries(group.members).flatMap(([stack, names]) => names.map((sourceSkill) => ({ stack, sourceSkill, path: nativeContractPath(stack), section: nativeSectionId(sourceSkill) }))),
    ...(group.reuses ?? []).map((adapter) => ({ ...adapter, path: nativeContractPath(adapter.stack), section: nativeSectionId(adapter.sourceSkill), reused: true })),
    ...(group.authoredAdapters ?? []).map((adapter) => ({ ...adapter, path: nativeContractPath(adapter.stack), section: nativeSectionId(adapter.sourceSkill), authored: true }))];
}
