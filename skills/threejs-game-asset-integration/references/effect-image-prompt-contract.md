# Effect-image 生成式位图忠实还原提示词合同

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#effect-image-生成式位图忠实还原提示词合同)。

本提示词只适用于 V3 已冻结为 `selected_route=image-asset` 且 `image_generation_required=true` 的区域；它负责生成合同，不负责选择生产路线。文本、纯色框体和基础几何等区域不能因为静态或“像 UI 资产”而自动进入图片提示词。已冻结 `image_generation_required=true` 的合同也不能被提示词生成器改成 ThreeJS 原生实现；生产方式变化须有明确接受的 Change Request。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#effect-image-生成式位图忠实还原提示词合同)。

## 全局提示词

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#全局提示词)。

直接 Alpha 路线只有在当前工具对声明的 `edge_profile` 有可核对能力证据时才可使用。generation record 顶层记录 `generator/generator_version`，嵌套 `capability.tool/tool_version` 必须与其一致；同时记录真实透明输出格式和能力证据，原始输出 SHA 仅作可选追踪。V4/V5 必须解码 PNG 的像素证明存在真实透明值，不能只依据扩展名、提示词或工具参数声明。遮罩合成路线记录原始输入、独立 mask、合成输出各自路径、mask 处理工具/版本、参数与证据。工具无法可靠保留所需的半透明、辉光、柔和阴影、毛发、玻璃或混合边缘时，报告能力缺口，改用已验证的直接 Alpha、独立遮罩/人工创作、重新生成或有明确合同的 ThreeJS 特效；不得提高容差、硬抠轮廓、删除光效或伪造透明结果。已有真实透明图按资源复用合同接入，不伪造生成或去背记录。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#全局提示词)。

## 禁止与必须

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#禁止与必须)。

## asset_prompt 继承规则

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#asset_prompt-继承规则)。

## 结构化生成记录

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#结构化生成记录)。

## 全局视觉基线绑定

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#全局视觉基线绑定)。

## V5 同屏组合

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-prompt-contract.md#v5-同屏组合)。

## 本栈配套资料

- [九宫格合同](./nine-slice-ui.md)
- [游戏美术体验与质量契约](./art-quality-contract.md)
- [效果图文案约束](../../threejs-game-ui-layout/references/game-copy.md#效果图生成)
- [`visual-reconstruction.md`](./visual-reconstruction.md)
- [`asset-production-routes.md`](./asset-production-routes.md)
- [`visual-production-pipeline.md`](./visual-production-pipeline.md)
- [`effect-image-prompt-contract.mjs`](../../threejs-domain-contracts/scripts/effect-image-prompt-contract.mjs)
