import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VISUAL_STAGES } from './constants.mjs';
import { repoPath, requireFile, fileIdentityKey } from './io.mjs';

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
  const doc = work.stack === 'flutter' ? frozenJson(repo, envelope) : null;
  if (doc && typeof doc === 'object') {
    const root = repoPath(repo, envelope.path, '历史领域封套').relative;
    let target;
    try { target = repoPath(repo, doc.referenceTarget?.path, '领域目标').relative; } catch { target = null; }
    /** 仅收录合法、非目标图的冻结引用，避免恶意路径污染失效记录。 */
    const add = (ref, state) => {
      try {
        if (!ref || typeof ref.path !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) return false;
        const path = repoPath(repo, ref.path, '失效领域证据').relative;
        if ((target && fileIdentityKey(repo, path) === fileIdentityKey(repo, target)) || fileIdentityKey(repo, path) === fileIdentityKey(repo, root)) return false;
        invalidatedRefs.push({ path, state });
        return true;
      } catch { return false; }
    };
    if (VISUAL_STAGES.indexOf(earliestStage) <= 3) {
      add(doc.designReconstructionRef, 'V3');
      add(doc.layoutSpecRef, 'V3');
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
