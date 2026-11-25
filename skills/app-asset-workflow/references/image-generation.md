# 生图执行与原图交付

适用于第 4 阶段全局代表稿、V2 模块稿及这些图稿的修订。先按[生成前约束](style-and-production.md#生成前约束)形成实际提示词，逐张写明用途、可见内容、状态、画幅、参考图编号及各自用途。游戏图片路线的三候选继续按[全局视觉规则](../../app-domain-toolkit/references/reference-asset-global-visual-control.md#三候选生成与人工冻结门)生成和人工选择。

图片路线以项目和技术栈为作用域，在首次适用的 `app-workflow init` 时冻结。视觉项目的 PROJECT、首次创建的独立图片工作项，或明确携带路线选项的 FOUNDATION 可建立记录。选择保存在 `.workflow-control/image-routes/<项目和技术栈标识>.json`，相关工作项通过 `imageRoutesRef: {path, sha256}` 绑定，其中 `designImageMethod` 是设计稿生成方式，`formalImageMethod` 是正式单图路线。后续工作项继承该记录，不再接受路线选项或重复预检。纯 3D、直接设计和非视觉工作项没有图片任务时可不触发图片路线初始化。

设计稿默认使用 `codex`，控制器在初始化时调用下方脚本的 `-CheckOnly` 预检。显式使用 `--design-image-method codex` 也执行预检。预检未通过时返回 `DESIGN_IMAGE_METHOD_REQUIRED`，不创建工作项；说明原因并由用户选择 `host-tool` 或 `prompt-handoff`，通过 `--design-image-method` 登记后重新初始化。冻结后第 4 阶段、V2 和局部改稿沿工作项记录执行。

| 冻结值 | 执行与交付 |
| --- | --- |
| `codex` | 在已登录 Codex 订阅的 Windows 用户会话中，用下方脚本为每张图启动一次独立任务。 |
| `host-tool` | 核对宿主支持实际附件、生成或编辑和可回收的原图。按项目的工具与委派规则执行，收图后按同一工作流路径落盘。 |
| `prompt-handoff` | 提供每张图的完整提示词、参考附件、目标画幅和预期工作流路径。记录待回传，收到可解码原图后按实际来源登记，并按原流程送审。 |

已冻结工具出现额度、权限或执行失败时，说明具体原因及待交付图，记录受阻并按同一路线恢复执行。每张候选在其独立路径成功落盘后进入已有人工选稿，V3 消费用户确认的同一版本。已有有效设计稿直接按复用合同处理。Figma 直接设计、3D 世界本体及非视觉工作项沿各自路线执行。

## 工作流存放位置

开始生图前按[工作流输出文件规范](../../app-creator-workflow/references/output-files.md#输出分类与唯一位置)确认写入范围、当前栈的原生目录、工作项、阶段、候选及版本。把该图实际要求的 PNG 完整路径传给 `-OutputPath`。已有工作项或控制器提供的路径优先。没有原生固定位置或项目映射的未送审候选才使用 `output/candidates/<workItemId>/<unit-or-stage>/<candidateId>/`。审阅图、确认图、制作源和运行资源使用各自的既有位置与流程。确认或者正式引用应以工作流目录中的实际原图为准。

## 本机 Codex 命令

需要 Windows、PowerShell 7.2+、可运行 `exec --ephemeral --json` 的 Codex CLI 和当前 Windows 用户的 ChatGPT 订阅登录。`-CodexPath` 可以指定要用的 `codex.exe`，省略时从当前 PATH 查找。先在脚本实际运行的用户会话中做预检。

```powershell
pwsh.exe -NoProfile -File <脚本的绝对路径> -CheckOnly
```

调用时使用当前任务的真实路径。在 PowerShell 会话中直接调用脚本可向 `-ReferencePath` 传多个文件，顺序与提示词中的编号一致。纯文生图可省略 `-ReferencePath`。

```powershell
$arguments = @{
    PromptFile = $promptFile
    OutputPath = $workflowOutputPath
    ReferencePath = $referenceFiles
}
& $imagegenScript @arguments
```

脚本显式使用当前 Windows 用户的 Codex 登录，仅在子进程移除 API Key 和替代端点环境变量。提示词按 UTF-8 发送，随后关闭输入。每次使用用户配置目录之外的独立任务工作区和临时目录，统一设置子进程的 `TEMP`、`TMP`、`TMPDIR`，在 Windows 工作区沙箱下运行。脚本回收本次生成的 PNG，验证格式和像素尺寸，再由调用端将原图复制到 `-OutputPath`，拒绝覆盖现有文件。最终一行 JSON 提供正式 PNG 路径、尺寸、SHA-256、发送给 Codex 的提示词和提交的参考附件摘要。

CLI 返回的提交记录用于追踪请求。合同需要核对生图工具实际收到的提示词或参考附件时，使用能读出这两项的宿主工具结果，或 Codex App Server 的生图完成事件，再按对应合同登记。此命令按当前会话 ID 在 Codex 内置工具的缓存目录定位原图。候选无图、图数异常或超时都应报告失败，按合同提供真实原图后再推进。 [Codex 非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode) · [App Server 生图事件](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/app-server-protocol/schema/typescript/ImageGenerationItem.ts)

## 任务结束与资源释放

每张图使用一次非持久会话，无常驻服务。子进程完成后释放进程和 I/O 句柄，超时或中止时结束本次进程树。完成或失败都清理本次任务目录。正式原图写入后，按当前会话身份清理本次已交付的 Codex 缓存副本。尚未成功归档的共享缓存原图可按会话 ID 恢复。当前宿主执行也应在交付后关闭本次独占的工具会话或句柄，保留正式图稿和工作流要求的来源证据。已经发起的生图按订阅规则计入使用量。 [Codex 生图用量](https://learn.chatgpt.com/docs/image-generation#generate-or-edit-an-image)
