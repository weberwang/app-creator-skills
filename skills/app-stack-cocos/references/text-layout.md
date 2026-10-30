# Cocos 文本组件配置

适用基线：Cocos Creator 3.8、`Label` + `UITransform`，以项目实际版本复核。行为遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)。以下宽度、字号为可替换示例，不是全项目默认值；源配置保存在正式 Scene/Prefab 中，业务刷新通常只改 `Label.string`。

## 标题与按钮：固定宽度、单行缩放

| 组件／编辑器属性 | 代码属性 | 示例值 |
| --- | --- | --- |
| UITransform → Content Size | `contentSize.width/height`，制作时可用 `setContentSize(280, 48)` | 宽 `280`、高 `48`，布局逻辑单位 |
| Label → Overflow | `overflow` | `Label.Overflow.SHRINK` |
| Label → Enable Wrap Text | `enableWrapText` | `false` |
| Label → Font Size | `fontSize` | `32`，设计及最大字号 |
| Label → Line Height | `lineHeight` | `40`，按字体调整，不能因框高不足额外压小文字 |
| Label → Cache Mode | `cacheMode` | `Label.CacheMode.NONE`；不要使用不支持 SHRINK 的 CHAR |
| 项目文本规格／配置 | 非 Label 内置属性 | 最小字号 `20` |

```ts
// 仅示意正式组件的制作配置；不要在业务刷新中覆盖编辑器布局。
label.overflow = Label.Overflow.SHRINK;
label.enableWrapText = false;
label.fontSize = 32;
label.lineHeight = 40;
label.cacheMode = Label.CacheMode.NONE;
```

关闭自动换行不禁止显式换行字符，标题输入须拒绝换行。SHRINK 按宽高共同适配，不能用过矮的高度“限定一行”。原生 Label **没有最小字号属性**，不得臆造 `minFontSize`；原生配置只完成自动缩小，不构成完整下限保护。

下限 `20` 写入既有项目文本配置；在当前版本支持的排版更新时机（3.8 可用 `label.updateRenderData(true)`）读取 `label.actualFontSize`，低于下限即记为不适配并调整文案或正式布局。对不可预先穷举的动态内容，必须先评估项目既有或社区的有界适配能力；都不能满足时才用原生测量补最小适配，不能仅记录告警后让低于下限的文字继续作为合格结果显示。

## 长描述：固定宽度、自动增高

UITransform 宽 `320`；`label.overflow = Label.Overflow.RESIZE_HEIGHT`、`label.fontSize = 24`、`label.lineHeight = 32`。此模式按行宽排版并计算高度，不手工固定正文高度；`enableWrapText` 的编辑开关仅在 CLAMP/SHRINK 生效，不将它误记为 RESIZE_HEIGHT 的开关。正文最小可读字号示例 `20`，本例不自动缩小正文。

需要限高时，将自动增高的正文放入指定 ScrollView 内容区；容器不能通过裁切或 CLAMP 隐藏后续内容。Widget、Layout 或业务脚本不得随文字重设固定宽度，也不能同时争抢 Label 自算的高度。

## 验证与来源

回读真实组件的宽高、溢出模式、换行和字号；采集最短/最长及短→长→短内容后的实际字号、正文高度和真实宿主组合。覆盖中文、其他已选语言、字体回退、显式换行与下限失败；保留编辑器布局控制权，画面由用户检查。本规范不代表已在具体 Creator 项目运行通过。

- [Label 官方属性、排版和缓存限制](https://docs.cocos.com/creator/3.8/manual/zh/ui-system/components/editor/label.html)
- [Label 官方 API](https://docs.cocos.com/creator/3.8/api/en/class/Label)
- [3.8.7 Label 源码：实际字号及排版更新](https://github.com/cocos/cocos-engine/blob/v3.8.7/cocos/2d/components/label.ts)
