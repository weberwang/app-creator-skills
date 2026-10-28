/** 验证多个真实来源直接共用单一文件时的摘要和身份边界。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { isDirectSharedDestination, validateSharedCapabilities } from '../scripts/validate-shared-capabilities.mjs';
import { validateMigration } from '../scripts/verify-migration.mjs';

/** 创建不依赖真实源仓库的直接共享来源及实际目标文件。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'direct-shared-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const implementation = 'skills/app-domain-toolkit/scripts/build/validate.mjs';
  const bytes = Buffer.from('export const result = true;\n');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const path = join(root, ...implementation.split('/'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  const rows = ['cocos', 'phaser', 'threejs'].map((stack) => ({
    stack, sourcePath: `skills/${stack}-architecture/scripts/validate.mjs`,
    sourceSha256: hash, destination: implementation, destinationSha256: hash,
    disposition: 'copied', reason: '多栈相同文件经摘要核验后直接使用公共真源。', transforms: [], directShared: true, sharedImplementationRef: implementation,
  }));
  const capability = {
    id: 'production-build', kind: 'module', directShared: true, implementation,
    stacks: rows.map((row) => row.stack), dependencies: [],
    sources: rows.map((row) => ({ stack: row.stack, sourcePath: row.sourcePath, sourceSha256: row.sourceSha256, adapterDestination: implementation })),
  };
  const catalog = { sharedCapabilities: [capability], generatedFiles: [{ path: implementation, destinationSha256: hash }] };
  const run = () => {
    const errors = [];
    validateSharedCapabilities({ root, catalog, fileRows: rows, resolveFile: (value) => resolve(root, ...value.split('/')), errors });
    return errors;
  };
  const group = () => isDirectSharedDestination({ catalog, destination: implementation, rows, actualSha256: createHash('sha256').update(requireBytes(path)).digest('hex') });
  return { root, catalog, capability, rows, implementation, path, hash, run, group };
}

/** 实际文件变化必须参与校验，不能仅信任清单内的哈希。 */
function requireBytes(path) {
  return readFileSync(path);
}

test('允许真实多栈来源直接绑定唯一公共文件', (t) => {
  const value = fixture(t);
  assert.equal(value.group(), true);
  assert.deepEqual(value.run(), []);
});

test('拒绝伪造来源、错误摘要或未登记的额外来源', (t) => {
  const value = fixture(t);
  value.capability.sources[0].sourcePath = 'skills/fake/scripts/validate.mjs';
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('来源')));
  value.capability.sources[0].sourcePath = value.rows[0].sourcePath;
  value.rows[1].sourceSha256 = 'a'.repeat(64);
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('摘要')));
  value.rows[1].sourceSha256 = value.hash;
  value.rows.push({ ...value.rows[0], stack: 'unity', sourcePath: 'unity-extra.mjs' });
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('来源')));
});

test('拒绝移除共享登记、篡改标记或不足两个技术栈', (t) => {
  const value = fixture(t);
  value.rows[0].directShared = false;
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('绑定')));
  value.rows[0].directShared = true;
  value.capability.directShared = false;
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('没有公共能力登记')));
  value.capability.directShared = true;
  value.catalog.sharedCapabilities = [];
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('没有公共能力登记')));
  value.catalog.sharedCapabilities = [value.capability];
  value.rows.splice(1);
  value.capability.sources.splice(1);
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('至少两个')));
});

test('两个来源均来自同一栈时也不能冒充跨栈共享', (t) => {
  const value = fixture(t);
  value.rows.splice(1);
  value.capability.sources.splice(1);
  value.rows.push({ ...value.rows[0], sourcePath: 'skills/cocos-second/scripts/validate.mjs' });
  value.capability.sources.push({ ...value.capability.sources[0], sourcePath: value.rows[1].sourcePath });
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('至少两个技术栈')));
});

test('拒绝目标文件被修改和引用其他公共文件的冒用', (t) => {
  const value = fixture(t);
  writeFileSync(value.path, 'tampered');
  assert.equal(value.group(), false);
  assert.ok(value.run().some((error) => error.includes('摘要')));
  assert.equal(isDirectSharedDestination({ catalog: value.catalog, destination: 'skills/other/file.mjs', rows: value.rows, actualSha256: value.hash }), false);
});

test('完整迁移校验仅放行匹配共享登记的多源及生成文件重合', (t) => {
  const value = fixture(t);
  value.catalog.schemaVersion = '1.0';
  value.catalog.filesRef = 'migration/files.json';
  value.catalog.capabilities = [];
  value.catalog.stacks = Object.fromEntries(['unity', 'cocos', 'phaser', 'threejs', 'flutter'].map((stack) => [stack, { skills: [], capabilitySkills: [], nativeAdapters: [], authoredAdapters: [], resourceDirectories: [], tools: [] }]));
  value.catalog.generatedFiles[0].reason = '多栈正式构建校验公共真源。';
  mkdirSync(join(value.root, 'migration'), { recursive: true });
  const validate = () => {
    writeFileSync(join(value.root, 'migration/catalog.json'), JSON.stringify(value.catalog));
    writeFileSync(join(value.root, 'migration/files.json'), JSON.stringify(value.rows));
    return validateMigration({ root: value.root }).errors;
  };
  const conflicts = (errors) => errors.filter((error) => /多个源文件覆盖同一目标|生成文件与源文件迁移目标冲突/.test(error));
  assert.deepEqual(conflicts(validate()), []);
  value.capability.sources.pop();
  assert.equal(conflicts(validate()).length, 2);
});
