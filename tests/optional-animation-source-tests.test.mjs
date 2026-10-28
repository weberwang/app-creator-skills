/** 核对三栈迁移后的图片图集原生用例，保留播放页与默认无网页两条路径。 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { adaptOptionalAnimationReview } from '../scripts/migration/optional-animation-review-adapter.mjs';

const root = resolve(import.meta.dirname, '..');
const execute = promisify(execFile);

/** 测试副本放在系统临时目录，导入仍指向已安装的真实原生打包器。 */
function rebaseImports(text, original) {
  return text.replace(/\bfrom\s+(["'])(\.\.?\/[^"']+)\1/g, (_match, quote, name) => {
    return `from ${quote}${pathToFileURL(resolve(dirname(original), name)).href}${quote}`;
  });
}

for (const [stack, prefix] of Object.entries({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' })) {
  test(`${stack} 图片打包原生测试支持显式播放与默认无网页`, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), `optional-animation-source-${stack}-`));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const original = join(root, `skills/${stack}-domain-contracts/resources/frame-animation/scripts/images-to-atlas.test.mjs`);
    const source = await readFile(original, 'utf8');
    // 迁移后真实用例已适配，迁移前则只在临时副本应用一次相同变换。
    const result = source.includes('outputPreview: join(directory, "packed-preview.html")')
      ? { text: source }
      : adaptOptionalAnimationReview(source, { stack, sourcePath: `skills/${prefix}-frame-animation/scripts/images-to-atlas.test.mjs` });
    assert.match(result.text, /test\("图片打包按 index/);
    const temporary = join(directory, 'images-to-atlas.test.mjs');
    await writeFile(temporary, rebaseImports(result.text, original));
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;
    const { stdout } = await execute(process.execPath, ['--test', '--test-reporter=spec', temporary], { windowsHide: true, env: childEnv, maxBuffer: 4 * 1024 * 1024 });
    assert.match(stdout, /图片打包按 index 排列/);
    assert.match(stdout, /API 与 CLI 的相对路径/);
    assert.match(stdout, /图片摘要陈旧时/);
    assert.match(stdout, /fail 0/);
  });
}
