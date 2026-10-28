import { createVisualNormalizationContract } from "../../app-domain-toolkit/scripts/visual/visual-image-normalization-contract.mjs";
import { normalizeProjectRelativePath } from "./visual-component-contract.mjs";

const contract = createVisualNormalizationContract({ normalizeProjectRelativePath });
export const { IMAGE_NORMALIZATION_STATUS, IMAGE_NORMALIZATION_OPERATIONS, IMAGE_NORMALIZATION_SCHEMA, IMAGE_ASPECT_RATIO_CORRECTION_SCHEMA, IMAGE_ASPECT_RATIO_CORRECTION_TRIGGER, IMAGE_ASPECT_RATIO_CORRECTION_STRATEGY, IMAGE_NORMALIZATION_OUTPUT_FORMATS, getImageNormalizationRecords, getImageNormalizationRecord, sameImageAspectRatio, validateImageNormalizationContract } = contract;
