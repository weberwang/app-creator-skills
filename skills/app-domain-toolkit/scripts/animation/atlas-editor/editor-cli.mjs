#!/usr/bin/env node
import { once } from "node:events";
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildWorkflowBundle, loadSourceSequence, loadWorkflow, verifyWorkflowBundle, withinProject } from "./workflow.mjs";
import { createEditorServer, listAdapterFiles } from "./server.mjs";

/** 先写完整暂存目录，再移交新目录，避免失败时留下部分正式产物。 */
async function writeBundle(destination, bundle) {
  const output = resolve(destination);
  try {
    await lstat(output);
    throw new Error(`目标路径已存在：${output}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(output), { recursive: true });
  const staging = await mkdtemp(join(dirname(output), ".frame-atlas-"));
  try {
    for (const { file, bytes } of bundle.files) await writeFile(join(staging, file), bytes);
    await writeFile(join(staging, "animation.json"), JSON.stringify(bundle.manifest, null, 2) + "\n");
    await writeFile(join(staging, "project.json"), JSON.stringify(bundle.project, null, 2) + "\n");
    for (const { name, path } of await listAdapterFiles(bundle.manifest.target)) {
      const adapter = join(staging, "adapter", name);
      await mkdir(dirname(adapter), { recursive: true });
      await cp(path, adapter);
    }
    await rename(staging, output);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return output;
}

/** 提供本地编辑、正式导出复建和产物回读三个工作流命令。 */
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "project-root": { type: "string" }, report: { type: "string" }, sheet: { type: "string" }, source: { type: "string" },
      target: { type: "string" }, port: { type: "string" }, edits: { type: "string" },
      out: { type: "string" }, runtime: { type: "string" }, help: { type: "boolean", short: "h" },
    },
  });
  const [action = "serve"] = positionals;
  if (values.help) {
    console.log(
      "编辑：node editor-cli.mjs serve [--project-root <目录> --report <报告> [--sheet <原图集>]] [--target <引擎>] [--port 4177]\n"
      + "导出：node editor-cli.mjs build --report <报告> [--sheet <原图集>] [--edits <project.json>] --out <新目录>\n"
      + "读回：node editor-cli.mjs verify --report <报告> [--sheet <原图集>] --edits <project.json> --runtime <animation.json>\n"
      + "已确认 PNG 序列可用 --source <帧清单> 代替 --report。引擎取值：cocos、phaser、threejs、unity。路径以 --project-root 为基准。",
    );
    return;
  }
  if (positionals.length > 1 || !["serve", "build", "verify"].includes(action)) throw new Error("无效命令，请使用 --help");
  const projectRoot = await realpath(values["project-root"] ?? process.cwd());
  if (values.source && (values.report || values.sheet)) throw new Error("--source 与 --report/--sheet 二选一");
  const input = { ...values, projectRoot };
  const workflow = values.source ? await loadSourceSequence(input) : values.report ? await loadWorkflow(input) : null;
  if (action === "serve") {
    const port = Number(values.port ?? 4177);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("端口必须介于 0 和 65535");
    const server = createEditorServer(workflow);
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
    console.log(`帧动画调试器已启动：http://127.0.0.1:${server.address().port}/`);
    return;
  }
  if (!workflow) throw new Error("需要 --report 或 --source");
  const project = values.edits ? JSON.parse(await readFile(await withinProject(projectRoot, values.edits))) : workflow.project;
  if (action === "build") {
    if (!values.out) throw new Error("需要 --out");
    console.log(await writeBundle(resolve(projectRoot, values.out), await buildWorkflowBundle(workflow, project)));
  } else {
    if (!values.edits || !values.runtime) throw new Error("需要 --edits 和 --runtime");
    const manifest = await verifyWorkflowBundle(workflow, project, await withinProject(projectRoot, values.runtime), projectRoot);
    console.log(`图集读回通过：${manifest.frames.length} 帧，${manifest.pages.length} 页`);
  }
}

await main().catch((error) => {
  console.error(error.code === "EADDRINUSE" ? "端口已占用。复用已有编辑器，或为不同来源指定新端口。" : error.message);
  process.exitCode = 1;
});
