import { resolveLayoutRootBounds } from "./layout-root-bounds.mjs";
import { createCenterAlignmentTools } from "../../app-domain-toolkit/scripts/layout/center-alignment.mjs";

const tools = createCenterAlignmentTools(resolveLayoutRootBounds);
export const { normalizeCenterAlignment, resolveCenteredLayoutNodes, validateCenterAlignmentNodes } = tools;
