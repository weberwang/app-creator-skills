import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VISUAL_STAGES } from './constants.mjs';
import { repoPath, requireFile, fileIdentityKey } from './io.mjs';
import { isFigmaApp } from './figma-app-contract.mjs';

/** 仅从路径合法且摘要匹配的 JSON 中继续追溯，缺失或损坏不得阻止 RETURN。 */
function frozenJson(repo, ref) {
  try {
    if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) return null;
    const path = requireFile(repo, ref.path, '历史领域证据');
    const bytes = readFileSync(repoPath(repo, path).absolute);
    if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) return null;
    return JSON.parse(bytes.toString('utf8'));
  } catch { return null; }
}

/** 领域封套及下游冻结引用按最早影响阶段作废，不删除任何历史文件。 */
export function invalidateSingleDomainEvidence(repo, work, invalidatedRefs, earliestStage) {
  const envelope = work.visual.domainEvidenceRef;
  if (envelope?.path) invalidatedRefs.push({ path: envelope.path, state: work.visual.stage });
  const figma = isFigmaApp(work);
  const doc = work.stack === 'flutter' || figma ? frozenJson(repo, envelope) : null;
  if (doc && typeof doc === 'object') {
    const root = repoPath(repo, envelope.path, '历史领域封套').relative;
    const targetKeys = new Set();
    // 目标图属于上游确认材料：保留所有目标身份，避免共享目标因下游 RETURN 被误作废。
    for (const ref of [doc.referenceTarget, ...(Array.isArray(doc.additionalTargets) ? doc.additionalTargets.map((item) => item?.referenceTarget) : [])]) {
      try { targetKeys.add(fileIdentityKey(repo, ref?.path)); } catch { /* 无效引用不能影响 RETURN。 */ }
    }
    /** 仅收录合法、非目标图的冻结引用，避免恶意路径污染失效记录。 */
    const add = (ref, state) => {
      try {
        if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) return false;
        const path = repoPath(repo, ref.path, '失效领域证据').relative;
        if (targetKeys.has(fileIdentityKey(repo, path)) || fileIdentityKey(repo, path) === fileIdentityKey(repo, root)) return false;
        invalidatedRefs.push({ path, state });
        return true;
      } catch { return false; }
    };
    const stageIndex = VISUAL_STAGES.indexOf(earliestStage);
    if (figma && stageIndex <= 2) {
      // 仅追溯摘要匹配的实际节点导出；历史截图仍保留为上游目标材料。
      const refs = [doc.figmaDesignRef, ...(Array.isArray(doc.additionalTargets) ? doc.additionalTargets.map((item) => item?.figmaDesignRef) : [])];
      for (const ref of refs) {
        if (!add(ref, 'V2')) continue;
        const design = frozenJson(repo, ref);
        add(design?.captureRef, 'V2');
        add(design?.previewRef, 'V2');
      }
    }
    if (stageIndex <= 3) {
      add(doc.designReconstructionRef, 'V3');
      add(doc.layoutSpecRef, 'V3');
      if (figma) add(doc.figmaHandoffRef, 'V3');
    }
    if (figma && stageIndex <= 4) {
      add(doc.layoutSourceRef, 'V4');
      add(doc.assetManifestRef, 'V4');
    }
    if (figma && add(doc.runtimeContextRef, 'V5')) {
      const runtime = frozenJson(repo, doc.runtimeContextRef);
      for (const key of ['runEvidenceRef', 'interactionEvidenceRef', 'performanceEvidenceRef', 'captureRef', 'captureOutputRef', 'runtimeScreenshotRef']) add(runtime?.[key], 'V5');
      for (const interaction of Array.isArray(runtime?.interactions) ? runtime.interactions : []) add(interaction?.evidenceRef, 'V5');
      if (add(runtime?.buildIdentityRef, 'V5')) {
        const build = frozenJson(repo, runtime.buildIdentityRef);
        for (const key of ['artifactRef', 'binaryRef', 'buildLogRef']) add(build?.[key], 'V5');
      }
    }
    // 连续检查每层摘要，防止更换外层报告后重用旧观测或旧截图。
    for (const ref of Array.isArray(doc.implementationEvidenceRefs) ? doc.implementationEvidenceRefs : []) {
      if (!add(ref, 'V4')) continue;
      const report = frozenJson(repo, ref);
      if (!add(report?.executionRef, 'V4')) continue;
      const raw = frozenJson(repo, report.executionRef);
      add(raw?.commandCaptureRef, 'V4');
    }
    if (add(doc.comparisonRef, 'V5')) {
      const comparison = frozenJson(repo, doc.comparisonRef);
      for (const item of Array.isArray(comparison?.cases) ? comparison.cases : []) {
        add(item?.runtimeRef, 'V5');
        if (!add(item?.captureRef, 'V5')) continue;
        const capture = frozenJson(repo, item.captureRef);
        add(capture?.captureOutputRef, 'V5');
      }
    }
  }
  delete work.visual.domainEvidenceRef;
}
