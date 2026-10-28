import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 写入测试用领域资料并返回实际文件内容身份。 */
async function putIdentity(repo, path, content) {
  const absolute = resolve(repo, ...path.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
  return { path, sha256: createHash('sha256').update(content).digest('hex') };
}

/** 为 Flutter 单目标工作项构造真实可校验的合成阶段资料。 */
export async function writeSingleDomainFixture(repo, work, stage) {
  const review = JSON.parse(await readFile(resolve(repo, ...work.visual.reviews.V2.path.split('/')), 'utf8'));
  const document = {
    schemaVersion: '1.0', workItemId: work.workItemId, projectId: work.projectId, stack: work.stack,
    workItemType: work.workItemType, visualStageModel: 'function-first-v1', visualStage: stage,
    objectId: work.visual.objectId, candidateId: work.visual.candidateId, referenceTarget: review.referenceTarget,
    ...(work.workItemType === 'DISPLAY_LAYER' ? { hostId: work.visual.hostId, layerType: work.visual.layerType } : {}),
  };
  if (work.workItemType === 'DISPLAY_LAYER' && stage === 'V5') {
    const runtimeReview = JSON.parse(await readFile(resolve(repo, ...work.visual.reviews.V5.path.split('/')), 'utf8'));
    document.runtimeContextRef = runtimeReview.runtimeContextRef;
  }
  if (stage !== 'V2') {
    const template = fileURLToPath(new URL('../../skills/adaptive-layout-implementation/assets/layout-spec-template.yaml', import.meta.url));
    const content = (await readFile(template, 'utf8')).replace('id: example-page', `id: ${JSON.stringify(work.visual.objectId)}`);
    document.layoutSpecRef = await putIdentity(repo, `.workflow-control/domain/${work.workItemId}-layout.yaml`, content);
  }
  work.visual.domainEvidenceRef = await putIdentity(repo, `.workflow-control/domain/${work.workItemId}-${stage}.json`, `${JSON.stringify(document, null, 2)}\n`);
  return work.visual.domainEvidenceRef;
}
