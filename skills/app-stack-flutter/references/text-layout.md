# Flutter 文本组件配置

静态文案先按[静态文本的可见表现](../../app-domain-toolkit/references/ui-copy-principles.md#静态文本的可见表现)选择项目已验证的位图字体组件或独立文字图片。下文普通 Text 配置用于动态内容等适用场景，位图路线按实际组件核对尺寸、排版和阅读尺寸适配，图片按语言/状态绑定。控件保留对应语义、焦点与输入，验证可见资源与语义语言一致。

以项目 FVM/锁定 SDK 为准，使用支持 `TextScaler` 的当前项目 API，遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)。下面宽度为逻辑像素，字号示例 `32/24`、下限示例 `20`；实际数值写入现有设计 token 和组件参数。

先保持确认的基准字号与断行，在同一 `layout-spec` 的 `text_behavior.font_sizing` 中声明策略；没有布局合同时写入正式组件配置。`fixed` 保留设计字号，`bounded-shrink` 仅供声明了触发条件的单行样式使用，下文的候选字号测量仅适用于后者。多行标题按确认目标使用 `wrap + fixed`，操作标签保持单行；正文保持 `wrap + fixed`。基准与适配分别验证，不能因字号仍在范围内就接受基准偏差。

## Text 属性与单行能力缺口

| Widget／属性 | 标题与按钮 | 长描述 |
| --- | --- | --- |
| 外层宽度约束 | `SizedBox(width: 280)` 或等价紧约束 | `SizedBox(width: 320)` 或等价紧约束 |
| `style.fontSize` | 固定设计字号 `32`，或声明有界适配后的实际字号，最低 `20` | `24`，不持续缩小正文 |
| `maxLines` | `1` | `null`，并核对继承的 DefaultTextStyle 无行数上限 |
| `softWrap` | `false` | `true` |
| `textWidthBasis` | `TextWidthBasis.parent` | 同左 |
| `overflow` | `TextOverflow.visible`，须独立检查完整字形 | 同左；完整增高或进入指定滚动区 |
| `textScaler` | `MediaQuery.textScalerOf(context)` | 同左 |

原生 `Text` **没有自动缩小或 minFontSize/maxFontSize 属性**。`maxLines: 1` 与 `softWrap: false` 只设置行布局，不实现字号适配；`FittedBox(fit: BoxFit.scaleDown)` 也不提供字号下限，不能用它替代有界字号选择。

先评估项目现有或社区文本组件的真实版本、许可、维护状态、非线性 TextScaler 与溢出行为；不因包名包含 AutoSize 就判定符合要求，也不默认新增依赖。没有满足要求的组件时，才基于官方 `TextPainter` 补最小有界适配：

1. 从既有组件配置读取已声明的有界缩小策略、设计 `32`、最低 `20`、实际内容区宽度，单行输入拒绝显式换行；已确认多行标题不走本流程。保持父级宽度、位置及命中框由原布局控制。
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
