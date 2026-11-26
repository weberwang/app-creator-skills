#Requires -Version 7.2
<#
.SYNOPSIS
通过本机 Codex 订阅登录生成一张 PNG，校验后交付到调用者指定的工作流路径。
#>
[CmdletBinding(DefaultParameterSetName = 'Generate')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Generate')][string]$PromptFile,
    [Parameter(Mandatory, ParameterSetName = 'Generate')][string]$OutputPath,
    [Parameter(ParameterSetName = 'Generate')][ValidateCount(0, 5)][string[]]$ReferencePath = @(),
    [Parameter(ParameterSetName = 'Generate')][ValidateRange(1, 1800)][int]$TimeoutSeconds = 600,
    [Parameter(Mandatory, ParameterSetName = 'Check')][switch]$CheckOnly,
    [string]$CodexPath
)

$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw '此 Codex 生图入口需要 Windows 和 PowerShell 7.2 或以上版本。' }
$userProfile = [Environment]::GetFolderPath('UserProfile')
$windowsRoot = [Environment]::GetFolderPath('Windows')
$relativeProfile = [IO.Path]::GetRelativePath($windowsRoot, $userProfile)
if (-not [IO.Path]::IsPathRooted($relativeProfile) -and $relativeProfile -ne '..' -and -not $relativeProfile.StartsWith('..\')) {
    throw '请在已登录 Codex 的 Windows 用户会话中运行。系统目录不能作为生图工作区。'
}
$codexHomePath = Join-Path $userProfile '.codex'
if (-not $CodexPath) {
    $desktopCodex = Get-Command codex.exe -CommandType Application -ErrorAction SilentlyContinue
    if (-not $desktopCodex) { throw '找不到 codex.exe。请用 -CodexPath 指定 CLI 的绝对路径。' }
    $CodexPath = $desktopCodex.Source
}
$CodexPath = (Resolve-Path -LiteralPath $CodexPath).ProviderPath
$utf8 = [Text.UTF8Encoding]::new($false, $true)

# 每次只管理自己启动的进程，向标准输入发送完整提示词和 EOF，超时或退出时关闭进程句柄。
function Invoke-ImagegenCodex {
    param([string[]]$Arguments, [string]$WorkingDirectory, [string]$TempDirectory, [string]$InputText, [int]$Seconds = 30)

    $start = [Diagnostics.ProcessStartInfo]::new($CodexPath)
    $start.WorkingDirectory = $WorkingDirectory
    $start.UseShellExecute = $false
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.StandardInputEncoding = $utf8
    $start.StandardOutputEncoding = [Text.Encoding]::UTF8
    $start.StandardErrorEncoding = [Text.Encoding]::UTF8
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }
    foreach ($name in @('CODEX_API_KEY', 'OPENAI_API_KEY', 'CODEX_ACCESS_TOKEN', 'OPENAI_BASE_URL')) {
        [void]$start.Environment.Remove($name)
    }
    $start.Environment['CODEX_HOME'] = $codexHomePath
    if ($TempDirectory) {
        # Windows 沙箱可能检查任一临时变量，三者都应指向调用者有权使用的同一任务目录。
        foreach ($name in @('TEMP', 'TMP', 'TMPDIR')) { $start.Environment[$name] = $TempDirectory }
    }

    $stopwatch = [Diagnostics.Stopwatch]::StartNew()
    $child = [Diagnostics.Process]::Start($start)
    try {
        $stdout = $child.StandardOutput.ReadToEndAsync()
        $stderr = $child.StandardError.ReadToEndAsync()
        if ($InputText) {
            $inputBytes = $utf8.GetBytes($InputText)
            $write = $child.StandardInput.BaseStream.WriteAsync($inputBytes, 0, $inputBytes.Length)
            $write.WaitAsync([TimeSpan]::FromSeconds($Seconds)).GetAwaiter().GetResult()
        }
        $child.StandardInput.Close()
        $remaining = [Math]::Max(0, $Seconds * 1000 - [int]$stopwatch.ElapsedMilliseconds)
        if (-not $child.WaitForExit($remaining)) { throw "Codex 在 $Seconds 秒内未完成，已结束本次任务。" }
        $drain = [TimeSpan]::FromSeconds(5)
        return [pscustomobject]@{
            ExitCode = $child.ExitCode
            Stdout = $stdout.WaitAsync($drain).GetAwaiter().GetResult()
            Stderr = $stderr.WaitAsync($drain).GetAwaiter().GetResult()
        }
    } finally {
        try {
            if (-not $child.HasExited) {
                try { $child.Kill($true) } catch [InvalidOperationException] { if (-not $child.HasExited) { throw } }
                if (-not $child.WaitForExit(5000)) { Write-Warning '本次 Codex 进程未在清理时限内退出。' }
            }
        } finally { $child.Dispose() }
    }
}

# 只从当前会话的 Codex 缓存回收内置工具原图，避免混入工作区产物或跟随目录链接。
function Get-ImagegenPngFiles {
    param([string]$Root, [string]$ThreadId)

    $rootItem = Get-Item -LiteralPath $Root -ErrorAction SilentlyContinue
    if (-not $rootItem -or -not $rootItem.PSIsContainer -or ($rootItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { return }
    $directory = Join-Path $rootItem.FullName $ThreadId
    $item = Get-Item -LiteralPath $directory -ErrorAction SilentlyContinue
    if (-not $item -or -not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { return }
    Get-ChildItem -LiteralPath $directory -File -Filter '*.png' | Where-Object {
        $_.Extension -ieq '.png' -and -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint)
    }
}

$login = Invoke-ImagegenCodex -Arguments @('login', 'status') -WorkingDirectory $userProfile
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($login.ExitCode -ne 0 -or ($login.Stdout + $login.Stderr) -notmatch '(?m)^\s*Logged in using ChatGPT\s*$') {
    # 登录输出可能含凭据片段，预检只报告账号与配置位置。
    throw "未检测到当前用户的 ChatGPT 订阅登录。Windows 用户 $identity，Codex 目录 $codexHomePath。"
}
$versionResult = Invoke-ImagegenCodex -Arguments @('--version') -WorkingDirectory $userProfile
if ($versionResult.ExitCode -ne 0 -or $versionResult.Stdout -notmatch '(?m)^codex-cli\s+(\S+)') { throw '无法读取 Codex CLI 版本。' }
$generatorVersion = $Matches[1]
if ($CheckOnly) {
    [pscustomobject]@{ authMode = 'ChatGPT'; windowsUser = $identity; codexHome = $codexHomePath; codexPath = $CodexPath; codexVersion = $generatorVersion } | ConvertTo-Json -Compress
    return
}

$promptPath = (Resolve-Path -LiteralPath $PromptFile).ProviderPath
$promptText = [IO.File]::ReadAllText($promptPath, $utf8)
if (-not $promptText.Trim()) { throw '图稿提示词不能为空。' }
$destination = [IO.Path]::GetFullPath($OutputPath, (Get-Location).ProviderPath)
if ([IO.Path]::GetExtension($destination) -ine '.png') { throw '工作流交付路径必须指定 PNG 文件名。' }
if (Test-Path -LiteralPath $destination) { throw "交付文件已存在，请选择工作流允许的新候选或新版本路径。$destination" }
$requestRecordPath = "$destination.request.json"
if (Test-Path -LiteralPath $requestRecordPath) { throw "生图请求记录已存在，请选择新的交付路径。$requestRecordPath" }

# 工作区和临时目录取自当前 Windows 用户目录，完全避开调用者继承的系统 TEMP。
$jobRoot = Join-Path $userProfile '.app-creator-imagegen'
$jobRootItem = New-Item -ItemType Directory -Path $jobRoot -Force
if ($jobRootItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw '生图任务根目录必须是用户目录下的实际目录。' }
$jobDirectory = Join-Path $jobRootItem.FullName ([guid]::NewGuid().ToString('N'))
$jobItem = New-Item -ItemType Directory -Path $jobDirectory
$result = $null
$stagingFile = $null
$outputStream = $null
$requestStagingFile = $null
$requestStream = $null
$threadId = $null
$requestRecordSaved = $false
try {
    $work = (New-Item -ItemType Directory -Path (Join-Path $jobItem.FullName 'work')).FullName
    $temp = (New-Item -ItemType Directory -Path (Join-Path $jobItem.FullName 'temp')).FullName
    $argumentList = @('-a', 'never', '-c', 'windows.sandbox="elevated"', 'exec', '--ignore-user-config', '--ephemeral', '--json', '--color', 'never', '--sandbox', 'workspace-write', '--skip-git-repo-check', '--cd', $work)

    # 把参考图按送入顺序放到子进程工作区，避免原路径的逗号被 CLI 当成附件分隔符。
    $stagedNames = @()
    $inputs = @(foreach ($reference in $ReferencePath) {
        $source = Get-Item -LiteralPath $reference
        if ($source.PSIsContainer -or $source.Extension -notin @('.png', '.jpeg', '.jpg', '.webp')) {
            throw "参考附件应为 PNG、JPEG 或 WebP 文件。$reference"
        }
        $name = 'reference-{0}{1}' -f ($stagedNames.Count + 1), $source.Extension.ToLowerInvariant()
        $stagePath = Join-Path $work $name
        [IO.File]::Copy($source.FullName, $stagePath, $false)
        $stagedNames += $name
        [pscustomobject]@{ path = $source.FullName; sha256 = (Get-FileHash -LiteralPath $stagePath).Hash.ToLowerInvariant() }
    })
    $instruction = '使用 $imagegen 技能调用 Codex 内置生图工具一次，按下方图稿要求生成一张静态 PNG。调用端回收原图，工具调用完成后直接简短回复结果。'
    if ($stagedNames.Count) {
        $argumentList += @('--image', ($stagedNames -join ','))
        $attachmentLines = for ($i = 0; $i -lt $stagedNames.Count; $i++) {
            '{0}. {1}' -f ($i + 1), (Join-Path $work $stagedNames[$i])
        }
        $instruction += "`n按图稿提示词中的编号和用途，将下列绝对路径实际传给该次 image_gen 调用的 referenced_image_paths。`n" + ($attachmentLines -join "`n")
    }
    $request = $instruction + "`n`n" + $promptText

    # 先验证正式路径可写，保留独立的同目录暂存文件，避免失败时留下半张正式图。
    $destinationDirectory = [IO.Path]::GetDirectoryName($destination)
    [void][IO.Directory]::CreateDirectory($destinationDirectory)
    $stageCandidate = Join-Path $destinationDirectory ('.imagegen-' + [guid]::NewGuid().ToString('N') + '.tmp')
    $outputStream = [IO.File]::Open($stageCandidate, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $stagingFile = $stageCandidate
    $requestStageCandidate = Join-Path $destinationDirectory ('.imagegen-request-' + [guid]::NewGuid().ToString('N') + '.tmp')
    $requestStream = [IO.File]::Open($requestStageCandidate, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $requestStagingFile = $requestStageCandidate
    $generation = Invoke-ImagegenCodex -Arguments ($argumentList + '-') -WorkingDirectory $work -TempDirectory $temp -InputText $request -Seconds $TimeoutSeconds

    # CLI JSONL 暂无生图详情，只使用新会话 ID 定位原图，不从代理回复提取路径。
    $threadIds = @(foreach ($line in ($generation.Stdout -split '\r?\n')) {
        if ($line -notmatch '"type"\s*:\s*"thread\.started"') { continue }
        $event = $line | ConvertFrom-Json
        $threadGuid = [guid]::Empty
        if ($event.type -eq 'thread.started' -and [guid]::TryParseExact($event.thread_id, 'D', [ref]$threadGuid)) { $threadGuid.ToString() }
    })
    if ($threadIds.Count -eq 1) { $threadId = $threadIds[0] }
    if ($generation.ExitCode -ne 0 -or $threadIds.Count -ne 1) {
        $details = $generation.Stderr + $generation.Stdout
        $failure = switch -Regex ($details) {
            'invalid_api_key|401 Unauthorized' { '认证失败'; break }
            'usage_limit|quota|429 Too Many Requests' { '当前额度不足或请求受限'; break }
            'setup refresh|write ACE grant failed' { 'Windows 沙箱初始化失败'; break }
            default { '调用失败或没有唯一的会话 ID' }
        }
        throw "Codex 生图$failure，退出码 $($generation.ExitCode)。"
    }
    $cacheRoot = Join-Path $codexHomePath 'generated_images'
    $originals = @(Get-ImagegenPngFiles -Root $cacheRoot -ThreadId $threadId)
    if ($originals.Count -ne 1) { throw "当前 Codex 会话应在内置工具的缓存目录交付一张原图，实际找到 $($originals.Count) 张。会话 $threadId。" }
    $original = $originals[0]

    Add-Type -AssemblyName System.Drawing
    $pngStream = [IO.File]::OpenRead($original.FullName)
    try {
        $png = [System.Drawing.Image]::FromStream($pngStream, $false, $true)
        try {
            if ($png.RawFormat.Guid -ne [System.Drawing.Imaging.ImageFormat]::Png.Guid) { throw 'Codex 产物不是可解码的 PNG。' }
            $width = $png.Width
            $height = $png.Height
        } finally { $png.Dispose() }
        # 由调用端逐字节交付原图，工作流文件不需要加入 Codex 沙箱的可写范围。
        $pngStream.Position = 0
        $pngStream.CopyTo($outputStream)
    } finally { $pngStream.Dispose() }
    $outputStream.Flush($true)
    $outputStream.Position = 0
    $sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($outputStream)).ToLowerInvariant()
    $outputStream.Dispose()
    $outputStream = $null
    # 请求记录仅证明发送给 Codex 的内容，工具实际输入仍须由工具事件单独核对。
    $requestRecord = [pscustomobject]@{
        schemaVersion = 'codex-imagegen-request-v1'
        path = $destination; width = $width; height = $height; sha256 = $sha256
        generator = 'codex-imagegen'; generatorVersion = $generatorVersion; authMode = 'ChatGPT'; threadId = $threadId
        submittedPrompt = $request; submittedReferenceInputs = $inputs
    }
    $recordBytes = $utf8.GetBytes(($requestRecord | ConvertTo-Json -Depth 5) + "`n")
    $requestStream.Write($recordBytes, 0, $recordBytes.Length)
    $requestStream.Flush($true)
    $requestStream.Position = 0
    $requestRecordSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($requestStream)).ToLowerInvariant()
    $requestStream.Dispose()
    $requestStream = $null
    # 先提交完整请求记录，再交付原图；后一步失败时保留记录和缓存原图供恢复。
    [IO.File]::Move($requestStagingFile, $requestRecordPath, $false)
    $requestStagingFile = $null
    $requestRecordSaved = $true
    [IO.File]::Move($stagingFile, $destination, $false)
    $stagingFile = $null
    $result = [pscustomobject]@{
        path = $destination; width = $width; height = $height; sha256 = $sha256
        generator = 'codex-imagegen'; generatorVersion = $generatorVersion; authMode = 'ChatGPT'; threadId = $threadId
        requestRecordPath = $requestRecordPath; requestRecordSha256 = $requestRecordSha256
    }

    # 交付后仅删除本会话已归档的缓存副本，其他任务的缓存与会话保持独立。
    try {
        Remove-Item -LiteralPath $original.FullName
        if (-not (Get-ChildItem -LiteralPath $original.DirectoryName -Force | Select-Object -First 1)) {
            [IO.Directory]::Delete($original.DirectoryName)
        }
    } catch { Write-Warning "正式图稿已保存，但本次 Codex 图稿缓存未完全回收。会话 $threadId。" }
} catch {
    # 获取会话身份后的失败保留缓存，并向调用者提供恢复所需的定位信息。
    if ($threadId -and $requestRecordSaved) { throw "请求记录已保存，但原图交付失败。记录 $requestRecordPath，缓存会话 $threadId。$($_.Exception.Message)" }
    if ($threadId) { throw "生图结果尚未完整交付。缓存会话 $threadId。$($_.Exception.Message)" }
    throw
} finally {
    if ($outputStream) { $outputStream.Dispose() }
    if ($requestStream) { $requestStream.Dispose() }
    if ($stagingFile) {
        try { Remove-Item -LiteralPath $stagingFile } catch { Write-Warning "正式路径下的暂存文件未完全回收。$stagingFile" }
    }
    if ($requestStagingFile) {
        try { Remove-Item -LiteralPath $requestStagingFile } catch { Write-Warning "请求记录暂存文件未完全回收。$requestStagingFile" }
    }
    try {
        $resolvedRoot = Get-Item -LiteralPath $jobRootItem.FullName -ErrorAction SilentlyContinue
        $resolvedJob = Get-Item -LiteralPath $jobItem.FullName -ErrorAction SilentlyContinue
        if ($resolvedRoot -and -not ($resolvedRoot.Attributes -band [IO.FileAttributes]::ReparsePoint) -and $resolvedJob -and $resolvedJob.Parent.FullName -eq $resolvedRoot.FullName -and -not ($resolvedJob.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            Remove-Item -LiteralPath $resolvedJob.FullName -Recurse -Force
        }
    } catch { Write-Warning "本次生图临时目录未完全回收。$jobDirectory" }
}
$result | ConvertTo-Json -Depth 5 -Compress
