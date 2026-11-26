# Phaser 4 播放示例

在场景 preload 调用 preloadExample(this, "walk", 页数, 资源目录)，在 create 调用 createExample(this, "walk", 唯一实例名)。将返回的 container 放到公共锚点位置，在场景 update(time, delta) 中调用 player.update(delta / 1000)。销毁时调用 player.dispose()。

每个播放器的实例名必须唯一。纹理可由多个播放器共享，销毁最后一个使用者后由项目统一释放。Phaser 导出预设关闭排版旋转。
