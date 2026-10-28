# 正式场景布局校准与参考还原

布局校准在 V5 正式 Cocos Scene 中进行。V5 直接读取 V3 已确认的节点结构、目标 bounds、父子关系、锚点和响应式约束，以及 V4 已验收的正式资源；用户检查实际运行画面，开发者在正式布局配置中调整并复验受影响部分。无需先生成一份独立预览或为预览单独确认。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#正式场景布局校准与参考还原)。

## 校准步骤

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#校准步骤)。

3. V5 修改正式布局配置或 Cocos 实现场景后，重跑受影响的尺寸/状态/交互检查并更新运行证据。上游事实不变时不重复 V3/V4 的确认；实际依赖变更时使相关下游证据失效。
4. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#校准步骤)。

## 布局读数与边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#布局读数与边界)。

V3 图片的基础目标框按完整未裁切正式 SpriteFrame 尺寸定义，主体安全边距与合法光影空间属于内部构图。若冻结图测量只取可见主体，应在 V4 生产前统一画布与主体比例；对节点矩形做中心策略前先检查资源透明留白、比例与 RAW 尺寸。确需光学补偿时，只能在 V3 以带理由的 `center_alignment` reference 策略确认位置；不得在 V5 静默移动对象补偿透明边距、纹理比例或错误尺寸，详见[居中策略与组合定位](./center-alignment.md)。普通固定视觉图片保持 `sprite_geometry={type:'SIMPLE',size_mode:'RAW',content_size:null}` 与 `Sprite.SizeMode.RAW`，运行时 `UITransform.contentSize` 等于正式 SpriteFrame 原尺寸；即使底板 Sprite 同时是组件根并拥有图标/文字子项，分组容器的 bounds、定位参照和布局策略也不得改写内容尺寸。非背景图片自身及祖先在逻辑空间不得缩放或剪切，反馈动画也须遵守；实际显示 bounds 与动画采样另行验收；不能对普通图片使用 `STRETCH`/`FLEX`，也不通过静态缩放底板根掩盖资源尺寸错误。只有已冻结九宫格使用 `SLICED + CUSTOM` 设置底板自身显示框；更新九宫格 `contentSize` 不会等比缩放子项，子项按布局关系单独重排，详见[图片尺寸边界](./cocos-adapter.md#图片原尺寸与九宫格尺寸)。Widget 不用于猜测兄弟定位；兄弟位置参照由共享布局入口按参照 bounds 计算，再换算到实际父级坐标。`ui_layout.visual_overflow` 只允许子项越出非根父框，不放宽 viewport、安全区、裁切或交互边界；文字内容超出目标框仍须按文字合同检查，并确认相邻节点与留白。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#布局读数与边界)。

## 关键几何验收

V3 在 `critical_alignments` 与布局不变量中声明关键对齐线、主区域边距、节点矩形和组间关系，并明确适用视口、scene/state 与语言。节点定位的九点停靠由水平 `left/center/right`、垂直 `top/center/bottom`、自身/参照锚点和偏移表示；根据 resize 后应保持的意图选择，不按当前图像落入的几何九等分格推断。选择 center 的轴按[居中策略与组合定位](./center-alignment.md)区分 strict 与显式 reference，图文组按联合 bounds 居中。它与九宫格纹理拉伸完全独立，也不同于 Creator Node 的中心 `anchorPoint`。V5 对照这些事实并采集同条件的真实 bounds；不同视口按已声明的响应式关系验证，不能把基准绝对坐标套到所有设备。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-layout-calibration.md#关键几何验收)。
