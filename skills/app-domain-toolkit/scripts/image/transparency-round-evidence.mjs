import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** 将轮次中的本地路径限制在当前项目内，并解析实际文件身份。 */
function projectFile(root, path) {
  if (typeof path !== "string" || !path.trim()) throw new Error("文件引用缺失");
  const target = realpathSync(resolve(root, path));
  const child = relative(root, target);
  if (!child || child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child)) throw new Error("文件引用越出项目");
  return target;
}

/** 读取真实文件，并复算用户确认时记录的字节摘要。 */
function readEvidence(root, path) {
  const file = projectFile(root, path);
  const bytes = readFileSync(file);
  return { file, bytes, sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
}

/** 轮次和采用记录须共同绑定同一文件身份及其实际内容。 */
function verifyReviewedFile(root, candidate, chosen) {
  const evidence = readEvidence(root, candidate?.file);
  if (evidence.file !== projectFile(root, chosen?.file) || evidence.sha256 !== candidate.sha256 || evidence.sha256 !== chosen.sha256) {
    throw new Error("候选或双底预览已变化，须重新提交人工确认");
  }
  return evidence;
}

/** 正式生产入口复核逐轮工具的采用决定，以及精确的候选和双底预览。 */
export function validateTransparencyRoundAdoption(sourceFile, roundFile, { checkFiles, projectRoot } = {}) {
  if (!checkFiles || !projectRoot || (!sourceFile && !roundFile)) return [];
  try {
    const root = realpathSync(projectRoot);
    // 常规候选直接识别相邻的轮次记录，保留原 Alpha 等路径分离时使用显式引用。
    let reference = roundFile;
    if (reference === undefined) {
      if (typeof sourceFile !== "string" || basename(sourceFile) !== "candidate.png") return [];
      reference = join(dirname(projectFile(root, sourceFile)), "round.json");
    }
    let evidence;
    try { evidence = readEvidence(root, reference); }
    catch (error) { if (roundFile === undefined && error.code === "ENOENT") return []; throw error; }
    const round = JSON.parse(evidence.bytes);
    if (round.schema !== "transparency-round/1") throw new Error("轮次记录类型无效");
    const decision = JSON.parse(readEvidence(root, join(dirname(evidence.file), "decision.json")).bytes);
    if (decision.schema !== "transparency-decision/1" || decision.decision !== "adopt" ||
        typeof decision.user_ref !== "string" || !decision.user_ref.trim() ||
        projectFile(root, decision.round) !== evidence.file || decision.round_sha256 !== evidence.sha256) {
      throw new Error("缺少对本轮的有效人工采用决定");
    }
    const candidate = verifyReviewedFile(root, round.output, decision.output);
    if (candidate.sha256 !== readEvidence(root, sourceFile).sha256 ||
        candidate.file !== projectFile(root, round.transparency_preview?.source_file) ||
        candidate.sha256 !== round.transparency_preview.source_sha256) throw new Error("正式透明输入或预览与采用候选不一致");
    for (const side of ["light", "dark"]) verifyReviewedFile(root, round.transparency_preview[side], decision[side]);
    return [];
  } catch (error) {
    const reason = error.code === "ENOENT" ? "轮次尚未人工采用或对应文件缺失" : error.message;
    return [`透明素材逐轮确认未通过：${reason}`];
  }
}
