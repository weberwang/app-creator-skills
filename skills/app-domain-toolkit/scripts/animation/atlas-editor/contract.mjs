import { readFile, realpath } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

/** 校验编辑产物的引用形状和摘要，沿用技术栈的路径规则。 */
export function validateEditedAtlasDeclaration(value, label, validateArtifact) {
  const errors = [];
  if (!Object.hasOwn(value ?? {}, "edited_atlas")) return errors;
  const edited = value.edited_atlas;
  for (const key of ["project", "runtime"]) {
    const path = `${label}.edited_atlas.${key}`;
    validateArtifact(edited?.[key], path, errors);
    if (!/^sha256:[0-9a-f]{64}$/u.test(edited?.[key]?.sha256 ?? "")) errors.push(`${path}.sha256 必须是 sha256:<hex> 摘要`);
  }
  const projectFile = edited?.project?.file;
  const runtimeFile = edited?.runtime?.file;
  if (typeof projectFile === "string" && typeof runtimeFile === "string"
    && (!/\.json$/iu.test(projectFile) || !/\.json$/iu.test(runtimeFile) || projectFile === runtimeFile)) {
    errors.push(`${label}.edited_atlas 必须绑定两个不同的 JSON 文件`);
  }
  return errors;
}

/** 原水平图集仍参与已有来源验收，正式消费列表可只绑定派生页。 */
export function sourceEvidenceAsset(asset) {
  if (!Object.hasOwn(asset?.frame_animation ?? {}, "edited_atlas")) return asset;
  const outputs = Array.isArray(asset.runtime_outputs) ? asset.runtime_outputs : [];
  return { ...asset, runtime_outputs: [...outputs, asset.frame_animation.spritesheet.file] };
}

/** 复建派生产物并核对接受候选实际声明的运行时文件。 */
export async function checkEditedAtlasFiles(asset, context, target) {
  const contract = asset.frame_animation;
  if (!Object.hasOwn(contract, "edited_atlas")) return [];
  const label = `${context.label ?? "asset.frame_animation"}.edited_atlas`;
  try {
    if (!context.projectRoot) throw new Error("必须提供 projectRoot");
    const { digest, loadWorkflow, verifyWorkflowBundle, withinProject } = await import("./workflow.mjs");
    const root = await realpath(context.projectRoot);
    /** 保留同一次读取的字节供解析，避免并发修改时两次读取不一致。 */
    const loadFile = async ({ file, sha256 }) => {
      const safeFile = await withinProject(root, file);
      const bytes = await readFile(safeFile);
      if (digest(bytes) !== sha256) throw new Error(`文件摘要不匹配：${file}`);
      return { file: safeFile, bytes };
    };
    const project = await loadFile(contract.edited_atlas.project);
    const runtime = await loadFile(contract.edited_atlas.runtime);
    const workflow = await loadWorkflow({ projectRoot: root, report: contract.quality_report.file, sheet: contract.spritesheet.file, target });
    const manifest = await verifyWorkflowBundle(workflow, JSON.parse(project.bytes), runtime.file, root, runtime.bytes);
    if (manifest.target !== target) throw new Error(`目标引擎必须为 ${target}`);
    const outputs = new Set((Array.isArray(asset.runtime_outputs) ? asset.runtime_outputs : []).map((path) => resolve(root, path)));
    for (const file of [runtime.file, ...manifest.pages.map(({ file }) => resolve(dirname(runtime.file), file))]) {
      if (!outputs.has(file)) throw new Error(`缺少运行时文件声明：${relative(root, file)}`);
    }
    return [];
  } catch (error) {
    return [`${label}：${error.message}`];
  }
}
