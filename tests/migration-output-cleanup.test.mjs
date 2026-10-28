import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { applyGeneratedDomainResources, assertNoDestinationLinks, GENERATED_DOMAIN_RESOURCES, removeStaleGeneratedFiles } from '../scripts/migration/output-cleanup.mjs';

/** 计算临时迁移目标的内容摘要，模拟上轮清单中的目标 SHA。 */
function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('迁移写入和清理都拒绝 Junction，并保持仓库外文件不变', (t) => {
  const sandbox = mkdtempSync(join(tmpdir(), 'migration-output-junction-'));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const root = join(sandbox, 'repo');
  const outside = join(sandbox, 'outside');
  const externalFile = join(outside, 'payload.json');
  mkdirSync(join(root, 'migration'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(externalFile, 'external bytes', 'utf8');
  symlinkSync(outside, join(root, 'migration', 'escape'), 'junction');
  symlinkSync(outside, join(root, 'migration', 'catalog.json'), 'junction');

  const target = 'migration/escape/payload.json';
  assert.throws(() => assertNoDestinationLinks(root, target), /链接或 Junction/u);
  assert.throws(() => assertNoDestinationLinks(root, 'migration/catalog.json'), /链接或 Junction/u);
  assert.throws(() => removeStaleGeneratedFiles(
    new Map([[target, hashFile(externalFile)]]), new Set(),
    (path) => assertNoDestinationLinks(root, path),
    (path) => hashFile(assertNoDestinationLinks(root, path)),
  ), /链接或 Junction/u);
  assert.equal(readFileSync(externalFile, 'utf8'), 'external bytes');
});

test('清理只移除未手改且未被当前计划引用的上轮登记输出', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'migration-output-hash-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'migration'), { recursive: true });
  const stale = join(root, 'migration', 'old-output.json');
  const current = join(root, 'migration', 'current-output.json');
  writeFileSync(stale, 'generated', 'utf8');
  writeFileSync(current, 'current', 'utf8');
  const resolveTarget = (path) => assertNoDestinationLinks(root, path);
  const previousStaleHash = hashFile(stale);

  const removed = removeStaleGeneratedFiles(
    new Map([['migration/old-output.json', previousStaleHash], ['migration/current-output.json', hashFile(current)]]),
    new Set(['migration/current-output.json']), resolveTarget,
    (path) => hashFile(resolveTarget(path)),
  );
  assert.deepEqual(removed, ['migration/old-output.json']);
  assert.throws(() => readFileSync(stale));
  assert.equal(readFileSync(current, 'utf8'), 'current');

  writeFileSync(stale, 'edited by a person', 'utf8');
  assert.throws(() => removeStaleGeneratedFiles(
    new Map([['migration/old-output.json', previousStaleHash]]), new Set(), resolveTarget,
    (path) => hashFile(resolveTarget(path)),
  ), /已被修改/u);
  assert.equal(readFileSync(stale, 'utf8'), 'edited by a person');
});

test('清理旧技能空目录时保留含用户文件的目录', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'migration-empty-skills-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const paths = ['skills/empty/agents/openai.yaml', 'skills/kept/agents/openai.yaml'];
  for (const path of paths) {
    const absolute = join(root, ...path.split('/'));
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, '旧元数据');
  }
  writeFileSync(join(root, 'skills/kept/用户文件.txt'), '保留');
  const resolveTarget = (path) => assertNoDestinationLinks(root, path);
  removeStaleGeneratedFiles(new Map(paths.map((path) => [path, hashFile(resolveTarget(path))])), new Set(), resolveTarget, (path) => hashFile(resolveTarget(path)));
  assert.equal(existsSync(join(root, 'skills/empty')), false);
  assert.equal(readFileSync(join(root, 'skills/kept/用户文件.txt'), 'utf8'), '保留');
  assert.equal(existsSync(join(root, 'skills/kept/agents')), false);
  assert.equal(existsSync(join(root, 'skills')), true);
});

test('悬空 Junction 即使 existsSync 为 false 也会阻止写入和清理', (t) => {
  const sandbox = mkdtempSync(join(tmpdir(), 'migration-output-dangling-junction-'));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const root = join(sandbox, 'repo');
  const outside = join(sandbox, 'not-created');
  const junction = join(root, 'migration', 'escape');
  mkdirSync(join(root, 'migration'), { recursive: true });
  symlinkSync(outside, junction, 'junction');

  // existsSync 会把悬空链接看成不存在；路径守卫仍必须逐段 lstat 检测链接本体。
  assert.equal(existsSync(junction), false);
  const target = 'migration/escape/payload.json';
  assert.throws(() => assertNoDestinationLinks(root, target), /链接或 Junction/u);
  assert.throws(() => removeStaleGeneratedFiles(
    new Map([[target, 'already-recorded-hash']]), new Set(),
    (path) => assertNoDestinationLinks(root, path),
    () => { throw new Error('悬空 Junction 不应进入哈希读取'); },
  ), /链接或 Junction/u);
  assert.equal(existsSync(outside), false, '拒绝操作不能创建 Junction 指向的仓库外目录');
});

test('领域测试目标的实际哈希与迁移账本不同时拒绝覆盖', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'migration-output-domain-test-hash-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entry = GENERATED_DOMAIN_RESOURCES[0];
  const target = join(root, ...entry.path.split('/'));
  const templatePath = join(root, ...entry.template.split('/'));
  const templateBytes = readFileSync(new URL(`../${entry.template}`, import.meta.url));
  mkdirSync(join(target, '..'), { recursive: true });
  mkdirSync(join(templatePath, '..'), { recursive: true });
  writeFileSync(templatePath, templateBytes);
  writeFileSync(target, templateBytes);
  const recordedHash = hashFile(target);
  writeFileSync(target, '手工编辑的领域测试内容', 'utf8');

  const resolveTarget = (path) => assertNoDestinationLinks(root, path);
  assert.throws(() => applyGeneratedDomainResources({
    repositoryRoot: root,
    previousHashes: new Map([[entry.path, recordedHash]]),
    resolveDestination: resolveTarget,
    hashDestination: (path) => hashFile(resolveTarget(path)),
    sha256: (bytes) => createHash('sha256').update(bytes).digest('hex'),
  }), /领域测试已被手动修改，拒绝覆盖/u);
  assert.equal(readFileSync(target, 'utf8'), '手工编辑的领域测试内容');
});
