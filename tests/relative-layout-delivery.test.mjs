/** 从独立安装目录调用各栈真实校验入口，避免只在维护仓库内证明共享规则可用。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills, SOURCE_ROOT } from '../packages/installer/install-project-skills.mjs';
import YAML from '../skills/app-skill-runtime/yaml.mjs';

const STACKS = ['unity', 'cocos', 'phaser', 'threejs', 'flutter'];
const POLICY = 'app-ui-layout/scripts/relative-layout-policy.cjs';

/** 安装后的导入必须从临时项目解析，不能偷偷使用维护目录的原生模块。 */
async function importInstalled(skills, path) {
  return import(pathToFileURL(join(skills, path)).href);
}

for (const stack of STACKS) {
  test(`${stack} 独立安装的模板与真实校验器保留相对布局硬门`, async (t) => {
    const project = mkdtempSync(join(tmpdir(), `relative-layout-installed-${stack}-`));
    // 只回收本用例创建的独占临时目录，安装不会修改用户项目或全局技能。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const skills = join(project, '.agents/skills');
    assert.ok(existsSync(join(skills, POLICY)), '公共校验实现必须进入所选技术栈的安装闭包');
    // 安装副本必须与唯一公共实现逐字节一致。
    const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
    assert.equal(digest(join(skills, POLICY)), digest(join(SOURCE_ROOT, 'skills', POLICY)));
    for (const other of STACKS.filter((item) => item !== stack)) assert.ok(!existsSync(join(skills, `app-stack-${other}`)));

    if (stack === 'unity') {
      const { validateUiLayoutPlan } = await importInstalled(skills, 'unity-development-workflow/scripts/layout-plan-validation.mjs');
      const readPlan = (name) => JSON.parse(readFileSync(join(skills, 'unity-development-workflow/templates', name), 'utf8'));
      const normal = readPlan('ui-layout-plan.json');
      assert.deepEqual(validateUiLayoutPlan(normal), []);
      normal.nodes[0].layoutBinding.uiLayout.positioning = 'absolute';
      assert.notEqual(validateUiLayoutPlan(normal).length, 0, '普通 UI 不能冒用浮层本体例外');
      const floating = readPlan('ui-floating-layout-plan.json');
      assert.deepEqual(validateUiLayoutPlan(floating), []);
      floating.nodes.at(-1).layoutBinding.uiLayout.positioning = 'absolute';
      assert.notEqual(validateUiLayoutPlan(floating).length, 0, '安装后的浮层后代仍须相对定位');
      return;
    }

    if (stack === 'flutter') {
      // 只复制工具已声明的本地 YAML 包，不执行联网安装或从开发仓库导入校验器。
      const modules = join(skills, 'app-skill-runtime/node_modules');
      mkdirSync(modules, { recursive: true });
      cpSync(join(SOURCE_ROOT, 'node_modules/yaml'), join(modules, 'yaml'), { recursive: true });
      const { default: validator } = await importInstalled(skills, 'adaptive-layout-implementation/scripts/validate-layout-spec.js');
      for (const name of ['layout-spec-template.yaml', 'layout-spec-fidelity-template.yaml']) {
        const spec = YAML.parse(readFileSync(join(skills, 'adaptive-layout-implementation/assets', name), 'utf8'));
        assert.deepEqual(validator.validate(spec)[0], []);
        spec.regions.find((region) => region.id === 'primary-action').positioning = 'absolute';
        assert.notEqual(validator.validate(spec)[0].length, 0, 'docked 按钮不能成为本体');
      }
      return;
    }

    const prefix = stack === 'phaser' ? 'phaser4' : stack;
    const root = `${prefix}-game-ui-layout`;
    const { validateContract } = await importInstalled(skills, `${root}/scripts/validate_ui_layout_contract.mjs`);
    const template = stack === 'cocos' ? 'ordinary-ui-layout-contract-template.yaml' : 'ui-layout-contract-template.yaml';
    const document = JSON.parse(readFileSync(join(skills, root, 'assets', template), 'utf8'));
    assert.equal((await validateContract(document)).status, 'passed');
    const title = document.regions.find((region) => region.id === 'title');
    title.positioning = 'absolute';
    const result = await validateContract(document);
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('普通 UI 必须相对布局')));
  });
}
