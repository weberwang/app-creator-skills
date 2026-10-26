# Three.js 模型与资源

## glTF/GLB 导入

优先使用 GLTFLoader。只有模型确有需要时登记 Draco、meshopt 或 KTX2 loader，包含 decoder/transcoder 运行部署文件、地址、缓存、CSP 与动态恢复能力。核对 glTF 内部 Scene、节点、纹理和材质槽实际名字与资产登记，网络文件和加载器成功不证明模型结构、质感或完整动画达标。

角色使用 `SkeletonUtils.clone` 创建独立 Skeleton/SkinnedMesh 场景实例，并由具体实例拥有 AnimationMixer、Action 和角色状态。停用时停止并移除 Action、清掉 mixer root 缓存。动画 bounds、姿势、旋转碰撞和物理边界分别验证。

## PBR 与内存

模型交接记录顶点/三角形、空间单位与坐标方向、变换/Pivot、UV、法线、真实材质槽和目标场景消费者；按相机距离与目标设备定义 LOD、碰撞代理、动画骨骼数、贴图维度和 GPU 内存预算。Scene 管理加载器与模型实例，资源所有者管理跨场景缓存，不能由 Scene dispose 间接释放共享材质。

识别颜色贴图的 sRGB 设置；normal、metalness、roughness 与其他数值贴图作为数据处理。明确 alpha blend/cutout/test 与输出方式。不要在不需要时强制覆盖 GLTFLoader 已建立的材质参数和纹理引用。

## 真实释放

three.js GPU 资源必须由所有者手动 dispose：geometry、材质、texture/render target 和 renderer 分开管理。实现资源跟踪时区分独占实例、跨 Scene 共享 Cache 与 browser ImageBitmap；释放纹理时资源所有者还须按需关闭 ImageBitmap。Scene.exit 时取消 animation/RAF/observer/监听器；Renderer 不自动释放浏览器显存基线和 context。重复 Scene 加载后检查内存、renderer.info、贴图加载与 context 恢复，确保共享材料仍存活且旧场景不泄漏。

生成式贴图仍需要人工检视视觉完成度、纹理 seams、接缝和 UV 拉伸。天空、遮蔽与透明效应应分别核对投影与目标材质身份，不能靠离相机的截图掩盖未处理的纹理面。

来源：`skills/app-stack-threejs/references/native-contracts.md#mode-threejs-game-model-pipeline`、`skills/threejs-game-architecture/references/project-structure.md`、`skills/threejs-game-asset-integration/references/art-quality-contract.md`。
