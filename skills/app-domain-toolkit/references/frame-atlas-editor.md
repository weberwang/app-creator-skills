# V4 帧动画调试器

在 V4 已取得可审阅帧序列之后打开调试器。网页支持逐帧对齐、调整播放顺序和导出回读，透明裁剪与排版朝向由打包算法决定。正式工作流继承来源素材、各帧时长、FPS、循环和公共锚点，倍率控件只影响预览。

## 打开与编辑

在项目根目录执行下列命令。维护本技能仓库时将 `.agents/skills/` 换为 `skills/`。修改来源前先检查 4177 是否已有同一输入的调试器，存在时直接打开已有页面。

```powershell
node .agents/skills/app-domain-toolkit/scripts/animation/atlas-editor/editor-cli.mjs serve --report artifacts/walk-report.json
```

打开终端给出的本机地址，默认是 `http://127.0.0.1:4177/`。图片补帧和视频抽帧均使用现有图集脚本产生的 `PASS` 报告和实际 PNG。若项目内图集已换位置，用 `--sheet` 指定对应文件，字节仍须与报告相符。无报告时省略参数即可导入临时 PNG，按自然文件名排序。

Unity 或直接交接 PNG 序列的项目可将已确认的帧写入下列来源清单，按实际顺序填写全部条目。路径相对项目根目录，摘要使用现有工作流的 `sha256:<小写十六进制>` 格式。所有 PNG 采用相同画布。

```json
{
  "schema": "frame-atlas-source/1",
  "name": "walk",
  "canvas": { "width": 128, "height": 96 },
  "anchor": { "x": 64, "y": 88 },
  "fps": 12,
  "loop": true,
  "frames": [{ "file": "art/frames/walk-01.png", "sha256": "sha256:<实际摘要>" }]
}
```

```powershell
node .agents/skills/app-domain-toolkit/scripts/animation/atlas-editor/editor-cli.mjs serve --source artifacts/walk-source.json --target unity
```

1. 在时间轴选中帧，拖动画布或编辑 X/Y。方向键移动 1 像素，按住 Shift 移动 10 像素。
2. 将缩略图拖到目标帧位，或选中帧后用「前移」「后移」排序。偏移和时长随帧移动。预览、工程保存和正式导出均使用调整后的顺序。
3. 选择目标引擎、页尺寸和扩边。算法自动移除 Alpha 为零的边缘，全透明帧仍占用播放时段。Cocos 和 Three.js 的打包器会在更合适时顺时针旋转 90°，回放时恢复原始朝向。Phaser 和 Unity 以原始朝向排版。画布橙色虚线表示像素超出逻辑画布，导出仍保留这些像素。
4. 导出 ZIP。压缩包包含 `atlas-*.png`、`animation.json`、可重新编辑的 `project.json` 和 `adapter/` 下的目标引擎代码及播放示例。回读区域用实际导出的 PNG 和 JSON 重建播放，也可打开此前解压的导出文件。

编辑原工程时，从相同工作流来源启动，或先导入原临时 PNG，再打开 `project.json`。重排后请播放完整序列，人工检查关键姿态时点、首尾衔接、锚点和透明边缘，并将结论关联现有 V4 工作项的实际产物。

## 正式交接与验证

网页和 CLI 共用打包逻辑。以下命令可复建产物或校验已经解压的导出包。PNG 序列来源将 `--report` 改为 `--source`。

```powershell
node .agents/skills/app-domain-toolkit/scripts/animation/atlas-editor/editor-cli.mjs build --report artifacts/walk-report.json --edits artifacts/walk-edit/project.json --out artifacts/walk-rebuild
node .agents/skills/app-domain-toolkit/scripts/animation/atlas-editor/editor-cli.mjs verify --report artifacts/walk-report.json --edits artifacts/walk-edit/project.json --runtime artifacts/walk-edit/animation.json
```

Cocos、Phaser 和 Three.js 的 `visual-manifest` 继续通过源图集 `spritesheet` 和 `quality_report` 追溯图片或视频路线。在 accepted `frame_animation` 中增加两个新文件绑定，并在同一资产的 `runtime_outputs` 声明 `animation.json` 和全部正式图集 PNG。使用压缩包中对应的适配器接入消费者。文件门先校验原路线，再复建并核对派生清单和图集字节。

```json
{
  "edited_atlas": {
    "project": { "file": "artifacts/walk-edit/project.json", "sha256": "sha256:<实际摘要>" },
    "runtime": { "file": "artifacts/walk-edit/animation.json", "sha256": "sha256:<实际摘要>" }
  }
}
```

Unity 使用 ZIP 中的编辑器导入器生成正式 `Sprite` 子资源、独立 `.anim`、Animator Controller 和播放 Prefab，再执行既有的 [Unity 资源交接读回](../../unity-development-workflow/references/resource-loading-and-frame-handoff.md)。若图集重排导致帧跨页，按实际 GUID + localId 更新交接合同。
