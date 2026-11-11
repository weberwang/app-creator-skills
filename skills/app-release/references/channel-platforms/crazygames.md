# CrazyGames 接入

仅用于已选择 CrazyGames 的 Web 游戏，先执行[渠道公共规范](../channel-platform-integration.md)。采用 Unity Web 构建、Cocos Web 构建或 HTML5 路线时，核实引擎和所选 SDK 的实际支持，不以普通网站可打开证明平台可用。

与其他受支持 Web 宿主共用导出包时，按[运行时平台选择](../channel-platform-integration.md#导出方案与运行时平台选择)由统一入口选择 CrazyGames 适配器，仅加载当前需要的 SDK。iframe 游戏不能只判断自身 `location` 域名；入口线索选定候选后，按所选 SDK 的官方环境接口复核。当前 HTML5 SDK 的 `environment` 区分 `crazygames`、`local` 和 `disabled`；本地模式仅用于测试，`disabled` 时不调用商业能力，也不因 SDK 对象存在就认定正式平台。实际接口按锁定版本／引擎读取，不把 HTML5 属性强套到 Unity。

## 接入与验证

1. **确认上线阶段**：在现有发布清单明确 Basic Launch 或 Full Launch。按当前规则，Basic Launch 的 SDK 可选且不开放变现；Full Launch 必须完成适用 SDK 接入。不得为验证 Basic 阶段强加广告，或把本地模拟广告当作可正式展示。
2. **构建与预览**：记录游戏身份、引擎／SDK 版本、Web 入口和相对资源路径，核对当前首玩下载量、总包与文件数量要求；优化有实际测量依据。检查平台嵌入环境、外链／站点锁与域名、跨源资源、支持浏览器、输入、方向、音频解锁及中断恢复，不只验证 localhost。平台预览或 QA 工具结果不能代替尚未执行的目标浏览器／设备结果。
3. **初始化与事件**：所选 SDK 需要初始化时，完成其真实就绪前置再调用。`gameplayStart`／`gameplayStop` 对应实际开始、继续和业务中断，不能在菜单仍不可玩时提前上报首玩；失焦事件按当前 SDK 官方定义处理，不重复伪报玩法中断。HTML5 等支持的路线按适用要求记录 `loadingStart`／`loadingStop`，不为 Unity 强行调用其 SDK 不支持的加载接口，也不靠上报事件延长加载显示。
4. **广告**：只使用 CrazyGames 允许的 SDK 广告，禁止在同一候选加载原生 MAX 或自行叠加第三方变现。按平台 `midgame`／`rewarded` 合同选择自然中断点和用户主动请求，展示期间正确暂停玩法／音频并恢复。当前有效激励完成结果才发奖；`adError`、禁用广告、屏蔽、无填充、关闭或重复回调必须正确处理。无广告时主流程仍可继续，不能冻结关卡或保留无效按钮；平台频控和阶段限制不得绕过。
5. **账号与数据**：只有实际涉及账号／进度时核对平台 User／Data 接口和账号集成要求，处理访客、登录变化、云端与本地冲突及写入失败。不默认新增账号、云存档、统计 SDK；平台能力和额外数据采集分别核对隐私要求。需要购买时先核实平台资格与当前支付方案，不直接套用移动商店内购。
6. **交付**：将实际渠道包、脱敏配置、事件与失败路径证据、[填写稿与展示素材](#填写稿与展示素材)和未完成项纳入现有候选资料。对照当期平台要求准备材料；预览、提交、平台接受和正式上线分别记录，外部动作不随文档／构建授权自动执行。

## 填写稿与展示素材

按[商店文案与展示素材制作](../store-marketing-assets.md#任务安排与完成条件)安排内容策划、采集、制作和验收。将实际填写值、素材位置、检查结果和待办放入现有发布材料。以下字段以开发者门户的 Details 页面为依据，执行前核对当前页面与官方要求。

| 后台项 | 准备要求 |
| --- | --- |
| Category、Tags | 按真实玩法选择分类和标签。自选标签最多 5 个，管理员维护标签按后台规则处理 |
| Description、Controls | 提供可直接填写的游戏介绍和操作说明。介绍禁止 HTML，操作按实际支持的输入方式填写 |
| Which tools did you use? | 对照后台选项填写实际使用的工具，至少选一项。确实无适用工具时按平台规则选择 `None` |
| 商店地址、下载量、营销素材链接 | Google Play、App Store、Steam 地址与相应下载量、Marketing creatives URL 均按适用范围选填。链接和数据需有真实依据 |
| Mobile orientation、全屏支持 | 方向核对当前构建，变更方向时按后台要求创建新构建。按实际运行结果填写全屏支持 |

| 必传素材 | 规格 |
| --- | --- |
| 横版封面 | 1920 × 1080，16:9 |
| 竖版封面 | 800 × 1200，2:3 |
| 方形封面 | 800 × 800，1:1 |
| 横版预览视频 | 官方标注为 1080p、16:9，MP4 或 MOV |
| 竖版预览视频 | 官方标注为 1080p、2:3，MP4 或 MOV |

- 三张封面保持相同的识别元素，按各画幅重新构图。使用后台标签区预览检查遮挡，封面文字限游戏标题，排除边框、图标、商店标志及模糊或无使用权的素材。[官方封面规范](https://docs.crazygames.com/requirements/game-covers/#cover-images)
- 两段视频以各自静态封面开场，建议制作 15–20 秒，最长 20 秒，每段最大 50 MB，无声音。避免黑屏、标志转场、黑边、默认鼠标指针、宣传文字、应用或社交媒体图标及加速播放。竖版的具体像素组合和其他未明确的限制按当前后台核实。[官方视频规范](https://docs.crazygames.com/requirements/game-covers/#video-requirements)
- 按[公共视频制作步骤](../store-marketing-assets.md#宣传视频制作)，必须采集当前候选的正式游戏运行过程，配合对应封面，通过常规剪辑工具或 FFmpeg 制作横版和竖版；不使用外部录屏工具，禁止 AI 生成视频，不以动画或静态截图动效代替实际过程。保留原始过程视频、剪辑来源和最终导出；缺少真实过程视频、授权或可用采集能力时记入素材待办，不改用外部录屏或生成视频补齐。成品按平台规格核对文件参数，视频内容与最终画面由用户人工审核，不自动判定通过。

## 官方资料

资料核对：2026-11-10；在实际接入与提审时复核，不固定复制包体阈值、SDK 版本或上线资格。

- [上线阶段与接入要求](https://docs.crazygames.com/requirements/intro/)、[技术要求](https://docs.crazygames.com/requirements/technical/)。
- [SDK 与引擎入口](https://docs.crazygames.com/sdk/intro/)、[游戏和加载事件](https://docs.crazygames.com/sdk/game/)。
- [广告规则](https://docs.crazygames.com/requirements/ads/)、[视频广告 API 与回调](https://docs.crazygames.com/sdk/video-ads/)。
- [封面与预览视频](https://docs.crazygames.com/requirements/game-covers/)。
