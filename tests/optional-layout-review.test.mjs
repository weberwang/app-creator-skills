/** 验证三栈真实布局生成及确认入口可选择 PNG 或交互网页。 */
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import { adaptOptionalLayoutReview } from '../scripts/migration/optional-layout-review-adapter.mjs';

const root = resolve(import.meta.dirname, '..');
const temporaryRoot = realpathSync(tmpdir());
let sandbox;

/** 仅回收本测试创建的独占系统临时目录。 */
after(() => {
  if (!sandbox) return;
  const name = relative(temporaryRoot, sandbox);
  assert.match(name, /^optional-layout-review-[^\\/]+$/);
  assert.equal(realpathSync(sandbox), sandbox);
  rmSync(sandbox, { recursive: true, force: true });
});

/** 复制真实工具闭包，避免并行测试碰撞正式仓库的生成产物。 */
function fixture() {
  if (sandbox) return sandbox;
  sandbox = mkdtempSync(join(temporaryRoot, 'optional-layout-review-'));
  cpSync(join(root, 'skills'), join(sandbox, 'skills'), { recursive: true });
  // YAML 与其他第三方工具使用仓库已有解析器；布局工具仍来自隔离副本。
  writeFileSync(join(sandbox, 'skills/app-skill-runtime/dependencies.cjs'), `module.exports = require(${JSON.stringify(join(root, 'skills/app-skill-runtime/dependencies.cjs'))});\n`);
  return sandbox;
}

/** 将适配器应用到测试副本，实际源码路径与迁移目标均保持原生身份。 */
function adapt(stack, sourcePath, destination = sourcePath) {
  const path = join(fixture(), ...destination.split('/'));
  let source = readFileSync(path, 'utf8');
  // 总是从只读源重新应用确认门，避免已经生成的旧标记使本次修复未经执行。
  if (destination.endsWith('/scripts/layout_annotation_confirmation.mjs')) {
    const prefix = stack === 'phaser' ? 'phaser4' : stack;
    const original = `skills/${prefix}-game-workflow-control/scripts/layout_annotation_confirmation.mjs`;
    source = readFileSync(resolve(root, '..', `${stack}-skills`, original), 'utf8');
    const result = adaptOptionalLayoutReview(source, { stack, sourcePath: original, destination });
    assert.deepEqual(result.transforms, ['optional-layout-review-html']);
    writeFileSync(path, result.text);
    return result.text;
  }
  // Phaser 的原生测试包含可选网页断言，读取源文件应用最新用例适配。
  if (stack === 'phaser' && destination.endsWith('/scripts/generate_layout_annotation.test.mjs')) {
    source = readFileSync(resolve(root, '..', 'phaser-skills', sourcePath), 'utf8')
      .replaceAll('phaser4-game-workflow-control', 'phaser-domain-contracts');
    const result = adaptOptionalLayoutReview(source, { stack, sourcePath, destination });
    assert.deepEqual(result.transforms, ['optional-layout-review-html']);
    writeFileSync(path, result.text);
    return result.text;
  }
  // 全仓迁移完成后读取的副本已经适配；不得再次改写生产工具的源码边界。
  const name = destination.split('/').at(-1);
  const markers = {
    'generate_layout_annotation.mjs': 'args.interactiveReview = true',
    'layout_review_bundle.mjs': 'decisionInputFile = null, includeReview = true',
    'generate_layout_annotation.test.mjs': '默认静态布局只写 PNG 和事实',
    'validate_visual_layout_mapping.mjs': '且与网页身份同时声明',
    'layout_annotation_confirmation.mjs': 'function validateLayoutCandidateFiles(',
    'layout_annotation_confirmation.test.mjs': 'PNG 模式不依赖网页',
    'scene-reconstruction-contract.mjs': '布局审阅页字段不完整',
    'validate_ui_layout_contract.mjs': '且与网页身份同时声明',
  };
  if (markers[name] && source.includes(markers[name])) return source;
  if (name.endsWith('.schema.json') && ![...source.matchAll(/"required"\s*:\s*\[([\s\S]*?)\]/g)].some((match) => /"layout_review_file"/.test(match[1]))) return source;
  const result = adaptOptionalLayoutReview(source, { stack, sourcePath, destination });
  assert.deepEqual(result.transforms, ['optional-layout-review-html'], destination);
  writeFileSync(path, result.text);
  return result.text;
}

for (const [stack, prefix] of Object.entries({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' })) {
  test(`${stack} 静态与交互布局入口及文件门`, async () => {
    const domain = `skills/${stack}-domain-contracts`;
    const asset = `skills/${prefix}-game-asset-integration`;
    const targets = [
      `${asset}/scripts/generate_layout_annotation.mjs`,
      `${asset}/scripts/layout_review_bundle.mjs`,
      `${asset}/scripts/generate_layout_annotation.test.mjs`,
      `${asset}/scripts/validate_visual_layout_mapping.mjs`,
      `${domain}/scripts/layout_annotation_confirmation.mjs`,
      `${domain}/scripts/layout_annotation_confirmation.test.mjs`,
      `${domain}/scripts/scene-reconstruction-contract.mjs`,
      ...['work-item.schema.json', 'implementation-package.schema.json', 'evidence-manifest.schema.json'].map((file) => `${domain}/references/${file}`),
    ];
    if (stack !== 'cocos') targets.push(`skills/${prefix}-game-ui-layout/scripts/validate_ui_layout_contract.mjs`);
    for (const target of targets) adapt(stack, target);
    const { deriveLayoutReviewArtifactPaths, validateLayoutReviewArtifactPaths } = await import(pathToFileURL(join(sandbox, `${asset}/scripts/layout_review_bundle.mjs`)).href);
    const paths = deriveLayoutReviewArtifactPaths(sandbox, join(sandbox, 'collision-test/layout.png'));
    const staticPaths = deriveLayoutReviewArtifactPaths(sandbox, join(sandbox, 'collision-test/layout.png'), false);
    assert.equal(Object.hasOwn(staticPaths, 'review'), false);
    assert.equal(Object.hasOwn(staticPaths, 'reviewFile'), false);
    // 不输出网页时 review.html 可以是受保护输入；交互模式仍必须拒绝覆盖它。
    assert.doesNotThrow(() => validateLayoutReviewArtifactPaths(sandbox, staticPaths, ['collision-test/review.html'], null, false));
    assert.throws(() => validateLayoutReviewArtifactPaths(sandbox, paths, ['collision-test/review.html'], null, true), /不能覆盖上游文件/);
    // 子进程不得继承 Node 测试运行器私有上下文，否则可能退出成功却未运行测试。
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1',
      join(sandbox, `${asset}/scripts/generate_layout_annotation.test.mjs`),
      join(sandbox, `${domain}/scripts/layout_annotation_confirmation.test.mjs`)],
    { cwd: sandbox, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024, env: childEnv });
    assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /布局确认文件门通过真实 PNG/);
    assert.match(result.stdout, /PNG 模式不依赖网页，但仍重算节点并绑定人工决定/);
    assert.match(result.stdout, /fail 0/);
    if (stack === 'threejs') {
      // 原生视觉清单也从确认门读取相同候选，覆盖拆解与资源复用调用链。
      const manifest = spawnSync(process.execPath, ['--test', '--test-name-pattern=拆解提案、决定记录和标注 PNG|每个 scene/state 组拥有独立 PNG|reuse-existing 文件身份必须绑定', join(sandbox, `${asset}/scripts/validate_visual_manifest.test.mjs`)],
        { cwd: sandbox, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024, env: childEnv });
      assert.equal(manifest.status, 0, `${manifest.error ?? ''}\n${manifest.stdout}\n${manifest.stderr}`);
      assert.match(manifest.stdout, /拆解提案、决定记录和标注 PNG/);
      assert.match(manifest.stdout, /fail 0/);
    }
  });
}
