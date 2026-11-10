// 记录真实加载位置，不把控制器内部路径添加到持久化工作项 Schema。
const sources = new WeakMap();

/** 绑定已加载工作项的项目相对路径，供保护控制文件及原始证据边界使用。 */
export function bindWorkSource(work, relativePath) {
  if (work && typeof work === 'object') sources.set(work, relativePath);
  return work;
}

/** 返回同一对象已绑定的来源，未绑定的纯数据不会获得虚构路径。 */
export function getWorkSource(work) {
  return sources.get(work);
}
