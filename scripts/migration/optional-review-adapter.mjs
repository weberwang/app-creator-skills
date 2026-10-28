/** 将静态报告、PNG 布局和按需 HTML 接入同一迁移链，保留各栈的正式工件检查。 */
import { adaptOptionalLayoutReview } from './optional-layout-review-adapter.mjs';
import { adaptOptionalAnimationReview } from './optional-animation-review-adapter.mjs';
import { adaptOptionalReviewDocument } from './optional-review-documents.mjs';

/** 源路径精确分发到对应变换，网页不再作为普通审查或静态布局的前置条件。 */
export function adaptOptionalReviewArtifacts(text, options) {
  let output = text;
  const transforms = [];
  for (const adapt of [adaptOptionalLayoutReview, adaptOptionalAnimationReview, adaptOptionalReviewDocument]) {
    const result = adapt(output, options);
    output = result.text;
    transforms.push(...result.transforms);
  }
  return { text: output, transforms };
}
