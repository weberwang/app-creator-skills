/** 验证轻量包由安装器真源生成，且未配置远程地址时不能发布。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildNpxPackage, validateNpxConfig } from '../packages/installer/build-npx-package.mjs';

/** 创建独占源码夹具，包构建不会触及当前项目或真实发布目录。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'app-creator-npx-package-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cli = join(root, 'packages', 'cli');
  mkdirSync(cli, { recursive: true });
  writeFileSync(join(root, 'install.mjs'), 'export const fixtureBootstrap = true;\n');
  writeFileSync(join(cli, 'cli.mjs'), '#!/usr/bin/env node\n');
  writeFileSync(join(cli, 'installer.config.json'), JSON.stringify({ repository: '', ref: '' }));
  return { root, cli };
}

/** 普通打包可等待地址补充，发布检查必须拒绝空地址和非法默认来源。 */
test('npx 配置允许稍后填写，但发布前必须校验默认仓库', () => {
  assert.equal(validateNpxConfig({ repository: '', ref: '' }).configured, false);
  assert.throws(() => validateNpxConfig({ repository: '', ref: '' }, { required: true }), /远程地址待配置/);
  assert.throws(() => validateNpxConfig({ repository: 'https://example.com/repo', ref: '' }), /repo|GitHub/);
  assert.throws(() => validateNpxConfig({ repository: 'owner/repo', ref: 'bad\nref' }), /ref/);
  assert.equal(validateNpxConfig({ repository: 'owner/repo', ref: 'main' }, { required: true }).configured, true);
});

/** 包内引导器必须与真源字节一致，避免修改真源后仍发布旧的生成副本。 */
test('npx 构建仅生成同一安装器副本，发布门禁在写入前生效', (t) => {
  const { root, cli } = fixture(t);
  assert.throws(() => buildNpxPackage({ root, checkConfig: true }), /远程地址待配置/);
  assert.equal(existsSync(join(cli, 'generated')), false);
  const built = buildNpxPackage({ root });
  assert.equal(built.configured, false);
  assert.deepEqual(readFileSync(built.output), readFileSync(join(root, 'install.mjs')));
  writeFileSync(join(root, 'install.mjs'), 'export const fixtureBootstrap = "updated";\n');
  const updated = buildNpxPackage({ root });
  assert.deepEqual(readFileSync(updated.output), readFileSync(join(root, 'install.mjs')));
});

/** 构建目录被重定向时应拒绝操作，防止生成步骤覆盖用户工作区外的文件。 */
test('npx 构建拒绝 generated 目录中的 Junction 或符号链接', (t) => {
  const { root, cli } = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), 'app-creator-npx-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const protectedFile = join(outside, 'bootstrap.mjs');
  writeFileSync(protectedFile, '保留内容');
  symlinkSync(outside, join(cli, 'generated'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => buildNpxPackage({ root }), /链接/);
  assert.equal(readFileSync(protectedFile, 'utf8'), '保留内容');
});
