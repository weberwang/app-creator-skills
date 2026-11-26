# Cocos Creator 3.x 播放示例

将本目录两个 TypeScript 文件、导出的 animation.json 和图集 PNG 导入工程。在 Canvas 下建立节点并添加 FrameAtlasExample 组件，将 JSON 资源拖入 manifest，按 atlas-1、atlas-2 的顺序将纹理资源拖入 textures。父节点的位置代表公共锚点，缩放父节点可以调整整体大小。

播放器为每个实例创建自己的 SpriteFrame 和子节点，共享传入的 Texture2D。请在目标 Creator 版本的编辑器与实际场景中检查纹理导入和播放效果。
