/** 在写入前验证所有文本适配，包括默认导入扫描不会覆盖的专业 Markdown。 */
export function assertTransformablePlans(plans, sharedWorkflowPlan, { readText, transformShared, transformText }) {
  for (const plan of plans) {
    for (const entry of plan.entries.values()) {
      if (!entry.destination) continue;
      const text = readText(plan.sourceBuffers.get(entry.sourcePath), entry.sourcePath);
      if (text === null) continue;
      // 预检只使用副本；路由元数据和变换列表由真正应用阶段独立记录。
      const candidate = { ...entry, transforms: [...entry.transforms] };
      const shared = transformShared(text, plan, candidate, sharedWorkflowPlan);
      transformText(shared.text, candidate, plan.stack, plan.sourceFiles, plan.entries);
    }
  }
}
