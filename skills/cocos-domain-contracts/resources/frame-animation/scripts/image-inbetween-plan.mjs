#!/usr/bin/env node
import { isDirectEntry } from "../../../../app-skill-runtime/direct-entry.mjs";
import { createImageInbetweenTools } from "../../../../app-domain-toolkit/scripts/animation/image-inbetween-plan.mjs";

const tools = createImageInbetweenTools({ planSchema: "cocos-image-inbetween-plan/1" });
export const {
  createImageInbetweenPlan,
  parseImageInbetweenPlanArgs,
  imageInbetweenPlanHelp,
} = tools;

/** 仅在直接执行专业入口时运行原 CLI；导入工具 API 不触发文件写入。 */
if (isDirectEntry(import.meta.url)) {
  await tools.runCli(process.argv.slice(2));
}
