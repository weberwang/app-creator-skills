import { fileIdentityKey, WorkflowError } from './io.mjs';
import { matchesVisualAcceptance, readVisualAcceptanceFile, readVisualAcceptanceJson } from './visual-acceptance-evidence.mjs';

/** Unity 原生 Game View 报告必须证明截图和布局报告由同一次帧末调用生成。 */
export function verifyUnityTrialCapture(repo, work, target, screenshot, layoutRef, layoutReport, gameViewCaptureRef) {
  const capture = readVisualAcceptanceJson(repo, work, gameViewCaptureRef, 'Unity Game View 同帧采集');
  const screenshotBytes = readVisualAcceptanceFile(repo, work, screenshot, 'Unity V4 已确认截图');
  if (fileIdentityKey(repo, gameViewCaptureRef.path) !== fileIdentityKey(repo, `${screenshot.path}.json`)
    || !matchesVisualAcceptance(capture, { schemaVersion: '1.0', status: 'PASS', captureScope: 'EDITOR_GAME_VIEW_END_OF_FRAME',
      taskId: work.workItemId, candidateId: target.candidateId, scenePath: layoutReport.scenePath })
    || !matchesVisualAcceptance(capture.screenshot, { path: screenshot.path, sha256: screenshot.sha256,
      sizeBytes: screenshotBytes.length, frameCount: layoutReport.frameCount })
    || !Number.isInteger(layoutReport.frameCount) || layoutReport.frameCount < 0
    || !matchesVisualAcceptance(capture.layoutMeasurement, { path: layoutRef.path, sha256: layoutRef.sha256,
      runId: layoutReport.runId, frameCount: layoutReport.frameCount })) {
    throw new WorkflowError('Unity 确认截图与原生布局未绑定同一帧和采集报告');
  }
}
