/** 展开一个条目的主稿与附加稿，阶段校验和实施写入保护共用同一范围。 */
export function moduleDesignTargets(entry) {
  return [entry, ...(Array.isArray(entry?.additionalTargets) ? entry.additionalTargets : [])];
}

/** 枚举设计清单内应当作为只读输入的稿件与规格引用。 */
export function moduleDesignInputRefs(manifest) {
  return (manifest.entries ?? []).flatMap(moduleDesignTargets)
    .flatMap((target) => [target?.targetRef, target?.designRef]).filter(Boolean);
}
