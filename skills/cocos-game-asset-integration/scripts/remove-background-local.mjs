#!/usr/bin/env node
import { isDirectEntry } from "../../app-skill-runtime/direct-entry.mjs";
import { createBackgroundRemovalTools } from "../../app-domain-toolkit/scripts/image/remove-background-local.mjs";

const tools = createBackgroundRemovalTools({ technologyName: "Cocos" });
export const {
  LOCAL_BACKGROUND_REMOVAL_SCHEMA,
  LOCAL_BACKGROUND_REMOVAL_OPERATION,
  LOCAL_DIRECT_ALPHA_OPERATION,
  LOCAL_BACKGROUND_REMOVAL_TOOL,
  LOCAL_BACKGROUND_REMOVAL_TOOL_VERSION,
  BackgroundRemovalError,
  sha256Bytes,
  parseBackgroundColor,
  parseColorTolerance,
  removeConnectedBackground,
  countAlphaPixels,
  removeBackgroundLocal,
  runRemoveBackgroundCli,
} = tools;

/** 仅在直接执行专业入口时启动 CLI；模块导入保持无副作用。 */
if (isDirectEntry(import.meta.url)) await tools.main();
