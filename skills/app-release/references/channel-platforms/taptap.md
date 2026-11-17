# TapTap 渠道与 CLI 接入

适用于已选择 TapTap 的游戏及其开发者中心管理，先执行[渠道公共规范](../channel-platform-integration.md)。先确认目标游戏、地区、开发者主体、目标终端、包体类型、候选版本和所需操作，再按当前引擎和官方要求核实导出能力与资质。CLI 管理开发者中心的游戏资料、包体、测试和运营；它不接入游戏内登录、支付、防沉迷或其他运行时 SDK，也不代表任一引擎或产物已支持某个宿主。游戏内能力按[运行时 SDK 与语言复用](../taptap-runtime-integration.md)接入，开发者补充项按[材料、开通与政策](../taptap-materials-policy.md)处理；在既有阶段安排实际任务，不把资料管理完成当作变现或登录接通。

## 工具与身份

开发者中心管理统一通过[官方 TapTap CLI](https://developer.taptap.cn/v3/cli/)实现，直接复用其内置 Skill、命令、上传任务与错误处理，不为已覆盖能力另写 HTTP 客户端、登录流程、上传器或浏览器自动化。CLI 未覆盖的能力先记录缺口，再按用户所需操作核实官方支持途径；确需账号持有人处理的证件、签约或授权继续交人工，不以非公开接口绕过限制。

运行时 SDK 在执行接入前先按[全渠道分类与多选确认](../channel-sdk-selection.md)列出本次宿主的必接依据与可选能力，等待整套范围确认后统一按语言／引擎复用。APK 合规义务不等于无条件使用 TapTap 登录，PC、小游戏、H5 与 TapPlay 的必接不同；广告、支付、存档、社交和运营能力的依赖、材料及代码缺口一并展示。CLI 管理任务按已有授权独立推进，不把 CLI 授权当作 SDK 选择或后台商业服务开通授权。

先检查当前环境是否已有 `taptap-cli`，复用已有安装和登录状态；没有时按[官方安装说明](https://developer.taptap.cn/v3/cli/)安装，然后重新检查版本。全局安装会修改本机环境，遵守项目环境约束；不要在项目依赖或客户端包内保存 CLI 凭据。

```text
taptap-cli version
taptap-cli doctor --offline --json
taptap-cli auth status
taptap-cli skills list
taptap-cli skills read taptap-cli
taptap-cli --help
```

```text
npm i -g @taptap/cli --registry=https://registry.npmjs.org/
```

未登录时使用 `taptap-cli auth login --no-wait --json` 获取授权链接，由账号持有人完成授权，再按返回的 resume 参数继续；不要猜测授权完成或在日志、仓库、工单中保存令牌、cookie、设备码及敏感材料。登录状态、权限及服务不可用分别处理；不得切换账号或绕过权限来继续。

CLI 内置 Skill 与安装版本对应。按任务用 `taptap-cli skills read <skill-name>` 读取对应能力；再用 `taptap-cli <service> --help`、`taptap-cli <service> <method> --help` 和 `taptap-cli schema <service> <method>` 核对当前方法、参数、风险和返回值。文中示例的尖括号是待替换的真实值；遇到当前版本没有的方法，记录受限项并查官方资料，不自行编造命令。不要自动更新 CLI 或同步安装其他全局工具。

`doctor --offline --json` 仅诊断本地环境，不能证明账号权限或远端业务可用；仍须通过真实只读查询确认目标。后续命令在当前帮助支持时使用 `--json` 获取结构化结果，保留脱敏输出与退出码，不依赖终端展示文本编写解析器。

先查询当前账号可访问主体，再按主体查询游戏；明确目标后在后续命令中传入真实 `--dev-id` 和 `--app-id`，不依赖历史上下文猜测或从多个同名候选中擅自选择。

```text
taptap-cli developer +list
taptap-cli app +list --dev-id <developerId> --kw <keyword>
taptap-cli app analyze-status --dev-id <developerId> --app-id <appId>
```

## 执行与结果边界

按照用户已明确授权的操作和目标执行。创建、上传、修改草稿、绑定、提交、上线、发帖与推送都是不同写操作；准备或查询的授权不自动包含外部写入。复用已有明确授权，不对同一已授权操作重复询问。按所选方法的帮助、schema 和随包 Skill 核对是否支持 `--dry-run`、`--yes` 和幂等键；支持预览时先核对实际目标和参数，预览只证明请求形状，不代表业务校验或写入成功。高风险操作在 CLI 要求时使用 `--yes`，它不能替代实际授权。

对支持幂等的写入，按当前 schema 为同一意图使用稳定的 `--idempotency-key`；官方要求其为 1–255 个可打印 ASCII 字符且非空白。写入结果不明时先按具体方法的官方恢复规则查询状态，不盲目重新创建或重复上传；尤其提审未知结果禁止重试，即使幂等键相同也先查询并在无法确认时停止。复杂参数可用 `--data @file` 指向当前工作目录及其子目录内的 JSON；解析链接后也不能越出当前工作目录。数据文件只包含此次必要内容，敏感凭据不写入其中。

依据进程退出码和结构化返回的 `ok` 判断成功；失败时按 `error.type`、`error.subtype`、`error.hint` 与当前 schema 排查。区分参数、认证、权限、网络、平台策略、业务错误及需要确认等情况；不以存在 `data`、dry-run 或日志文本推断成功。长任务先用 `task +list`、`task +get <task-id>` 查实际阶段，按官方说明决定是否恢复；停止本地跟踪不等于撤销远端结果。

## 游戏、资料与资质

| 任务 | 实施路线 |
| --- | --- |
| 创建游戏 | 读取 `taptap-publish-game`，先查询已有游戏避免重复；确认名称、类型、开发角色和包体方向。使用 `schema app create` 与 `app create --data @create-app.json --idempotency-key <key> --dry-run` 预览，实际创建使用相同已核对内容。创建成功只表示草稿已建立。 |
| 修改资料 | 读取 `taptap-app-edit`，用 `app analyze-status` 找缺口，以 `app get-module` 读取当前值与版本，再按 schema 使用 `app save-changes`。先核对拟改字段与已有值，写入后重新读取；不可用或冲突时重新查询，不覆盖未核实的其他字段。 |
| 核查资质 | 读取 `taptap-qualification`，使用 `qualification get-assessment` 和 `qualification get-status` 查询要求、材料状态和审核进度。仅在真实材料和当前提交资格满足时按 schema 准备草稿／提交；`blocked` 或 `unknown` 不当作可提交。提交时使用当前 assessment 的快照作为要求的 `expected_snapshot`，资料变化后重查。敏感证件交由用户在开发者中心处理。 |
| 素材 | 用 `materials +inspect <directory-or-archive>` 只读盘点工作目录内的文件；读取 `taptap-asset-library`，按素材类型和实际消费者选择图片、视频或论坛专用上传命令。上传后回查素材和视频处理状态；素材入库不等于已写入资料字段或已发布。 |

以下是可准备的创建预览；JSON 文件需按当前 schema 填写，真实创建仅在对应授权范围内执行。

```text
taptap-cli schema app create
taptap-cli app create --dev-id <developerId> --data @create-app.json --idempotency-key <createKey> --dry-run
taptap-cli materials +inspect ./materials
taptap-cli upload ./icon.png --dev-id <developerId> --app-id <appId> --idempotency-key <imageKey> --dry-run
```

## 包体与测试入口

读取 `taptap-package-management` 和目标命令 schema，先查询 `package-management get-available-package-types`，只处理当前应用实际返回的类型。未列出或权限不足时核实原因，不换其他类型试探。核对候选文件、签名、包名、版本及当前应用身份并关联同一发布候选；实际上传和绑定分别属于外部写入。

`package-management get-or-create-mini-app` 会创建开放平台 Client 并开通 TapDB，不是只读查询或普通上传前置。只有小游戏接口明确因未开通而失败，且用户明确要求开通这些能力时才按当前 schema 调用；不得为消除报错自动执行。

```text
taptap-cli schema package-management get-available-package-types
taptap-cli package-management get-available-package-types --dev-id <developerId> --app-id <appId>
taptap-cli upload-apk ./game.apk --dev-id <developerId> --app-id <appId> --dry-run
taptap-cli upload-pc-package ./game.zip --dev-id <developerId> --app-id <appId> --launch-exe <executablePath> --version <version> --dry-run
taptap-cli upload-h5-package ./h5.zip --dev-id <developerId> --app-id <appId> --dry-run
taptap-cli upload-mini-app-package ./mini-app.zip --dev-id <developerId> --app-id <appId> --dry-run
```

APK、Windows、H5、Tap 小游戏分别使用上述对应入口，不将它们的文件格式和处理结果混用。以当前命令帮助及返回状态为准：顶层上传已完成的步骤不要再补调底层 `complete-*`；H5 顶层上传通常已创建版本，回查即可。小游戏若仅完成文件上传，先查询解析状态；解析成功后仍须按实际结果及授权创建开发版本，再重新查询。已上传文件标识、包体 ID、版本 ID 不是同一个身份。需要绑定草稿时用 `app list-packages` 查询候选和当前位置，再按 `app select-package` 的 schema 执行并回读。上传、解析、创建版本、绑定和上线分别记录。

小游戏开发版本、H5 和 TapTap 制造按官方支持范围查询自测入口；APK 与 Windows 按开发者中心对应流程自测，不伪造二维码。仅凭获取入口或上传成功不能声称已在真实宿主或真机验证；真机运行仍须单独明确授权。

## 审核与上线

用户明确提出提审后，读取 `taptap-app-edit`，检查当前资料、候选包、资质、警告和必要协议；签署协议属于单独操作，先展示内容并取得对应明确同意。使用官方三步流程，整个过程固定目标应用与候选身份：

```text
taptap-cli app prepare-review-snapshot --dev-id <developerId> --app-id <appId>
taptap-cli schema app precheck-review
taptap-cli app precheck-review --dev-id <developerId> --app-id <appId> --data @review-precheck.json
taptap-cli schema app submit-review
taptap-cli app submit-review --dev-id <developerId> --app-id <appId> --data @review-submit.json --idempotency-key <submitKey> --dry-run
```

1. 保存快照返回的 `revision` 和 `version_id`；这些值只能来自真实返回。预检确定上线方式 `release_schedule`，并核对其返回的 `version_id` 仍对应同一快照。资料发生变化或版本不一致时重新读取快照。
2. 分别报告预检 `passed`、`rejected` 和 `unavailable`，后者表示本次未得到结论。核对影响、阻断项、协议和发布计划；预检不代表审核通过。
3. 在用户已明确授权正式提交后，按 schema 提交与预检完全相同的 `release_schedule`，使用本次意图的稳定幂等键及 CLI 要求的 `--yes`。结果未知时禁止重试，先用 `app list-versions`／`app get-version` 查询；仍无法确定时停止并交人工核实。

分别记录草稿、预检、提审、审核结果、定时／正式上线和实际可见状态；一次提交或审核通过不自动证明游戏已上线。

## 测试与运营

以下能力按用户选择读取随包 Skill，并使用目标服务的 help 和 schema 获取当前字段与权限；运营内容先准备成可核对的具体内容，实际写入遵守对应授权。

| 任务 | 随包 Skill 与关键处理 |
| --- | --- |
| 测试计划 | `taptap-test-plan`；`test-plan list-test-plans` 必填 `test_type`，分别查询 `closed`、`open` 或 `internal`。创建前查已有计划和 `get-environment`；封闭测试还需实时查 `get-policy`。创建、结束计划及资格发放的影响各自核对，结束不可逆，不能把停止发放等同于结束测试。 |
| 数据与评价 | `taptap-dashboard-stats` 的 `dashboard-stats get` 每次查询一个指标，论坛趋势使用 `get-forum-stats`。`taptap-player-feedback` 的 `player-feedback list-player-reviews` 查询评价及已有回复；默认范围和分页限制以当前 schema 为准，CLI 当前不支持回复、处理或删除评价。 |
| 论坛 | `taptap-community-management`；查询论坛和子版块后按需准备素材、草稿和预览。保存草稿、提交发布及公开可见分开记录；发布可能仍需审核。回复使用实际可用身份及权限，当前 CLI 不支持编辑已发布帖子、撤回回复、置顶、加精或删除。 |
| 签到 | `taptap-game-sign`；先查活动和配置，按当前 schema 检查时间、奖励、库存及审核条件，再处理用户已授权的创建或提审。 |
| 活动与公告 | `taptap-whats-new`；先核对来源、排期和展示位置。`whats-new create` 会直接上线，不能当成保存草稿。 |
| 官方消息推送 | `taptap-official-message-push`；先查额度、来源和推送对象并预览，按当前返回的预览信息和有效期执行用户已授权的操作，已发送消息不能撤回。 |

```text
taptap-cli skills read taptap-test-plan
taptap-cli schema test-plan list-test-plans
taptap-cli test-plan list-test-plans --dev-id <developerId> --app-id <appId> --data @test-plan-query.json
taptap-cli schema dashboard-stats get
taptap-cli dashboard-stats get --dev-id <developerId> --app-id <appId> --data @stats-query.json
taptap-cli schema player-feedback list-player-reviews
taptap-cli community-management list-community-moments --dev-id <developerId> --app-id <appId> --page 1 --page-size 20
```

## 接入现有发布工作流

继续使用[发布准备与实际上线](../../../app-creator-workflow/references/workflow.md#发布准备与实际上线)的既有合同，不新增 TapTap 专用状态机或控制器字段。CLI 负责实际后台操作，工作流控制器只核对任务、授权及证据，不因选中渠道或进入 RELEASE 自动调用外部写入。

- 检查与候选准备沿用 `releaseIntent=prepare`。在当前发布材料关联 CLI 版本、真实开发者／应用身份、候选校验值、包体／版本标识、实际命令及脱敏结果；`release-preparation` 引用既有交付材料与检查证据，不用 dry-run、上传成功或预检通过填报已上线。
- 实际发布沿用 `releaseIntent=publish`、F4 与已授权的准确目标。执行后查询实际发布状态，确认真实版本及可见结果，再按现有 `release-result` 记录真实 `releaseIdentifier` 和证据；审核中、定时待生效或结果未知时不能提前登记发布完成。
- 渠道管理证据与游戏内 SDK、真实宿主、真机及人工视觉结论分别记录。缺少账号、权限或外部操作授权时，继续完成可独立准备的文案、材料和本地候选，明确尚未执行的具体操作。

## 官方资料

资料核对：2026-11-17。能力、授权和字段可能随 CLI 与后台变化，执行时以当前版本的帮助、schema、随包 Skill 和官方页面为准。

- [CLI 概览](https://developer.taptap.cn/v3/cli/)与[命令参考](https://developer.taptap.cn/v3/cli/command-reference/)。
- [创建游戏](https://developer.taptap.cn/v3/cli/skills/taptap-publish-game/)、[资料与版本](https://developer.taptap.cn/v3/cli/skills/taptap-app-edit/)、[上架资质](https://developer.taptap.cn/v3/cli/skills/taptap-qualification/)、[素材库](https://developer.taptap.cn/v3/cli/skills/taptap-asset-library/)、[包体管理](https://developer.taptap.cn/v3/cli/skills/taptap-package-management/)。
- [测试计划](https://developer.taptap.cn/v3/cli/skills/taptap-test-plan/)、[数据表现](https://developer.taptap.cn/v3/cli/skills/taptap-dashboard-stats/)、[玩家评价](https://developer.taptap.cn/v3/cli/skills/taptap-player-feedback/)、[论坛](https://developer.taptap.cn/v3/cli/skills/taptap-community-management/)。
- [签到活动](https://developer.taptap.cn/v3/cli/skills/taptap-game-sign/)、[活动或公告](https://developer.taptap.cn/v3/cli/skills/taptap-whats-new/)、[官方消息推送](https://developer.taptap.cn/v3/cli/skills/taptap-official-message-push/)。
