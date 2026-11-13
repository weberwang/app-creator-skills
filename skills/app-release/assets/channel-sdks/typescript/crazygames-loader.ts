/** CrazyGames 官方 HTML5 SDK v3 的固定加载地址。 */
export const CRAZYGAMES_SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

/** 本模块只复用当前正在加载的 SDK 脚本，不在模块导入时操作 DOM。 */
let pending: Promise<object> | undefined;

/** 从浏览器读取官方脚本创建的 SDK，宿主未提供时返回 undefined。 */
function getGlobalSdk(): unknown {
  return (globalThis as unknown as { CrazyGames?: { SDK?: unknown } }).CrazyGames?.SDK;
}

/** 加载官方 SDK；脚本成功、错误和超时均有明确结果。 */
export function loadCrazyGamesSdk(timeoutMs: number): Promise<object> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) return Promise.reject(new Error('SDK 加载超时必须在有效范围内'));
  const existing = getGlobalSdk();
  if (existing && (typeof existing === 'object' || typeof existing === 'function')) return Promise.resolve(existing as object);
  if (pending) return pending;
  if (typeof document === 'undefined') return Promise.reject(new Error('当前宿主不能加载 CrazyGames SDK 脚本'));
  const parent = document.head || document.body;
  if (!parent) return Promise.reject(new Error('当前页面尚无可用脚本容器'));

  const task = new Promise<object>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    /** 只结算一次并移除处理器，避免脚本迟到事件反复改变结果。 */
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); return; }
      const sdk = getGlobalSdk();
      if (!sdk || (typeof sdk !== 'object' && typeof sdk !== 'function')) {
        script.remove();
        reject(new Error('CrazyGames SDK 脚本未提供 SDK'));
        return;
      }
      resolve(sdk as object);
    };
    script.src = CRAZYGAMES_SDK_URL;
    script.async = true;
    script.onload = () => finish();
    script.onerror = () => finish(new Error('CrazyGames SDK 脚本加载失败'));
    timer = setTimeout(() => finish(new Error('CrazyGames SDK 脚本加载超时')), timeoutMs);
    try { parent.appendChild(script); } catch { finish(new Error('CrazyGames SDK 脚本加载失败')); }
  });
  pending = task;
  // 失败后允许重新尝试；处理拒绝以免创建未观察的派生 Promise。
  void task.then(() => { if (pending === task) pending = undefined; }, () => { if (pending === task) pending = undefined; });
  return task;
}
