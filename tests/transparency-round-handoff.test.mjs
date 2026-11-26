import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { encodePngRgba } from "../skills/app-asset-workflow/scripts/png-raster.mjs";
import { prepareTransparencyRound, decideTransparencyRound } from "../skills/app-domain-toolkit/scripts/image/transparency-round.mjs";
import { prepareTransparencyFixture } from "../skills/cocos-domain-contracts/scripts/transparent-route-test-fixtures.mjs";

/** 通过真实处理工具为现有领域校验器准备可解码的合成夹具。 */
async function createRoundFixture(t, route) {
  const root = await mkdtemp(join(tmpdir(), "transparency-handoff-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const direct = route === "existing-alpha";
  const background = direct ? [0, 0, 0, 0] : [0, 255, 0, 255];
  const edge = direct ? [180, 80, 60, 128] : [60, 180, 40, 255];
  const input = join(root, "source.png");
  await writeFile(input, encodePngRgba(2, 2, Buffer.from([...background, ...edge, 180, 80, 60, 255, ...background])));
  const prepared = await prepareTransparencyRound({ source: input, roundDir: join(root, "review", "r1"), route });
  const round = JSON.parse(await readFile(prepared.round, "utf8"));
  /** 正式生产记录使用项目相对路径，轮次文件可继续保留本地引用。 */
  const path = (file) => relative(root, file).replaceAll("\\", "/");
  const source = direct ? path(input) : path(prepared.output);
  const runtime = path(prepared.output);
  const expectedAsset = { alpha: true, mime_type: "image/png", source_file: source, runtime_file: runtime };
  const generation = {
    generator: "fixture", generator_version: "1", raw_source_file: path(input), raw_source_has_alpha: true,
    source_file: source, source_has_alpha: true, source_background_mode: "opaque", final_background_mode: "transparent",
    full_prompt: direct ? "输出真实 Alpha，禁止棋盘格" : "完整绿底原图用于独立遮罩",
    normalization_record: { source_file: source, source_sha256: round.output.sha256, output_file: runtime, output_sha256: round.output.sha256 },
  };
  prepareTransparencyFixture(generation, expectedAsset, { strategy: round.transparency_strategy, edgeProfile: "hair" });
  generation.transparency_preview = {
    ...round.transparency_preview,
    source_file: runtime,
    light: { ...round.transparency_preview.light, file: path(prepared.light) },
    dark: { ...round.transparency_preview.dark, file: path(prepared.dark) },
  };
  // 保留真实生成原图的 direct-alpha 通过显式轮次引用关联可审阅副本。
  if (direct) generation.transparency_round_file = path(prepared.round);
  else generation.mask_record = {
    ...round.mask_record, source_file: path(input), mask_file: path(round.mask_record.mask_file), output_file: runtime,
  };
  const args = {
    generation, expectedAsset,
    contract: { production_method: "image-generation", image_generation_required: true, delivery_kind: "raster-image" },
    metadata: { mime_type: "image/png", file: runtime, alpha: true },
    options: { checkFiles: true, projectRoot: root, stage: "V4" },
  };
  return { prepared, args };
}

test("正式透明产物校验要求采用决定，并检查用户查看的双底仍对应当前候选", async (t) => {
  const cases = await Promise.all(["green-hair", "existing-alpha"].map((route) => createRoundFixture(t, route)));
  const validators = await Promise.all(["cocos", "phaser", "threejs"].map(async (stack) => {
    const module = await import(`../skills/${stack}-domain-contracts/scripts/visual-transparent-background-contract.mjs`);
    return module.validateTransparentBackgroundContract;
  }));
  for (const { prepared, args } of cases) {
    for (const validate of validators) assert.match(validate(args).join("\n"), /轮次尚未人工采用/);
    // 本测试的消息引用只模拟记录链，不代表实际人工验收。
    await decideTransparencyRound({ round: prepared.round, decision: "adopt", userRef: "chat:fixture-adopt" });
    for (const validate of validators) assert.deepEqual(validate(args), []);
    await writeFile(prepared.dark, "changed");
    for (const validate of validators) assert.match(validate(args).join("\n"), /双底预览已变化/);
  }
});
