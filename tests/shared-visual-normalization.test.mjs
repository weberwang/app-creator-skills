/** 验证视觉归一化公共工厂保留栈专属路径行为与原始合同接口。 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { buildSharedVisualNormalizationCapability } from '../scripts/migration/shared-visual-normalization.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = { cocos: 'cocos-game-workflow-control', phaser: 'phaser4-game-workflow-control', threejs: 'threejs-game-workflow-control' };
const FIXTURE = `import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeProjectRelativePath } from "./visual-component-contract.mjs";
export const IMAGE_NORMALIZATION_STATUS = Object.freeze(["passed"]);
export const IMAGE_NORMALIZATION_OPERATIONS = Object.freeze(["not-required"]);
export const IMAGE_NORMALIZATION_SCHEMA = "image-normalization/1";
export const IMAGE_ASPECT_RATIO_CORRECTION_SCHEMA = "aspect-ratio-correction/1";
export const IMAGE_ASPECT_RATIO_CORRECTION_TRIGGER = "two-attempts";
export const IMAGE_ASPECT_RATIO_CORRECTION_STRATEGY = "controlled-crop";
export const IMAGE_NORMALIZATION_OUTPUT_FORMATS = Object.freeze(["png"]);
export function getImageNormalizationRecords(asset = {}, generation = {}) { return [asset, generation]; }
export function getImageNormalizationRecord(asset = {}, generation = {}) { return getImageNormalizationRecords(asset, generation)[0]; }
export function sameImageAspectRatio(a, b, c, d) { return a * d === b * c; }
export function validateImageNormalizationContract({ path } = {}) { return normalizeProjectRelativePath(path); }
`;

/** 构造具备真实源身份和独立依赖目标的最小迁移计划。 */
function fixturePlans(content = Buffer.from(FIXTURE)) {
  return Object.entries(SKILLS).map(([stack, skill]) => {
    const source = `skills/${skill}/scripts/visual-image-normalization-contract.mjs`;
    const component = `skills/${skill}/scripts/visual-component-contract.mjs`;
    return { stack, entries: new Map([
      [source, { destination: `skills/${stack}-domain-contracts/scripts/visual-image-normalization-contract.mjs` }],
      [component, { destination: `skills/${stack}-domain-contracts/scripts/visual-component-contract.mjs` }],
    ]), sourceBuffers: new Map([[source, content], [component, Buffer.from('export { normalizeProjectRelativePath };')]]) };
  });
}

/** 动态加载生成的公共工厂，不生成文件或安装图片处理依赖。 */
async function loadFactory(content) {
  return (await import(`data:text/javascript;base64,${Buffer.from(content).toString('base64')}`)).createVisualNormalizationContract;
}

test('公共工厂保留所有 API 并按各栈单独注入路径合同', async () => {
  const capability = buildSharedVisualNormalizationCapability(fixturePlans());
  const create = await loadFactory(capability.content);
  const cocos = create({ normalizeProjectRelativePath: (path) => `cocos/${path}` });
  const phaser = create({ normalizeProjectRelativePath: (path) => `phaser/${path}` });
  assert.equal(cocos.validateImageNormalizationContract({ path: 'a.png' }), 'cocos/a.png');
  assert.equal(phaser.validateImageNormalizationContract({ path: 'a.png' }), 'phaser/a.png');
  assert.equal(cocos.sameImageAspectRatio(2, 3, 4, 6), true);
  assert.throws(() => create(), /路径归一化/);
  for (const source of capability.sources) {
    assert.match(source.adapterContent, /visual-component-contract\.mjs/);
    assert.match(source.adapterContent, /app-domain-toolkit\/scripts\/visual\/visual-image-normalization-contract\.mjs/);
    assert.equal(source.adapterDestination.includes(`${source.stack}-domain-contracts`), true);
  }
  assert.equal(capability.sources.length, 3);
});

test('源字节、导出、导入及技术栈依赖漂移均拒绝合并', () => {
  let plans = fixturePlans();
  plans[1].sourceBuffers.set(`skills/${SKILLS.phaser}/scripts/visual-image-normalization-contract.mjs`, Buffer.from(FIXTURE + '\n// 不同规则'));
  assert.throws(() => buildSharedVisualNormalizationCapability(plans), /不一致/);
  plans = fixturePlans(Buffer.from(FIXTURE.replace('export function sameImageAspectRatio', 'function sameImageAspectRatio')));
  assert.throws(() => buildSharedVisualNormalizationCapability(plans), /导出 API/);
  plans = fixturePlans(Buffer.from(FIXTURE.replace('import { readFileSync } from "node:fs";', 'import { readFileSync } from "node:fs";\nimport "other";')));
  assert.throws(() => buildSharedVisualNormalizationCapability(plans), /新增导入/);
  plans = fixturePlans();
  plans[0].sourceBuffers.set(`skills/${SKILLS.cocos}/scripts/visual-component-contract.mjs`, Buffer.from('export const other = 1;'));
  assert.throws(() => buildSharedVisualNormalizationCapability(plans), /不再导出/);
  plans = fixturePlans();
  plans[2].entries.get(`skills/${SKILLS.threejs}/scripts/visual-component-contract.mjs`).destination = 'skills/../outside.mjs';
  assert.throws(() => buildSharedVisualNormalizationCapability(plans), /路径无效/);
});

test('实际三栈来源与公共工厂在成功和错误场景行为一致', async (t) => {
  const files = Object.entries(SKILLS).map(([stack, skill]) => ({ stack, skill,
    root: resolve(ROOT, '..', `${stack}-skills`, 'skills', skill, 'scripts'),
    target: resolve(ROOT, 'skills', `${stack}-domain-contracts`, 'scripts'),
  }));
  if (files.some(({ root }) => !existsSync(resolve(root, 'visual-image-normalization-contract.mjs')))) return t.skip('需要五源仓库中的三栈只读来源');
  const plans = fixturePlans();
  for (let index = 0; index < files.length; index += 1) {
    const { skill, root } = files[index];
    for (const file of ['visual-image-normalization-contract.mjs', 'visual-component-contract.mjs']) {
      plans[index].sourceBuffers.set(`skills/${skill}/scripts/${file}`, readFileSync(resolve(root, file)));
    }
  }
  const capability = buildSharedVisualNormalizationCapability(plans);
  const create = await loadFactory(capability.content);
  for (const { stack, root, target } of files) {
    const source = readFileSync(resolve(root, 'visual-image-normalization-contract.mjs'), 'utf8');
    const originalImport = 'import { normalizeProjectRelativePath } from "./visual-component-contract.mjs";';
    const first = source.indexOf(originalImport);
    // 原实现必须来自未生成的源仓库，且只重基唯一的栈依赖导入。
    assert.notEqual(first, -1, `${stack} 原始合同缺少组件导入`);
    assert.equal(source.indexOf(originalImport, first + originalImport.length), -1, `${stack} 原始合同的组件导入不唯一`);
    const componentUrl = pathToFileURL(resolve(target, 'visual-component-contract.mjs')).href;
    const rebased = source.slice(0, first)
      + `import { normalizeProjectRelativePath } from ${JSON.stringify(componentUrl)};`
      + source.slice(first + originalImport.length);
    const original = await import(`data:text/javascript;base64,${Buffer.from(rebased).toString('base64')}`);
    const component = await import(pathToFileURL(resolve(target, 'visual-component-contract.mjs')).href);
    const shared = create({ normalizeProjectRelativePath: component.normalizeProjectRelativePath });
    assert.deepEqual(Object.keys(shared).sort(), Object.keys(original).sort(), stack);
    assert.deepEqual(shared.getImageNormalizationRecords({ normalization_record: { status: 'passed' } }, {}), original.getImageNormalizationRecords({ normalization_record: { status: 'passed' } }, {}));
    assert.equal(shared.sameImageAspectRatio(1920, 1080, 16, 9), original.sameImageAspectRatio(1920, 1080, 16, 9));
    for (const input of [{}, { expectedAsset: { width: 16, height: 9 }, asset: {}, generation: {} }, { expectedAsset: { width: 16, height: 9 }, asset: { normalization_record: { operation: 'invalid' } } }]) {
      assert.deepEqual(shared.validateImageNormalizationContract(input), original.validateImageNormalizationContract(input), stack);
    }
  }
});
