/** 从单栈安装副本验证文本验收，防止共享模块只在维护仓库中可用。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';

/** 仅导入安装目标内的模块，不回退到维护目录中的校验器或夹具。 */
function installed(skillsRoot, file) {
  return import(pathToFileURL(join(skillsRoot, file)).href);
}

for (const stack of ['cocos', 'phaser', 'threejs']) {
  test(`${stack} 单栈安装后的 V5 文本门保留目标与样式约束`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `text-acceptance-${stack}-`));
    // 回收范围只限本测试创建的独占目录，安装不会触及用户项目。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const skillsRoot = join(project, '.agents/skills');
    assert.ok(existsSync(join(skillsRoot, 'app-domain-toolkit/scripts/visual/text-fidelity-contract.mjs')));
    for (const other of ['cocos', 'phaser', 'threejs'].filter((item) => item !== stack)) {
      assert.equal(existsSync(join(skillsRoot, `${other}-domain-contracts`)), false);
    }
    const root = `${stack}-domain-contracts/scripts`;
    const { textEffectImageContract, effectImageManifest } = await installed(skillsRoot, `${root}/scene-reconstruction-test-fixtures.mjs`);
    const { validateSceneReconstructionContract } = await installed(skillsRoot, `${root}/scene-reconstruction-contract.mjs`);
    const contract = textEffectImageContract();
    const options = stack === 'cocos'
      ? (await installed(skillsRoot, `${root}/v2-layout-source-test-fixtures.mjs`)).fixtureLayoutSourceOptions({ stage: 'V5' })
      : { stage: 'V5' };
    const manifest = { ...effectImageManifest(contract), visualStage: 'V5' };
    assert.deepEqual(validateSceneReconstructionContract(contract, manifest, options), []);

    const runtime = contract.text_decomposition.text_nodes[0].runtime_verification;
    runtime.actual_typography.font_size = 12;
    assert.ok(validateSceneReconstructionContract(contract, manifest, options).some((error) => error.includes('font_size')));
    runtime.actual_typography.font_size = 32;
    runtime.glyph_bounds.x += 100;
    runtime.target_glyph_bounds = { ...runtime.glyph_bounds };
    assert.ok(validateSceneReconstructionContract(contract, manifest, options).some((error) => error.includes('target_glyph_bounds 未绑定')));
  });
}
