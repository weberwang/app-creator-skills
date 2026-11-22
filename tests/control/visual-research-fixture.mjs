import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** 写入同项目同技术栈可复用的合成调研依据，返回带摘要的项目内引用。 */
export function visualResearchFixture(repo, projectId, stack) {
  const id = createHash('sha256').update(JSON.stringify([projectId, stack])).digest('hex').slice(0, 16);
  const path = `.workflow-control/fixtures/visual-research-${id}.json`;
  const source = (name) => ({ url: `https://example.test/research/${name}` });
  const document = {
    schemaVersion: '1.0', projectId, stack,
    productResearch: {
      market: { source: source('market'), finding: '合成测试市场与定位依据' },
      competitor: { source: source('competitor'), finding: '合成测试同类产品的设计取舍' },
      audience: { source: source('audience'), finding: '合成测试用户和使用情境' },
    },
    artReferences: [{ source: source('art'), observation: '合成美术参考观察', applicability: '适用于本项目与技术栈' }],
  };
  const contents = JSON.stringify(document);
  const absolute = resolve(repo, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents);
  return { path, sha256: createHash('sha256').update(contents).digest('hex') };
}
