/** 仅供领域校验使用的只读路径合同；不包含原控制器的写入与锁逻辑。 */
/** 将 Unity 文件或 glob 模式规范化为严格 POSIX 相对路径。 */
export function canonicalizePosixPath(input, label = '路径', fail = (message) => { throw new Error(message); }) {
  if (typeof input !== 'string' || !input.length) fail(`${label} 必须是非空 POSIX 相对路径`);
  if (input.includes('\\') || input.startsWith('/') || /^[A-Za-z]:/.test(input)) fail(`${label} 必须是 POSIX 相对路径：${input}`);
  const segments = input.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) fail(`${label} 含空段或非法 . / .. 段：${input}`);
  return segments.join('/');
}
