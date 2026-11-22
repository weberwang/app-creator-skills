import { readJson } from './io.mjs';

/** 展开一个条目的主稿与附加稿，阶段校验和实施写入保护共用同一范围。 */
export function moduleDesignTargets(entry) {
  return [entry, ...(Array.isArray(entry?.additionalTargets) ? entry.additionalTargets : [])];
}

/** 枚举设计清单内应当作为只读输入的稿件与规格引用。 */
export function moduleDesignInputRefs(manifest) {
  return (manifest.entries ?? []).flatMap(moduleDesignTargets)
    .flatMap((target) => [target?.targetRef, target?.designRef]).filter(Boolean);
}

/** 将确认和它所指的拆解材料一并作为只读证据路径。 */
export function supplementalDecompositionReferencePaths(work, repo) {
  return (work.visual?.supplementalDecompositionReviews ?? []).flatMap(({ path }) => {
    if (!repo) return [path];
    const review = readJson(repo, path, 'V3 补充拆解确认');
    return typeof review?.targetRef === 'string' && review.targetRef.trim() ? [path, review.targetRef] : [path];
  });
}

/** 设计或拆解返修时撤销补充稿确认，保留历史记录及上游设计。 */
export function invalidateSupplementalDecompositionReviews(work, invalidatedRefs) {
  for (const ref of work.visual.supplementalDecompositionReviews ?? []) invalidatedRefs.push({ path: ref.path, state: 'V3Decomposition' });
  delete work.visual.supplementalDecompositionReviews;
}
