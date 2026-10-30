# Unity 文本组件配置

遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)。先记录 Unity、TMP 包及 UI 系统实际版本，不更换已有 UI 路线。以下宽度和字号为示例，使用 Canvas/Panel 的逻辑单位，不是设备物理像素；配置保存到正式 Prefab/Scene 或 UXML/USS。

## uGUI 与 TextMeshPro

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

`Overflow` 不裁切也不保证适配，最小字号仍可能超框。拒绝标题显式换行；字体与布局稳定后 `ForceMeshUpdate()`，核对 `textInfo.lineCount == 1`、实际 `fontSize >= 20`、`renderedWidth`/字形边界与可用框宽、垂直边界；不能用单个溢出标志替代完整检查。正文检查实际完整行数与内容区/滚动范围，不能用 Ellipsis、Truncate 或 Masking 掩盖失败。

## UI Toolkit：按 Unity 版本与文字生成器设置

Unity 6000.2 官方 USS 已提供下列属性；项目必须确认实际版本支持，并配置 Advanced Text Generator 及适用字体资源。不能将该配置套入未支持这些属性的版本。

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

按当前 UI 路线回读正式源与实例，验证最长文案、多语言/回退字体、内容更新和视口变化；UI Toolkit 另验证生成器与版本要求。记录行宽、实际字号、行数及下限失败，显示效果由用户确认；本指南不是具体工程的运行证据。

- [TMP 3.0 属性 API](https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.0/api/TMPro.TMP_Text.html)
- [TextMeshProUGUI API](https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.0/api/TMPro.TextMeshProUGUI.html)
- [Unity 6000.2 USS：生成器及 Auto Size](https://docs.unity3d.com/6000.2/Documentation/Manual/UIE-USS-SupportedProperties.html)
- [Unity 6000.2 Advanced Text Generator](https://docs.unity3d.com/6000.2/Documentation/Manual/UIE-advanced-text-generator.html)
- [TextElement.MeasureTextSize](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/UIElements.TextElement.MeasureTextSize.html)
