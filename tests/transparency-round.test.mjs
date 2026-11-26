import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { encodePngRgba, decodePngRgba } from "../skills/app-asset-workflow/scripts/png-raster.mjs";
import { prepareTransparencyRound, decideTransparencyRound } from "../skills/app-domain-toolkit/scripts/image/transparency-round.mjs";

/** 构造隔离的 3×3 PNG，中心像素可代表主体或半透明边缘。 */
async function fixture(t, center, background = [0, 255, 0, 255]) {
  const dir = await mkdtemp(join(tmpdir(), "transparency-round-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const pixels = Buffer.alloc(36);
  for (let i = 0; i < pixels.length; i += 4) pixels.set(background, i);
  pixels.set(center, 16);
  const source = join(dir, "source.png");
  await writeFile(source, encodePngRgba(3, 3, pixels));
  return { dir, source, pixels };
}

/** 读回轮次结果而不读取或判定任何视觉效果。 */
async function loadRound(result) {
  return JSON.parse(await readFile(result.round, "utf8"));
}

test("硬边生成待决定候选及双底，人工决定后才可采用", async (t) => {
  const f = await fixture(t, [255, 0, 0, 255]);
  const result = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r1"), route: "hard-edge" });
  const round = await loadRound(result);
  assert.equal(round.status, "pending");
  assert.equal(round.transparency_preview.inspection.status, "pending");
  assert.equal(round.background_removal_attempt.status, "completed");
  assert.equal(decodePngRgba(await readFile(result.output)).pixels[3], 0);
  await assert.rejects(decideTransparencyRound({ round: result.round, decision: "adopt" }), /用户消息/);
  await assert.rejects(prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r2"), route: "hard-edge", previousRound: result.round }), /ENOENT/);
  const chosen = await decideTransparencyRound({ round: result.round, decision: "adopt", userRef: "chat:message:1" });
  assert.equal(chosen.output.file, result.output);
  assert.equal(chosen.light.file, result.light);
  assert.equal(chosen.dark.file, result.dark);
  await assert.rejects(decideTransparencyRound({ round: result.round, decision: "adopt", userRef: "chat:message:2" }), /EEXIST/);
  await assert.rejects(prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r3"), route: "hard-edge", previousRound: result.round }), /返修或升级/);
});

test("绿底毛发输出真实灰度遮罩，输出和预览篡改会阻止人工决定", async (t) => {
  const f = await fixture(t, [64, 160, 64, 255]);
  const result = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r1"), route: "green-hair" });
  const round = await loadRound(result);
  const output = decodePngRgba(await readFile(result.output));
  const mask = decodePngRgba(await readFile(round.mask_record.mask_file));
  assert.equal(round.transparency_strategy, "mask-composition");
  assert(output.pixels[19] > 0 && output.pixels[19] < 255);
  assert.equal(mask.pixels[16], output.pixels[19]);
  await writeFile(result.light, "tampered");
  await assert.rejects(decideTransparencyRound({ round: result.round, decision: "adopt", userRef: "chat:message:1" }), /内容已变化/);
});

test("已有真实 Alpha 按原像素保留，拒绝伪透明或空主体", async (t) => {
  const f = await fixture(t, [100, 80, 60, 128], [0, 0, 0, 0]);
  const result = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r1"), route: "existing-alpha" });
  assert.deepEqual(await readFile(result.output), await readFile(f.source));
  assert.deepEqual(decodePngRgba(await readFile(result.output)).pixels, f.pixels);
  const fake = await fixture(t, [100, 80, 60, 255], [0, 0, 0, 255]);
  await assert.rejects(prepareTransparencyRound({ source: fake.source, roundDir: join(fake.dir, "r1"), route: "existing-alpha" }), /实际透明像素/);
});

test("人工升级后硬边可使用独立遮罩，已有透明源只减少 Alpha", async (t) => {
  const f = await fixture(t, [200, 20, 20, 255]);
  const first = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "nested", "r1"), route: "hard-edge" });
  await assert.rejects(decideTransparencyRound({ round: first.round, decision: "revise", userRef: "chat:message:1" }), /具体说明/);
  const decision = await decideTransparencyRound({ round: first.round, decision: "upgrade", userRef: "chat:message:1" });
  assert.match(decision.decision_file, /decision\.json$/);
  assert.equal(decision.decision, "upgrade");
  const maskPixels = Buffer.alloc(36);
  for (let i = 0; i < maskPixels.length; i += 4) maskPixels.set([255, 255, 255, 255], i);
  maskPixels.set([128, 128, 128, 255], 16);
  const mask = join(f.dir, "manual.png");
  await writeFile(mask, encodePngRgba(3, 3, maskPixels));
  const upgraded = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "nested", "r2"), route: "hard-edge", previousRound: first.round, alphaMask: mask });
  assert.equal((await loadRound(upgraded)).transparency_strategy, "mask-composition");
  assert.equal(decodePngRgba(await readFile(upgraded.output)).pixels[19], 128);
  const revised = await decideTransparencyRound({ round: first.round, decision: "revise", userRef: "chat:message:2", feedback: "修边" }).catch((error) => error);
  assert.equal(revised.code, "EEXIST");
  await decideTransparencyRound({ round: upgraded.round, decision: "revise", userRef: "chat:message:2", feedback: "细化边缘" });
  const alpha = await prepareTransparencyRound({ source: first.output, roundDir: join(f.dir, "nested", "r3"), route: "existing-alpha", previousRound: upgraded.round, alphaMask: mask });
  const pixels = decodePngRgba(await readFile(alpha.output)).pixels;
  assert.equal(pixels[3], 0);
  assert.equal(pixels[19], 128);
  const alphaRound = await loadRound(alpha);
  await writeFile(alphaRound.mask_record.mask_file, "tampered");
  await assert.rejects(decideTransparencyRound({ round: alpha.round, decision: "adopt", userRef: "chat:message:3" }), /内容已变化/);
});

test("同一素材根必须串行获得人工决定，失败预约可以重试", async (t) => {
  const f = await fixture(t, [255, 0, 0, 255]);
  const first = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r1"), route: "hard-edge" });
  await assert.rejects(prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r2"), route: "hard-edge" }), /已有首轮/);
  await decideTransparencyRound({ round: first.round, decision: "upgrade", userRef: "chat:message:1" });
  await assert.rejects(prepareTransparencyRound({
    source: f.source, roundDir: join(f.dir, "failed"), route: "hard-edge", previousRound: first.round, backgroundColor: "#000000",
  }), /纯色|检查失败/);
  const second = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r2"), route: "hard-edge", previousRound: first.round });
  await assert.rejects(prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r3"), route: "hard-edge", previousRound: first.round }), /已用于生成后续轮次/);
  await assert.rejects(prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "other", "r3"), route: "hard-edge", previousRound: second.round }), /ENOENT|同一个素材/);
});

test("首次处理失败后允许在同一素材根重试", async (t) => {
  const f = await fixture(t, [255, 0, 0, 255]);
  await assert.rejects(prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "failed"), route: "hard-edge", backgroundColor: "#000000" }), /纯色|检查失败/);
  const retried = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r1"), route: "hard-edge" });
  assert.equal(retried.status, "pending");
});

test("并发首轮和并发后继都只能各生成一次", async (t) => {
  const f = await fixture(t, [255, 0, 0, 255]);
  const initial = await Promise.allSettled(["a", "b"].map((name) =>
    prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, name), route: "hard-edge" })));
  assert.equal(initial.filter((result) => result.status === "fulfilled").length, 1);
  const first = initial.find((result) => result.status === "fulfilled").value;
  await decideTransparencyRound({ round: first.round, decision: "upgrade", userRef: "chat:message:1" });
  const next = await Promise.allSettled(["c", "d"].map((name) =>
    prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, name), route: "hard-edge", previousRound: first.round })));
  assert.equal(next.filter((result) => result.status === "fulfilled").length, 1);
});

test("命令入口返回候选和双底路径并要求有效的用户决定", async (t) => {
  const f = await fixture(t, [200, 30, 20, 255]);
  const cli = fileURLToPath(new URL("../skills/app-domain-toolkit/scripts/image/transparency-round.mjs", import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  const result = run("prepare", "--source", f.source, "--round-dir", join(f.dir, "r1"), "--route", "hard-edge");
  assert.equal(result.status, 0, result.stderr);
  const prepared = JSON.parse(result.stdout);
  assert.equal(prepared.status, "pending");
  assert.ok(prepared.output && prepared.light && prepared.dark);
  const rejected = run("decide", "--round", prepared.round, "--decision", "adopt");
  assert.notEqual(rejected.status, 0);
  const accepted = run("decide", "--round", prepared.round, "--decision", "adopt", "--user-ref", "chat:message:1");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).user_ref, "chat:message:1");
});

test("返修决定后可关联重新导出的源图并保留前轮身份", async (t) => {
  const f = await fixture(t, [200, 30, 20, 255]);
  const first = await prepareTransparencyRound({ source: f.source, roundDir: join(f.dir, "r1"), route: "hard-edge" });
  await decideTransparencyRound({ round: first.round, decision: "revise", userRef: "chat:message:1", feedback: "重新导出" });
  const nextSource = join(f.dir, "new-source.png");
  await writeFile(nextSource, await readFile(f.source));
  const second = await prepareTransparencyRound({ source: nextSource, roundDir: join(f.dir, "r2"), route: "hard-edge", previousRound: first.round });
  const round = await loadRound(second);
  assert.equal(round.previous.round, first.round);
  assert.equal(round.previous.source_changed, true);
});
