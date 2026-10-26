# 素材技术处理

本技能的 `scripts/png-raster.mjs` 和 `scripts/remove-background-local.mjs` 提取自 Unity 基准的无引擎工具，五栈共用，不重复维护。工具支持 8 位非隔行 PNG 解码，实际支持格式以脚本拒绝条件为准。

对已获得且符合纯色背景路线的素材，按需要显式运行：

```powershell
node <技能目录>/scripts/remove-background-local.mjs --source art/item.raw.png --output art/item.png --background-color "#00aa55" --tolerance 24 --require-solid-background --record art/item.background-removal.json --preview
```

算法从画布边缘做四连通颜色清除，不处理复杂背景、毛发、玻璃或发光半透明边缘；不能用它通用抠图。已有真实 Alpha 使用直接透明路线，不重复抠图。处理不覆盖原图、不改变尺寸，记录中包括算法、参数、Alpha、删除像素与失败原因。保留哈希仅用于该工具输出的来源诊断，不把它引入公共阶段确认或验收一致性门。

预览是交给用户检查的资料，不自动据此判定视觉通过。PNG 结构与 Alpha 检查仅证明技术事实；去背景不能去除模板感、结构错误或材质混乱。生图或图像编辑任务优先使用宿主要求的 imagegen；只有当前工作流明确需要这项确定性后处理时才执行上述工具，不以像素脚本替代生成式编辑。

技术交接按所选技术栈执行：

- Unity：AssetDatabase、GUID/.meta、Importer、Sprite/Pivot/Clip 与实际消费者。
- Cocos：AssetDB UUID、导入子资源、SpriteFrame、Prefab 与资源加载路径。
- Phaser：纹理/图集 key、帧、Scale/Camera 与实际加载和渲染对象。
- Three.js：纹理色彩空间、UV/材质、glTF、实际渲染与 GPU 资源释放。
- Flutter：pubspec 资产登记、逻辑/像素密度、Image 约束、缓存和真实 Widget 消费者。

源仓库中的其他图集、模型和布局工具并未自动打包进本技能；需要时按技术规范及当前项目能力选用，不能调用不存在的旧工作流命令。
