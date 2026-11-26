# Three.js 播放示例

安装项目使用的 three，将本目录文件和导出的 animation.json、所有图集页放入项目可访问的位置。调用 await addExample(scene, animationUrl)，在渲染循环中调用 player.update(deltaSeconds)。结束时从场景移除 player.mesh，调用 player.dispose()，并在所有使用者结束后释放返回的纹理。示例坐标为每像素一个世界单位，按项目比例缩放网格。

纹理须使用 flipY = true，清单和图集页须同目录。素材加载和实际画面应在目标 Three.js 版本中验证。
