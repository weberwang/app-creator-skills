import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills, STACKS } from '../packages/installer/install-project-skills.mjs';

/** 检查仓库自有控制器代码及实际领域入口均随单栈安装，不伪称来自外部源。 */
for (const stack of STACKS) test(`${stack} 单栈安装保留功能集成及对应领域的代码与规范`, (t) => {
  const project = mkdtempSync(join(tmpdir(), `stage-install-${stack}-`));
  // 仅回收当前用例创建的独立临时项目。
  t.after(() => rmSync(project, { recursive: true, force: true }));
  installSkills({ projectRoot: project, stacks: [stack] });
  const skills = join(project, '.agents', 'skills');
  const shared = [
    'app-workflow-control/SKILL.md',
    'app-workflow-control/schemas/work-item.schema.json',
    'app-workflow-control/schemas/human-review.schema.json',
    'app-workflow-control/schemas/global-visual-baseline.schema.json',
    'app-workflow-control/references/single-target-domain.md',
    'app-workflow-control/references/multi-target-visual.md',
    'app-workflow-control/references/function-dependencies.md',
    'app-workflow-control/scripts/runtime/final-integration.mjs',
    'app-workflow-control/scripts/runtime/single-domain-check.mjs',
    'app-workflow-control/scripts/runtime/visual-confirmation-domain.mjs',
    'app-workflow-control/scripts/runtime/visual-baseline-identity.mjs',
    'app-skill-runtime/dependencies.cjs',
  ];
  const web = { cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' };
  // 应用、设备和服务端分别安装其领域合同，不套用 Web 游戏的场景校验器。
  const native = stack === 'nodejs'
    ? ['app-stack-nodejs/SKILL.md', 'app-stack-nodejs/profile.json', 'app-workflow-control/scripts/runtime/approval.mjs']
    : stack === 'roblox'
    ? ['app-stack-roblox/SKILL.md', 'app-stack-roblox/profile.json', 'app-stack-roblox/references/native-contracts.md', 'app-workflow-control/scripts/runtime/roblox-domain-check.mjs', 'roblox-domain-contracts/scripts/validate-evidence.mjs', 'roblox-domain-contracts/scripts/validate-visual.mjs']
    : stack === 'expo'
    ? ['app-stack-expo/SKILL.md', 'app-stack-expo/profile.json', 'app-stack-expo/references/native-contracts.md', 'app-workflow-control/scripts/runtime/expo-domain-check.mjs', 'app-ui-layout/scripts/relative-layout-policy.cjs', 'expo-domain-contracts/references/domain-validation.md', 'expo-domain-contracts/templates/domain.json', 'expo-domain-contracts/templates/layout.json', 'expo-domain-contracts/templates/asset-manifest.json', 'expo-domain-contracts/templates/runtime-context.json']
    : stack === 'esp32'
    ? ['app-workflow-control/scripts/runtime/esp32-domain-check.mjs', 'app-workflow-control/scripts/runtime/approval.mjs', 'app-stack-esp32/references/domain-validation.md', 'app-ui-layout/scripts/relative-layout-policy.cjs']
    : stack === 'flutter'
    ? ['adaptive-layout-implementation/scripts/validate-layout-spec.js', 'app-ui-layout/scripts/relative-layout-policy.cjs']
    : stack === 'unity'
      ? ['unity-domain-contracts/scripts/unity-contract-validation.mjs', 'unity-domain-contracts/scripts/runtime/visible-contract.mjs']
      : [`${stack}-domain-contracts/scripts/scene-reconstruction-contract.mjs`, `${stack}-domain-contracts/scripts/visual-confirmation-authority.mjs`, `${web[stack]}-game-asset-integration/scripts/validate_visual_manifest.mjs`];
  for (const relative of [...shared, ...native]) assert.ok(existsSync(join(skills, ...relative.split('/'))), `${stack} 缺少 ${relative}`);
  const workSchema = JSON.parse(readFileSync(join(skills, 'app-workflow-control/schemas/work-item.schema.json'), 'utf8'));
  assert.ok(workSchema.properties.integrationPurpose);
  assert.ok(workSchema.properties.integrationScopeRef);
  assert.ok(workSchema.$defs.visual.properties.domainEvidenceRef);
});
