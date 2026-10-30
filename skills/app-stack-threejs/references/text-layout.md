# Three.js 文本组件配置

屏幕 UI 默认沿用项目实际 DOM/CSS Overlay；CSS2D 世界标注和三维字形分别处理，不因同为“文本”混用单位。按项目安装的 Three.js revision 与浏览器能力核实配置，遵循[公共文本规则](../../app-ui-layout/references/relative-layout.md#文本宽度缩放与换行)。以下 CSS px 数值是示例，不是世界单位。

## DOM 屏幕标题与正文

```css
/* 标题单行固定宽度；这些属性自身不实现字号自动适配。 */
.title {
  width: 280px;
  box-sizing: border-box;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 32px;
  line-height: 40px;
}
/* 正文在固定行宽内换行并增高，连续长词也须可断行。 */
.description {
  width: 320px;
  box-sizing: border-box;
  flex-shrink: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  font-size: 24px;
  line-height: 32px;
  height: auto;
}
```

固定宽度包含 border/padding 时，行宽使用扣除后的内容区；有图标时再扣除图标及间距。正文最小字号示例 `20` 存入项目文本样式，不自动缩小正文；需要限高时在指定容器设置明确 `max-height` 与 `overflow-y: auto`，不裁掉后续行。

浏览器这些 CSS 属性没有内置“自动在 20–32px 内适配字号”的开关。标题设计字号 `32`、下限 `20` 保存在现有组件配置，不伪造 CSS `min-font-size`；先评估项目已有/社区能力，不满足时再用浏览器原生测量补最小适配。适配只更新 `style.fontSize`，不能使用 `transform: scale`、`zoom`、`text-overflow: ellipsis`、隐藏溢出来冒充完整适配。

等待 `document.fonts.ready`，使用与正式节点相同字体、字重、字距、语言及样式的真实排版测量；候选字号按 `[20,32]` 选择最大可容纳值。可用 `scrollWidth/clientWidth` 初筛，并用实际文本 Range 或同源测量节点核对字形宽高，避免只比较固定盒子本身。测量节点仅消费相同正式配置并及时清理，不成为第二套布局源。最低字号仍放不下必须返回不适配。

标题输入拒绝显式换行；`white-space: nowrap` 不是内容校验。内容、字体加载、样式或容器尺寸变化后重测，保留浏览器文字放大的阅读效果，不通过缩小抵消用户设置。布局拥有宽度和位置，适配器仅拥有文本字号。

## CSS2D 与三维文字的边界

CSS2DObject 的 DOM 内层可使用上述样式；不要覆盖 CSS2DRenderer 管理的外层 `transform`。官方 CSS2DRenderer 对浏览器及显示缩放有 100% 的支持限制，其他缩放场景不能仅凭属性声明判定通过；按实际目标选择、验证和记录能力限制。

TextGeometry 的 `size` 是世界字形尺寸，不是 CSS `font-size`；其参数没有 UI 固定行宽、自动换行或最小字号属性。沿用已选世界文本组件；如需这类约束，先核实官方/社区能力，再在明确世界单位、行距、投影和相机合同下实施。不能对 Mesh 做整体压缩假冒字号适配，也不能把 `280px` 直接当作世界宽度。

## 验证与来源

DOM 记录实际内容行宽、计算样式、字号与字形边界；世界文字记录实际组件及坐标单位。覆盖长短文本、所选语言、字体加载/回退、字号下限、浏览器文字放大和动态更新，画面由用户检查；不得把 DOM 局部结果当作整个 3D 场景通过。

- [Three.js CSS2DRenderer](https://threejs.org/docs/pages/CSS2DRenderer.html)
- [Three.js TextGeometry](https://threejs.org/docs/pages/TextGeometry.html)
- [浏览器 CSS white-space](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
- [浏览器字体加载完成](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready)
- [Canvas 文本测量](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText)
