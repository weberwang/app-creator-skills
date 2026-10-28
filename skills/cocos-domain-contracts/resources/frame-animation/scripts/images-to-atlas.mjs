#!/usr/bin/env node
import { mkdtemp, rm } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { isDirectEntry } from "../../../../app-skill-runtime/direct-entry.mjs";
import * as core from "./frame-atlas-core.mjs";
import { readImageFrameSource } from "./image-frame-source.mjs";
import { createImageAtlasTools } from "../../../../app-domain-toolkit/scripts/animation/images-to-atlas.mjs";

export const IMAGE_ATLAS_SCHEMA = "cocos-image-atlas/2";
const { VideoAtlasError, composeHorizontalAtlas, isObject, normalizeCommonAtlasOptions, nonEmptyString, preflightAtlasOutputs, processAtlasFrame, relativeUrl, renderAtlasPreview, requireStableContentRect, samePath, sha256Bytes, writeAtlasOutputs, createCocosAtlasContract } = core;
const { imagesToAtlas } = createImageAtlasTools({ core, readImageFrameSource, schema: IMAGE_ATLAS_SCHEMA, contractMethod: "createCocosAtlasContract", contractKey: "cc", toolName: "cocos-images-to-atlas", temporaryPrefix: "cocos-image-atlas-", includeRuntimeBinding: false });
export { imagesToAtlas };

/** 返回图片来源打包 CLI 帮助，明确时间轴只能来自已校验清单。 */
export function imagesAtlasHelp() {
  return `用法：node images-to-atlas.mjs --source-manifest <source.json> --project-root <root> --output-sheet <sheet.png> [选项]

输入与输出：
  --source-manifest <file>      已确认的 cocos-image-frame-source/1 清单（必需）
  --project-root <dir>          来源文件所属项目目录；清单与相对输出均以此为根（必需）
  --output-sheet <file.png>     图集 PNG 的实际导入位置（静态引用默认建议 project-root/assets/animations/）
  --output-report <file.json>   JSON 报告（相对路径基于 project-root；默认与图集同名）
  --output-preview <file.html>  按需生成播放网页（相对路径基于 project-root）
  --creator-resource-path <path> 声明 resources.load 动态加载（文件须位于 assets/resources，键须精确对应相对路径）

处理选项：
  --width <pixels>              输出帧宽；单独指定时等比缩放
  --height <pixels>             输出帧高；单独指定时等比缩放
  --region <x,y,width,height>   按固定来源画布区域裁剪
  --anchor <x,y>                区域内动画锚点，默认水平居中、底边向上 1 像素
  --remove-background           移除硬边纯色背景
  --no-remove-background        保留来源 Alpha（默认）
  --edge-profile <hard-edge>    去背景前显式声明硬边纯色背景
  --color-separation-verified  确认主体颜色与去背色已分离
  --background-color <#RRGGBB>  去背景纯色
  --background-tolerance <n>    RGB 容差，默认 24
  --max-width <pixels>          图集最大宽度，默认 16384
  --max-height <pixels>         图集最大高度，默认 16384
  --animation-key <key>         Cocos 动画 key
  --texture-key <key>           Cocos 纹理 key

FPS 与 loop 固定读取来源清单，不能由 CLI 覆盖。预览提供播放、暂停、重播、逐帧选择及透明背景对比。

示例：
  静态引用：node images-to-atlas.mjs --source-manifest source.json --project-root . --output-sheet assets/animations/hero.png --width 128 --height 128 --anchor 384,767 --no-remove-background
  动态加载：node images-to-atlas.mjs --source-manifest source.json --project-root . --output-sheet assets/resources/animations/hero.png --width 128 --height 128 --anchor 384,767 --creator-resource-path animations/hero --no-remove-background
`;
}

/** 读取 CLI 参数，拒绝视频选项、未知参数和缺失值。 */
export function parseImagesAtlasArgs(argv = process.argv.slice(2)) {
  const options = {};
  const valueOptions = new Map([
    ["--source-manifest", "sourceManifest"], ["--project-root", "projectRoot"],
    ["--output-sheet", "outputSheet"], ["--output-report", "outputReport"], ["--output-preview", "outputPreview"],
    ["--width", "width"], ["--height", "height"], ["--region", "region"], ["--anchor", "anchor"],
    ["--background-color", "backgroundColor"], ["--background-tolerance", "backgroundTolerance"],
    ["--max-width", "maxAtlasWidth"], ["--max-height", "maxAtlasHeight"],
    ["--animation-key", "animationKey"], ["--texture-key", "textureKey"], ["--creator-resource-path", "creatorResourcePath"],
    ["--edge-profile", "edgeProfile"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = String(argv[index]);
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--remove-background") { options.removeBackground = true; continue; }
    if (argument === "--no-remove-background") { options.removeBackground = false; continue; }
    if (argument === "--color-separation-verified") { options.colorSeparationVerified = true; continue; }
    const separator = argument.indexOf("=");
    const name = separator >= 0 ? argument.slice(0, separator) : argument;
    if (!valueOptions.has(name)) throw new VideoAtlasError(`未知参数：${argument}`);
    const value = separator >= 0 ? argument.slice(separator + 1) : argv[++index];
    if (value === undefined || String(value).startsWith("--")) throw new VideoAtlasError(`${name} 缺少值`);
    const key = valueOptions.get(name);
    if (key === "region") {
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
    options[key] = ["width", "height", "backgroundTolerance", "maxAtlasWidth", "maxAtlasHeight"].includes(key) ? Number(value) : String(value);
  }
  return options;
}

/** 执行图片图集 CLI 并将失败统一映射到图片报告 schema。 */
export async function runImagesAtlasCli(argv = process.argv.slice(2), io = console) {
  try {
    const parsed = parseImagesAtlasArgs(argv);
    if (parsed.help) { io.log(imagesAtlasHelp()); return 0; }
    const report = await imagesToAtlas(parsed);
    io.log(JSON.stringify(report, null, 2));
    return 0;
  } catch (error) {
    io.error(JSON.stringify({ schema: IMAGE_ATLAS_SCHEMA, status: "FAIL", error: error.message }));
    return 2;
  }
}

// 保留源模块的守卫变量，供栈专属 CLI 读取当前入口信息。
const currentFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
// 只有直接执行时启动 CLI，导入时保持无副作用。
if (isDirectEntry(import.meta.url)) process.exitCode = await runImagesAtlasCli();
