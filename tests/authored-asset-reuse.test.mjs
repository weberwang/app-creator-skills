/** 校验 Unity 图片工具只读复用公共作者文件及其不可越界的摘要合同。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { mapAuthoredAssetReuse, validateAuthoredAssetReuse } from '../scripts/migration/authored-asset-reuse.mjs';
import { assertSafeDestination } from '../scripts/migration/migrate-specialists.mjs';
import { mapSourceFile } from '../scripts/migration/source-policy.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCES = ['png-raster.mjs', 'remove-background-local.mjs'];
const SOURCE_HASHES = {
  'png-raster.mjs': '83e45c10224c12ee4d9f325550ddc8f974fbc03bb6ba379947de052e9f55f02e',
  'remove-background-local.mjs': '1ba9a1424bf5463d27a50526fa6f1105ec0ae3b405dc30f1d8da4b78b0be8596',
};

/** 使用当前公共文件构造隔离目标与对应源字节，不依赖外部服务。 */
function fixture(t, name) {
  const root = mkdtempSync(join(tmpdir(), 'authored-asset-reuse-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourcePath = `unity-game-visual-assets/scripts/${name}`;
  const entry = { stack: 'unity', sourcePath, ...mapAuthoredAssetReuse('unity', sourcePath), sourceSha256: SOURCE_HASHES[name] };
  const text = readFileSync(join(ROOT, ...entry.destination.split('/')), 'utf8');
  const original = name === 'png-raster.mjs' ? text : text
    .replace('import { isDirectEntry } from "../../app-skill-runtime/direct-entry.mjs";', 'import { fileURLToPath } from "node:url";')
    .replace('if (isDirectEntry(import.meta.url)) await main();', 'if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();');
  const target = join(root, ...entry.destination.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  return { root, entry, sourceBuffer: Buffer.from(original, 'utf8'), target };
}

test('两个 Unity 工具复用现有公共文件，来源和目标均有摘要证明', (t) => {
  for (const name of SOURCES) {
    const item = fixture(t, name);
    const sourceFile = join(ROOT, '..', 'unity-skills', ...item.entry.sourcePath.split('/'));
    if (existsSync(sourceFile)) assert.deepEqual(item.sourceBuffer, readFileSync(sourceFile));
    const actual = validateAuthoredAssetReuse(item);
    assert.match(actual, /^[a-f0-9]{64}$/);
    assert.deepEqual(mapSourceFile('unity', item.entry.sourcePath, new Set()), mapAuthoredAssetReuse('unity', item.entry.sourcePath));
    assert.throws(() => assertSafeDestination(item.entry.destination), /不得覆盖公共技能/);
    assert.equal(mapAuthoredAssetReuse('cocos', item.entry.sourcePath), null);
  }
});

test('源摘要、作者目标或迁移身份变化时拒绝复用', (t) => {
  for (const name of SOURCES) {
    const item = fixture(t, name);
    assert.throws(() => validateAuthoredAssetReuse({ ...item, sourceBuffer: Buffer.from('已漂移') }), /来源摘要漂移/);
    assert.throws(() => validateAuthoredAssetReuse({ ...item, entry: { ...item.entry, destination: '../外部.mjs' } }), /来源、目标或迁移记录不匹配/);
    assert.throws(() => validateAuthoredAssetReuse({ ...item, entry: { ...item.entry, transforms: [] } }), /来源、目标或迁移记录不匹配/);
    writeFileSync(item.target, '已变更的公共文件');
    assert.throws(() => validateAuthoredAssetReuse(item), /目标摘要漂移/);
  }
});

test('公共文件祖先为目录链接时拒绝读取，避免跳出仓库', (t) => {
  const item = fixture(t, 'png-raster.mjs');
  const external = mkdtempSync(join(tmpdir(), 'authored-asset-external-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  const scripts = dirname(item.target);
  rmSync(scripts, { recursive: true });
  symlinkSync(external, scripts, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => validateAuthoredAssetReuse(item), /链接或 Junction/);
});

test('现有公共去背 CLI 保留可直接调用的帮助入口', () => {
  const script = join(ROOT, 'skills/app-asset-workflow/scripts/remove-background-local.mjs');
  const result = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /用法：node remove-background-local\.mjs/);
});
