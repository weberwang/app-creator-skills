import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readFile, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import sharp from "../../../../app-skill-runtime/sharp.mjs";
import { compileAtlas, PROJECT_SCHEMA, TARGETS, validateAtlasManifest, validateFrameSources, validateProject } from "./core.mjs";

const TARGET_BY_PREFIX = { cocos: "cocos", phaser4: "phaser", threejs: "threejs" };
/** 计算正式来源及产物的实际字节摘要。 */
export const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

/** 读取已存在的项目文件，校验真实路径以排除符号链接逃逸。 */
export async function withinProject(root, file) {
  const resolved = await realpath(resolve(root, file));
  const fromRoot = relative(root, resolved);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`文件必须位于项目目录内：${file}`);
  }
  return resolved;
}

/** 解码并检查真实 PNG，输出标准 8 位 RGBA 供打包器和读回共用。 */
export async function decodePng(bytes, width, height) {
  const image = sharp(bytes, { limitInputPixels: 64 * 1024 * 1024 });
  const metadata = await image.metadata();
  if (metadata.format !== "png" || (metadata.pages ?? 1) !== 1
    || metadata.width !== width || metadata.height !== height) {
    throw new Error(`PNG 格式或尺寸与清单不符，预期 ${width} × ${height}`);
  }
  const data = await image.toColourspace("srgb").ensureAlpha().raw().toBuffer();
  return { width, height, data };
}

/** 用固定参数编码 PNG，网页正式导出和 CLI 复建共用同一路径。 */
export function encodePng({ width, height, data }) {
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/** 导入 V4 已确认的原始 PNG 清单，供 Unity 等直接产出序列图的项目使用。 */
export async function loadSourceSequence(options) {
  const root = await realpath(options.projectRoot ?? process.cwd());
  const bytes = await readFile(await withinProject(root, options.source));
  const source = JSON.parse(bytes);
  if (source?.schema !== "frame-atlas-source/1" || !Array.isArray(source.frames)) throw new Error("需要 frame-atlas-source/1 帧序列清单");
  const { canvas, anchor, name, fps, loop } = source;
  const project = validateProject({
    schema: PROJECT_SCHEMA, name, fps, loop, canvas, anchor, origin: { sourceSha256: digest(bytes) },
    settings: { padding: 1, maxSize: 2048, target: options.target ?? "unity" },
    frames: source.frames.map((frame, index) => ({
      id: `frame-${index}`, source: frame.file, width: canvas?.width, height: canvas?.height,
      durationMs: 1000 / fps, offset: { x: 0, y: 0 },
    })),
  });
  const images = new Map();
  for (const [index, frame] of project.frames.entries()) {
    const png = await readFile(await withinProject(root, frame.source));
    if (digest(png) !== source.frames[index].sha256) throw new Error(`来源 PNG 的 SHA-256 与清单不符：${frame.source}`);
    images.set(frame.id, (await decodePng(png, frame.width, frame.height)).data);
  }
  return { project, images };
}

/** 根据报告和真实 PNG 建立 V4 编辑工程，帧序与播放配置来自报告。 */
export async function loadWorkflow(options) {
  const root = await realpath(options.projectRoot ?? process.cwd());
  const reportPath = await withinProject(root, options.report);
  const reportBytes = await readFile(reportPath);
  const report = JSON.parse(reportBytes);
  const schema = /^(cocos|phaser4|threejs)-(image|video)-atlas\/(1|2)$/.exec(report?.schema);
  const target = options.target ?? TARGET_BY_PREFIX[schema?.[1]];
  if (!schema || schema[3] !== (schema[1] === "cocos" ? "2" : "1") || report.status !== "PASS" || !TARGETS.includes(target)) {
    throw new Error("需要 Cocos、Phaser 或 Three.js 的 V4 图片/视频图集 PASS 报告");
  }
  const { animation, frames, cell, artifacts } = report;
  const sheet = artifacts?.sheet;
  if (!sheet || typeof sheet.file !== "string" || !cell || cell.layout !== "horizontal" || !Array.isArray(frames)
    || frames.length !== cell.frame_count || frames.length === 0
    || !Number.isSafeInteger(cell.width) || cell.width <= 0 || !Number.isSafeInteger(cell.height) || cell.height <= 0
    || sheet.width !== cell.width * frames.length || sheet.height !== cell.height
    || frames.some((frame, index) => frame.index !== index || frame.width !== cell.width || frame.height !== cell.height)) {
    throw new Error("V4 报告的水平图集尺寸或帧序不一致");
  }
  const sheetPath = await withinProject(root, options.sheet ?? sheet.file);
  const sheetBytes = await readFile(sheetPath);
  const sheetSha256 = digest(sheetBytes);
  if (sheetSha256 !== sheet.sha256) throw new Error("V4 图集 SHA-256 与报告不符");
  const source = await decodePng(sheetBytes, sheet.width, sheet.height);
  const project = validateProject({
    schema: PROJECT_SCHEMA, name: animation?.key,
    canvas: { width: cell.width, height: cell.height }, anchor: cell.target_anchor,
    loop: animation?.loop, fps: animation?.frame_rate, origin: { reportSha256: digest(reportBytes), sheetSha256 },
    frames: frames.map(({ index }) => ({
      id: `frame-${index}`, source: `${basename(sheetPath)}#${index}`, width: cell.width, height: cell.height,
      durationMs: 1000 / animation.frame_rate, offset: { x: 0, y: 0 },
    })),
    settings: { padding: 1, maxSize: 2048, target },
  });
  const images = new Map();
  for (const [index, frame] of project.frames.entries()) {
    const data = new Uint8Array(frame.width * frame.height * 4);
    for (let y = 0; y < frame.height; y += 1) {
      const from = (y * source.width + index * frame.width) * 4;
      data.set(source.data.subarray(from, from + frame.width * 4), y * frame.width * 4);
    }
    images.set(frame.id, data);
  }
  return { project, images };
}

/** 允许重排与偏移，锁定来源身份、各帧时长和公共播放参数。 */
export function bindWorkflowProject(project, sourceProject) {
  validateProject(project);
  /** 提取 V4 输入确定的公共配置。 */
  const header = (value) => [value.name, value.canvas, value.anchor, value.fps, value.loop, value.origin];
  if (!isDeepStrictEqual(header(project), header(sourceProject))) {
    throw new Error("工程配置的来源、公共锚点或播放参数与 V4 输入不一致");
  }
  validateFrameSources(project.frames, sourceProject.frames, { lockDuration: true });
  return project;
}

/** 生成正式图集，附上实际 PNG 摘要以绑定读回与下游使用。 */
export async function buildWorkflowBundle(workflow, editedProject) {
  const project = bindWorkflowProject(editedProject ?? workflow.project, workflow.project);
  const { manifest, pages } = compileAtlas(project, workflow.images);
  const files = [];
  for (const [index, page] of pages.entries()) {
    const bytes = await encodePng(page);
    manifest.pages[index].sha256 = digest(bytes);
    files.push({ file: manifest.pages[index].file, bytes });
  }
  return { project, manifest, files };
}

/** 用同一已校验来源复建清单与像素，核对当前审批候选的真实文件。 */
export async function verifyWorkflowBundle(workflow, project, runtimeFile, projectRoot, runtimeBytes) {
  const expected = await buildWorkflowBundle(workflow, project);
  const folder = dirname(runtimeFile);
  const actual = validateAtlasManifest(JSON.parse(runtimeBytes ?? await readFile(runtimeFile)));
  if (!isDeepStrictEqual(actual, expected.manifest)) throw new Error("运行时清单与 V4 工程配置的复建结果不一致");
  for (const [index, { file, bytes }] of expected.files.entries()) {
    const candidate = await readFile(await withinProject(projectRoot, resolve(folder, file)));
    if (digest(candidate) !== actual.pages[index].sha256 || !candidate.equals(bytes)) {
      throw new Error(`实际图集页与 V4 工程配置的复建结果不一致：${file}`);
    }
  }
  return actual;
}
