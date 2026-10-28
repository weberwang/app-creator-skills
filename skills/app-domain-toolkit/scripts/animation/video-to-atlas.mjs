import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

/** 将视频提取和写入步骤绑定到技术栈独立的资源合同与图像处理器。 */
export function createVideoAtlasTools({ core, sharp, schema, contractMethod, contractKey, toolName, temporaryPrefix, includeRuntimeBinding } = {}) {
  const { VideoAtlasError, composeHorizontalAtlas, isObject, normalizeCommonAtlasOptions, nonEmptyString, preflightAtlasOutputs, processAtlasFrame, relativeUrl, renderAtlasPreview, requireStableContentRect, samePath, sha256Bytes, writeAtlasOutputs } = core ?? {};
  if ([VideoAtlasError, composeHorizontalAtlas, isObject, normalizeCommonAtlasOptions, nonEmptyString, preflightAtlasOutputs, processAtlasFrame, relativeUrl, renderAtlasPreview, requireStableContentRect, samePath, sha256Bytes, writeAtlasOutputs, sharp, core?.[contractMethod]].some((item) => typeof item !== "function")) throw new TypeError("视频图集缺少必要的栈合同或图像依赖");
  if (![schema, contractMethod, contractKey, toolName, temporaryPrefix].every((value) => typeof value === "string" && value)) throw new TypeError("视频图集缺少技术栈配置");
  const VIDEO_ATLAS_SCHEMA = schema;
  const createAtlasContract = core[contractMethod];
  async function sha256File(path) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return `sha256:${hash.digest("hex")}`;
  }
  
  /** 解析 API/CLI 参数，提前派生输出名并检查输出路径之间的冲突。 */
  function normalizeVideoAtlasOptions(input = {}) {
    if (!isObject(input)) throw new VideoAtlasError("视频图集配置必须是对象");
    const videoValue = input.inputVideo ?? input.input_video ?? input["input-video"];
    const sheetValue = input.outputSheet ?? input.output_sheet ?? input["output-sheet"];
    if (!nonEmptyString(videoValue)) throw new VideoAtlasError("必须提供 input-video");
    if (!nonEmptyString(sheetValue)) throw new VideoAtlasError("必须提供 output-sheet");
  
    const inputVideo = resolve(videoValue);
    const outputSheet = resolve(sheetValue);
    const projectRootValue = includeRuntimeBinding ? (input.projectRoot ?? input.project_root ?? input["project-root"]) : undefined;
    const projectRoot = nonEmptyString(projectRootValue) ? resolve(projectRootValue) : undefined;
    const outputReportValue = input.outputReport ?? input.output_report ?? input["output-report"] ?? `${outputSheet.replace(/\.png$/iu, "")}.json`;
    // 只有显式指定播放预览路径才创建 HTML；显式空值不能伪装成未请求。
    const previewKey = ["outputPreview", "output_preview", "output-preview"].find((key) => Object.hasOwn(input, key));
    const outputPreviewValue = previewKey === undefined ? undefined : input[previewKey];
    if (!nonEmptyString(outputReportValue) || (previewKey !== undefined && !nonEmptyString(outputPreviewValue))) throw new VideoAtlasError("output-report 和显式 output-preview 必须是非空路径");
    const outputReport = resolve(outputReportValue);
    const outputPreview = previewKey === undefined ? undefined : resolve(outputPreviewValue);
    if (extname(outputSheet).toLowerCase() !== ".png") throw new VideoAtlasError("output-sheet 必须使用 .png 后缀");
    if (extname(outputReport).toLowerCase() !== ".json") throw new VideoAtlasError("output-report 必须使用 .json 后缀");
    if (outputPreview !== undefined && extname(outputPreview).toLowerCase() !== ".html" && extname(outputPreview).toLowerCase() !== ".htm") throw new VideoAtlasError("output-preview 必须使用 .html 或 .htm 后缀");
  
    const outputs = [outputSheet, outputReport, ...(outputPreview === undefined ? [] : [outputPreview])];
    for (let index = 0; index < outputs.length; index += 1) {
      for (let other = index + 1; other < outputs.length; other += 1) {
        if (samePath(outputs[index], outputs[other])) throw new VideoAtlasError("output-sheet、output-report 和 output-preview 必须使用不同路径");
      }
    }
  
    const commonOptions = normalizeCommonAtlasOptions(input, { outputSheet, ...(includeRuntimeBinding ? { projectRoot } : {}), defaultFps: 12, defaultLoop: true });
    const commandRunner = input.commandRunner ?? input.runCommand;
    if (commandRunner !== undefined && typeof commandRunner !== "function") throw new VideoAtlasError("commandRunner 必须是函数");
  
    return Object.freeze({
      inputVideo,
      outputSheet,
      ...(includeRuntimeBinding ? { projectRoot } : {}),
      outputReport,
      outputPreview,
      ...commonOptions,
      ffmpegPath: input.ffmpegPath ?? input.ffmpeg ?? "ffmpeg",
      ffprobePath: input.ffprobePath ?? input.ffprobe ?? "ffprobe",
      commandRunner,
    });
  }
  
  /** 使用 spawn 的 argv 形式运行命令，不经过 shell 或命令字符串拼接。 */
  async function runExternalCommand(command, args, options = {}) {
    return await new Promise((resolvePromise, rejectPromise) => {
      let child;
      try {
        child = spawn(command, args, { cwd: options.cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      } catch (error) {
        rejectPromise(new VideoAtlasError(`无法启动外部命令 ${command}：${error.message}`, { cause: error }));
        return;
      }
      const stdout = [];
      const stderr = [];
      child.stdout.on("data", (chunk) => stdout.push(chunk));
      child.stderr.on("data", (chunk) => stderr.push(chunk));
      child.once("error", (error) => rejectPromise(new VideoAtlasError(`无法启动外部命令 ${command}：${error.message}`, { cause: error })));
      child.once("close", (exitCode, signal) => {
        const result = { stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), exitCode, signal };
        if (exitCode !== 0) {
          const detail = result.stderr.toString("utf8").trim();
          rejectPromise(new VideoAtlasError(`${command} 退出码为 ${exitCode ?? "null"}${detail ? `：${detail}` : ""}`));
          return;
        }
        resolvePromise(result);
      });
    });
  }
  
  /** 调用默认或注入的命令运行器，并统一检查退出码与 stderr。 */
  async function invokeCommand(options, command, args, label) {
    let result;
    try {
      result = await (options.commandRunner ?? runExternalCommand)(command, args, { cwd: dirname(options.inputVideo) });
    } catch (error) {
      throw new VideoAtlasError(`${label}失败：${error.message}`, { cause: error });
    }
    if (typeof result === "string" || Buffer.isBuffer(result)) return Buffer.isBuffer(result) ? result.toString("utf8") : result;
    if (!isObject(result)) throw new VideoAtlasError(`${label}运行器必须返回命令结果`);
    const exitCode = result.exitCode ?? result.code ?? 0;
    if (exitCode !== 0) {
      const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : String(result.stderr ?? "");
      throw new VideoAtlasError(`${label}失败（退出码 ${exitCode}）${stderr.trim() ? `：${stderr.trim()}` : ""}`);
    }
    const stdout = result.stdout ?? "";
    return Buffer.isBuffer(stdout) ? stdout.toString("utf8") : String(stdout);
  }
  
  /** 解析 ffprobe 输出，按 codec_type 选择视频流并准确统计音轨是否存在。 */
  function parseVideoMetadata(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new VideoAtlasError(`ffprobe 返回无效 JSON：${error.message}`);
    }
    const streams = Array.isArray(parsed?.streams) ? parsed.streams : [];
    const stream = streams.find((candidate) => candidate?.codec_type === "video") ?? null;
    const hasAudio = streams.some((candidate) => candidate?.codec_type === "audio");
    if (!isObject(stream) || !Number.isInteger(stream.width) || !Number.isInteger(stream.height) || stream.width <= 0 || stream.height <= 0) {
      throw new VideoAtlasError("ffprobe 未返回有效视频流尺寸");
    }
    const duration = Number(stream.duration ?? parsed?.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0) throw new VideoAtlasError("ffprobe 未返回有效视频时长");
    const sourceFps = parseFrameRate(stream.avg_frame_rate) ?? parseFrameRate(stream.r_frame_rate);
    const rotationValue = stream.side_data_list?.find((entry) => entry?.rotation !== undefined)?.rotation ?? stream.tags?.rotate;
    const rotation = rotationValue === undefined ? 0 : Number(rotationValue);
    const dimensions = Number.isFinite(rotation) ? rotatedDimensions(stream.width, stream.height, rotation) : { width: stream.width, height: stream.height };
    return { width: stream.width, height: stream.height, displayWidth: dimensions.width, displayHeight: dimensions.height, duration, sourceFps, rotation: Number.isFinite(rotation) ? rotation : null, hasAudio };
  }
  
  /** 根据 ffprobe 旋转元数据预测 ffmpeg 自动旋转后的显示画布尺寸。 */
  function rotatedDimensions(width, height, angleDegrees) {
    const angle = ((angleDegrees % 360) + 360) % 360;
    if (Math.abs(angle - 90) < 0.01 || Math.abs(angle - 270) < 0.01) return { width: height, height: width };
    if (Math.abs(angle) < 0.01 || Math.abs(angle - 180) < 0.01) return { width, height };
    const radians = angle * Math.PI / 180;
    return {
      width: Math.ceil(Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))),
      height: Math.ceil(Math.abs(height * Math.cos(radians)) + Math.abs(width * Math.sin(radians))),
    };
  }
  
  /** 将 ffprobe 的分数帧率转换为有限正数，无法解析时返回 null。 */
  function parseFrameRate(value) {
    if (typeof value !== "string") return null;
    const [numerator, denominator = "1"] = value.split("/");
    const rate = Number(numerator) / Number(denominator);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }
  
  /** 规范十进制参数，避免科学计数法给 ffmpeg filter 带来平台差异。 */
  function formatDecimal(number) {
    return String(Number(number.toFixed(6)));
  }
  
  /** 从本地 PNG 帧目录读取 ffmpeg 输出的自然顺序文件列表。 */
  async function collectExtractedFrames(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /^frame-\d{8}\.png$/u.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
      .map((name) => join(directory, name));
  }
  
  /** 检查视频和输出不会通过解析路径指向同一文件，且输出默认不覆盖既有文件。 */
  async function preflightPaths(options) {
    let inputStats;
    try {
      inputStats = await stat(options.inputVideo);
    } catch (error) {
      throw new VideoAtlasError(`input-video 不可读：${options.inputVideo}（${error.message}）`);
    }
    if (!inputStats.isFile()) throw new VideoAtlasError("input-video 必须是普通文件");
    await preflightAtlasOutputs(
      [options.outputSheet, options.outputReport, ...(options.outputPreview === undefined ? [] : [options.outputPreview])],
      [options.inputVideo],
      "视频输入",
    );
  }
  
  /** 构造当前栈的视频图集合同。 */
  function createVideoAtlasContract(options, cell, frameCount) {
    return createAtlasContract(options, cell, frameCount);
  }
  
  /** 生成沿用共用播放器并带原视频对照栏的预览。 */
  function renderVideoAtlasPreview({ sheetUrl, sheetSha256, videoUrl, frameCount, cell, fps, loop, videoName }) {
    return renderAtlasPreview({
      sheetUrl, sheetSha256, frameCount, cell, fps, loop,
      source: { kind: "video", url: videoUrl, name: videoName },
    });
  }
  
  /** 复用帧动画共用处理器完成区域、去背景、contain 与透明 cell 归一化。 */
  async function processFrame(frameFile, index, temporaryDirectory, options, targetWidth, targetHeight) {
    const frame = await processAtlasFrame(frameFile, index, temporaryDirectory, options, targetWidth, targetHeight);
    return { index, sourceTimestamp: Number((index / options.fps).toFixed(6)), ...frame };
  }
  
  /** 将视频抽帧、可选去背景与尺寸处理后输出水平图集、JSON 报告和 HTML 预览。 */
  async function videoToAtlas(input = {}) {
    const options = normalizeVideoAtlasOptions(input);
    await preflightPaths(options);
  
    const videoSha256 = await sha256File(options.inputVideo);
    const probeArgs = [
      "-v", "error", "-show_entries", "stream=codec_type,width,height,avg_frame_rate,r_frame_rate,duration:stream_tags=rotate:stream_side_data=rotation:format=duration",
      "-of", "json", options.inputVideo,
    ];
    const probeText = await invokeCommand(options, options.ffprobePath, probeArgs, "ffprobe 媒体探测");
    const metadata = parseVideoMetadata(probeText);
    const estimatedSourceWidth = options.region?.width ?? metadata.displayWidth;
    const estimatedSourceHeight = options.region?.height ?? metadata.displayHeight;
    const estimatedCellWidth = options.width ?? (options.height === null ? estimatedSourceWidth : Math.max(1, Math.round(estimatedSourceWidth * options.height / estimatedSourceHeight)));
    const estimatedCellHeight = options.height ?? (options.width === null ? estimatedSourceHeight : Math.max(1, Math.round(estimatedSourceHeight * options.width / estimatedSourceWidth)));
    if (estimatedCellWidth > options.maxAtlasWidth || estimatedCellHeight > options.maxAtlasHeight) throw new VideoAtlasError(`单帧尺寸 ${estimatedCellWidth}x${estimatedCellHeight} 超过最大图集尺寸 ${options.maxAtlasWidth}x${options.maxAtlasHeight}`);
    const estimatedFrameCount = Math.max(1, Math.ceil(metadata.duration * options.fps));
    if (estimatedFrameCount * estimatedCellWidth > options.maxAtlasWidth) {
      throw new VideoAtlasError(`预计水平图集尺寸 ${estimatedFrameCount * estimatedCellWidth}x${estimatedCellHeight} 超过最大尺寸 ${options.maxAtlasWidth}x${options.maxAtlasHeight}`);
    }
  
    const temporaryDirectory = await mkdtemp(join(tmpdir(), temporaryPrefix));
    try {
      const framePattern = join(temporaryDirectory, "frame-%08d.png");
      const extractionArgs = [
        "-v", "error", "-nostdin", "-i", options.inputVideo, "-map", "0:v:0",
        "-vf", `fps=${formatDecimal(options.fps)}`,
        "-vsync", "0", "-start_number", "0", framePattern,
      ];
      await invokeCommand(options, options.ffmpegPath, extractionArgs, "ffmpeg 视频抽帧");
      const frameFiles = await collectExtractedFrames(temporaryDirectory);
      if (frameFiles.length === 0) throw new VideoAtlasError("ffmpeg 成功退出但没有生成任何帧");
      // 流旋转元数据在不同编码器中表现不一，首张 PNG 是 ffmpeg 自动旋转后的真实画布依据。
      const firstFrameMetadata = await sharp(frameFiles[0]).metadata();
      if (!Number.isInteger(firstFrameMetadata.width) || !Number.isInteger(firstFrameMetadata.height)) {
        throw new VideoAtlasError("ffmpeg 首帧 PNG 未包含有效尺寸");
      }
      const sourceWidth = firstFrameMetadata.width;
      const sourceHeight = firstFrameMetadata.height;
      if (options.region && (options.region.x + options.region.width > sourceWidth || options.region.y + options.region.height > sourceHeight)) {
        throw new VideoAtlasError(`region (${options.region.x},${options.region.y},${options.region.width},${options.region.height}) 超出首张解码画布 ${sourceWidth}x${sourceHeight}`);
      }
      const regionWidth = options.region?.width ?? sourceWidth;
      const regionHeight = options.region?.height ?? sourceHeight;
      const sourceAnchor = options.anchor ?? { x: regionWidth / 2, y: regionHeight - 1 };
      if (sourceAnchor.x > regionWidth || sourceAnchor.y > regionHeight) {
        throw new VideoAtlasError(`anchor (${sourceAnchor.x},${sourceAnchor.y}) 超出区域 ${regionWidth}x${regionHeight}`);
      }
      const cellWidth = options.width ?? (options.height === null ? regionWidth : Math.max(1, Math.round(regionWidth * options.height / regionHeight)));
      const cellHeight = options.height ?? (options.width === null ? regionHeight : Math.max(1, Math.round(regionHeight * options.width / regionWidth)));
      const sheetWidth = cellWidth * frameFiles.length;
      if (sheetWidth > options.maxAtlasWidth || cellHeight > options.maxAtlasHeight) {
        throw new VideoAtlasError(`水平图集尺寸 ${sheetWidth}x${cellHeight} 超过最大尺寸 ${options.maxAtlasWidth}x${options.maxAtlasHeight}`);
      }
  
      const frames = [];
      const frameImages = [];
      let contentRect = null;
      for (let index = 0; index < frameFiles.length; index += 1) {
        const frame = await processFrame(frameFiles[index], index, temporaryDirectory, options, cellWidth, cellHeight);
        if (contentRect === null) contentRect = frame.contentRect;
        else requireStableContentRect(contentRect, frame.contentRect);
        frames.push({ index, source_timestamp: frame.sourceTimestamp, source_sha256: frame.sourceSha256, width: cellWidth, height: cellHeight });
        frameImages.push(frame.image);
      }
      const sheetBytes = await composeHorizontalAtlas(frameImages, cellWidth, cellHeight, options.maxAtlasWidth, options.maxAtlasHeight);
      const sheetHash = sha256Bytes(sheetBytes);
      const targetAnchor = {
        x: contentRect.x + sourceAnchor.x * contentRect.width / regionWidth,
        y: contentRect.y + sourceAnchor.y * contentRect.height / regionHeight,
      };
      const cell = {
        width: cellWidth,
        height: cellHeight,
        source_anchor: sourceAnchor,
        content_rect: contentRect,
        target_anchor: targetAnchor,
        layout: "horizontal",
        frame_count: frames.length,
      };
      const animation = { key: options.animationKey, texture_key: options.textureKey, frame_rate: options.fps, loop: options.loop };
      const stackContract = createVideoAtlasContract(options, cell, frames.length);
      const previewHtml = options.outputPreview === undefined ? undefined : renderVideoAtlasPreview({
        sheetUrl: relativeUrl(dirname(options.outputPreview), options.outputSheet),
        sheetSha256: sheetHash,
        videoUrl: relativeUrl(dirname(options.outputPreview), options.inputVideo),
        frameCount: frames.length,
        cell,
        fps: options.fps,
        loop: options.loop,
        videoName: basename(options.inputVideo),
      });
      const report = {
        schema: VIDEO_ATLAS_SCHEMA,
        status: "PASS",
        tool: { name: toolName, version: "1" },
        input: {
          video_path: options.inputVideo,
          video_sha256: videoSha256,
          fps: options.fps,
          remove_background: options.removeBackground,
          width: metadata.width,
          height: metadata.height,
          display_width: sourceWidth,
          display_height: sourceHeight,
          rotation_degrees: metadata.rotation,
          source_fps: metadata.sourceFps,
          duration_seconds: metadata.duration,
          has_audio: metadata.hasAudio,
          ...(options.region ? { region: { ...options.region } } : {}),
          ...(options.anchor ? { anchor: { ...options.anchor } } : {}),
        },
        settings: {
          fps: options.fps,
          width: cellWidth,
          height: cellHeight,
          remove_background: options.removeBackground,
          ...(options.region ? { region: { ...options.region } } : {}),
          ...(options.anchor ? { anchor: { ...options.anchor } } : {}),
        },
        cell,
        frames,
        animation,
        [contractKey]: stackContract,
        ...(includeRuntimeBinding ? { runtime_binding: options.runtimeBinding, runtime_url: options.runtimeUrl } : {}),
        artifacts: {
          sheet: { file: includeRuntimeBinding ? (options.runtimeBinding?.file ?? options.outputSheet) : options.outputSheet, width: sheetWidth, height: cellHeight, sha256: sheetHash },
          report: { file: options.outputReport },
          ...(options.outputPreview === undefined ? {} : { preview: { file: options.outputPreview } }),
        },
      };
      const outputs = [
        [options.outputSheet, sheetBytes],
        [options.outputReport, Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8")],
        ...(options.outputPreview === undefined ? [] : [[options.outputPreview, Buffer.from(previewHtml, "utf8")]]),
      ];
      await writeAtlasOutputs(outputs);
      return report;
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
  return { normalizeVideoAtlasOptions, runExternalCommand, createVideoAtlasContract, renderVideoAtlasPreview, videoToAtlas };
}
