/** 参考资料审计必须发现短规则与完整示例，公共导航不能冒充规则副本。 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { auditReferenceBodies } from '../scripts/audit-reference-bodies.mjs';

test('无长度阈值核对全部正文，并保留原生字段及链接差异', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'reference-body-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const example = '```text\n# 这不是章节\n\n完整保留示例。\n```';
  const files = ['cocos', 'phaser'].map((stack) => {
    const prefix = stack === 'phaser' ? 'phaser4' : stack;
    const sourcePath = `skills/${prefix}-game-asset-integration/references/rules.md`;
    const file = join(root, sourcePath);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `# 正文\n\n## 边界\n\n不得覆盖用户文件。\n\n${example}\n\n原生字段：${stack}。\n\n> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/common.md)。\n\n## 本栈配套资料\n\n- [说明](./different-${stack}.md)\n`);
    return { stack, sourcePath, destination: sourcePath };
  });
  mkdirSync(join(root, 'migration'));
  writeFileSync(join(root, 'migration/files.json'), JSON.stringify({ files }));
  const report = auditReferenceBodies(root);
  assert.equal(report.documents, 2);
  assert.equal(report.candidateBlocks, 2);
  assert.ok(report.candidates.some((item) => item.content === '不得覆盖用户文件。'));
  assert.ok(report.candidates.some((item) => item.content === example));
  assert.ok(report.candidates.every((item) => !item.content.includes('原生字段')));
});
