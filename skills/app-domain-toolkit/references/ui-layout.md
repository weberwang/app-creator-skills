# 界面布局生产

本规范是列入迁移清单的技术栈共用的完整规则。每段标明适用栈；执行时同时读取本栈技能的原生约束与“本栈配套资料”，资料路径和具体工具由栈入口维护。公共状态与授权仍由 app-workflow-control 管理。

各技术栈统一使用 V0–V5，V1 验证功能且白盒可选，V2–V5 依次完成视觉目标、拆解布局、资源导入和运行验收。

## 完整流程

### 专业执行与交付（cocos、phaser、threejs）

将 UI 布局从页面坐标修补转换为可追踪的布局合同，并把合同、实现、运行时证据接入全局控制面。仅负责布局关系、坐标空间、尺寸策略、响应式重排和布局证据；不拥有全局状态、审批、玩法规则、资源生产、视觉方向或发布放行。

### 视觉语言默认原则（cocos、phaser、threejs）

玩家可见内容按“游戏内文案”（见本栈配套资料）优先用图片、图标、数字、符号和视觉状态表达；如金币图标 `+100` 已表达奖励，不再写「获得 100 金币」。必须有文字时只保留必要的短名称、短动作或短状态。图标有歧义、首次必要引导或操作后果无法直接看懂时，补充最少说明；精确数值本身不要求解释句。无障碍名称保留但不必成为可见标签。F2 检查重复说明、数值归属、通用图标堆叠和功能自解释性。

### 视觉语言默认原则（cocos、phaser、threejs）

程序化文本默认交付简体中文 `zh-CN`，英语 `en` 等其他语言按项目初始化时确认的清单交付，并逐语言验证字形宽度、字体回退、基线与容器适配。统一按[文本宽度、缩放与换行](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)固定文本宽度，根据用途自行判断：标题、按钮等使用 `single-line` 并在设计字号与具体最小可读字号之间自动缩放，长描述使用 `wrap` 并按内容增高或进入指定滚动区。各语言记录与用途一致的模式，不因翻译变长将标题改成多行；禁止截断、内容撑宽及突破字号下限，达到下限仍放不下时调整文案或正式布局并重验。倍率使用 `x{value}`，数值变化使用对应图标与 `+10` 等表达；本地化不应把图标与数值重新扩写成解释句。

### 视觉语言默认原则（cocos、phaser、threejs）

布局验收默认使用 `visual_validation.mode=usability`：位置、尺寸、边距、换行和少量对齐差异只要保持清晰、可读、可操作且不越界、裁切或关键遮挡即可通过；effect-image 也不自动启用 `exact`。只有用户明确要求像素级还原或项目合同明确指定时才选择 `exact`，启用严格容差、逐项 delta 和全视口/全状态矩阵。V3 仍必须保留拆解顺序、父子归属、锚点语义和内部几何一致性。

### 视觉语言默认原则（cocos、phaser、threejs）

用户明确要求参考布局一致时，在已有关键项中声明适用视口和几何容差；已声明的关键矩形约束即使在 usability 模式也必须满足。这只收紧所声明的项目要求，不自动启用整屏像素差或全矩阵。实际可见主体、字形与布局矩形的差别按校准参考由用户检查。

### 视觉语言默认原则（cocos、phaser、threejs）

九宫格 UI 的源图生产尺寸、切片边宽和目标显示框分别声明，读取“拆解时确定九宫格”（见本栈配套资料）。V3 节点和 V4 expected asset 使用同一合同，V5 直接按此合同装配；文字默认禁止实际内容超出目标框，显式允许溢出时仍需人工检查邻项与留白。

### 核心流程（cocos、phaser、threejs）

按 “证据矩阵”（见本栈配套资料） 生成 `orientationPolicy.allowed` 对应的代表性视口、关键状态和窄/宽尺寸证据；只支持单一方向时不验证另一方向，但仍覆盖同方向尺寸、DPR 和同页连续 resize。关键 UI/HUD 记录稳定 element/reference ID、双轴关系、目标/运行测量、实际测试 ID/状态、视觉证据和项目定义容差。V5 还必须记录 CSS/backing 尺寸、raw/effective DPR、Camera、输入命中、同页 resize 和独立 DISPLAY_LAYER 轨迹。`exact` 或明确的全覆盖需求才扩展到完整矩阵和严格 delta，方向轴仅覆盖项目支持方向。

### 核心流程（cocos、phaser、threejs）

按 “工作流门禁”（见本栈配套资料） 接入 V0、V1、V2、V3、V4、V5、F0–F4 和 G0–G3；只有布局结构、父子归属或参照关系真实变化才退回最早受影响的 V2/V3，普通位置/尺寸调整更新正式布局配置并重验受影响区域，F3 只接受绑定当前候选的工程证据。

### 核心流程（cocos、phaser）

正式场景的设计画布尺寸、主轴与另一轴的展开或裁切规则由项目布局合同定义；合同采用固定设计视口时，可使用 `assets/fixed-design-viewport.mjs`。设备 CSS 像素只决定显示尺寸。背景必须覆盖完整可见场景，位置由合同与实际视口共同决定，不能用编辑器中的拖动或临时偏移改变冻结目标。

### effect-image 场景绑定（cocos、phaser、threejs）

V3 的布局决策顺序固定为“代理内部生成拆解事实和技术 JSON → 展示编号拆解图并人工确认 → 代理自动生成双轴对齐决策及独立布局图（按需生成交互审阅页） → 展示布局图并独立确认 → 冻结 V3”。用户可直接按图号指出拆解或布局需要调整，代理更新技术事实并重出相应图片；不另行等待文字方案确认。布局生成入口仍拒绝未确认拆解、缺失决策、元素漏绑或未绑定当前 scene/state/target 的输入；两次图像确认分别绑定上游拆解、视觉决策文件和最终布局图身份。

### 资源导航（cocos、phaser、threejs）

场景 `display_layer_planning` 只记录 scene master 与常驻 HUD。modal/popup 等瞬态弹窗建立独立 DISPLAY_LAYER Work Item，在自身合同中记录宿主场景、生命周期、输入阻断、层级、遮罩、焦点恢复和响应式事实，并于自身 V5 同屏验证打开→交互→关闭后的底层布局恢复。弹窗证据仍绑定 scene/layer/host，但不进入宿主场景验收。

### 资源导航（cocos、phaser、threejs）

- 需要字段、关系表达或不变量写法时，读取 “references/layout-contract.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 需要对象默认锚点、例外或跨层合成顺序时，读取 “references/display-object-layering.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 需要 UI 根节点、父容器职责、`ui_layout` 字段或 V2/V3/V4/V5 节点组织规则时，读取 “references/layout-hierarchy.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 需要 V/F/G 门禁、退回和候选绑定规则时，读取 “references/workflow-gates.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 需要组合测试、等价类削减或冻结 Golden 条件时，读取 “references/evidence-matrix.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 需要布局审阅页、同批产物、坐标映射、摘要追踪或离线安全边界时，读取 “references/layout-review-artifacts.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 需要在正式场景中批量校准、检查对齐/间距或判断还原偏差来源时，读取 “references/layout-calibration.md”（见本栈配套资料）。

### 资源导航（cocos、phaser、threejs）

- 合同验证器只接受 JSON-compatible YAML（合法 YAML 1.2 的 JSON 子集），详见合同参考；直接使用 Node.js `JSON.parse`。

### Phaser 4 游戏 UI 布局（phaser、threejs）

UI 布局参照按“场景与弹窗尺寸参照”（见本栈配套资料）统一确定：全屏 UI 的父级是场景，按场景逻辑尺寸相对布局；弹窗有底板时，内容按底板对应功能容器的宽高相对布局；弹窗没有底板时，按宿主场景逻辑尺寸相对布局。弹窗底板容器本身相对场景定位，底板位图与内容一起归属该容器；全屏装饰背景仍是独立显示层。安全区约束关键内容的可见范围，不替换这三种尺寸参照。

### effect-image 场景绑定（phaser、threejs）

当 Work Item 的 `effect_image_reconstruction.applicability=effect-image` 时，布局合同必须携带 `scene_reconstruction_binding`：记录冻结目标文件、scene/state、visual baseline、reconstruction contract 版本、`layout_decomposition_version` 和目标 viewport。`layout_nodes` 中每个节点必须同时绑定一个 `regions`/`scope.ui_ids` 区域和已声明坐标空间，记录参照、双轴锚点、目标 bounds、尺寸策略、层级、裁切、响应式规则与计划测试 ID；同一 coverage region 可以承载多个 layout nodes，但节点间必须使用唯一 `layout_node_id`，多节点区域不能用 region ID 作为有歧义的参照；关键对齐通过 `layout_node_id` 复用这些几何事实。该绑定描述正式 Scene 的目标关系，不能用旧通用布局合同、整屏截图、隐藏覆盖层或绝对叠图代替；只有实际目标内容、父子归属、构图关系或响应式不变量真实变化时，V3→V4 才退回 V2/PROPOSAL。其他 viewport 默认验证合同声明的不变量和可用性；只有 `visual_validation.mode=exact` 或明确精确需求时才要求目标 viewport 的严格还原。
