import type { TapAdError, TapAdOptions, TapRewardedAd, TapRewardedCloseEvent, TapRuntime } from './types';

/** 激励广告最终关闭结果；未知关闭和展示失败都不能领取奖励。 */
export type TapRewardedOutcome = { status: 'completed' | 'dismissed' } | { status: 'unknown' | 'error'; error?: unknown };
/** 展示入口立即返回，只有 started 才对应后续关闭结果。 */
export type TapRewardedAttempt = { status: 'started'; outcome: Promise<TapRewardedOutcome> } | { status: 'not-ready' | 'busy' | 'quarantined' };

/** 每个宿主只保存一个官方广告对象和一个未完成展示。 */
class TapRewardedState {
  private ready = false;
  private pending: ((value: TapRewardedOutcome) => void) | undefined;
  private quarantined = false;
  private loadTask: Promise<void> | undefined;

  /** 创建时宿主会自动加载；不在业务入口中等待加载。 */
  constructor(private readonly ad: TapRewardedAd) {
    ad.onLoad(() => { if (!this.pending && !this.quarantined) this.ready = true; });
    ad.onError((error: TapAdError) => {
      this.ready = false;
      if (this.pending) this.failPending(this.pending, error);
    });
    ad.onClose((result?: TapRewardedCloseEvent) => {
      // 失败展示仍可能迟到关闭，须先消费它才能允许下一次加载。
      if (this.quarantined) { this.quarantined = false; this.ready = false; return; }
      const resolve = this.pending;
      // 无待结算展示时忽略迟到或重复关闭，也不破坏新一轮加载状态。
      if (!resolve) return;
      this.pending = undefined;
      this.ready = false;
      if (result?.isEnded === true) resolve({ status: 'completed' });
      else if (result?.isEnded === false) resolve({ status: 'dismissed' });
      else resolve({ status: 'unknown' });
    });
  }

  /** 失败展示先隔离，避免迟到关闭被下一次展示误认为完成。 */
  private failPending(resolve: (value: TapRewardedOutcome) => void, error: unknown): void {
    if (this.pending !== resolve) return;
    this.pending = undefined;
    this.ready = false;
    this.quarantined = true;
    resolve({ status: 'error', error });
  }

  /** 后台手动加载；加载完成只由宿主 onLoad 证明，不连带触发展示。 */
  load(): Promise<void> {
    if (this.quarantined) return Promise.reject(new Error('失败展示尚未收到关闭回调，不能安全重新加载'));
    if (this.pending) return Promise.reject(new Error('激励广告正在展示，不能重新加载'));
    if (this.loadTask) return this.loadTask;
    this.ready = false;
    let task: Promise<void>;
    try { task = Promise.resolve(this.ad.load()); }
    catch (error) { return Promise.reject(error); }
    const tracked = task.catch((error: unknown) => { this.ready = false; throw error; }).finally(() => {
      if (this.loadTask === tracked) this.loadTask = undefined;
    });
    this.loadTask = tracked;
    return tracked;
  }

  /** 立即尝试展示已加载广告；实际奖励只依据关闭事件的明确完成标记。 */
  tryShow(): TapRewardedAttempt {
    if (this.pending) return { status: 'busy' };
    if (this.quarantined) return { status: 'quarantined' };
    if (!this.ready) return { status: 'not-ready' };
    this.ready = false;
    let resolve!: (value: TapRewardedOutcome) => void;
    const outcome = new Promise<TapRewardedOutcome>((done) => { resolve = done; });
    this.pending = resolve;
    try {
      // 宿主自行关联关闭；已受理结果由原业务所有者持有，不因页面销毁丢弃。
      Promise.resolve(this.ad.show()).catch((error: unknown) => {
        this.failPending(resolve, error);
      });
    } catch (error) {
      this.failPending(resolve, error);
    }
    return { status: 'started', outcome };
  }
}

/** 当前渠道的激励广告句柄；多渠道句柄共享宿主展示状态。 */
export class TapRewardedController {
  /** 每个句柄独立校验自身渠道，避免持有旧页面的生命周期。 */
  constructor(private readonly state: TapRewardedState, private readonly assertReady: () => void) {}

  /** 请求后台准备，调用方可以监听失败且无需等待结果再继续游戏。 */
  load(): Promise<void> { this.assertReady(); return this.state.load(); }

  /** 校验当前渠道后立即尝试展示共享实例。 */
  tryShow(): TapRewardedAttempt { this.assertReady(); return this.state.tryShow(); }
}

/** 官方单例在不同渠道对象间共享，不随页面或渠道释放而销毁。 */
const controllers = new WeakMap<object, { adUnitId: string; state: TapRewardedState }>();

/** 首次调用创建宿主单例；后续只能复用相同广告位。 */
export function getRewardedController(runtime: TapRuntime, options: TapAdOptions, assertReady: () => void): TapRewardedController {
  assertReady();
  if (!options.adUnitId.trim()) throw new Error('激励广告位不能为空');
  const existing = controllers.get(runtime);
  if (existing) {
    if (existing.adUnitId !== options.adUnitId) throw new Error('Tap 激励广告是宿主单例，不能切换广告位');
    return new TapRewardedController(existing.state, assertReady);
  }
  if (typeof runtime.createRewardedVideoAd !== 'function') throw new Error('当前宿主没有激励广告接口');
  const state = new TapRewardedState(runtime.createRewardedVideoAd(options));
  controllers.set(runtime, { adUnitId: options.adUnitId, state });
  return new TapRewardedController(state, assertReady);
}
