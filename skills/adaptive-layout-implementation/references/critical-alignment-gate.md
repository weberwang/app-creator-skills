# Critical Alignment Gate

本门禁适用于高保真 target↔Flutter parity。关键元素默认包括品牌/Logo、页面主标题、Hero、主要 CTA、顶部导航标题、居中说明/状态/信任信息和视觉主轴。

每个元素必须具有独立合同 id、稳定 element/reference Flutter key、语义参照、typed 水平与垂直关系、target/Flutter 双方边界与中心、可复算 delta、`<= 1 logical px` 容差、实际 Widget measurement、同视口双方截图和已执行 test id。几何测量与截图视觉复核缺一不可。

文字、Logo 与不规则轮廓必须区分 node/container center 和 visible optical center。非零 optical offset 必须有目标测量、设计确认或截图视觉复核证据；光学中心未决时整体 BLOCKED。

`No layout problems`、validator、Golden 或单独目测均不能独立形成 PASS。validator 只检查规格结构与可复算元数据，Visual QA 才能确认实际 parity。
