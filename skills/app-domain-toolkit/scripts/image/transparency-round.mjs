#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isDirectEntry } from "../../../app-skill-runtime/direct-entry.mjs";
import { decodePngRgba, encodePngRgba } from "../../../app-asset-workflow/scripts/png-raster.mjs";
import { removeBackgroundLocal } from "../../../app-asset-workflow/scripts/remove-background-local.mjs";
import { inspectTransparencyPixels, writeTransparencyPreviews } from "./transparent-raster.mjs";
import { keyGreenHair } from "./green-hair-key.mjs";

/** 对实际文件计算摘要，绑定用户查看和决定的版本。 */
function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** 读取真实文件及其内容摘要。 */
async function readEntry(path) {
  const file = resolve(path);
  const bytes = await readFile(file);
  return { file, bytes, sha256: digest(bytes) };
}

/** 复核记录引用的文件，避免用户决定落在已变更的图片上。 */
async function verifyEntry(entry) {
  if (!entry || typeof entry.file !== "string" || typeof entry.sha256 !== "string") throw new Error("轮次文件引用不完整");
  const actual = await readEntry(entry.file);
  if (actual.sha256 !== entry.sha256) throw new Error(`轮次文件内容已变化：${entry.file}`);
  return actual;
}

/** 读入不透明灰度遮罩，明确 RGB 通道承载遮罩数值。 */
async function readMask(path, image) {
  if (!path) return undefined;
  const source = await readEntry(path);
  const mask = decodePngRgba(source.bytes);
  if (mask.width !== image.width || mask.height !== image.height) throw new Error("遮罩尺寸必须与源图一致");
  for (let i = 0; i < mask.pixels.length; i += 4) {
    if (mask.pixels[i] !== mask.pixels[i + 1] || mask.pixels[i] !== mask.pixels[i + 2] || mask.pixels[i + 3] !== 255) {
      throw new Error("遮罩必须是不透明灰度 PNG");
    }
  }
  return { ...source, image: mask };
}

/** 输出可被现有遮罩生产合同消费的灰度 Alpha 图。 */
function alphaMaskImage(image) {
  const pixels = Buffer.alloc(image.pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = pixels[i + 1] = pixels[i + 2] = image.pixels[i + 3];
    pixels[i + 3] = 255;
  }
  return encodePngRgba(image.width, image.height, pixels);
}

/** 逐项验证已出示的候选图和预览，兼顾撤回及文件替换。 */
async function verifyRound(round) {
  if (round?.schema !== "transparency-round/1" || round.status !== "pending") throw new Error("轮次记录无效");
  if (round.transparency_preview?.source_file !== round.output?.file ||
      round.transparency_preview?.source_sha256 !== round.output?.sha256) throw new Error("预览未绑定当前候选");
  await verifyEntry(round.source);
  await verifyEntry(round.output);
  await verifyEntry(round.transparency_preview.light);
  await verifyEntry(round.transparency_preview.dark);
  if (round.mask_record) await verifyEntry({ file: round.mask_record.mask_file, sha256: round.mask_record.mask_sha256 });
}

/** 校验前一轮的人工返修或升级决定，并绑定其准确版本。 */
async function readPrevious(path, sourceFile) {
  const previousFile = await readEntry(path);
  const previous = JSON.parse(previousFile.bytes);
  await verifyRound(previous);
  const decisionFile = await readEntry(join(dirname(previousFile.file), "decision.json"));
  const decision = JSON.parse(decisionFile.bytes);
  if (decision.schema !== "transparency-decision/1" || decision.round_sha256 !== previousFile.sha256 ||
      !["revise", "upgrade"].includes(decision.decision) || !decision.user_ref?.trim()) {
    throw new Error("上一轮必须先有真实返修或升级决定");
  }
  return { round: previousFile.file, decision: decisionFile.file, round_sha256: previousFile.sha256, decision_sha256: decisionFile.sha256,
    source_changed: sourceFile !== previous.source.file && sourceFile !== previous.output.file };
}

/** 位于项目根内的交接路径改成正斜杠相对路径，以符合领域验证器。 */
function handoffPath(file) {
  const local = relative(process.cwd(), file);
  return local && local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local)
    ? local.split(sep).join("/") : file;
}

/** 依据给定透明遮罩生成结果，已有 Alpha 时仅允许进一步减少透明度。 */
function applyMask(image, mask, preserveAlpha) {
  const pixels = Buffer.from(image.pixels);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 3] = preserveAlpha ? Math.min(pixels[i + 3], mask.pixels[i]) : mask.pixels[i];
  }
  return { ...image, pixels };
}

/** 生产一次透明图，准备同版本双底预览并等待人工决定。 */
export async function prepareTransparencyRound(options) {
  if (!options?.source || !options.roundDir || !["hard-edge", "green-hair", "existing-alpha"].includes(options.route)) {
    throw new Error("需要 source、roundDir 和有效 route");
  }
  const source = await readEntry(options.source);
  const image = decodePngRgba(source.bytes);
  const previous = options.previousRound ? await readPrevious(options.previousRound, source.file) : null;
  const alphaMask = await readMask(options.alphaMask, image);
  const protectMask = await readMask(options.protectMask, image);
  if (options.route !== "green-hair" && protectMask) throw new Error("保护遮罩仅适用于绿底毛发");
  if (options.route !== "green-hair" && alphaMask && !previous) throw new Error("硬边或已有透明度的遮罩返修需要上一轮人工决定");
  const directory = resolve(options.roundDir);
  const outputFile = join(directory, "candidate.png");
  const roundFile = join(directory, "round.json");
  const maskFile = join(directory, "mask.png");
  const backgroundColor = options.backgroundColor ?? "#00FF00";
  const tolerance = options.tolerance ?? 24;
  const parameters = { backgroundColor, tolerance, backgroundTolerance: options.backgroundTolerance ?? 0, foregroundTolerance: options.foregroundTolerance ?? 255 };
  if (options.route === "hard-edge" && (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 64)) {
    throw new Error("硬边背景容差必须在 0 到 64 之间");
  }
  const inputAlpha = inspectTransparencyPixels(image);
  if (options.route === "existing-alpha" && (!inputAlpha.transparent_pixels || !inputAlpha.visible_pixels)) {
    throw new Error("已有透明通道路线要求实际透明像素及可见主体");
  }
  if (options.route === "hard-edge" && alphaMask && inputAlpha.transparent_pixels) throw new Error("硬边遮罩源图必须不透明");
  let outputImage;
  if (options.route === "green-hair") {
    outputImage = keyGreenHair(image, { ...parameters, protectMask: protectMask?.image, alphaMask: alphaMask?.image });
  } else if (alphaMask) {
    outputImage = applyMask(image, alphaMask.image, options.route === "existing-alpha");
  } else if (options.route === "existing-alpha") {
    outputImage = image;
  }
  if (outputImage) {
    const stats = inspectTransparencyPixels(outputImage);
    if (!stats.visible_pixels || !stats.transparent_pixels) throw new Error("候选图必须包含可见主体和透明像素");
  }
  // 素材审阅根独占首轮，后续轮次须使用同根中已作出决定的前一轮。
  await mkdir(dirname(directory), { recursive: true });
  const reviewRoot = await realpath(dirname(directory));
  if (previous && await realpath(dirname(dirname(previous.round))) !== reviewRoot) {
    throw new Error("上一轮与新轮次必须位于同一个素材审阅目录");
  }
  if (previous && await realpath(previous.round) !== await realpath(join(dirname(previous.round), "round.json"))) {
    throw new Error("上一轮必须引用其正式轮次记录");
  }
  const claim = previous ? join(dirname(previous.round), ".next-round.claim") : join(reviewRoot, ".first-round.claim");
  try {
    await writeFile(claim, JSON.stringify({ round: directory }), { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(previous ? "上一轮决定已用于生成后续轮次" : "素材审阅目录已有首轮，请提供上一轮");
    throw error;
  }
  let completed = false;
  try {
    // 每轮目录独占创建，已有记录及用户源文件不会被返修覆盖。
    await mkdir(directory);
    let attempt;
    if (options.route === "hard-edge" && !alphaMask) {
      const result = await removeBackgroundLocal({ sourceFile: source.file, outputFile, backgroundColor, tolerance, requireSolidBackground: true });
      if (result.status !== "PASS") throw new Error(`硬边去背失败：${result.failures.join(", ")}`);
      attempt = result.background_removal_attempt;
      // 选择硬边路线表达调用方已确认颜色分离，沿用实际纯色检查结果。
      attempt.evidence.parameters = { edge_profile: "hard-edge", color_separation_verified: true, tolerance };
      attempt.source_file = handoffPath(attempt.source_file);
      attempt.output_file = handoffPath(attempt.output_file);
    } else {
      const bytes = options.route === "existing-alpha" && !alphaMask ? source.bytes : encodePngRgba(image.width, image.height, outputImage.pixels);
      await writeFile(outputFile, bytes, { flag: "wx" });
    }
    const output = await readEntry(outputFile);
    outputImage = decodePngRgba(output.bytes);
    const preview = await writeTransparencyPreviews({ sourceFile: output.file, previewDirectory: join(directory, "previews") });
    const maskRoute = options.route === "green-hair" || Boolean(alphaMask);
    let maskRecord;
    if (maskRoute) {
      await writeFile(maskFile, alphaMaskImage(outputImage), { flag: "wx" });
      const mask = await readEntry(maskFile);
      maskRecord = {
        source_file: handoffPath(source.file), source_sha256: source.sha256, mask_file: handoffPath(mask.file), mask_sha256: mask.sha256,
        output_file: handoffPath(output.file), output_sha256: output.sha256, tool: options.route === "green-hair" ? "green-hair-key" : "alpha-mask",
        tool_version: "1", parameters: { ...parameters, ...(alphaMask ? { alpha_mask: alphaMask.file, alpha_mask_sha256: alphaMask.sha256 } : {}),
          ...(protectMask ? { protect_mask: protectMask.file, protect_mask_sha256: protectMask.sha256 } : {}) },
        evidence: "由实际源图、遮罩和透明输出生成，等待人工检查",
      };
    }
    const round = {
      schema: "transparency-round/1", status: "pending", route: options.route,
      transparency_strategy: maskRoute ? "mask-composition" : options.route === "hard-edge" ? "background-removal" : "direct-alpha",
      source: { file: source.file, sha256: source.sha256 }, output: { file: output.file, sha256: output.sha256 },
      parameters, ...(previous ? { previous } : {}), ...(attempt ? { background_removal_attempt: attempt } : {}),
      ...(maskRecord ? { mask_record: maskRecord } : {}),
      transparency_preview: { ...preview, inspection: { status: "pending" } },
    };
    await writeFile(roundFile, JSON.stringify(round, null, 2), { flag: "wx" });
    completed = true;
    return { round: roundFile, output: output.file, light: preview.light.file, dark: preview.dark.file, status: "pending" };
  } finally {
    // 生成失败释放本次预约，保留已经写入的材料供诊断和改用新目录重试。
    if (!completed) await unlink(claim);
  }
}

/** 保存唯一真实用户决定，并锁定候选图及双底预览。 */
export async function decideTransparencyRound(options) {
  if (!options?.round || !["adopt", "revise", "upgrade"].includes(options.decision) ||
      typeof options.userRef !== "string" || !options.userRef.trim()) throw new Error("决定必须包含轮次、有效选择与真实用户消息依据");
  if (options.decision === "revise" && (typeof options.feedback !== "string" || !options.feedback.trim())) throw new Error("返修必须提供用户的具体说明");
  const entry = await readEntry(options.round);
  const round = JSON.parse(entry.bytes);
  await verifyRound(round);
  const decision = {
    schema: "transparency-decision/1", decision: options.decision, user_ref: options.userRef.trim(),
    ...(options.feedback?.trim() ? { feedback: options.feedback.trim() } : {}),
    round: entry.file, round_sha256: entry.sha256, output: round.output,
    light: round.transparency_preview.light, dark: round.transparency_preview.dark, decided_at: new Date().toISOString(),
  };
  const decisionFile = join(dirname(entry.file), "decision.json");
  await writeFile(decisionFile, JSON.stringify(decision, null, 2), { flag: "wx" });
  return { ...decision, decision_file: decisionFile };
}

/** 严格解析命令行参数，避免错误拼写静默改变生产路线。 */
function parseArguments(args) {
  const [command, ...rest] = args;
  const valid = command === "prepare"
    ? ["source", "round-dir", "route", "background-color", "tolerance", "background-tolerance", "foreground-tolerance", "protect-mask", "alpha-mask", "previous-round"]
    : command === "decide" ? ["round", "decision", "user-ref", "feedback"] : [];
  if (!valid.length || rest.length % 2) throw new Error("命令需要 prepare 或 decide 及完整参数");
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = rest[i].startsWith("--") ? rest[i].slice(2) : "";
    if (!valid.includes(name) || Object.hasOwn(options, name) || !rest[i + 1] || rest[i + 1].startsWith("--")) throw new Error(`无效或重复参数：${rest[i]}`);
    options[name] = rest[i + 1];
  }
  const number = (name) => options[name] === undefined ? undefined : Number(options[name]);
  if (command === "prepare") return { command, options: {
    source: options.source, roundDir: options["round-dir"], route: options.route, backgroundColor: options["background-color"],
    tolerance: number("tolerance"), backgroundTolerance: number("background-tolerance"), foregroundTolerance: number("foreground-tolerance"),
    protectMask: options["protect-mask"], alphaMask: options["alpha-mask"], previousRound: options["previous-round"],
  } };
  return { command, options: { round: options.round, decision: options.decision, userRef: options["user-ref"], feedback: options.feedback } };
}

if (isDirectEntry(import.meta.url)) {
  try {
    const parsed = parseArguments(process.argv.slice(2));
    const result = parsed.command === "prepare" ? await prepareTransparencyRound(parsed.options) : await decideTransparencyRound(parsed.options);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ status: "FAIL", error: error.message }));
    process.exitCode = 1;
  }
}
