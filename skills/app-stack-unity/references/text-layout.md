# Unity 文本组件配置

运行时静态与动态文本默认先评估 UniText，按[完整还原标准](../../unity-development-workflow/references/visual-decomposition-routes.md#完整还原的判断标准)核实后确定路线：完整则原生，确认不能则直接图片，未核实则待验证，先读取[安装检查与固定 JSON 国际化](../../unity-development-workflow/references/text-and-localization.md)。正式 Scene/Prefab 保存组件、文案键与样式绑定，翻译由 JSON 配置读取；图片文字按语言/状态绑定资源或组合字形，Image 节点按 SPRITE 测量，不伪标为 TEXT。安装不正确时由用户选择修复或回退 TMP，以下 TMP 属性仅用于已选择的回退；编辑器 UI Toolkit 示例不代表运行时默认路线。

遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)。先记录 Unity、UniText 或已选择 TMP 包及 UI 系统实际版本。以下宽度和字号为示例，使用 Canvas/Panel 的逻辑单位，不是设备物理像素；配置保存到正式 Prefab/Scene 或 UXML/USS。

先回读确认目标的字号与断行；以下 Auto Size 示例仅用于正式声明有界缩小的单行样式。固定字号的 TMP 设置 `enableAutoSizing=false`，UI Toolkit 使用 `-unity-text-auto-size: none`；多行标题按确认目标配置换行，不套用单行示例。基准画面仍须匹配确认字号、字重、行高与行数，Auto Size 的范围不是基准差异容差。

## uGUI 与 UniText（默认）

从所装版本 API 回读实际字号、字体栈、换行、对齐、padding、字距与自动适配设置，保存到正式组件。固定宽度、基准字号及断行沿用确认目标；单行有界缩小只允许明确的设计/最小字号范围，不自动压缩字宽、字距或行高来规避失败。正文固定字号换行并增高或进入声明的滚动容器。

UniText 通过统一 JSON 文案绑定更新内容，语言/参数变化由绑定触发刷新，不在每帧重复解析文件。测量使用该版本真实布局结果，核对实际字形边界、行数、基线、行高与容器；不得以 TMP 的 `ForceMeshUpdate`、`textInfo` 或 `fontSizeMin` 当作 UniText 已支持的 API。系统字体的跨设备差异与 WebGL 随包字体要求按安装检查记录。

## uGUI 与 TextMeshPro（用户选择的回退）

下表代码属性按 TMP 3.0 API 核实；包版本不同时读取该版本 API，不能据此保留旧接口兼容层。

| Inspector／组件设置 | 代码属性 | 标题／按钮 | 长描述 |
| --- | --- | --- | --- |
| RectTransform 宽度 | 非拉伸时 `sizeDelta.x`；拉伸时由锚点与 offset 决定 | `280` | `320` |
| RectTransform 高度 | 当前布局的唯一高度所有者 | 示例 `48`，须容纳字体 | Preferred Height 或滚动内容 |
| Auto Size | `enableAutoSizing` | `true` | `false` |
| Font Size | `fontSize` | `32` | `24` |
| Auto Size Min / Max | `fontSizeMin` / `fontSizeMax` | `20` / `32` | 不启用自动缩小，下限 `20` 存文本样式规格 |
| Wrapping | `enableWordWrapping` | `false` | `true` |
| Auto Size Text Container | `autoSizeTextContainer` | `false` | `false`，宽度仍由布局决定 |
| Overflow | `overflowMode` | `TextOverflowModes.Overflow`，须另验是否真实越界 | 同左，正文须增高或滚动 |

```csharp
// title 是正式 Prefab 中的 TextMeshProUGUI；这里只映射制作配置，不在业务刷新中重设位置。
title.enableAutoSizing = true;
title.fontSize = 32;
title.fontSizeMin = 20;
title.fontSizeMax = 32;
title.characterWidthAdjustment = 0;
title.lineSpacingAdjustment = 0;
title.enableWordWrapping = false;
title.autoSizeTextContainer = false;
title.overflowMode = TextOverflowModes.Overflow;
```

关闭横向 ContentSizeFitter：`horizontalFit = ContentSizeFitter.FitMode.Unconstrained`；正文可按项目布局使用 `verticalFit = ContentSizeFitter.FitMode.PreferredSize`，但不要与父 LayoutGroup 争抢同一尺寸属性。禁用自动字宽压缩和行距缩减等额外适配（`characterWidthAdjustment = 0`、`lineSpacingAdjustment = 0`），只在授权的字号范围内适配。

`Overflow` 不裁切也不保证适配，最小字号仍可能超框。已声明单行的输入拒绝显式换行；字体与布局稳定后 `ForceMeshUpdate()`，核对 `textInfo.lineCount == 1`、实际 `fontSize >= 20`、`renderedWidth`/字形边界与可用框宽、垂直边界；不能用单个溢出标志替代完整检查。已确认多行标题保留其断行。正文检查实际完整行数与内容区/滚动范围，不能用 Ellipsis、Truncate 或 Masking 掩盖失败。

## UI Toolkit：编辑器与实际系统的配置参考

以下是 UI Toolkit 编辑器及实际系统的属性参考，不取代运行时 UniText 与 JSON 文案绑定。Unity 6000.2 官方 USS 已提供下列属性；须确认实际版本支持，并配置 Advanced Text Generator 及字体资源。不能将其当作 UniText 属性或直接挂载到 UniText，不能据此绕开默认文本方案。

```css
/* 标题单行，在明确的字号上下限之间适配。 */
.title {
    width: 280px;
    height: 48px;
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 32px;
    -unity-text-generator: advanced;
    -unity-text-auto-size: best-fit 20px 32px;
}
/* 正文固定宽度换行，高度随内容增长。 */
.description {
    width: 320px;
    height: auto;
    flex-shrink: 0;
    white-space: normal;
    font-size: 24px;
    -unity-text-generator: advanced;
    -unity-text-auto-size: none;
}
```

正文下限 `20` 写入项目样式规格；限高时使用 ScrollView。`text-overflow: clip/ellipsis` 不是字号适配能力。实际版本缺少 Auto Size 时，先评估既有及社区组件；必要的最小补充以官方 `TextElement.MeasureTextSize` 测量为依据，在 `[20,32]` 内选择完整适配的字号，失败时调整规格，不假称有通用 `minFontSize` 属性。

## 验证与来源

按实际文字路线回读正式源与实例，共同验证 JSON 加载、键与参数绑定、语言/状态切换、最长内容、生命周期和视口变化。原生记录字体回退、字形、行宽、实际字号、行数及下限失败；图片核对资源身份、JSON 键及语言/状态映射、内容和尺寸边界，以及切换或字形组合更新，不要求 Image 提供字体组件属性。UI Toolkit 参考仅验证其实际生成器与版本，不能代替 UniText 或图片路线证据。显示效果由用户确认；本指南不是具体工程的运行证据。

- [TMP 3.0 属性 API](https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.0/api/TMPro.TMP_Text.html)
- [TextMeshProUGUI API](https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.0/api/TMPro.TextMeshProUGUI.html)
- [Unity 6000.2 USS：生成器及 Auto Size](https://docs.unity3d.com/6000.2/Documentation/Manual/UIE-USS-SupportedProperties.html)
- [Unity 6000.2 Advanced Text Generator](https://docs.unity3d.com/6000.2/Documentation/Manual/UIE-advanced-text-generator.html)
- [TextElement.MeasureTextSize](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/UIElements.TextElement.MeasureTextSize.html)
