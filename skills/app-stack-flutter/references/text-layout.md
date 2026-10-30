# Flutter 文本组件配置

以项目 FVM/锁定 SDK 为准，使用支持 `TextScaler` 的当前项目 API，遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)。下面宽度为逻辑像素，字号示例 `32/24`、下限示例 `20`；实际数值写入现有设计 token 和组件参数。

## Text 属性与单行能力缺口

| Widget／属性 | 标题与按钮 | 长描述 |
| --- | --- | --- |
| 外层宽度约束 | `SizedBox(width: 280)` 或等价紧约束 | `SizedBox(width: 320)` 或等价紧约束 |
| `style.fontSize` | 有界适配后的实际字号，设计 `32`、最低 `20` | `24`，不持续缩小正文 |
| `maxLines` | `1` | `null`，并核对继承的 DefaultTextStyle 无行数上限 |
| `softWrap` | `false` | `true` |
| `textWidthBasis` | `TextWidthBasis.parent` | 同左 |
| `overflow` | `TextOverflow.visible`，须独立检查完整字形 | 同左；完整增高或进入指定滚动区 |
| `textScaler` | `MediaQuery.textScalerOf(context)` | 同左 |

原生 `Text` **没有自动缩小或 minFontSize/maxFontSize 属性**。`maxLines: 1` 与 `softWrap: false` 只设置行布局，不实现字号适配；`FittedBox(fit: BoxFit.scaleDown)` 也不提供字号下限，不能用它替代有界字号选择。

先评估项目现有或社区文本组件的真实版本、许可、维护状态、非线性 TextScaler 与溢出行为；不因包名包含 AutoSize 就判定符合要求，也不默认新增依赖。没有满足要求的组件时，才基于官方 `TextPainter` 补最小有界适配：

1. 从既有组件配置读取设计 `32`、最低 `20`、实际内容区宽度，拒绝标题显式换行。保持父级宽度、位置及命中框由原布局控制。
2. 使用与实际 Text 相同的 TextSpan 样式、locale、TextDirection、TextScaler、字距、StrutStyle 等逐候选测量；无主动 ellipsis。以完整单行字形宽度和实际高度判断适配，不能只看 `didExceedMaxLines`，也不能用受约束的 `TextPainter.width` 冒充自然字形宽度。必要时在无限行宽下测量自然宽度，再在目标框复核。
3. 选择 `[20,32]` 内能完整适配的最大字号；最低字号仍不适配时显式失败并调整文案或正式布局。系统放大后不得选小字号把阅读设置抵消；必要时调整布局。文本、样式、locale、字体、TextScaler 或可用宽度变化后重测，TextPainter 使用完 `dispose()`。

```dart
// fittedFontSize 由已验证的有界适配组件提供，此 Text 配置本身不自动缩字号。
SizedBox(
  width: 280,
  child: Text(
    titleContent,
    style: TextStyle(fontSize: fittedFontSize),
    maxLines: 1,
    softWrap: false,
    overflow: TextOverflow.visible,
    textWidthBasis: TextWidthBasis.parent,
    textScaler: MediaQuery.textScalerOf(context),
  ),
)
```

## 长描述配置

```dart
// 正文不设固定高度，允许完整换行；限高时由指定滚动区承载。
SizedBox(
  width: 320,
  child: Text(
    descriptionContent,
    style: const TextStyle(fontSize: 24),
    maxLines: null,
    softWrap: true,
    overflow: TextOverflow.visible,
    textWidthBasis: TextWidthBasis.parent,
    textScaler: MediaQuery.textScalerOf(context),
  ),
)
```

此片段所在作用域的 `DefaultTextStyle.maxLines` 必须无行数上限；`Text.maxLines: null` 仍可能继承上限，不能仅检查本节点值。正文下限 `20` 存样式规格。Row 内须先建立有限宽度；SizedBox 在更窄父约束下不保证实际获得声明宽度，测量须使用实际约束。禁止用 `TextScaler.noScaling`、裁切或省略号让失败文本看似适配。

## 验证与来源

Widget/关系测试覆盖长文案、多语言与回退、父约束、显式换行、继承行数上限、内容更新和非线性文字放大。采集实际 RenderParagraph 字形边界、行数和最终字号，不能只依据无 overflow 警告判定；截图由用户检查，本指南没有替代项目运行验收。

- [Text 属性](https://api.flutter.dev/flutter/widgets/Text-class.html)
- [Text.maxLines 的继承行为](https://api.flutter.dev/flutter/widgets/Text/maxLines.html)
- [TextPainter 官方测量与释放](https://api.flutter.dev/flutter/painting/TextPainter-class.html)
- [MediaQuery.textScalerOf](https://api.flutter.dev/flutter/widgets/MediaQuery/textScalerOf.html)
- [BoxFit.scaleDown](https://api.flutter.dev/flutter/painting/BoxFit.html)
