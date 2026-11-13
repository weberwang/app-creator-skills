// 自动生成：微信小游戏渠道专属类型，保留官方 MIT 许可。
/*! *****************************************************************************
Copyright (c) 2025 Tencent, Inc. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
***************************************************************************** */
/*! *****************************************************************************
Copyright (c) 2026 Tencent, Inc. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
***************************************************************************** */
export declare namespace Wechat {
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type AbortCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type AbortFailCallback = (res: GeneralCallbackResult) => void;
/** 入参对象（可选） */
interface AbortParams {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: AbortCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: AbortFailCallback;
    /** 接口调用成功的回调函数 */
    success?: AbortSuccessCallback;
}
/** 接口调用成功的回调函数 */
type AbortSuccessCallback = (res: GeneralCallbackResult) => void;
/** 账号信息 */
interface AccountInfo {
    /** 小程序账号信息 */
    miniProgram: MiniProgram;
    /** 插件账号信息（仅在插件中调用时包含这一项） */
    plugin: Plugin;
}
interface AdSkipCard {
    /** [AdSkipCard.offClose(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.offClose.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 取消监听购买弹窗关闭事件。 */
    offClose(
    /** 事件监听函数 */
    callback: AdSkipCardCloseCallback): void;
    /** [AdSkipCard.offError(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.offError.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 取消监听错误事件。 */
    offError(
    /** 事件监听函数 */
    callback: AdSkipCardErrorCallback): void;
    /** [AdSkipCard.offLoad(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.offLoad.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 取消监听畅玩卡数据加载事件。 */
    offLoad(
    /** 事件监听函数 */
    callback: (...args: any[]) => any): void;
    /** [AdSkipCard.offShow(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.offShow.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 取消监听购买弹窗展示事件。 */
    offShow(
    /** 事件监听函数 */
    callback: (...args: any[]) => any): void;
    /** [AdSkipCard.offUse(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.offUse.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 取消监听畅玩权益消耗事件。 */
    offUse(
    /** 事件监听函数 */
    callback: AdSkipCardUseCallback): void;
    /** [AdSkipCard.onClose(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.onClose.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 监听购买弹窗关闭事件。弹窗关闭时触发（弹窗内点蒙层、购买成功后关闭）。 */
    onClose(
    /** 事件监听函数 */
    callback: AdSkipCardCloseCallback): void;
    /** [AdSkipCard.onError(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.onError.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 监听错误事件。load/show 失败等场景触发。前端错误码：-1001 预加载失败 / -1002 打开弹窗失败，服务端错误码原样透传。 */
    onError(
    /** 事件监听函数 */
    callback: AdSkipCardErrorCallback): void;
    /** [AdSkipCard.onLoad(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.onLoad.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 监听畅玩卡数据加载事件。加载成功（product_list 非空）时触发。 */
    onLoad(
    /** 事件监听函数 */
    callback: (...args: any[]) => any): void;
    /** [AdSkipCard.onShow(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.onShow.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 监听购买弹窗展示事件。show 打开成功时触发。 */
    onShow(
    /** 事件监听函数 */
    callback: (...args: any[]) => any): void;
    /** [AdSkipCard.onUse(function callback)](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.onUse.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 监听畅玩权益消耗事件。当内部广告流程消耗畅玩权益成功后触发。 */
    onUse(
    /** 事件监听函数 */
    callback: AdSkipCardUseCallback): void;
    /** [Promise AdSkipCard.load()](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.load.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 预加载畅玩卡数据。加载成功时触发 load 事件，失败时触发 error 事件。
     *   若上次 load 仍在进行中，重复调用返回同一个 Promise，不会重复请求。 */
    load(): Promise<any>;
    /** [Promise AdSkipCard.show()](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.show.html)
     *
     * 需要基础库： `3.16.2`
     *
     * 打开畅玩卡购买弹窗。打开成功时触发 show 事件，失败时触发 error 事件。
     *   若上次 show 仍在进行中，重复调用返回同一个 Promise，不会重复打开。 */
    show(): Promise<any>;
}
/** 事件监听函数 */
type AdSkipCardCloseCallback = (result: OnCloseCallbackResult) => void;
/** 事件监听函数 */
type AdSkipCardErrorCallback = (result: OnErrorCallbackResult) => void;
/** 事件监听函数 */
type AdSkipCardUseCallback = (result: OnUseCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type AddCardCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type AddCardFailCallback = (res: GeneralCallbackResult) => void;
interface AddCardOption {
    /** 需要添加的卡券列表 */
    cardList: AddCardRequestInfo[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: AddCardCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: AddCardFailCallback;
    /** 接口调用成功的回调函数 */
    success?: AddCardSuccessCallback;
}
/** 需要添加的卡券列表 */
interface AddCardRequestInfo {
    /** 卡券的扩展参数。需将 CardExt 对象 JSON 序列化为**字符串**传入 */
    cardExt: string;
    /** 卡券 ID */
    cardId: string;
}
/** 卡券添加结果列表 */
interface AddCardResponseInfo {
    /** 卡券的扩展参数，结构请参考下文 */
    cardExt: string;
    /** 用户领取到卡券的 ID */
    cardId: string;
    /** 加密 code，为用户领取到卡券的code加密后的字符串，解密请参照：[code 解码接口](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1499332673_Unm7V) */
    code: string;
    /** 是否成功 */
    isSuccess: boolean;
}
/** 接口调用成功的回调函数 */
type AddCardSuccessCallback = (result: AddCardSuccessCallbackResult) => void;
interface AddCardSuccessCallbackResult {
    /** 卡券添加结果列表 */
    cardList: AddCardResponseInfo[];
    errMsg: string;
}
interface AsyncMethodOptionLike {
    success?: (...args: any[]) => void;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type AuthPrivateMessageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type AuthPrivateMessageFailCallback = (res: GeneralCallbackResult) => void;
interface AuthPrivateMessageOption {
    /** shareTicket。可以从 wx.getEnterOptionsSync 中获取。详情 [shareTicket](#) */
    shareTicket: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: AuthPrivateMessageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: AuthPrivateMessageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: AuthPrivateMessageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type AuthPrivateMessageSuccessCallback = (result: AuthPrivateMessageSuccessCallbackResult) => void;
interface AuthPrivateMessageSuccessCallbackResult {
    /** 经过加密的activityId，解密后可得到原始的activityId。若解密后得到的activityId可以与开发者后台的活动id对应上则验证通过，否则表明valid字段不可靠（被篡改） 详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    encryptedData: string;
    /** 错误信息 */
    errMsg: string;
    /** 加密算法的初始向量，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    iv: string;
    /** 验证是否通过 */
    valid: boolean;
}
/** 用户授权设置信息，详情参考[权限](#) */
interface AuthSetting {
    /** 是否授权使用你的微信朋友信息，对应开放数据域内的 [wx.getFriendCloudStorage](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getFriendCloudStorage.html) 、[wx.getGroupCloudStorage](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupCloudStorage.html) 、[wx.getGroupInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupInfo.html) 、[wx.getPotentialFriendList](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getPotentialFriendList.html) 、[wx.getUserCloudStorageKeys](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserCloudStorageKeys.html) 、[wx.getUserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/OpenDataContext-wx.getUserInfo.html)  、[GameServerManager.getFriendsStateData](https://developers.weixin.qq.com/minigame/dev/api/game-server-manager/GameServerManager.getFriendsStateData.html) 接口，以及主域内的 [wx.getUserInteractiveStorage](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserInteractiveStorage.html) 接口。 */
    'scope.WxFriendInteraction'?: boolean;
    /** 是否授权同玩互动好友信息，对应接口 [wx.getRelationFriendList](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getRelationFriendList.html) */
    'scope.interactedUserInfo'?: boolean;
    /** 是否授权录音功能，对应接口 [wx.getRecorderManager](https://developers.weixin.qq.com/minigame/dev/api/media/recorder/wx.getRecorderManager.html) */
    'scope.record'?: boolean;
    /** 是否授权模糊地理位置，对应接口 [wx.getFuzzyLocation](https://developers.weixin.qq.com/minigame/dev/api/location/wx.getFuzzyLocation.html) */
    'scope.userFuzzyLocation'?: boolean;
    /** 是否授权用户信息，对应接口 [wx.getUserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.getUserInfo.html) */
    'scope.userInfo'?: boolean;
    /** 是否授权精确地理位置，对应接口 [wx.getLocation](https://developers.weixin.qq.com/minigame/dev/api/location/wx.getLocation.html)。将废弃，请使用 scope.userFuzzyLocation 代替 */
    'scope.userLocation'?: boolean;
    /** 是否授权微信运动步数，对应接口 [wx.getWeRunData](https://developers.weixin.qq.com/minigame/dev/api/open-api/werun/wx.getWeRunData.html) */
    'scope.werun'?: boolean;
    /** 是否授权保存到相册，对应接口 [wx.saveImageToPhotosAlbum](https://developers.weixin.qq.com/minigame/dev/api/media/image/wx.saveImageToPhotosAlbum.html) */
    'scope.writePhotosAlbum'?: boolean;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type AuthorizeCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type AuthorizeFailCallback = (res: GeneralCallbackResult) => void;
interface AuthorizeOption {
    /** 需要获取权限的 scope，详见 [scope 列表](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html#scope-列表) */
    scope: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: AuthorizeCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: AuthorizeFailCallback;
    /** 接口调用成功的回调函数 */
    success?: AuthorizeSuccessCallback;
}
/** 接口调用成功的回调函数 */
type AuthorizeSuccessCallback = (res: GeneralCallbackResult) => void;
/** banner 广告组件。banner 广告组件是一个原生组件，层级比普通组件高。banner 广告组件默认是隐藏的，需要调用 BannerAd.show() 将其显示。banner 广告会根据开发者设置的宽度进行等比缩放，缩放后的尺寸将通过 BannerAd.onResize() 事件中提供。 */
interface BannerAd {
    /** banner 广告组件的样式。style 上的属性的值仅为开发者设置的值，banner 广告会根据开发者设置的宽度进行等比缩放，缩放后的真实尺寸需要通过 BannerAd.onResize() 事件获得。 */
    style: BannerAdStyle;
    /** [BannerAd.destroy()](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.destroy.html)
     *
     * 销毁 banner 广告。 */
    destroy(): void;
    /** [BannerAd.hide()](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.hide.html)
     *
     * 隐藏 banner 广告。 */
    hide(): void;
    /** [BannerAd.offError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.offError.html)
*
* 移除 banner 广告错误事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

BannerAd.onError(listener)
BannerAd.offError(listener) // 需传入与监听时同一个的函数对象
``` */
    offError(
    /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: GridAdOffErrorCallback): void;
    /** [BannerAd.offLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.offLoad.html)
*
* 移除 banner 广告加载事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

BannerAd.onLoad(listener)
BannerAd.offLoad(listener) // 需传入与监听时同一个的函数对象
``` */
    offLoad(
    /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffLoadCallback): void;
    /** [BannerAd.offResize(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.offResize.html)
*
* 移除 banner 广告尺寸变化事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

BannerAd.onResize(listener)
BannerAd.offResize(listener) // 需传入与监听时同一个的函数对象
``` */
    offResize(
    /** onResize 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffResizeCallback): void;
    /** [BannerAd.onError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.onError.html)
     *
     * 监听 banner 广告错误事件。
     *
     * **错误码信息与解决方案表**
     *
     *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。可以针对异常返回加上适当的监控信息辅助排查现网情况。
     *
     * | 代码 | 异常情况 | 理由 | 解决方案 |
     * | ------ | -------------- | --------------- | -------------------------- |
     * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
     * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
     * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
     * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
     * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
     * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1007  | 广告组件被封禁  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
     * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。| */
    onError(
    /** banner 广告错误事件的监听函数 */
    listener: GridAdOnErrorCallback): void;
    /** [BannerAd.onLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.onLoad.html)
     *
     * 监听 banner 广告加载事件。 */
    onLoad(
    /** banner 广告加载事件的监听函数 */
    listener: OnLoadCallback): void;
    /** [BannerAd.onResize(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.onResize.html)
     *
     * 监听 banner 广告尺寸变化事件。 */
    onResize(
    /** banner 广告尺寸变化事件的监听函数 */
    listener: OnResizeCallback): void;
    /** [Promise BannerAd.show()](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.show.html)
     *
     * 显示 banner 广告。 */
    show(): Promise<any>;
}
/** banner 广告组件的样式。style 上的属性的值仅为开发者设置的值，banner 广告会根据开发者设置的宽度进行等比缩放，缩放后的真实尺寸需要通过 BannerAd.onResize() 事件获得。 */
interface BannerAdStyle {
    /** banner 广告组件的高度 */
    height: number;
    /** banner 广告组件的左上角横坐标 */
    left: number;
    /** banner 广告组件经过缩放后真实的高度 */
    realHeight: number;
    /** banner 广告组件经过缩放后真实的宽度 */
    realWidth: number;
    /** banner 广告组件的左上角纵坐标 */
    top: number;
    /** banner 广告组件的宽度。最小 300，最大至 `屏幕宽度`（屏幕宽度可以通过 wx.getSystemInfoSync() 获取）。 */
    width: number;
}
/** 画布对象 */
interface Canvas {
    /** 画布的高度 */
    height: number;
    /** 画布的宽度 */
    width: number;
    /** [Canvas.toTempFilePath(Object object)](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/Canvas.toTempFilePath.html)
     *
     * 将当前 Canvas 保存为一个临时文件。**如果使用了开放数据域，则生成后的文件仅能被用于以下接口：`wx.saveImageToPhotosAlbum`、`wx.shareAppMessage`、`wx.onShareAppMessage`、`wx.previewImage`、`wx.previewMedia`、`wx.onShareTimeline`、`wx.showShareImageMenu`** */
    toTempFilePath(option: ToTempFilePathOption): void;
    /** [[RenderingContext](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/RenderingContext.html) Canvas.getContext(string contextType, Object contextAttributes)](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/Canvas.getContext.html)
     *
     * 获取画布对象的绘图上下文 */
    getContext(
    /** 上下文类型
     *
     * 参数 contextType 可选值：
     * - '2d': 2d 绘图上下文;
     * - 'webgl': webgl 绘图上下文;
     * - 'webgl2': webgl2 绘图上下文; */
    contextType: '2d' | 'webgl' | 'webgl2',
    /** webgl 上下文属性，仅当 contextType 为 webgl 时有效 */
    contextAttributes?: ContextAttributes): any;
    /** [string Canvas.toDataURL()](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/Canvas.toDataURL.html)
     *
     * 把画布上的绘制内容以一个 data URI 的格式返回 */
    toDataURL(): string;
    /** [string Canvas.toTempFilePathSync(Object object)](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/Canvas.toTempFilePathSync.html)
     *
     * [Canvas.toTempFilePath](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/Canvas.toTempFilePath.html) 的同步版本 */
    toTempFilePathSync(option: ToTempFilePathSyncOption): string;
}
type ChallengeStartCallback = (result: OnChallengeStartCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CheckHandoffEnabledCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type CheckHandoffEnabledFailCallback = (res: GeneralCallbackResult) => void;
interface CheckHandoffEnabledOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: CheckHandoffEnabledCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: CheckHandoffEnabledFailCallback;
    /** 接口调用成功的回调函数 */
    success?: CheckHandoffEnabledSuccessCallback;
}
/** 接口调用成功的回调函数 */
type CheckHandoffEnabledSuccessCallback = (result: CheckHandoffEnabledSuccessCallbackResult) => void;
interface CheckHandoffEnabledSuccessCallbackResult {
    /** 错误码，0未知，1用户取消，2电脑未登录，3电脑版本过低，4暂未支持 */
    errCode: number;
    /** 是否可以进行接力 */
    isEnabled: boolean;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CheckIsAddedToMyMiniProgramCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type CheckIsAddedToMyMiniProgramFailCallback = (res: GeneralCallbackResult) => void;
interface CheckIsAddedToMyMiniProgramOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: CheckIsAddedToMyMiniProgramCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: CheckIsAddedToMyMiniProgramFailCallback;
    /** 接口调用成功的回调函数 */
    success?: CheckIsAddedToMyMiniProgramSuccessCallback;
}
/** 接口调用成功的回调函数 */
type CheckIsAddedToMyMiniProgramSuccessCallback = (result: CheckIsAddedToMyMiniProgramSuccessCallbackResult) => void;
interface CheckIsAddedToMyMiniProgramSuccessCallbackResult {
    /** 是否被添加至 「我的小程序」 */
    added: boolean;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CheckIsSupportFacialRecognitionCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type CheckIsSupportFacialRecognitionFailCallback = (res: GeneralCallbackResult) => void;
interface CheckIsSupportFacialRecognitionOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: CheckIsSupportFacialRecognitionCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: CheckIsSupportFacialRecognitionFailCallback;
    /** 接口调用成功的回调函数 */
    success?: CheckIsSupportFacialRecognitionSuccessCallback;
}
/** 接口调用成功的回调函数 */
type CheckIsSupportFacialRecognitionSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CheckIsSupportMidasPaymentCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type CheckIsSupportMidasPaymentFailCallback = (err: CheckIsSupportMidasPaymentFailCallbackErr) => void;
interface CheckIsSupportMidasPaymentFailCallbackErr {
    /** 错误信息 */
    errMsg: string;
}
interface CheckIsSupportMidasPaymentOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: CheckIsSupportMidasPaymentCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: CheckIsSupportMidasPaymentFailCallback;
    /** 接口调用成功的回调函数 */
    success?: CheckIsSupportMidasPaymentSuccessCallback;
}
/** 接口调用成功的回调函数 */
type CheckIsSupportMidasPaymentSuccessCallback = (result: CheckIsSupportMidasPaymentSuccessCallbackResult) => void;
/** 支付支持信息对象 */
interface CheckIsSupportMidasPaymentSuccessCallbackDataResult {
    /** 是否支持支付，true 表示支持，false 表示不支持 */
    allow_pay: boolean;
    /** 错误码，0 表示成功 */
    err_code: number;
    /** 错误信息，"success" 表示成功 */
    err_msg: string;
}
interface CheckIsSupportMidasPaymentSuccessCallbackResult {
    /** 支付支持信息对象 */
    data: CheckIsSupportMidasPaymentSuccessCallbackDataResult;
    /** 调用结果信息，格式为 "checkIsSupportMidasPayment:ok" */
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CheckSessionCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type CheckSessionFailCallback = (res: GeneralCallbackResult) => void;
interface CheckSessionOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: CheckSessionCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: CheckSessionFailCallback;
    /** 接口调用成功的回调函数 */
    success?: CheckSessionSuccessCallback;
}
/** 接口调用成功的回调函数 */
type CheckSessionSuccessCallback = (res: GeneralCallbackResult) => void;
/** webgl 上下文属性，仅当 contextType 为 webgl 时有效 */
interface ContextAttributes {
    /** 需要基础库： `2.11.0`
     *
     * 是否开启透明通道，仅当 contextType 为 webgl 时有效。（开启后，配合wx.createVideo({underGameView: true}) 即可在video组件之上渲染主屏画布） */
    alpha?: boolean;
    /** 表示是否抗锯齿 */
    antialias?: boolean;
    /** 抗锯齿样本数。最小值为 2，最大不超过系统限制数量，仅 iOS 支持 */
    antialiasSamples?: number;
    /** 表示是否绘图完成后是否保留绘图缓冲区 */
    preserveDrawingBuffer?: boolean;
}
interface CreateBannerAdOption {
    /** 广告单元 id */
    adUnitId: string;
    /** banner 广告组件的样式 */
    style: CreateBannerAdStyleOption;
    /** 广告自动刷新的间隔时间，单位为秒，参数值必须大于等于30（该参数不传入时 Banner 广告不会自动刷新） */
    adIntervals?: number;
}
/** banner 广告组件的样式 */
interface CreateBannerAdStyleOption {
    /** banner 广告组件的高度 */
    height: number;
    /** banner 广告组件的左上角横坐标 */
    left: number;
    /** banner 广告组件的左上角纵坐标 */
    top: number;
    /** banner 广告组件的宽度 */
    width: number;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CreateChallengeCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type CreateChallengeFailCallback = (res: GeneralCallbackResult) => void;
/** 入参对象 */
interface CreateChallengeParams {
    /** 玩法唯一标识，用于区分不同的擂台赛玩法。可以在 MP后台-运营功能管理-基础配置-游戏玩法ID 中配置 */
    scoreKey: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: CreateChallengeCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: CreateChallengeFailCallback;
    /** 可选子 key，正整数，取值范围1-1000。该参数可用于游戏同一玩法的关卡区分，从基础库版本3.12.1开始支持 */
    subScoreKey?: number;
    /** 接口调用成功的回调函数 */
    success?: CreateChallengeSuccessCallback;
}
/** 接口调用成功的回调函数 */
type CreateChallengeSuccessCallback = (res: GeneralCallbackResult) => void;
interface CreateCustomAdOption {
    /** 广告自动刷新的间隔时间，单位为秒，参数值必须大于等于30（仅对支持自动刷新的模板生效） */
    adIntervals: number;
    /** 广告单元 id */
    adUnitId: string;
    /** 原生模板广告组件的样式 */
    style: CreateCustomAdStyleOption;
}
/** 原生模板广告组件的样式 */
interface CreateCustomAdStyleOption {
    /** (只对小程序适用) 原生模板广告组件是否固定屏幕位置（不跟随屏幕滚动） */
    fixed: boolean;
    /** 原生模板广告组件的左上角横坐标 */
    left: number;
    /** 原生模板广告组件的左上角纵坐标 */
    top: number;
    /** 原生模板广告组件的宽度（仅在某些模板生效，如矩阵格子） */
    width: number;
}
interface CreateGameClubButtonOption {
    /** 游戏圈按钮的图标，仅当 object.type 参数为 image 时有效。
     *
     * 可选值：
     * - 'green': 绿色的图标;
     * - 'white': 白色的图标;
     * - 'dark': 有黑色圆角背景的白色图标;
     * - 'light': 有白色圆角背景的绿色图标; */
    icon: 'green' | 'white' | 'dark' | 'light';
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 需要基础库： `2.30.3`
     *
     * 当传递了openlink值时，此字段生效，决定创建的按钮是否需要拥有红点，默认为true */
    hasRedDot?: boolean;
    /** 需要基础库： `2.30.3`
     *
     * 设置后可以跳到对应的活动页面，具体进入「MP后台-能力地图-游戏圈」-由帖子的"游戏内跳转ID"生成 */
    openlink?: string;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
}
interface CreateGridAdOption {
    /** grid(格子) 广告广告组件的主题，提供 `white` `black` 两种主题选择。 */
    adTheme: string;
    /** 广告单元 id */
    adUnitId: string;
    /** grid(格子) 广告组件的格子个数，可设置爱5，8两种格子个数样式，默认值为5 */
    gridCount: number;
    /** grid(格子) 广告组件的样式 */
    style: CreateGridAdStyleOption;
    /** 广告自动刷新的间隔时间，单位为秒，参数值必须大于等于30（该参数不传入时 grid(格子) 广告不会自动刷新） */
    adIntervals?: number;
}
/** grid(格子) 广告组件的样式 */
interface CreateGridAdStyleOption {
    /** grid(格子) 广告组件的高度 */
    height: number;
    /** grid(格子) 广告组件的左上角横坐标 */
    left: number;
    /** grid(格子) 广告组件的左上角纵坐标 */
    top: number;
    /** grid(格子) 广告组件的宽度 */
    width: number;
}
interface CreateInterstitialAdOption {
    /** 广告单元 id */
    adUnitId: string;
}
interface CreateOpenSettingButtonOption {
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
}
interface CreateRewardedVideoAdOption {
    /** 广告单元 id */
    adUnitId: string;
    /** 需要基础库： `3.7.1`
     *
     * 是否禁用分享页，默认为false */
    disableFallbackSharePage?: boolean;
    /** 需要基础库： `2.8.0`
     *
     * 是否启用多例模式，默认为false */
    multiton?: boolean;
}
interface CreateStoreGiftOption {
    /** 用户 openid */
    openid?: string;
    /** 礼物订单id，调用“创建并发送礼物”或通过“查询礼物订单列表”open api拿到，open api文档[链接](https://doc.weixin.qq.com/doc/w3_AecACAZVAPMCNRyNF8Tq1Ts0zKrGq)。 */
    presentOrderId?: boolean;
}
interface CreateUserInfoButtonOption {
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 描述用户信息的语言
     *
     * 可选值：
     * - 'en': 英文;
     * - 'zh_CN': 简体中文;
     * - 'zh_TW': 繁体中文; */
    lang?: 'en' | 'zh_CN' | 'zh_TW';
    /** 是否带上登录态信息。当 withCredentials 为 true 时，要求此前有调用过 wx.login 且登录态尚未过期，此时返回的数据会包含 encryptedData, iv 等敏感信息；当 withCredentials 为 false 时，不要求有登录态，返回的数据不包含 encryptedData, iv 等敏感信息。 */
    withCredentials?: boolean;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
}
/** 原生模板广告组件。原生模板广告组件是一个原生组件，层级比普通组件高。原生模板广告组件默认是隐藏的，需要调用 CustomAd.show() 将其显示。如果宽度可配置，原生模板广告会根据开发者设置的宽度进行等比缩放，部分模板缩放后的尺寸会通过 CustomAd.onResize() 事件中提供。 */
interface CustomAd {
    /** 原生模板广告组件的样式 */
    style: CustomAdStyle;
    /** [CustomAd.destroy()](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.destroy.html)
     *
     * 销毁原生模板广告。 */
    destroy(): void;
    /** [CustomAd.offClose(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.offClose.html)
*
* 移除原生模板广告关闭事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

CustomAd.onClose(listener)
CustomAd.offClose(listener) // 需传入与监听时同一个的函数对象
``` */
    offClose(
    /** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: UDPSocketOffCloseCallback): void;
    /** [CustomAd.offError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.offError.html)
*
* 移除原生模板广告错误事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

CustomAd.onError(listener)
CustomAd.offError(listener) // 需传入与监听时同一个的函数对象
``` */
    offError(
    /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: CustomAdOffErrorCallback): void;
    /** [CustomAd.offHide(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.offHide.html)
*
* 需要基础库： `2.14.4`
*
* 移除原生模板广告隐藏事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

CustomAd.onHide(listener)
CustomAd.offHide(listener) // 需传入与监听时同一个的函数对象
``` */
    offHide(
    /** onHide 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffHideCallback): void;
    /** [CustomAd.offLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.offLoad.html)
*
* 移除原生模板广告加载事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

CustomAd.onLoad(listener)
CustomAd.offLoad(listener) // 需传入与监听时同一个的函数对象
``` */
    offLoad(
    /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffLoadCallback): void;
    /** [CustomAd.offResize(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.offResize.html)
*
* 移除原生模板广告宽高回调事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

CustomAd.onResize(listener)
CustomAd.offResize(listener) // 需传入与监听时同一个的函数对象
``` */
    offResize(
    /** onResize 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffResizeCallback): void;
    /** [CustomAd.onClose(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.onClose.html)
     *
     * 监听原生模板广告关闭事件（仅部分可被用户关闭的模板支持）。 */
    onClose(
    /** 原生模板广告关闭事件的监听函数 */
    listener: UDPSocketOnCloseCallback): void;
    /** [CustomAd.onError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.onError.html)
     *
     * 监听原生模板广告错误事件。
     *
     * **错误码信息与解决方案表**
     *
     *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。可以针对异常返回加上适当的监控信息辅助排查现网情况。
     *
     * | 代码 | 异常情况 | 理由 | 解决方案 |
     * | ------ | -------------- | --------------- | -------------------------- |
     * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
     * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
     * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
     * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
     * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
     * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1007  | 广告组件被封禁  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
     * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。|
     * | 2001  | 模板渲染错误  | 渲染过程出现错误 | |
     * | 2002  | 模板为空  | 该广告位的广告能力已经被关闭 | |
     * | 2003  | 模板解析失败  | 该广告位的广告能力已经被关闭 | |
     * | 2004  | 触发频率限制  | 小程序启动一定时间内不允许展示原生模板广告 | |
     * | 2005  | 触发频率限制  | 距离小程序插屏广告或者激励视频广告上次播放时间间隔不足，不允许展示原生模板广告 | | */
    onError(
    /** 原生模板广告错误事件的监听函数 */
    listener: CustomAdOnErrorCallback): void;
    /** [CustomAd.onHide(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.onHide.html)
     *
     * 需要基础库： `2.14.4`
     *
     * 监听原生模板广告隐藏事件, 某些模板如矩阵格子模板用户点击关闭时也会触发该事件。 */
    onHide(
    /** 原生模板广告隐藏事件的监听函数 */
    listener: OnHideCallback): void;
    /** [CustomAd.onLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.onLoad.html)
     *
     * 监听原生模板广告加载事件。 */
    onLoad(
    /** 原生模板广告加载事件的监听函数 */
    listener: OnLoadCallback): void;
    /** [CustomAd.onResize(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.onResize.html)
     *
     * 监听原生模板广告宽高回调事件（部分横幅模板支持）。 */
    onResize(
    /** 原生模板广告宽高回调事件的监听函数 */
    listener: OnResizeCallback): void;
    /** [Promise CustomAd.hide()](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.hide.html)
     *
     * 隐藏原生模板广告。（某些模板广告无法隐藏） */
    hide(): Promise<any>;
    /** [Promise CustomAd.show()](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.show.html)
     *
     * 显示原生模板广告。 */
    show(): Promise<any>;
    /** [boolean CustomAd.isShow()](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.isShow.html)
     *
     * 查询原生模板广告展示状态。 */
    isShow(): boolean;
}
/** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
type CustomAdOffErrorCallback = (result: CustomAdOnErrorListenerResult) => void;
/** 原生模板广告错误事件的监听函数 */
type CustomAdOnErrorCallback = (result: CustomAdOnErrorListenerResult) => void;
interface CustomAdOnErrorListenerResult {
    /** 需要基础库： `2.2.2`
     *
     * 错误码
     *
     * 可选值：
     * - 1000: 后端接口调用失败;
     * - 1001: 参数错误;
     * - 1002: 广告单元无效;
     * - 1003: 内部错误;
     * - 1004: 无合适的广告;
     * - 1005: 广告组件审核中;
     * - 1006: 广告组件被驳回;
     * - 1007: 广告组件被封禁;
     * - 1008: 广告单元已关闭;
     * - 2001: 模板渲染错误;
     * - 2002: 模板为空;
     * - 2003: 模板解析失败;
     * - 2004: 触发频率限制;
     * - 2005: 触发频率限制; */
    errCode: 1000 | 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008 | 2001 | 2002 | 2003 | 2004 | 2005;
    /** 错误信息 */
    errMsg: string;
}
/** 原生模板广告组件的样式 */
interface CustomAdStyle {
    /** (只对小程序适用) 原生模板广告组件是否固定屏幕位置（不跟随屏幕滚动） */
    fixed: boolean;
    /** 原生模板广告组件的左上角横坐标 */
    left: number;
    /** 原生模板广告组件的左上角纵坐标 */
    top: number;
}
/** 需要获取的数据指标的对象数组 */
interface DataType {
    /** 见type表格说明 */
    type: number;
    /** 部分type需要传，见type表格说明 */
    subKey?: string;
}
/** 直玩广告状态信息 */
interface DirectAdStatusInfo {
    /** 当前是否处于直接广告中 */
    isInDirectGameAd: boolean;
    /** 当前是否处于蒙层阶段 */
    isInMask: boolean;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type EnterChatToolModeCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type EnterChatToolModeFailCallback = (res: GeneralCallbackResult) => void;
interface EnterChatToolModeOption {
    /** 聊天室 id，不传则拉起群选择框，可以传入多聊群的 opengid 值 */
    chatToolRooms?: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: EnterChatToolModeCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: EnterChatToolModeFailCallback;
    /** 多选模式下最多选择的群聊数量 */
    selectLimit?: number;
    /** 是否单选群聊，true 为单选，false 为多选 */
    singleChatRoom?: boolean;
    /** 接口调用成功的回调函数 */
    success?: EnterChatToolModeSuccessCallback;
}
/** 接口调用成功的回调函数 */
type EnterChatToolModeSuccessCallback = (res: GeneralCallbackResult) => void;
/** 启动参数 */
interface EnterOptionsGame {
    /** 需要基础库： `2.20.0`
     *
     * API 类别
     *
     * 可选值：
     * - 'default': 默认类别;
     * - 'nativeFunctionalized': 原生功能化，视频号直播商品、商品橱窗等场景打开的小程序;
     * - 'browseOnly': 仅浏览，朋友圈快照页等场景打开的小程序;
     * - 'embedded': 内嵌，通过打开半屏小程序能力打开的小程序; */
    apiCategory: 'default' | 'nativeFunctionalized' | 'browseOnly' | 'embedded';
    /** 启动小游戏的 query 参数 */
    query: Record<string, string>;
    /** 来源信息。从另一个小程序、公众号或 App 进入小程序时返回。否则返回 `{}`。(参见后文注意) */
    referrerInfo: EnterOptionsGameReferrerInfo;
    /** 启动小游戏的[场景值](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/scene.html) */
    scene: number;
    /** 从微信群聊/单聊打开小程序时，chatType 表示具体微信群聊/单聊类型
     *
     * 可选值：
     * - 1: 微信联系人单聊;
     * - 2: 企业微信联系人单聊;
     * - 3: 普通微信群聊;
     * - 4: 企业微信互通群聊; */
    chatType?: 1 | 2 | 3 | 4;
    /** shareTicket，详见[获取更多转发信息](#) */
    shareTicket?: string;
}
/** 来源信息。从另一个小程序、公众号或 App 进入小程序时返回。否则返回 `{}`。(参见后文注意) */
interface EnterOptionsGameReferrerInfo {
    /** 来源小程序、公众号或 App 的 appId */
    appId: string;
    /** 来源小程序传过来的数据，scene=1037或1038时支持 */
    extraData: IAnyObject;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ExitChatToolCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ExitChatToolFailCallback = (res: GeneralCallbackResult) => void;
interface ExitChatToolOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ExitChatToolCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: ExitChatToolFailCallback;
    /** 接口调用成功的回调函数 */
    success?: ExitChatToolSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ExitChatToolSuccessCallback = (res: GeneralCallbackResult) => void;
/** 客服信息 */
interface ExtInfoOption {
    /** 客服链接 */
    url: string;
}
interface FacialRecognitionError {
    /** 错误信息
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 0 | 人脸识别成功 |  |
     * | 2002004 | 人脸识别失败 |  |
     * | 2002006 | 用户取消/超时/不同意，导致未完成人脸识别 |  |
     * | 2002007 | 本用户7天内人脸识别已通过，通过日期为XX |  |
     * | 2002008 | 本日已调起过人脸识别或者本月调用次数已达上限 |  |
     * | 2002009 | 无权限发起人脸识别 |  | */ errMsg: string;
    /** 错误码
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 0 | 人脸识别成功 |  |
     * | 2002004 | 人脸识别失败 |  |
     * | 2002006 | 用户取消/超时/不同意，导致未完成人脸识别 |  |
     * | 2002007 | 本用户7天内人脸识别已通过，通过日期为XX |  |
     * | 2002008 | 本日已调起过人脸识别或者本月调用次数已达上限 |  |
     * | 2002009 | 无权限发起人脸识别 |  | */ errCode: number;
}
/** 用户点击后打开意见反馈页面的按钮 */
interface FeedbackButton {
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
    /** [FeedbackButton.destroy()](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/FeedbackButton.destroy.html)
     *
     * 销毁意见反馈按钮 */
    destroy(): void;
    /** [FeedbackButton.hide()](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/FeedbackButton.hide.html)
     *
     * 隐藏意见反馈按钮。 */
    hide(): void;
    /** [FeedbackButton.offTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/FeedbackButton.offTap.html)
*
* 移除意见反馈按钮的点击事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

FeedbackButton.onTap(listener)
FeedbackButton.offTap(listener) // 需传入与监听时同一个的函数对象
``` */
    offTap(
    /** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: GameClubButtonOffTapCallback): void;
    /** [FeedbackButton.onTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/FeedbackButton.onTap.html)
     *
     * 监听意见反馈按钮的点击事件 */
    onTap(
    /** 意见反馈按钮的点击事件的监听函数 */
    listener: GameClubButtonOnTapCallback): void;
    /** [FeedbackButton.show()](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/FeedbackButton.show.html)
     *
     * 显示意见反馈按钮 */
    show(): void;
}
/** 用户信息 */
interface FriendInfo {
    /** 用户的微信头像 url */
    avatarUrl: string;
    /** 用户的微信昵称 */
    nickname: string;
    /** 用户 openid */
    openid: string;
}
/** 用户送礼状态信息
 *
 * ****
 *
 * ### blockCode 枚举
 *   | 值  | 含义       |
 *   | --- | --------- |
 *   | 151066168 | 当前时间周期已经赠送，目前支持一天赠送一次    |
 *   | 151066169 |  注册天数不足 首次注册时间必须大于 24 小时才能赠礼   | */
interface FriendSendGiftStatus {
    /** 禁止送礼原因枚举，该字段在 blockSend 为 false 的时候不会返回 */
    blockCode: number;
    /** 禁止送礼原因描述，该字段在 blockSend 为 false 的时候不会返回 */
    blockReason: string;
    /** 是否禁止送礼，false 代表当前可以发起赠送 */
    blockSend: boolean;
    /** 用户的 openid */
    openid: string;
}
/** 游戏圈按钮。游戏圈按钮被点击后会跳转到小游戏的游戏圈。更多关于游戏圈的信息见 [游戏圈使用指南](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/game-club.html) */
interface GameClubButton {
    /** 游戏圈按钮的图标，仅当 type 参数为 image 时有效。
     *
     * 可选值：
     * - 'green': 绿色的图标;
     * - 'white': 白色的图标;
     * - 'dark': 有黑色圆角背景的白色图标;
     * - 'light': 有白色圆角背景的绿色图标; */
    icon: 'green' | 'white' | 'dark' | 'light';
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
    /** [GameClubButton.destroy()](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/GameClubButton.destroy.html)
     *
     * 销毁游戏圈按钮 */
    destroy(): void;
    /** [GameClubButton.hide()](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/GameClubButton.hide.html)
     *
     * 隐藏游戏圈按钮 */
    hide(): void;
    /** [GameClubButton.offTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/GameClubButton.offTap.html)
*
* 移除游戏圈按钮的点击事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

GameClubButton.onTap(listener)
GameClubButton.offTap(listener) // 需传入与监听时同一个的函数对象
``` */
    offTap(
    /** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: GameClubButtonOffTapCallback): void;
    /** [GameClubButton.onTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/GameClubButton.onTap.html)
     *
     * 监听游戏圈按钮的点击事件 */
    onTap(
    /** 游戏圈按钮的点击事件的监听函数 */
    listener: GameClubButtonOnTapCallback): void;
    /** [GameClubButton.show()](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/GameClubButton.show.html)
     *
     * 显示游戏圈按钮 */
    show(): void;
}
/** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
type GameClubButtonOffTapCallback = (res: GeneralCallbackResult) => void;
type GameClubButtonOnTapCallback = (res: GeneralCallbackResult) => void;
/** 结果对象，各项为实验的相关信息 */
interface GameExptInfo {
    /** 实验ID，标识实验 */
    expt_id: number;
    /** 参数名称 */
    param_name: string;
    /** 参数值 */
    param_value: string;
}
interface GeneralCallbackResult {
    /** 错误信息 */
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetChannelsLiveInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetChannelsLiveInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetChannelsLiveInfoOption {
    /** 视频号 id，以“sph”开头的id，可在视频号助手获取 */
    finderUserName: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetChannelsLiveInfoCompleteCallback;
    /** 需要基础库： `2.29.0`
     *
     * 结束时间，筛选指定时间段的直播。若上传了startTime，未上传endTime，则endTime默认取当前时间 */
    endTime?: number;
    /** 接口调用失败的回调函数 */
    fail?: GetChannelsLiveInfoFailCallback;
    /** 需要基础库： `2.29.0`
     *
     * 起始时间，筛选指定时间段的直播。若上传了endTime，未上传startTime，则startTime默认为0 */
    startTime?: number;
    /** 接口调用成功的回调函数 */
    success?: GetChannelsLiveInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetChannelsLiveInfoSuccessCallback = (result: GetChannelsLiveInfoSuccessCallbackResult) => void;
interface GetChannelsLiveInfoSuccessCallbackResult {
    /** 直播主题 */
    description: string;
    /** 直播 feedId */
    feedId: string;
    /** 视频号头像 */
    headUrl: string;
    /** 视频号昵称 */
    nickname: string;
    /** 直播 nonceId */
    nonceId: string;
    /** 需要基础库： `2.29.0`
     *
     * 除最近的一条直播外，其他的直播列表（注意：每次最多返回按时间戳增序排列的15个直播信息，其中时间最近的那个直播会在接口其他的返回参数中展示，其余的直播会在该字段中展示）。 */
    otherInfos: IAnyObject[];
    /** 需要基础库： `2.29.0`
     *
     * 直播回放状态
     *
     * 可选值：
     * - 0: 未生成;
     * - 1: 已生成;
     * - 3: 生成中;
     * - 6: 已过期; */
    replayStatus: 0 | 1 | 3 | 6;
    /** 直播状态
     *
     * 可选值：
     * - 1: 直播状态不存在（针对未开过直播的主播）;
     * - 2: 直播中;
     * - 3: 直播已结束;
     * - 4: 直播准备中（未开播）; */
    status: 1 | 2 | 3 | 4;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetChannelsLiveNoticeInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetChannelsLiveNoticeInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetChannelsLiveNoticeInfoOption {
    /** 视频号 id，以“sph”开头的id，可在视频号助手获取 */
    finderUserName: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetChannelsLiveNoticeInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetChannelsLiveNoticeInfoFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetChannelsLiveNoticeInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetChannelsLiveNoticeInfoSuccessCallback = (result: GetChannelsLiveNoticeInfoSuccessCallbackResult) => void;
interface GetChannelsLiveNoticeInfoSuccessCallbackResult {
    /** 直播封面 */
    headUrl: string;
    /** 视频号昵称 */
    nickname: string;
    /** 预告 id */
    noticeId: string;
    /** 需要基础库： `2.24.6`
     *
     * 除最近的一条预告信息外，其他的预告信息列表（注意：每次最多返回按时间戳增序排列的15个预告信息，其中时间最近的那个预告信息会在接口其他的返回参数中展示，其余的预告信息会在该字段中展示）。 */
    otherInfos: IAnyObject[];
    /** 是否可预约 */
    reservable: boolean;
    /** 开始时间 */
    startTime: string;
    /** 预告状态：0可用 1取消 2已用 */
    status: number;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetChatToolInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetChatToolInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetChatToolInfoOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetChatToolInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetChatToolInfoFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetChatToolInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetChatToolInfoSuccessCallback = (result: RequestMidasFriendPaymentSuccessCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetFriendCloudStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetFriendCloudStorageFailCallback = (res: GeneralCallbackResult) => void;
interface GetFriendCloudStorageOption {
    /** 要拉取的 key 列表 */
    keyList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetFriendCloudStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetFriendCloudStorageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetFriendCloudStorageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetFriendCloudStorageSuccessCallback = (result: GetFriendCloudStorageSuccessCallbackResult) => void;
interface GetFriendCloudStorageSuccessCallbackResult {
    /** 同玩好友的托管数据 */
    data: UserGameData[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetFriendSendGiftStatusCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetFriendSendGiftStatusFailCallback = (res: GeneralCallbackResult) => void;
interface GetFriendSendGiftStatusOption {
    /** 礼包 id */
    giftId: string;
    /** 要查询的 openid 列表 */
    openidList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetFriendSendGiftStatusCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetFriendSendGiftStatusFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetFriendSendGiftStatusSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetFriendSendGiftStatusSuccessCallback = (result: GetFriendSendGiftStatusSuccessCallbackResult) => void;
interface GetFriendSendGiftStatusSuccessCallbackResult {
    /** 好友送礼状态信息列表 */
    data: FriendSendGiftStatus[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetGameClubDataCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetGameClubDataFailCallback = (res: GeneralCallbackResult) => void;
interface GetGameClubDataOption {
    /** 需要获取的数据指标的对象数组 */
    dataTypeList: DataType[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetGameClubDataCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetGameClubDataFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetGameClubDataSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetGameClubDataSuccessCallback = (result: GetGameClubDataSuccessCallbackResult) => void;
interface GetGameClubDataSuccessCallbackResult {
    /** 敏感数据对应的云 ID，开通云开发的小程序才会返回，可通过[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    cloudID: string;
    /** 包括 GameClubData 在内的加密数据，详见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    encryptedData: string;
    /** 加密算法的初始向量 */
    iv: string;
    /** 使用 sha1( rawData + sessionkey ) 得到字符串，用于校验用户信息 */
    signature: string;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetGameExptInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetGameExptInfoFailCallback = (res: GeneralCallbackResult) => void;
/** 配置参数对象 */
interface GetGameExptInfoOption {
    /** 实验参数数组，不填则获取所有实验参数 */
    keyList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetGameExptInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetGameExptInfoFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetGameExptInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetGameExptInfoSuccessCallback = (result: GetGameExptInfoSuccessCallbackResult) => void;
interface GetGameExptInfoSuccessCallbackResult {
    /** 结果对象，各项为实验的相关信息 */
    list: GameExptInfo[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetGroupCloudStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetGroupCloudStorageFailCallback = (res: GeneralCallbackResult) => void;
interface GetGroupCloudStorageOption {
    /** 要拉取的 key 列表 */
    keyList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetGroupCloudStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetGroupCloudStorageFailCallback;
    /** 需要基础库： `3.8.8`
     *
     * 对应群的 opengid。可通过主域中的 wx.getGroupEnterInfo 接口获取。shareTicket 与 groupid 只需要传其中一个，建议使用 groupid */
    groupid?: string;
    /** 群分享对应的 shareTicket。shareTicket 与 groupid 只需要传其中一个，建议使用 groupid */
    shareTicket?: string;
    /** 接口调用成功的回调函数 */
    success?: GetGroupCloudStorageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetGroupCloudStorageSuccessCallback = (result: GetGroupCloudStorageSuccessCallbackResult) => void;
interface GetGroupCloudStorageSuccessCallbackResult {
    /** 群同玩成员的托管数据 */
    data: UserGameData[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetGroupEnterInfoCompleteCallback = (res: GetGroupEnterInfoError) => void;
interface GetGroupEnterInfoError {
    /** 错误信息
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 40097 |  | 场景错误 |
     * | 65206 |  | 用户已不在该群内 | */ errMsg: string;
    /** 错误码
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 40097 |  | 场景错误 |
     * | 65206 |  | 用户已不在该群内 | */ errCode: number;
}
/** 接口调用失败的回调函数 */
type GetGroupEnterInfoFailCallback = (res: GetGroupEnterInfoError) => void;
interface GetGroupEnterInfoOption {
    /** 需要基础库： `3.7.8`
     *
     * 开启后单聊下返回 open_single_roomid */
    allowSingleChat?: boolean;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetGroupEnterInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetGroupEnterInfoFailCallback;
    /** 需要基础库： `3.7.8`
     *
     * 开启后返回用户在群(含单聊)下的 group_openid */
    needGroupOpenID?: boolean;
    /** 接口调用成功的回调函数 */
    success?: GetGroupEnterInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetGroupEnterInfoSuccessCallback = (result: GetGroupEnterInfoSuccessCallbackResult) => void;
interface GetGroupEnterInfoSuccessCallbackResult {
    /** 需要基础库： `2.7.0`
     *
     * 敏感数据对应的云 ID，开通[云开发](https://developers.weixin.qq.com/minigame/dev/wxcloud/basis/getting-started.html)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
    cloudID: string;
    /** 包括敏感数据在内的完整转发信息的加密数据，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    encryptedData: string;
    /** 错误信息 */
    errMsg: string;
    /** 加密算法的初始向量，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    iv: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetGroupInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetGroupInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetGroupInfoOption {
    /** 群 openGId，可通过 `wx.getGroupEnterInfo` 或 `wx.getShareInfo` 获取 */
    openGId: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetGroupInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetGroupInfoFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetGroupInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetGroupInfoSuccessCallback = (result: GetGroupInfoSuccessCallbackResult) => void;
interface GetGroupInfoSuccessCallbackResult {
    /** 群名称 */
    name: string;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetGroupMembersInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetGroupMembersInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetGroupMembersInfoOption {
    /** 需要获取的群用户的 groupOpenId 列表 */
    members: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetGroupMembersInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetGroupMembersInfoFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetGroupMembersInfoSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetGroupMembersInfoSuccessCallback = (result: GetGroupMembersInfoSuccessCallbackResult) => void;
interface GetGroupMembersInfoSuccessCallbackResult {
    /** 所选用户的头像昵称列表 */
    membersInfo: ResultOpenDataContextUserInfo[];
    errMsg: string;
}
interface GetOpenDataContextOption {
    /** 共享画布类型，有效值为 offscreenCanvas 和 screenCanvas，默认为 offscreenCanvas。区别： offscreenCanvas 模式下，sharedCanvas 绘制完后需要渲染到主屏；screenCanvas 模式下，sharedCanvas 为独立渲染，并且本身已经上屏。
     *
     * 可选值：
     * - 'offscreenCanvas': sharedCanvas 绘制完后需要渲染到主屏;
     * - 'screenCanvas': sharedCanvas 独立渲染，并且本身已经上屏; */
    sharedCanvasMode?: 'offscreenCanvas' | 'screenCanvas';
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetPhoneNumberCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetPhoneNumberFailCallback = (res: GeneralCallbackResult) => void;
interface GetPhoneNumberOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetPhoneNumberCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetPhoneNumberFailCallback;
    /** 手机号实时验证，向用户申请，并在用户同意后，快速填写和实时验证手机号 [具体说明](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/getRealtimePhoneNumber.html)。 */
    isRealtime?: boolean;
    /** 当手机号快速验证或手机号实时验证额度用尽时，是否对用户展示“申请获取你的手机号，但该功能使用次数已达当前小程序上限，暂时无法使用”的提示，默认展示。 */
    phoneNumberNoQuotaToast?: boolean;
    /** 接口调用成功的回调函数 */
    success?: GetPhoneNumberSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetPhoneNumberSuccessCallback = (result: GetPhoneNumberSuccessCallbackResult) => void;
interface GetPhoneNumberSuccessCallbackResult {
    /** 动态令牌 */
    code: string;
    /** 回调信息（成功失败都会返回） */
    errMsg: string;
    /** 错误码（失败时返回） */
    errno: number;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetPotentialFriendListCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetPotentialFriendListFailCallback = (res: GeneralCallbackResult) => void;
interface GetPotentialFriendListOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetPotentialFriendListCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetPotentialFriendListFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetPotentialFriendListSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetPotentialFriendListSuccessCallback = (result: GetPotentialFriendListSuccessCallbackResult) => void;
interface GetPotentialFriendListSuccessCallbackResult {
    /** 可能对游戏感兴趣的未注册好友名单 */
    list: FriendInfo[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetPrivacySettingCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetPrivacySettingFailCallback = (res: GeneralCallbackResult) => void;
interface GetPrivacySettingOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetPrivacySettingCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetPrivacySettingFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetPrivacySettingSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetPrivacySettingSuccessCallback = (result: GetPrivacySettingSuccessCallbackResult) => void;
interface GetPrivacySettingSuccessCallbackResult {
    /** 是否需要用户授权隐私协议（如果开发者没有在「MP后台-设置-服务内容声明-用户隐私保护指引」中声明隐私收集类型则会返回false；如果开发者声明了隐私收集，且用户之前同意过隐私协议则会返回false；如果开发者声明了隐私收集，且用户还没同意过则返回true；如果用户之前同意过、但后来小程序又新增了隐私收集类型也会返回true） */
    needAuthorization: boolean;
    /** 隐私授权协议的名称 */
    privacyContractName: string;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetRelationFriendListCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetRelationFriendListFailCallback = (res: GeneralCallbackResult) => void;
interface GetRelationFriendListOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetRelationFriendListCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetRelationFriendListFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetRelationFriendListSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetRelationFriendListSuccessCallback = (result: GetRelationFriendListSuccessCallbackResult) => void;
interface GetRelationFriendListSuccessCallbackResult {
    /** 敏感数据对应的云 ID，开通云开发的小程序才会返回，可通过[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    cloudID: string;
    /** 包括 RelationFriendData 在内的加密数据，详见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    encryptedData: string;
    /** 加密算法的初始向量 */
    iv: string;
    /** 使用 sha1( rawData + sessionkey ) 得到字符串，用于校验用户信息 */
    signature: string;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetScoreCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetScoreFailCallback = (res: GeneralCallbackResult) => void;
/** 入参对象 */
interface GetScoreParams {
    /** 查询的周期：1：自然日最高分；2：自然周最高分；3：自然月最高分；4：历史最高分；5 最新得分 */
    periodType: number;
    /** 玩法唯一标识数组 */
    scoreKeys: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetScoreCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetScoreFailCallback;
    /** 可选子 key 数组，从基础库版本3.12.1开始支持 */
    subScoreKeys?: number[];
    /** 接口调用成功的回调函数 */
    success?: GetScoreSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetScoreSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetSettingCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetSettingFailCallback = (res: GeneralCallbackResult) => void;
interface GetSettingOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetSettingCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetSettingFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetSettingSuccessCallback;
    /** 需要基础库： `2.10.1`
     *
     * 是否同时获取用户订阅消息的订阅状态，默认不获取。注意：withSubscriptions 只返回用户勾选过订阅面板中的“总是保持以上选择，不再询问”的订阅消息。 */
    withSubscriptions?: boolean;
}
/** 接口调用成功的回调函数 */
type GetSettingSuccessCallback = (result: GetSettingSuccessCallbackResult) => void;
interface GetSettingSuccessCallbackResult {
    /** [AuthSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/AuthSetting.html)
     *
     * 用户授权结果 */
    authSetting: AuthSetting;
    /** [SubscriptionsSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/SubscriptionsSetting.html)
     *
     * 需要基础库： `2.10.1`
     *
     * 用户订阅消息设置，接口参数`withSubscriptions`值为`true`时才会返回。 */
    subscriptionsSetting: SubscriptionsSetting;
    /** [AuthSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/AuthSetting.html)
     *
     * 在插件中调用时，当前宿主小程序的用户授权结果 */
    miniprogramAuthSetting?: AuthSetting;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetShareInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetShareInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetShareInfoOption {
    /** shareTicket，详见[获取更多转发信息](#) */
    shareTicket: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetShareInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetShareInfoFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetShareInfoSuccessCallback;
    /** 需要基础库： `1.9.90`
     *
     * 超时时间，单位 ms */
    timeout?: number;
}
/** 接口调用成功的回调函数 */
type GetShareInfoSuccessCallback = (result: GetGroupEnterInfoSuccessCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetShowSplashAdStatusCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetShowSplashAdStatusFailCallback = (res: GeneralCallbackResult) => void;
interface GetShowSplashAdStatusOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetShowSplashAdStatusCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetShowSplashAdStatusFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetShowSplashAdStatusSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetShowSplashAdStatusSuccessCallback = (result: GetShowSplashAdStatusSuccessCallbackResult) => void;
interface GetShowSplashAdStatusSuccessCallbackResult {
    /** 封面广告组件展示状态码
     *
     * 可选值：
     * - -1: 初始值，状态未知;
     * - 1: 展示成功;
     * - 2: 主动拦截过滤，不展示广告;
     * - 3: 展示超时; */
    code: -1 | 1 | 2 | 3;
    /** 封面广告组件展示状态
     *
     * 可选值：
     * - 'unknown': 初始值，状态未知;
     * - 'pending': 进行展示中;
     * - 'success': 展示成功;
     * - 'fail': 展示失败; */
    status: 'unknown' | 'pending' | 'success' | 'fail';
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetUserCloudStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetUserCloudStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetUserCloudStorageKeysCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetUserCloudStorageKeysFailCallback = (res: GeneralCallbackResult) => void;
interface GetUserCloudStorageKeysOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetUserCloudStorageKeysCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetUserCloudStorageKeysFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetUserCloudStorageKeysSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetUserCloudStorageKeysSuccessCallback = (result: GetUserCloudStorageKeysSuccessCallbackResult) => void;
interface GetUserCloudStorageKeysSuccessCallbackResult {
    /** 用户托管数据当中所有的 key 数组 */
    keys: string[];
    errMsg: string;
}
interface GetUserCloudStorageOption {
    /** 要获取的 key 列表 */
    keyList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetUserCloudStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetUserCloudStorageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetUserCloudStorageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetUserCloudStorageSuccessCallback = (result: GetUserCloudStorageSuccessCallbackResult) => void;
interface GetUserCloudStorageSuccessCallbackResult {
    /** 用户托管的 KV 数据列表 */
    KVDataList: KVData[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetUserInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetUserInfoFailCallback = (res: GeneralCallbackResult) => void;
interface GetUserInfoOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetUserInfoCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetUserInfoFailCallback;
    /** 显示用户信息的语言
     *
     * 可选值：
     * - 'en': 英文;
     * - 'zh_CN': 简体中文;
     * - 'zh_TW': 繁体中文; */
    lang?: 'en' | 'zh_CN' | 'zh_TW';
    /** 接口调用成功的回调函数 */
    success?: GetUserInfoSuccessCallback;
    /** 是否带上登录态信息。当 withCredentials 为 true 时，要求此前有调用过 wx.login 且登录态尚未过期，此时返回的数据会包含 encryptedData, iv 等敏感信息；当 withCredentials 为 false 时，不要求有登录态，返回的数据不包含 encryptedData, iv 等敏感信息。 */
    withCredentials?: boolean;
}
/** 接口调用成功的回调函数 */
type GetUserInfoSuccessCallback = (result: GetUserInfoSuccessCallbackResult) => void;
interface GetUserInfoSuccessCallbackResult {
    /** 需要基础库： `2.7.0`
     *
     * 敏感数据对应的云 ID，开通[云开发](https://developers.weixin.qq.com/minigame/dev/wxcloud/basis/getting-started.html)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
    cloudID: string;
    /** 包括敏感数据在内的完整用户信息的加密数据，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) */
    encryptedData: string;
    /** 加密算法的初始向量，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) */
    iv: string;
    /** 不包括敏感信息的原始数据字符串，用于计算签名 */
    rawData: string;
    /** 使用 sha1( rawData + sessionkey ) 得到字符串，用于校验用户信息，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    signature: string;
    /** [UserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfo.html)
     *
     * 用户信息对象，不包含 openid 等敏感信息 */
    userInfo: UserInfo;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetUserInteractiveStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetUserInteractiveStorageFailCallback = (result: GetUserInteractiveStorageFailCallbackResult) => void;
interface GetUserInteractiveStorageFailCallbackResult {
    /** 错误码
     *
     * 可选值：
     * - -17008: 非法的 key; */
    errCode: -17008;
    /** 错误信息 */
    errMsg: string;
}
interface GetUserInteractiveStorageOption {
    /** 要获取的 key 列表 */
    keyList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetUserInteractiveStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetUserInteractiveStorageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetUserInteractiveStorageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetUserInteractiveStorageSuccessCallback = (result: GetUserInteractiveStorageSuccessCallbackResult) => void;
interface GetUserInteractiveStorageSuccessCallbackResult {
    /** 敏感数据对应的云 ID，开通[云开发](https://developers.weixin.qq.com/minigame/dev/wxcloud/basis/getting-started.html)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
    cloudID: string;
    /** 加密数据，包含互动型托管数据的值。解密后的结果为一个 `KVDataList`，每一项为一个 `KVData`。 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) */
    encryptedData: string;
    /** 加密算法的初始向量，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) */
    iv: string;
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetWeRunDataCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetWeRunDataFailCallback = (res: GeneralCallbackResult) => void;
interface GetWeRunDataOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: GetWeRunDataCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: GetWeRunDataFailCallback;
    /** 接口调用成功的回调函数 */
    success?: GetWeRunDataSuccessCallback;
}
/** 接口调用成功的回调函数 */
type GetWeRunDataSuccessCallback = (result: GetWeRunDataSuccessCallbackResult) => void;
interface GetWeRunDataSuccessCallbackResult {
    /** 需要基础库： `2.7.0`
     *
     * 敏感数据对应的云 ID，开通云开发的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
    cloudID: string;
    /** 包括敏感数据在内的完整用户信息的加密数据，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html)。解密后得到的数据结构见后文 */
    encryptedData: string;
    /** 加密算法的初始向量，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    iv: string;
    errMsg: string;
}
/** @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
 *
 * grid(格子) 广告组件。grid(格子) 广告组件是一个原生组件，层级比普通组件高。grid(格子) 广告组件默认是隐藏的，需要调用 GridAd.show() 将其显示。grid(格子) 广告会根据开发者设置的宽度进行等比缩放，缩放后的尺寸将通过 GridAd.onResize() 事件中提供。 */
interface GridAd {
    /** grid(格子) 广告广告组件的主题，提供 `white` `black` 两种主题选择。 */
    adTheme: string;
    /** grid(格子) 广告组件的格子个数，可设置爱5，8两种格子个数样式，默认值为5 */
    gridCount: number;
    /** grid(格子) 广告广告组件的样式。style 上的属性的值仅为开发者设置的grid(格子) 广告) 广告会根据开发者设置的宽度进行等比缩放，缩放后的真实尺寸需要通过 GridAd.onResize() 事件获得。 */
    style: GridAdStyle;
    /** [GridAd.destroy()](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.destroy.html)
     *
     * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
     *
     * 销毁 grid(格子) 广告。 */
    destroy(): void;
    /** [GridAd.hide()](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.hide.html)
     *
     * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
     *
     * 隐藏 grid(格子) 广告。 */
    hide(): void;
    /** [GridAd.offError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.offError.html)
*
* @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
*
* 移除 grid(格子) 广告错误事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

GridAd.onError(listener)
GridAd.offError(listener) // 需传入与监听时同一个的函数对象
``` */
    offError(
    /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: GridAdOffErrorCallback): void;
    /** [GridAd.offLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.offLoad.html)
*
* @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
*
* 移除 grid(格子) 广告加载事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

GridAd.onLoad(listener)
GridAd.offLoad(listener) // 需传入与监听时同一个的函数对象
``` */
    offLoad(
    /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffLoadCallback): void;
    /** [GridAd.offResize(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.offResize.html)
*
* @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
*
* 移除 grid(格子) 广告尺寸变化事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

GridAd.onResize(listener)
GridAd.offResize(listener) // 需传入与监听时同一个的函数对象
``` */
    offResize(
    /** onResize 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffResizeCallback): void;
    /** [GridAd.onError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.onError.html)
     *
     * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
     *
     * 监听 grid(格子) 广告错误事件。
     *
     * **错误码信息与解决方案表**
     *
     *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。可以针对异常返回加上适当的监控信息辅助排查现网情况。
     *
     * | 代码 | 异常情况 | 理由 | 解决方案 |
     * | ------ | -------------- | --------------- | -------------------------- |
     * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
     * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
     * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
     * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
     * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
     * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1007  | 广告组件被封禁  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
     * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。| */
    onError(
    /** grid(格子) 广告错误事件的监听函数 */
    listener: GridAdOnErrorCallback): void;
    /** [GridAd.onLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.onLoad.html)
     *
     * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
     *
     * 监听 grid(格子) 广告加载事件。 */
    onLoad(
    /** grid(格子) 广告加载事件的监听函数 */
    listener: OnLoadCallback): void;
    /** [GridAd.onResize(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.onResize.html)
     *
     * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
     *
     * 监听 grid(格子) 广告尺寸变化事件。 */
    onResize(
    /** grid(格子) 广告尺寸变化事件的监听函数 */
    listener: OnResizeCallback): void;
    /** [Promise GridAd.show()](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.show.html)
     *
     * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
     *
     * 显示 grid(格子) 广告。 */
    show(): Promise<any>;
}
/** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
type GridAdOffErrorCallback = (result: GridAdOnErrorListenerResult) => void;
type GridAdOnErrorCallback = (result: GridAdOnErrorListenerResult) => void;
interface GridAdOnErrorListenerResult {
    /** 需要基础库： `2.2.2`
     *
     * 错误码
     *
     * 可选值：
     * - 1000: 后端接口调用失败;
     * - 1001: 参数错误;
     * - 1002: 广告单元无效;
     * - 1003: 内部错误;
     * - 1004: 无合适的广告;
     * - 1005: 广告组件审核中;
     * - 1006: 广告组件被驳回;
     * - 1007: 广告组件被封禁;
     * - 1008: 广告单元已关闭; */
    errCode: 1000 | 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008;
    /** 错误信息 */
    errMsg: string;
}
/** grid(格子) 广告广告组件的样式。style 上的属性的值仅为开发者设置的grid(格子) 广告) 广告会根据开发者设置的宽度进行等比缩放，缩放后的真实尺寸需要通过 GridAd.onResize() 事件获得。 */
interface GridAdStyle {
    /** grid(格子) 广告组件的高度 */
    height: number;
    /** grid(格子) 广告广告组件的左上角横坐标 */
    left: number;
    /** grid(格子) 广告组件经过缩放后真实的高度 */
    realHeight: number;
    /** grid(格子) 广告组件经过缩放后真实的宽度 */
    realWidth: number;
    /** grid(格子) 广告组件的左上角纵坐标 */
    top: number;
    /** grid(格子) 广告组件的宽度。最小 300，最大至 `屏幕宽度`（屏幕宽度可以通过 wx.getSystemInfoSync() 获取）。 */
    width: number;
}
interface GroupMemberInfo {
    /** 所选用户在此聊天室下的唯一标识，同一个用户在不同的聊天室下id不同 */
    members: string[];
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type HideShareMenuCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type HideShareMenuFailCallback = (res: GeneralCallbackResult) => void;
interface HideShareMenuOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: HideShareMenuCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: HideShareMenuFailCallback;
    /** 需要基础库： `2.11.3`
     *
     * 本接口为 Beta 版本，暂只在 Android 平台支持。需要隐藏的转发按钮名称列表，默认['shareAppMessage', 'shareTimeline']。按钮名称合法值包含 "shareAppMessage"、"shareTimeline" 两种 */
    menus?: string[];
    /** 接口调用成功的回调函数 */
    success?: HideShareMenuSuccessCallback;
}
/** 接口调用成功的回调函数 */
type HideShareMenuSuccessCallback = (res: GeneralCallbackResult) => void;
type IAnyObject = Record<string, any>;
interface InterstitialAd {
    /** [InterstitialAd.destroy()](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.destroy.html)
     *
     * 需要基础库： `2.8.0`
     *
     * 销毁插屏广告实例。 */
    destroy(): void;
    /** [InterstitialAd.offClose(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.offClose.html)
*
* 移除插屏广告关闭事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

InterstitialAd.onClose(listener)
InterstitialAd.offClose(listener) // 需传入与监听时同一个的函数对象
``` */
    offClose(
    /** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: UDPSocketOffCloseCallback): void;
    /** [InterstitialAd.offError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.offError.html)
*
* 移除插屏错误事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

InterstitialAd.onError(listener)
InterstitialAd.offError(listener) // 需传入与监听时同一个的函数对象
``` */
    offError(
    /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: InterstitialAdOffErrorCallback): void;
    /** [InterstitialAd.offLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.offLoad.html)
*
* 移除插屏广告加载事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

InterstitialAd.onLoad(listener)
InterstitialAd.offLoad(listener) // 需传入与监听时同一个的函数对象
``` */
    offLoad(
    /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffLoadCallback): void;
    /** [InterstitialAd.onClose(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.onClose.html)
     *
     * 监听插屏广告关闭事件。 */
    onClose(
    /** 插屏广告关闭事件的监听函数 */
    listener: UDPSocketOnCloseCallback): void;
    /** [InterstitialAd.onError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.onError.html)
     *
     * 监听插屏错误事件。
     *
     * **错误码信息与解决方案表**
     *
     *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。可以针对异常返回加上适当的监控信息辅助排查现网情况。
     *
     * | 代码 | 异常情况 | 理由 | 解决方案 |
     * | ------ | -------------- | --------------- | -------------------------- |
     * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
     * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
     * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
     * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
     * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
     * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1007  | 广告组件被封禁  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
     * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。| */
    onError(
    /** 插屏错误事件的监听函数 */
    listener: InterstitialAdOnErrorCallback): void;
    /** [InterstitialAd.onLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.onLoad.html)
     *
     * 监听插屏广告加载事件。 */
    onLoad(
    /** 插屏广告加载事件的监听函数 */
    listener: OnLoadCallback): void;
    /** [Promise InterstitialAd.load()](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.load.html)
     *
     * 需要基础库： `2.8.0`
     *
     * 加载插屏广告。 */
    load(): Promise<any>;
    /** [Promise InterstitialAd.show()](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.show.html)
     *
     * 显示插屏广告。
     *
     * **错误码信息表**
     *
     *  如果插屏广告显示失败，InterstitialAd.show() 方法会返回一个rejected Promise，开发者可以获取到错误码及对应的错误信息。
     *
     * | 代码 | 异常情况 | 理由 |
     * | ------ | -------------- | -------------------------- |
     * | 2001  | 触发频率限制  | 小程序启动一定时间内不允许展示插屏广告 |
     * | 2002  | 触发频率限制  | 距离小程序插屏广告或者激励视频广告上次播放时间间隔不足，不允许展示插屏广告 |
     * | 2003  | 触发频率限制  | 当前正在播放激励视频广告或者插屏广告，不允许再次展示插屏广告 |
     * | 2004  | 广告渲染失败  | 该项错误不是开发者的异常情况，或因小程序页面切换导致广告渲染失败 |
     * | 2005  | 广告调用异常  | 插屏广告实例不允许跨页面调用 | */
    show(): Promise<any>;
}
/** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
type InterstitialAdOffErrorCallback = (result: InterstitialAdOnErrorListenerResult) => void;
/** 插屏错误事件的监听函数 */
type InterstitialAdOnErrorCallback = (result: InterstitialAdOnErrorListenerResult) => void;
interface InterstitialAdOnErrorListenerResult {
    /** 错误码
     *
     * 可选值：
     * - 1000: 后端接口调用失败;
     * - 1001: 参数错误;
     * - 1002: 广告单元无效;
     * - 1003: 内部错误;
     * - 1004: 无合适的广告;
     * - 1005: 广告组件审核中;
     * - 1006: 广告组件被驳回;
     * - 1007: 广告组件被封禁;
     * - 1008: 广告单元已关闭; */
    errCode: 1000 | 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008;
    /** 错误信息 */
    errMsg: string;
}
/** 托管的 KV 数据
*
* **将排行榜显示在小游戏中心**
*
* 若开发者希望把游戏的排行榜显示于小游戏中心，则需要把排行榜数据存储到对应的key/value中，一个排行榜数据对应一个key，多个排行榜则多个key。同时在mp.weixin.qq.com的小游戏管理后台“设置-游戏-排行榜设置”下配置对应的key以及相关排行榜属性。且value的内容必须是JSON Object格式序列化的字符串，该JSON Object顶层必须包含 `wxgame` 字段，定义如下：
*
* |   属性名    |  类型  | 必填 |               说明               |
* |-------------|--------|------|----------------------------------|
* | score       | Int32  | 是   | 该榜单对应分数值                 |
* | update_time | Int64  | 是   | 该分数最后更新时间，Unix时间戳   |
*
* 注意： `wxgame`下开发者不可自定义其他字段， `wxgame`同级开发者可自由定义，比如定义一个`detail` 字段，用于存储取得该分数的中间状态。
*
* ### 举例
*
* 比如某小游戏有一个分数排行榜，分数排行榜需要记录分数以及获得分数的耗时（游戏内的排行榜需要展示耗时），可以在`wxgame`同级别定义一个`cost_ms`字段，存储耗时的毫秒数。
* 分配一个不和已定义的托管数据的key相冲突的key作为分数排行榜的key，如 "score"。
*
* 在玩家耗时36500ms后，获得本周最高分16分，则需要更新分数，假设当前时间戳为1513080573， 则完整 value在序列化之前的内容如下：
* ```json
{
"wxgame": {
    "score":16,
    "update_time": 1513080573
},
"cost_ms":36500
}
```
*
* 最终序列化为string后，value为`{\"wxgame\":{\"score\":16,\"update_time\": 1513080573},\"cost_ms\":36500}`。 */
interface KVData {
    /** 数据的 key */
    key: string;
    /** 数据的 value */
    value: string;
}
/** 启动参数 */
interface LaunchOptionsGame {
    /** 宿主传递的数据，第三方 app 中运行小游戏时返回，类型为json字符串，其中需要 host_scene 字段，表示宿主app对应的场景值 */
    hostExtraData: string;
    /** 启动小游戏的 query 参数 */
    query: Record<string, string>;
    /** 来源信息。从另一个小程序、公众号或 App 进入小程序时返回。否则返回 `{}`。(参见后文注意) */
    referrerInfo: EnterOptionsGameReferrerInfo;
    /** 启动小游戏的[场景值](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/scene.html) */
    scene: number;
    /** 从微信群聊/单聊打开小程序时，chatType 表示具体微信群聊/单聊类型
     *
     * 可选值：
     * - 1: 微信联系人单聊;
     * - 2: 企业微信联系人单聊;
     * - 3: 普通微信群聊;
     * - 4: 企业微信互通群聊; */
    chatType?: 1 | 2 | 3 | 4;
    /** shareTicket，详见[获取更多转发信息](#) */
    shareTicket?: string;
}
interface LoadOption {
    /** 从不同渠道获得的OPENLINK字符串 */
    openlink: string;
    /** 选填，部分活动、功能允许额外提供参数数据，具体使用请根据渠道说明，默认可不填 */
    extraData?: IAnyObject;
    /** 选填，部分活动、功能允许接收自定义query参数，请参阅渠道说明，默认可不填 */
    query?: IAnyObject;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type LoginCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type LoginFailCallback = (err: LoginFailCallbackErr) => void;
interface LoginFailCallbackErr {
    /** 错误信息 */
    errMsg: string;
    /** 需要基础库： `2.24.0`
     *
     * errno 错误码，错误码的详细说明参考 [Errno错误码](https://developers.weixin.qq.com/minigame/dev/guide/runtime/debug/PublicErrno.html) */
    errno: number;
}
interface LoginOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: LoginCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: LoginFailCallback;
    /** 接口调用成功的回调函数 */
    success?: LoginSuccessCallback;
    /** 需要基础库： `1.9.90`
     *
     * 超时时间，单位ms */
    timeout?: number;
}
/** 接口调用成功的回调函数 */
type LoginSuccessCallback = (result: LoginSuccessCallbackResult) => void;
interface LoginSuccessCallbackResult {
    /** 用户登录凭证（有效期五分钟）。开发者需要在开发者服务器后台调用 [code2Session](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)，使用 code 换取 openid、unionid、session_key 等信息 */
    code: string;
    errMsg: string;
}
interface MidasFriendPaymentError {
    /** 错误信息
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 1000 |  | mode错误 |
     * | -15005 |  | 索要权限被封禁（索要功能不可用） |
     * | -10073011 |  | 参数错误（具体错误见errMsg） |
     * | -10073003 |  | outTradeNo业务单号重复 |
     * | -10073012 |  | 索要单已支付 |
     * | -10073013 |  | 索要单已超时 |
     * | -10073014 |  | 签名错误 |
     * | -10073015 |  | 索要功能不可用 | */ errMsg: string;
    /** 错误码
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 1000 |  | mode错误 |
     * | -15005 |  | 索要权限被封禁（索要功能不可用） |
     * | -10073011 |  | 参数错误（具体错误见errMsg） |
     * | -10073003 |  | outTradeNo业务单号重复 |
     * | -10073012 |  | 索要单已支付 |
     * | -10073013 |  | 索要单已超时 |
     * | -10073014 |  | 签名错误 |
     * | -10073015 |  | 索要功能不可用 | */ errCode: number;
}
interface MidasPaymentError {
    /** 错误信息
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | -1 |  | 系统失败 |
     * | -2 |  | 支付取消 |
     * | -6 |  | 下单参数类型不对 |
     * | -15001 |  | 虚拟支付接口错误码，缺少参数 |
     * | -15002 |  | 虚拟支付接口错误码，参数不合法 |
     * | -15003 |  | 虚拟支付接口错误码，订单重复 |
     * | -15004 |  | 虚拟支付接口错误码，后台错误 |
     * | -15005 |  | 虚拟支付接口错误码，appId权限被封禁 |
     * | -15006 |  | 虚拟支付接口错误码，货币类型不支持 |
     * | -15007 |  | 虚拟支付接口错误码，订单已支付 |
     * | -15009 |  | 虚拟支付接口错误码，由于健康系统限制，本次支付已超过限额（这种错误情况会有默认弹窗提示） |
     * | -15010 |  | 虚拟支付接口错误码，正式版小游戏不允许在沙箱环境支付 |
     * | -15011 |  | 请求的数据类型错误 |
     * | -15012 |  | SIGNATURE错误 |
     * | -15013 |  | 代币未发布 |
     * | -15014 |  | paysig错误 |
     * | -15015 |  | sessionkey过期 |
     * | -15016 |  | 道具价格错误 |
     * | -15017 |  | 订单已关闭 |
     * | 1 |  | 虚拟支付接口错误码，用户取消支付 |
     * | 2 |  | 虚拟支付接口错误码，客户端错误,判断到小程序在用户处于支付中时,又发起了一笔支付请求 |
     * | 3 |  | 虚拟支付接口错误码，Android独有错误：用户使用GooglePlay支付，而手机未安装GooglePlay |
     * | 4 |  | 虚拟支付接口错误码，用户操作系统支付状态异常 |
     * | 5 |  | 虚拟支付接口错误码，操作系统错误 |
     * | 6 |  | 虚拟支付接口错误码，其他错误 |
     * | 7 |  | 虚拟支付接口错误码，支付取消 |
     * | 1000 |  | 参数错误 |
     * | 1001 |  | 分区未发布 |
     * | 1003 |  | 代币/分区未发布或者对应商户号被封禁或者米大师Portal错误,请先确保虚拟支付2.0代币和分区已发布，然后自查商户号封禁情况https://kf.qq.com/faq/190523Mb6VRJ190523RV363E.html，对应的商户号可以在mp-虚拟支付2.0-基础配置-微信支付账号信息中查询 |
     * | 3017/-15012 |  | 道具id非法 |
     * | 701001 |  | ios禁止支付 | */ errMsg: string;
    /** 错误码
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | -1 |  | 系统失败 |
     * | -2 |  | 支付取消 |
     * | -6 |  | 下单参数类型不对 |
     * | -15001 |  | 虚拟支付接口错误码，缺少参数 |
     * | -15002 |  | 虚拟支付接口错误码，参数不合法 |
     * | -15003 |  | 虚拟支付接口错误码，订单重复 |
     * | -15004 |  | 虚拟支付接口错误码，后台错误 |
     * | -15005 |  | 虚拟支付接口错误码，appId权限被封禁 |
     * | -15006 |  | 虚拟支付接口错误码，货币类型不支持 |
     * | -15007 |  | 虚拟支付接口错误码，订单已支付 |
     * | -15009 |  | 虚拟支付接口错误码，由于健康系统限制，本次支付已超过限额（这种错误情况会有默认弹窗提示） |
     * | -15010 |  | 虚拟支付接口错误码，正式版小游戏不允许在沙箱环境支付 |
     * | -15011 |  | 请求的数据类型错误 |
     * | -15012 |  | SIGNATURE错误 |
     * | -15013 |  | 代币未发布 |
     * | -15014 |  | paysig错误 |
     * | -15015 |  | sessionkey过期 |
     * | -15016 |  | 道具价格错误 |
     * | -15017 |  | 订单已关闭 |
     * | 1 |  | 虚拟支付接口错误码，用户取消支付 |
     * | 2 |  | 虚拟支付接口错误码，客户端错误,判断到小程序在用户处于支付中时,又发起了一笔支付请求 |
     * | 3 |  | 虚拟支付接口错误码，Android独有错误：用户使用GooglePlay支付，而手机未安装GooglePlay |
     * | 4 |  | 虚拟支付接口错误码，用户操作系统支付状态异常 |
     * | 5 |  | 虚拟支付接口错误码，操作系统错误 |
     * | 6 |  | 虚拟支付接口错误码，其他错误 |
     * | 7 |  | 虚拟支付接口错误码，支付取消 |
     * | 1000 |  | 参数错误 |
     * | 1001 |  | 分区未发布 |
     * | 1003 |  | 代币/分区未发布或者对应商户号被封禁或者米大师Portal错误,请先确保虚拟支付2.0代币和分区已发布，然后自查商户号封禁情况https://kf.qq.com/faq/190523Mb6VRJ190523RV363E.html，对应的商户号可以在mp-虚拟支付2.0-基础配置-微信支付账号信息中查询 |
     * | 3017/-15012 |  | 道具id非法 |
     * | 701001 |  | ios禁止支付 | */ errCode: number;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type MiddleUpdateCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type MiddleUpdateFailCallback = (res: GeneralCallbackResult) => void;
/** 入参对象 */
interface MiddleUpdateParams {
    /** 用户得分 */
    score: number;
    /** 玩法唯一标识，用于区分不同的擂台赛玩法。可以在 MP后台-运营功能管理-基础配置-游戏玩法ID 中配置 */
    scoreKey: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: MiddleUpdateCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: MiddleUpdateFailCallback;
    /** 可选子 key，正整数，取值范围1-1000。该参数可用于游戏同一玩法的关卡区分，从基础库版本3.12.1开始支持 */
    subScoreKey?: number;
    /** 接口调用成功的回调函数 */
    success?: MiddleUpdateSuccessCallback;
}
/** 接口调用成功的回调函数 */
type MiddleUpdateSuccessCallback = (res: GeneralCallbackResult) => void;
/** 小程序账号信息 */
interface MiniProgram {
    /** 小程序 appId */
    appId: string;
    /** 需要基础库： `2.10.0`
     *
     * 小程序版本
     *
     * 可选值：
     * - 'develop': 开发版，提交代码审核时默认使用开发版进行审核。;
     * - 'trial': 体验版;
     * - 'release': 正式版; */
    envVersion: 'develop' | 'trial' | 'release';
    /** 需要基础库： `2.10.2`
     *
     * 线上小程序版本号 */
    version: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ModifyFriendInteractiveStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ModifyFriendInteractiveStorageFailCallback = (result: ModifyFriendInteractiveStorageFailCallbackResult) => void;
interface ModifyFriendInteractiveStorageFailCallbackResult {
    /** 错误码
     *
     * 可选值：
     * - -17006: 非好友关系;
     * - -17007: 非法的 toUser openId;
     * - -17008: 非法的 key;
     * - -17009: 非法的 operation;
     * - -17010: 非法的操作数;
     * - -17011: JSServer 校验写操作失败; */
    errCode: -17006 | -17007 | -17008 | -17009 | -17010 | -17011;
    /** 错误信息 */
    errMsg: string;
}
interface ModifyFriendInteractiveStorageOption {
    /** 需要修改的数据的 key，目前可以为 '1' - '50' */
    key: string;
    /** 需要修改的数值，目前只能为 1 */
    opNum: number;
    /** 修改类型
     *
     * 可选值：
     * - 'add': 加; */
    operation: 'add';
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ModifyFriendInteractiveStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: ModifyFriendInteractiveStorageFailCallback;
    /** 需要基础库： `2.9.0`
     *
     * 分享图片地址，详见 wx.shareMessageToFriend 同名参数（需要配置模板规则） */
    imageUrl?: string;
    /** 需要基础库： `2.9.0`
     *
     * 分享图片编号，详见 wx.shareMessageToFriend 同名参数（需要配置模板规则） */
    imageUrlId?: string;
    /** 需要基础库： `2.9.0`
     *
     * 是否静默修改（不弹框）。当进入场景是好友 [定向分享](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.shareMessageToFriend.html) 的卡片时有效，代表分享反馈操作，此时 `toUser` 默认为原分享者的 openId */
    quiet?: boolean;
    /** 接口调用成功的回调函数 */
    success?: ModifyFriendInteractiveStorageSuccessCallback;
    /** 需要基础库： `2.9.0`
     *
     * 分享标题，如果设置了这个值，则在交互成功后自动询问用户是否分享给好友（需要配置模板规则） */
    title?: string;
    /** 目标好友的 openId */
    toUser?: string;
}
/** 接口调用成功的回调函数 */
type ModifyFriendInteractiveStorageSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type NotifyGroupMembersCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type NotifyGroupMembersFailCallback = (res: GeneralCallbackResult) => void;
interface NotifyGroupMembersOption {
    /** 如需传参，只传 query 即可，query 形如 ?a=1&b=2 */
    entrancePath: string;
    /** 需要提醒的用户 group_openid 列表 */
    members: string[];
    /** 文字链标题，发送的内容将由微信拼接为：@的成员列表+“请完成：”/"请参与："+打开小程序的文字链，如「@alex @cindy 请完成：团建报名统计」。 */
    title: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: NotifyGroupMembersCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: NotifyGroupMembersFailCallback;
    /** 接口调用成功的回调函数 */
    success?: NotifyGroupMembersSuccessCallback;
    /** 展示的动词
     *
     * 可选值：
     * - 'participate': 请参与;
     * - 'complete': 请完成; */
    type?: 'participate' | 'complete';
}
/** 接口调用成功的回调函数 */
type NotifyGroupMembersSuccessCallback = (res: GeneralCallbackResult) => void;
/** onDirectAdStatusChange 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffDirectAdStatusChangeCallback = (result: OnDirectAdStatusChangeListenerResult) => void;
/** onHide 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffHideCallback = (res: GeneralCallbackResult) => void;
/** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffLoadCallback = (res: GeneralCallbackResult) => void;
/** onResize 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffResizeCallback = (result: OnResizeListenerResult) => void;
/** onShareAppMessage 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffShareAppMessageCallback = (result: OnShareAppMessageListenerResult) => void;
/** onShareMessageToFriend 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffShareMessageToFriendCallback = (result: OnShareMessageToFriendListenerResult) => void;
/** onShareTimeline 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffShareTimelineCallback = (result: OnShareTimelineListenerResult) => void;
/** onShow 传入的监听函数。不传此参数则移除所有监听函数。 */
type OffShowCallback = (result: OnShowListenerResult) => void;
/** 用户点击菜单「收藏」按钮时触发的事件的监听函数 */
type OnAddToFavoritesCallback = (result: OnAddToFavoritesListenerResult) => void;
interface OnAddToFavoritesListenerResult {
    /** 禁止收藏后长按转发，默认 false */
    disableForward: boolean;
    /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4 */
    imageUrl: string;
    /** 查询字符串，必须是 key1=val1&key2=val2 的格式。从收藏进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。 */
    query: string;
    /** 收藏标题，不传则默认使用当前小游戏的昵称。 */
    title: string;
}
/** 用户点击菜单「添加提醒」按钮时触发的事件的监听函数 */
type OnAddToScheduleCallback = (result: OnAddToScheduleListenerResult) => void;
interface OnAddToScheduleListenerResult {
    /** 页面路径 */
    path: string;
    /** 查询字符串，必须是 key1=val1&key2=val2 的格式。从提醒进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。 */
    query: string;
    /** 提醒标题，不传则默认使用当前小游戏的昵称。 */
    title: string;
}
interface OnChallengeStartCallbackResult {
    /** 玩法唯一标识 */
    scoreKey: string;
    /** 可选子 key */
    subScoreKey?: number;
}
interface OnCloseCallbackResult {
    /** 关闭结果：'close' 未点击购买直接关闭 / 'pay_cancel' 点了购买按钮但未支付成功 / 'pay_success' 支付成功 */
    result: string;
}
/** 用户点击右上角菜单的「复制链接」按钮时触发的事件的监听函数 */
type OnCopyUrlCallback = (result: OnCopyUrlListenerResult) => void;
interface OnCopyUrlListenerResult {
    /** 需要基础库： `3.16.0`
     *
     * 如果该参数存在且为有效的 Promise，则最终的 `query` 和 `title` 将以该 Promise 的 resolve 结果为准；如果 Promise 在 2 秒内未 resolve 或 reject，则回退使用同步传入的默认参数。 */
    promise?: IAnyObject;
    /** 用短链打开小程序时当前页面携带的查询字符串，默认为空字符串。小程序中使用时，应在进入页面时调用 `wx.onCopyUrl` 自定义 `query`，退出页面时调用 `wx.offCopyUrl`，防止影响其它页面。 */
    query?: string;
    /** 需要基础库： `3.15.1`
     *
     * 短链中的自定义标题，显示在小程序名称之后。在基础库3.15.1之前，默认是 navigationBarTitleText 的值，在基础库3.15.1及之后，默认为空字符串。 */
    title?: string;
}
/** 的监听函数 */
type OnDirectAdStatusChangeCallback = (result: OnDirectAdStatusChangeListenerResult) => void;
interface OnDirectAdStatusChangeListenerResult {
    /** 当前直玩广告是否由于异常流程而结束（如 下拉/搜索 进入正在直玩广告流程中的游戏） */
    isEndByAbnormal: boolean;
    /** 当前是否处于直接广告中 */
    isInDirectGameAd: boolean;
    /** 当前是否处于蒙层阶段 */
    isInMask: boolean;
}
interface OnErrorCallbackResult {
    /** 错误码 */
    errCode: number;
    /** 错误信息 */
    errMsg: string;
}
/** 用户点击菜单「在电脑上打开」按钮时触发的事件的监听函数 */
type OnHandoffCallback = (result: OnHandoffListenerResult) => void;
interface OnHandoffListenerResult {
    /** 需要传递给接力客户端的 query */
    query: string;
}
type OnHideCallback = (res: GeneralCallbackResult) => void;
type OnLoadCallback = (res: GeneralCallbackResult) => void;
/** 隐私接口需要用户授权事件的监听函数 */
type OnNeedPrivacyAuthorizationCallback = (res: GeneralCallbackResult) => void;
type OnResizeCallback = (result: OnResizeListenerResult) => void;
interface OnResizeListenerResult {
    /** 缩放后的高度 */
    height: number;
    /** 缩放后的宽度 */
    width: number;
}
/** 用户点击右上角菜单的「转发」按钮时触发的事件的监听函数 */
type OnShareAppMessageCallback = (result: OnShareAppMessageListenerResult) => void;
interface OnShareAppMessageListenerResult {
    /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4 */
    imageUrl: string;
    /** 查询字符串，必须是 key1=val1&key2=val2 的格式。从这条转发消息进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。 */
    query: string;
    /** 转发标题，不传则默认使用当前小游戏的昵称。 */
    title: string;
    /** 需要基础库： `2.4.3`
     *
     * 审核通过的图片编号，详见 [使用审核通过的转发图片](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#使用审核通过的转发图片) */
    imageUrlId?: string;
    /** 需要基础库： `2.12.2`
     *
     * 独立分包路径。详见 [小游戏独立分包指南](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/independent-sub-packages.html) */
    path?: string;
    /** 需要基础库： `2.12.0`
     *
     * 如果该参数存在，则其它的参数将会以 resolve 结果为准，如果三秒内不 resolve，分享会使用上面传入的默认参数 */
    promise?: Promise<any>;
    /** 需要基础库： `2.12.2`
     *
     * 是否转发到当前群。该参数只对从群工具栏打开的场景下生效，默认转发到当前群，填入false时可转发到其他会话。 */
    toCurrentGroup?: boolean;
}
/** 主域接收`wx.shareMessageToFriend`接口的成功失败通知事件的监听函数 */
type OnShareMessageToFriendCallback = (result: OnShareMessageToFriendListenerResult) => void;
interface OnShareMessageToFriendListenerResult {
    /** 错误信息 */
    errMsg: string;
    /** 是否成功 */
    success: boolean;
}
/** 用户点击右上角菜单的「分享到朋友圈」按钮时触发的事件的监听函数 */
type OnShareTimelineCallback = (result: OnShareTimelineListenerResult) => void;
interface OnShareTimelineListenerResult {
    /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。（该图片用于分享到朋友圈的卡片以及从朋友圈转发到会话消息的卡片展示） */
    imageUrl: string;
    /** 需要基础库： `2.14.3`
     *
     * 朋友圈预览图链接，不传则默认使用当前游戏画面截图 */
    imagePreviewUrl?: string;
    /** 需要基础库： `2.14.3`
     *
     * 审核通过的朋友圈预览图图片编号，详见 [使用审核通过的转发图片](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#使用审核通过的转发图片) */
    imagePreviewUrlId?: string;
    /** 审核通过的图片编号，详见 [使用审核通过的转发图片](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#使用审核通过的转发图片) */
    imageUrlId?: string;
    /** 需要基础库： `2.12.2`
     *
     * 独立分包路径。详见 [小游戏独立分包指南](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/independent-sub-packages.html) */
    path?: string;
    /** 查询字符串，必须是 key1=val1&key2=val2 的格式。从这条转发消息进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。不传则默认使用当前页面query。 */
    query?: string;
    /** 转发标题，不传则默认使用当前小游戏的昵称。 */
    title?: string;
}
/** 小游戏回到前台的事件的监听函数 */
type OnShowCallback = (result: OnShowListenerResult) => void;
interface OnShowListenerResult {
    /** 查询参数 */
    query: Record<string, string>;
    /** 当场景为由从另一个小程序或公众号或App打开时，返回此字段 */
    referrerInfo: ResultReferrerInfo;
    /** 场景值 */
    scene: number;
    /** 从微信群聊/单聊打开小程序时，chatType 表示具体微信群聊/单聊类型
     *
     * 可选值：
     * - 1: 微信联系人单聊;
     * - 2: 企业微信联系人单聊;
     * - 3: 普通微信群聊;
     * - 4: 企业微信互通群聊; */
    chatType?: 1 | 2 | 3 | 4;
    /** shareTicket */
    shareTicket?: string;
}
interface OnTapListenerResult {
    /** 需要基础库： `2.7.0`
     *
     * 敏感数据对应的云 ID，开通[云开发](../../wxcloud/basis/getting-started.md)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
    cloudID: string;
    /** 包括敏感数据在内的完整用户信息的加密数据，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    encryptedData: string;
    /** 调用结果（错误原因） */
    errMsg: string;
    /** 加密算法的初始向量，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    iv: string;
    /** 不包括敏感信息的原始数据字符串，用于计算签名 */
    rawData: string;
    /** 使用 sha1( rawData + sessionkey ) 得到字符串，用于校验用户信息，参考文档[signature](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    signature: string;
    /** [UserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfo.html)
     *
     * 用户信息对象，不包含 openid 等敏感信息 */
    userInfo: UserInfo;
}
interface OnUseCallbackResult {
    /** 今日已使用次数 */
    usedCount: number;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenCardCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenCardFailCallback = (res: GeneralCallbackResult) => void;
interface OpenCardOption {
    /** 需要打开的卡券列表 */
    cardList: OpenCardRequestInfo[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenCardCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenCardFailCallback;
    /** 接口调用成功的回调函数 */
    success?: OpenCardSuccessCallback;
}
/** 需要打开的卡券列表 */
interface OpenCardRequestInfo {
    /** 卡券 ID */
    cardId: string;
    /** 由 [wx.addCard](https://developers.weixin.qq.com/minigame/dev/api/open-api/card/wx.addCard.html) 的返回对象中的加密 code 通过解密后得到，解密请参照：[code 解码接口](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1499332673_Unm7V) */
    code: string;
}
/** 接口调用成功的回调函数 */
type OpenCardSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenChannelsActivityCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenChannelsActivityFailCallback = (res: GeneralCallbackResult) => void;
interface OpenChannelsActivityOption {
    /** 视频 feedId */
    feedId: string;
    /** 视频号 id，以“sph”开头的id，可在视频号助手获取 */
    finderUserName: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenChannelsActivityCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenChannelsActivityFailCallback;
    /** 接口调用成功的回调函数 */
    success?: OpenChannelsActivitySuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenChannelsActivitySuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenChannelsEventCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenChannelsEventFailCallback = (res: GeneralCallbackResult) => void;
interface OpenChannelsEventOption {
    /** 活动 id */
    eventId: string;
    /** 视频号 id，以“sph”开头的id，可在视频号助手获取 */
    finderUserName: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenChannelsEventCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenChannelsEventFailCallback;
    /** 接口调用成功的回调函数 */
    success?: OpenChannelsEventSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenChannelsEventSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenChannelsLiveCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenChannelsLiveFailCallback = (res: GeneralCallbackResult) => void;
interface OpenChannelsLiveOption {
    /** 视频号 id，以“sph”开头的id，可在视频号助手获取 */
    finderUserName: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenChannelsLiveCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenChannelsLiveFailCallback;
    /** 直播 feedId，通过 getChannelsLiveInfo 接口获取（基础库 v2.19.2 之前的版本需要填写） */
    feedId?: string;
    /** 直播 nonceId，通过 getChannelsLiveInfo 接口获取（基础库 v2.19.2 之前的版本需要填写） */
    nonceId?: string;
    /** 接口调用成功的回调函数 */
    success?: OpenChannelsLiveSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenChannelsLiveSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenChannelsUserProfileCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenChannelsUserProfileFailCallback = (res: GeneralCallbackResult) => void;
interface OpenChannelsUserProfileOption {
    /** 视频号id（参考格式为：sphcqO59YEPCvoe；查看路径为：微信客户端->我tab->视频号->右上角.-＞视频号名字-视频号ID） */
    finderUserName: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenChannelsUserProfileCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenChannelsUserProfileFailCallback;
    /** 接口调用成功的回调函数 */
    success?: OpenChannelsUserProfileSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenChannelsUserProfileSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenChatToolCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenChatToolFailCallback = (res: GeneralCallbackResult) => void;
interface OpenChatToolOption {
    /** 群聊类型
     *
     * 可选值：
     * - 1: 微信联系人单聊;
     * - 2: 企业微信联系人单聊;
     * - 3: 普通微信群聊;
     * - 4: 企业微信互通群聊; */
    chatType?: 1 | 2 | 3 | 4;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenChatToolCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenChatToolFailCallback;
    /** 聊天室 id，不传则拉起群选择框，可以传入多聊群的 opengid 值，或者单聊群的 open_single_roomid 值 */
    roomid?: string;
    /** 接口调用成功的回调函数 */
    success?: OpenChatToolSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenChatToolSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenCustomerServiceChatCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenCustomerServiceChatFailCallback = (res: GeneralCallbackResult) => void;
interface OpenCustomerServiceChatOption {
    /** 企业ID */
    corpId: string;
    /** 客服信息 */
    extInfo: ExtInfoOption;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenCustomerServiceChatCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenCustomerServiceChatFailCallback;
    /** 气泡消息图片 */
    sendMessageImg?: string;
    /** 气泡消息小程序路径 */
    sendMessagePath?: string;
    /** 气泡消息标题 */
    sendMessageTitle?: string;
    /** 是否发送小程序气泡消息 */
    showMessageCard?: boolean;
    /** 接口调用成功的回调函数 */
    success?: OpenCustomerServiceChatSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenCustomerServiceChatSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenCustomerServiceConversationCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenCustomerServiceConversationFailCallback = (res: GeneralCallbackResult) => void;
interface OpenCustomerServiceConversationOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenCustomerServiceConversationCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenCustomerServiceConversationFailCallback;
    /** 会话内消息卡片图片路径 */
    sendMessageImg?: string;
    /** 会话内消息卡片路径 */
    sendMessagePath?: string;
    /** 会话内消息卡片标题 */
    sendMessageTitle?: string;
    /** 会话来源。该字段会在进入客服会话时透传给开发者配置好的后台服务。该字段（utf-8编码）最长不得超过 1000 个字节（不是字符串长度），超过将被截断。 */
    sessionFrom?: string;
    /** 是否显示会话内消息卡片，设置此参数为 true，用户进入客服会话会在右下角显示"可能要发送的小程序"提示，用户点击后可以快速发送小程序消息 */
    showMessageCard?: boolean;
    /** 接口调用成功的回调函数 */
    success?: OpenCustomerServiceConversationSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenCustomerServiceConversationSuccessCallback = (result: OpenCustomerServiceConversationSuccessCallbackResult) => void;
interface OpenCustomerServiceConversationSuccessCallbackResult {
    /** 在客服会话内点击小程序消息卡片进入小程序时，所带的小程序打开路径 */
    path: string;
    /** 在客服会话内点击小程序消息卡片进入小程序时，所带的小程序打开参数 */
    query: IAnyObject;
    errMsg: string;
}
/** 开放数据域对象 */
interface OpenDataContext {
    /** [Canvas](https://developers.weixin.qq.com/minigame/dev/api/render/canvas/Canvas.html)
     *
     * 开放数据域和主域共享的 sharedCanvas */
    canvas: Canvas;
    /** [OpenDataContext.postMessage(Object message)](https://developers.weixin.qq.com/minigame/dev/api/open-api/context/OpenDataContext.postMessage.html)
     *
     * 向开放数据域发送消息 */
    postMessage(
    /** 要发送的消息，message 中及嵌套对象中 key 的 value 只能是 primitive value。即 number、string、boolean、null、undefined。 */
    message: IAnyObject): void;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenPrivacyContractCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenPrivacyContractFailCallback = (res: GeneralCallbackResult) => void;
interface OpenPrivacyContractOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenPrivacyContractCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenPrivacyContractFailCallback;
    /** 接口调用成功的回调函数 */
    success?: OpenPrivacyContractSuccessCallback;
}
/** 接口调用成功的回调函数 */
type OpenPrivacyContractSuccessCallback = (res: GeneralCallbackResult) => void;
/** 用户点击后打开设置页面的按钮 */
interface OpenSettingButton {
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
    /** [OpenSettingButton.destroy()](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/OpenSettingButton.destroy.html)
     *
     * 销毁打开设置页面按钮 */
    destroy(): void;
    /** [OpenSettingButton.hide()](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/OpenSettingButton.hide.html)
     *
     * 隐藏打开设置页面按钮。 */
    hide(): void;
    /** [OpenSettingButton.offTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/OpenSettingButton.offTap.html)
*
* 移除设置页面按钮的点击事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

OpenSettingButton.onTap(listener)
OpenSettingButton.offTap(listener) // 需传入与监听时同一个的函数对象
``` */
    offTap(
    /** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: GameClubButtonOffTapCallback): void;
    /** [OpenSettingButton.onTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/OpenSettingButton.onTap.html)
     *
     * 监听设置页面按钮的点击事件 */
    onTap(
    /** 设置页面按钮的点击事件的监听函数 */
    listener: GameClubButtonOnTapCallback): void;
    /** [OpenSettingButton.show()](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/OpenSettingButton.show.html)
     *
     * 显示打开设置页面按钮 */
    show(): void;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenSettingCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type OpenSettingFailCallback = (res: GeneralCallbackResult) => void;
interface OpenSettingOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: OpenSettingCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: OpenSettingFailCallback;
    /** 接口调用成功的回调函数 */
    success?: OpenSettingSuccessCallback;
    /** 需要基础库： `2.10.3`
     *
     * 是否同时获取用户订阅消息的订阅状态，默认不获取。注意：withSubscriptions 只返回用户勾选过订阅面板中的“总是保持以上选择，不再询问”的订阅消息。 */
    withSubscriptions?: boolean;
}
/** 接口调用成功的回调函数 */
type OpenSettingSuccessCallback = (result: OpenSettingSuccessCallbackResult) => void;
interface OpenSettingSuccessCallbackResult {
    /** [AuthSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/AuthSetting.html)
     *
     * 用户授权结果 */
    authSetting: AuthSetting;
    /** [SubscriptionsSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/SubscriptionsSetting.html)
     *
     * 需要基础库： `2.10.3`
     *
     * 用户订阅消息设置，接口参数`withSubscriptions`值为`true`时才会返回。 */
    subscriptionsSetting: SubscriptionsSetting;
    errMsg: string;
}
/** 按钮的样式 */
interface OptionStyle {
    /** 背景颜色 */
    backgroundColor: string;
    /** 高度 */
    height: number;
    /** 左上角横坐标 */
    left: number;
    /** 左上角纵坐标 */
    top: number;
    /** 宽度 */
    width: number;
    /** 边框颜色 */
    borderColor?: string;
    /** 边框圆角 */
    borderRadius?: number;
    /** 边框宽度 */
    borderWidth?: number;
    /** 文本的颜色。格式为 6 位 16 进制数。 */
    color?: string;
    /** 字号 */
    fontSize?: number;
    /** 文本的行高 */
    lineHeight?: number;
    /** 文本的水平居中方式
     *
     * 可选值：
     * - 'left': 居左;
     * - 'center': 居中;
     * - 'right': 居右; */
    textAlign?: 'left' | 'center' | 'right';
}
/** 订单状态 */
interface OrderInfo {
    /** 当前订单对应的状态码 */
    orderStatus: number;
    /** 当前订单对应的祝福语 */
    wishMessage: string;
}
interface PageManager {
    /** [PageManager.destroy()](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/PageManager.destroy.html)
     *
     * 需要基础库： `3.6.7`
     *
     * 销毁开放页面实例。 */
    destroy(): void;
    /** [PageManager.off(string eventName, function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/PageManager.off.html)
     *
     * 需要基础库： `3.6.7`
     *
     * 取消监听来自活动、功能向开发者产生的某些事件。 */
    off(
    /** 取消的事件名称，如果仅填写事件名称则注销该名称下所有的监听 */
    eventName: string,
    /** 取消的事件名称及其对应的回调函数指针，可缺省，若填写则仅注销该事件名称下的单个回调函数 */
    callback?: (...args: any[]) => any): void;
    /** [PageManager.on(string eventName, function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/PageManager.on.html)
     *
     * 需要基础库： `3.6.7`
     *
     * 监听来自活动、功能向开发者产生的某些事件。 */
    on(
    /** 事件名称，由渠道获得需要监听的事件名称 */
    eventName: string,
    /** 发生某种事件时的回调函数指针 */
    callback: (...args: any[]) => any): void;
    /** [Promise PageManager.load(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/PageManager.load.html)
     *
     * 需要基础库： `3.6.7`
     *
     * 提供OPENLINK加载活动、功能信息。 */
    load(option: LoadOption): Promise<any>;
    /** [Promise PageManager.show(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/PageManager.show.html)
     *
     * 需要基础库： `3.6.7`
     *
     * 显示已经成功加载信息的开放页面活动、功能。如果调用前未执行 `.load({ ... })` 将自动调用1次并返回加载信息结果。 */
    show(
    /** 选填，如果已经执行 `.load({ ... })` 无需填写，也允许使用 `.show({ ... })` 连贯执行 */
    option?: ShowOption): Promise<any>;
}
/** 插件账号信息（仅在插件中调用时包含这一项） */
interface Plugin {
    /** 插件 appId */
    appId: string;
    /** 插件版本号 */
    version: string;
}
type PromisifySuccessResult<P, T extends AsyncMethodOptionLike> = P extends {
    success: any;
} ? void : P extends {
    fail: any;
} ? void : P extends {
    complete: any;
} ? void : Promise<Parameters<Exclude<T['success'], undefined>>[0]>;
interface RankManager {
    /** [RankManager.abort(Object params)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.abort.html)
*
* 需要基础库： `3.14.2`
*
* 中途退出擂台赛。若擂台赛进行中则关闭所有相关组件。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
rankManager.abort({
success: () => {
console.log('已退出游戏')
}
})
``` */
    abort(
    /** 入参对象（可选） */
    params?: AbortParams): void;
    /** [RankManager.createChallenge(Object params)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.createChallenge.html)
*
* 需要基础库： `3.14.2`
*
* 创建擂台赛，唤起擂台赛起始页。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
rankManager.createChallenge({
scoreKey: 'gameplayone', // 在 MP后台-运营功能管理-基础配置-游戏玩法ID 中配置
success: () => {
console.log('擂台赛创建成功')
}
})
```
*
* 注意事项：
* - subScoreKey 参数从基础库版本3.12.1开始支持 */
    createChallenge(
    /** 入参对象 */
    params: CreateChallengeParams): void;
    /** [RankManager.getScore(Object params)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.getScore.html)
*
* 需要基础库： `3.14.2`
*
* 查询当前用户得分数据。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
rankManager.getScore({
scoreKeys: ['level_1', 'level_2'],
periodType: 1, // 自然日最高分
success: (res) => {
console.log('分数信息', res.scores)
// res.scores 格式: { 'level_1': { score: 100, timestamp: 1234567890 } }
}
})
```
*
* 注意事项：
* - subScoreKey 参数从基础库版本3.12.1开始支持 */
    getScore(
    /** 入参对象 */
    params: GetScoreParams): void;
    /** [RankManager.middleUpdate(Object params)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.middleUpdate.html)
*
* 需要基础库： `3.14.2`
*
* 游戏中途更新分数信息，用于在游戏进行过程中实时上报分数。如果接入擂台赛组件，该 api不会触发擂台赛组件结算页，但会触发擂台赛分数超越播报和排行榜更新。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
rankManager.middleUpdate({
scoreKey: 'gameplayone', // 在 MP后台-运营功能管理-基础配置-游戏玩法ID 中配置
score: 100,
success: () => {
console.log('分数更新成功')
},
fail: (err) => {
console.error('分数更新失败', err)
}
})
```
*
* 注意事项：
* - subScoreKey 参数从基础库版本3.12.1开始支持 */
    middleUpdate(
    /** 入参对象 */
    params: MiddleUpdateParams): void;
    /** [RankManager.offChallengeStart(function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.offChallengeStart.html)
*
* 需要基础库： `3.14.2`
*
* 取消监听擂台赛开始事件。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
const handleChallengeStart = (res) => {
console.log('擂台赛开始', res.scoreKey)
}
rankManager.onChallengeStart(handleChallengeStart)
// 取消监听
rankManager.offChallengeStart(handleChallengeStart)
``` */
    offChallengeStart(
    /** 回调函数，不传则取消所有监听 */
    callback?: ChallengeStartCallback): void;
    /** [RankManager.onChallengeStart(function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.onChallengeStart.html)
*
* 需要基础库： `3.14.2`
*
* 监听擂台赛开始事件。由擂台赛卡片进入后，用户点击擂台赛页上的“立即挑战”时触发。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
rankManager.onChallengeStart((res) => {
console.log('擂台赛开始', res.scoreKey)
if (res.subScoreKey) {
console.log('关卡数', res.subScoreKey)
}
// 开始游戏逻辑
})
```
*
* 注意事项：
* - 应尽早监听 onChallengeStart，推荐在游戏初始化或 onLaunch 生命周期里监听。由于用户点击“立即挑战”事件会等到onChallengeStart成功注册后再派发，过晚监听可能出现用户点了立即挑战，游戏没有及时开始擂台赛的情况。
* - subScoreKey 参数从基础库版本3.12.1开始支持 */
    onChallengeStart(
    /** 回调函数 */
    callback: ChallengeStartCallback): void;
    /** [RankManager.update(Object params)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.update.html)
*
* 需要基础库： `3.14.2`
*
* 上报用户分数信息。如果接入擂台赛组件，使用此 api在发起擂台赛前上报，上报的分数将作为发起擂台赛的擂主分数。在擂台赛中上报，上报的分数将作为擂台赛者的分数，并结束擂台赛弹出结果页。
*
* **示例代码**
*
* ```js
const rankManager = wx.getRankManager()
// 上报用户分数
rankManager.update({
scoreKey: 'gameplayone', // 在 MP后台-运营功能管理-基础配置-游戏玩法ID 中配置
score: 100, // 具体分数值
success: res => {
console.log('分数上报成功', res);
},
fail: err => {
console.error('分数上报失败', err);
},
});
```
*
* 注意事项：
* - subScoreKey 参数从基础库版本3.12.1开始支持 */
    update(
    /** 入参对象 */
    params: UpdateParams): void;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RemoveUserCloudStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type RemoveUserCloudStorageFailCallback = (res: GeneralCallbackResult) => void;
interface RemoveUserCloudStorageOption {
    /** 要删除掉 key 列表 */
    keyList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RemoveUserCloudStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RemoveUserCloudStorageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RemoveUserCloudStorageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RemoveUserCloudStorageSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReportSceneCompleteCallback = (res: ReportSceneError) => void;
interface ReportSceneError {
    /** 错误信息
     *
     * | 错误信息 | 说明 |
     * | - | - |
     * | ${paramName} should be ${expectType} instead of ${paramType} | 参数的类型需为指定的数据类型 |
     * | parameter.${paramName} should greater than or equal to zero | 参数的值需要大于等于0 |
     * | parameter.${paramName}.${key} needs to be a string type and a non-empty string | value仅支持传入非空字符串 |
     * | parameter.${paramName}.${key} needs to be a numeric value of type string | value仅支持传入纯数值组成的字符串（如：'25'） |
     * | failed to serialize parameter.${paramName} by JSON.stringify | 参数对象序列化失败 |
     * | parameter.${paramName} cannot exceed 1024 characters | 参数序列化后，字符串长度不可超过1024个字符 |
     * | report sceneId:${sceneId} repeatedly | 单次启动流程里，场景ID不可重复上报 | */ errMsg: string;
    /** 错误码
     *
     * | 错误信息 | 说明 |
     * | - | - |
     * | ${paramName} should be ${expectType} instead of ${paramType} | 参数的类型需为指定的数据类型 |
     * | parameter.${paramName} should greater than or equal to zero | 参数的值需要大于等于0 |
     * | parameter.${paramName}.${key} needs to be a string type and a non-empty string | value仅支持传入非空字符串 |
     * | parameter.${paramName}.${key} needs to be a numeric value of type string | value仅支持传入纯数值组成的字符串（如：'25'） |
     * | failed to serialize parameter.${paramName} by JSON.stringify | 参数对象序列化失败 |
     * | parameter.${paramName} cannot exceed 1024 characters | 参数序列化后，字符串长度不可超过1024个字符 |
     * | report sceneId:${sceneId} repeatedly | 单次启动流程里，场景ID不可重复上报 | */ errCode: number;
}
/** 接口调用失败的回调函数 */
type ReportSceneFailCallback = (err: ReportSceneFailCallbackErr) => void;
interface ReportSceneFailCallbackErr {
    /** 需要基础库： `2.28.1`
     *
     * 开发者上报的原始数据 */
    data: IAnyObject;
    /** 需要基础库： `2.28.1`
     *
     * 错误信息 */
    errMsg: string;
}
interface ReportSceneOption {
    /** 场景ID，在「小程序管理后台」获取 */
    sceneId: number;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ReportSceneCompleteCallback;
    /** 此场景的耗时，单位 ms */
    costTime?: number;
    /** 自定义维度数据，key在「小程序管理后台」获取。只支持能够通过JSON.stringify序列化的对象，且序列化后长度不超过1024个字符 */
    dimension?: IAnyObject;
    /** 接口调用失败的回调函数 */
    fail?: ReportSceneFailCallback;
    /** 自定义指标数据，key在「小程序管理后台」获取。只支持能够通过JSON.stringify序列化的对象，且序列化后长度不超过1024个字符 */
    metric?: IAnyObject;
    /** 接口调用成功的回调函数 */
    success?: ReportSceneSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ReportSceneSuccessCallback = (result: ReportSceneSuccessCallbackResult) => void;
interface ReportSceneSuccessCallbackResult {
    /** 需要基础库： `2.28.1`
     *
     * 开发者上报的原始数据 */
    data: IAnyObject;
    errMsg: string;
}
interface ReportUserBehaviorBranchAnalyticsOption {
    /** 分支ID，在「小程序管理后台」获取 */
    branchId: string;
    /** 事件类型，1：曝光； 2：点击 */
    eventType: number;
    /** 自定义维度，基础库 v2.14.0 开始支持可选 */
    branchDim?: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestFacialRecognitionCompleteCallback = (res: FacialRecognitionError) => void;
/** 接口调用失败的回调函数 */
type RequestFacialRecognitionFailCallback = (res: FacialRecognitionError) => void;
interface RequestFacialRecognitionOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestFacialRecognitionCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequestFacialRecognitionFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequestFacialRecognitionSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequestFacialRecognitionSuccessCallback = (res: FacialRecognitionError) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestFacialVerifyCompleteCallback = (res: RequestFacialVerifyError) => void;
interface RequestFacialVerifyError {
    /** 错误信息
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 0 | 人脸识别完成（需要通过[queryVerifyInfo](https://developers.weixin.qq.com/miniprogram/dev/server/API/face/api_queryverifyinfo.html)接口查询人脸核身真实验证结果） |  | */ errMsg: string;
    /** 错误码
     *
     * | 错误码 | 错误信息 | 说明 |
     * | - | - | - |
     * | 0 | 人脸识别完成（需要通过[queryVerifyInfo](https://developers.weixin.qq.com/miniprogram/dev/server/API/face/api_queryverifyinfo.html)接口查询人脸核身真实验证结果） |  | */ errCode: number;
}
/** 接口调用失败的回调函数 */
type RequestFacialVerifyFailCallback = (res: RequestFacialVerifyError) => void;
interface RequestFacialVerifyOption {
    /** 人脸核身会话唯一标识（小程序后台根据「用户实名信息（姓名+身份证）」调用微信后台[getVerifyId](https://developers.weixin.qq.com/miniprogram/dev/server/API/face/api_getverifyid.html)接口获取） */
    verifyId: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestFacialVerifyCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequestFacialVerifyFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequestFacialVerifySuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequestFacialVerifySuccessCallback = (res: RequestFacialVerifyError) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestMidasFriendPaymentCompleteCallback = (res: MidasFriendPaymentError) => void;
/** 接口调用失败的回调函数 */
type RequestMidasFriendPaymentFailCallback = (res: MidasFriendPaymentError) => void;
interface RequestMidasFriendPaymentOption {
    /** 购买数量。mode=game 时必填。购买数量。详见 [buyQuantity 限制说明](#buyQuantity限制说明)。 */
    buyQuantity: number;
    /** 币种
     *
     * 可选值：
     * - 'CNY': 人民币; */
    currencyType: 'CNY';
    /** 环境配置
     *
     * 可选值：
     * - 0: 米大师正式环境;
     * - 1: 米大师沙箱环境; */
    env: 0 | 1;
    /** 支付的类型，不同的支付类型有各自额外要传的附加参数
     *
     * 可选值：
     * - 'game': 购买游戏币; */
    mode: 'game';
    /** 随机字符串，长度应小于 128 */
    nonceStr: string;
    /** 在米大师侧申请的应用 id */
    offerId: string;
    /** 开发者业务订单号，每个订单号只能使用一次，重复使用会失败。要求32个字符内，只能是数字、大小写字母、符号 `_-|*@` */
    outTradeNo: string;
    /** 申请接入时的平台，platform 与应用id有关。
     *
     * 可选值：
     * - 'android': Android平台; */
    platform: 'android';
    /** 签名 */
    signature: string;
    /** 生成这个随机字符串的 UNIX 时间戳（精确到秒） */
    timeStamp: number;
    /** 分区 ID */
    zoneId: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestMidasFriendPaymentCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequestMidasFriendPaymentFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequestMidasFriendPaymentSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequestMidasFriendPaymentSuccessCallback = (result: RequestMidasFriendPaymentSuccessCallbackResult) => void;
interface RequestMidasFriendPaymentSuccessCallbackResult {
    /** 敏感数据对应的云 ID，开通[云开发](https://developers.weixin.qq.com/minigame/dev/wxcloud/basis/getting-started.html)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
    cloudID: string;
    /** 包括敏感数据在内的完整转发信息的加密数据，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    encryptedData: string;
    /** 错误信息 */
    errMsg: string;
    /** 加密算法的初始向量，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
    iv: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestMidasPaymentCompleteCallback = (res: MidasPaymentError) => void;
/** 接口调用失败的回调函数 */
type RequestMidasPaymentFailCallback = (err: RequestMidasPaymentFailCallbackErr) => void;
interface RequestMidasPaymentFailCallbackErr {
    /** 错误码 */
    errCode: number;
    /** 错误信息 */
    errMsg: string;
    /** 错误码 */
    errno: number;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestMidasPaymentGameItemCompleteCallback = (res: MidasPaymentError) => void;
/** 接口调用失败的回调函数 */
type RequestMidasPaymentGameItemFailCallback = (res: MidasPaymentError) => void;
interface RequestMidasPaymentGameItemOption {
    /** <b>支付签名</b>
     *
     * pay_sig参数的签名算法，使用<b>“mp-支付基础配置”</b>中的<b>AppKey</b>对支付的请求进行签名，代表请求经过开发者服务端的支付模块发起。签名算法伪代码为：
     *
     * paySig = to_hex(hmac_sha256(appKey,'requestMidasPaymentGameItem' + '&' + signData))
     *
     * 具体可见代码示例中的支付签名代码实现 */
    paySig: string;
    /** <b>支付原串</b>
     *
     * 具体支付参数见下面的signData，需要将数据以json格式传递
     *
     * signData例子:
     *
     * '{"mode":"goods","offerId":"123","buyQuantity":1,"env":0,"currencyType":"CNY","platform":"android","zoneId":"1","productId":"testproductId","goodsPrice":10,"outTradeNo":"xxxxxx","attach":"testdata"}' */
    signData: string;
    /** <b>用户态签名</b>
     *
     * signature参数签名算法参考[用户态签名](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#%E7%94%A8%E6%88%B7%E7%99%BB%E5%BD%95%E6%80%81%E7%AD%BE%E5%90%8D)
     *
     * 可参考[calc_signature](https://docs.qq.com/doc/DVUN0QWJja0J5c2x4) */
    signature: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestMidasPaymentGameItemCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequestMidasPaymentGameItemFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequestMidasPaymentGameItemSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequestMidasPaymentGameItemSuccessCallback = (res: MidasPaymentError) => void;
interface RequestMidasPaymentOption {
    /** 币种
     *
     * 可选值：
     * - 'CNY': 人民币; */
    currencyType: 'CNY';
    /** 支付的类型，不同的支付类型有各自额外要传的附加参数。
     *
     * 可选值：
     * - 'game': 购买游戏币; */
    mode: 'game';
    /** 在米大师侧申请的应用 id */
    offerId: string;
    /** 业务订单号，每个订单号只能使用一次，重复使用会失败。开发者需要确保该订单号在对应游戏下的唯一性，平台会尽可能校验该唯一性约束，但极端情况下可能会跳过对该约束的校验。要求32个字符内，只能是数字、大小写字母、符号_-|*组成，不能以下划线（)开头。建议每次调用wx.requestMidasPayment都换新的outTradeNo。若没有传入，则平台会自动填充一个，并以下划线开头 */
    outTradeNo: string;
    /** 购买数量。mode=game 时必填。购买数量。详见 [buyQuantity 限制说明](#buyquantity-限制说明)。 */
    buyQuantity?: number;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestMidasPaymentCompleteCallback;
    /** 环境配置
     *
     * 可选值：
     * - 0: 米大师正式环境;
     * - 1: 米大师沙箱环境; */
    env?: 0 | 1;
    /** 接口调用失败的回调函数 */
    fail?: RequestMidasPaymentFailCallback;
    /** 申请接入时的平台，platform 与应用id有关。
     *
     * 可选值：
     * - 'android': android; */
    platform?: 'android';
    /** 接口调用成功的回调函数 */
    success?: RequestMidasPaymentSuccessCallback;
    /** 分区 ID */
    zoneId?: string;
}
/** 接口调用成功的回调函数 */
type RequestMidasPaymentSuccessCallback = (result: RequestMidasPaymentSuccessCallbackResult) => void;
interface RequestMidasPaymentSuccessCallbackResult {
    /** 调用成功信息 */
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestSubscribeMessageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type RequestSubscribeMessageFailCallback = (result: RequestSubscribeMessageFailCallbackResult) => void;
interface RequestSubscribeMessageFailCallbackResult {
    /** 接口调用失败错误码 */
    errCode: number;
    /** 接口调用失败错误信息 */
    errMsg: string;
}
interface RequestSubscribeMessageOption {
    /** 需要订阅的消息模板的id的集合，一次调用最多可订阅3条消息（注意：iOS客户端7.0.6版本、Android客户端7.0.7版本之后的一次性订阅/长期订阅才支持多个模板消息，iOS客户端7.0.5版本、Android客户端7.0.6版本之前的一次订阅只支持一个模板消息）消息模板id在[微信公众平台(mp.weixin.qq.com)-功能-订阅消息]中配置。每个tmplId对应的模板标题需要不相同，否则会被过滤。 */
    tmplIds: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestSubscribeMessageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequestSubscribeMessageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequestSubscribeMessageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequestSubscribeMessageSuccessCallback = (result: RequestSubscribeMessageSuccessCallbackResult) => void;
interface RequestSubscribeMessageSuccessCallbackResult {
    /** [TEMPLATE_ID]是动态的键，即模板id，值包括'accept'、'reject'、'ban'、'filter'。'accept'表示用户同意订阅该条id对应的模板消息，'reject'表示用户拒绝订阅该条id对应的模板消息，'ban'表示已被后台封禁，'filter'表示该模板因为模板标题同名被后台过滤。例如 { errMsg: "requestSubscribeMessage:ok", zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: "accept"} 表示用户同意订阅zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE这条消息 */
    [TEMPLATE_ID: string]: string;
    /** 接口调用成功时errMsg值为'requestSubscribeMessage:ok' */
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequestSubscribeSystemMessageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type RequestSubscribeSystemMessageFailCallback = (result: RequestSubscribeMessageFailCallbackResult) => void;
interface RequestSubscribeSystemMessageOption {
    /** 系统订阅消息类型列表，一次调用最多可订阅3种类型的消息，目前支持："SYS_MSG_TYPE_INTERACTIVE"（好友互动提醒）、"SYS_MSG_TYPE_RANK"（排行榜超越提醒）、"SYS_MSG_TYPE_WHATS_NEW"（游戏更新提醒） */
    msgTypeList: string[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequestSubscribeSystemMessageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequestSubscribeSystemMessageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequestSubscribeSystemMessageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequestSubscribeSystemMessageSuccessCallback = (result: RequestSubscribeSystemMessageSuccessCallbackResult) => void;
interface RequestSubscribeSystemMessageSuccessCallbackResult {
    /** [MSG_TYPE]是动态的键，即系统订阅消息类型，值为'accept'、'reject'、'ban'，'accept'表示用户同意订阅该类型对应的模板消息，'reject'表示用户拒绝订阅该类型对应的模板消息，'ban'表示已被后台封禁。例如 { errMsg: "requestSubscribeSystemMessage:ok", SYS_MSG_TYPE_INTERACTIVE: "accept" } 表示用户同意订阅'SYS_MSG_TYPE_INTERACTIVE'这条消息 */
    MSG_TYPE: string;
    /** 接口调用成功时errMsg值为'requestSubscribeSystemMessage:ok' */
    errMsg: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RequirePrivacyAuthorizeCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type RequirePrivacyAuthorizeFailCallback = (res: GeneralCallbackResult) => void;
interface RequirePrivacyAuthorizeOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: RequirePrivacyAuthorizeCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: RequirePrivacyAuthorizeFailCallback;
    /** 接口调用成功的回调函数 */
    success?: RequirePrivacyAuthorizeSuccessCallback;
}
/** 接口调用成功的回调函数 */
type RequirePrivacyAuthorizeSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReserveChannelsLiveCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ReserveChannelsLiveFailCallback = (res: GeneralCallbackResult) => void;
interface ReserveChannelsLiveOption {
    /** 预告 id，通过 getChannelsLiveNoticeInfo 接口获取 */
    noticeId: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ReserveChannelsLiveCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: ReserveChannelsLiveFailCallback;
    /** 接口调用成功的回调函数 */
    success?: ReserveChannelsLiveSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ReserveChannelsLiveSuccessCallback = (res: GeneralCallbackResult) => void;
/** 所选用户的头像昵称列表 */
interface ResultOpenDataContextUserInfo {
    /** 用户头像图片 url */
    avatarUrl: string;
    /** 用户所在城市 */
    city: string;
    /** 用户所在国家 */
    country: string;
    /** 用户性别 */
    gender: number;
    /** 显示 country province city 所用的语言 */
    language: string;
    /** 用户昵称 */
    nickName: string;
    /** 用户 openId */
    openId: string;
    /** 用户所在省份 */
    province: string;
}
/** 当场景为由从另一个小程序或公众号或App打开时，返回此字段 */
interface ResultReferrerInfo {
    /** 来源小程序或公众号或App的 appId */
    appId: string;
    /** 来源小程序传过来的数据，scene=1037或1038时支持 */
    extraData: IAnyObject;
}
interface RewardedVideoAd {
    /** [Promise RewardedVideoAd.load()](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.load.html)
     *
     * 加载激励视频广告。 */
    load(): Promise<any>;
    /** [Promise RewardedVideoAd.show()](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.show.html)
     *
     * 显示激励视频广告。激励视频广告将从屏幕下方推入。 */
    show(): Promise<any>;
    /** [RewardedVideoAd.destroy()](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.destroy.html)
     *
     * 需要基础库： `2.8.0`
     *
     * 销毁激励视频广告实例。 */
    destroy(): void;
    /** [RewardedVideoAd.offClose(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.offClose.html)
*
* 移除用户点击 `关闭广告` 按钮的事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

RewardedVideoAd.onClose(listener)
RewardedVideoAd.offClose(listener) // 需传入与监听时同一个的函数对象
``` */
    offClose(
    /** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: RewardedVideoAdOffCloseCallback): void;
    /** [RewardedVideoAd.offError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.offError.html)
*
* 移除激励视频错误事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

RewardedVideoAd.onError(listener)
RewardedVideoAd.offError(listener) // 需传入与监听时同一个的函数对象
``` */
    offError(
    /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: GridAdOffErrorCallback): void;
    /** [RewardedVideoAd.offLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.offLoad.html)
*
* 移除激励视频广告加载事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

RewardedVideoAd.onLoad(listener)
RewardedVideoAd.offLoad(listener) // 需传入与监听时同一个的函数对象
``` */
    offLoad(
    /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: OffLoadCallback): void;
    /** [RewardedVideoAd.onClose(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.onClose.html)
     *
     * 监听用户点击 `关闭广告` 按钮的事件。 */
    onClose(
    /** 用户点击 `关闭广告` 按钮的事件的监听函数 */
    listener: RewardedVideoAdOnCloseCallback): void;
    /** [RewardedVideoAd.onError(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.onError.html)
     *
     * 监听激励视频错误事件。
     *
     * **错误码信息与解决方案表**
     *
     *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。可以针对异常返回加上适当的监控信息辅助排查现网情况。
     *
     * | 代码 | 异常情况 | 理由 | 解决方案 |
     * | ------ | -------------- | --------------- | -------------------------- |
     * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
     * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
     * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
     * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
     * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
     * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
     * | 1007  | 广告组件被封禁  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
     * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。| */
    onError(
    /** 激励视频错误事件的监听函数 */
    listener: GridAdOnErrorCallback): void;
    /** [RewardedVideoAd.onLoad(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.onLoad.html)
     *
     * 监听激励视频广告加载事件。 */
    onLoad(
    /** 激励视频广告加载事件的监听函数 */
    listener: OnLoadCallback): void;
}
/** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
type RewardedVideoAdOffCloseCallback = (result: RewardedVideoAdOnCloseListenerResult) => void;
/** 用户点击 `关闭广告` 按钮的事件的监听函数 */
type RewardedVideoAdOnCloseCallback = (result: RewardedVideoAdOnCloseListenerResult) => void;
interface RewardedVideoAdOnCloseListenerResult {
    /** 需要基础库： `2.1.0`
     *
     * 视频是否是在用户完整观看的情况下被关闭的 */
    isEnded: boolean;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type SelectGroupMembersCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type SelectGroupMembersFailCallback = (res: GeneralCallbackResult) => void;
interface SelectGroupMembersOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: SelectGroupMembersCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: SelectGroupMembersFailCallback;
    /** 最多可选人数 */
    maxSelectCount?: number;
    /** 接口调用成功的回调函数 */
    success?: SelectGroupMembersSuccessCallback;
}
/** 接口调用成功的回调函数 */
type SelectGroupMembersSuccessCallback = (result: GroupMemberInfo) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type SendGiftToFriendCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type SendGiftToFriendFailCallback = (result: SendGiftToFriendFailCallbackResult) => void;
interface SendGiftToFriendFailCallbackResult {
    /** 错误信息 */
    errMsg: string;
    /** 错误码
     *
     * 可选值：
     * - 151066169: 注册天数不足 首次注册时间必须大于 24 小时才能赠礼;
     * - 151066170: 风险用户;
     * - 151066168: 当前时间周期已经赠送，目前支持一天赠送一次;
     * - 151066172: 非好友关系; */
    errno: 151066169 | 151066170 | 151066168 | 151066172;
}
interface SendGiftToFriendOption {
    /** 礼包 id */
    giftId: string;
    /** 好友的 openid */
    openid: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: SendGiftToFriendCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: SendGiftToFriendFailCallback;
    /** 接口调用成功的回调函数 */
    success?: SendGiftToFriendSuccessCallback;
}
/** 接口调用成功的回调函数 */
type SendGiftToFriendSuccessCallback = (res: GeneralCallbackResult) => void;
interface SetMessageToFriendQueryOption {
    /** 需要传递的字符串数据，长度需要在 128 之内 */
    query: string;
    /** 需要传递的代表场景的数字，需要在 0 - 50 之间 */
    shareMessageToFriendScene: number;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type SetUserCloudStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type SetUserCloudStorageFailCallback = (res: GeneralCallbackResult) => void;
interface SetUserCloudStorageOption {
    /** 要修改的 KV 数据列表 */
    KVDataList: KVData[];
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: SetUserCloudStorageCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: SetUserCloudStorageFailCallback;
    /** 接口调用成功的回调函数 */
    success?: SetUserCloudStorageSuccessCallback;
}
/** 接口调用成功的回调函数 */
type SetUserCloudStorageSuccessCallback = (res: GeneralCallbackResult) => void;
interface ShareAppMessageOption {
    /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4 */
    imageUrl?: string;
    /** 需要基础库： `2.4.3`
     *
     * 审核通过的图片编号，详见 [使用审核通过的转发图片](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#使用审核通过的转发图片) */
    imageUrlId?: string;
    /** 需要基础库： `2.12.2`
     *
     * 独立分包路径。详见 [小游戏独立分包指南](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/independent-sub-packages.html) */
    path?: string;
    /** 查询字符串，从这条转发消息进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。必须是 key1=val1&key2=val2 的格式。 */
    query?: string;
    /** 转发标题，不传则默认使用当前小游戏的昵称。 */
    title?: string;
    /** 需要基础库： `2.12.2`
     *
     * 是否转发到当前群。该参数只对从群工具栏打开的场景下生效，默认转发到当前群，填入false时可转发到其他会话。 */
    toCurrentGroup?: boolean;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShareAppMessageToGroupCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShareAppMessageToGroupFailCallback = (res: GeneralCallbackResult) => void;
interface ShareAppMessageToGroupOption {
    /** 转发标题 */
    title: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShareAppMessageToGroupCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: ShareAppMessageToGroupFailCallback;
    /** 自定义图片路径，支持PNG及JPG，显示图片长宽比是 5:4，默认使用截图 */
    imageUrl?: string;
    /** 如需传递参数，只传 query 即可，query 形如 ?a=1&b=2 */
    path?: string;
    /** 接口调用成功的回调函数 */
    success?: ShareAppMessageToGroupSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ShareAppMessageToGroupSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShareEmojiToGroupCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShareEmojiToGroupFailCallback = (res: GeneralCallbackResult) => void;
interface ShareEmojiToGroupOption {
    /** 要分享的表情地址，必须为本地路径或临时路径 */
    imagePath: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShareEmojiToGroupCompleteCallback;
    /** 如需传递参数，只传 query 即可，query 形如 ?a=1&b=2 */
    entrancePath?: string;
    /** 接口调用失败的回调函数 */
    fail?: ShareEmojiToGroupFailCallback;
    /** 分享的表情消息是否要带小程序入口 */
    needShowEntrance?: boolean;
    /** 接口调用成功的回调函数 */
    success?: ShareEmojiToGroupSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ShareEmojiToGroupSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShareImageToGroupCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShareImageToGroupFailCallback = (res: GeneralCallbackResult) => void;
interface ShareImageToGroupOption {
    /** 要分享的图片地址，必须为本地路径或临时路径 */
    imagePath: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShareImageToGroupCompleteCallback;
    /** 如需传递参数，只传 query 即可，query 形如 ?a=1&b=2 */
    entrancePath?: string;
    /** 接口调用失败的回调函数 */
    fail?: ShareImageToGroupFailCallback;
    /** 分享的图片消息是否要带小程序入口 */
    needShowEntrance?: boolean;
    /** 接口调用成功的回调函数 */
    success?: ShareImageToGroupSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ShareImageToGroupSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShareMessageToFriendCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShareMessageToFriendFailCallback = (res: GeneralCallbackResult) => void;
interface ShareMessageToFriendOption {
    /** 发送对象的 openId */
    openId: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShareMessageToFriendCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: ShareMessageToFriendFailCallback;
    /** 转发显示图片的链接，可使用本地图片文件路径或相对代码包根目录的图片文件路径，不可使用网络图片。如需使用网络图片，可先在游戏域调用 wx.downloadFile 下载到本地后，调用 OpenDataContext.postMessage 发送本地图片路径到开放数据域使用。显示图片长宽比是 5:4 */
    imageUrl?: string;
    /** 审核通过的图片编号，详见 [使用审核通过的转发图片](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#使用审核通过的转发图片) */
    imageUrlId?: string;
    /** 接口调用成功的回调函数 */
    success?: ShareMessageToFriendSuccessCallback;
    /** 转发标题，不传则默认使用当前小游戏的昵称。 */
    title?: string;
}
/** 接口调用成功的回调函数 */
type ShareMessageToFriendSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShareTextToGroupCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShareTextToGroupFailCallback = (res: GeneralCallbackResult) => void;
interface ShareTextToGroupOption {
    /** 要分享的文本内容 */
    content: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShareTextToGroupCompleteCallback;
    /** 如需传递参数，只传 query 即可，query 形如 ?a=1&b=2 */
    entrancePath?: string;
    /** 接口调用失败的回调函数 */
    fail?: ShareTextToGroupFailCallback;
    /** 分享的表情消息是否要带小程序入口 */
    needShowEntrance?: boolean;
    /** 接口调用成功的回调函数 */
    success?: ShareTextToGroupSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ShareTextToGroupSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShareVideoToGroupCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShareVideoToGroupFailCallback = (res: GeneralCallbackResult) => void;
interface ShareVideoToGroupOption {
    /** 要分享的视频地址，必须为本地路径或临时路径 */
    videoPath: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShareVideoToGroupCompleteCallback;
    /** 如需传递参数，只传 query 即可，query 形如 ?a=1&b=2 */
    entrancePath?: string;
    /** 接口调用失败的回调函数 */
    fail?: ShareVideoToGroupFailCallback;
    /** 分享的图片消息是否要带小程序入口 */
    needShowEntrance?: boolean;
    /** 接口调用成功的回调函数 */
    success?: ShareVideoToGroupSuccessCallback;
    /** 缩略图路径，若留空则使用视频首帧 */
    thumbPath?: string;
}
/** 接口调用成功的回调函数 */
type ShareVideoToGroupSuccessCallback = (res: GeneralCallbackResult) => void;
/** 选填，如果已经执行 `.load({ ... })` 无需填写，也允许使用 `.show({ ... })` 连贯执行 */
interface ShowOption {
    /** 选填，部分活动、功能允许额外提供参数数据，具体使用请根据渠道说明，默认可不填 */
    extraData?: IAnyObject;
    /** 从不同渠道获得的OPENLINK字符串 */
    openlink?: string;
    /** 选填，部分活动、功能允许接收自定义query参数，请参阅渠道说明，默认可不填 */
    query?: IAnyObject;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShowShareImageMenuCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShowShareImageMenuFailCallback = (res: GeneralCallbackResult) => void;
interface ShowShareImageMenuOption {
    /** 要分享的图片地址，必须为本地路径或临时路径 */
    path: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShowShareImageMenuCompleteCallback;
    /** 需要基础库： `3.2.0`
     *
     * 从消息小程序入口打开小程序的路径，如果当前页面允许分享给朋友，则默认为当前页面路径，否则默认为小程序首页 */
    entrancePath?: string;
    /** 接口调用失败的回调函数 */
    fail?: ShowShareImageMenuFailCallback;
    /** 需要基础库： `3.2.0`
     *
     * 分享的图片消息是否要带小程序入口 (仅部分小程序类目可用) */
    needShowEntrance?: boolean;
    /** 接口调用成功的回调函数 */
    success?: ShowShareImageMenuSuccessCallback;
}
/** 接口调用成功的回调函数 */
type ShowShareImageMenuSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ShowShareMenuCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ShowShareMenuFailCallback = (res: GeneralCallbackResult) => void;
interface ShowShareMenuOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ShowShareMenuCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: ShowShareMenuFailCallback;
    /** 需要基础库： `2.11.3`
     *
     * 本接口为 Beta 版本，暂只在 Android 平台支持。需要显示的转发按钮名称列表，默认['shareAppMessage']。按钮名称合法值包含 "shareAppMessage"、"shareTimeline" 两种 */
    menus?: string[];
    /** 接口调用成功的回调函数 */
    success?: ShowShareMenuSuccessCallback;
    /** 是否使用带 shareTicket 的转发[详情](#) */
    withShareTicket?: boolean;
}
/** 接口调用成功的回调函数 */
type ShowShareMenuSuccessCallback = (res: GeneralCallbackResult) => void;
/** <b>支付原串</b>
 *
 * 具体支付参数见下面的signData，需要将数据以json格式传递
 *
 * signData例子:
 *
 * '{"mode":"goods","offerId":"123","buyQuantity":1,"env":0,"currencyType":"CNY","platform":"android","zoneId":"1","productId":"testproductId","goodsPrice":10,"outTradeNo":"xxxxxx","attach":"testdata"}' */
interface SignData1 {
    /** <b>购买数量</b> */
    buyQuantity: number;
    /** <b>币种</b>
     *
     * 可选值：
     * - 'CNY': 人民币; */
    currencyType: 'CNY';
    /** <b>道具单价（分）</b>
     *
     * 用来校验价格与后台道具价格是否一致，避免用户在业务商城页看到的价格与实际价格不一致导致投诉 */
    goodsPrice: number;
    /** <b>支付的类型</b>
     *
     * 不同的支付类型有各自额外要传的附加参数 */
    mode: string;
    /** <b>在米大师侧申请的应用id</b>
     *
     * mp-支付基础配置中的offerid */
    offerId: string;
    /** <b>业务订单号</b>
     *
     * 每个订单号只能使用一次，重复使用会失败（极端情况不保证唯一，不建议业务强依赖唯一性）。
     *
     * 要求32个字符内，只能是数字、大小写字母、符号 _-|*@组成，不能以下划线(_)开头。
     *
     * 若没有传入，则平台会自动填充一个，并以下划线开头。 */
    outTradeNo: string;
    /** <b>道具ID</b> */
    productId: string;
    /** <b>透传数据</b>
     *
     * 发货通知时会透传给开发者 */
    attach?: string;
    /** <b>环境配置</b>
     *
     * 可选值：
     * - 0: 米大师正式环境;
     * - 1: 米大师沙箱环境; */
    env?: 0 | 1;
    /** <b>平台</b>
     *
     * 可选值：
     * - 'android': 安卓; */
    platform?: 'android';
    /** <b>分区ID</b> */
    zoneId?: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type StartHandoffCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type StartHandoffFailCallback = (res: GeneralCallbackResult) => void;
interface StartHandoffOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: StartHandoffCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: StartHandoffFailCallback;
    /** 接口调用成功的回调函数 */
    success?: StartHandoffSuccessCallback;
}
/** 接口调用成功的回调函数 */
type StartHandoffSuccessCallback = (res: GeneralCallbackResult) => void;
interface StoreGift {
    /** [Promise<Object> StoreGift.getOrderInfo()](https://developers.weixin.qq.com/minigame/dev/api/open-api/store-gift/StoreGift.getOrderInfo.html)
     *
     * 需要基础库： `3.8.12`
     *
     * 查询订单状态
     *
     * ****
     *
     * ### orderStatus 状态码
     *   | 值  | 含义       |
     *   | --- | --------- |
     *   | 10 |  支付成功，用户可以领取礼物(小程序/小游戏下单成功初始状态)    |
     *   | 20 |  礼物已经领取   |
     *   | 180 | 礼物超时未领取   |
     *   | 181 | 超时退款   |
     *   | 250 | 订单已取消   |
     *
     * ****
     *
     * ### 异常捕获
     *   当获取订单失败的时候，通过 catch 捕获异常，数据结构如下
     *   | 属性 | 类型 | 说明 |
     *   | ---- | ---- | ---- |
     *   | errCode  | number | 错误码 |
     *   | errMsg  | string | 错误信息 |
     *
     *   其中 errCode 状态码如下
     *   | 值  | 含义       |
     *   | --- | --------- |
     *   | 40097 | 参数错误，请检查订单 id 是否传对  |
     *   | 606662 | 606662 表示当前用户非收礼人  |
     *
     *   errCode不为0代表订单拉取失败，常见的错误码可见 [链接](https://developers.weixin.qq.com/doc/channels/API/basics/commErrCode.html) */
    getOrderInfo(): Promise<OrderInfo>;
    /** [Promise<Object> StoreGift.open()](https://developers.weixin.qq.com/minigame/dev/api/open-api/store-gift/StoreGift.open.html)
     *
     * 需要基础库： `3.8.12`
     *
     * 打开礼物，请注意，这里的回调仅仅是打开礼物界面的回调，并不是收下礼物的回调
     *
     * ****
     *
     * ### 异常捕获
     *   当打开礼物失败的时候，通过 catch 捕获异常，数据结构如下
     *   | 属性 | 类型 | 说明 |
     *   | ---- | ---- | ---- |
     *   | errCode  | number | 错误码 |
     *   | errMsg  | string | 错误信息 |
     *
     *   其中 errCode 状态码如下
     *   | 值  | 含义       |
     *   | --- | --------- |
     *   | -1000 | 订单加载失败，请重试 |
     *   | -1001 | 订单参数错误  |
     *   | -1002 | 打开礼物失败[礼物状态异常] |
     *   | -1003 | 调用客户端接口失败 |
     *   | -1004 | 正在加载订单信息 |
     *   | -1005 | 当前环境不支持 | */
    open(): Promise<IAnyObject>;
    /** [boolean StoreGift.isSupported()](https://developers.weixin.qq.com/minigame/dev/api/open-api/store-gift/StoreGift.isSupported.html)
     *
     * 需要基础库： `3.8.12`
     *
     * 获取当前环境是否支持礼物组件 */
    isSupported(): boolean;
}
/** 订阅消息设置
*
* **示例代码**
*
* ```javascript
wx.getSetting({
withSubscriptions: true,
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
console.log(res.subscriptionsSetting)
// res.subscriptionsSetting = {
//   mainSwitch: true, // 订阅消息总开关
//   itemSettings: {   // 每一项开关
//     SYS_MSG_TYPE_INTERACTIVE: 'accept', // 小游戏系统订阅消息
//     SYS_MSG_TYPE_RANK: 'accept'
//     zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: 'reject', // 普通一次性订阅消息
//     ke_OZC_66gZxALLcsuI7ilCJSP2OJ2vWo2ooUPpkWrw: 'ban',
//   }
// }
}
})
``` */
interface SubscriptionsSetting {
    /** 订阅消息总开关，true为开启，false为关闭 */
    mainSwitch: boolean;
    /** 每一项订阅消息的订阅状态。itemSettings对象的键为**一次性订阅消息的模板id**或**系统订阅消息的类型**，值为'accept'、'reject'、'ban'中的其中一种。'accept'表示用户同意订阅这条消息，'reject'表示用户拒绝订阅这条消息，'ban'表示已被后台封禁。一次性订阅消息使用方法详见 [wx.requestSubscribeMessage](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)，永久订阅消息（仅小游戏可用）使用方法详见[wx.requestSubscribeSystemMessage](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeSystemMessage.html)
     * ## 注意事项
     *  - itemSettings 只返回用户勾选过订阅面板中的“总是保持以上选择，不再询问”的订阅消息。 */
    itemSettings?: IAnyObject;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ToTempFilePathCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ToTempFilePathFailCallback = (res: GeneralCallbackResult) => void;
interface ToTempFilePathOption {
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: ToTempFilePathCompleteCallback;
    /** 目标文件的高度，会将截取的部分拉伸或压缩至该数值 */
    destHeight?: number;
    /** 目标文件的宽度，会将截取的部分拉伸或压缩至该数值 */
    destWidth?: number;
    /** 接口调用失败的回调函数 */
    fail?: ToTempFilePathFailCallback;
    /** 目标文件的类型
     *
     * 可选值：
     * - 'jpg': jpg 文件;
     * - 'png': png 文件; */
    fileType?: 'jpg' | 'png';
    /** 截取 canvas 的高度 */
    height?: number;
    /** jpg图片的质量，仅当 fileType 为 jpg 时有效。取值范围为 0.0（最低）- 1.0（最高），不含 0。不在范围内时当作 1.0 */
    quality?: number;
    /** 接口调用成功的回调函数 */
    success?: ToTempFilePathSuccessCallback;
    /** 截取 canvas 的宽度 */
    width?: number;
    /** 截取 canvas 的左上角横坐标 */
    x?: number;
    /** 截取 canvas 的左上角纵坐标 */
    y?: number;
}
/** 接口调用成功的回调函数 */
type ToTempFilePathSuccessCallback = (result: ToTempFilePathSuccessCallbackResult) => void;
interface ToTempFilePathSuccessCallbackResult {
    /** canvas 生成的临时文件路径 (本地路径) */
    tempFilePath: string;
    errMsg: string;
}
interface ToTempFilePathSyncOption {
    /** 目标文件的高度，会将截取的部分拉伸或压缩至该数值 */
    destHeight?: number;
    /** 目标文件的宽度，会将截取的部分拉伸或压缩至该数值 */
    destWidth?: number;
    /** 目标文件的类型
     *
     * 可选值：
     * - 'jpg': jpg 文件;
     * - 'png': png 文件; */
    fileType?: 'jpg' | 'png';
    /** 截取 canvas 的高度 */
    height?: number;
    /** jpg图片的质量，仅当 fileType 为 jpg 时有效。取值范围为 0.0（最低）- 1.0（最高），不含 0。不在范围内时当作 1.0 */
    quality?: number;
    /** 截取 canvas 的宽度 */
    width?: number;
    /** 截取 canvas 的左上角横坐标 */
    x?: number;
    /** 截取 canvas 的左上角纵坐标 */
    y?: number;
}
/** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
type UDPSocketOffCloseCallback = (res: GeneralCallbackResult) => void;
type UDPSocketOnCloseCallback = (res: GeneralCallbackResult) => void;
/** 参数列表 */
interface UpdatableMessageFrontEndParameter {
    /** 参数名 */
    name: string;
    /** 参数值 */
    value: string;
}
/** 需要基础库： `2.4.0`
 *
 * 动态消息的模板信息 */
interface UpdatableMessageFrontEndTemplateInfo {
    /** 参数列表 */
    parameterList: UpdatableMessageFrontEndParameter[];
    /** 模板ID */
    templateId: string;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type UpdateCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type UpdateFailCallback = (res: GeneralCallbackResult) => void;
/** 入参对象 */
interface UpdateParams {
    /** 分数值 */
    score: number;
    /** 玩法唯一标识，用于区分不同的擂台赛玩法。可以在 MP后台-运营功能管理-基础配置-游戏玩法ID 中配置 */
    scoreKey: string;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: UpdateCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: UpdateFailCallback;
    /** 可选子 key，正整数，取值范围1-1000。该参数可用于游戏同一玩法的关卡区分，从基础库版本3.12.1开始支持 */
    subScoreKey?: number;
    /** 接口调用成功的回调函数 */
    success?: UpdateSuccessCallback;
}
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type UpdateShareMenuCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type UpdateShareMenuFailCallback = (res: GeneralCallbackResult) => void;
interface UpdateShareMenuOption {
    /** 需要基础库： `2.4.0`
     *
     * 动态消息的 activityId。通过 [updatableMessage.createActivityId](#) 接口获取 */
    activityId?: string;
    /** 需要基础库： `3.7.8`
     *
     * 指定成员的方式 */
    chooseType?: number;
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    complete?: UpdateShareMenuCompleteCallback;
    /** 接口调用失败的回调函数 */
    fail?: UpdateShareMenuFailCallback;
    /** 需要基础库： `2.13.0`
     *
     * 是否是私密消息。详见 [小程序私密消息](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/private-message.html) */
    isPrivateMessage?: boolean;
    /** 需要基础库： `2.4.0`
     *
     * 是否是动态消息，详见[动态消息](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/updatable-message.html) */
    isUpdatableMessage?: boolean;
    /** 参与用户此聊天室下的 group_openid 列表 */
    participant?: string[];
    /** 接口调用成功的回调函数 */
    success?: UpdateShareMenuSuccessCallback;
    /** 需要基础库： `2.4.0`
     *
     * 动态消息的模板信息 */
    templateInfo?: UpdatableMessageFrontEndTemplateInfo;
    /** 需要基础库： `2.11.0`
     *
     * 群待办消息的id，通过toDoActivityId可以把多个群待办消息聚合为同一个。通过 [updatableMessage.createActivityId](#) 接口获取。详见[群待办消息](#) */
    toDoActivityId?: string;
    /** 需要基础库： `3.7.8`
     *
     * 聊天工具模式特殊动态消息 */
    useForChatTool?: boolean;
    /** 是否使用带 shareTicket 的转发[详情](#) */
    withShareTicket?: boolean;
}
/** 接口调用成功的回调函数 */
type UpdateShareMenuSuccessCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
type UpdateSuccessCallback = (res: GeneralCallbackResult) => void;
/** 托管数据 */
interface UserGameData {
    /** 用户的托管 KV 数据列表 */
    KVDataList: KVData[];
    /** 用户的微信头像 url */
    avatarUrl: string;
    /** 用户的微信昵称 */
    nickname: string;
    /** 用户的 openid */
    openid: string;
}
/** @warning **用户头像昵称获取规则已调整，参考 [用户信息接口调整说明](https://developers.weixin.qq.com/community/develop/doc/000cacfa20ce88df04cb468bc52801)、[小程序用户头像昵称获取规则调整公告](https://developers.weixin.qq.com/community/develop/doc/00022c683e8a80b29bed2142b56c01)**
 *
 * 用户信息 */
interface UserInfo {
    /** 用户头像图片的 URL。URL 最后一个数值代表正方形头像大小（有 0、46、64、96、132 数值可选，0 代表 640x640 的正方形头像，46 表示 46x46 的正方形头像，剩余数值以此类推。默认132），用户没有头像时该项为空。若用户更换头像，原有头像 URL 将失效。 */
    avatarUrl: string;
    /** 用户所在城市。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801) */
    city: string;
    /** 用户所在国家。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801) */
    country: string;
    /** 用户性别。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801)
     *
     * 可选值：
     * - 0: 未知;
     * - 1: 男性;
     * - 2: 女性; */
    gender: 0 | 1 | 2;
    /** 显示 country，province，city 所用的语言。强制返回 “zh_CN”，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801)
     *
     * 可选值：
     * - 'en': 英文;
     * - 'zh_CN': 简体中文;
     * - 'zh_TW': 繁体中文; */
    language: 'en' | 'zh_CN' | 'zh_TW';
    /** 用户昵称 */
    nickName: string;
    /** 用户所在省份。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801) */
    province: string;
}
/** 用户信息按钮 */
interface UserInfoButton {
    /** 按钮的样式 */
    style: OptionStyle;
    /** 按钮的类型。
     *
     * 可选值：
     * - 'text': 可以设置背景色和文本的按钮;
     * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
    type: 'text' | 'image';
    /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
    image?: string;
    /** 按钮上的文本，仅当 type 为 `text` 时有效 */
    text?: string;
    /** [UserInfoButton.destroy()](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.destroy.html)
     *
     * 销毁用户信息按钮 */
    destroy(): void;
    /** [UserInfoButton.hide()](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.hide.html)
     *
     * 隐藏用户信息按钮。 */
    hide(): void;
    /** [UserInfoButton.offTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.offTap.html)
*
* 移除用户信息按钮的点击事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

UserInfoButton.onTap(listener)
UserInfoButton.offTap(listener) // 需传入与监听时同一个的函数对象
``` */
    offTap(
    /** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
    listener?: UserInfoButtonOffTapCallback): void;
    /** [UserInfoButton.onTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.onTap.html)
     *
     * 监听用户信息按钮的点击事件 */
    onTap(
    /** 用户信息按钮的点击事件的监听函数 */
    listener: UserInfoButtonOnTapCallback): void;
    /** [UserInfoButton.show()](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.show.html)
     *
     * 显示用户信息按钮 */
    show(): void;
}
/** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
type UserInfoButtonOffTapCallback = (result: OnTapListenerResult) => void;
/** 用户信息按钮的点击事件的监听函数 */
type UserInfoButtonOnTapCallback = (result: OnTapListenerResult) => void;
export interface Runtime {
/** [Boolean wx.setHandoffQuery(String query)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.setHandoffQuery.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 设置接力参数，该接口需要在游戏域调用 */
setHandoffQuery(
/** 需要传递给接力设备的参数，格式 为querystring */
query: string): boolean;
/** [Object wx.getAccountInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/open-api/account-info/wx.getAccountInfoSync.html)
*
* 需要基础库： `2.11.2`
*
* 获取当前账号信息。线上小程序版本号仅支持在正式版小程序中获取，开发版和体验版中无法获取。
*
* **示例代码**
*
* ```js
const accountInfo = wx.getAccountInfoSync();
console.log(accountInfo.miniProgram.appId) // 小程序 appId
console.log(accountInfo.plugin.appId) // 插件 appId
console.log(accountInfo.plugin.version) // 插件版本号， 'a.b.c' 这样的形式
``` */
getAccountInfoSync(): AccountInfo;
/** [Object wx.getDirectAdStatusSync()](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.getDirectAdStatusSync.html)
*
* 需要基础库： `3.11.2`
*
* 获取直玩广告组件展示状态。
*
* **示例代码**
*
* ```js
const statusInfo = wx.getDirectAdStatusSync();
console.log(statusInfo.isInMask) // 当前是否在蒙层阶段
console.log(statusInfo.isInDirectGameAd) // 当前是否在直玩广告中
``` */
getDirectAdStatusSync(): DirectAdStatusInfo;
/** [Object wx.getEnterOptionsSync()](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.getEnterOptionsSync.html)
 *
 * 需要基础库： `2.13.2`
 *
 * 获取小游戏打开的参数（包括冷启动和热启动）
 *
 * **返回有效 referrerInfo 的场景**
 *
 * | 场景值 | 场景                            | appId含义  |
 * | ------ | ------------------------------- | ---------- |
 * | 1020   | 公众号 profile 页相关小程序列表 | 来源公众号 |
 * | 1035   | 公众号自定义菜单                | 来源公众号 |
 * | 1036   | App 分享消息卡片                | 来源App    |
 * | 1037   | 小程序打开小程序                | 来源小程序 |
 * | 1038   | 从另一个小程序返回              | 来源小程序 |
 * | 1043   | 公众号模板消息                  | 来源公众号 |
 *
 * **不同 apiCategory 场景下的 API 限制**
 *
 * `X` 表示 API 被限制无法使用；不在表格中的 API 不限制。
 *
 * |                                       | default | nativeFunctionalized | browseOnly | embedded |
 * |-|-|-|-|-|
 * |navigateToMiniProgram                  |         | `X`                  | `X`        |          |
 * |openSetting                            |         |                      | `X`        |          |
 * |&lt;button open-type="share"&gt;       |         | `X`                  | `X`        | `X`      |
 * |&lt;button open-type="feedback"&gt;    |         |                      | `X`        |          |
 * |&lt;button open-type="open-setting"&gt;|         |                      | `X`        |          |
 * |openEmbeddedMiniProgram                |         | `X`                  | `X`        | `X`      |
 *
 * **注意**
 *
 * 部分版本在无`referrerInfo`的时候会返回 `undefined`，建议使用 `options.referrerInfo && options.referrerInfo.appId` 进行判断。 */
getEnterOptionsSync(): EnterOptionsGame;
/** [Object wx.getExptInfoSync(Array.&lt;string&gt; keys)](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.getExptInfoSync.html)
 *
 * 需要基础库： `2.17.0`
 *
 * 给定实验参数数组，获取对应的实验参数值
 *
 * **提示**
 *
 * 假设实验参数有 `color`, `size`
 * 调用 wx.getExptInfoSync() 会返回 `{color:'#fff',size:20}` 类似的结果
 * 而 wx.getExptInfoSync(['color']) 则只会返回 `{color:'#fff'}` */
getExptInfoSync(
/** 实验参数数组，不填则获取所有实验参数 */
keys?: string[]): IAnyObject;
/** [Object wx.getLaunchOptionsSync()](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.getLaunchOptionsSync.html)
 *
 * 获取小游戏冷启动时的参数。热启动参数通过 [wx.onShow](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.onShow.html) 或 [wx.getEnterOptionsSync](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.getEnterOptionsSync.html) 接口获取。
 *
 * **返回有效 referrerInfo 的场景**
 *
 * | 场景值 | 场景                            | appId含义  |
 * | ------ | ------------------------------- | ---------- |
 * | 1020   | 公众号 profile 页相关小程序列表 | 来源公众号 |
 * | 1035   | 公众号自定义菜单                | 来源公众号 |
 * | 1036   | App 分享消息卡片                | 来源App    |
 * | 1037   | 小程序打开小程序                | 来源小程序 |
 * | 1038   | 从另一个小程序返回              | 来源小程序 |
 * | 1043   | 公众号模板消息                  | 来源公众号 |
 *
 * **注意**
 *
 * 部分版本在无`referrerInfo`的时候会返回 `undefined`，
 * 建议使用 `options.referrerInfo && options.referrerInfo.appId` 进行判断。 */
getLaunchOptionsSync(): LaunchOptionsGame;
/** [[AdSkipCard](https://developers.weixin.qq.com/minigame/dev/api/ad/AdSkipCard.html) wx.createAdSkipCard()](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createAdSkipCard.html)
 *
 * 需要基础库： `3.16.2`
 *
 * 创建并返回广告跳过卡（畅玩卡）管理器 AdSkipCard 实例（单例）。
 *
 * 通过该实例可调用以下方法：
 * - load()：预加载畅玩卡数据。返回 Promise。加载成功触发 onLoad；失败触发 onError。
 * - show()：打开购买弹窗（coverview）。返回 Promise。打开成功触发 onShow；失败触发 onError。
 * - onLoad / offLoad：注册/取消加载完成事件监听
 * - onShow / offShow：注册/取消弹窗展示事件监听
 * - onClose / offClose：注册/取消弹窗关闭事件监听，回调参数 { result }：
 *     - 'close'       未点击购买直接关闭
 *     - 'pay_cancel'  点了购买按钮但未支付成功
 *     - 'pay_success' 支付成功
 * - onError / offError：注册/取消错误事件监听，回调参数 { errCode, errMsg }
 *     前端错误码：-1001 预加载失败 / -1002 打开弹窗失败
 *     服务端错误码原样透传
 * - onUse / offUse：注册/取消畅玩权益消耗事件监听，回调参数 { usedCount }（今日已使用次数） */
createAdSkipCard(): AdSkipCard;
/** [[BannerAd](https://developers.weixin.qq.com/minigame/dev/api/ad/BannerAd.html) wx.createBannerAd(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createBannerAd.html)
 *
 * 需要基础库： `2.0.4`
 * @deprecated 基础库版本 [3.5.5](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃，请使用 [wx.createCustomAd](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createCustomAd.html) 替换
 *
 * 创建 banner 广告组件。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号 >= 2.0.4 后再使用该 API。每次调用该方法创建 banner 广告都会返回一个全新的实例。 */
createBannerAd(option: CreateBannerAdOption): BannerAd;
/** [[CustomAd](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.html) wx.createCustomAd(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createCustomAd.html)
 *
 * 需要基础库： `2.11.1`
 *
 * 创建原生模板广告组件。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号 >= 2.11.1 后再使用该 API。每次调用该方法创建原生模板广告都会返回一个全新的实例。 */
createCustomAd(option: CreateCustomAdOption): CustomAd;
/** [[FeedbackButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/FeedbackButton.html) wx.createFeedbackButton(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/feedback/wx.createFeedbackButton.html)
 *
 * 需要基础库： `2.1.2`
 *
 * 创建打开意见反馈页面的按钮 */
createFeedbackButton(option: CreateOpenSettingButtonOption): FeedbackButton;
/** [[GameClubButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/GameClubButton.html) wx.createGameClubButton(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/wx.createGameClubButton.html)
 *
 * 需要基础库： `2.0.3`
 *
 * 创建游戏圈按钮。游戏圈按钮被点击后会跳转到小游戏的游戏圈。更多关于游戏圈的信息见 [游戏圈使用指南](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/game-club.html)。从基础库2.30.3开始，新增传递openlink的特性，支持打开单帖子、话题页、活动页。 */
createGameClubButton(option: CreateGameClubButtonOption): GameClubButton;
/** [[GridAd](https://developers.weixin.qq.com/minigame/dev/api/ad/GridAd.html) wx.createGridAd(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createGridAd.html)
 *
 * 需要基础库： `2.9.2`
 * @deprecated 基础库版本 [2.30.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃
 *
 * 创建 grid(格子) 。每次调用该方法创建 grid(格子) 广告都会返回一个全新的实例。 */
createGridAd(option: CreateGridAdOption): GridAd;
/** [[InterstitialAd](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.html) wx.createInterstitialAd(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createInterstitialAd.html)
 *
 * 需要基础库： `2.6.0`
 *
 * 创建插屏广告组件。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号后再使用该 API。每次调用该方法创建插屏广告都会返回一个全新的实例（小程序端的插屏广告实例不允许跨页面使用）。 */
createInterstitialAd(option: CreateInterstitialAdOption): InterstitialAd;
/** [[OpenDataContext](https://developers.weixin.qq.com/minigame/dev/api/open-api/context/OpenDataContext.html) wx.getOpenDataContext(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/context/wx.getOpenDataContext.html)
 *
 * 需要基础库： `1.9.92`
 *
 * 获取开放数据域 */
getOpenDataContext(option?: GetOpenDataContextOption): OpenDataContext;
/** [[OpenSettingButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/OpenSettingButton.html) wx.createOpenSettingButton(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.createOpenSettingButton.html)
 *
 * 需要基础库： `2.0.7`
 * @deprecated 基础库版本 [3.0.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃，请使用 [wx.openSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.openSetting.html) 替换
 *
 * 创建打开设置页面的按钮 */
createOpenSettingButton(option: CreateOpenSettingButtonOption): OpenSettingButton;
/** [[PageManager](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/PageManager.html) wx.createPageManager()](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/wx.createPageManager.html)
*
* 需要基础库： `3.6.7`
*
* 小游戏开放页面管理器，用于启动微信内置的各种小游戏活动、功能页面。具体OPENLINK值由不同的能力渠道获得。
*
* **示例代码**
*
* ```js
const pageManager = wx.createPageManager();

pageManager.load({
openlink: 'xxxxxxx-xxxxxx', // 由不同渠道获得的OPENLINK值
}).then((res) => {
// 加载成功，res 可能携带不同活动、功能返回的特殊回包信息（具体请参阅渠道说明）
console.log(res);

// 加载成功后按需显示
pageManager.show();

}).catch((err) => {
// 加载失败，请查阅 err 给出的错误信息
console.error(err);
})

```
*
* **错误码信息**
*
*  如需了解各种错误原因可参阅下表。
*
* | 代码 | 原因 | 解决方案 |
* | ------ | --------------- | -------------------------- |
* | 0  | 无异常  | - |
* | -1  | openlink异常 | 请确认openlink填写完整且正确。 |
* | -2  | 基础库版本不支持 | 基础库版本较低引起，受平台灰度等策略影响。 |
* | -3  | 当前设备暂不支持 | 通常受活动、能力本身对平台限制引起。 |
* | -4  | 业务渠道方报错 | 由openlink业务方提供的错误信息，具体错误信息请详见 errInfo 字段。 |
* | -5  | 其他错误 | 其他原因引发的错误，具体错误信息请详见 errInfo 字段。 |
* | -6  | 网络错误 | 网络异常引发的错误，检查网络环境。|
* | -7  | 频繁错误 | 请勿高频发起load请求。 |
* | -8  | 小游戏版本错误  | 小游戏版本与openlink不匹配，需正确使用openlink对应生效的 开发版、体验版、正式版。| */
createPageManager(): PageManager;
/** [[RankManager](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/RankManager.html) wx.getRankManager()](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-component/wx.getRankManager.html)
*
* 需要基础库： `3.14.2`
*
* 初始化并返回一个擂台赛管理器实例，用于管理游戏得分存取、得分排行榜（开发中）以及擂台赛功能。小游戏擂台赛功能介绍详见[小游戏擂台赛指南文档](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/tournament.html)。
*
* **示例代码**
*
* **1 存取用户得分**
*
* **1.1 上报用户分数**
* ```js
// 获取擂台赛管理器实例
const rankManager = wx.getRankManager();
// 上报用户分数
rankManager.update({
scoreKey: 'score_key', // 在MP配置的scoreKey
score: 100, // 具体分数值
success: res => {
console.log('分数上报成功', res);
},
fail: err => {
console.error('分数上报失败', err);
},
});
```
*
* **1.2 查询用户最新得分**
* ```js
const rankManager = wx.getRankManager()
rankManager.getScore({
scoreKeys: ['score_key'],
periodType: 1, // 自然日最高分
success: (res) => {
console.log('分数信息', res.scores)
// res.scores 格式: { 'score_key': { score: 100, timestamp: 1234567890 } }
}
})
```
*
* **2 发起擂台赛**
*
* **2.1 接入前准备**
*
* 擂台赛组件的分享和动态消息功能依赖[聊天工具模式](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/chat-tool.html)。
*
* 聊天工具的分享功能要求小游戏具备有效的登录态。为确保用户分享擂台赛时游戏已建立登录态，需要在擂台赛开始前调用[wx.login](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html)接口完成登录流程。
*
* **2.2 上报擂主分数**
*
* 发起擂台赛前，需要先上报玩家发起擂台赛的基准分数。使用 `update` 方法进行分数上报。
* ```js
// 获取擂台赛管理器实例
const rankManager = wx.getRankManager();
// 上报用户分数
rankManager.update({
scoreKey: 'score_key', // 在MP配置的scoreKey
score: 100, // 具体分数值
success: res => {
console.log('分数上报成功', res);
},
fail: err => {
console.error('分数上报失败', err);
},
});
```
*
* **2.3 创建擂台赛**
*
* 分数上报成功后，使用 `createChallenge` 方法发起擂台赛。
* ```js
// 发起擂台赛
wx.getRankManager().createChallenge({
scoreKey: 'score_key',
success: res => {
console.log('擂台赛创建成功', res);
},
fail: err => {
console.error('擂台赛创建失败', err);
},
});
```
*
* 注意事项：
* - 一次 `update` 上报的分数只能创建一个擂台赛。
* - 针对同一次上报多次调用 `createChallenge` 将返回已创建的擂台赛。
*
* **3 加入擂台赛**
*
* **3.1 监听挑战开始事件**
*
* 用户从他人分享的擂台赛卡片进入小游戏，小游戏会在 onShow 时弹起加入擂台赛半屏。用户点击半屏上的"立即挑战"按钮，擂台赛挑战开始。
* 通过 `rankManager.onChallengeStart(callback)` 监听onChallengeStart事件，在onChallengeStart事件的回调中处理挑战开始逻辑。
* ```js
// 监听擂台赛开始事件
wx.getRankManager().onChallengeStart((challengeInfo) => {
// 处理挑战开始逻辑
console.log('擂台赛开始', challengeInfo.scoreKey);
});
```
*
* 注意事项：
* - 应尽早监听 onChallengeStart，推荐在游戏初始化或 onLaunch 生命周期里监听。由于用户点击“立即挑战”事件会等到onChallengeStart成功注册后再派发，过晚监听可能出现用户点了立即挑战，游戏没有及时开始擂台赛的情况。
*
* **3.2 中途操作**
*
* 擂台赛进行过程中，支持以下操作：
*
* 中途上报分数。擂台赛的最终分数将取中途上报分数和最终上报分数中最高的一次。中途上报不会结束擂台赛。
* ```js
// 游戏过程中上报中间分数
wx.getRankManager().middleUpdate({
scoreKey: 'score_key',
score: gameState.score, // 当前分数
success: res => {
console.log('中途分数上报成功', res);
},
fail: err => {
console.error('中途分数上报失败', err);
},
});
```
*
* 中途退出挑战，并拉起擂台赛结果页。中途退出的擂台赛，本次挑战为0分。
* ```js
// 中途退出擂台赛
wx.getRankManager().abort({
success: (res) => {
console.log('擂台赛退出成功', res);
},
fail: (err) => {
console.error('擂台赛退出失败', err);
},
});
```
*
* **3.3 结束擂台赛**
*
* 在擂台赛进行过程中调用 `update` 方法上报最终分数，系统将自动结束擂台赛并拉起结束界面。
* ```js
// 结束擂台赛并上报最终分数
wx.getRankManager().update({
scoreKey: 'score_key',
score: 150, // 最终分数
success: res => {
console.log('擂台赛结束', res);
},
fail: err => {
console.error('擂台赛结束异常', err);
},
});
```
*
* **3.4 奖励领取**
*
* 挑战者战胜擂主，或者擂主守擂成功时，可以在擂台赛组件结果页领取道具奖励。 */
getRankManager(): RankManager;
/** [[RewardedVideoAd](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.html) wx.createRewardedVideoAd(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createRewardedVideoAd.html)
 *
 * 需要基础库： `2.0.4`
 *
 * 创建激励视频广告组件。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号后再使用该 API（小游戏端要求 >= 2.0.4， 小程序端要求 >= 2.6.0）。调用该方法创建的激励视频广告是一个单例（小游戏端是全局单例，小程序端是页面内单例，在小程序端的单例对象不允许跨页面使用）。 */
createRewardedVideoAd(option: CreateRewardedVideoAdOption): RewardedVideoAd;
/** [[StoreGift](https://developers.weixin.qq.com/minigame/dev/api/open-api/store-gift/StoreGift.html) wx.createStoreGift(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/store-gift/wx.createStoreGift.html)
*
* 需要基础库： `3.8.12`
*
* 创建蓝包组件
*
* **示例代码**
*
* ```js
// 创建礼物
const gift = wx.createStoreGift({
presentOrderId: '42xxxxxxxxxxxx', // 订单号为42开头的字符串
openid: 'xxxxxxxx', // 请填入真实的 openid
});

// 为了方便调试，getOrderInfo 在不支持打开礼物组件的环境也能调用
gift.getOrderInfo().then((res) => {
// 订单加载成功
console.log('礼物状态: ' + res.orderStatus);
console.log('礼物祝福语: ' + res.wishMessage);
}).catch((err) => {
// 订单加载失败的异常处理
console.log(err.errCode);
console.log(err.errMsg);
});

// 打开礼物
if (gift.isSupported()) {
gift.open();
}
```
*
* **Bug & Tip**
*
* 1. `tip`：暂不支持在微信 Windows 版和微信 Mac 版的小程序上使用本接口。
* 1. `tip`：组件要求微信iOS版本>=8.0.60，微信Android版本>=8.0.60。 */
createStoreGift(option: CreateStoreGiftOption): StoreGift;
/** [[UserInfoButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.html) wx.createUserInfoButton(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.createUserInfoButton.html)
 *
 * 需要基础库： `2.0.1`
 *
 * 创建用户信息按钮。使用前请参考 [用户信息获取](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/user-info.html) */
createUserInfoButton(option: CreateUserInfoButtonOption): UserInfoButton;
/** [boolean wx.setMessageToFriendQuery(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.setMessageToFriendQuery.html)
*
* 设置 wx.shareMessageToFriend 接口 query 字段的值
*
* **提示**
*
* 1. 此处的 query 参数与 wx.onShow 取到的启动查询参数 query 不是同一个概念，仅仅是启动查询参数会增加一个字段为 query。
* 2. query 参数如涉及 "?"和"&" 等特殊符号，需自行进行 encodeURIComponent 和 decodeURIComponent 等操作。
*
* **示例代码**
*
* ```js
// 发送方
wx.setMessageToFriendQuery({
shareMessageToFriendScene: 1,
query: 'testquery'
})
// 预期接收方可以通过以下方式拿到设置
wx.getEnterOptionsSync().query.shareMessageToFriendScene // 1
wx.getEnterOptionsSync().query.query // 'testquery'
```
*
* **示例代码-特殊字符query**
*
* ```js
// 发送方
wx.setMessageToFriendQuery({
query: encodeURIComponent('foo=1&bar=2') // 如果 query 涉及特殊符号，需要自行 encodeURIComponent
})

// 接收方
// 预期可以通过以下方式拿到设置
wx.getEnterOptionsSync().query.query // 此处拿到的是 'foo%3D1%26bar%3D2'，需要 decodeURIComponent
decodeURIComponent(wx.getEnterOptionsSync().query.query) // 'foo=1&bar=2'
``` */
setMessageToFriendQuery(option: SetMessageToFriendQueryOption): boolean;
/** [wx.addCard(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/card/wx.addCard.html)
*
* 需要基础库： `2.5.0`
*
* 批量添加卡券。只有通过 [认证](https://developers.weixin.qq.com/miniprogram/product/renzheng.html) 的小程序或文化互动类目的小游戏才能使用。更多文档请参考 [微信卡券接口文档](https://mp.weixin.qq.com/cgi-bin/announce?action=getannouncement&key=1490190158&version=1&lang=zh_CN&platform=2)。
*
* **cardExt 说明**
*
* cardExt 是卡券的扩展参数，其值是一个 JSON 字符串。
*
* **示例代码**
*
* ```js
wx.addCard({
cardList: [
{
cardId: '',
cardExt: '{"code": "", "openid": "", "timestamp": "", "signature":""}'
}, {
cardId: '',
cardExt: '{"code": "", "openid": "", "timestamp": "", "signature":""}'
}
],
success (res) {
console.log(res.cardList) // 卡券添加结果
}
})
``` */
addCard<T extends AddCardOption = AddCardOption>(option: T): PromisifySuccessResult<T, AddCardOption>;
/** [wx.authPrivateMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.authPrivateMessage.html)
*
* 需要基础库： `2.13.0`
*
* 验证私密消息。用法详情见 [小程序私密消息使用指南](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/private-message.html)
*
* **示例代码**
*
* ```js
wx.authPrivateMessage({
shareTicket: 'xxxxxx',
success(res) {
console.log('authPrivateMessage success', res)
// res
// {
//   errMsg: 'authPrivateMessage:ok'
//   valid: true
//   iv: 'xxxx',
//   encryptedData: 'xxxxxx'
// }
},
fail(res) {
console.log('authPrivateMessage fail', res)
}
})
``` */
authPrivateMessage(option?: AuthPrivateMessageOption): void;
/** [wx.authorize(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/authorize/wx.authorize.html)
*
* 需要基础库： `1.2.0`
*
* 提前向用户发起授权请求。调用后会立刻弹窗询问用户是否同意授权小程序使用某项功能或获取用户的某些数据，但不会实际调用对应接口。如果用户之前已经同意授权，则不会出现弹窗，直接返回成功。更多用法详见 [用户授权](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html)。
*
* **注意事项**
*
* - 小游戏内使用 `wx.authorize({scope: "scope.userInfo"})`，不会弹出授权窗口，请使用 [wx.createUserInfoButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.createUserInfoButton.html)
* - 需要授权 `scope.userFuzzyLocation` 时必须[配置地理位置用途说明](https://developers.weixin.qq.com/minigame/dev/reference/configuration/app.html#permission)。
*
* **示例代码**
*
* ```js
// 可以通过 wx.getSetting 先查询一下用户是否授权了 "scope.writePhotosAlbum" 这个 scope
wx.getSetting({
success(res) {
if (!res.authSetting['scope.writePhotosAlbum']) {
wx.authorize({
scope: 'scope.writePhotosAlbum',
success () {
  // 用户已经同意保存到相册功能，后续调用 wx.saveImageToPhotosAlbum 接口不会弹窗询问
  wx.saveImageToPhotosAlbum()
}
})
}
}
})
``` */
authorize<T extends AuthorizeOption = AuthorizeOption>(option: T): PromisifySuccessResult<T, AuthorizeOption>;
/** [wx.checkHandoffEnabled(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.checkHandoffEnabled.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 检查是否可以进行接力，该接口需要在开放数据域调用 */
checkHandoffEnabled(option?: CheckHandoffEnabledOption): void;
/** [wx.checkIsAddedToMyMiniProgram(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/my-miniprogram/wx.checkIsAddedToMyMiniProgram.html)
 *
 * 需要基础库： `2.30.3`
 *
 * 检查小程序是否被添加至 「我的小程序」 */
checkIsAddedToMyMiniProgram(option: CheckIsAddedToMyMiniProgramOption): void;
/** [wx.checkIsSupportFacialRecognition(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/face/wx.checkIsSupportFacialRecognition.html)
*
* 需要基础库： `3.8.12`
*
* 检查当前设备是否支持人脸识别能力
*
* **示例代码**
*
* ```js
wx.checkIsSupportFacialRecognition({
success() {
// 支持人脸识别
},
fail() {
// 不支持人脸识别
},
})
``` */
checkIsSupportFacialRecognition(option?: CheckIsSupportFacialRecognitionOption): void;
/** [wx.checkIsSupportMidasPayment(Object object)](https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.checkIsSupportMidasPayment.html)
*
* 需要基础库： `3.10.3`
*
* 检查当前环境是否支持虚拟支付。使用前请注意阅读[相关说明](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/virtual-payment/virtual-payment2.html)。
*
* **平台支持说明**
*
* - Android、Windows、OHOS 平台：默认支持虚拟支付，接口直接返回支持
* - iOS 平台：需满足以下环境要求才可能支持虚拟支付
*   - 操作系统要求：使用 iPhone 或者 iPad，iOS 15 及以上版本
*   - 基础库版本要求：3.10.3 及以上
*   - 客户端版本要求：8.0.68 及以上
*   - 苹果支付不支持使用沙箱环境，仅支持使用现网环境
*
* **注意事项**
*
* 若该 API 都不存在，则 iOS 一定不支持虚拟支付，请保持旧版本逻辑。
*
* **示例代码**
*
* ```js
if (wx.checkIsSupportMidasPayment) {
wx.checkIsSupportMidasPayment({
success(res) {
console.log('支持检查结果:', res)
if (res.data.allow_pay) {
console.log('当前环境支持支付')
// 可以继续调用支付相关接口
} else {
console.log('当前环境不支持支付')
// 请自行适配用户提示文案
}
},
fail(err) {
console.error('检查支持情况失败:', err)
},
complete() {
console.log('检查完成')
}
})
}
``` */
checkIsSupportMidasPayment(option: CheckIsSupportMidasPaymentOption): void;
/** [wx.checkSession(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.checkSession.html)
*
* 检查登录态 session_key 是否过期。
*
* session_key 具有唯一性，在使用小程序时，同一用户在同一时刻仅有一个有效的 session_key。
*
* 通过 wx.login 接口获得的用户登录态拥有一定的时效性。用户越久未使用小程序，用户登录态越有可能过期。反之如果用户一直在使用小程序，则用户登录态一直保持有效。具体时效逻辑由微信维护，对开发者透明。除了过期失效外，触发获取临时登录凭证 code 的操作（[小程序登录](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/login.html) 和 [数据预拉取](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/pre-fetch.html)）可能会生成新的登录态session_key，从而使旧的 session_key 被顶替而失效。
*
* 开发者可以调用 wx.checkSession 接口检测用户登录态是否过期。**注意，wx.checkSession 的校验对象是最后一次获取 code 操作对应的登录态 session_key**，调用成功说明该 session_key 未过期，调用失败说明 session_key 已过期。如果要校验指定的 session_key 是否有效，可以在开发者服务器后台调用 [checkSessionKey](#)。
*
* 登录态失效后开发者可以再调用 wx.login 获取新的用户登录态。
*
* **示例代码**
*
* ```js
wx.checkSession({
success () {
//session_key 未过期，并且在本生命周期一直有效
},
fail () {
// session_key 已经失效，需要重新执行登录流程
wx.login() //重新登录
}
})
``` */
checkSession<T extends CheckSessionOption = CheckSessionOption>(option?: T): PromisifySuccessResult<T, CheckSessionOption>;
/** [wx.enterChatToolMode(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.enterChatToolMode.html)
 *
 * 需要基础库： `3.12.0`
 *
 * 进入聊天工具开放能力模式。
 *
 *   1. 不传入聊天室id列表时，微信会拉起聊天列表让用户选择，用户选择后绑定聊天室进入聊天工具模式。
 *   2. 传入聊天室id列表时（群聊为opengid），会直接绑定这批聊天室进入。 */
enterChatToolMode(option: EnterChatToolModeOption): void;
/** [wx.exitChatTool(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.exitChatTool.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 退出聊天工具开放能力模式 */
exitChatTool(option?: ExitChatToolOption): void;
/** [wx.getChannelsLiveInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.getChannelsLiveInfo.html)
 *
 * 需要基础库： `2.15.0`
 *
 * 获取视频号直播信息
 *
 * **常见错误码说明**
 *
 * 100008  视频号需要认证
 * 40097 入参异常
 * 1416104  视频号获取到的数据为空
 * 1416100  非法的视频号id */
getChannelsLiveInfo(option: GetChannelsLiveInfoOption): void;
/** [wx.getChannelsLiveNoticeInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.getChannelsLiveNoticeInfo.html)
 *
 * 需要基础库： `2.19.0`
 *
 * 获取视频号直播预告信息 */
getChannelsLiveNoticeInfo(option: GetChannelsLiveNoticeInfoOption): void;
/** [wx.getChatToolInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.getChatToolInfo.html)
*
* 需要基础库： `3.7.12`
*
* 获取聊天工具模式下的群聊信息。
*
* 需要注意的是，单聊群和多聊群下返回的群唯一标识是不同的。
* 1. 多聊群下返回 opengid
* 2. 单聊群下返回 open_single_roomid
*
* 同时将返回用户在群(含单聊)下的唯一标识 group_openid。
*
* **示例代码**
*
* ```js
wx.getChatToolInfo({
success(res) {
// res
{
errMsg: 'getChatToolInfo:ok',
encryptedData: '',
iv: ''
}
},
fail() {

}
})
```
*
* 敏感数据有两种获取方式，一是使用 [加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) 。
* 获取得到的开放数据为以下 json 结构（其中 opengid 为当前群的唯一标识）：
*
* ```json
{
"opengid": "OPENGID",       // 多聊群下返回的群唯一标识
"open_single_roomid": "",   // 单聊群下返回的群唯一标识
"group_openid": "",         // 用户在当前群的唯一标识
"chat_type": 3,             // 聊天室类型
}
``` */
getChatToolInfo<T extends GetChatToolInfoOption = GetChatToolInfoOption>(option: T): PromisifySuccessResult<T, GetChatToolInfoOption>;
/** [wx.getFriendCloudStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getFriendCloudStorage.html)
 *
 * 需要基础库： `1.9.92`
 *
 * 拉取当前用户所有同玩好友的托管数据。该接口需要用户授权，且只在开放数据域下可用。需要注意，添加新微信好友后的2小时内，getFriendCloudStorage 可能获取不到该新好友的数据。 */
getFriendCloudStorage(option: GetFriendCloudStorageOption): void;
/** [wx.getFriendSendGiftStatus(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getFriendSendGiftStatus.html)
 *
 * 需要基础库： `3.11.2`
 *
 * 指定一批 openid 查询好友送礼状态，该接口只在开放数据域下可用。 */
getFriendSendGiftStatus(option: GetFriendSendGiftStatusOption): void;
/** [wx.getGameClubData(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/wx.getGameClubData.html)
 *
 * 需要基础库： `2.25.4`
 *
 * 获取游戏圈数据。
 *
 * **type说明**
 *
 * | type取值 | 说明                                   | subKey  | GameClubDataByType.value |
 * | ------- | -------------------------------------- | -------- | -------- |
 * | 1   | 加入该游戏圈时间                            | 无需传入 | 秒级Unix时间戳 |
 * | 3   | 用户禁言状态                                | 无需传入  | 0：正常 1：禁言  |
 * | 4   | 当天(自然日)点赞贴子数                       | 无需传入  |  |
 * | 5   | 当天(自然日)评论贴子数                        | 无需传入  |  |
 * | 6   | 当天(自然日)发表贴子数                       | 无需传入  |  |
 * | 7   | 当天(自然日)发表视频贴子数                    | 无需传入  |  |
 * | 8   | 当天(自然日)赞官方贴子数                      | 无需传入  |  |
 * | 9   | 当天(自然日)评论官方贴子数                     | 无需传入  |  |
 * | 10   | 当天(自然日)发表到本圈子话题的贴子数           | 传入话题id，从mp-游戏圈话题管理处获取  |  |
 * | 11  | 用户最近一次推荐游戏时间                      | 无需传入  | 秒级时间戳 |  |
 *
 * **encryptedData 解密后得到的 GameClubData 的结构**
 *
 * | 属性 | 类型 | 说明                                   |
 * | ------- | ------- | -------------------------------------- |
 * |  dataList   | Array\<GameClubDataByType\> | 游戏圈相关数据的对象数组           |
 *
 * **GameClubDataByType 的结构**
 *
 * | 属性 | 类型 | 说明                                   |
 * | ------- |------- |  -------------------------------------- |
 * |  dataType   | number | 与输入的 dataType 一致          |
 * |  value   | number | 不同type返回的value含义不同，见type表格说明           | */
getGameClubData(option: GetGameClubDataOption): void;
/** [wx.getGameExptInfo(Object options)](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.getGameExptInfo.html)
*
* 需要基础库： `3.8.8`
*
* 给定实验参数数组，获取对应的实验参数值
*
* **示例代码**
*
* ```js
wx.getGameExptInfo({
keyList: ['experiment_key1', 'experiment_key2'],
success(res) {
res.list.forEach((expParam) => {
console.log('实验ID:', expParam.expt_id);
console.log('参数名:', expParam.param_name);
console.log('参数值:', expParam.param_value);
})
}
});
``` */
getGameExptInfo(
/** 配置参数对象 */
options: GetGameExptInfoOption): void;
/** [wx.getGroupCloudStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupCloudStorage.html)
 *
 * 需要基础库： `1.9.92`
 *
 * 获取群同玩成员的游戏数据。小游戏通过群分享卡片打开的情况下才可以调用。该接口需要用户授权，且只在开放数据域下可用。 */
getGroupCloudStorage(option: GetGroupCloudStorageOption): void;
/** [wx.getGroupEnterInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/group/wx.getGroupEnterInfo.html)
*
* 需要基础库： `2.10.4`
*
* 获取微信群聊场景下的小程序启动信息。群聊场景包括群聊小程序消息卡片、群待办、群工具。可用于获取当前群的 opengid。
* ## 注意事项
*  - 基础库 v2.10.4 开始支持获取群工具小程序启动信息
*  - 基础库 v2.17.3 开始支持获取群聊小程序消息卡片、群待办小程序启动信息
*  - 基础库 v3.7.8 支持获取单聊群启动信息，获取的群(含单聊)唯一标识，可用于[聊天工具模式](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.openChatTool.html)。
*
* **示例代码**
*
* ```js
wx.getGroupEnterInfo({
success(res) {
// res
{
errMsg: 'getGroupEnterInfo:ok',
encryptedData: '',
iv: ''
}
},
fail() {

}
})
```
*
* 敏感数据有两种获取方式，一是使用 [加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) 。
* 获取得到的开放数据为以下 json 结构（其中 opengid 为当前群的唯一标识）：
*
* ```json
{
"opengid": "OPENGID",       // 多聊群下返回的群唯一标识
"open_single_roomid": "",   // 单聊群下返回的群唯一标识
"group_openid": "",         // 用户在当前群的唯一标识
"chat_type": 3,             // 聊天室类型
}
```
*
* **Tips**
*
* - 如需要展示群名称，小程序可以使用[开放数据组件](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/open-data.html)
* - 小游戏可以通过 `wx.getGroupInfo` 接口获取群名称 */
getGroupEnterInfo(option: GetGroupEnterInfoOption): void;
/** [wx.getGroupInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupInfo.html)
 *
 * 需要基础库： `2.10.1`
 *
 * 获取群信息。该接口需要用户授权，且只在开放数据域下可用。 */
getGroupInfo(option: GetGroupInfoOption): void;
/** [wx.getGroupMembersInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupMembersInfo.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 获取所选群成员的头像、昵称，自行在开放数据域中渲染 */
getGroupMembersInfo(option: GetGroupMembersInfoOption): void;
/** [wx.getPhoneNumber(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.getPhoneNumber.html)
 *
 * 手机号快速验证，向用户申请，并在用户同意后，快速填写和验证手机 [具体说明](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/getPhoneNumber.html) */
getPhoneNumber(option: GetPhoneNumberOption): void;
/** [wx.getPotentialFriendList(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getPotentialFriendList.html)
 *
 * 需要基础库： `2.9.0`
 *
 * 获取可能对游戏感兴趣的未注册的好友名单。每次调用最多可获得 5 个好友。该接口需要用户授权，且只在开放数据域下可用。 */
getPotentialFriendList(option?: GetPotentialFriendListOption): void;
/** [wx.getPrivacySetting(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.getPrivacySetting.html)
*
* 需要基础库： `2.32.3`
*
* 查询隐私授权情况。隐私合规开发指南详情可见[《小游戏隐私合规开发指南》](https://developers.weixin.qq.com/community/develop/doc/000aa25cf1c8a0e64310ac3ef66401?highLine=%25E9%259A%2590%25E7%25A7%2581)
*
* ****
*
* ## 具体说明：
*
* 1. 一定要调用 wx.getPrivacySetting 接口吗？
*
*   - 不是，wx.getPrivacySetting 只是一个辅助接口，可以根据实际情况选择使用。
*
* **示例代码**
*
* ```js
wx.getPrivacySetting({
success: res => {
console.log(res)
// 返回结果为: res = { needAuthorization: true/false, privacyContractName: '《xxx隐私保护指引》' }
},
fail: () => {},
complete: () => {}
})
``` */
getPrivacySetting(option: GetPrivacySettingOption): void;
/** [wx.getRelationFriendList(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getRelationFriendList.html)
 *
 * 需要基础库： `3.16.2`
 *
 * 获取小游戏同玩互动好友列表。该接口需要用户授权 scope.interactedUserInfo，首次调用时会弹出授权窗口。也可以提前通过 [wx.authorize](#) 进行授权。当用户拒绝授权后，再次调用该接口不会再弹出授权窗口，而是直接进入 fail 回调。此时开发者可通过弹出提示或者通过 [wx.openSetting](#) 引导用户进入设置页面重新开启授权。
 *
 * **encryptedData 解密后得到的 RelationFriendData 的结构**
 *
 * | 属性 | 类型 | 说明                                   |
 * | ------- | ------- | -------------------------------------- |
 * |  list   | Array\<RelationFriendInfo\> | 同玩互动好友列表           |
 *
 * **RelationFriendInfo 的结构**
 *
 * | 属性 | 类型 | 说明                                   |
 * | ------- | ------- | -------------------------------------- |
 * |  openid   | string | 好友的openid          | */
getRelationFriendList(option?: GetRelationFriendListOption): void;
/** [wx.getSetting(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.getSetting.html)
*
* 需要基础库： `1.2.0`
*
* 获取用户的当前设置。**返回值中只会出现小程序已经向用户请求过的[权限](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html)**。
*
* **示例代码**
*
* ```js
wx.getSetting({
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
}
})
```
*
* ```js
wx.getSetting({
withSubscriptions: true,
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
console.log(res.subscriptionsSetting)
// res.subscriptionsSetting = {
//   mainSwitch: true, // 订阅消息总开关
//   itemSettings: {   // 每一项开关
//     SYS_MSG_TYPE_INTERACTIVE: 'accept', // 小游戏系统订阅消息
//     SYS_MSG_TYPE_RANK: 'accept'
//     zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: 'reject', // 普通一次性订阅消息
//     ke_OZC_66gZxALLcsuI7ilCJSP2OJ2vWo2ooUPpkWrw: 'ban',
//   }
// }
}
})
``` */
getSetting<T extends GetSettingOption = GetSettingOption>(option?: T): PromisifySuccessResult<T, GetSettingOption>;
/** [wx.getShareInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.getShareInfo.html)
*
* 需要基础库： `1.1.0`
* @deprecated 基础库版本 [2.17.3](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃，请使用 [wx.getGroupEnterInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/group/wx.getGroupEnterInfo.html) 替换
*
* 获取转发详细信息（主要是获取群ID）。 从群聊内的小程序消息卡片打开小程序时，调用此接口才有效。从基础库 v2.17.3 开始，推荐用 [wx.getGroupEnterInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/group/wx.getGroupEnterInfo.html) 替代此接口。
*
* **示例代码**
*
* 敏感数据获取方式 [加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) 。
* 获取得到的开放数据为以下 json 结构（其中 openGId 为当前群的唯一标识）：
*
* ```json
{
"openGId": "OPENGID"
}
```
*
* **Tips**
*
* - 如需要展示群名称，小程序可以使用 [开放数据组件](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/open-data.html)
* - 小游戏可以通过 [`wx.getGroupInfo`](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupInfo.html) 接口获取群名称 */
getShareInfo<T extends GetShareInfoOption = GetShareInfoOption>(option: T): PromisifySuccessResult<T, GetShareInfoOption>;
/** [wx.getShowSplashAdStatus(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.getShowSplashAdStatus.html)
*
* 需要基础库： `3.7.8`
*
* 获取封面广告组件展示状态。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号后再使用该 API（小游戏端要求 >= 3.7.8， 小程序端要求 >= 3.7.8）。
*
* **示例代码**
*
* ```js
// 获取封面广告展示状态
wx.getShowSplashAdStatus({
success: res => {
console.log('getShowSplashAdStatus res', res.status, res.code)
},
})
``` */
getShowSplashAdStatus(option?: GetShowSplashAdStatusOption): void;
/** [wx.getUserCloudStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserCloudStorage.html)
 *
 * 需要基础库： `1.9.92`
 *
 * 获取当前用户托管数据当中对应 key 的数据。该接口只可在开放数据域下使用 */
getUserCloudStorage(option: GetUserCloudStorageOption): void;
/** [wx.getUserCloudStorageKeys(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserCloudStorageKeys.html)
 *
 * 需要基础库： `2.16.1`
 *
 * 获取当前用户托管数据当中所有的 key。该接口需要用户授权，且只在开放数据域下可用。 */
getUserCloudStorageKeys(option?: GetUserCloudStorageKeysOption): void;
/** [wx.getUserInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.getUserInfo.html)
*
* 获取用户信息。详情参考 [用户信息获取](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/user-info.html)
*
* **示例代码**
*
* ```js
// 必须是在用户已经授权的情况下调用
wx.getUserInfo({
success: function(res) {
var userInfo = res.userInfo
var nickName = userInfo.nickName
var avatarUrl = userInfo.avatarUrl
var gender = userInfo.gender //性别 0：未知、1：男、2：女
var province = userInfo.province
var city = userInfo.city
var country = userInfo.country
}
})
```
*
* 敏感数据有两种获取方式：
* 1. 使用 [加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法)
* 2. 使用 [云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#云调用直接获取开放数据)
* 获取得到的开放数据为以下 json 结构：
*
* ```json
{
"openId": "OPENID",
"nickName": "NICKNAME",
"gender": GENDER,
"city": "CITY",
"province": "PROVINCE",
"country": "COUNTRY",
"avatarUrl": "AVATARURL",
"unionId": "UNIONID",
"watermark": {
"appid":"APPID",
"timestamp":TIMESTAMP
}
}
```
*
* **最佳用法**
*
* ```js
// 通过 wx.getSetting 查询用户是否已授权头像昵称信息
wx.getSetting({
success (res){
if (res.authSetting['scope.userInfo']) {
// 已经授权，可以直接调用 getUserInfo 获取头像昵称
wx.getUserInfo({
success: function(res) {
  console.log(res.userInfo)
}
})
} else {
// 否则，先通过 wx.createUserInfoButton 接口发起授权
let button = wx.createUserInfoButton({
type: 'text',
text: '获取用户信息',
style: {
  left: 10,
  top: 76,
  width: 200,
  height: 40,
  lineHeight: 40,
  backgroundColor: '#ff0000',
  color: '#ffffff',
  textAlign: 'center',
  fontSize: 16,
  borderRadius: 4
}
})
button.onTap((res) => {
// 用户同意授权后回调，通过回调可获取用户头像昵称信息
console.log(res)
})
}
}
})
``` */
getUserInfo<T extends GetUserInfoOption = GetUserInfoOption>(option: T): PromisifySuccessResult<T, GetUserInfoOption>;
/** [wx.getUserInteractiveStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserInteractiveStorage.html)
 *
 * 需要基础库： `2.7.7`
 *
 * 获取当前用户互动型托管数据对应 key 的数据。该接口需要用户授权。 */
getUserInteractiveStorage<T extends GetUserInteractiveStorageOption = GetUserInteractiveStorageOption>(option: T): PromisifySuccessResult<T, GetUserInteractiveStorageOption>;
/** [wx.getWeRunData(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/werun/wx.getWeRunData.html)
*
* 需要基础库： `1.2.0`
*
* 获取用户过去三十一天微信运动步数。需要先调用 [wx.login](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html) 接口。步数信息会在用户主动进入小程序时更新。
*
* **示例代码**
*
* ```js
wx.getWeRunData({
success (res) {
// 拿 encryptedData 到开发者后台解密开放数据
const encryptedData = res.encryptedData
// 或拿 cloudID 通过云调用直接获取开放数据
const cloudID = res.cloudID
}
})
```
*
* **开放数据 JSON 结构**
*
* 敏感数据有两种获取方式，一是使用 [加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) 。
* 获取得到的开放数据为以下 json 结构：
*
* ```json
{
"stepInfoList": [
{
"timestamp": 1445866601,
"step": 100
},
{
"timestamp": 1445876601,
"step": 120
}
]
}
```
*
* stepInfoList 中，每一项结构如下：
*
* | 属性 | 类型 | 说明 |
* | --- | ---- | --- |
* | timestamp | number | 时间戳，表示数据对应的时间 |
* | step | number | 微信运动步数 | */
getWeRunData<T extends GetWeRunDataOption = GetWeRunDataOption>(option?: T): PromisifySuccessResult<T, GetWeRunDataOption>;
/** [wx.hideShareMenu(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.hideShareMenu.html)
*
* 需要基础库： `1.1.0`
*
* 隐藏当前页面的转发按钮
*
* ****
*
* ## 注意事项
*  - "shareAppMessage"表示“发送给朋友”按钮，"shareTimeline"表示“分享到朋友圈”按钮
*  - 隐藏“发送给朋友”按钮时必须同时隐藏“分享到朋友圈”按钮，隐藏“分享到朋友圈”按钮时则允许不隐藏“发送给朋友”按钮
*
* **示例代码**
*
* ```js
wx.hideShareMenu({
menus: ['shareAppMessage', 'shareTimeline']
})
``` */
hideShareMenu<T extends HideShareMenuOption = HideShareMenuOption>(option?: T): PromisifySuccessResult<T, HideShareMenuOption>;
/** [wx.isChatTool()](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.isChatTool.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 是否处于聊天工具模式 */
isChatTool(): void;
/** [wx.login(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html)
*
* 调用接口获取登录凭证（code）。通过凭证进而换取用户登录态信息，包括用户在当前小程序的唯一标识（openid）、微信开放平台账号下的唯一标识（unionid，若当前小程序已绑定到微信开放平台账号）及本次登录的会话密钥（session_key）等。用户数据的加解密通讯需要依赖会话密钥完成。
*
* **示例代码**
*
* ```js
wx.login({
success (res) {
if (res.code) {
//发起网络请求
wx.request({
url: 'https://example.com/onLogin',
data: {
  code: res.code
}
})
} else {
console.log('登录失败！' + res.errMsg)
}
}
})
``` */
login<T extends LoginOption = LoginOption>(option?: T): PromisifySuccessResult<T, LoginOption>;
/** [wx.modifyFriendInteractiveStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.modifyFriendInteractiveStorage.html)
*
* 需要基础库： `2.7.7`
*
* 修改好友的互动型托管数据，该接口只可在开放数据域下使用。
*
* **赠送动作的校验**
*
* 调用该接口需要上传 JSServer 函数 "checkInteractiveData"，该函数可用于执行赠送动作的校验逻辑，校验通过后返回结果表示本次赠送是否合法。只有 checkInteractiveData 返回了 `{ret: true}`，此次修改才会成功。
*
* **使用模板规则进行交互**
*
* 每次调用该接口会弹窗询问用户是否确认执行该操作，2.9.0 之后版本，需要在 game.json 中设置 `modifyFriendInteractiveStorageTemplates` 来定制交互的文案。
* `modifyFriendInteractiveStorageTemplates` 是一个模板数组，每一个模板需要有 key, action, object 参数，还有一个可选参数 ratio，详细说明见示例配置：
* ```json
{
"modifyFriendInteractiveStorageTemplates": [
{
"key": "1", // 这个 key 与接口中同名参数相对应，不同的 key 对应不同的模板
"action": "赠送", // 互动行为
"object": "金币", // 互动物品
"ratio": 10 // 物品比率，opNum * ratio 代表物品个数
}
]
}
```
* 最后生成的文案为 "确认 ${action} ${nickname} ${object}？"，或者 "确认 ${action} ${nickname} ${object} x ${opNum * ratio}？"
*
* **使用自定义文案进行交互**
*
* 2.7.7 之后，2.9.0 之前的版本，文案通过 game.json 的 `modifyFriendInteractiveStorageConfirmWording` 字段配置。
* 配置内容可包含 nickname 变量，用 ${nickname} 表示，实际调用时会被替换成好友的昵称。示例配置：
* ```json
{
"modifyFriendInteractiveStorageConfirmWording": "确认送给${nickname}一个体力？"
}
```
* 2.9.0 之后，在 `modifyFriendInteractiveStorageTemplates` 和 `modifyFriendInteractiveStorageConfirmWording` 都存在的情况下，会优先使用前者。 */
modifyFriendInteractiveStorage(option: ModifyFriendInteractiveStorageOption): void;
/** [wx.notifyGroupMembers(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.notifyGroupMembers.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 提醒用户完成任务，标题长度不超过 30 个字符，支持中英文和数字，中文算2个字符。 */
notifyGroupMembers<T extends NotifyGroupMembersOption = NotifyGroupMembersOption>(option: T): PromisifySuccessResult<T, NotifyGroupMembersOption>;
/** [wx.offAddToFavorites()](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offAddToFavorites.html)
 *
 * 需要基础库： `2.10.3`
 *
 * 移除用户点击菜单「收藏」按钮时触发的事件的全部监听函数 */
offAddToFavorites(): void;
/** [wx.offAddToSchedule()](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offAddToSchedule.html)
 *
 * 需要基础库： `3.17.6`
 *
 * 移除用户点击菜单「添加提醒」按钮时触发的事件的全部监听函数 */
offAddToSchedule(): void;
/** [wx.offCopyUrl()](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offCopyUrl.html)
 *
 * 需要基础库： `2.14.3`
 *
 * 移除用户点击右上角菜单的「复制链接」按钮时触发的事件的全部监听函数 */
offCopyUrl(): void;
/** [wx.offDirectAdStatusChange(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.offDirectAdStatusChange.html)
*
* 需要基础库： `3.11.2`
*
* 移除监听直玩广告状态变化的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onDirectAdStatusChange(listener)
wx.offDirectAdStatusChange(listener) // 需传入与监听时同一个的函数对象
``` */
offDirectAdStatusChange(
/** onDirectAdStatusChange 传入的监听函数。不传此参数则移除所有监听函数。 */
listener?: OffDirectAdStatusChangeCallback): void;
/** [wx.offHandoff()](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offHandoff.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 移除用户点击菜单「在电脑上打开」按钮时触发的事件的全部监听函数 */
offHandoff(): void;
/** [wx.offHide(function listener)](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.offHide.html)
*
* 移除小游戏隐藏到后台事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onHide(listener)
wx.offHide(listener) // 需传入与监听时同一个的函数对象
``` */
offHide(
/** onHide 传入的监听函数。不传此参数则移除所有监听函数。 */
listener?: OffHideCallback): void;
/** [wx.offInteractiveStorageModified(function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.offInteractiveStorageModified.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 取消监听成功修改好友的互动型托管数据事件，该接口在游戏主域使用 */
offInteractiveStorageModified(
/** 事件发生的回调函数，留空则清除所有回调 */
callback?: (...args: any[]) => any): void;
/** [wx.offShareAppMessage(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offShareAppMessage.html)
*
* 移除用户点击右上角菜单的「转发」按钮时触发的事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onShareAppMessage(listener)
wx.offShareAppMessage(listener) // 需传入与监听时同一个的函数对象
``` */
offShareAppMessage(
/** onShareAppMessage 传入的监听函数。不传此参数则移除所有监听函数。 */
listener?: OffShareAppMessageCallback): void;
/** [wx.offShareMessageToFriend(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offShareMessageToFriend.html)
*
* 需要基础库： `2.9.4`
*
* 移除主域接收`wx.shareMessageToFriend`接口的成功失败通知事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onShareMessageToFriend(listener)
wx.offShareMessageToFriend(listener) // 需传入与监听时同一个的函数对象
``` */
offShareMessageToFriend(
/** onShareMessageToFriend 传入的监听函数。不传此参数则移除所有监听函数。 */
listener?: OffShareMessageToFriendCallback): void;
/** [wx.offShareTimeline(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.offShareTimeline.html)
*
* 需要基础库： `2.11.3`
*
* 移除用户点击右上角菜单的「分享到朋友圈」按钮时触发的事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onShareTimeline(listener)
wx.offShareTimeline(listener) // 需传入与监听时同一个的函数对象
``` */
offShareTimeline(
/** onShareTimeline 传入的监听函数。不传此参数则移除所有监听函数。 */
listener?: OffShareTimelineCallback): void;
/** [wx.offShow(function listener)](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.offShow.html)
*
* 移除小游戏回到前台的事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onShow(listener)
wx.offShow(listener) // 需传入与监听时同一个的函数对象
``` */
offShow(
/** onShow 传入的监听函数。不传此参数则移除所有监听函数。 */
listener?: OffShowCallback): void;
/** [wx.onAddToFavorites(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onAddToFavorites.html)
 *
 * 需要基础库： `2.10.3`
 *
 * 监听用户点击菜单「收藏」按钮时触发的事件 */
onAddToFavorites(
/** 用户点击菜单「收藏」按钮时触发的事件的监听函数 */
listener: OnAddToFavoritesCallback): void;
/** [wx.onAddToSchedule(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onAddToSchedule.html)
 *
 * 需要基础库： `3.17.6`
 *
 * 监听用户点击菜单「添加提醒」按钮时触发的事件 */
onAddToSchedule(
/** 用户点击菜单「添加提醒」按钮时触发的事件的监听函数 */
listener: OnAddToScheduleCallback): void;
/** [wx.onCopyUrl(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onCopyUrl.html)
 *
 * 需要基础库： `2.14.3`
 *
 * 监听用户点击右上角菜单的「复制链接」按钮时触发的事件。 */
onCopyUrl(
/** 用户点击右上角菜单的「复制链接」按钮时触发的事件的监听函数 */
listener: OnCopyUrlCallback): void;
/** [wx.onDirectAdStatusChange(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.onDirectAdStatusChange.html)
*
* 需要基础库： `3.11.2`
*
* 监听监听直玩广告状态变化
*
* **示例代码**
*
* ```js
wx.onDirectAdStatusChange(res => {
// 会有如下的几种状态值组合
// a) { isInMask: true, isInDirectGameAd: true } -> 表示当前正在直玩广告 且 未戳破蒙层
// b) { isInMask: false, isInDirectGameAd: true } -> 表示当前正在直玩广告 且 戳破了蒙层
// c) { isInMask: false, isInDirectGameAd: false, isEndByAbnormal: false }, -> 表示倒计时结束了，并且选择了继续玩
// d) { isInMask: false, isInDirectGameAd: false, isEndByAbnormal: true }, -> 表示由于异常流程而结束
console.log(res.isInMask)
console.log(res.isInDirectGameAd)
console.log(res.isEndByAbnormal)
})
``` */
onDirectAdStatusChange(
/** 的监听函数 */
listener: OnDirectAdStatusChangeCallback): void;
/** [wx.onHandoff(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onHandoff.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 监听用户点击菜单「在电脑上打开」按钮时触发的事件 */
onHandoff(
/** 用户点击菜单「在电脑上打开」按钮时触发的事件的监听函数 */
listener: OnHandoffCallback): void;
/** [wx.onHide(function listener)](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.onHide.html)
 *
 * 监听小游戏隐藏到后台事件。锁屏、按 HOME 键退到桌面、显示在聊天顶部等操作会触发此事件。 */
onHide(
/** 小游戏隐藏到后台事件的监听函数 */
listener: OnHideCallback): void;
/** [wx.onInteractiveStorageModified(function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.onInteractiveStorageModified.html)
 *
 * 需要基础库： `2.9.0`
 *
 * 监听成功修改好友的互动型托管数据事件，该接口在游戏主域使用 */
onInteractiveStorageModified(
/** 事件发生的回调函数，只有一个参数为 `wx.modifyFriendInteractiveStorage` 传入的 key */
callback: (...args: any[]) => any): void;
/** [wx.onMessage(function callback)](https://developers.weixin.qq.com/minigame/dev/api/open-api/context/wx.onMessage.html)
 *
 * 监听主域发送的消息 */
onMessage(
/** 监听事件的回调函数 */
callback: (...args: any[]) => any): void;
/** [wx.onNeedPrivacyAuthorization(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.onNeedPrivacyAuthorization.html)
*
* 需要基础库： `2.32.3`
*
* 监听隐私接口需要用户授权事件。小游戏注册该事件监听后，会启用自定义隐私授权弹窗模式，当需要用户进行隐私授权时会触发该事件。触发该事件时，开发者需要弹出隐私协议说明，并在用户同意或拒绝授权后调用回调接口 resolve 触发原隐私接口继续执行。隐私合规开发指南详情可见[《小游戏隐私合规开发指南》](https://developers.weixin.qq.com/community/develop/doc/000aa25cf1c8a0e64310ac3ef66401?highLine=%25E9%259A%2590%25E7%25A7%2581)
*
* ****
*
* ## 回调参数
*
* ### function resolve
*
* resolve 是 onNeedPrivacyAuthorization 的首个回调参数，是一个接口函数。
*
* 当触发 onNeedPrivacyAuthorization 事件时，触发该事件的隐私接口会处于 pending 状态。
*
* 如果调用 resolve({ event:'agree' })，则触发当前 onNeedPrivacyAuthorization 事件的原隐私接口会继续执行。
*
* 如果调用 resolve({ event: 'disagree' })，则触发当前 onNeedPrivacyAuthorization 事件的原隐私接口会失败并返回 `API:fail privacy permission is not authorized` 的错误信息。
*
* 在调用 resolve({ event: 'agree'/'disagree' }) 之前，开发者可以调用 resolve({ event: 'exposureAuthorization' }) 把隐私弹窗曝光告知平台。
*
* ### Object eventInfo
*
* eventInfo 是 onNeedPrivacyAuthorization 的第二个回调参数，表示触发本次 onNeedPrivacyAuthorization 事件的关联信息
*
* | 属性 | 类型 | 说明 |
* | ---- | ---- | ---- |
* | referrer | string | 触发本次 onNeedPrivacyAuthorization 事件的接口或组件名（例如："getUserInfo", "UserInfoButton.onTap"） |
*
* ****
*
* ## resolve 接口参数
*
* | 属性 | 类型 | 说明 |
* | ---- | ---- | ---- |
* | event | string | 用户操作类型 |
*
* ### event 合法值
*
* | event | 说明 |
* | ---- | ---- |
* | exposureAuthorization | 自定义隐私弹窗曝光 |
* | agree | 用户同意隐私授权 |
* | disagree | 用户拒绝隐私授权 |
*
* ****
*
* ## 具体说明：
*
* - 1. 小游戏未注册 wx.onNeedPrivacyAuthorization 事件监听时，会默认使用平台统一隐私弹窗
* - 2. 小游戏注册 wx.onNeedPrivacyAuthorization 后，会切换至自定义隐私弹窗，此时需要开发者自行渲染隐私弹窗
* - 3. 什么时候会触发 onNeedPrivacyAuthorization 事件？
*   - 1. 调用隐私相关接口（比如 wx.getUserInfo、wx.getClipboardData），并且用户还未同意过隐私协议时
*   - 2. 调用 wx.requirePrivacyAuthorize 接口来模拟隐私接口调用，并且用户还未同意过隐私协议时
*   - 3. 如果用户已经同意过隐私协议，则不会再触发 onNeedPrivacyAuthorization 事件
* - 4. 当触发 onNeedPrivacyAuthorization 事件时，触发该事件的隐私接口会处于 pending 状态，等待用户授权后才会继续执行，此时开发者需要弹出自定义隐私弹窗，并在用户点击同意/拒绝后调用回调接口 resolve，触发该事件的隐私接口才会继续执行。
* - 5. 开发者必须在用户产生点击操作时调用 resolve 接口
* - 6. wx.onNeedPrivacyAuthorization 是覆盖式注册监听，若重复注册监听，则只有最后一次注册会生效。
* - 7. 一定要注册 wx.onNeedPrivacyAuthorization 监听以及调用 resolve 吗？
*   - 1. 不是的，如果使用小游戏官方弹窗，不使用自定义弹窗，那就不需要 wx.onNeedPrivacyAuthorization。
*   - 2. 但如果注册了 wx.onNeedPrivacyAuthorization 监听，则一定要调用 resolve 接口。
*
* **示例代码**
*
* ```js
wx.onNeedPrivacyAuthorization((resolve, eventInfo) => {
console.log('触发本次事件的接口是：' + eventInfo.referrer)
// ------ 自定义弹窗逻辑 ------ //
showCustomPopup()
// -------弹窗后根据用户操作，进行以下逻辑逻辑 ------- //
// 开发者弹出自定义的隐私弹窗，并调用 resolve 告知平台已经弹窗
resolve({ event: 'exposureAuthorization' })
// 用户点击同意后，开发者调用 resolve 告知平台用户已经同意
resolve({ event: 'agree' })
// 用户点击拒绝后，开发者调用 resolve 告知平台用户已经拒绝
resolve({ event: 'disagree' })
})
``` */
onNeedPrivacyAuthorization(
/** 隐私接口需要用户授权事件的监听函数 */
listener: OnNeedPrivacyAuthorizationCallback): void;
/** [wx.onShareAppMessage(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onShareAppMessage.html)
 *
 * 监听用户点击右上角菜单的「转发」按钮时触发的事件
 *
 * ****
 *
 * ## 注意事项
 * - 转发图片说明：imageUrl，imageUrlId 都存在时，优先使用 imageUrl。 imageUrl，imageUrlId 都不填时使用游戏画面截图。 */
onShareAppMessage(
/** 用户点击右上角菜单的「转发」按钮时触发的事件的监听函数 */
listener: OnShareAppMessageCallback): void;
/** [wx.onShareMessageToFriend(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onShareMessageToFriend.html)
 *
 * 需要基础库： `2.9.4`
 *
 * 监听主域接收`wx.shareMessageToFriend`接口的成功失败通知事件 */
onShareMessageToFriend(
/** 主域接收`wx.shareMessageToFriend`接口的成功失败通知事件的监听函数 */
listener: OnShareMessageToFriendCallback): void;
/** [wx.onShareTimeline(function listener)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.onShareTimeline.html)
 *
 * 需要基础库： `2.11.3`
 *
 * 监听用户点击右上角菜单的「分享到朋友圈」按钮时触发的事件。本接口为 Beta 版本，暂只在 Android 平台支持。
 *
 * ****
 *
 * ## 注意事项
 * - 转发图片说明：imageUrl，imageUrlId 都存在时，优先使用 imageUrl。  imageUrl，imageUrlId 都不填时使用当前游戏的icon。 */
onShareTimeline(
/** 用户点击右上角菜单的「分享到朋友圈」按钮时触发的事件的监听函数 */
listener: OnShareTimelineCallback): void;
/** [wx.onShow(function listener)](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.onShow.html)
 *
 * 监听小游戏回到前台的事件 */
onShow(
/** 小游戏回到前台的事件的监听函数 */
listener: OnShowCallback): void;
/** [wx.openCard(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/card/wx.openCard.html)
*
* 需要基础库： `2.5.0`
*
* 查看微信卡包中的卡券。只有通过 [认证](https://developers.weixin.qq.com/miniprogram/product/renzheng.html) 的小程序或文化互动类目的小游戏才能使用。更多文档请参考 [微信卡券接口文档](https://mp.weixin.qq.com/cgi-bin/announce?action=getannouncement&key=1490190158&version=1&lang=zh_CN&platform=2)。
*
* **示例代码**
*
* ```js
wx.openCard({
cardList: [{
cardId: '',
code: ''
}, {
cardId: '',
code: ''
}],
success (res) { }
})
``` */
openCard<T extends OpenCardOption = OpenCardOption>(option: T): PromisifySuccessResult<T, OpenCardOption>;
/** [wx.openChannelsActivity(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.openChannelsActivity.html)
 *
 * 需要基础库： `2.19.2`
 *
 * 打开视频号视频 */
openChannelsActivity(option: OpenChannelsActivityOption): void;
/** [wx.openChannelsEvent(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.openChannelsEvent.html)
 *
 * 需要基础库： `2.21.0`
 *
 * 打开视频号活动页 */
openChannelsEvent(option: OpenChannelsEventOption): void;
/** [wx.openChannelsLive(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.openChannelsLive.html)
 *
 * 需要基础库： `2.15.0`
 *
 * 打开视频号直播 */
openChannelsLive(option: OpenChannelsLiveOption): void;
/** [wx.openChannelsUserProfile(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.openChannelsUserProfile.html)
 *
 * 需要基础库： `2.21.2`
 *
 * 打开视频号主页。若为插件环境，只允许在插件页面中调用。 */
openChannelsUserProfile(option: OpenChannelsUserProfileOption): void;
/** [wx.openChatTool(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.openChatTool.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 进入聊天工具模式。
 *
 *   1. 不传入聊天室id时，微信会拉起聊天列表让用户选择，用户选择后绑定聊天室进入聊天工具模式。
 *   2. 传入聊天室id时（群聊为opengid，单聊为open_single_roomid），会直接绑定该聊天室进入，此时必须传入对应的 chatType。
 *   3. 聊天室类型可从 [[getGroupEnterInfo]](https://developers.weixin.qq.com/minigame/dev/api/open-api/group/wx.getGroupEnterInfo.html) 返回值中获取。 */
openChatTool<T extends OpenChatToolOption = OpenChatToolOption>(option: T): PromisifySuccessResult<T, OpenChatToolOption>;
/** [wx.openCustomerServiceChat(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/service-chat/wx.openCustomerServiceChat.html)
*
* 需要基础库： `2.30.4`
*
* 打开微信客服，页面产生点击事件后才可调用。了解更多信息，可以参考[微信客服介绍](https://work.weixin.qq.com/kf/)。
*
* **示例代码**
*
* ```js
wx.openCustomerServiceChat({
extInfo: {url: ''},
corpId: '',
success(res) {}
})
``` */
openCustomerServiceChat(option: OpenCustomerServiceChatOption): void;
/** [wx.openCustomerServiceConversation(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/customer-message/wx.openCustomerServiceConversation.html)
 *
 * 需要基础库： `2.0.3`
 *
 * 进入客服会话。要求在用户发生过至少一次 touch 事件后才能调用。后台接入方式与小程序一致，详见 [客服消息接入](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/customer-message/customer-message.html)
 *
 * **注意事项**
 *
 * - 在客服会话内点击小程序消息卡片进入小程序时，不能通过 wx.onShow 或 wx.getEnterOptionsSync 等接口获取启动路径和参数，而是应该通过 wx.openCustomerServiceConversation 接口的 success 回调获取启动路径和参数 */
openCustomerServiceConversation<T extends OpenCustomerServiceConversationOption = OpenCustomerServiceConversationOption>(option: T): PromisifySuccessResult<T, OpenCustomerServiceConversationOption>;
/** [wx.openPrivacyContract(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.openPrivacyContract.html)
*
* 需要基础库： `2.32.3`
*
* 跳转至隐私协议页面。隐私合规开发指南详情可见[《小游戏隐私合规开发指南》](https://developers.weixin.qq.com/community/develop/doc/000aa25cf1c8a0e64310ac3ef66401?highLine=%25E9%259A%2590%25E7%25A7%2581)
*
* ****
*
* ## 具体说明：
*
* - 1. 一定要调用 wx.openPrivacyContract 接口吗？
*
*   - 不是。开发者也可以选择在小游戏内自行展示完整的隐私协议。但推荐使用该接口。
*
* **示例代码**
*
* ```js
wx.openPrivacyContract({
success: () => {}, // 打开成功
fail: () => {}, // 打开失败
complete: () => {}
})
``` */
openPrivacyContract(option: OpenPrivacyContractOption): void;
/** [wx.openSetting(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.openSetting.html)
*
* 需要基础库： `1.1.0`
*
* 调起客户端小程序设置界面，返回用户设置的操作结果。**设置界面只会出现小程序已经向用户请求过的[权限](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html)**。
*
* ****
*
* - 注意：[2.3.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 版本开始，用户发生点击行为后，才可以跳转打开设置页，管理授权信息。[详情](https://developers.weixin.qq.com/community/develop/doc/000cea2305cc5047af5733de751008)
*
* **示例代码**
*
* ```js
wx.openSetting({
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
}
})
``` */
openSetting<T extends OpenSettingOption = OpenSettingOption>(option?: T): PromisifySuccessResult<T, OpenSettingOption>;
/** [wx.removeUserCloudStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.removeUserCloudStorage.html)
 *
 * 需要基础库： `1.9.92`
 *
 * 删除用户托管数据当中对应 key 的数据。 */
removeUserCloudStorage<T extends RemoveUserCloudStorageOption = RemoveUserCloudStorageOption>(option: T): PromisifySuccessResult<T, RemoveUserCloudStorageOption>;
/** [wx.reportEvent(string eventId, object data)](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.reportEvent.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 事件上报 */
reportEvent(
/** 在 mp 实验系统中设置的事件英文名 */
eventId: string,
/** 可被 JSON.stringify 的对象，将一起上报至系统 */
data?: IAnyObject): void;
/** [wx.reportMonitor(string name, number value)](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.reportMonitor.html)
*
* 需要基础库： `2.1.2`
* @deprecated 基础库版本 [2.31.1](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 起已废弃，请使用 [wx.reportEvent](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.reportEvent.html) 替换
*
* 自定义业务数据监控上报接口。
*
* **使用说明**
*
* 使用前，需要在「小程序管理后台-运维中心-性能监控-业务数据监控」中新建监控事件，配置监控描述与告警类型。每一个监控事件对应唯一的监控ID，开发者最多可以创建128个监控事件。
*
* **示例代码**
*
* ```js
wx.reportMonitor('1', 1)
``` */
reportMonitor(
/** 监控ID，在「小程序管理后台」新建数据指标后获得 */
name: string,
/** 上报数值，经处理后会在「小程序管理后台」上展示每分钟的上报总量 */
value: number): void;
/** [wx.reportScene(Object object)](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.reportScene.html)
*
* 需要基础库： `2.26.2`
*
* 用于游戏启动阶段的自定义场景上报。使用前请注意阅读[相关说明](https://developers.weixin.qq.com/minigame/dev/guide/performance/perf-action-start-reportScene.html)。
*
* **示例代码**
*
* ```js
wx.reportScene({
sceneId: 1000,
costTime: 350,
dimension: {
d1: '2.1.0', // value仅支持传入String类型。若value表示Boolean，请将值处理为'0'、'1'进行上报；若value为Number，请转换为String进行上报
},
metric: {
m1: '546', // value仅支持传入数值且需要转换为String类型进行上报
},
success (res) {
// 上报接口执行完成后的回调，用于检查上报数据是否符合预期
console.log(res)
},
fail (res) {
// 上报报错时的回调，用于查看上报错误的原因：如参数类型错误等
console.log(res)
}
})
``` */
reportScene(option: ReportSceneOption): void;
/** [wx.reportUserBehaviorBranchAnalytics(Object object)](https://developers.weixin.qq.com/minigame/dev/api/data-analysis/wx.reportUserBehaviorBranchAnalytics.html)
 *
 * 需要基础库： `2.12.0`
 *
 * 上报场景分析，用于UI组件（一般是按钮）相关事件的上报，事件目前有曝光、点击两种，查看[相关文档](https://developers.weixin.qq.com/minigame/analysis/selfanalysis.html) */
reportUserBehaviorBranchAnalytics(option: ReportUserBehaviorBranchAnalyticsOption): void;
/** [wx.requestFacialRecognition(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/account-info/wx.requestFacialRecognition.html)
*
* 需要基础库： `3.11.2`
*
* 腾讯游戏人脸识别验证功能是基于健康系统防沉迷体系，用于识别疑似未成年人冒用成年人账号游玩游戏的行为，是防止未成年人沉迷网络游戏的一项重要措施。本接口是为开通虚拟支付功能的小游戏开发者提供的，此接口是基于人脸识别的未成年人身份核验接口。本次识别是根据用户在腾讯健康系统中留存的实名信息进行验证，结果将直接返回至开发者。
*
* **接口限额**
*
* - 超出限额后将返回错误码 2002008（频率控制）
* - 1天内全部游戏对一个用户只能调起1次人脸识别
* - 若用户人脸识别通过：7天内不能再被弹出人脸识别
* - 根据小游戏评级每个月限制使用次数，一旦发现恶意滥用接口，会取消使用资格。具体使用次数如下：
*   - S级：300次/月
*   - A级：100次/月
*   - B级：30次/月
*
* **处理流程**
*
* <img src="https://mmgame.qpic.cn/image/2034b86e1e8f3541629d4b4d16cf41ff84fd99efe25f4fac181603edd8a29e14/0" width="600" alt="人脸识别流程图" />
*
* **示例代码**
*
* ```js
// 实际业务场景：防沉迷身份验证
function checkUserIdentity() {
wx.requestFacialRecognition({
success(res) {
// 场景 1：本次人脸识别通过
// res = { errCode: 0, errMsg: 'ok', iv: 'xxx', encryptedData: 'xxx' }
console.log('人脸识别成功:', res)
// 如果需要服务端二次校验，可将 iv 和 encryptedData 发送到开发者服务端
// 服务端使用 session_key 解密 encryptedData 来验证结果真实性

// 允许继续游戏
startGame()
},
fail(err) {
console.error('人脸识别失败:', err)

let tipMessage = ''
let shouldBlock = false  // 是否需要阻断游戏

// 根据错误码进行不同处理
switch (err.errCode) {
case 2002004:
  // 人脸识别失败（需要阻断）
  // err = { errCode: 2002004, errMsg: '人脸识别失败' }
  tipMessage = '识别失败，请稍后重试'
  shouldBlock = true
  break

case 2002006:
  // 用户取消/超时/不同意，导致未完成人脸识别（需要阻断）
  // err = { errCode: 2002006, errMsg: '用户取消' }
  tipMessage = '您已取消验证，无法继续游戏'
  shouldBlock = true
  break

case 2002007:
  // 本用户7天内人脸识别已通过（可以继续游戏）
  // err = { errCode: 2002007, errMsg: '本用户7天内人脸识别已通过，通过日期为2024-01-15', iv: 'xxx', encryptedData: 'xxx' }
  tipMessage = '您已完成验证'
  shouldBlock = false
  break

case 2002008:
  // 频率控制：本日已调起过人脸识别 or 本月调用次数已达上限（可以继续游戏）
  // err = { errCode: 2002008, errMsg: '本日已调起过人脸识别' }
  // 或 err = { errCode: 2002008, errMsg: '本月调用次数已达上限' }
  tipMessage = '今日验证次数已达上限'
  shouldBlock = false
  break

case 2002009:
  // 无权限发起人脸识别（可以继续游戏）
  // err = { errCode: 2002009, errMsg: '无权限发起人脸识别' }
  tipMessage = '暂无权限使用此功能'
  shouldBlock = false
  break

default:
  // 系统异常等其他错误（可以继续游戏，避免影响正常用户）
  tipMessage = '系统异常，请稍后重试'
  shouldBlock = false
}

if (tipMessage) {
wx.showModal({
  title: '提示',
  content: tipMessage,
  showCancel: false
})
}

if (shouldBlock) {
// 仅对识别失败(2002004)和用户取消(2002006)阻断游戏
restrictGameFeatures()
} else {
// 其他情况允许继续游戏
startGame()
}
},
complete(res) {
// 无论成功失败均会触发
console.log('人脸识别流程结束:', res)
}
})
}
```
* 对于敏感操作，不建议仅依赖客户端返回的明文结果。建议将 iv 和 encryptedData 发送到开发者服务端，使用 session_key 进行解密校验，确保数据未被篡改。
* 数据校验与解密详见：
* https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html */
requestFacialRecognition(option?: RequestFacialRecognitionOption): void;
/** [wx.requestFacialVerify(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/face/wx.requestFacialVerify.html)
*
* 需要基础库： `3.8.12`
*
* 对用户实名信息进行基于生物识别的人脸核身验证
*
* **示例代码**
*
* ```js
wx.requestFacialVerify({
// 人脸核身会话唯一标识
verifyId: 'xxx',
success() {
// 人脸核身验证成功，需要通知小程序后台根据本次人脸核身会话唯一标识 verifyId 字段调用微信后台 queryVerifyInfo 接口查询人脸核身真实验证结果。
},
fail() {
// 人脸核身验证失败
},
})
``` */
requestFacialVerify(option: RequestFacialVerifyOption): void;
/** [wx.requestMidasFriendPayment(Object object)](https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.requestMidasFriendPayment.html)
*
* 需要基础库： `2.11.0`
*
* @warning **接口已废弃**
*
* 发起米大师朋友礼物索要。接口用法详见 [小游戏礼物索要接入指南](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/friend-payment.html)
*
* **示例代码**
*
* ```js
wx.requestMidasFriendPayment({
success(res) {
// res
{
errMsg: 'requestMidasFriendPayment:ok',
encryptedData: 'xxxx',
iv: 'xxx'
}
},
fail() {

}
})
```
*
* encryptedData 解密后数据结构如下：
*
* ```json
{
"outTradeNo": "xxxxxxxx",
"orderNo": "PBgAAHMjeOhixxxx",
"watermark": {
"timestamp": 1585537091,
"appid": "wx7a727ff7d940xxxx"
}
}
```
*
* **buyQuantity限制说明**
*
* 购买游戏币的时候，buyQuantity 不可任意填写。需满足 buyQuantity * 游戏币单价 = 限定的价格等级。如：游戏币单价为 0.1 元，一次购买最少数量是 10。
*
* 有效价格等级如下：
*
* | 价格等级（单位：人民币） |
* |----------------------|
* | 1 |
* | 3 |
* | 6 |
* | 8 |
* | 12 |
* | 18 |
* | 25 |
* | 30 |
* | 40 |
* | 45 |
* | 50 |
* | 60 |
* | 68 |
* | 73 |
* | 78 |
* | 88 |
* | 98 |
* | 108 |
* | 118 |
* | 128 |
* | 148 |
* | 168 |
* | 188 |
* | 198 |
* | 328 |
* | 648 |
* | 998 |
* | 1998 |
* | 2998 | */
requestMidasFriendPayment(option: RequestMidasFriendPaymentOption): void;
/** [wx.requestMidasPayment(Object object)](https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.requestMidasPayment.html)
 *
 * 需要基础库： `2.19.2`
 *
 * 发起购买游戏币支付请求，可参考[虚拟支付2.0游戏币](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/virtual-payment/coins.html)，虚拟支付全流程可参考[技术手册-虚拟支付篇](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/virtual-payment/guide.html)
 *
 * **buyQuantity 限制说明**
 *
 * 购买游戏币的时候，buyQuantity 不可任意填写。需满足 buyQuantity * 游戏币单价 = 限定的价格等级。如：游戏币单价为 0.1 元，一次购买最少数量是 10。
 *
 * 有效价格等级如下：
 *
 * | 价格等级（单位：人民币） |
 * |----------------------|
 * | 1 |
 * | 3 |
 * | 6 |
 * | 8 |
 * | 12 |
 * | 18 |
 * | 25 |
 * | 30 |
 * | 40 |
 * | 45 |
 * | 50 |
 * | 60 |
 * | 68 |
 * | 73 |
 * | 78 |
 * | 88 |
 * | 98 |
 * | 108 |
 * | 118 |
 * | 128 |
 * | 148 |
 * | 168 |
 * | 188 |
 * | 198 |
 * | 328 |
 * | 648 |
 * | 998 |
 * | 1998 |
 * | 2998 | */
requestMidasPayment<T extends RequestMidasPaymentOption = RequestMidasPaymentOption>(option: T): PromisifySuccessResult<T, RequestMidasPaymentOption>;
/** [wx.requestMidasPaymentGameItem(Object object)](https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.requestMidasPaymentGameItem.html)
*
* 需要基础库： `2.19.2`
*
* 发起道具直购支付请求，可参考[虚拟支付2.0道具直购](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/virtual-payment/goods.html)，虚拟支付全流程可参考[技术手册-虚拟支付篇](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/virtual-payment/guide.html)
*
* **示例代码**
*
* ```js
wx.requestMidasPaymentGameItem({
signData: '{"mode":"goods","offerId":"123","buyQuantity":1,"env":0,"currencyType":"CNY","platform":"android","zoneId":"1","productId":"testproductId","goodsPrice":10,"outTradeNo":"xxxxxx","attach":"testdata"}',
paySig: 'd0b8bbccbe34ed11549bcfd6602b08711f4acc0965253a949cd6a2b895152f9d',
signature: 'd0b8bbccbe34ed11549bcfd6602b08711f4acc0965253a949cd6a2b895152f9d',
success(res, errCode) {
console.log('pay', res, errCode);
},
fail({
errMsg,
errCode
}) {
console.error(errMsg, errCode)
}
```
* 支付签名代码实现
* ```python
*   import hmac
*   import hashlib
*   import urllib.parse
*
*   # sign_data 支付原串 注意这里sign_data需要和前端一致，原格式传递（包括空格和回车），建议后台下发，
*   # appkey 米大师密钥
*   # method 需要签名方法 requestMidasPaymentGameItem
*   def gen_pay_sig(sign_data, appkey, method):
*       need_encode_body = method + '&' + sign_data
*       print(need_encode_body)
*       return hmac.new(key=appkey.encode('utf-8'), msg=need_encode_body.encode('utf-8'),
*               digestmod=hashlib.sha256).hexdigest()
* ``` */
requestMidasPaymentGameItem(option: RequestMidasPaymentGameItemOption): void;
/** [wx.requestSubscribeMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)
*
* 需要基础库： `2.4.4`
*
* 调起客户端小游戏订阅消息界面，返回用户订阅消息的操作结果。当用户勾选了订阅面板中的“总是保持以上选择，不再询问”时，模板消息会被添加到用户的小游戏设置页，通过 [wx.getSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.getSetting.html) 接口可获取用户对相关模板消息的订阅状态。
*
* ## 注意事项
*  - 一次性模板 id 和永久模板 id 不可同时使用。
*  - 低版本基础库2.4.4~2.8.3 已支持订阅消息接口调用，仅支持传入一个一次性 tmplId / 永久 tmplId。
*  - [2.8.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 版本开始，用户发生点击行为或者发起支付回调后，才可以调起订阅消息界面。
*  - [2.10.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 版本开始，开发版和体验版小游戏将禁止使用模板消息 fomrId。
*  - 使用前建议阅读 [小游戏订阅消息使用指引](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/subscribe-message.html)。
*  - 一次授权调用里，每个tmplId对应的模板标题不能存在相同的，若出现相同的，只保留一个。
*
* **错误码**
*
* | errCode | errMsg                                                 | 说明                                                           |
* | ------- | ------------------------------------------------------ | -------------------------------------------------------------- |
* | 10001   | TmplIds can't be empty                                 | 参数传空了                                                     |
* | 10002   | Request list fail                                       | 网络问题，请求消息列表失败                                     |
* | 10003   | Request subscribe fail                                 | 网络问题，订阅请求发送失败                                     |
* | 10004   | Invalid template id                                    | 参数类型错误                                                   |
* | 10005   | Cannot show subscribe message UI                       | 无法展示 UI，一般是小游戏这个时候退后台了导致的                |
* | 20001   | No template data return, verify the template id exist  | 没有模板数据，一般是模板 ID 不存在 或者和模板类型不对应 导致的 |
* | 20002   | Templates type must be same                            | 模板消息类型 既有一次性的又有永久的                            |
* | 20003   | Templates count out of max bounds                      | 模板消息数量超过上限                                           |
* | 20004   | The main switch is switched off                        | 用户关闭了主开关，无法进行订阅                                 |
* | 20005   | This mini program was banned from subscribing messages | 小游戏被禁封                                                   |
*
* **示例代码**
*
* ```js
wx.requestSubscribeMessage({
tmplIds: [''],
success (res) {
console.log(res)
res === {
errMsg: "requestSubscribeMessage:ok",
"zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE": "accept"
}
}
})
``` */
requestSubscribeMessage<T extends RequestSubscribeMessageOption = RequestSubscribeMessageOption>(option: T): PromisifySuccessResult<T, RequestSubscribeMessageOption>;
/** [wx.requestSubscribeSystemMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeSystemMessage.html)
*
* 需要基础库： `2.9.4`
*
* 调起小游戏系统订阅消息界面，返回用户订阅消息的操作结果。当用户勾选了订阅面板中的“总是保持以上选择，不再询问”时，模板消息会被添加到用户的小游戏设置页，通过 [wx.getSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.getSetting.html) 接口可获取用户对相关模板消息的订阅状态。
*
* ## 注意事项
*  - 使用前建议阅读 [小游戏系统订阅消息使用指引](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/subscribe-system-message.html)。
*  - 系统订阅消息只需要订阅一次，永久有效。
*
* **错误码**
*
* | errCode | errMsg                                                 | 说明                                                           |
* | ------- | ------------------------------------------------------ | -------------------------------------------------------------- |
* | 10001   | TmplIds can't be empty                                 | 参数传空了                                                     |
* | 10002   | Request list fail                                       | 网络问题，请求消息列表失败                                     |
* | 10003   | Request subscribe fail                                 | 网络问题，订阅请求发送失败                                     |
* | 10004   | Invalid template id                                    | 参数类型错误                                                   |
* | 10005   | Cannot show subscribe message UI                       | 无法展示 UI，一般是小游戏这个时候退后台了导致的                |
* | 20004   | The main switch is switched off                        | 用户关闭了主开关，无法进行订阅                                 |
* | 20005   | This mini program was banned from subscribing messages | 小游戏被禁封                                                   |
*
* **示例代码**
*
* ```js
wx.requestSubscribeSystemMessage({
msgTypeList: ['SYS_MSG_TYPE_INTERACTIVE', 'SYS_MSG_TYPE_RANK'],
success (res) {
console.log(res)
// res === {
//   errMsg: "requestSubscribeSystemMessage:ok",
//   SYS_MSG_TYPE_INTERACTIVE: "accept",
//   SYS_MSG_TYPE_RANK: 'reject'
// }
}
})
``` */
requestSubscribeSystemMessage<T extends RequestSubscribeSystemMessageOption = RequestSubscribeSystemMessageOption>(option: T): PromisifySuccessResult<T, RequestSubscribeSystemMessageOption>;
/** [wx.requirePrivacyAuthorize(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html)
*
* 需要基础库： `2.32.3`
*
* 模拟隐私接口调用，并触发隐私弹窗逻辑。隐私合规开发指南详情可见[《小游戏隐私合规开发指南》](https://developers.weixin.qq.com/community/develop/doc/000aa25cf1c8a0e64310ac3ef66401?highLine=%25E9%259A%2590%25E7%25A7%2581)
*
* ****
*
* ## 具体说明：
*
* 1. 调用 wx.requirePrivacyAuthorize() 时：
*   - 1. 如果用户之前已经同意过隐私授权，会立即返回success回调，不会触发 wx.onNeedPrivacyAuthorization 事件。
*   - 2. 如果用户之前没有授权过，并且开发者注册了 [wx.onNeedPrivacyAuthorization()](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.onNeedPrivacyAuthorization.html) 事件监听，就会立即触发 wx.onNeedPrivacyAuthorization 事件，然后开发者在 onNeedPrivacyAuthorization 回调中弹出自定义隐私授权弹窗，用户点了同意后开发者调用 wx.onNeedPrivacyAuthorization 的回调接口 resolve({ event: 'agree' })，会触发 requirePrivacyAuthorize 的 success 回调。用户点击拒绝授权后开发者调用 wx.onNeedPrivacyAuthorization 的回调接口 resolve({ event: 'disagree' }) 的话，会触发 requirePrivacyAuthorize 的 fail 回调。
*   - 3. 如果用户之前没有授权过，并且开发者没有注册 [wx.onNeedPrivacyAuthorization()](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.onNeedPrivacyAuthorization.html) 事件监听，就会立即弹出平台提供的统一隐私授权弹窗，用户点了同意之后，会触发 requirePrivacyAuthorize 的 success 回调，用户点了拒绝后会触发 requirePrivacyAuthorize 的 fail 回调。
*   - 4. 基于上述特性，开发者可以在调用任何真实隐私接口之前调用 wx.requirePrivacyAuthorize 接口来模拟隐私接口调用，并触发隐私弹窗（包括自定义弹窗或平台弹窗）逻辑。
*
* 2. 一定要调用 wx.requirePrivacyAuthorize 接口吗？
*   - 不是，wx.requirePrivacyAuthorize 只是一个辅助接口，可以根据实际情况选择使用。当开发者希望在调用隐私接口之前就主动弹出隐私弹窗时，就可以使用这个接口。
*
* **示例代码**
*
* ```js
wx.requirePrivacyAuthorize({
success: () => {
// 用户同意授权
// runGame() 继续游戏逻辑
},
fail: () => {}, // 用户拒绝授权
complete: () => {}
})
``` */
requirePrivacyAuthorize(option: RequirePrivacyAuthorizeOption): void;
/** [wx.reserveChannelsLive(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/channels/wx.reserveChannelsLive.html)
 *
 * 需要基础库： `2.19.0`
 *
 * 预约视频号直播 */
reserveChannelsLive(option: ReserveChannelsLiveOption): void;
/** [wx.selectGroupMembers(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.selectGroupMembers.html)
*
* 需要基础库： `3.7.12`
*
* 选择聊天室的成员，并返回选择成员的 group_openid。若当前为群聊，则会拉起成员选择器；若当前为单聊，则直接返回双方的 group_openid。
*
* ****
*
* ```js
wx.selectGroupMembers({
maxSelectCount: 3,
success(res) {
// res.members
}
})
``` */
selectGroupMembers<T extends SelectGroupMembersOption = SelectGroupMembersOption>(option: T): PromisifySuccessResult<T, SelectGroupMembersOption>;
/** [wx.sendGiftToFriend(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.sendGiftToFriend.html)
 *
 * 需要基础库： `3.11.2`
 *
 * 指定 openid 给他好友送礼，该接口只在开放数据域下可用。 */
sendGiftToFriend(option: SendGiftToFriendOption): void;
/** [wx.setUserCloudStorage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.setUserCloudStorage.html)
 *
 * 需要基础库： `1.9.92`
 *
 * 对用户托管数据进行写数据操作。允许同时写多组 KV 数据。
 *
 * **托管数据的限制**
 *
 * 1. 每个openid所标识的微信用户在每个游戏上托管的数据不能超过128个key-value对。
 * 2. 上报的key-value列表当中每一项的key+value长度都不能超过1K(1024)字节。
 * 3. 上报的key-value列表当中每一个key长度都不能超过128字节。 */
setUserCloudStorage<T extends SetUserCloudStorageOption = SetUserCloudStorageOption>(option: T): PromisifySuccessResult<T, SetUserCloudStorageOption>;
/** [wx.shareAppMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.shareAppMessage.html)
 *
 * 主动拉起转发，进入选择通讯录界面。
 *
 * ****
 *
 * ## 注意事项
 * - 转发图片说明：imageUrl，imageUrlId 都存在时，优先使用 imageUrl。 imageUrl，imageUrlId 都不填时使用游戏画面截图。 */
shareAppMessage(option: ShareAppMessageOption): void;
/** [wx.shareAppMessageToGroup(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.shareAppMessageToGroup.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 转发小程序卡片到聊天 */
shareAppMessageToGroup<T extends ShareAppMessageToGroupOption = ShareAppMessageToGroupOption>(option: T): PromisifySuccessResult<T, ShareAppMessageToGroupOption>;
/** [wx.shareEmojiToGroup(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.shareEmojiToGroup.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 转发表情到聊天 */
shareEmojiToGroup<T extends ShareEmojiToGroupOption = ShareEmojiToGroupOption>(option: T): PromisifySuccessResult<T, ShareEmojiToGroupOption>;
/** [wx.shareImageToGroup(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.shareImageToGroup.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 转发图片到聊天 */
shareImageToGroup<T extends ShareImageToGroupOption = ShareImageToGroupOption>(option: T): PromisifySuccessResult<T, ShareImageToGroupOption>;
/** [wx.shareMessageToFriend(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.shareMessageToFriend.html)
 *
 * 需要基础库： `2.9.0`
 *
 * 给指定的好友分享游戏信息，该接口只可在开放数据域下使用。接收者打开之后，可以用 `wx.modifyFriendInteractiveStorage` 传入参数 quiet=true 发起一次无需弹框确认的好友互动。
 *
 * ****
 *
 * ## 注意事项
 * - 定向分享不允许直接在开放数据域设置 query 参数
 * - 需要设置请参见游戏域 `wx.setMessageToFriendQuery` 接口
 * - 转发图片说明：仅当自定义分享图片权限被封禁时用 imageUrlId，其他情况都会用 imageUrl。 imageUrl 不填或错填网络图片时使用游戏画面截图。 */
shareMessageToFriend(option: ShareMessageToFriendOption): void;
/** [wx.shareTextToGroup(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.shareTextToGroup.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 转发文本到聊天 */
shareTextToGroup(option: ShareTextToGroupOption): void;
/** [wx.shareVideoToGroup(Object object)](https://developers.weixin.qq.com/minigame/dev/api/chattool/wx.shareVideoToGroup.html)
 *
 * 需要基础库： `3.7.12`
 *
 * 转发视频到聊天 */
shareVideoToGroup<T extends ShareVideoToGroupOption = ShareVideoToGroupOption>(option: T): PromisifySuccessResult<T, ShareVideoToGroupOption>;
/** [wx.showShareImageMenu(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.showShareImageMenu.html)
 *
 * 需要基础库： `2.14.3`
 *
 * 打开分享图片弹窗，可以将图片发送给朋友、收藏或下载 */
showShareImageMenu<T extends ShowShareImageMenuOption = ShowShareImageMenuOption>(option: T): PromisifySuccessResult<T, ShowShareImageMenuOption>;
/** [wx.showShareMenu(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.showShareMenu.html)
*
* 需要基础库： `1.1.0`
*
* 设置右上角点开的详情界面中的分享按钮是否可用
*
* ****
*
* ## 注意事项
*  - "shareAppMessage"表示“发送给朋友”按钮，"shareTimeline"表示“分享到朋友圈”按钮
*  - 显示“分享到朋友圈”按钮时必须同时显示“发送给朋友”按钮，显示“发送给朋友”按钮时则允许不显示“分享到朋友圈”按钮
*
* **示例代码**
*
* ```js
wx.showShareMenu({
withShareTicket: true,
menus: ['shareAppMessage', 'shareTimeline']
})
``` */
showShareMenu<T extends ShowShareMenuOption = ShowShareMenuOption>(option: T): PromisifySuccessResult<T, ShowShareMenuOption>;
/** [wx.startHandoff(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.startHandoff.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 开始进行接力，该接口需要在开放数据域调用 */
startHandoff(option?: StartHandoffOption): void;
/** [wx.updateShareMenu(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.updateShareMenu.html)
*
* 需要基础库： `1.2.0`
*
* 更新转发属性
*
* ****
*
* ## 注意事项
* - bug：在iOS上，如果 withShareTicket 传了 true ，同时 isUpdatableMessage 传了 false，会导致 withShareTicket 失效。解决办法：当 withShareTicket 传了 true 的时候，isUpdatableMessage 传 true 或者不传都可以，但不要传 false。如果需要关掉动态消息设置，则另外单独调用一次 wx.updateShareMenu({ isUpdatableMessage: false }) 即可。
*
* **示例代码**
*
* ```js
wx.updateShareMenu({
withShareTicket: true,
success () { }
})
```
* ```js
// 转发私密消息
wx.updateShareMenu({
isPrivateMessage: true,
activityId: 'xxx',
templateInfo: {},
success () { },
fail () {}
})
``` */
updateShareMenu<T extends UpdateShareMenuOption = UpdateShareMenuOption>(option: T): PromisifySuccessResult<T, UpdateShareMenuOption>;
}
}
