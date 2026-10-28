/** 验证语言适配从已审核外部源重建且作者资源不会被迁移清理。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { adaptProjectLocales, assertProjectLocaleAdaptablePlans } from '../scripts/migration/project-locale-adapter.mjs';
import { GENERATED_DOMAIN_RESOURCES, removeStaleGeneratedFiles } from '../scripts/migration/output-cleanup.mjs';
import { adaptUnifiedStages, loadUnifiedStagePatches } from '../scripts/migration/unified-stage-adapter.mjs';

const root = resolve(import.meta.dirname, '..');
const parent = resolve(root, '..');
const digest = (value) => createHash('sha256').update(value).digest('hex');

test('三栈迁移语言校验使用项目所选语言而非旧五语言', (t) => {
  for (const [stack, prefix] of [['cocos', 'cocos'], ['phaser', 'phaser4'], ['threejs', 'threejs']]) {
    const sourcePath = `skills/${prefix}-game-ui-layout/scripts/validate_ui_layout_contract.mjs`;
    const path = join(parent, `${stack}-skills`, sourcePath);
    if (!existsSync(path)) return t.skip(`缺少只读源仓库 ${stack}`);
    const input = readFileSync(path);
    const output = adaptProjectLocales(input, { stack, sourcePath, destination: sourcePath, repositoryRoot: root });
    assert.equal(output.changed, true);
    assert.doesNotMatch(output.buffer.toString(), /const REQUIRED_PROGRAMMATIC_TEXT_LANGUAGES/);
    assert.match(output.buffer.toString(), /for \(const language of languages\)/);
    assert.match(output.buffer.toString(), /default_language 必须属于所选语言/);
  }
});

test('Unity 字体模板从已审计来源重建，源漂移被拒绝', (t) => {
  const sourcePath = 'unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit/Editor/FontPipeline/TmpFontAtlasGenerator.cs';
  const path = join(parent, 'unity-skills', sourcePath);
  if (!existsSync(path)) return t.skip('缺少 Unity 只读源仓库');
  const input = readFileSync(path);
  const output = adaptProjectLocales(input, { stack: 'unity', sourcePath, repositoryRoot: root });
  assert.deepEqual(output.buffer, readFileSync(join(root, `skills/${sourcePath}`)));
  assert.throws(() => adaptProjectLocales(Buffer.from('changed'), { stack: 'unity', sourcePath, repositoryRoot: root }), /源摘要漂移/);
});

test('Unity 响应式合同从五语言源迁移后允许项目自选语言', (t) => {
  const sourcePath = 'unity-game-workflow-control/schemas/work-item.schema.json';
  const source = join(parent, 'unity-skills', sourcePath);
  if (!existsSync(source)) return t.skip('缺少 Unity 只读源仓库');
  const adapted = adaptProjectLocales(readFileSync(source), { stack: 'unity', sourcePath, destination: 'skills/unity-domain-contracts/schemas/work-item.schema.json', repositoryRoot: root });
  const fields = JSON.parse(adapted.buffer).$defs.textLocalization.properties;
  assert.equal(fields.locales.minItems, 1);
  assert.equal(fields.locales.prefixItems, undefined);
  assert.equal(fields.localePolicies.required, undefined);
  assert.deepEqual(fields.localePolicies.additionalProperties, { $ref: '#/$defs/localePolicy' });
});

test('Cocos 响应式测试从已审核源重建真实语言引用并拒绝源漂移', (t) => {
  const sourcePath = 'skills/cocos-game-qa-performance/scripts/responsive-visual-validation.test.mjs';
  const source = join(parent, 'cocos-skills', sourcePath);
  if (!existsSync(source)) return t.skip('缺少 Cocos 只读源仓库');
  const input = readFileSync(source);
  // 迁移先重定位测试所需的领域夹具，再执行项目语言适配。
  const rebased = Buffer.from(input.toString('utf8').replaceAll('../../cocos-game-workflow-control/scripts/', '../../cocos-domain-contracts/scripts/'));
  const adapted = adaptProjectLocales(rebased, { stack: 'cocos', sourcePath, destination: sourcePath, repositoryRoot: root, sourceBuffer: input });
  assert.equal(adapted.changed, true);
  const stage = adaptUnifiedStages(adapted.buffer, { stack: 'cocos', sourcePath, destination: sourcePath, sourceBuffer: input, patches: loadUnifiedStagePatches(root) });
  assert.equal(stage.changed, true);
  assert.deepEqual(stage.buffer, readFileSync(join(root, sourcePath)));
  assert.throws(() => adaptProjectLocales(rebased, { stack: 'cocos', sourcePath, destination: sourcePath, repositoryRoot: root, sourceBuffer: Buffer.from('drift') }), /源摘要漂移/);
});

test('作者语言资源在重建计划中注册，不被旧产物清理删除', () => {
  const item = GENERATED_DOMAIN_RESOURCES.find((entry) => entry.path.endsWith('/TmpLocaleTests.cs'));
  assert.ok(item);
  const temp = mkdtempSync(join(tmpdir(), 'locale-migration-'));
  try {
    const target = join(temp, 'locale.cs');
    const bytes = readFileSync(join(root, item.template));
    writeFileSync(target, bytes);
    const removed = removeStaleGeneratedFiles(new Map([[item.path, digest(bytes)]]), new Set(GENERATED_DOMAIN_RESOURCES.map((entry) => entry.path)), () => target, () => digest(readFileSync(target)));
    assert.deepEqual(removed, []);
    assert.equal(existsSync(target), true);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('源摘要漂移在任何输出写入前阻断', () => {
  const sourcePath = 'unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit/Editor/FontPipeline/TmpFontAtlasGenerator.cs';
  const entry = { sourcePath, destination: `skills/${sourcePath}`, transforms: [] };
  const plan = { stack: 'unity', entries: new Map([[sourcePath, entry]]), sourceBuffers: new Map([[sourcePath, Buffer.from('drift')]]) };
  assert.throws(() => assertProjectLocaleAdaptablePlans([plan], {}, { repositoryRoot: root, readText: () => null, transformShared: () => { throw new Error('不得写入'); }, transformText: () => { throw new Error('不得写入'); } }), /源摘要漂移/);
});
