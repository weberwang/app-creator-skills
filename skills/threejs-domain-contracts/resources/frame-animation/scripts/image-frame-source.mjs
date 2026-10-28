import { createImageFrameSourceTools } from "../../../../app-domain-toolkit/scripts/animation/image-frame-source.mjs";

const tools = createImageFrameSourceTools({ schema: "threejs-image-frame-source/1", loadSharpModule: () => import("../../../../app-skill-runtime/sharp.mjs") });
export const { IMAGE_FRAME_SOURCE_SCHEMA, imageFrameTimeMatches, validateImageFrameSource, ImageFrameSourceError, readImageFrameSource } = tools;
