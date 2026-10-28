/** 将已审阅的旧来源视觉阶段改写为统一阶段，不改变协议版本或产物文件名。 */
export function unifySourceVisualStages(text) {
  if (typeof text !== 'string') throw new TypeError('统一阶段来源正文必须为字符串');
  // 来源段中的显式公共阶段已使用新语义，不应被重复顺延。
  const protectedStages = [];
  const protectedText = text.replace(/公共\s+V[0-5](?:\s*(?:→|–|\/)\s*V[0-5])*/g, (match) => {
    const marker = `__UNIFIED_PUBLIC_STAGE_${protectedStages.length}__`;
    protectedStages.push(match);
    return marker;
  });
  const stateNames = {
    'v2-production-planning-complete': 'v3-production-planning-complete',
    'v3-formal-acceptance-complete': 'v4-formal-acceptance-complete',
    'v3-formal-acceptance': 'v4-formal-acceptance',
    'v4-runtime-integration-candidate': 'v5-runtime-integration-candidate',
    'v2-ready': 'v3-ready',
    'v4-complete': 'v5-complete',
  };
  const shifted = protectedText
    .replace(/\bv[234]-(?:production-planning-complete|formal-acceptance-complete|formal-acceptance|runtime-integration-candidate|ready|complete)\b/g, (match) => stateNames[match] ?? match)
    .replace(/\bV([1-4])\b/g, (_match, value) => `V${Number(value) + 1}`)
    .replace(/(visual-workflow\.md#)v([1-4])(?=-)/g, (_match, prefix, value) => `${prefix}v${Number(value) + 1}`)
    // 原有完整序列在视觉阶段前新增功能验证，不能遗漏新的 V1。
    .replaceAll('V0→V2', 'V0→V1→V2')
    .replaceAll('V0/V2', 'V0/V1/V2')
    .replaceAll('V0、V2', 'V0、V1、V2')
    .replaceAll('全局规则在 G0/V0 的 brief 与三候选人工选择门中建立，并在确认后正式冻结；之后每个场景的 V2/V3 只冻结该场景的目标和方案，不得把场景 V3 当作全局基线选择。每项写明不变量、量化范围、允许变量、禁止项和证据：', 'V0 识别范围与已有视觉偏好，V1 先实现并验证相关功能，白盒按需使用；V2 建立或复用视觉 brief，并在三候选人工选择后正式冻结全局规则。各场景的 V2/V3 分别确认该场景的目标和方案，不得把场景 V3 当作全局基线选择。每项写明不变量、量化范围、允许变量、禁止项和证据：')
    .replaceAll('玩法视觉契约与必要灰盒', '玩法视觉契约与视觉目标')
    .replaceAll('条件门：低保真机器验证与决策记录', '条件门：视觉目标与决策记录')
    .replaceAll('低保真证据与确认', '功能证据与视觉确认')
    .replaceAll('适用 V2 的路径必须用低保真草图或灰盒证明结构、状态、交互和布局。', 'V1 以可运行功能验证结构、状态、交互和布局；白盒或低保真草图按需使用，不是进入 V2 的前提。')
    .replaceAll('只有结构、交互或节奏尚不能被运行证据证明时制作必要灰盒；不得为了流程完整重复已冻结灰盒。', 'V1 使用临时资源验证功能；结构、交互或节奏需要额外探索时可选用白盒，不将白盒作为强制门槛。')
    .replaceAll('顺序为契约/灰盒、证据关闭、条件分类和决策记录。', '先在 V1 验证功能，V2 定义视觉契约和目标，再完成条件分类和决策记录；白盒按需使用。')
    .replaceAll('foundation-only 基础实施完成后，V2 建立功能规格、玩法视觉契约、必要低保真/灰盒与预算，只定义契约，不写正式场景功能代码；', 'foundation-only 基础实施完成后，V1 建立功能规格并实现、验证功能，低保真或白盒按需使用；V2 在已验证功能基础上确认玩法视觉契约与预算；')
    .replaceAll('V2 冻结功能规格与必要灰盒，V3 冻结拆解和布局事实', 'V1 实现并验证功能，白盒按需使用；V2 确认视觉目标，V3 冻结拆解和布局事实')
    .replaceAll('只在 V2 需要证明结构、交互或节奏时建立隔离的可运行灰盒', '在 V1 需要证明结构、交互或节奏时可建立隔离的可运行白盒')
    .replaceAll('foundation-only 阶段先完成场景无关的 `SHARED`/`MODULE`；V3 布局确认与 V4 资源验收通过后，直接在 V5 启动正式 SCENE 代码。', 'foundation-only 阶段先完成场景无关的 `SHARED`/`MODULE`；V1 按已授权范围实现并验证功能；V3 布局确认与 V4 资源验收通过后，在 V5 完成正式 SCENE 集成。')
    .replaceAll('适用 V2 时检查视觉目标、信息层级、草图/灰盒、交互、布局、失败恢复与预算。', '适用 V2 时检查视觉目标、信息层级、交互、布局、失败恢复与预算；草图或白盒仅在已按需使用时检查。')
    .replaceAll('V2 冻结功能、状态、交互与页面几何。必要灰盒和证据关闭后，', 'V1 实现并验证功能、状态与交互，白盒按需使用。V2 基于已验证功能确认视觉目标和页面几何；')
    .replaceAll('V2 建立功能规格与玩法视觉契约、必要低保真、布局合同和早期预算；基础实施完成后，', 'V1 实现并验证功能，低保真或白盒按需使用。V2 基于已验证功能确认玩法视觉契约、布局合同和早期预算；')
    .replaceAll('决策记录包含候选、范围、契约、灰盒、结构/交互/布局证据和返工影响。', '决策记录包含候选、范围、契约、功能验证证据和返工影响；使用白盒时可附上相关证据。');
  return shifted.replace(/__UNIFIED_PUBLIC_STAGE_(\d+)__/g, (_match, index) => protectedStages[Number(index)]);
}
