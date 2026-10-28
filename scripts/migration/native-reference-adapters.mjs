/** 修正审计中确认的原生资料错误，不把另一技术栈的接口提升为公共规则。 */
const THREE_AUDIO_SOURCE = '浏览器可能要求用户手势后播放音频；Sound Manager 属于 Game，循环音不会因切换 Scene 自动停止，单场景清理不应误用全局停止。来源：[官方音频指南](https://docs.threejs.io/threejs/concepts/audio)、[官方 v4.1.0 WebAudioSoundManager](https://github.com/threejsjs/threejs/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js)。';
const THREE_AUDIO = '浏览器可能要求用户手势后播放音频。Three.js 使用 `THREE.Audio` / `THREE.PositionalAudio` 与 `THREE.AudioListener`，由项目明确音频实例和共享监听器的所有权；场景移除不能代替音频收尾。离开场景时，按实例的播放控制能力停止本场景拥有的声音，并断开已连接的音频节点；共享监听器和音频上下文由其所有者管理，不停止其他场景的有效声音。接口依据：[Three.js Audio](https://threejs.org/docs/pages/Audio.html)、[Three.js AudioListener](https://threejs.org/docs/pages/AudioListener.html)。';

/** 来源已由专业参考计划固定摘要，此处仍要求错误段唯一存在，防止猜测新源的意图。 */
export function adaptNativeReference(text, { stack, sourcePath } = {}) {
  if (stack === 'unity' && sourcePath === 'unity-game-workflow-control/references/minimal-git.md') {
    const before = '阶段验收达到 `PASS` 后，由主代理自动创建本地阶段提交。';
    const index = text.indexOf(before);
    if (index < 0 || text.indexOf(before, index + before.length) >= 0) throw new Error('Unity Git 提交授权说明已变化，须重新审查');
    // 验收完成只证明质量结果，不能为当前任务新增 Git 副作用。
    return text.slice(0, index) + '只有当前任务明确包含 Git 提交时，才创建相应本地提交；阶段验收通过不自动触发提交。' + text.slice(index + before.length);
  }
  if (stack !== 'threejs' || sourcePath !== 'skills/threejs-game-juice/references/design-guide.md') return text;
  const index = text.indexOf(THREE_AUDIO_SOURCE);
  if (index < 0 || text.indexOf(THREE_AUDIO_SOURCE, index + THREE_AUDIO_SOURCE.length) >= 0) {
    throw new Error('Three.js 音频参考已变化，须重新审查原生接口与来源');
  }
  return text.slice(0, index) + THREE_AUDIO + text.slice(index + THREE_AUDIO_SOURCE.length);
}
