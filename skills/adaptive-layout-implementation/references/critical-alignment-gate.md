# Critical Alignment Gate

本门禁适用于高保真 target↔Flutter parity。关键元素默认包括品牌/Logo、页面主标题、Hero、主要 CTA、顶部导航标题、居中说明/状态/信任信息和视觉主轴。

每个元素必须具有独立合同 id、稳定 element/reference Flutter key、语义参照、typed 水平与垂直关系、target/Flutter 双方边界与中心、可复算 delta、有限且非负的 `tolerance_logical_px` 和非空 `tolerance_basis`、实际 Widget measurement、同视口双方截图和已执行 test id。按被检属性、逻辑单位、参考条件及目标/测量精度说明容差依据，不设统一像素上限；校验器只检查数值及依据存在，不能判断依据是否合理。几何测量与用户人工视觉确认分别记录。

文字、Logo 与不规则轮廓必须区分 node/container center 和 visible optical center。非零 optical offset 必须有目标测量、设计确认或截图视觉复核证据；光学中心未决时整体 BLOCKED。

`No layout problems`、validator、Golden 或截图采集均不能独立形成视觉通过。validator 只检查规格结构与可复算元数据；由用户人工确认实际组合画面，未经明确授权代理不自动分析截图。
