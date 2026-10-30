# Phaser 文本组件配置

适用基线：Phaser 4.0.0 的 `Phaser.GameObjects.Text`；执行前按 package.json、锁文件和实际类型定义核对版本。遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)，以下数值仅为项目可替换示例，使用游戏布局逻辑单位。

## Text 原生属性

| TextStyle／方法 | 标题与按钮 | 长描述 |
| --- | --- | --- |
| `fontSize` / `setFontSize` | `'32px'` / `32` | `'24px'` / `24` |
| `fixedWidth` / `setFixedSize` 的 width | `280` | `320` |
| `fixedHeight` | 示例 `48`，须留足行高 | `0`，按文字计算高度 |
| `wordWrap.width` | 不设置；已有规则用 `setWordWrapWidth(null)` 清除 | `320`，有内边距时用实际可用行宽 |
| `wordWrap.useAdvancedWrap` | 不启用宽度换行 | `true`，并验证语言和字素边界 |
| `maxLines` | `0`，不靠隐藏行数伪装单行 | `0`，不截掉正文 |
| 最小字号与自动字号 | 原生无对应开关/上下限属性 | 文本样式规格记录下限示例 `20`，正文不缩小 |

```ts
// scene、x、y 和真实内容由已有宿主提供；片段仅表示正式文本样式。
const title = scene.add.text(x, y, titleContent, {
  fontSize: '32px', fixedWidth: 280, fixedHeight: 48, maxLines: 0,
});
title.setWordWrapWidth(null);
const description = scene.add.text(x, y, descriptionContent, {
  fontSize: '24px', fixedWidth: 320, fixedHeight: 0, maxLines: 0,
  wordWrap: { width: 320, useAdvancedWrap: true },
});
```

两个对象分别使用布局已决定的实际落位，不将示例相同的 x/y 当作组合坐标。`fixedWidth` 固定画布/盒子，**不自动缩字号**；`maxLines: 1` 可隐藏其他行，也不保证输入为单行。标题内容须拒绝显式换行，已有 `wordWrap.callback` 必须一并核对，不能让回调重新引入换行。

## 补齐有界缩放和真实断行

标题的设计 `32`、最低 `20` 存入现有组件配置。先复用合格项目组件或经评估的社区方案；没有满足要求的实现才基于原生 Text/Canvas 测量补最小有界适配。每次内容、字体、样式或可用宽度变化后，从设计字号重新选取 `[20,32]` 内能完整容纳的最大字号，仅调用 `setFontSize` 更新文本字号；不得调用 `setScale`、`setDisplaySize` 或改父容器变换来完成适配。

普通 Text 使用真实字体样式的 Canvas `measureText` 或该版本文本测量能力，并计入 padding、字距、描边等占用；固定画布宽度不是字形测量结果。最低字号仍超宽或超高须返回不适配、修订文案或正式布局，不能让画布裁切后标记成功。

默认换行按空格分词，中文及连续长词必须验证；`useAdvancedWrap: true` 也不能单独证明 emoji、组合字符及标点禁则正确。需要自定义断行时使用当前版本 `setWordWrapCallback`，按实际语言和字素边界实现并验证。长描述保持宽度并增高，限高时使用已有滚动容器。

BitmapText 必须单独适配：`setFontSize`、`setMaxWidth(320)` 与 `getTextBounds().local.width` 属于位图字体路线；`setMaxWidth` 不保证无空格文本必然正确换行，不能套用 Canvas 系统字体测量或声称它原生有字号上下限。已有 BitmapText 不为套用本例擅自换组件。

## 验证与来源

记录真实字体、行宽、字号范围、实际字号与完整字形宽高。覆盖中文/其他所选语言、长词、显式换行、短→长→短、WebFont 加载完成、视口变化及下限失败；安装和静态配置不能替代实际 Scene 运行证据，截图由用户检查。

- [Phaser 4.0.0 Text](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-text)
- [Phaser 4.0.0 TextStyle](https://docs.phaser.io/api-documentation/4.0.0/typedef/types-gameobjects-text)
- [4.0.0 Text 换行源码](https://github.com/phaserjs/phaser/blob/v4.0.0/src/gameobjects/text/Text.js)
- [Phaser 4.0.0 BitmapText](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-bitmaptext)
