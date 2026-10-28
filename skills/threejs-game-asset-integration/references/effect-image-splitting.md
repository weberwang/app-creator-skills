# AI 合成栅格效果图拆分

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-splitting.md#ai-合成栅格效果图拆分)。

## 输入

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-splitting.md#输入)。

## 状态先行与拆解粒度

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-splitting.md#状态先行与拆解粒度)。

## 生产

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-asset-effect-image-splitting.md#生产)。

## V5 验收

逐项检查文件存在、透明边缘、完整轮廓、目标缩放、ThreeJS 加载、运行时路径和纹理键；用动态玩法证据确认拆分没有破坏识别、反馈或遮挡。框选图和单图清单发生变化时返回 V4；资源质量失败留在 V5。

## 本栈配套资料

- [程序还原资格与位图回退](./asset-production-routes.md#程序还原资格与位图回退)
- [文字路线判定](../../threejs-game-ui-layout/references/layout-contract.md#文字路线判定)
