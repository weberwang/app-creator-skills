# Unity 帧动画导入

将导出包的 `Editor/FrameAtlasImporter.cs` 放入 Unity 项目的任意 `Assets/**/Editor/` 目录。项目需要 Unity 2021.2 或更新版本及已安装的 `com.unity.2d.sprite` 包。此工具使用 Sprite Editor Data Provider API，依赖项目自带的 Unity Editor、动画和 2D Sprite 能力。

将 Unity 预设导出的 `animation.json` 和全部 `atlas-N.png` 放入 `Assets` 下同一目录，等待 Unity 资源导入完成。选中 `animation.json`，执行 **Assets → Frame Atlas → 导入帧动画**。

图集页被配置为 Multiple Sprite、100 PPU、无压缩和无 mipmap，切片 Pivot 保留裁剪与逐帧偏移。导入器会在同目录的 `FrameAtlasGenerated` 中生成 `FrameAnimation.anim`、`FrameAnimation.controller` 和 `FrameAnimation.prefab`。把 Prefab 拖进带有相机的 2D 场景，即可由其 SpriteRenderer 和 Animator 播放。每次导入会更新这些指定产物和图集页的切片元数据，项目自定义内容请放在其他资源中。

清单坐标以左上角为原点，导入器换算为 Unity 贴图左下坐标与归一化 Pivot。导入器按清单帧序播放，多页和透明帧都保留对应时槽。Unity 预设按帧的原始朝向自动裁剪和排版。每个帧边界须落在声明的 FPS 网格上，末尾以相同 Sprite 延长到完整时长。

在同一图集页中，帧 ID 不变时会重用确定性的 Sprite 标识。帧移到另一图集页时，其资产 GUID 会变化，需要更新引用与交接。Unity 项目还应通过工作流的资源读回确认实际 Sprite GUID、localId、Pivot、PPU、AnimationClip 曲线和 Prefab 绑定，再由用户检查画面。

导入器依据当前项目的 Unity 和 2D Sprite 包实际版本运行。图集的平台覆盖设置不得缩放贴图；若导入器提示尺寸不符，请调整相应平台覆盖设置后重新导入。项目正式资源使用前应在目标 Unity Editor 中编译并验证，具体画面与渲染结果需要人工检查。
