import { mkdtemp, rm } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

/** 将图片图集公共算法绑定到技术栈自己的合同、依赖和报告字段。 */
export function createImageAtlasTools({ core, readImageFrameSource, schema, contractMethod, contractKey, toolName, temporaryPrefix, includeRuntimeBinding } = {}) {
  const { VideoAtlasError, composeHorizontalAtlas, isObject, normalizeCommonAtlasOptions, nonEmptyString, preflightAtlasOutputs, processAtlasFrame, relativeUrl, renderAtlasPreview, requireStableContentRect, samePath, sha256Bytes, writeAtlasOutputs } = core ?? {};
  if ([VideoAtlasError, composeHorizontalAtlas, isObject, normalizeCommonAtlasOptions, nonEmptyString, preflightAtlasOutputs, processAtlasFrame, relativeUrl, renderAtlasPreview, requireStableContentRect, samePath, sha256Bytes, writeAtlasOutputs, readImageFrameSource, core?.[contractMethod]].some((item) => typeof item !== "function")) throw new TypeError("图片图集缺少必要的栈合同和来源依赖");
  if (![schema, contractMethod, contractKey, toolName, temporaryPrefix].every((item) => typeof item === "string" && item)) throw new TypeError("图片图集缺少栈配置");
  const IMAGE_ATLAS_SCHEMA = schema;
  const createAtlasContract = core[contractMethod];
  function normalizeImageAtlasPaths(input, projectRoot) {
    const root = resolve(projectRoot);
    /** 相对输出绑定素材所属项目，避免调用方工作目录改变产物位置。 */
    const resolveProjectPath = (path) => resolve(root, path);
    const sheetValue = input.outputSheet ?? input.output_sheet ?? input["output-sheet"];
    if (!nonEmptyString(sheetValue)) throw new VideoAtlasError("必须提供 output-sheet");
    const outputSheet = resolveProjectPath(sheetValue);
    const outputReportValue = input.outputReport ?? input.output_report ?? input["output-report"] ?? `${outputSheet.replace(/\.png$/iu, "")}.json`;
    // 只有显式指定播放预览路径才创建 HTML；显式空值不能伪装成未请求。
    const previewKey = ["outputPreview", "output_preview", "output-preview"].find((key) => Object.hasOwn(input, key));
    const outputPreviewValue = previewKey === undefined ? undefined : input[previewKey];
    if (!nonEmptyString(outputReportValue) || (previewKey !== undefined && !nonEmptyString(outputPreviewValue))) throw new VideoAtlasError("output-report 和显式 output-preview 必须是非空路径");
    const outputReport = resolveProjectPath(outputReportValue);
    const outputPreview = previewKey === undefined ? undefined : resolveProjectPath(outputPreviewValue);
    if (extname(outputSheet).toLowerCase() !== ".png") throw new VideoAtlasError("output-sheet 必须使用 .png 后缀");
    if (extname(outputReport).toLowerCase() !== ".json") throw new VideoAtlasError("output-report 必须使用 .json 后缀");
    if (outputPreview !== undefined && extname(outputPreview).toLowerCase() !== ".html" && extname(outputPreview).toLowerCase() !== ".htm") throw new VideoAtlasError("output-preview 必须使用 .html 或 .htm 后缀");
  
    const outputs = [outputSheet, outputReport, ...(outputPreview === undefined ? [] : [outputPreview])];
    for (let index = 0; index < outputs.length; index += 1) {
      for (let other = index + 1; other < outputs.length; other += 1) {
        if (samePath(outputs[index], outputs[other])) throw new VideoAtlasError("output-sheet、output-report 和 output-preview 必须使用不同路径");
      }
    }
    return { outputSheet, outputReport, outputPreview };
  }
  
  /** 将固定透明 cell 合并为水平图集并输出图片路线专属报告和预览。 */
  async function imagesToAtlas(input = {}) {
    if (!isObject(input)) throw new VideoAtlasError("图片图集配置必须是对象");
    const sourceManifest = input.sourceManifest ?? input.source_manifest ?? input["source-manifest"];
    const projectRoot = input.projectRoot ?? input.project_root ?? input["project-root"];
    if (!nonEmptyString(sourceManifest)) throw new VideoAtlasError("必须提供 source-manifest");
    if (!nonEmptyString(projectRoot)) throw new VideoAtlasError("必须提供 project-root");
    const paths = normalizeImageAtlasPaths(input, projectRoot);
  
    // readImageFrameSource 已复算来源身份；后续仅使用它返回的已校验字节 Map。
    const loaded = await readImageFrameSource(sourceManifest, { projectRoot });
    const source = loaded.source;
    const frameCount = Math.round(source.duration_ms * source.fps / 1000);
    if (!Number.isSafeInteger(frameCount) || frameCount < 2) throw new VideoAtlasError("来源时间轴必须至少包含两个播放帧");
    const sourceFrames = source.frames
      .filter((frame) => frame.index < frameCount)
      .sort((first, second) => first.index - second.index);
    if (sourceFrames.length !== frameCount || sourceFrames.some((frame, index) => frame.index !== index)) {
      throw new VideoAtlasError("来源帧必须完整覆盖播放槽位 0..N-1");
    }
  
    const sourceFiles = new Set([loaded.manifestPath]);
    for (const file of loaded.files.values()) sourceFiles.add(file.absolutePath);
    await preflightAtlasOutputs(
      [paths.outputSheet, paths.outputReport, ...(paths.outputPreview === undefined ? [] : [paths.outputPreview])],
      [...sourceFiles],
      "图片来源文件",
    );
  
    // 时间轴永远服从来源清单；即使调用方带入多余的 fps/loop，也不会改变动画定义。
    const sharedOptions = normalizeCommonAtlasOptions({ ...input, fps: source.fps, loop: source.loop }, {
      outputSheet: paths.outputSheet,
      ...(includeRuntimeBinding ? { projectRoot } : {}),
      defaultFps: source.fps,
      defaultLoop: source.loop,
    });
    const sourceWidth = source.canvas.width;
    const sourceHeight = source.canvas.height;
    if (sharedOptions.region && (
      sharedOptions.region.x + sharedOptions.region.width > sourceWidth
      || sharedOptions.region.y + sharedOptions.region.height > sourceHeight
    )) {
      throw new VideoAtlasError(`region (${sharedOptions.region.x},${sharedOptions.region.y},${sharedOptions.region.width},${sharedOptions.region.height}) 超出来源画布 ${sourceWidth}x${sourceHeight}`);
    }
    const regionWidth = sharedOptions.region?.width ?? sourceWidth;
    const regionHeight = sharedOptions.region?.height ?? sourceHeight;
    const sourceAnchor = sharedOptions.anchor ?? { x: regionWidth / 2, y: regionHeight - 1 };
    if (sourceAnchor.x > regionWidth || sourceAnchor.y > regionHeight) {
      throw new VideoAtlasError(`anchor (${sourceAnchor.x},${sourceAnchor.y}) 超出区域 ${regionWidth}x${regionHeight}`);
    }
    const cellWidth = sharedOptions.width ?? (sharedOptions.height === null ? regionWidth : Math.max(1, Math.round(regionWidth * sharedOptions.height / regionHeight)));
    const cellHeight = sharedOptions.height ?? (sharedOptions.width === null ? regionHeight : Math.max(1, Math.round(regionHeight * sharedOptions.width / regionWidth)));
    const sheetWidth = cellWidth * frameCount;
    if (cellWidth > sharedOptions.maxAtlasWidth || cellHeight > sharedOptions.maxAtlasHeight) {
      throw new VideoAtlasError(`单帧尺寸 ${cellWidth}x${cellHeight} 超过最大图集尺寸 ${sharedOptions.maxAtlasWidth}x${sharedOptions.maxAtlasHeight}`);
    }
    if (sheetWidth > sharedOptions.maxAtlasWidth) {
      throw new VideoAtlasError(`水平图集尺寸 ${sheetWidth}x${cellHeight} 超过最大尺寸 ${sharedOptions.maxAtlasWidth}x${sharedOptions.maxAtlasHeight}`);
    }
  
    const temporaryDirectory = await mkdtemp(join(tmpdir(), temporaryPrefix));
    try {
      const frames = [];
      const frameImages = [];
      let contentRect = null;
      for (const frame of sourceFrames) {
        const validatedImage = loaded.files.get(frame.image.file);
        if (!validatedImage || !Buffer.isBuffer(validatedImage.bytes)) {
          throw new VideoAtlasError(`index=${frame.index} 的 image 缺少已校验字节：${frame.image.file}`);
        }
        const processed = await processAtlasFrame(
          validatedImage.bytes,
          frame.index,
          temporaryDirectory,
          sharedOptions,
          cellWidth,
          cellHeight,
        );
        if (contentRect === null) contentRect = processed.contentRect;
        else requireStableContentRect(contentRect, processed.contentRect);
        frameImages.push(processed.image);
        frames.push({
          index: frame.index,
          game_time_ms: frame.game_time_ms,
          source_image: frame.source_image,
          image: frame.image,
          generation_record: frame.generation_record,
          parents: frame.parents,
          width: cellWidth,
          height: cellHeight,
        });
      }
      const sheetBytes = await composeHorizontalAtlas(
        frameImages,
        cellWidth,
        cellHeight,
        sharedOptions.maxAtlasWidth,
        sharedOptions.maxAtlasHeight,
      );
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
      const animation = {
        key: sharedOptions.animationKey,
        texture_key: sharedOptions.textureKey,
        frame_rate: source.fps,
        loop: source.loop,
      };
      const stackContract = createAtlasContract({
        ...sharedOptions,
        fps: source.fps,
        loop: source.loop,
        outputSheet: paths.outputSheet,
      }, cell, frames.length);
      const previewHtml = paths.outputPreview === undefined ? undefined : renderAtlasPreview({
        sheetUrl: relativeUrl(dirname(paths.outputPreview), paths.outputSheet),
        sheetSha256: sheetHash,
        frameCount: frames.length,
        cell,
        fps: source.fps,
        loop: source.loop,
        compareTransparency: true,
      });
      const report = {
        schema: IMAGE_ATLAS_SCHEMA,
        status: "PASS",
        tool: { name: toolName, version: "1" },
        input: {
          source_manifest_path: loaded.manifestPath,
          source_manifest_sha256: loaded.manifestSha256,
          fps: source.fps,
          remove_background: sharedOptions.removeBackground,
          display_width: sourceWidth,
          display_height: sourceHeight,
          ...(sharedOptions.region ? { region: { ...sharedOptions.region } } : {}),
          ...(sharedOptions.anchor ? { anchor: { ...sharedOptions.anchor } } : {}),
        },
        settings: {
          fps: source.fps,
          width: cellWidth,
          height: cellHeight,
          remove_background: sharedOptions.removeBackground,
          ...(sharedOptions.region ? { region: { ...sharedOptions.region } } : {}),
          ...(sharedOptions.anchor ? { anchor: { ...sharedOptions.anchor } } : {}),
        },
        cell,
        frames,
        animation,
        [contractKey]: stackContract,
        ...(includeRuntimeBinding ? { runtime_binding: sharedOptions.runtimeBinding, runtime_url: sharedOptions.runtimeUrl } : {}),
        artifacts: {
          sheet: { file: includeRuntimeBinding ? (sharedOptions.runtimeBinding?.file ?? paths.outputSheet) : paths.outputSheet, width: sheetWidth, height: cellHeight, sha256: sheetHash },
          report: { file: paths.outputReport },
          ...(paths.outputPreview === undefined ? {} : { preview: { file: paths.outputPreview } }),
        },
      };
      await writeAtlasOutputs([
        [paths.outputSheet, sheetBytes],
        [paths.outputReport, Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8")],
        ...(paths.outputPreview === undefined ? [] : [[paths.outputPreview, Buffer.from(previewHtml, "utf8")]]),
      ]);
      return report;
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
  return { imagesToAtlas };
}
