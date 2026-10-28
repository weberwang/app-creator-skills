#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { isDirectEntry } from "../../../../app-skill-runtime/direct-entry.mjs";
import sharp from "../../../scripts/runtime/image-runtime.mjs";
import * as core from "./frame-atlas-core.mjs";
import { createVideoAtlasTools } from "../../../../app-domain-toolkit/scripts/animation/video-to-atlas.mjs";
export const VIDEO_ATLAS_SCHEMA = "cocos-video-atlas/2";
const { VideoAtlasError, composeHorizontalAtlas, isObject, normalizeCommonAtlasOptions, nonEmptyString, preflightAtlasOutputs, processAtlasFrame, relativeUrl, renderAtlasPreview, requireStableContentRect, samePath, sha256Bytes, writeAtlasOutputs, createCocosAtlasContract } = core;
const tools = createVideoAtlasTools({ core, sharp, schema: VIDEO_ATLAS_SCHEMA, contractMethod: "createCocosAtlasContract", contractKey: "cc", toolName: "cocos-video-to-atlas", temporaryPrefix: "cocos-video-atlas-", includeRuntimeBinding: false });
export { VideoAtlasError };
export const { normalizeVideoAtlasOptions, runExternalCommand, renderVideoAtlasPreview, videoToAtlas } = tools;
/** 维持技术栈公开合同函数的名称与参数签名。 */
export function createCocosVideoAtlasContract(options, cell, frameCount) { return tools.createVideoAtlasContract(options, cell, frameCount); }

/** 返回参数说明，列明抽帧、缩放、背景移除和最大尺寸选项。 */
export function videoAtlasHelp() {
  return `用法：node video-to-atlas.mjs --input-video <video> --output-sheet <sheet.png> [选项]

输入与输出：
  --input-video <file>          输入视频（必需）
  --output-sheet <file.png>     水平图集 PNG 的实际导入位置（静态引用默认建议 assets/animations/）
  --output-report <file.json>   JSON 报告（默认与图集同名）
  --output-preview <file.html>  按需生成播放网页
  --creator-resource-path <path> 声明 resources.load 动态加载（文件须位于 assets/resources，键须精确对应相对路径）

处理选项：
  --fps <number>                抽帧与动画播放帧率，默认 12
  --width <pixels>              输出帧宽；单独指定时等比缩放
  --height <pixels>             输出帧高；单独指定时等比缩放
  --region <x,y,width,height>   按解码画布左上角坐标裁剪区域
  --anchor <x,y>                动画区域内的局部像素锚点，默认水平居中、底边向上 1 像素
  --remove-background           移除背景，默认色为 #00ff00
  --edge-profile <hard-edge>    去背景前显式声明硬边纯色背景
  --color-separation-verified  确认主体颜色与去背色已分离
  --background-color <#RRGGBB>  去背景纯色
  --background-tolerance <n>    RGB 容差，默认 24
  --max-width <pixels>          图集最大宽度，默认 16384
  --max-height <pixels>         图集最大高度，默认 16384
  --animation-key <key>         Cocos 动画 key
  --texture-key <key>           Cocos 纹理 key
  --no-loop                     禁用循环
  --ffmpeg <path>               ffmpeg 可执行文件路径
  --ffprobe <path>              ffprobe 可执行文件路径

示例：
  静态引用：node video-to-atlas.mjs --input-video walk.mp4 --output-sheet assets/animations/hero-attack.png
  动态加载：node video-to-atlas.mjs --input-video walk.mp4 --output-sheet assets/resources/animations/hero-attack.png --creator-resource-path animations/hero-attack
`;
}

/** 读取 CLI 参数，拒绝未知选项和缺失值。 */
export function parseVideoAtlasArgs(argv = process.argv.slice(2)) {
  const options = {};
  const valueOptions = new Map([
    ["--input-video", "inputVideo"], ["--output-sheet", "outputSheet"], ["--output-report", "outputReport"], ["--output-preview", "outputPreview"],
    ["--fps", "fps"], ["--width", "width"], ["--height", "height"], ["--region", "region"], ["--anchor", "anchor"], ["--background-color", "backgroundColor"], ["--background-tolerance", "backgroundTolerance"],
    ["--max-width", "maxAtlasWidth"], ["--max-height", "maxAtlasHeight"], ["--animation-key", "animationKey"], ["--texture-key", "textureKey"], ["--creator-resource-path", "creatorResourcePath"],
    ["--edge-profile", "edgeProfile"], ["--ffmpeg", "ffmpegPath"], ["--ffprobe", "ffprobePath"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = String(argv[index]);
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--remove-background") { options.removeBackground = true; continue; }
    if (argument === "--color-separation-verified") { options.colorSeparationVerified = true; continue; }
    if (argument === "--no-loop") { options.loop = false; continue; }
    const separator = argument.indexOf("=");
    const name = separator >= 0 ? argument.slice(0, separator) : argument;
    if (!valueOptions.has(name)) throw new VideoAtlasError(`未知参数：${argument}`);
    const value = separator >= 0 ? argument.slice(separator + 1) : argv[++index];
    if (value === undefined || String(value).startsWith("--")) throw new VideoAtlasError(`${name} 缺少值`);
    const key = valueOptions.get(name);
    if (key === "region") {
      // CLI 先拆成四个原始坐标字段，再由 API 共用的规范器统一检查整数与边界。
      const coordinates = String(value).split(",");
      if (coordinates.length !== 4 || coordinates.some((coordinate) => coordinate.trim() === "")) {
        throw new VideoAtlasError("--region 必须按 x,y,width,height 提供四个像素整数");
      }
      options.region = { x: coordinates[0].trim(), y: coordinates[1].trim(), width: coordinates[2].trim(), height: coordinates[3].trim() };
      continue;
    }
    if (key === "anchor") {
      const coordinates = String(value).split(",");
      if (coordinates.length !== 2 || coordinates.some((coordinate) => coordinate.trim() === "")) {
        throw new VideoAtlasError("--anchor 必须按 x,y 提供两个像素坐标");
      }
      const anchor = { x: Number(coordinates[0]), y: Number(coordinates[1]) };
      if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) || anchor.x < 0 || anchor.y < 0) {
        throw new VideoAtlasError("--anchor 坐标必须是非负有限数字");
      }
      options.anchor = anchor;
      continue;
    }
    options[key] = ["fps", "width", "height", "backgroundTolerance", "maxAtlasWidth", "maxAtlasHeight"].includes(key) ? Number(value) : String(value);
  }
  return options;
}

/** 执行 CLI 并将错误映射为稳定退出码；导入模块时不会启动命令行。 */
export async function runVideoAtlasCli(argv = process.argv.slice(2), io = console) {
  try {
    const parsed = parseVideoAtlasArgs(argv);
    if (parsed.help) { io.log(videoAtlasHelp()); return 0; }
    const report = await videoToAtlas(parsed);
    io.log(JSON.stringify(report, null, 2));
    return 0;
  } catch (error) {
    io.error(JSON.stringify({ schema: VIDEO_ATLAS_SCHEMA, status: "FAIL", error: error.message }));
    return 2;
  }
}

// 保留原守卫的文件身份，模块导入不触发命令行。
const currentFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (isDirectEntry(import.meta.url)) process.exitCode = await runVideoAtlasCli();
