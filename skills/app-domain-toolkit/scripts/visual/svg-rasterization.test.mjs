import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from '../../../app-skill-runtime/sharp.mjs';
import { rasterizeSvg, svgRasterizerVersion } from './svg-rasterization.mjs';

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect x="5" y="5" width="90" height="40" rx="5" fill="url(#g)"/></svg>');

test('SVG 在目标分辨率矢量绘制，输出格式和透明边缘可重现', async () => {
  const options = { width: 200, height: 100, alpha: 'transparent' };
  const first = await rasterizeSvg(svg, options);
  const second = await rasterizeSvg(svg, options);
  assert.deepEqual(first, second);
  const { data, info } = await sharp(first).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [200, 100, 4]);
  assert.equal(data[3], 0);
  const left = (50 * info.width + 25) * info.channels;
  const right = (50 * info.width + 175) * info.channels;
  assert.ok(data[left] > data[left + 2] && data[right] < data[right + 2]);
  assert.match(svgRasterizerVersion(), /sharp\/.+;librsvg\/.+;vips\//);
});

test('按照实际像素阻断不透明、透明、空图和比例错误', async () => {
  const solid = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#fff"/></svg>');
  const opaque = await rasterizeSvg(solid, { width: 100, height: 50, alpha: 'opaque' });
  assert.equal((await sharp(opaque).metadata()).hasAlpha, false);
  await assert.rejects(rasterizeSvg(solid, { width: 100, height: 50, alpha: 'transparent' }), /Alpha/);
  await assert.rejects(rasterizeSvg(svg, { width: 100, height: 50, alpha: 'opaque' }), /Alpha/);
  await assert.rejects(rasterizeSvg(Buffer.from('<svg viewBox="0 0 1 1"/>'), { width: 1, height: 1, alpha: 'transparent' }), /Alpha/);
  await assert.rejects(rasterizeSvg(svg, { width: 100, height: 100, alpha: 'transparent' }), /比例/);
  await assert.rejects(rasterizeSvg(svg, { width: 4097, height: 2048, alpha: 'transparent' }), /尺寸/);
});

test('拒绝外部资源、执行内容、实体和缺失的内部引用', async () => {
  const invalid = [
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]><svg viewBox="0 0 1 1">&x;</svg>',
    '<svg viewBox="0 0 1 1"><script/></svg>',
    '<svg viewBox="0 0 1 1"><image href="file:///secret"/></svg>',
    '<svg viewBox="0 0 1 1"><foreignObject/></svg>',
    '<svg viewBox="0 0 1 1"><rect style="fill:red"/></svg>',
    '<svg viewBox="0 0 1 1"><rect fill="url(https://example.com/#g)"/></svg>',
    '<svg viewBox="0 0 1 1"><rect fill="url(#missing)"/></svg>',
    '<svg viewBox="0 0 1 1"><use href="&#104;ttps://example.com"/></svg>',
    '<svg viewBox="0 0 1 1"><animate attributeName="x"/></svg>',
    '<svg viewBox="0 0 1 1"><rect onclick="alert(1)"/></svg>',
  ];
  for (const input of invalid) await assert.rejects(rasterizeSvg(Buffer.from(input), { width: 1, height: 1, alpha: 'transparent' }));
});

test('CLI 等待当前 SVG 源稿人工确认，再记录确认与 PNG 的摘要', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'svg-raster-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'source.svg'), svg);
  const script = fileURLToPath(new URL('./svg-rasterization.mjs', import.meta.url));
  /** 在独立项目目录执行真实 CLI。 */
  function run(source, output, ...options) {
    return spawnSync(process.execPath, [script, '--source', source, '--output', output, '--width', '200', '--height', '100', '--alpha', 'transparent', ...options], { cwd: root, encoding: 'utf8', windowsHide: true });
  }
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const reviewPath = 'source.review.json';
  const reviewArgs = ['--source-review', reviewPath];
  /** 写入测试审批或退回记录，绑定当前源稿的实际字节。 */
  function recordReview(bytes, decision = 'APPROVED') {
    const record = JSON.stringify({ schemaVersion: '1.0', stage: 'V4', purpose: 'svg-source', decision, objectId: 'icon',
      workItemId: 'test-work', candidateId: 'test-candidate', targetRef: 'source.svg', targetSha256: sha(bytes), userMessageRef: 'test://svg-review' });
    writeFileSync(join(root, reviewPath), record);
    return { path: reviewPath, sha256: sha(record) };
  }
  const pending = run('source.svg', 'out/icon.png');
  assert.notEqual(pending.status, 0);
  assert.match(pending.stderr, /SVG 源稿人工确认/);
  const missingReview = run('source.svg', 'out/icon.png', ...reviewArgs);
  assert.notEqual(missingReview.status, 0);
  assert.match(missingReview.stderr, /等待用户确认/);
  recordReview(svg, 'REJECTED');
  const rejected = run('source.svg', 'out/icon.png', ...reviewArgs);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /未批准/);
  assert.equal(existsSync(join(root, 'out')), false);
  const reviewRef = recordReview(svg);
  const result = run('source.svg', 'out/icon.png', ...reviewArgs);
  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(result.stdout);
  assert.equal(record.schema_version, 'svg-rasterization/2.0');
  assert.deepEqual(record.source_review_ref, reviewRef);
  assert.equal(record.source_sha256, sha(svg));
  assert.equal(record.output_sha256, sha(readFileSync(join(root, 'out/icon.png'))));
  assert.equal(record.renderer_version, svgRasterizerVersion());
  const saved = readFileSync(join(root, 'out/icon.png'));
  const changed = Buffer.from(svg.toString().replace('#f00', '#0f0'));
  writeFileSync(join(root, 'source.svg'), changed);
  const staleReview = run('source.svg', 'out/icon.png', ...reviewArgs, '--overwrite');
  assert.notEqual(staleReview.status, 0);
  assert.match(staleReview.stderr, /须重新审阅/);
  assert.deepEqual(readFileSync(join(root, 'out/icon.png')), saved);
  recordReview(changed);
  const protectedOutput = run('source.svg', 'out/icon.png', ...reviewArgs);
  assert.notEqual(protectedOutput.status, 0);
  assert.match(protectedOutput.stderr, /已存在/);
  assert.deepEqual(readFileSync(join(root, 'out/icon.png')), saved);
  const replaced = run('source.svg', 'out/icon.png', ...reviewArgs, '--overwrite');
  assert.equal(replaced.status, 0, replaced.stderr);
  assert.notDeepEqual(readFileSync(join(root, 'out/icon.png')), saved);
  assert.equal(JSON.parse(replaced.stdout).source_sha256, sha(changed));
  assert.notEqual(run('source.svg', 'out/icon.png', ...reviewArgs, '--overwrite', '--overwrite').status, 0);
  assert.notEqual(run('../outside.svg', 'out/other.png', ...reviewArgs).status, 0);
  assert.notEqual(run('source.svg', '../outside.png', ...reviewArgs).status, 0);
  assert.notEqual(run('source.svg', '.git/icon.png', ...reviewArgs).status, 0);
  assert.notEqual(run('source.svg', '.agents/icon.png', ...reviewArgs).status, 0);
});
