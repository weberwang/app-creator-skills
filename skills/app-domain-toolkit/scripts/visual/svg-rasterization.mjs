#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { linkSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from '../../../app-skill-runtime/sharp.mjs';
import { isSvgRasterDimension, SVG_RASTER_MAX_DIMENSION, SVG_RASTER_MAX_SOURCE_BYTES } from './svg-raster-limits.mjs';
import { checkedPath } from '../verification/file-identities.mjs';
import { readSvgSourceReview, SVG_RASTERIZATION_VERSION } from './svg-source-review.mjs';

const ELEMENTS = new Set(['svg', 'g', 'defs', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'filter', 'feGaussianBlur', 'feOffset',
  'feColorMatrix', 'feFlood', 'feComposite', 'feBlend', 'feMerge', 'feMergeNode', 'feComponentTransfer',
  'feFuncR', 'feFuncG', 'feFuncB', 'feFuncA', 'use', 'title', 'desc']);
const ATTRIBUTES = new Set(['id', 'xmlns', 'xmlns:xlink', 'version', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'fr', 'd', 'points', 'transform', 'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'stroke-dashoffset', 'opacity', 'display', 'visibility', 'clip-path', 'clip-rule', 'mask', 'filter', 'offset',
  'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'spreadMethod', 'clipPathUnits', 'maskUnits',
  'maskContentUnits', 'filterUnits', 'primitiveUnits', 'in', 'in2', 'result', 'stdDeviation', 'dx', 'dy', 'type',
  'values', 'flood-color', 'flood-opacity', 'operator', 'k1', 'k2', 'k3', 'k4', 'mode', 'tableValues', 'slope',
  'intercept', 'amplitude', 'exponent', 'preserveAspectRatio', 'href', 'xlink:href']);

/** 解析有限 SVG 元素、属性与内部引用，禁止依赖外部文件和动态内容。 */
function inspectSvg(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > SVG_RASTER_MAX_SOURCE_BYTES) throw new Error('SVG 必须是非空且不超过 4 MiB 的字节');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  // 除标准 XML 声明外，不允许实体、指令和声明改变解析结果或读取外部资源。
  const source = text.replace(/^\s*<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>/i, '');
  if (/[&\\\x00-\x08\x0b\x0c\x0e-\x1f]/.test(source) || /<\?|<!/i.test(source)) throw new Error('SVG 含不允许的实体、声明或转义');
  const tags = source.match(/<[^>]*>|[^<]+/g) ?? [];
  if (tags.join('') !== source) throw new Error('SVG 标签格式无效');
  const stack = [];
  const ids = new Set();
  const references = [];
  let root;
  let finished = false;
  for (const token of tags) {
    if (!token.startsWith('<')) {
      if (token.trim() && !['title', 'desc'].includes(stack.at(-1))) throw new Error('SVG 不允许文本节点');
      continue;
    }
    const close = token.match(/^<\/([A-Za-z][\w]*)\s*>$/);
    if (close) {
      if (stack.pop() !== close[1]) throw new Error('SVG 元素嵌套无效');
      if (!stack.length) finished = true;
      continue;
    }
    const start = token.match(/^<([A-Za-z][\w]*)([\s\S]*?)(\/?)>$/);
    if (!start || !ELEMENTS.has(start[1]) || finished || (root && !stack.length)) throw new Error('SVG 含不支持的元素或多个根');
    const [, name, raw, selfClosing] = start;
    if (!root && name !== 'svg') throw new Error('SVG 根元素必须是 svg');
    if (root && name === 'svg') throw new Error('SVG 不支持嵌套 svg');
    const attrs = {};
    let remaining = raw;
    while (remaining.trim()) {
      const attribute = remaining.match(/^\s+([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/s);
      if (!attribute || !ATTRIBUTES.has(attribute[1]) || Object.hasOwn(attrs, attribute[1])) throw new Error(`SVG ${name} 含不支持或重复的属性`);
      const [, key, , value] = attribute;
      if (/[<>]/.test(value) || (!['xmlns', 'xmlns:xlink'].includes(key)
        && /(?:https?:|file:|data:|javascript:|@import|expression\s*\()/i.test(value))) throw new Error('SVG 属性包含外部或动态内容');
      if (/url\s*\(/i.test(value)) {
        const match = value.match(/^url\(\s*#([A-Za-z_][\w.-]*)\s*\)$/);
        if (!match) throw new Error('SVG 仅支持本地 url(#id) 引用');
        references.push(match[1]);
      }
      if (key === 'href' || key === 'xlink:href') {
        if (!/^#[A-Za-z_][\w.-]*$/.test(value)) throw new Error('SVG 仅支持本地 href 引用');
        references.push(value.slice(1));
      }
      if (key === 'id') {
        if (!/^[A-Za-z_][\w.-]*$/.test(value) || ids.has(value)) throw new Error('SVG id 无效或重复');
        ids.add(value);
      }
      if (key === 'xmlns' && value !== 'http://www.w3.org/2000/svg') throw new Error('SVG 命名空间无效');
      if (key === 'xmlns:xlink' && value !== 'http://www.w3.org/1999/xlink') throw new Error('SVG xlink 命名空间无效');
      attrs[key] = value;
      remaining = remaining.slice(attribute[0].length);
    }
    if (!root) root = { token, attrs };
    if (!selfClosing) stack.push(name);
    else if (!stack.length) finished = true;
  }
  if (!root || stack.length || references.some((id) => !ids.has(id))) throw new Error('SVG 未闭合或本地引用不存在');
  const viewBox = root.attrs.viewBox?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
    throw new Error('SVG 必须提供有效正尺寸 viewBox');
  }
  return { source, root, viewBox };
}

/** 记录实际渲染依赖版本，供后续重新渲染时核对。 */
export function svgRasterizerVersion() {
  return `sharp/${sharp.versions.sharp};librsvg/${sharp.versions.rsvg};vips/${sharp.versions.vips}`;
}

/** 按正式目标尺寸直接渲染 SVG 并核验实际 Alpha。 */
export async function rasterizeSvg(svgBytes, { width, height, alpha } = {}) {
  if (![width, height].every(isSvgRasterDimension)
    || !['transparent', 'opaque'].includes(alpha)) throw new Error('输出尺寸或 Alpha 合同无效');
  const { source, root, viewBox } = inspectSvg(svgBytes);
  const viewRatio = viewBox[2] / viewBox[3];
  const outputRatio = width / height;
  if (!Number.isFinite(viewRatio) || Math.abs(viewRatio - outputRatio) > 1e-8 * outputRatio) {
    throw new Error('SVG viewBox 比例与正式输出尺寸不一致');
  }
  // 在根节点直接设定输出尺寸，让渲染器在目标分辨率绘制矢量，避免先栅格化再放大。
  const tag = root.token.replace(/\s+(?:width|height|preserveAspectRatio)\s*=\s*(["']).*?\1/gs, '')
    .replace(/^<svg/, `<svg width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"`);
  const input = Buffer.from(source.replace(root.token, tag));
  const png = await sharp(input, { limitInputPixels: SVG_RASTER_MAX_DIMENSION ** 2 }).png().toBuffer();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== width || info.height !== height) throw new Error('SVG 渲染输出尺寸不一致');
  let visible = false;
  let nonOpaque = false;
  for (let i = 3; i < data.length; i += 4) {
    visible ||= data[i] > 0;
    nonOpaque ||= data[i] < 255;
  }
  if (!visible || (alpha === 'transparent' && !nonOpaque) || (alpha === 'opaque' && nonOpaque)) throw new Error('SVG 输出的实际 Alpha 与合同不一致或图像为空');
  // 先确认所有像素不透明，再去掉空余通道，避免把误留的透明边烘成底色。
  return alpha === 'opaque' ? sharp(png).removeAlpha().png().toBuffer() : png;
}

/** 执行命令行转换并输出可追溯的 SVG 和 PNG 身份。 */
export async function main(argv = process.argv.slice(2)) {
  const args = {};
  let overwrite = false;
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i];
    if (name === '--overwrite') {
      if (overwrite) throw new Error('--overwrite 不能重复');
      overwrite = true;
      continue;
    }
    if (!['--source', '--output', '--width', '--height', '--alpha', '--source-review'].includes(name) || Object.hasOwn(args, name)
      || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('参数无效或重复');
    args[name] = argv[++i];
  }
  if (!args['--source-review']) throw new Error('转换正式图片前必须通过 --source-review 提供 SVG 源稿人工确认');
  if (Object.keys(args).length !== 6 || !/^[1-9]\d*$/.test(args['--width']) || !/^[1-9]\d*$/.test(args['--height'])
    || extname(args['--source']).toLowerCase() !== '.svg' || extname(args['--output']).toLowerCase() !== '.png') throw new Error('源必须为 SVG，输出必须为 PNG 且尺寸为正整数');
  const projectRoot = process.cwd();
  const sourcePath = checkedPath(projectRoot, args['--source'], 'SVG 源');
  const output = checkedPath(projectRoot, args['--output'], 'PNG 输出');
  const outputPath = output.absolute;
  const sourceStat = lstatSync(sourcePath.absolute);
  if (!sourceStat.isFile() || !sourceStat.size || sourceStat.size > SVG_RASTER_MAX_SOURCE_BYTES) {
    throw new Error('SVG 源必须是非空且不超过 4 MiB 的普通文件');
  }
  const source = readFileSync(sourcePath.absolute);
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  // 只渲染用户已审阅的这份 SVG 字节，未确认时不创建正式 PNG 或输出目录。
  const reviewRef = readSvgSourceReview(projectRoot, args['--source-review'], { sourcePath: sourcePath.relative, sourceSha256 });
  const width = Number(args['--width']); const height = Number(args['--height']); const alpha = args['--alpha'];
  const png = await rasterizeSvg(source, { width, height, alpha });
  mkdirSync(dirname(outputPath), { recursive: true });
  checkedPath(projectRoot, output.relative, 'PNG 输出');
  const temp = `${outputPath}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, png, { flag: 'wx' });
    // 硬链接创建会原子检查目标是否存在，避免并行任务覆盖已交付图片。
    if (overwrite) renameSync(temp, outputPath);
    else {
      try { linkSync(temp, outputPath); }
      catch (error) {
        if (error.code === 'EEXIST') throw new Error('PNG 输出已存在，需要显式 --overwrite 才能替换');
        throw error;
      }
    }
  }
  finally { rmSync(temp, { force: true }); }
  return { schema_version: SVG_RASTERIZATION_VERSION, source_file: sourcePath.relative, source_sha256: sourceSha256, source_review_ref: reviewRef,
    output_file: output.relative, output_sha256: createHash('sha256').update(png).digest('hex'), width, height, alpha,
    renderer: 'sharp', renderer_version: svgRasterizerVersion() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
