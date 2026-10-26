#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("../../app-skill-runtime/dependencies.cjs")("sharp");

const PALETTE = ["#FF3B30", "#007AFF", "#34C759", "#FF9500", "#AF52DE", "#00A7A7"];
const CSS_HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/** 输出位图编号确认脚本的调用方式。 */
function printHelp() {
  console.log(`usage: render-bitmap-confirmation.js [-h] --input INPUT --regions REGIONS --output OUTPUT

Render numbered bitmap candidate boxes on a copy of a frozen page image.

options:
  -h, --help         show this help message and exit
  --input INPUT
  --regions REGIONS
  --output OUTPUT`);
}

/**
 * 解析必需的输入图、区域映射和输出路径参数。
 * @param {string[]} argv 原始命令行参数。
 * @returns {{input: string, regions: string, output: string, help: boolean}}
 */
function parseArgs(argv) {
  const options = { input: null, regions: null, output: null, help: false };
  const names = new Set(["input", "regions", "output"]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      options.help = true;
      continue;
    }

    const equalsMatch = argument.match(/^--([^=]+)=(.*)$/s);
    if (equalsMatch && names.has(equalsMatch[1])) {
      options[equalsMatch[1]] = equalsMatch[2];
      continue;
    }

    const name = argument.startsWith("--") ? argument.slice(2) : null;
    if (!name || !names.has(name)) {
      throw new Error(`unrecognized arguments: ${argument}`);
    }
    index += 1;
    if (index >= argv.length || argv[index].startsWith("--")) {
      throw new Error(`argument --${name}: expected one argument`);
    }
    options[name] = argv[index];
  }

  if (!options.help) {
    const missing = [...names].filter((name) => !options[name]).map((name) => `--${name}`);
    if (missing.length > 0) {
      throw new Error(`the following arguments are required: ${missing.join(", ")}`);
    }
  }
  return options;
}

/**
 * 使用 Python round 的 ties-to-even 规则，保持临界缩放值下的线宽和字号一致。
 * @param {number} value 待取整数值。
 * @returns {number} 取整结果。
 */
function roundHalfEven(value) {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (Math.abs(fraction - 0.5) < Number.EPSILON * Math.max(1, Math.abs(value))) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(value);
}

/**
 * 读取并验证编号区域，防止越界、缺号或非矩形数据进入确认图。
 * @param {string} regionsPath 区域 JSON 路径。
 * @param {{width: number, height: number}} imageSize 输入图尺寸。
 * @returns {Array<{number: number, bounds: number[], color: string}>} 已校验区域。
 */
function loadRegions(regionsPath, imageSize) {
  const payload = JSON.parse(fs.readFileSync(regionsPath, "utf8"));
  const regions = payload.regions;
  if (!Array.isArray(regions) || regions.length === 0) {
    throw new Error("regions must be a non-empty list");
  }

  const numbers = new Set();
  const validated = regions.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`regions[${index}] must be an object`);
    }
    if (!Number.isInteger(item.number) || item.number < 1) {
      throw new Error(`regions[${index}].number must be a positive integer`);
    }
    if (!Array.isArray(item.bounds) || item.bounds.length !== 4 || !item.bounds.every(Number.isInteger)) {
      throw new Error(`regions[${index}].bounds must be [x, y, width, height]`);
    }

    const [x, y, boxWidth, boxHeight] = item.bounds;
    if (x < 0 || y < 0 || boxWidth < 1 || boxHeight < 1) {
      throw new Error(`regions[${index}] has invalid bounds`);
    }
    if (x + boxWidth > imageSize.width || y + boxHeight > imageSize.height) {
      throw new Error(`regions[${index}] exceeds image bounds`);
    }

    const color = item.color || PALETTE[(item.number - 1) % PALETTE.length];
    // SVG 作为绘制后端时必须限制为十六进制颜色，避免区域文件注入任意标记。
    if (typeof color !== "string" || !CSS_HEX_COLOR.test(color)) {
      throw new Error(`regions[${index}].color must be a CSS hex color`);
    }

    numbers.add(item.number);
    return { number: item.number, bounds: item.bounds, color };
  });

  const maximum = Math.max(...numbers);
  if (numbers.size !== maximum || !Array.from({ length: maximum }, (_, index) => index + 1).every((n) => numbers.has(n))) {
    throw new Error("distinct region numbers must be sequential from 1 without gaps");
  }
  return validated;
}

/**
 * 生成透明 SVG 覆盖层；白色外沿和彩色内沿确保深浅背景均可辨认。
 * @param {number} width 图像宽度。
 * @param {number} height 图像高度。
 * @param {Array<{number: number, bounds: number[], color: string}>} regions 已校验区域。
 * @returns {Buffer} SVG 内容。
 */
function createOverlaySvg(width, height, regions) {
  const scale = Math.max(1, Math.min(width, height) / 390);
  const outerWidth = Math.max(5, roundHalfEven(3 * scale));
  const innerWidth = Math.max(3, roundHalfEven(2 * scale));
  const radius = Math.max(15, roundHalfEven(12 * scale));
  const fontSize = Math.max(18, roundHalfEven(15 * scale));
  const badgeOutline = Math.max(2, roundHalfEven(2 * scale));
  const shapes = [];

  for (const region of regions) {
    const [x, y, boxWidth, boxHeight] = region.bounds;
    const right = x + boxWidth - 1;
    const bottom = y + boxHeight - 1;

    // 使用填充矩形模拟 Pillow 向内绘制的边框，避免 SVG 居中描边越过候选框边界。
    if (boxWidth > outerWidth * 2 && boxHeight > outerWidth * 2) {
      shapes.push(`<path d="M${x} ${y}H${right + 1}V${bottom + 1}H${x}Z M${x + outerWidth} ${y + outerWidth}V${bottom + 1 - outerWidth}H${right + 1 - outerWidth}V${y + outerWidth}Z" fill="#FFFFFF" fill-rule="evenodd"/>`);
    } else {
      shapes.push(`<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="#FFFFFF"/>`);
    }
    const inset = outerWidth;
    if (boxWidth > inset * 2 && boxHeight > inset * 2) {
      const innerX = x + inset;
      const innerY = y + inset;
      const innerRight = right - inset;
      const innerBottom = bottom - inset;
      shapes.push(`<path d="M${innerX} ${innerY}H${innerRight + 1}V${innerBottom + 1}H${innerX}Z M${innerX + innerWidth} ${innerY + innerWidth}V${innerBottom + 1 - innerWidth}H${innerRight + 1 - innerWidth}V${innerY + innerWidth}Z" fill="${region.color}" fill-rule="evenodd"/>`);
    }

    const centerX = Math.min(Math.max(x + radius, radius), width - radius);
    const centerY = Math.min(Math.max(y + radius, radius), height - radius);
    shapes.push(`<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${region.color}" stroke="#FFFFFF" stroke-width="${badgeOutline}"/>`);
    shapes.push(`<text x="${centerX}" y="${centerY}" fill="#FFFFFF" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="central">${region.number}</text>`);
  }

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes.join("")}</svg>`);
}

/**
 * 计算文件 SHA-256，供确认版本和内部清单绑定。
 * @param {string} filePath 文件路径。
 * @returns {Promise<string>} 十六进制摘要。
 */
async function sha256(filePath) {
  const digest = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) {
    digest.update(chunk);
  }
  return digest.digest("hex");
}

/**
 * 比较两个路径是否指向同一位置；已存在的符号链接会先解析到真实目标。
 * @param {string} firstPath 第一个绝对路径。
 * @param {string} secondPath 第二个绝对路径。
 * @returns {boolean} 是否为同一位置。
 */
function pathsReferToSameLocation(firstPath, secondPath) {
  const first = fs.existsSync(firstPath) ? fs.realpathSync.native(firstPath) : firstPath;
  const second = fs.existsSync(secondPath) ? fs.realpathSync.native(secondPath) : secondPath;
  return path.relative(first, second) === "";
}

/**
 * 验证输入后生成保持原尺寸的 PNG 编号确认图。
 * @param {{input: string, regions: string, output: string}} options 已解析参数。
 */
async function renderConfirmation(options) {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  if (pathsReferToSameLocation(inputPath, outputPath)) {
    throw new Error("output must not overwrite the frozen input image");
  }

  const source = sharp(inputPath, { failOn: "error" });
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("unable to determine frozen input image dimensions");
  }

  const regions = loadRegions(options.regions, metadata);
  const overlay = createOverlaySvg(metadata.width, metadata.height, regions);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await source
    .ensureAlpha()
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 6, adaptiveFiltering: false, palette: false })
    .toFile(outputPath);

  const rendered = await sharp(outputPath).metadata();
  if (rendered.width !== metadata.width || rendered.height !== metadata.height) {
    throw new Error("rendered overlay dimensions changed unexpectedly");
  }

  console.log(JSON.stringify({ output: options.output, sha256: await sha256(outputPath) }));
}

/** 统一处理帮助、参数错误和渲染错误的退出码。 */
async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`render-bitmap-confirmation.js: error: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  try {
    await renderConfirmation(options);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();
