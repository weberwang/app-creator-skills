/** 在独占临时模块中运行三栈原生文件门，核验预览可选及声明后的严格检查。 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { adaptOptionalAnimationReview } from '../scripts/migration/optional-animation-review-adapter.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const execute = promisify(execFile);

/** 将隔离测试的原生依赖定位到已有资源；被测合同始终使用临时变换后的文件。 */
function rebaseImports(text, original, overrides) {
  return text.replace(/\bfrom\s+(["'])(\.\.?\/[^"']+)\1/g, (match, quote, name) => {
    const target = overrides[name] ?? pathToFileURL(resolve(dirname(original), name)).href;
    return `from ${quote}${target}${quote}`;
  });
}

for (const [stack, prefix] of Object.entries({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' })) {
  test(`${stack} 视频与图片真实文件门支持不生成预览且拒绝坏预览`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), `optional-animation-${stack}-`));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const base = `skills/${prefix}-game-asset-integration/scripts`;
    const originalDir = join(ROOT, base);
    const names = ['frame-animation-workflow-contract', 'image-frame-animation-workflow-contract'];
    const overrides = Object.fromEntries(names.map((name) => [`./${name}.mjs`, pathToFileURL(join(dir, `${name}.mjs`)).href]));
    for (const name of names) {
      const original = join(originalDir, `${name}.mjs`);
      const sourcePath = `${base}/${name}.mjs`;
      const source = await readFile(original, 'utf8');
      // 仓库可能尚未生成新输出，也可能已完成迁移；两种状态都测试同一实际合同。
      const adapted = source.includes('必须与合同同时声明或同时省略') ? { text: source, transforms: ['optional-animation-preview-contract'] } : adaptOptionalAnimationReview(source, { stack, sourcePath });
      assert.equal(adapted.transforms.length, 1);
      await writeFile(join(dir, `${name}.mjs`), rebaseImports(adapted.text, original, overrides));
    }
    for (const name of names) {
      const original = join(originalDir, `${name}.test.mjs`);
      const sourcePath = `${base}/${name}.test.mjs`;
      const source = await readFile(original, 'utf8');
      const alreadyAdapted = source.includes('动画合同可省略网页') || source.includes('图片动画合同默认无需网页');
      const adapted = alreadyAdapted ? { text: source } : adaptOptionalAnimationReview(source, { stack, sourcePath });
      await writeFile(join(dir, `${name}.test.mjs`), rebaseImports(adapted.text, original, overrides));
    }
    const files = names.map((name) => join(dir, `${name}.test.mjs`));
    // 子进程独立测试，不能继承外层 Node test 的私有上下文而跳过报告。
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;
    const { stdout } = await execute(process.execPath, ['--test', '--test-reporter=spec', '--test-name-pattern=动画合同可省略网页|图片动画合同默认无需网页', ...files], { windowsHide: true, env: childEnv, maxBuffer: 4 * 1024 * 1024 });
    assert.match(stdout, /动画合同可省略网页/);
    assert.match(stdout, /图片动画合同默认无需网页/);
    assert.match(stdout, /fail 0/);
  });
}
