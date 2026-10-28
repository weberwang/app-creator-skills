/** 清理原生参考中已由公共真源接管的全局叙述，保留实际引擎领域条款。 */
export function routeSharedControlText(text, { name, protocol, workflow }) {
  let output = text;
  if (name === 'entry') {
    // 原入口包含过时的全局权限和冻结包语义，逐段删除公共叙述，不能把原生编辑器与资源规则一起抹掉。
    output = output.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    output = output.replace(/^# .*全局工作流控制\s*$/m, '# 本栈技术控制补充');
    output = output.replace(/^本 Skill 是[^\n]*(?:\r?\n)?/m, `公共工作流和控制器以${protocol}为准；本参考只保留本栈技术补充。\n`);
    const common = /^(?:用户日常按 |[1-6]\. (?:读取当前 Work Item|按当前阶段读取|A3 实施前冻结|实施后记录|失败只按证据|阶段任务满足)|\- (?:每个阶段任务完成|提交前检查选定差异|`?\.gitignore`? 不会取消|只做路由或状态查询|需要状态迁移或门判断|需要工件字段|需要视觉任务|`INTAKE|上述停止仅指|A0-A3 |V0→V1|`AUTO` |`check` |只有上游事实|工作流所有任务|普通任务不建立|所有任务和阶段验收|缺少非关键元数据|视觉默认检查|测试按改动风险)|`\$app-creator-workflow` 负责领域编排|公共状态、门禁与返工规则统一见|唯一公共 CLI 的实际命令)/;
    if (output.includes('## 最短主闭环')) output = output.replace(/^- 需要实施结果或证据[^\n]*(?:\r?\n)?/m, '');
    output = output.split(/(?<=\n)/).filter((line) => !common.test(line.trim())).join('');
    output = output.split(/(?<=\n)/).filter((line) => !line.includes('负责领域编排；制作、架构、玩法、视觉')).join('');
    output = output.replaceAll('清理范围与风险仍由本控制面管理', '清理范围与风险按公共控制协议处理');
    output = output.replace(/^弹窗类瞬态显示层按[^\n]*/m, '弹窗与宿主的工作项边界见[场景与显示层职责](../../app-domain-toolkit/references/reference-domain-display-ownership.md)。');
    output = output.replace(/## 当前公共控制入口\s*(?=##|$)/, '');
    output = output.replace(/## 领域协作\s*(?=##|$)/, '');
    if (!output.includes(protocol)) output = `公共控制协议：${protocol}。\n\n${output}`;
  } else if (name === 'simplified-workflow') {
    // 六阶段属于公共产品视图；旧投影器的优先级和字段并非现行 CLI 输出。
    output = output.replace(/^本文件是面向用户的工作流入口。[^\n]*/m, `六阶段和对象视觉闭环见${workflow}，本文件只补充本栈的实施与验收。`);
    output = output.replace(/\| 阶段 ID \| 用户阶段 \| 聚合产物 \| 内部映射 \|[\s\S]*?(?=\r?\n\r?\n)/, `六阶段、阶段身份和交付见${workflow}。`);
    output = output.replace(/^判断有冲突时按“发布[^\n]*(?:\r?\n)?/m, '');
    output = output.replace(/\| 领域步骤（非控制器字段） \| 用户步骤 \| 视觉阶段 \| 关键产物 \|[\s\S]*?(?=\r?\n\r?\n)/, `对象视觉阶段及实际产物见${workflow}。`);
    output = output.replace(/^没有可识别的 `V0`[^\n]*(?:\r?\n)?/m, '');
    output = output.replace(/^简化视图不改变关键门：[^\n]*/m, `具体阶段门禁、证据和授权见${protocol}及${workflow}。`);
    output = output.replace(/例如，V3 完成后可在同一 Work Item 上执行：\r?\n\r?\n```powershell[\s\S]*?```\r?\n\r?\nV4 实际资源验收通过后，[^\n]*/m, `视觉阶段命令和迁移以${protocol}为准。`);
    output = output.replace(/例如，V2 完成后可在同一 Work Item 上执行：\r?\n\r?\n```powershell[\s\S]*?```\r?\n\r?\n公共 V4 实际资源验收通过后，[^\n]*/m, `视觉阶段命令和迁移以${protocol}为准。`);
    output = output.replace(/^V3→V4→V5 在同一场景 Work Item 内按[^\n]*/m, `视觉阶段和证据按${workflow}执行。`);
    output = output.replace(/^公共 V1 先验证功能，白盒可选；V2→V3→V4→V5 在同一场景 Work Item 内按[^\n]*/m, `视觉阶段和证据按${workflow}执行。`);
    output = output.replace(/^当前状态与命令输出以[^\n]*visual-stage[^\n]*/m, `命令和状态见${protocol}。`);
    output = output.replace('## 四步单场景视图', '## 四步单场景视图\n\n本栈统一使用 V0–V5；V1 可直接实现和验证功能，白盒可选。');
    output = output.replace('### 序列帧路线映射', '### 序列帧路线映射\n\n帧动画阶段与统一工作流一致，V3–V5 依次处理拆解、资源与运行验收。');
  } else if (name === 'control-model') {
    // 顺序状态由控制器执行合同维护；单独命令不能借助旧文档推断缓存行为。
    output = output.replace(/^进入 IMPLEMENTING 时，当前公共控制器[^\n]*/m, `实施顺序和当前结果按${protocol}执行。`);
    output = output.replace(/^同一命令内，`loadExecutionState`[^\n]*\r?\n全局实施顺序[^\n]*/m, `基础、场景和显示层顺序按${workflow}及各自的视觉证据执行。`);
  } else if (name === 'schemas' && output.includes('## 场景还原 schema 与验证命令')) {
    output = output.replace(/^当前公共控制器只维护绑定 Work Item[^\n]*/m, `公共执行状态和结果见${protocol}。`);
    output = output.replace(/^证据必须绑定工作项、批次、时间、实际命令输出[^\n]*/m, `公共证据、验证与批准字段以${protocol}为准。`);
    output = output.replace(/^所有 SHA、hash、fingerprint 摘要字段[^\n]*/m, '摘要和实际验收见[按实际完成情况验收](../../app-domain-toolkit/references/reference-domain-completion.md)。');
    output = output.replace(/^当前控制器默认记录路径：\r?\n\r?\n```text[\s\S]*?```\r?\n\r?\n领域视觉产物[^\n]*/m, `公共记录路径见${protocol}。`);
    output = output.replace(/^(?:具体受保护动作、目标和批准消息|Execution Result、Evidence Manifest 和当前执行顺序|实施包路径、验收命令或结果变化时|当前公共控制器不使用独立批准台账|当前公共控制器没有并行委派批次命令)[^\n]*(?:\r?\n)?/gm, '');
    output = output.replace('## 视觉阶段 Schema', '## 视觉阶段 Schema\n\n全局视觉基线的本栈结构见[选择证据 Schema](./global-visual-baseline-selection.schema.json)，由本栈校验器检查真实文件。');
    // highFidelityPrerequisite 约束原生视觉生产，不能阻断公共 V1 的功能实施。
    output = output.replace('一旦声明正式入口或可见资源消费等视觉行为', '一旦声明正式视觉资源消费等视觉行为');
    output = output.replace('混入 `SCENE`/`DISPLAY_LAYER`/`INTEGRATION` 的包在 V3 `v3-production-planning-complete` 和 V4 正式资源验收通过后即可实施。', '视觉装配在 V3 `v3-production-planning-complete` 和 V4 正式资源验收通过后实施；V1 可先直接实施并验证功能，白盒可选，不依赖视觉目标。');
    output = output.replace('SCENE/DISPLAY_LAYER 必须填写严格的 `highFidelityPrerequisite`', '本栈原生视觉生产合同的 SCENE/DISPLAY_LAYER 必须填写严格的 `highFidelityPrerequisite`');
    output = output.replace('控制面复核任务、candidateVersion、scene/layer/host 与实际文件归属一致。', '本栈领域校验器复核任务、candidateVersion、scene/layer/host 与实际文件归属一致。');
    output = output.replace('## 视觉阶段 Schema', '## 视觉阶段 Schema\n\n各技术栈统一采用 V0–V5，V1 是功能验证，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。');
  } else if (name === 'state-gates') {
    // 全局停止条件归公共协议；保留引擎特有范围或对象规则，避免制造另一套命令门。
    output = output.replace('## 阶段映射', '## 统一阶段');
    output = output.replace(/^- (?:用户请求范围变化|首次模块或边界变化|架构或视觉方案选择|路径、外部目标|验证通过但实际 diff|发布：)[^\n]*(?:\r?\n)?/gm, '');
    output = output.replace(/^- 非 [^\n]*`OUT_OF_SCOPE`[^\n]*/m, '- 本栈原生校验器仅检查其技术栈对象；跨栈任务仍按公共控制协议执行。');
    output = output.replace(/^场景与弹窗按\[独立工作项规则\][^\n]*/m, '场景和弹窗按[场景与显示层职责](../../app-domain-toolkit/references/reference-domain-display-ownership.md)分别验收。');
    output = output.replace('## 强制停止门', `## 强制停止门\n\n状态、范围与停止条件以${protocol}为准。`);
  }
  if (name === 'entry') {
    // 规则移出后只清除确实为空的旧章节，保留仍有本栈内容的渐进读取说明。
    output = output.replace(/## 宽松执行原则\s*$/, '')
      .replace(/^## 渐进式读取[ \t]*\r?\n(?:[ \t]*\r?\n)*(?=## )/m, '');
  }
  return `${output.trimEnd()}\n`;
}
