/** 对真实原生测试应用迁移适配，确保默认 PNG 和显式交互网页均执行各自文件门。 */
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { adaptOptionalLayoutReview } from '../scripts/migration/optional-layout-review-adapter.mjs';
import { adaptProjectLocales } from '../scripts/migration/project-locale-adapter.mjs';
import { adaptUnifiedStages, loadUnifiedStagePatches } from '../scripts/migration/unified-stage-adapter.mjs';

const root = resolve(import.meta.dirname, '..');
const temporaryRoot = realpathSync(tmpdir());

/** 测试只回收本次独占目录，不能越出系统临时目录。 */
function removeFixture(dir) {
  assert.match(relative(temporaryRoot, dir), /^optional-layout-source-[^\\/]+$/);
  assert.equal(realpathSync(dir), dir);
  rmSync(dir, { recursive: true, force: true });
}

test('Cocos 与 Phaser 原生测试分别验证默认 PNG 文件门和显式交互网页', (t) => {
  const sandbox = mkdtempSync(join(temporaryRoot, 'optional-layout-source-'));
  t.after(() => removeFixture(sandbox));
  cpSync(join(root, 'skills'), join(sandbox, 'skills'), { recursive: true });
  writeFileSync(join(sandbox, 'skills/app-skill-runtime/dependencies.cjs'), `module.exports = require(${JSON.stringify(join(root, 'skills/app-skill-runtime/dependencies.cjs'))});\n`);
  const cases = [
    ['cocos', 'skills/cocos-game-ui-layout/scripts/validate_ui_layout_contract.test.mjs'],
    ['phaser', 'skills/phaser4-game-asset-integration/scripts/generate_layout_annotation.test.mjs'],
  ];
  for (const [stack, sourcePath] of cases) {
    const sourceBuffer = readFileSync(resolve(root, '..', `${stack}-skills`, sourcePath));
    let source = sourceBuffer.toString('utf8');
    if (stack === 'phaser') source = source.replaceAll('phaser4-game-workflow-control', 'phaser-domain-contracts');
    const result = adaptOptionalLayoutReview(source, { stack, sourcePath, destination: sourcePath });
    assert.deepEqual(result.transforms, ['optional-layout-review-html']);
    // 迁移在可选审阅适配后应用项目语言适配，源摘要必须使用未经改写的原始字节。
    const locale = adaptProjectLocales(Buffer.from(result.text), { stack, sourcePath, destination: sourcePath, repositoryRoot: root, sourceBuffer });
    assert.equal(locale.changed, stack === 'cocos');
    const stage = adaptUnifiedStages(locale.buffer, { stack, sourcePath, destination: sourcePath, sourceBuffer, patches: loadUnifiedStagePatches(root) });
    if (stack === 'cocos') {
      assert.equal(stage.changed, true);
      assert.deepEqual(stage.buffer, readFileSync(join(root, sourcePath)), '语言与阶段适配后的测试应与实际迁移产物一致');
      assert.throws(() => adaptProjectLocales(Buffer.from(result.text), { stack, sourcePath, destination: sourcePath, repositoryRoot: root, sourceBuffer: Buffer.concat([sourceBuffer, Buffer.from('drift')]) }), /摘要漂移/);
    }
    writeFileSync(join(sandbox, sourcePath), stage.buffer);
  }
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-name-pattern=CLI --check-files 进入场景正式确认文件门|完整生成链保留兄弟定位参照', ...cases.map(([, path]) => join(sandbox, path))],
    { cwd: sandbox, env: childEnv, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /CLI --check-files 进入场景正式确认文件门/);
  assert.match(result.stdout, /完整生成链保留兄弟定位参照/);
  assert.match(result.stdout, /fail 0/);
});
