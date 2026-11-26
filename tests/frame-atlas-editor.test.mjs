import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { compileAtlas, getFramePlacement, prepareFrame, readAtlasFrame, validateAtlasManifest } from "../skills/app-domain-toolkit/scripts/animation/atlas-editor/core.mjs";
import { checkEditedAtlasFiles } from "../skills/app-domain-toolkit/scripts/animation/atlas-editor/contract.mjs";
import { createEditorServer, listAdapterFiles } from "../skills/app-domain-toolkit/scripts/animation/atlas-editor/server.mjs";
import { buildWorkflowBundle, digest, encodePng, loadSourceSequence, loadWorkflow } from "../skills/app-domain-toolkit/scripts/animation/atlas-editor/workflow.mjs";

/** 建立可区分方向的测试像素，保留半透明样本。 */
function rgba(width, height) {
  return Uint8Array.from({ length: width * height * 4 }, (_, i) => i % 4 === 3 ? 127 : i % 255);
}

/** 构造不同长宽与时长的测试帧。 */
function frame(id, width, height) {
  return { id, source: id + ".png", width, height, offset: { x: 0, y: 0 }, durationMs: 100 };
}

test("自动裁剪保留原始方向、半透明像素与带符号位移", () => {
  const input = frame("turn", 4, 3);
  input.offset = { x: -2, y: 1 };
  const source = new Uint8Array(4 * 3 * 4);
  source.set([255, 0, 0, 120], (4 + 1) * 4);
  source.set([0, 0, 255, 255], (4 + 2) * 4);
  const anchor = { x: 2, y: 1 };
  const result = prepareFrame(input, source);
  assert.deepEqual(result.bounds, { x: 1, y: 1, width: 2, height: 1 });
  assert.deepEqual([...result.data], [255, 0, 0, 120, 0, 0, 255, 255]);
  assert.deepEqual(getFramePlacement({ trimRect: result.bounds, offset: input.offset }, anchor), { x: -3, y: 1, width: 2, height: 1 });
});

test("非方形帧排版旋转和跨页保留有效像素与透明帧", () => {
  const frames = [frame("first", 5, 3), frame("second", 2, 4), frame("blank", 2, 2), frame("full", 6, 6)];
  const images = new Map(frames.map((item) => [item.id, rgba(item.width, item.height)]));
  images.get("blank").fill(0);
  // 让全页测试帧尺寸略小于允许的最大边，剩余帧仍会重新分配页面。
  const project = {
    schema: "frame-atlas-project/1", name: "test", canvas: { width: 6, height: 6 },
    fps: 10, loop: false, anchor: { x: 0, y: 0 }, frames,
    settings: { padding: 0, maxSize: 6, target: "threejs" },
  };
  const { manifest, pages } = compileAtlas(project, images);
  validateAtlasManifest(manifest);
  assert.equal(manifest.frames[1].packingRotation, 90);
  assert.equal(manifest.pages.length, 2);
  assert.equal(manifest.frames[2].empty, true);
  assert.deepEqual(readAtlasFrame(manifest, pages, 1).data, images.get("second"));
  assert.throws(() => validateAtlasManifest({ ...manifest, frames: [{ ...manifest.frames[0], durationMs: 0 }] }), /运行时帧/u);
  for (const target of ["unity", "phaser"]) {
    const fixed = compileAtlas({ ...project, settings: { ...project.settings, target } }, images);
    assert.ok(fixed.manifest.frames.every((item) => item.packingRotation === 0));
  }
  const swapped = compileAtlas({ ...project, frames: [...frames].reverse() }, images);
  assert.deepEqual(swapped.manifest.frames, [...manifest.frames].reverse());
  assert.deepEqual(swapped.pages, pages);
});

test("V4 服务导出、重新读回与 Unity 原生序列来源相连", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "frame-editor-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const png = await encodePng({ width: 4, height: 2, data: rgba(4, 2) });
  await writeFile(join(root, "source.png"), png);
  const report = {
    schema: "threejs-image-atlas/1", status: "PASS",
    animation: { key: "walk", frame_rate: 12, loop: true },
    cell: { width: 2, height: 2, frame_count: 2, layout: "horizontal", target_anchor: { x: 1, y: 1 } },
    frames: [{ index: 0, width: 2, height: 2 }, { index: 1, width: 2, height: 2 }],
    artifacts: { sheet: { file: "source.png", width: 4, height: 2, sha256: digest(png) } },
  };
  await writeFile(join(root, "report.json"), JSON.stringify(report));
  const workflow = await loadWorkflow({ projectRoot: root, report: "report.json" });
  const server = createEditorServer(workflow).listen(0, "127.0.0.1");
  context.after(() => new Promise((done) => server.close(done)));
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.match(await (await fetch(url)).text(), /帧动画/u);
  const value = await (await fetch(url + "/api/workflow")).json();
  assert.equal(value.sources.length, 2);
  assert.equal((await fetch(url + value.sources[0].url)).headers.get("content-type"), "image/png");
  const project = value.project;
  project.frames.reverse();
  project.frames[1].offset.x = -3;
  const response = await fetch(url + "/api/workflow/export", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(project),
  });
  assert.equal(response.status, 200);
  const { manifest, files } = await response.json();
  assert.deepEqual(manifest.frames.map(({ id }) => id), ["frame-1", "frame-0"]);
  assert.equal(manifest.frames[1].offset.x, -3);
  assert.deepEqual(manifest, (await buildWorkflowBundle(workflow, project)).manifest);
  for (const { file, base64 } of files) await writeFile(join(root, file), Buffer.from(base64, "base64"));
  const bindings = {};
  for (const [key, file, data] of [["project", "project.json", project], ["runtime", "animation.json", manifest]]) {
    const bytes = JSON.stringify(data);
    await writeFile(join(root, file), bytes);
    bindings[key] = { file, sha256: digest(bytes) };
  }
  const asset = {
    frame_animation: { quality_report: { file: "report.json" }, spritesheet: { file: "source.png" }, edited_atlas: bindings },
    runtime_outputs: ["animation.json", ...manifest.pages.map(({ file }) => file)],
  };
  assert.deepEqual(await checkEditedAtlasFiles(asset, { projectRoot: root }, "threejs"), []);
  await writeFile(join(root, files[0].file), "replaced");
  assert.match((await checkEditedAtlasFiles(asset, { projectRoot: root }, "threejs"))[0], /图集页.*不一致/u);
  const altered = structuredClone(project);
  altered.frames[1].durationMs += 1;
  await assert.rejects(buildWorkflowBundle(workflow, altered), /时间轴/u);
  altered.frames[1].durationMs = project.frames[1].durationMs;
  altered.frames[1].source = "another.png";
  await assert.rejects(buildWorkflowBundle(workflow, altered), /帧来源不匹配/u);
  assert.equal((await fetch(url + "/api/workflow", { headers: { origin: "http://example.test" } })).status, 403);

  await writeFile(join(root, "source.json"), JSON.stringify({
    schema: "frame-atlas-source/1", name: "unity-test", fps: 12, loop: true,
    canvas: { width: 4, height: 2 }, anchor: { x: 2, y: 1 },
    frames: [{ file: "source.png", sha256: digest(await readFile(join(root, "source.png"))) }],
  }));
  const sequence = await loadSourceSequence({ projectRoot: root, source: "source.json" });
  assert.equal((await buildWorkflowBundle(sequence)).manifest.target, "unity");
  for (const target of ["cocos", "phaser", "threejs", "unity"]) {
    const exported = await listAdapterFiles(target);
    assert.ok(exported.length >= 2);
    assert.ok(!exported.some(({ name }) => name.includes(".test.")));
    assert.equal((await fetch(url + exported[0].url)).status, 200);
  }
});
