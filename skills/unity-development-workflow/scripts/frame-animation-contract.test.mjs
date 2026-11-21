import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateFrameAnimationHandoff } from "./frame-animation-contract.mjs";

/** 构造 Unity 序列帧计划与模拟 AssetDatabase 回读，覆盖同一组 Sprite 身份。 */
function fixture() {
  const plan = JSON.parse(readFileSync(new URL("../templates/frame-animation-handoff.json", import.meta.url), "utf8"));
  const animation = plan.animations[0];
  animation.frameRate = 24;
  animation.duration = 2 / 24;
  animation.frames.forEach((frame, index) => { frame.time = index / 24; });
  const reportAnimation = structuredClone(animation);
  reportAnimation.propertyName = "m_Sprite";
  reportAnimation.consumer.referencesClip = true;
  reportAnimation.consumer.bindingResolved = true;
  reportAnimation.atlas = null;
  reportAnimation.frames.forEach((frame, index) => {
    frame.rect = { x: index * 16, y: 0, width: 16, height: 16 };
    frame.spriteName = `coin-${index}`;
  });
  const report = {
    schemaVersion: "1.0", taskId: "sprite-test", outputPath: "reports/animation.json",
    assets: [], animations: [reportAnimation], measurementSource: "UNITY_EDITOR_ASSET_DATABASE",
    runId: "fixture-run", generatedAtUtc: "2026-01-01T00:00:00Z", message: "", status: "MEASURED",
  };
  return { plan, report };
}

test("Unity Sprite 帧序列交接允许 24 FPS，计划或实际播放超限均被拒绝", () => {
  const { plan, report } = fixture();
  assert.deepEqual(validateFrameAnimationHandoff(plan, report), []);
  plan.animations[0].frameRate = 25;
  assert(validateFrameAnimationHandoff(plan, report).some((item) => /计划动作.*frameRate.*24/.test(item)));
  plan.animations[0].frameRate = 24;
  report.animations[0].frameRate = 25;
  assert(validateFrameAnimationHandoff(plan, report).some((item) => /实测动作.*frameRate.*24/.test(item)));
});

test("Unity 序列帧计划 Schema 限制帧率上限", () => {
  const schema = JSON.parse(readFileSync(new URL("../schemas/frame-animation-handoff.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.properties.animations.items.properties.frameRate.maximum, 24);
});

test("允许跳过采样槽持帧，计划和实测共同伪造同槽多帧仍被拒绝", () => {
  const { plan, report } = fixture();
  plan.animations[0].frames.splice(1, 1);
  report.animations[0].frames.splice(1, 1);
  // 浮点序列化偏差可容忍，跳过中间采样槽表达两帧之间的保持。
  plan.animations[0].frames[1].time += 0.00005;
  report.animations[0].frames[1].time += 0.00005;
  assert.deepEqual(validateFrameAnimationHandoff(plan, report), []);
  plan.animations[0].frames[1].time = 0.00005;
  report.animations[0].frames[1].time = 0.00005;
  const errors = validateFrameAnimationHandoff(plan, report);
  assert(errors.some((error) => /计划动作.*同一采样槽/.test(error)));
  assert(errors.some((error) => /实测动作.*同一采样槽/.test(error)));
});
